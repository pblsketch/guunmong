// 꿈 점검: 임시 데이터(?fixture=1)로 말판(말 걷기)·소원 목록·인연첩·집(놓기·옮기기·저장)·구슬(놓쳐도 진행)·
// 깨어남(지팡이로 난간을 치는 순간 기록, 말판·집이 사라짐, 선생님용만 다시 봄)·꿈 일지(묶음 확정·도움 사다리·
// '해석' 짝 채점 없음·미색 드러남·구슬과 팔선녀)·해석 고르기(대사의 말 전, 한 번 고침, 흔적 저장)·결과 그림 저장을 확인한다.
//   node check-dream.mjs        (tests/ 안에서. run-all.mjs가 부른다)
// check-engine.mjs와 같은 방식으로 게임 폴더를 작은 서버로 띄우고 설치된 크롬(channel: 'chrome')으로 연다.
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const issues = [];
const log = (...a) => console.log(...a);
const ok = (cond, where, msg) => { if (!cond) { issues.push(`${where}: ${msg}`); log('  ✗', `${where}: ${msg}`); } return !!cond; };

// ───────── 작은 정적 서버(이 기기 안에서만)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const BASE = `${ORIGIN}/index.html`;
const FIX = `${BASE}?fixture=1`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 아직 없는 그림·글꼴·소리 파일(뒤 작업이 만든다)은 404여도 넘어간다
// 임시 데이터의 그림·곡(stub_*·stub-*, 물건 it1…·인연 b2…)은 일부러 없는 파일이다(그림이 없을 때 숨기는지 본다). 글꼴은 글꼴 작업(T9)이 만든다. 그 밖의 /assets/ 404는 실패
const KNOWN_MISSING = /\/assets\/(.*\/stub[-_]|items\/it\d+\.webp|pt\/b\d+\.webp)/;
async function newPage(name, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 390, height: 844 }, isMobile: opt.mobile !== false, hasTouch: opt.mobile !== false, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  page.errs = [];
  page.reqs = [];
  page.tag = name;
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() || {}).url || '';
    if (/Failed to load resource/.test(m.text()) && (KNOWN_MISSING.test(url) || !url)) return;
    page.errs.push('console: ' + m.text() + ' @' + url);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !KNOWN_MISSING.test(r.url())) page.errs.push('http ' + r.status() + ': ' + r.url()); });
  page.on('request', (r) => page.reqs.push(r.url()));
  return page;
}
const W = (page, ms = 150) => page.waitForTimeout(ms);
const cur = (page) => page.evaluate(() => (window.G && G.app && G.app.current ? G.app.current() : null));
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const vbtn = (page, label) => page.locator('button:visible', { hasText: label });
const step = (page) => page.evaluate(() => { const p = document.querySelector('.play'); return p ? p.dataset.step : null; });

async function ready(page) {
  await page.waitForFunction(() => window.G && G.app && G.app.booted === true, null, { timeout: 8000 });
}
async function startNew(page, mode = '처음 읽기') {
  await ready(page);
  await page.waitForSelector('.title-screen');
  await vbtn(page, '시작하기').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, mode).first().click();
  await page.waitForSelector('.play');
}
async function resumeAfterReload(page) {
  await page.reload(); await ready(page);
  await page.waitForSelector('.title-screen');
  await vbtn(page, '이어 하기').first().click();
  await page.waitForSelector('.play');
}

// 지금 장면(또는 꿈 일지)의 활동을 맞게(또는 틀리게) 채운다
async function fill(page, how = 'right') {
  const plan = await page.evaluate((how) => {
    const a = G.app.current().data.activity;
    const choices = [...document.querySelectorAll('.activity:not(.solved) .choice')].map((b) => b.dataset.choice);
    const used = new Set();
    return a.slots.map((s) => {
      const ans = [].concat(s.answer || []);
      let pick;
      if (how === 'right' && ans.length) pick = a.reusable ? ans[0] : ans.find((x) => !used.has(x));
      else if (a.scored === false || !ans.length) pick = choices.find((c) => !used.has(c));
      else pick = choices.find((c) => (a.reusable || !used.has(c)) && !ans.includes(c));
      used.add(pick);
      return { slot: s.id, pick };
    });
  }, how);
  for (const p of plan) {
    await page.locator(`.activity:not(.solved) .slot[data-slot="${p.slot}"]`).click();
    await page.locator(`.activity:not(.solved) .choice[data-choice="${p.pick}"]`).first().click();
  }
}

// 한 걸음 진행(활동은 맞게 푼다. 꼭 골라야 하는 것[data-must]은 첫 것을 고른다)
async function act(page) {
  const st = await page.evaluate(() => {
    const play = document.querySelector('.play');
    return {
      step: play && play.dataset.step,
      unsolved: !!document.querySelector('.activity:not(.solved)'),
      mind: !!document.querySelector('.mind-opt:not([disabled])'),
      staff: !!document.querySelector('[data-act="staff"]:not([disabled])'),
      must: !!document.querySelector('[data-must]:not([disabled])'),
      next: !!document.querySelector('#tray button[data-act="next"]'),
      sheet: !!document.querySelector('.sheet-back'),
    };
  });
  if (st.sheet) throw new Error('예상하지 못한 시트가 떠 있음');
  if (st.step === 'activity' && st.unsolved) { await fill(page, 'right'); await page.locator('button[data-act="check"]').click(); await W(page, 80); return; }
  if (st.step === 'mind' && st.mind) { await page.locator('.mind-opt').first().click(); await W(page, 60); return; }
  if (st.staff) { await page.locator('[data-act="staff"]').click(); await W(page, 80); return; }
  if (st.must) { await page.locator('[data-must]:not([disabled])').first().click(); await W(page, 60); return; }
  if (st.next) { await page.locator('#tray button[data-act="next"]').click(); await W(page, 60); return; }
  await W(page, 120);
}
async function playUntil(page, pred, limit = 400) {
  for (let i = 0; i < limit; i++) {
    const c = await cur(page);
    if (c && pred(c)) return c;
    await act(page);
  }
  throw new Error('playUntil: 도달하지 못함 ' + JSON.stringify(await cur(page)));
}
const at = (scene, stp) => (c) => c.scene === scene && (!stp || c.step === stp);

async function finish(page) {
  ok(page.errs.length === 0, page.tag, '오류: ' + page.errs.slice(0, 5).join(' | '));
  const outside = page.reqs.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:'));
  ok(outside.length === 0, page.tag, '바깥으로 나간 요청: ' + outside.slice(0, 3).join(', '));
  await page.context().close();
}
async function run(name, fn) {
  log('▶', name);
  try { await fn(); } catch (e) { ok(false, name, '예외: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
}
// 꿈 보따리(위 막대) 판을 열어 탭 목록을 읽는다
async function bagTabs(page) {
  await page.locator('[data-tool="dream"]').click();
  await page.waitForSelector('.bag');
  const tabs = await page.locator('.bag [data-tab]').evaluateAll((els) => els.map((e) => e.dataset.tab));
  return tabs;
}
async function closeSheet(page) { await page.keyboard.press('Escape'); await W(page); }

// ───────── 꿈 한 바퀴(휴대폰 세로)
await run('꿈 한 바퀴', async () => {
  const page = await newPage('dream');
  await page.goto(FIX);
  await startNew(page);

  // ── 집: 첫 물건을 놓고 옮긴다(놓자마자 그 자리에 보인다)
  await playUntil(page, at('c2-a', 'item'));
  await page.waitForSelector('.house-view');
  ok(await page.locator('.house-view').getAttribute('data-stage') === 'h1', 'house', '첫 단계가 h1이 아님');
  const w1 = await page.locator('.house-view .house-art').evaluate((e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height);
  ok(await page.locator('.house-view .mark.fiction, .house-view .tag', { hasText: '게임 설정' }).count() > 0, 'house', '집 꾸미기가 게임 설정으로 표시되지 않음');
  await page.locator('.house-view .bundle [data-item="it1"]').click();
  await page.locator('.house-view .hslot[data-slot="h1-a"]').click();
  let s = await state(page);
  ok(s.house.it1 === 'h1-a', 'house', '물건이 칸에 놓이지 않음: ' + JSON.stringify(s.house));
  ok(await page.locator('.house-view .hslot[data-slot="h1-a"] [data-item="it1"]').count() === 1, 'house', '놓은 물건이 그 자리에 바로 보이지 않음');
  await page.locator('.house-view .hslot[data-slot="h1-a"] [data-item="it1"]').click();
  await page.locator('.house-view .hslot[data-slot="h1-b"]').click();
  s = await state(page);
  ok(s.house.it1 === 'h1-b', 'house', '물건을 옮기지 못함: ' + JSON.stringify(s.house));
  ok(await page.locator('.house-view .hslot[data-slot="h1-b"] [data-item="it1"]').count() === 1 && await page.locator('.house-view .hslot[data-slot="h1-a"] [data-item]').count() === 0, 'house', '옮긴 자리가 화면에 바로 반영되지 않음');
  ok(!Object.keys(s.ledger).some((k) => /house|item|it\d/.test(k)), 'house', '집 배치가 장부에 들어감');

  // ── 구슬: 첫 장면에서는 찾는다(찾기 전에도 다음으로 갈 수 있다)
  await playUntil(page, at('c2-a', 'pearl'));
  ok(await page.locator('#tray button[data-act="next"]').count() === 1, 'pearl', '구슬을 찾기 전에 다음 단추가 없음(진행이 막힘)');
  ok(await page.locator('.pearl-spot').count() === 1, 'pearl', '장면 그림에 숨은 구슬 자리가 없음');
  await page.locator('.pearl-spot').click(); await W(page, 120);
  s = await state(page);
  ok(s.pearls.b1 === true, 'pearl', '구슬을 눌렀는데 찾은 것으로 남지 않음');
  ok(!Object.keys(s.ledger).some((k) => /pearl|b\d/.test(k)), 'pearl', '구슬 찾기가 장부에 들어감');

  // ── 말판: 장면을 마치면 말이 다음 칸으로 걸어간다
  await playUntil(page, (c) => c.step === 'walk');
  await page.waitForSelector('.board-view .piece');
  ok(await page.locator('.board-view .piece').getAttribute('data-from') === 'sq1', 'board', '말이 출발한 칸이 sq1이 아님');
  const walking = await page.waitForSelector('.board-view .piece.walking', { timeout: 2500 }).then(() => true, () => false);
  ok(walking, 'board', '말이 걷는 모습(걷기 애니메이션)이 없음');
  const arrived = await page.waitForSelector('.board-view .piece[data-at="sq2"]:not(.walking)', { timeout: 6000 }).then(() => true, () => false);
  ok(arrived, 'board', '말이 다음 칸(sq2)에 닿지 않음');
  ok((await page.locator('.board-view .sq[data-sq="sq2"]').innerText()).includes('(임시) 벼슬 칸'), 'board', '말판 칸에 벼슬 이름이 없음');
  ok((await page.locator('.board-view .sq[data-sq="sq1"]').innerText()).includes('(임시) 장소 칸'), 'board', '말판 칸에 장소 이름이 없음');
  const frame = await page.locator('.board-view .board-frame-tag').innerText().catch(() => '');
  ok(/게임 설정/.test(frame), 'board', '말판 틀에 게임 설정 표시가 없음: ' + frame);
  ok((await page.locator('.board-view').innerText()).includes('(임시) 실제 놀이 소개'), 'board', '말판에 실제 승경도 소개가 없음');
  ok(await page.locator('button', { hasText: /윤목|주사위|굴리기/ }).count() === 0, 'board', '윤목·주사위 굴리기 단추가 있음');
  ok(await page.locator('.board-view .sq.fall, .board-view [data-kind="fall"]').count() === 0, 'board', '떨어지는 칸이 있음');
  // 소원 목록은 말판 옆에 걸려 있고, 미색(숨은 소원)은 '?'
  ok(await page.locator('.board-view .wish-list').count() === 1, 'wish', '말판 옆에 소원 목록이 없음');
  ok((await page.locator('.board-view .wish-list [data-wish="w-hidden"]').innerText()).trim().includes('?'), 'wish', '숨은 소원이 ?로 보이지 않음');
  ok(!(await page.locator('.board-view .wish-list').innerText()).includes('(임시) 숨은 소원'), 'wish', '꿈 도중에 숨은 소원 이름이 보임');

  // ── 둘째 장면: 집이 한 단계 오르고(더 넓다), 놓아 둔 물건이 그대로 있다
  await playUntil(page, at('c2-b', 'item'));
  await page.waitForSelector('.house-view');
  ok(await page.locator('.house-view').getAttribute('data-stage') === 'h2', 'house', '말판 진행에 따라 집이 h2로 오르지 않음');
  const w2 = await page.locator('.house-view .house-art').evaluate((e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height);
  ok(w2 > w1, 'house', `다음 단계의 집이 더 넓지 않음(${w1} → ${w2})`);
  ok(await page.locator('.house-view .hslot [data-item="it1"]').count() === 1, 'house', '단계가 올라도 놓아 둔 물건이 집에 없음');
  await page.locator('.house-view .bundle [data-item="it2"]').click();
  await page.locator('.house-view .hslot:not(:has([data-item])) >> nth=0').click();
  s = await state(page);
  ok(!!s.house.it2, 'house', '둘째 물건이 놓이지 않음');
  const placed = { it1: s.house.it1, it2: s.house.it2 };

  // ── 새로 고침해도 배치가 남는다(꿈 보따리 → 집)
  await resumeAfterReload(page);
  ok(JSON.stringify({ it1: (await state(page)).house.it1, it2: (await state(page)).house.it2 }) === JSON.stringify(placed), 'house', '새로 고침 뒤 배치가 바뀜');
  let tabs = await bagTabs(page);
  ok(['board', 'house', 'bonds', 'wishes'].every((t) => tabs.includes(t)), 'bag', '꿈 동안 보따리에 말판·집·인연첩·소원 탭이 다 있지 않음: ' + tabs);
  await page.locator('.bag [data-tab="house"]').click(); await W(page);
  ok(await page.locator(`.bag .hslot[data-slot="${placed.it1}"] [data-item="it1"]`).count() === 1, 'house', '새로 고침 뒤 집에 놓은 자리가 보이지 않음');
  // 인연첩: 카드에 이름·신분·능력과 사연·만난 곳, 다시 만나면 사연이 덧붙음. 수를 세지 않는다
  await page.locator('.bag [data-tab="bonds"]').click(); await W(page);
  const bondTxt = await page.locator('.bag').innerText();
  ok(/\(임시\) 인연 하나/.test(bondTxt) && /\(임시\) 신분/.test(bondTxt) && /\(임시\) 능력과 사연/.test(bondTxt) && /\(임시\) 만난 곳/.test(bondTxt), 'bonds', '인연 카드에 이름·신분·능력·만난 곳이 없음');
  ok(!/\d+\s*(명|사람|\/\s*8)/.test(bondTxt), 'bonds', '인연첩에 사람 수를 세는 표시가 있음');
  await closeSheet(page);

  // ── 셋째 장면(둘째 인연): 구슬을 찾지 않고 지나간다 → 막히지 않는다
  await playUntil(page, at('c2-c', 'pearl'));
  ok(await page.locator('.pearl-spot').count() === 1, 'pearl', '둘째 여인 장면에 구슬 자리가 없음');
  await page.locator('#tray button[data-act="next"]').click(); await W(page, 120);
  await playUntil(page, (c) => c.scene !== 'c2-c' || c.step === 'walk');
  ok(!(await state(page)).pearls.b2, 'pearl', '찾지 않은 구슬이 찾은 것으로 남음');
  // 소원: 인연은 소원을 채우지 않는다. 풍류는 물건(악기)으로만 채운다
  const wishes = await page.evaluate(() => G.app.wishes());
  const hid = wishes.find((w) => w.id === 'w-hidden');
  ok(hid && hid.name === '?' && !hid.filled, 'wish', '꿈 동안 숨은 소원이 채워지거나 이름이 보임: ' + JSON.stringify(hid));
  ok(!wishes.some((w) => (w.sources || []).some((x) => /^b\d/.test(x))), 'wish', '인연이 소원을 채움: ' + JSON.stringify(wishes));
  const music = wishes.find((w) => w.id === 'w-music');
  ok(music && music.filled && music.sources.includes('it3'), 'wish', '풍류가 악기로 채워지지 않음: ' + JSON.stringify(music));

  // ── 3장: 잔치는 아직 꿈 → 지팡이로 땅을 두드리며 다가오는 것도 꿈 → 난간을 치는 순간 깨어남
  await playUntil(page, at('c3-staff', 'approach'));
  s = await state(page);
  ok(s.awake === false, 'wake', '지팡이로 땅을 두드리는 동안 이미 깨어남이 기록됨');
  ok(await page.locator('.dream-tableau .board-view').count() === 1 && await page.locator('.dream-tableau .house-view').count() === 1, 'wake', '깨기 전 잔치에 말판·집이 보이지 않음');
  ok(await page.locator('.dream-tableau .office-badge').count() > 0, 'wake', '깨기 전 잔치에 벼슬이 보이지 않음');
  ok(await page.locator('.dream-tableau .bond-strip').count() === 1, 'wake', '깨기 전 잔치에 인연첩이 보이지 않음');
  await playUntil(page, at('c3-staff', 'strike'));
  ok(await page.evaluate(() => !G.audio.now()), 'wake', '지팡이 소리 전에 음악이 멈추지 않음');
  ok((await state(page)).awake === false, 'wake', '난간을 치기 전에 깨어남이 기록됨');
  const awakeAtClick = await page.evaluate(() => new Promise((res) => {
    const b = document.querySelector('[data-act="staff"]');
    b.click();
    res(G.save.state.awake);
  }));
  ok(awakeAtClick === true, 'wake', '지팡이로 난간을 치는 순간 깨어남이 기록되지 않음');
  await page.waitForSelector('.zen-room', { timeout: 6000 });
  ok(await page.locator('.dream-tableau .board-view, .dream-tableau .house-view, .dream-tableau .bond-strip, .dream-tableau .office-badge').count() === 0, 'wake', '깨어난 뒤에도 말판·집·벼슬·인연첩이 남아 있음');
  ok(await page.locator('.wake-keep .wish-list').count() === 1, 'wake', '깨어난 뒤 소원 목록이 남지 않음');
  ok(await page.locator('.wake-keep .pearl-keep [data-bond="b1"].found').count() === 1, 'wake', '깨어난 뒤 찾은 구슬이 남지 않음');
  ok(await page.locator('.wake-keep .pearl-keep [data-bond="b2"].found').count() === 0, 'wake', '찾지 않은 구슬이 찾은 것으로 남음');
  ok(await page.locator('.zen-room.desat, .zen-room .desat').count() > 0, 'wake', '빈 선방이 채도를 낮춘 화면이 아님');
  tabs = await bagTabs(page);
  ok(!tabs.includes('board') && !tabs.includes('house') && !tabs.includes('bonds'), 'wake', '깨어난 뒤에도 말판·집·인연첩 탭이 있음: ' + tabs);
  ok(tabs.includes('wishes') && tabs.includes('pearls'), 'wake', '깨어난 뒤 소원·구슬 탭이 없음: ' + tabs);
  await closeSheet(page);
  ok(await page.evaluate(() => !G.dream.can('house') && !G.dream.can('board') && !G.dream.can('bonds')), 'wake', 'G.dream.can이 깨어난 뒤에도 집·말판을 허락함');
  ok(await page.evaluate(() => G.dream.open('house')) === false, 'wake', 'G.dream.open이 깨어난 뒤 집을 엶');

  // ── 4장 꿈 일지
  await playUntil(page, at('c4-journal', 'journal-wishes'));
  ok((await page.locator('.journal-top .wish[data-wish="w-hidden"]').innerText()).includes('?'), 'journal', '일지 첫머리에서 숨은 소원이 ?가 아님');
  ok((await page.locator('.journal-top .mind-col').innerText()).includes('(임시) 마음 하나'), 'journal', '2장에서 고른 마음이 소원 옆에 다시 나오지 않음');
  ok(await page.locator('.board-view, .house-view').count() === 0, 'journal', '일지에 사라진 말판·집이 보임');
  await playUntil(page, at('c4-journal', 'activity'));
  ok(await page.locator('.activity .slot[data-slot="j1"]').count() === 1 && await page.locator('.activity .slot[data-slot="j3"]').count() === 1, 'journal', '채점하는 짝(j1, j3)이 칸으로 나오지 않음');
  ok(await page.locator('.activity .slot[data-slot="j2"]').count() === 0, 'journal', "'해석' 짝(j2)이 채점 칸으로 나옴");
  ok(await page.locator('.interp-pair[data-pair="j2"]').count() === 1, 'journal', "'해석' 짝이 보이지 않음");
  ok(/해석/.test(await page.locator('.interp-pair[data-pair="j2"]').innerText()) && /채점하지 않/.test(await page.locator('.interp-pair[data-pair="j2"]').innerText()), 'journal', "'해석' 짝에 해석·채점하지 않음 표시가 없음");
  ok(await page.locator('.activity .choice[data-choice="(임시) 숨은 소원"], .activity .choice[data-choice="?"]').count() === 0, 'journal', '숨은 소원이 맞대기 선택지로 나옴');
  // 묶음 확정: 한 칸만 채우면 확인을 못 누른다
  await page.locator('.activity .slot[data-slot="j1"]').click();
  await page.locator('.activity .choice[data-choice="(임시) 소원 나"]').click();
  ok(await page.locator('button[data-act="check"]').isDisabled(), 'journal', '한 칸만 채웠는데 확인을 누를 수 있음(묶음 확정 아님)');
  await fill(page, 'wrong');
  await page.locator('button[data-act="check"]').click(); await W(page);
  ok(await page.locator('.activity .slot.wrong').count() > 0, 'journal', '일지에서 틀린 칸 표시가 없음');
  await page.locator('[data-help="memo"]').click(); await W(page);
  ok(await page.locator('.activity .memo:visible').count() === 1, 'journal', '일지 여백 메모가 열리지 않음');
  await page.locator('[data-help="answer"]').click(); await W(page);
  await page.locator('button[data-act="check"]').click(); await W(page);
  ok(await page.locator('.activity.solved').count() === 1, 'journal', '정답 보기 뒤 확인했는데 끝나지 않음');
  s = await state(page);
  const LJ = s.ledger['journal-match'];
  ok(LJ && LJ.first === false && LJ.help === 'student' && LJ.final, 'journal', '일지 맞대기 장부가 이상함: ' + JSON.stringify(LJ));
  // '해석' 짝은 골라도 채점하지 않는다
  await page.locator('.interp-pair[data-pair="j2"] [data-wish="w-a"]').click(); await W(page);
  s = await state(page);
  ok((s.journal.picks || {}).j2 === 'w-a', 'journal', "'해석' 짝에 고른 것이 저장되지 않음");
  const ledgerKeys = Object.keys(s.ledger).join(',');
  ok(!/j2|interp|bond/.test(ledgerKeys), 'journal', "'해석' 짝·인연 잇기가 장부에 들어감: " + ledgerKeys);
  // 성진의 마음과 인연 잇기 → 그 순간 미색(숨은 소원)이 드러난다
  await playUntil(page, at('c4-journal', 'journal-bond'));
  ok((await page.locator('.journal-top .wish[data-wish="w-hidden"]').innerText()).includes('?'), 'journal', '잇기 전에 숨은 소원이 드러남');
  ok(await page.locator('.link-opt[data-must]').count() > 0, 'journal', '인연 잇기 선택지가 없음');
  await page.locator('.link-opt[data-wish="w-a"]').click(); await W(page, 120);
  s = await state(page);
  ok(s.journal.revealed && s.journal.revealed['w-hidden'] === true, 'journal', '잇기를 했는데 숨은 소원이 드러난 것으로 남지 않음');
  ok((await page.locator('.journal-top .wish[data-wish="w-hidden"]').innerText()).includes('(임시) 숨은 소원'), 'journal', '잇는 순간 숨은 소원 칸이 드러나지 않음');
  ok(Object.keys(s.ledger).join(',') === ledgerKeys, 'journal', '인연 잇기가 장부를 바꿈');
  // 구슬 → 팔선녀: 찾은 구슬은 카드가 뒤집히고, 못 찾은 것은 흐리다
  await playUntil(page, at('c4-journal', 'journal-pearls'));
  const flipped = await page.waitForSelector('.fairy-card[data-bond="b1"].flipped', { timeout: 3000 }).then(() => true, () => false); // 차례로 뒤집히는 연출
  ok(flipped, 'journal', '찾은 구슬의 인연 카드가 뒤집히지 않음');
  ok((await page.locator('.fairy-card[data-bond="b1"]').innerText()).includes('(임시) 팔선녀 정체'), 'journal', '뒤집힌 카드에 팔선녀 정체가 없음');
  ok(await page.locator('.fairy-card[data-bond="b2"].missed').count() === 1, 'journal', '못 찾은 구슬이 흐리게 표시되지 않음');
  const op = await page.locator('.fairy-card[data-bond="b2"]').evaluate((e) => parseFloat(getComputedStyle(e).opacity));
  ok(op < 0.8, 'journal', '못 찾은 구슬 카드가 흐리지 않음: opacity ' + op);

  // ── 5장 해석: 대사의 마지막 말 전에 고르고, 들은 뒤 한 번 고친다
  await playUntil(page, at('c5-master', 'interp-pick'));
  ok(await page.locator('.last-words').count() === 0, 'interp', '해석을 고르기 전에 대사의 마지막 말이 보임');
  ok(await page.locator('.interp-opt').count() === 3, 'interp', '해석 선택지가 3개가 아님');
  ok(await page.locator('.ev-opt').count() === 3, 'interp', '근거 구절 후보가 3개가 아님');
  ok(await page.locator('#tray button[data-act="next"]').count() === 0, 'interp', '고르기 전에 다음으로 갈 수 있음');
  await page.locator('.interp-opt[data-opt="i1"]').click();
  ok(await page.locator('#tray button[data-act="next"]').count() === 0, 'interp', '근거 구절 없이 다음으로 갈 수 있음');
  await page.locator('.ev-opt[data-ev="e1"]').click(); await W(page);
  await page.locator('#tray button[data-act="next"]').click(); await W(page, 200);
  await page.waitForSelector('.last-words');
  s = await state(page);
  ok(s.interp.first && s.interp.first.option === 'i1' && s.interp.first.evidence === 'e1', 'interp', '처음 고른 해석이 저장되지 않음: ' + JSON.stringify(s.interp));
  ok((await page.locator('.last-words').innerText()).includes('아직 꿈에서 깨지 못했다'), 'interp', '대사의 마지막 말이 나오지 않음');
  ok(await step(page) === 'interp-revise', 'interp', '대사의 말 뒤 고치기 걸음이 아님: ' + await step(page));
  await page.locator('[data-act="revise"]').click(); await W(page);
  await page.locator('.interp-revise .interp-opt[data-opt="i2"]').click();
  await page.locator('.interp-revise .ev-opt[data-ev="e2"]').click(); await W(page);
  await page.locator('#tray button[data-act="next"]').click(); await W(page, 200);
  s = await state(page);
  ok(s.interp.changed && s.interp.changed.option === 'i2' && s.interp.changed.evidence === 'e2' && s.interp.revised === true, 'interp', '고친 해석이 저장되지 않음: ' + JSON.stringify(s.interp));
  ok(s.interp.first.option === 'i1', 'interp', '고친 뒤 처음 고른 것이 지워짐');
  ok(await page.locator('[data-act="revise"]:not([disabled])').count() === 0, 'interp', '한 번 고친 뒤에도 또 고칠 수 있음');
  ok(!Object.keys(s.ledger).some((k) => /interp/.test(k)), 'interp', '해석 고르기가 장부에 들어감');
  await playUntil(page, at('c5-master', 'ending'));
  ok((await page.locator('.ending').innerText()).includes('(임시 풀이) 팔선녀가 출가'), 'interp', '팔선녀의 출가와 결말이 나오지 않음');

  // ── 결과: 꿈 일지 마지막 장(이름·날짜·해석·근거·고친 흔적), 장부, 노트, 그림 저장
  await playUntil(page, (c) => c.ch === 'R');
  await page.waitForSelector('.journal-page');
  const jp = await page.locator('.journal-page').innerText();
  ok(jp.includes('(임시) 해석 둘') && jp.includes('(임시) 근거 구절 둘'), 'result', '마지막 장에 고친 해석·근거가 없음');
  ok(jp.includes('(임시) 해석 하나') && /고친 흔적|고쳤/.test(jp), 'result', '마지막 장에 고친 흔적이 없음');
  ok(/\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/.test(jp), 'result', '마지막 장에 날짜가 없음');
  await page.locator('.journal-page input[name="student-name"]').fill('김지은');
  await W(page);
  ok((await state(page)).name === '김지은', 'result', '이름이 저장되지 않음');
  const all = await page.locator('.play').innerText();
  ok(/찾은 구슬\s*1\s*\/\s*2/.test(all), 'result', '장부에 찾은 구슬 수(1/2)가 없음');
  ok(/점수로 치지 않/.test(all), 'result', '구슬 수가 점수가 아니라는 표시가 없음');
  ok(/첫 시도/.test(all) && /도움 사용/.test(all), 'result', '장부(첫 시도·도움)가 없음');
  ok(all.includes('오답 노트') && all.includes('(임시) 생각 나눔 질문') && all.includes('(임시) 작품 노트'), 'result', '오답 노트·생각 나눔 질문·작품 노트가 없음');
  ok(await page.locator('.board-view, .house-view, .hslot, .piece').count() === 0, 'result', '결과에 사라진 집·말판이 보임');
  const dlP = page.waitForEvent('download', { timeout: 8000 });
  await page.locator('[data-act="save-image"]').click();
  const dl = await dlP.catch(() => null);
  ok(!!dl, 'result', '그림 저장을 눌렀는데 내려받기가 없음');
  if (dl) {
    const name = dl.suggestedFilename();
    ok(/\.png$/.test(name) && name.includes('김지은'), 'result', '저장 파일 이름이 이상함: ' + name);
    const p = await dl.path();
    const buf = p ? fs.readFileSync(p) : Buffer.alloc(0);
    ok(buf.length > 2000 && buf.slice(1, 4).toString() === 'PNG', 'result', 'PNG 그림이 아님(크기 ' + buf.length + ')');
  }

  // ── 깨어난 뒤: 새로 고침해도 집·말판을 못 본다. 선생님용만 다시 본다
  await page.reload(); await ready(page);
  ok(await page.evaluate(() => !G.dream.can('house') && !G.dream.can('board')), 'lock', '새로 고침 뒤 집·말판이 열림');
  await page.goto(FIX + '&teacher=1'); await ready(page);
  ok(await page.evaluate(() => G.dream.can('house') && G.dream.can('board')), 'lock', '선생님용인데 집·말판을 못 봄');
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  tabs = await bagTabs(page);
  ok(tabs.includes('house') && tabs.includes('board'), 'lock', '선생님용 보따리에 집·말판 탭이 없음: ' + tabs);
  await page.locator('.bag [data-tab="house"]').click(); await W(page);
  ok(await page.locator('.bag .house-view').count() === 1, 'lock', '선생님용에서 집이 보이지 않음');
  await closeSheet(page);
  await page.goto(FIX + '&teacher=0'); await ready(page);
  ok(await page.evaluate(() => !G.dream.can('house')), 'lock', '선생님용을 끈 뒤에도 집이 열림');
  await finish(page);
});

// ───────── 키보드로 집 꾸미기(데스크톱)와 해석을 고른 뒤 새로 고침
await run('키보드와 이어 하기', async () => {
  const page = await newPage('keys', { viewport: { width: 1280, height: 800 }, mobile: false });
  await page.goto(FIX);
  await startNew(page);
  await playUntil(page, at('c2-a', 'item'));
  await page.locator('.house-view .bundle [data-item="it1"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.house-view .hslot[data-slot="h1-b"]').focus();
  await page.keyboard.press('Enter'); await W(page);
  ok((await state(page)).house.it1 === 'h1-b', 'keys', '키보드로 물건을 놓지 못함');
  // 그림은 정수배·부드럽게 하지 않기(말판의 말)
  await playUntil(page, (c) => c.step === 'walk');
  const r = await page.locator('.board-view .piece').evaluate((e) => getComputedStyle(e).imageRendering);
  ok(r === 'pixelated', 'keys', '말 그림에 image-rendering: pixelated가 없음: ' + r);
  // 해석: 대사의 말을 들은 뒤 새로 고침하면, 처음 고른 것은 그대로이고 고치기 기회만 남는다
  await playUntil(page, at('c5-master', 'interp-pick'));
  await page.locator('.interp-opt[data-opt="i3"]').click();
  await page.locator('.ev-opt[data-ev="e3"]').click();
  await page.locator('#tray button[data-act="next"]').click();
  await page.waitForSelector('.last-words');
  await resumeAfterReload(page);
  await playUntil(page, at('c5-master', 'interp-revise'));
  ok(await page.locator('.interp-pick-box .interp-opt:not([disabled])').count() === 0, 'keys', '대사의 말을 들은 뒤 새로 고침하자 처음 고르기를 다시 할 수 있음');
  await page.locator('#tray button[data-act="next"]').click(); await W(page, 200);
  const s = await state(page);
  ok(s.interp.first.option === 'i3' && s.interp.revised === false && s.interp.changed == null, 'keys', '고치지 않은 기록이 이상함: ' + JSON.stringify(s.interp));
  await finish(page);
});

// ───────── 말 걷기(장면 사이) 화면에서 끄기: 마친 장면을 다시 읽기로 열지 않고 다음 장면 처음부터 이어 간다
//  새로 고침(c2-a → c2-b), 처음 화면으로 갔다가 이어 하기(c2-b → c2-c), 장이 바뀌는 걸음에서 새로 고침(c2-c → c3-feast).
//  옛 기록처럼 pos가 마친 장면을 가리켜도 이어 하기는 아직 안 한 다음 장면으로 간다. 끝까지(결과) 갈 수 있어야 한다.
await run('말 걷기 중 끄기', async () => {
  const page = await newPage('walk-resume');
  await page.goto(FIX);
  await startNew(page);
  const ledgerAt = async () => JSON.stringify((await state(page)).ledger);
  // 첫 걸음(c2-a → c2-b)에서 새로 고침
  await playUntil(page, (c) => c.scene === 'c2-a' && c.step === 'walk');
  ok((await state(page)).done['c2-a'] === true, 'walk-resume', '말 걷기 화면인데 c2-a가 마친 것으로 남지 않음');
  const L1 = await ledgerAt();
  await resumeAfterReload(page);
  let c = await cur(page);
  ok(c.scene === 'c2-b' && c.revisit === false, 'walk-resume', '말 걷기 중 새로 고침 뒤 다음 장면(c2-b)이 아님: ' + JSON.stringify({ scene: c.scene, revisit: c.revisit }));
  ok(await ledgerAt() === L1, 'walk-resume', '말 걷기 중 새로 고침으로 장부가 바뀜');
  // 둘째 걸음(c2-b → c2-c)에서 처음 화면으로 갔다가 이어 하기
  await playUntil(page, (c) => c.scene === 'c2-b' && c.step === 'walk', 120);
  await page.locator('[data-tool="home"]').click();
  await page.waitForSelector('.title-screen');
  await vbtn(page, '이어 하기').first().click();
  await page.waitForSelector('.play');
  c = await cur(page);
  ok(c.scene === 'c2-c' && c.revisit === false, 'walk-resume', '말 걷기 중 처음 화면 → 이어 하기 뒤 다음 장면(c2-c)이 아님: ' + JSON.stringify({ scene: c.scene, revisit: c.revisit }));
  // 장이 바뀌는 걸음(c2-c → c3-feast, 실제 데이터의 s14 → c3-feast)에서 새로 고침
  await playUntil(page, (c) => c.scene === 'c2-c' && c.step === 'walk', 120);
  await resumeAfterReload(page);
  c = await cur(page);
  ok(c.scene === 'c3-feast' && c.revisit === false, 'walk-resume', '2장 마지막 말 걷기 중 새로 고침 뒤 3장 잔치가 아님: ' + JSON.stringify({ scene: c.scene, revisit: c.revisit }));
  // 옛 기록: pos가 마친 꿈 장면을 가리킨 채 저장된 경우에도 아직 안 한 다음 장면으로
  await page.evaluate(() => { G.save.state.pos = 'c2-b'; G.save.write(); });
  await resumeAfterReload(page);
  c = await cur(page);
  ok(c.scene === 'c3-feast' && c.revisit === false, 'walk-resume', 'pos가 마친 장면(c2-b)일 때 이어 하기가 다음 안 한 장면이 아님: ' + JSON.stringify({ scene: c.scene, revisit: c.revisit }));
  ok(await page.evaluate(() => G.app.resumeTarget().id) === 'c3-feast', 'walk-resume', 'resumeTarget이 마친 장면을 가리킴');
  // 끝까지 간다(같은 장면에 갇히지 않음)
  await playUntil(page, (c) => c.ch === 'R', 300);
  ok((await state(page)).awake === true, 'walk-resume', '끝까지 갔는데 깨어남이 기록되지 않음');
  // 목차에서 일부러 연 마친 장면은 그대로 다시 읽기(기록 불변)
  await page.goto(FIX + '&teacher=1'); await ready(page);
  const before = await ledgerAt();
  ok(await page.evaluate(() => G.app.open('c2-a')) === true, 'walk-resume', '선생님용에서 마친 꿈 장면을 열지 못함');
  await page.waitForSelector('.play[data-scene="c2-a"]');
  ok((await cur(page)).revisit === true, 'walk-resume', '목차로 연 마친 장면이 다시 읽기가 아님');
  ok(await ledgerAt() === before, 'walk-resume', '마친 장면 다시 열기로 장부가 바뀜');
  await page.goto(FIX + '&teacher=0'); await ready(page);
  await finish(page);
});

await browser.close();
server.close();
log(issues.length ? `\n✗ ${issues.length}개 문제` : '\n✓ 꿈 점검 통과');
process.exit(issues.length ? 1 : 0);
