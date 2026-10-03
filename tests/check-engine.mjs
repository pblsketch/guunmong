// T2 계약 점검: 실제 engine/stage와 시험용 화면 확장을 Chrome에서 함께 실행한다.
// T3/T5 화면은 로드하지 않는다. 진행·저장·잠금·완료 로직은 게임 코드를 그대로 쓴다.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
let passed = 0;
function installScreens() {
  const hold = async (ctx, text) => { ctx.main.append(G.util.h('p', text)); await ctx.next(); };
  G.app.screens.cut = async (ctx, sc) => {
    ctx.step('cut');
    await G.stage.play(ctx, sc, { lines: [{ text: '시험 첫 줄' }, { say: 'yang', mood: 'smile', text: '시험 둘째 줄', shake: true }] });
  };
  G.app.screens.wish = async (ctx) => {
    ctx.step('wish');
    await hold(ctx, '소원 화면 확장');
  };
  G.app.screens.event = async (ctx, sc) => {
    if (ctx.readonly) { ctx.step('preview'); await G.stage.play(ctx, sc, { lines: ['기록 다시 보기'] }); return; }
    const steps = ['preview', 'prep1', 'prep2', 'scene', 'grade', 'clue', 'walk'];
    const begin = steps.indexOf(ctx.startStep);
    for (const step of steps.slice(Math.max(0, begin))) {
      if (!ctx.alive()) return;
      if (step === 'grade') ctx.finishEvent();
      ctx.step(step);
      ctx.main.replaceChildren(G.util.h('p', step));
      if (step === 'prep1' || step === 'prep2') {
        const turn = step === 'prep1' ? 0 : 1;
        await new Promise((resolve) => {
          const b = G.util.h('button', { type: 'button', dataset: { act: 'prep', action: 'study' } }, '준비');
          b.onclick = () => { if (ctx.alive()) { G.save.prepare(sc, turn, 'study'); resolve(); } };
          ctx.tray(b);
          ctx.signal.addEventListener('abort', resolve, { once: true });
        });
      } else await ctx.next();
    }
  };
  G.app.screens.waking = async (ctx) => {
    ctx.step('staff');
    const b = G.util.h('button', { type: 'button', dataset: { act: 'staff' } }, '난간 치기');
    await new Promise((resolve) => {
      b.onclick = () => { if (ctx.alive()) { G.app.wake(); resolve(); } };
      ctx.tray(b);
      ctx.signal.addEventListener('abort', resolve, { once: true });
    });
    if (ctx.alive()) { ctx.step('after'); await ctx.next(); }
  };
  for (const kind of ['journal', 'interp']) G.app.screens[kind] = async (ctx) => { ctx.step(kind); await hold(ctx, kind); };
  G.app.screens.result = async (ctx) => { ctx.step('result'); await new Promise((r) => ctx.signal.addEventListener('abort', r, { once: true })); };
  G.app.hook('scene', (ctx) => { ctx.page.dataset.mounted = 'yes'; });
  window.chaptersSeen = [];
  G.app.hook('chapter', (ctx) => { window.chaptersSeen.push(ctx.ch); });
  G.app.on('scene', (ctx) => { window.testCtx = ctx; });
}
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace('<head>', '<head><base href="../../">')
  .replace(/<script src="js\/game\/(?!app\.js|stage\.js)[^"]+"><\/script>/g, '')
  .replace('  <script src="js/main.js"></script>', '<script>(' + installScreens.toString() + ')();</script><script src="js/main.js"></script>');
const scratch = path.join(ROOT, 'tests/shots/engine-contract.html');
fs.mkdirSync(path.dirname(scratch), { recursive: true });
fs.writeFileSync(scratch, html);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://local').pathname).slice(1);
  const file = path.resolve(ROOT, relative || 'index.html');
  if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const url = origin + '/tests/shots/engine-contract.html?fixture=1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page;
async function fresh(target = url, viewport = { width: 390, height: 844 }) {
  if (page) await page.context().close();
  const context = await browser.newContext({ viewport });
  page = await context.newPage();
  page.setDefaultTimeout(3500);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/nodata.js')) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  page.on('request', (r) => { if (!r.url().startsWith(origin) && !/^(file|data|blob):/.test(r.url())) errors.push('외부 요청 ' + r.url()); });
  await page.goto(target);
  await ready();
}
const ready = () => page.waitForFunction(() => G.app.booted);
const current = () => page.evaluate(() => G.app.current());
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
async function at(id, step) { await page.waitForFunction(({ id, step }) => G.app.current()?.scene === id && (!step || G.app.current().step === step), { id, step }); }
async function clickNext() { await page.locator('#tray [data-act="next"]').click(); }
async function chapter() { if ((await current())?.step === 'chapter') await clickNext(); }
async function start() { await page.getByRole('button', { name: '시작하기', exact: true }).click(); await page.waitForSelector('.play'); await chapter(); }
async function reloadResume() { await page.reload(); await ready(); await page.getByRole('button', { name: '이어 하기', exact: true }).click(); await page.waitForSelector('.play'); await chapter(); }
async function seed(spec) {
  await page.evaluate((spec) => {
    G.save.reset();
    Object.assign(G.save.state, { started: true, pos: spec.pos, step: spec.step || 'preview', teacher: !!spec.teacher, awake: !!spec.awake, awakeAt: spec.awake ? 123 : 0 });
    if (spec.turns != null) {
      const sc = G.app.byId(spec.pos);
      for (let turn = 0; turn < spec.turns; turn++) G.save.prepare(sc, turn, 'study');
      if (spec.grade) G.save.finishEvent(sc);
    }
    if (spec.step) G.save.state.step = spec.step;
    G.save.write();
  }, spec);
  await reloadResume();
}
async function advance() {
  const prep = page.locator('[data-act="prep"]');
  const staff = page.locator('[data-act="staff"]');
  if (await prep.count()) await prep.click();
  else if (await staff.count()) await staff.click();
  else await clickNext();
}
async function until(id, limit = 100) { for (let i = 0; i < limit; i++) { if ((await current())?.scene === id) return; await advance(); } throw Error('도달 실패: ' + id); }
async function test(name, fn) {
  const n = errors.length;
  try { await fn(); assert.equal(errors.length, n, errors.slice(n).join(' | ')); passed++; console.log('✓ ' + name); }
  catch (e) { errors.push(name + ': ' + e.message); console.error('✗ ' + name + ': ' + e.stack); }
}
try {
  await fresh();
  await test('무대 API와 읽기 방식 제거', async () => {
    assert.equal(await page.evaluate(() => typeof G.stage?.play), 'function');
    await page.getByRole('button', { name: '설정', exact: true }).click();
    assert.equal(await page.locator('[data-set="mode"]').count(), 0);
    await page.keyboard.press('Escape');
    await start();
    assert.equal(await page.locator('.sheet').count(), 0);
  });
  if (errors.length) throw Error('기초 계약 실패');
  await test('장 순서와 사건 일곱 걸음·완료 선저장', async () => {
    await fresh(); await start();
    assert.equal(await page.evaluate(() => G.app.open('c4-journal', { quiet: true })), false);
    await page.locator('[data-tool="toc"]').click();
    assert.equal(await page.locator('.toc-scene[data-scene="e01-stub"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    const seen = [], steps = [];
    for (let i = 0; i < 130; i++) {
      const c = await current();
      if (seen.at(-1) !== c.ch) seen.push(c.ch);
      if (c.scene === 'e01-stub' && steps.at(-1) !== c.step) steps.push(c.step);
      if (c.scene === 'e01-stub' && c.step === 'grade') assert.equal((await state()).pos, 'l-namjeon');
      if (c.ch === 'R') break;
      await advance();
    }
    assert.deepEqual(seen, ['0', '1', '2', '3', '4', '5', 'R']);
    assert.deepEqual(await page.evaluate(() => window.chaptersSeen), ['0', '1', '2', '3', '4', '5']);
    assert.deepEqual(steps.filter((s) => s !== 'chapter'), ['preview', 'prep1', 'prep2', 'scene', 'grade', 'clue', 'walk']);
    assert.equal((await state()).awake, true);
    assert.equal(await page.locator('.play[data-mounted="yes"]').count(), 1);
  });
  await test('준비 중 저장 주입: 남은 턴·사건 첫 줄·기록 보존', async () => {
    for (const [turns, step] of [[0, 'prep1'], [1, 'prep2'], [2, 'scene']]) {
      await fresh(); await seed({ pos: 'e01-stub', turns, step: turns === 0 ? 'prep1' : undefined });
      await at('e01-stub', step);
      const before = (await state()).events;
      await reloadResume(); await at('e01-stub', step);
      assert.deepEqual((await state()).events, before);
    }
  });
  await test('결과·단서·걷기에서 다시 열면 다음 단위', async () => {
    for (const step of ['grade', 'clue', 'walk']) {
      await fresh(); await seed({ pos: 'e01-stub', turns: 2, grade: true, step });
      await at('l-namjeon');
      assert.ok((await state()).events['e01-stub'].grade);
    }
    await fresh(); await seed({ pos: 'e01-stub', turns: 2 });
    await at('e01-stub', 'scene'); await clickNext(); await at('e01-stub', 'grade');
    const before = await state();
    assert.equal(before.pos, 'l-namjeon');
    await reloadResume(); await at('l-namjeon');
    assert.deepEqual((await state()).res, before.res);
  });
  await test('컷신 새로 고침은 첫 줄·무대 줄 넘김', async () => {
    await fresh(); await start();
    assert.equal(await page.locator('.stage-dialogue').innerText(), '시험 첫 줄');
    await page.locator('.stage-dialogue').click();
    await page.waitForFunction(() => document.querySelector('.stage-dialogue')?.textContent.includes('시험 둘째 줄'));
    assert.equal(await page.locator('.stage-portrait img').count(), 1);
    await reloadResume();
    assert.equal(await page.locator('.stage-dialogue').innerText(), '시험 첫 줄');
    await page.locator('.stage-dialogue').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.stage-dialogue')?.textContent.includes('시험 둘째 줄'));
  });
  await test('마친 사건 다시 열기 불변·취소된 화면의 완료 차단', async () => {
    await fresh(); await seed({ pos: 'e01-stub', turns: 2 });
    await clickNext(); await until('l-namjeon');
    const before = await state();
    await page.evaluate(() => G.app.open('e01-stub'));
    await at('e01-stub', 'preview');
    assert.equal((await current()).revisit, true);
    await clickNext(); await at('l-namjeon');
    assert.deepEqual(await state(), before);
    await page.evaluate(() => { window.oldCtx = window.testCtx; window.cancelled = false; oldCtx.next().then(() => { window.cancelled = true; }); G.app.title(); });
    await page.waitForFunction(() => window.cancelled);
    assert.equal(await page.evaluate(() => oldCtx.alive()), false);
    const snapshot = await state();
    await page.evaluate(() => oldCtx.step('grade'));
    assert.deepEqual(await state(), snapshot);
    await fresh(); await start(); await until('c3-staff');
    const atStaff = await state();
    await page.evaluate(() => G.app.open('c1-bridge'));
    await at('c1-bridge'); await clickNext(); await at('c3-staff');
    assert.deepEqual(await state(), atStaff);
  });
  await test('깨어남 직전·직후 이어 하기와 잠금 네 길', async () => {
    await fresh(); await seed({ pos: 'c3-staff' }); await at('c3-feast');
    await until('c3-staff');
    assert.equal((await state()).awake, false);
    await page.locator('[data-act="staff"]').click();
    assert.equal((await state()).awake, true);
    await clickNext(); await at('c3-awake');
    await page.evaluate(() => history.back()); await page.waitForTimeout(150); await at('c3-awake');
    await reloadResume(); await at('c3-awake');
    await page.locator('[data-tool="toc"]').click();
    for (const id of ['cut-josin', 'c1-bridge', 'e01-stub', 'c3-feast', 'c3-staff']) assert.equal(await page.locator('.toc-scene[data-scene="' + id + '"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    for (const q of ['&ch=0', '&ch=2', '&ch=3', '&scene=c1-bridge', '&scene=c3-staff']) {
      await page.goto(url + q); await ready(); await at('c3-awake');
    }
    assert.equal(await page.evaluate(() => G.app.open('e01-stub', { quiet: true })), false);
    await page.goto(url + '&teacher=1&scene=e02-stub'); await ready(); await at('e02-stub');
    await page.goto(url + '&teacher=0&ch=1'); await ready(); await at('c3-awake');
    assert.equal((await state()).teacher, false);
  });
  await test('선생님 바로가기: 순차 보통 준비·부분 기록 보존·중복 보상 없음', async () => {
    await fresh();
    await page.evaluate(() => { G.save.prepare(G.app.byId('e01-stub'), 0, 'sword'); });
    const partial = (await state()).events['e01-stub'];
    await page.goto(url + '&teacher=1&scene=e03-stub'); await ready(); await chapter();
    let s = await state();
    assert.deepEqual(s.events['e01-stub'], partial);
    assert.equal(s.events['e02-stub'].auto, true);
    assert.equal(s.done['e02-stub'], undefined);
    assert.equal(await page.locator('[data-tool="fold"]').count(), 1);
    const res = s.res;
    await page.goto(url + '&teacher=1&scene=e03-stub'); await ready();
    assert.deepEqual((await state()).res, res);
    const row = await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'e02-stub'));
    assert.equal(row.gradeLabel, '—');
    await page.locator('[data-tool="toc"]').click();
    assert.equal(await page.locator('.teacher-guide').count(), 1);
    await page.keyboard.press('Escape');
    const beforeReplay = await state();
    await page.evaluate(() => G.app.open('e02-stub')); await at('e02-stub', 'preview');
    assert.equal((await current()).revisit, true);
    await clickNext(); await at('e03-stub');
    assert.deepEqual(await state(), beforeReplay);
  });
  await test('설정 저장·화면 접기·전체 화면', async () => {
    await fresh(url, { width: 1280, height: 800 });
    assert.equal(await page.locator('.title-screen [data-tool="full"]').count(), 1);
    await start();
    assert.equal(await page.locator('[data-tool="fold"]').count(), 0);
    await page.locator('[data-tool="settings"]').click();
    assert.match(await page.locator('.credit-full').innerText(), /국립국악원/);
    for (const key of ['music', 'sound', 'big', 'teacher']) await page.locator('[data-set="' + key + '"]').click();
    assert.equal(await page.locator('[data-set="mode"]').count(), 0);
    await page.locator('[data-set="full"]').click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.waitForFunction(() => document.querySelector('[data-set="full"]').getAttribute('aria-pressed') === 'true');
    assert.equal('full' in (await state()), false);
    await page.locator('[data-set="full"]').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    await page.waitForFunction(() => document.querySelector('[data-set="full"]').getAttribute('aria-pressed') === 'false');
    await page.keyboard.press('Escape');
    await reloadResume();
    const s = await state();
    assert.deepEqual([s.music, s.sound, s.big, s.teacher], [false, false, true, true]);
    assert.equal('mode' in s, false);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('big')), true);
    await page.locator('[data-tool="fold"]').click();
    assert.equal(await page.locator('.fold-ov').evaluate((el) => { const r = el.getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1; }), true);
    assert.equal(await page.evaluate(() => G.audio.hushed()), true);
    await page.getByRole('button', { name: '다시 펼치기', exact: true }).click();
    assert.equal(await page.evaluate(() => G.audio.hushed()), false);
    await page.locator('[data-tool="settings"]').click();
    await page.locator('[data-set="clear"]').click();
    await page.getByRole('button', { name: '그대로 두기', exact: true }).click();
    assert.equal((await state()).started, true);
    await page.locator('[data-tool="settings"]').click();
    await page.locator('[data-set="clear"]').click();
    await page.getByRole('button', { name: '지우기', exact: true }).click();
    await page.waitForSelector('.title-screen');
    assert.deepEqual((await state()).done, {});
    assert.deepEqual([(await state()).music, (await state()).big], [false, true]);
  });
  await test('새로 시작 확인 취소·수락', async () => {
    await fresh(); await seed({ pos: 'c3-awake', awake: true });
    await page.locator('[data-tool="home"]').click();
    await page.getByRole('button', { name: '처음부터 새로', exact: true }).click();
    await page.getByRole('button', { name: '그만두기', exact: true }).click();
    assert.equal((await state()).awake, true);
    await page.getByRole('button', { name: '처음부터 새로', exact: true }).click();
    await page.getByRole('button', { name: '새로 시작', exact: true }).click();
    await at('cut-josin');
    const s = await state();
    assert.equal(s.awake, false);
    assert.deepEqual(s.events, {});
    assert.deepEqual(s.items, []);
  });
  await test('글 표시·설정 카드·기본 선택지·도움 사다리·장부 보존', async () => {
    await fresh(); await start();
    await page.evaluate(() => {
      G.app.title();
      const root = document.getElementById('app'); root.replaceChildren();
      root.append(G.text.block({ gloss: '풀이 표시' }), G.text.block({ say: 'yang', text: '인물 대사' }));
      root.append(G.text.block({ mark: 'fiction', id: 'fc-check', body: '설정', real: '첫 설명' }));
      root.append(G.text.block({ mark: 'fiction', id: 'fc-check', body: '설정', real: '첫 설명' }));
      root.append(G.text.block({ mark: 'variant', body: '이본' }), G.text.block({ mark: 'interp', body: '해석' }));
      window.activity = { id: 'j-match', slots: [{ id: 'a', answer: '답', memo: '힌트' }], choices: ['답', '오답'], extra: ['추가'] };
      window.mount = () => { const box = G.util.h('div'); const tray = G.util.h('div'); root.append(box, tray); G.activity.mount(box, activity, { tray: (el) => tray.replaceChildren(el) }); };
      mount();
    });
    assert.equal(await page.locator('.gloss:visible').count(), 1);
    assert.equal(await page.locator('.say .face').count(), 1);
    assert.equal(await page.locator('.mark.fiction .real').count(), 1);
    assert.equal(await page.locator('.mark.variant').count(), 1);
    assert.equal(await page.locator('.mark.interp').count(), 1);
    assert.equal(await page.locator('[data-choice="추가"]').count(), 0);
    await page.locator('[data-choice="오답"]').click(); await page.locator('[data-act="check"]').click();
    assert.equal(await page.locator('.slot.wrong').count(), 1);
    assert.equal((await state()).ledger['j-match'].first, false);
    assert.equal((await state()).wrong.length, 1);
    await page.locator('[data-help="memo"]').click(); await page.locator('[data-help="answer"]').click(); await page.locator('[data-act="check"]').click();
    const ledger = (await state()).ledger;
    assert.deepEqual(ledger['j-match'], { first: false, help: 'student', final: true });
    await page.evaluate(() => { document.getElementById('app').replaceChildren(); mount(); });
    await page.locator('[data-choice="오답"]').click(); await page.locator('[data-act="check"]').click();
    assert.deepEqual((await state()).ledger, ledger);
  });
  await test('선생님 도움을 먼저 쓰면 첫 시도 없음·새로 고침 보존', async () => {
    await fresh(); await start();
    const mount = () => {
      G.app.title(); G.save.state.teacher = true; G.app.applySettings();
      const box = G.util.h('div'), tray = G.util.h('div'); document.getElementById('app').replaceChildren(box, tray);
      G.activity.mount(box, { id: 'j-match', slots: [{ id: 'a', answer: '답' }], choices: ['답', '오답'] }, { tray: (el) => tray.replaceChildren(el) });
    };
    await page.evaluate(mount); await page.locator('[data-teacher="fill"]').click();
    await page.reload(); await ready(); await page.evaluate(mount);
    await page.locator('[data-teacher="fill"]').click(); await page.locator('[data-act="check"]').click();
    assert.deepEqual((await state()).ledger['j-match'], { first: null, help: 'teacher', final: true });
  });
  await test('무대 그림 정수배·효과·양소유 걷기·취소', async () => {
    await fresh(); await start();
    await page.evaluate(() => {
      G.app.title();
      G.app.screens.scene = async (ctx) => {
        window.stage = G.stage.mount(ctx, { img: 'sc_huayin', title: '시험 무대' });
        stage.effect('petals'); stage.effect('mist'); stage.effect('ripples'); stage.effect('candle'); stage.effect('fire');
        window.walked = stage.walk({ from: { x: 10, y: 70 }, to: { x: 80, y: 70 }, duration: 200 });
        stage.show({ say: 'yang', mood: 'smile', text: '시험용 대사창입니다. 다음 줄로 이야기가 이어집니다.', shake: true });
        await ctx.next();
        stage.dispose();
        window.overlayResult = await G.stage.play(ctx, { img: 'sc_huayin', title: '시험 무대' }, { lines: [
          { say: 'yang', mood: 'smile', text: '버들 아래에서 들려온 노래를 가만히 들어 본다.', effect: 'petals' },
          { say: 'yang', text: '노래에 담긴 뜻을 헤아리며 다음 길을 준비한다.', effect: 'petals' },
          { mark: 'fiction', title: '긴 설명 카드', body: '그림과 글을 함께 살펴보며 사건의 뜻을 생각해 봅니다. '.repeat(8), real: '설명 제목과 본문이 모두 보입니다.' },
        ] });
      };
      G.save.state.teacher = true; G.app.open('c1-bridge');
    });
    await chapter();
    await page.waitForSelector('.stage-actor');
    await page.evaluate(() => window.walked);
    assert.equal(await page.locator('.stage-effect').count(), 5);
    const scale = await page.locator('.stage-background img').evaluate((img) => img.getBoundingClientRect().width * devicePixelRatio / img.naturalWidth);
    assert.ok(Number.isInteger(scale) || Number.isInteger(1 / scale), String(scale));
    assert.equal(await page.locator('.stage-actor').getAttribute('data-person'), 'yang');
    await clickNext();
    await page.waitForFunction(() => document.querySelector('.stage-dialogue')?.textContent.includes('버들 아래'));
    const geometry = async () => {
      await page.waitForFunction(() => {
        const img = document.querySelector('.stage-background img');
        return img?.naturalWidth > 0 && img.getBoundingClientRect().width > 0;
      });
      const boxes = await page.evaluate(() => {
        const rect = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        const img = document.querySelector('.stage-background img');
        return { stage: rect('.stage'), image: rect('.stage-background img'), speech: rect('.stage-speech'), next: rect('#tray [data-act="next"]'),
          scale: img.getBoundingClientRect().width * devicePixelRatio / img.naturalWidth,
          naturalRatio: img.naturalWidth / img.naturalHeight, rendering: getComputedStyle(img).imageRendering };
      });
      const { stage: s, image: i, speech: d, next: n } = boxes;
      const visible = { left: Math.max(s.left, i.left), right: Math.min(s.right, i.right), top: Math.max(s.top, i.top), bottom: Math.min(s.bottom, i.bottom) };
      assert.ok(Number.isInteger(boxes.scale) || Number.isInteger(1 / boxes.scale), '정수/역정수배');
      assert.ok(Math.abs(i.width / i.height - boxes.naturalRatio) < 0.001, '그림 비율 보존');
      assert.equal(boxes.rendering, 'pixelated');
      assert.ok(d.top >= visible.bottom + 6, '그림과 글은 서로 덮지 않고 이어져야 함');
      assert.ok(d.left >= s.left && d.right <= s.right, '글이 그림 너비 안에 있어야 함');
      assert.ok(s.height <= i.height + 4, '그림 밖 빈 무대 높이 금지');
      assert.ok(d.bottom <= n.top || d.top >= n.bottom || d.right <= n.left || d.left >= n.right, '대사창과 다음 단추 겹침 금지');
      assert.ok(n.top - d.bottom <= 56, '진행 단추와 글 사이의 큰 빈 공간 금지');
      assert.equal(await page.locator('.stage-speech').evaluate((el) => el.scrollHeight > el.clientHeight + 1), false, '글 내부 스크롤과 잘림 금지');
      return boxes;
    };
    for (const width of [390, 320, 820, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(120);
      await geometry();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
    console.log('  390px 무대 좌표 ' + JSON.stringify(await geometry()));
    assert.equal(await page.locator('.stage-effect').count(), 1);
    assert.equal(await page.locator('.stage-effect').getAttribute('data-effect'), 'petals');
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/engine-stage.png') });
    await page.locator('.stage-dialogue').click();
    await page.waitForFunction(() => document.querySelector('.stage-dialogue')?.textContent.includes('노래에 담긴'));
    await geometry();
    await page.locator('.stage-dialogue').click();
    await page.waitForSelector('.stage-dialogue .mark.fiction');
    await page.evaluate(() => document.documentElement.classList.add('big'));
    for (const width of [320, 390, 820, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      await geometry();
      assert.equal(await page.locator('.stage-dialogue h4').innerText(), '긴 설명 카드');
    }
    await page.evaluate(() => document.documentElement.classList.remove('big'));
    await page.evaluate(() => G.app.title());
    await page.waitForFunction(() => window.overlayResult === false);
    assert.equal(await page.evaluate(() => stage.active()), false);
    assert.equal(await page.locator('.stage').count(), 0);
  });
  await test('소원 비율·인연 비가산·미색 숨김과 장부 새 계약', async () => {
    await fresh();
    const result = await page.evaluate(() => {
      const before = G.app.wishes();
      G.save.state.bonds = G.data.bonds.map((b) => b.id);
      const bondsOnly = G.app.wishes();
      G.save.state.res = { gong: 100, fame: 10, wealth: 10 };
      const resources = G.app.wishes();
      G.save.state.items.push('it-stub-music');
      const music = G.app.wishes();
      G.save.state.journal.revealed = { misaek: true };
      const revealed = G.app.wishes();
      return { before, bondsOnly, resources, music, revealed, rows: G.app.ledgerRows() };
    });
    assert.deepEqual(result.before, result.bondsOnly);
    for (const id of ['bugwi', 'gongmyeong']) assert.ok(result.resources.find((w) => w.id === id).fill > 0);
    assert.ok(result.music.find((w) => w.id === 'pungryu').fill > 0);
    assert.deepEqual(result.resources.find((w) => w.id === 'misaek').fill, 0);
    assert.equal(result.resources.find((w) => w.id === 'misaek').hidden, true);
    assert.equal(result.revealed.find((w) => w.id === 'misaek').hidden, false);
    assert.equal(result.revealed.find((w) => w.id === 'misaek').fill, 1);
    assert.deepEqual(result.rows.map((r) => r.id), ['a-wish', 'e01-stub', 'e02-stub', 'e03-stub', 'j-match']);
    for (const row of result.rows) assert.equal('score' in row, false);
    for (const wish of result.revealed) assert.ok(wish.fill >= 0 && wish.fill <= 1);
  });
  for (const resume of [false, true]) await test('자동 준비 사건: 직접 다시 보기와 ' + (resume ? '새로 고침 재개' : '순차 진행') + ' 구분', async () => {
    await fresh(); await seed({ pos: 'e01-stub', turns: 1 });
    await page.goto(url + '&teacher=1&scene=e03-stub'); await ready();
    const auto = (await state()).events['e02-stub'];
    assert.equal(auto.auto, true);
    const atThird = await state();
    await page.evaluate(() => G.app.open('e02-stub')); await at('e02-stub');
    assert.equal((await current()).autoAdvance, false);
    await clickNext(); await at('e03-stub');
    assert.deepEqual(await state(), atThird, '직접 다시 보기는 원래 e03 진행과 상태 보존');
    await page.evaluate(() => G.app.open('e01-stub')); await at('e01-stub'); await chapter(); await at('e01-stub', 'prep2');
    await until('e02-stub');
    const before = await state();
    assert.deepEqual(before.events['e02-stub'], auto);
    assert.equal(before.done['e02-stub'], undefined);
    if (resume) { await reloadResume(); await at('e02-stub'); }
    assert.equal((await current()).autoAdvance, true);
    assert.equal(await page.locator('.revisit-bar').count(), 0);
    for (let i = 0; i < 3 && (await current()).scene === 'e02-stub'; i++) await clickNext();
    assert.equal((await current()).scene, 'e03-stub', '자동 준비 e02에서 반복되지 않고 e03으로 진행');
    const after = await state();
    assert.equal(after.pos, 'e03-stub');
    assert.deepEqual(after.events['e02-stub'], auto, '자동 준비 기록 불변');
    assert.deepEqual(after.res, before.res, '자동 준비 보상 재지급 금지');
    assert.deepEqual(after.abil, before.abil, '자동 준비 능력 재상승 금지');
    assert.equal(after.done['e02-stub'], undefined, '학생이 마친 것으로 바꾸지 않음');
    assert.deepEqual(after.ledger, before.ledger);
    assert.equal(await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'e02-stub').gradeLabel), '—');
  });
  await test('데이터 없음은 안내·시작 불가', async () => {
    await fresh(url.replace('fixture=1', 'fixture=nodata'));
    assert.equal(await page.locator('.data-missing').count(), 1);
    assert.equal(await page.getByRole('button', { name: '시작하기', exact: true }).isDisabled(), true);
  });
  await test('파일로 열기: 시작·저장·합성 소리', async () => {
    await fresh(pathToFileURL(scratch).href + '?fixture=1'); await start();
    await until('c1-bridge'); await chapter();
    await page.waitForFunction(() => !!G.audio.now());
    await reloadResume(); await at('c1-bridge');
    assert.equal((await state()).started, true);
  });
} catch (e) { if (!errors.length) errors.push(e.stack); }
finally { await browser.close(); await new Promise((r) => server.close(r)); fs.unlinkSync(scratch); }
console.log('점검 묶음 ' + passed + '개 통과');
if (errors.length) console.error(errors.join('\n'));
process.exit(errors.length ? 1 : 0);
