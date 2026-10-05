// 승인된 제품 파일의 실제 HTTP 요청과 셀 렌더링 검사. 월드 플레이 증거와 구분한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(path.join(ROOT,'tests/package.json'))('playwright');
const approval=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/manifest_topdown_approved.json'),'utf8'));
const entries=[...approval.entries,...approval.derived];
const disguise=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/manifest_rpg_disguise_approved.json'),'utf8'));
assert.equal(disguise.status,'approved');
entries.push({key:'walk-yang-disguise',sprite:{src:disguise.product},approved_sha256:disguise.candidate_sha});
const shots=path.join(ROOT,'tests/shots/topdown-approved');fs.mkdirSync(shots,{recursive:true});
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Approved asset inspection</title>
<style>body{margin:8px;background:#eee6d6}img,canvas{image-rendering:pixelated}section{margin-bottom:12px}.viewport{overflow:auto}canvas{background:#c6b99f;margin:4px}.row{display:flex;gap:8px;align-items:center}</style>
<script src="/js/data/sprites.js"></script><main></main><script>
const keys=${JSON.stringify(entries.map(e=>e.key))};const jobs=[];let t=0;const pictures={};
async function start(){for(const key of keys){const s=GUUN.sprites[key];const im=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='/'+s.src});pictures[key]=im;
const section=document.createElement('section');section.innerHTML='<h2>'+key+'</h2>';document.querySelector('main').append(section);
if(s.directions){for(const [dir,d] of Object.entries(s.directions)){const row=document.createElement('div');row.className='row';row.textContent=dir;section.append(row);for(const scale of [1,2,4]){const c=document.createElement('canvas');c.width=c.height=32*scale;c.dataset.key=key;c.dataset.dir=dir;c.dataset.scale=scale;row.append(c);jobs.push({c,s,im,dir,scale});}}}
else{const viewport=document.createElement('div');viewport.className='viewport';const i=document.createElement('img');i.className='pix';i.dataset.key=key;i.src='/'+s.src;i.style.width=im.width+'px';i.style.height=im.height+'px';viewport.append(i);section.append(viewport);}}
window.drawFrame=function(frame){for(const j of jobs){const d=j.s.directions[j.dir];const n=frame===0?d.stand:d.walk[frame-1];const ctx=j.c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,j.c.width,j.c.height);ctx.drawImage(j.im,n*32,d.row*32,32,32,0,0,j.c.width,j.c.height);j.c.dataset.frame=n;}};
window.stopAnimation=()=>clearInterval(window.timer);drawFrame(0);window.timer=setInterval(()=>drawFrame(1+(t++%4)),180);document.documentElement.dataset.ready='true';}
addEventListener('pagehide',()=>stopAnimation());start().catch(e=>document.documentElement.dataset.error=String(e));</script>`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local');
  if(url.pathname==='/__asset-inspection'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
  const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(path.resolve(ROOT)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [320,390,820,1280]){
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:width<820?2:1});const requests=new Set(),errors=[],bodies=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{assert.equal(new URL(r.url()).origin,origin);requests.add(new URL(r.url()).pathname)});
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());const e=entries.find(e=>r.url()===origin+'/'+e.sprite.src);if(e)bodies.push(r.body().then(b=>assert.equal(createHash('sha256').update(b).digest('hex'),e.approved_sha256)))});
    assert.equal((await page.goto(origin+'/__asset-inspection')).status(),200);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    const changes=await page.locator('canvas').first().evaluate(c=>({frame:c.dataset.frame,pixels:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).join(',')}));
    await page.waitForFunction(p=>{const c=document.querySelector('canvas');return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).join(',')!==p},changes.pixels);
    await page.evaluate(()=>stopAnimation());
    const frames=[];
    for(let n=0;n<5;n++){await page.evaluate(n=>drawFrame(n),n);frames.push(await page.locator('canvas[data-scale="1"]').evaluateAll(cs=>cs.map(c=>Array.from(c.getContext('2d').getImageData(0,0,32,32).data).join(','))))}
    assert.equal(frames[0].length,16);
    for(let i=0;i<16;i++)assert.ok(new Set(frames.slice(1).map(row=>row[i])).size>=3,'four direction walk changes');
    const geometry=await page.evaluate(()=>({
      canvases:Array.from(document.querySelectorAll('canvas')).map(c=>({scale:+c.dataset.scale,width:c.width,height:c.height,css:c.getBoundingClientRect().width,smoothing:c.getContext('2d').imageSmoothingEnabled,rendering:getComputedStyle(c).imageRendering})),
      images:Array.from(document.querySelectorAll('img')).map(i=>({width:i.naturalWidth,height:i.naturalHeight,cssWidth:i.getBoundingClientRect().width,cssHeight:i.getBoundingClientRect().height,rendering:getComputedStyle(i).imageRendering}))
    }));
    assert.equal(geometry.canvases.length,48);assert.equal(geometry.images.length,13);
    for(const c of geometry.canvases){assert.equal(c.width,32*c.scale);assert.equal(c.height,c.width);assert.equal(c.css,c.width);assert.equal(c.smoothing,false);assert.equal(c.rendering,'pixelated')}
    for(const i of geometry.images){assert.equal(i.width,i.cssWidth);assert.equal(i.height,i.cssHeight);assert.equal(i.rendering,'pixelated')}
    for(const e of entries)assert.ok(requests.has('/'+e.sprite.src),'product request missing '+e.key);
    assert.equal(await page.evaluate(()=>localStorage.length),0);await Promise.all(bodies);assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(shots,'products-'+width+'.png'),fullPage:true});await page.close();
    console.log('PASS approved product files '+width+'px: 17 HTTP hashes, 1/2/4x, four directions, five frames, no external request');
  }
  console.log('PASS product asset inspection; world UI integration is a separate check');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
