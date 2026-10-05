import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const box = vm.createContext({ window: {} });
for (const file of fs.readdirSync(new URL('js/data/', root)).filter(f => f.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(new URL('js/data/' + file, root), 'utf8'), box);
}

const ids = ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake'];
const fixture = JSON.parse(JSON.stringify(box.window.GUUN));
fixture.scenes = fixture.scenes.filter(scene => ids.includes(scene.id));
fixture.experiences = fixture.experiences.filter(experience => ids.includes(experience.scene));
fixture.maps = fixture.maps.filter(map => fixture.experiences.some(experience =>
  experience.map === map.id || experience.beats.some(beat => beat.map === map.id)));
for (const map of fixture.maps) {
  map.objects = map.objects.filter(object => !object.visibleAt.length ||
    object.visibleAt.some(value => ids.some(id => value.startsWith(id + ':'))));
  for (const object of map.objects) {
    object.visibleAt = object.visibleAt.filter(value => ids.some(id => value.startsWith(id + ':')));
  }
}
fixture.chapters = { '3': fixture.chapters['3'] };
fixture.board = [];
fixture.house = { stages: [] };
fixture.journal = {};
fixture.interp = {};
fixture.bonds = [];
fixture.people = Object.fromEntries(Object.entries(fixture.people)
  .filter(([id]) => ['yang', 'hoseung', 'seongjin'].includes(id)));
fixture.bgm.tracks = Object.fromEntries(Object.entries(fixture.bgm.tracks)
  .filter(([id]) => ['chwimi', 'awake'].includes(id)));

const note = {
  mark: 'note',
  title: '교사 시연용 대표 구간',
  body: '앞 장의 성취를 새 학생 수행으로 저장하지 않아요. 취미궁부터 같은 선방까지의 깨어남 흐름만 확인해요.'
};
fixture.scenes[0].lines.push(note);
fixture.experiences[0].beats[0].lines.push(fixture.scenes[0].lines.length - 1);

assert.deepEqual(fixture.scenes.map(scene => [scene.id, scene.kind, scene.ch]), [
  ['c3-feast', 'scene', '3'],
  ['c3-monk', 'scene', '3'],
  ['c3-staff', 'waking', '3'],
  ['c3-awake', 'scene', '3']
]);
assert.deepEqual(fixture.experiences.map(experience => [experience.scene,
  experience.beats.map(beat => [beat.id, beat.trigger.kind, beat.trigger.target])]), [
  ['c3-feast', [
    ['feast-palace', 'inspect', 'feast-palace'],
    ['feast-overlook', 'inspect', 'feast-overlook'],
    ['feast-vow', 'inspect', 'feast-vow']
  ]],
  ['c3-monk', [
    ['monk-hear', 'inspect', 'feast-footsteps'],
    ['monk-greeting', 'talk', 'feast-visitor'],
    ['monk-question', 'talk', 'feast-question']
  ]],
  ['c3-staff', [['staff-strike', 'staff', null]]],
  ['c3-awake', [
    ['awake-cushion', 'inspect', 'awake-cushion'],
    ['awake-window', 'inspect', 'awake-window'],
    ['awake-door', 'inspect', 'awake-door']
  ]]
]);
assert.deepEqual(fixture.maps.map(map => [map.id, map.width, map.height]), [
  ['map-cell', 12, 10],
  ['map-feast', 12, 10]
]);

const runtime = vm.createContext({ G: {}, window: {}, console });
for (const file of ['world.js', 'data.js']) {
  vm.runInContext(fs.readFileSync(new URL('js/core/' + file, root), 'utf8'), runtime);
}
assert.deepEqual([...runtime.G.checkData(fixture, { profile: 'rpg-waking' })], []);

fs.writeFileSync(new URL('rpg-waking.js', import.meta.url),
  "'use strict';\nwindow.GUUN = " + JSON.stringify(fixture, null, 2) + ';\n');
console.log('제품 데이터에서 순수값 깨어남 시험 자료 생성 · 4단위 계약과 경고 0 확인');
