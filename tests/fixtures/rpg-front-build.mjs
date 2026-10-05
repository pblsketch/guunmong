import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const sourceBox = vm.createContext({ window: {} });
for (const file of fs.readdirSync(new URL('js/data/', root)).filter(file => file.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(new URL('js/data/' + file, root), 'utf8'), sourceBox);
}

const product = JSON.parse(JSON.stringify(sourceBox.window.GUUN));
const fixture = JSON.parse(JSON.stringify(product));
const order = product.scenes.filter(scene => !scene.optional).slice(0, 15).map(scene => scene.id);
const sceneIds = new Set(order);

fixture.scenes = product.scenes.filter(scene => sceneIds.has(scene.id));
fixture.experiences = product.experiences.filter(experience => sceneIds.has(experience.scene));
const mapIds = new Set(fixture.experiences.flatMap(experience => [
  experience.map,
  ...experience.beats.map(beat => beat.map).filter(Boolean),
]));
fixture.maps = product.maps.filter(map => mapIds.has(map.id)).map(map => ({
  ...map,
  objects: map.objects
    .filter(object => !object.visibleAt.length || object.visibleAt.some(value => sceneIds.has(value.split(':')[0])))
    .map(object => ({
      ...object,
      visibleAt: object.visibleAt.filter(value => sceneIds.has(value.split(':')[0])),
    })),
}));
fixture.chapters = { '1': product.chapters['1'], '2': product.chapters['2'] };
fixture.board = [];
fixture.house = { stages: [] };
fixture.journal = {};
fixture.interp = {};
fixture.bonds = product.bonds.filter(bond => fixture.scenes.some(scene => scene.meet === bond.id));

const people = new Set(['seongjin', 'yuk', 'yang']);
for (const map of fixture.maps) for (const object of map.objects) if (object.person) people.add(object.person);
for (const scene of fixture.scenes) for (const line of scene.lines || []) if (line && typeof line === 'object' && line.say) people.add(line.say);
fixture.people = Object.fromEntries(Object.entries(product.people).filter(([id]) => people.has(id)));

const tracks = new Set([
  ...Object.values(fixture.chapters).map(chapter => chapter.bgm),
  ...fixture.scenes.map(scene => scene.bgm),
]);
fixture.bgm.tracks = Object.fromEntries(Object.entries(product.bgm.tracks).filter(([id]) => tracks.has(id)));

assert.deepEqual(order, [
  'c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin',
  'l-namjeon', 'e02-tianjin', 'e03-geomungo', 'e04-exam', 'e05-chunun',
  'l-hebei', 'e06-gyeonghong', 'e07-tungso', 'l-bongnae',
]);
assert.equal(fixture.experiences.length, 13);
assert.deepEqual(fixture.scenes, product.scenes.filter(scene => sceneIds.has(scene.id)));
assert.deepEqual(fixture.experiences, product.experiences.filter(experience => sceneIds.has(experience.scene)));

const last = fixture.scenes.at(-1);
last.lines.push({ mark: 'note', title: '대표 15단위 종료', body: '전체 본편 완료 아님. 돌다리부터 봉래전까지의 대표 구간만 진행했어요.' });
fixture.experiences.at(-1).beats.at(-1).lines.push(last.lines.length - 1);

const runtime = vm.createContext({ window: {}, G: {} });
for (const file of ['world', 'experience', 'data']) {
  vm.runInContext(fs.readFileSync(new URL('js/core/' + file + '.js', root), 'utf8'), runtime);
}
assert.deepEqual([...runtime.G.checkData(fixture, { profile: 'rpg-front' })], []);

const output = "'use strict';\nwindow.GUUN = " + JSON.stringify(fixture, null, 2) + ';\n';
assert.doesNotMatch(output, /\bfunction\b|=>|\bget\s+\w+\s*\(|\bG\.|\bfetch\s*\(/);
fs.writeFileSync(new URL('rpg-front.js', import.meta.url), output);
console.log('제품 데이터 첫 15단위 · 13체험 순수값 시험 자료 생성 및 rpg-front 검증 통과');
