import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { probe } from './experience-probe.mjs';
const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const shots = path.join(root, 'tests/shots');
fs.mkdirSync(shots, { recursive: true });
const file = path.join(shots, 't1-save-probe.html');
const d = probe();
d.scenes.splice(2, 0, { id: 'c3-staff', ch: '3', kind: 'waking', lines: ['지팡이를 든다.'] });
d.experiences.push({ scene: 'c3-staff', actor: 'yang', map: 'map-road', spawn: { x: 1, y: 1, facing: 'right' },
  beats: [{ id: 'strike', trigger: { kind: 'staff', target: null }, lines: [0], effects: [] }], optional: [] });
fs.writeFileSync(file, '<!doctype html><meta charset="utf-8"><title>저장 권한 검사</title><p>격리된 core 저장 검사</p><script>window.G={data:' +
  JSON.stringify(d) + '}</script>' + ['world', 'experience', 'play', 'save'].map((name) => '<script src="../../js/core/' + name + '.js"></script>').join('') +
  '<script>G.save.load("t1-native")</script>');
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const full = path.resolve(root, '.' + pathname);
  if (!full.startsWith(root + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', full.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
  response.end(fs.readFileSync(full));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
try {
  for (const protocol of ['http', 'file']) {
    const context = await browser.newContext();
    const requests = [];
    context.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://127.0.0.1:') && !url.startsWith('file:///')) requests.push(url);
    });
    const url = protocol === 'http' ? 'http://127.0.0.1:' + server.address().port + '/tests/shots/t1-save-probe.html' : pathToFileURL(file).href;
    const a = await context.newPage(), b = await context.newPage();
    for (const page of [a, b]) {
      await page.goto(url);
      await page.evaluate(() => { G.save.load('t1-native'); window.originalRun = G.save.state.rpg?.run; });
    }
    const acquired = await Promise.all([a, b].map((page) => page.evaluate(() => G.save.acquireWriter())));
    assert.equal(acquired.filter(Boolean).length, 1);
    const writer = acquired[0] ? a : b, reader = acquired[0] ? b : a;
    assert.equal(await writer.evaluate(() => G.save.access), 'writer');
    assert.equal(await reader.evaluate(() => G.save.access), 'reader');
    const oldRun = await writer.evaluate(() => G.save.state.rpg.run);
    await reader.evaluate((run) => { window.originalRun = run; }, oldRun);
    const wake = await writer.evaluate(() => {
      const run = G.save.state.rpg.run;
      const opened = G.save.transact(run, (s) => { s.started = true; s.pos = 'c3-staff'; s.rpg.cursor = G.experience.cursor(G.data, s.pos, 'strike'); });
      const options = { run, readonly: false, by: 'student' };
      return opened && G.save.beginExperience('c3-staff', options) && G.save.commitWake('c3-staff', 'strike', options).ok;
    });
    assert.equal(wake, true);
    await reader.waitForFunction(() => G.save.state.awake === true);
    const refusal = await reader.evaluate(() => {
      const before = JSON.stringify(G.save.state);
      const ok = G.save.transact(originalRun, (s) => { s.awake = false; s.name = 'reader'; });
      return !ok && before === JSON.stringify(G.save.state) && !G.save.write(originalRun);
    });
    assert.equal(refusal, true);
    const reset = await writer.evaluate(() => {
      const old = G.save.state.rpg.run;
      let cancelled = false;
      const ok = G.save.reset(old, { confirmed: true, cancel() { cancelled = true; } });
      return { ok, cancelled, run: G.save.state.rpg.run, stale: !G.save.transact(old, (s) => { s.name = 'old callback'; }) };
    });
    assert.equal(reset.ok, true); assert.equal(reset.cancelled, true); assert.equal(reset.stale, true); assert.notEqual(reset.run, oldRun);
    await reader.waitForFunction((run) => G.save.state.rpg?.run === run, reset.run);
    await writer.close();
    assert.equal(await reader.evaluate(() => G.save.acquireWriter()), true);
    assert.equal(await reader.evaluate(() => G.save.state.rpg.run), reset.run);
    assert.equal(await reader.evaluate(() => G.save.write(originalRun)), false);
    await reader.evaluate(() => G.save.releaseWriter());
    assert.equal(await reader.evaluate(() => G.save.canWrite(G.save.state.rpg.run)), false);
    assert.equal(await reader.evaluate(() => G.save.acquireWriter()), true);
    // 브라우저의 실제 캐시 복귀 여부를 기록하고 권한 실패는 별도로 검사한다.
    const revived = await context.newPage(); await revived.goto(url);
    await revived.evaluate(() => { window.addEventListener('pageshow', (e) => { window.wasPersisted = e.persisted; }); G.save.load('t1-native'); });
    await revived.goto(protocol === 'http' ? url + '?away=1' : 'about:blank');
    assert.equal(await reader.evaluate(() => {
      const run = G.save.state.rpg.run, options = { run, readonly: false, by: 'student' };
      return G.save.transact(run, (s) => { s.started = true; s.pos = 'c3-staff'; s.rpg.cursor = G.experience.cursor(G.data, s.pos, 'strike'); }) &&
        G.save.beginExperience('c3-staff', options) && G.save.commitWake('c3-staff', 'strike', options).ok;
    }), true);
    await revived.goBack({ waitUntil: 'commit' });
    await revived.waitForFunction(() => G.save.state.awake === true && G.save.state.pos === 'c3-awake');
    assert.equal(await revived.evaluate(() => G.save.canWrite(G.save.state.rpg?.run)), false);
    if (protocol === 'http') assert.equal(await revived.evaluate(() => window.wasPersisted), true);
    console.log('✓ ' + protocol + ': writer 1개·reader 불변·깨어남 수신·확인 초기화·옛 run 거부·종료 후 최신 권한 이전; bfcache=' +
      await revived.evaluate(() => window.wasPersisted === true));
    const blocked = await context.newPage(); await blocked.goto(url);
    assert.equal(await blocked.evaluate(async () => {
      Object.defineProperty(navigator, 'locks', { value: undefined }); G.save.load('t1-native');
      const result = await G.save.acquireWriter(); return result === false && G.save.access === 'unavailable' && G.save.write('run') === false;
    }), true);
    const reviewData = probe('world-event');
    reviewData.maps[0].objects[1].visibleAt = ['e04-exam:talk', 'e04-exam:leave'];
    const after = JSON.parse(JSON.stringify(reviewData.maps[0]));
    after.id = 'map-after'; after.objects = [after.objects[1]]; after.objects[0].visibleAt = [];
    reviewData.maps.push(after);
    reviewData.experiences[1].beats[1].map = 'map-after';
    reviewData.experiences[1].beats[1].spawn = { x: 3, y: 2, facing: 'right' };
    const reviewPage = await context.newPage(); await reviewPage.goto(url);
    await reviewPage.addScriptTag({ url: new URL('../../js/core/data.js', url).href });
    const migrated = await reviewPage.evaluate(async (data) => {
      G.data = data;
      if (G.checkData(data, { profile: 'world-event' }).length) throw Error('invalid representative');
      G.save.load('t1-review-native');
      const old = G.save.fresh(); delete old.rpg;
      old.started = true; old.pos = 'e04-exam';
      // 뒤 장면은 선생님 바로가기의 auto 기록으로 남아 있다.
      old.rpg = { v: 1, run: 'native-f1', cursor: null, scenes: { 'e08-wonsu': { status: 'auto', beat: null, actions: [], hint: 'teacher' } } };
      localStorage.setItem(G.save.key, JSON.stringify(old)); G.save.load();
      if (!await G.save.acquireWriter()) throw Error('writer unavailable');
      const run = G.save.state.rpg.run, options = { run, readonly: false, by: 'student' };
      if (!G.save.beginExperience('e04-exam', options) || !G.save.applyExperience('e04-exam', 'talk', options).ok) throw Error('F1 failed');
      for (const direction of ['down', 'right', 'right']) if (!G.save.move(direction, options)) throw Error('move failed');
      if (!G.save.applyExperience('e04-exam', 'leave', options).ok || !G.save.finishExperience('e04-exam', options).ok) throw Error('F3 failed');
      G.save.load();
      return { pos: G.save.state.pos, map: G.save.state.rpg.cursor.map, auto: G.save.state.rpg.scenes['e08-wonsu'].status,
        actions: G.save.state.rpg.scenes['e08-wonsu'].actions, hint: G.save.state.rpg.scenes['e08-wonsu'].hint, removed: ['abil', 'res', 'best', 'events'].filter(k => Object.hasOwn(G.save.state, k)), run };
    }, reviewData);
    assert.equal(migrated.pos, 'e08-wonsu'); assert.equal(migrated.map, 'map-after'); assert.equal(migrated.auto, 'auto');
    assert.deepEqual(migrated.actions, []); assert.equal(migrated.hint, 'teacher'); assert.deepEqual(migrated.removed, []);
    const reviewReader = await context.newPage(); await reviewReader.goto(url);
    const observed = await reviewReader.evaluate(async (data) => {
      G.data = data; G.save.load('t1-review-native');
      const acquired = await G.save.acquireWriter();
      const before = JSON.stringify(G.save.state), options = { run: G.save.state.rpg.run, readonly: false, by: 'student' };
      const rejected = G.save.finishExperience('e08-wonsu', options).reason === 'readonly';
      return { acquired, rejected, unchanged: before === JSON.stringify(G.save.state), run: G.save.state.rpg.run, map: G.save.state.rpg.cursor.map };
    }, reviewData);
    assert.equal(observed.acquired, false); assert.equal(observed.rejected, true); assert.equal(observed.unchanged, true);
    assert.equal(observed.run, migrated.run); assert.equal(observed.map, 'map-after');
    const shared = probe();
    shared.maps[0].objects.push({ id: 'note', x: 3, y: 1, kind: 'scenery', solid: false, label: '기록', visibleAt: [], action: 'read-note' });
    shared.experiences[1].optional.push({ id: 'read-note', trigger: { kind: 'inspect', target: 'note' }, lines: [], effects: [] });
    assert.equal(await reviewPage.evaluate((data) => G.checkData(data, { profile: 'world-opening' })
      .some((p) => p.startsWith('visible-action:') && p.includes('c3-awake')), shared), true);
    const fake = await reviewPage.evaluate(async (data) => {
      G.save.releaseWriter(); G.data = data; G.save.load('t1-review-f2');
      const old = G.save.fresh(); delete old.rpg;
      old.started = true; old.pos = 'c1-bridge'; old.rpg = { v: 1, run: 'native-f2', cursor: null,
        scenes: { 'c1-bridge': { status: 'done', beat: null, actions: [], hint: null } } };
      const raw = JSON.stringify(old); localStorage.setItem(G.save.key, raw); G.save.load();
      const before = G.save.state.pos === 'c1-bridge' && !G.save.canWrite('native-f2') && localStorage.getItem(G.save.key) === raw;
      const acquired = await G.save.acquireWriter();
      const safe = G.save.state.pos === 'c1-bridge' && G.save.state.rpg.scenes['c1-bridge'].status === 'active';
      G.save.releaseWriter(); return { before, acquired, safe };
    }, probe());
    assert.deepEqual(fake, { before: true, acquired: true, safe: true });
    console.log('✓ ' + protocol + ': F1/F2/F3 저장 이관·다중맵 auto·reader 보호 및 F4 공유 지도 검증');
    assert.deepEqual(requests, []);
    if (protocol === 'http') await reader.screenshot({ path: path.join(shots, 't1-native-http.png') });
    await context.close();
  }
  console.log('✓ 실제 Chrome core 저장 검증 통과 (전체 게임 화면·학생 완주 검증 아님)');
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
