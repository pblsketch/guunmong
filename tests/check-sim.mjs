import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));
const memory = new Map([['guunmong-v1', '{"name":"old"}']]);
const accessed = [];
function boot() {
  const ctx = vm.createContext({ G: {}, window: {}, console, localStorage: {
    getItem(key) { accessed.push(key); return memory.get(key) || null; },
    setItem(key, value) { accessed.push(key); memory.set(key, value); },
  } });
  for (const file of ['js/core/save.js', 'js/core/data.js']) vm.runInContext(read(file), ctx);
  const sim = new URL('js/core/sim.js', root);
  if (fs.existsSync(sim)) vm.runInContext(fs.readFileSync(sim, 'utf8'), ctx);
  return ctx;
}
let checks = 0;
function test(name, fn) {
  try { fn(); checks++; console.log('✓ ' + name); }
  catch (error) { console.error('✗ ' + name + ': ' + error.message); process.exitCode = 1; }
}
const ctx = boot();
const { G } = ctx;
test('v2 저장 열쇠와 상태', () => {
  assert.equal(G.save.key, 'guunmong-v2');
  const s = G.save.fresh();
  assert.equal(s.v, 2);
  assert.equal('mode' in s, false);
  for (const key of ['step', 'abil', 'res', 'best', 'events', 'awakeAt', 'journal', 'interp']) assert.ok(key in s, key);
  assert.deepEqual(clone(s.items), []);
  assert.deepEqual(clone(s.bonds), []);
});
test('규칙 핵심 제공', () => assert.ok(G.sim, 'G.sim 필요'));
if (!G.sim) process.exit(1);
const sim = G.sim;
const event = { id: 'e01-test', kind: 'event', core: ['munjang'] };
test('모든 적중·윤목·출발 능력에서 등급 표', () => {
  let cases = 0;
  const cores = [['munjang'], ['muye', 'jiryak']];
  for (let number = 1; number <= 12; number++) for (const core of cores) {
    const e = { ...event, id: 'e' + String(number).padStart(2, '0') + '-test', core };
    for (let start = 0; start <= sim.config.maxAbility; start++) for (let hits = 0; hits <= 2; hits++) {
      for (let r1 = 1; r1 <= 3; r1++) for (let r2 = 1; r2 <= 3; r2++) {
        const a = { munjang: start, eumak: 0, muye: 0, jiryak: start };
        const key = core[core.length - 1];
        if (hits >= 1) a[key] += sim.config.baseGain + r1;
        if (hits === 2) a[key] += sim.config.baseGain + r2;
        const high = Math.max(...core.map((k) => a[k])) >= sim.threshold(e);
        const expected = hits === 2 ? 'shine' : hits === 1 ? (high ? 'shine' : 'fine') : (high ? 'fine' : 'near');
        assert.equal(sim.grade(e, hits, a), expected);
        cases++;
      }
    }
  }
  console.log('  등급 조합 ' + cases);
});
test('윤목 재계산·새 실행 일치와 균등 분포', () => {
  const other = boot().G.sim;
  const counts = [0, 0, 0];
  for (let n = 1; n <= 12; n++) for (let t = 0; t < 2; t++) {
    const id = 'e' + String(n).padStart(2, '0') + '-test';
    const roll = sim.roll(id, t);
    assert.ok(roll >= 1 && roll <= 3);
    assert.equal(roll, other.roll(id, t));
    assert.equal(roll, sim.roll(id, t));
    counts[roll - 1]++;
  }
  assert.deepEqual(counts, [8, 8, 8]);
  assert.throws(() => sim.roll(event.id, 2));
});
test('준비 즉시 저장·다시 고르기 불변·보상 일회 지급', () => {
  G.save.load('stub');
  G.save.prepare(event, 0, 'study');
  let s = G.save.load();
  assert.equal(s.events[event.id].turns[0], 'study');
  assert.equal(s.step, 'prep2');
  const once = clone(s);
  G.save.prepare(event, 0, 'sword');
  assert.deepEqual(clone(G.save.state), once);
  G.save.prepare(event, 1, 'study');
  assert.equal(G.save.state.step, 'scene');
  G.save.finishEvent(event);
  s = G.save.load();
  assert.equal(s.events[event.id].grade, 'shine');
  assert.equal(s.best, s.res.gong + s.res.fame + s.res.wealth);
  const final = clone(s);
  G.save.finishEvent(event);
  G.save.prepare(event, 0, 'strategy');
  assert.deepEqual(clone(G.save.state), final);
  assert.deepEqual(clone(s.bonds), []);
  assert.equal(s.awake, false);
  assert.equal(memory.get('guunmong-v1'), '{"name":"old"}');
  assert.equal(accessed.some((key) => key === 'guunmong-v1'), false);
});
test('보통 준비 순차 누적·부분 기록 보존·대상 제외', () => {
  const scenes = [event, { ...event, id: 'e02-test', core: ['muye', 'jiryak'] }, { ...event, id: 'e03-test' }];
  const s = G.save.fresh();
  sim.prepare(s, scenes[0], 0, 'geomungo');
  const partial = clone(s.events[event.id]);
  const a = clone(s.abil);
  assert.deepEqual(clone(sim.normalPrep(s, scenes, scenes[2].id)), ['e02-test']);
  assert.deepEqual(clone(s.events[event.id]), partial);
  const rec = s.events['e02-test'];
  assert.equal(rec.auto, true);
  assert.equal(rec.hits, 1);
  assert.equal(rec.turns[0], 'sword');
  assert.equal(rec.turns[1], 'study');
  assert.ok(s.abil.muye > a.muye && s.abil.munjang > a.munjang);
  assert.equal(s.events['e03-test'], undefined);
  assert.deepEqual(clone(s.done), {});
  assert.deepEqual(clone(s.ledger), {});
  const once = clone(s);
  sim.normalPrep(s, scenes, scenes[2].id);
  assert.deepEqual(clone(s), once);
  const full = G.save.fresh();
  sim.normalPrep(full, scenes, scenes[2].id);
  const manual = G.save.fresh();
  for (const e of scenes.slice(0, 2)) {
    const turns = sim.normalTurns(e);
    turns.forEach((action, turn) => sim.prepare(manual, e, turn, action));
    sim.finish(manual, e);
  }
  assert.deepEqual(clone(full.abil), clone(manual.abil));
  assert.deepEqual(clone(full.res), clone(manual.res));
  assert.throws(() => sim.normalPrep(full, scenes, 'missing'));
});
test('장부는 두 활동만·선생님 도움 먼저·마침 불변', () => {
  G.save.reset();
  G.save.ledgerTry('e01-test', true);
  assert.deepEqual(clone(G.save.state.ledger), {});
  G.save.ledgerHelp('a-wish', 'teacher');
  G.save.load();
  G.save.ledgerTry('a-wish', true);
  G.save.ledgerDone('a-wish');
  G.save.ledgerHelp('a-wish', 'student');
  G.save.ledgerTry('a-wish', false);
  assert.deepEqual(clone(G.save.state.ledger['a-wish']), { first: null, help: 'teacher', final: true });
  G.save.ledgerTry('j-match', false);
  G.save.ledgerTry('j-match', true);
  assert.equal(G.save.state.ledger['j-match'].first, false);
});
test('v2 왕복·부분 객체 기본값·설정 보존·저장소 실패', () => {
  G.save.state.music = false;
  G.save.state.name = '테스트';
  G.save.state.awake = true;
  G.save.state.awakeAt = 123;
  G.save.write();
  const before = clone(G.save.state);
  assert.deepEqual(clone(G.save.load()), before);
  assert.equal(G.save.reset().music, false);
  assert.equal(G.save.state.awake, false);
  memory.set(G.save.key, JSON.stringify({ v: 2, abil: { munjang: 7 }, journal: null, mode: 'review' }));
  const s = G.save.load();
  assert.equal(s.abil.eumak, 0);
  assert.equal(s.abil.munjang, 7);
  assert.deepEqual(clone(s.journal), {});
  assert.equal('mode' in s, false);
  memory.set(G.save.key, '{broken');
  assert.equal(G.save.load().v, 2);
  const blocked = boot();
  blocked.localStorage.getItem = () => { throw Error('blocked'); };
  blocked.localStorage.setItem = () => { throw Error('blocked'); };
  assert.equal(blocked.G.save.load().v, 2);
  assert.doesNotThrow(() => blocked.G.save.write());
});
test('이야기 글 셈의 포함·제외와 표시용 글', () => {
  const d = { scenes: [
    { kind: 'event', lines: [{ say: '이름', text: '**가나** {다|한글아이디}' }, { mark: 'fiction', body: '제외' }], narration: '라', preview: '제외', gradeText: { shine: '마', fine: '바', near: '사' } },
    { kind: 'cut', timeline: [{ lines: ['아漢1!'] }] },
    { kind: 'wish', monologue: '자차', words: [{ text: '제외' }] },
    { kind: 'journal', lines: ['제외'] },
  ], interp: { dialogue: ['카'], lastWords: { text: '타' }, ending: ['파하'], evidence: [{ text: '제외' }] } };
  assert.equal(G.storyText(d).count, 14);
  assert.equal(G.storyText(d).texts.includes('가나 다'), true);
});
vm.runInContext(read('tests/fixtures/stub.js'), ctx);
const fixture = clone(ctx.window.GUUN);
test('fixture 사건 셋과 실제 12개 검사 분리', () => {
  assert.equal(fixture.scenes.filter((s) => s.kind === 'event').length, 3);
  assert.deepEqual(clone(G.checkData(fixture, { profile: 'fixture' })), []);
  assert.ok(G.checkData(fixture).some((p) => p.includes('event-count')));
  assert.ok(G.checkData({ ...fixture, fixture: 'stub' }).some((p) => p.includes('event-count')));
});
test('데이터 오류를 실제로 검출', () => {
  const reject = (change, code) => {
    const d = clone(fixture); change(d);
    assert.ok(G.checkData(d, { profile: 'fixture' }).some((p) => p.includes(code)), code);
  };
  const ev = (d) => d.scenes.find((s) => s.kind === 'event');
  reject((d) => { ev(d).clues = ['없는단서']; }, 'clue');
  reject((d) => { ev(d).core = ['unknown']; }, 'core');
  reject((d) => { ev(d).kind = 'unknown'; }, 'kind');
  reject((d) => { ev(d).id = 's01-old'; }, 'scene-id');
  reject((d) => { ev(d).pearl = null; }, 'pearl');
  reject((d) => { d.bonds[0].gradeText = { shine: '다름' }; }, 'bond-grade');
  reject((d) => { ev(d).gradeText.shine = d.bonds[0].name + '를 얻었다'; }, 'grade-object');
  reject((d) => { ev(d).lines = ['가'.repeat(4401)]; }, 'story-limit');
  reject((d) => { d.interp.evidence[0].text = '없는근거'; }, 'evidence');
  reject((d) => { d.scenes[0].awakened = true; }, 'awakened');
  reject((d) => { d.bonds[0].fills = ['misaek']; }, 'bond-fill');
  reject((d) => { ev(d).items[0].fills = ['misaek']; }, 'hidden-wish');
  reject((d) => { ev(d).lines = [{ orig: '대조 전' }]; }, 'unverified-original');
});
function productionData() {
  const d = clone(fixture);
  const cores = [['munjang'], ['munjang'], ['eumak'], ['munjang'], ['jiryak'], ['jiryak'], ['eumak'], ['muye', 'jiryak'], ['muye'], ['jiryak'], ['muye', 'jiryak'], ['munjang']];
  const meetAt = [1, 2, 3, 5, 6, 7, 9, 10];
  const base = d.scenes.find((s) => s.kind === 'event');
  const dream = [];
  d.bonds = [];
  for (let n = 1; n <= 12; n++) {
    const e = { ...clone(base), id: 'e' + String(n).padStart(2, '0') + '-test', core: cores[n - 1], items: [] };
    delete e.meet;
    delete e.pearl;
    if (meetAt.includes(n)) {
      e.meet = 'bond-' + n;
      e.pearl = { x: 20, y: 30, r: 5 };
      d.bonds.push({ id: e.meet, name: '인연 ' + n });
    }
    dream.push(e);
    const link = { 1: 'l-namjeon', 5: 'l-hebei', 7: 'l-bongnae' }[n];
    if (link) dream.push({ id: link, ch: '2', kind: 'link', lines: ['이음'] });
  }
  d.scenes = [...d.scenes.filter((s) => Number(s.ch) < 2), ...dream, ...d.scenes.filter((s) => Number(s.ch) >= 3 || s.ch === 'R')];
  return d;
}
test('실제 12사건 검사 양성·순서·만남·핵심 능력 음성', () => {
  const d = productionData();
  assert.deepEqual(clone(G.checkData(d)), []);
  const wrong = clone(d);
  const ev = wrong.scenes.filter((s) => s.kind === 'event');
  ev[0].core = ['eumak'];
  assert.ok(G.checkData(wrong).some((p) => p.includes('core-canon')));
  ev[0].core = ['munjang'];
  ev[3].meet = 'bond-1';
  assert.ok(G.checkData(wrong).some((p) => p.includes('meet-order')));
  const swapped = clone(d);
  [swapped.scenes[6], swapped.scenes[8]] = [swapped.scenes[8], swapped.scenes[6]];
  assert.ok(G.checkData(swapped).some((p) => p.includes('event-order')));
  const crossLine = clone(d);
  crossLine.interp.evidence[0].text = crossLine.scenes[1].lines[0] + crossLine.scenes[2].lines[0];
  assert.ok(G.checkData(crossLine).some((p) => p.includes('evidence:')));
  assert.ok(G.checkData(d, { profile: 'fixture' }).some((p) => p.includes('event-count')));
});
for (const field of ['lines', 'narration']) test('소원 장면 ' + field + ' 4401음절 누락 회귀', () => {
  const d = productionData();
  assert.deepEqual(clone(G.checkData(d)), []);
  const before = G.storyText(d).count;
  const wish = d.scenes.find((s) => s.id === 'c1-wish');
  wish[field] = field === 'lines' ? [{ text: '가'.repeat(4401) }] : '나'.repeat(4401);
  assert.equal(G.storyText(d).count, before + 4401);
  assert.ok(G.checkData(d).some((p) => p.startsWith('story-limit:')));
});
function gradeProblems(text, grade = 'shine') {
  const d = productionData();
  d.bonds[0].name = '진채봉';
  d.bonds[0].aliases = ['채봉'];
  d.bonds[1].name = '백능파';
  d.scenes.find((s) => s.kind === 'event').gradeText[grade] = text;
  return clone(G.checkData(d));
}
const forbidden = {
  '얻': ['진채봉을 얻었다', '진채봉을 마침내 얻었다', '백능파를 보상으로 얻었다'],
  '차지': ['진채봉을 차지했다', '진채봉을 온전히 차지했다', '백능파를 결국 자신의 것으로 차지했다'],
  '맞이': ['진채봉을 맞이했다', '진채봉을 아내로 맞이했다', '**진채봉**을 마침내 자신의 아내로 맞이했다'],
  '데려': ['진채봉을 데려왔다', '진채봉을 집으로 데려왔다', '{채봉|chae}을 드디어 내 곁으로 데려왔다'],
};
for (const [verb, phrases] of Object.entries(forbidden)) test('인연 목적어와 중간 표현 뒤 ' + verb + ' 검출', () => {
  for (const text of phrases) for (const grade of ['shine', 'fine', 'near']) {
    assert.ok(gradeProblems(text, grade).some((p) => p.startsWith('grade-object:')), text + '/' + grade);
  }
});
test('인연 이름을 포함한 정상 평판 문구는 허용', () => {
  for (const text of [
    '진채봉이 시를 칭찬했다', '진채봉에게 좋은 평판을 얻었다',
    '진채봉을 감탄하게 한 시가 명성을 얻었다',
    '진채봉을 놀라게 한 솜씨가 첫자리를 차지했다',
    '진채봉을 떠올린 곡조가 환호를 맞이했다',
    '진채봉을 향한 시가 좋은 평판을 데려왔다',
    '진채봉을 노래했다. 마침내 명성을 얻었다',
  ]) assert.deepEqual(gradeProblems(text), [], text);
});
test('등록 파일 존재·순서·공용 도구와 모듈 초기화', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const before = (a, b) => assert.ok(scripts.indexOf(a) >= 0 && scripts.indexOf(a) < scripts.indexOf(b), a + ' < ' + b);
  before('js/core/activity.js', 'js/core/sim.js');
  before('js/core/sim.js', 'js/game/app.js');
  before('js/game/app.js', 'js/game/stage.js');
  before('js/core/util.js', 'js/game/stage.js');
  const moduleWindow = new EventTarget();
  moduleWindow.G = {};
  const modules = vm.createContext({ window: moduleWindow, G: moduleWindow.G });
  vm.runInContext(read('js/core/util.js'), modules);
  // 빈 모듈이던 시점과 달리 event/hud는 app의 실제 등록 API에 의존한다.
  // 여기서는 등록만 실행하며 DOM과 실제 플레이는 브라우저 점검이 맡는다.
  vm.runInContext(read('js/game/app.js'), modules);
  for (const name of ['stage', 'prep', 'event', 'hud', 'cutscene', 'wish']) {
    const file = 'js/game/' + name + '.js';
    before(file, 'js/main.js');
    assert.equal(scripts.filter((f) => f === file).length, 1);
    vm.runInContext(read(file), modules);
  }
  assert.equal(typeof modules.G.stage.mount, 'function');
  assert.equal(typeof modules.G.stage.play, 'function');
  assert.equal(typeof modules.G.app.screens.event, 'function');
  assert.equal(typeof modules.G.hud.refresh, 'function');
  for (const file of ['css/sim.css', 'css/scenes.css']) {
    assert.ok(html.includes('href="' + file + '"'));
    assert.ok(fs.existsSync(new URL(file, root)));
  }
  assert.ok(read('js/core/data.js').includes("'sprites'"));
  const sprites = { window: {} };
  vm.runInNewContext(read('js/data/sprites.js'), sprites);
  const registered = clone(sprites.window.GUUN.sprites);
  const sheets = ['study', 'geomungo', 'sword', 'strategy', 'hoseung'];
  const icons = ['munjang', 'eumak', 'muye', 'jiryak', 'gong', 'fame', 'wealth'];
  assert.deepEqual(Object.keys(registered).sort(), [...sheets, ...icons].sort());
  for (const [id, meta] of Object.entries(registered)) {
    assert.deepEqual(Object.keys(meta).sort(), ['src', 'width', 'height', 'frames', 'rows'].sort());
    const sheet = sheets.includes(id);
    assert.equal(meta.src, sheet ? `assets/sprites/${id}.webp` : `assets/ui/icon_${id}.png`);
    assert.equal(meta.width, sheet ? 96 : 32);
    assert.equal(meta.height, sheet ? 96 : 32);
    assert.equal(meta.frames, sheet ? 4 : 1);
    assert.equal(meta.rows, 1);
    const bytes = fs.readFileSync(new URL(meta.src, root));
    if (sheet) {
      assert.equal(bytes.toString('ascii', 12, 16), 'VP8L');
      const bits = bytes.readUInt32LE(21);
      assert.equal((bits & 0x3fff) + 1, meta.width * meta.frames);
      assert.equal(((bits >>> 14) & 0x3fff) + 1, meta.height);
    } else {
      assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
      assert.equal(bytes.readUInt32BE(16), meta.width);
      assert.equal(bytes.readUInt32BE(20), meta.height);
    }
  }
});
test('선생님 핵심 보기와 보통 준비 저장·잘못된 호출 무변경', () => {
  G.save.reset();
  G.save.peekEvent(event);
  assert.equal(G.save.state.events[event.id], undefined);
  G.save.state.teacher = true;
  G.save.peekEvent(event);
  assert.equal(G.save.load().events[event.id].peek, true);
  const before = clone(G.save.state);
  assert.throws(() => G.save.prepare(event, 1, 'study'));
  assert.throws(() => G.save.prepare(event, 0, 'unknown'));
  assert.throws(() => G.save.finishEvent(event));
  assert.deepEqual(clone(G.save.state), before);
  const next = { ...event, id: 'e02-test' };
  G.save.fillBefore([event, next, { id: 'c3-feast', kind: 'scene' }], 'c3-feast');
  assert.equal(G.save.load().events[next.id].auto, true);
  assert.equal(G.save.state.events[event.id].turns.length, 0);
});
console.log('점검 묶음 ' + checks + '개 통과');
