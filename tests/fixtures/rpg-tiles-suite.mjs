import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { harness, ready, idle, state } from './rpg-harness.mjs';

const cases = [
  { label: '320x844', viewport: { width: 320, height: 844 } },
  { label: '390x844', viewport: { width: 390, height: 844 } },
  { label: '844x390', viewport: { width: 844, height: 390 } },
  { label: '1280x844', viewport: { width: 1280, height: 844 } },
  { label: '390x844 DPR1.25', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.25 },
];
// 2026-10-06 바닥 무늬 방이던 열네 지도는 승인 v4 장소 그림으로 바뀌었다. 천진 지도로 승인 장소 그림의 정수배 표시와 preview 보행을 본다.
const approved = new Set(JSON.parse(require('node:fs').readFileSync(new URL('../../tools/manifest_rpg_v4_approved.json', import.meta.url), 'utf8')).entries.filter(e => e.kind === 'map').map(e => e.key));
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
      await p.waitForFunction(() => document.querySelector('[data-world] img.world-art')?.naturalWidth === 384);

      const rendered = await p.evaluate(() => {
        const play = document.querySelector('.play'), world = document.querySelector('[data-world]');
        const img = world.querySelector('img.world-art'), camera = document.querySelector('.world-camera');
        const actor = document.querySelector('.world-actor'), map = G.data.maps.find(value => value.id === play.dataset.map);
        const art = G.data.sprites[map.art], box = img.getBoundingClientRect();
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
          image: img.currentSrc || img.src, expectedUrl, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          shownWidth: box.width, shownHeight: box.height, rendering: getComputedStyle(img).imageRendering,
          worldWidth: parseFloat(world.style.width), worldHeight: parseFloat(world.style.height),
          actor: { x, y }, move: move && { key: move[0], x: x + move[1], y: y + move[2] },
        };
      });

      assert.equal(rendered.scene, 'e02-tianjin');
      assert.equal(rendered.map, 'map-tianjin');
      assert.equal(rendered.readonly, 'true', '선생님 바로가기는 미완료 장면 preview여야 함');
      assert.ok(approved.has(rendered.art), '승인되지 않은 장소 그림 키: ' + rendered.art);
      assert.equal(rendered.art, 'map-tianjin');
      assert.equal(rendered.artWidth, 384);
      assert.equal(rendered.artHeight, 320);
      assert.equal(rendered.tile, 32);
      assert.deepEqual([rendered.naturalWidth, rendered.naturalHeight], [384, 320], '원본 크기');
      assert.ok(rendered.expectedUrl.startsWith(h.origin + '/assets/world/'), '승인 URL이 로컬 자산이 아님');
      assert.equal(rendered.image, rendered.expectedUrl, '표시 URL이 승인 sprite URL과 다름');
      assert.ok(close(rendered.shownWidth, rendered.mapWidth * rendered.tile * rendered.scale) && close(rendered.shownHeight, rendered.mapHeight * rendered.tile * rendered.scale), '장소 그림이 맵 크기와 다르게 늘어남');
      assert.ok(close(rendered.worldWidth, rendered.shownWidth) && close(rendered.worldHeight, rendered.shownHeight));
      assert.equal(rendered.rendering, 'pixelated', '보간 확대');
      const physicalScale = rendered.scale * rendered.dpr;
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
      console.log('PASS 승인 장소 그림 ' + current.label + ' · 물리 ' + physicalScale + '배 · preview 보행/저장 불변');
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(h.errors, []);
  console.log('RPG 승인 장소 그림 렌더러 ' + cases.length + '개 화면 조건 통과 (학생 완주 검증 아님)');
} finally {
  await h.close();
}
