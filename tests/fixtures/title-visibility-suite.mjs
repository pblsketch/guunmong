import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {harness, ROOT, ready} from './rpg-harness.mjs';

const h=await harness(), results=[], failures=[];
const base=process.env.GUUN_LIVE_URL || h.origin+'/index.html';
const baseline=process.argv.includes('--baseline');
const out=path.join(ROOT,'tests/shots/title-visibility'+(baseline?'-red':process.env.GUUN_LIVE_URL?'-live':''));
fs.mkdirSync(out,{recursive:true});
async function visiblePaper(page,locator,label,primary=false){
 const bytes=await locator.screenshot();
 const value=await page.evaluate(async data=>{
  const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let paper=0,ink=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]>180&&pixels[i+1]>160&&pixels[i+2]>120&&pixels[i]-pixels[i+2]>15)paper++;if(pixels[i]<65&&pixels[i+1]<50&&pixels[i+2]<45)ink++;}
  return {paper:paper/(canvas.width*canvas.height),ink:ink/(canvas.width*canvas.height)};
 },bytes.toString('base64'));
 assert.ok(primary?value.ink>.4&&value.paper>.005:value.paper>.3,label+' 실제 화면의 글·단추가 배경에 덮임: '+JSON.stringify(value));
 return value;
}
try{
 for(const [width,height] of [[390,740],[412,780],[844,300],[915,320]])for(const big of [false,true]){
  const context=await h.browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2.625});
  const p=await context.newPage(), errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   if(baseline)for(const file of ['js/game/app.js','css/rpg.css'])await p.route('**/'+file+'*',route=>route.fulfill({body:execFileSync('git',['show','7b993dd:'+file],{cwd:ROOT}),contentType:file.endsWith('.css')?'text/css':'text/javascript'}));
   assert.equal((await p.goto(base)).status(),200);await ready(p);await p.evaluate(()=>document.fonts.ready);
   await p.locator('.title-art').evaluate(async img=>{if(!img.complete)await new Promise(r=>img.addEventListener('load',r,{once:true}));});
   if(big){await p.getByRole('button',{name:'설정',exact:true}).click();await p.locator('[data-set="big"]').click();await p.keyboard.press('Escape');}
   await p.locator('.game-menu-window').evaluate(el=>{el.scrollTop=0;});
   await p.screenshot({path:path.join(out,`${width}x${height}-${big?'big':'normal'}-initial.png`)});
   await visiblePaper(p,p.locator('.game-menu-window'),'첫 화면');
   const logo=await visiblePaper(p,p.locator('.logo'),'제목');
   const start=p.getByRole('button',{name:'시작하기',exact:true});
   const button=await visiblePaper(p,start,'시작하기',true);await start.tap();await p.waitForSelector('[data-world]');
   await p.locator('[data-tool="home"]').click();await p.waitForSelector('.title-screen');
   const resume=p.getByRole('button',{name:'이어 하기',exact:true});const returned=await visiblePaper(p,resume,'이어 하기',true);
   for(const name of ['목차','설정']){await p.getByRole('button',{name,exact:true}).tap();await p.waitForSelector('.sheet');await p.keyboard.press('Escape');}
   await resume.tap();await p.waitForSelector('[data-world]');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
   assert.deepEqual(errors,[]);results.push({width,height,big,logo,button,returned});console.log(`PASS 모바일 제목/시작/돌아온 메뉴 실제 픽셀·터치 ${width}x${height} ${big?'큰 글자':'일반'}`);
  }catch(e){failures.push({width,height,big,error:e.stack});console.error('FAIL',width,height,big,e.message);}
  finally{await context.close();}
 }
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base,results,failures},null,2));await h.close();}
assert.deepEqual(failures,[]);
