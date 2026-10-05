import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { harness, ROOT, start, state, ready, step, idle, fieldCell, openTargets, target, dialogue } from './rpg-harness.mjs';

const shots = path.join(ROOT, 'tests/shots');
const h = await harness(), evidence = [], failures = [];
const baseline = process.argv.includes('--baseline');
const prefix = baseline ? 'rpg-view-red-input' : 'rpg-view';
async function page(profile = 'world-opening', width = 390, opt = {}) {
  const p = await h.page(profile, { width, height: 844 }, opt);
  if (baseline) {
    for (const file of ['js/game/world.js', 'css/rpg.css', 'js/game/stage.js']) {
      const body = execFileSync('git', ['show', '71d006f:' + file], { cwd: ROOT });
      await p.route('**/' + file + '*', route => route.fulfill({ body, contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' }));
    }
    await p.reload(); await ready(p);
  }
  await start(p); return p;
}
const durable = p => p.evaluate(() => localStorage.getItem(G.save.key));
async function shot(p, name) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.target?.closest?.('.stage-portrait')).map(a => a.finished.catch(() => {})));
  });
  return p.screenshot({ path: path.join(shots, prefix + '-' + name + '.png'), fullPage: true });
}
async function fieldObject(p, id, touch = false) {
  await p.locator('.world-camera').scrollIntoViewIfNeeded();
  const point = await p.locator('[data-object="' + id + '"]').evaluate(el => {
    const r = el.getBoundingClientRect(), c = el.closest('.world-camera').getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x <= c.left || x >= c.right || y <= c.top || y >= c.bottom || document.elementFromPoint(x,y)?.closest('[data-object]') !== el) throw Error('대상 실제 입력 가림');
    return { x, y };
  });
  if (touch) await p.touchscreen.tap(point.x, point.y); else await p.mouse.click(point.x, point.y);
}
async function trace(p) {
  await p.evaluate(() => {
    window.viewTrace = []; window.viewWrites = []; window.viewTracing = true;
    const move = G.save.move;
    G.save.move = function (...args) {
      const result = move.apply(this, args); viewWrites.push({ at: performance.now(), result, cursor: G.save.state.rpg.cursor }); return result;
    };
    const sample = () => {
      const a = document.querySelector('.world-actor'), c = document.querySelector('.world-camera');
      if (a) viewTrace.push({ at: performance.now(), left: parseFloat(a.style.left), top: parseFloat(a.style.top), frame: +a.dataset.frame, moving: a.dataset.moving,
        camera: { ...c.dataset }, cursor: G.save.state.rpg.cursor, writes: viewWrites.length });
      if (window.viewTracing) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS RPG view ' + name); }
  catch (e) { failures.push({ name, error: e.stack }); console.error('FAIL RPG view ' + name + ': ' + e.message); }
}
export async function view(p) {
  return p.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const world = document.querySelector('[data-world]'), actor = document.querySelector('.world-actor');
    const camera = document.querySelector('.world-camera'), npc = document.querySelector('[data-object="bridge-fairy"]');
    return { world: box(world), camera: box(camera), actor: box(actor), actorData: { ...actor.dataset },
      focus: document.activeElement === world, targetsOpen: document.querySelector('.world-targets').open,
      npcImage: npc?.querySelector('img')?.getAttribute('src') || getComputedStyle(npc?.firstChild || actor).backgroundImage,
      overflow: document.documentElement.scrollWidth > innerWidth, cameraData: { ...camera.dataset }, dpr: devicePixelRatio };
  });
}
try {
  for (const width of [320, 390, 820, 1280]) {
    const p = await page('rpg-opening', width);
    const v = await view(p); evidence.push({ width, initial: v, state: await state(p) });
    await shot(p, 'initial-' + width);
    await test(width + ' 큰 필드·배우', () => {
      assert.ok(v.actor.width >= 32, '배우가 CSS 32px 미만: ' + v.actor.width);
      assert.ok(v.camera.height >= 844 * .4, '필드가 주영역이 아님: ' + v.camera.height);
      assert.equal(v.overflow, false);
    });
    await test(width + ' 초기 초점·접힌 목록', () => { assert.equal(v.focus, true, '초기 초점이 필드가 아님'); assert.equal(v.targetsOpen, false); });
    await test(width + ' 선녀 실제 그림', () => { assert.ok(v.npcImage && v.npcImage !== 'none', '빈 NPC 표시'); });
    await p.context().close();
  }
  await test('실제 key tap 중간 픽셀·칸 완료에서만 저장', async () => {
    const p = await page();
    try {
      await p.locator('[data-world]').focus();
      const before = await state(p); await trace(p); const first = await p.screenshot(); await shot(p, 'before');
      await p.keyboard.press('d'); await p.waitForTimeout(45); const middle = await p.screenshot();
      fs.writeFileSync(path.join(shots, prefix + '-mid.png'), middle);
      if (!baseline) await idle(p); else await p.waitForTimeout(200);
      const last = await p.screenshot(); fs.writeFileSync(path.join(shots, prefix + '-after.png'), last);
      await p.waitForTimeout(250);
      const data = await p.evaluate(() => { viewTracing = false; return { samples: viewTrace, writes: viewWrites }; });
      evidence.push({ label: 'pixel movement', ...data });
      const points = data.samples.filter(s => s.cursor.x === before.rpg.cursor.x && s.moving === 'true');
      assert.ok(new Set(points.map(s => s.left)).size >= 3, 'teleport가 아닌 중간 픽셀 셋 이상');
      assert.ok(points.every(s => s.writes === 0), '움직이는 도중 저장 금지');
      assert.equal(data.writes.length, 1, '한 번 누른 키는 한 칸·한 저장');
      assert.equal((await state(p)).rpg.cursor.x, before.rpg.cursor.x + 1);
      assert.notDeepEqual(first, middle); assert.notDeepEqual(middle, last);
      assert.ok(data.samples.every(s => Number.isInteger(s.left) && Number.isInteger(s.top)), '월드 원본 픽셀 정렬');
    } finally { await p.context().close(); }
  });
  if (!baseline) {
    await test('연속 key tap·hold·keyup의 추가 걸음 없음', async () => {
      const p = await page();
      try {
        await trace(p); await p.keyboard.press('s'); await p.keyboard.press('s'); await idle(p);
        assert.equal((await state(p)).rpg.cursor.y, 7); assert.equal(await p.evaluate(() => viewWrites.length), 2);
        await p.keyboard.down('d'); await p.waitForFunction(() => G.save.state.rpg.cursor.x >= 4);
        const atRelease = await state(p); await p.keyboard.up('d'); await idle(p); const after = await state(p);
        assert.ok(after.rpg.cursor.x - atRelease.rpg.cursor.x <= 1, 'keyup은 이미 시작한 칸만 마침');
        await p.waitForTimeout(400); assert.deepEqual(await state(p), after);
        evidence.push({ label: 'tap hold release', atRelease, after });
      } finally { await p.context().close(); }
    });
    for (const width of [390, 1280]) for (const input of ['keyboard', 'pointer']) {
      await test(width + ' ' + input + ' 필드만으로 선녀 대화·꽃 행동', async () => {
        const videoDir = path.join(shots, 'rpg-view-video-' + width + '-' + input);
        const p = await page('rpg-opening', width, { hasTouch: width === 390, recordVideo: { dir: videoDir, size: { width, height: 844 } } });
        const video = p.video();
        try {
          if (input === 'keyboard') { for (let i = 0; i < 5; i++) await step(p, 'w'); }
          else { await fieldCell(p, 5, 6, width === 390); await fieldObject(p, 'bridge-fairy', width === 390); await idle(p); }
          assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length, 0, '도착은 자동 대화 아님');
          await shot(p, width + '-' + input + '-approach');
          if (input === 'keyboard') await p.keyboard.press('Enter'); else await fieldObject(p, 'bridge-fairy', width === 390);
          await dialogue(p); await p.waitForSelector('.play[data-beat="bridge-flower"]');
          if (input === 'keyboard') {
            await step(p, 'a'); await p.keyboard.press('Enter');
          } else {
            await fieldObject(p, 'bridge-flower', width === 390);
            if (!await p.locator('[data-dialogue]').count()) { await idle(p); await fieldObject(p, 'bridge-flower', width === 390); }
          }
          await p.waitForSelector('[data-dialogue]');
          assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.at(-1).id, 'bridge-flower');
          assert.equal(await p.locator('.world-targets').evaluate(el => el.open), false, '주 경로는 필드');
          await shot(p, width + '-' + input + '-flower'); await dialogue(p);
        } finally {
          await p.context().close(); await video.saveAs(path.join(shots, 'rpg-view-' + width + '-' + input + '.webm'));
        }
      });
    }
    await test('카메라 가장자리·변환된 목적지 hit·화면 밖 목록 접근', async () => {
      const p = await page();
      try {
        await fieldCell(p, 2, 7); await p.keyboard.down('d');
        await p.waitForFunction(() => G.save.state.rpg.cursor.x === 10); await p.keyboard.up('d'); await idle(p);
        const edge = await view(p); assert.equal(+edge.cameraData.x, edge.world.width - edge.camera.width);
        assert.ok(edge.actor.x >= edge.camera.x && edge.actor.x + edge.actor.width <= edge.camera.x + edge.camera.width);
        await fieldCell(p, 8, 7); assert.equal((await state(p)).rpg.cursor.x, 8); assert.equal((await state(p)).rpg.cursor.y, 7);
        await p.locator('.world-tools > summary').focus(); await p.keyboard.press('Enter');
        await p.locator('.world-targets summary').focus(); await p.keyboard.press('Enter');
        await p.locator('[data-world-target="front-table"]').focus(); await p.keyboard.press('Enter'); await idle(p);
        const returned = await view(p); assert.ok(+returned.cameraData.x < +edge.cameraData.x);
        const c = (await state(p)).rpg.cursor; assert.equal(Math.abs(c.x - 5) + Math.abs(c.y - 6), 1);
        evidence.push({ label: 'camera edge and return', edge, returned }); await shot(p, 'camera-return');
      } finally { await p.context().close(); }
    });
    await test('보조 메뉴의 방향 패드 touch 단일 걸음', async () => {
      const p = await page('world-opening', 320, { hasTouch: true, deviceScaleFactor: 3 });
      try {
        assert.equal(await p.locator('[data-direction]').count(), 4);
        assert.equal(await p.locator('[data-direction="down"]').isVisible(), false, '방향 패드는 평소 필드를 가리지 않는다');
        await p.locator('.world-tools > summary').tap();
        await p.getByText('방향 버튼', { exact: true }).tap();
        const before = await state(p); await p.locator('[data-direction="down"]').tap(); await idle(p);
        assert.equal((await state(p)).rpg.cursor.y, before.rpg.cursor.y + 1); await p.waitForTimeout(300);
        assert.equal((await state(p)).rpg.cursor.y, before.rpg.cursor.y + 1);
        const v = await view(p); assert.ok(Number.isInteger(+v.cameraData.scale * v.dpr)); assert.ok(v.actor.width >= 32);
        evidence.push({ label: 'touch pad DPR3', view: v });
      } finally { await p.context().close(); }
    });
    await test('DPR 1.25 정수 기기 픽셀·가장자리 clamp·정확한 click', async () => {
      const p = await page('world-opening', 390, { deviceScaleFactor: 1.25 });
      try {
        await fieldCell(p, 2, 7); await p.keyboard.down('d');
        await p.waitForFunction(() => G.save.state.rpg.cursor.x === 10); await p.keyboard.up('d'); await idle(p);
        const v = await view(p);
        assert.ok(Number.isInteger(+v.cameraData.scale * v.dpr));
        assert.ok(+v.cameraData.x <= v.world.width - (v.camera.width - 4), '경계 반올림으로 맵 밖이 보이면 안 됨');
        const aligned = await p.locator('.world-actor').evaluate(el => {
          const scale = +document.querySelector('.world-camera').dataset.scale;
          return [parseFloat(el.style.left) / scale, parseFloat(el.style.top) / scale];
        });
        assert.ok(aligned.every(Number.isInteger), '배우는 원본 정수 픽셀');
        await fieldCell(p, 8, 7); assert.equal((await state(p)).rpg.cursor.x, 8);
        evidence.push({ label: 'fractional DPR edge', view: v }); await shot(p, 'dpr125');
      } finally { await p.context().close(); }
    });
    await test('실제 인물 fallback와 얼굴 없는 대상 대기 목록', async () => {
      const p = await page('rpg-opening');
      try {
        const report = await p.evaluate(() => G.data.maps.flatMap(m => m.objects.filter(o => o.kind === 'npc').map(o => {
          const sprite = G.data.sprites[o.sprite], person = G.data.people[o.person];
          return { map: m.id, target: o.id, label: o.label, person: o.person,
            body: !!sprite && !o.sprite.startsWith('prop-'), portrait: !!person?.face && !person.noFace && G.text.nameOf(o.person) === o.label };
        })));
        assert.ok(report.length >= 3); assert.ok(report.find(o => o.target === 'bridge-fairy').body, '선녀 승인 전신');
        assert.ok(report.find(o => o.target === 'exile-master').body, '육관대사 승인 전신');
        assert.ok(report.find(o => o.target === 'huayin-nurse').body, '유모 승인 전신');
        assert.equal(report.find(o => o.target === 'huayin-nurse').portrait, false);
        fs.writeFileSync(path.join(shots, 'rpg-view-art-needs.json'), JSON.stringify(report, null, 2)); evidence.push({ label: 'NPC art', report });
      } finally { await p.context().close(); }
    });
    await test('글 입력·메뉴·blur·visibility·이탈 즉시 취소', async () => {
      const p = await page();
      try {
        await p.evaluate(() => { const input = document.createElement('input'); input.id = 'view-input'; document.querySelector('.world-screen').append(input); });
        const before = await state(p); await p.locator('#view-input').fill('메모'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('w');
        assert.deepEqual(await state(p), before); assert.match(await p.locator('#view-input').inputValue(), /w/);
        await p.locator('[data-world]').focus(); await p.keyboard.down('s'); await p.locator('[data-tool="settings"]').click();
        const modal = await state(p); await p.keyboard.up('s'); await p.waitForTimeout(400); assert.deepEqual(await state(p), modal);
        await p.keyboard.press('Escape'); assert.equal(await p.locator('[data-world]').evaluate(el => el === document.activeElement), true);
        for (const kind of ['blur', 'hidden']) {
          await p.keyboard.down('d'); await p.waitForTimeout(40);
          await p.evaluate(kind => {
            if (kind === 'blur') window.dispatchEvent(new Event('blur'));
            else { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }
          }, kind);
          const stopped = await state(p); await p.keyboard.up('d'); await p.waitForTimeout(350); assert.deepEqual(await state(p), stopped);
          if (kind === 'hidden') await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        }
        await p.locator('[data-world]').focus(); await p.keyboard.down('s'); await p.locator('[data-tool="home"]').click();
        const exit = await state(p); await p.keyboard.up('s'); await p.waitForTimeout(400); assert.deepEqual(await state(p), exit);
      } finally { await p.context().close(); }
    });
    await test('새 월드의 최초 크기 알림이 첫 입력을 취소하지 않음', async () => {
      const p = await page();
      try {
        const before = await state(p);
        await p.evaluate(() => {
          G.app.open(G.app.current().scene, { resume: true });
          const world = document.querySelector('[data-world]');
          world.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', bubbles: true }));
          world.dispatchEvent(new KeyboardEvent('keyup', { key: 's', code: 'KeyS', bubbles: true }));
        });
        await idle(p);
        assert.equal((await state(p)).rpg.cursor.y, before.rpg.cursor.y + 1, '크기는 그대로인 최초 관찰 알림 뒤 첫 걸음 보존');
      } finally { await p.context().close(); }
    });
    await test('이동 저장 실패 오류 경로·상태 불변·재시도', async () => {
      const p = await page();
      try {
        const before = await state(p), raw = await durable(p);
        await p.evaluate(() => { window.viewBeforeState = G.save.state; });
        await p.evaluate(() => { window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw Error('RPG 이동 저장 실패 검사'); }; });
        await p.keyboard.press('s'); await p.waitForSelector('[data-save-error="storage"]');
        assert.deepEqual(await state(p), before); assert.equal(await durable(p), raw); assert.equal(await p.locator('[data-world]').count(), 0);
        assert.equal(await p.evaluate(() => G.save.state === viewBeforeState && Object.isFrozen(G.save.state) && Object.isFrozen(G.save.state.rpg.cursor)), true);
        await shot(p, 'save-failure'); await p.waitForTimeout(300); assert.deepEqual(await state(p), before);
        await p.evaluate(() => { Storage.prototype.setItem = originalSet; }); await p.locator('[data-act="retry"]').click();
        await p.waitForSelector('[data-world]'); await step(p, 's'); assert.equal((await state(p)).rpg.cursor.y, before.rpg.cursor.y + 1);
      } finally { await p.context().close(); }
    });
    await test('readonly·reader local cursor와 오래된 run 입력 차단', async () => {
      const p = await page();
      try {
        await target(p, 'bridge-voice'); await dialogue(p); await target(p, 'bridge-exit'); await dialogue(p);
        const before = await state(p), raw = await durable(p); await p.evaluate(() => G.app.open('c1-bridge', { quiet: true }));
        await p.waitForSelector('[data-world]'); await step(p, 's'); assert.equal(+await p.locator('.world-actor').getAttribute('data-y'), 6);
        await target(p, 'bridge-voice'); await dialogue(p); assert.deepEqual(await state(p), before); assert.equal(await durable(p), raw);
        const reader = await p.context().newPage(); await reader.goto(p.url()); await ready(reader); assert.equal(await reader.evaluate(() => G.save.access), 'reader');
        await reader.evaluate(() => G.app.open('c1-bridge', { quiet: true })); await reader.waitForSelector('[data-world]'); await step(reader, 's');
        await target(reader, 'bridge-voice'); await dialogue(reader); assert.deepEqual(await state(reader), before); assert.equal(await durable(reader), raw);
        await reader.close(); await p.bringToFront();
        await p.evaluate(() => { window.oldTarget = document.querySelector('[data-world-target="front-table"]'); });
        await p.locator('[data-tool="home"]').click(); await p.getByRole('button', { name: '처음부터 새로', exact: true }).click(); await p.getByRole('button', { name: '새로 시작', exact: true }).click();
        await p.waitForSelector('[data-world]'); const reset = await state(p); assert.notEqual(reset.rpg.run, before.rpg.run);
        await p.evaluate(() => oldTarget.click()); await p.waitForTimeout(350); assert.deepEqual(await state(p), reset);
      } finally { await p.context().close(); }
    });
    await test('경로 RAF 중 권한 해제·다른 탭 초기화·storage·옛 입력 취소', async () => {
      const p = await page();
      try {
        await openTargets(p); await p.evaluate(() => { window.inflightTarget = document.querySelector('[data-world-target="front-table"]'); });
        await p.locator('[data-world-target="front-table"]').click();
        await p.waitForFunction(() => document.querySelector('.world-actor')?.dataset.moving === 'true');
        await p.evaluate(() => G.save.releaseWriter()); const released = await state(p), raw = await durable(p);
        await p.evaluate(() => inflightTarget.click()); await p.waitForTimeout(400);
        assert.deepEqual(await state(p), released); assert.equal(await durable(p), raw); assert.equal(await p.locator('[data-world]').count(), 0);
        const other = await p.context().newPage(); await other.goto(p.url()); await ready(other);
        assert.equal(await other.evaluate(() => G.save.access), 'writer');
        await other.getByRole('button', { name: '처음부터 새로', exact: true }).click();
        await other.getByRole('button', { name: '새로 시작', exact: true }).click(); await other.waitForSelector('[data-world]');
        const reset = await state(other); await p.waitForFunction(run => G.save.state.rpg.run === run, reset.rpg.run);
        assert.notEqual(reset.rpg.run, released.rpg.run); await p.evaluate(() => inflightTarget.click()); await p.waitForTimeout(400);
        assert.deepEqual(await state(p), reset); assert.equal(await durable(p), await durable(other)); await other.close();
        evidence.push({ label: 'inflight access and storage cancellation', released, reset });
      } finally { await p.context().close(); }
    });
    await test('큰 글자 긴 대화 게임창 접근·인물 초상·숨은 정체', async () => {
      const p = await page('rpg-opening', 320);
      try {
        await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape');
        for (let i = 0; i < 5; i++) await step(p, 'w'); await p.keyboard.press('Enter');
        await p.waitForSelector('[data-dialogue]'); const before = await state(p);
        await p.locator('[data-world]').focus(); await p.keyboard.press('s'); await p.waitForTimeout(250); assert.deepEqual(await state(p), before);
        const layout = await p.evaluate(() => {
          const nodes = [...document.querySelectorAll('.world-dialogue,.stage-speech,.stage-dialogue,.world-dialogue .tray')];
          return nodes.map(el => { const r = el.getBoundingClientRect(); return { cls: el.className, width: r.width, left: r.left, right: r.right, top: r.top, bottom: r.bottom, scrollable: el.scrollHeight > el.clientHeight + 1, overflow: getComputedStyle(el).overflowY }; });
        });
        assert.equal(layout.length, 4);
        assert.ok(layout.every(n => n.width > 0 && n.left >= -1 && n.right <= 321 && n.top >= -1 && n.bottom <= 845));
        assert.ok(layout.filter(n => !String(n.cls).includes('world-dialogue')).every(n => !n.scrollable && n.overflow === 'visible'));
        assert.ok(['auto', 'scroll'].includes(layout[0].overflow), '긴 대화 창은 내부에서 끝까지 읽을 수 있어야 함');
        await shot(p, 'big-dialogue'); await dialogue(p); assert.equal(await p.locator('[data-world]').evaluate(el => el === document.activeElement), true);
      } finally { await p.context().close(); }
    });
  }
  assert.deepEqual(h.errors, []);
} finally {
  fs.writeFileSync(path.join(shots, prefix + '-observations.json'), JSON.stringify({ passed, failures, evidence, errors: h.errors }, null, 2));
  await h.close();
}
assert.deepEqual(failures, [], 'RPG view 실패');
console.log('RPG view ' + passed + '개 통과');
