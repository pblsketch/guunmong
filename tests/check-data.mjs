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
const STORY_LIMIT = 5000;
ok(story.count > 0 && story.count <= STORY_LIMIT, '글 총량', String(story.count));
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
for (const e of d.interp.evidence.filter(e => !e.template)) ok((e.after ? toTexts(d.interp.lastWords) : before).some(t => t.includes(e.text)), e.id, '선택 전에 실제로 읽은 근거');
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
// ── 고른 대로 차오르는 꿈: 선택의 소원 증감·물러남·뒤 장면 변화·되짚기 틀·E11 (README '위기 도전과 생각 선택'·'되짚기 틀')
const VISIBLE_WISHES = ['chuljang', 'bugwi', 'pungryu', 'gongmyeong'];
const challenge = id => (d.challenges || []).find(c => c.id === id);
const shape = c => Object.fromEntries((c?.options || []).map(o => [o.id, o.stay ? 'stay' : (o.wish || []).map(w => w.wish + (w.step > 0 ? '+' : '-')).join(',')]));
ok(challenge('ch-tianjin-poem')?.music === true, '시회', '시·음악 자리 표시');
ok(JSON.stringify(shape(challenge('ch-tianjin-poem'))) === JSON.stringify({ boast: 'bugwi+,pungryu-', heart: 'pungryu+', mock: 'gongmyeong+,pungryu-' }), '시회', '처음 고른 시의 증감');
ok(challenge('ch-tianjin-poem')?.answer === 'heart', '시회', '정답이 있는 도전으로 남음');
ok(JSON.stringify(shape(challenge('ch-yoyeon-reply'))) === JSON.stringify({ sword: 'gongmyeong+', call: 'chuljang+', calm: 'stay' }), '자객 앞', '생각 선택 증감과 물러남');
const order = challenge('ch-neungpa-order');
ok(order && order.scene === 'e10-neungpa' && order.beat === 'neungpa-share' && order.kind === 'talk' && order.at === 0 && typeof order.prompt === 'string' && typeof order.note === 'string', '반사곡 차례', '새 생각 선택 자리');
ok(order && Object.values(shape(order)).join('|') === 'chuljang+|gongmyeong+|stay', '반사곡 차례', '장수·공·쓰러진 군사의 증감');
ok(/게임/.test(order?.note || '') && /원작/.test(order?.note || ''), '반사곡 차례', '꾸민 장치라는 원작과 게임 노트');
for (const id of ['ch-bridge-reply', 'ch-gyeonghong-reply']) ok((challenge(id)?.options || []).every(o => !('wish' in o) && !('stay' in o)), id, '이번에는 소원을 움직이지 않음');
for (const c of d.challenges || []) for (const o of c.options || []) for (const w of o.wish || []) {
  ok(VISIBLE_WISHES.includes(w.wish), c.id + '/' + o.id, '드러난 소원 넷만 움직임');
  ok(w.wish !== 'pungryu' || c.music === true, c.id + '/' + o.id, '풍류는 시·음악 자리에서만');
}
const water = challenge('ch-bansagok-water'), who = challenge('ch-gyeonghong-who');
ok(water?.after?.from === 'ch-yoyeon-night' && JSON.stringify(water.after.spots) === JSON.stringify(['stream', 'pool']) && typeof water.after.text === 'string', '반사곡 물', '자객 첫 성공 뒤 미리 표시할 두 곳');
ok(who?.after?.from === 'ch-chunun-ghost' && who.after.clue === 1 && typeof who.after.text === 'string', '적생 추리', '가춘운 첫 성공 뒤 미리 펼칠 단서(답을 주지 않는 1번)');
for (const c of [water, who, order]) if (c) for (const t of [c.after?.text, ...(c.options || []).map(o => o.reply?.text || o.reply)].filter(t => typeof t === 'string')) ok(story.texts.includes(plain(t)), c.id, '새 반응·안내가 이야기 총량에 듦');
const E11 = d.interp.evidence.find(e => e.id === 'E11');
ok(d.interp.evidence.length === 11 && E11?.template === true && typeof E11.text === 'string' && typeof E11.from === 'string', '해석', 'E11 내가 꿈에서 고른 길 틀 근거');
ok(d.interp.options.find(o => o.id === 'i-own')?.fits?.includes('E11'), '해석', 'E11은 i-own에 맞음');
const recap = d.interp.recap || {};
for (const key of ['chose', 'item', 'pickName', 'stayName', 'none', 'teacher', 'wishLine', 'peakOnly', 'ask']) ok(typeof recap[key] === 'string' && recap[key].trim(), '되짚기', key + ' 틀');
ok(Array.isArray(recap.counts) && recap.counts.length >= 3 && recap.counts.every(v => typeof v === 'string' && !/[0-9]/.test(v)), '되짚기', '횟수는 숫자 없는 말');
ok(JSON.stringify((recap.first || []).map(f => f.challenge)) === JSON.stringify(['ch-chunun-ghost', 'ch-yoyeon-night']), '되짚기', '이번 묶음 두 도전의 첫 결과');
ok(recap.ask === '그 삶은 처음 바라던 삶과 같았느냐?', '되짚기', '마지막 물음');
ok(story.texts.some(t => t === recap.ask), '되짚기', '틀 문장이 이야기 총량에 듦');
ok(story.texts.some(t => t.includes('출장입상') && t.includes('공명') && t.includes('부귀') && t.includes('풍류') && !t.includes('{')), '되짚기', '가장 긴 채움으로 셈');
{
  // 틀 근거 E11도 학생이 읽는 글이다. 네 소원 쪽과 물러남을 모두 든 가장 긴 채움이 이야기 총량에 있어야 한다.
  const names = d.wishes.filter(w => VISIBLE_WISHES.includes(w.id)).map(w => w.name);
  const top = [...names.map(n => (recap.pickName || '').replace('{wish}', n)), recap.stayName].join('·');
  const filled = (E11?.text || '').replace(/\{top(?::([^}]+))?\}/, (all, pair) => top + (pair ? pair.split('/')[0] : ''));
  ok(E11 && !filled.includes('{') && story.texts.includes(filled), '해석', 'E11 틀을 가장 길게 채운 줄이 이야기 총량에 듦');
}
const ui = d.notes.ui || {};
for (const [group, keys] of Object.entries({ secretWish: ['title', 'prompt', 'hint', 'button', 'review', 'saved', 'teacher', 'retry'], band: ['label', 'wish', 'hidden', 'secret', 'bonds', 'separator'], choice: ['up', 'down', 'stay', 'first'], collapse: ['label', 'bonds'] })) {
  for (const key of keys) ok(typeof ui[group]?.[key] === 'string', '화면 글', group + '.' + key);
}
ok(Array.isArray(ui.band?.levels) && ui.band.levels.length === 5 && Array.isArray(ui.band?.bondCounts) && ui.band.bondCounts.length === 9, '화면 글', '띠의 정도·인연 칸 말');
for (const key of ['bonds', 'secretWish', 'noSecret', 'peak', 'recap']) ok(typeof ui.result?.[key] === 'string', '화면 글', 'result.' + key);
ok(ui.result?.noSecret === '고르지 않음' && ui.result?.bonds === '꿈에서 만난 인연' && ui.choice?.first === '처음 고른 길', '화면 글', '결과·다시 읽기 문구');
const digits = v => typeof v === 'string' ? /[0-9]/.test(v) : Array.isArray(v) ? v.some(digits) : v && typeof v === 'object' ? Object.values(v).some(digits) : false;
ok(!digits([ui.secretWish, ui.band, ui.choice, ui.collapse, recap]), '화면 글', '소원 정도에 숫자 없음');
const warns = (code, change) => {
  const bad = structuredClone(d);
  try { change(bad); } catch { return false; } // 바꿀 자료가 없으면 음성 사례도 성립하지 않는다
  return sandbox.G.checkData(bad).some(p => p.startsWith(code + ':'));
};
const optionOf = (bad, id, option) => bad.challenges.find(c => c.id === id).options.find(o => o.id === option);
for (const [name, code, change] of [
  ['미색 증감', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'misaek', step: 1 }]; }],
  ['없는 소원 id', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'fame', step: 1 }]; }],
  ['한 칸 넘는 증감', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'gongmyeong', step: 2 }]; }],
  ['0 증감', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'gongmyeong', step: 0 }]; }],
  ['빈 증감', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = []; }],
  ['같은 소원 두 번', 'challenge-wish', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'gongmyeong', step: 1 }, { wish: 'gongmyeong', step: 1 }]; }],
  ['도전 결과에 증감', 'challenge-wish', bad => { bad.challenges.find(c => c.id === 'ch-chunun-ghost').options[0].wish = [{ wish: 'bugwi', step: 1 }]; }],
  ['시·음악 아닌 자리의 풍류', 'challenge-pungryu', bad => { optionOf(bad, 'ch-yoyeon-reply', 'sword').wish = [{ wish: 'pungryu', step: 1 }]; }],
  ['시회 표시 없는 풍류', 'challenge-pungryu', bad => { delete bad.challenges.find(c => c.id === 'ch-tianjin-poem').music; }],
  ['물러남 둘', 'challenge-stay', bad => { const o = optionOf(bad, 'ch-yoyeon-reply', 'call'); delete o.wish; o.stay = true; }],
  ['물러남 없음', 'challenge-stay', bad => { delete optionOf(bad, 'ch-neungpa-order', 'fallen').stay; }],
  ['증감 있는 물러남', 'challenge-stay', bad => { optionOf(bad, 'ch-yoyeon-reply', 'calm').wish = [{ wish: 'bugwi', step: 1 }]; }],
  ['정답 도전의 물러남', 'challenge-stay', bad => { optionOf(bad, 'ch-tianjin-poem', 'heart').stay = true; }],
  ['답이 든 미리 표시', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-bansagok-water').after.spots = ['stream', 'dragon']; }],
  ['없는 자리 미리 표시', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-bansagok-water').after.spots = ['stream', 'cave']; }],
  ['없는 앞 도전', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-bansagok-water').after.from = 'ch-missing'; }],
  ['뒤 도전을 앞 도전으로', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-gyeonghong-who').after.from = 'ch-yoyeon-night'; }],
  ['생각 선택을 앞 도전으로', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-bansagok-water').after.from = 'ch-yoyeon-reply'; }],
  ['범위 밖 단서', 'challenge-after', bad => { const c = bad.challenges.find(c => c.id === 'ch-gyeonghong-who'); c.after.clue = c.clues.length; }],
  ['추리에 자리 표시', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-gyeonghong-who').after.spots = ['stream']; }],
  ['안내 없는 변화', 'challenge-after', bad => { bad.challenges.find(c => c.id === 'ch-gyeonghong-who').after.text = ''; }],
  ['인연에 증감', 'bond-fill', bad => { bad.bonds[0].wish = [{ wish: 'bugwi', step: 1 }]; }],
  ['구슬에 증감', 'pearl-wish', bad => { bad.scenes.find(s => s.pearl).pearl.wish = [{ wish: 'bugwi', step: 1 }]; }],
  ['인연 효과에 증감', 'effect-fields', bad => { const e = bad.experiences.flatMap(e => e.beats).flatMap(b => b.effects).find(v => v.kind === 'bond'); e.wish = [{ wish: 'bugwi', step: 1 }]; }],
  ['틀 표시 없는 E11', 'evidence', bad => { delete bad.interp.evidence.find(e => e.id === 'E11').template; }],
  ['근거 개수', 'evidence-count', bad => { bad.interp.evidence = bad.interp.evidence.filter(e => e.id !== 'E11'); }],
  ['없는 근거를 맞춤', 'interp-fits', bad => { bad.interp.options[0].fits.push('E12'); }],
  ['되짚기 틀 빠짐', 'interp-recap', bad => { delete bad.interp.recap.ask; }],
  ['되짚기 틀의 모르는 자리', 'interp-recap', bad => { bad.interp.recap.wishLine += '{score}'; }],
  ['되짚기 횟수 말 부족', 'interp-recap', bad => { bad.interp.recap.counts = ['한 번']; }],
  ['되짚기 첫 결과의 생각 선택', 'interp-recap', bad => { bad.interp.recap.first[0].challenge = 'ch-yoyeon-reply'; }],
  ['상한 넘는 글', 'story-limit', bad => { bad.challenges.find(c => c.id === 'ch-yoyeon-reply').options[0].reply.text = '가'.repeat(1200); }],
]) ok(warns(code, change), '음성 사례', name + ' → ' + code);
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
console.log(`사건 ${events.length} · 이음 ${links.length} · 물건 ${items.length} · 근거 ${d.interp.evidence.length} · 이야기 ${story.count}/${STORY_LIMIT}자 · 교과서 겹침 ${overlaps}`);
for (const issue of issues) console.error('✗ ' + issue);
console.log(issues.length ? `✗ 데이터 점검 실패 ${issues.length}건` : '✓ 실제 데이터 점검 통과');
process.exitCode = issues.length ? 1 : 0;
