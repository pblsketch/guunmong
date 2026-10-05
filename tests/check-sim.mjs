import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { probe } from './fixtures/experience-probe.mjs';
import { execFileSync } from 'node:child_process';
const read = (file) => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));
let checks = 0;
async function test(name, fn) {
  try { await fn(); checks++; console.log('✓ ' + name); }
  catch (e) { console.error('✗ ' + name + ': ' + e.stack); process.exitCode = 1; }
}
function boot(data = probe(), memory = new Map(), locks) {
  const listeners = {};
  const ctx = vm.createContext({ G: { data }, window: { addEventListener(k, fn) { listeners[k] = fn; } }, console,
    crypto: { randomUUID: () => 'run-' + (++boot.serial) }, navigator: { locks }, AbortController,
    localStorage: { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) } });
  for (const file of ['world', 'experience', 'save', 'data']) {
    const source = process.argv.includes('--review-baseline') && ['save', 'data'].includes(file) ?
      execFileSync('git', ['show', 'e138edc7bcfe44ca16868f4e921349dc09ba5bb0:js/core/' + file + '.js'], { encoding: 'utf8' }) : read('js/core/' + file + '.js');
    vm.runInContext(source, ctx);
  }
  Object.assign(ctx.G.data, data);
  // 순수 자료 mock에는 로더의 ok 표식이 없다. 명시 false를 준 회귀는 그대로 둔다.
  if (!Object.hasOwn(data, 'ok')) delete ctx.G.data.ok;
  ctx.listeners = listeners; ctx.memory = memory;
  return ctx;
}
boot.serial = 0;
function lockService() {
  const held = new Set();
  return { request: async (name, options, callback) => {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { return await callback({ name }); } finally { held.delete(name); }
  } };
}
await test('v2 reader는 run을 만들지 않고 writer 최초 이관만 저장한다', async () => {
  const ctx = boot(probe(), new Map(), lockService());
  ctx.G.save.load();
  assert.equal(ctx.G.save.state.rpg, null);
  assert.equal(await ctx.G.save.acquireWriter(), true);
  assert.equal(ctx.G.save.access, 'writer');
  assert.ok(ctx.G.save.state.rpg.run);
  ctx.G.save.releaseWriter();
});
if (process.argv.includes('--red-reader')) {
  const baseline = boot();
  vm.runInContext(execFileSync('git', ['show', 'c49d3d0860a9dbe51a617799ca5e422e93e608de:js/core/save.js'], { encoding: 'utf8' }), baseline);
  baseline.G.save.load();
  const before = clone(baseline.G.save.state);
  await test('reader의 첫 시도 변경을 실제로 거부해야 한다 (구판 RED)', () => {
    baseline.G.save.ledgerTry('a-wish', false, { run: 'old', readonly: true });
    assert.deepEqual(clone(baseline.G.save.state), before);
  });
  process.exit(process.exitCode || 0);
}
function staffProbe() {
  const data = probe(), base = clone(data.experiences[0]);
  data.scenes.splice(2, 0, { id: 'c3-staff', ch: '3', kind: 'waking', lines: ['지팡이를 든다.'] });
  data.experiences.push({ ...base, scene: 'c3-staff', beats: [{ id: 'strike', trigger: { kind: 'staff', target: null }, lines: [0], effects: [] }] });
  return data;
}
async function writer(data = probe(), saved, locks = lockService(), memory = new Map()) {
  const ctx = boot(data, memory, locks);
  if (saved) memory.set('guunmong-v2', JSON.stringify(saved));
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), true);
  const run = ctx.G.save.state.rpg.run;
  return { ctx, G: ctx.G, run, options: { run, readonly: false, by: 'student' } };
}
function legacy(patch = {}) {
  const ctx = boot(); const s = ctx.G.save.fresh(); delete s.rpg;
  return { ...s, started: true, pos: 'c1-bridge', ...patch };
}
await test('네 방향 벽·범위·solid·인접 경로·숨긴 대상', () => {
  const { G } = boot(), map = probe().maps[1];
  assert.equal(G.world.move(map, { x: 0, y: 0 }, 'up', 'c1-bridge', 'talk'), null);
  assert.equal(G.world.move(map, { x: 0, y: 0 }, 'left', 'c1-bridge', 'talk'), null);
  assert.equal(G.world.move(map, { x: 4, y: 4 }, 'right', 'c1-bridge', 'talk'), null);
  assert.equal(G.world.move(map, { x: 4, y: 4 }, 'down', 'c1-bridge', 'talk'), null);
  assert.equal(G.world.move(map, { x: 1, y: 1 }, 'right', 'c1-bridge', 'talk'), null);
  map.walk[2][1] = 0;
  assert.equal(G.world.move(map, { x: 1, y: 1 }, 'down', 'c1-bridge', 'talk'), null);
  assert.equal(G.world.walkable(map, 1.5, 1, 'c1-bridge', 'talk'), false);
  assert.equal(G.world.path(map, { x: 1, y: 1 }, map.objects[0], 'c1-bridge', 'talk').length, 1);
  map.objects[0].visibleAt = ['c1-bridge:leave'];
  assert.equal(G.world.objects(map, 'c1-bridge', 'talk').length, 1);
  assert.equal(G.world.walkable(map, 2, 1, 'c1-bridge', 'talk'), true);
});
for (const [name, patch] of Object.entries({
  '일반': {}, '부분 준비': { events: { 'e04-exam': { turns: ['study'], rolls: [2], grade: null } }, pos: 'e04-exam' },
  '완료': { events: { 'e04-exam': { grade: 'shine', auto: false } }, done: { 'e04-exam': true }, pos: 'e04-exam' },
  '자동': { events: { 'e04-exam': { grade: 'fine', auto: true, turns: ['study', 'sword'] } }, pos: 'e04-exam' },
  '깨어남': { awake: true, awakeAt: 123, pos: 'c1-bridge' },
  '확정 해석': { interp: { first: { option: 'A', evidence: 'E1' }, heard: true, final: true, revised: true } },
})) await test('v2 이관 ' + name + ': 기록 유지·새 행동 조작 없음', async () => {
  const saved = legacy({ ...patch, abil: { munjang: 90 }, res: { wealth: 777 }, best: 999,
    items: ['it-tungso'], bonds: ['chae'], pearls: { chae: true }, ledger: { 'a-wish': { first: false, help: 'teacher', final: true } } });
  const d = name === '부분 준비' || name === '완료' || name === '자동' ? probe('world-event') : probe();
  const { G, ctx } = await writer(d, saved);
  for (const field of ['events', 'items', 'bonds', 'pearls', 'ledger', 'interp', 'best', 'awake', 'awakeAt']) assert.deepEqual(clone(G.save.state[field]), clone(saved[field]));
  assert.equal(G.save.state.abil.munjang, 90);
  assert.equal(G.save.state.res.wealth, 777);
  for (const rec of Object.values(G.save.state.rpg.scenes)) assert.equal(rec.actions.length, 0);
  if (name === '완료') { assert.equal(G.save.state.pos, 'e08-wonsu'); assert.equal(G.save.state.rpg.scenes['e04-exam'].status, 'done'); }
  if (name === '자동') assert.equal(G.save.state.rpg.scenes['e04-exam'].status, 'auto');
  if (name === '부분 준비') assert.equal(G.save.state.rpg.cursor.map, 'map-road');
  if (name === '깨어남') assert.equal(G.save.state.pos, 'c3-awake');
  assert.equal(ctx.memory.has('guunmong-v1'), false);
  G.save.releaseWriter();
});
await test('권한 전·reader·readonly·이전 run은 메모리와 저장 모두 불변', async () => {
  const locks = lockService(), memory = new Map(), a = await writer(probe(), legacy(), locks, memory);
  const b = boot(probe(), memory, locks); b.G.save.load();
  const before = clone(b.G.save.state), raw = memory.get(a.G.save.key);
  const opts = { run: a.run, readonly: false, by: 'student' };
  for (const access of ['acquiring', 'reader']) {
    if (access === 'reader') assert.equal(await b.G.save.acquireWriter(), false);
    assert.equal(b.G.save.access, access);
    assert.equal(b.G.save.write(a.run), false);
    assert.equal(b.G.save.transact(a.run, (s) => { s.name = '변경'; }), false);
    assert.equal(b.G.save.ledgerTry('a-wish', true, opts), false);
    assert.equal(b.G.save.applyExperience('c1-bridge', 'talk', opts).reason, 'readonly');
    assert.deepEqual(clone(b.G.save.state), before); assert.equal(memory.get(a.G.save.key), raw);
  }
  assert.throws(() => { b.G.save.state.name = '변경'; }, TypeError);
  assert.throws(() => { b.G.save.state.items.push('it-forged'); });
  assert.equal(a.G.save.applyExperience('c1-bridge', 'talk', { ...opts, readonly: true }).reason, 'readonly');
  assert.equal(a.G.save.applyExperience('c1-bridge', 'talk', { ...opts, run: 'previous' }).reason, 'stale');
  for (const [save, denied] of [[b.G.save, opts], [a.G.save, { ...opts, run: 'previous' }], [a.G.save, { ...opts, readonly: true }]]) {
    const snapshot = save.state;
    assert.equal(save.beginExperience('c1-bridge', denied), false);
    assert.equal(save.finishExperience('c1-bridge', denied).ok, false);
    assert.equal(save.move('down', denied), false);
    assert.equal(save.experienceHelp('c1-bridge', 'student', denied), false);
    assert.equal(save.fillBefore(probe().scenes, 'c1-cell', denied), false);
    assert.equal(save.ledgerHelp('a-wish', 'student', denied), false);
    assert.equal(save.ledgerDone('a-wish', denied), false);
    assert.equal(save.wrongNote({ act: 'a-wish', slot: '1' }, denied), false);
    assert.strictEqual(save.state, snapshot);
  }
  let cancelled = false;
  assert.equal(b.G.save.reset(a.run, { confirmed: true, cancel() { cancelled = true; } }), false);
  assert.equal(a.G.save.reset('previous', { confirmed: true, cancel() { cancelled = true; } }), false);
  assert.equal(a.G.save.reset(a.run, { readonly: true, confirmed: true, cancel() { cancelled = true; } }), false);
  assert.equal(cancelled, false);
  a.G.save.releaseWriter(); b.G.save.releaseWriter();
});
await test('필수 순서·중복·대상 인접·수행자·물건/인연/구슬 일회성', async () => {
  const d = probe(), e = d.experiences[0], scene = d.scenes[0];
  scene.items = [{ id: 'it-fan' }]; scene.meet = 'chae'; d.bonds = [{ id: 'chae' }];
  e.beats[0].effects = [{ kind: 'item', id: 'it-fan' }, { kind: 'bond', id: 'chae' }, { kind: 'story', id: 'c1-bridge:talk' }];
  d.maps[1].objects.push({ id: 'bead', x: 1, y: 2, kind: 'pearl', solid: false, label: '구슬', visibleAt: ['c1-bridge:talk'], action: 'bead' });
  e.optional.push({ id: 'bead', trigger: { kind: 'inspect', target: 'bead' }, lines: [], effects: [{ kind: 'pearl', id: 'chae' }] });
  const { G, options, run } = await writer(d, legacy());
  assert.equal(G.save.applyExperience(scene.id, 'leave', options).reason, 'blocked');
  assert.equal(G.save.applyExperience(scene.id, 'missing', options).reason, 'invalid');
  assert.equal(G.save.applyExperience(scene.id, 'talk', { ...options, by: 'robot' }).reason, 'invalid');
  assert.equal(G.save.applyExperience(scene.id, 'talk', { ...options, by: 'teacher' }).reason, 'blocked');
  assert.equal(G.save.beginExperience(scene.id, options), true);
  assert.equal(G.save.applyExperience(scene.id, 'bead', options).ok, true);
  assert.equal(G.save.applyExperience(scene.id, 'bead', options).reason, 'duplicate');
  assert.equal(G.save.applyExperience(scene.id, 'talk', options).ok, true);
  const before = clone(G.save.state);
  assert.equal(G.save.applyExperience(scene.id, 'talk', { ...options, by: 'teacher' }).reason, 'blocked');
  assert.equal(G.save.applyExperience(scene.id, 'talk', options).reason, 'duplicate');
  assert.deepEqual(clone(G.save.state), before);
  assert.deepEqual(clone(G.save.state.items), ['it-fan']); assert.deepEqual(clone(G.save.state.bonds), ['chae']);
  assert.equal(G.save.state.pearls.chae, true);
  assert.deepEqual(clone(G.experience.facts(G.save.state, d)), ['c1-bridge:talk']);
  assert.equal(G.save.applyExperience(scene.id, 'leave', options).reason, 'blocked');
  for (const direction of ['down', 'right', 'right']) assert.equal(G.save.move(direction, options), true);
  assert.equal(G.save.applyExperience(scene.id, 'leave', options).ok, true);
  assert.equal(G.save.finishExperience(scene.id, options).ok, true);
  assert.equal(G.save.state.pos, 'c1-cell'); assert.equal(G.save.state.done[scene.id], true);
  assert.equal(G.save.applyExperience(scene.id, 'talk', options).reason, 'duplicate');
  assert.equal(G.save.canWrite(run), true); G.save.releaseWriter();
});
await test('순수 apply는 readonly·이전 회차·locked·staff를 거부하고 상태 보존', async () => {
  const { G, options } = await writer(probe(), legacy());
  for (const patch of [{ readonly: true }, { run: 'old' }, { by: 'none' }]) {
    const s = clone(G.save.state), before = clone(s);
    assert.equal(G.experience.apply(s, probe(), 'c1-bridge', 'talk', { ...options, ...patch }).ok, false);
    assert.deepEqual(s, before);
  }
  const s = clone(G.save.state); s.awake = true;
  assert.equal(G.experience.apply(s, probe(), 'c1-bridge', 'talk', options).reason, 'locked');
  G.save.releaseWriter();
});
await test('교사 도움 우선·수행자 최초 기록·두 활동 정오답/확정 잠금', async () => {
  const { G, options, run } = await writer(probe(), legacy({ teacher: true }));
  G.save.beginExperience('c1-bridge', options);
  assert.equal(G.save.experienceHelp('c1-bridge', 'teacher', options), true);
  assert.equal(G.save.experienceHelp('c1-bridge', 'student', options), true);
  assert.equal(G.save.state.rpg.scenes['c1-bridge'].hint, 'teacher');
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', { ...options, by: 'teacher' }).ok, true);
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).reason, 'duplicate');
  assert.equal(G.save.state.rpg.scenes['c1-bridge'].actions[0].by, 'teacher');
  assert.equal(G.save.ledgerTry('e01-huayin', true, options), false);
  G.save.ledgerHelp('a-wish', 'teacher', options); G.save.ledgerTry('a-wish', true, options);
  G.save.ledgerDone('a-wish', options); G.save.ledgerHelp('a-wish', 'student', options);
  assert.deepEqual(clone(G.save.state.ledger['a-wish']), { first: null, help: 'teacher', final: true });
  G.save.ledgerTry('j-match', false, options); G.save.ledgerTry('j-match', true, options);
  assert.equal(G.save.state.ledger['j-match'].first, false);
  assert.equal(G.save.transact(run, (s) => { s.ledger['a-wish'].first = true; }), false);
  G.save.wrongNote({ act: 'j-match', slot: 'A', picked: 'X', answer: 'Y' }, options);
  assert.equal(G.save.wrongNote({ act: 'j-match', slot: 'A', picked: 'Z' }, options), false);
  assert.equal(G.save.state.wrong.length, 1); G.save.releaseWriter();
});
await test('이동 저장 실패·행동 수령 실패·완료 실패 때 같은 상태 객체 보존', async () => {
  const { G, ctx, options } = await writer(probe(), legacy());
  G.save.beginExperience('c1-bridge', options);
  const before = G.save.state, stored = ctx.memory.get(G.save.key), write = ctx.localStorage.setItem;
  ctx.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(G.save.move('down', options), false);
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).reason, 'unavailable');
  assert.strictEqual(G.save.state, before); assert.equal(ctx.memory.get(G.save.key), stored);
  ctx.localStorage.setItem = write;
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).ok, true);
  for (const direction of ['down', 'right', 'right']) G.save.move(direction, options);
  G.save.applyExperience('c1-bridge', 'leave', options);
  const ready = G.save.state;
  ctx.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(G.save.finishExperience('c1-bridge', options).reason, 'unavailable');
  assert.strictEqual(G.save.state, ready); G.save.releaseWriter();
});
await test('새 run 전체 초기화는 확인·취소 뒤 한 번 저장하며 실패하면 옛 run 유지', async () => {
  const { G, ctx, run, options } = await writer(probe(), legacy({ music: false, awake: true, awakeAt: 123 }));
  let cancelled = 0, writes = 0; const write = ctx.localStorage.setItem;
  ctx.localStorage.setItem = (...args) => { writes++; write(...args); };
  assert.equal(G.save.reset(run, { confirmed: false, cancel() { cancelled++; } }), false);
  const before = G.save.state;
  ctx.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(G.save.reset(run, { confirmed: true, cancel() { cancelled++; } }), false);
  assert.strictEqual(G.save.state, before); assert.equal(cancelled, 1);
  ctx.localStorage.setItem = (...args) => { writes++; write(...args); };
  assert.equal(G.save.reset(run, { confirmed: true, cancel() { cancelled++; } }), true);
  assert.equal(writes, 1); assert.equal(cancelled, 2); assert.notEqual(G.save.state.rpg.run, run);
  assert.equal(G.save.state.awake, false); assert.equal(G.save.state.music, false);
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).reason, 'stale');
  assert.equal(G.save.transact(run, (s) => { s.name = 'old callback'; }), false);
  assert.equal(G.save.write(run), false); G.save.releaseWriter();
});
for (const bad of [null, [], 'wrong', { v: 1, run: '' }, { v: 1, run: 2 }]) await test('잘못된 기존 run은 새 회차 생성 없이 읽기 전용: ' + JSON.stringify(bad), async () => {
  const s = legacy({ awake: true, awakeAt: 321, interp: { final: true }, rpg: bad });
  const ctx = boot(probe(), new Map([['guunmong-v2', JSON.stringify(s)]]), lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), false);
  assert.equal(ctx.G.save.access, 'unavailable'); assert.equal(ctx.G.save.state.awakeAt, 321);
  assert.equal(ctx.G.save.state.interp.final, true);
  assert.deepEqual(JSON.parse(ctx.memory.get('guunmong-v2')), clone(s));
});
await test('rpg 자료형·id·순서·by·좌표·다른 단계 지도 기본화; 구판 기록 불변', async () => {
  const base = await writer(probe(), legacy()); base.G.save.beginExperience('c1-bridge', base.options);
  const saved = clone(base.G.save.state); base.G.save.releaseWriter();
  for (const change of [
    (s) => { s.rpg.cursor.x = -1; }, (s) => { s.rpg.cursor.x = 1.5; }, (s) => { s.rpg.cursor.x = 2; },
    (s) => { s.rpg.cursor.map = 'map-cell'; }, (s) => { s.rpg.cursor.facing = 'diagonal'; },
    (s) => { s.rpg.cursor.scene = 'c1-cell'; }, (s) => { s.rpg.cursor = []; },
    (s) => { s.rpg.scenes['unknown'] = { status: 'done' }; },
    (s) => { s.rpg.scenes['c1-bridge'].actions = [{ id: 'leave', by: 'student' }]; },
    (s) => { s.rpg.scenes['c1-bridge'].actions = [{ id: 'talk', by: 'robot' }]; },
    (s) => { s.rpg.scenes['c1-bridge'].actions = [{ id: 'talk', by: 'student' }, { id: 'talk', by: 'student' }]; },
    (s) => { s.rpg.scenes['c1-bridge'].status = 'bad'; s.rpg.scenes['c1-bridge'].hint = 'bad'; s.rpg.scenes['c1-bridge'].beat = 'bad'; },
    (s) => { s.rpg.scenes = []; }, (s) => { s.rpg.v = 55; },
  ]) {
    const s = clone(saved); change(s);
    const { G } = await writer(probe(), s);
    assert.equal(G.save.state.rpg.run, saved.rpg.run);
    assert.deepEqual(clone(G.save.state.rpg.cursor), clone(saved.rpg.cursor));
    assert.equal(G.save.state.rpg.scenes.unknown, undefined);
    const rec = G.save.state.rpg.scenes['c1-bridge'];
    if (rec) { assert.equal(rec.beat, 'talk'); assert.equal(rec.actions.length, 0); assert.equal(rec.status, 'active'); assert.equal(rec.hint, null); }
    assert.deepEqual(clone(G.save.state.ledger), saved.ledger); G.save.releaseWriter();
  }
});
await test('자동 안내는 학생 완료·물건·소원·행동을 만들지 않고 다음 pos만 이동', async () => {
  const { G, options, run } = await writer(probe('world-event'), legacy({ teacher: true, pos: 'e04-exam' }));
  assert.deepEqual(clone(G.save.fillBefore(G.data.scenes, 'e08-wonsu', options)), ['e04-exam']);
  assert.equal(G.save.applyExperience('e04-exam', 'talk', options).reason, 'blocked');
  assert.equal(G.save.finishExperience('e04-exam', options).ok, true);
  assert.equal(G.save.state.rpg.scenes['e04-exam'].status, 'auto'); assert.equal(G.save.state.done['e04-exam'], undefined);
  assert.equal(G.save.state.items.length, 0); assert.equal(G.save.state.pos, 'e08-wonsu');
  assert.equal(G.save.transact(run, (s) => { s.res.wealth = 200; }), false); G.save.releaseWriter();
});
await test('writer 이전 때 최신 저장·run·awake를 다시 읽음; fixture 별도 lock', async () => {
  const data = staffProbe(), locks = lockService(), memory = new Map(), a = await writer(data, legacy(), locks, memory), b = boot(data, memory, locks);
  b.G.save.load(); assert.equal(await b.G.save.acquireWriter(), false);
  const action = a.G.experience.find(a.G.data, 'c3-staff').beats.find(beat => beat.trigger.kind === 'staff');
  assert.equal(a.G.save.transact(a.run, s => { s.pos = 'c3-staff'; s.rpg.cursor = a.G.experience.cursor(a.G.data, s.pos, action.id); }), true);
  assert.equal(a.G.save.beginExperience('c3-staff', a.options), true);
  assert.equal(a.G.save.commitWake('c3-staff', action.id, a.options).ok, true);
  b.listeners.storage({ key: a.G.save.key }); assert.equal(b.G.save.state.awake, true);
  assert.equal(b.G.save.applyExperience('c1-bridge', 'talk', a.options).reason, 'readonly');
  const oldRun = a.run;
  a.G.save.reset(a.run, { confirmed: true, cancel() {} });
  const latestRun = a.G.save.state.rpg.run; a.G.save.releaseWriter(); await Promise.resolve();
  assert.equal(await b.G.save.acquireWriter(), true); assert.equal(b.G.save.state.rpg.run, latestRun);
  assert.equal(b.G.save.write(oldRun), false);
  const c = boot(data, memory, locks); c.G.save.load('probe');
  assert.equal(await c.G.save.acquireWriter(), true); assert.notEqual(c.G.save.key, b.G.save.key);
  b.G.save.releaseWriter(); c.G.save.releaseWriter();
});
await test('Web Locks 부재·요청 거부·취소·pagehide/bfcache에서 쓰기 금지', async () => {
  const missing = boot(); missing.G.save.load(); assert.equal(await missing.G.save.acquireWriter(), false); assert.equal(missing.G.save.access, 'unavailable');
  const rejected = boot(probe(), new Map(), { request() { throw Error('denied'); } }); rejected.G.save.load();
  assert.equal(await rejected.G.save.acquireWriter(), false); assert.equal(rejected.G.save.write('run'), false);
  let late;
  const pending = boot(probe(), new Map(), { request(name, opts, callback) { late = callback; return new Promise(() => {}); } });
  pending.G.save.load(); const acquiring = pending.G.save.acquireWriter(); await Promise.resolve(); await Promise.resolve(); pending.G.save.releaseWriter();
  if (late) await late({ name: 'released' });
  assert.equal(await acquiring, false); assert.equal(pending.G.save.access, 'reader');
  const { G, ctx, run } = await writer(); ctx.listeners.pagehide(); assert.equal(G.save.write(run), false);
  ctx.listeners.pageshow({ persisted: true }); assert.equal(G.save.canWrite(run), false);
  assert.equal(await G.save.acquireWriter(), true); G.save.releaseWriter();
});
await test('소원은 저장된 원작 단계·물건과 옛 완료만 사용; 입장·능력·auto로 추정 안 함', async () => {
  const ctx = boot(), G = ctx.G, d = probe('world-event');
  d.wishes = ['chuljang', 'bugwi', 'pungryu', 'gongmyeong', 'misaek'].map((id) => ({ id, name: id }));
  const s = legacy({ pos: 'e08-wonsu', best: 99999, abil: { eumak: 999 }, res: { wealth: 9999, fame: 9999 },
    events: { 'e08-wonsu': { grade: 'shine', auto: true }, 'e11-seungsang': { grade: 'shine', auto: true } } });
  assert.deepEqual(clone(G.experience.wishes(s, d).map((w) => w.fill)), [0, 0, 0, 0, 0]);
  s.done['e08-wonsu'] = true; s.events['e08-wonsu'].auto = false; s.events['e11-seungsang'] = { grade: 'near', auto: false };
  s.items = ['it-girinpo', 'it-geomungo', 'it-tungso']; s.bonds = ['all-eight'];
  assert.deepEqual(clone(G.experience.wishes(s, d).map((w) => w.fill)), [1, 1, 1, 1, 0]);
  assert.equal(G.experience.wishes(s, d)[4].name, '?');
  s.journal.revealed = { misaek: true }; assert.equal(G.experience.wishes(s, d)[4].hidden, false);
});
await test('단계 장소 전환은 안전 입구; 이전 map cursor는 버리고 행동은 유지', async () => {
  const d = probe(), e = d.experiences[0];
  e.beats[1].map = 'map-cell'; e.beats[1].spawn = { x: 3, y: 2, facing: 'right' };
  const { G, ctx, options } = await writer(d, legacy()); G.save.beginExperience(e.scene, options);
  assert.equal(G.save.applyExperience(e.scene, 'talk', options).ok, true);
  assert.equal(G.save.state.rpg.cursor.map, 'map-cell'); assert.equal(G.save.state.rpg.cursor.x, 3);
  const saved = clone(G.save.state); saved.rpg.cursor.map = 'map-road'; ctx.memory.set(G.save.key, JSON.stringify(saved));
  G.save.load(); assert.equal(G.save.state.rpg.cursor.map, 'map-cell'); assert.equal(G.save.state.rpg.scenes[e.scene].actions.length, 1);
  G.save.releaseWriter();
});
await test('staff는 일반 행동/완료 불가; 타격의 사실+awake+pos 원자 저장·실패 보존', async () => {
  const d = staffProbe();
  const { G, ctx, run, options } = await writer(d, legacy());
  assert.equal(G.save.transact(run, (s) => { s.pos = 'c3-staff'; s.rpg.cursor = G.experience.cursor(d, s.pos, 'strike'); }), true);
  G.save.beginExperience('c3-staff', options);
  assert.equal(G.save.applyExperience('c3-staff', 'strike', options).reason, 'blocked');
  assert.equal(G.save.finishExperience('c3-staff', options).reason, 'blocked');
  const before = G.save.state, write = ctx.localStorage.setItem; ctx.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(G.save.commitWake('c3-staff', 'strike', options).ok, false); assert.strictEqual(G.save.state, before);
  ctx.localStorage.setItem = write;
  assert.equal(G.save.commitWake('c3-staff', 'strike', options).ok, true);
  const persisted = JSON.parse(ctx.memory.get(G.save.key)); assert.equal(persisted.awake, true); assert.equal(persisted.pos, 'c3-awake');
  assert.equal(persisted.rpg.scenes['c3-staff'].actions[0].id, 'strike');
  const at = G.save.state.awakeAt;
  assert.equal(G.save.transact(run, (s) => { s.awake = false; s.awakeAt = 0; }), true);
  assert.equal(G.save.state.awake, true); assert.equal(G.save.state.awakeAt, at);
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).reason, 'locked');
  G.save.releaseWriter();
});
for (const profile of ['world-opening', 'world-event']) await test('대표 프로필 양성·자료 자신으로 실제 검사 완화 금지: ' + profile, () => {
  const { G } = boot(), d = probe(profile);
  assert.deepEqual(clone(G.checkData(d, { profile })), []);
  assert.ok(G.checkData({ ...d, fixture: profile }).some((p) => p.startsWith('event-count:')));
  assert.ok(G.checkData(d).some((p) => p.startsWith('map-art:')));
});
const invalidData = [
  ['map-walk', (d) => { d.maps[1].walk[0] = [1]; }], ['map-walk', (d) => { d.maps[1].walk[0][0] = true; }],
  ['map-size', (d) => { d.maps[1].tile = 0; }], ['map-duplicate', (d) => { d.maps.push(clone(d.maps[1])); }],
  ['object-position', (d) => { d.maps[1].objects[0].x = 0.5; }], ['object-person', (d) => { d.maps[1].objects[0].person = 'unknown'; }],
  ['object-fields', (d) => { d.maps[1].objects[0].solid = 1; }], ['object-visible', (d) => { d.maps[1].objects[0].visibleAt = [1]; }],
  ['visibility-reference', (d) => { d.maps[1].objects[0].visibleAt = ['c1-cell:talk']; }],
  ['experience-actor', (d) => { d.experiences[0].actor = 'horse'; }], ['experience-map', (d) => { d.experiences[0].map = 'missing'; }],
  ['experience-spawn', (d) => { d.experiences[0].spawn.x = 2; }], ['experience-spawn', (d) => { d.experiences[0].spawn.facing = 'none'; }],
  ['action-lines', (d) => { d.experiences[0].beats[0].lines = [99]; }], ['action-lines', (d) => { d.experiences[0].beats[0].lines = ['0']; }],
  ['action-target', (d) => { d.experiences[0].beats[0].trigger.target = 'unknown'; }],
  ['action-trigger', (d) => { d.experiences[0].beats[0].trigger.kind = 'battle'; }],
  ['action-duplicate', (d) => { d.experiences[0].beats.push(clone(d.experiences[0].beats[0])); }],
  ['action-map', (d) => { d.experiences[0].beats[1].map = 'map-cell'; }],
  ['action-appearance', (d) => { d.experiences[0].beats[0].appearance = 'unapproved'; }],
  ['action-field', (d) => { d.experiences[0].beats[0].text = '본문 복제'; }],
  ['effect-fields', (d) => { d.experiences[0].beats[0].effects = [{ kind: 'bond', id: 'chae', score: 1 }]; }],
  ['effect-item', (d) => { d.experiences[0].beats[0].effects = [{ kind: 'item', id: 'it-unknown' }]; }],
  ['effect-bond', (d) => { d.experiences[0].beats[0].effects = [{ kind: 'bond', id: 'unknown' }]; }],
  ['pearl-required', (d) => { d.scenes[0].meet = 'chae'; d.bonds = [{ id: 'chae' }]; d.experiences[0].beats[0].effects = [{ kind: 'pearl', id: 'chae' }]; }],
  ['optional-reward', (d) => { d.scenes[0].items = [{ id: 'it-fan' }]; d.experiences[0].optional = [{ id: 'fan', trigger: { kind: 'inspect', target: 'person' }, lines: [], effects: [{ kind: 'item', id: 'it-fan' }] }]; }],
  ['optional-transition', (d) => { d.experiences[0].optional = [{ id: 'other', trigger: { kind: 'continue', target: null }, lines: [], effects: [], map: 'map-cell', spawn: { x: 1, y: 1, facing: 'up' } }]; }],
  ['optional-target', (d) => { d.experiences[0].optional = [{ id: 'other', trigger: { kind: 'inspect', target: 'missing' }, lines: [], effects: [] }]; }],
  ['object-action', (d) => { d.maps[1].objects.push({ id: 'unknown', x: 3, y: 3, kind: 'scenery', solid: false, label: '대상', visibleAt: [], action: 'missing' }); }],
  ['staff-action', (d) => { d.experiences[0].beats[0].trigger = { kind: 'staff', target: null }; }],
  ['effect-story', (d) => { d.experiences[0].beats[0].effects = [{ kind: 'story', id: 'e12-honrye:future' }]; }],
  ['exit-order', (d) => { d.experiences[0].beats.reverse(); }],
  ['action-path', (d) => { d.maps[1].objects[1].y = 4; d.maps[1].walk = [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]; }],
  ['same-cell', (d) => { d.experiences[1].map = 'map-road'; }],
  ['unverified-original', (d) => { d.experiences[0].orig = '未照合'; }],
  ['story-limit', (d) => { d.scenes[0].lines = ['가'.repeat(4401), '나']; }],
];
for (const [code, change] of invalidData) await test('데이터 음성: ' + code, () => {
  const { G } = boot(), d = probe(); change(d);
  assert.ok(G.checkData(d, { profile: 'world-opening' }).some((p) => p.startsWith(code + ':')), code);
});
await test('월드 본문 참조는 복사 없이 글 총량에 한 번 포함', () => {
  const { G } = boot(), d = probe(), baseline = G.storyText(d).count;
  d.experiences[0].beats[0].lines = [0, 0]; assert.equal(G.storyText(d).count, baseline);
  d.scenes[0].kind = 'journal'; assert.equal(G.storyText(d).count, baseline);
  d.scenes[0].lines[0] = '가'.repeat(4401); assert.ok(G.storyText(d).count > 4400);
});
await test('기존96px·아이콘과 새 다방향 시트 메타는 각각 승인 형식으로 검증', () => {
  const { G } = boot();
  const directions = Object.fromEntries(['up', 'down', 'left', 'right'].map((key, row) => [key, { row, stand: 0, walk: [1, 2, 3, 4, 5] }]));
  const sprites = { hoseung: { src: 'assets/sprites/hoseung.webp', width: 96, height: 96, frames: 4, rows: 1 },
    icon: { src: 'assets/ui/icon_fame.png', width: 32, height: 32, frames: 1, rows: 1 },
    yang: { src: 'assets/sprites/yang_walk.webp', width: 32, height: 32, frames: 6, rows: 4,
      cell: { width: 32, height: 32 }, anchor: { x: 16, y: 30 }, directions } };
  assert.deepEqual(clone(G.checkSprites(sprites)), []);
  for (const [code, change] of [
    ['sprite-meta', (s) => { s.yang.rows = 0; }], ['sprite-meta', (s) => { s.yang.src = 'https://outside.invalid/a.webp'; }],
    ['sprite-cell', (s) => { s.yang.cell.height = 96; }], ['sprite-anchor', (s) => { s.yang.anchor.x = 33; }],
    ['sprite-directions', (s) => { delete s.yang.directions.left; }], ['sprite-direction', (s) => { s.yang.directions.up.row = 4; }],
    ['sprite-direction', (s) => { s.yang.directions.down.stand = 6; }], ['sprite-direction', (s) => { s.yang.directions.left.walk = [1, 6]; }],
    ['sprite-direction', (s) => { s.yang.directions.right.walk = [1.5]; }], ['sprite-direction', (s) => { s.yang.directions.right.walk = []; }],
  ]) { const s = clone(sprites); change(s); assert.ok(G.checkSprites(s).some((p) => p.startsWith(code + ':')), code); }
});
await test('원작·인연·미색·대조 전 글·소원 본문 검출은 실제 데이터에 유지', () => {
  const ctx = boot(), { G } = ctx;
  for (const file of fs.readdirSync(new URL('../js/data', import.meta.url)).filter((f) => f.endsWith('.js'))) vm.runInContext(read('js/data/' + file), ctx);
  const baseline = clone(ctx.window.GUUN);
  const reject = (code, change) => { const d = clone(baseline); change(d); assert.ok(G.checkData(d).some((p) => p.startsWith(code + ':')), code); };
  reject('event-order', (d) => { [d.scenes[6], d.scenes[8]] = [d.scenes[8], d.scenes[6]]; });
  reject('event-ids', (d) => { d.scenes.find((s) => s.kind === 'event').id = 'e01-changed'; });
  reject('bond-fill', (d) => { d.bonds[0].fills = ['misaek']; });
  reject('bond-grade', (d) => { d.bonds[0].gradeText = { shine: '수치' }; });
  reject('hidden-wish', (d) => { d.scenes.find((s) => s.kind === 'event').items[0].fills = ['misaek']; });
  reject('awakened', (d) => { d.scenes[1].awakened = true; });
  reject('unverified-original', (d) => { d.scenes[1].lines = [{ orig: '대조 전' }]; });
  reject('optional-scene', (d) => { d.scenes.find((s) => s.kind === 'event').optional = true; });
  reject('evidence', (d) => { d.interp.evidence[0].text = '없는 근거'; });
  for (const field of ['lines', 'narration']) reject('story-limit', (d) => { d.scenes.find((s) => s.kind === 'wish')[field] = field === 'lines' ? ['가'.repeat(4401)] : '나'.repeat(4401); });
  for (const verb of ['얻었다', '차지했다', '맞이했다', '데려왔다']) reject('grade-object', (d) => {
    d.scenes.find((s) => s.kind === 'event').gradeText.shine = d.bonds[0].name + '을 마침내 자신의 것으로 ' + verb;
  });
});
await test('load도 같은 run의 awake/최초 시각을 내리지 않으며 기록 삭제 트랜잭션 거부', async () => {
  const { G, ctx, options, run } = await writer(staffProbe(), legacy());
  G.save.beginExperience('c1-bridge', options); G.save.applyExperience('c1-bridge', 'talk', options);
  assert.equal(G.save.transact(run, (s) => { s.rpg.scenes['c1-bridge'].actions = []; s.rpg.scenes['c1-bridge'].beat = 'talk'; }), false);
  assert.equal(G.save.transact(run, (s) => { s.extra = 'new key'; }), false);
  assert.equal(G.save.transact(run, (s) => { s.items = null; }), false);
  const before = G.save.state, raw = ctx.memory.get(G.save.key);
  assert.equal(G.save.transact(run, (s) => { s.awake = true; s.awakeAt = 777; s.pos = 'c3-awake'; s.rpg.cursor = G.experience.cursor(G.data, s.pos, 'talk'); }), false);
  assert.strictEqual(G.save.state, before); assert.equal(ctx.memory.get(G.save.key), raw);
  const action = G.experience.find(G.data, 'c3-staff').beats.find(beat => beat.trigger.kind === 'staff');
  assert.equal(G.save.transact(run, s => { s.pos = 'c3-staff'; s.rpg.cursor = G.experience.cursor(G.data, s.pos, action.id); }), true);
  assert.equal(G.save.beginExperience('c3-staff', options), true);
  assert.equal(G.save.commitWake('c3-staff', action.id, options).ok, true);
  const stamp = G.save.state.awakeAt;
  const stale = clone(G.save.state); stale.awake = false; stale.awakeAt = 0; ctx.memory.set(G.save.key, JSON.stringify(stale));
  G.save.load(); assert.equal(G.save.state.awake, true); assert.equal(G.save.state.awakeAt, stamp);
  G.save.releaseWriter();
});
await test('저장소 읽기·첫 이관 쓰기 실패는 기존 원본을 덮지 않고 unavailable', async () => {
  const ctx = boot(probe(), new Map([['guunmong-v1', 'never-read'], ['guunmong-v2', '{broken']]), lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), false); assert.equal(ctx.memory.get('guunmong-v2'), '{broken');
  assert.equal(ctx.memory.get('guunmong-v1'), 'never-read');
  const failed = boot(probe(), new Map([['guunmong-v2', JSON.stringify(legacy())]]), lockService());
  failed.G.save.load(); const before = failed.G.save.state, raw = failed.memory.get('guunmong-v2');
  failed.localStorage.setItem = () => { throw Error('denied'); };
  assert.equal(await failed.G.save.acquireWriter(), false); assert.strictEqual(failed.G.save.state, before);
  assert.equal(failed.memory.get('guunmong-v2'), raw); assert.equal(failed.G.save.access, 'unavailable');
  failed.localStorage.getItem = () => { throw Error('denied'); };
  assert.strictEqual(failed.G.save.load(), before);
});
await test('e10의 원작 작은 꿈 행동은 전체 awake를 만들지 않는다', async () => {
  const d = probe('world-event'); d.scenes[0].id = 'e10-neungpa'; d.experiences[0].scene = 'e10-neungpa';
  d.experiences[0].beats[0].effects = [{ kind: 'story', id: 'e10-neungpa:small-dream' }];
  const { G, options } = await writer(d, legacy({ pos: 'e10-neungpa' }));
  assert.equal(G.save.applyExperience('e10-neungpa', 'talk', options).ok, true);
  assert.equal(G.save.state.awake, false); assert.equal(G.save.state.awakeAt, 0); G.save.releaseWriter();
});
await test('F1: 뒤 auto가 먼저 이관된 뒤 현재 부분 사건 begin/apply와 기록 보존', async () => {
  const d = probe('world-event'), saved = legacy({ pos: 'e04-exam', events: {
    'e04-exam': { turns: ['study'], rolls: [2], grade: null, auto: false },
    'e08-wonsu': { turns: ['sword', 'study'], rolls: [1, 2], grade: 'fine', auto: true },
  } });
  const { G, options } = await writer(d, saved);
  try {
    assert.deepEqual(Object.keys(G.save.state.rpg.scenes), ['e08-wonsu']);
    assert.equal(G.save.beginExperience('e04-exam', options), true);
    assert.equal(G.save.applyExperience('e04-exam', 'talk', options).ok, true);
    assert.deepEqual(clone(G.save.state.events), clone(saved.events));
    assert.deepEqual(clone(G.save.state.rpg.scenes['e08-wonsu']), { status: 'auto', beat: null, actions: [], hint: null });
    assert.deepEqual(clone(G.save.state.rpg.scenes['e04-exam'].actions), [{ id: 'talk', by: 'student' }]);
    G.save.load();
    assert.equal(G.save.state.pos, 'e04-exam'); assert.deepEqual(clone(G.save.state.events), clone(saved.events));
    assert.equal(G.save.applyExperience('e04-exam', 'talk', options).reason, 'duplicate');
  } finally { G.save.releaseWriter(); }
});
await test('F2: 검증 전 가짜 done/actions=[]로 pos가 미완료 돌다리를 넘지 않음', async () => {
  const d = probe(), saved = legacy({ rpg: { v: 1, run: 'review-f2', cursor: null,
    scenes: { 'c1-bridge': { status: 'done', beat: null, actions: [], hint: null } } } });
  const memory = new Map([['guunmong-v2', JSON.stringify(saved)]]), ctx = boot(d, memory, lockService());
  ctx.G.save.load();
  assert.equal(ctx.G.save.state.pos, 'c1-bridge');
  assert.equal(ctx.G.save.state.rpg.scenes['c1-bridge'].status, 'active');
  assert.equal(ctx.G.save.state.rpg.cursor.scene, 'c1-bridge');
  assert.equal(memory.get('guunmong-v2'), JSON.stringify(saved));
  assert.equal(ctx.G.save.canWrite('review-f2'), false);
  assert.equal(await ctx.G.save.acquireWriter(), true);
  try { assert.equal(ctx.G.save.state.pos, 'c1-bridge'); assert.equal(ctx.G.save.state.rpg.run, 'review-f2'); }
  finally { ctx.G.save.releaseWriter(); }
});
await test('F3: 검증 통과 다중맵 auto 다음 장면 진입은 beat:null의 마지막 지도 사용', async () => {
  const d = probe('world-event');
  d.maps[0].objects[1].visibleAt = ['e04-exam:talk', 'e04-exam:leave'];
  const after = clone(d.maps[0]); after.id = 'map-after'; after.objects = [clone(after.objects[1])]; after.objects[0].visibleAt = [];
  d.maps.push(after);
  d.experiences[1].beats[1].map = after.id;
  d.experiences[1].beats[1].spawn = { x: 3, y: 2, facing: 'right' };
  const ctx = boot(d);
  assert.deepEqual(clone(ctx.G.checkData(d, { profile: 'world-event' })), []);
  const saved = legacy({ pos: 'e04-exam', rpg: { v: 1, run: 'review-f3',
    cursor: { scene: 'e04-exam', map: 'map-road', x: 3, y: 2, facing: 'right' }, scenes: {
      'e04-exam': { status: 'active', beat: null, actions: [{ id: 'talk', by: 'student' }, { id: 'leave', by: 'student' }], hint: null },
      'e08-wonsu': { status: 'auto', beat: null, actions: [], hint: 'teacher' },
    } } });
  const { G, options, ctx: live } = await writer(d, saved);
  try {
    assert.equal(G.save.finishExperience('e04-exam', options).ok, true);
    assert.equal(G.save.state.pos, 'e08-wonsu'); assert.equal(G.save.state.rpg.cursor.map, 'map-after');
    assert.equal(G.save.state.rpg.scenes['e08-wonsu'].beat, null);
    assert.equal(G.save.state.rpg.scenes['e08-wonsu'].status, 'auto');
    assert.equal(G.save.state.rpg.scenes['e08-wonsu'].actions.length, 0);
    const stored = JSON.parse(live.memory.get(G.save.key)); assert.equal(stored.rpg.cursor.map, 'map-after');
    G.save.load(); assert.equal(G.save.state.rpg.cursor.map, 'map-after');
  } finally { G.save.releaseWriter(); }
});
await test('F4: 공유 선방에 공개되는 행동은 모든 장면에 정의돼야 함', () => {
  const { G } = boot(), d = probe();
  d.maps[0].objects.push({ id: 'note', x: 3, y: 1, kind: 'scenery', solid: false, label: '기록', visibleAt: [], action: 'read-note' });
  const optional = { id: 'read-note', trigger: { kind: 'inspect', target: 'note' }, lines: [], effects: [] };
  d.experiences[1].optional.push(optional);
  assert.ok(G.checkData(d, { profile: 'world-opening' }).some((p) => p.startsWith('visible-action:') && p.includes('c3-awake')));
  d.experiences[2].optional.push(clone(optional));
  assert.deepEqual(clone(G.checkData(d, { profile: 'world-opening' })), []);
  d.experiences[2].optional = [];
  d.maps[0].objects[2].visibleAt = ['c1-cell:talk', 'c1-cell:leave'];
  assert.deepEqual(clone(G.checkData(d, { profile: 'world-opening' })), []);
});
await test('객체 구조는 키집합·값을 검사하고 삽입순서는 무시; 배열 순서·자료형은 보존', async () => {
  const saved = legacy({ events: { preserved: { turns: ['study', 'sword'], rolls: [1, 2], auto: false } },
    ledger: { 'a-wish': { first: false, help: 'teacher', final: true } },
    interp: { first: { option: 'A', evidence: 'E1' }, heard: true, final: true },
    wrong: [{ act: 'j-match', slot: 'A', picked: 'X', answer: 'Y' }] });
  const { G, run, options } = await writer(probe(), saved);
  const reorder = (value) => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ?
    Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reorder(child)])) : value;
  try {
    G.save.beginExperience('c1-bridge', options); G.save.applyExperience('c1-bridge', 'talk', options);
    for (const direction of ['down', 'right', 'right']) assert.equal(G.save.move(direction, options), true);
    assert.equal(G.save.applyExperience('c1-bridge', 'leave', options).ok, true);
    const before = clone(G.save.state);
    assert.equal(G.save.transact(run, (s) => {
      for (const key of Object.keys(s)) s[key] = reorder(s[key]);
    }), true);
    assert.deepEqual(clone(G.save.state), before);
    for (const change of [
      (s) => { s.rpg.scenes['c1-bridge'].extra = undefined; },
      (s) => { delete s.rpg.scenes['c1-bridge'].hint; },
      (s) => { s.rpg.scenes['c1-bridge'].actions.reverse(); },
      (s) => { s.rpg.scenes['c1-bridge'].actions[0].by = 'teacher'; },
      (s) => { delete s.rpg.scenes['c1-bridge'].actions[0]; },
      (s) => { s.events.preserved.turns.reverse(); },
      (s) => { s.events.preserved.rolls[0] = '1'; },
      (s) => { s.ledger['a-wish'].first = 0; },
      (s) => { s.interp.first.option = 'B'; },
      (s) => { s.wrong[0].answer = 'Z'; },
      (s) => { s.rpg.scenes['c1-bridge'].hint = []; },
      (s) => { delete s.started; },
    ]) {
      const stable = G.save.state;
      assert.equal(G.save.transact(run, change), false); assert.strictEqual(G.save.state, stable);
    }
    assert.equal(G.save.canWrite(run), true);
    G.save.load(); assert.deepEqual(clone(G.save.state.events), clone(saved.events));
    assert.deepEqual(clone(G.save.state.interp), clone(saved.interp));
  } finally { G.save.releaseWriter(); }
});
await test('완료를 검증한 재개는 유효 done·옛 완료만 건너뛰며 권한·awake 보존', async () => {
  for (const [patch, expected] of [
    [{}, 'c1-bridge'],
    [{ done: { 'c1-bridge': true } }, 'c1-cell'],
    [{ actions: [{ id: 'talk', by: 'student' }, { id: 'leave', by: 'student' }] }, 'c1-cell'],
    [{ actions: [{ id: 'leave', by: 'student' }] }, 'c1-bridge'],
    [{ awake: true, awakeAt: 123 }, 'c3-awake'],
  ]) {
    const saved = legacy({ done: patch.done || {}, awake: patch.awake || false, awakeAt: patch.awakeAt || 0,
      interp: { first: { option: 'A', evidence: 'E1' }, final: true },
      rpg: { v: 1, run: 'review-resume', cursor: { scene: 'c1-bridge', map: 'map-road', x: 1, y: 1, facing: 'right' },
        scenes: { 'c1-bridge': { status: 'done', beat: null, actions: patch.actions || [], hint: null } } } });
    const raw = JSON.stringify(saved), memory = new Map([['guunmong-v2', raw]]), ctx = boot(probe(), memory, lockService());
    ctx.G.save.load(); assert.equal(ctx.G.save.state.pos, expected);
    assert.equal(ctx.G.save.state.rpg.cursor.scene, expected);
    assert.equal(ctx.G.save.state.awake, saved.awake); assert.equal(ctx.G.save.state.awakeAt, saved.awakeAt);
    assert.deepEqual(clone(ctx.G.save.state.interp), clone(saved.interp));
    assert.equal(ctx.G.save.canWrite('review-resume'), false); assert.equal(memory.get('guunmong-v2'), raw);
    assert.equal(await ctx.G.save.acquireWriter(), true);
    try { assert.equal(ctx.G.save.state.pos, expected); assert.equal(ctx.G.save.state.rpg.run, 'review-resume'); }
    finally { ctx.G.save.releaseWriter(); }
  }
});
await test('F3 보행: active beat:null에서도 첫 지도의 벽으로 마지막 지도를 판정하지 않음', async () => {
  const d = probe('world-event'), after = clone(d.maps[0]);
  after.id = 'map-after'; after.objects = [after.objects[1]];
  d.maps[0].objects[1].visibleAt = ['e04-exam:talk', 'e04-exam:leave'];
  d.maps[0].walk[2][2] = 0; d.maps.push(after);
  d.experiences[1].beats[1].map = after.id; d.experiences[1].beats[1].spawn = { x: 3, y: 2, facing: 'right' };
  assert.deepEqual(clone(boot(d).G.checkData(d, { profile: 'world-event' })), []);
  const saved = legacy({ pos: 'e08-wonsu', rpg: { v: 1, run: 'review-final-map',
    cursor: { scene: 'e08-wonsu', map: after.id, x: 3, y: 2, facing: 'right' }, scenes: {
      'e08-wonsu': { status: 'active', beat: null, actions: [{ id: 'talk', by: 'student' }, { id: 'leave', by: 'student' }], hint: null },
    } } });
  const { G, options } = await writer(d, saved);
  try {
    assert.equal(G.save.move('left', options), true);
    assert.equal(G.save.state.rpg.cursor.map, 'map-after'); assert.equal(G.save.state.rpg.cursor.x, 2);
  } finally { G.save.releaseWriter(); }
});
await test('자료 false: 공개 load/권한 요청은 key·snapshot·원본·이관을 바꾸지 않음', async () => {
  const ctx = boot({ ...probe(), ok: false }, new Map([['guunmong-v2', JSON.stringify(legacy())]]), lockService());
  const { G } = ctx, before = G.save.state, key = G.save.key, raw = [...ctx.memory], serial = boot.serial; let reads = 0;
  ctx.localStorage.getItem = () => { reads++; throw Error('자료 실패에서는 읽으면 안 됨'); };
  assert.strictEqual(G.save.load('rejected'), before); assert.equal(G.save.key, key);
  assert.equal(await G.save.acquireWriter(), false); assert.strictEqual(G.save.state, before);
  assert.equal(G.save.error, 'data-not-ready'); assert.equal(G.save.access, 'unavailable');
  assert.equal(reads, 0); assert.equal(boot.serial, serial); assert.deepEqual([...ctx.memory], raw);
  G.save.releaseWriter(); assert.equal(G.save.access, 'reader');
});
await test('자료 false: 기존 writer의 쓰기·reset·wake를 거부하고 lease는 해제', async () => {
  const locks = lockService(), memory = new Map(), { G, ctx, run, options } = await writer(probe(), legacy(), locks, memory);
  assert.equal(G.save.beginExperience('c1-bridge', options), true);
  assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).ok, true);
  const before = G.save.state, raw = [...memory]; let changed = 0, cancelled = 0;
  G.data.ok = false; G.data.experiences = []; G.data.scenes = [];
  try {
    assert.equal(G.save.canWrite(run), false); assert.equal(G.save.write(run), false);
    assert.equal(G.save.transact(run, () => { changed++; }), false);
    assert.equal(G.save.reset(run, { confirmed: true, cancel: () => { cancelled++; } }), false);
    assert.equal(G.save.applyExperience('c1-bridge', 'leave', options).reason, 'unavailable');
    assert.equal(G.save.commitWake('c3-staff', 'strike', options).reason, 'unavailable');
    assert.equal(changed, 0); assert.equal(cancelled, 0); assert.strictEqual(G.save.state, before);
    assert.deepEqual([...memory], raw); assert.equal(G.save.error, 'data-not-ready');
    G.save.releaseWriter();
    // Web Lock 콜백의 수명 Promise가 끝나 실제 잠금 반환까지 마친 뒤 다음 탭을 연다.
    await new Promise(resolve => setImmediate(resolve));
    const other = await writer(probe(), undefined, locks, memory);
    assert.deepEqual(clone(other.G.save.state.rpg), clone(before.rpg)); other.G.save.releaseWriter();
  } finally { G.save.releaseWriter(); }
});
await test('자료 false: 대기한 권한 콜백도 이관·새 run·쓰기 전에 거부', async () => {
  let grant; const locks = { request: (name, options, callback) => new Promise(resolve => { grant = () => resolve(callback({ name })); }) };
  const ctx = boot(probe(), new Map([['guunmong-v2', JSON.stringify(legacy())]]), locks), { G } = ctx;
  G.save.load(); const before = G.save.state, raw = [...ctx.memory], serial = boot.serial;
  const acquiring = G.save.acquireWriter(); await Promise.resolve(); await Promise.resolve();
  assert.equal(typeof grant, 'function'); G.data.ok = false;
  grant();
  try {
    assert.equal(await acquiring, false); assert.strictEqual(G.save.state, before);
    assert.deepEqual([...ctx.memory], raw); assert.equal(boot.serial, serial);
    assert.equal(G.save.error, 'data-not-ready');
  } finally { G.save.releaseWriter(); }
});
await test('자료 false: storage/pageshow는 부분 행동 snapshot을 정규화하지 않음', async () => {
  const { G, ctx, options } = await writer(probe(), legacy());
  G.save.beginExperience('c1-bridge', options); G.save.applyExperience('c1-bridge', 'talk', options);
  const before = G.save.state, raw = [...ctx.memory], key = G.save.key;
  G.data.ok = false; G.data.experiences = []; G.data.scenes = [];
  try {
    ctx.listeners.pagehide(); ctx.listeners.storage({ key }); ctx.listeners.pageshow({ persisted: true });
    await Promise.resolve(); await Promise.resolve();
    assert.strictEqual(G.save.state, before); assert.equal(G.save.key, key); assert.deepEqual([...ctx.memory], raw);
    assert.equal(G.save.access, 'unavailable'); assert.equal(G.save.error, 'data-not-ready');
  } finally { G.save.releaseWriter(); }
});
await test('자료 false: 요청 예약 뒤 실패는 Web Lock 호출 전 취소하고 정상 재시도 가능', async () => {
  let requests = 0;
  const service = lockService(), locks = { request: (...args) => { requests++; return service.request(...args); } };
  const ctx = boot(probe(), new Map(), locks), { G } = ctx;
  G.save.load(); const before = G.save.state, serial = boot.serial;
  const pending = G.save.acquireWriter(); G.data.ok = false;
  assert.equal(await pending, false); assert.equal(requests, 0); assert.equal(boot.serial, serial);
  assert.strictEqual(G.save.state, before); assert.deepEqual([...ctx.memory], []);
  G.save.releaseWriter(); G.data.ok = true; G.save.load();
  try { assert.equal(await G.save.acquireWriter(), true); assert.equal(requests, 1); assert.equal(G.save.access, 'writer'); }
  finally { G.save.releaseWriter(); }
});
await test('자료 false: 트랜잭션·초기화 콜백에서 실패하면 정규화·새 run·persist 전에 거부', async () => {
  const { G, ctx, run } = await writer(probe(), legacy());
  const before = G.save.state, raw = [...ctx.memory], serial = boot.serial;
  try {
    assert.equal(G.save.transact(run, draft => { draft.name = '거부'; G.data.ok = false; }), false);
    assert.strictEqual(G.save.state, before); assert.deepEqual([...ctx.memory], raw); assert.equal(boot.serial, serial);
    G.data.ok = true; assert.equal(await G.save.acquireWriter(), true);
    const resetBefore = G.save.state;
    assert.equal(G.save.reset(run, { confirmed: true, cancel: () => { G.data.ok = false; } }), false);
    assert.strictEqual(G.save.state, resetBefore); assert.deepEqual([...ctx.memory], raw); assert.equal(boot.serial, serial);
  } finally { G.save.releaseWriter(); }
});
await test('제품 canonical 해석: final false/true 각각 first 불변·S 객체·저장 원문 보존', async () => {
  const source = { window: {} }; vm.runInNewContext(read('js/data/interp.js'), source);
  const canonical = { first: { option: 'i-vain', evidence: 'E5' }, heard: true,
    changed: { option: 'i-nondual', evidence: 'E9' }, revised: true, final: true };
  for (const pick of [canonical.first, canonical.changed]) {
    assert.equal(source.window.GUUN.interp.options.some(option => option.id === pick.option), true);
    assert.equal(source.window.GUUN.interp.evidence.some(evidence => evidence.id === pick.evidence), true);
  }
  assert.equal(!!source.window.GUUN.interp.evidence.find(evidence => evidence.id === 'E5').after, false);
  for (const final of [false, true]) {
    const interp = final ? canonical : { ...canonical, heard: false, changed: null, revised: false, final: false };
    const { G, ctx, run } = await writer(probe(), legacy({ interp }));
    const before = G.save.state, raw = [...ctx.memory];
    try {
      assert.equal(G.save.transact(run, draft => { draft.interp.first = { option: 'i-nondual', evidence: 'E5' }; }), false);
      assert.strictEqual(G.save.state, before); assert.deepEqual([...ctx.memory], raw);
      assert.deepEqual(clone(G.save.state.interp), interp); assert.equal(G.save.state.interp.final, final);
    } finally { G.save.releaseWriter(); }
  }
});
await import('./fixtures/check-representative-profiles.mjs');
console.log('점검 묶음 ' + checks + '개 통과 (브라우저 다중 탭 검증은 별도)');
