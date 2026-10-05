import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SHOTS, start, target, dialogue, state, ready } from './rpg-harness.mjs';

const finishBridge = async p => {
  await target(p, 'bridge-voice'); await dialogue(p);
  await target(p, 'bridge-exit'); await dialogue(p);
  await p.waitForSelector('#tray [data-act="next"]');
};
const durable = p => p.evaluate(() => localStorage.getItem(G.save.key));
const actor = p => p.locator('.world-actor').evaluate(el => ({ ...el.dataset }));

export async function completedInputs(h) {
  const failures = [];
  for (const mode of ['keyboard', 'touch', 'list']) {
    const p = await h.page('world-opening', { width: 390, height: 844 }, { hasTouch: mode === 'touch' });
    try {
      await start(p); await finishBridge(p);
      const before = await state(p), stored = await durable(p), displayed = await actor(p);
      assert.equal(before.done['c1-bridge'], true);
      assert.deepEqual(before.rpg.cursor, { scene: 'c1-cell', map: 'map-cell', x: 2, y: 5, facing: 'down' });
      assert.equal(await p.locator('.play').getAttribute('data-scene'), 'c1-bridge');
      if (mode === 'keyboard') {
        await p.locator('[data-world]').focus(); await p.keyboard.down('ArrowLeft');
        await p.waitForTimeout(450); await p.keyboard.up('ArrowLeft');
      } else if (mode === 'touch') {
        const world = p.locator('[data-world]'); await world.scrollIntoViewIfNeeded(); const rect = await world.boundingBox();
        assert.ok(rect?.width > 0 && rect.height > 0);
        const x = rect.x + rect.width / 12 * 8.5, y = rect.y + rect.height / 10 * 5.5;
        assert.equal(await world.evaluate((el, { x, y }) => document.elementFromPoint(x, y)?.closest('[data-world]') === el, { x, y }), true);
        await p.touchscreen.tap(x, y);
      } else {
        const button = p.locator('[data-world-target="front-table"]');
        assert.equal(await button.count(), 1, '실제 대상 단추 필수');
        assert.equal(await button.isEnabled(), false, '완료 뒤 대상 입력 중단');
        assert.equal(await button.isVisible(), false, '완료 뒤 보조 메뉴를 필드에서 제거');
        // 숨겨진 옛 단추의 콜백도 다음 장면 기록을 건드리지 않아야 한다.
        await button.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      }
      await p.waitForTimeout(500);
      const after = await state(p);
      console.log('완료 후 입력 ' + mode + ': ' + JSON.stringify({ before: before.rpg.cursor, after: after.rpg.cursor }));
      assert.deepEqual(after, before, mode + ': 이전 월드가 다음 장면의 기록을 바꾸면 안 됨');
      assert.equal(await durable(p), stored); assert.deepEqual(await actor(p), displayed);
      assert.equal(await p.locator('[data-world]').getAttribute('aria-disabled'), 'true');
      assert.equal(await p.locator('#tray [data-act="next"]').count(), 1);
      assert.equal(await p.locator('#tray [data-act="next"]').isEnabled(), true);
      await p.screenshot({ path: path.join(SHOTS, 't2-fix-completed-' + mode + '.png'), fullPage: true });
      await p.locator('#tray [data-act="next"]').click();
      await p.waitForSelector('.play[data-scene="c1-cell"] [data-world]');
      assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length, 2);
      console.log('PASS 완료 후 ' + mode + ' 입력 차단·다음 장소 유지');
    } catch (error) { console.log('FAIL 완료 후 ' + mode + ': ' + error.message); failures.push(error); }
    finally { await p.context().close(); }
  }
  assert.equal(failures.length, 0, '완료 후 입력 회귀 실패: ' + failures.map(e => e.message).join('\n'));
}

async function failWrites(p, call = 0) {
  await p.evaluate(call => {
    window.t2SetItem = Storage.prototype.setItem; window.t2WriteCount = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === G.save.key && (++window.t2WriteCount === call || call === 0)) throw Error('시험 저장 실패');
      return Reflect.apply(window.t2SetItem, this, [key, value]);
    };
  }, call);
}
const restoreWrites = p => p.evaluate(() => { Storage.prototype.setItem = window.t2SetItem; });

export async function errorMenus(h) {
  const failures = [];
  for (const mode of ['home', 'settings']) {
    const p = await h.page();
    try {
      await start(p); await finishBridge(p); await failWrites(p);
      await p.locator('#tray [data-act="next"]').click();
      await p.waitForSelector('[data-save-error][role="alert"]');
      const before = await state(p), stored = await durable(p);
      await p.evaluate(() => {
        window.t2ErrorPage = document.querySelector('.play');
        window.t2ErrorHome = document.querySelector('[data-tool="home"]');
        window.t2ErrorSettings = document.querySelector('[data-tool="settings"]');
        window.t2ErrorRetry = document.querySelector('[data-act="retry"]');
      });
      const button = p.locator('[data-tool="' + mode + '"]');
      assert.equal(await button.count(), 1); assert.equal(await button.isEnabled(), true);
      await button.click(); await p.waitForTimeout(120);
      const observed = await p.evaluate(() => ({ title: !!document.querySelector('.title-screen'), settings: !!document.querySelector('.settings-sheet'), error: !!document.querySelector('[data-save-error]') }));
      console.log('오류 화면 실제 ' + mode + ' click: ' + JSON.stringify(observed));
      if (mode === 'home') assert.equal(observed.title, true, '오류 화면 홈은 타이틀로 이동');
      else {
        assert.equal(observed.settings, true, '오류 화면 설정은 창 열기');
        await p.locator('[data-set="big"]').click();
        assert.deepEqual(await state(p), before, '저장 실패 중 설정 변경 거부');
        await p.locator('.settings-sheet').getByRole('button', { name: '닫기', exact: true }).click();
        assert.equal(await p.locator('.sheet-back').count(), 0);
        assert.equal(await p.locator('[data-save-error]').count(), 1);
        await p.evaluate(() => { window.t2ErrorSettings.remove(); window.t2ErrorSettings.click(); });
        assert.equal(await p.locator('.sheet-back').count(), 0, '현재 화면에서도 이탈한 메뉴 단추 거부');
        await p.locator('[data-tool="home"]').click();
        assert.equal(await p.locator('.title-screen').count(), 1);
      }
      assert.deepEqual(await state(p), before); assert.equal(await durable(p), stored);
      await restoreWrites(p); await p.getByRole('button', { name: '이어 하기', exact: true }).click();
      await p.waitForSelector('.play[data-scene="c1-cell"] [data-world]');
      const resumed = await state(p);
      await p.evaluate(() => { window.t2ErrorHome.click(); window.t2ErrorSettings.click(); window.t2ErrorRetry.click(); });
      assert.equal(await p.locator('.title-screen,.sheet-back').count(), 0, '이탈한 오류 화면 메뉴 거부');
      assert.deepEqual(await state(p), resumed);
      if (mode === 'settings') {
        await p.locator('[data-tool="home"]').click();
        await p.getByRole('button', { name: '처음부터 새로', exact: true }).click();
        await p.getByRole('button', { name: '새로 시작', exact: true }).click();
        await p.waitForSelector('[data-world]'); const fresh = await state(p);
        assert.notEqual(fresh.rpg.run, before.rpg.run);
        await p.evaluate(() => {
          document.body.appendChild(window.t2ErrorPage);
          window.t2ErrorHome.click(); window.t2ErrorPage.appendChild(window.t2ErrorSettings); window.t2ErrorSettings.click(); window.t2ErrorRetry.click();
          window.t2ErrorPage.remove();
        });
        assert.equal(await p.locator('.title-screen,.sheet-back').count(), 0, '이전 회차 DOM을 다시 붙여도 메뉴 거부');
        assert.deepEqual(await state(p), fresh);
        const reader = await p.context().newPage(); await reader.goto(p.url()); await ready(reader);
        assert.equal(await reader.evaluate(() => G.save.access), 'reader');
        await reader.getByRole('button', { name: '이어 하기', exact: true }).click(); await reader.waitForSelector('[data-world]');
        const readonly = await state(reader), readerStored = await durable(reader);
        await reader.locator('[data-tool="settings"]').click();
        for (const key of ['music', 'sound', 'big', 'teacher', 'clear']) assert.equal(await reader.locator('[data-set="' + key + '"]').isDisabled(), true);
        await reader.locator('[data-set="big"]').evaluate(el => el.click());
        assert.equal(await reader.evaluate(() => G.save.transact(G.save.state.rpg.run, n => { n.big = !n.big; })), false);
        await reader.locator('.settings-sheet').getByRole('button', { name: '닫기', exact: true }).click();
        assert.deepEqual(await state(reader), readonly); assert.equal(await durable(reader), readerStored);
        await reader.locator('[data-tool="home"]').click(); assert.equal(await reader.locator('.title-screen').count(), 1);
        assert.deepEqual(await state(reader), readonly);
      }
      console.log('PASS 오류 화면 ' + mode + ' 실제 메뉴·기록 보존·이탈 DOM/회차/reader 보호');
    } catch (error) { console.log('FAIL 오류 화면 ' + mode + ': ' + error.message); failures.push(error); }
    finally { await p.context().close(); }
  }
  assert.equal(failures.length, 0, '오류 화면 메뉴 회귀: ' + failures.map(e => e.message).join('\n'));
}

export async function entryFailures(h) {
  const failures = [];
  for (const [label, call] of [['진입 저장', 1], ['체험 초기화', 2], ['화면 단계 저장', 3], ['계속 저장 실패', 0]]) {
    const p = await h.page('world-opening', { width: call === 0 ? 320 : 390, height: 844 });
    try {
      await start(p);
      if (call === 0) {
        await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape');
      }
      await finishBridge(p);
      const before = await state(p), stored = await durable(p);
      await failWrites(p, call); await p.locator('#tray [data-act="next"]').click();
      await p.waitForTimeout(180);
      const observed = await p.evaluate(() => ({ scene: G.app.current()?.scene, pos: G.save.state.pos,
        error: G.save.error, worlds: document.querySelectorAll('[data-world]').length,
        body: document.querySelector('.main-inner')?.textContent,
        next: document.querySelectorAll('#tray [data-act="next"]').length,
        alerts: document.querySelectorAll('[data-save-error][role="alert"]').length }));
      console.log(label + ': ' + JSON.stringify(observed));
      assert.equal(observed.error, 'storage'); assert.equal(observed.pos, 'c1-cell');
      assert.equal(observed.alerts, 1, label + ': 빈 화면 대신 저장 실패 표시');
      assert.equal(observed.worlds, 0); assert.equal(observed.next, 0);
      assert.ok(observed.body?.length > 0);
      assert.equal(await p.locator('[data-act="retry"]').count(), 1);
      const boxes = await p.locator('[data-save-error] h2,[data-save-error] p,[data-act="retry"]').evaluateAll(elements => elements.map(el => {
        const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height, viewport: innerWidth, clipped: el.scrollHeight > el.clientHeight + 1 };
      }));
      assert.equal(boxes.length, 3);
      for (const box of boxes) assert.ok(box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= box.viewport + 1 && !box.clipped, '오류·재시도 글자와 단추 가독성');
      assert.equal((await state(p)).rpg.scenes['c1-cell']?.actions.length || 0, 0);
      if (call === 1 || call === 0) { assert.deepEqual(await state(p), before); assert.equal(await durable(p), stored); }
      await p.screenshot({ path: path.join(SHOTS, 't2-fix-entry-' + call + '.png'), fullPage: true });
      if (call === 0) {
        await p.locator('[data-act="retry"]').click();
        assert.equal(await p.locator('[data-save-error]').count(), 1, '재시도 실패도 오류 유지');
        assert.deepEqual(await state(p), before); assert.equal(await durable(p), stored);
      }
      await restoreWrites(p); await p.locator('[data-act="retry"]').click();
      await p.waitForSelector('.play[data-scene="c1-cell"] [data-world]');
      assert.equal(await p.locator('[data-save-error]').count(), 0);
      assert.equal(await p.locator('[data-world-target="cushion"]').count(), 1);
      await target(p, 'cushion'); await dialogue(p);
      const resumed = await state(p);
      assert.equal(resumed.done['c1-cell'], true); assert.equal(resumed.pos, 'c3-awake');
      assert.deepEqual(resumed.rpg.scenes['c1-bridge'], before.rpg.scenes['c1-bridge']);
      assert.equal(resumed.rpg.run, before.rpg.run);
      console.log('PASS ' + label + ' 오류·재시도·기존 수행 보존');
    } catch (error) { console.log('FAIL ' + label + ': ' + error.message); failures.push(error); }
    finally { await p.context().close(); }
  }
  assert.equal(failures.length, 0, '진입 저장 실패 회귀: ' + failures.map(e => e.message).join('\n'));
}

export async function transitionFailures(h) {
  const p = await h.page();
  try {
    await start(p); await finishBridge(p); const before = await state(p);
    await p.evaluate(() => {
      window.t2WorldScreen = G.app.screens.world;
      G.app.screens.world = async () => false;
      window.t2DoneEvents = 0; G.app.on('done', () => window.t2DoneEvents++);
    });
    await p.locator('#tray [data-act="next"]').click();
    await p.waitForSelector('[data-save-error][role="alert"]');
    assert.equal((await state(p)).done['c1-cell'], undefined, '화면 false를 정상 완료로 처리하지 않음');
    assert.equal((await state(p)).pos, 'c1-cell');
    assert.equal(await p.evaluate(() => window.t2DoneEvents), 1, '돌다리 완료만 발생');
    await p.evaluate(() => { G.app.screens.world = window.t2WorldScreen; });
    await p.locator('[data-act="retry"]').click();
    await p.waitForSelector('.play[data-scene="c1-cell"] [data-world]');
    assert.deepEqual((await state(p)).rpg.scenes['c1-bridge'], before.rpg.scenes['c1-bridge']);
    console.log('PASS 화면 false 반환의 오류 전파·완료 방지·재시도');
  } finally { await p.context().close(); }

  const source = fs.readFileSync(path.join(ROOT, 'tests/fixtures/world-opening.js'), 'utf8');
  const data = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1));
  data.scenes.find(s => s.id === 'c1-cell').kind = 'cutscene';
  data.experiences = data.experiences.filter(e => e.scene !== 'c1-cell');
  for (const map of data.maps) map.objects = map.objects.filter(o => o.action !== 'cell-look');
  const scripts = ['js/core/util.js', 'js/core/world.js', 'js/core/experience.js', 'js/core/save.js', 'js/core/data.js',
    'js/core/audio.js', 'js/core/text.js', 'js/core/ui.js', 'js/game/app.js', 'js/game/stage.js', 'js/game/world.js'];
  fs.writeFileSync(path.join(SHOTS, 't2-fix-transition.html'), '<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="../../../">' +
    '<link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/rpg.css"></head><body><div id="app"></div>' +
    scripts.map(src => '<script src="' + src + '"></script>').join('') + '<script>G.data=' + JSON.stringify(data) + ';' +
    'const problems=G.checkWorldData(G.data,{profile:"fixture"});if(problems.length)throw Error(problems.join("\\n"));G.data.ok=true;' +
    'G.app.screens.cutscene=G.app.screens.scene;G.save.load("world-opening");G.save.acquireWriter().then(()=>G.app.boot());</script></body></html>');
  const q = await h.page();
  try {
    await q.goto(h.origin + '/tests/shots/t2/t2-fix-transition.html'); await ready(q); await start(q);
    await finishBridge(q); await q.locator('#tray [data-act="next"]').click();
    await q.waitForSelector('.play[data-scene="c1-cell"] [data-act="next"]');
    assert.equal(await q.locator('[data-world]').count(), 0, '일반 화면 전환 검사');
    assert.ok((await q.locator('.stage-speech').innerText()).length > 0);
    const before = await state(q), stored = await durable(q);
    await failWrites(q); await q.locator('#tray [data-act="next"]').click();
    await q.waitForSelector('[data-save-error][role="alert"]');
    assert.deepEqual(await state(q), before); assert.equal(await durable(q), stored);
    assert.equal(await q.locator('#tray [data-act="next"]').count(), 0);
    await q.screenshot({ path: path.join(SHOTS, 't2-fix-normal-transition.png'), fullPage: true });
    await restoreWrites(q); await q.locator('[data-act="retry"]').click();
    await q.waitForSelector('.play[data-scene="c1-cell"] [data-act="next"]');
    await q.locator('#tray [data-act="next"]').click();
    await q.waitForSelector('.play[data-scene="c3-awake"] [data-world]');
    const recovered = await state(q);
    assert.equal(recovered.done['c1-cell'], true); assert.equal(recovered.pos, 'c3-awake');
    assert.equal(recovered.rpg.run, before.rpg.run);
    assert.deepEqual(recovered.rpg.scenes['c1-bridge'], before.rpg.scenes['c1-bridge']);
    console.log('PASS 일반 화면 완료 저장 실패·원본 보존·실제 입력 재시도');
  } finally { await q.context().close(); }
}
