// 후보 검토판만 관찰한다. 제품 등록·학생 완주 검사는 승인 뒤 주 담당이 수행한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(ROOT, 'tests/package.json'));
const { chromium } = require('playwright');
const shots = path.join(ROOT, 'tests/shots/topdown-v3');
fs.mkdirSync(shots, { recursive: true });
const errors = [], requests = new Set();
const server = http.createServer((req,res) => {
  const file = path.resolve(ROOT, '.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if (!file.startsWith(path.resolve(ROOT)+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);res.end();return;
  }
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.webp':'image/webp','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
let browser;
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/manifest_topdown_v3.json'),'utf8'));
  const review='/assets/raw/topdown-v3/review/animation-review-v1.html';
  for (const width of [320,390,820,1280]) {
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('request',r=>{assert.ok(r.url().startsWith(origin+'/'),'external request');requests.add(new URL(r.url()).pathname)});
    page.on('response',r=>{if(r.status()>=400) errors.push(r.status()+' '+r.url())});
    assert.equal((await page.goto(origin+review)).status(),200);
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    assert.equal(await page.locator('.phone').count(),4);
    assert.equal(await page.locator('.actors section').count(),4);
    const scales=await page.locator('canvas[data-scale]').evaluateAll(cs=>cs.map(c=>({
      scale:+c.dataset.scale,w:c.width,cssWidth:c.getBoundingClientRect().width,
      smoothing:c.getContext('2d').imageSmoothingEnabled,rendering:getComputedStyle(c).imageRendering
    })));
    assert.equal(scales.length,40);
    for(const s of scales){assert.equal(s.w,s.scale*32);assert.equal(s.cssWidth,s.w);assert.equal(s.smoothing,false);assert.equal(s.rendering,'pixelated')}
    const pixels=()=>page.locator('.row canvas').first().evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).join(','));
    const before=await pixels();
    await page.waitForFunction(before=>{
      const c=document.querySelector('.row canvas');
      return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).join(',')!==before;
    },before);
    await page.locator('#pause').click();
    await page.waitForFunction(()=>document.querySelector('.row canvas').dataset.frame==='0');
    const paused=await pixels();await page.waitForTimeout(400);assert.equal(await pixels(),paused);
    const shared=await page.locator('#cell-comparison .scene').evaluateAll(scenes=>scenes.map(s=>({
      src:s.querySelector('img').getAttribute('src'),propX:s.querySelector('[data-prop]').style.left,
      propY:s.querySelector('[data-prop]').style.top,
      pixels:Array.from(s.querySelector('[data-prop]').getContext('2d').getImageData(0,0,32,32).data).join(',')
    })));
    assert.equal(shared.length,2);assert.deepEqual(shared[0],shared[1],'shared cell layout and separate cushion');
    const imgSizes=await page.locator('#maps .scene img').evaluateAll(imgs=>imgs.map(im=>({w:im.naturalWidth,h:im.naturalHeight,cw:im.getBoundingClientRect().width,ch:im.getBoundingClientRect().height})));
    assert.equal(imgSizes.length,4);for(const im of imgSizes)assert.deepEqual(im,{w:384,h:320,cw:384,ch:320});
    const scrolled=await page.locator('.viewport').first().evaluate(el=>{el.scrollLeft=999;return{scroll:el.scrollLeft,width:el.clientWidth,content:el.scrollWidth}});
    if(width<=390&&scrolled.content>scrolled.width) assert.ok(scrolled.scroll>0,'camera edge accessible by scrolling');
    assert.equal(await page.evaluate(()=>localStorage.length),0,'review must not write persistent state');
    await page.screenshot({path:path.join(shots,'review-'+width+'.png'),fullPage:true});
    await page.close();
    console.log(`PASS review ${width}px: actual files, 1/2/4x, changed pixels, pause, map edges, no storage`);
  }
  for(const e of manifest.assets)assert.ok(requests.has('/'+e.candidate),'candidate not requested: '+e.id);
  assert.ok(requests.has('/assets/sprites/hoseung.webp'),'96px staff not requested');
  assert.deepEqual(errors,[]);
  console.log(`PASS ${manifest.assets.length} unapproved candidates + unchanged staff, HTTP 200; approval pending`);
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
