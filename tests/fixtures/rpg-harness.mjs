import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const SHOTS = path.join(ROOT, 'tests/shots/t2');
export async function harness() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const scratch = path.join(SHOTS, 'entry.html');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace('<head>', '<head><base href="../../../">');
  if (!/href="css\/rpg\.css(?:\?[^"\s]*)?"/.test(html) || !/src="js\/game\/world\.js(?:\?[^"\s]*)?"/.test(html)) throw Error('제품 HTML에 월드 연결 누락');
  fs.writeFileSync(scratch, html);
  fs.writeFileSync(path.join(SHOTS, 'away.html'), '<!doctype html><meta charset="utf-8"><title>캐시 복귀 검사</title><p>로컬 검사 페이지</p>');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const errors = [];
  function observe(p) {
    p.setDefaultTimeout(5000);
    p.setDefaultNavigationTimeout(30000);
    p.on('pageerror', e => errors.push(e.stack));
    p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
    p.on('request', r => { if (!r.url().startsWith(origin) && !/^(file|data|blob):/.test(r.url())) errors.push('외부 요청 ' + r.url()); });
  }
  async function page(profile = 'world-opening', viewport = { width: 390, height: 844 }, opt = {}) {
    const context = await browser.newContext({ viewport, ...opt });
    context.on('page', observe);
    const p = await context.newPage();
    await p.goto(origin + '/tests/shots/t2/entry.html?fixture=' + profile);
    await ready(p);
    return p;
  }
  return { browser, origin, errors, page, observe, file: pathToFileURL(scratch).href,
    async close() { await browser.close(); await new Promise(r => server.close(r)); } };
}
export const ready = p => p.waitForFunction(() => G.app.booted);
export const state = p => p.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
export async function start(p) {
  await p.getByRole('button', { name: '시작하기', exact: true }).click();
  // 미션 퍼스트: 새로 시작하면 임무 창이 먼저 뜬다(임무 자료가 있는 제품 자료). 실제 단추로 닫는다.
  if (await p.evaluate(() => !!G.data.notes?.mission)) { await p.waitForSelector('[data-mission]'); while (await p.locator('[data-mission="next"]').count()) await p.locator('[data-mission="next"]').click(); await p.locator('[data-mission="start"]').click(); };
  await p.waitForSelector('[data-world]');
}
export async function target(p, id) {
  await seekTarget(p, id);
  const npc = await p.evaluate(id => {
    const map = G.data.maps.find(m => m.id === document.querySelector('.play').dataset.map), object = map.objects.find(o => o.id === id);
    if (G.data.fixture !== 'rpg-opening' || object?.kind !== 'npc') return null;
    const element = document.querySelector('[data-object="' + id + '"]'), image = element.querySelector('.world-sprite'), sprite = G.data.sprites[object.sprite];
    return { key: object.sprite, src: sprite?.src, displayed: image && getComputedStyle(image).backgroundImage, pending: element.dataset.artPending };
  }, id);
  if (npc) {
    if (!['npc-fairy-green', 'npc-yuk', 'npc-nurse'].includes(npc.key) || !npc.displayed?.includes(npc.src) || npc.pending === 'true') throw Error('승인 NPC 전신 표시 실패: ' + id);
    await p.locator('.world-camera').scrollIntoViewIfNeeded();
    if (!await p.locator('[data-object="' + id + '"]').evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('[data-object]') === el; })) throw Error('필드 NPC 입력 가림: ' + id);
  }
  await p.waitForFunction(id => document.querySelector('[data-act="interact"][data-target="' + id + '"]')?.disabled === false, id);
  await p.locator('[data-act="interact"][data-target="' + id + '"]').click();
}
export async function openTargets(p) {
  // 조작 도구는 화면에서 숨긴 키보드 길이다. 키보드처럼 초점을 옮겨 연다.
  if (!await p.locator('.world-tools').evaluate(el => el.open)) { await p.locator('.world-tools > summary').focus(); await p.keyboard.press('Enter'); }
  if (!await p.locator('.world-targets').evaluate(el => el.open)) await p.locator('.world-targets summary').click();
}
export async function idle(p) {
  await p.waitForFunction(() => document.querySelector('.world-actor')?.dataset.moving === 'false');
}
export async function step(p, key) {
  await p.keyboard.press(key);
  await idle(p);
}
export async function seekTarget(p, id) {
  await openTargets(p);
  const button = p.locator('[data-world-target="' + id + '"]');
  if (await button.count() !== 1) throw Error('대상 목록에 단추 없음: ' + id);
  await button.click();
  await idle(p);
}
export async function cellPoint(p, x, y) {
  await p.locator('.world-camera').scrollIntoViewIfNeeded();
  return p.evaluate(({ x, y }) => {
    const world = document.querySelector('[data-world]'), r = world.getBoundingClientRect(), c = world.parentElement.getBoundingClientRect();
    const map = G.data.maps.find(m => m.id === document.querySelector('.play').dataset.map), scale = r.width / (map.width * map.tile);
    const point = { x: r.left + (x + .5) * map.tile * scale, y: r.top + (y + .5) * map.tile * scale };
    if (point.x <= c.left || point.x >= c.right || point.y <= c.top || point.y >= c.bottom) throw Error('목적지 칸이 카메라 밖: ' + x + ',' + y);
    if (document.elementFromPoint(point.x, point.y)?.closest('[data-world]') !== world) throw Error('목적지 실제 입력 가림');
    return point;
  }, { x, y });
}
export async function fieldCell(p, x, y, touch = false) {
  const point = await cellPoint(p, x, y);
  if (touch) await p.touchscreen.tap(point.x, point.y); else await p.mouse.click(point.x, point.y);
  await idle(p);
}
// 위기 도전 창을 실제 단추로 푼다. 답은 공개 자료에서 읽지만 저장·상태를 주입하지 않는다.
// wrong이면 첫 판가름을 실제로 실패시킨 뒤(고르기·추리는 오답 하나, 찾기는 촛불을 다 쓰고 다시 하기, 가락은 첫 소절에서 한 번 틀림) 다시 풀어 이어 간다.
export async function challenge(p, { wrong = false } = {}) {
  const id = await p.evaluate(() => document.querySelector('.challenge-book')?.dataset.challengeId || null);
  if (!id) return null;
  const c = await p.evaluate(id => JSON.parse(JSON.stringify(G.data.challenges.find(c => c.id === id))), id);
  const book = p.locator('.challenge-book');
  if (wrong && c.kind === 'search') {
    // 미리 표시한 곳(앞 도전 첫 성공)은 누를 수 없으므로 눌리는 곳 가운데서 촛불이 다 꺼질 때까지 헛짚는다.
    for (let i = 0; i < c.tries; i++) {
      const open = await book.locator('[data-spot]:not([disabled])').evaluateAll(els => els.map(el => el.dataset.spot));
      await book.locator('[data-spot="' + c.spots.find(s => s.id !== c.answer && open.includes(s.id)).id + '"]').click();
    }
    await book.locator('[data-challenge="retry"]').click();
  } else if (wrong && c.kind !== 'sequence') {
    const miss = c.options.find(o => o.id !== c.answer).id;
    if (c.kind === 'deduce') for (let i = 0; i < c.clues.length; i++) if (await book.locator('[data-clue="' + i + '"][aria-pressed="false"]').count()) await book.locator('[data-clue="' + i + '"]').click();
    await book.locator('[data-option="' + miss + '"]').click();
  }
  if (c.kind === 'pick') await book.locator('[data-option="' + c.answer + '"]').click();
  if (c.kind === 'deduce') {
    for (let i = 0; i < c.clues.length; i++) if (await book.locator('[data-clue="' + i + '"][aria-pressed="false"]').count()) await book.locator('[data-clue="' + i + '"]').click();
    await book.locator('[data-option="' + c.answer + '"]').click();
  }
  if (c.kind === 'search') await book.locator('[data-spot="' + c.answer + '"]').click();
  if (c.kind === 'sequence') for (const [round, notes] of c.rounds.entries()) {
    await p.waitForSelector('.challenge-book[data-round="' + round + '"][data-ready="true"]', { timeout: 20000 });
    if (wrong && round === 0) await book.locator('[data-note="' + (notes[0] + 1) % c.notes.length + '"]').click();
    for (const n of notes) await book.locator('[data-note="' + n + '"]').click();
  }
  await p.locator('.challenge-book[data-solved="true"] [data-challenge="continue"]').click();
  return c;
}
// 생각 선택: choice가 'up'이면 ▲만 있는 선택지, 'stay'면 물러남('소원 그대로')을 학생이 보는 미리 보기 글로 고른다. 없으면 첫 선택지.
async function talkChoice(p, choice) {
  const id = await p.evaluate(choice => {
    const u = G.data.notes?.ui?.choice || {}, buttons = [...document.querySelectorAll('[data-dialogue] .choice-tray [data-talk]')];
    const preview = b => b.querySelector('[data-preview]')?.textContent || '';
    const hit = choice === 'stay' ? buttons.find(b => preview(b) === u.stay) : choice === 'up' ? buttons.find(b => preview(b).includes(u.up) && !preview(b).includes(u.down)) : null;
    return (hit || buttons[0]).dataset.talk;
  }, choice || null);
  return '[data-dialogue] .choice-tray [data-talk="' + id + '"]';
}
// 소원 찾기 확정 뒤 같은 화면의 숨긴 소원을 실제 단추로 고른다(고르기 전에는 다음 단추가 없다).
export async function secretWish(p, wish = 'gongmyeong') {
  await p.locator('[data-secret-wish="' + wish + '"]').click();
  await p.locator('[data-act="secret"]').click();
  await p.waitForSelector('[data-secret-chosen="' + wish + '"]');
}
export async function dialogue(p, options = {}) {
  await p.waitForSelector('[data-dialogue], .challenge-book');
  if (await challenge(p, options)) await p.waitForSelector('[data-dialogue]');
  while (await p.locator('[data-dialogue]').count()) {
    if (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) await p.locator(await talkChoice(p, options.choice)).click();
    else await p.locator('[data-dialogue] [data-act="next"]').click();
    await p.waitForTimeout(30);
  }
}
