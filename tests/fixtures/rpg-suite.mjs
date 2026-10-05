import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness, SHOTS, start, target, dialogue, state, step, idle, openTargets, seekTarget, fieldCell } from './rpg-harness.mjs';
import { completedInputs } from './t2-fix-probe.mjs';
const h = await harness();
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
const cursor = async p => (await state(p)).rpg.cursor;
async function next(p) { await p.locator('#tray [data-act="next"]').click(); }
async function at(p, scene, beat) { await p.waitForFunction(({scene, beat}) => document.querySelector('.play')?.dataset.scene === scene && (!beat || document.querySelector('.play').dataset.beat === beat), {scene, beat}); }
async function geometry(p) {
  const value = await p.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
    const world = document.querySelector('[data-world]'), art = world.querySelector('img');
    const all = [...document.querySelectorAll('.world-goal,.world-actions button,.world-target-list button,.world-dialogue .stage-speech,.world-dialogue [data-act="next"]')].filter(el=>el.checkVisibility());
    return {camera:rect(world.parentElement), actor:rect(world.querySelector('.world-actor')), world:rect(world), scale:rect(art).width * devicePixelRatio / art.naturalWidth, rendering:getComputedStyle(art).imageRendering, width:innerWidth,
      all:all.map(el => ({box:rect(el), scroll:el.scrollHeight > el.clientHeight + 1, text:el.textContent})),
      speech:document.querySelector('.world-dialogue .stage-speech') && rect(document.querySelector('.world-dialogue .stage-speech')),
      button:document.querySelector('.world-dialogue [data-act="next"]') && rect(document.querySelector('.world-dialogue [data-act="next"]'))};
  });
  assert.ok(value.all.length > 0, '빈 UI 검사 금지'); assert.ok(value.world.width > 0); assert.ok(value.actor.width >= 32); assert.ok(value.camera.left>=0 && value.camera.right<=value.width+1); assert.ok(value.actor.left>=value.camera.left && value.actor.right<=value.camera.right+1);
  assert.ok(Number.isInteger(value.scale) || Number.isInteger(1/value.scale), '기기 픽셀 정수/역정수 배율'); assert.equal(value.rendering, 'pixelated');
  for (const item of value.all) {
    assert.ok(item.box.width > 0 && item.box.height > 0, item.text);
    assert.ok(item.box.left >= 0 && item.box.right <= value.width + 1, item.text + ' 가로 잘림'); assert.equal(item.scroll, false, item.text + ' 내부 잘림');
  }
  if (value.speech && value.button) assert.ok(value.button.top >= value.speech.bottom, '대화와 진행 겹침');
  return value;
}
try {
  await test('완료 저장 뒤 이전 월드의 방향키·터치·대상 목록 차단', () => completedInputs(h));
  await test('외부 명시 프로필·빈 자료 음성 검사', async () => {
    for (const profile of ['world-opening','world-event']) {
      const p = await h.page(profile); assert.equal(await p.evaluate(() => G.data.ok), true);
      const negative = await p.evaluate(profile => { const d = JSON.parse(JSON.stringify(G.data)); d.maps[0].objects = []; return G.checkData(d, {profile}); }, profile);
      assert.ok(negative.some(s => s.startsWith('action-target:'))); await p.context().close();
    }
  });
  await test('상하좌우 벽·NPC 고체·문서 키 분리', async () => {
    const p = await h.page(); await start(p); await p.locator('[data-world]').focus();
    for (let i=0;i<4;i++) await step(p,'ArrowLeft'); assert.equal((await cursor(p)).x, 1);
    for (let i=0;i<6;i++) await step(p,'ArrowUp'); assert.equal((await cursor(p)).y, 1);
    for (let i=0;i<15;i++) await step(p,'ArrowRight'); assert.equal((await cursor(p)).x, 10);
    for (let i=0;i<15;i++) await step(p,'ArrowDown'); assert.equal((await cursor(p)).y, 8);
    const before = await cursor(p); await p.locator('.world-tools > summary').focus(); await p.keyboard.press('ArrowUp');
    assert.deepEqual(await cursor(p), before, '월드 밖 방향키는 저장에 영향 없음');
    await seekTarget(p,'bridge-voice');
    await p.waitForFunction(() => !!document.querySelector('[data-act="interact"]') && !document.querySelector('[data-act="interact"]').disabled);
    const near = await cursor(p); assert.equal(Math.abs(near.x-4)+Math.abs(near.y-5), 1);
    assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length, 0, '도착은 자동 행동 아님'); await p.context().close();
  });
  await test('닿지 못하는 대상·단계 공개·미래 접근', async () => {
    const p = await h.page(); await start(p); const before = await cursor(p);
    assert.equal(await p.locator('[data-world-target="bridge-exit"]').count(), 0); assert.equal(await p.evaluate(() => G.app.open('c1-cell',{quiet:true})), false);
    await seekTarget(p,'unreachable'); assert.match(await p.locator('.toast').innerText(), /길이 없/); assert.deepEqual(await cursor(p), before);
    await target(p,'bridge-voice'); const record = (await state(p)).rpg.scenes['c1-bridge']; assert.equal(record.beat,'bridge-leave');
    assert.equal(await p.locator('.play').getAttribute('data-beat'),'bridge-talk','표시 단계와 최초 수행 기록 분리');
    await dialogue(p); assert.equal(await p.locator('[data-world-target="bridge-exit"]').count(),1); await p.context().close();
  });
  await test('키보드·목적지 터치·접근 대상 목록의 동등 행동', async () => {
    const records=[];
    for (const mode of ['keyboard','touch','list']) {
      const p = await h.page('world-opening',{width:390,height:844},{hasTouch:mode==='touch'}); await start(p);
      if(mode==='keyboard') { await p.locator('[data-world]').focus(); await step(p,'d'); await p.keyboard.press('Enter'); }
      else if(mode==='touch') {
        await fieldCell(p,2,7,true);
        await p.waitForFunction(()=>G.save.state.rpg.cursor.x===2&&G.save.state.rpg.cursor.y===7);
        assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length,0);
        await p.locator('[data-object="bridge-voice"]').tap(); await idle(p); await p.waitForSelector('[data-act="interact"][data-target="bridge-voice"]'); await p.locator('[data-act="interact"]').tap();
      }
      else await target(p,'bridge-voice');
      await dialogue(p); records.push((await state(p)).rpg.scenes['c1-bridge'].actions); await p.context().close();
    }
    assert.deepEqual(records[0],[{id:'bridge-talk',by:'student'}]); assert.deepEqual(records[0],records[1]); assert.deepEqual(records[0],records[2]);
  });
  await test('대화·설정·접기 중 입력 차단과 포커스 복구', async () => {
    const p=await h.page(); await start(p); await target(p,'bridge-voice'); const before=await cursor(p);
    await p.locator('[data-world]').focus(); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(350); await p.keyboard.up('ArrowDown'); assert.deepEqual(await cursor(p),before);
    assert.equal(await p.locator('.stage-portrait img').count(),1); await dialogue(p); assert.equal(await p.locator('[data-world]').evaluate(el=>el===document.activeElement),true);
    await p.keyboard.down('ArrowRight'); await p.locator('[data-tool="settings"]').click(); const stopped=await cursor(p); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
    assert.deepEqual(await cursor(p),stopped); await p.keyboard.press('ArrowDown'); assert.deepEqual(await cursor(p),stopped); await p.keyboard.press('Escape');
    await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="teacher"]').click(); await p.keyboard.press('Escape');
    await p.locator('[data-tool="fold"]').click(); await p.keyboard.press('d'); assert.deepEqual(await cursor(p),stopped);
    await p.getByRole('button',{name:'다시 펼치기',exact:true}).click(); await p.context().close();
  });
  await test('map/spawn/appearance 전환·선택 관찰·최초 수행 보존', async () => {
    const p=await h.page('world-event'); await start(p); const rpg=(await state(p)).rpg.run;
    assert.equal(await p.locator('[data-world-target="official"]').count(),0); await target(p,'table'); await dialogue(p); assert.equal((await state(p)).rpg.scenes['e04-exam'].beat,'exam-write');
    await target(p,'paper'); const committed=await state(p); assert.equal(committed.rpg.cursor.map,'map-hallim'); assert.equal(committed.items.filter(id=>id==='it-test-paper').length,1);
    await dialogue(p); await at(p,'e04-exam','exam-appoint'); assert.equal(await p.locator('.play').getAttribute('data-map'),'map-hallim');
    assert.equal(await p.locator('.world-actor').evaluate(el=>getComputedStyle(el).backgroundImage.includes('walk-yang-chancellor')),true);
    assert.deepEqual(await cursor(p),{scene:'e04-exam',map:'map-hallim',x:2,y:5,facing:'right'});
    await target(p,'official'); assert.equal(await p.locator('.stage-portrait img').count(),0,'안내 호칭으로 실제 인물 얼굴 숨김'); await dialogue(p);
    let s=await state(p); assert.equal(s.rpg.run,rpg); assert.equal(s.done['e04-exam'],true); assert.equal(s.pos,'e08-wonsu');
    assert.deepEqual(s.abil,{munjang:0,eumak:0,muye:0,jiryak:0}); assert.deepEqual(s.res,{gong:0,fame:0,wealth:0}); assert.deepEqual(s.events,{});
    assert.equal(await p.locator('[data-score],[data-act="prep"],[data-grade],.sim-hud').count(),0);
    await next(p); await at(p,'e08-wonsu','wonsu-exit'); await target(p,'prison-door'); await dialogue(p); await at(p,'e08-wonsu','wonsu-order'); assert.equal((await cursor(p)).map,'map-camp');
    await target(p,'camp-order'); await dialogue(p); assert.equal(await p.locator('[data-profile-end]').count(),1);
    s=await state(p); assert.equal(s.done['e08-wonsu'],true); assert.equal(s.awake,false); await p.context().close();
  });
  await test('격리 공통 대화 부품: 가린 대상과 다른 화자의 호칭·초상',async()=>{
    const p=await h.page();await start(p);
    await p.evaluate(()=>{
      G.app.on('scene',ctx=>window.probeCtx=ctx);G.app.open('c1-bridge');
      window.probeStage=G.stage.mount(probeCtx,probeCtx.scene,{textOnly:true,label:'가린 호칭',hideFace:true,targetPerson:'seongjin'});
      probeStage.show({say:'seongjin',text:'호칭 표시 시험'});
    });
    assert.equal(await p.locator('.stage-speaker').innerText(),'가린 호칭');assert.equal(await p.locator('.stage-portrait img').count(),0);
    await p.evaluate(()=>probeStage.show({say:'yang',text:'다른 화자의 표시 시험'}));
    assert.equal(await p.locator('.stage-speaker').innerText(),'양소유');assert.equal(await p.locator('.stage-portrait img').count(),1);
    await p.evaluate(()=>probeStage.dispose());assert.equal(await p.locator('[data-dialogue]').count(),0);await p.context().close();
  });
  await test('월드 이탈·지연 콜백·오래된 대상 폐기', async () => {
    const p=await h.page(); await start(p); await p.evaluate(()=>{ window.oldButton=document.querySelector('[data-world-target="front-table"]'); });
    await openTargets(p); await p.locator('[data-world-target="front-table"]').click();
    await p.waitForFunction(()=>document.querySelector('.world-actor')?.dataset.moving==='true');
    await p.locator('[data-tool="home"]').click(); const stopped=await state(p); await p.waitForTimeout(700);
    await p.evaluate(()=>window.oldButton.click()); assert.deepEqual(await state(p),stopped); assert.equal(await p.locator('[data-world]').count(),0);
    await p.getByRole('button',{name:'이어 하기',exact:true}).click(); assert.deepEqual(await cursor(p),stopped.rpg.cursor,'마지막 유효 칸 재개'); await p.context().close();
  });
  await test('성진·선비복·승상복 네 방향 프레임과 발 기준',async()=>{
    for(const actorName of ['seongjin','scholar','chancellor']) {
      const p=await h.page(actorName==='seongjin'?'world-opening':'world-event',{width:820,height:844});await start(p);
      if(actorName==='chancellor'){await target(p,'paper');await dialogue(p);}
      const key=actorName==='seongjin'?'walk-seongjin':actorName==='scholar'?'walk-yang-scholar':'walk-yang-chancellor';
      for(const [facing,keyPress] of [['down','s'],['left','a'],['up','w'],['right','d']]) {
        await seekTarget(p,actorName==='seongjin'?'front-table':'table');
        await fieldCell(p,7,5);
        await p.waitForFunction(()=>G.save.state.rpg.cursor.x===7&&G.save.state.rpg.cursor.y===5);
        await p.locator('[data-world]').focus();await p.keyboard.down(keyPress);await p.waitForTimeout(75);
        assert.ok(await p.locator('.world-actor').evaluate(el=>+el.dataset.frame>0),'현재 실제 걷기 프레임');
        const clip=await p.locator('.world-actor').boundingBox();const moving=await p.screenshot({clip});await p.keyboard.up(keyPress); await idle(p);
        const stopped=await p.locator('.world-actor').screenshot();assert.notDeepEqual(moving,stopped,key+'/'+facing+' 실제 프레임');
        const foot=await p.evaluate(({key,facing})=>{
          const meta=G.data.sprites[key],el=document.querySelector('.world-actor'),w=document.querySelector('[data-world]'),r=el.getBoundingClientRect(),wr=w.getBoundingClientRect();
          const scale=r.width/meta.cell.width, x=+el.dataset.x,y=+el.dataset.y;
          return {frame:+el.dataset.frame,stand:meta.directions[facing].stand,
            errorX:Math.abs(r.left+meta.anchor.x*scale-(wr.left+(x+0.5)*32*scale)),errorY:Math.abs(r.top+meta.anchor.y*scale-(wr.top+(y+1)*32*scale))};
        },{key,facing});
        assert.equal(foot.frame,foot.stand);assert.ok(foot.errorX<0.01&&foot.errorY<0.01,'발 기준 정렬');
        fs.writeFileSync(path.join(SHOTS,key+'-'+facing+'-walk.png'),moving);fs.writeFileSync(path.join(SHOTS,key+'-'+facing+'-stand.png'),stopped);
      }
      await p.context().close();
    }
  });
  await test('320/390/820/1280와 큰 글자·그림 가림·실제 픽셀', async () => {
    for(const width of [320,390,820,1280]) for(const big of [false,true]) {
      const p=await h.page('world-opening',{width,height:844}); await start(p);
      if(big){await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="big"]').click();await p.keyboard.press('Escape');} await geometry(p);
      const actor=p.locator('.world-actor'); await p.locator('[data-world]').focus(); const stand=await actor.screenshot();
      await p.keyboard.down('ArrowDown'); await p.waitForTimeout(90); const walk=await actor.screenshot(); await p.keyboard.up('ArrowDown'); await idle(p); assert.notDeepEqual(stand,walk,'표시된 실제 걷기 픽셀 변화');
      fs.writeFileSync(path.join(SHOTS,`actor-${width}-${big?'big':'normal'}-stand.png`),stand); fs.writeFileSync(path.join(SHOTS,`actor-${width}-${big?'big':'normal'}-walk.png`),walk);
      await seekTarget(p,'front-table'); await p.waitForTimeout(1100);
      assert.equal(await p.locator('[data-object="front-table"]').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-object]')===el;}),true,'앞쪽 가구의 발 깊이 가림과 실제 누르기');
      await target(p,'bridge-voice'); await geometry(p); await p.screenshot({path:path.join(SHOTS,`dialogue-${width}-${big?'big':'normal'}.png`),fullPage:true}); await dialogue(p); await geometry(p);
      await target(p,'bridge-exit'); await dialogue(p); await next(p); await at(p,'c1-cell','cell-look'); await target(p,'cushion'); await dialogue(p); await next(p); await at(p,'c3-awake','awake-look');
      await target(p,'awake-cushion'); await dialogue(p); assert.equal(await p.locator('[data-profile-end]').count(),1,'같은 필수 행동 수행'); await p.context().close();
    }
  });
  assert.deepEqual(h.errors,[]); console.log('월드 조작 묶음 '+count+'개 통과 (대표 시험 자료, 본편 완주 아님)');
} finally { await h.close(); }
