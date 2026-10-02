// 그림 점검: 데이터와 엔진이 가리키는 그림 파일이 모두 있는지, 화면에서 도트 그림이 기기 픽셀 기준 정수배로만 보이는지,
// 기획서 §17-8의 화면 장식 그림이 실제로 쓰이는지 확인하고, 휴대폰·데스크톱에서 주요 화면을 찍어 tests/shots/에 남긴다(사람이 보는 용도, 저장소에 넣지 않음).
//   node check-assets.mjs        (tests/ 안에서. run-all.mjs가 부른다)
// 정적 점검(node)
//   - 장면 img·imgAfter·roomImg, 물건 img, 집 단계 img, 인물 얼굴·표정, 인연 얼굴·선녀 얼굴, 말 옷 그림이 assets/에 있는지
//   - 엔진·CSS·index.html·manifest에 글자로 적힌 assets/ 경로가 모두 있는지
// 화면 점검(크롬, 선생님용으로 장면을 바로 열어 돌아봄)
//   - /assets/ 404 없음(글꼴만 글꼴 작업 대기), 바깥 요청 없음
//   - 보이는 img.pix가 모두 정수배(또는 1/정수배)
//   - §17-8 장식 그림(title, frame_*, wish_*, gyoji, card_*, journal_page, cloud_wipe, pearl*, seal_blank, btn_frame, divider_knot, corner_cloud)을 실제로 불러옴
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SHOTS = path.join(ROOT, 'tests', 'shots');
const issues = [];
const log = (...a) => console.log(...a);
const ok = (cond, where, msg) => { if (!cond) { issues.push(`${where}: ${msg}`); log('  ✗', `${where}: ${msg}`); } return !!cond; };
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ───────── 1. 정적 점검
log('▶ 그림 파일');
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['people', 'chapters', 'board', 'scenes', 'wishes', 'bonds', 'house', 'journal', 'interp', 'notes']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f + '.js'), 'utf8'), sandbox);
}
const D = sandbox.window.GUUN;
const need = new Map(); // 경로 → 어디서
const want = (rel, from) => { if (!need.has(rel)) need.set(rel, from); };
for (const s of D.scenes) {
  for (const k of ['img', 'imgAfter', 'roomImg']) if (s[k]) want(`assets/sc/${s[k]}.webp`, s.id + '.' + k);
  if (s.item) want(`assets/items/${s.item.img || s.item.id}.webp`, s.id + '.item');
}
for (const st of D.house.stages) want(`assets/house/${st.img || st.id}.webp`, 'house.' + st.id);
for (const [id, p] of Object.entries(D.people)) {
  if (p.noFace) continue;
  const face = p.face || id;
  want(`assets/pt/${face}.webp`, 'people.' + id);
  for (const m of p.moods || []) want(`assets/pt/${face}_${m}.webp`, 'people.' + id + '.' + m);
}
for (const b of D.bonds) { want(`assets/pt/${b.face || b.id}.webp`, 'bonds.' + b.id); if (b.fairyFace) want(`assets/pt/${b.fairyFace}.webp`, 'bonds.' + b.id + '.fairyFace'); }
want('assets/board/horse_walk.webp', 'board 기본 말');
for (const q of D.board) if (q.outfit) want(`assets/board/horse_walk_${q.outfit}.webp`, 'board.' + q.id + '.outfit');
// 엔진·CSS·index.html·manifest에 글자로 적힌 경로
const srcFiles = ['index.html', 'manifest.webmanifest', 'css/style.css', ...fs.readdirSync(path.join(ROOT, 'js', 'game')).map((f) => 'js/game/' + f), ...fs.readdirSync(path.join(ROOT, 'js', 'core')).map((f) => 'js/core/' + f)];
for (const f of srcFiles) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of t.matchAll(/assets\/(?:ui|board|house|sc|pt|items)\/[\w-]+\.(?:webp|png)/g)) want(m[0], f);
}
let missing = 0;
for (const [rel, from] of need) if (!ok(exists(rel), 'file', rel + ' 이(가) 없음 (' + from + ')')) missing++;
log(`  가리키는 그림 ${need.size}개 · 없는 것 ${missing}개`);
const UI17_8 = ['title', 'frame_gloss', 'frame_dream', 'frame_real', 'seal_blank', 'wish_board', 'wish_fill', 'wish_mist', 'gyoji', 'card_frame', 'card_back', 'journal_page', 'cloud_wipe', 'divider_knot', 'corner_cloud', 'btn_frame'];
const BEADS = ['pearl', 'pearl_trace', 'pearl_empty'];
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
ok(['assets/ui/icon-192.png', 'assets/ui/icon-512.png'].every((i) => manifest.icons.some((x) => x.src === i) && exists(i)), 'manifest', '앱 정보(manifest)에 아이콘 192·512가 없음');

// ───────── 2. 화면 점검과 찍기
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
fs.mkdirSync(SHOTS, { recursive: true });
const FONTS = /(?!)/; // 글꼴 파일이 생겨 이제 글꼴 404도 실패로 본다
const requested = new Set();
const W = (page, ms = 150) => page.waitForTimeout(ms);

// 보이는 도트 그림이 정수배인지(offsetWidth: 움직임 연출의 transform은 빼고 잰다)
async function integerCheck(page, where) {
  const bad = await page.evaluate(() => {
    const dpr = window.devicePixelRatio || 1;
    const out = [];
    for (const img of document.querySelectorAll('img.pix')) {
      if (!img.naturalWidth || img.classList.contains('missing') || !img.offsetParent || !img.offsetWidth) continue;
      const cs = getComputedStyle(img); // 테두리·움직임 연출(transform)을 뺀 그림 크기
      const r = (parseFloat(cs.width) * dpr) / img.naturalWidth;
      const rh = (parseFloat(cs.height) * dpr) / img.naturalHeight;
      const good = (x) => (x >= 1 ? Math.abs(x - Math.round(x)) < 0.02 : Math.abs(1 / x - Math.round(1 / x)) < 0.02);
      if (!good(r) || !good(rh) || Math.abs(r - rh) > 0.02) out.push(img.getAttribute('src').replace(/^.*assets\//, '') + ' ×' + r.toFixed(3) + '/' + rh.toFixed(3));
    }
    return out;
  });
  ok(bad.length === 0, where, '정수배가 아닌 도트 그림: ' + bad.slice(0, 6).join(', '));
}
async function shot(page, name) {
  await W(page, 400);
  await integerCheck(page, page.tag + '/' + name);
  await page.screenshot({ path: path.join(SHOTS, `${page.tag}_${name}.png`), fullPage: false });
}
// 선생님용으로 한 걸음씩: 활동은 '정답 채우기', 마음은 첫째, 꼭 고를 것은 첫째, 그 밖에는 다음
async function stepUntil(page, pred, limit = 200) {
  let st = null;
  for (let i = 0; i < limit; i++) {
    st = await page.evaluate(() => {
      const play = document.querySelector('.play');
      return {
        step: play && play.dataset.step, scene: play && play.dataset.scene,
        fill: !!document.querySelector('.activity:not(.solved) [data-teacher="fill"]'),
        check: !!document.querySelector('#tray [data-act="check"]:not([disabled])'),
        mind: !!document.querySelector('.mind-opt:not([disabled])'),
        must: !!document.querySelector('[data-must]:not([disabled])'),
        staff: !!document.querySelector('[data-act="staff"]:not([disabled])'),
        next: !!document.querySelector('#tray [data-act="next"]'),
      };
    });
    if (await pred(st)) return st;
    if (st.check) { await page.locator('#tray [data-act="check"]').click(); await W(page, 80); continue; }
    if (st.fill) { await page.locator('.activity:not(.solved) [data-teacher="fill"]').first().click(); await W(page, 80); continue; }
    if (st.mind) { await page.locator('.mind-opt').first().click(); await W(page, 60); continue; }
    if (st.staff) { await page.locator('[data-act="staff"]').click(); await W(page, 80); continue; }
    if (st.must) { await page.locator('[data-must]:not([disabled])').first().click(); await W(page, 60); continue; }
    if (st.next) { await page.locator('#tray [data-act="next"]').click(); await W(page, 80); continue; }
    await W(page, 150);
  }
  throw new Error('stepUntil: 닿지 못함 ' + JSON.stringify(st));
}

async function tour(tag, viewport, opt = {}) {
  log('▶ 화면 돌아보기 ' + tag);
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: opt.dpr || 1, isMobile: !!opt.mobile, hasTouch: !!opt.mobile });
  const page = await ctx.newPage();
  page.tag = tag;
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !(FONTS.test((m.location() || {}).url || '') && /Failed to load resource/.test(m.text()))) errs.push('console: ' + m.text() + ' @' + ((m.location() || {}).url || '')); });
  page.on('response', (r) => { if (r.status() >= 400 && !FONTS.test(r.url())) errs.push('http ' + r.status() + ': ' + r.url()); });
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:')) errs.push('바깥 요청: ' + u); const m = u.match(/assets\/ui\/([\w-]+)\.\w+/); if (m) requested.add(m[1]); });
  try {
    await page.goto(ORIGIN + '/index.html?teacher=1');
    await page.waitForFunction(() => window.G && G.app && G.app.booted === true);
    await shot(page, '01_title');
    await page.locator('button:visible', { hasText: '시작하기' }).click();
    await page.waitForSelector('.sheet');
    await page.locator('button:visible', { hasText: '처음 읽기' }).click();
    await page.waitForSelector('.play');
    // 서장: 장 카드(매듭·구름 장식)
    await shot(page, '02_chapter');
    // 꿈 장면과 숨은 구슬(정경패, 원작 근거 구슬) → 말이 한림학사 칸으로 뛰어감(교지 카드)
    await page.evaluate(() => { const st = G.save.state; for (const s of G.app.list()) { if (s.id === 's04-geomungo') break; st.done[s.id] = true; } st.items = { 'it-yangryu': {}, 'it-geomungo': {}, 'it-sijeon': {} }; st.pos = 's04-geomungo'; st.reach = 2; G.save.write(); G.app.open('s04-geomungo'); });
    await stepUntil(page, (s) => s.scene === 's04-geomungo' && s.step === 'read');
    await shot(page, '03_scene');
    await stepUntil(page, (s) => s.step === 'pearl');
    await page.locator('.pearl-spot').scrollIntoViewIfNeeded();
    await shot(page, '04_pearl');
    await page.locator('.pearl-spot').click();
    await shot(page, '05_pearl_found');
    await stepUntil(page, (s) => s.step === 'walk' && s.next);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, '06_board_walk');
    await page.locator('.gyoji-card').scrollIntoViewIfNeeded();
    await shot(page, '07_gyoji');
    // 집(승상부, 물건 여럿)
    await page.evaluate(() => {
      const st = G.save.state;
      for (const s of G.app.list()) { if (s.id === 's14-honrye') break; st.done[s.id] = true; }
      st.pos = 's14-honrye';
      const its = ['it-yangryu', 'it-geomungo', 'it-sijeon', 'it-yeogwan', 'it-bujeok', 'it-bujeol', 'it-cheonrima', 'it-tungso', 'it-mungbang', 'it-chammageom', 'it-bisu', 'it-mulbyeong', 'it-hasa'];
      st.items = {}; its.forEach((i) => (st.items[i] = {}));
      st.house = { 'it-yangryu': 'ss-1', 'it-geomungo': 'ss-2', 'it-sijeon': 'ss-3', 'it-tungso': 'ss-9', 'it-mungbang': 'ss-10', 'it-chammageom': 'ss-4', 'it-hasa': 'ss-11', 'it-cheonrima': 'ss-14', 'it-mulbyeong': 'ss-15' };
      st.pearls = { chae: true, gyeongpae: true, nanyang: true };
      G.save.write(); G.app.open('s14-honrye');
    });
    await W(page, 300);
    await page.evaluate(() => { G.ui.closeSheets(); G.dream.open('house'); });
    await page.waitForSelector('.bag .house-view');
    await shot(page, '08_house');
    // 취미궁(가장 넓은 집): 바닥 줄 칸에 놓인 물건이 대리석 바닥 위에 서는지
    await page.evaluate(() => {
      const st = G.save.state;
      st.done['s14-honrye'] = true; st.pos = 'c3-feast'; st.reach = 3;
      st.items['it-girinpo'] = {};
      st.house = { 'it-yangryu': 'cw-1', 'it-geomungo': 'cw-9', 'it-sijeon': 'cw-10', 'it-tungso': 'cw-11', 'it-mungbang': 'cw-12', 'it-hasa': 'cw-13', 'it-girinpo': 'cw-14', 'it-chammageom': 'cw-2', 'it-cheonrima': 'cw-17', 'it-mulbyeong': 'cw-18' };
      G.save.write(); G.ui.closeSheets(); G.app.open('c3-feast');
    });
    await W(page, 300);
    await page.evaluate(() => { G.ui.closeSheets(); G.dream.open('house'); });
    await page.waitForSelector('.bag .house-view');
    await shot(page, '08b_house_chwimi');
    await page.locator('.bag-tab[data-tab="board"]').click();
    await shot(page, '09_bag_board');
    await page.locator('.bag-tab[data-tab="wishes"]').click();
    await shot(page, '10_bag_wishes');
    await page.evaluate(() => G.ui.closeSheets());
    // 깨어남: 지팡이 → 흰 구름 → 빈 선방
    await page.evaluate(() => { const st = G.save.state; for (const s of G.app.list()) { if (s.id === 'c3-staff') break; st.done[s.id] = true; } st.pos = 'c3-staff'; st.reach = 3; G.save.write(); G.app.open('c3-staff'); });
    await stepUntil(page, (s) => s.staff);
    await page.locator('[data-act="staff"]').click();
    await W(page, 700);
    await page.screenshot({ path: path.join(SHOTS, `${tag}_11_cloud.png`) });
    await stepUntil(page, (s) => s.step === 'awake' && s.next);
    await page.locator('.zen-room').scrollIntoViewIfNeeded();
    await shot(page, '12_awake_room');
    // 꿈 일지: 인연 잇기 뒤 근거, 구슬과 팔선녀
    await page.evaluate(() => { G.app.open('c4-journal'); });
    await stepUntil(page, (s) => s.scene === 'c4-journal' && s.step === 'journal-wishes');
    await shot(page, '13_journal_top');
    await stepUntil(page, (s) => s.step === 'journal-bond' && s.next);
    await page.locator('.link-out').scrollIntoViewIfNeeded();
    await shot(page, '14_journal_bond');
    await stepUntil(page, (s) => s.step === 'journal-pearls' && s.next);
    await W(page, 2600);
    await page.locator('.fairy-grid').scrollIntoViewIfNeeded();
    await shot(page, '15_journal_fairies');
    // 결과
    await page.evaluate(() => { const st = G.save.state; st.interp = { first: { option: 'i-vain', evidence: 'E7' }, heard: true, changed: { option: 'i-nondual', evidence: 'E9' }, revised: true, final: true }; G.save.write(); G.app.open('r-result'); });
    await page.waitForSelector('.journal-page');
    await shot(page, '16_result');
  } catch (e) {
    ok(false, tag, '예외: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e));
  }
  ok(errs.length === 0, tag, '오류·404: ' + errs.slice(0, 6).join(' | '));
  await ctx.close();
}

await tour('phone', { width: 390, height: 844 }, { mobile: true, dpr: 2 });
await tour('tablet', { width: 820, height: 1180 }, { mobile: true, dpr: 2 });
await tour('desktop', { width: 1280, height: 860 }, { dpr: 1 });
for (const n of [...UI17_8, ...BEADS]) ok(requested.has(n), 'ui', '기획서 §17-8 그림 ' + n + '을(를) 화면에서 쓰지 않음');

await browser.close();
server.close();
log('  찍은 화면: ' + path.relative(ROOT, SHOTS) + '/');
log(issues.length ? `✗ 그림 점검 실패 ${issues.length}건` : '✓ 그림 점검 통과');
process.exit(issues.length ? 1 : 0);
