import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { harness, ROOT, start, target, dialogue, ready, state, step, seekTarget, fieldCell, secretWish } from './rpg-harness.mjs';

const shots = path.join(ROOT, 'tests/shots');
const order = ['c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin'];
const h = await harness(), observations = [];
const guardsOnly = process.argv.includes('--wish-guards');
const compatOnly = process.argv.includes('--wish-compat');
if (guardsOnly) console.log('소원 권한 회귀만 검사 · 반응형 여덟 경로는 이 명령에서 미실행');
if (compatOnly) console.log('F1 소원 호환 기록 회귀만 검사 · 자료 주입은 학생 완주 증거 아님');
let p, passed = 0, compatPassed = 0;
const at = (p, scene, beat) => p.waitForFunction(({ scene, beat }) => {
  const el = document.querySelector('.play');
  return el?.dataset.scene === scene && (!beat || el.dataset.beat === beat);
}, { scene, beat });
const next = p => p.locator('#tray [data-act="next"]').click();
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
async function log(p, label) {
  const value = await p.evaluate(() => ({ current: G.app.current(), access: G.save.access, state: G.save.state, wishes: G.app.wishes() }));
  delete value.current.data; observations.push({ label, ...value });
}
async function resume(p) {
  const before = await state(p);
  await p.reload(); await ready(p); await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await at(p, before.pos);
  const after = await state(p);
  for (const key of ['journal', 'ledger', 'items', 'bonds', 'pearls']) assert.deepEqual(after[key], before[key], key + ' 재접속');
  assert.equal(after.rpg.run, before.rpg.run);
  if (before.rpg.cursor) assert.deepEqual(after.rpg.cursor, before.rpg.cursor, '마지막 보행 칸 재개');
}
async function capture(p, name) {
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.target?.closest?.('.stage-portrait')).map(a => a.finished.catch(() => {})));
  });
  await p.waitForFunction(() => [...document.querySelectorAll('.stage-portrait img')].every(img => img.complete && img.naturalWidth > 0));
  if (await p.locator('[data-world]').count()) await p.locator('.world-camera').scrollIntoViewIfNeeded();
  const layout = await p.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const nodes = [...document.querySelectorAll('.world-goal,.world-actions button,.world-target-list button,.stage-speech,.stage-portrait img,.wish-passage,.wish-help button:not([hidden]),.world-dialogue [data-act="next"]')].filter(el => el.checkVisibility());
    const art = document.querySelector('[data-world] img'), speech = document.querySelector('.world-dialogue .stage-speech'), advance = document.querySelector('.world-dialogue [data-act="next"]');
    const required = document.querySelector('.world-object.required');
    const shell = document.querySelector('[data-game-shell]'), field = document.querySelector('[data-game-field]');
    const panels = [...document.querySelectorAll('.main,.play > .tray,.world-dialogue')].filter(el => el.getBoundingClientRect().width > 0).map(rect);
    return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth,
      pageScroll: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), shell: shell && rect(shell), field: field && rect(field), mode: shell?.dataset.mode, panels,
      scale: art && rect(art).width * devicePixelRatio / art.naturalWidth,
      nodes: nodes.map(el => ({ box: rect(el), text: el.textContent, clipped: el.scrollHeight > el.clientHeight + 1 })),
      speech: speech && rect(speech), advance: advance && rect(advance), required: required && { box: rect(required), kind: required.dataset.kind, marker: getComputedStyle(required, '::after').content, markerDisplay: getComputedStyle(required, '::after').display, outline: getComputedStyle(required).outlineStyle, inCamera: (()=>{ const r=required.getBoundingClientRect(),c=required.closest('.world-camera').getBoundingClientRect(); return r.left>=c.left&&r.right<=c.right&&r.top>=c.top&&r.bottom<=c.bottom; })(), visible: (() => {
        const r = required.getBoundingClientRect(); return document.elementFromPoint(r.left+r.width/2, r.top+r.height/2)?.closest('[data-object]') === required;
      })(), top: (() => {
        const r = required.getBoundingClientRect(), el = document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return el && { tag: el.tagName, cls: el.className, text: el.textContent };
      })() } };
  });
  assert.equal(layout.overflow, false); assert.ok(layout.nodes.length > 0, '빈 관찰 금지');
  assert.equal(layout.shell.height, layout.height, '게임 shell은 viewport 높이');
  assert.equal(layout.field.height, layout.height, '게임 field는 viewport 높이');
  assert.ok(layout.pageScroll <= layout.height + 1, '게임 밖 문서 스크롤 금지');
  assert.ok(layout.panels.every(box => box.left >= -1 && box.right <= layout.width + 1 && box.top >= -1 && box.bottom <= layout.height + 1), '게임 창/HUD viewport 이탈');
  for (const node of layout.nodes) { assert.ok(node.box.height > 0); assert.ok(node.box.left >= 0 && node.box.right <= layout.width + 1, node.text + ' 가로 잘림'); assert.equal(node.clipped, false, node.text + ' 내부 잘림'); }
  if (layout.scale) assert.ok(Number.isInteger(layout.scale) || Number.isInteger(1 / layout.scale), '정수·역정수 배율');
  if (layout.speech && layout.advance) assert.ok(layout.advance.top >= layout.speech.bottom, '대화·진행 겹침');
  if (layout.required) {
    assert.ok(layout.required.box.width > 0 && layout.required.box.height > 0);
    // 2026-10-06 사용자 지적: 인물뿐 아니라 물건·출구도 사각 테두리 없이 작은 느낌표로 다음 대상을 알린다.
    assert.equal(layout.required.outline, 'none', '필수 대상 사각 테두리 제거(' + layout.required.kind + ')');
    assert.equal(layout.required.marker, '"!"', '필수 대상의 작은 느낌표 유지(' + layout.required.kind + ')');
    assert.notEqual(layout.required.markerDisplay, 'none', '필수 대상 표시 숨김 금지');
    if (layout.required.inCamera && !layout.speech) assert.equal(layout.required.visible, true, '카메라 안 필수 대상 실제 hit: ' + JSON.stringify(layout.required));
    assert.equal(await p.locator('[data-world-target]').count() > 0, true, '화면 밖 대상의 목록 경로 유지');
  }
  observations.push({ label: name + '-layout', layout });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
}
async function firstMeeting(p, mode) {
  if (mode === 'keyboard') {
    await p.locator('[data-world]').focus(); for (let i = 0; i < 5; i++) await step(p,'ArrowUp');
    assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length, 0, '걷기만으로 대화 기록을 만들지 않음'); await p.keyboard.press('Enter');
  } else if (mode === 'touch') {
    await fieldCell(p,5,6,true);
    await p.waitForFunction(() => G.save.state.rpg.cursor.x === 5 && G.save.state.rpg.cursor.y === 6);
    assert.equal((await state(p)).rpg.scenes['c1-bridge'].actions.length, 0, '도착은 대화가 아님');
    await p.locator('[data-object="bridge-fairy"]').tap();
    await p.waitForFunction(() => document.querySelector('[data-act="interact"][data-target="bridge-fairy"]')?.disabled === false);
    await p.locator('[data-act="interact"][data-target="bridge-fairy"]').tap();
  } else await target(p, 'bridge-fairy');
  await p.waitForSelector('[data-dialogue]'); await p.locator('[data-dialogue] [data-act="next"]').click();
  assert.equal(await p.locator('.stage-speaker').innerText(), '연두 띠의 선녀'); assert.equal(await p.locator('.stage-portrait img').count(), 1, '공개 호칭·큰 초상');
}
async function toWish(p, opt = {}) {
  await start(p); await at(p, 'c1-bridge', 'bridge-meet');
  assert.equal(await p.locator('.play').getAttribute('data-actor'), 'seongjin'); assert.equal(await p.locator('[data-world-target="bridge-home"]').count(), 0);
  if (opt.big) { await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape'); }
  await firstMeeting(p, opt.mode || 'list'); if (opt.name) await capture(p, opt.name + '-bridge'); await dialogue(p);
  await target(p, 'bridge-flower'); await dialogue(p); await target(p, 'bridge-home'); await dialogue(p);
  await log(p, '돌다리 끝'); await next(p); await at(p, 'c1-cell', 'cell-window');
  if (opt.reconnect) { await seekTarget(p,'cell-cushion'); await p.waitForFunction(() => G.save.state.rpg.cursor.y === 6); await resume(p); }
  if (opt.observe) { await target(p, 'cell-book'); await dialogue(p); }
  if (opt.name) await capture(p, opt.name + '-cell');
  await target(p, 'cell-window'); await dialogue(p); await target(p, 'cell-cushion'); await dialogue(p);
  await log(p, '선방 끝'); await next(p); await at(p, 'c1-wish');
}
async function solveWish(p, help = false, reconnect = false) {
  const answers = await p.evaluate(() => G.app.current().data.answers);
  if (help) {
    await p.locator('[data-word="w-water"]').click(); await p.locator('[data-word="w-book"]').click();
    assert.equal((await state(p)).journal.wish.wrong, 2); assert.equal((await state(p)).ledger['a-wish'].first, false);
    await p.locator('[data-word="' + answers[0] + '"]').click(); if (reconnect) await resume(p);
    await p.locator('[data-help="answer"]').click(); assert.equal((await state(p)).ledger['a-wish'].help, 'student'); assert.ok(await p.locator('.wish-word.answer').count() > 0);
  }
  for (const id of answers) { const b = p.locator('[data-word="' + id + '"]'); if (!await b.isDisabled()) await b.click(); }
  const s = await state(p); assert.deepEqual(s.ledger['a-wish'], { first: !help, help: help ? 'student' : null, final: true });
  assert.deepEqual([...s.journal.wish.selected].sort(), [...answers].sort()); assert.equal(await p.locator('.wish-found[data-wish="misaek"] b').innerText(), '?'); await log(p, '소원 확정');
  // 숨긴 소원을 고르기 전에는 다음 단추가 없다. 고르면 같은 화면에 고른 것만 남는다.
  assert.equal(await p.locator('#tray [data-act="next"]').count(), 0, '숨긴 소원 전 다음 없음');
  assert.equal(await p.locator('[data-secret-wish="misaek"]').count(), 0, '미색은 숨긴 소원 후보 아님');
  await secretWish(p, 'pungryu'); assert.equal((await state(p)).play.secretWish, 'pungryu');
}
// 소원 확정 뒤에는 숨긴 소원 질문이 먼저 나오고, 고른 뒤에야 다음 단추가 생긴다.
async function chooseSecretThenNext(p) {
  await p.waitForSelector('[data-act="secret"]');
  assert.equal(await p.locator('#tray [data-act="next"]').count(), 0, '숨긴 소원 전 다음 없음');
  await secretWish(p); await p.waitForSelector('#tray [data-act="next"]:not([disabled])');
}
async function toHuayin(p) {
  await next(p); await at(p, 'c1-exile', 'exile-listen'); await target(p, 'exile-master');
  assert.equal(await p.locator('.stage-speaker').innerText(), '육관대사'); assert.equal(await p.locator('.stage-portrait img').count(), 1);
  await dialogue(p); await target(p, 'exile-answer'); await dialogue(p); await target(p, 'exile-door'); await dialogue(p);
  await log(p, '꾸짖음 끝'); await next(p); await at(p, 'c1-rebirth');
  let turns = 0; while (await p.locator('.play[data-scene="c1-rebirth"]').count()) { assert.ok(turns++ < 12, '재탄생 연결'); await next(p); await p.waitForTimeout(30); }
  await at(p, 'e01-huayin', 'huayin-look'); assert.equal(await p.locator('.play').getAttribute('data-actor'), 'yang');
  assert.equal(await p.locator('.world-actor').evaluate(el => getComputedStyle(el).backgroundImage.includes('walk-yang-scholar')), true); await log(p, '양소유로 전환');
}
async function finishHuayin(p, opt = {}) {
  if (opt.pearl) {
    await target(p, 'huayin-pearl'); await dialogue(p); const s = await state(p);
    assert.equal(s.pearls.chae, true); assert.deepEqual(s.items, []); assert.deepEqual(s.bonds, []); assert.equal(s.rpg.scenes['e01-huayin'].beat, 'huayin-look');
  }
  await target(p, 'huayin-willow'); await dialogue(p); await target(p, 'huayin-brush'); await dialogue(p); await target(p, 'huayin-nurse');
  await p.locator('[data-dialogue] [data-act="next"]').click(); assert.equal(await p.locator('.stage-speaker').innerText(), '진채봉'); assert.equal(await p.locator('.stage-portrait img').count(), 1);
  if (opt.name) await capture(p, opt.name + '-huayin'); await dialogue(p); await target(p, 'huayin-reply');
  await p.locator('[data-world]').focus(); await p.keyboard.press('Enter');
  assert.equal((await state(p)).items.filter(id => id === 'it-yangryu').length, 1); assert.equal((await state(p)).rpg.scenes['e01-huayin'].actions.filter(a => a.id === 'huayin-reply').length, 1);
  await dialogue(p);
  if (opt.replay) { await log(p, '마친 장면의 시전 재연'); return; }
  if (opt.reconnect) await resume(p);
  const wishes = await p.evaluate(() => G.app.wishes()); assert.equal(wishes.find(w => w.id === 'misaek').name, '?'); assert.equal(wishes.find(w => w.id === 'misaek').hidden, true); assert.ok(wishes.every(w => w.fill === 0), '인연·구슬 소원 입력 금지');
  await target(p, 'huayin-road');
  await p.locator('[data-dialogue] [data-act="next"]').click();
  assert.match(await p.locator('.stage-speech').innerText(), /대표 구간 종료/);
  assert.match(await p.locator('.stage-speech').innerText(), /전체 본편 완료 아님/);
  if (opt.name) await capture(p, opt.name + '-end');
  await dialogue(p); await p.waitForSelector('[data-profile-end]');
  if (opt.name) await capture(p, opt.name + '-finished');
  assert.match(await p.locator('[data-profile-end]').innerText(), /본편 전체 완료는 아니/); assert.equal(await p.locator('[data-kind="result"],[data-act="save-image"]').count(), 0);
  const s = await state(p); assert.equal(s.teacher, false); assert.equal(s.awake, false); assert.ok(order.every(id => s.done[id] === true));
  assert.equal(s.items.filter(id => id === 'it-yangryu').length, 1); assert.deepEqual(s.bonds, ['chae']); assert.equal(!!s.pearls.chae, !!opt.pearl);
  for (const record of Object.values(s.rpg.scenes)) assert.ok(record.actions.every(a => a.by === 'student'));
  for (const k of ['abil', 'res', 'best', 'events']) assert.equal(Object.hasOwn(s, k), false, k + ' 옛 필드 없음');
  assert.equal(await p.locator('[data-score],[data-grade],[data-act="prep"],.sim-hud').count(), 0); await log(p, '대표 구간 종료 / 전체 본편 완료 아님');
}
try {
  await test('제품 데이터·순수값 fixture·28/12/3 기준 유지', async () => {
    const box = vm.createContext({ window: {}, G: {} });
    for (const file of fs.readdirSync(path.join(ROOT, 'js/data')).filter(f => f.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data', file), 'utf8'), box);
    const product = JSON.parse(JSON.stringify(box.window.GUUN));
    const source = fs.readFileSync(path.join(ROOT, 'tests/fixtures/rpg-opening.js'), 'utf8'); assert.doesNotMatch(source, /\bfunction\b|=>|\bget\s+\w+\s*\(|\bG\.|\bfetch\s*\(/);
    const fx = vm.createContext({ window: {} }); vm.runInContext(source, fx); const fixture = JSON.parse(JSON.stringify(fx.window.GUUN));
    assert.deepEqual(fixture.scenes.map(s => s.id), order);
    const expectedMaps = product.maps.filter(m => fixture.maps.some(f => f.id === m.id)).map(m => ({ ...m, objects: m.objects
      .filter(o => !o.visibleAt.length || o.visibleAt.some(v => order.some(id => v.startsWith(id + ':'))))
      .map(o => ({ ...o, visibleAt: o.visibleAt.filter(v => order.some(id => v.startsWith(id + ':'))) })) }));
    assert.deepEqual(fixture.maps, expectedMaps);
    for (const [key, value] of Object.entries(fixture.sprites)) assert.deepEqual(value, product.sprites[key]);
    fixture.scenes.at(-1).lines.pop(); fixture.experiences.at(-1).beats.at(-1).lines.pop();
    assert.deepEqual(fixture.scenes, product.scenes.filter(s => order.includes(s.id))); assert.deepEqual(fixture.experiences, product.experiences.filter(e => order.includes(e.scene)));
    assert.equal(product.scenes.filter(s => !s.optional).length, 28); assert.equal(product.scenes.filter(s => s.kind === 'event').length, 12); assert.equal(product.scenes.filter(s => s.kind === 'link').length, 3);
    for (const file of ['world', 'experience', 'data']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core', file + '.js'), 'utf8'), box);
    const problems = [...box.G.checkData(product)]; fs.writeFileSync(path.join(shots, 't4-production-data-problems.json'), JSON.stringify(problems, null, 2));
    console.log('실제 이야기 한글 음절:', box.G.storyText(product).count);
    console.log('실제 전체 데이터 미완료:', problems.join(' | '));
  });
  for (const width of guardsOnly || compatOnly ? [] : [320, 390, 820, 1280]) for (const big of [false, true]) {
    const mode = width === 320 ? 'touch' : width === 1280 ? 'keyboard' : 'list', help = width === 320 || width === 820;
    const name = `t4-${width}-${big ? 'big' : 'normal'}`;
    await test(name + ' 일반 학생 실제 조작·소원·시전·구슬·전환', async () => {
      p = await h.page('rpg-opening', { width, height: 844 }, { hasTouch: mode === 'touch' });
      const entry = await p.evaluate(() => ({ ok: G.data.ok, problems: G.data.problems, teacher: G.save.state.teacher, key: G.save.key }));
      assert.equal(entry.ok, true, 'rpg-opening 실제 진입'); assert.deepEqual(entry.problems, []); assert.equal(entry.teacher, false); assert.equal(entry.key, 'guunmong-v3-fixture-rpg-opening');
      await toWish(p, { mode, big, name, reconnect: big, observe: help }); await solveWish(p, help, big); await capture(p, name + '-wish'); await toHuayin(p); await finishHuayin(p, { name, pearl: help, reconnect: big });
      await p.context().close(); p = null;
    });
  }
  if (!compatOnly) {
  await test('소원·시전 readonly 재연과 완료 잠금의 전체 상태 불변', async () => {
    p = await h.page('rpg-opening'); await toWish(p); await solveWish(p); await toHuayin(p); await finishHuayin(p); const before = await state(p);
    assert.equal(await p.evaluate(() => G.app.open('c1-cell', { quiet: true })), true); await at(p, 'c1-cell');
    assert.equal(await p.locator('.play').getAttribute('data-actor'), 'seongjin'); assert.deepEqual(await state(p), before, '성진 다시 보기는 저장된 양소유 삶을 바꾸지 않음');
    assert.equal(await p.evaluate(() => G.app.open('c1-wish', { quiet: true })), true); await at(p, 'c1-wish'); assert.equal(await p.locator('.wish-word:not([disabled])').count(), 0);
    await p.evaluate(() => document.querySelector('[data-word="w-water"]').onclick()); assert.deepEqual(await state(p), before);
    assert.equal(await p.evaluate(() => G.app.open('e01-huayin', { quiet: true })), true); await at(p, 'e01-huayin'); await finishHuayin(p, { replay: true }); assert.deepEqual(await state(p), before);
    await p.context().close(); p = null;
  });
  await test('소원 reader·권한 해제·초기화 전 콜백 보호', async () => {
    p = await h.page('rpg-opening'); await toWish(p);
    await p.evaluate(() => { window.oldWish = document.querySelector('[data-word="w-water"]'); window.oldHelp = document.querySelector('[data-teacher="fill"]'); });
    const reader = await p.context().newPage(); await reader.goto(p.url()); await ready(reader); assert.equal(await reader.evaluate(() => G.save.access), 'reader');
    const readerBefore = await state(reader);
    await reader.evaluate(() => G.app.open('c1-wish', { quiet: true })); await at(reader, 'c1-wish');
    assert.equal(await reader.locator('.wish-word:not([disabled])').count(), 0, 'reader 입력 차단');
    await reader.evaluate(() => { document.querySelector('[data-word="w-water"]').onclick(); document.querySelector('[data-teacher="fill"]').onclick(); });
    assert.deepEqual(await state(reader), readerBefore);
    const before = await state(p); await p.evaluate(() => G.save.releaseWriter()); await p.evaluate(() => { window.oldWish.onclick(); window.oldHelp.onclick(); }); assert.deepEqual(await state(p), before);
    await reader.close(); await p.locator('[data-act="acquire"]').click();
    await p.waitForFunction(() => G.save.access === 'writer'); await at(p, 'c1-wish');
    await p.locator('[data-tool="home"]').click(); await p.getByRole('button', { name: '처음부터 새로', exact: true }).click(); await p.getByRole('button', { name: '새로 시작', exact: true }).click();
    await at(p, 'c1-bridge'); const reset = await state(p); assert.notEqual(reset.rpg.run, before.rpg.run);
    await p.evaluate(() => { window.oldWish.onclick(); window.oldHelp.onclick(); }); assert.deepEqual(await state(p), reset);
    await p.context().close(); p = null;
  });
  await test('소원 교사 설정 현재 권한·첫 시도·도움 유지', async () => {
    p = await h.page('rpg-opening'); await toWish(p);
    await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="teacher"]').click(); await p.keyboard.press('Escape'); await p.locator('[data-teacher="show"]').click();
    assert.deepEqual((await state(p)).ledger['a-wish'], { first: null, help: 'teacher', final: false }); await p.evaluate(() => { window.teacherFill = document.querySelector('[data-teacher="fill"]'); });
    await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="teacher"]').click(); const before = await state(p); await p.evaluate(() => window.teacherFill.onclick()); assert.deepEqual(await state(p), before);
    await p.keyboard.press('Escape'); await p.evaluate(() => window.teacherFill.onclick()); assert.deepEqual(await state(p), before);
    await p.locator('[data-word="w-water"]').click(); await p.locator('[data-word="w-book"]').click(); await p.locator('[data-help="answer"]').click();
    assert.equal((await state(p)).ledger['a-wish'].help, 'teacher'); assert.equal((await state(p)).ledger['a-wish'].first, null);
    await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="teacher"]').click(); await p.keyboard.press('Escape');
    await p.evaluate(() => { window.savedSetItem = Storage.prototype.setItem; window.fillWrites = 0; Storage.prototype.setItem = function (...args) { window.fillWrites++; return window.savedSetItem.apply(this, args); }; });
    await p.locator('[data-teacher="fill"]').click();
    assert.equal(await p.evaluate(() => window.fillWrites), 1, '교사 채우기 도움·선택·확정 단일 저장');
    await p.evaluate(() => { Storage.prototype.setItem = window.savedSetItem; });
    assert.deepEqual((await state(p)).ledger['a-wish'], { first: null, help: 'teacher', final: true }); await p.context().close(); p = null;
  });
  await test('소원 저장 실패의 선택·오답·장부 원자성·재시도', async () => {
    p = await h.page('rpg-opening'); await toWish(p); const before = await state(p);
    await p.evaluate(() => { window.restoreSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw Error('저장 실패 검사'); }; });
    await p.locator('[data-word="w-water"]').click(); await p.waitForSelector('[data-save-error="storage"]'); assert.deepEqual(await state(p), before);
    await p.evaluate(() => { Storage.prototype.setItem = window.restoreSetItem; }); await p.locator('[data-act="retry"]').click(); await at(p, 'c1-wish'); await solveWish(p);
    await p.context().close(); p = null;
  });
  }
  const compatCases = [
    { key: 'write-1', name: '1번째 저장 실패 주입', failAt: 1, first: null, help: null, wrong: 0, expected: null },
    { key: 'write-2', name: '2번째 저장 실패 주입', failAt: 2, first: null, help: null, wrong: 0, expected: true },
    { key: 'teacher', name: '교사 도움의 first:null 보존', failAt: 2, first: null, help: 'teacher', wrong: 0, expected: null },
    { key: 'first-false', name: '기존 first:false 보존', failAt: 2, first: false, help: null, wrong: 0, expected: false },
    { key: 'first-true', name: '기존 first:true 보존', failAt: 2, first: true, help: null, wrong: 2, expected: true },
    { key: 'wrong', name: '누적 오답의 first:false 확정', failAt: 2, first: null, help: null, wrong: 2, expected: false },
    { key: 'final', name: '이미 확정된 장부 불변', failAt: 2, first: false, help: 'teacher', wrong: 0, final: true, expected: false },
  ];
  for (const scenario of compatCases) await test('F1 호환 소원 확정 · ' + scenario.name, async () => {
    p = await h.page('rpg-opening'); await toWish(p);
    assert.equal(await p.evaluate(scenario => G.save.transact(G.save.state.rpg.run, next => {
      next.journal.wish = { selected: [...G.app.current().data.answers], wrong: scenario.wrong };
      next.ledger['a-wish'] = { first: scenario.first, help: scenario.help, final: !!scenario.final };
    }), scenario), true, '호환 기록 준비');
    await p.evaluate(failAt => {
      window.f1SetItem = Storage.prototype.setItem;
      window.f1Armed = false; window.f1Attempts = 0; window.f1Writes = [];
      G.app.on('step', (ctx, name) => {
        if (window.f1Armed || ctx.scene.id !== 'c1-wish' || name !== 'wish') return;
        window.f1Armed = true;
        window.f1Before = G.save.state; window.f1RawBefore = localStorage.getItem(G.save.key);
        Storage.prototype.setItem = function (key, raw) {
          if (key !== G.save.key) return window.f1SetItem.call(this, key, raw);
          const attempt = ++window.f1Attempts, blocked = attempt === failAt;
          window.f1Writes.push({ attempt, blocked, ledger: JSON.parse(raw).ledger['a-wish'] });
          if (blocked) throw Error('F1 저장 실패 주입 ' + failAt);
          return window.f1SetItem.call(this, key, raw);
        };
      });
      G.app.open('c1-wish', { replace: true });
    }, scenario.failAt);
    await p.waitForFunction(() => window.f1Armed && (G.save.error === 'storage' || G.save.state.ledger['a-wish']?.final));
    const observed = await p.evaluate(() => {
      const rawAfter = localStorage.getItem(G.save.key);
      return { attempts: window.f1Attempts, writes: window.f1Writes, sameObject: G.save.state === window.f1Before,
        sameRaw: rawAfter === window.f1RawBefore, rawBefore: window.f1RawBefore, rawAfter,
        before: window.f1Before.ledger['a-wish'], after: G.save.state.ledger['a-wish'],
        sameJournal: JSON.stringify(G.save.state.journal) === JSON.stringify(window.f1Before.journal),
        persisted: JSON.parse(rawAfter).ledger['a-wish'], error: G.save.error };
    });
    fs.writeFileSync(path.join(shots, 't4-f1-' + scenario.key + '.json'), JSON.stringify(observed, null, 2));
    console.log('F1 원본 관찰 ' + scenario.key + ': ' + JSON.stringify(observed));
    await p.evaluate(() => { Storage.prototype.setItem = window.f1SetItem; });
    assert.equal(observed.sameJournal, true, '호환 기록의 선택·오답 보존');
    if (scenario.final) {
      assert.equal(observed.attempts, 0, '이미 확정된 장부는 저장하지 않음');
      assert.equal(observed.sameObject, true);
      assert.equal(observed.sameRaw, true);
      assert.deepEqual(observed.after, observed.before);
      assert.equal(await p.locator('.wish-word:not([disabled])').count(), 0);
      await chooseSecretThenNext(p);
    } else if (scenario.failAt === 1) {
      assert.equal(observed.attempts, 1);
      assert.equal(observed.sameObject, true, '첫 저장 실패에서 동결 상태 객체 보존');
      assert.equal(observed.sameRaw, true, '첫 저장 실패에서 raw 저장 보존');
      assert.deepEqual(observed.after, { first: null, help: null, final: false });
      assert.deepEqual(observed.persisted, observed.before);
      await p.waitForSelector('[data-save-error="storage"]');
    } else {
      assert.equal(observed.attempts, 1, '첫 시도와 확정의 단일 저장');
      assert.deepEqual(observed.after, { first: scenario.expected, help: scenario.help, final: true });
      assert.deepEqual(observed.persisted, observed.after);
      assert.equal(observed.error, null);
      assert.ok(observed.writes.filter(write => !write.blocked).every(write => write.ledger.final), '부분 확정 영속 금지');
      await chooseSecretThenNext(p);
    }
    await p.context().close(); p = null;
    compatPassed++;
  });
  assert.deepEqual(h.errors, []); console.log('도입 기본 검사 ' + (passed - compatPassed) + '개 · 소원 호환 회귀 ' + compatPassed + '개 통과 · 자료 주입은 학생 완주 증거 아님 · 전체 본편 완료 아님');
} catch (error) {
  if (p && !p.isClosed()) { await p.screenshot({ path: path.join(shots, 't4-failure.png'), fullPage: true }); observations.push({ label: '실패', body: await p.locator('body').innerText(), state: await state(p) }); }
  console.error('FAIL 도입 실제 관찰:', error.stack); process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(shots, 't4-observations.json'), JSON.stringify({ passed, compatPassed, errors: h.errors, observations }, null, 2)); await h.close();
}
