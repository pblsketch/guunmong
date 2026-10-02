// 엔진 점검: 임시 데이터(?fixture=1)로 장 진행, 이어 하기, 깨어남 잠금, 새로 시작, 도움 사다리와 장부,
// 읽기 방식, 설정 저장, 선생님용(화면 접기 포함), 글 표시, 장면별 곡 바꾸기, 파일로 열기를 확인한다.
//   node check-engine.mjs        (tests/ 안에서. run-all.mjs가 부른다)
// 게임 폴더를 이 스크립트 안의 작은 서버로 띄우고, 설치된 크롬(channel: 'chrome')으로 연다.
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 390, height: 844 }, isMobile: opt.mobile !== false, hasTouch: opt.mobile !== false, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errs = [];
  page.reqs = [];
  page.tag = name;
  const allowMissing = opt.allowMissing || KNOWN_MISSING;
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() || {}).url || '';
    if (/Failed to load resource/.test(m.text()) && allowMissing.test(url)) return;
    if (/Failed to load resource/.test(m.text()) && !url) return; // 위치 없는 자원 오류는 response 쪽에서 본다
    page.errs.push('console: ' + m.text() + ' @' + url);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !allowMissing.test(r.url())) page.errs.push('http ' + r.status() + ': ' + r.url()); });
  page.on('request', (r) => page.reqs.push(r.url()));
  return page;
}
const W = (page, ms = 150) => page.waitForTimeout(ms);
const cur = (page) => page.evaluate(() => (window.G && G.app && G.app.current ? G.app.current() : null));
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
const vbtn = (page, label) => page.locator('button:visible', { hasText: label });

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

// 지금 장면의 활동을 맞게(또는 틀리게) 채운다
async function fill(page, how = 'right') {
  const plan = await page.evaluate((how) => {
    const a = G.app.current().data.activity;
    const choices = [...document.querySelectorAll('.activity .choice')].map((b) => b.dataset.choice);
    const used = new Set();
    return a.slots.map((s) => {
      const ans = [].concat(s.answer || []);
      let pick;
      if (how === 'right' && ans.length) pick = ans.find((x) => !used.has(x));
      else if (a.scored === false || !ans.length) pick = choices.find((c) => !used.has(c));
      else pick = choices.find((c) => !used.has(c) && !ans.includes(c));
      used.add(pick);
      return { slot: s.id, pick };
    });
  }, how);
  for (const p of plan) {
    await page.locator(`.activity .slot[data-slot="${p.slot}"]`).click();
    await page.locator(`.activity .choice[data-choice="${p.pick}"]`).first().click();
  }
}

// 한 걸음 진행(활동은 맞게 푼다)
async function act(page) {
  const st = await page.evaluate(() => {
    const play = document.querySelector('.play');
    return {
      step: play && play.dataset.step,
      unsolved: !!document.querySelector('.activity:not(.solved)'),
      mind: !!document.querySelector('.mind-opt:not([disabled])'),
      staff: !!document.querySelector('[data-act="staff"]:not([disabled])'),
      must: !!document.querySelector('[data-must]:not([disabled])'), // 꼭 골라야 하는 것(인연 잇기·해석 고르기 등)
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
async function playUntil(page, pred, limit = 300) {
  for (let i = 0; i < limit; i++) {
    const c = await cur(page);
    if (c && pred(c)) return c;
    await act(page);
  }
  throw new Error('playUntil: 도달하지 못함 ' + JSON.stringify(await cur(page)));
}
const at = (scene) => (c) => c.scene === scene;

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

// ───────── 1. 장 진행: 0→1→2→3→4→5→R 순서뿐
await run('장 진행', async () => {
  const page = await newPage('nav');
  await page.goto(FIX);
  await startNew(page);
  let c = await cur(page);
  ok(c && c.ch === '0', 'nav', '처음 장면이 0장이 아님: ' + JSON.stringify(c));
  // 아직 열리지 않은 장은 주소로도 못 연다
  await page.goto(FIX + '&ch=4'); await ready(page);
  c = await cur(page);
  ok(c && c.ch === '0', 'nav', '열리지 않은 4장이 주소로 열림: ' + JSON.stringify(c));
  // 목차: 2장은 아직 고를 수 없다
  await page.locator('[data-tool="toc"]').click();
  await page.waitForSelector('.toc');
  ok(await page.locator('.toc-ch[data-ch="2"].locked').count() === 1, 'nav', '목차에서 열리지 않은 2장이 잠겨 있지 않음');
  await page.keyboard.press('Escape');
  await W(page);
  const seen = [];
  for (let i = 0; i < 400; i++) {
    c = await cur(page);
    if (!seen.length || seen[seen.length - 1] !== c.ch) seen.push(c.ch);
    if (c.ch === 'R') break;
    await act(page);
  }
  ok(seen.join('') === '012345R', 'nav', '장 순서가 0123 45R이 아님: ' + seen.join(','));
  const s = await state(page);
  ok(s.awake === true, 'nav', '3장을 지나왔는데 깨어남이 기록되지 않음');
  await finish(page);
});

// ───────── 2. 장면 중간에 새로 고침 → 그 장면 처음부터 / 3장은 깨어나기 전후 규칙
await run('이어 하기', async () => {
  const page = await newPage('resume');
  await page.goto(FIX);
  await startNew(page);
  // 장면 안에서 읽기를 지나 활동까지
  await playUntil(page, (c) => c.scene === 'c2-a' && c.step === 'activity');
  ok(await page.evaluate(() => document.querySelector('.play').dataset.step) !== 'read', 'resume', '장면 안에서 다음 걸음으로 가지 않음');
  await page.reload(); await ready(page);
  await page.waitForSelector('.title-screen');
  await vbtn(page, '이어 하기').first().click();
  await page.waitForSelector('.play');
  let c = await cur(page);
  ok(c.scene === 'c2-a', 'resume', '새로 고침 뒤 같은 장면이 아님: ' + c.scene);
  const step = await page.evaluate(() => document.querySelector('.play').dataset.step);
  ok(step === 'read' || step === 'chapter', 'resume', '장면 처음부터가 아님: ' + step);
  // 3장 지팡이 앞에서 끄면 3장 처음(취미궁 잔치)부터
  await playUntil(page, at('c3-staff'));
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click();
  await page.waitForSelector('.play');
  c = await cur(page);
  ok(c.scene === 'c3-feast', 'resume', '깨어나기 전에 끄면 3장 처음이어야 함: ' + c.scene);
  // 지팡이 소리 뒤에 끄면 깨어난 선방부터
  await playUntil(page, at('c3-staff'));
  for (let i = 0; i < 20 && !(await page.locator('[data-act="staff"]:not([disabled])').count()); i++) await act(page);
  await page.locator('[data-act="staff"]').click();
  await W(page, 100);
  ok((await state(page)).awake === true, 'resume', '지팡이 소리 순간에 깨어남이 기록되지 않음');
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click();
  await page.waitForSelector('.play');
  c = await cur(page);
  ok(c.scene === 'c3-room', 'resume', '깨어난 뒤에 끄면 선방 장면이어야 함: ' + c.scene);
  await finish(page);
});

// ───────── 3. 깨어남 잠금: 뒤로 가기·새로 고침·목차·주소로 0~3장을 못 연다. 선생님용은 연다
await run('깨어남 잠금', async () => {
  const page = await newPage('lock');
  await page.goto(FIX);
  await startNew(page);
  // 깨어나기 전에는 뒤로 가기로 마친 장면을 다시 읽을 수 있다
  await playUntil(page, at('c1-a'));
  await page.evaluate(() => history.back()); await W(page, 300);
  let c = await cur(page);
  ok(c.scene === 'c0-a' && c.revisit === true, 'lock', '깨어나기 전 뒤로 가기가 마친 장면 다시 읽기가 아님: ' + JSON.stringify(c));
  await page.evaluate(() => G.app.resume()); await W(page);
  await playUntil(page, at('c3-room'));
  ok((await state(page)).awake === true, 'lock', '깨어남이 기록되지 않음');
  // 뒤로 가기
  for (let i = 0; i < 3; i++) { await page.evaluate(() => history.back()); await W(page, 250); }
  c = await cur(page);
  ok(c && c.scene === 'c3-room', 'lock', '깨어난 뒤 뒤로 가기로 꿈이 열림: ' + JSON.stringify(c));
  // 새로 고침
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  c = await cur(page);
  ok(c.scene === 'c3-room', 'lock', '새로 고침 뒤 선방이 아님: ' + c.scene);
  // 목차
  await page.locator('[data-tool="toc"]').click(); await page.waitForSelector('.toc');
  for (const ch of ['0', '1', '2']) ok(await page.locator(`.toc-ch[data-ch="${ch}"].locked`).count() === 1, 'lock', `목차에서 ${ch}장이 잠기지 않음`);
  ok(await page.locator('.toc-scene[data-scene="c0-a"]:not([disabled])').count() === 0, 'lock', '목차에서 0장 장면을 누를 수 있음');
  ok(await page.locator('.toc-scene[data-scene="c3-feast"]:not([disabled])').count() === 0, 'lock', '목차에서 3장 잔치(꿈)를 누를 수 있음');
  await page.keyboard.press('Escape'); await W(page);
  // 열 수 없는 것을 직접 불러도 열리지 않는다(엔진 API)
  const opened = await page.evaluate(() => G.app.open('c1-a'));
  ok(opened === false, 'lock', 'G.app.open이 깨어난 뒤 꿈 장면을 엶');
  // 주소
  for (const q of ['&ch=0', '&ch=2', '&scene=c1-a', '&scene=c3-feast', '&ch=3']) {
    await page.goto(FIX + q); await ready(page);
    c = await cur(page);
    ok(c && c.scene === 'c3-room', 'lock', `주소 ${q}로 꿈이 열림: ` + JSON.stringify(c));
  }
  // 선생님용은 연다
  await page.goto(FIX + '&teacher=1&ch=0'); await ready(page);
  c = await cur(page);
  ok(c && c.scene === 'c0-a', 'lock', '선생님용인데 0장이 열리지 않음: ' + JSON.stringify(c));
  await page.locator('[data-tool="toc"]').click(); await page.waitForSelector('.toc');
  ok(await page.locator('.toc-scene[data-scene="c1-a"]:not([disabled])').count() === 1, 'lock', '선생님용 목차에서 1장 장면이 열리지 않음');
  await page.keyboard.press('Escape'); await W(page);
  // 끄면 다시 잠긴다
  await page.goto(FIX + '&teacher=0&ch=1'); await ready(page);
  c = await cur(page);
  ok(c && c.ch !== '1' && c.ch !== '0', 'lock', '선생님용을 끈 뒤에도 꿈이 열림: ' + JSON.stringify(c));
  ok((await state(page)).teacher === false, 'lock', '?teacher=0이 선생님용을 끄지 않음');
  await finish(page);
});

// ───────── 4. 새로 시작: 확인을 받고 모든 기록을 지운다
await run('새로 시작', async () => {
  const page = await newPage('newgame');
  await page.goto(FIX);
  await startNew(page);
  await playUntil(page, at('c3-room'));
  await page.locator('[data-tool="home"]').click();
  await page.waitForSelector('.title-screen');
  await vbtn(page, '처음부터 새로').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, '그만두기').first().click();
  await W(page);
  let s = await state(page);
  ok(s.awake === true && Object.keys(s.done).length > 0, 'newgame', '그만두기를 눌렀는데 기록이 지워짐');
  await vbtn(page, '처음부터 새로').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, '새로 시작').first().click();
  await page.waitForSelector('.sheet .btn');
  s = await state(page);
  ok(s.awake === false, 'newgame', '새로 시작했는데 깨어남이 남음');
  ok(Object.keys(s.done).length === 0 && Object.keys(s.ledger).length === 0, 'newgame', '새로 시작했는데 진행·장부가 남음');
  ok(Object.keys(s.mind).length === 0 && Object.keys(s.items).length === 0 && Object.keys(s.pearls).length === 0, 'newgame', '마음·물건·구슬 기록이 남음');
  await vbtn(page, '처음 읽기').first().click();
  await page.waitForSelector('.play');
  const c = await cur(page);
  ok(c.scene === 'c0-a', 'newgame', '새로 시작 뒤 0장이 아님: ' + c.scene);
  await finish(page);
});

// ───────── 5. 도움 사다리와 장부
await run('도움 사다리', async () => {
  const page = await newPage('help');
  await page.goto(FIX);
  await startNew(page);
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'activity');
  ok(await page.locator('[data-help="memo"]:visible').count() === 0, 'help', '틀리기 전에 여백 메모가 보임');
  await fill(page, 'wrong');
  await page.locator('button[data-act="check"]').click(); await W(page);
  ok(await page.locator('.activity .slot.wrong').count() > 0, 'help', '틀린 칸 표시가 없음');
  ok(await page.locator('[data-help="memo"]:visible').count() === 1, 'help', '틀린 뒤 여백 메모 단추가 없음');
  ok(await page.locator('[data-help="answer"]:visible').count() === 0, 'help', '여백 메모 전에 정답 보기가 열림');
  let s = await state(page);
  ok(s.ledger['a-c0'] && s.ledger['a-c0'].first === false && !s.ledger['a-c0'].help, 'help', '첫 시도 틀림이 장부에 바로 남지 않음: ' + JSON.stringify(s.ledger['a-c0']));
  ok((s.wrong || []).some((w) => w.act === 'a-c0'), 'help', '오답 노트에 남지 않음');
  await page.locator('[data-help="memo"]').click(); await W(page);
  ok(await page.locator('.activity .memo:visible').count() > 0, 'help', '여백 메모가 보이지 않음');
  ok(await page.locator('[data-help="answer"]:visible').count() === 1, 'help', '여백 메모 뒤 정답 보기가 열리지 않음');
  await page.locator('[data-help="answer"]').click(); await W(page);
  await page.locator('button[data-act="check"]').click(); await W(page);
  ok(await page.locator('.activity.solved').count() === 1, 'help', '정답 보기 뒤 확인했는데 끝나지 않음');
  s = await state(page);
  const L0 = s.ledger['a-c0'];
  ok(L0 && L0.first === false && L0.help === 'student' && L0.final === true, 'help', '장부 기록이 이상함: ' + JSON.stringify(L0));
  // 첫 시도에 맞히면 도움 없음
  await playUntil(page, (c) => c.scene === 'c1-a' && c.step === 'activity');
  await fill(page, 'right'); await page.locator('button[data-act="check"]').click(); await W(page);
  s = await state(page);
  ok(s.ledger['a-c1'] && s.ledger['a-c1'].first === true && !s.ledger['a-c1'].help, 'help', '첫 시도 맞힘 기록이 이상함: ' + JSON.stringify(s.ledger['a-c1']));
  // 선생님용 켜고 '정답 채우기' → 도움 사용(선생님용)
  await playUntil(page, (c) => c.scene === 'c2-a' && c.step === 'activity');
  await page.locator('[data-tool="settings"]').click(); await page.waitForSelector('.settings');
  await page.locator('button[data-set="teacher"]').click(); await W(page);
  await page.keyboard.press('Escape'); await W(page);
  ok(await page.locator('[data-teacher="fill"]:visible').count() === 1, 'help', '선생님용 정답 채우기 단추가 없음');
  ok(await page.locator('[data-teacher="show"]:visible').count() === 1, 'help', '선생님용 정답 보기 단추가 없음');
  await page.locator('[data-teacher="fill"]').click(); await W(page);
  await page.locator('button[data-act="check"]').click(); await W(page);
  s = await state(page);
  ok(s.ledger['a-c2'] && s.ledger['a-c2'].help === 'teacher', 'help', '정답 채우기가 선생님용 도움으로 남지 않음: ' + JSON.stringify(s.ledger['a-c2']));
  // 학생이 한 번도 풀기 전에 선생님이 채웠으면 첫 시도는 '시도 안 함'(null)이지 맞힘이 아니다
  ok(s.ledger['a-c2'] && s.ledger['a-c2'].first === null && s.ledger['a-c2'].final === true, 'help', '시도 전 선생님용 정답 채우기가 첫 시도 기록을 남김: ' + JSON.stringify(s.ledger['a-c2']));
  const label = await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'a-c2').helpLabel);
  ok(label === '도움 사용(선생님용)', 'help', '장부 표시가 도움 사용(선생님용)이 아님: ' + label);
  const firstLabel = await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'a-c2').firstLabel);
  ok(firstLabel !== '첫 시도에 맞힘', 'help', '시도 전 선생님용 정답 채우기가 장부에 첫 시도에 맞힘으로 보임: ' + firstLabel);
  const label0 = await page.evaluate(() => G.app.ledgerRows().find((r) => r.id === 'a-c0').helpLabel);
  ok(label0 === '도움 사용', 'help', '학생 도움 표시가 도움 사용이 아님: ' + label0);
  // 채점하지 않는 활동은 장부에 들어가지 않는다
  await playUntil(page, (c) => c.scene === 'c2-b' && c.step === 'mind');
  s = await state(page);
  ok(!s.ledger['a-c2b'], 'help', '채점하지 않는 활동이 장부에 들어감');
  ok(!G_ledgerHasBond(s), 'help', '장부에 인연(사람)이 들어감');
  // 선생님용 끄고, 깨어나기 전 마친 장면 다시 읽기 → 장부가 바뀌지 않는다
  await page.goto(FIX + '&teacher=0'); await ready(page);
  const before = JSON.stringify((await state(page)).ledger);
  const opened = await page.evaluate(() => G.app.open('c0-a'));
  ok(opened === true, 'help', '깨어나기 전 마친 장면을 다시 열지 못함');
  await page.waitForSelector('.play');
  ok((await cur(page)).revisit === true, 'help', '다시 읽기 표시가 없음');
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'activity');
  await fill(page, 'right'); await page.locator('button[data-act="check"]').click(); await W(page);
  ok(JSON.stringify((await state(page)).ledger) === before, 'help', '다시 읽기에서 장부가 바뀜');
  // 결과 화면의 장부 표시
  await page.evaluate(() => G.app.resume()); await W(page);
  await playUntil(page, (c) => c.ch === 'R');
  const txt = await page.locator('.play').innerText();
  ok(/도움 사용\(선생님용\)/.test(txt), 'help', '결과 장부에 도움 사용(선생님용)이 보이지 않음');
  await finish(page);
});
function G_ledgerHasBond(s) { return Object.keys(s.ledger).some((k) => /^b\d/.test(k)); }

// ───────── 6. 읽기 방식
await run('읽기 방식', async () => {
  const page = await newPage('mode');
  await page.goto(FIX);
  await startNew(page, '처음 읽기');
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'read');
  ok(await page.locator('.gloss:visible').count() > 0, 'mode', '처음 읽기인데 풀이가 보이지 않음');
  ok(await page.locator('.face').count() > 0, 'mode', '처음 읽기인데 인물 얼굴 자동 표시가 없음');
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'activity');
  ok(await page.locator('.activity .choice[data-choice="정"]').count() === 0, 'mode', '처음 읽기에 다시 읽기용 헷갈리는 선택지가 들어감');
  // 설정에서 다시 읽기로
  await page.locator('[data-tool="settings"]').click(); await page.waitForSelector('.settings');
  await page.locator('button[data-set="mode"]').click(); await W(page);
  await page.keyboard.press('Escape'); await W(page);
  ok((await state(page)).mode === 'review', 'mode', '설정에서 읽기 방식이 바뀌지 않음');
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'read');
  ok(await page.locator('.gloss:visible').count() === 0, 'mode', '다시 읽기인데 풀이가 보임');
  ok(await page.locator('.face').count() === 0, 'mode', '다시 읽기인데 얼굴 자동 표시가 있음');
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'activity');
  ok(await page.locator('.activity .choice[data-choice="정"]').count() === 1, 'mode', '다시 읽기에 헷갈리는 선택지가 늘지 않음');
  // 다시 읽기의 장 시작에는 지난 이야기가 없다 / 처음 읽기에는 있다
  await playUntil(page, (c) => c.ch === '1');
  ok(await page.locator('.recap').count() === 0, 'mode', '다시 읽기인데 지난 이야기가 나옴');
  await finish(page);

  const p2 = await newPage('mode2');
  await p2.goto(FIX);
  await startNew(p2, '처음 읽기');
  await playUntil(p2, (c) => c.ch === '1');
  ok(await p2.locator('.recap').count() > 0, 'mode', '처음 읽기인데 장마다 지난 이야기가 없음');
  await finish(p2);
});

// ───────── 7. 설정 저장
await run('설정', async () => {
  const page = await newPage('settings');
  await page.goto(FIX);
  await startNew(page);
  await page.locator('[data-tool="settings"]').click(); await page.waitForSelector('.settings');
  const credit = await page.locator('.settings .credit-full').innerText();
  ok(/국립국악원/.test(credit) && /임시 출처/.test(credit), 'settings', '설정에 음원 출처 문구가 없음: ' + credit);
  for (const k of ['music', 'sound', 'big']) await page.locator(`button[data-set="${k}"]`).click();
  await W(page);
  ok(await page.evaluate(() => document.documentElement.classList.contains('big')), 'settings', '큰 글자가 바로 적용되지 않음');
  ok(await page.locator('button[data-set="clear"]').count() === 1, 'settings', '기록 지우기 단추가 없음');
  await page.keyboard.press('Escape'); await W(page);
  await page.reload(); await ready(page);
  const s = await state(page);
  ok(s.music === false && s.sound === false && s.big === true, 'settings', '설정이 새로 고침 뒤 남지 않음: ' + JSON.stringify({ m: s.music, s: s.sound, b: s.big }));
  ok(await page.evaluate(() => document.documentElement.classList.contains('big')), 'settings', '새로 고침 뒤 큰 글자가 풀림');
  // 기록 지우기(확인 후)
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  await playUntil(page, at('c1-a'));
  await page.locator('[data-tool="settings"]').click(); await page.waitForSelector('.settings');
  await page.locator('button[data-set="clear"]').click();
  await page.waitForSelector('.sheet >> text=지울까요');
  await vbtn(page, '지우기').last().click();
  await page.waitForSelector('.title-screen');
  const s2 = await state(page);
  ok(Object.keys(s2.done).length === 0, 'settings', '기록 지우기 뒤 진행이 남음');
  ok(s2.music === false && s2.big === true, 'settings', '기록 지우기가 설정까지 지움');
  await finish(page);
});

// ───────── 8. 선생님용: ?teacher=1, 화면 접기(소리 멈춤)
await run('선생님용', async () => {
  const page = await newPage('teacher', { viewport: { width: 1366, height: 860 }, mobile: false });
  await page.goto(FIX + '&teacher=1');
  await ready(page);
  ok((await state(page)).teacher === true, 'teacher', '?teacher=1이 켜지 않음');
  await startNew(page);
  ok(await page.locator('[data-tool="fold"]:visible').count() === 1, 'teacher', '화면 접기 단추가 없음');
  await page.locator('[data-tool="fold"]').click();
  await page.waitForSelector('.fold-ov');
  const cover = await page.evaluate(() => { const r = document.querySelector('.fold-ov').getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1; });
  ok(cover, 'teacher', '화면 접기가 화면을 덮지 않음');
  ok(await page.evaluate(() => G.audio.hushed()), 'teacher', '화면 접기가 소리를 멈추지 않음');
  await vbtn(page, '다시 펼치기').click(); await W(page);
  ok(await page.locator('.fold-ov').count() === 0, 'teacher', '다시 펼치기가 안 됨');
  ok(!(await page.evaluate(() => G.audio.hushed())), 'teacher', '다시 펼친 뒤에도 소리가 멈춰 있음');
  // 선생님 안내
  await page.locator('[data-tool="toc"]').click(); await page.waitForSelector('.toc');
  ok(await page.locator('.toc .teacher-guide').count() === 1, 'teacher', '목차에 교사용 안내가 없음');
  await page.keyboard.press('Escape'); await W(page);
  // 키보드로 진행(Enter)
  await page.locator('#tray button[data-act="next"]').focus();
  const before = await page.evaluate(() => document.querySelector('.play').dataset.step + G.app.current().scene);
  await page.keyboard.press('Enter'); await W(page);
  const after = await page.evaluate(() => document.querySelector('.play').dataset.step + G.app.current().scene);
  ok(before !== after, 'teacher', '키보드 Enter로 진행되지 않음');
  await finish(page);
});

// ───────── 9. 글 표시(原文·풀이·게임 설정·이본 노트·해석)와 곡 바꾸기
await run('글 표시와 곡', async () => {
  const page = await newPage('marks', { viewport: { width: 820, height: 1180 } });
  await page.goto(FIX);
  await startNew(page);
  await playUntil(page, (c) => c.scene === 'c0-a' && c.step === 'read');
  ok(await page.locator('.mark.orig .seal', { hasText: '原文' }).count() > 0, 'marks', '原文 낙관이 없음');
  ok(await page.locator('.gloss').count() > 0, 'marks', '풀이 층이 없음');
  ok(await page.locator('.mark.fiction .real', { hasText: '실제로는 →' }).count() === 1, 'marks', '게임 설정이 처음 나올 때 실제로는 →이 없음');
  ok(await page.locator('.orig .old').count() > 0, 'marks', '옛한글 원문에 옛한글 글꼴 표시가 없음');
  const t0 = await page.evaluate(() => G.audio.track);
  ok(t0 === 'stub-a', 'marks', '0장 곡이 stub-a가 아님: ' + t0);
  await playUntil(page, (c) => c.scene === 'c1-a' && c.step === 'read');
  ok(await page.locator('.mark.variant').count() > 0, 'marks', '이본 노트 표시가 없음');
  ok(await page.locator('.mark.interp').count() > 0, 'marks', '해석 표시가 없음');
  ok(await page.locator('.mark.fiction').count() > 0 && await page.locator('.mark.fiction .real').count() === 0, 'marks', '같은 게임 설정이 두 번째에도 실제로는 →을 보임');
  const t1 = await page.evaluate(() => G.audio.track);
  ok(t1 === 'stub-b', 'marks', '장면별 곡이 바뀌지 않음: ' + t1);
  await W(page, 400);
  ok(await page.evaluate(() => !!G.audio.now()), 'marks', '배경음이 흐르지 않음(합성음 대체 포함)');
  // 효과음·배경음 따로 끄기
  await page.evaluate(() => { G.save.state.music = false; G.audio.music(false); });
  await W(page, 300);
  ok(await page.evaluate(() => !G.audio.now()), 'marks', '배경음을 껐는데 곡이 흐름');
  // 그림은 정수배·부드럽게 하지 않기
  const pix = await page.evaluate(() => getComputedStyle(document.querySelector('.scene-img img, img.pix') || document.body).imageRendering);
  ok(pix === 'pixelated', 'marks', '그림에 image-rendering: pixelated가 없음: ' + pix);
  await finish(page);
});

// ───────── 10. 내용 데이터가 없을 때 멈추지 않는다
// 실제 내용(js/data/)이 생긴 뒤에도 '데이터 없음'을 재현하려고, 없는 임시 데이터 파일(tests/fixtures/nodata.js)을 가리킨다.
await run('데이터 없음', async () => {
  const page = await newPage('nodata', { allowMissing: /\/assets\/|\/js\/data\/|\/tests\/fixtures\/nodata\.js/ });
  await page.goto(BASE + '?fixture=nodata');
  await ready(page);
  await page.waitForSelector('.title-screen');
  ok(await page.locator('.data-missing').count() === 1, 'nodata', '데이터가 없다는 안내가 없음');
  await finish(page);
});

// ───────── 11. 파일로 열기(file://): 시작·저장·소리
await run('파일로 열기', async () => {
  const page = await newPage('file');
  const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '?fixture=1';
  await page.goto(url);
  await startNew(page);
  await playUntil(page, at('c1-a'));
  await W(page, 400);
  ok(await page.evaluate(() => !!G.audio.now()), 'file', '파일로 열었을 때 배경음(또는 합성 대체)이 흐르지 않음');
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  ok((await cur(page)).scene === 'c1-a', 'file', '파일로 열었을 때 저장·이어 하기가 안 됨');
  await finish(page);
});

await browser.close();
server.close();
log(issues.length ? `\n✗ ${issues.length}개 문제` : '\n✓ 엔진 점검 통과');
process.exit(issues.length ? 1 : 0);
