// T3: 실제 화면·입력·저장으로 육성 흐름을 검사한다. 3장 이후 완주는 후속 점검이다.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const url = origin + '/index.html';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page, passed = 0;
const issues = [];
const pearlProbe = [];
const spriteProbe = [];
async function fresh(query = '?fixture=1', dpr = 1) {
  if (page) await page.context().close();
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr })).newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', (e) => issues.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) issues.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) issues.push('외부 요청: ' + r.url()); });
  await page.goto(url + query); await ready();
}
const ready = () => page.waitForFunction(() => G.app.booted);
const current = () => page.evaluate(() => G.app.current());
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const at = (scene, step) => page.waitForFunction(({ scene, step }) => G.app.current()?.scene === scene && (!step || G.app.current().step === step), { scene, step });
const next = () => page.locator('#tray [data-act="next"]').click();
async function openFirst(real = false, dpr = 1) {
  await fresh((real ? '?' : '?fixture=1&') + 'teacher=1&scene=' + (real ? 'e01-huayin' : 'e01-stub'), dpr);
  // 교사 바로가기만 사용하고 실제 준비와 대사는 학생과 같은 단추로 진행한다.
  await page.evaluate(() => { G.save.state.teacher = false; G.save.write(); G.app.applySettings(); });
  for (let i = 0; i < 8 && (await current()).step !== 'preview'; i++) await next();
}
async function reachGrade(action = 'study', takePearl = false) {
  const id = (await current()).scene;
  let bond = null;
  for (let i = 0; i < 30; i++) {
    const c = await current();
    if (c.step === 'grade') return bond;
    if (c.step === 'scene' && await page.locator('.stage-background img').count()) { await pixelCheck(); await hudCheck(); }
    if (await page.locator('.bond-card').count()) bond = await page.locator('.bond-card').first().innerText();
    const spot = page.locator('.stage-pearl:not([disabled])');
    if (takePearl && await spot.count()) await spot.click();
    if (c.step === 'prep1' || c.step === 'prep2') {
      const button = page.locator('[data-act="prep"][data-action="' + action + '"]');
      if (await button.count() && !await button.isDisabled()) await button.click();
    }
    await next();
    assert.equal((await current()).scene, id);
  }
  throw Error('등급 도달 실패');
}
async function test(name, fn) {
  const before = issues.length;
  try { await fn(); assert.equal(issues.length, before, issues.slice(before).join(' | ')); passed++; console.log('✓ ' + name); }
  catch (e) { issues.push(name + ': ' + e.message); console.error('✗ ' + name + ': ' + e.stack); }
}
async function pixelCheck() {
  await page.waitForFunction(() => [...document.querySelectorAll('img.pix')].some((img) => img.naturalWidth > 0 && img.getBoundingClientRect().width > 0));
  const images = await page.locator('img.pix:visible').evaluateAll((imgs) => imgs.filter((img) => img.naturalWidth).map((img) => ({ src: img.getAttribute('src'), k: img.getBoundingClientRect().width * devicePixelRatio / img.naturalWidth, rendering: getComputedStyle(img).imageRendering })));
  assert.ok(images.length > 0);
  for (const i of images) { assert.ok(Math.abs(i.k - Math.round(i.k)) < 0.001 || Math.abs(1 / i.k - Math.round(1 / i.k)) < 0.001, JSON.stringify(i)); assert.equal(i.rendering, 'pixelated'); }
}
async function hudCheck() {
  const result = await page.evaluate(() => {
    const hud = document.querySelector('.sim-hud').getBoundingClientRect();
    const tray = document.querySelector('#tray').getBoundingClientRect();
    const speech = document.querySelector('.stage-speech')?.getBoundingClientRect();
    return { hudBottom: hud.bottom, trayTop: tray.top, speechTop: speech?.top, width: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  assert.ok(result.hudBottom <= result.trayTop);
  if (result.speechTop != null) assert.ok(result.hudBottom <= result.speechTop);
  assert.ok(result.width <= result.viewport);
  assert.equal(await page.locator('.sim-hud [data-wish="misaek"]').innerText(), '?');
}
try {
  await fresh();
  await test('육성 화면 등록과 준비 API', async () => {
    assert.equal(await page.evaluate(() => typeof G.app.screens.event), 'function');
    assert.equal(await page.evaluate(() => typeof G.prep?.run), 'function');
  });
  if (issues.length) throw Error('기초 계약 실패');
  let brightCard;
  await test('적중 두 번: 예고·준비·사건·등급·단서·말판과 구슬 선택', async () => {
    await openFirst();
    const seen = [];
    await page.evaluate(() => { window.steps = []; G.app.on('step', (ctx, step) => { if (ctx.scene.id === 'e01-stub') window.steps.push(step); }); });
    await next(); await at('e01-stub', 'prep1');
    assert.equal(await page.locator('[data-act="prep"]').count(), 4);
    assert.equal(await page.locator('.preview-card').count(), 1);
    await hudCheck(); await pixelCheck();
    brightCard = await reachGrade('study', true);
    assert.ok(brightCard);
    assert.equal(await page.locator('.grade').getAttribute('data-grade'), 'shine');
    const s = await state();
    assert.equal(s.events['e01-stub'].hits, 2); assert.equal(s.pearls.b1, true);
    assert.ok(s.items.includes('it-stub-1')); assert.ok(s.bonds.includes('b1'));
    assert.equal(s.pos, 'l-namjeon');
    await next(); await at('e01-stub', 'clue');
    assert.equal(await page.locator('.clue-card mark').innerText(), '곡조');
    await next(); await at('e01-stub', 'walk'); await pixelCheck();
    const piece = await page.locator('.piece.sprite').evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--f')) * devicePixelRatio / 32);
    assert.ok(Number.isInteger(piece) || Number.isInteger(1 / piece));
    await next(); await at('l-namjeon');
    seen.push(...await page.evaluate(() => window.steps));
    assert.deepEqual(seen, ['prep1', 'prep2', 'scene', 'grade', 'clue', 'walk']);
    const prior = await state();
    await next();
    for (let i = 0; i < 5 && (await current()).scene !== 'e02-stub'; i++) await next();
    const after = await state();
    assert.equal(after.abil.eumak, prior.abil.eumak + 2);
    assert.equal(after.items.filter((id) => id === 'it-stub-music').length, 1);
  });
  await test('적중 없음·동일 인연 카드·구슬 없이 진행', async () => {
    await openFirst();
    const card = await reachGrade('sword');
    assert.equal(card, brightCard);
    assert.notEqual(await page.locator('.grade').getAttribute('data-grade'), 'shine');
    assert.deepEqual((await state()).pearls, {});
    assert.equal((await state()).events['e01-stub'].hits, 0);
  });
  await test('준비 즉시 저장·새로 고침·교사 도움·다시 보기 불변', async () => {
    await openFirst(); await next();
    await page.locator('[data-act="prep"][data-action="study"]').click();
    const first = (await state()).events['e01-stub'];
    assert.equal(first.turns.length, 1);
    await page.reload(); await ready(); await page.getByRole('button', { name: '이어 하기', exact: true }).click(); await at('e01-stub', 'prep2');
    assert.deepEqual((await state()).events['e01-stub'], first);
    await page.locator('[data-tool="settings"]').click(); await page.locator('[data-set="teacher"]').click(); await page.keyboard.press('Escape');
    await page.locator('[data-teacher="peek"]').click();
    assert.equal((await state()).events['e01-stub'].peek, true);
    await reachGrade();
    await next(); await next(); await next(); await at('l-namjeon');
    const before = await state();
    await page.evaluate(() => G.app.open('e01-stub')); await at('e01-stub', 'preview');
    assert.equal(await page.locator('[data-act="prep"]').count(), 0);
    assert.equal(await page.locator('.prep-history').count(), 1);
    for (let i = 0; i < 15 && (await current()).scene === 'e01-stub'; i++) await next();
    assert.deepEqual(await state(), before);
  });
  await test('집 자동 장식·단계와 재물 분리·보따리와 소원', async () => {
    await openFirst(); await reachGrade();
    await page.locator('[data-hud="house"]').click();
    assert.equal(await page.locator('.house-view [data-item="it-stub-1"]').count(), 1);
    assert.equal(await page.locator('.house-view [data-slot], .house-view [data-act="place"]').count(), 0);
    const oldStage = await page.locator('.house-view').getAttribute('data-stage');
    const oldDecor = await page.locator('.house-view').getAttribute('data-decor');
    await page.evaluate(() => { G.save.state.res.wealth = 100; G.house.refresh(); });
    assert.equal(await page.locator('.house-view').getAttribute('data-stage'), oldStage);
    assert.notEqual(await page.locator('.house-view').getAttribute('data-decor'), oldDecor);
    await page.keyboard.press('Escape');
    await page.evaluate(() => G.dream.open('bonds'));
    assert.equal(await page.locator('.bag .bond-card').count(), 1);
    assert.equal(await page.locator('.bag').innerText().then((s) => /1명|한 명/.test(s)), false);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { G.save.state.awake = true; G.save.state.teacher = false; });
    assert.equal(await page.evaluate(() => G.dream.open('house')), false);
  });
  await test('실제 육성 화면에서 자동 준비 사건을 지나도 기록·보상 불변', async () => {
    await openFirst(); await next();
    await page.locator('[data-act="prep"][data-action="study"]').click();
    await page.goto(url + '?fixture=1&teacher=1&scene=e03-stub'); await ready();
    const auto = (await state()).events['e02-stub'];
    assert.equal(auto.auto, true);
    await page.evaluate(() => G.app.open('e01-stub'));
    for (let i = 0; i < 5 && (await current()).step !== 'prep2'; i++) await next();
    await reachGrade();
    for (let i = 0; i < 10 && (await current()).scene !== 'e02-stub'; i++) await next();
    await at('e02-stub');
    assert.equal((await current()).autoAdvance, true);
    const before = await state();
    for (let i = 0; i < 14 && (await current()).scene === 'e02-stub'; i++) await next();
    await at('e03-stub');
    const after = await state();
    assert.deepEqual(after.events['e02-stub'], auto);
    assert.deepEqual(after.res, before.res);
    assert.deepEqual(after.abil, before.abil);
    assert.deepEqual(after.bonds, before.bonds);
    assert.deepEqual(after.items, before.items);
    assert.equal(after.done['e02-stub'], undefined);
    assert.equal(await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'e02-stub').gradeLabel), '—');
  });
  await test('실제 e01 휴대폰 플레이·준비/결과 캡처·빈 sprites 요청 없음', async () => {
    await openFirst(true, 2);
    await page.evaluate(() => { G.data.sprites = {}; G.hud.refresh(); });
    const spriteRequests = [];
    const recordSprite = (r) => { if (/\/assets\/(sprites\/|ui\/icon_(?:munjang|eumak|muye|jiryak|gong|fame|wealth)\.)/.test(r.url())) spriteRequests.push(r.url()); };
    page.on('request', recordSprite);
    await next(); await at('e01-huayin', 'prep1');
    assert.equal(await page.locator('.prep-fallback').count(), 1);
    await hudCheck(); await pixelCheck();
    fs.mkdirSync(path.join(ROOT, 'tests/shots'), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/dream-e01-prep.png'), scale: 'css' });
    await page.locator('[data-act="prep"][data-action="study"]').click();
    assert.equal(await page.locator('.prep-fallback').count(), 1);
    assert.equal(await page.locator('.prep-sprite').count(), 0);
    assert.equal(await page.locator('[data-icon]').count(), 0);
    await next(); await at('e01-huayin', 'prep2');
    await reachGrade('study'); await at('e01-huayin', 'grade');
    await page.waitForSelector('.grade[data-counted="true"]');
    await page.waitForSelector('#tray [data-act="next"]');
    await hudCheck(); await pixelCheck();
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/dream-e01-grade.png'), scale: 'css' });
    await page.locator('.mark.fiction .real').last().scrollIntoViewIfNeeded();
    const pinned = await page.locator('.sim-hud').evaluate((el) => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, header: document.querySelector('.topbar').getBoundingClientRect().bottom }));
    assert.ok(pinned.top >= pinned.header && pinned.bottom < 844, '긴 설명을 읽어도 꿈 점수 띠는 화면에 남음');
    await page.evaluate(() => { document.querySelector('.main').scrollTop = 0; window.scrollTo(0, 0); });
    assert.equal((await state()).events['e01-huayin'].grade, 'shine');
    await next(); await at('e01-huayin', 'clue');
    assert.ok(await page.locator('.clue-card mark').count());
    await next(); await at('e01-huayin', 'walk'); await next(); await at('l-namjeon');
    assert.deepEqual(await page.evaluate(() => G.data.sprites), {});
    assert.deepEqual(spriteRequests, []);
    page.off('request', recordSprite);
  });
  await test('승인 그림 실제 표시: 준비 넷·HUD·보상 아이콘·정수배·자동 재생', async () => {
    async function iconCheck(selector, keys) {
      const icons = page.locator(selector + ' img[data-icon]');
      await page.waitForFunction((sel) => [...document.querySelectorAll(sel + ' img[data-icon]')].every(i => i.complete && i.naturalWidth === 32), selector);
      const result = await icons.evaluateAll(imgs => imgs.map(img => {
        const r = img.getBoundingClientRect();
        return { id: img.dataset.icon, src: img.getAttribute('src'), width: img.naturalWidth, k: r.width * devicePixelRatio / img.naturalWidth, rendering: getComputedStyle(img).imageRendering, left: r.left, right: r.right, visible: r.width > 0 && r.height > 0 };
      }));
      assert.deepEqual(result.map(r => r.id).sort(), keys.slice().sort());
      for (const i of result) {
        assert.equal(i.src, 'assets/ui/icon_' + i.id + '.png'); assert.equal(i.width, 32); assert.ok(i.visible);
        assert.equal(i.rendering, 'pixelated'); assert.ok(Math.abs(i.k - Math.round(i.k)) < 0.001 || Math.abs(1 / i.k - Math.round(1 / i.k)) < 0.001, JSON.stringify(i));
        assert.ok(i.left >= 0 && i.right <= (await page.viewportSize()).width);
      }
      const boxes = await page.locator(selector + ' > span').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
      boxes.forEach((r, i) => { if (i) assert.ok(r.left >= boxes[i - 1].right - 0.5, '아이콘과 문구가 옆 항목과 겹치지 않음'); });
    }
    for (const screen of [{ width: 320, dpr: 1 }, { width: 390, dpr: 3 }, { width: 1200, dpr: 1 }]) {
      for (const action of ['study', 'geomungo', 'sword', 'strategy']) {
        await openFirst(true, screen.dpr); await page.setViewportSize({ width: screen.width, height: 844 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await next(); await at('e01-huayin', 'prep1');
        await page.locator('[data-act="prep"][data-action="' + action + '"]').click();
        const actor = page.locator('.prep-sprite'); await actor.waitFor();
        const info = await actor.evaluate(el => { const r = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: r.width, height: r.height, source: css.backgroundImage, animation: css.animationName, frames: css.getPropertyValue('--frames'), end: css.getPropertyValue('--sheet-end'), rendering: css.imageRendering }; });
        assert.equal(info.width, 96); assert.equal(info.height, 96); assert.equal(info.animation, 'prep-frames');
        assert.equal(info.frames, '4'); assert.equal(info.end, '-384px'); assert.equal(info.rendering, 'pixelated');
        assert.ok(info.source.endsWith('/assets/sprites/' + action + '.webp")'));
        const positions = new Set();
        for (let i = 0; i < 10; i++) { positions.add(await actor.evaluate(el => getComputedStyle(el).backgroundPositionX)); await page.waitForTimeout(90); }
        assert.ok(positions.size >= 3, '제품 CSS의 프레임 위치가 시간에 따라 변함');
        await iconCheck('.hud-abilities', ['munjang', 'eumak', 'muye', 'jiryak']);
        await hudCheck();
        await page.screenshot({ path: path.join(ROOT, `tests/shots/approved-prep-${screen.width}-${action}.png`), scale: 'css' });
        if (action === 'study') {
          await reachGrade('study'); await at('e01-huayin', 'grade');
          await page.waitForSelector('.grade[data-counted="true"]');
          await iconCheck('.reward-numbers', ['gong', 'fame', 'wealth']);
          await page.evaluate(() => { Object.keys(G.save.state.abil).forEach(k => G.save.state.abil[k] = G.sim.config.maxAbility); G.hud.refresh(); });
          await iconCheck('.hud-abilities', ['munjang', 'eumak', 'muye', 'jiryak']);
          await hudCheck();
          await page.screenshot({ path: path.join(ROOT, `tests/shots/approved-reward-${screen.width}.png`), scale: 'css' });
        }
        spriteProbe.push({ action, width: screen.width, dpr: screen.dpr, css: [info.width, info.height], framesSeen: positions.size });
      }
    }
    assert.equal(spriteProbe.length, 12);
    fs.writeFileSync(path.join(ROOT, 'tests/shots/approved-sprites.json'), JSON.stringify(spriteProbe, null, 2));
  });
  await test('실제 여덟 구슬 320/390: 좌표 유지·hit-test·일반 클릭', async () => {
    await fresh('');
    const scenes = await page.evaluate(() => G.data.scenes.filter((s) => s.pearl && s.meet).map((s) => ({ id: s.id, meet: s.meet, pearl: s.pearl })));
    assert.equal(scenes.length, 8);
    for (const width of [320, 390]) for (const scene of scenes) {
      await fresh('?teacher=1&scene=' + scene.id);
      await page.setViewportSize({ width, height: 844 });
      for (let i = 0; i < 12 && (await current()).step !== 'scene'; i++) {
        const step = (await current()).step;
        if (step === 'prep1' || step === 'prep2') await page.locator('[data-act="prep"][data-action="study"]').click();
        await next();
      }
      await at(scene.id, 'scene'); await pixelCheck();
      const hit = (selector) => page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return target === el || el.contains(target);
      });
      const inlineHit = await hit('.stage-pearl');
      const inspect = page.locator('[data-act="inspect-picture"]');
      const hasInspect = await inspect.count() > 0;
      let accessible = inlineHit, source = false;
      if (hasInspect) {
        await inspect.click(); await page.waitForSelector('.pearl-inspection');
        await page.waitForFunction(() => document.querySelector('.pearl-inspection .pic-box > img')?.naturalWidth > 0);
        const spot = page.locator('.inspect-spot');
        await spot.scrollIntoViewIfNeeded();
        accessible = await hit('.inspect-spot');
        const evidence = page.locator('.pearl-evidence[data-trace="' + scene.pearl.trace + '"]');
        source = await evidence.count() > 0;
        if (scene.pearl.trace === 'canon') source = source && (await evidence.innerText()).includes(scene.pearl.canon);
        else source = source && await evidence.locator('.mark.fiction').count() === 1;
        const coords = await spot.evaluate((el) => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
        assert.deepEqual(coords, { x: scene.pearl.x, y: scene.pearl.y });
        await pixelCheck();
        if (accessible) { await spot.click(); assert.equal((await state()).pearls[scene.meet], true); }
        await page.keyboard.press('Escape');
      } else if (inlineHit) { await page.locator('.stage-pearl').click(); assert.equal((await state()).pearls[scene.meet], true); }
      pearlProbe.push({ id: scene.id, width, inlineHit, accessible, source });
    }
    console.log('  구슬 클릭 판정 ' + JSON.stringify(pearlProbe));
    assert.deepEqual(pearlProbe.filter((p) => !p.accessible).map((p) => p.width + ':' + p.id), [], '일반 클릭 불가능한 구슬');
  });
  await test('실제 구슬 원작 근거 두 곳·게임 설정 여섯 곳 표시', async () => {
    assert.equal(pearlProbe.length, 16);
    assert.deepEqual(pearlProbe.filter((p) => !p.source).map((p) => p.width + ':' + p.id), [], '근거 분류와 본문 누락');
  });
  await test('실제 같은 말판 칸: e04→e05에서 추가 걷기 없음', async () => {
    await fresh('?teacher=1&scene=e04-exam');
    for (let i = 0; i < 6 && (await current()).step !== 'preview'; i++) await next();
    await reachGrade('study'); await next(); await at('e04-exam', 'clue');
    await next(); await at('e05-chunun', 'preview');
    assert.equal(await page.locator('.walk-blk').count(), 0);
    assert.equal(await page.evaluate(() => G.board.outfitAt('sq-hallim')), 'gwan');
  });
} catch (e) { if (!issues.length) issues.push(e.stack); }
finally { await browser.close(); await new Promise((r) => server.close(r)); }
console.log('점검 묶음 ' + passed + '개 통과');
if (issues.length) console.error(issues.join('\n'));
process.exit(issues.length ? 1 : 0);
