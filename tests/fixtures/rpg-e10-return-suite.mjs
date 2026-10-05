import assert from 'node:assert/strict';
import { harness, ready, target, dialogue, state } from './rpg-harness.mjs';

const h = await harness();
try {
  const page = await h.page('');
  await page.goto(h.origin + '/tests/shots/t2/entry.html?teacher=1&scene=e10-neungpa');
  await ready(page);
  await page.waitForSelector('[data-world]');
  const seen = [];
  for (let turns = 0; turns < 30; turns++) {
    if (await page.locator('[data-dialogue]').count()) { await dialogue(page); continue; }
    const current = await page.evaluate(() => ({
      scene: document.querySelector('.play')?.dataset.scene,
      beat: document.querySelector('.play')?.dataset.beat || '',
      map: document.querySelector('.play')?.dataset.map || '',
    }));
    assert.equal(current.scene, 'e10-neungpa');
    if (!current.beat) break;
    if (!seen.includes(current.beat)) seen.push(current.beat);
    if (current.beat === 'neungpa-return') {
      assert.equal(current.map, 'map-yoyeon', '귀환 서술 전 진영 필드');
      assert.equal((await state(page)).awake, false, '작은 꿈 귀환은 awake를 바꾸지 않음');
    } else {
      assert.equal(current.map, ['neungpa-water','neungpa-enter'].includes(current.beat) ? 'map-bansagok' : 'map-baekryong');
    }
    const beat = await page.evaluate(id => G.experience.find(G.data, 'e10-neungpa').beats.find(value => value.id === id), current.beat);
    if (beat.trigger.target) await target(page, beat.trigger.target);
    else await page.locator('[data-act="interact"]').click();
    await dialogue(page);
  }
  assert.deepEqual(seen, ['neungpa-water','neungpa-enter','neungpa-meet','neungpa-defeat','neungpa-share','neungpa-monk','neungpa-return']);
  assert.equal((await state(page)).awake, false);
  assert.deepEqual(h.errors, [], h.errors.join('\n'));
  console.log('PASS e10 미리보기 실제 7행동 · 백룡담에서 진영 복귀 · awake false');
  await page.context().close();
} finally {
  await h.close();
}
