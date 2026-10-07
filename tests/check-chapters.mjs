// 꿈 밖 학습·결과의 실제 브라우저 회귀. 합성 상태는 회귀 fixture이며 학생 완주 증거가 아니다.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=fileURLToPath(new URL('../',import.meta.url)),SHOTS=path.join(ROOT,'tests/shots');fs.mkdirSync(SHOTS,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(path.resolve(ROOT)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];let passed=0;const ready=p=>p.waitForFunction(()=>window.G?.app?.booted),state=p=>p.evaluate(()=>JSON.parse(JSON.stringify(G.save.state))),current=p=>p.evaluate(()=>G.app.current()),next=p=>p.locator('#tray [data-act="next"]:not([disabled])').click();
function observe(p){p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});p.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob):/.test(r.url()))errors.push('외부 요청 '+r.url())})}
async function dialogue(p){while(await p.locator('[data-dialogue]').count()){await p.locator('[data-dialogue] [data-act="next"]').click();await p.waitForTimeout(20)}}
async function advance(p){if(await p.locator('[data-dialogue]').count())return dialogue(p);const skip=p.locator('[data-act="skip"]:visible');if(await skip.count()){await skip.click();return}const button=p.locator('#tray [data-act="next"]:not([disabled])');if(await button.count()){await button.click();return}await p.waitForTimeout(30)}
async function until(p,predicate,label){for(let i=0;i<200;i++){if(await predicate())return;await advance(p)}throw Error('도달 실패: '+label)}
async function test(name,fn){const before=errors.length;try{await fn();assert.deepEqual(errors.slice(before),[]);passed++;console.log('✓ '+name)}catch(e){errors.push(name+': '+e.stack);console.error('✗ '+name+': '+e.stack);throw e}}
async function installFixture(p,pearls=[]){
  await p.goto(origin+'/index.html');await ready(p);
  await p.evaluate(found=>{const saved=JSON.parse(JSON.stringify(G.save.state)),list=G.app.list(),stop=list.findIndex(s=>s.id==='c4-journal');saved.started=true;saved.pos='c4-journal';saved.step='scene';saved.reach=4;saved.awake=true;saved.awakeAt=1700000000123;saved.done={};saved.items=[];saved.bonds=[];saved.pearls={};saved.rpg.cursor=null;saved.rpg.scenes={};for(const scene of list.slice(0,stop)){saved.done[scene.id]=true;const exp=G.experience.find(G.data,scene.id);if(!exp)continue;saved.rpg.scenes[scene.id]={status:'done',beat:null,actions:exp.beats.map(b=>({id:b.id,by:'student'})),hint:null};for(const beat of exp.beats)for(const effect of beat.effects||[]){if(effect.kind==='item'&&!saved.items.includes(effect.id))saved.items.push(effect.id);if(effect.kind==='bond'&&!saved.bonds.includes(effect.id))saved.bonds.push(effect.id)}}for(const id of found)saved.pearls[id]=true;saved.ledger={'a-wish':{first:true,help:null,final:true}};saved.journal={wish:{selected:G.data.scenes.find(s=>s.id==='c1-wish').answers.slice(),wrong:0}};saved.interp={};saved.wrong=[];saved.name='';saved.finishedAt=0;localStorage.setItem(G.save.key,JSON.stringify(saved))},pearls);
  await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();await p.waitForSelector('.play[data-scene="c4-journal"]');if((await current(p)).step==='chapter')await next(p);await p.waitForSelector('.activity');
}
async function fillMatch(p,wrong=false){const picks=await p.evaluate(wrong=>G.data.journal.pairs.map(pair=>({slot:pair.id,pick:G.data.wishes.find(w=>!w.dreamHidden&&(wrong?w.id!==pair.wish:w.id===pair.wish)).name})),wrong);assert.equal(picks.length,5);for(const x of picks){await p.locator('[data-slot="'+x.slot+'"]').click();await p.locator('[data-choice="'+x.pick+'"]').click()}}
async function failWriteAt(p,number=1){await p.evaluate(number=>{const original=Storage.prototype.setItem;let count=0;Storage.prototype.setItem=function(...args){count++;if(count===number)throw new DOMException('quota','QuotaExceededError');return original.apply(this,args)}},number)}
const failNextWrite=p=>failWriteAt(p,1);
const picked=p=>p.evaluate(()=>({option:document.querySelector('.interp-opt.chosen')?.dataset.opt,evidence:document.querySelector('.ev-opt.chosen')?.dataset.ev}));
async function teacherMode(p,enabled){
  await p.locator('[data-tool="settings"]').click();
  if((await state(p)).teacher!==enabled)await p.locator('[data-set="teacher"]').click();
  await p.keyboard.press('Escape');
}
async function holdFonts(p){
  await p.evaluate(()=>{
    const descriptor=Object.getOwnPropertyDescriptor(document.fonts,'ready');
    const gate=new Promise(resolve=>window.releaseT9Fonts=resolve);
    Object.defineProperty(document.fonts,'ready',{configurable:true,get:()=>gate});
    window.restoreT9Fonts=()=>{if(descriptor)Object.defineProperty(document.fonts,'ready',descriptor);else delete document.fonts.ready};
  });
}
async function noDownload(p,action){
  const event=p.waitForEvent('download',{timeout:500}).then(()=>true,error=>{if(error.name!=='TimeoutError')throw error;return false});
  await action();assert.equal(await event,false,'차단되어야 하는 PNG 다운로드');
}
async function resultFixture(p,saved){
  await p.goto(origin+'/index.html');await ready(p);
  await p.evaluate(saved=>localStorage.setItem(G.save.key,JSON.stringify(saved)),saved);
  await p.reload();await ready(p);await p.getByRole('button',{name:'이어 하기',exact:true}).click();
  await p.waitForSelector('.journal-page');
  await p.waitForFunction(()=>{const images=[...document.querySelectorAll('[data-trace-image] img')];return images.length===2&&images.every(img=>img.complete&&img.naturalWidth)});
  await p.evaluate(()=>document.fonts.ready);
}
async function exportProbe(p,phase){
  await p.evaluate(phase=>{
    window.t9Export={texts:[],urls:0,decodes:0};
    const fill=CanvasRenderingContext2D.prototype.fillText,create=URL.createObjectURL;
    CanvasRenderingContext2D.prototype.fillText=function(...args){t9Export.texts.push(String(args[0]));return fill.apply(this,args)};
    URL.createObjectURL=function(...args){t9Export.urls++;return create.apply(this,args)};
    if(phase==='images'){
      const images=[...document.querySelectorAll('[data-trace-image] img')];
      let release;const gate=new Promise(resolve=>release=resolve);
      const descriptors=images.map(img=>({complete:Object.getOwnPropertyDescriptor(img,'complete'),decode:Object.getOwnPropertyDescriptor(img,'decode')}));
      images.forEach(img=>{Object.defineProperty(img,'complete',{configurable:true,get:()=>false});img.decode=()=>{t9Export.decodes++;return gate}});
      window.releaseT9Export=()=>{images.forEach((img,i)=>{for(const key of ['complete','decode']){const d=descriptors[i][key];if(d)Object.defineProperty(img,key,d);else delete img[key]}});release()};
    }else if(phase==='blob'){
      const toBlob=HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob=function(callback,...args){return toBlob.call(this,blob=>{window.releaseT9Export=()=>callback(blob)},...args)};
    }
  },phase);
  if(phase==='fonts'){
    await holdFonts(p);
    await p.evaluate(()=>{window.releaseT9Export=()=>{releaseT9Fonts();restoreT9Fonts()}});
  }
}

try{
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage();observe(page);
 await test('동결 일지·맞대기 첫/부분 저장 실패 뒤 멱등 재시도',async()=>{await installFixture(page,['chae']);assert.equal(await page.evaluate(()=>Object.isFrozen(G.save.state)&&Object.isFrozen(G.save.state.journal)),true);await fillMatch(page,true);const before=await state(page),raw=await page.evaluate(()=>localStorage.getItem(G.save.key));await failNextWrite(page);await page.locator('[data-act="check"]').click();assert.deepEqual(await state(page),before);assert.equal(await page.evaluate(()=>localStorage.getItem(G.save.key)),raw);assert.equal(await page.locator('.slot.wrong').count(),0);assert.equal(await page.locator('[data-act="check"]').isEnabled(),true);await page.locator('[data-act="check"]').click();assert.ok(await page.locator('.slot.wrong').count());await page.locator('[data-help="memo"]').click();await page.locator('[data-help="answer"]').click();await page.locator('[data-act="check"]').click();let saved=await state(page);assert.deepEqual(saved.ledger['j-match'],{first:false,help:'student',final:true});assert.equal(saved.journal.match.tries,2);await installFixture(page,['chae']);await fillMatch(page,true);await failWriteAt(page,4);await page.locator('[data-act="check"]').click();saved=await state(page);assert.equal(saved.ledger['j-match'].first,false);assert.equal(saved.journal.match.tries,1);assert.equal(saved.wrong.filter(e=>e.act==='j-match').length,1);const firstWrong=structuredClone(saved.wrong[0]);assert.equal(await page.locator('.slot.wrong').count(),5);await page.locator('[data-act="check"]').click();await page.locator('[data-help="memo"]').click();await page.locator('[data-help="answer"]').click();await page.locator('[data-act="check"]').click();saved=await state(page);assert.equal(saved.journal.match.tries,2);assert.equal(saved.wrong.filter(e=>e.act==='j-match').length,5);assert.equal(new Set(saved.wrong.filter(e=>e.act==='j-match').map(e=>e.slot)).size,5);assert.deepEqual(saved.wrong.find(e=>e.act===firstWrong.act&&e.slot===firstWrong.slot),firstWrong);assert.deepEqual(saved.ledger['j-match'],{first:false,help:'student',final:true});assert.equal((await current(page)).step,'journal-bond')});
 await test('미색 공개·해석 확인값 잠금·최종 저장 실패 재시도',async()=>{assert.equal(await page.evaluate(()=>G.app.wishes().find(w=>w.id==='misaek').hidden),true);await page.locator('.link-opt:not([disabled])').first().click();assert.equal(await page.evaluate(()=>G.app.wishes().find(w=>w.id==='misaek').hidden),false);await next(page);if((await current(page)).step==='chapter')await next(page);await until(page,async()=>(await current(page)).step==='interp-pick','interp-pick');await page.locator('.interp-opt').first().click();await page.locator('.ev-opt').first().click();const visibleFirst=await picked(page),before=await state(page),raw=await page.evaluate(()=>localStorage.getItem(G.save.key));await failNextWrite(page);await next(page);await page.waitForSelector('#tray [data-act="next"]');assert.deepEqual(await state(page),before);assert.equal(await page.evaluate(()=>localStorage.getItem(G.save.key)),raw);assert.equal(await page.locator('.interp-opt.chosen, .ev-opt.chosen').count(),2);assert.equal(await page.locator('.interp-opt:not([disabled]), .ev-opt:not([disabled])').count(),0);await page.locator('.interp-opt').nth(1).evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await page.locator('.interp-opt.chosen').getAttribute('data-opt'),await page.locator('.interp-opt').first().getAttribute('data-opt'));await next(page);await until(page,async()=>(await current(page)).step==='interp-revise','interp-revise');const first=(await state(page)).interp.first;assert.deepEqual(first,visibleFirst);await page.locator('[data-act="revise"]').click();await page.locator('.interp-opt').nth(1).click();await page.locator('.ev-opt[data-ev="E9"]').click();const visibleChanged=await picked(page);await failNextWrite(page);await next(page);await page.waitForSelector('#tray [data-act="next"]');assert.deepEqual((await state(page)).interp,{first,heard:true,changed:null,revised:false});assert.equal(await page.locator('.interp-opt:not([disabled]), .ev-opt:not([disabled])').count(),0);await next(page);await until(page,async()=>(await current(page)).scene==='r-result','r-result');const interp=(await state(page)).interp;assert.equal(interp.final,true);assert.equal(interp.revised,true);assert.deepEqual(interp.first,first);assert.deepEqual(interp.changed,visibleChanged)});
 await test('결과 DOM·PNG 같은 대비 모델·이름 재저장·14행 장부',async()=>{await page.waitForSelector('.journal-page');await page.waitForFunction(()=>[...document.querySelectorAll('[data-trace-image] img')].every(img=>img.complete&&img.naturalWidth));assert.deepEqual(await page.locator('[data-trace-image]').evaluateAll(ns=>ns.map(n=>n.dataset.traceImage)),['map-chwimi','map-cell']);assert.equal(await page.locator('.ledger tbody tr').count(),14);const text=await page.locator('.journal-page').innerText();assert.doesNotMatch(text,/꿈에서 쌓은 것|깨고 남은 것\s*0|최고 꿈 점수/);assert.match(text,/취미궁에서 누린 삶/);assert.match(text,/깨어난 뒤의 선방/);assert.doesNotMatch(text,/e08-wonsu:appointment|e11-seungsang:/);await page.locator('.name-in').fill('검증');await failNextWrite(page);await page.locator('.name-in').fill('미저장입력');assert.equal((await state(page)).name,'검증');let download=page.waitForEvent('download');await page.locator('[data-act="save-image"]').click();assert.equal((await download).suggestedFilename(),'구운몽_꿈일지_미저장입력.png');assert.equal((await state(page)).name,'미저장입력');await page.locator('.name-in').fill('가나다라마바사아자차카타파하/긴이름');const rendered=await page.evaluate(()=>{const texts=[],fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...a){texts.push(String(a[0]));return fill.apply(this,a)};try{const c=G.app.renderPage();return{width:c.width,height:c.height,png:c.toDataURL('image/png'),texts}}finally{CanvasRenderingContext2D.prototype.fillText=fill}});assert.equal(rendered.width,900);assert.ok(rendered.height>900);assert.match(rendered.png,/^data:image\/png;base64,iVBOR/);const painted=rendered.texts.join(' ');for(const word of ['취미궁에서 누린 삶','깨어난 뒤의 선방','근거 구절','고친 흔적','소원','구슬','도움 안내'])assert.ok(painted.includes(word),word);assert.doesNotMatch(painted,/깨고 남은 것\s*0|최고 꿈 점수/);download=page.waitForEvent('download');await page.locator('[data-act="save-image"]').click();assert.equal((await download).suggestedFilename(),'구운몽_꿈일지_가나다라마바사아자차카타파하긴이름.png');const before=await state(page);await page.locator('details.comparison-reading summary').click();assert.deepEqual(await state(page),before);await page.evaluate(()=>{
  window.t9Paint=[];
  const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(...args){window.t9Paint.push(String(args[0]));return fill.apply(this,args)};
  window.restoreT9Paint=()=>CanvasRenderingContext2D.prototype.fillText=fill;
});
await page.locator('.name-in').fill('클릭당시');
await holdFonts(page);
await page.locator('[data-act="save-image"]').click();
assert.deepEqual(await page.evaluate(()=>t9Paint),[],'글꼴 준비 전에는 그리지 않음');
await page.locator('.name-in').fill('대기중변경');
download=page.waitForEvent('download');
await page.evaluate(()=>{releaseT9Fonts();restoreT9Fonts()});
assert.equal((await download).suggestedFilename(),'구운몽_꿈일지_클릭당시.png');
const clickPaint=await page.evaluate(()=>t9Paint.join(' '));
assert.match(clickPaint,/이름  클릭당시/);assert.doesNotMatch(clickPaint,/대기중변경/);
assert.equal((await state(page)).name,'대기중변경');
await page.evaluate(()=>{t9Paint.length=0;const original=Storage.prototype.setItem;window.restoreT9Write=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')}});
const blockedState=await state(page),blockedRaw=await page.evaluate(()=>localStorage.getItem(G.save.key));
await page.locator('.name-in').fill('계속실패');
await noDownload(page,()=>page.locator('[data-act="save-image"]').click());
assert.deepEqual(await state(page),blockedState);assert.equal(await page.evaluate(()=>localStorage.getItem(G.save.key)),blockedRaw);
assert.equal(await page.locator('.name-in').inputValue(),'계속실패');assert.deepEqual(await page.evaluate(()=>t9Paint),[]);
await page.evaluate(()=>restoreT9Write());
download=page.waitForEvent('download');await page.locator('[data-act="save-image"]').click();
assert.equal((await download).suggestedFilename(),'구운몽_꿈일지_계속실패.png');
assert.match(await page.evaluate(()=>t9Paint.join(' ')),/이름  계속실패/);
await page.evaluate(()=>{t9Paint.length=0});
await holdFonts(page);await page.locator('[data-act="save-image"]').click();
await noDownload(page,async()=>{await page.evaluate(()=>G.app.title());await page.evaluate(()=>{releaseT9Fonts();restoreT9Fonts()})});
assert.deepEqual(await page.evaluate(()=>t9Paint),[],'글꼴 대기 중 이탈하면 그리지 않음');
await page.getByRole('button',{name:'이어 하기',exact:true}).click();await page.waitForSelector('.journal-page');
await page.evaluate(()=>restoreT9Paint());
await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;window.restoreT9Blob=()=>{HTMLCanvasElement.prototype.toBlob=original};HTMLCanvasElement.prototype.toBlob=function(callback,...args){return original.call(this,blob=>{window.finishT9Blob=()=>callback(blob)},...args)}});await page.locator('[data-act="save-image"]').click();await page.waitForFunction(()=>typeof window.finishT9Blob==='function');const staleDownload=page.waitForEvent('download',{timeout:500}).then(()=>true,()=>false);await page.evaluate(()=>G.app.title());await page.evaluate(()=>{finishT9Blob();restoreT9Blob()});assert.equal(await staleDownload,false,'이탈한 결과 화면의 늦은 PNG 다운로드 차단')});
 await test('reader·이전 회차·확정 해석 불변',async()=>{const reader=await context.newPage();observe(reader);await reader.goto(page.url());await ready(reader);assert.equal(await reader.evaluate(()=>G.save.access),'reader');const before=await state(reader),raw=await reader.evaluate(()=>localStorage.getItem(G.save.key));assert.deepEqual(await reader.evaluate(()=>({current:G.save.transact(G.save.state.rpg.run,d=>{d.name='reader'}),stale:G.save.transact('old-run',d=>{d.name='stale'})})),{current:false,stale:false});assert.deepEqual(await state(reader),before);assert.equal(await reader.evaluate(()=>localStorage.getItem(G.save.key)),raw);await reader.close();const locked=(await state(page)).interp;await page.evaluate(()=>G.app.open('c5-dialogue'));await until(page,async()=>{assert.equal(await page.locator('[data-act="revise"]').count(),0);return(await current(page)).scene==='r-result'},'확정 해석 replay');assert.deepEqual((await state(page)).interp,locked)});
 await test('검증되지 않은 완료·자동 안내를 새 수행 완료로 표시하지 않음',async()=>{await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem(G.save.key));saved.done['e04-exam']=true;saved.rpg.scenes['e04-exam']={status:'done',beat:null,actions:[],hint:null};saved.rpg.scenes['e08-wonsu']={status:'auto',beat:null,actions:[],hint:'teacher'};localStorage.setItem(G.save.key,JSON.stringify(saved))});await page.reload();await ready(page);const rows=await page.evaluate(()=>G.app.ledgerRows().filter(row=>row.id==='e04-exam'||row.id==='e08-wonsu').map(row=>({id:row.id,status:row.status,firstLabel:row.firstLabel})));assert.deepEqual(rows,[{id:'e04-exam',status:'진행',firstLabel:'진행'},{id:'e08-wonsu',status:'자동 안내',firstLabel:'자동 안내'}]);assert.equal(await page.evaluate(()=>G.save.state.done['e04-exam']),undefined)});

 await test('교사 모드 해제 때 일지·해석 입력 보존과 교사 도움 불변',async()=>{
   await installFixture(page,['chae']);await teacherMode(page,true);await fillMatch(page,true);
   const draft=(await state(page)).journal.match;
   const beforeSlots=await page.locator('.slot .v').allTextContents();
   await teacherMode(page,false);
   assert.deepEqual((await state(page)).journal.match,draft);
   assert.deepEqual(await page.locator('.slot .v').allTextContents(),beforeSlots);
   await teacherMode(page,true);await page.locator('[data-teacher="fill"]').click();
   assert.deepEqual((await state(page)).ledger['j-match'],{first:null,help:'teacher',final:false});
   await page.locator('[data-act="check"]').click();
   assert.deepEqual((await state(page)).ledger['j-match'],{first:null,help:'teacher',final:true});
   await teacherMode(page,false);
   const locked=(await state(page)).ledger['j-match'];
   await page.locator('.link-opt:not([disabled])').first().click();await next(page);
   await until(page,async()=>(await current(page)).step==='interp-pick','teacher-off interp');
   await teacherMode(page,true);await page.locator('.interp-opt').nth(2).click();await page.locator('.ev-opt').nth(2).click();
   const visible=await picked(page),before=(await state(page)).interp;
   await teacherMode(page,false);assert.deepEqual(await picked(page),visible);assert.deepEqual((await state(page)).interp,before);
   await next(page);await until(page,async()=>(await current(page)).step==='interp-revise','teacher-off response');
   assert.deepEqual((await state(page)).interp.first,visible);assert.deepEqual((await state(page)).ledger['j-match'],locked);
 });
 await test('취소된 활동·이전 회차 콜백과 readonly 일지 불변',async()=>{
   await installFixture(page);await fillMatch(page,true);
   await page.evaluate(()=>{window.t9OldChoice=document.querySelector('[data-choice]');window.t9OldCheck=document.querySelector('[data-act="check"]')});
   const oldRun=(await state(page)).rpg.run;
   await page.evaluate(()=>G.save.reset(G.save.state.rpg.run,{confirmed:true,cancel:()=>G.app.title()}));
   const resetState=await state(page),raw=await page.evaluate(()=>localStorage.getItem(G.save.key));
   assert.notEqual(resetState.rpg.run,oldRun);
   await page.evaluate(()=>{t9OldChoice.click();t9OldCheck.click()});
   assert.deepEqual(await state(page),resetState);assert.equal(await page.evaluate(()=>localStorage.getItem(G.save.key)),raw);
   await installFixture(page);await fillMatch(page);await page.locator('[data-act="check"]').click();
   await page.locator('.link-opt:not([disabled])').first().click();await next(page);
   await page.evaluate(()=>G.app.open('c4-journal'));await page.waitForSelector('.activity');
   const completed=await state(page),completedRaw=await page.evaluate(()=>localStorage.getItem(G.save.key));
   assert.equal(await page.locator('.slot').count(),5);
   assert.ok(await page.locator('.choice').count()>0);
   assert.equal(await page.locator('.slot:not([disabled]), .choice:not([disabled])').count(),0);
   await page.locator('.choice').first().evaluate(button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
   assert.deepEqual(await state(page),completed);assert.equal(await page.evaluate(()=>localStorage.getItem(G.save.key)),completedRaw);
 });
 await test('reader 결과의 이름·해석·근거·장부 표시와 입력 차단',async()=>{
   await page.evaluate(()=>G.app.open('c5-dialogue'));
   await until(page,async()=>(await current(page)).step==='interp-pick','readonly result preparation');
   await page.locator('.interp-opt').first().click();await page.locator('.ev-opt').first().click();await next(page);
   await until(page,async()=>(await current(page)).step==='interp-revise','readonly result response');
   await next(page);await until(page,async()=>(await current(page)).scene==='r-result','readonly result');
   await page.locator('.name-in').fill('읽기전용표시');
   const expected=await page.evaluate(()=>G.app.lastPage()),writerBefore=await state(page);
   const reader=await context.newPage();observe(reader);
   try{
     await reader.goto(origin+'/index.html');await ready(reader);
     assert.equal(await reader.evaluate(()=>G.save.access),'reader');
     const before=await state(reader),raw=await reader.evaluate(()=>localStorage.getItem(G.save.key));
     await reader.getByRole('button',{name:'이어 하기',exact:true}).click();await reader.waitForSelector('.journal-page');
     assert.equal(await reader.locator('.play').getAttribute('data-access'),'reader');
     assert.equal(await reader.locator('.name-in').isDisabled(),true);
     assert.equal(await reader.locator('.name-in').inputValue(),expected.name);
     assert.equal(await reader.locator('.jp-interp').innerText(),expected.interp);
     assert.equal(await reader.locator('.jp-ev').innerText(),expected.evidence);
     assert.equal(await reader.locator('.ledger tbody tr').count(),14);
     assert.equal(await reader.locator('[data-act="revise"]').count(),0);
     assert.equal(await reader.locator('.main-inner').evaluate(el=>el.inert),true);
     await reader.locator('.name-in').evaluate(input=>{input.value='저장금지';input.dispatchEvent(new Event('input',{bubbles:true}))});
     assert.deepEqual(await state(reader),before);assert.equal(await reader.evaluate(()=>localStorage.getItem(G.save.key)),raw);
     assert.deepEqual(await state(page),writerBefore);
     await reader.locator('.name-in').evaluate((input,name)=>input.value=name,expected.name);
     await reader.screenshot({path:path.join(SHOTS,'t9-readonly-result.png')});
   }finally{await reader.close()}
 });
 await test('PNG 초기화 취소·그림 대기 이탈·Blob 클릭 시점 이름 일치',async()=>{
   const saved=await state(page);
   for(const phase of ['fonts','images','blob']){
     const isolated=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),p=await isolated.newPage();observe(p);
     try{
       await resultFixture(p,saved);await exportProbe(p,phase);
       const oldRun=(await state(p)).rpg.run;
       await p.locator('[data-act="save-image"]').click();
       await p.waitForFunction(()=>typeof window.releaseT9Export==='function');
       if(phase==='images')assert.equal(await p.evaluate(()=>t9Export.decodes),2);
       if(phase!=='blob')assert.deepEqual(await p.evaluate(()=>t9Export.texts),[]);
       else assert.ok((await p.evaluate(()=>t9Export.texts)).length>10);
       assert.equal(await p.evaluate(()=>G.save.reset(G.save.state.rpg.run,{confirmed:true,cancel:()=>G.app.title()})),true);
       const after=await state(p),raw=await p.evaluate(()=>localStorage.getItem(G.save.key));
       assert.notEqual(after.rpg.run,oldRun);assert.equal(after.awake,false);
       await noDownload(p,()=>p.evaluate(()=>releaseT9Export()));
       assert.equal(await p.evaluate(()=>t9Export.urls),0);
       if(phase!=='blob')assert.deepEqual(await p.evaluate(()=>t9Export.texts),[]);
       assert.deepEqual(await state(p),after);assert.equal(await p.evaluate(()=>localStorage.getItem(G.save.key)),raw);
       console.log('  PNG reset '+phase+': download=0, objectURL=0, state/raw unchanged');
     }finally{await isolated.close()}
   }
   const isolated=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),p=await isolated.newPage();observe(p);
   try{
     await resultFixture(p,saved);await exportProbe(p,'images');await p.locator('[data-act="save-image"]').click();
     assert.equal(await p.evaluate(()=>t9Export.decodes),2);
     await noDownload(p,async()=>{await p.evaluate(()=>G.app.title());await p.evaluate(()=>releaseT9Export())});
     assert.deepEqual(await p.evaluate(()=>t9Export),{texts:[],urls:0,decodes:2});
     await resultFixture(p,saved);await p.locator('.name-in').fill('클릭스냅샷');await exportProbe(p,'blob');
     await p.locator('[data-act="save-image"]').click();await p.waitForFunction(()=>typeof window.releaseT9Export==='function');
     await p.locator('.name-in').fill('나중에입력');
     const download=p.waitForEvent('download');await p.evaluate(()=>releaseT9Export());const file=await download;
     assert.equal(file.suggestedFilename(),'구운몽_꿈일지_클릭스냅샷.png');
     assert.match(await p.evaluate(()=>t9Export.texts.join(' ')),/이름  클릭스냅샷/);
     assert.doesNotMatch(await p.evaluate(()=>t9Export.texts.join(' ')),/나중에입력/);
     assert.equal((await state(p)).name,'나중에입력');
     await file.saveAs(path.join(SHOTS,'t9-click-snapshot-blob.png'));
     console.log('  PNG blob snapshot: filename/paint=클릭스냅샷, saved=나중에입력');
   }finally{await isolated.close()}
 });
 // 5장 되짚기·E11·결과 모델(명세 8·9절). 합성 저장은 회귀 fixture이며 학생 완주 증거가 아니다.
 const PEAK_RGB=[176,120,40];
 const RECAP_A=['꿈에서 네가 고른 말은 부귀 쪽 말 한 번, 소원을 그대로 둔 말 한 번이었다.','선생님 도움으로 넘긴 대목도 있었다.','선녀와 귀신이 한 사람의 꾸밈임을 처음부터 알아보았지.','자객이 숨은 곳은 촛불이 다 꺼지도록 찾지 못했지.','처음 바란 것은 풍류, 꿈에서 가장 차오른 것은 출장입상·부귀.'];
 const RECAP_B=['꿈속의 갈림길은 모두 선생님의 도움으로 지나왔구나.','꿈에서 가장 차오른 것은 출장입상·부귀·공명.'];
 const ASK='그 삶은 처음 바라던 삶과 같았느냐?',FIRST_LINE='사람의 세상을 겪어 보니 어떠했느냐?';
 const E11_A='꿈에서 나는 부귀 쪽 말·소원을 그대로 둔 말을 가장 많이 골랐다.';
 async function interpFixture(p,play,teacherScene){
   await p.goto(origin+'/index.html');await ready(p);
   await p.evaluate(({play,teacherScene})=>{const saved=JSON.parse(JSON.stringify(G.save.state)),list=G.app.list(),stop=list.findIndex(s=>s.id==='c5-dialogue');saved.started=true;saved.pos='c5-dialogue';saved.step='scene';saved.reach=5;saved.awake=true;saved.awakeAt=1700000000123;saved.done={};saved.items=[];saved.bonds=[];saved.pearls={};saved.rpg.cursor=null;saved.rpg.scenes={};for(const scene of list.slice(0,stop)){saved.done[scene.id]=true;const exp=G.experience.find(G.data,scene.id);if(!exp)continue;saved.rpg.scenes[scene.id]={status:'done',beat:null,actions:exp.beats.map(b=>({id:b.id,by:teacherScene===scene.id?'teacher':'student'})),hint:null};for(const beat of exp.beats)for(const effect of beat.effects||[]){if(effect.kind==='item'&&!saved.items.includes(effect.id))saved.items.push(effect.id);if(effect.kind==='bond'&&!saved.bonds.includes(effect.id))saved.bonds.push(effect.id)}}saved.ledger={'a-wish':{first:true,help:null,final:true},'j-match':{first:true,help:null,final:true}};saved.journal={wish:{selected:G.data.scenes.find(s=>s.id==='c1-wish').answers.slice(),wrong:0},bondLink:'misaek',revealed:{misaek:true}};saved.interp={};saved.wrong=[];saved.name='';saved.finishedAt=0;saved.play=play;localStorage.setItem(G.save.key,JSON.stringify(saved))},{play,teacherScene});
   await p.reload();await ready(p);assert.deepEqual((await state(p)).play,play,'fixture play 보존');
   await p.getByRole('button',{name:'이어 하기',exact:true}).click();await p.waitForSelector('.play[data-scene="c5-dialogue"]');
 }
 async function recapDialogue(p){const lines=[];for(let i=0;i<60;i++){const c=await current(p);if(c.step==='interp-pick')return lines;const box=p.locator('.stage-dialogue');if(c.step==='interp-dialogue'&&await box.count()){const text=(await box.innerText()).trim();lines.push(text);await next(p);await p.waitForFunction(prev=>(document.querySelector('.stage-dialogue')?.innerText||'').trim()!==prev||G.app.current().step!=='interp-dialogue',text)}else await advance(p)}throw Error('interp-pick 도달 실패')}
 async function toResult(p,option,evidence,revisedCount){
   await p.locator('.interp-opt[data-opt="'+option+'"]').click();await p.locator('.ev-opt[data-ev="'+evidence+'"]').click();await next(p);
   await until(p,async()=>(await current(p)).step==='interp-revise','interp-revise');
   await p.locator('[data-act="revise"]').click();assert.equal(await p.locator('.ev-opt').count(),revisedCount,'응답 뒤 근거 수');
   const shown=await p.locator('.ev-opt').evaluateAll(ns=>ns.map(n=>n.dataset.ev));
   await p.locator('.interp-opt[data-opt="'+option+'"]').click();await p.locator('.ev-opt[data-ev="'+evidence+'"]').click();await next(p);
   await until(p,async()=>(await current(p)).scene==='r-result','r-result');await p.waitForSelector('.journal-page');
   await p.waitForFunction(()=>[...document.querySelectorAll('[data-trace-image] img')].every(img=>img.complete&&img.naturalWidth));
   return shown;
 }
 // 실제 내려받은 PNG에서 막대 색 줄을 세로 띠로 묶어 각 막대의 가장 긴 가로 길이를 잰다.
 async function downloadedPng(p,tag){
   await p.evaluate(()=>{window.t7Paint=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...a){t7Paint.push(String(a[0]));return fill.apply(this,a)}});
   const download=p.waitForEvent('download');await p.locator('[data-act="save-image"]').click();const file=await download;
   const target=path.join(SHOTS,'t7-result-'+tag+'.png');await file.saveAs(target);const bytes=fs.readFileSync(target);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG 서명');
   const scan=await p.evaluate(async({b64,rgb})=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,c.width,c.height).data;const bands=[];let open=null;for(let y=600;y<c.height;y++){let best=0,run=0;for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i]===rgb[0]&&d[i+1]===rgb[1]&&d[i+2]===rgb[2]&&d[i+3]===255){run++;best=Math.max(best,run)}else run=0}if(best>=8){if(!open){open={y,width:0};bands.push(open)}open.width=Math.max(open.width,best)}else open=null}return{width:c.width,height:c.height,bands}},{b64:bytes.toString('base64'),rgb:PEAK_RGB});
   const texts=await p.evaluate(()=>t7Paint);return{scan,texts,bytes:bytes.length};
 }
 async function resultSections(p){return p.evaluate(()=>{const t=s=>document.querySelector(s)?.innerText.trim()??null;const bars=[...document.querySelectorAll('.result-peak [data-peak]')].map(row=>{const fill=row.querySelector('.peak-fill'),track=fill?.parentElement;return{wish:row.dataset.peak,ratio:fill&&track?fill.getBoundingClientRect().width/track.clientWidth:null,empty:!!row.querySelector('.peak-empty'),label:row.getAttribute('aria-label')||''}});return{secret:t('.result-secret'),peak:t('.result-peak'),recap:t('.result-recap'),bonds:t('.result-bonds'),ev:t('.jp-ev'),trace:t('.dream-trace-evidence'),bars,rows:document.querySelectorAll('.ledger tbody tr').length}})}
 await test('5장 되짚기(혼합·동률·첫 결과)·E11 8/11·결과와 실제 PNG의 숨긴 소원·막대·되짚기',async()=>{
   const isolated=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),p=await isolated.newPage();observe(p);
   try{
     const play={secretWish:'pungryu',choices:{'ch-tianjin-poem':{option:'boast'},'ch-yoyeon-reply':{option:'calm'}},firsts:{'ch-chunun-ghost':{ok:true,clues:1},'ch-yoyeon-night':{ok:false,tried:[]}},peak:{chuljang:4,bugwi:4,pungryu:2,gongmyeong:1}};
     await interpFixture(p,play,'e10-neungpa');
     const lines=await recapDialogue(p);
     assert.deepEqual(lines.slice(0,RECAP_A.length+2),[...RECAP_A,ASK,FIRST_LINE],'되짚기 줄 차례');
     assert.equal(await p.locator('.ev-opt').count(),8,'응답 전 근거 8');
     assert.equal((await p.locator('.ev-opt[data-ev="E11"]').innerText()).split('\n')[0].trim(),E11_A);
     assert.doesNotMatch(await p.locator('.interp-pick-box').innerText(),/\{|\}/);
     const shown=await toResult(p,'i-own','E11',11);assert.ok(shown.includes('E11'));
     assert.deepEqual((await state(p)).interp.first,{option:'i-own',evidence:'E11'},'저장은 근거 id만');
     const dom=await resultSections(p);
     assert.equal(dom.ev,E11_A,'결과 근거는 다시 만든 E11');assert.ok(dom.trace.includes(E11_A));
     assert.match(dom.secret,/숨긴 소원/);assert.match(dom.secret,/풍류/);
     assert.match(dom.peak,/가장 찼던 소원 → 빈 선방/);assert.doesNotMatch(dom.peak,/\d|%/,'막대에 숫자 없음');
     assert.deepEqual(dom.bars.map(b=>b.wish),['chuljang','bugwi','pungryu','gongmyeong']);
     dom.bars.forEach((b,i)=>{assert.ok(Math.abs(b.ratio-[1,1,.5,.25][i])<.02,'DOM 막대 '+b.wish+' '+b.ratio);assert.ok(b.empty,'빈 선방 막대');assert.doesNotMatch(b.label,/\d/)});
     for(const line of RECAP_A)assert.ok(dom.recap.includes(line),'결과 되짚기 '+line);assert.ok(!dom.recap.includes(ASK),'결과 되짚기는 1~3');
     assert.match(dom.bonds,/꿈에서 만난 인연/);assert.doesNotMatch(dom.bonds,/\d|칸|모두|명/,'인연 수 세기 없음');
     const met=await p.evaluate(()=>G.data.bonds.filter(b=>G.save.state.bonds.includes(b.id)).map(b=>b.name));assert.ok(met.length>0);for(const name of met)assert.ok(dom.bonds.includes(name),'인연 이름 '+name);
     assert.equal(dom.rows,14,'장부 14행');
     assert.doesNotMatch(await p.locator('.ledger').innerText(),/숨긴 소원|되짚기|부귀 쪽 말/,'장부에 선택·숨긴 소원 없음');
     const model=await p.evaluate(()=>G.app.lastPage());assert.equal(model.evidence,E11_A);assert.deepEqual(model.recap,RECAP_A);
     const png=await downloadedPng(p,'mixed');
     assert.equal(png.scan.width,900);
     assert.equal(png.scan.bands.length,4,'PNG 막대 넷 '+JSON.stringify(png.scan.bands));
     const full=png.scan.bands[0].width;png.scan.bands.forEach((b,i)=>assert.ok(Math.abs(b.width/full-[1,1,.5,.25][i])<.02,'PNG 막대 비율 '+JSON.stringify(png.scan.bands)));
     // 긴 줄은 PNG 폭에 맞춰 나뉘므로(나뉜 자리의 띄어쓰기 생략) 빈칸을 뺀 이어 붙인 글에서 찾는다.
     const flat=s=>s.replace(/\s+/g,''),painted=flat(png.texts.join(''));
     for(const word of ['숨긴 소원','풍류','가장 찼던 소원 → 빈 선방','육관대사의 되짚기','꿈에서 만난 인연',E11_A,...RECAP_A,...met])assert.ok(painted.includes(flat(word)),'PNG 글 '+word);
     assert.ok(!painted.includes(flat(ASK)));
     assert.deepEqual(png.texts.filter(t=>t!==model.date&&/\d/.test(t)),[],'PNG에 날짜 밖 숫자 없음');
     console.log('  T7 혼합: 되짚기 '+RECAP_A.length+'줄+물음, 근거 8/11, PNG '+png.bytes+'B 막대 '+png.scan.bands.map(b=>b.width).join('/'));
   }finally{await isolated.close()}
 });
 await test('기록 없는 5장: 선생님 도움 줄·E11 숨김 7/10·결과 고르지 않음',async()=>{
   const isolated=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),p=await isolated.newPage();observe(p);
   try{
     const play={secretWish:null,choices:{},firsts:{},peak:{chuljang:2,bugwi:2,pungryu:1,gongmyeong:2}};
     await interpFixture(p,play,null);
     const lines=await recapDialogue(p);
     assert.deepEqual(lines.slice(0,RECAP_B.length+2),[...RECAP_B,ASK,FIRST_LINE]);
     assert.equal(await p.locator('.ev-opt').count(),7,'기록 없음 응답 전 근거 7');assert.equal(await p.locator('.ev-opt[data-ev="E11"]').count(),0);
     await toResult(p,'i-vain','E5',10);
     const dom=await resultSections(p);
     assert.match(dom.secret,/고르지 않음/);for(const line of RECAP_B)assert.ok(dom.recap.includes(line));
     assert.doesNotMatch(await p.locator('.journal-page').innerText(),/가장 많이 골랐다|\{top/);
     dom.bars.forEach((b,i)=>assert.ok(Math.abs(b.ratio-[.5,.5,.25,.5][i])<.02,'DOM 막대 '+b.wish));
     assert.equal(dom.rows,14);
     assert.equal(await p.evaluate(()=>G.play.e11(G.save.state,G.data)),null);
     const png=await downloadedPng(p,'none');
     const flat=s=>s.replace(/\s+/g,''),painted=flat(png.texts.join(''));for(const word of ['고르지 않음',...RECAP_B])assert.ok(painted.includes(flat(word)),'PNG 글 '+word);
     assert.ok(!painted.includes(flat('가장 많이 골랐다')),'기록 없으면 PNG에 E11 없음');
     assert.equal(png.scan.bands.length,4);
   }finally{await isolated.close()}
 });
 await context.close();
}catch(error){if(!errors.length)errors.push(error.stack);console.error('종속 시나리오 중단: '+error.message)}finally{await browser.close();await new Promise(r=>server.close(r))}
console.log('점검 묶음 '+passed+'/11 통과');if(errors.length)console.error(errors.join('\n'));process.exit(errors.length||passed!==11?1:0);
