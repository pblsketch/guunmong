import assert from 'node:assert/strict';
import path from 'node:path';
import { harness, SHOTS, start, target, dialogue, state, ready } from './rpg-harness.mjs';
import { lifecycle } from './lifecycle-probe.mjs';
import { entryFailures, transitionFailures, errorMenus } from './t2-fix-probe.mjs';
import { startupDataFailures } from './startup-data-probe.mjs';
const h=await harness(); let count=0;
const test=async(name,fn)=>{await fn();count++;console.log('PASS '+name);};
const next=p=>p.locator('#tray [data-act="next"]').click();
const resume=async p=>{await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();await p.waitForSelector('[data-world]');};
const finishBridge=async p=>{await target(p,'bridge-voice');await dialogue(p);await target(p,'bridge-exit');await dialogue(p);};
// 숨긴 소원(명세 5·6·15절): 대표 도입 자료에서 실제 행동으로 소원 찾기까지 가서 실제 단추로 푼다.
const at=(p,scene)=>p.waitForFunction(scene=>document.querySelector('.play')?.dataset.scene===scene,scene);
async function toWishScene(p){
  await start(p);
  for(let i=0;i<40;i++){
    const c=await p.evaluate(()=>{const el=document.querySelector('.play');return {id:el?.dataset.scene,kind:el?.dataset.kind,beat:el?.dataset.beat};});
    if(c.kind==='wish')return;
    if(await p.locator('[data-dialogue]').count()){await dialogue(p);continue;}
    if(await p.locator('#tray [data-act="next"]').count()){await next(p);await p.waitForTimeout(40);continue;}
    const beat=await p.evaluate(c=>G.experience.find(G.data,c.id)?.beats.find(b=>b.id===c.beat)||null,c);
    assert.ok(beat?.trigger?.target,'소원 앞 실제 행동 '+JSON.stringify(c));await target(p,beat.trigger.target);await dialogue(p);
  }
  throw Error('소원 찾기에 닿지 못함');
}
const wishAnswers=p=>p.evaluate(()=>G.app.current().data.answers);
const secretIds=p=>p.locator('[data-secret-wish]').evaluateAll(list=>list.map(b=>b.dataset.secretWish));
const resumeAt=async(p,scene)=>{await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();await at(p,scene);};
async function compatibility(p, change) {
  // 이관·접근 회귀만 저장 자료를 준비한다. 학생 완주 증거에는 쓰지 않는다.
  const s=await state(p); change(s);
  await p.evaluate(s=>localStorage.setItem(G.save.key,JSON.stringify(s)),s); await resume(p);
}
try {
  await test('운영 HTML/main의 자료 실패 무쓰기·같은 기록 복구', () => startupDataFailures());
  await test('오류 화면 홈·설정 실제 클릭과 기록·회차·reader 보호', () => errorMenus(h));
  await test('진입 저장·체험 초기화·단계 실패의 오류 전파와 재시도', () => entryFailures(h));
  await test('화면 반환 실패·일반 전환 저장 실패의 오류와 수행 보존', () => transitionFailures(h));
  await test('격리 world/engine 컴포넌트: 3장 부분·완료 재연과 app.wake 동기 저장',()=>lifecycle(h));
  await test('순차 완료·중복 입력·next 위치를 한 번 확정',async()=>{
    const p=await h.page();await start(p);
    await p.evaluate(()=>{G.app.on('scene',ctx=>window.testCtx=ctx);window.doneEvents=0;G.app.on('done',()=>window.doneEvents++);});
    await finishBridge(p);let s=await state(p);
    assert.equal(s.done['c1-bridge'],true);assert.equal(s.pos,'c1-cell');assert.equal(s.rpg.scenes['c1-bridge'].status,'done');
    const snapshot=s;
    await p.evaluate(()=>document.querySelector('[data-act="interact"]')?.click());assert.deepEqual(await state(p),snapshot);
    await next(p);assert.equal(await p.locator('.play').getAttribute('data-scene'),'c1-cell');
    assert.equal(await p.evaluate(()=>window.doneEvents),1);assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length,2);
    assert.equal(await p.evaluate(()=>Object.isFrozen(G.save.state)&&Object.isFrozen(G.save.state.rpg.scenes)),true);
    await p.context().close();
  });
  await test('readonly 다시 보기·원래 위치·기록 불변',async()=>{
    const p=await h.page();await start(p);await finishBridge(p);await next(p);const before=await state(p);
    assert.equal(await p.evaluate(()=>G.app.open('c1-bridge')),true);
    assert.equal(await p.locator('.play').getAttribute('data-readonly'),'true');
    await finishBridge(p);assert.deepEqual(await state(p),before);await next(p);
    assert.equal(await p.locator('.play').getAttribute('data-scene'),'c1-cell');assert.deepEqual(await state(p),before);
    await p.context().close();
  });
  await test('현재 좌표 재개·대화 저장 뒤 다시 열기·중복 효과 없음',async()=>{
    const p=await h.page('world-event');await start(p);await p.locator('[data-world]').focus();await p.keyboard.press('s');const before=await state(p);
    await resume(p);assert.deepEqual((await state(p)).rpg.cursor,before.rpg.cursor);
    await target(p,'paper');let s=await state(p);assert.equal(s.items.length,1);await resume(p);
    assert.equal(await p.locator('.play').getAttribute('data-map'),'map-hallim');
    assert.equal((await state(p)).items.length,1);assert.equal((await state(p)).rpg.scenes['e04-exam'].actions.length,1);
    await target(p,'official');await dialogue(p);await next(p);const old=(await state(p)).items;
    await p.evaluate(()=>G.app.open('e04-exam'));await target(p,'paper');await dialogue(p);assert.deepEqual((await state(p)).items,old);
    await p.context().close();
  });
  await test('auto 순차 재생과 직접 읽기 분리·최초 수행자 보존',async()=>{
    const p=await h.page();await start(p);
    await compatibility(p,s=>{s.rpg.scenes['c1-bridge']={status:'auto',beat:null,actions:[],hint:'teacher'};s.rpg.cursor=null;});
    assert.equal(await p.evaluate(()=>G.app.current().autoAdvance),true);const before=await state(p);
    await finishBridge(p);let s=await state(p);assert.equal(s.pos,'c1-cell');assert.equal(s.done['c1-bridge'],undefined);assert.deepEqual(s.rpg.scenes['c1-bridge'],before.rpg.scenes['c1-bridge']);
    await next(p);const saved=await state(p);await p.evaluate(()=>G.app.open('c1-bridge'));
    assert.equal(await p.evaluate(()=>G.app.current().autoAdvance),false);await finishBridge(p);await next(p);assert.deepEqual(await state(p),saved);
    await p.context().close();
  });
  await test('교사 바로가기 자동 안내·부분 기록 보호·설정 저장·장부',async()=>{
    const p=await h.page('world-event');await start(p);await target(p,'table');await dialogue(p);const partial=(await state(p)).rpg.scenes['e04-exam'];
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await p.locator('[data-set="big"]').click();await p.keyboard.press('Escape');
    await p.evaluate(()=>G.app.open('e08-wonsu'));assert.deepEqual((await state(p)).rpg.scenes['e04-exam'],partial);
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="clear"]').click();await p.getByRole('button',{name:'지우기',exact:true}).click();
    await p.evaluate(()=>G.app.open('e08-wonsu'));let s=await state(p);assert.equal(s.rpg.scenes['e04-exam'].status,'auto');assert.equal(s.rpg.scenes['e04-exam'].hint,'teacher');
    const rows=await p.evaluate(()=>G.app.ledgerRows());assert.deepEqual(rows.map(r=>r.id),['a-wish','e04-exam','e08-wonsu','j-match']);assert.equal(rows[1].firstLabel,'자동 안내');assert.equal(rows[1].gradeLabel,'없음');
    await p.locator('[data-tool="settings"]').click();for(const key of ['teacher','big'])assert.equal(await p.locator('[data-set="'+key+'"]').getAttribute('aria-pressed'),'true');await p.keyboard.press('Escape');
    await p.context().close();
  });
  await test('reader 두 탭·storage 화면 폐기·권한 해제 후 최신 이어 하기',async()=>{
    const a=await h.page();await start(a);const b=await a.context().newPage();await b.goto(a.url());await ready(b);
    assert.equal(await a.evaluate(()=>G.save.access),'writer');assert.equal(await b.evaluate(()=>G.save.access),'reader');
    await b.getByRole('button',{name:'이어 하기',exact:true}).click();await b.waitForSelector('[data-world]');
    assert.equal(await b.locator('.play').getAttribute('data-readonly'),'false');assert.equal(await b.locator('.play').getAttribute('data-access'),'reader');
    const before=await state(b);await b.evaluate(()=>{document.querySelector('[data-world-target]').click();G.app.newGame(false);});assert.deepEqual(await state(b),before);
    await b.locator('[data-tool="settings"]').click();for(const k of ['big','music','sound','teacher','clear'])assert.equal(await b.locator('[data-set="'+k+'"]').isDisabled(),true);await b.keyboard.press('Escape');
    await target(a,'bridge-voice');await dialogue(a);await b.waitForSelector('.title-screen');
    assert.equal(await b.locator('[data-world]').count(),0);assert.equal((await state(b)).rpg.scenes['c1-bridge'].beat,'bridge-leave');
    await b.locator('[data-act="acquire"]').click();await b.waitForFunction(()=>G.save.access!=='acquiring');assert.equal(await b.evaluate(()=>G.save.access),'reader');
    const latest=await state(a);await a.close();await b.locator('[data-act="acquire"]').click();await b.waitForSelector('[data-world]');
    assert.equal(await b.evaluate(()=>G.save.access),'writer');assert.equal((await state(b)).rpg.run,latest.rpg.run);assert.equal(await b.locator('.play').getAttribute('data-beat'),'bridge-leave');
    await b.context().close();
  });
  await test('확인 초기화 취소·새 run·옛 ctx/stale 콜백 거부',async()=>{
    const p=await h.page();await start(p);await p.evaluate(()=>{window.contexts=[];G.app.on('scene',ctx=>window.contexts.push(ctx));});
    await p.evaluate(()=>G.app.open('c1-bridge'));const before=await state(p);
    await p.locator('[data-tool="home"]').click();await p.getByRole('button',{name:'처음부터 새로',exact:true}).click();await p.getByRole('button',{name:'그만두기',exact:true}).click();assert.deepEqual(await state(p),before);
    await p.getByRole('button',{name:'처음부터 새로',exact:true}).click();await p.getByRole('button',{name:'새로 시작',exact:true}).click();
    const s=await state(p);assert.notEqual(s.rpg.run,before.rpg.run);assert.deepEqual(s.done,{});
    assert.deepEqual(await p.evaluate(()=>({alive:contexts[0].alive(),finish:contexts[0].finishExperience().reason,wake:G.app.wake(contexts[0])})),{alive:false,finish:'stale',wake:false});
    const rejected=await p.evaluate(r=>{const now=JSON.stringify(G.save.state);const result=G.save.applyExperience('c1-bridge','bridge-talk',{run:r,by:'student',readonly:false});return {reason:result.reason,same:JSON.stringify(G.save.state)===now};},before.rpg.run);
    assert.deepEqual(rejected,{reason:'stale',same:true});await p.context().close();
  });
  await test('reader 마친 월드 열람·새 진행과 구분·지속 기록 불변',async()=>{
    const a=await h.page();await start(a);await finishBridge(a);
    const b=await a.context().newPage();await b.goto(a.url());await ready(b);const before=await state(b);
    await b.getByRole('button',{name:'목차',exact:true}).click();await b.locator('.toc-scene[data-scene="c1-bridge"]').click();
    assert.equal(await b.locator('.play').getAttribute('data-access'),'reader');assert.equal(await b.locator('.play').getAttribute('data-readonly'),'true');
    await finishBridge(b);assert.deepEqual(await state(b),before);await next(b);
    assert.equal(await b.locator('.play').getAttribute('data-scene'),'c1-cell');assert.equal(await b.locator('.play').getAttribute('data-readonly'),'false');
    assert.equal(await b.locator('[data-world-target]').first().isDisabled(),true);assert.deepEqual(await state(b),before);
    await a.context().close();
  });
  await test('이미 깨어난 기록·주소/목차/history/출구·교사 해제',async()=>{
    const p=await h.page();await start(p);await compatibility(p,s=>{s.awake=true;s.awakeAt=1234;s.pos='c3-awake';s.rpg.cursor=null;});
    assert.equal(await p.evaluate(()=>G.app.canOpen('c1-bridge')),false);assert.equal(await p.evaluate(()=>G.app.open('c1-cell',{quiet:true})),false);
    await p.locator('[data-tool="toc"]').click();assert.equal(await p.locator('.toc-scene[data-scene="c1-bridge"]').isDisabled(),true);await p.keyboard.press('Escape');
    await p.evaluate(()=>{history.pushState({scene:'c1-bridge'},'');window.dispatchEvent(new PopStateEvent('popstate',{state:{scene:'c1-bridge'}}));});assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-awake');
    const url=p.url();await p.goto(url+'&scene=c1-bridge');await ready(p);assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-awake');
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await p.keyboard.press('Escape');await p.evaluate(()=>G.app.open('c1-bridge'));await target(p,'bridge-voice');
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();
    assert.equal(await p.locator('[data-dialogue]').count(),0);assert.equal(await p.locator('.play').getAttribute('data-scene'),'c3-awake');assert.equal((await state(p)).awakeAt,1234);
    await p.context().close();
  });
  await test('bfcache 복귀 이벤트·pagehide 즉시 차단·최신 회차',async()=>{
    const p=await h.page();await start(p);const before=await state(p);
    await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));assert.equal(await p.evaluate(()=>G.save.access),'reader');assert.equal(await p.locator('[data-world]').count(),0);
    const refused=await p.evaluate(r=>G.save.transact(r,s=>{s.name='거부';}),before.rpg.run);assert.equal(refused,false);
    await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await p.waitForFunction(()=>G.save.access==='writer');assert.equal(await p.locator('[data-world]').count(),0);
    await p.getByRole('button',{name:'이어 하기',exact:true}).click();assert.equal((await state(p)).rpg.run,before.rpg.run);await p.context().close();
  });
  await test('Web Locks 불가·저장 실패·무효 run은 쓰기 차단',async()=>{
    const context=await h.browser.newContext();context.on('page',h.observe);await context.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));const p=await context.newPage();await p.goto(h.origin+'/tests/shots/t2/entry.html?fixture=world-opening');await ready(p);
    assert.equal(await p.evaluate(()=>G.save.access),'unavailable');assert.equal(await p.getByRole('button',{name:'시작하기',exact:true}).isDisabled(),true);await context.close();
    const q=await h.page();await start(q);const before=await state(q);
    const failed=await q.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('시험 저장 실패');};const ok=G.save.reset(G.save.state.rpg.run,{confirmed:true,cancel:()=>G.app.title()});Storage.prototype.setItem=set;return ok;});
    assert.equal(failed,false);assert.deepEqual(await state(q),before);
    await compatibility(q,s=>{s.rpg.run='invalid run';});assert.equal(await q.evaluate(()=>G.save.access),'unavailable');assert.equal((await state(q)).rpg.run,null);
    await q.context().close();
  });
  await test('HTTP 실제 bfcache·다른 탭 초기화 뒤 최신 run만 이어 하기',async()=>{
    const a=await h.page();await start(a);const old=await state(a);
    await a.evaluate(()=>window.addEventListener('pageshow',e=>{window.cacheRestored=e.persisted;}));
    await a.goto(h.origin+'/tests/shots/t2/away.html');
    const b=await a.context().newPage();await b.goto(h.origin+'/tests/shots/t2/entry.html?fixture=world-opening');await ready(b);
    assert.equal(await b.evaluate(()=>G.save.access),'writer');
    await b.getByRole('button',{name:'처음부터 새로',exact:true}).click();await b.getByRole('button',{name:'새로 시작',exact:true}).click();const latest=await state(b);
    assert.notEqual(latest.rpg.run,old.rpg.run);
    await a.goBack({waitUntil:'commit'});await a.waitForFunction(()=>G.save.access==='reader');
    assert.equal(await a.evaluate(()=>window.cacheRestored),true,'모의 이벤트 아닌 실제 캐시 복귀');
    assert.equal(await a.locator('[data-world]').count(),0);assert.equal((await state(a)).rpg.run,latest.rpg.run);
    assert.equal(await a.evaluate(r=>G.save.write(r),old.rpg.run),false);
    await b.close();await a.locator('[data-act="acquire"]').click();await a.waitForSelector('[data-world]');assert.equal((await state(a)).rpg.run,latest.rpg.run);
    await a.context().close();
  });
  await test('file 실제 두 탭 권한·시작·저장·소리·권한 이전',async()=>{
    const context=await h.browser.newContext();context.on('page',h.observe);const a=await context.newPage();await a.goto(h.file+'?fixture=world-opening');await ready(a);await start(a);
    await a.waitForFunction(()=>!!G.audio.now());const b=await context.newPage();await b.goto(h.file+'?fixture=world-opening');await ready(b);
    assert.equal(await a.evaluate(()=>G.save.access),'writer');assert.equal(await b.evaluate(()=>G.save.access),'reader');
    await a.locator('[data-world]').focus();await a.keyboard.press('s');const saved=await state(a);await a.close();
    await b.locator('[data-act="acquire"]').click();await b.waitForSelector('[data-world]');assert.equal(await b.evaluate(()=>G.save.access),'writer');assert.deepEqual((await state(b)).rpg.cursor,saved.rpg.cursor);
    await b.screenshot({path:path.join(SHOTS,'file-two-tabs.png'),fullPage:true});await context.close();
  });
  await test('정상 자료 포커스 이동·설정 모달은 writer lease를 해제하지 않음',async()=>{
    const a=await h.page();await start(a);const before=await state(a);
    const b=await a.context().newPage();await b.goto(a.url());await ready(b);
    await b.bringToFront();await a.bringToFront();
    await a.locator('[data-tool="settings"]').click();await a.waitForSelector('.settings-sheet');
    assert.equal(await a.evaluate(()=>G.save.access),'writer');
    assert.equal(await b.evaluate(()=>G.save.acquireWriter()),false);assert.equal(await b.evaluate(()=>G.save.access),'reader');
    await a.keyboard.press('Escape');assert.deepEqual(await state(a),before);
    assert.equal(await a.evaluate(()=>G.save.access),'writer');await a.context().close();
  });
  await test('숨긴 소원: 소원 찾기 확정 뒤에만·미색 없음·고르기 전 진행 불가·재접속 같은 자리·한 번만·다시 읽기는 고른 것만',async()=>{
    const p=await h.page('rpg-opening');await toWishScene(p);
    assert.equal(await p.locator('.secret-wish').count(),0,'소원 찾기 전에는 묻지 않음');
    const answers=await wishAnswers(p);
    for(const id of answers.slice(0,-1))await p.locator('[data-word="'+id+'"]').click();
    assert.equal(await p.locator('.secret-wish').count(),0,'다 찾기 전에는 묻지 않음');
    await p.locator('[data-word="'+answers.at(-1)+'"]').click();
    assert.equal((await state(p)).ledger['a-wish'].final,true);
    await p.waitForSelector('.secret-wish');
    assert.match(await p.locator('.secret-wish').innerText(),/가장 먼저 이루고 싶은 것 하나/);
    assert.deepEqual(await secretIds(p),['chuljang','bugwi','pungryu','gongmyeong'],'드러난 넷만, 미색 없음');
    assert.equal(await p.locator('.secret-wish').getByText('미색').count(),0);
    assert.equal(await p.locator('#tray [data-act="next"]').count(),0,'고르기 전 다음 없음');
    assert.equal(await p.locator('[data-act="secret"]').isDisabled(),true,'고르기 전 확인 막힘');
    assert.equal(await p.evaluate(()=>G.app.canOpen('c1-exile')),false,'다음 장면 열리지 않음');
    // 고르기 전에 창을 닫았다 열면 같은 자리에서 다시 묻는다.
    await p.locator('[data-secret-wish="pungryu"]').click();assert.equal((await state(p)).play.secretWish,null,'누르기만으로 저장하지 않음');
    await resumeAt(p,'c1-wish');await p.waitForSelector('.secret-wish');
    assert.deepEqual(await secretIds(p),['chuljang','bugwi','pungryu','gongmyeong']);assert.equal(await p.locator('#tray [data-act="next"]').count(),0);
    let s=await state(p);assert.equal(s.pos,'c1-wish');assert.equal(s.done['c1-wish'],undefined);assert.equal(s.play.secretWish,null);
    await p.locator('[data-secret-wish="bugwi"]').click();assert.equal(await p.locator('[data-secret-wish="bugwi"]').getAttribute('aria-pressed'),'true');
    await p.evaluate(()=>{window.oldSecret=document.querySelector('[data-secret-wish="gongmyeong"]');window.oldConfirm=document.querySelector('[data-act="secret"]');});
    await p.locator('[data-act="secret"]').click();
    s=await state(p);assert.equal(s.play.secretWish,'bugwi');
    assert.equal(await p.locator('[data-secret-wish]').count(),0,'정한 뒤에는 고른 것만');assert.match(await p.locator('.secret-wish').innerText(),/부귀/);
    const before=await state(p);await p.evaluate(()=>{window.oldSecret.click();window.oldConfirm.click();});
    assert.equal(await p.evaluate(r=>G.save.chooseSecretWish('pungryu',{run:r,readonly:false,by:'student'}).reason,before.rpg.run),'decided');assert.deepEqual(await state(p),before,'바꿀 수 없음');
    await next(p);await at(p,'c1-exile');
    assert.equal(await p.evaluate(()=>G.play.recap(G.save.state,G.data).secretWish),'bugwi');
    const kept=await state(p);assert.equal(await p.evaluate(()=>G.app.open('c1-wish')),true);await at(p,'c1-wish');
    assert.equal(await p.locator('.play').getAttribute('data-readonly'),'true');await p.waitForSelector('.secret-wish');
    assert.equal(await p.locator('[data-secret-wish],[data-act="secret"]').count(),0,'다시 읽기는 고른 것만');
    assert.match(await p.locator('.secret-wish').innerText(),/부귀/);for(const other of ['출장입상','풍류','공명'])assert.equal((await p.locator('.secret-wish').innerText()).includes(other),false);
    assert.deepEqual(await state(p),kept);await p.context().close();
  });
  await test('숨긴 소원 선생님용: 기록 거부 뒤 막지 않고 진행·되짚기 없음',async()=>{
    const p=await h.page('rpg-opening');await toWishScene(p);
    await p.locator('[data-tool="settings"]').click();await p.locator('[data-set="teacher"]').click();await p.keyboard.press('Escape');
    await p.locator('[data-teacher="fill"]').click();assert.equal((await state(p)).ledger['a-wish'].final,true);
    await p.waitForSelector('.secret-wish');assert.deepEqual(await secretIds(p),['chuljang','bugwi','pungryu','gongmyeong']);
    assert.equal(await p.locator('#tray [data-act="next"]').count(),0);
    await p.locator('[data-secret-wish="pungryu"]').click();await p.locator('[data-act="secret"]').click();
    await p.waitForSelector('#tray [data-act="next"]:not([disabled])');assert.equal((await state(p)).play.secretWish,null,'선생님용은 기록하지 않음');
    await next(p);await at(p,'c1-exile');
    assert.equal(await p.evaluate(()=>G.play.recap(G.save.state,G.data).secretWish),null,'되짚기는 고르지 않음');
    await p.context().close();
  });
  assert.deepEqual(h.errors,[]);console.log('engine 계약 '+count+'개 통과 (이관 자료 검사는 완주 증거 아님)');
} finally {await h.close();}
