import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness, ROOT, ready, target, dialogue, state, seekTarget } from './rpg-harness.mjs';

const red = process.argv.includes('--red');
const legacy = process.argv.includes('--legacy-compat');
const seen = process.argv.includes('--seen-compat');
const output = path.join(ROOT, 'tests/shots/pearl-contract-' + (legacy ? 'legacy' : seen ? 'seen' : red ? 'red' : 'green'));
fs.mkdirSync(output, { recursive: true });
const h = await harness(), observations = [], logs = [], failures = [];
let passed = 0;
const raw = p => p.evaluate(() => localStorage.getItem(G.save.key));
const scene = p => p.evaluate(() => ({ id: G.app.current().scene, beat: document.querySelector('.play')?.dataset.beat }));
async function capture(p, name) {
  fs.writeFileSync(path.join(output, name + '-save.json'), await raw(p));
  fs.writeFileSync(path.join(output, name + '-screen.txt'), await p.locator('body').innerText());
  await p.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
}
async function seed(id, prefix = 0, viewport = { width: 390, height: 844 }) {
  const p = await h.page('', viewport, { hasTouch: true });
  p.on('console', m => logs.push({ type: m.type(), text: m.text() }));
  p.on('pageerror', e => logs.push({ type: 'pageerror', text: e.message }));
  const input = await p.evaluate(({ id, prefix }) => {
    const s = JSON.parse(JSON.stringify(G.save.state));
    const list = G.app.list(), e = G.experience.find(G.data, id);
    s.pos = id; s.step = ''; s.started = true; s.teacher = false; s.music = false; s.sound = false;
    s.done = Object.fromEntries(list.slice(0, list.findIndex(x => x.id === id)).map(x => [x.id, true]));
    s.rpg.scenes = {};
    const actions = e.beats.slice(0, prefix).map(b => ({ id: b.id, by: 'student' }));
    s.rpg.scenes[id] = { status: 'active', beat: e.beats[prefix].id, actions, hint: null };
    for (const b of e.beats.slice(0, prefix)) for (const effect of b.effects) {
      if (effect.kind === 'bond' && !s.bonds.includes(effect.id)) s.bonds.push(effect.id);
      if (effect.kind === 'item' && !s.items.includes(effect.id)) s.items.push(effect.id);
    }
    const stage = G.world.stage(G.data, id, e.beats[prefix].id);
    s.rpg.cursor = { scene: id, map: stage.map.id, ...stage.spawn };
    localStorage.setItem(G.save.key, JSON.stringify(s));
    return s;
  }, { id, prefix });
  fs.writeFileSync(path.join(output, id + '-seed.json'), JSON.stringify(input, null, 2));
  await p.reload(); await ready(p);
  await p.evaluate(() => {
    window.pearlMarkOptions = [];
    const mark = G.text.mark;
    G.text.mark = (b, opt) => { window.pearlMarkOptions.push(opt); return mark(b, opt); };
  });
  await p.getByRole('button', { name: '이어 하기', exact: true }).click();
  await p.waitForSelector('[data-world]');
  assert.equal((await state(p)).teacher, false);
  assert.equal((await scene(p)).id, id);
  return p;
}
async function required(p) {
  const current = await scene(p);
  const b = await p.evaluate(({ id, beat }) => G.experience.find(G.data, id).beats.find(b => b.id === beat), current);
  assert.ok(b, '실제 필수 행동');
  if (b.trigger.target) await target(p, b.trigger.target);
  else await p.locator('[data-act="interact"]').click();
  await dialogue(p);
}
async function card(p, id) {
  await target(p, id);
  return readToCard(p);
}
async function readToCard(p) {
  await p.waitForSelector('[data-dialogue]');
  while (await p.locator('[data-dialogue]').count() && !await p.locator('.pearl-evidence').count()) {
    await p.locator('[data-dialogue] [data-act="next"]').click();
    await p.waitForTimeout(30);
  }
  return p.locator('.pearl-evidence');
}
async function unchangedCard(p, id, name) {
  const before = await raw(p), memory = await state(p);
  const evidence = await card(p, id);
  assert.equal(await evidence.count(), 1);
  if (await evidence.getAttribute('data-trace') === 'fiction') assert.equal(await evidence.locator('.real').count(), 1, '읽기 이력과 무관하게 설정의 실제 근거 표시');
  assert.equal(await raw(p), before, name + ' 저장 원문 불변');
  assert.deepEqual(await state(p), memory, name + ' 메모리 불변');
  await capture(p, name);
  await dialogue(p);
  assert.equal(await raw(p), before, name + ' 카드 닫기 뒤 저장 불변');
}
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS ' + name); }
  catch (e) { failures.push({ name, error: e.stack }); console.error('FAIL ' + name + ': ' + e.message); }
}

try {
  if (!red && !legacy) await test('이미 읽은 구슬 안내의 전체 설명·재열기·readonly·reader', async () => {
    const p = await seed('e02-tianjin', 2);
    try {
      assert.equal(await p.evaluate(() => G.save.transact(G.save.state.rpg.run, n => { n.seenFiction['fc-pearls'] = true; })), true);
      const evidence = await card(p, 'tianjin-pearl');
      assert.equal(await evidence.locator('.real').count(), 1, '옛 읽기 기록이 있어도 실제 근거 표시');
      await dialogue(p); await required(p);
      const reader = await p.context().newPage(); await reader.goto(p.url()); await ready(reader);
      assert.equal(await reader.evaluate(() => G.save.access), 'reader');
      for (const q of [p, p, reader]) {
        await q.bringToFront(); await q.evaluate(() => G.app.open('e02-tianjin')); await q.waitForSelector('[data-world]');
        await required(q); await required(q);
        await unchangedCard(q, 'tianjin-pearl', 'seen-' + (q === p ? 'reopen' : 'reader'));
        assert.equal((await state(q)).seenFiction['fc-pearls'], true);
      }
    } finally { await p.context().close(); }
  });
  if (!red && !seen) {
    for (const [id, prefix, insert, pearl] of [['e02-tianjin', 2, 0, 'seomwol'], ['e07-tungso', 2, 0, 'nanyang'], ['e09-yoyeon', 3, 0, 'yoyeon'], ['e10-neungpa', 3, 2, 'neungpa']]) {
    await test(id + ' 수정 전 조기 구슬 수집 저장의 필수 행동 보존', async () => {
      const p = await seed(id, prefix);
      try {
        const input = await p.evaluate(({ id, insert, pearl }) => {
          const s = JSON.parse(JSON.stringify(G.save.state));
          const beat = G.experience.find(G.data, id).optional.find(b => b.effects.some(e => e.kind === 'pearl'));
          s.rpg.scenes[id].actions.splice(insert, 0, { id: beat.id, by: 'student' });
          s.pearls[pearl] = true;
          localStorage.setItem(G.save.key, JSON.stringify(s));
          return s;
        }, { id, insert, pearl });
        fs.writeFileSync(path.join(output, id + '-legacy-input.json'), JSON.stringify(input, null, 2));
        await p.reload(); await ready(p);
        await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await p.waitForSelector('[data-world]');
        await capture(p, id + '-legacy-reconnect');
        const actual = (await state(p)).rpg.scenes[id];
        observations.push({ before: input.rpg.scenes[id], after: actual });
        assert.equal(actual.beat, input.rpg.scenes[id].beat, '조기 수집 이력이 필수 진행을 되돌리지 않아야 함');
        assert.deepEqual(actual.actions, input.rpg.scenes[id].actions);
        assert.equal(await p.evaluate(() => G.save.transact(G.save.state.rpg.run, n => { n.name = '호환 검사'; })), true, '이전 수집을 보존한 채 새 저장 가능');
        assert.deepEqual((await state(p)).rpg.scenes[id].actions, actual.actions);
      } finally { await p.context().close(); }
    });
    }
  }
  if (!legacy && !seen) {
  await test('요연 필수 만남 전 비공개·수집 거부', async () => {
    const p = await seed('e09-yoyeon');
    try {
      const before = await state(p);
      assert.deepEqual(before.rpg.scenes['e09-yoyeon'].actions, []);
      await capture(p, 'yoyeon-before');
      const visible = await p.locator('[data-world-target="yoyeon-pearl"]').count();
      if (red && visible) {
        await target(p, 'yoyeon-pearl');
        await capture(p, 'yoyeon-leak');
        observations.push({ defect: 2, visible, text: await p.locator('[data-dialogue]').innerText(), collected: (await state(p)).pearls.yoyeon });
      }
      assert.equal(visible, 0, '필수 만남 전 구슬 대상 비공개');
      const rejected = await p.evaluate(() => G.save.applyExperience('e09-yoyeon', 'yoyeon-pearl', { run: G.save.state.rpg.run, readonly: false, by: 'student' }));
      assert.equal(rejected.ok, false);
      assert.deepEqual(await state(p), before);
      assert.equal(await p.evaluate(() => {
        const prior = G.save.state, raw = localStorage.getItem(G.save.key);
        const ok = G.save.transact(prior.rpg.run, n => {
          n.rpg.scenes['e09-yoyeon'].actions.push({ id: 'yoyeon-pearl', by: 'student' }); n.pearls.yoyeon = true;
        });
        return !ok && G.save.state === prior && localStorage.getItem(G.save.key) === raw;
      }), true, '호환 정규화로 새 조기 수집을 만들어 넣지 못함');
    } finally { await p.context().close(); }
  });
  await test('정경패 원작 근거·완판 미확인 안내', async () => {
    const p = await seed('e03-geomungo');
    try {
      const evidence = await card(p, 'geomungo-pearl');
      await capture(p, 'gyeongpae-card');
      observations.push({ defect: 3, cards: await evidence.count() });
      assert.equal(await evidence.count(), 1, '월드 구슬에서 근거 카드 접근');
      assert.match(await evidence.innerText(), /완판 대조는 미확인/);
      assert.equal(await evidence.locator('.mark.note').count(), 1);
      assert.equal(await p.locator('.mark.orig').count(), 0);
      await dialogue(p);
    } finally { await p.context().close(); }
  });
  if (!red) {
    await test('여덟 구슬 단계·원문 대조 / 공개 API·필수 완료 계약', async () => {
      const p = await seed('e09-yoyeon');
      try {
        const audit = await p.evaluate(() => {
          const safeFirst = { chae: 'huayin-look', seomwol: 'tianjin-listen', gyeongpae: 'geomungo-dress', chunun: 'chunun-reveal', gyeonghong: 'gyeonghong-discover', nanyang: 'tungso-message', yoyeon: 'yoyeon-speak', neungpa: 'neungpa-defeat' };
          return G.data.scenes.filter(s => s.pearl).map(sc => {
            const e = G.experience.find(G.data, sc.id), b = e.optional.find(b => b.effects.some(f => f.kind === 'pearl'));
            const result = { scene: sc.id, trace: sc.pearl.trace, canon: sc.pearl.canon, lines: b.lines.map(i => sc.lines[i]), stages: [], safeFirst: safeFirst[sc.meet] };
            for (const [index, beat] of e.beats.entries()) {
              const stage = G.world.stage(G.data, sc.id, beat.id);
              const object = stage.map.objects.find(o => o.id === b.trigger.target);
              const visible = G.world.objects(stage.map, sc.id, beat.id).some(o => o.id === b.trigger.target);
              const s = JSON.parse(JSON.stringify(G.save.state));
              s.pos = sc.id; s.done = {}; s.rpg.scenes = { [sc.id]: { status: 'active', beat: beat.id, actions: e.beats.slice(0, index).map(b => ({ id: b.id, by: 'student' })), hint: null } };
              const point = object && [{x: object.x-1,y:object.y},{x:object.x+1,y:object.y},{x:object.x,y:object.y-1},{x:object.x,y:object.y+1}].find(q => G.world.walkable(stage.map,q.x,q.y,sc.id,beat.id));
              s.rpg.cursor = { scene: sc.id, map: stage.map.id, facing: 'up', ...(point || stage.spawn) };
              const path = object && G.world.path(stage.map, stage.spawn, object, sc.id, beat.id);
              const applied = G.experience.apply(s, G.data, sc.id, b.id, { run: s.rpg.run, readonly: false, by: 'student' });
              result.stages.push({ beat: beat.id, visible, reachable: !!path, accepted: applied.ok });
            }
            return result;
          });
        });
        assert.equal(audit.length, 8);
        assert.equal(audit.filter(s => s.trace === 'canon').length, 2);
        assert.equal(audit.filter(s => s.trace === 'fiction').length, 6);
        for (const item of audit) {
          const first = item.stages.findIndex(s => s.visible);
          assert.ok(first >= 0, item.scene + ' 완료 전 수집 시점 존재');
          assert.equal(item.stages[first].beat, item.safeFirst);
          for (const s of item.stages) {
            assert.equal(s.accepted, s.visible, item.scene + '/' + s.beat + ' 공개 판정과 인접 API 동일');
            if (s.visible) assert.ok(s.reachable, item.scene + '/' + s.beat + ' 실제 경로');
          }
        }
        observations.push({ audit });
        fs.writeFileSync(path.join(output, 'eight-pearl-stage-audit.json'), JSON.stringify(audit, null, 2));
      } finally { await p.context().close(); }
    });
    await test('요연 실제 필수 3행동 전후·키보드·재접속', async () => {
      const p = await seed('e09-yoyeon');
      try {
        for (const beat of ['yoyeon-night', 'yoyeon-arrive', 'yoyeon-choice']) {
          assert.equal((await scene(p)).beat, beat);
          assert.equal(await p.locator('[data-object="yoyeon-pearl"], [data-world-target="yoyeon-pearl"]').count(), 0);
          await required(p);
        }
        assert.equal((await scene(p)).beat, 'yoyeon-speak');
        await seekTarget(p, 'yoyeon-pearl');
        await p.waitForFunction(() => document.querySelector('[data-act="interact"][data-target="yoyeon-pearl"]')?.disabled === false);
        const before = await state(p);
        await p.locator('[data-world]').focus(); await p.keyboard.press('Enter');
        const evidence = await readToCard(p);
        assert.match(await evidence.innerText(), /게임 설정/);
        const after = await state(p);
        assert.equal(after.pearls.yoyeon, true);
        assert.deepEqual(after.bonds, before.bonds); assert.deepEqual(after.ledger, before.ledger);
        assert.equal(after.rpg.scenes['e09-yoyeon'].beat, 'yoyeon-speak');
        await capture(p, 'yoyeon-after-keyboard'); await dialogue(p);
        await p.reload(); await ready(p); await p.getByRole('button', { name: '이어 하기', exact: true }).click();
        await p.waitForSelector('[data-world]');
        assert.equal((await scene(p)).beat, 'yoyeon-speak');
        // 보행 저장은 허용되므로 재열기 불변 비교는 구슬 인접 칸에 도착한 뒤 한다.
        await seekTarget(p, 'yoyeon-pearl');
        await p.waitForFunction(() => document.querySelector('[data-act="interact"][data-target="yoyeon-pearl"]')?.disabled === false);
        await unchangedCard(p, 'yoyeon-pearl', 'yoyeon-reconnect');
        assert.equal((await state(p)).rpg.scenes['e09-yoyeon'].actions.filter(a => a.id === 'yoyeon-pearl').length, 1);
      } finally { await p.context().close(); }
    });
    const samples = [
      ['e01-huayin', 0, 'huayin-pearl', 'chae', 'fiction'],
      ['e02-tianjin', 2, 'tianjin-pearl', 'seomwol', 'fiction'],
      ['e05-chunun', 3, 'chunun-pearl', 'chunun', 'fiction'],
      ['e06-gyeonghong', 2, 'gyeonghong-pearl', 'gyeonghong', 'fiction'],
      ['e07-tungso', 3, 'tungso-pearl', 'nanyang', 'canon'],
      ['e10-neungpa', 3, 'neungpa-pearl', 'neungpa', 'fiction'],
    ];
    for (const [id, prefix, action, person, trace] of samples) await test(id + ' 실제 수집·근거·필수 진행 분리', async () => {
      const p = await seed(id, prefix);
      try {
        const before = await state(p);
        let evidence;
        if (id === 'e02-tianjin') {
          await seekTarget(p, action);
          await p.waitForFunction(id => document.querySelector('[data-act="interact"][data-target="' + id + '"]')?.disabled === false, action);
          await p.locator('[data-object="' + action + '"]').tap();
          evidence = await readToCard(p);
        } else evidence = await card(p, action);
        assert.equal(await evidence.getAttribute('data-trace'), trace);
        assert.equal(await p.locator('.mark.orig').count(), 0);
        const after = await state(p);
        assert.equal(after.pearls[person], true);
        for (const key of ['bonds', 'ledger', 'items', 'play']) assert.deepEqual(after[key], before[key], key + ' 구슬 무관');
        assert.equal(await p.evaluate(() => G.app.wishes().find(w => w.id === 'misaek').hidden), true);
        assert.equal(after.rpg.scenes[id].beat, before.rpg.scenes[id].beat);
        assert.deepEqual(await p.evaluate(() => pearlMarkOptions.at(-1)), { run: after.rpg.run, readonly: false, peek: true, ...(trace === 'fiction' ? { showReal: true } : {}) });
        if (id === 'e02-tianjin') assert.match(await evidence.innerText(), /게임 설정/);
        if (id === 'e07-tungso') assert.match(await evidence.innerText(), /태후는 신녀가 명주를/);
        await capture(p, id + '-card'); await dialogue(p);
      } finally { await p.context().close(); }
    });
    await test('구슬 생략한 여덟 장면 실제 마지막 필수 행동·완료', async () => {
      const completion = [];
      for (const [id, prefix] of [['e01-huayin',4],['e02-tianjin',2],['e03-geomungo',2],['e05-chunun',3],['e06-gyeonghong',3],['e07-tungso',3],['e09-yoyeon',4],['e10-neungpa',6]]) {
        const p = await seed(id, prefix);
        try {
          await required(p);
          const actual = await state(p);
          assert.equal(actual.done[id], true, id + ' 구슬 없이 필수 완료');
          assert.deepEqual(actual.pearls, {});
          assert.notEqual(actual.pos, id);
          completion.push({ id, next: actual.pos });
        } finally { await p.context().close(); }
      }
      observations.push({ completion, injectedPrefix: true });
    });
    await test('원작·설정 카드 readonly writer / 실제 reader 불변', async () => {
      for (const id of ['e03-geomungo', 'e02-tianjin']) {
        const p = await seed(id);
        try {
          while ((await scene(p)).beat) await required(p);
          const reader = await p.context().newPage(); await reader.goto(p.url()); await ready(reader);
          assert.equal(await reader.evaluate(() => G.save.access), 'reader');
          for (const q of [p, reader]) {
            await q.bringToFront();
            await q.evaluate(id => G.app.open(id), id); await q.waitForSelector('[data-world]');
            assert.equal(await q.locator('.play').getAttribute('data-readonly'), 'true');
            const before = await raw(q), memory = await state(q);
            if (id === 'e02-tianjin') { await required(q); await required(q); }
            try { await unchangedCard(q, id === 'e03-geomungo' ? 'geomungo-pearl' : 'tianjin-pearl', id + '-' + (q === p ? 'replay' : 'reader')); }
            catch (e) { await capture(q, id + '-reader-failure'); throw e; }
            assert.equal(await raw(q), before); assert.deepEqual(await state(q), memory);
          }
        } finally { await p.context().close(); }
      }
    });
    await test('저장 실패 구슬·카드 미확정 / 복구 후 재시도', async () => {
      const p = await seed('e09-yoyeon', 3);
      try {
        await seekTarget(p, 'yoyeon-pearl');
        await p.waitForFunction(() => document.querySelector('[data-act="interact"][data-target="yoyeon-pearl"]')?.disabled === false);
        const before = await raw(p), memory = await state(p);
        await p.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw Error('구슬 저장 실패 시험'); }; });
        await p.locator('[data-act="interact"][data-target="yoyeon-pearl"]').click();
        assert.equal(await raw(p), before); assert.deepEqual(await state(p), memory);
        assert.equal(await p.locator('.pearl-evidence, [data-dialogue]').count(), 0);
        await capture(p, 'save-failure');
        await p.evaluate(() => { Storage.prototype.setItem = originalSetItem; G.app.resume(); });
        await p.waitForSelector('[data-world]');
        assert.equal(await (await card(p, 'yoyeon-pearl')).count(), 1);
        await dialogue(p);
      } finally { await p.context().close(); }
    });
    await test('카드 대기 중 초기화 / 이전 DOM·run 콜백 거부', async () => {
      const p = await seed('e03-geomungo');
      try {
        await card(p, 'geomungo-pearl'); const old = await state(p);
        await p.evaluate(() => { window.oldPearlNext = document.querySelector('[data-dialogue] [data-act="next"]'); G.save.reset(G.save.state.rpg.run, { confirmed: true, cancel: () => G.app.title() }); });
        await p.waitForSelector('.title-screen');
        const before = await raw(p), memory = await state(p);
        assert.notEqual(memory.rpg.run, old.rpg.run);
        await p.evaluate(() => oldPearlNext.click()); await p.waitForTimeout(50);
        assert.equal(await raw(p), before); assert.deepEqual(await state(p), memory);
        assert.equal(await p.locator('.pearl-evidence, [data-dialogue]').count(), 0);
        assert.equal((await p.evaluate(run => G.save.applyExperience('e03-geomungo', 'geomungo-pearl', { run, readonly: false, by: 'student' }), old.rpg.run)).reason, 'stale');
        await capture(p, 'stale-dom');
      } finally { await p.context().close(); }
    });
    await test('가로 큰 글자 근거 카드 키보드·화면 내부 접근', async () => {
      const p = await seed('e03-geomungo', 0, { width: 844, height: 390 });
      try {
        await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape');
        const evidence = await card(p, 'geomungo-pearl');
        assert.match(await evidence.innerText(), /완판 대조는 미확인/);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight), false);
        await p.locator('[data-dialogue] [data-act="next"]').scrollIntoViewIfNeeded();
        await capture(p, 'landscape-big-card');
        await p.locator('[data-dialogue] [data-act="next"]').focus(); await p.keyboard.press('Enter');
        await p.waitForSelector('.pearl-evidence', { state: 'detached' });
      } finally { await p.context().close(); }
    });
  }
  }
  assert.deepEqual(h.errors, [], '런타임·자산·외부 요청 오류');
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ injectedSave: true, scope: '본편 HTTP의 구슬 집중 회귀이며 실제 완주 증거가 아님', passed, observations, failures, errors: h.errors, logs }, null, 2));
  await h.close();
}
if (failures.length) process.exitCode = 1;
