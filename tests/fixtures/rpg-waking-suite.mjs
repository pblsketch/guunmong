import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {harness,ROOT,start,target,seekTarget,dialogue,state,ready,step} from './rpg-harness.mjs';
const h=await harness(),shots=path.join(ROOT,'tests/shots/t5'), observations=[];
fs.mkdirSync(shots,{recursive:true});let passed=0;
const guardsOnly=process.argv.includes('--review-guards');
const raw=p=>p.evaluate(()=>localStorage.getItem(G.save.key));
const at=(p,id)=>p.waitForFunction(id=>document.querySelector('.play')?.dataset.scene===id,id);
async function test(name,fn){await fn();passed++;console.log('PASS waking '+name);}
async function toStaff(p,big=false,touch=false){
  await start(p);
  if(big){await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="big"]').click();await p.keyboard.press('Escape');}
  for(const id of ['c3-feast','c3-monk']){
    await at(p,id);
    const targets=await p.evaluate(id=>G.experience.find(G.data,id).beats.map(b=>b.trigger.target),id);
    for(const id of targets){
      if(id==='feast-visitor'){
        await seekTarget(p,id);const npc=p.locator('[data-object="'+id+'"]');
        const hit=await npc.evaluate(el=>{const r=el.getBoundingClientRect(),child=el.firstElementChild.getBoundingClientRect();return{width:r.width,dx:child.left-r.left,dy:child.top-r.top,hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-object]')===el};});
        assert.equal(hit.width,96);assert.equal(hit.dx,0);assert.equal(hit.dy,0);assert.equal(hit.hit,true);
        if(touch)await npc.tap();else await npc.click();
      }else await target(p,id);
      await dialogue(p);
    }
    await p.locator('#tray [data-act="next"]').click();
  }
  await at(p,'c3-staff');
  // 컷신이 스스로 지팡이 단계로 넘어가면 다음 단추가 사라지므로, 지팡이 단추가 나타날 때까지 보이는 다음 단추만 실제로 누른다.
  for(let i=0;i<20&&!await p.locator('[data-act="staff"]').count();i++)await p.locator('#tray [data-act="next"]').click({timeout:1000}).catch(()=>{});
  await p.waitForSelector('[data-act="staff"]');
}
async function pose(p){return p.locator('.cut-sprite').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{position:s.backgroundPosition,width:r.width,height:r.height,animation:s.animationName,field:!!el.closest('[data-game-field]')};});}
async function geometry(p){return p.evaluate(()=>{const r=el=>el.getBoundingClientRect().toJSON();return{height:innerHeight,page:document.documentElement.scrollHeight,shell:r(document.querySelector('[data-game-shell]')),field:r(document.querySelector('[data-game-field]')),buttons:[...document.querySelectorAll('#tray button')].filter(el=>el.checkVisibility()).map(r),speech:document.querySelector('.field-cutscene .stage-speech')&&r(document.querySelector('.field-cutscene .stage-speech')),width:innerWidth};});}
async function replayToStaff(p){
  await p.getByRole('button',{name:'이어 하기',exact:true}).click();
  for(const scene of ['c3-feast','c3-monk']){
    await at(p,scene);const targets=await p.evaluate(id=>G.experience.find(G.data,id).beats.map(b=>b.trigger.target),scene);
    for(const id of targets){await target(p,id);await dialogue(p);}await p.locator('#tray [data-act="next"]').click();
  }
  await at(p,'c3-staff');if(!await p.locator('[data-act="staff"]').count())await p.locator('#tray [data-act="next"]').click();await p.waitForSelector('[data-act="staff"]');
}
try{
  if(!guardsOnly){
  await test('실제 네 단위 자료·상태 주입 없는 진입',async()=>{
    const p=await h.page('rpg-waking');
    assert.equal(await p.evaluate(()=>G.data.ok),true);
    assert.deepEqual(await p.evaluate(()=>G.app.list().map(s=>s.id)),['c3-feast','c3-monk','c3-staff','c3-awake']);
    await toStaff(p);const s=await state(p);assert.equal(s.teacher,false);assert.equal(s.awake,false);assert.deepEqual(s.items,[]);assert.deepEqual(s.bonds,[]);for(const k of ['abil','res','best','events'])assert.equal(Object.hasOwn(s,k),false,k+' 옛 필드 없음');
    assert.deepEqual(s.rpg.scenes['c3-staff'].actions,[]);assert.equal(s.rpg.scenes['c3-staff'].beat,'staff-strike');
    await p.context().close();
  });
  await test('두 주기 대기·96px 올린 자세·입력 전 건너뛰기 없음',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);const before=await state(p),first=await pose(p);
    await p.waitForTimeout(1700);assert.deepEqual(await pose(p),first);assert.deepEqual(await state(p),before);
    assert.equal(first.position,`${-first.width*2}px 0px`);assert.equal(first.width,96);assert.equal(first.animation,'none');assert.equal(first.field,true);
    assert.equal(await p.locator('[data-act="skip"]').count(),0);assert.equal(await p.locator('.dream-shatter,[data-fragment="score"],.shatter-piece').count(),0);
    await p.screenshot({path:path.join(shots,'raised-390.png'),fullPage:true});await p.context().close();
  });
  await test('저장 거부는 상태·원문·올린 자세 보존, 성공 뒤 동기 타격',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);const before=await state(p),stored=await raw(p),raised=await pose(p);
    await p.evaluate(()=>{window.beforeWake=G.save.state;window.originalWakeWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===G.save.key)throw Error('시험 저장 거부');return Reflect.apply(originalWakeWrite,this,[key,value]);};});
    await p.locator('[data-act="staff"]').click();assert.deepEqual(await state(p),before);assert.equal(await raw(p),stored);assert.deepEqual(await pose(p),raised);
    assert.equal(await p.evaluate(()=>G.save.state===beforeWake),true);assert.equal(await p.locator('[data-act="staff"]').isEnabled(),true);assert.equal(await p.locator('.wake-save-error').isVisible(),true);
    await p.screenshot({path:path.join(shots,'save-refused-390.png'),fullPage:true});
    await p.evaluate(()=>{Storage.prototype.setItem=function(key,value){if(key===G.save.key&&JSON.parse(value).awake&&!G.save.state.awake){window.wakeWriteObservation={value:JSON.parse(value),pose:getComputedStyle(document.querySelector('.cut-sprite')).backgroundPosition,priorAwake:G.save.state.awake};}return Reflect.apply(originalWakeWrite,this,[key,value]);};});
    await p.locator('[data-act="staff"]').click();const after=await state(p),strike=await pose(p),write=await p.evaluate(()=>wakeWriteObservation);
    assert.equal(after.awake,true);assert.ok(after.awakeAt>0);assert.equal(after.pos,'c3-awake');assert.equal(after.done['c3-staff'],true);
    assert.equal(write.priorAwake,false);assert.equal(write.pose,raised.position);assert.equal(write.value.awake,true);assert.equal(write.value.pos,'c3-awake');
    assert.equal(strike.position,`${-strike.width*3}px 0px`);assert.deepEqual(after.rpg.scenes['c3-staff'].actions,[{id:'staff-strike',by:'student'}]);
    await p.screenshot({path:path.join(shots,'striking-390.png'),fullPage:true});observations.push({raised,strike,write});
    await at(p,'c3-awake');assert.equal(await p.locator('.play').getAttribute('data-map'),'map-cell');assert.equal(await p.locator('.play').getAttribute('data-actor'),'seongjin');
    assert.equal(await p.evaluate(()=>G.app.open('c3-monk')),false);assert.equal(await p.evaluate(()=>G.app.canOpen('c3-feast')),false);
    const stamp=(await state(p)).awakeAt;await p.locator('[data-world]').focus();await step(p,'ArrowDown');assert.equal((await state(p)).awakeAt,stamp);assert.equal((await state(p)).awake,true);
    await p.screenshot({path:path.join(shots,'awake-cell-390.png'),fullPage:true});await p.context().close();
  });
  await test('타격 전 재접속 재연은 최초 행동을 덮어쓰지 않음',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);const before=await state(p);
    await p.reload();await ready(p);await replayToStaff(p);const after=await state(p);
    assert.equal(after.rpg.run,before.rpg.run);assert.deepEqual(after.rpg.scenes,before.rpg.scenes);assert.equal(after.awake,false);assert.equal(after.pos,'c3-staff');
    await p.context().close();
  });
  await test('타격 직후 종료·재접속은 같은 선방부터 이어짐',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);await p.locator('[data-act="staff"]').click();const saved=await state(p);
    await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();await at(p,'c3-awake');
    const after=await state(p);assert.equal(after.awake,true);assert.equal(after.awakeAt,saved.awakeAt);assert.equal(after.rpg.run,saved.rpg.run);assert.equal(await p.locator('.play').getAttribute('data-map'),'map-cell');assert.equal(await p.locator('[data-act="staff"]').count(),0);
    await p.context().close();
  });
  await test('설정 중 타격 차단·교사 해제 뒤 학생 입력과 옛 단추 보호',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);await p.evaluate(()=>window.oldStaff=document.querySelector('[data-act="staff"]'));
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();
    const modalState=await state(p);await p.evaluate(()=>oldStaff.dispatchEvent(new MouseEvent('click')));assert.deepEqual(await state(p),modalState);
    await p.locator('[data-set="teacher"]').click();await p.keyboard.press('Escape');await p.locator('[data-act="staff"]').click();const stamp=(await state(p)).awakeAt;
    await at(p,'c3-awake');await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await p.keyboard.press('Escape');
    assert.equal(await p.evaluate(()=>G.app.open('c3-feast')),true);await at(p,'c3-feast');
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await at(p,'c3-awake');assert.equal(await p.evaluate(()=>G.app.canOpen('c3-feast')),false);await p.keyboard.press('Escape');
    const before=await state(p),stored=await raw(p);await p.evaluate(()=>oldStaff.dispatchEvent(new MouseEvent('click')));assert.deepEqual(await state(p),before);assert.equal(await raw(p),stored);assert.equal(before.awakeAt,stamp);
    await p.goBack();await p.waitForTimeout(150);assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-awake');assert.equal((await state(p)).awakeAt,stamp);await p.context().close();
  });
  await test('reader의 타격 입력은 메모리와 저장을 바꾸지 않음',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);const reader=await p.context().newPage();await reader.goto(p.url());await ready(reader);
    assert.equal(await reader.evaluate(()=>G.save.access),'reader');
    const before=await state(reader),stored=await raw(reader);
    assert.equal(await reader.evaluate(()=>G.app.open('c3-staff')),false,'reader는 미완료 타격 화면을 열지 못함');assert.equal(await reader.evaluate(()=>G.app.wake()),false);
    assert.equal(await reader.locator('[data-act="staff"]').count(),0);assert.deepEqual(await state(reader),before);assert.equal(await raw(reader),stored);assert.equal((await state(p)).awake,false);await p.context().close();
  });
  await test('확인 초기화 뒤 옛 타격 단추는 새 회차를 건드리지 않음',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);const run=(await state(p)).rpg.run;await p.evaluate(()=>window.staleStaff=document.querySelector('[data-act="staff"]'));
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="clear"]').click();await p.getByRole('button',{name:'지우기',exact:true}).click();
    await p.getByRole('button',{name:'시작하기',exact:true}).waitFor();const before=await state(p),stored=await raw(p);assert.notEqual(before.rpg.run,run);
    await p.evaluate(()=>staleStaff.dispatchEvent(new MouseEvent('click')));assert.deepEqual(await state(p),before);assert.equal(await raw(p),stored);assert.equal(before.awake,false);await p.context().close();
  });
  await test('타격 뒤 실제 HTTP bfcache 복귀와 잠금',async()=>{
    const p=await h.page('rpg-waking');await toStaff(p);await p.evaluate(()=>window.addEventListener('pageshow',e=>{if(e.persisted)window.wakingCache=true;}));
    await p.locator('[data-act="staff"]').click();const saved=await state(p);await p.goto(h.origin+'/tests/shots/t2/away.html');await p.goBack();await ready(p);
    assert.equal(await p.evaluate(()=>window.wakingCache),true,'실제 bfcache 복귀 관찰');await p.getByRole('button',{name:'이어 하기',exact:true}).click();await at(p,'c3-awake');assert.equal((await state(p)).awakeAt,saved.awakeAt);assert.equal(await p.evaluate(()=>G.app.open('c3-monk')),false);await p.context().close();
  });
  await test('기존 96px 호승 전신 터치·창 크기 변경 뒤 발 위치',async()=>{
    const p=await h.page('rpg-waking',{width:1280,height:844},{hasTouch:true});await toStaff(p,false,true);const before=await state(p);
    await p.setViewportSize({width:320,height:844});await p.waitForTimeout(100);
    const bounds=await p.locator('.cut-sprite').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=320&&bounds.y>=0&&bounds.y+bounds.height<=844);
    const foot=await p.evaluate(()=>{const r=document.querySelector('.cut-sprite').getBoundingClientRect(),img=document.querySelector('.field-cutscene .stage-background img'),b=img.getBoundingClientRect(),map=G.data.maps.find(m=>m.id==='map-feast'),npc=map.objects.find(o=>o.person==='hoseung');return{dx:Math.abs(r.left+r.width/2-(b.left+(npc.x+.5)/map.width*b.width)),dy:Math.abs(r.bottom-(b.top+(npc.y+1)/map.height*b.height)),scale:b.width*devicePixelRatio/img.naturalWidth};});
    assert.ok(foot.dx<1&&foot.dy<1);assert.ok(Number.isInteger(foot.scale));assert.deepEqual(await state(p),before);await p.screenshot({path:path.join(shots,'staff-resized-320.png'),fullPage:true});await p.context().close();
  });
  }
  await test('타격 전 교사 선방 미리보기는 학생 pos·행동을 만들지 않음',async()=>{
    const p=await h.page('rpg-waking');await start(p);const pos=(await state(p)).pos;
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await p.keyboard.press('Escape');
    await p.locator('[data-tool="toc"]').click();await p.locator('.toc-scene[data-scene="c3-awake"]').click();await at(p,'c3-awake');
    const preview=await state(p);assert.equal(preview.pos,pos);assert.equal(preview.awake,false);assert.equal(preview.rpg.scenes['c3-awake'],undefined);assert.equal(await p.locator('.play').getAttribute('data-readonly'),'true');assert.equal(preview.rpg.scenes['c3-staff'],undefined);
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await at(p,'c3-feast');assert.equal(await p.evaluate(()=>G.app.canOpen('c3-awake')),false);await p.keyboard.press('Escape');
    const before=await state(p),stored=await raw(p);assert.equal(await p.evaluate(()=>G.app.open('c3-awake')),false);assert.deepEqual(await state(p),before);assert.equal(await raw(p),stored);await p.context().close();
  });
  await test('공개 transact의 awake·선방 위치만 변경은 상태와 원문 불변',async()=>{
    const p=await h.page('rpg-waking');await start(p);
    const result=await p.evaluate(()=>{
      const before=G.save.state,raw=localStorage.getItem(G.save.key);
      const ok=G.save.transact(before.rpg.run,n=>{n.awake=true;n.awakeAt=456;n.pos='c3-awake';n.rpg.cursor=G.experience.cursor(G.data,'c3-awake',G.experience.find(G.data,'c3-awake').beats[0].id);},{readonly:false});
      return{ok,same:G.save.state===before,rawSame:localStorage.getItem(G.save.key)===raw,awake:G.save.state.awake};
    });assert.deepEqual(result,{ok:false,same:true,rawSame:true,awake:false});await p.context().close();
  });
  await test('옛 auto staff 호환은 실제 입력만 원자 확정·다른 auto 보존',async()=>{
    const p=await h.page('rpg-waking');
    await p.evaluate(()=>{
      const old=JSON.parse(JSON.stringify(G.save.state));old.started=true;old.pos='c3-awake';old.reach=3;old.name='보존 확인';
      old.rpg.scenes=Object.fromEntries(['c3-feast','c3-monk','c3-staff'].map(id=>[id,{status:'auto',beat:null,actions:[],hint:'teacher'}]));
      old.rpg.cursor=G.experience.cursor(G.data,'c3-awake',G.experience.find(G.data,'c3-awake').beats[0].id);localStorage.setItem(G.save.key,JSON.stringify(old));
    });
    await p.reload();await ready(p);await replayToStaff(p);const before=await state(p);assert.equal(before.awake,false);assert.equal(before.rpg.scenes['c3-staff'].status,'auto');assert.equal(await p.locator('.play').getAttribute('data-readonly'),'false');
    const generic=await p.evaluate(()=>{
      const before=G.save.state,raw=localStorage.getItem(G.save.key),e=G.experience.find(G.data,'c3-staff');
      const result=G.save.transact(before.rpg.run,n=>{n.awake=true;n.awakeAt=123;n.pos='c3-awake';n.done['c3-staff']=true;n.rpg.scenes['c3-staff']={status:'done',beat:null,actions:[{id:e.beats[0].id,by:'student'}],hint:'teacher'};n.rpg.cursor=G.experience.cursor(G.data,'c3-awake',G.experience.find(G.data,'c3-awake').beats[0].id);},{readonly:false},Symbol('wake-commit'));
      return{result,same:G.save.state===before,rawSame:localStorage.getItem(G.save.key)===raw,apply:G.save.applyExperience('c3-staff',e.beats[0].id,{run:before.rpg.run,readonly:false,by:'student'}).ok,finish:G.save.finishExperience('c3-staff',{run:before.rpg.run,readonly:false,by:'student'}).ok};
    });assert.deepEqual(generic,{result:false,same:true,rawSame:true,apply:false,finish:false});
    const stored=await raw(p);await p.evaluate(()=>{window.savedWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===G.save.key)throw Error('자동 지팡이 저장 거부');return Reflect.apply(savedWrite,this,[key,value]);};});
    await p.locator('[data-act="staff"]').click();assert.deepEqual(await state(p),before);assert.equal(await raw(p),stored);
    await p.evaluate(()=>Storage.prototype.setItem=savedWrite);await p.locator('[data-act="staff"]').click();const after=await state(p);
    assert.equal(after.awake,true);assert.equal(after.pos,'c3-awake');assert.ok(after.awakeAt>0);assert.equal(after.rpg.scenes['c3-staff'].status,'done');assert.equal(after.rpg.scenes['c3-staff'].hint,'teacher');assert.deepEqual(after.rpg.scenes['c3-staff'].actions,[{id:'staff-strike',by:'student'}]);
    for(const id of ['c3-feast','c3-monk'])assert.deepEqual(after.rpg.scenes[id],before.rpg.scenes[id]);assert.equal(after.name,before.name);assert.deepEqual(after.play,before.play);await p.context().close();
  });
  if(!guardsOnly)for(const width of [320,390,820,1280])for(const big of [false,true])await test(width+' '+(big?'큰 글자':'일반')+' 필드 안 타격창',async()=>{
    const p=await h.page('rpg-waking',{width,height:844});await toStaff(p,big);await p.evaluate(()=>document.fonts.ready);const g=await geometry(p);
    assert.equal(g.page,g.height);assert.equal(g.field.height,g.height);assert.equal(g.shell.height,g.height);assert.ok(g.buttons.length>0);
    for(const r of [...g.buttons,g.speech])assert.ok(r.left>=0&&r.right<=width+1&&r.top>=0&&r.bottom<=844);
    assert.ok(g.speech.bottom<=Math.min(...g.buttons.map(r=>r.top)),'대사와타격단추가겹치지않음');
    assert.equal(await p.locator('.field-cutscene .stage-background img').evaluate(el=>el.src.includes('/assets/world/map-chwimi.webp')),true,'같은 게임 공간을 타격 배경으로 사용');
    observations.push({width,big,geometry:g});await p.screenshot({path:path.join(shots,'staff-'+width+'-'+(big?'big':'normal')+'.png'),fullPage:true});await p.context().close();
  });
  assert.deepEqual(h.errors,[]);console.log('깨어남 '+(guardsOnly?'검토 수정 회귀만 ':'대표 검사 ')+passed+'개 통과 (전체 본편 완료 아님)');
}finally{fs.writeFileSync(path.join(shots,'observations.json'),JSON.stringify({passed,observations,errors:h.errors},null,2));await h.close();}
