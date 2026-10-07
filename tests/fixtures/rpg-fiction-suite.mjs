import assert from 'node:assert/strict';
import path from 'node:path';
import { harness, ROOT, ready, start, target, dialogue, state, secretWish } from './rpg-harness.mjs';

const h = await harness();
const context = await h.browser.newContext({ viewport: { width: 390, height: 844 } });
context.on('page', h.observe);
const page = await context.newPage();
const closeBag = async () => { await page.locator('.bag-sheet .actions button').click(); await page.locator('.bag-sheet').waitFor({ state: 'detached' }); };
try {
  await page.goto(h.origin + '/index.html');
  await ready(page);
  await start(page);
  for (let steps = 0; steps < 60; steps++) {
    const current = await page.evaluate(() => ({ id: document.querySelector('.play')?.dataset.scene, kind: document.querySelector('.play')?.dataset.kind, beat: document.querySelector('.play')?.dataset.beat }));
    if (current.id === 'e01-huayin') break;
    if (await page.locator('[data-dialogue]').count()) { await dialogue(page); continue; }
    if (current.kind === 'wish') {
      for (const id of await page.evaluate(() => G.app.current().data.answers)) {
        const button = page.locator('[data-word="' + id + '"]');
        if (!await button.isDisabled()) await button.click();
      }
      await secretWish(page);
      await page.locator('#tray [data-act="next"]').click(); continue;
    }
    if (await page.locator('[data-act="next"]').count()) { await page.locator('[data-act="next"]').first().click(); await page.waitForTimeout(40); continue; }
    const beat = await page.evaluate(c => G.experience.find(G.data, c.id)?.beats.find(b => b.id === c.beat), current);
    assert.ok(beat, '본편 실제 다음 행동');
    if (beat.trigger.target) await target(page, beat.trigger.target); else await page.locator('[data-act="interact"]').click();
    await dialogue(page);
  }
  assert.equal(await page.locator('.play').getAttribute('data-scene'), 'e01-huayin');
  assert.equal((await state(page)).teacher, false);
  assert.equal((await state(page)).seenFiction['fc-house'], undefined);
  await page.evaluate(() => {
    window.beforeFiction = G.save.state;
    window.beforeFictionRaw = localStorage.getItem(G.save.key);
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === G.save.key) { Storage.prototype.setItem = set; throw new DOMException('검사 저장 실패', 'QuotaExceededError'); }
      return set.call(this, key, value);
    };
  });
  await page.locator('[data-tool="keep"]').click();
  await page.waitForSelector('.bag-sheet .house-view');
  assert.equal(await page.locator('.bag-sheet .mark.fiction .real').count(), 1);
  assert.equal(await page.evaluate(() => G.save.state === beforeFiction && localStorage.getItem(G.save.key) === beforeFictionRaw), true, '실패한 안내 저장은 객체와 원문 보존');
  assert.equal((await state(page)).seenFiction['fc-house'], undefined);
  await closeBag();
  await page.locator('[data-tool="keep"]').click();
  await page.waitForSelector('.bag-sheet .house-view');
  assert.equal(await page.locator('.bag-sheet .mark.fiction .real').count(), 1, '실패 뒤 첫 안내 재시도');
  assert.equal((await state(page)).seenFiction['fc-house'], true);
  await page.locator('.bag-sheet').evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
  await page.screenshot({ path: path.join(ROOT, 'tests/shots/t10-fiction-first-bag.png') });
  await closeBag();
  await page.locator('[data-tool="keep"]').click();
  assert.equal(await page.locator('.bag-sheet .mark.fiction').count(), 0, '성공한 최초 안내만 기록');
  await closeBag();
  console.log('PASS 실제 학생 돌다리→화음현 첫 보따리·저장 실패 보존·재시도·최초 안내');

  const protectedRendering = await page.evaluate(() => {
    const before = G.save.state, raw = localStorage.getItem(G.save.key);
    const block = { mark: 'fiction', id: 'test-unseen', body: '검사', real: '근거' };
    const run = before.rpg.run;
    for (const options of [{}, { run, readonly: true }, { run, peek: true }]) {
      const card = G.text.block(block, options);
      if (!card.querySelector('.real')) return false;
    }
    return G.save.state === before && Object.isFrozen(before.seenFiction) && localStorage.getItem(G.save.key) === raw;
  });
  assert.equal(protectedRendering, true, '읽기 전용·peek·회차 없는 렌더는 기록 불변');
  const reader = await context.newPage();
  await reader.goto(h.origin + '/index.html'); await ready(reader);
  assert.equal(await reader.evaluate(() => G.save.access), 'reader');
  assert.equal(await reader.evaluate(() => {
    const before = G.save.state, raw = localStorage.getItem(G.save.key);
    G.text.mark({ mark: 'fiction', id: 'test-reader', body: '검사' }, { run: before.rpg.run, readonly: false });
    return G.save.state === before && localStorage.getItem(G.save.key) === raw && !before.seenFiction['test-reader'];
  }), true, '실제 reader 탭이 writer 설정으로 요청해도 기록 불변');
  await reader.close();
  await page.locator('[data-tool="keep"]').click();
  assert.equal(await page.evaluate(() => {
    const run = G.save.state.rpg.run, oldButton = document.querySelector('.bag-sheet [data-tab="house"]');
    if (!G.save.reset(run, { confirmed: true, cancel: () => G.app.title() })) return false;
    const before = G.save.state, raw = localStorage.getItem(G.save.key);
    oldButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    G.text.mark({ mark: 'fiction', id: 'test-stale', body: '검사' }, { run, readonly: false });
    return before.rpg.run !== run && G.save.state === before && localStorage.getItem(G.save.key) === raw && !before.seenFiction['test-stale'];
  }), true, '초기화 뒤 이전 보따리 DOM과 이전 회차 안내는 기록 불변');
  assert.deepEqual(h.errors, []);
  console.log('PASS 설정 안내 readonly·peek·회차 미제공·실제 두 탭 reader·초기화 뒤 stale');
} catch (error) {
  console.error('브라우저 오류', h.errors);
  await page.screenshot({ path: path.join(ROOT, 'tests/shots/t10-fiction-failure.png') });
  throw error;
} finally { await h.close(); }
