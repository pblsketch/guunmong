import assert from 'node:assert/strict';
import { harness, ready, idle, state } from './rpg-harness.mjs';

const cases = [
  { label: '320x844', viewport: { width: 320, height: 844 } },
  { label: '390x844', viewport: { width: 390, height: 844 } },
  { label: '844x390', viewport: { width: 844, height: 390 } },
  { label: '1280x844', viewport: { width: 1280, height: 844 } },
  { label: '390x844 DPR1.25', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.25 },
];
const approved = new Set(['prop-floor-grey', 'prop-floor-wood']);
const close = (actual, expected) => Math.abs(actual - expected) < .01;
const h = await harness();

try {
  for (const current of cases) {
    const context = await h.browser.newContext({ viewport: current.viewport, deviceScaleFactor: current.deviceScaleFactor || 1 });
    context.on('page', h.observe);
    const p = await context.newPage();
    try {
      await p.goto(h.origin + '/tests/shots/t2/entry.html?fixture=rpg-front&teacher=1&scene=e02-tianjin');
      await ready(p);
      await p.waitForSelector('.play[data-scene="e02-tianjin"][data-map="map-tianjin"] [data-world]');
      await p.waitForFunction(() => getComputedStyle(document.querySelector('.world-tiles')).backgroundSize !== 'auto');

      const rendered = await p.evaluate(() => {
        const play = document.querySelector('.play'), world = document.querySelector('[data-world]');
        const tiles = world.querySelector('.world-tiles'), camera = document.querySelector('.world-camera');
        const actor = document.querySelector('.world-actor'), map = G.data.maps.find(value => value.id === play.dataset.map);
        const art = G.data.sprites[map.art], style = getComputedStyle(tiles);
        const size = style.backgroundSize.split(/\s+/).map(value => parseFloat(value));
        const expectedUrl = new URL(art.src, document.baseURI).href;
        const directions = [
          ['ArrowUp', 0, -1], ['ArrowRight', 1, 0], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0],
        ];
        const x = +actor.dataset.x, y = +actor.dataset.y, beat = play.dataset.beat || null;
        const move = directions.find(([, dx, dy]) => G.world.walkable(map, x + dx, y + dy, play.dataset.scene, beat));
        return {
          scene: play.dataset.scene, map: map.id, art: map.art, tile: map.tile,
          mapWidth: map.width, mapHeight: map.height, artWidth: art.width, artHeight: art.height,
          readonly: play.dataset.readonly, dpr: devicePixelRatio, scale: +camera.dataset.scale,
          repeat: style.backgroundRepeat, image: style.backgroundImage, expectedUrl,
          backgroundWidth: size[0], backgroundHeight: size[1],
          worldWidth: parseFloat(world.style.width), worldHeight: parseFloat(world.style.height),
          actor: { x, y }, move: move && { key: move[0], x: x + move[1], y: y + move[2] },
        };
      });

      assert.equal(rendered.scene, 'e02-tianjin');
      assert.equal(rendered.map, 'map-tianjin');
      assert.equal(rendered.readonly, 'true', '선생님 바로가기는 미완료 장면 preview여야 함');
      assert.ok(approved.has(rendered.art), '승인되지 않은 바닥 키: ' + rendered.art);
      assert.equal(rendered.artWidth, 32);
      assert.equal(rendered.artHeight, 32);
      assert.equal(rendered.tile, 32);
      assert.equal(rendered.repeat, 'repeat');
      assert.ok(rendered.expectedUrl.startsWith(h.origin + '/assets/world/'), '승인 URL이 로컬 자산이 아님');
      assert.ok(rendered.image.includes(rendered.expectedUrl), '표시 URL이 승인 sprite URL과 다름');
      assert.ok(close(rendered.backgroundWidth, rendered.tile * rendered.scale));
      assert.ok(close(rendered.backgroundHeight, rendered.tile * rendered.scale));
      assert.ok(close(rendered.worldWidth / rendered.backgroundWidth, rendered.mapWidth));
      assert.ok(close(rendered.worldHeight / rendered.backgroundHeight, rendered.mapHeight));
      assert.ok(rendered.backgroundWidth < rendered.worldWidth && rendered.backgroundHeight < rendered.worldHeight, '바닥 한 칸이 맵 전체로 늘어남');
      const physicalScale = rendered.backgroundWidth * rendered.dpr / rendered.tile;
      assert.ok(close(physicalScale, Math.round(physicalScale)) && physicalScale >= 1, '물리 배율이 정수가 아님: ' + physicalScale);
      assert.ok(rendered.move, 'preview 시작점에서 이동 가능한 이웃 칸이 없음');

      const before = await state(p);
      const raw = await p.evaluate(() => localStorage.getItem(G.save.key));
      await p.locator('[data-world]').focus();
      await p.keyboard.press(rendered.move.key);
      await idle(p);
      const afterActor = await p.locator('.world-actor').evaluate(el => ({ x: +el.dataset.x, y: +el.dataset.y }));
      assert.deepEqual(afterActor, { x: rendered.move.x, y: rendered.move.y }, 'preview 보행 위치 표시 불일치');
      assert.deepEqual(await state(p), before, 'preview 보행이 저장 상태를 바꿈');
      assert.equal(await p.evaluate(() => localStorage.getItem(G.save.key)), raw, 'preview 보행이 localStorage를 바꿈');
      console.log('PASS 반복 타일 ' + current.label + ' · 32px 물리 ' + physicalScale + '배 · preview 보행/저장 불변');
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(h.errors, []);
  console.log('RPG 반복 타일 렌더러 ' + cases.length + '개 화면 조건 통과 (학생 완주 검증 아님)');
} finally {
  await h.close();
}
