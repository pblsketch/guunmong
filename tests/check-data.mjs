import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { probe } from './fixtures/experience-probe.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const files = fs.readdirSync(path.join(ROOT, 'js/data')).filter(f => f.endsWith('.js'));
const issues = [];
const ok = (condition, where, message) => {
  if (!condition) issues.push(`${where}: ${message}`);
};
const sandbox = { window: {}, G: {} };
vm.createContext(sandbox);
for (const file of files) {
  const source = fs.readFileSync(path.join(ROOT, 'js/data', file), 'utf8');
  if (!['bgm.js', 'sprites.js'].includes(file)) {
    ok(!/\bfunction\b|=>|\bget\s+\w+\s*\(/.test(source), file, '함수·getter 없는 대입 데이터');
  }
  vm.runInContext(source, sandbox, { filename: file });
}
for (const file of ['world', 'experience', 'data']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/core/' + file + '.js'), 'utf8'), sandbox);
for (const profile of ['world-opening', 'world-event']) {
  const representative = probe(profile);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.G.checkData(representative, { profile }))), []);
  console.log('✓ 대표 시험 ' + profile + ' 통과 (실제 본편 검사와 별도)');
}
const d = sandbox.window.GUUN;
for (const problem of sandbox.G.checkData(d)) ok(false, 'T1', problem);
for (const [name, change] of [
  ['자료형', stage => { stage.fromStory = false; }],
  ['빈 조건', stage => { stage.fromStory = ''; }],
  ['없는 사실', stage => { stage.fromStory = 'e11-seungsang:missing'; }],
  ['다른 장면의 사실', stage => { stage.from = 'e08-wonsu'; }],
]) {
  const bad = structuredClone(d), stage = bad.house.stages.find(stage => stage.id === 'seungsang');
  assert.ok(stage, '승상부 단계 필수'); change(stage);
  ok(sandbox.G.checkData(bad).some(problem => problem.startsWith('house-story:')), '생활 공간 조건', name + ' 거부');
}
const story = sandbox.G.storyText(d);
ok(story.count > 0 && story.count <= 4400, '글 총량', String(story.count));
const scenes = d.scenes;
const events = scenes.filter(s => s.kind === 'event');
const links = scenes.filter(s => s.kind === 'link');
const dream = scenes.filter(s => s.ch === '2');
const strings = [];
const face = (id, mood) => {
  const p = d.people[id];
  return p && !p.noFace && p.face && (!mood || (p.moods || []).includes(mood));
};
function walk(value, at) {
  if (typeof value === 'string') { strings.push({ at, text: value }); return; }
  if (!value || typeof value !== 'object') return;
  ok(!Object.hasOwn(value, 'orig'), at, '대조 전 原文');
  if (value.say) ok(face(value.say, value.mood), at, '얼굴·표정 참조');
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    ok(!descriptor.get && !descriptor.set, at + '.' + key, 'getter·setter 금지');
    if ('value' in descriptor) walk(descriptor.value, at + '.' + key);
  }
}
walk(d, 'GUUN');
const exists = (folder, img) => fs.existsSync(path.join(ROOT, 'assets', folder, img + '.webp'));
for (const p of Object.values(d.people)) if (!p.noFace) {
  ok(exists('pt', p.face), p.name, '얼굴 파일');
  for (const mood of p.moods || []) ok(exists('pt', p.face + '_' + mood), p.name, '표정 파일');
}
for (const s of scenes) {
  ok(Object.hasOwn(d.bgm.tracks, s.bgm), s.id, '기존 bgm id 필수');
  if (s.img) ok(exists('sc', s.img), s.id, '장면 그림');
  for (const frame of s.timeline || []) if (frame.img) ok(exists('sc', frame.img), s.id, '컷신 그림');
  for (const old of ['read', 'activity', 'mind', 'flow', 'item']) ok(!(old in s), s.id, '이전 형식 ' + old);
}
for (const track of Object.values(d.bgm.tracks)) ok(fs.existsSync(path.join(ROOT, track.file)), '음원', track.file);
for (const chapter of Object.values(d.chapters)) ok(Object.hasOwn(d.bgm.tracks, chapter.bgm), '장', 'bgm');
for (const s of events) {
  ok(Array.isArray(s.lines) && s.lines.length > 0, s.id, '사건 본문');
  if (s.preview != null) ok(!/문장|음악|무예|지략/.test(s.preview), s.id, '구판 예고에 능력 이름 노출');
  if (/^e0[56]-/.test(s.id)) for (const text of Object.values(s.gradeText || {})) {
    ok(!/간파|꿰뚫|알아채|눈치채|간파했|속지 않/.test(text), s.id, '속임수를 알아채는 등급');
    ok(/웃|품|너그|받아/.test(text), s.id, '속은 뒤 품과 평판');
  }
}
if (events[10]?.core || events[11]?.core) ok(JSON.stringify(events[10]?.core) === JSON.stringify(['muye', 'jiryak']) &&
  JSON.stringify(events[11]?.core) === JSON.stringify(['munjang']), '구판 필드', '개선·재회 core 호환');
ok(links.length === 3 && dream.length === 15, '꿈', '사건 12·이음 3');
ok(new Set(dream.map(s => s.square)).size === 14, '말판', '꿈 장면 칸 14');
ok(events[3]?.square === 'sq-hallim' && events[4]?.square === 'sq-hallim', '말판', '급제·가춘운 같은 칸');
for (const s of dream) {
  const q = d.board.find(q => q.id === s.square);
  ok(q && (q.scene === s.id || (s === events[4] && q.scene === events[3]?.id)), s.id, '말판 연결');
}
for (const q of d.board) {
  ok(q.start ? q.scene === null : scenes.some(s => s.id === q.scene), q.id, '장면 참조');
  const expected = q.id === 'sq-wonsu' ? ['chuljang.chul'] : q.id === 'sq-seungsang' ? ['chuljang.ip'] : [];
  ok(JSON.stringify(q.fills || []) === JSON.stringify(expected), q.id, '출장입상만 칸으로 채움');
}
const items = scenes.flatMap(s => [...(s.items || []), ...(s.bonus?.items || [])]);
const itemImages = fs.readdirSync(path.join(ROOT, 'assets/items')).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5));
ok(items.length === 14 && new Set(items.map(i => i.id)).size === 14, '물건', '중복 없이 14개');
ok(itemImages.length === 14 && itemImages.every(img => items.some(i => i.img === img)), '물건', '기존 그림 모두 배정');
for (const item of items) {
  ok(exists('items', item.img), item.id, '물건 그림');
  ok(item.desc && ['in', 'yard', 'any'].includes(item.slot), item.id, '설명·장식 자리');
}
const instruments = scenes.find(s => s.id === 'l-namjeon')?.bonus;
if (instruments?.abil) ok(instruments.abil.eumak === 2, '구판 필드', '남전산 덤 호환');
ok(['it-geomungo', 'it-tungso'].every(id => instruments?.items?.some(i => i.id === id && i.fills?.includes('pungryu'))), '남전산', '두 악기와 풍류 근거');
ok(items.find(i => i.id === 'it-girinpo')?.fills?.includes('bugwi'), '도포·옥대', '부귀 근거');
ok(events[10]?.lines.some(l => (l.text || l).includes('기린각')), '개선', '기린각은 사건');
for (const stage of d.house.stages) {
  ok(scenes.some(s => s.id === stage.from), stage.id, '집 시작 장면');
  ok(exists('house', stage.img), stage.id, '집 그림');
}
ok(d.journal.pairs.length === 5, '일지', '채점 짝 다섯만');
ok(JSON.stringify(d.journal.pairs.map(p => p.wish)) === JSON.stringify(['chuljang', 'chuljang', 'bugwi', 'pungryu', 'gongmyeong']), '일지', '다섯 짝 대응');
for (const p of d.journal.pairs) ok(story.texts.some(t => t.includes(p.evidence)), p.id, '실제로 읽은 맞대기 근거');
ok(d.journal.bondLink.answer === 'misaek', '인연', '인연 잇기에서 미색');
ok(d.wishes.filter(w => w.dreamHidden).map(w => w.id).join() === 'misaek', '소원', '미색 숨김');
const wish = scenes.find(s => s.kind === 'wish');
ok(wish && new Set(wish.words.filter(w => wish.answers.includes(w.id)).map(w => w.wish)).size === 5, '소원', '다섯 소원');
ok(wish && wish.words.filter(w => !wish.answers.includes(w.id)).every(w => !w.wish && /^(물그릇|경전|염주)$/.test(w.text)), '소원', '바람이 아닌 오답');
ok(d.interp.evidence.filter(e => e.after).length === 3, '해석', '응답 뒤 근거 셋');
const plain = s => s.replace(/\*\*/g, '').replace(/\{([^}|]+)\|[^}]+\}/g, '$1');
const toTexts = v => typeof v === 'string' ? [plain(v)] : Array.isArray(v) ? v.flatMap(toTexts) : v && !v.mark ? toTexts(v.text || v.gloss || '') : [];
const before = scenes.filter(s => ['1', '3'].includes(s.ch)).flatMap(s => [...toTexts(s.lines), ...toTexts(s.monologue), ...(s.timeline || []).flatMap(f => toTexts(f.lines))]);
for (const e of d.interp.evidence) ok((e.after ? toTexts(d.interp.lastWords) : before).some(t => t.includes(e.text)), e.id, '선택 전에 실제로 읽은 근거');
const opening = scenes.find(s => s.id === 'cut-josin');
ok(opening?.optional === true && d.notes.comparison?.scene === opening.id, '조신', '결과의 선택형 비교 읽기');
ok(scenes.filter(s => !s.optional).length === 28 && scenes.find(s => !s.optional)?.id === 'c1-bridge', '본편', '구운몽부터 28단위');
const waking = scenes.find(s => s.kind === 'waking');
ok(waking?.timeline?.at(-1)?.pause === 'staff', '깨어남', '지팡이를 든 데서 멈춤');
ok(d.notes.discuss.length === 2 && d.notes.teacher.ledger, '노트', '생각 나눔 둘·장부 안내');
for (const [key, ids] of Object.entries({ abilities: ['munjang', 'eumak', 'muye', 'jiryak'], actions: ['study', 'geomungo', 'sword', 'strategy'], grades: ['shine', 'fine', 'near'], resources: ['gong', 'fame', 'wealth'] })) {
  ok(ids.every(id => typeof d.notes.ui?.[key]?.[id] === 'string'), '화면 글', key);
}
ok(d.notes.ui?.result?.scoreNotice === '점수로 평가하지 않아요', '결과', '평가 안내');
const banned = [[0xC9C0, 0xD559, 0xC0AC], [0xD2F0, 0xC194, 0xB8E8, 0xC158]].map(c => String.fromCharCode(...c));
for (const { at, text } of strings) {
  ok(!/\?{2,}|\uFFFD/.test(text), at, '한국어 인코딩 손실');
  ok(!banned.some(w => text.includes(w)) && !/TODO|\(임시\)|Tsolution/i.test(text), at, '금칙어');
  ok(!/을\(를\)|이\(가\)|은\(는\)|와\(과\)|를\(을\)|가\(이\)|는\(은\)|과\(와\)/.test(text), at, '두 꼴 조사');
  for (const m of text.matchAll(/\{([^}|]+)\|([\w-]+)\}/g)) ok(face(m[2]), at, '호칭 얼굴');
}
const textbook = 'E:/github/고전 문학 게임/구운몽/design/source/교과서_본문추출.txt';
const norm = s => plain(s).replace(/\[\[[\w-]+\]\]/g, '').replace(/[\s.,!?'"“”‘’·…\-—–()\[\]{}「」『』《》〈〉:;~|\/\\]/g, '');
ok(fs.existsSync(textbook), '교과서 대조', '대조 파일 필수');
let overlaps = 0;
if (fs.existsSync(textbook)) {
  const tb = norm(fs.readFileSync(textbook, 'utf8'));
  const grams = new Set();
  for (let i = 0; i + 15 <= tb.length; i++) grams.add(tb.slice(i, i + 15));
  for (const { at, text } of strings) {
    const t = norm(text);
    for (let i = 0; i + 15 <= t.length; i++) if (grams.has(t.slice(i, i + 15))) {
      overlaps++; ok(false, at, '교과서 15자 겹침'); break;
    }
  }
}
console.log(`사건 ${events.length} · 이음 ${links.length} · 물건 ${items.length} · 근거 ${d.interp.evidence.length} · 이야기 ${story.count}/4400자 · 교과서 겹침 ${overlaps}`);
for (const issue of issues) console.error('✗ ' + issue);
console.log(issues.length ? `✗ 데이터 점검 실패 ${issues.length}건` : '✓ 실제 데이터 점검 통과');
process.exitCode = issues.length ? 1 : 0;
