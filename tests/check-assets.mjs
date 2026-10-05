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
import { target, dialogue } from './fixtures/rpg-harness.mjs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SHOTS = path.join(ROOT, 'tests/shots'); fs.mkdirSync(SHOTS, { recursive: true });
const box = { window: {} };
vm.createContext(box);
for (const file of fs.readdirSync(path.join(ROOT, 'js/data')).filter((f) => f.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data', file), 'utf8'), box);
const D = box.window.GUUN;
const topdownApproval = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/manifest_topdown_approved.json'), 'utf8'));
const topdownEntries = [...topdownApproval.entries, ...topdownApproval.derived];
assert.equal(topdownApproval.status, 'approved'); assert.equal(topdownApproval.entries.length, 8);
const topdownKeys = new Set(topdownEntries.map(e => e.key));
const npcApproval = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/manifest_rpg_npcs_approved.json'), 'utf8'));
assert.equal(npcApproval.status, 'approved'); assert.equal(npcApproval.entries.length, 3);
const npcEntries = npcApproval.entries, npcKeys = new Set(npcEntries.map(e => e.key));
const disguiseApproval = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/manifest_rpg_disguise_approved.json'), 'utf8'));
assert.equal(disguiseApproval.status, 'approved');
const disguiseKey = 'walk-yang-disguise';
const disguiseSprite = { src:disguiseApproval.product,width:32,height:32,frames:5,rows:4,cell:disguiseApproval.entry.cell,anchor:disguiseApproval.entry.anchor,directions:disguiseApproval.entry.directions };
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
  if (key === disguiseKey) { assert.deepEqual(JSON.parse(JSON.stringify(entry)), disguiseSprite); continue; }
  if (topdownKeys.has(key)) {
    assert.deepEqual(JSON.parse(JSON.stringify(entry)), topdownEntries.find(e => e.key === key).sprite, key + ' 승인 메타');
    continue;
  }
  if (npcKeys.has(key)) {
    assert.deepEqual(JSON.parse(JSON.stringify(entry)), npcEntries.find(e => e.key === key).sprite, key + ' NPC 승인 메타');
    continue;
  }
  assert.equal(entry.width, ['study', 'geomungo', 'sword', 'strategy', 'hoseung'].includes(key) ? 96 : 32);
  assert.equal(entry.height, entry.width); assert.equal(entry.rows, 1); assert.equal(entry.frames, entry.width === 96 ? 4 : 1);
}
assert.equal(Object.keys(D.sprites).length, 12 + topdownEntries.length + npcEntries.length + 1);
assert.ok(D.sprites[disguiseKey]);
for (const e of topdownEntries) assert.ok(D.sprites[e.key], '승인 키 누락: ' + e.key);
for (const e of npcEntries) assert.ok(D.sprites[e.key], 'NPC 승인 키 누락: ' + e.key);
const sourceFiles = ['index.html', 'manifest.webmanifest', ...fs.readdirSync(path.join(ROOT, 'css')).filter((f) => f.endsWith('.css')).map((f) => 'css/' + f), ...['core', 'game'].flatMap((folder) => fs.readdirSync(path.join(ROOT, 'js', folder)).filter((f) => f.endsWith('.js')).map((f) => 'js/' + folder + '/' + f))];
for (const file of sourceFiles) for (const match of fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/assets\/(?:ui|board|house|sc|pt|items|sprites|fonts)\/[\w.-]+\.(?:webp|png|woff2)/g)) want(match[0]);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
for (const size of [192, 512]) assert.ok(manifest.icons.some((i) => i.src === 'assets/ui/icon-' + size + '.png'));
const python = spawnSync('python', [path.join(ROOT, 'tools/check_assets.py')], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(python.stdout || ''); process.stderr.write(python.stderr || '');
assert.equal(python.status, 0, '기존·탑다운 자산 크기·32색·무손실·승인 해시');
const totalAssets = 141 + topdownEntries.length + npcEntries.length + 1;
assert.match(python.stdout, new RegExp(`${totalAssets} expected, ${totalAssets} present`));
console.log('✓ 참조 파일 ' + required.size + '개 · Python 자산 ' + totalAssets + '개');
const topdownBrowser = spawnSync(process.execPath, [path.join(ROOT, 'tools/check_topdown_products.mjs')], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(topdownBrowser.stdout || ''); process.stderr.write(topdownBrowser.stderr || '');
assert.equal(topdownBrowser.status, 0, '승인 제품 파일 실제 요청·정수배·네 방향 5프레임');
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
async function go(id) { await page.goto(origin + '/index.html?teacher=1&scene=' + id); await ready(); }
async function integerCheck(label) {
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
    for (const el of document.querySelectorAll('.world-sprite, .cut-sprite')) {
      const css = getComputedStyle(el), entry = Object.values(sprites).find((s) => css.backgroundImage.includes(s.src));
      if (entry) {
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
    for (const id of ['c1-bridge','c1-exile','e01-huayin','e03-geomungo','e04-exam','e09-yoyeon','e10-neungpa','c3-feast']) {
      await go(id); await page.waitForSelector('[data-world] .world-actor');
      assert.equal(await page.locator('.prep-sprite, [data-score], [data-hud="board"]').count(),0);
      await shot(tag+'_world_'+id);
      if(id==='e01-huayin'){
        for(let n=0;n<6&&!await page.locator('[data-object="huayin-nurse"] .world-sprite').count();n++){
          const beat=await page.evaluate(()=>{const p=document.querySelector('.play');return G.experience.find(G.data,p.dataset.scene).beats.find(b=>b.id===p.dataset.beat);});
          assert.ok(beat,'유모 등장 전 실제 행동');
          if(beat.trigger.target)await target(page,beat.trigger.target);else await page.locator('[data-act="interact"]').click();
          await dialogue(page);
        }
        await page.waitForSelector('[data-object="huayin-nurse"] .world-sprite');await shot(tag+'_nurse');
      }
    }
    // 미리보기는 학생의 집 단계를 올리지 않는다. 그림 네 장은 실제 공통 렌더러로 격리 관찰한다.
    assert.equal(await page.evaluate(()=>G.dream.open('board')),false);
    assert.equal(D.house.stages.length,4);
    for (const stage of D.house.stages) {
      await page.evaluate(id=>{
        const stage=G.data.house.stages.find(s=>s.id===id);
        G.ui.sheet(()=>{const box=document.createElement('section');box.className='asset-house-probe';box.append(G.dream.picture('assets/house/'+stage.img+'.webp').frame);return box;},[{label:'닫기',value:null}]);
      },stage.id);
      await page.waitForSelector('.asset-house-probe .pic-box:not(.ph)');
      await shot(tag+'_house-renderer_'+stage.id);await page.keyboard.press('Escape');
    }
    await page.evaluate(()=>G.dream.open('pearls')); await shot(tag+'_pearls'); await page.keyboard.press('Escape');
    await page.goto(origin+'/index.html?fixture=rpg-waking'); await ready();
    await page.getByRole('button',{name:'시작하기',exact:true}).click();
    for (let n=0;n<35;n++) {
      const c=await cur(); if(c?.step==='staff')break;
      if(await page.locator('[data-dialogue]').count()){await dialogue(page);continue;}
      const beat=await page.evaluate(()=>{const p=document.querySelector('.play');return G.experience.find(G.data,p?.dataset.scene)?.beats.find(b=>b.id===p?.dataset.beat);});
      if(c?.scene!=='c3-staff'&&beat){
        if(beat.trigger.target)await target(page,beat.trigger.target);else await page.locator('[data-act="interact"]').click();
        await dialogue(page);continue;
      }
      const button=page.locator('#tray [data-act="next"]:not([disabled])');
      if(await button.count())await button.click();else await page.waitForTimeout(100);
    }
    await page.waitForSelector('[data-act="staff"]');
    const staff=page.locator('.cut-figure[data-sprite="hoseung"] .cut-sprite');
    const pose=()=>staff.evaluate(el=>parseFloat(getComputedStyle(el).backgroundPositionX)/el.getBoundingClientRect().width);
    assert.equal(await pose(),-2);await page.waitForTimeout(1700);assert.equal(await pose(),-2);await shot(tag+'_staff_hold');
    await page.locator('[data-act="staff"]').click();assert.equal(await pose(),-3);
    assert.equal(await page.evaluate(()=>G.save.state.awake),true);
    await page.waitForSelector('.play[data-scene="c3-awake"]');
    assert.deepEqual(errors, [], tag + ' 자원/네트워크'); await context.close();
  }
  // 구판 준비·능력 아이콘은 비활성이다. 보존 파일은 위 형식·승인 검사로 확인한다.
  for(const key of ['npc-fairy-green','npc-yuk','npc-nurse','walk-seongjin','walk-yang-scholar','walk-yang-disguise','hoseung']){
    const entry=D.sprites[key];assert.ok(requested.has(entry.src),'실제 요청 없음: '+entry.src);assert.ok(observed.has(entry.src),'배율 검사 없음: '+entry.src);
  }
  for(const key of ['title','btn_frame','pearl_empty'])assert.ok(requested.has('assets/ui/'+key+'.webp'),'현재 UI 장식 요청 없음: '+key);
  for(const stage of D.house.stages)assert.ok(requested.has('assets/house/'+stage.img+'.webp'));
  console.log('✓ 월드·NPC·구슬 실제 접근·정수배 · 집 그림 렌더러 4종 · 호승 2/3 자세 · 외부 요청 0');
} catch (e) { failed = true; console.error('✗ 그림 점검: ' + (networkViolation || e).stack); }
finally { await browser.close(); await new Promise((r) => server.close(r)); }
process.exit(networkViolation ? 2 : failed ? 1 : 0);
