// T5 실제 브라우저 계약. 중대 잠금/기록 위반은 즉시 중단한다.
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
const base = origin + '/index.html';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page, passed = 0;
const issues = [];
const critical = (condition, message) => { if (!condition) { const e = new Error('CRITICAL: ' + message); e.critical = true; throw e; } };
async function fresh(query = '?fixture=1') {
  if (page) await page.context().close();
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', (e) => issues.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) issues.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) issues.push('외부 요청: ' + r.url()); });
  await page.goto(base + query); await ready();
}
const ready = () => page.waitForFunction(() => G.app.booted);
const current = () => page.evaluate(() => G.app.current());
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const at = (scene, step) => page.waitForFunction(({ scene, step }) => G.app.current()?.scene === scene && (!step || G.app.current().step === step), { scene, step });
const next = () => page.locator('#tray [data-act="next"]').click();
async function chapter() { if ((await current())?.step === 'chapter') await next(); }
async function resume() { await page.reload(); await ready(); await page.getByRole('button', { name: '이어 하기', exact: true }).click(); await page.waitForSelector('.play'); await chapter(); }
async function seed(pos, extra = {}) {
  await page.evaluate(({ pos, extra }) => { G.save.reset(); Object.assign(G.save.state, { started: true, pos }, extra); G.save.write(); G.app.resume(); }, { pos, extra });
  await page.waitForSelector('.play'); await chapter();
}
async function test(name, fn) {
  const before = issues.length;
  try { await fn(); assert.equal(issues.length, before, issues.slice(before).join(' | ')); passed++; console.log('✓ ' + name); }
  catch (e) { issues.push(name + ': ' + e.message); console.error('✗ ' + name + ': ' + e.stack); if (e.critical) throw e; }
}
async function advance() {
  if (await page.locator('[data-act="staff"]').count()) { await page.locator('[data-act="staff"]').click(); return; }
  if (await page.locator('[data-act="skip"]').count()) { await page.locator('[data-act="skip"]').click(); return; }
  await next();
}
async function until(id, step, limit = 80) { for (let i = 0; i < limit; i++) { const c = await current(); if (c?.scene === id && (!step || c.step === step)) return; await advance(); } throw Error('도달 실패: ' + id + '/' + step); }
async function completeWish() {
  const answers = await page.evaluate(() => G.app.current().data.answers);
  for (const id of answers) { const b = page.locator('[data-word="' + id + '"]'); if (!await b.isDisabled()) await b.click(); }
}
async function fillMatch(wrong = false) {
  const picks = await page.evaluate((wrong) => {
    const wishes = G.data.wishes;
    return G.data.journal.pairs.map((pair) => ({ slot: pair.id, pick: wishes.find((w) => !w.dreamHidden && (wrong ? w.id !== pair.wish : w.id === pair.wish)).name }));
  }, wrong);
  for (const { slot, pick } of picks) { await page.locator('.activity [data-slot="' + slot + '"]').click(); await page.locator('.activity [data-choice="' + pick + '"]').click(); }
}
async function settleJournal() {
  await at('c4-journal'); await chapter();
  if (!await page.locator('.activity.solved').count()) { await fillMatch(); await page.locator('[data-act="check"]').click(); }
  await page.locator('.link-opt:not([disabled])').first().click();
  await next(); await at('c5-dialogue'); await chapter();
}
async function interpret() {
  await until('c5-dialogue', 'interp-pick');
  assert.equal(await page.locator('.ev-opt[data-ev="E10"]').count(), 0);
  await page.locator('.interp-opt').first().click(); await page.locator('.ev-opt').first().click(); await next();
  await until('c5-dialogue', 'interp-revise');
  assert.ok((await state()).interp.heard);
  await page.locator('[data-act="revise"]').click();
  await page.locator('.interp-opt').nth(1).click(); await page.locator('.ev-opt').last().click(); await next();
  await until('c5-ordination');
  assert.equal((await state()).interp.revised, true);
  assert.equal((await state()).interp.final, true);
  await until('r-result');
}
async function virtualStaff() {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 96;
    const g = canvas.getContext('2d');
    ['#b44b41', '#4f8b58', '#426db5', '#dbac35'].forEach((color, frame) => {
      g.fillStyle = color; g.fillRect(frame * 96, 0, 96, 96);
      g.fillStyle = '#fff'; g.fillRect(frame * 96 + 30, 8 + frame * 15, 12, 35);
    });
    return canvas.toDataURL('image/webp').split(',')[1];
  });
  await page.route('**/assets/tests/staff-virtual.webp', (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: Buffer.from(encoded, 'base64') }));
  const dimensions = await page.evaluate(async () => {
    G.data.sprites.hoseung = { src: 'assets/tests/staff-virtual.webp', width: 96, height: 96, frames: 4, rows: 1 };
    const img = new Image(); img.src = G.data.sprites.hoseung.src; await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  assert.deepEqual(dimensions, [384, 96]);
}
const staffCell = () => page.locator('.cut-figure[data-sprite="hoseung"] .cut-sprite');
const staffPose = () => staffCell().evaluate((el) => ({ x: getComputedStyle(el).backgroundPositionX, y: getComputedStyle(el).backgroundPositionY, animation: getComputedStyle(el).animationName, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
async function heldStaff() {
  const samples = [];
  for (let i = 0; i < 13; i++) { samples.push(await staffPose()); await page.waitForTimeout(150); }
  assert.ok(samples.every((p) => p.x === '-192px' && p.y === '0px' && p.animation === 'none' && p.width === 96 && p.height === 96), JSON.stringify(samples));
}
try {
  await fresh();
  await test('새 컷신·소원 화면 등록', async () => {
    assert.equal(await page.evaluate(() => typeof G.cutscene?.play), 'function');
    assert.equal(await page.evaluate(() => typeof G.app.screens.wish), 'function');
  });
  if (issues.length) throw Error('미구현 계약 RED');
  await test('구운몽부터 시작·옛 서장 기록 재개·결과의 선택형 비교 읽기', async () => {
    await fresh('');
    await page.getByRole('button', { name: '시작하기', exact: true }).click(); await chapter(); await at('c1-bridge');
    assert.equal(await page.evaluate(() => G.app.list().length), 28);
    await page.locator('[data-tool="toc"]').click();
    assert.equal(await page.locator('.toc-ch[data-ch="0"]').count(), 0);
    await page.keyboard.press('Escape');
    const abil = { munjang: 12, eumak: 7, muye: 4, jiryak: 6 };
    await seed('cut-josin', { abil }); await at('c1-bridge');
    assert.deepEqual((await state()).abil, abil);
    await seed('cut-josin', { awake: true, awakeAt: 1234, abil }); await at('c3-awake');
    assert.equal((await state()).awakeAt, 1234); assert.deepEqual((await state()).abil, abil);
    await seed('r-result', { awake: true, awakeAt: 1234 });
    const before = await state();
    const reading = page.locator('details.comparison-reading');
    assert.equal(await reading.getAttribute('open'), null);
    assert.equal(await page.locator('.notes .mark.variant').filter({ hasText: '조신의 세월' }).count(), 0);
    await reading.locator('summary').click();
    assert.ok((await reading.innerText()).includes('별개의 이야기'));
    assert.ok((await reading.innerText()).includes('양소유'));
    assert.equal(await reading.locator('.scene-img img').count(), 2);
    assert.equal(await reading.locator('.mark.variant').filter({ hasText: '조신의 세월' }).count(), 1);
    assert.deepEqual(await state(), before, '선택형 비교 읽기는 진행과 기록을 바꾸지 않음');
  });
  for (const met of [true, false]) await test('깨어난 뒤 모드 전환: ' + (met ? '실제 인연 획득' : '인연 없음') + '·꿈 도구 권한·진행 보존', async () => {
    await fresh('?teacher=1&scene=' + (met ? 'e01-huayin' : 'c3-staff'));
    if (met) {
      await chapter();
      for (let i = 0; i < 30 && (await current()).step !== 'grade'; i++) {
        const step = (await current()).step;
        if (step === 'prep1' || step === 'prep2') await page.locator('[data-act="prep"][data-action="study"]').click();
        await next();
      }
      await at('e01-huayin', 'grade');
      assert.ok((await state()).bonds.includes('chae'), '준비와 대사 단추로 실제 인연 획득');
      await page.locator('[data-tool="toc"]').click();
      await page.locator('.toc-scene[data-scene="c3-staff"]').click();
    }
    await until('c3-staff', 'staff');
    await page.locator('[data-act="staff"]').click();
    await page.waitForSelector('.dream-shatter');
    await page.locator('[data-act="skip"]').click(); await at('c3-awake');
    await page.waitForSelector('.stage-speech');
    const awake = await state();
    assert.equal(awake.awake, true); assert.ok(awake.awakeAt > 0);
    assert.equal(awake.bonds.length, met ? 1 : 0);
    const withoutMode = (s) => { const { teacher, ...rest } = s; return rest; };
    const toggle = async () => {
      await page.locator('[data-tool="settings"]').click();
      await page.locator('[data-set="teacher"]').click();
      await page.locator('.sheet').last().getByRole('button', { name: '닫기', exact: true }).click();
    };
    const protectedViews = '.bag .board-view, .bag .house-view, .bag .bond-list';
    const verifyStudent = async () => {
      assert.equal((await state()).teacher, false);
      assert.equal(await page.locator('.sim-hud, [data-tool="bonds"]').count(), 0, '학생 전환 즉시 꿈 HUD와 인연첩 단추 제거');
      assert.equal(await page.locator(protectedViews).count(), 0, '열린 꿈 판도 현재 권한 적용');
    };
    await page.evaluate(() => { window.oldDreamButtons = [...document.querySelectorAll('[data-tool="bonds"], [data-hud]')]; });
    assert.equal(await page.locator('.sim-hud').count(), 1);
    await toggle();
    await page.evaluate(() => window.oldDreamButtons[0].click());
    console.log('  모드 전환 관찰 ' + JSON.stringify(await page.evaluate(() => ({
      scene: G.app.current().scene, teacher: G.save.state.teacher, awake: G.save.state.awake,
      bonds: G.save.state.bonds, hud: document.querySelectorAll('.sim-hud').length,
      bondButtons: document.querySelectorAll('[data-tool="bonds"]').length,
      openedCards: document.querySelectorAll('.sheet .bond-card').length,
    }))));
    await verifyStudent();
    // 분리된 DOM의 기존 이벤트를 호출해 단추 제거만으로 검사를 통과하지 못하게 한다.
    await page.evaluate(() => window.oldDreamButtons.forEach((b) => b.click()));
    assert.equal(await page.locator('.bag, .sheet .bond-card').count(), 0, '이전 단추 콜백도 권한 검사');
    assert.deepEqual(withoutMode(await state()), withoutMode(awake));
    await page.locator('.toast').evaluateAll((nodes) => nodes.forEach((n) => n.click()));
    await toggle();
    assert.equal(await page.locator('.sim-hud').count(), 1, '교사 재전환 때 HUD 복원');
    assert.equal(await page.locator('[data-tool="bonds"]').count(), 1);
    await page.locator('[data-tool="bonds"]').click();
    assert.equal(await page.locator('.bag .bond-card').count(), met ? 1 : 0);
    await page.locator('.bag-sheet').getByRole('button', { name: '닫기', exact: true }).click();
    for (const tab of ['board', 'house', 'bonds']) {
      await page.locator('[data-tool="keep"]').click();
      await page.locator('.bag [data-tab="' + tab + '"]').click();
      await page.evaluate(() => {
        window.oldDreamTabs = [...document.querySelectorAll('.bag [data-tab]')];
        // 열린 판이 있는 동안 설정을 적용하는 공통 API 경로도 검사한다.
        void G.app.settings();
      });
      await page.locator('[data-set="teacher"]').click();
      await verifyStudent();
      assert.deepEqual(await page.locator('.bag [data-tab]').evaluateAll((nodes) => nodes.map((n) => n.dataset.tab)), ['wishes', 'pearls']);
      await page.evaluate(() => window.oldDreamTabs.forEach((b) => b.click()));
      await verifyStudent();
      assert.deepEqual(withoutMode(await state()), withoutMode(awake));
      await page.locator('[data-set="teacher"]').click();
      assert.deepEqual(await page.locator('.bag [data-tab]').evaluateAll((nodes) => nodes.map((n) => n.dataset.tab)), ['board', 'house', 'bonds', 'wishes', 'pearls'], '열린 판도 교사 권한 복원');
      await page.locator('.sheet').last().getByRole('button', { name: '닫기', exact: true }).click();
      await page.locator('.bag [data-tab="' + tab + '"]').click();
      assert.equal(await page.locator(protectedViews).count(), 1);
      await page.locator('.bag-sheet').getByRole('button', { name: '닫기', exact: true }).click();
    }
    const preserve = async () => {
      const before = await state(), position = await current();
      await page.evaluate(() => { window.sameBody = document.querySelector('.main-inner'); window.sameNodes = [...window.sameBody.querySelectorAll('button,input')]; });
      for (let i = 0; i < 2; i++) {
        await toggle();
        if (!(await state()).teacher) await verifyStudent();
        else assert.equal(await page.locator('[data-tool="bonds"]').count(), 1);
        assert.deepEqual(withoutMode(await state()), withoutMode(before));
        assert.deepEqual(await current(), position);
        assert.equal(await page.evaluate(() => window.sameBody === document.querySelector('.main-inner') && window.sameNodes.every((n) => n.isConnected)), true, '본문과 진행 중 선택 DOM 유지');
      }
    };
    await preserve();
    if (met) {
      await until('c4-journal'); await chapter();
      await page.locator('.activity [data-slot]').first().click();
      await page.locator('.activity [data-choice]').first().click();
      assert.equal(Object.keys((await state()).journal.match.picks).length, 1);
      await preserve();
      await settleJournal(); await until('c5-dialogue', 'interp-pick');
      await page.locator('.interp-opt').first().click(); await page.locator('.ev-opt').first().click();
      const choices = await page.locator('.interp-opt.chosen, .ev-opt.chosen').count();
      assert.equal(choices, 2);
      await preserve();
      assert.equal(await page.locator('.interp-opt.chosen, .ev-opt.chosen').count(), choices);
      await interpret(); await page.locator('.name-in').fill('검증'); await preserve();
      assert.equal(await page.locator('.name-in').inputValue(), '검증');
    }
    await page.locator('[data-tool="toc"]').click();
    await page.locator('.toc-scene[data-scene="c3-feast"]').click(); await at('c3-feast');
    await page.locator('[data-tool="settings"]').click();
    await page.locator('[data-set="teacher"]').click();
    assert.equal((await state()).teacher, false);
    assert.equal((await current()).scene, met ? 'r-result' : 'c3-awake', 'Teacher revocation must redirect before settings closes');
    assert.equal(await page.locator('.play[data-scene="c3-feast"]').count(), 0);
    assert.equal(await page.locator('[data-set="teacher"]').count(), 0, 'Redirect closes the old scene settings without a separate close click');
    await at(met ? 'r-result' : 'c3-awake');
    assert.equal((await state()).awakeAt, awake.awakeAt, '잠긴 꿈에서 교사 해제 시 마친 장면을 지난 재개 위치와 시각 보존');
    assert.deepEqual((await state()).bonds, awake.bonds);
    assert.deepEqual((await state()).res, awake.res);
  });
  await test('호승 4프레임: 두 주기 이상 올림 고정·저장 후 내려치기·readonly 재연', async () => {
    await fresh(''); await virtualStaff(); await seed('c3-feast', { best: 99 });
    await until('c3-staff', 'staff');
    await heldStaff();
    critical(!(await state()).awake, '대기 중 자동 깨어남');
    assert.equal(await page.locator('[data-act="skip"]').count(), 0);
    const raised = await staffCell().screenshot();
    await page.evaluate(() => G.app.on('wake', () => {
      window.strikeOrder = { saved: JSON.parse(localStorage.getItem(G.save.key)), pose: getComputedStyle(document.querySelector('.cut-figure[data-sprite="hoseung"] .cut-sprite')).backgroundPositionX };
    }));
    await page.locator('[data-act="staff"]').click();
    critical((await state()).awake, '클릭 즉시 깨어남 미저장');
    const order = await page.evaluate(() => window.strikeOrder);
    assert.equal(order.saved.awake, true); assert.equal(order.pose, '-192px', '올린 자세에서 깨어남 저장이 먼저');
    assert.equal((await staffPose()).x, '-288px');
    assert.equal((await staffPose()).animation, 'none');
    assert.equal(await page.locator('.dream-shatter').count(), 0, '내려치기 자세를 보여 준 뒤 부서짐');
    const struck = await staffCell().screenshot();
    assert.equal(raised.equals(struck), false, '실제 렌더된 프레임이 달라짐');
    await page.waitForSelector('.dream-shatter'); await page.locator('[data-act="skip"]').click(); await at('c3-awake');
    await page.locator('[data-tool="settings"]').click(); await page.locator('[data-set="teacher"]').click(); await page.keyboard.press('Escape');
    const beforeReplay = await state();
    await page.evaluate(() => G.app.open('c3-staff')); await at('c3-staff');
    while ((await current()).step !== 'staff') await next();
    assert.equal((await current()).revisit, true);
    await heldStaff();
    await page.locator('[data-act="staff"]').click();
    assert.equal((await staffPose()).x, '-288px');
    assert.deepEqual(await state(), beforeReplay);
    await page.waitForSelector('.dream-shatter'); await page.locator('[data-act="skip"]').click(); await at('c3-awake');
    assert.deepEqual(await state(), beforeReplay, '재연은 진행·기록·시각을 바꾸지 않음');
  });
  await test('호승 내려치기 프레임 중 새로 고침해도 선방 복귀·잠금 유지', async () => {
    await fresh(''); await virtualStaff(); await seed('c3-feast'); await until('c3-staff', 'staff');
    await page.locator('[data-act="staff"]').click();
    assert.equal((await staffPose()).x, '-288px');
    const awakeAt = (await state()).awakeAt;
    critical((await state()).awake && awakeAt > 0, '내려치기 표시 중 깨어남 미저장');
    await resume(); await at('c3-awake');
    critical((await state()).awake && (await state()).awakeAt === awakeAt, '내려치기 중 재로딩으로 깨어남 소실');
    critical(await page.evaluate(() => G.app.open('c3-staff', { quiet: true })) === false, '내려치기 재개 후 잠금 우회');
  });
  await test('컷신 시간·그림·스프라이트 대체·효과·이동·멈춤·건너뛰기', async () => {
    await fresh('');
    await page.evaluate(() => {
      // 승인 대기 그림을 쓰지 않고 기존 말 시트로 메타 기반 프레임 재생만 검증한다.
      G.data.sprites.yang = { src: 'assets/board/horse_walk.webp', width: 32, height: 32, frames: 6, rows: 4 };
      const opening = G.app.list()[0];
      opening.kind = 'cut';
      opening.timeline = [
        { at: 0, img: 'sc_huayin', lines: ['시간 첫 줄'], sprites: [{ id: 'yang', x: 35, y: 55 }], effect: 'petals', move: { x: 6, y: 0, duration: 200 } },
        { at: 300, img: 'sc_tianjin', lines: ['시간 둘째 줄'], effect: 'light', pause: 'next' },
        { at: 500, lines: ['시간 셋째 줄'] },
      ];
    });
    await page.getByRole('button', { name: '시작하기', exact: true }).click(); await chapter();
    await page.waitForSelector('.cut-figure');
    assert.equal(await page.locator('.cut-figure').getAttribute('data-sprite'), 'yang');
    assert.equal(await page.locator('.cut-sprite').evaluate((el) => el.style.getPropertyValue('--frames')), '6');
    assert.equal(await page.locator('.cut-sprite').evaluate((el) => el.getBoundingClientRect().width), 96);
    // Chrome은 0%와 px 사이의 프레임 위치를 calc(0% - 96px)로 돌려준다.
    await page.waitForFunction(() => /-\d+(?:\.\d+)?px/.test(getComputedStyle(document.querySelector('.cut-sprite')).backgroundPositionX.replace(/\s/g, '')));
    const motion = await page.locator('.cut-sprite').evaluate((el) => ({ width: el.getBoundingClientRect().width, position: getComputedStyle(el).backgroundPositionX }));
    const offset = Number(motion.position.replace(/\s/g, '').match(/(-\d+(?:\.\d+)?)px/)[1]);
    assert.equal(Math.abs(offset) % motion.width, 0);
    console.log('  컷신 실제 프레임 이동 ' + motion.position);
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.stage-background img')).translate) > 0);
    await page.waitForFunction(() => document.querySelector('.cutscene')?.dataset.frame === '1');
    assert.ok((await page.locator('.stage-background img').getAttribute('src')).includes('sc_tianjin'));
    assert.equal(await page.locator('.cut-light').count(), 1);
    await page.locator('.stage-background').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.cutscene').getAttribute('data-frame'), '1');
    await next();
    await page.waitForFunction(() => document.querySelector('.cutscene')?.dataset.frame === '2');
    await page.locator('[data-act="skip"]').click(); await at('c1-cell');
    await fresh(); await page.getByRole('button', { name: '시작하기', exact: true }).click(); await chapter();
    await resume(); assert.equal(await page.locator('.cutscene').getAttribute('data-frame'), '0');
    await page.locator('.stage-background').click(); await at('c1-bridge');
  });
  await test('소원 찾기 첫 시도·오답·도움·재개·선생님용', async () => {
    await fresh(); await seed('c1-wish');
    await completeWish();
    assert.deepEqual((await state()).ledger['a-wish'], { first: true, help: null, final: true });
    critical(await page.evaluate(() => G.app.wishes().find((w) => w.id === 'misaek').hidden), '미색 연결 조기 노출');
    await fresh(); await seed('c1-wish');
    await page.locator('[data-word="w6"]').click();
    assert.equal(await page.locator('[data-help="answer"]:visible').count(), 0);
    await page.locator('[data-word="w6"]').click();
    assert.equal(await page.locator('.wish-memo:visible').count(), 1);
    await resume(); await at('c1-wish');
    await page.locator('[data-help="answer"]').click(); await completeWish();
    assert.deepEqual((await state()).ledger['a-wish'], { first: false, help: 'student', final: true });
    await fresh('?fixture=1&teacher=1&scene=c1-wish'); await chapter();
    await page.locator('[data-teacher="show"]').click(); await resume();
    await page.locator('[data-teacher="fill"]').click();
    assert.deepEqual((await state()).ledger['a-wish'], { first: null, help: 'teacher', final: true });
    await fresh(''); await seed('c1-wish'); await completeWish();
    assert.equal(await page.locator('.wish-found').count(), 5);
    assert.deepEqual((await state()).ledger['a-wish'], { first: true, help: null, final: true });
  });
  await test('학생 깨어남 클릭 시점·잠금·기록 보존', async () => {
    await fresh(); await seed('c3-feast', { best: 99, res: { gong: 20, fame: 30, wealth: 49 } });
    await until('c3-staff', 'staff');
    critical(!(await state()).awake, '난간 클릭 전 깨어남 기록');
    assert.equal(await page.locator('[data-act="skip"]').count(), 0);
    await resume(); await at('c3-feast');
    critical(!(await state()).awake, '지팡이 전 재개에서 깨어남 기록');
    await until('c3-staff', 'staff');
    await page.locator('[data-act="staff"]').click();
    critical((await state()).awake && (await state()).awakeAt > 0, '클릭 순간 깨어남 미저장');
    const when = (await state()).awakeAt;
    assert.equal((await state()).best, 99);
    await page.waitForSelector('[data-act="skip"]');
    await resume(); await at('c3-awake');
    critical((await state()).awakeAt === when, '깨어남 기록 소실');
    critical(await page.evaluate(() => G.app.open('e01-stub', { quiet: true })) === false, '깨어난 학생의 꿈 장면 열림');
    await page.evaluate(() => history.back()); await page.waitForTimeout(100);
    critical(!(await current()) || (await current()).scene === 'c3-awake', '뒤로 가기로 꿈 재개');
    await page.goto(base + '?fixture=1&scene=c3-feast'); await ready();
    critical((await current()).scene === 'c3-awake', '주소로 잠금 우회');
    await page.locator('[data-tool="toc"]').click();
    critical(await page.locator('.toc-scene[data-scene="e01-stub"]').isDisabled(), '목차 잠금 해제');
    await page.keyboard.press('Escape');
  });
  await test('맞대기 다섯 칸·도움·미색 잇기·해석 한 번 고치기·결과', async () => {
    await fresh(); await seed('c4-journal', { awake: true, awakeAt: 123, best: 99, pearls: { b1: true } });
    assert.equal(await page.locator('.activity .slot').count(), 5);
    assert.equal(await page.locator('[data-act="check"]').isDisabled(), true);
    await fillMatch(true); await page.locator('[data-act="check"]').click();
    assert.ok(await page.locator('.slot.wrong').count());
    await page.locator('[data-help="memo"]').click(); await page.locator('[data-help="answer"]').click(); await page.locator('[data-act="check"]').click();
    assert.deepEqual((await state()).ledger['j-match'], { first: false, help: 'student', final: true });
    assert.equal(await page.evaluate(() => G.app.wishes().find((w) => w.id === 'misaek').hidden), true);
    await page.locator('.link-opt[data-wish="bugwi"]').click();
    assert.equal(await page.evaluate(() => G.app.wishes().find((w) => w.id === 'misaek').hidden), false);
    await page.waitForSelector('.fairy-card.found.flipped');
    assert.equal(await page.locator('.fairy-grid').evaluate((el) => el.style.getPropertyValue('--cw')), '96px');
    await next(); await at('c5-dialogue'); await chapter(); await interpret();
    assert.equal(await page.locator('.ledger tbody tr').count(), 5);
    assert.match(await page.locator('.jp-score').innerText(), /99.*0/);
    assert.match(await page.locator('.journal-page').innerText(), /점수로 평가하지 않아요/);
    assert.equal(await page.locator('.board-view, .house-view, .bond-list').count(), 0);
    const before = (await state()).interp;
    await page.evaluate(() => G.app.open('c5-dialogue')); await until('r-result');
    assert.deepEqual((await state()).interp, before);
  });
  await test('실제 지팡이 앞뒤·결과 PNG와 장부 14행', async () => {
    await fresh(''); await seed('c3-feast', { best: 777, res: { gong: 123, fame: 234, wealth: 420 } });
    await until('c3-staff', 'staff');
    fs.mkdirSync(path.join(ROOT, 'tests/shots'), { recursive: true });
    const staffSprite = await page.evaluate(() => G.data.sprites.hoseung || null);
    if (staffSprite) assert.ok((await page.locator('.cut-figure[data-sprite="hoseung"] .cut-sprite').evaluate((el) => el.style.backgroundImage)).includes(staffSprite.src));
    else {
      const face = page.locator('.cut-figure[data-sprite="hoseung"] img');
      assert.equal(await face.getAttribute('src'), 'assets/pt/hoseung.webp');
      await page.waitForFunction(() => document.querySelector('.cut-figure[data-sprite="hoseung"] img')?.naturalWidth > 0);
      assert.equal(await face.evaluate((el) => el.getBoundingClientRect().width), 96);
    }
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/chapters-staff-before.png'), scale: 'css' });
    critical(!(await state()).awake, '실제 데이터 난간 클릭 전 깨어남');
    await page.locator('[data-act="staff"]').click();
    critical((await state()).awake, '실제 데이터 난간 클릭 미저장');
    await page.waitForSelector('.dream-shatter');
    await page.waitForFunction(() => Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.shatter-piece')).transform).m42) > 0.1);
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/chapters-staff-after.png'), scale: 'css' });
    await page.locator('[data-act="skip"]').click(); await until('c4-journal');
    await settleJournal(); await interpret();
    assert.equal(await page.locator('.ledger tbody tr').count(), 14);
    assert.equal(await page.locator('.ledger-box .teacher-guide').count(), 1);
    await page.locator('.name-in').fill('시험/이름');
    const exportData = await page.evaluate(() => {
      const texts = [], original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (...args) { texts.push(args[0]); return original.apply(this, args); };
      try { const canvas = G.app.renderPage(); return { data: canvas.toDataURL('image/png'), texts, width: canvas.width, height: canvas.height }; }
      finally { CanvasRenderingContext2D.prototype.fillText = original; }
    });
    assert.equal(exportData.width, 900);
    assert.match(exportData.texts.join(' '), /꿈에서 쌓은 것 777.*깨고 남은 것 0/);
    assert.match(exportData.texts.join(' '), /점수로 평가하지 않아요/);
    assert.match(exportData.texts.join(' '), /대사의 말을 듣고 고쳤어요/);
    assert.equal(exportData.texts.some((text) => /^[.,!?]$/.test(text.trim())), false);
    fs.writeFileSync(path.join(ROOT, 'tests/shots/chapters-result.png'), Buffer.from(exportData.data.split(',')[1], 'base64'));
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/chapters-result-screen.png'), fullPage: true, scale: 'css' });
    const download = page.waitForEvent('download'); await page.locator('[data-act="save-image"]').click();
    assert.equal((await download).suggestedFilename(), '구운몽_꿈일지_시험이름.png');
  });
} catch (e) { if (!issues.length) issues.push(e.stack); }
finally { await browser.close(); await new Promise((r) => server.close(r)); }
console.log('점검 묶음 ' + passed + '개 통과');
if (issues.length) console.error(issues.join('\n'));
process.exit(issues.length ? 1 : 0);
