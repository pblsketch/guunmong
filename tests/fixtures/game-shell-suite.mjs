import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness, ROOT, start, state, step, idle, dialogue, openTargets } from './rpg-harness.mjs';
const h = await harness(), shots = path.join(ROOT,'tests/shots'), evidence = [], failures = [];
const red = process.argv.includes('--red'), prefix = red ? 'game-shell-red' : 'game-shell';
let passed = 0;
async function test(name, fn) { try { await fn(); passed++; console.log('PASS ' + name); } catch(e) { failures.push({name,error:e.stack}); console.error('FAIL '+name+': '+e.message); } }
export async function shellGeometry(p) {
  return p.evaluate(() => {
    const rect = el => { const r=el.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const shell=document.querySelector('[data-game-shell]'), camera=document.querySelector('.world-camera'), field=document.querySelector('[data-game-field]');
    return { viewport:{width:innerWidth,height:innerHeight}, doc:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight}, shell:shell&&rect(shell),camera:camera&&rect(camera),field:field&&rect(field), mode:shell?.dataset.mode };
  });
}
try {
  for(const width of [320,390,820,1280]) {
    const p=await h.page('rpg-opening',{width,height:844},{hasTouch:true}); await start(p);
    const g=await shellGeometry(p); evidence.push({width,geometry:g});
    await p.screenshot({path:path.join(shots,prefix+'-world-'+width+'.png'),fullPage:true});
    await test(width+' fullscreen field/no document scroll',()=>{
      assert.ok(g.shell,'GameShell 없음'); assert.equal(g.shell.height,g.viewport.height);
      assert.ok(g.doc.height<=g.viewport.height+1&&g.doc.bodyHeight<=g.viewport.height+1,'게임 밖 페이지 스크롤');
      assert.ok(g.camera.height>=g.viewport.height-1,'필드가 전체 게임 영역이어야 함');
    });
    await test(width+' standing NPC child bounds',async()=>{
      const value=await p.locator('[data-object="bridge-fairy"]').evaluate(el=>{const r=el.getBoundingClientRect(),c=el.firstElementChild.getBoundingClientRect();return{dx:c.left-r.left,dy:c.top-r.top,width:c.width,buttonWidth:r.width};});
      evidence.push({width,npc:value}); assert.equal(value.dx,0); assert.equal(value.dy,0,'NPC 그림이 클릭 영역 아래로 이탈'); assert.equal(value.width,value.buttonWidth);
    });
    await test(width+' field without old control/document region',async()=>{
      assert.equal(await p.locator('.world-pad').isVisible(),false);
      assert.equal(await p.locator('.world-target-list').isVisible(),false);
      assert.equal(await p.locator('[data-help="next"]').isVisible(),false);
      assert.equal(await p.locator('[data-dialogue]').count(),0);
      assert.equal(await p.locator('.main-inner').evaluate(el=>el.children.length),0);
    });
    await test(width+' auxiliary menu within game viewport',async()=>{
      const hidden=await p.locator('.world-tools').evaluate(el=>{const r=el.getBoundingClientRect();return r.width<=1&&r.height<=1&&getComputedStyle(el).opacity==='0';});
      assert.equal(hidden,true,'조작 도구 단추는 평소 화면에 보이지 않음');
      await openTargets(p);
      const menu=await p.locator('.world-tools').boundingBox();
      assert.ok(menu.x>=0&&menu.y>=0&&menu.x+menu.width<=width&&menu.y+menu.height<=844);
      assert.equal(await p.locator('[data-world-target="bridge-fairy"]').isVisible(),true);
      const buttons=await p.locator('[data-world-target]').evaluateAll(els=>els.filter(el=>el.checkVisibility()).map(el=>el.getBoundingClientRect().toJSON()));
      assert.ok(buttons.length>0); assert.ok(buttons.every(r=>r.left>=menu.x&&r.right<=menu.x+menu.width));
      await p.locator('.world-tools > summary').focus(); await p.keyboard.press('Enter');
      await p.waitForFunction(()=>document.activeElement===document.querySelector('[data-world]'));
    });
    await p.context().close();
  }
  assert.deepEqual(h.errors,[]);
} finally {
  fs.writeFileSync(path.join(shots,prefix+'-observations.json'),JSON.stringify({passed,failures,evidence,errors:h.errors},null,2)); await h.close();
}
assert.deepEqual(failures,[]); console.log('GameShell '+passed+' cases passed');
