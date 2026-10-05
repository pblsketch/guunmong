import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { probe } from './experience-probe.mjs';

const runtime = vm.createContext({ G: {}, window: {}, console });
for (const file of ['world', 'data']) vm.runInContext(fs.readFileSync(new URL('../../js/core/' + file + '.js', import.meta.url), 'utf8'), runtime);
const check = (data, profile) => [...runtime.G.checkData(data, profile ? { profile } : {})];
const profiles = {
  'rpg-opening': { scenes: ['c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin'], experiences: ['c1-bridge', 'c1-cell', 'c1-exile', 'e01-huayin'] },
  'rpg-waking': { scenes: ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake'], experiences: ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake'] },
  'rpg-front': {
    scenes: ['c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin', 'l-namjeon', 'e02-tianjin', 'e03-geomungo', 'e04-exam', 'e05-chunun', 'l-hebei', 'e06-gyeonghong', 'e07-tungso', 'l-bongnae'],
    experiences: ['c1-bridge', 'c1-cell', 'c1-exile', 'e01-huayin', 'l-namjeon', 'e02-tianjin', 'e03-geomungo', 'e04-exam', 'e05-chunun', 'l-hebei', 'e06-gyeonghong', 'e07-tungso', 'l-bongnae'],
  },
};
for (const [profile, definition] of Object.entries(profiles)) {
  const data = probe(), template = structuredClone(data.experiences[0]);
  data.sprites = { 'test-art': { src: 'assets/world/map-cell.webp', width: 384, height: 320, frames: 1, rows: 1 } };
  for (const map of data.maps) map.art = 'test-art';
  data.scenes = definition.scenes.map(id => ({ ...structuredClone(data.scenes[0]), id,
    ch: profile === 'rpg-waking' ? '3' : /^(e\d{2}-|l-)/.test(id) ? '2' : '1',
    kind: id === 'c1-wish' ? 'wish' : id === 'c3-staff' ? 'waking' : id.startsWith('e') ? 'event' : id.startsWith('l-') ? 'link' : 'scene' }));
  data.experiences = definition.experiences.map(scene => ({ ...structuredClone(template), scene,
    map: ['c1-cell', 'c3-awake'].includes(scene) ? 'map-cell' : 'map-road' }));
  const staff = data.experiences.find(e => e.scene === 'c3-staff');
  if (staff) {
    staff.beats[1].trigger.kind = 'inspect';
    staff.beats.push({ id: 'strike', trigger: { kind: 'staff', target: null }, lines: [], effects: [] });
  }
  assert.deepEqual(check(data, profile), []);
  const wrongKind = structuredClone(data); wrongKind.scenes[0].kind = 'result';
  assert.ok(check(wrongKind, profile).some(s => s.startsWith('kind-chapter:')));
  const wrongChapter = structuredClone(data); wrongChapter.scenes[0].ch = 'R';
  assert.ok(check(wrongChapter, profile).some(s => s.startsWith('kind-chapter:')));
  const missingScene = structuredClone(data); missingScene.scenes.pop();
  assert.ok(check(missingScene, profile).some(s => s.startsWith('profile-scenes:')));
  const reordered = structuredClone(data); reordered.scenes.reverse();
  assert.ok(check(reordered, profile).some(s => s.startsWith('profile-scenes:')));
  const omitted = structuredClone(data); omitted.experiences.pop();
  assert.ok(check(omitted, profile).some(s => s.startsWith('experience-missing:')));
  const placeholder = structuredClone(data); placeholder.maps[0].art = 'placeholder';
  assert.ok(check(placeholder, profile).some(s => s.startsWith('map-art:')));
  data.fixture = profile;
  assert.ok(check(data).some(s => s.startsWith('unit-count:')));
  assert.ok(check(data, 'unrecognized').some(s => s.startsWith('profile:')));
  if (staff) {
    const noStrike = structuredClone(data); noStrike.experiences.find(e => e.scene === 'c3-staff').beats.pop();
    assert.ok(check(noStrike, profile).some(s => s.startsWith('staff-action:')));
  }
}
console.log('대표 프로필 28개 단정 통과 (6/4/15단위의 누락·순서·종류·행동·승인 키, 본편 기준 유지)');
