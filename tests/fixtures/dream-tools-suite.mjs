import assert from 'node:assert/strict';
import { harness, start, target, dialogue, state } from './rpg-harness.mjs';

const h = await harness();
const raw = page => page.evaluate(() => localStorage.getItem(G.save.key));
const at = (page, id) => page.waitForFunction(scene => document.querySelector('.play')?.dataset.scene === scene, id);
let passed = 0;

async function toStaff(page) {
  await start(page);
  for (const scene of ['c3-feast', 'c3-monk']) {
    await at(page, scene);
    const targets = await page.evaluate(id => G.experience.find(G.data, id).beats.map(beat => beat.trigger.target), scene);
    for (const id of targets) { await target(page, id); await dialogue(page); }
    await page.locator('#tray [data-act="next"]').click();
  }
  await at(page, 'c3-staff');
  if (!await page.locator('[data-act="staff"]').count()) await page.locator('#tray [data-act="next"]').click();
  await page.waitForSelector('[data-act="staff"]');
}

async function closeSheet(page, selector) {
  await page.locator(selector + ' .actions button').click();
  await page.locator(selector).waitFor({ state: 'detached' });
}

try {
  const page = await h.page('rpg-waking', { width: 390, height: 844 });
  try {
    await toStaff(page);
    const capturedRun = (await state(page)).rpg.run;
    assert.equal(await page.evaluate(() => G.dream.alive()), true);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', true], ['bonds', true], ['items', true], ['board', false]]);

    await page.locator('[data-tool="settings"]').click();
    await page.evaluate(() => { window.oldTeacherButton = document.querySelector('.settings-sheet [data-set="teacher"]'); });
    await closeSheet(page, '.settings-sheet');
    await page.evaluate(() => { window.oldKeepBeforeWake = document.querySelector('[data-tool="keep"]'); });
    await page.locator('[data-tool="keep"]').click();
    await page.waitForSelector('.bag-sheet .bag');
    assert.equal(await page.locator('.bag-sheet [data-tab="house"]').getAttribute('aria-selected'), 'true');
    await page.evaluate(() => { window.oldHouseBeforeWake = document.querySelector('.bag-sheet [data-tab="house"]'); });
    await closeSheet(page, '.bag-sheet');

    await page.locator('[data-act="staff"]').click();
    await at(page, 'c3-awake');
    const awakened = await state(page), awakenedRaw = await raw(page);
    assert.equal(awakened.awake, true);
    assert.ok(awakened.awakeAt > 0);
    assert.equal(awakened.rpg.run, capturedRun, '실제 깨어남은 같은 run을 유지');
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', false], ['bonds', false], ['items', false], ['board', false]]);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 0, '깨어난 학생에게 꿈 도구 숨김');
    const denied = await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.open(tab)]));
    assert.deepEqual(denied, [['house', false], ['bonds', false], ['items', false], ['board', false]]);
    await page.evaluate(() => {
      oldTeacherButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldHouseBeforeWake.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldKeepBeforeWake.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    assert.equal(await page.locator('.bag-sheet').count(), 0);
    assert.deepEqual(await state(page), awakened, '깨어남 전 옛 DOM이 상태를 바꾸지 않음');
    assert.equal(await raw(page), awakenedRaw, '깨어남 전 옛 DOM이 저장 원문을 바꾸지 않음');
    passed++;
    console.log('PASS 실제 4단위 깨어남 · 학생 꿈 도구/API · 옛 DOM · captured run 잠금');

    await page.locator('[data-tool="settings"]').click();
    await page.locator('.settings-sheet [data-set="teacher"]').click();
    await closeSheet(page, '.settings-sheet');
    assert.equal((await state(page)).teacher, true);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', true], ['bonds', true], ['items', true], ['board', false]]);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 1, '깨어난 교사에게 꿈 보따리 표시');
    await page.locator('[data-tool="keep"]').click();
    await page.waitForSelector('.bag-sheet .bag');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)),
      ['house', 'bonds', 'items', 'wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet .house-view').count(), 1);
    await page.evaluate(() => {
      window.oldTeacherKeep = document.querySelector('[data-tool="keep"]');
      window.oldTeacherHouse = document.querySelector('.bag-sheet [data-tab="house"]');
      window.teacherToolRun = G.save.state.rpg.run;
      G.app.settings();
    });
    await page.waitForSelector('.settings-sheet');
    await page.locator('.settings-sheet [data-set="teacher"]').click();
    await closeSheet(page, '.settings-sheet');

    assert.equal((await state(page)).teacher, false);
    assert.equal(await page.evaluate(() => teacherToolRun === G.save.state.rpg.run), true);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 0, '교사 OFF 즉시 도구 제거');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)), ['wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet [data-tab="wishes"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.bag-sheet .house-view,.bag-sheet .bond-list,.bag-sheet .item-list').count(), 0);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', false], ['bonds', false], ['items', false], ['board', false]]);

    const offState = await state(page), offRaw = await raw(page);
    const sheets = await page.locator('.bag-sheet').count();
    const stale = await page.evaluate(() => {
      oldTeacherHouse.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldTeacherKeep.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { house: G.dream.open('house'), bonds: G.dream.open('bonds'), items: G.dream.open('items'), board: G.dream.open('board') };
    });
    assert.deepEqual(stale, { house: false, bonds: false, items: false, board: false });
    assert.equal(await page.locator('.bag-sheet').count(), sheets, '옛 도구가 새 판을 열지 않음');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)), ['wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet .house-view,.bag-sheet .bond-list,.bag-sheet .item-list').count(), 0);
    assert.deepEqual(await state(page), offState, '교사 OFF 뒤 옛 DOM/API 상태 불변');
    assert.equal(await raw(page), offRaw, '교사 OFF 뒤 옛 DOM/API 저장 원문 불변');
    passed++;
    console.log('PASS 교사 ON/OFF · 열린 보따리 축소 · 옛 탭/도구/API 잠금');

    await closeSheet(page, '.bag-sheet');
    assert.deepEqual(h.errors, [], h.errors.join('\n'));
  } finally {
    await page.context().close();
  }
  assert.equal(passed, 2, 'focused 회귀 두 묶음 모두 실행');
  console.log('꿈 도구 focused 회귀 2개 통과 (교사 preview·학생 전체 완주 검증 아님)');
} finally {
  await h.close();
}
