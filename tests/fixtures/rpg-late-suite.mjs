import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { harness, ROOT, start, target, dialogue, state, secretWish } from './rpg-harness.mjs';
await import('./rpg-e10-return-suite.mjs');

const rights = spawnSync(process.execPath, ['tests/check-rights.mjs'], { cwd: ROOT, encoding: 'utf8' });
assert.equal(rights.status, 0, rights.stdout + rights.stderr);
const source = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
const index = source('index.html');
assert.ok(!index.includes('js/core/sim.js') && !index.includes('js/game/board.js') && !index.includes('js/game/prep.js'));
assert.ok(index.indexOf('js/game/dream.js') < index.indexOf('js/game/house.js'));
assert.doesNotMatch(source('js/game/event.js') + source('js/game/hud.js'), /G\.(?:prep|sim)\b/);
assert.doesNotMatch(source('js/game/bag.js') + source('js/game/hud.js'), /G\.board\b|data-hud="board"/);
assert.doesNotMatch(source('js/game/pearl.js'), /S\(\)\.pearls\s*\[[^\]]+\]\s*=/);

const h = await harness();
const observations = [];
try {
  const page = await h.page('', { width: 390, height: 844 }, { hasTouch: true });
  await start(page);
  const seen = new Set(), pearls = new Set();
  let factsAfterWonsu = null, sawSeungsangBefore = false, sawSeungsangAfter = false, steps = 0;
  while (++steps < 260) {
    const current = await page.evaluate(() => ({ id: document.querySelector('.play')?.dataset.scene, kind: document.querySelector('.play')?.dataset.kind, beat: document.querySelector('.play')?.dataset.beat || '' }));
    if (current.id === 'c3-feast') break;
    assert.ok(current.id, '현재 장면 식별');
    seen.add(current.id);
    const snapshot = await state(page);
    assert.equal(snapshot.teacher, false, '일반 학생 경로');
    assert.equal(snapshot.awake, false, current.id + '에서 전체 깨어남 금지');
    if (current.id === 'e10-neungpa' && current.beat === 'neungpa-return') {
      assert.equal(await page.locator('.play').getAttribute('data-map'), 'map-yoyeon', '작은 꿈 뒤 실제 진영 필드 복귀');
      assert.equal(snapshot.awake, false, '진영 복귀는 전체 깨어남이 아님');
    }
    assert.equal(await page.evaluate(() => G.app.wishes().find(w => w.id === 'misaek').hidden), true, '꿈 도중 미색 비공개');

    const currentFacts = await page.evaluate(() => G.experience.facts(G.save.state, G.data));
    const expectedHouse = current.id === 'e11-seungsang' ? (currentFacts.includes('e11-seungsang:appointment') ? 'seungsang' : 'byeoldang')
      : current.id === 'e12-honrye' ? 'seungsang'
      : ['e05-chunun','l-hebei','e06-gyeonghong','e07-tungso','l-bongnae','e08-wonsu','e09-yoyeon','e10-neungpa'].includes(current.id) ? 'byeoldang'
      : /^e0[1-4]-|^l-namjeon$/.test(current.id) ? 'inn' : '';
    if (expectedHouse) assert.equal(await page.evaluate(() => G.house.stage()?.id || ''), expectedHouse, current.id + ' 현재 생활 공간');
    if (current.id === 'e11-seungsang') {
      if (expectedHouse === 'byeoldang') sawSeungsangBefore = true;
      if (expectedHouse === 'seungsang') sawSeungsangAfter = true;
    }
    if (current.id === 'e11-seungsang' && !factsAfterWonsu) {
      factsAfterWonsu = await page.evaluate(() => G.experience.facts(G.save.state, G.data));
      assert.ok(factsAfterWonsu.includes('e08-wonsu:appointment'));
      assert.ok(!factsAfterWonsu.includes('e11-seungsang:appointment'));
      assert.ok(!factsAfterWonsu.includes('e11-seungsang:portrait'));
    }
    const publicPeople = {
      'e09-yoyeon:yoyeon-speak': ['yoyeon-speak', '심요연'],
      'e09-yoyeon:yoyeon-warning': ['yoyeon-warning', '심요연'],
      'e10-neungpa:neungpa-meet': ['neungpa-meet', '백능파'],
      'e12-honrye:honrye-poems': ['honrye-poems', '진채봉'],
      'e12-honrye:honrye-gyeongpae': ['honrye-gyeongpae', '정경패'],
      'e12-honrye:honrye-joke': ['honrye-joke', '정경패'],
    }[current.id + ':' + current.beat];
    if (publicPeople) {
      assert.match(await page.locator('[data-world-target="' + publicPeople[0] + '"]').textContent(), new RegExp(publicPeople[1]));
      // 2026-10-06 승인 전신 그림(v4)으로 바뀌었다. 공개 뒤에는 그 인물의 승인 전신 그림이 실제로 표시돼야 한다.
      const body = await page.locator('[data-object="' + publicPeople[0] + '"]').evaluate(el => { const o = G.data.maps.flatMap(m => m.objects).find(v => v.id === el.dataset.object), s = G.data.sprites[o.sprite]; return { src: s?.src, shown: getComputedStyle(el.querySelector('.world-sprite')).backgroundImage, pending: el.dataset.artPending || null }; });
      assert.ok(body.src && body.shown.includes(body.src) && !body.pending, publicPeople[1] + ' 공개 뒤 승인 전신 그림');
    }
    if (current.id === 'e09-yoyeon' && current.beat === 'yoyeon-choice') {
      assert.doesNotMatch(await page.locator('.world-target-list').textContent(), /심요연/);
      assert.equal(await page.locator('[data-object="yoyeon-choice"].world-person img').count(), 0);
      assert.match(await page.locator('[data-object="yoyeon-choice"] .world-sprite').evaluate(el => getComputedStyle(el).backgroundImage), /npc-assassin/, '공개 전 자객 그림');
    }
    if (current.id === 'e12-honrye' && current.beat === 'honrye-reveal') {
      assert.doesNotMatch(await page.locator('.world-target-list').textContent(), /정경패|영양공주/);
      assert.equal(await page.locator('[data-object="honrye-reveal"].world-person img').count(), 0);
    }

    if (await page.locator('[data-dialogue]').count()) { await dialogue(page); continue; }
    if (current.kind === 'wish') {
      const answers = await page.evaluate(() => G.app.current().data.answers);
      for (const id of answers) { const button = page.locator('[data-word="' + id + '"]'); if (!await button.isDisabled()) await button.click(); }
      await secretWish(page);
      await page.locator('#tray [data-act="next"]').click();
      continue;
    }
    const scene = await page.evaluate(id => G.app.list().find(value => value.id === id), current.id);
    const experience = await page.evaluate(id => G.experience.find(G.data, id), current.id);
    if (experience && scene?.meet && !pearls.has(scene.meet)) {
      const optional = experience.optional.find(beat => beat.effects.some(effect => effect.kind === 'pearl' && effect.id === scene.meet));
      if (optional && await page.locator('[data-world-target="' + optional.trigger.target + '"]').count()) {
        await target(page, optional.trigger.target); await dialogue(page); pearls.add(scene.meet); continue;
      }
    }
    if (await page.locator('[data-act="next"]').count()) { await page.locator('[data-act="next"]').first().click(); await page.waitForTimeout(30); continue; }
    const beat = experience?.beats.find(value => value.id === current.beat);
    assert.ok(beat, current.id + '/' + current.beat + ' 진행 행동');
    if (beat.trigger.target) await target(page, beat.trigger.target); else await page.locator('[data-act="interact"]').click();
    await dialogue(page);
  }
  assert.ok(steps < 260, '후반부까지 진행 막힘 없음');
  assert.equal(seen.size, 20, '앞에서 혼례까지 20단위 실제 도달');
  assert.equal(sawSeungsangBefore, true, '대승상 임명 전 별당 유지');
  assert.equal(sawSeungsangAfter, true, '대승상 임명 뒤 승상부 전환');
  const final = await state(page);
  assert.equal(final.items.length, 14, '물건 14개 내부 상태');
  assert.equal(final.bonds.length, 8, '인연 8명 내부 상태');
  assert.equal(Object.keys(final.pearls).filter(id => final.pearls[id]).length, 8, '선택 구슬 8개');
  assert.equal(final.awake, false, 'e10 작은 꿈 뒤 awake false');
  const facts = await page.evaluate(() => G.experience.facts(G.save.state, G.data));
  for (const id of ['e08-wonsu:appointment','e11-seungsang:appointment','e11-seungsang:portrait']) assert.ok(facts.includes(id), id);
  assert.ok(final.items.includes('it-girinpo'));
  const wishDetail = await page.evaluate(() => {
    const panel = G.dream.wishList({ detail: true });
    document.body.appendChild(panel);
    const text = panel.textContent;
    panel.remove();
    return text;
  });
  for (const label of ['정서대원수 임명','대승상 임명','기린각 초상']) assert.match(wishDetail, new RegExp(label));
  assert.doesNotMatch(wishDetail, /e0(?:8|11)-/);
  assert.deepEqual(await page.evaluate(() => G.dream.tabs()), ['house','bonds','items','wishes','pearls']);
  assert.equal(await page.evaluate(() => G.dream.can('board')), false);
  assert.equal(await page.evaluate(() => G.dream.open('board')), false);
  assert.equal(await page.locator('.sim-hud').count(), 0, '추가 꿈 띠 없음');
  assert.equal(await page.locator('.topbar [data-tool="keep"]').count(), 1, '보따리 도구 하나');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false, '전체 화면 밖 문서 영역 없음');

  const beforeReplay = await state(page);
  await page.evaluate(() => G.app.open('e12-honrye'));
  await page.waitForSelector('[data-world]');
  const replayBeat = await page.evaluate(() => document.querySelector('.play').dataset.beat);
  const replayTarget = await page.evaluate(beat => G.experience.find(G.data, 'e12-honrye').beats.find(value => value.id === beat)?.trigger.target, replayBeat);
  if (replayTarget) { await target(page, replayTarget); await dialogue(page); }
  assert.deepEqual(await state(page), beforeReplay, 'readonly 다시 보기 상태 불변');

  const scales = await page.locator('img.pix:visible').evaluateAll(images => images.filter(image => image.naturalWidth).map(image => image.getBoundingClientRect().width * devicePixelRatio / image.naturalWidth));
  for (const scale of scales) assert.ok(Math.abs(scale - Math.round(scale)) < .001 || Math.abs(1 / scale - Math.round(1 / scale)) < .001, '도트 그림 정수배');
  observations.push({ seen: [...seen], items: final.items, bonds: final.bonds, pearls: Object.keys(final.pearls), facts });
  assert.deepEqual(h.errors, [], h.errors.join('\n'));
  console.log('✓ 일반 학생 실제 입력 20단위 · 물건14 · 인연8 · 구슬8 · e10 awake false');
  console.log('✓ 꿈 도구 독립 · 물건 탭 · readonly · 소원 · 권리 · 외부 요청 · 정수배');
  await page.context().close();
} finally {
  fs.writeFileSync(path.join(ROOT, 'tests/shots/rpg-late-observations.json'), JSON.stringify({ observations, errors: h.errors }, null, 2));
  await h.close();
}
