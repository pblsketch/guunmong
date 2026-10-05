import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { start, target, dialogue, ready } from './rpg-harness.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SHOTS = path.join(ROOT, 'tests/shots');
const FIXTURE = '/tests/fixtures/world-opening.js';
const KEY = 'guunmong-v2-fixture-world-opening';
const LOADER_ERROR = 'startup-data-probe: loader failure';
const BOOT_ERROR = 'startup-data-probe: boot failure';
const sha = raw => createHash('sha256').update(raw ?? 'null').digest('hex');
const interpSource = fs.readFileSync(path.join(ROOT, 'js/data/interp.js'), 'utf8');
const sourceContext = { window: {} };
vm.runInNewContext(interpSource, sourceContext, { filename: 'js/data/interp.js' });
const productionInterp = sourceContext.window.GUUN.interp;
const canonicalInterp = {
  first: { option: 'i-vain', evidence: 'E5' }, heard: true,
  changed: { option: 'i-nondual', evidence: 'E9' }, revised: true, final: true,
};
function validInterp(value) {
  assert.deepEqual(Object.keys(value).sort(), ['changed', 'final', 'first', 'heard', 'revised']);
  for (const key of ['heard', 'revised', 'final']) assert.equal(typeof value[key], 'boolean');
  for (const [pick, heard] of [[value.first, false], [value.changed, value.heard]]) {
    if (pick === null) continue;
    assert.deepEqual(Object.keys(pick).sort(), ['evidence', 'option']);
    assert.equal(typeof pick.option, 'string'); assert.equal(typeof pick.evidence, 'string');
    assert.ok(productionInterp.options.some(option => option.id === pick.option), '제품 해석 option id');
    const evidence = productionInterp.evidence.find(evidence => evidence.id === pick.evidence);
    assert.ok(evidence, '제품 해석 evidence id');
    assert.ok(heard || !evidence.after, '첫 해석에는 응답 뒤 근거를 사용하지 않음');
  }
  assert.ok(value.first); assert.ok(!value.final || value.heard);
  assert.equal(value.revised, value.changed !== null);
  if (value.changed) assert.notDeepEqual(value.changed, value.first);
}

// 자료·저장 실패 회귀 전용 주입. 제품 HTML/main을 그대로 읽으며 학생 완주 증거에는 쓰지 않는다.
export async function startupDataFailures() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const phase = process.env.STARTUP_GUARD_PHASE || 'green';
  const lines = [], failures = [], networkErrors = [], modes = new Map();
  let passed = 0, pageSerial = 0;
  const fixtureSource = fs.readFileSync(path.join(ROOT, FIXTURE.slice(1)), 'utf8');
  const log = value => {
    const line = typeof value === 'string' ? value : JSON.stringify(value);
    lines.push(line); console.log(line);
  };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://local').pathname;
    if (pathname === '/startup-probe-away.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end('<!doctype html><title>복귀 검사</title><p>로컬 검사 화면</p>'); return;
    }
    const mode = modes.get(req.headers['x-startup-probe']) || 'valid';
    if (pathname === FIXTURE) {
      if (mode === '404') { res.writeHead(404).end(); return; }
      let body = fixtureSource;
      if (mode === 'invalid') body += '\nwindow.GUUN.experiences = [];';
      if (mode === 'loaderthrow') body += '\nObject.defineProperty(window.GUUN, "maps", { get() { throw new Error(' + JSON.stringify(LOADER_ERROR) + '); } });';
      if (mode === 'bootthrow') body += '\nwindow.GUUN.bgm = {}; Object.defineProperty(window.GUUN.bgm, "title", { get() { throw new Error(' + JSON.stringify(BOOT_ERROR) + '); } });';
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(body); return;
    }
    const file = path.resolve(ROOT, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(path.resolve(ROOT) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end(); return;
    }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
    res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const runCase = async (name, fn) => {
    try { await fn(); passed++; log('PASS ' + name); }
    catch (error) { failures.push(name + ': ' + error.message); log('FAIL ' + name + ': ' + error.message); }
  };
  async function page(mode = 'valid', options = {}) {
    const id = String(++pageSerial); modes.set(id, mode);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'x-startup-probe': id } });
    await context.addInitScript(() => {
      window.startupProbe = { reads: [], writes: [], locks: [] };
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (this === localStorage) startupProbe.reads.push(key);
        return getItem.call(this, key);
      };
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          if (this === localStorage) startupProbe.writes.push({ method, key: args[0] ?? null });
          return original.apply(this, args);
        };
      }
      if (navigator.locks?.request) {
        const request = navigator.locks.request.bind(navigator.locks);
        navigator.locks.request = (...args) => { startupProbe.locks.push(args[0]); return request(...args); };
      }
    });
    if (options.locks) await context.addInitScript(kind => {
      if (kind === 'absent') Object.defineProperty(navigator, 'locks', { value: undefined });
      else navigator.locks.request = () => Promise.reject(new Error('startup-data-probe: locks failure'));
    }, options.locks);
    const p = await context.newPage(); p.setDefaultTimeout(7000);
    let expected404 = 0, expectedConsole = 0;
    p.on('pageerror', error => networkErrors.push(error.stack));
    p.on('request', request => {
      if (!request.url().startsWith(origin + '/')) networkErrors.push('외부 요청 ' + request.url());
    });
    p.on('requestfailed', request => {
      if (mode === '404' && request.url() === origin + FIXTURE && expected404 === 1 && request.failure()?.errorText === 'net::ERR_ABORTED') return;
      networkErrors.push('요청 실패 ' + request.url() + ': ' + request.failure()?.errorText);
    });
    p.on('response', response => {
      if (response.status() < 400) return;
      if (mode === '404' && response.url() === origin + FIXTURE && response.status() === 404) expected404++;
      else networkErrors.push('HTTP ' + response.status() + ' ' + response.url());
    });
    p.on('console', message => {
      if (message.type() !== 'error') return;
      const expected = mode === 'loaderthrow' ? LOADER_ERROR : mode === 'bootthrow' ? BOOT_ERROR : null;
      if (expected && (message.text() === 'Error: ' + expected || message.text().startsWith('Error: ' + expected + '\n'))) expectedConsole++;
      else if (mode === '404' && message.text() === 'Failed to load resource: the server responded with a status of 404 (Not Found)') return;
      else networkErrors.push('console ' + message.text());
    });
    return { p, context, setMode: value => { mode = value; modes.set(id, value); }, expected: () => ({ expected404, expectedConsole }) };
  }
  const raw = p => p.evaluate(key => localStorage.getItem(key), KEY);
  async function capture(p, name, before) {
    const after = await raw(p);
    if (before !== undefined) fs.writeFileSync(path.join(SHOTS, `startup-guard-${phase}-${name}-before.json`), before ?? 'null');
    fs.writeFileSync(path.join(SHOTS, `startup-guard-${phase}-${name}-after.json`), after ?? 'null');
    await p.screenshot({ path: path.join(SHOTS, `startup-guard-${phase}-${name}.png`), fullPage: true });
    const evidence = await p.evaluate(() => ({ ok: G.data.ok, missing: G.data.missing,
      problems: G.data.problems, booted: !!G.app.booted, access: G.save.access,
      key: G.save.key, memoryRpg: G.save.state.rpg, writes: startupProbe.writes,
      locks: startupProbe.locks, text: document.getElementById('app').innerText }));
    log({ case: name, beforeBytes: before == null ? 0 : Buffer.byteLength(before), afterBytes: after == null ? 0 : Buffer.byteLength(after),
      beforeSha256: sha(before), afterSha256: sha(after), rawEqual: before === after, ...evidence });
    return { after, evidence };
  }
  async function fault(p, mode) {
    await p.reload();
    await p.waitForFunction(() => !!G.app.booted || !!document.querySelector('[data-startup-error]'));
    if (mode !== 'loaderthrow' && mode !== 'bootthrow') await p.waitForFunction(() => G.data.missing.length || G.data.problems.length || G.app.booted);
  }
  function noStartupWrites(result, expected) {
    assert.equal(result.after, expected, 'raw localStorage bytes 보존');
    assert.deepEqual(result.evidence.writes, [], '자료 실패 때 setItem/removeItem/clear 호출 없음');
    assert.deepEqual(result.evidence.locks, [], '자료 실패 때 writer 요청 없음');
    assert.equal(result.evidence.memoryRpg, null, '자료 실패 때 저장 load/이관 없음');
    assert.equal(result.evidence.booted, false, '자료 실패 때 boot 없음');
    assert.equal(result.evidence.key, 'guunmong-v2', '자료 실패 때 저장 열쇠 선택도 하지 않음');
    assert.match(result.evidence.text, /자료.*읽/);
    assert.match(result.evidence.text, /새로 고침/);
    assert.match(result.evidence.text, /다시 시도/);
    assert.doesNotMatch(result.evidence.text, /fixture|profile|프로필|js\/|\.js/);
  }
  try {
    log({ phase, chrome: await browser.version(), origin, html: 'index.html 원본', mainSha256: sha(fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8')),
      isolatedContext: true, note: '일반 입력 부분 기록 + 실패 회귀 전용 자료 주입. 학생 완주 아님.' });
    validInterp(canonicalInterp);
    log({ canonicalInterpSource: 'js/data/interp.js', sourceSha256: sha(interpSource),
      storageContract: 'js/data/README.md:237', canonicalInterp });
    for (const mode of ['404', 'invalid', 'loaderthrow']) {
      await runCase('부분 RPG 기록 보존·복구 ' + mode, async () => {
        const setup = await page(); const { p, context } = setup;
        try {
          await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
          await target(p, 'bridge-voice'); await dialogue(p);
          const before = await raw(p), saved = JSON.parse(before);
          assert.deepEqual(saved.rpg.scenes['c1-bridge'].actions, [{ id: 'bridge-talk', by: 'student' }]);
          assert.equal(saved.rpg.scenes['c1-bridge'].beat, 'bridge-leave');
          assert.notEqual(saved.rpg.cursor.x, 2); assert.equal(saved.teacher, false);
          log({ case: mode, normalInput: { run: saved.rpg.run, actions: saved.rpg.scenes['c1-bridge'].actions, cursor: saved.rpg.cursor } });
          setup.setMode(mode); await fault(p, mode);
          const result = await capture(p, 'partial-' + mode, before);
          noStartupWrites(result, before);
          assert.equal(setup.expected().expected404, mode === '404' ? 1 : 0);
          assert.equal(setup.expected().expectedConsole, mode === 'loaderthrow' ? 1 : 0);
          setup.setMode('valid'); await p.reload(); await ready(p);
          assert.equal(await raw(p), before, '복구·writer 획득 뒤 같은 bytes');
          await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await p.waitForSelector('[data-world]');
          assert.equal(await p.locator('.play').getAttribute('data-beat'), 'bridge-leave');
          assert.equal(await raw(p), before, '좌표·행동·run·awake·해석 그대로 재개');
          await target(p, 'bridge-exit'); await dialogue(p);
          const continued = JSON.parse(await raw(p));
          assert.equal(continued.rpg.run, saved.rpg.run);
          assert.deepEqual(continued.rpg.scenes['c1-bridge'].actions, [...saved.rpg.scenes['c1-bridge'].actions, { id: 'bridge-leave', by: 'student' }]);
          assert.equal(continued.awake, saved.awake); assert.equal(continued.awakeAt, saved.awakeAt); assert.deepEqual(continued.interp, saved.interp);
          log({ case: mode, recovery: { rawEqualBeforeResume: true, run: continued.rpg.run, actions: continued.rpg.scenes['c1-bridge'].actions, awake: continued.awake, interp: continued.interp } });
        } finally { await context.close(); }
      });
      await runCase('빈 저장에서 새 run·열쇠 생성 없음 ' + mode, async () => {
        const { p, context } = await page(mode);
        try {
          await p.goto(origin + '/index.html?fixture=world-opening');
          await p.waitForFunction(() => !!G.app.booted || !!document.querySelector('[data-startup-error]'));
          noStartupWrites(await capture(p, 'empty-' + mode, null), null);
          assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []);
          // 실패 화면의 복귀 이벤트 회귀이며 실제 bfcache 탭 검사의 대체 증거는 아니다.
          await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
          noStartupWrites(await capture(p, 'failed-pageshow-' + mode, null), null);
          assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), [], '실패 화면 복귀 때 다른 열쇠에도 쓰지 않음');
        } finally { await context.close(); }
      });
    }
    await runCase('caught boot 오류는 기록 삭제를 알리지 않음', async () => {
      const setup = await page(); const { p, context } = setup;
      try {
        await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
        await target(p, 'bridge-voice'); await dialogue(p);
        const before = await raw(p); setup.setMode('bootthrow'); await fault(p, 'bootthrow');
        const result = await capture(p, 'bootthrow', before);
        assert.equal(result.after, before); assert.equal(result.evidence.ok, true);
        assert.equal(result.evidence.booted, false); assert.equal(setup.expected().expectedConsole, 1);
        assert.doesNotMatch(result.evidence.text, /자료|기록.*(?:지우|삭제|없애)|fixture|js\/|\.js/);
        assert.match(result.evidence.text, /새로 고침.*다시 시도/);
      } finally { await context.close(); }
    });
    for (const mode of ['404', 'invalid', 'loaderthrow']) await runCase('기존 awake·유효 v2 확정 해석·새 run 거부 ' + mode, async () => {
      const setup = await page(); const { p, context } = setup;
      try {
        await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
        await target(p, 'bridge-voice'); await dialogue(p);
        // 깨어남·해석 호환 회귀 전용 옛 기록. 일반 입력으로 깨어났거나 완주했다는 증거가 아니다.
        await p.evaluate(({ key, interp }) => {
          const saved = JSON.parse(localStorage.getItem(key));
          saved.awake = true; saved.awakeAt = 1700000000000; saved.pos = 'c3-awake'; saved.rpg.cursor = null;
          saved.interp = interp;
          localStorage.setItem(key, JSON.stringify(saved));
        }, { key: KEY, interp: canonicalInterp });
        await p.reload(); await ready(p); const before = await raw(p), saved = JSON.parse(before);
        validInterp(saved.interp); assert.deepEqual(saved.interp, canonicalInterp);
        setup.setMode(mode); await fault(p, mode);
        const failed = await capture(p, 'awake-' + mode, before);
        noStartupWrites(failed, before);
        validInterp(JSON.parse(failed.after).interp);
        assert.deepEqual(JSON.parse(failed.after).interp, canonicalInterp);
        setup.setMode('valid'); await p.reload(); await ready(p); assert.equal(await raw(p), before);
        await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await p.waitForSelector('[data-world]');
        assert.equal(await p.locator('.play').getAttribute('data-scene'), 'c3-awake');
        const resumedRaw = await raw(p), resumed = JSON.parse(resumedRaw);
        assert.equal(resumed.rpg.run, saved.rpg.run); assert.equal(resumed.awake, true);
        assert.equal(resumed.awakeAt, saved.awakeAt); assert.deepEqual(resumed.interp, saved.interp);
        validInterp(resumed.interp); assert.deepEqual(resumed.interp, canonicalInterp);
        assert.deepEqual(await p.evaluate(() => G.save.state.interp), canonicalInterp, '복구 메모리도 유효한 해석과 일치');
        assert.deepEqual(resumed.rpg.scenes['c1-bridge'], saved.rpg.scenes['c1-bridge']);
        assert.equal(await p.evaluate(() => G.app.canOpen('c1-bridge')), false);
        assert.equal(await p.evaluate(() => G.save.access), 'writer');
        const rejected = await p.evaluate(key => {
          const currentRun = G.save.state.rpg.run, attemptedRun = 'startup-rejected-' + currentRun;
          const snapshot = G.save.state, memory = JSON.stringify(snapshot), stored = localStorage.getItem(key), writes = startupProbe.writes.length;
          const lockedFields = {};
          for (const field of ['first', 'heard', 'changed', 'revised', 'final']) lockedFields[field] = G.save.transact(currentRun, draft => {
            if (field === 'first') draft.interp.first = draft.interp.changed;
            else if (field === 'changed') draft.interp.changed = null;
            else draft.interp[field] = false;
          });
          return { lockedFields, attemptedRun, canWrite: G.save.canWrite(attemptedRun), write: G.save.write(attemptedRun),
            transact: G.save.transact(attemptedRun, draft => { draft.interp.final = false; }),
            replaceRun: G.save.transact(currentRun, draft => { draft.rpg.run = attemptedRun; }),
            actionReason: G.save.applyExperience('c3-awake', 'awake-look', { run: attemptedRun, by: 'student', readonly: false }).reason,
            memorySame: G.save.state === snapshot, memoryEqual: JSON.stringify(G.save.state) === memory, rawEqual: localStorage.getItem(key) === stored,
            writes: startupProbe.writes.length - writes };
        }, KEY);
        assert.deepEqual(rejected.lockedFields, { first: false, heard: false, changed: false, revised: false, final: false });
        for (const key of ['canWrite', 'write', 'transact', 'replaceRun']) assert.equal(rejected[key], false, key + '로 새 run 거부');
        assert.equal(rejected.actionReason, 'stale'); assert.equal(rejected.memorySame, true); assert.equal(rejected.memoryEqual, true);
        assert.equal(rejected.rawEqual, true); assert.equal(rejected.writes, 0);
        assert.equal(await raw(p), resumedRaw, '거부 검사 전후 원본 그대로');
        log({ case: 'awake-' + mode, recovery: { run: resumed.rpg.run, awake: resumed.awake, awakeAt: resumed.awakeAt, interp: resumed.interp, dreamLocked: true }, rejected });
      } finally { await context.close(); }
    });
    for (const locks of ['absent', 'reject']) await runCase('자료 성공 후 기존 unavailable 흐름 ' + locks, async () => {
      const { p, context } = await page('valid', { locks });
      try {
        await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p);
        assert.equal(await p.evaluate(() => G.data.ok), true);
        assert.equal(await p.evaluate(() => G.save.access), 'unavailable');
        assert.equal(await p.getByRole('button', { name: '시작하기', exact: true }).isDisabled(), true);
        assert.equal(await p.locator('[data-startup-error]').count(), 0);
        assert.equal(await raw(p), null);
      } finally { await context.close(); }
    });
    for (const mode of ['404', 'invalid', 'loaderthrow']) {
      await runCase('초기 자료 실패도 공개 load/권한 진입 거부 ' + mode, async () => {
        const { p, context } = await page(mode);
        try {
          await p.goto(origin + '/index.html?fixture=world-opening');
          await p.waitForSelector('[data-startup-error="data"]');
          const result = await p.evaluate(async () => {
            const snapshot = G.save.state, key = G.save.key, reads = startupProbe.reads.length;
            const loadedSame = G.save.load('world-opening') === snapshot;
            const acquired = await G.save.acquireWriter();
            return { dataFailed: G.data.ok === false, loadedSame, acquired, memorySame: G.save.state === snapshot,
              keySame: G.save.key === key, reads: startupProbe.reads.length - reads,
              writes: startupProbe.writes.length, locks: startupProbe.locks.length, keys: Object.keys(localStorage),
              access: G.save.access, error: G.save.error };
          });
          log({ case: 'initial-api-' + mode, result });
          assert.deepEqual(result, { dataFailed: true, loadedSame: true, acquired: false, memorySame: true,
            keySame: true, reads: 0, writes: 0, locks: 0, keys: [], access: 'unavailable', error: 'data-not-ready' });
        } finally { await context.close(); }
      });
      for (const kind of ['rpg', 'legacy', 'empty']) await runCase('F1 공개 API 무읽기·무이관·무쓰기 ' + mode + '/' + kind, async () => {
        const setup = await page(); const { p, context } = setup;
        try {
          await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p);
          if (kind !== 'empty') { await start(p); await target(p, 'bridge-voice'); await dialogue(p); }
          // 옛 판/빈 저장은 실패 회귀 전용 준비이며 학생 완주 증거가 아니다.
          await p.evaluate(({ key, kind }) => {
            if (kind === 'empty') localStorage.removeItem(key);
            if (kind === 'legacy') { const saved = JSON.parse(localStorage.getItem(key)); delete saved.rpg; localStorage.setItem(key, JSON.stringify(saved)); }
          }, { key: KEY, kind });
          const before = await raw(p); setup.setMode(mode); await fault(p, mode);
          const outcome = await p.evaluate(async fixture => {
            const memory = G.save.state, snapshot = JSON.stringify(memory), key = G.save.key;
            const stored = JSON.stringify(Object.entries(localStorage).sort());
            const reads = startupProbe.reads.length;
            const loadedSame = [fixture, undefined, null].every(value => G.save.load(value) === memory);
            const acquired = await G.save.acquireWriter();
            const run = G.save.state.rpg?.run || 'probe-rejected'; let mutations = 0, cancelled = 0;
            const write = G.save.write(run), transact = G.save.transact(run, draft => { mutations++; draft.name = '거부'; });
            const reset = G.save.reset(run, { confirmed: true, cancel: () => { cancelled++; } });
            const action = G.save.applyExperience('c1-bridge', 'bridge-talk', { run, readonly: false, by: 'student' });
            const readsDelta = startupProbe.reads.length - reads;
            return { loadedSame, acquired, write, transact, reset, mutations, cancelled, readsDelta, actionReason: action.reason,
              memorySame: G.save.state === memory && JSON.stringify(G.save.state) === snapshot, keySame: G.save.key === key,
              rawSame: JSON.stringify(Object.entries(localStorage).sort()) === stored, access: G.save.access, error: G.save.error };
          }, 'world-opening');
          await capture(p, 'public-' + mode + '-' + kind, before); log({ case: 'public-' + mode + '-' + kind, outcome });
          assert.equal(outcome.acquired, false); assert.equal(outcome.loadedSame, true);
          for (const key of ['write', 'transact', 'reset']) assert.equal(outcome[key], false);
          for (const key of ['memorySame', 'keySame', 'rawSame']) assert.equal(outcome[key], true);
          assert.equal(outcome.mutations, 0); assert.equal(outcome.cancelled, 0); assert.equal(outcome.readsDelta, 0);
          assert.equal(outcome.actionReason, 'unavailable'); assert.equal(outcome.error, 'data-not-ready');
          assert.equal(outcome.access, 'unavailable');
          assert.deepEqual(await p.evaluate(() => startupProbe.writes), []);
          assert.deepEqual(await p.evaluate(() => startupProbe.locks), []);
        } finally { await context.close(); }
      });
      for (const native of [false, true]) await runCase('F2 기록 있는 실패 화면 snapshot/key 보존 ' + mode + '/' + (native ? '실제 bfcache' : '합성 pageshow'), async () => {
        const setup = await page(); const { p, context } = setup;
        try {
          await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
          await target(p, 'bridge-voice'); await dialogue(p); const savedRaw = await raw(p);
          setup.setMode(mode); await fault(p, mode);
          // 기본 열쇠도 이 격리 문맥에서 만든 기록의 사본만 사용한다. 개인 기록을 읽지 않는다.
          await p.evaluate(savedRaw => { localStorage.setItem('guunmong-v2', savedRaw); startupProbe.writes.length = 0; }, savedRaw);
          const before = await p.evaluate(() => {
            window.startupSnapshot = G.save.state;
            return { memory: JSON.stringify(G.save.state), key: G.save.key, stored: JSON.stringify(Object.entries(localStorage).sort()), reads: startupProbe.reads.length };
          });
          if (native) {
            await p.evaluate(() => window.addEventListener('pageshow', event => { window.startupRestored = event.persisted; }));
            await p.goto(origin + '/startup-probe-away.html'); await p.goBack({ waitUntil: 'commit' });
            await p.waitForFunction(() => window.startupRestored === true);
          } else await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
          const after = await p.evaluate(() => ({ memory: JSON.stringify(G.save.state), memorySame: G.save.state === startupSnapshot, key: G.save.key,
            stored: JSON.stringify(Object.entries(localStorage).sort()), reads: startupProbe.reads.length, writes: startupProbe.writes, locks: startupProbe.locks,
            persisted: window.startupRestored, access: G.save.access, error: G.save.error }));
          log({ case: 'restore-' + mode + '-' + native, before, after, memoryEqual: before.memory === after.memory });
          await p.screenshot({ path: path.join(SHOTS, `startup-guard-${phase}-restore-${mode}-${native}.png`), fullPage: true });
          assert.equal(after.memory, before.memory, '복귀 load/normalize도 snapshot을 바꾸지 않음');
          assert.equal(after.memorySame, true); assert.equal(after.reads, before.reads);
          assert.equal(after.key, before.key); assert.equal(after.stored, before.stored);
          assert.deepEqual(after.writes, []); assert.deepEqual(after.locks, []);
          assert.equal(after.access, 'unavailable'); assert.equal(after.error, 'data-not-ready');
          if (native) assert.equal(after.persisted, true);
        } finally { await context.close(); }
      });
    }
    for (const native of [false, true]) await runCase('F2 core 명시 실패의 부분 행동·S 객체 보존 ' + (native ? '실제 bfcache' : '합성 pageshow'), async () => {
      const { p, context } = await page();
      try {
        await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
        await target(p, 'bridge-voice'); await dialogue(p);
        const before = await p.evaluate(() => {
          window.startupSnapshot = G.save.state;
          G.data.ok = false; G.data.experiences = []; G.data.scenes = [];
          startupProbe.writes.length = 0; startupProbe.locks.length = 0;
          window.addEventListener('pageshow', event => { window.startupRestored = event.persisted; });
          return { memory: JSON.stringify(startupSnapshot), key: G.save.key, raw: localStorage.getItem(G.save.key), reads: startupProbe.reads.length };
        });
        const recorded = JSON.parse(before.memory);
        assert.deepEqual(recorded.rpg.scenes['c1-bridge'].actions, [{ id: 'bridge-talk', by: 'student' }]);
        if (native) {
          await p.goto(origin + '/startup-probe-away.html'); await p.goBack({ waitUntil: 'commit' });
          await p.waitForFunction(() => window.startupRestored === true);
        } else await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        const after = await p.evaluate(() => ({ memory: JSON.stringify(G.save.state), memorySame: G.save.state === startupSnapshot,
          key: G.save.key, reads: startupProbe.reads.length, raw: localStorage.getItem(G.save.key),
          writes: startupProbe.writes, locks: startupProbe.locks, persisted: window.startupRestored }));
        assert.equal(after.memorySame, true); assert.equal(after.memory, before.memory);
        assert.equal(after.key, before.key); assert.equal(after.raw, before.raw); assert.equal(after.reads, before.reads);
        assert.deepEqual(after.writes, []); assert.deepEqual(after.locks, []); assert.equal(after.persisted, true);
        log({ case: 'partial-core-restore-' + native, memorySame: after.memorySame, rawEqual: after.raw === before.raw,
          run: recorded.rpg.run, actions: recorded.rpg.scenes['c1-bridge'].actions, readsDelta: after.reads - before.reads, persisted: after.persisted });
      } finally { await context.close(); }
    });
    await runCase('canonical final:false도 first 변경을 거부', async () => {
      const { p, context } = await page();
      try {
        await p.goto(origin + '/index.html?fixture=world-opening'); await ready(p); await start(p);
        const pending = { first: canonicalInterp.first, heard: false, changed: null, revised: false, final: false };
        validInterp(pending);
        await p.evaluate(({ key, interp }) => { const saved = JSON.parse(localStorage.getItem(key)); saved.interp = interp; localStorage.setItem(key, JSON.stringify(saved)); }, { key: KEY, interp: pending });
        await p.reload(); await ready(p);
        const alternateFirst = { option: canonicalInterp.changed.option, evidence: canonicalInterp.first.evidence };
        validInterp({ ...pending, first: alternateFirst });
        const result = await p.evaluate(first => {
          const memory = G.save.state, raw = localStorage.getItem(G.save.key), count = startupProbe.writes.length;
          const ok = G.save.transact(memory.rpg.run, draft => { draft.interp.first = first; });
          return { ok, final: G.save.state.interp.final, memorySame: G.save.state === memory, rawSame: localStorage.getItem(G.save.key) === raw, writes: startupProbe.writes.length - count };
        }, alternateFirst);
        assert.deepEqual(result, { ok: false, final: false, memorySame: true, rawSame: true, writes: 0 });
        log({ case: 'pending-first', result });
      } finally { await context.close(); }
    });
    assert.deepEqual(networkErrors, [], '새 외부 요청·예상 밖 404·JS 예외 없음');
    assert.deepEqual(failures, [], 'startup 실패 회귀');
    log('startup 자료·복구·오류·권한 회귀 ' + passed + '개 통과');
  } finally {
    await browser.close(); await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(SHOTS, `startup-guard-${phase}-probe.log`), lines.join('\n') + '\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startupDataFailures();
