// 실제 등록 자산의 파일·승인 해시·색·무손실 형식과 브라우저 정수배/시간 변화를 검사한다.
// 선생님 바로가기는 자산별 관찰에만 쓴다. 학생 완주는 check-content에서 별도 수행한다.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SHOTS = path.join(ROOT, 'tests/shots'); fs.mkdirSync(SHOTS, { recursive: true });
const box = { window: {} };
vm.createContext(box);
for (const file of fs.readdirSync(path.join(ROOT, 'js/data')).filter((f) => f.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data', file), 'utf8'), box);
const D = box.window.GUUN;
const required = new Set();
const want = (src) => { assert.ok(src.startsWith('assets/')); required.add(src); assert.ok(fs.existsSync(path.join(ROOT, src)), '누락: ' + src); };
for (const sc of D.scenes) {
  if (sc.img) want('assets/sc/' + sc.img + '.webp');
  for (const frame of sc.timeline || []) if (frame.img) want('assets/sc/' + frame.img + '.webp');
  for (const item of [...(sc.items || []), ...(sc.bonus?.items || [])]) if (item.img) want('assets/items/' + item.img + '.webp');
}
for (const p of Object.values(D.people)) if (!p.noFace) { want('assets/pt/' + p.face + '.webp'); for (const mood of p.moods || []) want('assets/pt/' + p.face + '_' + mood + '.webp'); }
for (const b of D.bonds) { want('assets/pt/' + b.face + '.webp'); if (b.fairyFace) want('assets/pt/' + b.fairyFace + '.webp'); }
for (const stage of D.house.stages) want('assets/house/' + stage.img + '.webp');
for (const outfit of ['', '_gwan', '_jang', '_sang']) want('assets/board/horse_walk' + outfit + '.webp');
for (const [key, entry] of Object.entries(D.sprites)) {
  want(entry.src);
  assert.equal(entry.width, ['study', 'geomungo', 'sword', 'strategy', 'hoseung'].includes(key) ? 96 : 32);
  assert.equal(entry.height, entry.width); assert.equal(entry.rows, 1); assert.equal(entry.frames, entry.width === 96 ? 4 : 1);
}
assert.equal(Object.keys(D.sprites).length, 12);
const sourceFiles = ['index.html', 'manifest.webmanifest', ...fs.readdirSync(path.join(ROOT, 'css')).filter((f) => f.endsWith('.css')).map((f) => 'css/' + f), ...['core', 'game'].flatMap((folder) => fs.readdirSync(path.join(ROOT, 'js', folder)).filter((f) => f.endsWith('.js')).map((f) => 'js/' + folder + '/' + f))];
for (const file of sourceFiles) for (const match of fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/assets\/(?:ui|board|house|sc|pt|items|sprites|fonts)\/[\w.-]+\.(?:webp|png|woff2)/g)) want(match[0]);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
for (const size of [192, 512]) assert.ok(manifest.icons.some((i) => i.src === 'assets/ui/icon-' + size + '.png'));
const python = spawnSync('python', [path.join(ROOT, 'tools/check_assets.py')], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(python.stdout || ''); process.stderr.write(python.stderr || '');
assert.equal(python.status, 0, '141개 자산 크기·32색·무손실·승인 해시');
assert.match(python.stdout, /141 expected, 141 present/);
console.log('✓ 참조 파일 ' + required.size + '개 · Python 자산 141개');
const errors = [], requested = new Set(), observed = new Set();
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('content-type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' })[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let page;
const ready = () => page.waitForFunction(() => G.app.booted);
const cur = () => page.evaluate(() => G.app.current());
const next = () => page.locator('#tray [data-act="next"]').click();
async function go(id) { await page.goto(origin + '/index.html?teacher=1&scene=' + id); await ready(); }
async function until(step, limit = 80) {
  for (let i = 0; i < limit; i++) {
    const c = await cur(); if (c?.step === step) return;
    const button = page.locator('#tray [data-act="next"]:not([disabled])');
    if (await button.count()) await button.click(); else await page.waitForTimeout(70);
  }
  throw Error('도달 실패 ' + step + ': ' + JSON.stringify(await cur()));
}
async function integerCheck(label) {
  if (await page.locator('.board-art').count()) await page.waitForSelector('.board-art.has-img .board-img');
  const result = await page.evaluate((sprites) => {
    const dpr = devicePixelRatio, seen = [], bad = [];
    const good = (x) => x >= 1 ? Math.abs(x - Math.round(x)) < .02 : Math.abs(1 / x - Math.round(1 / x)) < .02;
    function check(el, nw, nh, name) {
      if (!el.offsetParent || !el.offsetWidth || getComputedStyle(el).visibility === 'hidden') return;
      const css = getComputedStyle(el), x = parseFloat(css.width) * dpr / nw, y = parseFloat(css.height) * dpr / nh;
      seen.push(name);
      if (!good(x) || !good(y) || Math.abs(x - y) > .02 || css.imageRendering !== 'pixelated') bad.push(name + ':' + x + '/' + y);
    }
    for (const img of document.querySelectorAll('img.pix')) if (img.naturalWidth) check(img, img.naturalWidth, img.naturalHeight, img.getAttribute('src'));
    for (const el of document.querySelectorAll('.prep-sprite, .cut-sprite, .piece.sprite')) {
      const css = getComputedStyle(el), entry = Object.values(sprites).find((s) => css.backgroundImage.includes(s.src));
      if (el.matches('.piece')) check(el, 32, 32, css.backgroundImage);
      else if (entry) {
        check(el, entry.width, entry.height, entry.src);
        const size = css.backgroundSize.split(' ').map(parseFloat);
        const sx = size[0] * dpr / (entry.width * entry.frames), sy = size[1] * dpr / (entry.height * entry.rows);
        if (!good(sx) || !good(sy) || Math.abs(sx - sy) > .02) bad.push('sheet ' + entry.src);
      } else bad.push('등록 없는 시트 ' + css.backgroundImage);
    }
    return { seen, bad };
  }, D.sprites);
  assert.ok(result.seen.length > 0, label + ' 검사할 실제 그림 없음'); assert.deepEqual(result.bad, [], label);
  result.seen.forEach((s) => observed.add(s));
}
async function shot(name) {
  await page.locator('img.pix:visible').evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await integerCheck(name); await page.screenshot({ path: path.join(SHOTS, 'assets_' + name + '.png'), scale: 'css' });
}
let failed = false, networkViolation = null;
try {
  for (const [tag, viewport, dpr] of [['phone', { width: 390, height: 844 }, 2], ['tablet', { width: 820, height: 1180 }, 2], ['desktop', { width: 1280, height: 860 }, 1]]) {
    console.log('▶ 실제 자산 관찰 ' + tag);
    const context = await browser.newContext({ viewport, deviceScaleFactor: dpr }); page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
    page.on('request', (r) => {
      const url = r.url();
      if (new URL(url).origin === origin) requested.add(new URL(url).pathname.slice(1));
      else if (!/^(data|blob):/.test(url)) {
        networkViolation = Error('CRITICAL 외부 요청 ' + url); console.error(networkViolation.message);
        page.close().catch((error) => console.error('종료 오류: ' + error.message));
      }
    });
    await page.goto(origin + '/index.html'); await ready(); await page.waitForFunction(() => document.querySelector('.title-art')?.naturalWidth > 0); await shot(tag + '_title');
    const targets = [['study', 'e01-huayin'], ['geomungo', 'e02-tianjin'], ['sword', 'e03-geomungo'], ['strategy', 'e04-exam']];
    for (const [action, id] of targets) {
      await go(id); await until('prep1');
      await page.locator('[data-act="prep"][data-action="' + action + '"]').click(); await page.waitForSelector('.prep-sprite');
      const positions = new Set();
      for (let t = 0; t < 7; t++) { positions.add(await page.locator('.prep-sprite').evaluate((el) => getComputedStyle(el).backgroundPositionX)); await page.waitForTimeout(70); }
      assert.ok(positions.size >= 2, action + ' 자동 프레임 재생');
      assert.equal(await page.locator('.prep-sprite').evaluate((el) => el.getBoundingClientRect().width), 96);
      await shot(tag + '_prep_' + action);
      if (action === 'study') {
        await next(); await page.locator('[data-act="prep"][data-action="study"]').click(); await next();
        await until('grade'); await page.waitForSelector('.grade[data-counted="true"]'); await shot(tag + '_grade');
        await next(); await until('walk'); await shot(tag + '_walk');
      }
      if (action === 'sword') {
        await next(); await page.locator('[data-act="prep"][data-action="sword"]').click(); await next();
        await until('grade'); await next(); await until('walk'); await page.waitForSelector('.gyoji-card'); await shot(tag + '_gyoji');
      }
    }
    await go('e07-tungso'); await until('prep1'); await page.locator('[data-act="prep"][data-action="geomungo"]').click(); await next(); await page.locator('[data-act="prep"][data-action="geomungo"]').click(); await next();
    await page.waitForSelector('[data-act="inspect-picture"]'); await page.locator('[data-act="inspect-picture"]').click();
    await page.waitForSelector('.pearl-inspection .pic-box:not(.ph)'); await shot(tag + '_pearl'); await page.locator('.inspect-spot').click(); await shot(tag + '_pearl_found'); await page.keyboard.press('Escape');
    await go('e08-wonsu'); await until('prep1');
    await page.locator('[data-act="prep"][data-action="sword"]').click(); await next();
    await page.locator('[data-act="prep"][data-action="strategy"]').click(); await next();
    await until('grade'); await next(); await until('walk');
    assert.equal(await page.locator('.wish[data-wish="chuljang"] .part.on').count(), 1);
    await shot(tag + '_wish_half');
    for (const id of ['e05-chunun', 'e11-seungsang', 'c3-feast']) {
      await go(id); if ((await cur()).step === 'chapter') await next();
      await page.locator('[data-hud="house"]').click(); await page.waitForSelector('.house-view .pic-box:not(.ph)'); await shot(tag + '_house_' + id); await page.keyboard.press('Escape');
      await page.locator('[data-hud="board"]').click(); await page.waitForSelector('.board-art.has-img'); await shot(tag + '_board_' + id); await page.keyboard.press('Escape');
    }
    await go('c3-staff'); await until('staff');
    const staff = page.locator('.cut-figure[data-sprite="hoseung"] .cut-sprite');
    assert.equal(await staff.evaluate((el) => getComputedStyle(el).backgroundPositionX), '-192px'); await page.waitForTimeout(1700);
    assert.equal(await staff.evaluate((el) => getComputedStyle(el).backgroundPositionX), '-192px'); await shot(tag + '_staff_hold');
    await page.locator('[data-act="staff"]').click(); assert.equal(await staff.evaluate((el) => getComputedStyle(el).backgroundPositionX), '-288px');
    await page.waitForSelector('.dream-shatter'); await page.locator('[data-act="skip"]').click();
    await go('c4-journal'); if ((await cur()).step === 'chapter') await next();
    await page.locator('[data-teacher="fill"]').click(); await page.locator('[data-act="check"]').click(); await page.locator('.link-opt:not([disabled])').first().click();
    await page.waitForTimeout(700); await shot(tag + '_journal');
    await go('r-result'); await page.waitForSelector('.journal-page'); await shot(tag + '_result');
    assert.deepEqual(errors, [], tag + ' 자원/네트워크'); await context.close();
  }
  for (const entry of Object.values(D.sprites)) {
    assert.ok(requested.has(entry.src), '실제 요청 없음: ' + entry.src);
    assert.ok(observed.has(entry.src), '표시 배율 검사 없음: ' + entry.src);
  }
  // v1 전용 cloud_wipe·frame_real의 강제 화면 호출은 새 컷신에서 사라졌다.
  // 파일 보존/형식은 위 Python의 141개 검사에 포함하고, 현재 UI에 쓰는 장식은 실제 요청을 확인한다.
  for (const key of ['title', 'frame_gloss', 'frame_dream', 'seal_blank', 'wish_board', 'wish_fill', 'wish_mist', 'gyoji', 'card_frame', 'card_back', 'journal_page', 'divider_knot', 'corner_cloud', 'btn_frame', 'pearl', 'pearl_trace', 'pearl_empty']) assert.ok(requested.has('assets/ui/' + key + '.webp'), '현재 UI 장식 요청 없음: ' + key);
  console.log('✓ 신규 등록 12개 실제 접근·정수배 · 준비 4종 시간 변화 · 호승 2/3 자세 · 외부 요청 0');
} catch (e) { failed = true; console.error('✗ 그림 점검: ' + (networkViolation || e).stack); }
finally { await browser.close(); await new Promise((r) => server.close(r)); }
process.exit(networkViolation ? 2 : failed ? 1 : 0);
