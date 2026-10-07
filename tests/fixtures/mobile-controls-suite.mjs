import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { harness, ROOT, ready, start, state, idle, seekTarget, dialogue } from './rpg-harness.mjs';

const baseline = process.argv.includes('--baseline');
const selection = process.argv.find(arg => arg.startsWith('--case='))?.slice(7);
const h = await harness();
const outputRoot = path.join(ROOT, 'tests/shots/mobile-controls' + (baseline ? '-red' : ''));
const out = selection ? path.join(outputRoot, 'focused', selection.replace(/[^a-zA-Z0-9-]/g, '-')) : outputRoot;
fs.mkdirSync(out, { recursive: true });
const passed = [], failures = [], evidence = [];
const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const xy = c => ({ x: c.x, y: c.y });
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const cursor = p => p.evaluate(() => ({ ...G.save.state.rpg.cursor }));
const actions = p => p.evaluate(() => JSON.stringify(G.save.state.rpg.scenes));
const actorIdle = p => p.waitForFunction(() => !document.querySelector('.world-actor') || document.querySelector('.world-actor').dataset.moving === 'false');

async function test(name, fn) {
  if (selection && !new RegExp(selection).test(name)) return;
  try { await fn(); passed.push(name); console.log('PASS 모바일 조작 ' + name); }
  catch (error) { failures.push({ name, error: error.stack }); console.error('FAIL 모바일 조작 ' + name + ': ' + error.message); }
}

async function pageCase(name, fn, { width = 390, height = 740, big = false, profile = 'world-opening', desktop = false, isMobile = !desktop } = {}) {
  const context = await h.browser.newContext({ viewport: { width, height }, isMobile, hasTouch: !desktop, deviceScaleFactor: desktop ? 1 : 2.625 });
  context.on('page', h.observe);
  if (baseline) for (const file of ['js/game/world.js', 'css/rpg.css']) {
    const body = execFileSync('git', ['show', '6a4c847:' + file], { cwd: ROOT });
    await context.route('**/' + file + '*', route => route.fulfill({ body, contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' }));
  }
  const p = await context.newPage();
  try {
    await p.goto(h.origin + '/index.html?fixture=' + profile);
    await ready(p); await start(p);
    if (big) { await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape'); }
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => {
      window.mobileProbe = { pointers: [], events: [], oldCamera: null, upCursor: null };
      // 손을 뗀 바로 그 순간의 저장 위치. 검사 쪽의 읽기 시점과 실제 해제 사이에 끝난 걸음을 판정에서 빼기 위함이다.
      document.addEventListener('pointerup', () => { const c = G.save.state.rpg?.cursor; mobileProbe.upCursor = c ? { x: c.x, y: c.y } : null; }, true);
      document.addEventListener('pointerdown', e => {
        if (e.target.closest('.world-camera')) mobileProbe.pointers.push({ id: e.pointerId, trusted: e.isTrusted, type: e.pointerType });
      }, true);
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'click']) document.addEventListener(type, e => {
        mobileProbe.events.push({ type, id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target.className, trusted: e.isTrusted });
        if (mobileProbe.events.length > 50) mobileProbe.events.shift();
      }, true);
    });
    await fn(p, await touches(p));
  } catch (error) {
    const diagnostic = await p.evaluate(() => ({ events: window.mobileProbe?.events, cursor: window.G?.save.state.rpg?.cursor, joystick: { ...document.querySelector('.world-joystick')?.dataset }, screen: { ...document.querySelector('.world-screen')?.dataset } })).catch(() => null);
    evidence.push({ failure: name, diagnostic });
    await p.screenshot({ path: path.join(out, name + '-failure.png') }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function touches(p) {
  const cdp = await p.context().newCDPSession(p), points = new Map();
  const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...points.values()].map(point => ({ ...point, radiusX: 2, radiusY: 2, force: 1 })) });
  return {
    async down(point, id = 1) { points.set(id, { x: point.x, y: point.y, id }); await send('touchStart'); },
    async move(point, id = 1) { assert.ok(points.has(id), '존재하는 손가락만 이동'); points.set(id, { x: point.x, y: point.y, id }); await send('touchMove'); },
    async up(id = 1) {
      const point = points.get(id); assert.ok(point, '누른 손가락만 해제'); points.delete(id);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [point] });
    },
    async cancel() { points.clear(); await send('touchCancel'); },
    async tap(point, id = 1) { await this.down(point, id); await this.up(id); },
  };
}

async function emptyPoint(p) {
  return p.evaluate(() => {
    const camera = document.querySelector('.world-camera'), r = camera.getBoundingClientRect();
    const hudBottom = Math.max(110, ...[...document.querySelectorAll('.topbar,.world-heading,.world-goal')].map(el => el.getBoundingClientRect().bottom));
    for (let y = Math.min(innerHeight - 68, Math.max(hudBottom + 48, innerHeight * .65)); y >= hudBottom + 40; y -= 18) {
      for (let x = Math.max(r.left + 50, innerWidth * .25); x < Math.min(r.right - 50, innerWidth * .55); x += 18) {
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('.world-camera') === camera && !hit.closest('button,summary,input,textarea')) return { x, y };
      }
    }
    throw Error('HUD 아래 왼쪽 60%에 실제 터치할 빈 필드 없음');
  });
}

async function directions(p, minimum = 1) {
  const options = await p.evaluate(() => {
    const c = G.save.state.rpg.cursor, play = document.querySelector('.play');
    const stage = G.world.stage(G.data, play.dataset.scene, play.dataset.beat);
    return Object.keys(G.world.directions).map(direction => {
      let end = c, count = 0;
      for (let i = 0; i < 20; i++) { const next = G.world.move(stage.map, end, direction, c.scene, play.dataset.beat); if (!next) break; end = next; count++; }
      return { direction, count };
    }).sort((a, b) => b.count - a.count);
  });
  assert.ok(options.some(o => o.count >= minimum), '실제 이동 가능한 ' + minimum + '칸 경로 필요: ' + JSON.stringify(options));
  return options.filter(o => o.count >= minimum);
}

function dragPoint(point, direction, length = 42) { const [dx, dy] = delta[direction]; return { x: point.x + dx * length, y: point.y + dy * length }; }
async function drag(p, touch, direction) {
  const point = await emptyPoint(p);
  await touch.down(point); await touch.move(dragPoint(point, direction));
  await p.waitForFunction(() => document.querySelector('.world-joystick')?.dataset.active === 'true');
  await touch.move(dragPoint(point, direction, 44));
  assert.equal(await p.locator('.world-joystick').getAttribute('data-active'), 'true', '두 번째 실제 pointermove 뒤 capture 이전으로 조이스틱을 취소하지 않음');
  return point;
}
async function moved(p, before, minimum = 1) {
  await p.waitForFunction(({ before, minimum }) => { const c = G.save.state.rpg.cursor; return c && Math.abs(c.x - before.x) + Math.abs(c.y - before.y) >= minimum; }, { before, minimum });
}
async function stopped(p) {
  await actorIdle(p);
  assert.equal(await p.locator('.world-joystick[data-active="true"]').count(), 0, '조이스틱 소유권 해제');
  const before = await state(p);
  await p.waitForTimeout(450);
  assert.deepEqual(await state(p), before, '두 이동 주기 뒤 추가 기록 없음');
  return before;
}
async function hitPoint(p, selector) {
  const value = await p.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    return { x, y, width: r.width, height: r.height, left: r.left, right: r.right, bottom: r.bottom, top: r.top,
      hit: el.contains(document.elementFromPoint(x, y)), vw: innerWidth, vh: innerHeight, text: el.textContent.trim() };
  });
  assert.ok(value.hit, selector + ' 실제 hit 가림');
  assert.ok(value.left >= 0 && value.top >= 0 && value.right <= value.vw + 1 && value.bottom <= value.vh + 1, selector + ' 화면 밖');
  return value;
}
async function noScroll(p) {
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1), false, '문서 스크롤 없음');
}
async function firstTarget(p) {
  return p.evaluate(() => {
    const play = document.querySelector('.play'), e = G.experience.find(G.data, play.dataset.scene);
    return e.beats.find(b => b.id === play.dataset.beat).trigger.target;
  });
}
async function visibleCell(p) {
  return p.evaluate(() => {
    const play = document.querySelector('.play'), c = G.save.state.rpg.cursor, stage = G.world.stage(G.data, c.scene, play.dataset.beat);
    const world = document.querySelector('[data-world]'), r = world.getBoundingClientRect(), scale = r.width / (stage.map.width * stage.map.tile);
    for (let y = 1; y < stage.map.height; y++) for (let x = 1; x < stage.map.width; x++) {
      const route = G.world.path(stage.map, c, { x, y }, c.scene, play.dataset.beat, false);
      if (!route || route.length < 2 || route.length > 4) continue;
      const point = { x: r.left + (x + .5) * stage.map.tile * scale, y: r.top + (y + .5) * stage.map.tile * scale };
      if (point.x < 20 || point.x > innerWidth * .58 || point.y < 140 || point.y > innerHeight - 70) continue;
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit?.closest('[data-world]') === world && !hit.closest('button')) return { point, cell: { x, y } };
    }
    throw Error('실제 탭 가능한 가까운 빈 목적지 없음');
  });
}

try {
  for (const [width, height] of [[390, 740], [844, 300]]) for (const big of [false, true]) {
    const name = `representative-${width}x${height}-${big ? 'big' : 'normal'}`;
    await test(name, () => pageCase(name, async (p, touch) => {
      await p.screenshot({ path: path.join(out, name + '-initial.png') });
      assert.equal(await p.locator('.world-screen').getAttribute('data-touch'), 'true', 'coarse 기기의 터치 조작 표시');
      assert.equal(await p.locator('.world-joystick').count(), 1, '조이스틱 없음: 이전 화면 RED');
      assert.equal(await p.locator('.world-joystick').getAttribute('aria-hidden'), 'true');
      assert.equal(await p.locator('.world-joystick').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      assert.equal(await p.locator('.world-heading').isVisible(), false, '모바일 장소 제목 중복 표시 없음');
      assert.equal(await p.locator('.topbar .where strong').isVisible(), true, '상단 장소 제목 유지');
      await noScroll(p);
      const before = await cursor(p), story = await actions(p), direction = (await directions(p, 2))[0].direction;
      await drag(p, touch, direction); await moved(p, before);
      for (const selector of ['.world-joystick-base', '.world-joystick-knob']) {
        assert.equal(await p.locator(selector).isVisible(), true, selector + ' 실제 표시');
        const box = await p.locator(selector).boundingBox();
        assert.ok(box.width > 0 && box.height > 0 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, selector + ' 화면 안');
      }
      await p.screenshot({ path: path.join(out, name + '-hold.png') });
      await touch.up(); await stopped(p);
      const release = await p.evaluate(() => mobileProbe.upCursor); assert.ok(release, '실제 손 떼기 관찰');
      assert.ok(distance(release, await cursor(p)) <= 1, '손을 뗀 뒤 진행 중 한 칸만 마침');
      assert.equal(await actions(p), story, '이동으로 원작 행동 자동 수행 금지');
      assert.ok(await p.evaluate(() => mobileProbe.pointers.some(e => e.trusted && e.type === 'touch')), '실제 CDP touch 경로');
      const target = await firstTarget(p); assert.ok(target, '대표 도입 행동 대상');
      await seekTarget(p, target); await idle(p);
      assert.equal(await actions(p), story, '목록으로 도착해도 행동 자동 수행 금지');
      const button = await hitPoint(p, '[data-act="interact"]');
      assert.ok(button.width >= 44 && button.height >= 44, '엄지 행동 표적 최소 44px');
      assert.ok(button.x > width / 2, '행동 단추는 오른쪽 엄지 영역');
      const label = await p.locator('[data-world-target="' + target + '"]').textContent();
      assert.ok(button.text.includes(label.replace(' · 다음 행동', '').trim()), '현재 인접 대상 이름');
      assert.match(button.text, /말 걸기|살펴보기|따라가기|사용하기|이어 가기/);
      await p.screenshot({ path: path.join(out, name + '-action.png') });
      await touch.tap(button); await p.waitForSelector('[data-dialogue]');
      assert.notEqual(await actions(p), story, '실제 행동 tap이 기록됨');
      await stopped(p); await noScroll(p);
      evidence.push({ name, button, cursor: await cursor(p), profile: 'rpg-opening', scope: '대표 도입 조작, 본편 완주 아님' });
    }, { width, height, big, profile: 'rpg-opening' }));
  }

  // 조이스틱이 없는 baseline에서는 위 네 화면의 실제 실패를 남기고 의존 검사를 진행하지 않는다.
  if (!failures.length) {
    await test('npc-outline-marker-focus-and-touch', () => pageCase('npc-outline-marker-focus-and-touch', async (p, touch) => {
      const target = await firstTarget(p); await seekTarget(p, target); await idle(p);
      const npc = p.locator('[data-object="' + target + '"]');
      const styles = () => npc.evaluate(el => {
        const s = getComputedStyle(el), marker = getComputedStyle(el, '::after'), art = el.querySelector('.world-sprite,img');
        return { kind: el.dataset.kind, required: el.classList.contains('required'), outline: s.outlineStyle, width: s.outlineWidth,
          border: s.borderTopWidth, marker: marker.content, markerColor: marker.color, markerHit: marker.pointerEvents,
          focus: el.matches(':focus-visible'), filter: art && getComputedStyle(art).filter };
      });
      const normal = await styles(); evidence.push({ name: 'npc-initial-styles', normal }); assert.equal(normal.kind, 'npc'); assert.equal(normal.required, true);
      assert.equal(normal.outline, 'none'); assert.equal(normal.border, '0px');
      assert.equal(normal.marker.replaceAll('"', ''), '!'); assert.equal(normal.markerHit, 'none');
      const rgb = normal.markerColor.match(/\d+/g).map(Number); assert.ok(rgb[0] > 200 && rgb[1] > 150 && rgb[2] < rgb[1], '금색 느낌표');
      await p.keyboard.press('Tab'); await npc.focus();
      const focused = await styles(); assert.equal(focused.focus, true, '키보드 focus-visible 실제 활성');
      assert.equal(focused.outline, 'none'); assert.match(focused.filter, /drop-shadow/);
      await p.screenshot({ path: path.join(out, 'npc-required-keyboard-focus.png') });
      const ordinary = await npc.evaluate(el => {
        const copy = el.cloneNode(true); copy.classList.remove('required'); copy.removeAttribute('data-object'); el.parentElement.append(copy);
        try { const s = getComputedStyle(copy), marker = getComputedStyle(copy, '::after'); return { outline: s.outlineStyle, border: s.borderTopWidth, marker: marker.content }; }
        finally { copy.remove(); }
      });
      assert.equal(ordinary.outline, 'none'); assert.equal(ordinary.border, '0px'); assert.ok(['none', 'normal', '""'].includes(ordinary.marker), '일반 NPC는 느낌표 없음 (격리 CSS 상태 복제)');
      const before = await actions(p); await touch.tap(await hitPoint(p, '[data-object="' + target + '"]'));
      await p.waitForSelector('[data-dialogue]'); assert.notEqual(await actions(p), before, '사각형 없는 실제 NPC 터치');
      await dialogue(p);
      const props = await p.locator('.world-object.required:not([data-kind="npc"])').evaluateAll(els => els.map(el => ({ outline: getComputedStyle(el).outlineStyle, marker: getComputedStyle(el, '::after').content })));
      assert.ok(props.length > 0, '대표 다음 행동 물건');
      assert.ok(props.every(prop => prop.outline === 'none' && prop.marker === '"!"'), '물건도 사각 테두리 없이 느낌표로 필수 표시');
      const nextTarget = await firstTarget(p); await seekTarget(p, nextTarget); await idle(p);
      await touch.tap(await hitPoint(p, '[data-act="interact"]')); await p.waitForSelector('[data-dialogue]');
      evidence.push({ name: 'npc-outline-marker-focus-and-touch', normal, ordinary, focused, props, scope: '대표 도입 NPC·물건 UI 및 일반 상태 CSS 복제 회귀' });
    }, { profile: 'rpg-opening' }));

    await test('deadzone-tap-drag-release', () => pageCase('deadzone-tap-drag-release', async (p, touch) => {
      const before = await cursor(p), point = await emptyPoint(p), story = await actions(p);
      await touch.down(point); await touch.move({ x: point.x + 5, y: point.y }); await p.waitForTimeout(240);
      assert.deepEqual(await cursor(p), before, '8px 미만 흔들림은 이동하지 않음');
      await touch.cancel(); await stopped(p);
      const dest = await visibleCell(p); await touch.tap(dest.point);
      await p.waitForFunction(cell => { const c = G.save.state.rpg.cursor; return c.x === cell.x && c.y === cell.y; }, dest.cell); await idle(p);
      assert.deepEqual(xy(await cursor(p)), dest.cell, 'drag 없는 실제 tap은 목적지 이동');
      const direction = (await directions(p, 3))[0].direction, from = await cursor(p);
      await drag(p, touch, direction); await moved(p, from, 2);
      const released = await cursor(p); await touch.up(); await stopped(p);
      assert.ok(distance(released, await cursor(p)) <= 1, 'drag 종료의 호환 click이 새 경로를 만들지 않음');
      assert.equal(await actions(p), story);
    }));

    await test('direction-change', () => pageCase('direction-change', async (p, touch) => {
      const before = await cursor(p), direction = (await directions(p, 3))[0].direction;
      const origin = await drag(p, touch, direction); await moved(p, before);
      const turn = (await directions(p, 2)).find(o => delta[o.direction][0] * delta[direction][0] + delta[o.direction][1] * delta[direction][1] === 0);
      assert.ok(turn, '방향 전환 경로');
      const turnBefore = await cursor(p); await touch.move(dragPoint(origin, turn.direction));
      await p.waitForFunction(({ before, direction }) => { const c = G.save.state.rpg.cursor; return c.facing === direction && (c.x !== before.x || c.y !== before.y); }, { before: turnBefore, direction: turn.direction });
      const turned = await cursor(p); assert.equal(turned.facing, turn.direction, '첫 손가락으로 방향 전환');
      await touch.up(); await stopped(p);
    }));

    await test('second-finger-cannot-steal', () => pageCase('second-finger-cannot-steal', async (p, touch) => {
      const before = await cursor(p), direction = (await directions(p, 3))[0].direction;
      const origin = await drag(p, touch, direction);
      const other = { x: origin.x + 25, y: origin.y - 25 };
      await touch.down(other, 2); await touch.move(dragPoint(other, direction === 'down' ? 'right' : 'down'), 2);
      await moved(p, before, 2); const current = await cursor(p);
      assert.equal(current.facing, direction, '두 번째 손가락은 이동 방향 탈취 불가');
      const [dx, dy] = delta[direction]; assert.ok(dx ? current.y === before.y : current.x === before.x, '다른 축 이동 없음');
      await touch.up(1); await stopped(p);
      const released = await cursor(p); await touch.move({ x: other.x + 42, y: other.y }, 2); await p.waitForTimeout(420);
      assert.deepEqual(await cursor(p), released, '남은 손가락으로 소유권 자동 이전 금지');
      await touch.up(2); await stopped(p);
    }));

    await test('wall-hold-and-turn', () => pageCase('wall-hold-and-turn', async (p, touch) => {
      const before = await cursor(p), direction = (await directions(p, 3))[0].direction;
      const origin = await drag(p, touch, direction); await moved(p, before, 3); await idle(p);
      assert.equal(await p.locator('.world-joystick').getAttribute('data-active'), 'true', '벽에서도 손가락 소유 유지');
      const wall = await cursor(p); await p.waitForTimeout(220); assert.deepEqual(await cursor(p), wall, '벽 통과 없음');
      const reverse = Object.keys(delta).find(d => delta[d][0] === -delta[direction][0] && delta[d][1] === -delta[direction][1]);
      await touch.move(dragPoint(origin, reverse)); await moved(p, wall); assert.equal((await cursor(p)).facing, reverse);
      await touch.up(); await stopped(p);
    }));

    await test('compatibility-click-injection', () => pageCase('compatibility-click-injection', async (p, touch) => {
      const before = await cursor(p), direction = (await directions(p, 3))[0].direction;
      await drag(p, touch, direction); await moved(p, before); await touch.up(); await actorIdle(p);
      const saved = await state(p), dest = await visibleCell(p);
      const injected = await p.evaluate(point => {
        if (mobileProbe.events.some(e => e.type === 'click' && e.id === mobileProbe.pointers.at(-1).id)) return false;
        document.querySelector('[data-world]').dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true, detail: 1, pointerType: 'touch', pointerId: mobileProbe.pointers.at(-1).id, clientX: point.x, clientY: point.y }));
        return true;
      }, dest.point);
      await stopped(p); assert.deepEqual(await state(p), saved, 'drag 뒤 호환 click으로 목적지 경로를 다시 만들지 않음');
      await p.waitForTimeout(220);
      await p.evaluate(point => document.querySelector('[data-world]').dispatchEvent(new PointerEvent('click', { bubbles: true, cancelable: true, detail: 1, pointerType: 'touch', pointerId: mobileProbe.pointers.at(-1).id, clientX: point.x, clientY: point.y })), dest.point);
      await stopped(p); assert.deepEqual(await state(p), saved, '500ms 뒤 중복 호환 click도 무시');
      await touch.tap(dest.point);
      await p.waitForFunction(cell => { const c = G.save.state.rpg.cursor; return c.x === cell.x && c.y === cell.y; }, dest.cell); await idle(p);
      assert.deepEqual(xy(await cursor(p)), dest.cell, '새 실제 pointerdown 뒤 정상 tap 이동');
      evidence.push({ name: 'compatibility-click', injected, scope: '호환/지연 중복 click 주입 및 다음 실제 CDP tap 회귀' });
    }));

    for (const reason of ['cancel', 'lostcapture', 'blur', 'visibility', 'rotation', 'settings']) {
      await test('stop-' + reason, () => pageCase('stop-' + reason, async (p, touch) => {
        const before = await cursor(p), direction = (await directions(p, 3))[0].direction;
        const origin = await drag(p, touch, direction); await moved(p, before);
        if (reason === 'cancel') await touch.cancel();
        else if (reason === 'lostcapture') {
          // 명시 capture 이전은 다음 pointer 이벤트에서 처리되므로 실제 소유자가 된 뒤 해제한다.
          await touch.move(dragPoint(origin, direction, 43));
          await p.evaluate(() => {
          const id = mobileProbe.pointers.at(-1).id;
          const owner = [...document.querySelectorAll('*')].find(el => el.hasPointerCapture(id));
          if (!owner) throw Error('실제 pointer capture 소유자 없음');
          owner.releasePointerCapture(id);
          }); await touch.move(dragPoint(origin, direction, 45));
        }
        else if (reason === 'blur') await p.evaluate(() => window.dispatchEvent(new Event('blur')));
        else if (reason === 'visibility') await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
        else if (reason === 'rotation') await p.setViewportSize({ width: 844, height: 300 });
        else {
          const selector = '[data-tool="settings"]';
          await hitPoint(p, selector); await p.locator(selector).click();
          if (reason === 'settings') await p.waitForSelector('.sheet');
          else assert.equal(await p.locator('.world-tools').evaluate(el => el.open), true);
        }
        const settled = await stopped(p);
        if (reason !== 'cancel') { await touch.move(dragPoint(origin, direction)); await touch.up(); }
        await p.waitForTimeout(420); assert.deepEqual(await state(p), settled, '취소 뒤 오래된 touchmove/up 무시');
        if (reason === 'settings') { await p.keyboard.press('Escape'); await stopped(p); }
        if (reason === 'visibility') await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        evidence.push({ stop: reason, source: ['blur', 'visibility'].includes(reason) ? '수명 이벤트 모의 회귀' : '실제 CDP touch/capture/viewport' });
      }));
    }

    await test('action-dom-dialogue-and-npc', () => pageCase('action-dom-dialogue-and-npc', async (p, touch) => {
      assert.equal(await p.locator('[data-act="interact"]').count(), 0, '인접 전 가짜 행동 표식 금지');
      await seekTarget(p, 'bridge-voice'); await idle(p);
      const story = await actions(p);
      const npc = await hitPoint(p, '[data-object="bridge-voice"]');
      await touch.down(npc); await touch.move({ x: npc.x - 24, y: npc.y });
      assert.equal(await p.locator('.world-joystick[data-active="true"]').count(), 0, '대상 button에서 drag는 조이스틱이 아님');
      await touch.cancel();
      await p.evaluate(() => { mobileProbe.action = document.querySelector('[data-act="interact"]'); });
      // 대상과 계속 인접한 채 첫 이동 애니메이션이 시작된 순간 오른손으로 누른다.
      const direction = (await directions(p))[0].direction;
      const button = await hitPoint(p, '.world-actions button');
      await drag(p, touch, direction);
      await p.waitForFunction(() => document.querySelector('.world-actor').dataset.moving === 'true');
      assert.equal(await p.evaluate(() => mobileProbe.action === document.querySelector('.world-actions button')), true, '이동 중에도 행동 DOM 유지');
      await touch.down(button, 2); await touch.up(2); await p.waitForSelector('[data-dialogue]');
      assert.notEqual(await actions(p), story);
      assert.deepEqual((await state(p)).rpg.scenes['c1-bridge'].actions, [{ id: 'bridge-talk', by: 'student' }], '오른손 pointerup은 행동 한 번만 기록');
      await p.evaluate(() => {
        mobileProbe.dialogue = document.querySelector('[data-dialogue]');
        mobileProbe.action.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      });
      const held = await stopped(p);
      assert.equal(await p.evaluate(() => mobileProbe.dialogue === document.querySelector('[data-dialogue]')), true, '뒤따른 click이 대화를 중복 생성하지 않음');
      await touch.up(); await p.waitForTimeout(420); assert.deepEqual(await state(p), held, '대화 중 왼손 해제는 이동하지 않음');
      evidence.push({ name: 'two-finger-action', actions: held.rpg.scenes['c1-bridge'].actions, scope: '왼손 hold와 오른손 실제 CDP pointerup, 후속 click 주입 중복 방지' });
      await dialogue(p);
    }));

    await test('scene-exit-old-pointer', () => pageCase('scene-exit-old-pointer', async (p, touch) => {
      const direction = (await directions(p, 3))[0].direction, before = await cursor(p);
      await p.evaluate(() => { mobileProbe.oldCamera = document.querySelector('.world-camera'); });
      const origin = await drag(p, touch, direction); await moved(p, before);
      await hitPoint(p, '[data-tool="home"]'); await p.locator('[data-tool="home"]').click(); await p.waitForSelector('.title-screen');
      const saved = await state(p); await touch.move(dragPoint(origin, 'right')); await touch.up();
      await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await p.waitForSelector('[data-world]');
      await p.evaluate(() => {
        const id = mobileProbe.pointers[0].id;
        for (const type of ['pointermove', 'pointerup', 'click']) mobileProbe.oldCamera.dispatchEvent(type === 'click' ? new MouseEvent(type, { bubbles: true, clientX: 50, clientY: 180 }) : new PointerEvent(type, { bubbles: true, pointerId: id, pointerType: 'touch', clientX: 50, clientY: 180 }));
      });
      await stopped(p); assert.deepEqual(await state(p), saved, '이탈 화면의 포인터가 재개 화면 기록을 쓰지 않음');
    }));

    for (const isMobile of [false, true]) await test('primary-tap-dialogue-' + isMobile, () => pageCase('primary-tap-dialogue-' + isMobile, async p => {
      await seekTarget(p, 'bridge-voice');
      await p.locator('[data-act="interact"]').tap();
      await p.waitForSelector('[data-dialogue]');
      await p.waitForTimeout(400);
      assert.equal(await p.locator('[data-dialogue]').count(), 1, '행동 단추의 호환 click이 새 대사를 넘기지 않음');
      assert.deepEqual((await state(p)).rpg.scenes['c1-bridge'].actions, [{ id: 'bridge-talk', by: 'student' }]);
      await dialogue(p);
    }, { width: 390, height: 844, isMobile }));

    await test('storage-failure-injection', () => pageCase('storage-failure-injection', async (p, touch) => {
      const before = await state(p), direction = (await directions(p, 2))[0].direction;
      await p.evaluate(() => {
        mobileProbe.setItem = Storage.prototype.setItem; mobileProbe.failedWrites = 0;
        Storage.prototype.setItem = function (key, value) { if (key === G.save.key) { mobileProbe.failedWrites++; throw new DOMException('mobile test', 'QuotaExceededError'); } return mobileProbe.setItem.call(this, key, value); };
      });
      try {
        await drag(p, touch, direction); await p.waitForFunction(() => mobileProbe.failedWrites > 0);
        await touch.up(); await p.waitForTimeout(450);
        assert.deepEqual(await state(p), before, '저장 실패 시 메모리·행동·위치 보존');
        const count = await p.evaluate(() => mobileProbe.failedWrites); await p.waitForTimeout(420);
        assert.equal(await p.evaluate(() => mobileProbe.failedWrites), count, '실패 후 끝없는 이동 저장 재시도 없음');
        assert.equal(await p.locator('.world-joystick[data-active="true"]').count(), 0);
      } finally { await p.evaluate(() => { Storage.prototype.setItem = mobileProbe.setItem; }); }
      evidence.push({ name: 'storage-failure', scope: 'Storage.setItem 고장 주입, 진행 상태 주입 없음' });
    }));

    await test('reset-old-run-injection', () => pageCase('reset-old-run-injection', async (p, touch) => {
      const old = await cursor(p), direction = (await directions(p, 3))[0].direction;
      await p.evaluate(() => { mobileProbe.oldCamera = document.querySelector('.world-camera'); mobileProbe.oldRun = G.save.state.rpg.run; });
      const point = await drag(p, touch, direction); await moved(p, old);
      const reset = await p.evaluate(() => G.save.reset(G.save.state.rpg.run, { confirmed: true, cancel: () => G.app.title() }));
      assert.equal(reset, true); await p.waitForSelector('.title-screen'); await start(p);
      const fresh = await state(p); assert.notEqual(fresh.rpg.run, await p.evaluate(() => mobileProbe.oldRun));
      await touch.move(dragPoint(point, 'right')); await touch.up();
      await p.evaluate(() => {
        const id = mobileProbe.pointers[0].id;
        mobileProbe.oldCamera.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', pointerId: id, clientX: 160, clientY: 400 }));
        mobileProbe.oldCamera.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: id, clientX: 160, clientY: 400 }));
      });
      await stopped(p); assert.deepEqual(await state(p), fresh, '옛 run의 touch 콜백이 새 run에 쓰지 않음');
      evidence.push({ name: 'reset-old-run', scope: '확인 reset API 및 오래된 이벤트 주입 회귀' });
    }));

    await test('completed-input-and-next-scene', () => pageCase('completed-input-and-next-scene', async (p, touch) => {
      await seekTarget(p, 'bridge-voice'); await p.locator('[data-act="interact"]').click(); await dialogue(p);
      await seekTarget(p, 'bridge-exit'); await p.locator('[data-act="interact"]').click(); await dialogue(p);
      await p.waitForSelector('.world-screen[data-finished="true"]');
      const done = await state(p); assert.equal(done.done['c1-bridge'], true);
      await p.evaluate(() => { mobileProbe.oldCamera = document.querySelector('.world-camera'); });
      const point = await emptyPoint(p); await touch.down(point); await touch.move(dragPoint(point, 'down')); await p.waitForTimeout(250);
      assert.equal(await p.locator('.world-joystick[data-active="true"]').count(), 0); assert.deepEqual(await state(p), done);
      await p.locator('#tray [data-act="next"]').click(); await p.waitForSelector('.play[data-scene="c1-cell"]');
      const next = await state(p); await touch.move(dragPoint(point, 'right')); await touch.up(); await stopped(p);
      assert.deepEqual(await state(p), next, '이전 장면 손가락이 다음 장면 위치를 변경하지 않음');
    }));

    await test('desktop-keys-E-and-first-touch', () => pageCase('desktop-keys-E-and-first-touch', async (p, touch) => {
      assert.notEqual(await p.locator('.world-screen').getAttribute('data-touch'), 'true');
      const before = await cursor(p); await p.locator('[data-world]').focus(); await p.keyboard.press('d'); await idle(p);
      assert.equal((await cursor(p)).x, before.x + 1); await p.keyboard.press('ArrowLeft'); await idle(p); assert.deepEqual(xy(await cursor(p)), xy(before));
      await seekTarget(p, 'bridge-voice'); await p.locator('[data-world]').focus(); await p.keyboard.press('e'); await p.waitForSelector('[data-dialogue]'); await dialogue(p);
      const point = await emptyPoint(p); await touch.down(point); await touch.cancel();
      assert.equal(await p.locator('.world-screen').getAttribute('data-touch'), 'true', '첫 실제 터치로 전환');
      await stopped(p);
    }, { width: 1024, height: 740, desktop: true }));
  }
  assert.deepEqual(h.errors, [], 'HTTP/외부 요청/런타임 오류');
} finally {
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ baseline, selection, baselineHead: baseline ? '6a4c847' : null, scope: '대표 도입 및 부품/고장 주입 회귀; 본편 완주나 Android 실기기 검증 아님', passed, failures, evidence, errors: h.errors }, null, 2));
  await h.close();
}
assert.equal(failures.length, 0, '실패 ' + failures.length + '건: ' + failures.map(f => f.name).join(', ') + ' (상세 report.json)');
console.log(`모바일 조작 ${passed.length}개 통과 (대표/부품 및 고장 주입 회귀, 본편 완주 아님)`);
