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
  if (!html.includes('href="css/rpg.css"') || !html.includes('src="js/game/world.js"')) throw Error('제품 HTML에 월드 연결 누락');
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
  if (!await p.locator('.world-tools').evaluate(el => el.open)) await p.locator('.world-tools > summary').click();
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
export async function dialogue(p) {
  await p.waitForSelector('[data-dialogue]');
  while (await p.locator('[data-dialogue]').count()) {
    await p.locator('[data-dialogue] [data-act="next"]').click();
    await p.waitForTimeout(30);
  }
}
