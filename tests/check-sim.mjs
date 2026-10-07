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
  const ctx = vm.createContext({ G: { data }, window: { addEventListener(k, fn) { listeners[k] = fn; } }, console, document: { addEventListener() {} },
    crypto: { randomUUID: () => 'run-' + (++boot.serial) }, navigator: { locks }, AbortController,
    localStorage: { getItem: (key) => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) } });
  for (const file of ['util', 'world', 'experience', 'play', 'save', 'data']) {
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
await test('reader는 run을 만들지 않고 writer 최초 저장만 run을 만든다', async () => {
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
  if (saved) memory.set('guunmong-v3', JSON.stringify(saved));
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), true);
  const run = ctx.G.save.state.rpg.run;
  return { ctx, G: ctx.G, run, options: { run, readonly: false, by: 'student' } };
}
// rpg 없이 저장된 v3 판(첫 writer가 run을 만든다).
function seed(patch = {}) {
  const ctx = boot(); const s = ctx.G.save.fresh(); delete s.rpg;
  return { ...s, started: true, pos: 'c1-bridge', ...patch };
}
// v3 저장: 새 열쇠·새 모양, v2/v1 원문 불변, 설정 넷만 가져오기, play 읽기 검증
const SETTINGS4 = ['music', 'sound', 'big', 'teacher'];
const V3_KEYS = ['v', 'music', 'sound', 'big', 'teacher', 'started', 'pos', 'step', 'reach', 'done', 'awake', 'awakeAt',
  'items', 'bonds', 'pearls', 'seenFiction', 'ledger', 'wrong', 'journal', 'interp', 'name', 'startedAt', 'finishedAt', 'rpg', 'play'].sort();
const EMPTY_PLAY = { secretWish: null, choices: {}, firsts: {}, peak: { chuljang: 0, bugwi: 0, pungryu: 0, gongmyeong: 0 } };
function challengeProbe() {
  const source = { window: {} }; vm.runInNewContext(read('js/data/challenges.js'), source);
  return { ...probe(), challenges: clone(source.window.GUUN.challenges) };
}
await test('v3 열쇠·v:3 모양·잠금 이름; 옛 필드 없음', async () => {
  const names = [], service = lockService(), locks = { request: (name, ...rest) => { names.push(name); return service.request(name, ...rest); } };
  const memory = new Map(), ctx = boot(probe(), memory, locks);
  ctx.G.save.load(); assert.equal(ctx.G.save.key, 'guunmong-v3');
  assert.equal(await ctx.G.save.acquireWriter(), true);
  assert.deepEqual(names, ['guunmong-write:guunmong-v3']);
  const stored = JSON.parse(memory.get('guunmong-v3'));
  assert.equal(stored.v, 3); assert.deepEqual(Object.keys(stored).sort(), V3_KEYS);
  assert.deepEqual(stored.play, EMPTY_PLAY); assert.deepEqual(clone(ctx.G.save.state.play), EMPTY_PLAY);
  for (const removed of ['abil', 'res', 'best', 'events']) {
    assert.equal(Object.hasOwn(stored, removed), false, removed); assert.equal(Object.hasOwn(ctx.G.save.state, removed), false, removed);
  }
  assert.equal(memory.has('guunmong-v2'), false); assert.equal(memory.has('guunmong-v1'), false);
  const run = ctx.G.save.state.rpg.run;
  assert.equal(ctx.G.save.transact(run, (s) => { s.name = '새 기록'; }), true);
  assert.deepEqual(Object.keys(JSON.parse(memory.get('guunmong-v3'))).sort(), V3_KEYS);
  assert.equal(ctx.G.save.transact(run, (s) => { s.abil = { munjang: 1 }; }), false);
  assert.equal(ctx.G.save.transact(run, (s) => { s.events = {}; }), false);
  ctx.G.save.releaseWriter();
  const fixture = boot(probe(), new Map(), lockService()); fixture.G.save.load('probe');
  assert.equal(fixture.G.save.key, 'guunmong-v3-fixture-probe');
});
await test('v3가 없으면 v2에서 설정 넷만 가져오고 v2·v1 원문은 그대로', async () => {
  const old = { v: 2, music: false, sound: false, big: true, teacher: true, started: true, pos: 'c1-cell', step: 'scene', reach: 3,
    done: { 'c1-bridge': true }, awake: true, awakeAt: 99, abil: { munjang: 9 }, res: { gong: 9, fame: 9, wealth: 9 }, best: 9,
    events: { 'e04-exam': { grade: 'shine' } }, items: ['it-tungso'], bonds: ['chae'], pearls: { chae: true }, seenFiction: { a: true },
    ledger: { 'a-wish': { first: true, help: null, final: true } }, wrong: [{ act: 'a-wish', slot: 'x' }], journal: { revealed: { misaek: true } },
    interp: { final: true }, name: '옛 이름', startedAt: 5, finishedAt: 6, rpg: { v: 1, run: 'old-run', cursor: null, scenes: {} } };
  const v2 = JSON.stringify(old), v1 = '{"v":1,"keep":true}';
  const memory = new Map([['guunmong-v2', v2], ['guunmong-v1', v1]]), ctx = boot(probe(), memory, lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), true);
  const s = ctx.G.save.state, fresh = ctx.G.save.fresh();
  for (const key of SETTINGS4) assert.equal(s[key], old[key], key);
  for (const key of ['started', 'pos', 'step', 'reach', 'done', 'awake', 'awakeAt', 'items', 'bonds', 'pearls', 'seenFiction',
    'ledger', 'wrong', 'journal', 'interp', 'name', 'startedAt', 'finishedAt']) assert.deepEqual(clone(s[key]), clone(fresh[key]), key);
  assert.notEqual(s.rpg.run, 'old-run');
  assert.equal(memory.get('guunmong-v2'), v2); assert.equal(memory.get('guunmong-v1'), v1);
  const run = s.rpg.run; assert.equal(ctx.G.save.transact(run, (d) => { d.name = '새'; }), true);
  assert.equal(ctx.G.save.reset(run, { confirmed: true, cancel() {} }), true);
  assert.equal(memory.get('guunmong-v2'), v2); assert.equal(memory.get('guunmong-v1'), v1);
  ctx.G.save.releaseWriter();
  // 불리언이 아닌 설정은 기본값, 깨진 v2는 모두 기본값
  const mixed = boot(probe(), new Map([['guunmong-v2', JSON.stringify({ v: 2, music: 'no', sound: false, big: 1, teacher: null })]]), lockService());
  mixed.G.save.load(); assert.equal(await mixed.G.save.acquireWriter(), true);
  assert.deepEqual(SETTINGS4.map((k) => mixed.G.save.state[k]), [true, false, false, false]); mixed.G.save.releaseWriter();
  for (const broken of ['{broken', '[]', 'null', '"text"']) {
    const memo = new Map([['guunmong-v2', broken]]), b = boot(probe(), memo, lockService());
    b.G.save.load(); assert.equal(await b.G.save.acquireWriter(), true, broken);
    assert.deepEqual(SETTINGS4.map((k) => b.G.save.state[k]), [true, true, false, false], broken);
    assert.equal(memo.get('guunmong-v2'), broken); assert.equal(JSON.parse(memo.get('guunmong-v3')).v, 3);
    b.G.save.releaseWriter();
  }
  // 이미 v3가 있으면 v2를 다시 읽지 않는다
  const existing = { ...ctx.G.save.fresh(), music: true }; delete existing.rpg;
  const kept = new Map([['guunmong-v2', v2], ['guunmong-v3', JSON.stringify(existing)]]);
  const again = boot(probe(), kept, lockService()); again.G.save.load(); assert.equal(await again.G.save.acquireWriter(), true);
  assert.equal(again.G.save.state.music, true); assert.equal(again.G.save.state.teacher, false); again.G.save.releaseWriter();
});
await test('깨진 v3·다른 판 v3는 unavailable이며 덮어쓰지 않음', async () => {
  for (const bad of ['{broken', JSON.stringify({ v: 2, music: false }), JSON.stringify({ v: 4 })]) {
    const memory = new Map([['guunmong-v3', bad], ['guunmong-v2', JSON.stringify({ v: 2, music: false })]]), ctx = boot(probe(), memory, lockService());
    ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), false, bad);
    assert.equal(ctx.G.save.access, 'unavailable'); assert.equal(memory.get('guunmong-v3'), bad);
    assert.equal(ctx.G.save.write(ctx.G.save.state.rpg?.run), false); assert.equal(memory.get('guunmong-v3'), bad);
  }
});
await test('play 읽기는 허용된 자리·선택지·도전·곳·peak 정수만 받는다', async () => {
  const d = challengeProbe(), saved = boot().G.save.fresh();
  delete saved.rpg;
  saved.abil = { munjang: 3 }; saved.res = { gong: 1 }; saved.best = 7; saved.events = { x: {} };
  saved.play = {
    secretWish: 'misaek', extra: true,
    choices: { 'ch-tianjin-poem': { option: 'nope' }, 'ch-yoyeon-reply': { option: 'calm', extra: 1 }, 'ch-neungpa-order': { option: 'generals' },
      'ch-bridge-reply': { option: 'polite' }, 'ch-missing': { option: 'a' }, 'ch-geomungo-tune': { option: 'battle' } },
    firsts: { 'ch-bridge-reply': { ok: true }, 'ch-geomungo-tune': { ok: true, clues: 2, tried: ['curtain'] }, 'ch-chunun-ghost': { ok: false, clues: 2 },
      'ch-gyeonghong-who': { ok: true, clues: 1.5 }, 'ch-tungso-melody': { ok: 'yes' }, 'ch-yoyeon-night': { ok: null, tried: ['curtain', 'nowhere', 'curtain', 3] },
      'ch-bansagok-water': { ok: true, tried: 'stream' }, 'ch-tianjin-poem': { ok: null }, 'ch-missing': { ok: true }, 'ch-neungpa-order': { ok: true } },
    peak: { chuljang: 2, bugwi: 5, pungryu: -1, gongmyeong: 1.5, misaek: 3 },
  };
  const memory = new Map([['guunmong-v3', JSON.stringify(saved)]]), ctx = boot(d, memory, lockService());
  ctx.G.save.load();
  const expected = { secretWish: null,
    choices: { 'ch-yoyeon-reply': { option: 'calm' }, 'ch-neungpa-order': { option: 'generals' } },
    firsts: { 'ch-geomungo-tune': { ok: true }, 'ch-chunun-ghost': { ok: false, clues: 2 }, 'ch-gyeonghong-who': { ok: true },
      'ch-yoyeon-night': { ok: null, tried: ['curtain'] }, 'ch-bansagok-water': { ok: true } },
    peak: { chuljang: 2, bugwi: 0, pungryu: 0, gongmyeong: 0 } };
  assert.deepEqual(clone(ctx.G.save.state.play), expected);
  for (const removed of ['abil', 'res', 'best', 'events']) assert.equal(Object.hasOwn(ctx.G.save.state, removed), false, removed);
  assert.equal(await ctx.G.save.acquireWriter(), true);
  const stored = JSON.parse(memory.get('guunmong-v3'));
  assert.deepEqual(stored.play, expected); assert.deepEqual(Object.keys(stored).sort(), V3_KEYS);
  const run = ctx.G.save.state.rpg.run;
  for (const bad of [(s) => { s.play.secretWish = 'misaek'; }, (s) => { s.play.peak.bugwi = 5; }, (s) => { s.play.peak.misaek = 1; },
    (s) => { s.play.choices['ch-tianjin-poem'] = { option: 'nope' }; }, (s) => { s.play.firsts['ch-bridge-reply'] = { ok: true }; },
    (s) => { s.play = null; }, (s) => { delete s.play.firsts; }, (s) => { s.play.extra = 1; }]) {
    const before = ctx.G.save.state; assert.equal(ctx.G.save.transact(run, bad), false); assert.strictEqual(ctx.G.save.state, before);
  }
  // play는 전용 API로만 바뀐다. 일반 transact로 숨긴 소원·최고값을 쓰지 못한다.
  assert.equal(ctx.G.save.transact(run, (s) => { s.play.secretWish = 'bugwi'; }), false);
  assert.equal(ctx.G.save.transact(run, (s) => { s.play.peak.bugwi = 4; }), false);
  assert.equal(JSON.parse(memory.get('guunmong-v3')).play.secretWish, null);
  ctx.G.save.releaseWriter();
  // 다른 run·reader는 play도 바꾸지 못한다
  const reader = boot(d, memory, lockService()); reader.G.save.load();
  assert.equal(reader.G.save.transact(run, (s) => { s.play.peak.chuljang = 1; }), false);
  assert.equal(JSON.parse(memory.get('guunmong-v3')).play.peak.chuljang, 2);
});
await test('확인 초기화는 설정 넷과 빈 play만 남김', async () => {
  const saved = seed({ music: false, big: true, teacher: true, name: '이름',
    play: { secretWish: 'pungryu', choices: { 'ch-tianjin-poem': { option: 'heart' } }, firsts: { 'ch-chunun-ghost': { ok: true, clues: 1 } },
      peak: { chuljang: 0, bugwi: 0, pungryu: 3, gongmyeong: 0 } } });
  const memory = new Map([['guunmong-v3', JSON.stringify(saved)]]), ctx = boot(challengeProbe(), memory, lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), true);
  const run = ctx.G.save.state.rpg.run;
  assert.equal(ctx.G.save.state.play.secretWish, 'pungryu');
  assert.equal(ctx.G.save.reset(run, { confirmed: true, cancel() {} }), true);
  const s = ctx.G.save.state, stored = JSON.parse(memory.get('guunmong-v3'));
  assert.deepEqual(SETTINGS4.map((k) => s[k]), [false, true, true, true]);
  assert.deepEqual(clone(s.play), EMPTY_PLAY); assert.deepEqual(stored.play, EMPTY_PLAY);
  assert.equal(s.name, ''); assert.equal(s.started, false); assert.notEqual(s.rpg.run, run);
  assert.equal(stored.v, 3); assert.deepEqual(Object.keys(stored).sort(), V3_KEYS);
  ctx.G.save.releaseWriter();
});
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
  '일반': {},
  '깨어남': { awake: true, awakeAt: 123, pos: 'c1-bridge' },
  '확정 해석': { interp: { first: { option: 'A', evidence: 'E1' }, heard: true, final: true, revised: true } },
})) await test('v3 재개 ' + name + ': 기록 유지·새 행동 조작 없음', async () => {
  const saved = seed({ ...patch, items: ['it-tungso'], bonds: ['chae'], pearls: { chae: true },
    ledger: { 'a-wish': { first: false, help: 'teacher', final: true } } });
  const { G, ctx } = await writer(probe(), saved);
  for (const field of ['items', 'bonds', 'pearls', 'ledger', 'interp', 'awake', 'awakeAt']) assert.deepEqual(clone(G.save.state[field]), clone(saved[field]));
  for (const rec of Object.values(G.save.state.rpg.scenes)) assert.equal(rec.actions.length, 0);
  if (name === '깨어남') assert.equal(G.save.state.pos, 'c3-awake');
  assert.equal(ctx.memory.has('guunmong-v1'), false); assert.equal(ctx.memory.has('guunmong-v2'), false);
  G.save.releaseWriter();
});
await test('권한 전·reader·readonly·이전 run은 메모리와 저장 모두 불변', async () => {
  const locks = lockService(), memory = new Map(), a = await writer(probe(), seed(), locks, memory);
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
  const { G, options, run } = await writer(d, seed());
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
  const { G, options } = await writer(probe(), seed());
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
  const { G, options, run } = await writer(probe(), seed({ teacher: true }));
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
  const { G, ctx, options } = await writer(probe(), seed());
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
  const { G, ctx, run, options } = await writer(probe(), seed({ music: false, awake: true, awakeAt: 123 }));
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
  const s = seed({ awake: true, awakeAt: 321, interp: { final: true }, rpg: bad });
  const ctx = boot(probe(), new Map([['guunmong-v3', JSON.stringify(s)]]), lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), false);
  assert.equal(ctx.G.save.access, 'unavailable'); assert.equal(ctx.G.save.state.awakeAt, 321);
  assert.equal(ctx.G.save.state.interp.final, true);
  assert.deepEqual(JSON.parse(ctx.memory.get('guunmong-v3')), clone(s));
});
await test('rpg 자료형·id·순서·by·좌표·다른 단계 지도 기본화; 장부 불변', async () => {
  const base = await writer(probe(), seed()); base.G.save.beginExperience('c1-bridge', base.options);
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
  const { G, options, run } = await writer(probe('world-event'), seed({ teacher: true, pos: 'e04-exam' }));
  assert.deepEqual(clone(G.save.fillBefore(G.data.scenes, 'e08-wonsu', options)), ['e04-exam']);
  assert.equal(G.save.applyExperience('e04-exam', 'talk', options).reason, 'blocked');
  assert.equal(G.save.finishExperience('e04-exam', options).ok, true);
  assert.equal(G.save.state.rpg.scenes['e04-exam'].status, 'auto'); assert.equal(G.save.state.done['e04-exam'], undefined);
  assert.equal(G.save.state.items.length, 0); assert.equal(G.save.state.pos, 'e08-wonsu');
  assert.equal(G.save.transact(run, (s) => { s.res = { wealth: 200 }; }), false); G.save.releaseWriter();
});
await test('writer 이전 때 최신 저장·run·awake를 다시 읽음; fixture 별도 lock', async () => {
  const data = staffProbe(), locks = lockService(), memory = new Map(), a = await writer(data, seed(), locks, memory), b = boot(data, memory, locks);
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
await test('소원은 저장된 원작 단계·물건만 사용; done·auto·인연으로 추정 안 함', async () => {
  const ctx = boot(), G = ctx.G, d = probe('world-event');
  d.wishes = ['chuljang', 'bugwi', 'pungryu', 'gongmyeong', 'misaek'].map((id) => ({ id, name: id }));
  d.experiences[1].beats[0].effects = [{ kind: 'story', id: G.experience.storyIds.wonsu }];
  const s = seed({ pos: 'e08-wonsu', done: { 'e08-wonsu': true }, bonds: ['all-eight'] });
  assert.deepEqual(clone(G.experience.wishes(s, d).map((w) => w.fill)), [0, 0, 0, 0, 0]);
  s.rpg = { v: 1, run: 'wish-run', cursor: null, scenes: { 'e08-wonsu': { status: 'auto', beat: null, actions: [{ id: 'talk', by: 'teacher' }], hint: 'teacher' } } };
  assert.deepEqual(clone(G.experience.wishes(s, d).map((w) => w.fill)), [0, 0, 0, 0, 0]);
  s.rpg.scenes['e08-wonsu'].status = 'done';
  s.items = ['it-girinpo', 'it-geomungo', 'it-tungso'];
  assert.deepEqual(clone(G.experience.wishes(s, d).map((w) => w.fill)), [0.5, 1, 1, 0, 0]);
  assert.equal(G.experience.wishes(s, d)[4].name, '?');
  s.journal.revealed = { misaek: true }; assert.equal(G.experience.wishes(s, d)[4].hidden, false);
});
await test('단계 장소 전환은 안전 입구; 이전 map cursor는 버리고 행동은 유지', async () => {
  const d = probe(), e = d.experiences[0];
  e.beats[1].map = 'map-cell'; e.beats[1].spawn = { x: 3, y: 2, facing: 'right' };
  const { G, ctx, options } = await writer(d, seed()); G.save.beginExperience(e.scene, options);
  assert.equal(G.save.applyExperience(e.scene, 'talk', options).ok, true);
  assert.equal(G.save.state.rpg.cursor.map, 'map-cell'); assert.equal(G.save.state.rpg.cursor.x, 3);
  const saved = clone(G.save.state); saved.rpg.cursor.map = 'map-road'; ctx.memory.set(G.save.key, JSON.stringify(saved));
  G.save.load(); assert.equal(G.save.state.rpg.cursor.map, 'map-cell'); assert.equal(G.save.state.rpg.scenes[e.scene].actions.length, 1);
  G.save.releaseWriter();
});
await test('staff는 일반 행동/완료 불가; 타격의 사실+awake+pos 원자 저장·실패 보존', async () => {
  const d = staffProbe();
  const { G, ctx, run, options } = await writer(d, seed());
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
  ['story-limit', (d) => { d.scenes[0].lines = ['가'.repeat(5001), '나']; }],
];
for (const [code, change] of invalidData) await test('데이터 음성: ' + code, () => {
  const { G } = boot(), d = probe(); change(d);
  assert.ok(G.checkData(d, { profile: 'world-opening' }).some((p) => p.startsWith(code + ':')), code);
});
await test('월드 본문 참조는 복사 없이 글 총량에 한 번 포함', () => {
  const { G } = boot(), d = probe(), baseline = G.storyText(d).count;
  d.experiences[0].beats[0].lines = [0, 0]; assert.equal(G.storyText(d).count, baseline);
  d.scenes[0].kind = 'journal'; assert.equal(G.storyText(d).count, baseline);
  d.scenes[0].lines[0] = '가'.repeat(5001); assert.ok(G.storyText(d).count > 5000);
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
  for (const field of ['lines', 'narration']) reject('story-limit', (d) => { d.scenes.find((s) => s.kind === 'wish')[field] = field === 'lines' ? ['가'.repeat(5001)] : '나'.repeat(5001); });
  for (const verb of ['얻었다', '차지했다', '맞이했다', '데려왔다']) reject('grade-object', (d) => {
    d.scenes.find((s) => s.kind === 'event').gradeText.shine = d.bonds[0].name + '을 마침내 자신의 것으로 ' + verb;
  });
});
await test('load도 같은 run의 awake/최초 시각을 내리지 않으며 기록 삭제 트랜잭션 거부', async () => {
  const { G, ctx, options, run } = await writer(staffProbe(), seed());
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
  const ctx = boot(probe(), new Map([['guunmong-v1', 'never-read'], ['guunmong-v2', 'never-written'], ['guunmong-v3', '{broken']]), lockService());
  ctx.G.save.load(); assert.equal(await ctx.G.save.acquireWriter(), false); assert.equal(ctx.memory.get('guunmong-v3'), '{broken');
  assert.equal(ctx.memory.get('guunmong-v1'), 'never-read'); assert.equal(ctx.memory.get('guunmong-v2'), 'never-written');
  const failed = boot(probe(), new Map([['guunmong-v3', JSON.stringify(seed())]]), lockService());
  failed.G.save.load(); const before = failed.G.save.state, raw = failed.memory.get('guunmong-v3');
  failed.localStorage.setItem = () => { throw Error('denied'); };
  assert.equal(await failed.G.save.acquireWriter(), false); assert.strictEqual(failed.G.save.state, before);
  assert.equal(failed.memory.get('guunmong-v3'), raw); assert.equal(failed.G.save.access, 'unavailable');
  failed.localStorage.getItem = () => { throw Error('denied'); };
  assert.strictEqual(failed.G.save.load(), before);
});
await test('e10의 원작 작은 꿈 행동은 전체 awake를 만들지 않는다', async () => {
  const d = probe('world-event'); d.scenes[0].id = 'e10-neungpa'; d.experiences[0].scene = 'e10-neungpa';
  d.experiences[0].beats[0].effects = [{ kind: 'story', id: 'e10-neungpa:small-dream' }];
  const { G, options } = await writer(d, seed({ pos: 'e10-neungpa' }));
  assert.equal(G.save.applyExperience('e10-neungpa', 'talk', options).ok, true);
  assert.equal(G.save.state.awake, false); assert.equal(G.save.state.awakeAt, 0); G.save.releaseWriter();
});
await test('F1: 뒤 장면의 선생님 바로가기 auto가 있어도 현재 사건 begin/apply와 기록 보존', async () => {
  const auto = { status: 'auto', beat: null, actions: [], hint: 'teacher' };
  const d = probe('world-event'), saved = seed({ pos: 'e04-exam', rpg: { v: 1, run: 'review-f1', cursor: null, scenes: { 'e08-wonsu': auto } } });
  const { G, options } = await writer(d, saved);
  try {
    assert.deepEqual(Object.keys(G.save.state.rpg.scenes), ['e08-wonsu']);
    assert.equal(G.save.beginExperience('e04-exam', options), true);
    assert.equal(G.save.applyExperience('e04-exam', 'talk', options).ok, true);
    assert.deepEqual(clone(G.save.state.rpg.scenes['e08-wonsu']), auto);
    assert.deepEqual(clone(G.save.state.rpg.scenes['e04-exam'].actions), [{ id: 'talk', by: 'student' }]);
    G.save.load();
    assert.equal(G.save.state.pos, 'e04-exam'); assert.deepEqual(clone(G.save.state.rpg.scenes['e08-wonsu']), auto);
    assert.equal(G.save.applyExperience('e04-exam', 'talk', options).reason, 'duplicate');
  } finally { G.save.releaseWriter(); }
});
await test('F2: 검증 전 가짜 done/actions=[]로 pos가 미완료 돌다리를 넘지 않음', async () => {
  const d = probe(), saved = seed({ rpg: { v: 1, run: 'review-f2', cursor: null,
    scenes: { 'c1-bridge': { status: 'done', beat: null, actions: [], hint: null } } } });
  const memory = new Map([['guunmong-v3', JSON.stringify(saved)]]), ctx = boot(d, memory, lockService());
  ctx.G.save.load();
  assert.equal(ctx.G.save.state.pos, 'c1-bridge');
  assert.equal(ctx.G.save.state.rpg.scenes['c1-bridge'].status, 'active');
  assert.equal(ctx.G.save.state.rpg.cursor.scene, 'c1-bridge');
  assert.equal(memory.get('guunmong-v3'), JSON.stringify(saved));
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
  const saved = seed({ pos: 'e04-exam', rpg: { v: 1, run: 'review-f3',
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
  const saved = seed({ play: { secretWish: 'pungryu', choices: {}, firsts: {}, peak: { chuljang: 0, bugwi: 0, pungryu: 2, gongmyeong: 0 } },
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
      (s) => { s.play.peak.pungryu = '2'; },
      (s) => { s.play.choices = []; },
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
    G.save.load(); assert.deepEqual(clone(G.save.state.play), clone(saved.play));
    assert.deepEqual(clone(G.save.state.interp), clone(saved.interp));
  } finally { G.save.releaseWriter(); }
});
await test('완료를 검증한 재개는 검증된 rpg 완료만 건너뛰며 권한·awake 보존', async () => {
  for (const [patch, expected] of [
    [{}, 'c1-bridge'],
    [{ done: { 'c1-bridge': true } }, 'c1-bridge'],
    [{ actions: [{ id: 'talk', by: 'student' }, { id: 'leave', by: 'student' }] }, 'c1-cell'],
    [{ actions: [{ id: 'leave', by: 'student' }] }, 'c1-bridge'],
    [{ awake: true, awakeAt: 123 }, 'c3-awake'],
  ]) {
    const saved = seed({ done: patch.done || {}, awake: patch.awake || false, awakeAt: patch.awakeAt || 0,
      interp: { first: { option: 'A', evidence: 'E1' }, final: true },
      rpg: { v: 1, run: 'review-resume', cursor: { scene: 'c1-bridge', map: 'map-road', x: 1, y: 1, facing: 'right' },
        scenes: { 'c1-bridge': { status: 'done', beat: null, actions: patch.actions || [], hint: null } } } });
    const raw = JSON.stringify(saved), memory = new Map([['guunmong-v3', raw]]), ctx = boot(probe(), memory, lockService());
    ctx.G.save.load(); assert.equal(ctx.G.save.state.pos, expected);
    assert.equal(ctx.G.save.state.rpg.cursor.scene, expected);
    assert.equal(ctx.G.save.state.awake, saved.awake); assert.equal(ctx.G.save.state.awakeAt, saved.awakeAt);
    assert.deepEqual(clone(ctx.G.save.state.interp), clone(saved.interp));
    assert.equal(ctx.G.save.canWrite('review-resume'), false); assert.equal(memory.get('guunmong-v3'), raw);
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
  const saved = seed({ pos: 'e08-wonsu', rpg: { v: 1, run: 'review-final-map',
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
  const ctx = boot({ ...probe(), ok: false }, new Map([['guunmong-v3', JSON.stringify(seed())]]), lockService());
  const { G } = ctx, before = G.save.state, key = G.save.key, raw = [...ctx.memory], serial = boot.serial; let reads = 0;
  ctx.localStorage.getItem = () => { reads++; throw Error('자료 실패에서는 읽으면 안 됨'); };
  assert.strictEqual(G.save.load('rejected'), before); assert.equal(G.save.key, key);
  assert.equal(await G.save.acquireWriter(), false); assert.strictEqual(G.save.state, before);
  assert.equal(G.save.error, 'data-not-ready'); assert.equal(G.save.access, 'unavailable');
  assert.equal(reads, 0); assert.equal(boot.serial, serial); assert.deepEqual([...ctx.memory], raw);
  G.save.releaseWriter(); assert.equal(G.save.access, 'reader');
});
await test('자료 false: 기존 writer의 쓰기·reset·wake를 거부하고 lease는 해제', async () => {
  const locks = lockService(), memory = new Map(), { G, ctx, run, options } = await writer(probe(), seed(), locks, memory);
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
  const ctx = boot(probe(), new Map([['guunmong-v3', JSON.stringify(seed())]]), locks), { G } = ctx;
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
  const { G, ctx, options } = await writer(probe(), seed());
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
  const { G, ctx, run } = await writer(probe(), seed());
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
    const { G, ctx, run } = await writer(probe(), seed({ interp }));
    const before = G.save.state, raw = [...ctx.memory];
    try {
      assert.equal(G.save.transact(run, draft => { draft.interp.first = { option: 'i-nondual', evidence: 'E5' }; }), false);
      assert.strictEqual(G.save.state, before); assert.deepEqual([...ctx.memory], raw);
      assert.deepEqual(clone(G.save.state.interp), interp); assert.equal(G.save.state.interp.final, final);
    } finally { G.save.releaseWriter(); }
  }
});
// ───────── 생각 선택·첫 결과·숨긴 소원·소원 막대·최고값·되짚기 (G.play와 G.save의 기록 API)
const REAL = (() => {
  const box = { window: {} };
  for (const file of ['challenges', 'wishes', 'interp']) vm.runInNewContext(read('js/data/' + file + '.js'), box);
  return box.window.GUUN;
})();
// 실제 도전 자료를 작은 시험 지도의 장면·단계에 옮겨 둔다. 선택지·증감·답·after는 실제 자료 그대로다.
const PLACE = { 'ch-tianjin-poem': ['c1-bridge', 'talk'], 'ch-chunun-ghost': ['c1-bridge', 'leave'], 'ch-yoyeon-night': ['c1-cell', 'talk'],
  'ch-yoyeon-reply': ['c1-cell', 'talk'], 'ch-tungso-melody': ['c1-cell', 'leave'], 'ch-bansagok-water': ['e10-neungpa', 'talk'],
  'ch-neungpa-order': ['e10-neungpa', 'talk'] };
function playProbe() {
  const d = probe(), base = clone(d.experiences[0]);
  d.scenes.splice(2, 0, { id: 'e10-neungpa', ch: '2', kind: 'event', lines: ['물을 나눈다.', '길을 떠난다.'], items: [] },
    { id: 'c3-staff', ch: '3', kind: 'waking', lines: ['지팡이를 든다.'] });
  d.experiences.splice(2, 0, { ...clone(base), scene: 'e10-neungpa' },
    { ...clone(base), scene: 'c3-staff', beats: [{ id: 'strike', trigger: { kind: 'staff', target: null }, lines: [0], effects: [] }] });
  d.experiences[0].beats[0].effects = [{ kind: 'story', id: 'e08-wonsu:appointment' }]; // 돌다리 대화 = 대원수 임명(출장입상 원작 1)
  d.experiences[1].beats[1].effects = [{ kind: 'item', id: 'it-girinpo' }]; // 선방 출구 = 기린 도포(부귀 원작 2)
  d.challenges = clone(REAL.challenges).filter((c) => PLACE[c.id]).map((c) => ({ ...c, scene: PLACE[c.id][0], beat: PLACE[c.id][1] }));
  d.wishes = clone(REAL.wishes); d.interp = clone(REAL.interp);
  return d;
}
const go = (G, run, d, id) => assert.equal(G.save.transact(run, (s) => {
  s.pos = id; s.rpg.cursor = G.experience.cursor(d, id, G.experience.find(d, id).beats[0].id);
}), true);
const toDoor = (G, options) => { for (const direction of ['down', 'right', 'right']) assert.equal(G.save.move(direction, options), true); };
// 순수 계산용 상태: 저장 없이 G.play에 넘긴다.
function playState(G, patch = {}) {
  const s = G.save.fresh();
  return { ...s, started: true, pos: 'c1-bridge', rpg: { v: 1, run: 'pure', cursor: null, scenes: {} }, ...patch,
    play: { ...s.play, ...(patch.play || {}) } };
}
await test('소원 막대: 원작 바닥·고른 말 합·최대·미색 값 없음·표의 증감', () => {
  const { G } = boot(playProbe()), d = playProbe();
  const done = { 'c1-bridge': { status: 'done', beat: null, actions: [{ id: 'talk', by: 'student' }, { id: 'leave', by: 'student' }], hint: null } };
  const canon = playState(G, { rpg: { v: 1, run: 'pure', cursor: null, scenes: done }, items: ['it-girinpo', 'it-geomungo', 'it-tungso'] });
  assert.deepEqual(clone(G.play.canon(canon, d)), { chuljang: 1, bugwi: 2, pungryu: 2, gongmyeong: 0 });
  assert.deepEqual(clone(G.play.values(canon, d)), { chuljang: 1, bugwi: 2, pungryu: 2, gongmyeong: 0 });
  // 선택은 원작 바닥을 깎지 못한다(풍류 2 − 1 → 2).
  canon.play.choices = { 'ch-tianjin-poem': { option: 'mock' }, 'ch-yoyeon-reply': { option: 'sword' }, 'ch-neungpa-order': { option: 'reward' } };
  assert.deepEqual(clone(G.play.values(canon, d)), { chuljang: 1, bugwi: 2, pungryu: 2, gongmyeong: 3 });
  assert.deepEqual(clone(G.play.choiceSum(canon, d)), { chuljang: 0, bugwi: 0, pungryu: -1, gongmyeong: 3 });
  // 실제 자료의 표: 선택지 하나만 고르면 ▲인 소원만 1, ▼·물러남은 0.
  const table = { boast: { bugwi: 1 }, heart: { pungryu: 1 }, mock: { gongmyeong: 1 }, sword: { gongmyeong: 1 }, call: { chuljang: 1 }, calm: {},
    generals: { chuljang: 1 }, reward: { gongmyeong: 1 }, fallen: {} };
  const sites = G.play.sites(d); assert.deepEqual(sites.map((c) => c.id), ['ch-tianjin-poem', 'ch-yoyeon-reply', 'ch-neungpa-order']);
  for (const site of sites) for (const option of site.options) {
    const s = playState(G, { play: { choices: { [site.id]: { option: option.id } } } });
    const want = { chuljang: 0, bugwi: 0, pungryu: 0, gongmyeong: 0, ...table[option.id] };
    assert.deepEqual(clone(G.play.values(s, d)), want, site.id + '/' + option.id);
    assert.equal(option.stay === true, Object.keys(table[option.id]).length === 0, option.id);
  }
  // 합이 0 아래면 바닥 유지, 뒤의 ▲는 합이 0을 넘어야 오른다. 최대 4.
  const bent = playProbe(), poem = bent.challenges.find((c) => c.id === 'ch-tianjin-poem');
  bent.challenges.find((c) => c.id === 'ch-yoyeon-reply').options[0].wish = [{ wish: 'pungryu', step: 1 }];
  bent.challenges.find((c) => c.id === 'ch-neungpa-order').options[0].wish = [{ wish: 'pungryu', step: 1 }];
  const floor = playState(G, { play: { choices: { 'ch-tianjin-poem': { option: 'boast' } } } });
  assert.equal(G.play.values(floor, bent).pungryu, 0);
  floor.play.choices['ch-yoyeon-reply'] = { option: 'sword' }; assert.equal(G.play.values(floor, bent).pungryu, 0);
  floor.play.choices['ch-neungpa-order'] = { option: 'generals' }; assert.equal(G.play.values(floor, bent).pungryu, 1);
  for (const c of bent.challenges) for (const o of c.options || []) if (o.wish) o.wish = [{ wish: 'bugwi', step: 1 }];
  poem.options.forEach((o) => { o.wish = [{ wish: 'bugwi', step: 1 }]; });
  const full = playState(G, { items: ['it-girinpo'], play: { choices: { 'ch-tianjin-poem': { option: 'heart' }, 'ch-yoyeon-reply': { option: 'sword' }, 'ch-neungpa-order': { option: 'generals' } } } });
  assert.equal(G.play.values(full, bent).bugwi, G.play.MAX); assert.equal(G.play.MAX, 4); assert.equal(G.play.CANON_MAX, 2);
  // 표시 API: 기존 필드 유지 + level(0..1)·canonFull. 미색은 값 없이 '?'.
  const shown = G.experience.wishes(canon, d), byId = Object.fromEntries(shown.map((w) => [w.id, w]));
  for (const w of shown) for (const key of ['id', 'name', 'hidden', 'fill', 'filled', 'half', 'sources', 'parts', 'level', 'canonFull']) assert.ok(Object.hasOwn(w, key), w.id + '.' + key);
  assert.equal(byId.bugwi.canonFull, true); assert.equal(byId.bugwi.level, 0.5); assert.equal(byId.bugwi.fill, 1);
  assert.equal(byId.gongmyeong.level, 0.75); assert.equal(byId.gongmyeong.canonFull, false);
  assert.equal(byId.chuljang.half, true); assert.equal(byId.misaek.name, '?'); assert.equal(byId.misaek.level, null); assert.equal(byId.misaek.canonFull, false);
});
await test('시회 첫 누름: 첫 결과와 풍류▲를 한 번에 저장, 처음 것만, 다시 누름은 반응만', async () => {
  const d = playProbe(), { G, ctx, options, run } = await writer(d, seed());
  try {
    assert.equal(G.save.beginExperience('c1-bridge', options), true);
    const write = ctx.localStorage.setItem; let writes = 0;
    ctx.localStorage.setItem = (...args) => { writes++; return write(...args); };
    const first = G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, options);
    assert.equal(first.ok, true); assert.deepEqual(clone(first.first), { ok: true }); assert.equal(writes, 1);
    ctx.localStorage.setItem = write;
    assert.deepEqual(clone(G.save.state.play.choices), { 'ch-tianjin-poem': { option: 'heart' } });
    assert.equal(G.play.values(G.save.state, d).pungryu, 1); assert.equal(G.save.state.play.peak.pungryu, 1);
    const before = G.save.state;
    const again = G.save.recordFirst('ch-tianjin-poem', { option: 'boast' }, options);
    assert.equal(again.ok, false); assert.equal(again.reason, 'decided'); assert.strictEqual(G.save.state, before);
    // 원작 사실(대원수 임명)을 저장하는 행동에서도 최고값이 오른다.
    assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).ok, true);
    assert.equal(G.save.state.play.peak.chuljang, 1);
    G.save.load(); assert.deepEqual(clone(G.save.state.play.firsts['ch-tianjin-poem']), { ok: true });
  } finally { G.save.releaseWriter(); }
  const wrong = await writer(playProbe(), seed());
  try {
    wrong.G.save.beginExperience('c1-bridge', wrong.options);
    assert.equal(wrong.G.save.recordFirst('ch-tianjin-poem', { option: 'mock' }, wrong.options).first.ok, false);
    assert.equal(wrong.G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, wrong.options).reason, 'decided');
    assert.deepEqual(clone(wrong.G.save.state.play.choices), { 'ch-tianjin-poem': { option: 'mock' } });
    assert.deepEqual(clone(wrong.G.save.state.play.peak), { chuljang: 0, bugwi: 0, pungryu: 0, gongmyeong: 1 });
    assert.equal(wrong.G.save.recordFirst('ch-tianjin-poem', { option: 'none' }, wrong.options).reason, 'decided');
    assert.equal(wrong.G.save.recordFirst('ch-missing', { option: 'x' }, wrong.options).reason, 'invalid');
    assert.equal(wrong.G.save.recordFirst('ch-yoyeon-reply', { option: 'calm' }, wrong.options).reason, 'invalid');
  } finally { wrong.G.save.releaseWriter(); }
});
await test('생각 선택 자리의 행동은 고른 말과 한 저장; 학생은 고른 말 없이 거부; 저장 실패면 둘 다 없음', async () => {
  const d = playProbe(), { G, ctx, options, run } = await writer(d, seed());
  try {
    go(G, run, d, 'c1-cell'); assert.equal(G.save.beginExperience('c1-cell', options), true);
    assert.deepEqual(G.play.siteAt(d, 'c1-cell', 'talk')?.id, 'ch-yoyeon-reply');
    assert.equal(G.play.siteAt(d, 'c1-bridge', 'talk'), null);
    const start = G.save.state;
    assert.equal(G.save.applyExperience('c1-cell', 'talk', options).reason, 'choice');
    assert.equal(G.save.applyExperience('c1-cell', 'talk', { ...options, choice: 'nope' }).reason, 'invalid');
    assert.strictEqual(G.save.state, start);
    const stored = ctx.memory.get(G.save.key), write = ctx.localStorage.setItem;
    ctx.localStorage.setItem = () => { throw Error('quota'); };
    assert.equal(G.save.applyExperience('c1-cell', 'talk', { ...options, choice: 'call' }).reason, 'unavailable');
    assert.strictEqual(G.save.state, start); assert.equal(ctx.memory.get(G.save.key), stored);
    ctx.localStorage.setItem = write;
    const done = G.save.applyExperience('c1-cell', 'talk', { ...options, choice: 'call' });
    assert.equal(done.ok, true); assert.deepEqual(clone(done.record.actions), [{ id: 'talk', by: 'student' }]);
    assert.deepEqual(clone(G.save.state.play.choices), { 'ch-yoyeon-reply': { option: 'call' } });
    assert.equal(G.save.state.play.peak.chuljang, 1);
    const saved = JSON.parse(ctx.memory.get(G.save.key));
    assert.deepEqual(saved.play.choices, { 'ch-yoyeon-reply': { option: 'call' } }); assert.equal(saved.rpg.scenes['c1-cell'].actions[0].id, 'talk');
    const kept = G.save.state;
    assert.equal(G.save.applyExperience('c1-cell', 'talk', { ...options, choice: 'sword' }).reason, 'duplicate');
    assert.strictEqual(G.save.state, kept);
    G.save.load(); assert.deepEqual(clone(G.save.state.play.choices), { 'ch-yoyeon-reply': { option: 'call' } });
  } finally { G.save.releaseWriter(); }
  // 선생님용 행동은 고른 말 없이 되며 아무것도 기록하지 않는다. 고른 말을 넘겨도 기록하지 않는다.
  for (const choice of [undefined, 'sword']) {
    const t = await writer(d, seed({ teacher: true })), topts = { ...t.options, by: 'teacher' };
    try {
      go(t.G, t.run, d, 'c1-cell'); t.G.save.beginExperience('c1-cell', topts);
      assert.equal(t.G.save.applyExperience('c1-cell', 'talk', { ...topts, choice }).ok, true);
      assert.deepEqual(clone(t.G.save.state.play.choices), {}); assert.deepEqual(clone(t.G.save.state.play.peak), clone(EMPTY_PLAY.peak));
    } finally { t.G.save.releaseWriter(); }
  }
});
await test('선생님·바로가기 auto·깨어난 뒤·readonly·이전 run·reader는 첫 결과·고른 말·숨긴 소원을 기록하지 않음', async () => {
  const d = playProbe();
  const cases = [
    ['teacher', seed({ teacher: true }), (o) => o],
    ['teacher', seed({ teacher: true }), (o) => ({ ...o, by: 'teacher' })],
    ['teacher', seed(), (o) => ({ ...o, by: 'teacher' })],
    ['auto', { ...seed(), rpg: { v: 1, run: 'auto-run', cursor: null, scenes: { 'c1-bridge': { status: 'auto', beat: null, actions: [], hint: 'teacher' } } } }, (o) => o],
    ['awake', seed({ awake: true, awakeAt: 5 }), (o) => o],
    ['readonly', seed(), (o) => ({ ...o, readonly: true })],
    ['stale', seed(), (o) => ({ ...o, run: 'previous' })],
  ];
  for (const [reason, saved, patch] of cases) {
    const { G, ctx, options } = await writer(d, saved);
    try {
      if (G.save.state.pos === 'c1-bridge' && !saved.rpg) G.save.beginExperience('c1-bridge', options);
      const before = G.save.state, raw = ctx.memory.get(G.save.key), o = patch(options);
      const first = G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, o);
      assert.equal(first.ok, false, reason); assert.equal(first.reason, reason, reason + ' first');
      if (reason !== 'auto') assert.equal(G.save.chooseSecretWish('bugwi', o).reason, reason, reason + ' secret');
      assert.strictEqual(G.save.state, before); assert.equal(ctx.memory.get(G.save.key), raw);
    } finally { G.save.releaseWriter(); }
  }
  // reader 탭
  const locks = lockService(), memory = new Map(), a = await writer(d, seed(), locks, memory), b = boot(d, memory, locks);
  b.G.save.load(); assert.equal(await b.G.save.acquireWriter(), false);
  const snap = b.G.save.state;
  assert.equal(b.G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, a.options).reason, 'readonly');
  assert.equal(b.G.save.chooseSecretWish('bugwi', a.options).reason, 'readonly');
  assert.strictEqual(b.G.save.state, snap); a.G.save.releaseWriter(); b.G.save.releaseWriter();
  // 선생님 → 학생으로 바꾸면 다음 선택부터 기록한다.
  const t = await writer(d, seed({ teacher: true }));
  try {
    t.G.save.beginExperience('c1-bridge', { ...t.options, by: 'teacher' });
    assert.equal(t.G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, t.options).reason, 'teacher');
    assert.equal(t.G.save.transact(t.run, (s) => { s.teacher = false; }), true);
    assert.equal(t.G.save.recordFirst('ch-tianjin-poem', { option: 'boast' }, t.options).first.ok, false);
    assert.deepEqual(clone(t.G.save.state.play.choices), { 'ch-tianjin-poem': { option: 'boast' } });
  } finally { t.G.save.releaseWriter(); }
});
await test('찾기 첫 판: 헛짚은 곳 누적·다시 열어도 이어짐·촛불이 다하면 실패 확정·after 표시 자리 제외', async () => {
  const d = playProbe(), locks = lockService(), memory = new Map();
  let w = await writer(d, seed(), locks, memory);
  go(w.G, w.run, d, 'c1-cell'); w.G.save.beginExperience('c1-cell', w.options);
  assert.equal(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'nowhere' }, w.options).reason, 'invalid');
  assert.deepEqual(clone(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'curtain' }, w.options).first), { ok: null, tried: ['curtain'] });
  const same = w.G.save.state;
  assert.equal(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'curtain' }, w.options).reason, 'duplicate'); assert.strictEqual(w.G.save.state, same);
  assert.equal(w.G.save.transact(w.run, (s) => { s.play.firsts['ch-yoyeon-night'].tried = []; }), false);
  w.G.save.releaseWriter();
  // 새로 고침: 같은 첫 판을 이어 간다.
  w = await writer(d, undefined, lockService(), memory);
  assert.deepEqual(clone(G_first(w.G, 'ch-yoyeon-night')), { ok: null, tried: ['curtain'] });
  assert.deepEqual(clone(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'screen' }, w.options).first), { ok: null, tried: ['curtain', 'screen'] });
  assert.deepEqual(clone(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'rack' }, w.options).first), { ok: false, tried: ['curtain', 'screen', 'rack'] });
  assert.equal(w.G.save.recordFirst('ch-yoyeon-night', { spot: 'beam' }, w.options).reason, 'decided');
  assert.equal(w.G.save.transact(w.run, (s) => { s.play.firsts['ch-yoyeon-night'].ok = true; }), false);
  w.G.save.releaseWriter();
  // 성공 판: 앞 도전 성공이면 뒤 도전 시작 모습이 바뀌고, 미리 표시한 자리는 누를 수 없다.
  const win = await writer(d, seed());
  try {
    go(win.G, win.run, d, 'c1-cell'); win.G.save.beginExperience('c1-cell', win.options);
    assert.equal(win.G.play.after(win.G.save.state, d, 'ch-bansagok-water'), null);
    win.G.save.recordFirst('ch-yoyeon-night', { spot: 'door' }, win.options);
    assert.deepEqual(clone(win.G.save.recordFirst('ch-yoyeon-night', { spot: 'beam' }, win.options).first), { ok: true, tried: ['door'] });
    assert.deepEqual(clone(win.G.play.after(win.G.save.state, d, 'ch-bansagok-water').spots), ['stream', 'pool']);
    go(win.G, win.run, d, 'e10-neungpa'); win.G.save.beginExperience('e10-neungpa', win.options);
    assert.equal(win.G.save.recordFirst('ch-bansagok-water', { spot: 'stream' }, win.options).reason, 'invalid');
    assert.deepEqual(clone(win.G.save.recordFirst('ch-bansagok-water', { spot: 'spring' }, win.options).first), { ok: null, tried: ['spring'] });
    assert.deepEqual(clone(win.G.save.recordFirst('ch-bansagok-water', { spot: 'dragon' }, win.options).first), { ok: true, tried: ['spring'] });
  } finally { win.G.save.releaseWriter(); }
});
function G_first(G, id) { return G.save.state.play.firsts[id] || null; }
await test('추리·가락의 첫 결과와 단서 수; 현재 단계 밖은 거부; 확정 뒤 불변', async () => {
  const d = playProbe(), { G, options, run } = await writer(d, seed());
  try {
    G.save.beginExperience('c1-bridge', options);
    assert.equal(G.save.recordFirst('ch-chunun-ghost', { option: 'one', clues: 1 }, options).reason, 'blocked');
    assert.equal(G.save.applyExperience('c1-bridge', 'talk', options).ok, true);
    assert.equal(G.save.recordFirst('ch-chunun-ghost', { option: 'one', clues: 4 }, options).reason, 'invalid');
    assert.equal(G.save.recordFirst('ch-chunun-ghost', { option: 'nobody', clues: 1 }, options).reason, 'invalid');
    assert.deepEqual(clone(G.save.recordFirst('ch-chunun-ghost', { option: 'ghost', clues: 2 }, options).first), { ok: false, clues: 2 });
    assert.equal(G.save.recordFirst('ch-chunun-ghost', { option: 'one', clues: 3 }, options).reason, 'decided');
    assert.equal(G.save.transact(run, (s) => { delete s.play.firsts['ch-chunun-ghost']; }), false);
    toDoor(G, options); assert.equal(G.save.applyExperience('c1-bridge', 'leave', options).ok, true);
    assert.equal(G.save.finishExperience('c1-bridge', options).ok, true);
    // 지난 장면의 도전은 다시 기록하지 않는다.
    assert.equal(G.save.recordFirst('ch-tianjin-poem', { option: 'heart' }, options).reason, 'blocked');
    G.save.beginExperience('c1-cell', options);
    assert.equal(G.save.applyExperience('c1-cell', 'talk', { ...options, choice: 'calm' }).ok, true);
    assert.equal(G.save.recordFirst('ch-tungso-melody', { ok: 'yes' }, options).reason, 'invalid');
    assert.deepEqual(clone(G.save.recordFirst('ch-tungso-melody', { ok: true }, options).first), { ok: true });
    assert.equal(G.save.recordFirst('ch-tungso-melody', { ok: false }, options).reason, 'decided');
    // 첫 결과는 막대를 움직이지 않는다(물러남도 0).
    assert.deepEqual(clone(G.play.choiceSum(G.save.state, d)), { chuljang: 0, bugwi: 0, pungryu: 0, gongmyeong: 0 });
  } finally { G.save.releaseWriter(); }
});
await test('숨긴 소원: 소원 찾기 확정 뒤 한 번, 미색·다른 값 불가, 불변', async () => {
  const d = playProbe(), { G, run, options } = await writer(d, seed());
  try {
    assert.equal(G.save.chooseSecretWish('bugwi', options).reason, 'blocked');
    assert.equal(G.save.ledgerTry('a-wish', true, options), true);
    assert.equal(G.save.chooseSecretWish('bugwi', options).reason, 'blocked');
    assert.equal(G.save.ledgerDone('a-wish', options), true);
    for (const bad of ['misaek', 'nope', null]) assert.equal(G.save.chooseSecretWish(bad, options).reason, 'invalid', String(bad));
    const picked = G.save.chooseSecretWish('bugwi', options);
    assert.equal(picked.ok, true); assert.equal(picked.secretWish, 'bugwi');
    assert.equal(G.save.chooseSecretWish('pungryu', options).reason, 'decided');
    assert.equal(G.save.transact(run, (s) => { s.play.secretWish = 'pungryu'; }), false);
    G.save.load(); assert.equal(G.save.state.play.secretWish, 'bugwi');
  } finally { G.save.releaseWriter(); }
});
await test('최고값은 원작 사실·고른 말로 오르고 깨어남 저장과 함께 얼어붙음; 일반 transact로 못 바꿈', async () => {
  const d = playProbe(), { G, run, options } = await writer(d, seed());
  try {
    assert.equal(G.save.transact(run, (s) => { s.play.peak.gongmyeong = 3; }), false);
    // 기린 도포를 받은 저장에서도 최고값이 오른다.
    assert.equal(G.save.transact(run, (s) => { s.items.push('it-girinpo'); }), true);
    assert.equal(G.save.state.play.peak.bugwi, 2);
    G.save.beginExperience('c1-bridge', options);
    G.save.recordFirst('ch-tianjin-poem', { option: 'boast' }, options);
    assert.equal(G.save.state.play.peak.bugwi, 3); assert.equal(G.save.state.play.peak.pungryu, 0);
    go(G, run, d, 'c3-staff'); assert.equal(G.save.beginExperience('c3-staff', options), true);
    assert.equal(G.save.commitWake('c3-staff', 'strike', options).ok, true);
    const frozen = clone(G.save.state.play.peak);
    assert.deepEqual(frozen, { chuljang: 0, bugwi: 3, pungryu: 0, gongmyeong: 0 });
    assert.equal(G.save.transact(run, (s) => { s.items.push('it-geomungo', 'it-tungso'); }), true);
    assert.equal(G.play.values(G.save.state, d).pungryu, 2);
    assert.deepEqual(clone(G.save.state.play.peak), frozen);
    G.save.load(); assert.deepEqual(clone(G.save.state.play.peak), frozen);
  } finally { G.save.releaseWriter(); }
});
await test('되짚기 모델·줄: 동률은 모두, 기록 없음은 none·E11 없음, 선생님 도움 섞임', () => {
  const { G } = boot(playProbe()), d = playProbe(), r = d.interp.recap;
  // 기록 없음: 바로가기로 넘긴 자리만 있다.
  const none = playState(G, { rpg: { v: 1, run: 'pure', cursor: null, scenes: { 'e10-neungpa': { status: 'auto', beat: null, actions: [], hint: 'teacher' } } },
    play: { peak: { chuljang: 2, bugwi: 2, pungryu: 2, gongmyeong: 2 } } });
  const m0 = G.play.recap(none, d);
  assert.equal(m0.hasRecord, false); assert.deepEqual(clone(m0.teacher), ['ch-neungpa-order']); assert.equal(m0.stay, 0);
  assert.deepEqual(clone(m0.peak), ['chuljang', 'bugwi', 'pungryu', 'gongmyeong']);
  assert.equal(G.play.e11(none, d), null);
  assert.deepEqual(clone(G.play.recapLines(none, d)), [r.none, '꿈에서 가장 차오른 것은 출장입상·부귀·풍류·공명.', r.ask]);
  // 섞임: 풍류▲ 한 번, 물러남 한 번(동률), 선생님 행동으로 넘긴 자리 하나, 첫 결과 둘, 숨긴 소원.
  const mixed = playState(G, {
    rpg: { v: 1, run: 'pure', cursor: null, scenes: { 'e10-neungpa': { status: 'done', beat: null, actions: [{ id: 'talk', by: 'teacher' }, { id: 'leave', by: 'teacher' }], hint: null } } },
    play: { secretWish: 'bugwi', choices: { 'ch-tianjin-poem': { option: 'heart' }, 'ch-yoyeon-reply': { option: 'calm' } },
      firsts: { 'ch-chunun-ghost': { ok: true, clues: 2 }, 'ch-yoyeon-night': { ok: false, tried: ['curtain', 'screen', 'rack'] } },
      peak: { chuljang: 2, bugwi: 2, pungryu: 1, gongmyeong: 0 } } });
  const m1 = G.play.recap(mixed, d);
  assert.deepEqual(clone(m1.counts), { chuljang: 0, bugwi: 0, pungryu: 1, gongmyeong: 0 }); assert.equal(m1.stay, 1);
  assert.deepEqual(clone(m1.teacher), ['ch-neungpa-order']); assert.equal(m1.hasRecord, true); assert.equal(m1.secretWish, 'bugwi');
  assert.deepEqual(clone(m1.firsts), { 'ch-chunun-ghost': true, 'ch-yoyeon-night': false }); assert.deepEqual(clone(m1.peak), ['chuljang', 'bugwi']);
  assert.deepEqual(clone(G.play.recapLines(mixed, d)), [
    '꿈에서 네가 고른 말은 풍류 쪽 말 한 번, 소원을 그대로 둔 말 한 번이었다.', r.teacher,
    r.first[0].ok, r.first[1].fail, '처음 바란 것은 부귀, 꿈에서 가장 차오른 것은 출장입상·부귀.', r.ask]);
  assert.equal(G.play.e11(mixed, d), '꿈에서 나는 풍류 쪽 말·소원을 그대로 둔 말을 가장 많이 골랐다.');
  // 소원 쪽이 가장 많음(▲가 둘인 선택지는 두 소원 모두에 센다), 판가름 없는 첫 결과는 말하지 않음, 선생님 도움 없음.
  const most = playState(G, { play: { choices: { 'ch-tianjin-poem': { option: 'mock' }, 'ch-yoyeon-reply': { option: 'sword' }, 'ch-neungpa-order': { option: 'fallen' } },
    firsts: { 'ch-yoyeon-night': { ok: null, tried: ['door'] } }, peak: { chuljang: 0, bugwi: 0, pungryu: 0, gongmyeong: 3 } } });
  assert.deepEqual(clone(G.play.recapLines(most, d)), ['꿈에서 네가 고른 말은 공명 쪽 말 두 번, 소원을 그대로 둔 말 한 번이었다.', '꿈에서 가장 차오른 것은 공명.', r.ask]);
  assert.equal(G.play.e11(most, d), '꿈에서 나는 공명 쪽 말을 가장 많이 골랐다.');
  // 물러남이 가장 많음
  const stay = playState(G, { play: { choices: { 'ch-tianjin-poem': { option: 'boast' }, 'ch-yoyeon-reply': { option: 'calm' }, 'ch-neungpa-order': { option: 'fallen' } } } });
  assert.equal(G.play.e11(stay, d), '꿈에서 나는 소원을 그대로 둔 말을 가장 많이 골랐다.');
  assert.deepEqual(clone(G.play.recap(stay, d).counts), { chuljang: 0, bugwi: 1, pungryu: 0, gongmyeong: 0 });
  // ▲끼리 동률(▼는 세지 않음)
  const tie = playState(G, { play: { choices: { 'ch-tianjin-poem': { option: 'boast' }, 'ch-yoyeon-reply': { option: 'call' } } } });
  assert.equal(G.play.e11(tie, d), '꿈에서 나는 출장입상 쪽 말·부귀 쪽 말을 가장 많이 골랐다.');
  // 시회를 선생님 행동으로 넘기면 그 자리도 선생님 도움으로 센다.
  const pick = playState(G, { rpg: { v: 1, run: 'pure', cursor: null, scenes: { 'c1-bridge': { status: 'active', beat: 'leave', actions: [{ id: 'talk', by: 'teacher' }], hint: null } } },
    play: { choices: { 'ch-yoyeon-reply': { option: 'call' } } } });
  assert.deepEqual(clone(G.play.recap(pick, d).teacher), ['ch-tianjin-poem']);
  assert.equal(G.play.fill('{top:을/를}·{top:이/가}', { top: '풍류' }), '풍류를·풍류가');
});
await test('읽기: 객체·배열 pos는 받지 않고 null 또는 재개 위치; 쓰기는 그대로 됨', async () => {
  for (const pos of [{}, [], 3]) {
    const loaded = boot(probe(), new Map([['guunmong-v3', JSON.stringify(seed({ started: false, pos }))]]), lockService());
    loaded.G.save.load(); assert.equal(loaded.G.save.state.pos, null, JSON.stringify(pos));
    const { G, run } = await writer(probe(), seed({ pos }));
    try {
      assert.equal(G.save.state.pos, 'c1-bridge', JSON.stringify(pos));
      assert.equal(G.save.transact(run, (s) => { s.name = '이름'; }), true);
    } finally { G.save.releaseWriter(); }
  }
});
await import('./fixtures/check-representative-profiles.mjs');
console.log('점검 묶음 ' + checks + '개 통과 (브라우저 다중 탭 검증은 별도)');
