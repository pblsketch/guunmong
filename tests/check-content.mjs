// v2 실제 학생 GUI 완주. 데이터 정적 규칙은 check-data, 권리 전체 이력은 check-rights가 함께 검사한다.
// 저장 주입·선생님용·가상 자산 없이 실제 index.html과 등록 자산을 사용한다.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { target, seekTarget, dialogue } from './fixtures/rpg-harness.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SHOTS = path.join(ROOT, 'tests/shots'); fs.mkdirSync(SHOTS, { recursive: true });
const EXPECTED_CHECKS = 6;
const issues = []; let passed = 0, networkViolation = null;
for (const folder of ['core', 'game', 'data']) for (const file of fs.readdirSync(path.join(ROOT, 'js', folder)).filter((f) => f.endsWith('.js'))) {
  const source = fs.readFileSync(path.join(ROOT, 'js', folder, file), 'utf8');
  for (const m of source.matchAll(/([을이은와])\(([를가는과])\)|\(([을이은와])\)([를가는과])/g)) {
    if (!['을를', '이가', '은는', '와과'].includes((m[1] || m[3]) + (m[2] || m[4]))) continue;
    assert.ok(/\]\]$/.test(source.slice(Math.max(0, m.index - 2), m.index)), file + ': 두 꼴 조사');
  }
}
const ok = (condition, where, message) => assert.ok(condition, where + ': ' + message);
function critical(condition, message) { if (!condition) { const e = Error('CRITICAL: ' + message); e.critical = true; throw e; } }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port, BASE = ORIGIN + '/index.html';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function newPage(name, viewport, dpr = 1) {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: dpr, acceptDownloads: true, hasTouch: name === 'phone' })).newPage();
  page.setDefaultTimeout(10000); page.tag = name; page.errs = []; page.reqs = [];
  page.on('pageerror', (e) => page.errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) page.errs.push(r.status() + ' ' + r.url()); });
  page.on('request', (r) => {
    const url = r.url(); page.reqs.push(url);
    const local = new URL(url).origin === ORIGIN || /^(data|blob):/.test(url) || (name === 'file' && url.startsWith(pathToFileURL(ROOT).href));
    if (!local) {
      networkViolation = Object.assign(Error('CRITICAL: 바깥 요청 ' + url), { critical: true });
      console.error(networkViolation.message);
      page.close().catch((error) => console.error('종료 오류: ' + error.message));
    }
  });
  await watchToasts(page);
  await page.addInitScript(() => {
    window.pngText = [];
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...a) { window.pngText.push(String(a[0])); return draw.apply(this, a); };
    window.audioNodes = 0;
    const audio = (window.AudioContext || window.webkitAudioContext)?.prototype;
    if (audio) for (const key of ['createOscillator', 'createBufferSource']) {
      const fn = audio[key]; audio[key] = function (...a) { window.audioNodes++; return fn.apply(this, a); };
    }
  });
  return page;
}
async function watchToasts(page) {
  page.toasts = [];
  await page.exposeFunction('__toastSeen', (r) => page.toasts.push(r));
  await page.addInitScript(() => {
    const hit = (a, b) => a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const measure = (el, when) => {
      if (!el.isConnected) return;
      const t = el.getBoundingClientRect();
      const bar = document.querySelector('.topbar');
      const top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
      const hits = [];
      const col = document.querySelector('.main-inner');
      if (col) {
        const c = col.getBoundingClientRect();
        const vis = { left: c.left, right: c.right, top: Math.max(c.top, top), bottom: Math.min(c.bottom, innerHeight) };
        vis.width = vis.right - vis.left; vis.height = vis.bottom - vis.top;
        if (hit(t, vis)) hits.push('본문 칸');
      }
      for (const b of document.querySelectorAll('#tray .btn, .btn.primary')) if (b.offsetParent && hit(t, b.getBoundingClientRect())) hits.push('단추 「' + b.textContent.trim() + '」');
      const play = document.querySelector('.play');
      window.__toastSeen({ text: el.textContent, when, rect: [t.left, t.top, t.width, t.height].map(Math.round), hits, scene: play ? play.dataset.scene : 'title', vw: innerWidth });
    };
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || !n.classList.contains('toast')) continue;
        requestAnimationFrame(() => measure(n, '뜬 직후'));
        setTimeout(() => measure(n, '0.5초 뒤'), 500);
      }
    }).observe(document, { childList: true, subtree: true });
  });
}
// 보이는 도트 그림이 기기 픽셀 기준 정수배인지(check-assets.mjs와 같은 잣대)
async function integerCheck(page, where) {
  const bad = await page.evaluate(() => {
    const dpr = window.devicePixelRatio || 1;
    const out = [];
    for (const img of document.querySelectorAll('img.pix')) {
      if (!img.naturalWidth || img.classList.contains('missing') || !img.offsetParent || !img.offsetWidth) continue;
      const cs = getComputedStyle(img);
      const r = (parseFloat(cs.width) * dpr) / img.naturalWidth;
      const rh = (parseFloat(cs.height) * dpr) / img.naturalHeight;
      const good = (x) => (x >= 1 ? Math.abs(x - Math.round(x)) < 0.02 : Math.abs(1 / x - Math.round(1 / x)) < 0.02);
      if (!good(r) || !good(rh) || Math.abs(r - rh) > 0.02) out.push(img.getAttribute('src').replace(/^.*assets\//, '') + ' ×' + r.toFixed(3) + '/' + rh.toFixed(3));
    }
    return out;
  });
  ok(bad.length === 0, where, '정수배가 아닌 도트 그림: ' + bad.slice(0, 6).join(', '));
}
// 흐린 글씨(.muted 등)가 바탕과 명암비 4.5 이상인지(바탕이 그림인 곳은 건너뜀)
async function contrastCheck(page, where) {
  const bad = await page.evaluate(() => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const out = [];
    for (const e of document.querySelectorAll('.muted, .topbar .where small, .sq .sq-kind, .unscored, .credit, .stage-speech .tx, .hud-wish, .hud-abilities span, .jp-score, .jp-block p')) {
      if (!e.offsetParent || !e.textContent.trim()) continue;
      let bg = null, faded = false;
      for (let n = e; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (+cs.opacity < 1) faded = true;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') break;
        const c = rgb(cs.backgroundColor);
        if (c.length >= 3 && (c.length < 4 || c[3] > 0.9)) { bg = c; break; }
      }
      if (!bg || faded) continue;
      const L1 = lum(rgb(getComputedStyle(e).color)), L2 = lum(bg);
      const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (r < 4.5) out.push('「' + e.textContent.trim().slice(0, 14) + '」 ' + r.toFixed(2));
    }
    return out;
  });
  ok(bad.length === 0, where, '명암비가 4.5보다 낮은 흐린 글씨: ' + bad.slice(0, 4).join(', '));
}
// 글이 옆으로 넘쳐 잘리거나 화면 밖으로 나가는지(가로 스크롤)
async function overflowCheck(page, where) {
  const r = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('가로 스크롤 ' + document.documentElement.scrollWidth + '>' + innerWidth);
    for (const e of document.querySelectorAll('.main-inner *, .topbar .where, .tray .btn')) {
      if (!e.offsetParent || e.closest('.board-art, .house-art, .scene-img, .pearl-spot')) continue;
      const cs = getComputedStyle(e);
      if (cs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !/^(IMG|svg|INPUT|TABLE)$/i.test(e.tagName) && !e.closest('table, .ledger')) {
        const r1 = e.getBoundingClientRect();
        if (r1.right > innerWidth + 1) out.push((e.className || e.tagName) + ' 오른쪽이 화면 밖(' + Math.round(r1.right) + ')');
      }
    }
    return out.slice(0, 4);
  });
  ok(r.length === 0, where, '넘친 글: ' + r.join(', '));
}

const current = (page) => page.evaluate(() => G.app.current());
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const ready = (page) => page.waitForFunction(() => window.G?.app?.booted);
const next = (page) => page.locator('#tray [data-act="next"]').click();
async function start(page) { await page.getByRole('button', { name: '시작하기', exact: true }).click(); await page.waitForSelector('.play'); if (await page.evaluate(() => !!G.data.notes?.mission)) await page.locator('[data-mission="start"]').click(); }
async function resume(page) { await page.reload(); await ready(page); await page.getByRole('button', { name: '이어 하기', exact: true }).click(); await page.waitForSelector('.play'); }
async function boardReadiness(page) {
  return page.evaluate(() => {
    const boards = [...document.querySelectorAll('.board-art')];
    // 선택과 판정을 같은 실행 안에서 끝내야 사이에 끝난 이미지 로딩을 오판하지 않는다.
    const unready = boards.filter((art) => !art.classList.contains('has-img')).flatMap((art) =>
      [...art.querySelectorAll('.board-img')].map((img) => ({ parentClass: art.className,
        display: getComputedStyle(img).display, width: img.getBoundingClientRect().width,
        naturalWidth: img.naturalWidth })));
    return { count: boards.length, unready, exposed: unready.filter((img) => img.display !== 'none') };
  });
}
async function checks(page, where) {
  const reading = await page.evaluate(() => {
    const story = document.querySelector('.stage-story');
    if (!story) return null;
    const picture = story.querySelector('.stage').getBoundingClientRect();
    const speech = story.querySelector('.stage-speech');
    return { separated: speech.getBoundingClientRect().top >= picture.bottom + 6, clipped: speech.scrollHeight > speech.clientHeight + 1 };
  });
  const kind = await page.evaluate(() => G.app.current()?.kind || null);
  if (reading && kind !== 'waking') { assert.ok(reading.separated, where + ': 그림과 글 겹침'); assert.equal(reading.clipped, false, where + ': 긴 글 잘림'); }
  const board = await boardReadiness(page);
  if (board.count) {
    assert.deepEqual(board.exposed, [], where + ': 배율 계산 전 원본 그림은 임시 틀에 늘려 그리지 않음');
    await page.waitForSelector('.board-art.has-img .board-img');
  }
  await integerCheck(page, where); await contrastCheck(page, where); await overflowCheck(page, where);
  assert.equal(await page.locator('.mark.orig:visible').count(), 0, '대조 전 原文 표시');
}
async function healthy(page) {
  assert.deepEqual(page.errs, [], page.tag + ' 오류·404');
  critical(!networkViolation, networkViolation?.message || '바깥 요청 없음');
}
async function run(name, fn) {
  console.log('▶ ' + name);
  try { await fn(); passed++; console.log('✓ ' + name); }
  catch (error) { const e = networkViolation || error; issues.push(name + ': ' + e.message); console.error('✗ ' + name + ': ' + e.stack); if (e.critical) throw e; }
}
// 알림은 시간이 지나면 스스로 사라진다. 누르려는 사이 사라졌으면 닫힌 것으로 본다(사라지지 않고 남아 있으면 실패).
async function dismissToast(page) { const toast = page.locator('.toast:visible'); if (await toast.count()) await toast.click({ timeout: 3000 }).catch(async error => { if (await page.locator('.toast:visible').count()) throw error; }); }
async function lockChecks(page, memo) {
  const saved = await state(page); critical(saved.awake, '선방 도착 전 깨어남 없음');
  memo.awakeAt = saved.awakeAt;
  const verify = async () => {
    critical((await current(page))?.scene === 'c3-awake', '학생 잠금 뒤 꿈 장면 열림');
    const s = await state(page); critical(s.awake && s.awakeAt === memo.awakeAt, '깨어남 기록 소실');
  };
  await page.evaluate(() => history.back()); await page.waitForTimeout(550); await verify(); await dismissToast(page);
  await resume(page); await verify();
  await page.locator('[data-tool="toc"]').click();
  const blocked = await page.evaluate(() => G.app.list().slice(0, G.app.list().findIndex((s) => s.awakened)).map((s) => s.id));
  for (const id of blocked) critical(await page.locator('.toc-scene[data-scene="' + id + '"]').isDisabled(), '목차 잠금 해제: ' + id);
  await page.keyboard.press('Escape');
  for (const query of ['?ch=0', '?ch=2', '?scene=e01-huayin', '?scene=c3-staff']) {
    await page.goto(BASE + query); await ready(page); await verify(); await page.waitForTimeout(550); await dismissToast(page);
  }
  memo.lock = true;
}
async function wrongWish(page) {
  const words = await page.evaluate(() => G.app.current().data.words.filter((w) => !G.app.current().data.answers.includes(w.id)).map((w) => w.id));
  assert.ok(words.length);
  await page.locator('[data-word="' + words[0] + '"]').click();
  assert.equal(await page.locator('[data-help="answer"]:visible').count(), 0);
  await page.locator('[data-word="' + words[0] + '"]').click();
  assert.equal(await page.locator('.wish-memo:visible').count(), 1);
  await page.locator('[data-help="answer"]').click();
  const answers = await page.evaluate(() => G.app.current().data.answers);
  for (const id of answers) await page.locator('[data-word="' + id + '"]').click();
  assert.deepEqual((await state(page)).ledger['a-wish'], { first: false, help: 'student', final: true });
}
async function correctWish(page) {
  const answers = await page.evaluate(() => G.app.current().data.answers);
  assert.equal(answers.length, 5);
  for (const id of answers) await page.locator('[data-word="' + id + '"]').click();
  assert.deepEqual((await state(page)).ledger['a-wish'], { first: true, help: null, final: true });
}
async function wrongMatch(page) {
  const picks = await page.evaluate(() => G.data.journal.pairs.map((p) => ({ id: p.id, wrong: G.data.wishes.find((w) => !w.dreamHidden && w.id !== p.wish).name })));
  assert.equal(picks.length, 5); assert.equal(await page.locator('[data-act="check"]').isDisabled(), true);
  for (const p of picks) { await page.locator('[data-slot="' + p.id + '"]').click(); await page.locator('[data-choice="' + p.wrong + '"]').click(); }
  await page.locator('[data-act="check"]').click(); assert.ok(await page.locator('.slot.wrong').count());
  await page.locator('[data-help="memo"]').click(); await page.locator('[data-help="answer"]').click(); await page.locator('[data-act="check"]').click();
  assert.deepEqual((await state(page)).ledger['j-match'], { first: false, help: 'student', final: true });
}
async function actTarget(page, id, input, options = {}) {
  if (input === 'touch') { await seekTarget(page, id); await page.locator('[data-act="interact"][data-target="' + id + '"]').tap(); }
  else if (input === 'keyboard') { await seekTarget(page, id); await page.locator('[data-world]').focus(); await page.keyboard.press('Enter'); }
  else await target(page, id);
  if (await page.locator('[data-dialogue], .challenge-book').count()) await dialogue(page, options);
}
async function correctMatch(page) {
  const picks = await page.evaluate(() => G.data.journal.pairs.map(pair => ({ id: pair.id, pick: G.data.wishes.find(wish => wish.id === pair.wish).name })));
  assert.equal(picks.length, 5);
  for (const pick of picks) { await page.locator('[data-slot="' + pick.id + '"]').click(); await page.locator('[data-choice="' + pick.pick + '"]').click(); }
  await page.locator('[data-act="check"]').click();
  assert.deepEqual((await state(page)).ledger['j-match'], { first: true, help: null, final: true });
}
async function worldStep(page, memo, mode) {
  const info = await page.evaluate(() => {
    const scene = G.app.current()?.scene, experience = G.experience.find(G.data, scene), record = G.save.state.rpg?.scenes?.[scene];
    if (!experience) return null;
    const nextId = G.experience.next(experience, record?.actions || []);
    const beat = [...experience.beats, ...(experience.optional || [])].find(value => value.id === nextId);
    const pearls = (experience.optional || []).filter(value => value.effects?.some(effect => effect.kind === 'pearl'));
    return { scene, beat, pearls, actions: record?.actions || [] };
  });
  if (!info?.beat) return false;
  const pearl = info.pearls.find(value => !info.actions.some(action => action.id === value.id));
  const pearlVisible = pearl && await page.locator('[data-world-target="' + pearl.trigger.target + '"]').count() === 1;
  if (pearlVisible && !memo.pearlScenes.has(info.scene)) {
    const collect = mode === 'observe' || mode === 'mix' && memo.pearlScenes.size % 2 === 0;
    memo.pearlScenes.add(info.scene);
    if (collect) { await actTarget(page, pearl.trigger.target, 'list'); memo.pearls.add(info.scene); return true; }
  }
  const input = memo.inputUsed ? 'list' : mode === 'direct' ? 'touch' : mode === 'observe' ? 'list' : 'keyboard';
  // 관찰 판은 위기 도전에서 한 번 틀려 이야기 속 대가를 본 뒤 다시 푼다.
  if (info.beat.trigger.target) await actTarget(page, info.beat.trigger.target, input, { wrong: mode === 'observe' });
  else { await page.locator('[data-act="interact"]:not([disabled])').click(); if (await page.locator('[data-dialogue], .challenge-book').count()) await dialogue(page); }
  memo.inputUsed = true; memo.actions++;
  return true;
}
async function savePng(page, tag, s) {
  await page.locator('.name-in').fill('검증');
  const promise = page.waitForEvent('download'); await page.locator('[data-act="save-image"]').click(); const download = await promise;
  assert.equal(download.suggestedFilename(), '구운몽_꿈일지_검증.png');
  const file = path.join(SHOTS, 'complete_' + tag + '.png'); await download.saveAs(file);
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  let offset = 8, data = 0, ended = false;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + length + 12 <= bytes.length);
    if (offset === 8) { assert.equal(type, 'IHDR'); assert.equal(bytes.readUInt32BE(offset + 8), 900); assert.ok(bytes.readUInt32BE(offset + 12) >= 600); }
    if (type === 'IDAT') data += length;
    if (type === 'IEND') { assert.equal(length, 0); ended = true; }
    offset += length + 12;
  }
  assert.ok(ended && data > 10000 && offset === bytes.length);
  const pixels = await page.evaluate(async (base64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + base64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const p = g.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set(); let dark = 0;
    for (let i = 0; i < p.length; i += 4) { if (p[i] + p[i + 1] + p[i + 2] < 420) dark++; if (i % 128 === 0) colors.add(p.slice(i, i + 4).join(',')); }
    return { colors: colors.size, dark };
  }, bytes.toString('base64'));
  assert.ok(pixels.colors > 10 && pixels.dark > 1000, '빈 PNG가 아님');
  const texts = await page.evaluate(() => window.pngText.join(' '));
  assert.ok(!/꿈에서 쌓은 것|깨고 남은 것\s*0|최고 꿈 점수/.test(texts));
  for (const word of ['취미궁에서 누린 삶', '깨어난 뒤의 선방', '고친 흔적', '소원', '구슬', '도움 안내', '검증']) assert.ok(texts.includes(word), 'PNG 내용 ' + word);
  console.log('  실제 PNG ' + path.basename(file) + ' ' + bytes.length + 'B · 색 ' + pixels.colors + ' · 글 픽셀 ' + pixels.dark);
}
async function fullRun(tag, viewport, mode, dpr) {
  const page = await newPage(tag, viewport, dpr);
  const memo = { steps: new Set(), scenes: [], worldScenes: new Set(), fiction: new Set(), variants: 0, reload: false, lock: false, wish: false, match: false, revised: false, pearls: new Set(), pearlScenes: new Set(), inputUsed: false, actions: 0, idle: 0 };
  const started = Date.now();
  try {
    await page.goto(BASE); await ready(page);
    const initial = await page.evaluate(() => ({ ok: G.data.ok, fixture: G.data.fixture, problems: G.data.problems, missing: G.data.missing, order: G.app.list().map((s) => s.id) }));
    assert.ok(initial.ok && !initial.fixture); assert.deepEqual(initial.problems, []); assert.deepEqual(initial.missing, []);
    assert.equal(initial.order[0], 'c1-bridge'); assert.equal(initial.order.length, 28); assert.ok(!initial.order.includes('cut-josin'));
    await checks(page, tag + '/title'); await start(page);
    for (let loop = 0; loop < 2500; loop++) {
      const c = await current(page), s = await state(page);
      assert.equal(s.teacher, false); assert.equal(await page.locator('[data-teacher]:visible').count(), 0);
      if (memo.awakeAt) critical(s.awake && s.awakeAt === memo.awakeAt, '깨어남 기록 소실');
      if (!s.awake) {
        critical(await page.evaluate(() => G.app.wishes().find((w) => w.id === 'misaek').hidden), '꿈 동안 미색 노출');
        for (const resource of ['gong', 'fame', 'wealth']) critical(s.res[resource] === Object.values(s.events).reduce((sum, e) => sum + (e.reward?.[resource] || 0), 0), '사건 보상 밖 자원 가산');
      }
      if (!c) throw Error('완주 중 화면 없음');
      if (memo.scenes.at(-1) !== c.scene) memo.scenes.push(c.scene);
      const stamp = c.scene + '/' + c.step;
      if (!memo.steps.has(stamp)) {
        memo.steps.add(stamp); await checks(page, tag + '/' + stamp);
        if (['staff', 'journal-bond', 'result'].includes(c.step) && (/^e01-/.test(c.scene) || c.ch !== '2')) await page.screenshot({ path: path.join(SHOTS, 'play_' + tag + '_' + c.scene + '_' + c.step + '.png'), scale: 'css' });
      }
      for (const text of await page.locator('.mark.fiction:visible').allTextContents()) memo.fiction.add(text.trim());
      memo.variants += await page.locator('.mark.variant:visible').count();
      if (c.ch === 'R') break;
      if (c.scene === 'c3-awake' && !memo.lock) { await lockChecks(page, memo); continue; }
      if (c.kind === 'wish' && !memo.wish) { if (mode === 'direct') await correctWish(page); else await wrongWish(page); memo.wish = true; continue; }
      if (c.kind === 'journal' && c.step === 'activity' && !memo.match) { if (mode === 'direct') await correctMatch(page); else await wrongMatch(page); memo.match = true; continue; }
      if (c.step === 'journal-bond') { const link = page.locator('.link-opt:not([disabled])'); if (await link.count()) { await link.first().click(); continue; } }
      if (c.step === 'interp-pick') {
        assert.equal(await page.locator('.ev-opt').count(), 7);
        await page.locator('.interp-opt').first().click(); await page.locator('.ev-opt').first().click(); await next(page); continue;
      }
      if (c.step === 'interp-revise' && !memo.revised) {
        await page.locator('[data-act="revise"]').click(); assert.equal(await page.locator('.ev-opt').count(), 10);
        memo.firstChoice = s.interp.first;
        memo.changedOption = await page.locator('.interp-opt').nth(1).getAttribute('data-opt');
        await page.locator('.interp-opt').nth(1).click(); await page.locator('.ev-opt[data-ev="E9"]').click(); await next(page); memo.revised = true; continue;
      }
      if (await page.locator('[data-world]').count()) {
        memo.worldScenes.add(c.scene); assert.equal(await page.locator('[data-act="prep"], .grade, [data-score]').count(), 0);
        if (await worldStep(page, memo, mode)) {
          if (!memo.reload && mode === 'mix' && memo.actions > 2) { const before = await state(page); await resume(page); const after = await state(page); assert.equal(after.pos, before.pos); assert.deepEqual(after.items, before.items); assert.deepEqual(after.bonds, before.bonds); for (const [id,record] of Object.entries(before.rpg.scenes)) assert.deepEqual(after.rpg.scenes[id]?.actions, record.actions, '재접속 행동 보존 '+id); memo.reload = true; }
          continue;
        }
      }
      const staff = page.locator('[data-act="staff"]:not([disabled])');
      if (await staff.count()) {
        critical(!s.awake, '지팡이 클릭 전 깨어남'); assert.equal(await page.locator('[data-act="skip"]').count(), 0);
        await staff.click(); const awake = await state(page); critical(awake.awake && awake.awakeAt > 0, '난간 클릭 순간 미저장'); memo.awakeAt = awake.awakeAt; continue;
      }
      const skip = page.locator('[data-act="skip"]:visible');
      if (await skip.count()) { if (c.kind === 'waking') critical(s.awake, '깨어남 전 건너뛰기'); await skip.click(); continue; }
      const button = page.locator('#tray [data-act="next"]:not([disabled])');
      if (await button.count()) { await button.click(); memo.idle = 0; }
      else { await page.waitForTimeout(60); if (++memo.idle > 150) throw Error('진행 단추 없음: ' + stamp); }
    }
    await page.waitForSelector('.journal-page'); const s = await state(page);
    critical(s.awake && s.awakeAt === memo.awakeAt, '결과에서 깨어남 소실');
    assert.deepEqual(memo.scenes, initial.order);
    assert.ok(memo.worldScenes.size >= 20 && memo.actions > 40 && memo.inputUsed, '실제 월드 행동 경로');
    if (mode === 'mix') assert.ok(memo.reload); assert.ok(memo.lock && memo.wish && memo.match && memo.revised);
    assert.equal(memo.pearlScenes.size, 8);
    assert.equal(await page.locator('.ledger tbody tr').count(), 14); assert.equal(await page.locator('.board-view, .house-view, .bond-list').count(), 0);
    assert.equal(s.interp.changed.evidence, 'E9'); assert.ok(s.interp.final && s.interp.revised);
    assert.equal(s.interp.changed.option, memo.changedOption); assert.deepEqual(s.interp.first, memo.firstChoice);
    assert.equal(s.journal.revealed.misaek, true); assert.equal(s.ledger['a-wish'].help, mode === 'direct' ? null : 'student'); assert.equal(s.ledger['j-match'].help, mode === 'direct' ? null : 'student');
    const comparison = page.locator('details.comparison-reading');
    assert.equal(await comparison.getAttribute('open'), null);
    await comparison.locator('summary').click();
    assert.ok((await comparison.innerText()).includes('별개의 이야기'));
    assert.ok(await comparison.locator('.mark.variant:visible').count(), '선택한 이본 카드를 실제로 읽음');
    await checks(page, tag + '/comparison');
    await comparison.locator('summary').click();
    assert.deepEqual(await state(page), s, '학생의 선택형 비교 읽기는 기록을 바꾸지 않음');
    if (mode === 'direct') {
      assert.equal(s.wrong.filter(w => w.act === 'a-wish' || w.act === 'j-match').length, 0);
      assert.equal(s.ledger['a-wish'].first, true); assert.equal(s.ledger['j-match'].first, true);
    } else {
      assert.ok(s.wrong.some(w => w.act === 'a-wish') && s.wrong.some(w => w.act === 'j-match'));
      assert.equal(s.ledger['a-wish'].first, false); assert.equal(s.ledger['j-match'].first, false);
    }
    assert.equal(Object.keys(s.pearls).length, mode === 'observe' ? 8 : mode === 'direct' ? 0 : 4);
    assert.equal(await page.locator('.jp-score').count(), 0); assert.equal(await page.locator('[data-trace-image]').count(), 2);
    await page.locator('[data-tool="toc"]').click(); await page.locator('.toc-scene[data-scene="c5-dialogue"]').click();
    await page.waitForSelector('.play[data-scene="c5-dialogue"]');
    for (let i = 0; i < 30 && (await current(page)).scene !== 'r-result'; i++) {
      assert.equal(await page.locator('[data-act="revise"]').count(), 0, '확정한 해석의 두 번째 수정 금지'); await next(page);
    }
    assert.equal((await current(page)).scene, 'r-result'); assert.deepEqual((await state(page)).interp, s.interp);
    await savePng(page, tag, s); await page.waitForTimeout(550);
    await checks(page, tag + '/result'); await page.screenshot({ path: path.join(SHOTS, 'complete_' + tag + '_screen.png'), fullPage: true, scale: 'css' });
    assert.ok(page.toasts.length > 0, '알림 검사가 실제 실행됨'); assert.deepEqual(page.toasts.filter((t) => t.hits.length), [], '알림이 본문·단추를 가리지 않음');
    await healthy(page);
    console.log('  ' + tag + ' 완주 · 실제 월드 행동 ' + memo.actions + ' · 재접속/잠금4길/학습/수정/PNG · 알림 ' + page.toasts.length + '회 · ' + ((Date.now() - started) / 1000).toFixed(1) + '초');
  } finally { await page.context().close(); }
}
async function credit(page, selector) {
  const el = page.locator(selector); await el.scrollIntoViewIfNeeded();
  const info = await el.evaluate((e) => ({ text: e.innerText, size: parseFloat(getComputedStyle(e).fontSize), rect: { top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom } }));
  assert.ok(info.text.includes('국립국악원') && info.text.includes('공공누리 제1유형') && /퉁소/.test(info.text) && /단소/.test(info.text));
  assert.ok(info.size >= 11 && info.rect.top >= 0 && info.rect.bottom <= (page.viewportSize().height + 1)); await contrastCheck(page, '출처');
}
let fatal = false;
try {
  await run('월드 그림 지연 로딩·실제 표시·캐시 재사용', async () => {
    const page = await newPage('world-readiness', { width: 390, height: 844 }, 2);
    let release;
    try {
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route('**/assets/world/map-bridge.webp', async route => { await gate; await route.continue(); });
      await page.goto(BASE); await ready(page); await start(page); await page.waitForSelector('[data-world] img.world-art');
      const cold = await page.locator('[data-world] img.world-art').evaluate(img => ({ naturalWidth: img.naturalWidth, visible: img.checkVisibility(), shell: !!img.closest('.game-shell'), targets: document.querySelectorAll('[data-world-target]').length }));
      assert.deepEqual(cold, { naturalWidth: 0, visible: true, shell: true, targets: 1 });
      release(); await page.waitForFunction(() => document.querySelector('[data-world] img.world-art')?.naturalWidth === 384);
      await checks(page, '지연 로딩 완료');
      const loaded = await page.locator('[data-world] img.world-art').evaluate(img => ({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, visible: img.checkVisibility() }));
      assert.deepEqual(loaded, { naturalWidth: 384, naturalHeight: 320, visible: true });
      await page.unroute('**/assets/world/map-bridge.webp');
      for (let i = 0; i < 3; i++) {
        await page.reload(); await ready(page); await page.getByRole('button', { name: '이어 하기', exact: true }).click(); await page.waitForSelector('[data-world] img.world-art');
        // 캐시에 있는 그림도 디코딩은 비동기일 수 있으므로 같은 그림이 짧은 시간 안에 실제 크기로 표시되는지 본다.
        await page.waitForFunction(() => document.querySelector('[data-world] img.world-art')?.naturalWidth === 384, null, { timeout: 3000 });
        await checks(page, '캐시 재사용 ' + i);
      }
      fs.writeFileSync(path.join(SHOTS, 'world-ready-regression.json'), JSON.stringify({ cold, loaded, warmRuns: 3 }, null, 2));
      await healthy(page);
    } finally { release?.(); await page.context().close(); }
  });
  await run('출처·실제 소리 켜고 끄기', async () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 860 }]) {
      const page = await newPage('sound', viewport);
      try {
        await page.goto(BASE); await ready(page); await credit(page, '.title-screen .credit:has-text("국립국악원")');
        assert.deepEqual(await page.evaluate(() => G.data.problems), []);
        await page.getByRole('button', { name: '설정', exact: true }).click(); await credit(page, '.credit-full'); await page.keyboard.press('Escape');
        await start(page);
        await page.waitForFunction(() => !!G.audio.now());
        await page.locator('[data-tool="settings"]').click(); await page.locator('[data-set="music"]').click(); await page.keyboard.press('Escape');
        await page.waitForFunction(() => !G.audio.now());
        const before = await page.evaluate(() => window.audioNodes);
        await page.evaluate(() => G.audio.ok());
        assert.ok(await page.evaluate(() => window.audioNodes) > before, '켜진 효과음 실제 노드 생성');
        await page.locator('[data-tool="settings"]').click(); await page.locator('[data-set="sound"]').click(); await page.keyboard.press('Escape');
        const muted = await page.evaluate(() => window.audioNodes); await page.evaluate(() => G.audio.ok());
        assert.equal(await page.evaluate(() => window.audioNodes), muted, '꺼진 효과음 노드 없음');
        await page.locator('[data-tool="settings"]').click(); await page.locator('[data-set="music"]').click(); await page.keyboard.press('Escape');
        await page.waitForFunction(() => !!G.audio.now()); assert.equal((await state(page)).sound, false);
        const josa = await page.evaluate(() => [['사람', '을/를'], ['나무', '을/를'], ['거문고', '은/는'], ['서울', '으로/로']].map(([s, pair]) => G.util.josa(s, pair)));
        assert.deepEqual(josa, ['을', '를', '는', '로']); await healthy(page);
      } finally { await page.context().close(); }
    }
  });
  await run('파일로 열기 실제 시작·저장·소리', async () => {
    const page = await newPage('file', { width: 390, height: 844 });
    try {
      await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href); await ready(page); await start(page);
      await page.waitForFunction(() => G.app.current()?.scene === 'c1-bridge' && !!document.querySelector('[data-world]'));
      await page.waitForFunction(() => G.audio.via() === 'element' && !!G.audio.now());
      await resume(page); assert.equal((await current(page)).scene, 'c1-bridge'); await healthy(page);
    } finally { await page.context().close(); }
  });
  await run('학생 완주 휴대폰 직접·정답 경로', () => fullRun('phone', { width: 390, height: 844 }, 'direct', 2));
  await run('학생 완주 태블릿 선택 관찰·구슬·오답 도움 경로', () => fullRun('tablet', { width: 820, height: 1180 }, 'observe', 2));
  await run('학생 완주 데스크톱 재접속·혼합 경로', () => fullRun('desktop', { width: 1280, height: 860 }, 'mix', 1));
} catch (e) { fatal = !!e.critical; if (!issues.length) issues.push(e.message); }
finally { await browser.close(); await new Promise((r) => server.close(r)); }
console.log('내용 점검 ' + passed + '/' + EXPECTED_CHECKS + ' 통과');
if (issues.length) console.error(issues.join('\n'));
process.exit(fatal ? 2 : (issues.length || passed !== EXPECTED_CHECKS) ? 1 : 0);
