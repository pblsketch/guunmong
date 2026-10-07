'use strict';
// 생각 선택·첫 결과·숨긴 소원·소원 막대·되짚기의 순수 계산(G.play)과, 화면이 쓸 저장 API의 약속.
// DOM·저장소·app을 부르지 않는다. 상태(state)는 G.save.state처럼 읽기만 한다.
//
// ── 소원 막대 ─────────────────────────────────────────────────────────────
//  드러난 소원 넷(WISHES)만 값이 있다. 미색은 값이 없고 꿈 내내 '?'다.
//  원작 바닥(canon): 정서대원수 임명·대승상 임명 각 1(출장입상), 기린 도포·옥대 2(부귀),
//    거문고·퉁소 각 1(풍류), 기린각 초상 2(공명). 소원마다 CANON_MAX(2)까지.
//  고른 말의 합(choiceSum): 학생이 처음 고른 선택지의 wish 단계(+1/−1)를 더한 값.
//  표시값 = min(MAX, canon + max(0, choiceSum)). 고른 말은 원작 바닥을 깎지 못한다.
//  인연·구슬·첫 결과는 막대를 움직이지 않는다.
//  G.play.canon(state,data) / choiceSum(state,data) / values(state,data) → {chuljang,bugwi,pungryu,gongmyeong}
//  G.experience.wishes(state,data)·G.app.wishes() → 기존 {id,name,hidden,fill,filled,half,sources,parts}에
//    level(0..1 = 표시값/MAX, 미색은 null), canonFull(원작 바닥이 가득), peakLevel(최고값/MAX, 미색 null),
//    secret(숨긴 소원이면 true)을 더한 배열. 숫자는 학생에게 보이지 않는다(낭독은 notes.ui.band.levels).
//  최고값 state.play.peak는 저장 트랜잭션마다 깨어나기 전까지 자동으로 오르고(원작 사실·고른 말 모두),
//    깨어남 저장과 함께 얼어붙는다. 일반 transact로 직접 바꿀 수 없다.
//
// ── 자리 찾기 ─────────────────────────────────────────────────────────────
//  G.play.challenge(data,id) → 도전 자료 또는 null
//  G.play.sites(data) → 소원을 움직이는 선택 자리(선택지에 wish 배열이 있는 도전) 배열
//  G.play.siteAt(data,sceneId,beatId) → 그 행동과 함께 저장해야 하는 생각 선택(talk) 자리 또는 null
//  G.play.recording(state,by) → 지금 기록이 남는가(학생 by·선생님용 꺼짐·깨기 전). 화면은 미리 보기용으로만 쓴다
//  G.play.first(state,id) → 저장된 첫 결과 {ok,clues?,tried?} 또는 null(ok:null은 찾기 첫 판 진행 중)
//  G.play.after(state,data,id) → 앞 도전 첫 결과가 성공이라 바뀐 시작 {from,spots?,clue?,text} 또는 null
//
// ── 저장 API(js/core/save.js, 모두 동기) ─────────────────────────────────────
//  options는 {run, readonly, by:'student'|'teacher'}. 거부되면 상태·저장 원문을 바꾸지 않는다.
//  G.save.recordFirst(challengeId, input, options) → {ok, reason, first}
//    talk가 아닌 도전의 첫 판가름. 현재 장면(pos)의 현재 필수 단계(beat)일 때만 받는다.
//    input: pick {option}(처음 누른 선택지; 선택지에 wish가 있으면 고른 말도 같은 저장) ·
//           deduce {option, clues}(답할 때 펼쳐져 있던 단서 수, 미리 펼친 단서 포함) ·
//           search {spot}(누른 곳 하나씩. 헛짚으면 tried에 쌓이고 ok:null, 촛불이 다하면 ok:false, 답이면 ok:true) ·
//           sequence {ok}(첫 실수면 false, 첫 판을 실수 없이 마치면 true)
//    first는 저장 뒤(또는 거부 때 기존)의 기록. ok가 true/false로 정해지면 다시 바뀌지 않는다.
//  G.save.applyExperience(sceneId, actionId, {...options, choice?}) → {ok, reason, record}
//    siteAt이 있는 행동은 학생 기록일 때 choice(선택지 id)가 꼭 있어야 하며 행동과 고른 말을 한 저장으로 남긴다.
//    선생님용·바로가기·깨어난 뒤에는 choice 없이 되고 무엇을 넘겨도 고른 말을 남기지 않는다.
//  G.save.chooseSecretWish(wishId, options) → {ok, reason, secretWish}
//    소원 찾기(a-wish) 확정 뒤 한 번. 드러난 넷 가운데 하나. 바꿀 수 없다.
//  reason: null | 'readonly' | 'stale' | 'unavailable'(권한·저장 실패) | 'invalid'(없는 자리·선택지·곳·값) |
//    'teacher'(선생님용·선생님 수행) | 'auto'(바로가기로 넘긴 장면) | 'awake'(깨어난 뒤) |
//    'blocked'(지금 장면·단계가 아님, 소원 찾기 전) | 'decided'(이미 정해짐) | 'duplicate'(같은 곳·같은 행동) |
//    'choice'(학생 행동에 고른 말 없음). applyExperience는 기존 reason도 그대로 준다.
//    teacher/auto/awake/decided/duplicate는 '기록하지 않는 규칙'이므로 화면은 반응만 보이고 이어 가면 된다.
//
// ── 되짚기(5장 첫머리·결과) ──────────────────────────────────────────────────
//  G.play.recap(state,data) → { counts:{소원:▲ 고른 수}, stay:물러남 수, teacher:[선생님 도움으로 넘긴 자리 id],
//    firsts:{도전id:true|false|null}(interp.recap.first의 도전), secretWish:id|null, peak:[가장 찼던 소원 id…](동률 모두),
//    hasRecord:학생이 고른 말이 하나라도 있는가 }
//  G.play.recapLines(state,data) → 육관대사가 말할 줄 배열(chose/none·teacher·first·wishLine/peakOnly·ask 차례)
//  G.play.e11(state,data) → 틀 근거 E11의 채운 글, 학생이 고른 말이 없으면 null
//  G.play.fill(template, values) → {이름}·{이름:을/를} 자리를 채우고 조사는 G.util.josa로 한 꼴만 붙인다
(function () {
  const WISHES = Object.freeze(['chuljang', 'bugwi', 'pungryu', 'gongmyeong']);
  const MAX = 4, CANON_MAX = 2;
  const STORY = Object.freeze({ wonsu: 'e08-wonsu:appointment', seungsang: 'e11-seungsang:appointment', portrait: 'e11-seungsang:portrait' });
  // 원작 바닥의 출처와 무게. story는 저장된 원작 단계, item은 받은 물건이다.
  const CANON = Object.freeze({
    chuljang: [{ story: STORY.wonsu, weight: 1 }, { story: STORY.seungsang, weight: 1 }],
    bugwi: [{ item: 'it-girinpo', weight: 2 }],
    pungryu: [{ item: 'it-geomungo', weight: 1 }, { item: 'it-tungso', weight: 1 }],
    gongmyeong: [{ story: STORY.portrait, weight: 2 }],
  });
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const list = (data) => (Array.isArray(data?.challenges) ? data.challenges.filter(object) : []);
  const zero = () => Object.fromEntries(WISHES.map((id) => [id, 0]));
  const isSite = (c) => object(c) && Array.isArray(c.options) && c.options.some((o) => Array.isArray(o?.wish));
  const challenge = (data, id) => list(data).find((c) => c.id === id) || null;
  const sites = (data) => list(data).filter(isSite);
  const siteAt = (data, scene, beat) => sites(data).find((c) => c.kind === 'talk' && c.scene === scene && c.beat === beat) || null;
  const option = (site, id) => (site?.options || []).find((o) => o?.id === id) || null;
  const recording = (state, by) => by === 'student' && !state.teacher && !state.awake;

  function canon(state, data) {
    const story = new Set(G.experience.facts(state, data)), items = state.items || [], result = zero();
    for (const id of WISHES) {
      const sum = CANON[id].reduce((n, s) => n + ((s.story ? story.has(s.story) : items.includes(s.item)) ? s.weight : 0), 0);
      result[id] = Math.min(CANON_MAX, sum);
    }
    return result;
  }
  // 저장된 고른 말에서 선택지를 찾는다. 자료에 없는 기록은 건너뛴다.
  function chosen(state, data) {
    return Object.entries(state.play?.choices || {}).map(([id, pick]) => {
      const site = sites(data).find((c) => c.id === id);
      const o = site && option(site, pick?.option);
      return o ? { site, option: o } : null;
    }).filter(Boolean);
  }
  function choiceSum(state, data) {
    const result = zero();
    for (const { option: o } of chosen(state, data)) for (const step of o.wish || []) if (WISHES.includes(step?.wish)) result[step.wish] += step.step;
    return result;
  }
  function values(state, data) {
    const base = canon(state, data), sum = choiceSum(state, data), result = zero();
    for (const id of WISHES) result[id] = Math.min(MAX, base[id] + Math.max(0, sum[id]));
    return result;
  }
  const first = (state, id) => state.play?.firsts?.[id] || null;
  function after(state, data, id) {
    const c = challenge(data, id);
    return c && object(c.after) && first(state, c.after.from)?.ok === true ? c.after : null;
  }
  // 첫 판가름 하나를 계산한다(저장은 save.js). {first, choice?} 또는 {reason}.
  function decide(state, data, id, input) {
    const c = challenge(data, id), before = first(state, id);
    if (!c || c.kind === 'talk' || !object(input)) return { reason: 'invalid' };
    if (before && before.ok !== null) return { reason: 'decided' };
    if (c.kind === 'pick') {
      if (!option(c, input.option)) return { reason: 'invalid' };
      return { first: { ok: input.option === c.answer }, choice: isSite(c) ? { option: input.option } : null };
    }
    if (c.kind === 'deduce') {
      const opened = after(state, data, id) && Number.isInteger(c.after.clue) ? 1 : 0;
      if (!option(c, input.option) || !Number.isInteger(input.clues) || input.clues < opened || input.clues > (c.clues || []).length) return { reason: 'invalid' };
      return { first: { ok: input.option === c.answer, clues: input.clues } };
    }
    if (c.kind === 'search') {
      const marked = after(state, data, id)?.spots || [];
      if (!(c.spots || []).some((s) => s?.id === input.spot) || marked.includes(input.spot)) return { reason: 'invalid' };
      const tried = [...(before?.tried || [])];
      if (tried.includes(input.spot)) return { reason: 'duplicate' };
      if (input.spot === c.answer) return { first: { ok: true, tried } };
      tried.push(input.spot);
      return { first: { ok: tried.length >= c.tries ? false : null, tried } };
    }
    if (c.kind === 'sequence') {
      if (typeof input.ok !== 'boolean') return { reason: 'invalid' };
      return { first: { ok: input.ok } };
    }
    return { reason: 'invalid' };
  }

  const SLOT = /\{([a-z]+)(?::([^{}|]+))?\}/g;
  function fill(template, values) {
    return String(template).replace(SLOT, (all, key, pair) => {
      if (!Object.hasOwn(values, key)) return all;
      const value = String(values[key]);
      return value + (pair ? G.util.josa(value, pair) : '');
    });
  }
  const wishName = (data, id) => (data.wishes || []).find((w) => w.id === id)?.name || id;
  // 소원 쪽은 data.wishes 차례(미색 제외)로 둔다.
  const order = (data) => {
    const listed = (data.wishes || []).map((w) => w.id).filter((id) => WISHES.includes(id));
    return [...listed, ...WISHES.filter((id) => !listed.includes(id))];
  };
  function recap(state, data) {
    const counts = zero(); let stay = 0;
    const picks = chosen(state, data);
    for (const { option: o } of picks) {
      if (o.stay === true) stay++;
      for (const step of o.wish || []) if (WISHES.includes(step?.wish) && step.step > 0) counts[step.wish]++;
    }
    // 선생님 도움으로 넘긴 자리: 학생이 고른 말이 없고, 장면이 바로가기(auto)이거나 그 행동을 선생님이 했다.
    const teacher = sites(data).filter((site) => {
      if (state.play?.choices?.[site.id]) return false;
      const rec = state.rpg?.scenes?.[site.scene];
      return rec?.status === 'auto' || (rec?.actions || []).some((a) => a.id === site.beat && a.by === 'teacher');
    }).map((site) => site.id);
    const r = data.interp?.recap || {};
    const ids = Array.isArray(r.first) ? r.first.map((f) => f?.challenge).filter(Boolean) : ['ch-chunun-ghost', 'ch-yoyeon-night'];
    const firsts = Object.fromEntries(ids.map((id) => {
      const ok = first(state, id)?.ok;
      return [id, ok === true || ok === false ? ok : null];
    }));
    const peakValue = state.play?.peak || zero();
    const top = Math.max(...WISHES.map((id) => peakValue[id] || 0));
    const peak = order(data).filter((id) => (peakValue[id] || 0) === top);
    const secretWish = WISHES.includes(state.play?.secretWish) ? state.play.secretWish : null;
    return { counts, stay, teacher, firsts, secretWish, peak, hasRecord: picks.length > 0 };
  }
  function recapLines(state, data) {
    const r = data.interp?.recap || {}, m = recap(state, data), out = [];
    const times = (n) => (r.counts || [])[n - 1] || (r.counts || []).at(-1) || '';
    const items = [...order(data).filter((id) => m.counts[id] > 0).map((id) => fill(r.item, { name: fill(r.pickName, { wish: wishName(data, id) }), times: times(m.counts[id]) })),
      ...(m.stay > 0 ? [fill(r.item, { name: r.stayName, times: times(m.stay) })] : [])];
    if (!m.hasRecord) out.push(r.none);
    else if (items.length) {
      out.push(fill(r.chose, { items: items.join(', ') }));
      if (m.teacher.length) out.push(r.teacher);
    }
    for (const f of Array.isArray(r.first) ? r.first : []) {
      const ok = m.firsts[f?.challenge];
      if (ok === true) out.push(f.ok); else if (ok === false) out.push(f.fail);
    }
    const peak = m.peak.map((id) => wishName(data, id)).join('·');
    out.push(m.secretWish ? fill(r.wishLine, { secret: wishName(data, m.secretWish), peak }) : fill(r.peakOnly, { peak }));
    out.push(r.ask);
    return out.filter((line) => typeof line === 'string' && line.trim());
  }
  function e11(state, data) {
    const m = recap(state, data), r = data.interp?.recap || {};
    const template = (data.interp?.evidence || []).find((e) => e?.id === 'E11' && e.template === true);
    if (!m.hasRecord || !template) return null;
    const most = Math.max(m.stay, ...WISHES.map((id) => m.counts[id]));
    if (most <= 0) return null;
    const names = [...order(data).filter((id) => m.counts[id] === most).map((id) => fill(r.pickName, { wish: wishName(data, id) })),
      ...(m.stay === most ? [r.stayName] : [])];
    return fill(template.text, { top: names.join('·') });
  }
  G.play = { WISHES, MAX, CANON_MAX, CANON, storyIds: STORY, challenge, sites, siteAt, option, recording,
    canon, choiceSum, values, first, after, decide, fill, recap, recapLines, e11 };
})();
