'use strict';
// 내용 데이터 불러오기와 점검
//  - 보통은 js/data/*.js(내용 파일, 형식은 js/data/README.md)를 읽는다. 파일이 없으면 없는 대로 넘어간다.
//  - 주소에 ?fixture=1 을 붙이면 js/data/ 대신 tests/fixtures/stub.js(임시 데이터)만 읽는다.
//    ?fixture=이름 이면 tests/fixtures/이름.js 를 읽는다(점검용).
//  - 데이터 파일은 모두 window.GUUN 아래에 제 몫을 적는다. 예: (window.GUUN = window.GUUN || {}).scenes = [...]
// <script> 태그로 읽으므로 index.html을 파일로 바로 열어도(file://) 동작한다.
(function () {
  const FILES = ['people', 'chapters', 'board', 'scenes', 'wishes', 'bonds', 'house', 'journal', 'interp', 'notes', 'bgm', 'sprites'];
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
      sprites: src.sprites || {},
    });
    D.ok = D.scenes.length > 0;
    D.problems = G.checkData(D, { profile: D.fixture ? 'fixture' : 'production' });
    for (const p of D.problems) console.warn('[데이터]', p);
    return D;
  };

  const CH = ['0', '1', '2', '3', '4', '5', 'R'];
  const ABIL = ['munjang', 'eumak', 'muye', 'jiryak'];
  const GRADES = ['shine', 'fine', 'near'];
  const KINDS = ['cut', 'scene', 'wish', 'event', 'link', 'waking', 'journal', 'interp', 'result'];
  const CORES = [['munjang'], ['munjang'], ['eumak'], ['munjang'], ['jiryak'], ['jiryak'], ['eumak'], ['muye', 'jiryak'], ['muye'], ['jiryak']];
  const MEETS = [1, 2, 3, 5, 6, 7, 9, 10];
  // 목적어 뒤의 소유 보어·부사만 잇는다. 다른 절의 평판 획득까지 묶지 않는다.
  const OWNER = '(?:(?:자신|자기|나|그|양소유)(?:만)?의|내|제)?';
  const OBJECT_MODIFIERS = '(?:' + [
    '마침내|드디어|끝내|결국|기어이|온전히|완전히|쉽게|손쉽게|당당히|당당하게|새로|새롭게|무사히|곧바로',
    OWNER + '(?:아내|부인|배필|반려자|첩|것|전리품|보상|상|대가|선물)(?:으로|로)',
    OWNER + '(?:곁|집)(?:으로|에)',
  ].join('|') + ')*';
  const array = (x) => Array.isArray(x) ? x : [];
  const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const plain = (x) => String(x).replace(/\*\*/g, '').replace(/\{([^}|]+)\|[^}]+\}/g, '$1');
  function lines(value) {
    if (typeof value === 'string') return [plain(value)];
    if (Array.isArray(value)) return value.flatMap(lines);
    if (!object(value) || value.mark) return [];
    return ['text', 'gloss'].flatMap((key) => typeof value[key] === 'string' ? [plain(value[key])] : []);
  }
  G.storyText = function (d = D) {
    const texts = [];
    for (const s of array(d.scenes)) {
      if (!s) continue;
      if (['event', 'link', 'cut', 'waking', 'wish'].includes(s.kind) ||
          (['scene', 'interp'].includes(s.kind) && ['1', '3', '5'].includes(String(s.ch)))) {
        texts.push(...lines(s.lines), ...lines(s.narration));
      }
      if (['cut', 'waking'].includes(s.kind)) for (const frame of array(s.timeline)) texts.push(...lines(frame && frame.lines));
      if (s.kind === 'wish') texts.push(...lines(s.monologue));
      if (s.kind === 'event') for (const grade of GRADES) texts.push(...lines((s.gradeText || {})[grade]));
    }
    const interp = d.interp || {};
    for (const key of ['dialogue', 'lastWords', 'ending']) texts.push(...lines(interp[key]));
    return { texts, count: texts.reduce((n, text) => n + (text.match(/[가-힣]/g) || []).length, 0) };
  };
  G.checkData = function (d = D, options = {}) {
    const out = [];
    const issue = (code, id) => out.push(code + ': ' + id);
    const fixture = options.profile === 'fixture';
    if (options.profile && !['fixture', 'production'].includes(options.profile)) issue('profile', options.profile);
    const scenes = array(d.scenes);
    const bonds = array(d.bonds);
    const bondIds = new Set(bonds.filter(Boolean).map((b) => b.id));
    const hidden = new Set(array(d.wishes).filter((w) => w && w.dreamHidden).map((w) => w.id));
    const wishOf = (f) => String(f).split('.')[0];
    const checkFills = (value, id) => {
      for (const f of array(value)) if (hidden.has(wishOf(f))) issue('hidden-wish', id);
    };
    const seen = new Set();
    const meets = new Set();
    const events = scenes.filter((s) => s && s.kind === 'event');
    if (events.length !== (fixture ? 3 : 12)) issue('event-count', events.length);
    let last = 0;
    for (const s of scenes) {
      if (!object(s) || typeof s.id !== 'string') { issue('scene-id', 'missing'); continue; }
      if (seen.has(s.id)) issue('duplicate-id', s.id);
      seen.add(s.id);
      const ci = CH.indexOf(String(s.ch));
      if (ci < 0 || ci < last) issue('chapter-order', s.id);
      last = Math.max(ci, last);
      if (!KINDS.includes(s.kind)) issue('kind', s.id);
      if (!/^(e(0[1-9]|1[0-2])-[a-z0-9-]+|l-(namjeon|hebei|bongnae)|c[1-5]-[a-z0-9-]+|cut-josin|r-result)$/.test(s.id)) issue('scene-id', s.id);
      checkFills(s.fills, s.id);
      for (const item of array(s.items).concat(array((s.bonus || {}).items))) {
        if (!item || !/^it-/.test(item.id)) issue('item-id', s.id);
        else checkFills(item.fills, item.id);
      }
      if (s.meet) {
        if (s.kind !== 'event' || !bondIds.has(s.meet) || meets.has(s.meet)) issue('meet', s.id);
        meets.add(s.meet);
        if (!object(s.pearl) || !['x', 'y', 'r'].every((k) => Number.isFinite(s.pearl[k])) || s.pearl.r <= 0 ||
            s.pearl.x < 0 || s.pearl.x > 100 || s.pearl.y < 0 || s.pearl.y > 100) issue('pearl', s.id);
      } else if (s.pearl) issue('pearl', s.id);
      for (const r of array(s.remeet)) if (!r || !bondIds.has(r.bond)) issue('remeet', s.id);
      if (s.kind === 'event') {
        const index = events.indexOf(s);
        if (!s.id.startsWith('e' + String(index + 1).padStart(2, '0') + '-')) issue('event-order', s.id);
        if (String(s.ch) !== '2') issue('event-chapter', s.id);
        if (typeof s.preview !== 'string' || !s.preview.trim()) issue('preview', s.id);
        if (!array(s.clues).length || array(s.clues).some((c) => typeof c !== 'string' || !c.trim() || !String(s.preview).includes(c))) issue('clue', s.id);
        if (!Array.isArray(s.core) || s.core.length < 1 || s.core.length > 2 || new Set(s.core).size !== s.core.length || s.core.some((k) => !ABIL.includes(k))) issue('core', s.id);
        if (!fixture && index < CORES.length && JSON.stringify(array(s.core).slice().sort()) !== JSON.stringify(CORES[index].slice().sort())) issue('core-canon', s.id);
        if (!fixture && Boolean(s.meet) !== MEETS.includes(index + 1)) issue('meet-order', s.id);
        if (!s.img || !s.bgm || !/^sq-/.test(s.square) || !Array.isArray(s.items)) issue('event-fields', s.id);
        if (!array(s.lines).length) issue('event-lines', s.id);
        for (const grade of GRADES) {
          const text = (s.gradeText || {})[grade];
          if (typeof text !== 'string' || !text.trim()) { issue('grade-text', s.id + '/' + grade); continue; }
          const visible = plain(text).replace(/\s/g, '');
          for (const b of bonds) if (b) for (const name of [b.name, ...array(b.aliases)]) {
            if (!name) continue;
            const escaped = plain(name).replace(/\s/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(escaped + '(?:을|를)' + OBJECT_MODIFIERS + '(?:얻|차지|맞이|데려)').test(visible)) issue('grade-object', s.id);
          }
        }
      }
      if (['cut', 'waking'].includes(s.kind)) {
        let time = -1;
        if (!array(s.timeline).length) issue('timeline', s.id);
        for (const frame of array(s.timeline)) {
          if (!frame || !Number.isFinite(frame.at) || frame.at < 0 || frame.at < time) issue('timeline', s.id);
          time = frame && frame.at;
        }
        if (s.kind === 'waking' && array(s.timeline).filter((f) => f && f.pause === 'staff').length !== 1) issue('staff-pause', s.id);
      }
      if (s.kind === 'wish') {
        const words = array(s.words);
        const answers = array(s.answers);
        if (typeof s.monologue !== 'string' || answers.length !== 5 || new Set(answers).size !== 5 ||
            answers.some((id) => !words.some((w) => w && w.id === id && w.wish)) ||
            words.some((w) => !w || !w.text || !String(s.monologue).includes(w.text))) issue('wish-words', s.id);
      }
    }
    const front = ['cut-josin', 'c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth'];
    if (!fixture && scenes.find((s) => s?.id === 'cut-josin')?.optional !== true) issue('optional-scene', 'cut-josin');
    for (const s of scenes) if (s && ((s.optional != null && typeof s.optional !== 'boolean') || (s.optional && s.id !== 'cut-josin'))) issue('optional-scene', s.id);
    const dream = fixture ? ['e01', 'l-namjeon', 'e02', 'e03'] : ['e01', 'l-namjeon', 'e02', 'e03', 'e04', 'e05', 'l-hebei', 'e06', 'e07', 'l-bongnae', 'e08', 'e09', 'e10', 'e11', 'e12'];
    const back = ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake', 'c4-journal', 'c5-dialogue', 'c5-ordination', 'r-result'];
    const order = scenes.map((s) => s && /^e\d{2}-/.test(s.id) ? s.id.slice(0, 3) : s && s.id);
    if (JSON.stringify(order) !== JSON.stringify([...front, ...dream, ...back])) issue('scene-order', 'scenes');
    for (const s of scenes.filter((s) => s && typeof s.id === 'string')) {
      const expected = /^e\d{2}-/.test(s.id) ? ['event', '2'] : s.id.startsWith('l-') ? ['link', '2'] :
        ({ 'cut-josin': ['cut', '0'], 'c1-wish': ['wish', '1'], 'c3-staff': ['waking', '3'],
          'c4-journal': ['journal', '4'], 'c5-dialogue': ['interp', '5'], 'c5-ordination': ['cut', '5'], 'r-result': ['result', 'R'] })[s.id] || ['scene', (s.id.match(/^c([13])-/) || [])[1]];
      if (s.kind !== expected[0] || String(s.ch) !== expected[1]) issue('kind-chapter', s.id);
    }
    const awake = scenes.filter((s) => s && s.awakened === true);
    if (awake.length !== 1 || awake[0].id !== 'c3-awake') issue('awakened', 'c3-awake');
    if (!fixture && (meets.size !== 8 || bonds.length !== 8 || bondIds.size !== 8)) issue('bond-count', 'bonds');
    function hasGrade(value) {
      return object(value) && Object.entries(value).some(([k, v]) => /^(grade|grades|gradeText|shine|fine|near)$/.test(k) || hasGrade(v) || (Array.isArray(v) && v.some(hasGrade)));
    }
    for (const b of bonds) {
      if (!object(b)) { issue('bond', 'invalid'); continue; }
      if (['fills', 'wish', 'abil', 'res', 'reward'].some((k) => k in b)) issue('bond-fill', b.id);
      if (hasGrade(b)) issue('bond-grade', b.id);
    }
    function inspect(value, id) {
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'orig') || value.passageKind === 'orig') issue('unverified-original', id);
      for (const [key, child] of Object.entries(value)) inspect(child, id + '.' + key);
    }
    inspect(d.scenes, 'scenes');
    inspect(d.interp, 'interp');
    for (const q of array(d.board)) {
      if (!q) { issue('board', 'invalid'); continue; }
      if (!/^sq-/.test(q.id) || !['office', 'place'].includes(q.kind) || q.fall || q.down) issue('board', q.id);
      checkFills(q.fills, q.id);
    }
    for (const p of array((d.journal || {}).pairs)) {
      if (!p || !p.evidence || p.scored === false || bondIds.has(p.event)) issue('journal-pair', p && p.id);
    }
    const io = array((d.interp || {}).options);
    if (io.length !== 4) issue('interp-options', io.length);
    const story = G.storyText(d);
    if (story.count > 4400) issue('story-limit', story.count);
    const evidence = array((d.interp || {}).evidence);
    if (evidence.length !== 10) issue('evidence-count', evidence.length);
    for (const e of evidence) if (!e || typeof e.text !== 'string' || !e.text.trim() || !story.texts.some((text) => text.includes(plain(e.text)))) issue('evidence', e && e.id);
    return out;
  };
  G.CH = CH;
})();
