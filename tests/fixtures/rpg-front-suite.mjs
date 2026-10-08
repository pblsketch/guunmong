import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {harness,ROOT,start,target,dialogue,state,secretWish} from './rpg-harness.mjs';
const h=await harness(),observations=[];let passed=0;
async function identityBoundary(p,current,s){
 const cases={
  'e05-chunun':{name:'가춘운',before:['chunun-fairy','chunun-ghost','chunun-talisman'],reveal:'chunun-reveal',object:'chunun-revealed',prior:'chunun-talisman'},
  'e06-gyeonghong':{name:'적경홍',before:['gyeonghong-road','gyeonghong-companion','gyeonghong-discover'],reveal:'gyeonghong-reveal',object:'gyeonghong-revealed',prior:'gyeonghong-discover'},
 };
 const expected=cases[current.id];if(!expected)return null;
 const list=p.locator('.world-target-list');
 if(expected.before.includes(current.beat)){
  assert.equal((await list.textContent()).includes(expected.name),false,current.id+' 공개 행동 전 대상 목록 실명 금지');
  if(current.beat===expected.prior)assert.equal(await p.locator('[data-world-target="'+expected.object+'"]').count(),0,current.id+' 공개 대상 조기 노출 금지');
  return null;
 }
 if(current.beat!==expected.reveal)return null;
 assert.ok(s.rpg.scenes[current.id].actions.some(action=>action.id===expected.prior),current.id+' 정체 서술 행동 선행');
 assert.match(await p.locator('[data-world-target="'+expected.object+'"]').textContent(),new RegExp(expected.name));
 // 2026-10-06 승인 전신 그림(v4): 공개 뒤에는 그 인물의 승인 전신 그림이 실제로 표시돼야 한다.
 const body=await p.locator('[data-object="'+expected.object+'"]').evaluate(el=>{const o=G.data.maps.flatMap(m=>m.objects).find(v=>v.id===el.dataset.object),s=G.data.sprites[o.sprite];return{src:s?.src,shown:getComputedStyle(el.querySelector('.world-sprite')).backgroundImage,pending:el.dataset.artPending||null};});
 assert.ok(body.src&&body.shown.includes(body.src)&&!body.pending,current.id+' 공개 뒤 승인 전신 그림');
 return expected.name;
}
async function route(width,height,big){
 const p=await h.page('rpg-front',{width,height},{hasTouch:true});await start(p);
 assert.deepEqual(await p.evaluate(()=>{
  const lines=id=>Object.fromEntries(G.experience.find(G.data,id).beats.map(beat=>[beat.id,beat.lines]));
  return{chunun:lines('e05-chunun'),chununPearl:G.experience.find(G.data,'e05-chunun').optional[0].lines,gyeonghong:lines('e06-gyeonghong')};
 }),{chunun:{'chunun-fairy':[0,1],'chunun-ghost':[2,3],'chunun-talisman':[4,5],'chunun-reveal':[6,7]},chununPearl:[8],gyeonghong:{'gyeonghong-road':[0],'gyeonghong-companion':[1,2],'gyeonghong-discover':[3,4],'gyeonghong-reveal':[5,6]}});
 if(big){await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="big"]').click();await p.keyboard.press('Escape');}
 let steps=0,seen=new Set(),outfits=new Set();
 while(++steps<180){
  const current=await p.evaluate(()=>({id:document.querySelector('.play')?.dataset.scene,kind:document.querySelector('.play')?.dataset.kind,beat:document.querySelector('.play')?.dataset.beat,end:!!document.querySelector('[data-profile-end]')}));
  seen.add(current.id);
  if(current.end)break;
  const s=await state(p);assert.equal(s.teacher,false);assert.equal(s.awake,false);assert.equal(await p.evaluate(()=>G.app.wishes().find(w=>w.id==='misaek').hidden),true);
  if(current.id==='e03-geomungo')assert.equal(await p.locator('.world-actor').evaluate(el=>getComputedStyle(el).backgroundImage.includes('walk-yang-disguise.webp')),true);
  if(current.id==='e04-exam'){
   const expected={'exam-write':'walk-yang-scholar','exam-result':'walk-yang-scholar','exam-hallim':'walk-yang-chancellor','':'walk-yang-chancellor'}[current.beat];
   assert.ok(expected,'과거 장면의 의상 검증 단계: '+current.beat);
   if(current.beat==='')assert.deepEqual(s.rpg.scenes['e04-exam'].actions.map(a=>a.id),['exam-write','exam-result','exam-hallim'],'완료 표시 전 세 행동 수행');
   assert.equal(await p.locator('.world-actor').evaluate((el,key)=>getComputedStyle(el).backgroundImage.includes(key+'.webp'),expected),true,current.beat+' 실제 의상');
   if(current.beat&&!outfits.has(current.beat)){await p.screenshot({path:path.join(ROOT,'tests/shots/front-'+current.beat+'-'+width+'x'+height+'-'+(big?'big':'normal')+'.png')});outfits.add(current.beat);}
  }
  const revealedName=await identityBoundary(p,current,s);
  if(await p.locator('[data-dialogue]').count()){await dialogue(p);continue;}
  if(current.kind==='wish'){
   const answers=await p.evaluate(()=>G.app.current().data.answers);for(const id of answers){const b=p.locator('[data-word="'+id+'"]');if(!await b.isDisabled())await b.click();}
   await secretWish(p);
   await p.locator('#tray [data-act="next"]').click();continue;
  }
  if(await p.locator('[data-act="next"]').count()){await p.locator('[data-act="next"]').first().click();await p.waitForTimeout(40);continue;}
  const beat=await p.evaluate(({id,beat})=>G.experience.find(G.data,id)?.beats.find(b=>b.id===beat),current);
  assert.ok(beat,'진행할 실제 행동 필수');if(beat.trigger.target)await target(p,beat.trigger.target);else await p.locator('[data-act="interact"]').click();
  const hiddenIdentity={
   'e05-chunun:chunun-fairy':'흰 옷의 낯선 이','e05-chunun:chunun-ghost':'장여랑이라 하는 이','e06-gyeonghong:gyeonghong-companion':'적생',
  }[current.id+':'+current.beat];
  if(hiddenIdentity){await p.waitForSelector('[data-dialogue]');assert.equal(await p.locator('.stage-speaker').innerText(),hiddenIdentity);assert.equal(await p.locator('.stage-portrait img').count(),0,current.id+' 정체 공개 전 첫 대화 초상 숨김');}
  if(revealedName){await p.waitForSelector('[data-dialogue]');assert.equal(await p.locator('.stage-speaker').innerText(),revealedName);assert.equal(await p.locator('.stage-portrait img').count(),1,current.id+' 공개 대화 초상');}
  await dialogue(p);
 }
 assert.ok(steps<180,'진행 막힘');assert.equal(seen.size,15);assert.deepEqual([...outfits],['exam-write','exam-result','exam-hallim']);const s=await state(p);
 assert.equal(s.done['l-bongnae'],true);for(const id of ['it-yangryu','it-geomungo','it-tungso','it-sijeon','it-yeogwan','it-bujeol','it-cheonrima'])assert.ok(s.items.includes(id),id+' 실제 수령');
 assert.equal(new Set(s.items).size,s.items.length);assert.equal(new Set(s.bonds).size,s.bonds.length);assert.equal(s.journal.revealed?.misaek,undefined);
 for(const k of ['abil','res','best','events'])assert.equal(Object.hasOwn(s,k),false,k+' 옛 필드 없음');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
 await p.screenshot({path:path.join(ROOT,'tests/shots/front-end-'+width+'x'+height+'-'+(big?'big':'normal')+'.png'),fullPage:true});observations.push({width,height,big,seen:[...seen],outfits:[...outfits],items:s.items,bonds:s.bonds});passed++;console.log('PASS 앞15 실제 학생 입력 '+width+'x'+height+' '+(big?'큰 글자':'일반')+' · 의상/악기/시전/인연/미색/무성장');await p.context().close();
}
try{for(const [width,height] of [[390,844],[844,390],[1280,844]])for(const big of [false,true])await route(width,height,big);assert.deepEqual(h.errors,[]);console.log('앞부분 대표 '+passed+' 경로 통과 (본편 전체 완주 아님)');}
finally{fs.writeFileSync(path.join(ROOT,'tests/shots/rpg-front-observations.json'),JSON.stringify({passed,observations,errors:h.errors},null,2));await h.close();}
