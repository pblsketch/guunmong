// 내용 점검: 실제 내용 데이터(js/data/*.js, ?fixture 없이)를 확인하고, 그 데이터로 0장부터 결과 화면까지 학생처럼 끝까지 해 본다.
//   node check-content.mjs        (tests/ 안에서. run-all.mjs가 부른다)
//   ONLY=<점검 이름 일부> node check-content.mjs   (그 화면 점검만. 예: ONLY=태블릿)
// 정적 점검(node에서 데이터 파일을 읽어서)
//   - 原文 표시: 영인 대조 전이므로 데이터 어디에도 orig가 없고, 활동 글은 모두 풀이 바탕, 회목은 '대조 대기'
//   - 그림·소리 이름이 기획서 §17·§18의 이름을 따르는지(파일이 있는지는 보지 않는다. 그림·소리는 만드는 중)
//   - 얼굴 그림: say·{호칭|id}가 얼굴이 있는 인물만 가리키는지, 표정이 그 인물의 표정 목록에 있는지
//   - 쓰면 안 되는 낱말, 교과서 본문 추출본과 15자 이상 겹치는 글(추출본이 이 기기에 있을 때만)
// 화면 점검(크롬으로, 이 기기 안의 작은 서버)
//   - G.checkData() 경고 없음, 장면마다 활동·마음·물건, 처음 만나는 여덟 장면에 구슬 하나씩, 채점 일지 짝의 근거, 해석 3~4개
//   - 선생님용 단추 없이 0장 → 결과 화면 완주(휴대폰·처음 읽기 + 해석 한 번 고치기, 데스크톱·다시 읽기). 걸음마다 原文 낙관이 없는지
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TEXTBOOK = 'E:/github/고전 문학 게임/구운몽/design/source/교과서_본문추출.txt';
const issues = [];
const log = (...a) => console.log(...a);
const ok = (cond, where, msg) => { if (!cond) { issues.push(`${where}: ${msg}`); log('  ✗', `${where}: ${msg}`); } return !!cond; };

// ───────── 기획서 §17·§18의 이름(그림·소리를 만드는 작업이 이 이름을 따른다)
const SC = ['sc_josin_dream', 'sc_josin_wake', 'sc_bridge', 'sc_cell', 'sc_exile', 'sc_hell', 'sc_rebirth', 'sc_huayin', 'sc_namjeon', 'sc_tianjin', 'sc_geomungo', 'sc_chunun', 'sc_hebei', 'sc_handan', 'sc_tungso', 'sc_bongnae', 'sc_wonsu', 'sc_yoyeon', 'sc_neungpa', 'sc_seungsang', 'sc_honrye', 'sc_c3_feast', 'sc_c3_monk', 'sc_c3_awake', 'sc_c4_journal', 'sc_c5_dialogue', 'sc_c5_ordination'];
const FACES = {
  seongjin: ['troubled', 'awake'], yuk: ['stern', 'smile'], yang: ['smile', 'shock', 'disguise'], hoseung: ['laugh'], josin: ['aged'],
  dosa: ['smile'], yeomra: ['stern'], jeong13: ['laugh'], chae: ['shy', 'tears'], seomwol: ['smile', 'sly'], gyeongpae: ['blush', 'sly'],
  chunun: ['ghost', 'giggle'], gyeonghong: ['disguise', 'smile'], nanyang: ['smile'], yoyeon: ['blade', 'smile'], neungpa: ['sad', 'smile'],
};
const BONDS8 = ['chae', 'seomwol', 'gyeongpae', 'chunun', 'gyeonghong', 'nanyang', 'yoyeon', 'neungpa'];
for (const b of BONDS8) FACES['fairy_' + b] = [];
const NOFACE = ['jeongsado', 'dusa', 'taehu', 'hwangje', 'wolwang', 'yeonwang', 'yongwang', 'hwanggeon', 'jijang', 'yumo', 'seodong'];
const ITEMS = { 'it-yangryu': 'item_yangryu', 'it-geomungo': 'item_geomungo', 'it-sijeon': 'item_sijeon', 'it-yeogwan': 'item_yeogwan', 'it-bujeok': 'item_bujeok', 'it-bujeol': 'item_bujeol', 'it-cheonrima': 'item_cheonrima', 'it-tungso': 'item_tungso', 'it-mungbang': 'item_mungbang', 'it-chammageom': 'item_chammageom', 'it-bisu': 'item_bisu', 'it-mulbyeong': 'item_mulbyeong', 'it-hasa': 'item_hasa', 'it-girinpo': 'item_girinpo' };
const HOUSE = ['house_inn', 'house_byeoldang', 'house_seungsang', 'house_chwimi'];
const BGM = ['calm', 'josin', 'lotus', 'hell', 'spring', 'mountain', 'feast', 'geomungo', 'prank', 'march', 'tungso', 'palace', 'night', 'water', 'dream', 'chwimi', 'awake', 'reflect'];
// 출판사·유통사 이름(이 파일에도 그대로 쓰지 않으려고 나누어 적는다)과 임시 데이터 표시
const FORBIDDEN = ['지학' + '사', '티솔' + '루션', 'T' + 'solution', '(임시)', 'TODO'];

// ───────── 1. 정적 점검: 데이터 파일을 node에서 읽는다
log('▶ 데이터 파일');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const FILES = ['people', 'chapters', 'board', 'scenes', 'wishes', 'bonds', 'house', 'journal', 'interp', 'notes'];
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of FILES) {
  const p = path.join(DATA_DIR, f + '.js');
  if (!ok(fs.existsSync(p), 'files', f + '.js가 없음')) continue;
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: p }); } catch (e) { ok(false, 'files', f + '.js를 읽다 오류: ' + e.message); }
}
const D = sandbox.window.GUUN || {};

// 모든 글과 그 자리를 모은다(getter도 읽는다)
const strings = [];
const objs = [];
(function walk(v, at) {
  if (typeof v === 'string') { strings.push({ at, s: v }); return; }
  if (!v || typeof v !== 'object') return;
  objs.push({ at, o: v });
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, at + '[' + i + ']'));
  else for (const k of Object.keys(v)) walk(v[k], at + '.' + k);
})(D, 'GUUN');

// 原文: 대조 전이므로 orig가 하나도 없어야 한다
const origs = objs.filter((x) => !Array.isArray(x.o) && Object.prototype.hasOwnProperty.call(x.o, 'orig'));
ok(origs.length === 0, 'orig', '대조 전인 글에 orig(原文)가 있음: ' + origs.map((x) => x.at).slice(0, 5).join(', '));
for (const sc of D.scenes || []) {
  const a = sc.activity;
  if (a && a.passage) ok(a.passageKind === 'gloss', 'orig', sc.id + ': 활동 글이 풀이 바탕(passageKind: gloss)이 아니면 原文 낙관이 붙음');
  for (const hd of [].concat(sc.heading || [])) {
    ok(hd.status === '대조 대기' && !hd.orig && hd.gloss && hd.hoe >= 1 && hd.hoe <= 16, 'orig', sc.id + ': 회목은 풀이만, 대조 대기 표시로 둔다');
  }
}
ok(!(D.interp && D.interp.lastWords && D.interp.lastWords.orig), 'orig', '대사의 대답에 orig가 있음(대조 대기)');
ok(!(D.journal && D.journal.bondLink && D.journal.bondLink.evidence), 'orig', '인연 잇기의 evidence는 엔진이 原文 낙관으로 그림 — 대조 전에는 reveal(풀이)로 둔다');

// 그림·소리 이름
const usedSC = new Set();
for (const sc of D.scenes || []) {
  for (const k of ['img', 'imgAfter', 'roomImg']) if (sc[k]) { ok(SC.includes(sc[k]), 'asset', sc.id + '.' + k + ' = ' + sc[k] + ' (기획서 §17-2에 없는 이름)'); usedSC.add(sc[k]); }
  if (sc.bgm) ok(BGM.includes(sc.bgm), 'asset', sc.id + '.bgm = ' + sc.bgm + ' (기획서 §18에 없는 곡)');
  if (sc.item) ok(ITEMS[sc.item.id] && ITEMS[sc.item.id] === sc.item.img, 'asset', sc.id + ': 물건 ' + sc.item.id + '의 그림 이름 ' + sc.item.img + '가 §17-6과 다름');
}
for (const n of SC) ok(usedSC.has(n), 'asset', '§17-2의 장면 그림 ' + n + '을(를) 쓰는 장면이 없음');
ok(Object.keys(ITEMS).every((id) => (D.scenes || []).some((s) => s.item && s.item.id === id)), 'asset', '§17-6의 물건 14개가 모두 장면에 있지 않음');
for (const [ch, c] of Object.entries(D.chapters || {})) if (c.bgm) ok(BGM.includes(c.bgm), 'asset', ch + '장 bgm = ' + c.bgm);
for (const st of (D.house || {}).stages || []) ok(HOUSE.includes(st.img), 'asset', '집 단계 ' + st.id + '의 그림 ' + st.img);
for (const [id, p] of Object.entries(D.people || {})) {
  if (p.noFace) { ok(NOFACE.includes(id), 'asset', '얼굴 없는 인물 목록에 없는 ' + id); continue; }
  ok(FACES[p.face] !== undefined, 'asset', '인물 ' + id + '의 얼굴 ' + p.face + '가 §17-3에 없음');
  for (const m of p.moods || []) ok((FACES[p.face] || []).includes(m), 'asset', '인물 ' + id + '의 표정 ' + m + '가 §17-3에 없음');
}
for (const f of Object.keys(FACES)) ok(Object.values(D.people || {}).some((p) => p.face === f), 'asset', '§17-3의 얼굴 ' + f + '을(를) 가진 인물이 없음');
for (const b of D.bonds || []) {
  ok(FACES[b.face] !== undefined, 'asset', '인연 ' + b.id + '의 얼굴');
  ok(b.fairyFace === 'fairy_' + b.id, 'asset', '인연 ' + b.id + '의 선녀 얼굴은 fairy_' + b.id);
}
// 얼굴이 나오는 표기: say와 {호칭|id}
const faceOK = (id, mood) => { const p = (D.people || {})[id]; return !!p && !p.noFace && (!mood || (p.moods || []).includes(mood)); };
(function walkSay(v, at) {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { v.forEach((x, i) => walkSay(x, at + '[' + i + ']')); return; }
  if (v.say) ok(faceOK(v.say, v.mood), 'face', at + ': say ' + v.say + (v.mood ? '_' + v.mood : '') + '는 얼굴(표정) 그림이 있는 인물이 아님');
  for (const k of Object.keys(v)) walkSay(v[k], at + '.' + k);
})(D, 'GUUN');
for (const { at, s } of strings) for (const m of s.matchAll(/\{([^}|]+)\|([\w-]+)\}/g)) ok(faceOK(m[2]), 'face', at + ': {' + m[1] + '|' + m[2] + '}는 얼굴이 있는 인물만');

// 쓰면 안 되는 낱말(데이터와 데이터 약속 문서)
for (const f of [...FILES.map((n) => path.join(DATA_DIR, n + '.js')), path.join(DATA_DIR, 'README.md')]) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, 'utf8');
  for (const w of FORBIDDEN) ok(!t.includes(w), 'words', path.basename(f) + '에 쓰면 안 되는 낱말: ' + w);
}

// 교과서 본문 추출본과 15자 이상 겹치는 글(공백·문장부호를 뺀 글자로 잰다)
const N = 15;
const norm = (s) => String(s).replace(/\*\*/g, '').replace(/\{([^}|]+)\|[\w-]+\}/g, '$1').replace(/\[\[[\w-]+\]\]/g, '').replace(/[\s.,!?'"“”‘’·…\-—–()\[\]{}「」『』《》〈〉:;~|\/\\]/g, '');
if (fs.existsSync(TEXTBOOK)) {
  const tb = norm(fs.readFileSync(TEXTBOOK, 'utf8'));
  const grams = new Set();
  for (let i = 0; i + N <= tb.length; i++) grams.add(tb.slice(i, i + N));
  let hits = 0;
  for (const { at, s } of strings) {
    const t = norm(s);
    for (let i = 0; i + N <= t.length; i++) {
      if (grams.has(t.slice(i, i + N))) { hits++; ok(false, 'overlap', at + ' — 교과서 본문과 ' + N + '자 이상 겹침: "' + t.slice(i, i + N) + '"'); break; }
    }
  }
  log('  교과서 본문 추출본 ' + tb.length + '자와 견줌 · 겹친 글 ' + hits + '개');
} else log('  교과서 본문 추출본이 이 기기에 없어 겹침 점검을 건너뜀');

// 규칙(정적)
const scenes = D.scenes || [];
const dream = scenes.filter((s) => s.ch === '2');
ok(dream.length === 14, 'rules', '꿈 장면이 14개가 아님: ' + dream.length);
for (const s of dream) {
  ok(s.activity && s.activity.slots && s.activity.slots.length, 'rules', s.id + ': 읽기 활동이 없음');
  ok(s.mind && (s.mind.options || []).length >= 2, 'rules', s.id + ': 마음 고르기 선택지가 없음');
  ok(s.item && s.item.id, 'rules', s.id + ': 집에 놓을 물건이 없음');
  ok((D.board || []).some((q) => q.id === s.square && q.scene === s.id), 'rules', s.id + ': 말판 칸과 이어지지 않음');
  for (const o of (s.mind || {}).options || []) ok(o.evidence, 'rules', s.id + ': 마음 ' + o.id + '에 원문 근거가 없음');
}
for (const s of scenes.filter((x) => ['0', '1', '3'].includes(x.ch) && (x.kind || 'scene') === 'scene' && x.id !== 'c1-bridge')) {
  ok(s.activity, 'rules', s.id + ': 읽기 활동이 없음');
}
const meets = scenes.filter((s) => s.meet);
ok(meets.length === 8 && new Set(meets.map((s) => s.meet)).size === 8 && BONDS8.every((b) => meets.some((s) => s.meet === b)), 'pearl', '여덟 인연을 처음 만나는 장면이 여덟이 아님');
for (const s of meets) ok(s.pearl && typeof s.pearl.x === 'number' && typeof s.pearl.y === 'number', 'pearl', s.id + ': 처음 만나는 장면에 구슬이 없음');
ok(scenes.filter((s) => s.pearl).length === 8, 'pearl', '구슬은 처음 만나는 여덟 장면에만, 하나씩');
const canon = meets.filter((s) => s.pearl && s.pearl.trace === 'canon').map((s) => s.meet).sort();
ok(JSON.stringify(canon) === JSON.stringify(['gyeongpae', 'nanyang']), 'pearl', '원작 근거가 있는 구슬은 정경패·난양공주 둘뿐이어야 함: ' + canon);
ok(meets.filter((s) => s.pearl && s.pearl.trace === 'fiction').length === 6, 'pearl', '나머지 여섯 구슬은 게임 설정(trace: fiction)');
// 소원 채움(출장입상은 'chuljang.chul'처럼 점 표기로 반 칸씩 — 소원 id만 떼어 본다)
const fillsOf = (ids) => [].concat(ids || []).map((w) => String(w).split('.')[0]);
const allFills = [...scenes.flatMap((s) => [...fillsOf(s.fills).map((w) => [s.id, w]), ...fillsOf(s.item && s.item.fills).map((w) => [s.item.id, w])]), ...(D.board || []).flatMap((q) => fillsOf(q.fills).map((w) => [q.id, w]))];
ok(!allFills.some(([, w]) => w === 'misaek'), 'wish', '미색을 채우는 것이 있음');
const music = new Set(['it-geomungo', 'it-tungso', 's04-geomungo', 's12-neungpa']);
ok(allFills.filter(([, w]) => w === 'pungryu').every(([src]) => music.has(src)), 'wish', '풍류는 음악·악기로만 채운다: ' + allFills.filter(([, w]) => w === 'pungryu').map(([s]) => s));
ok((D.bonds || []).every((b) => !b.fills && !b.wish), 'wish', '인연이 소원을 채움');
// 일지·해석
for (const p of (D.journal || {}).pairs || []) {
  if (p.scored !== false) ok(p.evidence && p.wish, 'journal', p.id + ': 채점하는 짝에 근거가 없음');
  ok(!BONDS8.includes(p.event), 'journal', p.id + ': 인연을 소원 칸에 넣음');
}
ok(((D.journal || {}).pairs || []).filter((p) => p.scored !== false).length === 5, 'journal', '채점하는 일지 짝은 다섯');
const I = D.interp || {};
ok((I.options || []).length >= 3 && (I.options || []).length <= 4, 'interp', '해석 선택지는 3~4개');
const evIds = new Set((I.evidence || []).map((e) => e.id));
ok(evIds.size >= 3 && (I.evidence || []).every((e) => e.text), 'interp', '근거 구절 후보가 모자람');
for (const o of I.options || []) ok((o.fits || []).length && o.fits.every((e) => evIds.has(e)), 'interp', o.id + ': 어울리는 근거 후보가 없음');
// 엔진이 after를 스스로 거르므로 데이터는 after 표시가 붙은 맨 배열이다(읽는 때에 따라 바뀌는 getter 없음)
const evDesc = Object.getOwnPropertyDescriptor(I, 'evidence') || {};
ok(Array.isArray(evDesc.value) && !evDesc.get && !I.allEvidence, 'interp', 'interp.evidence가 after 표시를 단 맨 배열이 아님(getter·allEvidence 임시 장치가 남음)');
ok(JSON.stringify((I.evidence || []).filter((e) => e.after).map((e) => e.id)) === '["E8","E9","E10"]', 'interp', '대사의 대답 뒤에만 보일 근거(after)는 E8~E10');

// ───────── 기획서가 더한 항목(README 17절)
// 출장입상의 두 칸: 장수는 정서대원수, 재상은 대승상 칸이 반씩 채운다(점 표기, part 항목 없음)
const sqOf = (id) => (D.board || []).find((q) => q.id === id) || {};
ok((sqOf('sq-wonsu').fills || []).includes('chuljang.chul') && (sqOf('sq-seungsang').fills || []).includes('chuljang.ip'), 'wish', '출장입상은 sq-wonsu(chuljang.chul)·sq-seungsang(chuljang.ip)이 반씩 채운다');
ok(!(D.board || []).some((q) => q.part), 'wish', '말판 칸의 part는 fills의 점 표기로 합친다');
ok(JSON.stringify(((D.wishes || []).find((w) => w.id === 'chuljang') || {}).parts) === JSON.stringify([{ id: 'chul', name: '장수' }, { id: 'ip', name: '재상' }]), 'wish', '출장입상의 parts가 장수·재상 두 칸이 아님');
// 다시 만남 여러 명
const scOf = (id) => scenes.find((s) => s.id === id) || {};
const remeetIds = (id) => [].concat(scOf(id).remeet || []).map((r) => r.bond);
ok(Array.isArray(scOf('s13-seungsang').remeet) && ['gyeongpae', 'nanyang'].every((b) => remeetIds('s13-seungsang').includes(b)), 'bond', 's13의 remeet는 정경패·난양공주 두 사람의 배열');
ok(Array.isArray(scOf('s14-honrye').remeet) && remeetIds('s14-honrye').includes('chae') && remeetIds('s14-honrye').length >= 2, 'bond', 's14의 remeet는 진채봉을 포함한 여러 사람의 배열');
for (const s of scenes) for (const r of [].concat(s.remeet || [])) ok(BONDS8.includes(r.bond) && r.story && !r.fills, 'bond', s.id + ': 다시 만남 ' + r.bond + '의 모양');
// 꿈 일지: 다시 읽기에서 더하는 칩, '어느 칸도 아님' 짝
ok(((D.journal || {}).extra || []).includes('학문(어려서 성현의 글을 읽음)'), 'journal', '다시 읽기 더함 칩 \'학문\'(기획서 §13-1)이 journal.extra에 없음');
ok((((D.journal || {}).pairs) || []).some((p) => p.id === 'h-prison' && p.wish === null && p.scored === false), 'journal', 'h-prison은 어느 소원과도 잇지 않는 해석 짝');
// 화면 문구를 엔진에서 노트 데이터로: 빈 선방의 글(향로의 불은 꺼졌다)과 구슬 찾기의 게임 설정 카드
const NU = (D.notes || {}).ui || {};
ok(NU.zenCaption && /꺼/.test(NU.zenCaption) && !/식지 않/.test(NU.zenCaption), 'notes', 'notes.ui.zenCaption: 원작대로 향로의 불이 꺼진 선방이어야 함');
ok(NU.pearlFiction && NU.pearlFiction.id && NU.pearlFiction.body && NU.pearlFiction.real, 'notes', 'notes.ui.pearlFiction(구슬 찾기 게임 설정 카드)이 없음');
ok(NU.pearlCanon && NU.pearlCanon.title, 'notes', 'notes.ui.pearlCanon(원작 근거 구슬의 알아 두기 제목)이 없음');
const GAME_DIR = path.join(ROOT, 'js', 'game');
const src = (f) => fs.readFileSync(path.join(GAME_DIR, f), 'utf8');
ok(!/식지 않았/.test(src('wake.js')), 'notes', 'wake.js에 원작과 어긋난 선방 문구가 남음');
ok(!/구슬 찾기는 게임 장치예요/.test(src('pearl.js')), 'notes', 'pearl.js에 구슬 게임 설정 문구가 박혀 있음(notes 데이터로 옮긴다)');
ok((D.notes || {}).teacher && D.notes.teacher.extra && D.notes.teacher.ledger, 'notes', '교사용 안내 덧붙임(extra·ledger)이 없음');
// README 17절: 이번에 엔진이 읽게 된 항목은 '엔진 대기'가 남지 않는다(13번 해석 선택지의 어울리는 근거 표시만 남음)
{
  const md = fs.readFileSync(path.join(DATA_DIR, 'README.md'), 'utf8');
  const sec = md.slice(md.indexOf('## 17.'), md.indexOf('## 18.'));
  const waiting = sec.split('\n').filter((l) => /^\| \d+ \|/.test(l) && /엔진 대기/.test(l)).map((l) => l.split('|')[1].trim());
  ok(JSON.stringify(waiting) === '["13"]', 'readme', 'README 17절에서 아직 \'엔진 대기\'인 항목: ' + waiting.join(', '));
}
// 조사 두 꼴을 함께 찍지 않는다: 엔진·데이터 글에 '을(를)'·'(을)를'·'이(가)'·'은(는)'·'와(과)'가 없어야 한다(G.util.josa로 고른다).
// 단, 읽기 활동의 빈칸([[칸]]) 바로 뒤는 낱말이 정해지지 않았으니 두 꼴을 둔다(시험지 표기)
{
  const JOSA2 = /([을이은와])\(([를가는과])\)|\(([을이은와])\)([를가는과])/g;
  const PAIRS = new Set(['을를', '이가', '은는', '와과']);
  const jsFiles = ['core', 'game', 'data'].flatMap((d) => fs.readdirSync(path.join(ROOT, 'js', d)).filter((f) => f.endsWith('.js')).map((f) => path.join(ROOT, 'js', d, f)));
  for (const f of jsFiles) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(JOSA2)) {
      if (!PAIRS.has((m[1] || m[3]) + (m[2] || m[4]))) continue;
      if (/\]\]$/.test(t.slice(Math.max(0, m.index - 2), m.index))) continue; // 빈칸 뒤
      const line = t.slice(0, m.index).split('\n').length;
      ok(false, 'josa', path.relative(ROOT, f).replace(/\\/g, '/') + ':' + line + ' 조사 두 꼴을 함께 찍음: ' + m[0]);
    }
  }
}

// ───────── 2. 화면 점검: 실제 데이터로 크롬에서
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const BASE = `${ORIGIN}/index.html`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// 그림·소리는 모두 있어야 한다(완주 중 /assets/ 404는 실패). 글꼴만 글꼴 작업(T9)이 아직 만들지 않았다
const ALLOW_MISSING = /(?!)/; // 글꼴 파일이 생겨 봐주는 404가 없다
async function newPage(name, opt = {}) {
  const ctx = await browser.newContext({ viewport: opt.viewport || { width: 390, height: 844 }, isMobile: opt.mobile !== false, hasTouch: opt.mobile !== false, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  page.errs = []; page.reqs = []; page.tag = name;
  page.on('pageerror', (e) => page.errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() || {}).url || '';
    if (/Failed to load resource/.test(m.text()) && (ALLOW_MISSING.test(url) || !url)) return;
    page.errs.push('console: ' + m.text() + ' @' + url);
  });
  page.on('response', (r) => { if (r.status() >= 400 && !ALLOW_MISSING.test(r.url())) page.errs.push('http ' + r.status() + ': ' + r.url()); });
  page.on('request', (r) => page.reqs.push(r.url()));
  if (opt.toasts) await watchToasts(page);
  return page;
}
// 알림(.toast)이 뜰 때마다(뜬 직후와 0.5초 뒤) 읽는 글 칸(.main-inner 가운데 위 막대 아래로 보이는 부분)과 진행 단추에 겹치는지 잰다.
// 새로 고침·주소 이동을 지나도 page.toasts에 모인다
async function watchToasts(page) {
  page.toasts = [];
  await page.exposeFunction('__toastSeen', (r) => page.toasts.push(r));
  await page.addInitScript(() => {
    const hit = (a, b) => a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const measure = (el, when) => {
      if (!el.isConnected) return;
      const t = el.getBoundingClientRect();
      const bar = document.querySelector('.topbar');
      const top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
      const hits = [];
      const col = document.querySelector('.main-inner');
      if (col) {
        const c = col.getBoundingClientRect();
        const vis = { left: c.left, right: c.right, top: Math.max(c.top, top), bottom: Math.min(c.bottom, innerHeight) };
        vis.width = vis.right - vis.left; vis.height = vis.bottom - vis.top;
        if (hit(t, vis)) hits.push('본문 칸');
      }
      for (const b of document.querySelectorAll('#tray .btn, .btn.primary')) if (b.offsetParent && hit(t, b.getBoundingClientRect())) hits.push('단추 「' + b.textContent.trim() + '」');
      const play = document.querySelector('.play');
      window.__toastSeen({ text: el.textContent, when, rect: [t.left, t.top, t.width, t.height].map(Math.round), hits, scene: play ? play.dataset.scene : 'title', vw: innerWidth });
    };
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || !n.classList.contains('toast')) continue;
        requestAnimationFrame(() => measure(n, '뜬 직후'));
        setTimeout(() => measure(n, '0.5초 뒤'), 500);
      }
    }).observe(document, { childList: true, subtree: true });
  });
}
// 보이는 도트 그림이 기기 픽셀 기준 정수배인지(check-assets.mjs와 같은 잣대)
async function integerCheck(page, where) {
  const bad = await page.evaluate(() => {
    const dpr = window.devicePixelRatio || 1;
    const out = [];
    for (const img of document.querySelectorAll('img.pix')) {
      if (!img.naturalWidth || img.classList.contains('missing') || !img.offsetParent || !img.offsetWidth) continue;
      const cs = getComputedStyle(img);
      const r = (parseFloat(cs.width) * dpr) / img.naturalWidth;
      const rh = (parseFloat(cs.height) * dpr) / img.naturalHeight;
      const good = (x) => (x >= 1 ? Math.abs(x - Math.round(x)) < 0.02 : Math.abs(1 / x - Math.round(1 / x)) < 0.02);
      if (!good(r) || !good(rh) || Math.abs(r - rh) > 0.02) out.push(img.getAttribute('src').replace(/^.*assets\//, '') + ' ×' + r.toFixed(3) + '/' + rh.toFixed(3));
    }
    return out;
  });
  ok(bad.length === 0, where, '정수배가 아닌 도트 그림: ' + bad.slice(0, 6).join(', '));
}
// 흐린 글씨(.muted 등)가 바탕과 명암비 4.5 이상인지(바탕이 그림인 곳은 건너뜀)
async function contrastCheck(page, where) {
  const bad = await page.evaluate(() => {
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const out = [];
    for (const e of document.querySelectorAll('.muted, .topbar .where small, .sq .sq-kind, .unscored, .credit')) {
      if (!e.offsetParent || !e.textContent.trim()) continue;
      let bg = null, faded = false;
      for (let n = e; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (+cs.opacity < 1) faded = true;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') break;
        const c = rgb(cs.backgroundColor);
        if (c.length >= 3 && (c.length < 4 || c[3] > 0.9)) { bg = c; break; }
      }
      if (!bg || faded) continue;
      const L1 = lum(rgb(getComputedStyle(e).color)), L2 = lum(bg);
      const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (r < 4.5) out.push('「' + e.textContent.trim().slice(0, 14) + '」 ' + r.toFixed(2));
    }
    return out;
  });
  ok(bad.length === 0, where, '명암비가 4.5보다 낮은 흐린 글씨: ' + bad.slice(0, 4).join(', '));
}
// 글이 옆으로 넘쳐 잘리거나 화면 밖으로 나가는지(가로 스크롤)
async function overflowCheck(page, where) {
  const r = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('가로 스크롤 ' + document.documentElement.scrollWidth + '>' + innerWidth);
    for (const e of document.querySelectorAll('.main-inner *, .topbar .where, .tray .btn')) {
      if (!e.offsetParent || e.closest('.board-art, .house-art, .scene-img, .pearl-spot')) continue;
      const cs = getComputedStyle(e);
      if (cs.overflowX === 'visible' && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !/^(IMG|svg|INPUT|TABLE)$/i.test(e.tagName) && !e.closest('table, .ledger')) {
        const r1 = e.getBoundingClientRect();
        if (r1.right > innerWidth + 1) out.push((e.className || e.tagName) + ' 오른쪽이 화면 밖(' + Math.round(r1.right) + ')');
      }
    }
    return out.slice(0, 4);
  });
  ok(r.length === 0, where, '넘친 글: ' + r.join(', '));
}
const W = (page, ms = 150) => page.waitForTimeout(ms);
const cur = (page) => page.evaluate(() => (window.G && G.app && G.app.current ? G.app.current() : null));
const vbtn = (page, label) => page.locator('button:visible', { hasText: label });
async function ready(page) { await page.waitForFunction(() => window.G && G.app && G.app.booted === true, null, { timeout: 8000 }); }
async function finish(page) {
  ok(page.errs.length === 0, page.tag, '오류: ' + page.errs.slice(0, 5).join(' | '));
  const outside = page.reqs.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  ok(outside.length === 0, page.tag, '바깥으로 나간 요청: ' + outside.slice(0, 3).join(', '));
  await page.context().close();
}
// ONLY=휴대폰 node check-content.mjs 처럼 이름 일부를 주면 그 화면 점검만 돌린다(고치는 동안 빨리 보려고. 정적 점검은 늘 돈다)
async function run(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  log('▶', name);
  try { await fn(); } catch (e) { ok(false, name, '예외: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' / ') : e)); }
}

// 지금 장면(또는 꿈 일지)의 활동을 맞게 채운다(채점하지 않는 활동은 아무것이나)
async function fill(page) {
  const plan = await page.evaluate(() => {
    const a = G.app.current().data.activity;
    const choices = [...document.querySelectorAll('.activity:not(.solved) .choice')].map((b) => b.dataset.choice);
    const used = new Set();
    return a.slots.map((s) => {
      const ans = [].concat(s.answer == null ? [] : s.answer);
      const pick = ans.length ? (a.reusable ? ans[0] : ans.find((x) => !used.has(x))) : choices.find((c) => !used.has(c));
      used.add(pick);
      return { slot: s.id, pick };
    });
  });
  for (const p of plan) {
    await page.locator(`.activity:not(.solved) .slot[data-slot="${p.slot}"]`).click();
    await page.locator(`.activity:not(.solved) .choice[data-choice="${p.pick.replace(/"/g, '\\"')}"]`).first().click();
  }
}
// 걸음마다: 原文 낙관이 화면에 있는지 본다(대조 전이라 하나도 없어야 한다)
async function sealCheck(page, where) {
  const n = await page.evaluate(() => [...document.querySelectorAll('.seal, .mark.orig')].filter((e) => /原文/.test(e.textContent)).length);
  return ok(n === 0, where, '대조 전인데 原文 낙관이 화면에 보임(' + n + '개)');
}

// 걸음마다 화면을 살펴 적어 둔다(README 17절 항목이 화면에 나오는지). 끝난 뒤 fullRun이 확인한다
async function observe(page, st, opt, memo) {
  const o = (memo.obs = memo.obs || { heading: {}, walks: [], imgs: {}, pearls: {}, bonds: {} });
  // 회목 카드(대조 대기: 原文 낙관 없이 풀이만)
  if (st.step && st.step !== 'chapter' && st.step !== 'walk' && !(st.scene in o.heading)) {
    o.heading[st.scene] = await page.evaluate(() => [...document.querySelectorAll('.scene-head .hoe-card')].map((e) => e.innerText));
  }
  // 말 걷기: 다 걸은 뒤(다음 단추가 있을 때) 말의 칸·옷·교지 카드·회목 카드·소원 상태
  if (st.step === 'walk' && st.next) {
    const w = await page.evaluate(() => {
      const v = document.querySelector('.walk-blk .board-view');
      const p = v && v.querySelector('.piece');
      const g = document.querySelector('.walk-blk .gyoji-card');
      const ch = G.app.wishes().find((x) => x.id === 'chuljang') || {};
      return {
        scene: document.querySelector('.play').dataset.scene, at: p && p.dataset.at, from: p && p.dataset.from, outfit: p ? p.dataset.outfit || '' : null,
        gyoji: g ? g.innerText : null, hoe: [...document.querySelectorAll('.walk-blk .hoe-card')].map((e) => e.innerText).join(' / '),
        chul: { filled: ch.filled, half: ch.half }, halfDom: !!document.querySelector('.walk-blk .wish-list [data-wish="chuljang"].half'),
      };
    });
    if (!o.walks.length || o.walks[o.walks.length - 1].at !== w.at) o.walks.push(w);
  }
  // 장면 뒤 그림: 활동을 마친 뒤 그림이 바뀐다
  if ((st.scene === 'c0-josin' || st.scene === 'c1-rebirth') && st.step === 'activity' && st.next) {
    o.imgs[st.scene] = await page.evaluate(() => { const i = document.querySelector('.scene-head .scene-img img'); return i ? i.getAttribute('src') : null; });
  }
  // 숨은 구슬: 원작 근거 구슬은 알아 두기, 나머지는 게임 설정 카드
  if (st.step === 'pearl' && !(st.scene in o.pearls)) {
    o.pearls[st.scene] = await page.evaluate(() => ({ fic: document.querySelectorAll('.pearl-blk .mark.fiction').length, note: document.querySelectorAll('.pearl-blk .mark.note').length, text: (document.querySelector('.pearl-blk') || {}).innerText || '' }));
  }
  // 인연첩: 한 장면에서 여러 사람을 다시 만난다
  if (st.step === 'bond' && !(st.scene in o.bonds)) {
    o.bonds[st.scene] = await page.evaluate(() => [...document.querySelectorAll('section.bond .bond-card')].map((c) => c.dataset.bond));
  }
  // 꿈 일지: '어느 칸도 아님'과 다시 읽기의 더함 칩
  if (st.scene === 'c4-journal' && st.step === 'activity' && st.unsolved && !o.journal) {
    o.journal = await page.evaluate(() => ({
      none: !!document.querySelector('.interp-pair[data-pair="h-prison"] .ip-opt[data-wish="none"]'),
      extra: !!document.querySelector('.activity .choice[data-choice="학문(어려서 성현의 글을 읽음)"]'),
    }));
    if (o.journal.none) { await page.locator('.interp-pair[data-pair="h-prison"] .ip-opt[data-wish="none"]').click(); await W(page, 60); }
    o.journal.picked = await page.evaluate(() => ((G.save.state.journal || {}).picks || {})['h-prison']);
  }
  // 인연 잇기: 미색이 드러난 뒤 근거(풀이)와 해석 카드
  if (st.step === 'journal-bond' && st.next && !o.reveal) {
    o.reveal = await page.evaluate(() => {
      const out = document.querySelector('.bond-link .link-out');
      return { gloss: out ? out.querySelectorAll('.pair.gloss-only').length : 0, interp: out ? out.querySelectorAll('.mark.interp').length : 0, text: out ? out.innerText : '' };
    });
  }
  // 빈 선방의 글
  if (st.step === 'awake' && !o.zen) o.zen = await page.evaluate(() => (document.querySelector('.zen-cap') || {}).innerText || '');
}

// 한 걸음 진행. 선생님용 단추는 쓰지 않는다. opt.pearls: 찾을 구슬 수, opt.revise: 해석 한 번 고치기
async function act(page, opt, memo) {
  const st = await page.evaluate(() => {
    const play = document.querySelector('.play');
    return {
      step: play && play.dataset.step,
      scene: play && play.dataset.scene,
      unsolved: !!document.querySelector('.activity:not(.solved)'),
      mind: !!document.querySelector('.mind-opt:not([disabled])'),
      staff: !!document.querySelector('[data-act="staff"]:not([disabled])'),
      must: !!document.querySelector('[data-must]:not([disabled])'),
      revise: !!document.querySelector('[data-act="revise"]:not([disabled])'),
      pearl: !!document.querySelector('.pearl-spot:not(.found):not([disabled])'),
      next: !!document.querySelector('#tray button[data-act="next"]'),
      sheet: !!document.querySelector('.sheet-back'),
      teacherUsed: false,
    };
  });
  if (st.sheet) throw new Error('예상하지 못한 시트가 떠 있음');
  if (st.step && memo.lastStep !== st.scene + '/' + st.step) { memo.lastStep = st.scene + '/' + st.step; memo.steps++; if (!(await sealCheck(page, 'seal ' + memo.lastStep))) memo.sealFail = true; }
  await observe(page, st, opt, memo);
  const ch = st.step ? await page.evaluate(() => document.querySelector('.play').dataset.ch) : null;
  // 장마다 대표 화면을 찍는다(tests/shots/, 사람이 보는 용도)
  if (opt.shots && st.step && SHOT_STEPS.includes(ch + '/' + st.step) && !(memo.shot = memo.shot || {})[ch + '/' + st.step]) {
    memo.shot[ch + '/' + st.step] = true;
    await W(page, 450);
    await integerCheck(page, opt.shots + ' ' + ch + '/' + st.step);
    await overflowCheck(page, opt.shots + ' ' + ch + '/' + st.step);
    await contrastCheck(page, opt.shots + ' ' + ch + '/' + st.step);
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `play_${opt.shots}_${ch}_${st.step}.png`) });
  }
  // 깨어난 뒤(4장 첫걸음): 뒤로 가기·새로 고침·목차·주소로 꿈(0~3장)에 못 돌아간다
  if (opt.lock && ch === '4' && !memo.lockDone) { memo.lockDone = true; await lockChecks(page, opt.name); return; }
  // 장면 중간(활동을 마친 뒤 마음 고르기)에 새로 고침 → 그 장면 처음부터
  if (opt.reload && !memo.reloaded && st.step === 'mind' && st.scene === memo.reloadAt) {
    memo.reloaded = true;
    const before = await page.evaluate(() => JSON.stringify(G.save.state.ledger));
    await page.reload(); await ready(page);
    await page.waitForSelector('.title-screen');
    await vbtn(page, '이어 하기').first().click();
    await page.waitForSelector('.play');
    const c = await cur(page);
    ok(c.scene === st.scene && (c.step === 'read' || c.step === 'chapter'), opt.name, '장면 중간에 새로 고침한 뒤 그 장면 처음부터가 아님: ' + JSON.stringify({ scene: c.scene, step: c.step }));
    memo.reloadLedger = before;
    return;
  }
  // 일부러 틀려 도움 사다리(틀린 칸 표시 → 여백 메모 → 정답 보기)를 본다. opt.wrong에 적은 장마다 한 번
  if (opt.wrong && st.step === 'activity' && st.unsolved && opt.wrong.includes(ch) && !(memo.wrongDone = memo.wrongDone || {})[ch]) {
    const id = await ladder(page, opt.name);
    if (id) { memo.wrongDone[ch] = true; (memo.wrongActs = memo.wrongActs || []).push(id); return; }
  }
  if (st.step === 'activity' && st.unsolved) { await fill(page); await page.locator('button[data-act="check"]').click(); await W(page, 80); return; }
  if (st.step === 'mind' && st.mind) { await page.locator('.mind-opt').first().click(); await W(page, 60); return; }
  if (st.step === 'pearl' && st.pearl && memo.pearls < (opt.pearls || 0)) { await page.locator('.pearl-spot').click(); memo.pearls++; await W(page, 80); return; }
  if (st.staff) { await page.locator('[data-act="staff"]').click(); await W(page, 80); return; }
  if (st.step === 'interp-pick' && st.must) {
    memo.firstEv = memo.firstEv || await page.locator('.interp-pick-box .ev-opt').count();
  }
  if (st.must) { await page.locator('[data-must]:not([disabled])').first().click(); await W(page, 60); return; }
  if (st.step === 'interp-revise' && st.revise && opt.revise && !memo.revised) {
    memo.revised = true;
    await page.locator('[data-act="revise"]').click(); await W(page, 120);
    const box = page.locator('.interp-revise .interp-pick-box').last();
    memo.reviseEv = await box.locator('.ev-opt').count();
    await box.locator('.interp-opt[data-opt="i-nondual"]').click();
    await box.locator('.ev-opt[data-ev="E9"]').click();
    await W(page, 80);
    return;
  }
  if (st.next) { await page.locator('#tray button[data-act="next"]').click(); await W(page, 60); return; }
  await W(page, 120);
}
const SHOTS = path.join(ROOT, 'tests', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
// 장마다 찍을 걸음(장/걸음)
const SHOT_STEPS = ['0/chapter', '0/read', '0/activity', '1/read', '1/activity', '2/walk', '2/read', '2/activity', '2/mind', '2/item', '2/pearl', '3/read', '3/strike', '3/awake',
  '4/journal-wishes', '4/activity', '4/journal-bond', '4/journal-pearls', '5/read', '5/interp-pick', '5/interp-revise', '5/ending', 'R/result'];

// 일부러 틀리기: 정답이 아닌 선택지(어느 칸의 정답도 아닌 것)를 첫 칸에 넣고 확인 → 틀린 칸 표시 → 여백 메모 → 정답 보기 → 확인.
// 채점하지 않거나 헷갈리는 선택지가 없는 활동이면 null(그냥 맞게 푼다)
async function ladder(page, where) {
  const plan = await page.evaluate(() => {
    const a = G.app.current().data.activity;
    if (!a || a.scored === false) return null;
    const choices = [...document.querySelectorAll('.activity:not(.solved) .choice')].map((b) => b.dataset.choice);
    const answers = new Set(a.slots.flatMap((s) => [].concat(s.answer == null ? [] : s.answer)));
    // 칸마다 다시 쓸 수 있는 선택지(꿈 일지 맞대기)면 첫 칸의 정답이 아닌 것, 아니면 어느 칸의 정답도 아닌 것
    const first = new Set([].concat(a.slots[0].answer == null ? [] : a.slots[0].answer));
    const decoy = a.reusable ? choices.find((c) => !first.has(c)) : choices.find((c) => !answers.has(c));
    if (!decoy) return null;
    const used = new Set(a.reusable ? [] : [decoy]);
    return { id: a.id, picks: a.slots.map((s, i) => {
      if (i === 0) return { slot: s.id, pick: decoy };
      const ans = [].concat(s.answer == null ? [] : s.answer);
      const pick = ans.length ? (a.reusable ? ans[0] : ans.find((x) => !used.has(x))) : choices.find((c) => !used.has(c));
      used.add(pick);
      return { slot: s.id, pick };
    }) };
  });
  if (!plan) return null;
  for (const p of plan.picks) {
    await page.locator(`.activity:not(.solved) .slot[data-slot="${p.slot}"]`).click();
    await page.locator(`.activity:not(.solved) .choice[data-choice="${p.pick.replace(/"/g, '\\"')}"]`).first().click();
  }
  ok(await page.locator('[data-help="memo"]:visible').count() === 0, where, plan.id + ': 틀리기 전에 여백 메모가 보임');
  await page.locator('button[data-act="check"]').click(); await W(page, 150);
  ok(await page.locator('.activity .slot.wrong').count() > 0, where, plan.id + ': 틀린 칸 표시가 없음');
  ok(await page.locator('[data-help="answer"]:visible').count() === 0, where, plan.id + ': 여백 메모 전에 정답 보기가 열림');
  if (!ok(await page.locator('[data-help="memo"]:visible').count() === 1, where, plan.id + ': 틀린 뒤 여백 메모 단추가 없음')) return plan.id;
  await page.locator('[data-help="memo"]:visible').click(); await W(page, 120);
  ok(await page.locator('.activity .memo:visible').count() > 0, where, plan.id + ': 여백 메모가 보이지 않음');
  if (!ok(await page.locator('[data-help="answer"]:visible').count() === 1, where, plan.id + ': 여백 메모 뒤 정답 보기가 열리지 않음')) return plan.id;
  await page.locator('[data-help="answer"]:visible').click(); await W(page, 120);
  await page.locator('button[data-act="check"]').click(); await W(page, 150);
  ok(await page.locator('.activity.solved').count() >= 1, where, plan.id + ': 정답 보기 뒤 확인했는데 끝나지 않음');
  return plan.id;
}

// 깨어난 뒤 잠금: 뒤로 가기·새로 고침·목차·주소 어느 것으로도 꿈(0~3장, 깨어난 선방 앞)을 열지 못한다
async function lockChecks(page, where) {
  const L = await page.evaluate(() => {
    const list = G.app.list();
    const wake = list.findIndex((s) => s.awakened);
    return { locked: list.slice(0, wake).map((s) => s.id), firstDream: list.find((s) => s.ch === '2').id, feast: list.find((s) => s.ch === '3').id };
  });
  const isDream = (c) => !c || L.locked.includes(c.scene) || ['0', '1', '2'].includes(c.ch);
  ok(L.locked.length > 20, where, '잠길 꿈 장면 목록이 이상함: ' + L.locked.length);
  ok(await page.evaluate((ids) => ids.every((id) => !G.app.canOpen(id)), L.locked), where, '깨어난 뒤에도 G.app.canOpen이 꿈 장면을 허락함');
  // 뒤로 가기
  for (let i = 0; i < 4; i++) { await page.evaluate(() => history.back()); await W(page, 300); }
  let c = await cur(page);
  ok(!isDream(c), where, '깨어난 뒤 뒤로 가기로 꿈이 열림: ' + JSON.stringify(c && { scene: c.scene, ch: c.ch }));
  // 새로 고침
  await page.reload(); await ready(page);
  await page.waitForSelector('.title-screen');
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  c = await cur(page);
  ok(c && c.ch === '4', where, '깨어난 뒤 새로 고침하고 이어 하니 4장이 아님: ' + JSON.stringify(c && { scene: c.scene, ch: c.ch }));
  // 목차
  await page.locator('[data-tool="toc"]').click(); await page.waitForSelector('.toc');
  for (const k of ['0', '1', '2']) ok(await page.locator(`.toc-ch[data-ch="${k}"].locked`).count() === 1, where, `목차에서 ${k}장이 잠기지 않음`);
  const open = await page.evaluate((ids) => ids.filter((id) => { const b = document.querySelector(`.toc-scene[data-scene="${id}"]`); return b && !b.disabled; }), L.locked);
  ok(open.length === 0, where, '목차에서 누를 수 있는 꿈 장면: ' + open.slice(0, 4).join(', '));
  await page.keyboard.press('Escape'); await W(page);
  // 주소
  for (const q of ['?ch=0', '?ch=1', '?ch=2', '?ch=3', '?scene=' + L.firstDream, '?scene=' + L.feast]) {
    await page.goto(BASE + q); await ready(page);
    c = await cur(page);
    ok(c && !isDream(c), where, `주소 ${q}로 꿈이 열림: ` + JSON.stringify(c && { scene: c.scene, ch: c.ch }));
  }
  await page.waitForSelector('.play');
}

async function playUntil(page, pred, opt, memo, limit = 900) {
  for (let i = 0; i < limit; i++) {
    const c = await cur(page);
    if (c && pred(c)) return c;
    await act(page, opt, memo);
  }
  throw new Error('playUntil: 도달하지 못함 ' + JSON.stringify(await cur(page)));
}

await run('데이터 점검(화면)', async () => {
  const page = await newPage('data');
  await page.goto(BASE);
  await ready(page);
  const r = await page.evaluate(() => ({
    ok: G.data.ok, fixture: G.data.fixture, problems: G.data.problems, missing: G.data.missing,
    re: G.checkData(G.data), scenes: G.data.scenes.length,
    dataMissingNote: !!document.querySelector('.data-missing'),
  }));
  ok(r.ok && !r.fixture, 'data', '실제 데이터를 읽지 못함');
  ok(r.problems.length === 0 && r.re.length === 0, 'data', 'G.checkData() 경고: ' + r.problems.concat(r.re).slice(0, 5).join(' | '));
  ok(r.missing.every((m) => /bgm\.js$/.test(m)), 'data', '읽지 못한 데이터 파일: ' + r.missing.join(', '));
  ok(!r.dataMissingNote, 'data', '타이틀에 데이터가 없다는 안내가 보임');
  log('  장면 ' + r.scenes + '개 · 읽지 못한 파일 ' + (r.missing.join(', ') || '없음'));
  // 조사 고르기: 마지막 한글 글자의 받침으로 고르고, 닫는 문장부호·따옴표·괄호는 건너뛴다. 두 꼴을 함께 내지 않는다
  const josa = await page.evaluate(() => {
    if (typeof G.util.josa !== 'function') return null;
    const J = G.util.josa;
    return [
      [J('사람', '을/를'), '을'], [J('나무', '을/를'), '를'], [J('「꿈은 가르침의 도구다.」', '을/를'), '를'],
      [J('보게 하셨구나)', '을/를'), '를'], [J('"달빛"', '이/가'), '이'], [J('거문고', '은/는'), '는'],
      [J('천리마', '은/는'), '는'], [J('비단 시전', '이/가'), '이'], [J('서울', '으로/로'), '로'], [J('집', '으로/로'), '으로'],
      [J('성진(性眞)', '와/과'), '과'], [J('나무', '과/와'), '와'], [J('3', '이/가'), '이'], [J('2', '을/를'), '를'],
    ].filter(([got, want]) => got !== want).map(([got, want]) => got + '≠' + want);
  });
  ok(josa !== null, 'josa', 'G.util.josa(조사 고르기)가 없음');
  ok(!josa || josa.length === 0, 'josa', '조사를 잘못 고름: ' + (josa || []).join(', '));
  await finish(page);
});

// 음원 출처 표시(명세 12·13절): 타이틀과 설정에 국립국악원 · 공공누리 제1유형 출처가 보이고, 퉁소 대신 단소를 썼다고 적혀 있다
// 효과음·배경음을 따로 켜고 끈다(효과음은 소리 마디를 새로 만드는지로 잰다)
await run('음원 출처와 소리 켜고 끄기', async () => {
  for (const [tag, viewport, mobile] of [['phone', { width: 390, height: 844 }, true], ['desktop', { width: 1280, height: 860 }, false]]) {
    const page = await newPage('credit-' + tag, { viewport, mobile });
    await page.addInitScript(() => {
      window.__nodes = 0;
      const P = (window.AudioContext || window.webkitAudioContext).prototype;
      for (const k of ['createOscillator', 'createBufferSource']) { const f = P[k]; P[k] = function (...a) { window.__nodes++; return f.apply(this, a); }; }
    });
    await page.goto(BASE);
    await ready(page);
    await page.waitForSelector('.title-screen');
    const seen = async (loc, where) => {
      if (!ok(await loc.count() === 1, where, '출처 문구가 없음')) return;
      await loc.scrollIntoViewIfNeeded();
      const v = await loc.evaluate((e) => {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const lum = (c) => { const [r1, g1, b1] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1; };
        let bg = 'rgb(239,227,198)';
        for (let n = e; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(.*,\s*0\)$|transparent/.test(b)) { bg = b; break; } }
        const L1 = lum(rgb(cs.color)), L2 = lum(rgb(bg));
        return { text: e.innerText, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && r.width > 0, fs: parseFloat(cs.fontSize), contrast: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05), hidden: cs.visibility === 'hidden' || +cs.opacity < 0.9 };
      });
      ok(v.inView && !v.hidden, where, '출처 문구가 화면에 보이지 않음');
      ok(/국립국악원/.test(v.text) && /공공누리\s*제1유형/.test(v.text), where, '국립국악원 · 공공누리 제1유형 출처가 없음: ' + v.text.slice(0, 80));
      ok(/퉁소/.test(v.text) && /단소/.test(v.text), where, '퉁소 대신 단소를 썼다는 표시가 없음: ' + v.text.slice(0, 120));
      ok(v.fs >= 11 && v.contrast >= 4.5, where, `출처 문구가 읽기 어려움(글자 ${v.fs}px, 명암비 ${v.contrast.toFixed(2)})`);
    };
    await seen(page.locator('.title-screen .credit', { hasText: '국립국악원' }), tag + '/타이틀');
    await vbtn(page, '설정').first().click();
    await page.waitForSelector('.settings');
    await seen(page.locator('.settings .credit-full'), tag + '/설정');
    await page.keyboard.press('Escape'); await W(page);
    if (tag === 'phone') {
      // 효과음 켜고 끄기(배경음은 꺼 두고 잰다)
      await vbtn(page, '시작하기').first().click();
      await page.waitForSelector('.sheet');
      await vbtn(page, '처음 읽기').first().click();
      await page.waitForSelector('.play');
      await W(page, 400);
      ok(await page.evaluate(() => !!G.audio.now()), 'sound', '배경음이 흐르지 않음');
      await page.locator('[data-tool="settings"]').click(); await page.waitForSelector('.settings');
      await page.locator('button[data-set="music"]').click(); await W(page, 400);
      ok(await page.evaluate(() => !G.audio.now()), 'sound', '배경음을 껐는데 곡이 흐름');
      const n0 = await page.evaluate(() => { const n = window.__nodes; G.audio.ok(); G.audio.pick(); return window.__nodes - n; });
      ok(n0 > 0, 'sound', '효과음이 켜져 있는데 소리를 내지 않음');
      await page.locator('button[data-set="sound"]').click(); await W(page);
      const n1 = await page.evaluate(() => { const n = window.__nodes; G.audio.ok(); G.audio.pick(); G.audio.tap(); return window.__nodes - n; });
      ok(n1 === 0, 'sound', '효과음을 껐는데 소리를 냄(' + n1 + ')');
      await page.locator('button[data-set="music"]').click(); await W(page, 400);
      ok(await page.evaluate(() => !!G.audio.now() && G.save.state.sound === false), 'sound', '배경음을 다시 켰는데 곡이 흐르지 않거나 효과음이 다시 켜짐');
      await page.keyboard.press('Escape'); await W(page);
    }
    await finish(page);
  }
});

// 파일로 열기(실제 데이터): index.html을 file://로 열어도 시작·저장(이어 하기)·소리가 된다
await run('파일로 열기(실제 데이터)', async () => {
  const page = await newPage('file-real');
  await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
  await ready(page);
  await page.waitForSelector('.title-screen');
  ok(await page.evaluate(() => G.data.ok && !G.data.fixture), 'file', '파일로 열었을 때 실제 데이터를 읽지 못함');
  await vbtn(page, '시작하기').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, '처음 읽기').first().click();
  await page.waitForSelector('.play');
  const memo = { steps: 0, pearls: 0, lastStep: '', sealFail: false };
  const second = await page.evaluate(() => G.app.list()[1].id);
  await playUntil(page, (c) => c.scene === second, {}, memo);
  await W(page, 800);
  const snd = await page.evaluate(() => ({ now: G.audio.now(), via: G.audio.via() }));
  ok(!!snd.now, 'file', '파일로 열었을 때 배경음(또는 합성 대체)이 흐르지 않음: ' + JSON.stringify(snd));
  await page.reload(); await ready(page);
  await vbtn(page, '이어 하기').first().click(); await page.waitForSelector('.play');
  ok((await cur(page)).scene === second, 'file', '파일로 열었을 때 저장·이어 하기가 안 됨');
  log('  파일로 열기: 곡 ' + snd.now + ' (' + snd.via + ')');
  ok(page.errs.length === 0, page.tag, '오류: ' + page.errs.slice(0, 5).join(' | '));
  const outside = page.reqs.filter((u) => !u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:'));
  ok(outside.length === 0, page.tag, '바깥으로 나간 요청: ' + outside.slice(0, 3).join(', '));
  await page.context().close();
});

async function fullRun(name, mode, opt) {
  await run(name, async () => {
    const page = await newPage(name, Object.assign({ toasts: true }, opt.page || {}));
    opt.name = name;
    await page.goto(BASE);
    await ready(page);
    await page.waitForSelector('.title-screen');
    if (opt.shots) { await W(page, 400); await integerCheck(page, opt.shots + ' title'); await page.screenshot({ path: path.join(SHOTS, `play_${opt.shots}_title.png`) }); }
    await vbtn(page, '시작하기').first().click();
    await page.waitForSelector('.sheet');
    await vbtn(page, mode).first().click();
    await page.waitForSelector('.play');
    const memo = { steps: 0, pearls: 0, lastStep: '', sealFail: false };
    // 장면 중간 새로 고침은 2장의 둘째 장면에서
    memo.reloadAt = await page.evaluate(() => G.app.list().filter((s) => s.ch === '2')[1].id);
    const t0 = Date.now();
    // 꿈 동안 미색은 '?'
    await playUntil(page, (c) => c.step === 'walk', opt, memo);
    await page.waitForSelector('.board-view .wish-list');
    ok((await page.locator('.board-view .wish-list [data-wish="misaek"]').innerText()).includes('?'), name, '꿈 동안 미색이 ?로 보이지 않음');
    // 2장을 지나면 미색을 뺀 네 소원이 모두 찬다
    await playUntil(page, (c) => c.scene === 'c3-monk', opt, memo);
    const w = await page.evaluate(() => G.app.wishes().map((x) => [x.id, x.filled, x.hidden]));
    ok(w.filter(([id]) => id !== 'misaek').every(([, f]) => f) && w.find(([id]) => id === 'misaek')[2], name, '취미궁에서 네 소원이 차고 미색은 가려져 있어야 함: ' + JSON.stringify(w));
    // 깨어남 → 꿈 일지 → 해석 → 결과
    await playUntil(page, (c) => c.ch === 'R', opt, memo);
    await page.waitForSelector('.journal-page');
    const res = await page.evaluate(() => {
      const s = G.save.state;
      return {
        awake: s.awake, revealed: !!(s.journal && s.journal.revealed && s.journal.revealed.misaek),
        rows: G.app.ledgerRows().length, teacher: G.app.ledgerRows().filter((r) => r.help === 'teacher').length,
        interp: s.interp, page: document.querySelector('.journal-page').innerText,
        hasLedger: !!document.querySelector('.ledger table'), notes: document.querySelectorAll('.notes').length,
        pearls: Object.keys(s.pearls).length,
      };
    });
    ok(res.awake, name, '깨어남이 기록되지 않음');
    ok(res.revealed, name, '꿈 일지에서 미색이 드러나지 않음');
    ok(res.rows === 22, name, '장부의 채점 활동이 22개가 아님: ' + res.rows);
    ok(res.teacher === 0, name, '선생님용 도움이 기록됨');
    ok(res.hasLedger && res.notes >= 3, name, '결과 화면에 장부·노트가 없음');
    ok(res.interp && res.interp.final && res.interp.first, name, '해석이 저장되지 않음');
    ok(/꿈 일지 마지막 장/.test(res.page) && /나의 해석/.test(res.page), name, '꿈 일지 마지막 장이 그려지지 않음');
    if (opt.revise) {
      ok(res.interp.revised && res.interp.changed && res.interp.changed.option === 'i-nondual' && res.interp.changed.evidence === 'E9', name, '해석을 고친 흔적이 남지 않음');
      ok(/고쳤어요/.test(res.page), name, '결과 화면에 고친 흔적이 보이지 않음');
      ok(memo.firstEv === 7 && memo.reviseEv === 10, name, '근거 구절: 대사의 말 전 7개, 고칠 때 10개여야 함(지금 ' + memo.firstEv + ' / ' + memo.reviseEv + ')');
    }
    ok(res.pearls === (opt.pearls || 0), name, '찾은 구슬 수가 다름: ' + res.pearls);
    ok(!memo.sealFail, name, '어느 걸음에서 原文 낙관이 보였음');
    // ── README 17절 항목이 화면에 나오는가
    const o = memo.obs || {};
    const SCN = await page.evaluate(() => G.data.scenes.map((s) => ({ id: s.id, heading: [].concat(s.heading || []).length })));
    for (const s of SCN.filter((x) => x.heading)) ok(((o.heading || {})[s.id] || []).length === s.heading, name, s.id + ': 회목 카드가 ' + s.heading + '장 보여야 함(지금 ' + JSON.stringify((o.heading || {})[s.id]) + ')');
    const walks = o.walks || [];
    const walkAt = (sq) => walks.find((x) => x.at === sq) || {};
    ok(walks.length && walks[0].from === 'sq-suju' && walks[0].at === 'sq-huayin', name, '2장 첫머리에 말이 출발 칸(수주현)에서 화음현으로 걸어가지 않음: ' + JSON.stringify(walks[0]));
    ok(walkAt('sq-huayin').outfit === '' && walkAt('sq-hallim').outfit === 'gwan' && walkAt('sq-sasin').outfit === 'gwan' && walkAt('sq-wonsu').outfit === 'jang' && walkAt('sq-seungsang').outfit === 'sang' && walkAt('sq-chwimi').outfit === 'sang', name, '말의 옷이 칸 도착 때 바뀌지 않음: ' + walks.map((x) => x.at + '=' + x.outfit).join(' '));
    ok(page.reqs.some((u) => /horse_walk_gwan\.webp/.test(u)), name, '관복 말 그림(horse_walk_gwan.webp)을 찾지 않음');
    ok(/장원급제·한림학사/.test(walkAt('sq-hallim').gyoji || '') && /공명/.test(walkAt('sq-hallim').gyoji || ''), name, '벼슬 칸 도착 때 교지 카드(벼슬 이름과 채워지는 소원)가 없음: ' + walkAt('sq-hallim').gyoji);
    ok(/장수/.test(walkAt('sq-wonsu').gyoji || '') && /재상/.test(walkAt('sq-seungsang').gyoji || ''), name, '교지 카드에 출장입상의 반 칸(장수·재상)이 보이지 않음');
    ok(walks.filter((x) => x.gyoji != null).every((x) => !/미색|\?/.test(x.gyoji)), name, '교지 카드에 미색이 나옴');
    ok(walkAt('sq-huayin').gyoji === null && walkAt('sq-chwimi').gyoji === null, name, '장소 칸에 교지 카드가 나옴');
    ok(/15회/.test(walkAt('sq-chwimi').hoe || ''), name, '취미궁 칸 도착 때 15회 회목 카드가 없음: ' + walkAt('sq-chwimi').hoe);
    const afterWonsu = walks.find((x) => x.scene === 's10-wonsu') || {}, afterSs = walks.find((x) => x.scene === 's13-seungsang') || {};
    ok(afterWonsu.chul && afterWonsu.chul.half === true && afterWonsu.chul.filled === false && afterWonsu.halfDom, name, '대원수를 마친 뒤 출장입상이 반만 차야 함: ' + JSON.stringify(afterWonsu.chul));
    ok(afterSs.chul && afterSs.chul.half === false && afterSs.chul.filled === true, name, '대승상을 마친 뒤 출장입상이 가득 차야 함: ' + JSON.stringify(afterSs.chul));
    ok(/sc_josin_wake/.test((o.imgs || {})['c0-josin'] || '') && /sc_rebirth/.test((o.imgs || {})['c1-rebirth'] || ''), name, '활동 뒤 장면 그림이 imgAfter로 바뀌지 않음: ' + JSON.stringify(o.imgs));
    for (const [sid, p] of Object.entries(o.pearls || {})) {
      const canonScene = sid === 's04-geomungo' || sid === 's08-tungso';
      ok(canonScene ? p.note === 1 && p.fic === 0 && /구슬/.test(p.text) : p.fic === 1 && p.note === 0, name, sid + ': 구슬 근거 표시(원작이면 알아 두기, 아니면 게임 설정 카드)가 다름 ' + JSON.stringify({ fic: p.fic, note: p.note }));
    }
    ok(Object.keys(o.pearls || {}).length === 8, name, '구슬 걸음이 여덟 장면에 없음');
    ok(['gyeongpae', 'nanyang'].every((b) => ((o.bonds || {})['s13-seungsang'] || []).includes(b)) && ((o.bonds || {})['s14-honrye'] || []).length >= 2, name, '한 장면에서 여러 인연을 다시 만나지 못함: ' + JSON.stringify(o.bonds));
    ok(o.journal && o.journal.none && o.journal.picked === 'none', name, "꿈 일지 '해석' 짝에 '어느 칸도 아님'이 없거나 기록되지 않음: " + JSON.stringify(o.journal));
    ok(o.journal && o.journal.extra === (mode === '다시 읽기'), name, "꿈 일지의 '학문' 칩은 다시 읽기에서만: " + JSON.stringify(o.journal));
    ok(o.reveal && o.reveal.gloss >= 3 && o.reveal.interp === 1 && /고운 빛/.test(o.reveal.text), name, '인연 잇기 뒤 근거(풀이)와 해석 카드(bondLink.reveal)가 보이지 않음: ' + JSON.stringify(o.reveal));
    ok(/꺼/.test(o.zen || '') && !/식지 않/.test(o.zen || ''), name, '빈 선방의 글이 원작(향로의 불이 꺼짐)과 다름: ' + o.zen);
    const sets = await page.evaluate(() => G.save.state.bondNotes);
    ok(sets && sets['s13-seungsang'] && sets['s14-honrye'], name, '다시 만난 사연이 기록되지 않음');
    ok(await page.locator('[data-teacher]:visible').count() === 0, name, '선생님용 단추가 보임');
    const img = await page.evaluate(() => { try { const c = G.app.renderPage(); return c.width > 0 && c.height > 0; } catch (e) { return false; } });
    ok(img, name, '마지막 장을 그림으로 그리지 못함');
    // ── 결과 글의 조사: 두 꼴을 함께 찍지 않는다(예: "…)을(를) 골랐다가")
    const resultText = await page.locator('.play').innerText();
    const both = resultText.match(/[을이은와]\([를가는과]\)|\([을이은와]\)[를가는과]/);
    ok(!both, name, '결과 화면에 조사 두 꼴이 함께 찍힘: ' + (both ? resultText.slice(Math.max(0, both.index - 20), both.index + 8) : ''));
    if (opt.shots) {
      await W(page, 400);
      await integerCheck(page, opt.shots + ' R/result'); await overflowCheck(page, opt.shots + ' R/result'); await contrastCheck(page, opt.shots + ' R/result');
      await page.screenshot({ path: path.join(SHOTS, `play_${opt.shots}_R_result.png`) });
      await page.locator('.jp-trace').scrollIntoViewIfNeeded(); await W(page, 200);
      await page.screenshot({ path: path.join(SHOTS, `play_${opt.shots}_R_trace.png`) });
    }
    // ── 일부러 틀린 활동: 장부에 첫 시도 틀림·도움 사용, 오답 노트에 남는다
    if (opt.wrong) {
      const acts = memo.wrongActs || [];
      ok(acts.length === opt.wrong.length, name, '일부러 틀려 본 장이 모자람: ' + JSON.stringify(acts) + ' (장 ' + opt.wrong.join(',') + ')');
      const L = await page.evaluate(() => JSON.parse(JSON.stringify({ ledger: G.save.state.ledger, wrong: G.save.state.wrong, rows: G.app.ledgerRows() })));
      for (const id of acts) {
        ok(L.ledger[id] && L.ledger[id].first === false && L.ledger[id].help === 'student', name, id + ': 일부러 틀린 활동의 장부가 첫 시도 틀림·도움 사용이 아님: ' + JSON.stringify(L.ledger[id]));
        ok(L.wrong.some((x) => x.act === id), name, id + ': 오답 노트에 남지 않음');
        ok((L.rows.find((r) => r.id === id) || {}).helpLabel === '도움 사용', name, id + ': 장부 표시가 도움 사용이 아님');
      }
      ok(await page.locator('.wrong-notes li').count() >= acts.length, name, '결과의 오답 노트에 틀린 활동이 보이지 않음');
      const others = Object.entries(L.ledger).filter(([k]) => !acts.includes(k));
      ok(others.every(([, v]) => v.first === true && !v.help), name, '틀리지 않은 활동의 장부가 바뀜: ' + others.filter(([, v]) => !(v.first === true && !v.help)).map(([k]) => k).join(','));
    }
    if (opt.reload) ok(memo.reloaded, name, '장면 중간 새로 고침을 하지 못함(' + memo.reloadAt + ')');
    if (opt.lock) ok(memo.lockDone, name, '깨어난 뒤 잠금 점검을 하지 못함');
    // ── 결과 이미지 저장: 진짜 PNG가 내려받아진다
    if (opt.png) {
      await page.locator('.journal-page input[name="student-name"]').fill('홍길동');
      await W(page);
      const dlP = page.waitForEvent('download', { timeout: 10000 });
      await page.locator('[data-act="save-image"]').click();
      const dl = await dlP.catch(() => null);
      if (ok(!!dl, name, '그림 저장을 눌렀는데 내려받기가 없음')) {
        const fname = dl.suggestedFilename();
        ok(/\.png$/.test(fname) && fname.includes('홍길동'), name, '저장 파일 이름이 이상함: ' + fname);
        const p = await dl.path();
        const buf = p ? fs.readFileSync(p) : Buffer.alloc(0);
        const sig = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const iw = buf.length > 24 ? buf.readUInt32BE(16) : 0, ih = buf.length > 24 ? buf.readUInt32BE(20) : 0;
        ok(sig && buf.subarray(12, 16).toString('latin1') === 'IHDR' && iw >= 600 && ih >= 600 && buf.length > 10000, name, `PNG 그림이 아님(크기 ${buf.length} B, ${iw}×${ih})`);
        ok(buf.subarray(buf.length - 8, buf.length - 4).toString('latin1') === 'IEND', name, 'PNG가 끝까지 저장되지 않음');
      }
    }
    // ── 알림이 읽는 글과 진행 단추를 가리지 않는다
    const tl = page.toasts || [];
    ok(tl.length > 0, name, '완주하는 동안 알림을 한 번도 보지 못함(점검이 헛돎)');
    const covered = tl.filter((x) => x.hits.length);
    ok(covered.length === 0, name, '알림이 읽는 글·단추를 가림: ' + covered.slice(0, 3).map((x) => `「${x.text}」(${x.scene}, ${x.when}) → ${x.hits.join('·')} [${x.rect}]`).join(' | '));
    log(`  알림 ${new Set(tl.map((x) => x.text)).size}종 ${tl.filter((x) => x.when === '뜬 직후').length}번 · 가린 것 ${covered.length}`);
    log(`  ${mode}: 걸음 ${memo.steps}개 · 구슬 ${res.pearls} · 장부 ${res.rows}행 · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
    await finish(page);
  });
}
// 학생처럼 끝까지(명세 16절): 선생님용 단추 없이 휴대폰·태블릿·데스크톱, 처음 읽기·다시 읽기. 판마다 일부러 틀리기(0·2·4장),
// 장면 중간 새로 고침, 깨어난 뒤 뒤로 가기·새로 고침·목차·주소, 결과 그림(PNG) 저장, 알림 위치, 장마다 화면 찍기(tests/shots/play_*)
const STUDENT = { wrong: ['0', '2', '4'], reload: true, lock: true, png: true };
await fullRun('완주(휴대폰·처음 읽기)', '처음 읽기', Object.assign({ pearls: 3, revise: true, shots: 'phone' }, STUDENT));
await fullRun('완주(태블릿·다시 읽기)', '다시 읽기', Object.assign({ pearls: 8, revise: true, shots: 'tablet', page: { viewport: { width: 820, height: 1180 } } }, STUDENT));
await fullRun('완주(데스크톱·처음 읽기)', '처음 읽기', Object.assign({ pearls: 0, revise: false, shots: 'desktop', page: { viewport: { width: 1280, height: 860 }, mobile: false } }, STUDENT));

// 집 칸 종류(기획서 §10): 물건의 slot이 in이면 방 안 칸만, yard면 뜰 칸만, any면 어디나. 단계가 올라도 종류가 맞는 칸으로 옮긴다
await run('집 칸 종류', async () => {
  const page = await newPage('house-kind');
  await page.goto(BASE);
  await ready(page);
  await vbtn(page, '시작하기').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, '처음 읽기').first().click();
  await page.waitForSelector('.play');
  await page.evaluate(() => {
    const st = G.save.state;
    const L = G.app.list();
    for (const s of L) { if (s.id === 's07-gyeonghong') break; st.done[s.id] = true; }
    st.items = { 'it-yangryu': { scene: 's01-huayin' }, 'it-cheonrima': { scene: 's07-gyeonghong' }, 'it-mulbyeong': { scene: 's12-neungpa' } };
    st.house = {}; st.pos = 's07-gyeonghong'; st.reach = 2; st.houseStage = 1;
    G.save.write();
    G.app.open('s07-gyeonghong');
  });
  await W(page, 300);
  await page.evaluate(() => { G.ui.closeSheets(); G.dream.open('house'); });
  await page.waitForSelector('.bag .house-view');
  const H = () => page.evaluate(() => Object.assign({}, G.save.state.house));
  await page.locator('.bag .bitem[data-item="it-cheonrima"]').click();
  ok(await page.locator('.bag .hslot[data-kind="in"].nofit').count() === 10 && await page.locator('.bag .hslot[data-kind="yard"].nofit').count() === 0, 'house-kind', '뜰 물건(천리마)을 고르면 방 안 칸이 막혀 보여야 함');
  await page.locator('.bag .hslot[data-slot="bd-1"]').click(); await W(page, 80);
  ok(!(await H())['it-cheonrima'], 'house-kind', '뜰 물건(천리마)이 방 안 칸에 놓임');
  await page.locator('.bag .bitem[data-item="it-cheonrima"]').click();
  await page.locator('.bag .hslot[data-slot="bd-11"]').click(); await W(page, 80);
  ok((await H())['it-cheonrima'] === 'bd-11', 'house-kind', '뜰 물건이 뜰 칸에 놓이지 않음');
  await page.locator('.bag .bitem[data-item="it-yangryu"]').click();
  await page.locator('.bag .hslot[data-slot="bd-12"]').click(); await W(page, 80);
  ok(!(await H())['it-yangryu'], 'house-kind', '방 안 물건(양류사 시전)이 뜰 칸에 놓임');
  await page.locator('.bag .bitem[data-item="it-yangryu"]').click();
  await page.locator('.bag .hslot[data-slot="bd-1"]').click(); await W(page, 80);
  ok((await H())['it-yangryu'] === 'bd-1', 'house-kind', '방 안 물건이 방 안 칸에 놓이지 않음');
  // 자리 바꾸기도 종류를 지킨다: 방 안 물건을 뜰 물건이 있는 칸으로 옮길 수 없다
  await page.locator('.bag .hslot[data-slot="bd-1"]').click();
  await page.locator('.bag .hslot[data-slot="bd-11"]').click(); await W(page, 80);
  const h1 = await H();
  ok(h1['it-yangryu'] === 'bd-1' && h1['it-cheonrima'] === 'bd-11', 'house-kind', '종류가 다른 칸끼리 자리를 바꿈: ' + JSON.stringify(h1));
  await page.locator('.bag .bitem[data-item="it-mulbyeong"]').click();
  await page.locator('.bag .hslot[data-slot="bd-12"]').click(); await W(page, 80);
  ok((await H())['it-mulbyeong'] === 'bd-12', 'house-kind', '어디나(any) 물건이 뜰 칸에 놓이지 않음');
  // 단계가 오를 때: 객사의 뜰(inn-6)에 있던 천리마는 별당의 같은 순번(bd-6, 방 안)이 아니라 뜰 칸으로 간다
  const moved = await page.evaluate(() => {
    const st = G.save.state;
    st.house = { 'it-cheonrima': 'inn-6', 'it-yangryu': 'inn-1' };
    G.house.settle();
    return Object.assign({}, st.house);
  });
  ok(/^bd-1[12]$/.test(moved['it-cheonrima']) && moved['it-yangryu'] === 'bd-1', 'house-kind', '단계가 오를 때 종류가 맞는 칸으로 옮기지 않음: ' + JSON.stringify(moved));
  await finish(page);
});

// 선생님용 목차의 교사용 안내: 모둠 디브리핑 안내(extra)와 장부 보는 법(ledger)
await run('교사용 안내', async () => {
  const page = await newPage('teacher-guide', { viewport: { width: 1280, height: 860 }, mobile: false });
  await page.goto(BASE + '?teacher=1');
  await ready(page);
  await vbtn(page, '시작하기').first().click();
  await page.waitForSelector('.sheet');
  await vbtn(page, '처음 읽기').first().click();
  await page.waitForSelector('.play');
  await page.locator('[data-tool="toc"]').first().click();
  await page.waitForSelector('.toc .teacher-guide');
  const g = await page.evaluate(() => ({ text: document.querySelector('.toc .teacher-guide').innerText, N: G.data.notes.teacher }));
  ok(g.text.includes(g.N.extra.slice(0, 20)), 'teacher', '교사용 안내에 모둠 디브리핑 안내(notes.teacher.extra)가 없음');
  ok(g.text.includes(g.N.ledger.slice(0, 20)), 'teacher', '교사용 안내에 장부 보는 법(notes.teacher.ledger)이 없음');
  await finish(page);
});

await browser.close();
server.close();
log(issues.length ? `✗ 내용 점검 실패 ${issues.length}건` : '✓ 내용 점검 통과');
process.exit(issues.length ? 1 : 0);
