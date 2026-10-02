'use strict';
// 내용 데이터 불러오기와 점검
//  - 보통은 js/data/*.js(내용 파일, 형식은 js/data/README.md)를 읽는다. 파일이 없으면 없는 대로 넘어간다.
//  - 주소에 ?fixture=1 을 붙이면 js/data/ 대신 tests/fixtures/stub.js(임시 데이터)만 읽는다.
//    ?fixture=이름 이면 tests/fixtures/이름.js 를 읽는다(점검용).
//  - 데이터 파일은 모두 window.GUUN 아래에 제 몫을 적는다. 예: (window.GUUN = window.GUUN || {}).scenes = [...]
// <script> 태그로 읽으므로 index.html을 파일로 바로 열어도(file://) 동작한다.
(function () {
  const FILES = ['people', 'chapters', 'board', 'scenes', 'wishes', 'bonds', 'house', 'journal', 'interp', 'notes', 'bgm'];
  const D = (G.data = { ok: false, fixture: null, loaded: [], missing: [], problems: [] });

  function addScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false; // 적은 순서대로 실행
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
  }

  G.loadData = async function () {
    const q = new URLSearchParams(location.search);
    const fx = q.get('fixture');
    if (fx && /^[a-z0-9-]+$/i.test(fx)) D.fixture = fx === '1' ? 'stub' : fx;
    const list = D.fixture ? ['tests/fixtures/' + D.fixture + '.js'] : FILES.map((n) => 'js/data/' + n + '.js');
    const res = await Promise.all(list.map(addScript));
    list.forEach((f, i) => (res[i] ? D.loaded : D.missing).push(f));
    const src = window.GUUN || {};
    Object.assign(D, {
      people: src.people || {},
      chapters: src.chapters || {},
      board: src.board || [],
      scenes: Array.isArray(src.scenes) ? src.scenes : [],
      wishes: src.wishes || [],
      bonds: src.bonds || [],
      house: src.house || { stages: [] },
      journal: src.journal || {},
      interp: src.interp || {},
      notes: src.notes || {},
      bgm: src.bgm || {},
    });
    D.ok = D.scenes.length > 0;
    D.problems = G.checkData(D);
    for (const p of D.problems) console.warn('[데이터]', p);
    return D;
  };

  // 지켜야 할 규칙을 데이터에서 확인한다(어기면 경고만 하고 멈추지 않는다. 자동 점검은 이 목록을 본다)
  const CH = ['0', '1', '2', '3', '4', '5', 'R'];
  G.checkData = function (d) {
    const out = [];
    const hidden = new Set((d.wishes || []).filter((w) => w.dreamHidden).map((w) => w.id));
    const wishOf = (f) => String(f).split('.')[0]; // 'chuljang.chul'(반 칸) → 'chuljang'
    const bondIds = new Set((d.bonds || []).map((b) => b.id));
    const seen = new Set();
    let last = 0;
    for (const s of d.scenes || []) {
      if (!s.id) { out.push('id 없는 장면'); continue; }
      if (seen.has(s.id)) out.push('장면 id가 겹침: ' + s.id);
      seen.add(s.id);
      const ci = CH.indexOf(String(s.ch));
      if (ci < 0) out.push(s.id + ': 장(ch)이 0~5·R이 아님');
      else if (ci < last) out.push(s.id + ': 장 순서가 거꾸로임(장면은 장 순서대로 적는다)');
      else last = ci;
      for (const f of [].concat(s.fills || [], (s.item && s.item.fills) || [])) if (hidden.has(wishOf(f))) out.push(s.id + ': 꿈 동안 비어 있어야 하는 소원(' + f + ')을 채움');
      if (s.pearl && !s.meet) out.push(s.id + ': 구슬은 여인을 처음 만나는 장면에만 둔다');
      if (s.meet && !bondIds.has(s.meet)) out.push(s.id + ': 없는 인연 ' + s.meet);
      for (const r of [].concat(s.remeet || [])) if (!r || !bondIds.has(r.bond)) out.push(s.id + ': 다시 만나는 인연이 없는 인연임 ' + (r && r.bond));
      for (const hd of [].concat(s.heading || [])) if (hd && hd.orig && hd.status) out.push(s.id + ': 대조 대기(status)인 회목에 orig가 있음');
      const a = s.activity;
      if (a) {
        if (!a.id) out.push(s.id + ': 활동 id가 없음');
        if (a.type && a.type !== 'slots') out.push(s.id + ': 활동은 칸 채우기(slots) 틀만 쓴다');
        if (!Array.isArray(a.slots) || !a.slots.length) out.push(s.id + ': 활동에 칸이 없음');
        else if (a.scored !== false) for (const sl of a.slots) if (sl.answer == null) out.push(s.id + ': 채점 활동의 칸 ' + sl.id + '에 정답이 없음');
      }
      if (s.mind && s.mind.scored) out.push(s.id + ': 마음 고르기는 채점하지 않는다');
    }
    for (const b of d.bonds || []) if (b.fills || b.wish) out.push('인연 ' + b.id + ': 인연은 소원을 채우지 않는다');
    for (const q of d.board || []) {
      if (q.kind && !['office', 'place'].includes(q.kind)) out.push('말판 칸 ' + q.id + ': 벼슬(office)·장소(place) 칸만 둔다');
      if (q.fall || q.down) out.push('말판 칸 ' + q.id + ': 떨어지는 칸은 두지 않는다');
      for (const f of q.fills || []) if (hidden.has(wishOf(f))) out.push('말판 칸 ' + q.id + ': 꿈 동안 비어 있어야 하는 소원을 채움');
    }
    for (const p of ((d.journal || {}).pairs) || []) {
      if (p.scored !== false && !p.evidence) out.push('일지 짝 ' + p.id + ': 채점하는 짝에 근거가 없음');
      if (bondIds.has(p.event)) out.push('일지 짝 ' + p.id + ': 인연은 소원 칸에 넣지 않는다');
    }
    const io = ((d.interp || {}).options) || [];
    if (io.length && (io.length < 3 || io.length > 4)) out.push('해석 선택지는 3~4개');
    return out;
  };
  G.CH = CH;
})();
