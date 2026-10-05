'use strict';
// 내용 데이터 불러오기와 점검
//  - 보통은 js/data/*.js(내용 파일, 형식은 js/data/README.md)를 읽는다. 파일이 없으면 없는 대로 넘어간다.
//  - 주소에 ?fixture=1 을 붙이면 js/data/ 대신 tests/fixtures/stub.js(임시 데이터)만 읽는다.
//    ?fixture=이름 이면 tests/fixtures/이름.js 를 읽는다(점검용).
//  - 데이터 파일은 모두 window.GUUN 아래에 제 몫을 적는다. 예: (window.GUUN = window.GUUN || {}).scenes = [...]
// <script> 태그로 읽으므로 index.html을 파일로 바로 열어도(file://) 동작한다.
(function () {
  const FILES = ['people', 'chapters', 'board', 'scenes', 'wishes', 'bonds', 'house', 'journal', 'interp', 'notes', 'bgm', 'sprites', 'maps', 'experiences'];
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
      maps: src.maps || [],
      experiences: src.experiences || [],
    });
    const fixtureProfiles = { 'world-opening': 'world-opening', 'world-event': 'world-event', 'rpg-opening': 'rpg-opening', 'rpg-waking': 'rpg-waking', 'rpg-front': 'rpg-front' };
    const profile = D.fixture ? fixtureProfiles[D.fixture] || 'fixture' : 'production';
    D.problems = G.checkData(D, { profile });
    D.ok = D.scenes.length > 0 && D.missing.length === 0 && D.problems.length === 0;
    for (const p of D.problems) console.warn('[데이터]', p);
    return D;
  };

  const CH = ['0', '1', '2', '3', '4', '5', 'R'];
  const WORLD_PROFILES = {
    'world-opening': { scenes: ['c1-bridge', 'c1-cell', 'c3-awake'], experiences: ['c1-bridge', 'c1-cell', 'c3-awake'] },
    'world-event': { scenes: ['e04-exam', 'e08-wonsu'], experiences: ['e04-exam', 'e08-wonsu'] },
    'rpg-opening': { scenes: ['c1-bridge', 'c1-cell', 'c1-wish', 'c1-exile', 'c1-rebirth', 'e01-huayin'], experiences: ['c1-bridge', 'c1-cell', 'c1-exile', 'e01-huayin'] },
    'rpg-waking': { scenes: ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake'], experiences: ['c3-feast', 'c3-monk', 'c3-staff', 'c3-awake'] },
    'rpg-front': { scenes: ['c1-bridge','c1-cell','c1-wish','c1-exile','c1-rebirth','e01-huayin','l-namjeon','e02-tianjin','e03-geomungo','e04-exam','e05-chunun','l-hebei','e06-gyeonghong','e07-tungso','l-bongnae'], experiences: ['c1-bridge','c1-cell','c1-exile','e01-huayin','l-namjeon','e02-tianjin','e03-geomungo','e04-exam','e05-chunun','l-hebei','e06-gyeonghong','e07-tungso','l-bongnae'] },
  };
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
      const counted = ['event', 'link', 'cut', 'waking', 'wish'].includes(s.kind) ||
        (['scene', 'interp'].includes(s.kind) && ['1', '3', '5'].includes(String(s.ch)));
      if (!counted) {
        const refs = new Set(array(d.experiences).filter((e) => e?.scene === s.id)
          .flatMap((e) => [...array(e.beats), ...array(e.optional)].flatMap((b) => array(b?.lines))));
        for (const index of refs) texts.push(...lines(array(s.lines)[index]));
      }
    }
    const interp = d.interp || {};
    for (const key of ['dialogue', 'lastWords', 'ending']) texts.push(...lines(interp[key]));
    return { texts, count: texts.reduce((n, text) => n + (text.match(/[가-힣]/g) || []).length, 0) };
  };
  G.checkData = function (d = D, options = {}) {
    const out = [];
    const issue = (code, id) => out.push(code + ': ' + id);
    const fixture = options.profile === 'fixture';
    if (options.profile && !['fixture', 'production', ...Object.keys(WORLD_PROFILES)].includes(options.profile)) issue('profile', options.profile);
    if (Object.hasOwn(WORLD_PROFILES, options.profile || '')) return G.checkWorldData(d, options);
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
        if ('preview' in s && (typeof s.preview !== 'string' || !s.preview.trim())) issue('preview', s.id);
        if ('clues' in s && (!array(s.clues).length || array(s.clues).some((c) => typeof c !== 'string' || !c.trim() || !String(s.preview).includes(c)))) issue('clue', s.id);
        if ('core' in s && (!Array.isArray(s.core) || s.core.length < 1 || s.core.length > 2 || new Set(s.core).size !== s.core.length || s.core.some((k) => !ABIL.includes(k)))) issue('core', s.id);
        if ('core' in s && !fixture && index < CORES.length && JSON.stringify(array(s.core).slice().sort()) !== JSON.stringify(CORES[index].slice().sort())) issue('core-canon', s.id);
        if (!fixture && Boolean(s.meet) !== MEETS.includes(index + 1)) issue('meet-order', s.id);
        if (!s.bgm || !Array.isArray(s.items)) issue('event-fields', s.id);
        if (!array(s.lines).length) issue('event-lines', s.id);
        for (const grade of GRADES) {
          const text = (s.gradeText || {})[grade];
          if (!('gradeText' in s)) continue;
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
    out.push(...G.checkWorldData(d, options));
    return out;
  };
  G.checkWorldData = function (d = D, options = {}) {
    const out = [...G.checkSprites(d.sprites || {})], issue = (code, id) => out.push(code + ': ' + id);
    const profile = options.profile || 'production';
    const partial = Object.hasOwn(WORLD_PROFILES, profile);
    if (!['production', 'fixture', ...Object.keys(WORLD_PROFILES)].includes(profile)) issue('profile', profile);
    const scenes = array(d.scenes), maps = array(d.maps), experiences = array(d.experiences);
    const sceneById = new Map(scenes.filter(object).map((s) => [s.id, s]));
    const mapById = new Map(), experienceById = new Map();
    if (!Array.isArray(d.maps) || !maps.length) issue('maps-missing', 'maps');
    if (!Array.isArray(d.experiences) || !experiences.length) issue('experiences-missing', 'experiences');
    if (!G.world) { issue('world-module', 'G.world'); return out; }
    const identifiers = (id) => typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id);
    const assets = new Set([...scenes.flatMap((s) => s ? [s.img, ...array(s.timeline).map((f) => f?.img),
      ...array(s.items).concat(array(s.bonus?.items)).map((i) => i?.img)] : []),
      ...Object.keys(d.sprites || {}), ...Object.values(d.people || {}).map((p) => p?.face),
      ...array(d.house?.stages).map((s) => s?.img)].filter(Boolean));
    const asset = (id) => typeof id === 'string' && (assets.has(id) || ['fixture', 'world-opening', 'world-event'].includes(profile) && id === 'placeholder');
    for (const map of maps) {
      if (!object(map) || !identifiers(map.id)) { issue('map-id', map?.id); continue; }
      if (mapById.has(map.id)) issue('map-duplicate', map.id);
      mapById.set(map.id, map);
      if (![map.width, map.height, map.tile].every((n) => Number.isSafeInteger(n) && n > 0)) issue('map-size', map.id);
      if (!Array.isArray(map.walk) || map.walk.length !== map.height || [...map.walk].some((row) => !Array.isArray(row) ||
          row.length !== map.width || [...row].some((v) => v !== 0 && v !== 1))) issue('map-walk', map.id);
      if (!asset(map.art)) issue('map-art', map.id);
      if (!Array.isArray(map.objects)) issue('map-objects', map.id);
      const seen = new Set();
      for (const o of array(map.objects)) {
        if (!object(o) || !identifiers(o.id)) { issue('object-id', map.id); continue; }
        if (seen.has(o.id)) issue('object-duplicate', map.id + '/' + o.id); seen.add(o.id);
        if (!Number.isInteger(o.x) || !Number.isInteger(o.y) || o.x < 0 || o.y < 0 || o.x >= map.width || o.y >= map.height) issue('object-position', o.id);
        if (!['npc', 'item', 'scenery', 'exit', 'pearl'].includes(o.kind) || typeof o.solid !== 'boolean' ||
            typeof o.label !== 'string' || !o.label.trim() || !(o.action === null || identifiers(o.action))) issue('object-fields', o.id);
        if (!Array.isArray(o.visibleAt) || o.visibleAt.some((v) => typeof v !== 'string' || !/^[a-z0-9-]+:[a-z0-9-]+$/.test(v))) issue('object-visible', o.id);
        if (o.person != null && !Object.hasOwn(d.people || {}, o.person)) issue('object-person', o.id);
        if (o.sprite != null && !asset(o.sprite)) issue('object-sprite', o.id);
      }
    }
    for (const e of experiences) {
      if (!object(e) || !sceneById.has(e.scene)) { issue('experience-scene', e?.scene); continue; }
      if (experienceById.has(e.scene)) issue('experience-duplicate', e.scene);
      experienceById.set(e.scene, e);
      if (!['seongjin', 'yang'].includes(e.actor)) issue('experience-actor', e.scene);
      if (!mapById.has(e.map)) issue('experience-map', e.scene);
      if (!Array.isArray(e.beats) || !e.beats.length || !Array.isArray(e.optional)) { issue('experience-actions', e.scene); continue; }
      const seen = new Set();
      for (const b of [...e.beats, ...e.optional]) {
        if (!object(b) || !identifiers(b.id)) { issue('action-id', e.scene); continue; }
        if (seen.has(b.id)) issue('action-duplicate', e.scene + '/' + b.id); seen.add(b.id);
        if (!object(b.trigger) || !['inspect', 'talk', 'use', 'exit', 'continue', 'staff'].includes(b.trigger.kind) ||
            !(b.trigger.target === null || identifiers(b.trigger.target))) issue('action-trigger', e.scene + '/' + b.id);
        if (!Array.isArray(b.lines) || b.lines.some((i) => !Number.isInteger(i) || i < 0 || i >= array(sceneById.get(e.scene).lines).length)) issue('action-lines', e.scene + '/' + b.id);
        if (Object.keys(b).some((k) => !['id', 'trigger', 'lines', 'effects', 'map', 'spawn', 'appearance'].includes(k))) issue('action-field', e.scene + '/' + b.id);
        if (b.map != null && !mapById.has(b.map) || b.map != null && !b.spawn) issue('action-map', e.scene + '/' + b.id);
        if (b.appearance != null && !asset(b.appearance)) issue('action-appearance', e.scene + '/' + b.id);
        if (e.optional.includes(b) && (b.map != null || b.spawn != null || b.trigger?.kind === 'exit' || b.trigger?.kind === 'staff')) issue('optional-transition', b.id);
        if (b.trigger?.kind === 'staff' && (e.scene !== 'c3-staff' || b.trigger.target !== null || b !== e.beats[e.beats.length - 1])) issue('staff-action', e.scene);
        if (!Array.isArray(b.effects)) issue('action-effects', b.id);
        for (const effect of array(b.effects)) {
          const kind = effect?.kind, id = effect?.id;
          if (!object(effect) || !['item', 'bond', 'pearl', 'story', 'none'].includes(kind) ||
              Object.keys(effect).some((k) => !['kind', 'id'].includes(k))) { issue('effect-fields', b.id); continue; }
          const scene = sceneById.get(e.scene);
          if (kind === 'none' ? id !== null : typeof id !== 'string' || !id) issue('effect-id', b.id);
          if (kind === 'item' && !array(scene.items).concat(array(scene.bonus?.items)).some((i) => i?.id === id)) issue('effect-item', b.id);
          if (['bond', 'pearl'].includes(kind) && (scene.meet !== id || !array(d.bonds).some((v) => v?.id === id))) issue('effect-bond', b.id);
          if (kind === 'pearl' && !e.optional.includes(b)) issue('pearl-required', b.id);
          if (kind === 'story' && !id.startsWith(e.scene + ':')) issue('effect-story', b.id);
          if (e.optional.includes(b) && ['item', 'bond', 'story'].includes(kind)) issue('optional-reward', b.id);
        }
      }
    }
    for (const e of experiences.filter((e) => object(e) && Array.isArray(e.beats) && Array.isArray(e.optional))) {
      const scene = sceneById.get(e.scene); if (!scene) continue;
      let from = e.spawn;
      for (const [index, beat] of e.beats.entries()) {
        if (!object(beat) || !object(beat.trigger)) continue;
        const stage = G.world.stage(d, e.scene, beat.id);
        if (!stage) continue;
        for (const o of G.world.objects(stage.map, e.scene, beat.id)) {
          if (o.action === null) continue;
          const action = [...e.beats, ...e.optional].find((b) => b?.id === o.action && b.trigger?.target === o.id);
          if (!action || e.beats.includes(action) && G.world.stage(d, e.scene, action.id)?.map.id !== stage.map.id) {
            issue('visible-action', e.scene + ':' + beat.id + '/' + stage.map.id + '/' + o.id);
          }
        }
        if (index === 0 || beat.map || beat.spawn) from = stage.spawn;
        if (!object(stage.spawn) || !Object.hasOwn(G.world.directions, stage.spawn.facing) ||
            !G.world.walkable(stage.map, stage.spawn.x, stage.spawn.y, e.scene, beat.id)) { issue('experience-spawn', e.scene + '/' + beat.id); continue; }
        const target = array(stage.map.objects).find((o) => o?.id === beat.trigger.target);
        if (['continue', 'staff'].includes(beat.trigger.kind)) {
          if (beat.trigger.target !== null) issue('action-target', beat.id);
        } else if (!target || target.action !== beat.id || !G.world.visible(target, e.scene, beat.id)) issue('action-target', e.scene + '/' + beat.id);
        else {
          const route = G.world.path(stage.map, from, target, e.scene, beat.id);
          if (!route) issue('action-path', e.scene + '/' + beat.id);
          else from = route[route.length - 1];
          if (beat.trigger.kind === 'exit' && (target.kind !== 'exit' || index < e.beats.length - 1 && !e.beats[index + 1]?.map)) issue('exit-order', beat.id);
          if (beat.trigger.kind === 'talk' && target.kind !== 'npc') issue('talk-target', beat.id);
        }
        for (const optional of e.optional) {
          const o = array(stage.map.objects).find((o) => o?.id === optional.trigger?.target);
          if (o && G.world.visible(o, e.scene, beat.id)) {
            if (o.action !== optional.id || !G.world.path(stage.map, from, o, e.scene, beat.id)) issue('optional-path', optional.id);
            if (array(optional.effects).some((v) => v?.kind === 'pearl') && o.kind !== 'pearl') issue('pearl-object', optional.id);
          }
        }
      }
      for (const b of e.optional) if (!e.beats.some((beat) => {
        const stage = G.world.stage(d, e.scene, beat.id);
        return stage && array(stage.map.objects).some((o) => o?.id === b.trigger?.target && G.world.visible(o, e.scene, beat.id));
      })) issue('optional-target', e.scene + '/' + b.id);
    }
    for (const map of maps.filter(object)) for (const o of array(map.objects).filter(object)) {
      for (const value of array(o.visibleAt)) {
        const [scene, beat] = String(value).split(':');
        const e = experienceById.get(scene), b = e && array(e.beats).find((b) => b?.id === beat);
        const stage = b && G.world.stage(d, scene, beat);
        if (!stage || stage.map.id !== map.id) issue('visibility-reference', map.id + '/' + o.id + '/' + value);
      }
      if (o.action !== null && !experiences.some((e) => [...array(e?.beats), ...array(e?.optional)].some((b) => b?.id === o.action && b.trigger?.target === o.id) &&
          array(e?.beats).some((b) => G.world.stage(d, e.scene, b?.id)?.map.id === map.id))) issue('object-action', map.id + '/' + o.id);
    }
    for (const stage of array(d.house?.stages).filter(object)) {
      if (!Object.hasOwn(stage, 'fromStory')) continue;
      const effects = array(experienceById.get(stage.from)?.beats).flatMap(beat => array(beat?.effects));
      if (typeof stage.fromStory !== 'string' || !effects.some(effect => effect?.kind === 'story' && effect.id === stage.fromStory)) issue('house-story', stage.id);
    }
    const required = partial ? WORLD_PROFILES[profile].experiences :
      scenes.filter((s) => s && ['scene', 'event', 'link'].includes(s.kind) && s.id !== 'c1-rebirth').map((s) => s.id);
    if (partial && JSON.stringify(scenes.map((s) => s?.id)) !== JSON.stringify(WORLD_PROFILES[profile].scenes)) issue('profile-scenes', profile);
    for (const id of required) if (!experienceById.has(id)) issue('experience-missing', id);
    if (['rpg-opening', 'rpg-waking', 'rpg-front'].includes(profile)) {
      for (const scene of scenes) {
        const kind = scene?.id === 'c1-wish' ? 'wish' : scene?.id === 'c3-staff' ? 'waking' : /^e\d{2}-/.test(scene?.id) ? 'event' : /^l-/.test(scene?.id) ? 'link' : 'scene';
        const chapter = profile === 'rpg-waking' ? '3' : /^e\d{2}-|^l-/.test(scene?.id) ? '2' : '1';
        if (scene?.kind !== kind || String(scene?.ch) !== chapter) issue('kind-chapter', scene?.id);
      }
      if (profile === 'rpg-waking' && array(experienceById.get('c3-staff')?.beats).filter(b => b?.trigger?.kind === 'staff').length !== 1) issue('staff-action', 'c3-staff');
    }
    if (!partial && profile === 'production') {
      const canon = ['e01-huayin', 'e02-tianjin', 'e03-geomungo', 'e04-exam', 'e05-chunun', 'e06-gyeonghong', 'e07-tungso', 'e08-wonsu', 'e09-yoyeon', 'e10-neungpa', 'e11-seungsang', 'e12-honrye'];
      if (JSON.stringify(scenes.filter((s) => s?.kind === 'event').map((s) => s.id)) !== JSON.stringify(canon)) issue('event-ids', 'scenes');
      if (scenes.filter((s) => s && !s.optional).length !== 28) issue('unit-count', 'scenes');
      const effects = (id) => array(experienceById.get(id)?.beats).flatMap((b) => array(b?.effects));
      for (const [scene, kind, id] of [
        ['e08-wonsu', 'story', 'e08-wonsu:appointment'], ['e11-seungsang', 'story', 'e11-seungsang:appointment'],
        ['e11-seungsang', 'story', 'e11-seungsang:portrait'], ['l-namjeon', 'item', 'it-geomungo'],
        ['l-namjeon', 'item', 'it-tungso'], ['e12-honrye', 'item', 'it-girinpo'],
      ]) if (!effects(scene).some((v) => v?.kind === kind && v.id === id)) issue('wish-fact-missing', scene + '/' + id);
      for (const scene of scenes.filter((s) => s?.meet)) {
        const e = experienceById.get(scene.id);
        if (!effects(scene.id).some((v) => v?.kind === 'bond' && v.id === scene.meet)) issue('bond-effect-missing', scene.id);
        if (!array(e?.optional).some((b) => array(b?.effects).some((v) => v?.kind === 'pearl' && v.id === scene.meet))) issue('pearl-effect-missing', scene.id);
      }
    }
    if (profile !== 'world-event') {
      for (const id of ['c1-cell', 'c3-awake']) if (experienceById.has(id) && experienceById.get(id).map !== 'map-cell') issue('same-cell', id);
    }
    function original(v) {
      if (!v || typeof v !== 'object') return;
      if (Object.hasOwn(v, 'orig') || v.passageKind === 'orig') issue('unverified-original', 'world');
      for (const child of Object.values(v)) original(child);
    }
    original(d.maps); original(d.experiences);
    if (partial) original(d.scenes);
    if (G.storyText(d).count > 4400) issue('story-limit', G.storyText(d).count);
    return out;
  };
  G.checkSprites = function (sprites) {
    const out = [], issue = (code, id) => out.push(code + ': ' + id);
    if (!object(sprites)) return ['sprites: invalid'];
    for (const [id, meta] of Object.entries(sprites)) {
      if (!object(meta) || typeof meta.src !== 'string' || !/^assets\/[a-zA-Z0-9_./-]+\.(webp|png)$/.test(meta.src) ||
          meta.src.split('/').includes('..') || !['width', 'height', 'frames', 'rows'].every((k) => Number.isSafeInteger(meta[k]) && meta[k] > 0)) {
        issue('sprite-meta', id); continue;
      }
      const extended = ['cell', 'anchor', 'directions'].some((k) => Object.hasOwn(meta, k));
      if (!extended) continue;
      if (!object(meta.cell) || meta.cell.width !== meta.width || meta.cell.height !== meta.height) issue('sprite-cell', id);
      if (!object(meta.anchor) || !['x', 'y'].every((k) => Number.isFinite(meta.anchor[k]) && meta.anchor[k] >= 0 &&
          meta.anchor[k] <= (k === 'x' ? meta.width : meta.height))) issue('sprite-anchor', id);
      if (!object(meta.directions) || JSON.stringify(Object.keys(meta.directions).sort()) !== JSON.stringify(['down', 'left', 'right', 'up'])) {
        issue('sprite-directions', id); continue;
      }
      const frame = (v) => Number.isInteger(v) && v >= 0 && v < meta.frames;
      for (const [direction, value] of Object.entries(meta.directions)) {
        if (!object(value) || !Number.isInteger(value.row) || value.row < 0 || value.row >= meta.rows ||
            !frame(value.stand) || !Array.isArray(value.walk) || !value.walk.length || value.walk.some((v) => !frame(v))) issue('sprite-direction', id + '/' + direction);
      }
    }
    return out;
  };
  G.CH = CH;
})();
