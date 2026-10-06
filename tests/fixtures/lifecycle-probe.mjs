import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SHOTS, state, dialogue, ready } from './rpg-harness.mjs';

export async function lifecycle(h) {
  const text=fs.readFileSync(path.join(ROOT,'tests/fixtures/world-opening.js'),'utf8');
  const source=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));
  const beat=(id,kind='continue')=>({id,trigger:{kind,target:null},lines:[0],effects:[{kind:'none',id:null}]});
  const scenes=[
    {id:'c3-feast',ch:'3',kind:'scene',title:'재연 연결 시험',lines:['취미궁의 상황을 다시 본다.']},
    {id:'c3-monk',ch:'3',kind:'scene',title:'호승 연결 시험',lines:['호승의 말을 듣는다.']},
    {id:'c3-staff',ch:'3',kind:'waking',title:'타격 저장 접점 시험',lines:['지팡이를 든 채 입력을 기다린다.']},
    {id:'c3-awake',ch:'3',kind:'scene',title:'선방 접점 시험',awakened:true,lines:['선방으로 돌아왔다.']},
  ];
  const data={people:source.people,sprites:source.sprites,maps:source.maps.map(m=>({...m,objects:[]})),scenes,
    experiences:scenes.map(s=>({scene:s.id,map:'map-cell',actor:s.id==='c3-awake'?'seongjin':'yang',spawn:{x:2,y:5,facing:'down'},
      beats:s.id==='c3-feast'?[beat('feast-first'),beat('feast-last')]:[beat(s.id==='c3-staff'?'strike':s.id==='c3-monk'?'monk-talk':'awake-look',s.id==='c3-staff'?'staff':'continue')],optional:[]})),
    wishes:[],bonds:[],chapters:{},bgm:{},notes:{}};
  const scripts=['js/core/util.js','js/core/world.js','js/core/experience.js','js/core/save.js','js/core/data.js','js/core/audio.js','js/core/text.js','js/core/ui.js','js/game/app.js','js/game/stage.js','js/game/world.js'];
  const file=path.join(SHOTS,'lifecycle.html');
  fs.writeFileSync(file,'<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="../../../"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/rpg.css"></head><body><div id="app"></div>'+scripts.map(s=>'<script src="'+s+'"></script>').join('')+
    '<script>G.data='+JSON.stringify(data)+';'+
    // 이 자료는 내용 전체 검사가 아닌 world/engine 컴포넌트 검사다. 제품 검사 경로를 바꾸지 않는다.
    'const problems=G.checkWorldData(G.data,{profile:"fixture"});if(problems.length)throw Error(problems.join("\\n"));G.data.ok=problems.length===0;'+
    'G.app.screens.waking=async(ctx)=>{ctx.step("staff");await new Promise(resolve=>{const b=G.util.h("button",{type:"button",dataset:{act:"staff"}},"저장 접점 시험");b.onclick=()=>{window.strikeBefore=G.save.state.awake;window.strikeSaved=G.app.wake(ctx);window.strikeAfter=G.save.state.awake;if(strikeSaved)resolve(true);};ctx.tray(b);ctx.signal.addEventListener("abort",()=>resolve(false),{once:true});});};'+
    'G.app.on("scene",ctx=>{window.currentCtx=ctx;});G.save.load("t2-lifecycle");G.save.acquireWriter().then(()=>G.app.boot());</script></body></html>');
  const p=await h.page();await p.goto(h.origin+'/tests/shots/t2/lifecycle.html');await ready(p);
  await p.getByRole('button',{name:'시작하기',exact:true}).click();if (await p.evaluate(() => !!G.data.notes?.mission)) await p.locator('[data-mission="start"]').click();
  const interact=async()=>{await p.locator('[data-act="interact"]').click();await dialogue(p);};
  await interact();assert.equal((await state(p)).rpg.scenes['c3-feast'].beat,'feast-last');
  await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();
  assert.equal(await p.locator('.play').getAttribute('data-beat'),'feast-first');
  const partial=await state(p);await interact();assert.deepEqual(await state(p),partial,'부분 기록의 재연은 지속 상태 불변');
  await interact();const done=await state(p);assert.equal(done.rpg.scenes['c3-feast'].status,'done');assert.equal(done.pos,'c3-monk');
  await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();
  assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-feast');
  await interact();await interact();assert.deepEqual(await state(p),{...done,pos:'c3-feast',rpg:{...done.rpg,cursor:(await state(p)).rpg.cursor}},'마친 재연은 기존 사실을 보존');
  await p.locator('#tray [data-act="next"]').click();assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-monk');
  await interact();await p.locator('#tray [data-act="next"]').click();await p.waitForSelector('[data-act="staff"]');
  assert.equal((await state(p)).awake,false);
  assert.equal(await p.evaluate(()=>currentCtx.finishExperience().ok),false,'staff를 일반 완료로 저장하지 않음');
  await p.locator('[data-act="staff"]').click();
  await p.waitForFunction(()=>document.querySelector('.play')?.dataset.scene==='c3-awake');
  assert.deepEqual(await p.evaluate(()=>[strikeBefore,strikeSaved,strikeAfter]),[false,true,true],'입력 핸들러 안 동기 저장');
  const awake=await state(p);assert.equal(awake.pos,'c3-awake');assert.equal(awake.rpg.scenes['c3-staff'].actions[0].id,'strike');assert.ok(awake.awakeAt>0);
  assert.equal(await p.evaluate(()=>G.app.open('c3-feast',{quiet:true})),false);
  await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-awake');
  assert.equal((await state(p)).awakeAt,awake.awakeAt);await p.context().close();
}
