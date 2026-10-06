import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const box = vm.createContext({ window: {} });
for (const file of fs.readdirSync(new URL('js/data/', root)).filter(f => f.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(new URL('js/data/' + file, root), 'utf8'), box);
}
const fixture = JSON.parse(JSON.stringify(box.window.GUUN));
fixture.scenes = fixture.scenes.filter(s => ['c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin'].includes(s.id));
fixture.experiences = fixture.experiences.filter(e => fixture.scenes.some(s => s.id === e.scene));
fixture.challenges = (fixture.challenges || []).filter(c => fixture.experiences.some(e => e.scene === c.scene));
// 임무 창은 제품 자료의 새 시작에서 검사한다. 부분 시험 자료에는 넣지 않는다.
if (fixture.notes) delete fixture.notes.mission;
fixture.maps = fixture.maps.filter(m => fixture.experiences.some(e => e.map === m.id || e.beats.some(b => b.map === m.id)));
for (const map of fixture.maps) {
  map.objects = map.objects.filter(o => !o.visibleAt.length || o.visibleAt.some(v => fixture.scenes.some(s => v.startsWith(s.id + ':'))));
  for (const object of map.objects) object.visibleAt = object.visibleAt.filter(v => fixture.scenes.some(s => v.startsWith(s.id + ':')));
}
fixture.chapters = { '1': fixture.chapters['1'], '2': fixture.chapters['2'] };
fixture.board = []; fixture.house = { stages: [] }; fixture.journal = {}; fixture.interp = {};
fixture.bonds = fixture.bonds.filter(b => b.id === 'chae');
fixture.people = Object.fromEntries(Object.entries(fixture.people).filter(([id]) => ['seongjin', 'yuk', 'yang', 'chae', 'fairy_chae', 'yumo'].includes(id)));
fixture.bgm.tracks = Object.fromEntries(Object.entries(fixture.bgm.tracks).filter(([id]) => ['lotus', 'hell', 'spring', 'dream'].includes(id)));
const last = fixture.scenes.at(-1);
last.lines.push({ mark: 'note', title: '대표 구간 종료', body: '전체 본편 완료 아님. 돌다리부터 화음현까지의 대표 구간만 진행했어요.' });
fixture.experiences.at(-1).beats.at(-1).lines.push(last.lines.length - 1);
fs.writeFileSync(new URL('rpg-opening.js', import.meta.url), "'use strict';\nwindow.GUUN = " + JSON.stringify(fixture, null, 2) + ';\n');
console.log('제품 데이터에서 순수값 도입 시험 자료 생성');
