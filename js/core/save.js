'use strict';
// 학생 기록은 v3 열쇠 하나에만 저장한다. v2·v1은 고치거나 지우지 않는다.
(function () {
  const BASE_KEY = 'guunmong-v3', OLD_KEY = 'guunmong-v2';
  // v2에서 가져오는 설정은 넷이다. 목소리(voice)는 v3에서 생겨 기록 지우기 때만 함께 남긴다.
  const SETTINGS = ['music', 'sound', 'big', 'teacher'], KEPT = [...SETTINGS, 'voice'];
  const ACTIVITIES = ['a-wish', 'j-match'];
  // 드러난 소원 넷. 최고값의 한도는 G.play.MAX(js/core/play.js)를 쓴다.
  const WISHES = ['chuljang', 'bugwi', 'pungryu', 'gongmyeong'];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function sameStructure(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a) && a.length !== b.length) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameStructure(a[key], b[key]));
  }
  function freeze(v) {
    if (v && typeof v === 'object') { for (const child of Object.values(v)) freeze(child); Object.freeze(v); }
    return v;
  }
  const freshPlay = () => ({ secretWish: null, choices: {}, firsts: {}, peak: Object.fromEntries(WISHES.map((id) => [id, 0])) });
  const fresh = () => ({
    v: 3, music: true, sound: true, voice: true, big: false, teacher: false,
    started: false, pos: null, step: 'preview', reach: 0, done: {}, awake: false, awakeAt: 0,
    ledger: {}, wrong: [], items: [], bonds: [], pearls: {}, seenFiction: {}, journal: {}, interp: {},
    name: '', startedAt: 0, finishedAt: 0, rpg: null, play: freshPlay(),
  });
  let S = freeze(fresh()), KEY = BASE_KEY, access = 'acquiring', failure = null;
  let generation = 0, heldRelease = null, requestPromise = null, readyResolve = null, lockTask = null;
  const listeners = new Set();
  const data = () => G.data || {};
  // play 안에는 실제 도전 자료에 있는 자리·선택지·도전·곳과 정해진 범위의 값만 남긴다.
  function cleanPlay(value) {
    const result = freshPlay();
    if (!object(value)) return result;
    const list = Array.isArray(data().challenges) ? data().challenges.filter(object) : [];
    if (WISHES.includes(value.secretWish)) result.secretWish = value.secretWish;
    if (object(value.choices)) for (const [id, pick] of Object.entries(value.choices)) {
      const site = list.find((c) => c.id === id && Array.isArray(c.options) && c.options.some((o) => Array.isArray(o?.wish)));
      if (site && object(pick) && site.options.some((o) => o?.id === pick.option)) result.choices[id] = { option: pick.option };
    }
    if (object(value.firsts)) for (const [id, first] of Object.entries(value.firsts)) {
      const c = list.find((c) => c.id === id && c.kind !== 'talk');
      if (!c || !object(first) || !(first.ok === true || first.ok === false || first.ok === null && c.kind === 'search')) continue;
      const entry = { ok: first.ok };
      if (c.kind === 'deduce' && Number.isInteger(first.clues) && first.clues >= 0 && first.clues <= (Array.isArray(c.clues) ? c.clues.length : 0)) entry.clues = first.clues;
      if (c.kind === 'search' && Array.isArray(first.tried)) {
        const spots = (Array.isArray(c.spots) ? c.spots : []).map((spot) => spot?.id);
        entry.tried = first.tried.filter((spot, index) => typeof spot === 'string' && spots.includes(spot) && first.tried.indexOf(spot) === index);
      }
      result.firsts[id] = entry;
    }
    if (object(value.peak)) for (const id of WISHES) {
      const n = value.peak[id];
      if (Number.isInteger(n) && n >= 0 && n <= G.play.MAX) result.peak[id] = n;
    }
    return result;
  }
  // v3가 없을 때만 v2를 읽어 설정 넷을 가져온다. v2 자체는 바꾸지 않는다.
  function oldSettings(state) {
    try {
      const raw = localStorage.getItem(KEY.replace(BASE_KEY, OLD_KEY)), old = raw && JSON.parse(raw);
      if (object(old)) for (const key of SETTINGS) if (typeof old[key] === 'boolean') state[key] = old[key];
    } catch (error) { /* 깨진 v2는 기본값 */ }
  }
  function emit(reason) { for (const fn of listeners) { try { fn(reason); } catch (error) { console.error(error); } } }
  function revokeWriter() {
    generation++;
    if (heldRelease) heldRelease(); heldRelease = null;
    if (readyResolve) readyResolve(false); readyResolve = null;
    requestPromise = null;
  }
  function rejectData() {
    if (data().ok !== false) return false;
    if (access !== 'unavailable' || failure !== 'data-not-ready' || heldRelease || requestPromise) {
      revokeWriter(); access = 'unavailable'; failure = 'data-not-ready'; emit('access');
    }
    return true;
  }
  function read() {
    if (rejectData()) return null;
    if (!G.experience || !G.world || !G.play) { failure = 'modules'; return null; }
    const state = fresh();
    try {
      const raw = localStorage.getItem(KEY), saved = raw === null ? null : JSON.parse(raw);
      if (raw !== null && (!object(saved) || saved.v !== 3)) throw Error('invalid-version');
      if (!saved) oldSettings(state);
      if (saved) {
        for (const key of Object.keys(state)) {
          const value = saved[key];
          if (value === undefined || key === 'v' || key === 'rpg' || key === 'play') continue;
          if (Array.isArray(state[key])) { if (Array.isArray(value)) state[key] = clone(value); }
          else if (object(state[key])) { if (object(value)) state[key] = { ...state[key], ...clone(value) }; }
          // pos는 null 또는 문자열만 받는다(fresh의 null도 typeof 'object'라 따로 본다).
          else if (key === 'pos') { if (value === null || typeof value === 'string') state.pos = value; }
          else if (typeof value === typeof state[key]) state[key] = value;
        }
        state.rpg = Object.hasOwn(saved, 'rpg') ? (saved.rpg === null ? { run: null } : clone(saved.rpg)) : null;
        state.ledger = Object.fromEntries(Object.entries(state.ledger).filter(([id]) => ACTIVITIES.includes(id)));
        state.play = cleanPlay(saved.play);
      }
      if (rejectData()) return null;
      if (S.awake && G.experience.runValid(state.rpg?.run) && state.rpg.run === S.rpg?.run) {
        state.awake = true; state.awakeAt = S.awakeAt;
      }
      state.rpg = G.experience.normalize(state, data());
      // 체험 장면의 done은 검증된 rpg 완료와 함께일 때만 남긴다.
      for (const [id, done] of Object.entries(state.done)) {
        if (done !== true || G.experience.find(data(), id) && state.rpg?.scenes?.[id]?.status !== 'done') delete state.done[id];
      }
      if (state.started || state.awake) {
        state.pos = G.experience.resume(state, data());
        state.rpg = G.experience.normalize(state, data());
      }
      failure = state.rpg && !G.experience.runValid(state.rpg.run) ? 'invalid-run' : null;
      return state;
    } catch (error) { failure = 'storage'; return null; }
  }
  function persist(next) {
    if (rejectData()) return false;
    try { localStorage.setItem(KEY, JSON.stringify(next)); return true; }
    catch (error) { failure = 'storage'; return false; }
  }
  function guard(run, readonly = false) {
    if (rejectData()) return 'unavailable';
    if (readonly) return 'readonly';
    if (access === 'unavailable' || failure === 'invalid-run') return 'unavailable';
    if (access !== 'writer') return 'readonly';
    if (!G.experience.runValid(run) || run !== S.rpg?.run) return 'stale';
    return null;
  }
  const WAKE_COMMIT = Symbol('wake-commit'), PLAY = Symbol('play');
  // play는 전용 API(PLAY)로만 더한다. 이미 정한 고른 말·첫 결과·숨긴 소원은 누구도 바꾸지 못하고,
  // 찾기 첫 판의 헛짚은 곳은 앞에서부터 그대로 남아야 한다. 최고값은 호출자가 고치지 않는다.
  function playKept(before, after, capability) {
    if (capability !== PLAY && (!sameStructure(before.choices, after.choices) || !sameStructure(before.firsts, after.firsts) ||
        before.secretWish !== after.secretWish)) return false;
    if (!sameStructure(before.peak, after.peak)) return false;
    if (before.secretWish !== null && after.secretWish !== before.secretWish) return false;
    for (const [id, pick] of Object.entries(before.choices)) if (!sameStructure(pick, after.choices[id])) return false;
    for (const [id, first] of Object.entries(before.firsts)) {
      const next = after.firsts[id];
      if (!next) return false;
      if (first.ok !== null ? !sameStructure(first, next) : !(first.tried || []).every((spot, index) => next.tried?.[index] === spot)) return false;
    }
    return true;
  }
  function transaction(run, change, options = {}, capability) {
    if (guard(run, options.readonly) || typeof change !== 'function') return false;
    const next = clone(S);
    if (change(next) === false) return false;
    if (rejectData()) return false;
    const schema = fresh();
    if (Object.keys(next).length !== Object.keys(schema).length || Object.keys(schema).some((key) => !Object.hasOwn(next, key))) return false;
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'rpg' || key === 'pos') continue;
      if (Array.isArray(value) ? !Array.isArray(next[key]) : object(value) ? !object(next[key]) : typeof next[key] !== typeof value) return false;
    }
    if (!(next.pos === null || typeof next.pos === 'string')) return false;
    if (next.v !== 3 || next.rpg?.run !== run || next.rpg?.v !== 1) return false;
    if (!object(next.play) || !['peak', 'choices', 'firsts'].every((key) => object(next.play[key])) || !playKept(S.play, next.play, capability)) return false;
    if (!S.awake && next.awake) {
      const staff = G.experience.find(data(), 'c3-staff')?.beats.find(beat => beat.trigger.kind === 'staff');
      const before = S.rpg.scenes['c3-staff']?.actions || [], after = next.rpg.scenes['c3-staff'];
      const cursor = G.experience.cursor(data(), 'c3-awake', G.experience.find(data(), 'c3-awake')?.beats[0]?.id);
      if (capability !== WAKE_COMMIT || S.pos !== 'c3-staff' || next.pos !== 'c3-awake' ||
          !Number.isFinite(next.awakeAt) || next.awakeAt <= 0 || next.done['c3-staff'] !== true || after?.status !== 'done' ||
          after.actions.length !== before.length + 1 || after.actions.at(-1)?.id !== staff?.id || after.actions.at(-1)?.by !== options.by ||
          !sameStructure(after.actions.slice(0, before.length), before) || !sameStructure(next.rpg.cursor, cursor)) return false;
    }
    if (S.awake) { next.awake = true; next.awakeAt = S.awakeAt; }
    if (!sameStructure(next.rpg, G.experience.normalize(next, data(), undefined, S))) return false;
    // 최고값: 깨기 전에는 이 저장의 표시값까지 올리고(원작 사실·고른 말 모두), 깨어난 뒤에는 그대로 둔다.
    const reached = G.play.values(next, data());
    for (const id of WISHES) next.play.peak[id] = S.awake ? S.play.peak[id] : Math.max(S.play.peak[id], reached[id]);
    if (!sameStructure(next.play, cleanPlay(next.play))) return false;
    for (const [id, before] of Object.entries(S.rpg.scenes)) {
      const after = next.rpg.scenes[id];
      const manualStaff = capability === WAKE_COMMIT && !S.awake && S.pos === 'c3-staff' && next.awake && next.pos === 'c3-awake' && id === 'c3-staff' && before.status === 'auto' && after?.status === 'done';
      if (!after || !sameStructure(after.actions.slice(0, before.actions.length), before.actions) ||
          before.hint === 'teacher' && after.hint !== 'teacher' || before.status !== 'active' && after.status !== before.status && !manualStaff) return false;
    }
    for (const key of ['items', 'bonds']) if (!S[key].every((id) => next[key].includes(id))) return false;
    for (const [id, found] of Object.entries(S.pearls)) if (found === true && next.pearls[id] !== true) return false;
    if (Object.keys(next.ledger).some((id) => !ACTIVITIES.includes(id))) return false;
    if (S.journal.revealed?.misaek && !next.journal.revealed?.misaek) return false;
    if (S.wrong.some((entry, index) => !sameStructure(entry, next.wrong[index]))) return false;
    for (const [id, done] of Object.entries(S.done)) if (done === true && next.done[id] !== true) return false;
    for (const id of ACTIVITIES) {
      const before = S.ledger[id], after = next.ledger[id];
      if (before?.final && !sameStructure(before, after)) return false;
      if (before && (before.first !== null && before.first !== after?.first || before.help === 'teacher' && after?.help !== 'teacher')) return false;
    }
    if (S.interp.final && !sameStructure(S.interp, next.interp)) return false;
    if (S.interp.first && !sameStructure(S.interp.first, next.interp.first)) return false;
    if (S.interp.heard && !next.interp.heard || S.interp.revised && !next.interp.revised) return false;
    if (S.interp.revised && !sameStructure(S.interp.changed, next.interp.changed)) return false;
    if (!persist(next)) return false;
    S = freeze(next); failure = null; return true;
  }
  function releaseWriter() {
    revokeWriter(); access = 'reader'; emit('access');
  }
  function acquireWriter() {
    if (rejectData()) return Promise.resolve(false);
    if (access === 'writer') return Promise.resolve(true);
    if (requestPromise) return requestPromise;
    if (!globalThis.navigator?.locks?.request) { access = 'unavailable'; emit('access'); return Promise.resolve(false); }
    access = 'acquiring'; failure = null;
    const ticket = ++generation, key = KEY;
    requestPromise = new Promise((resolve) => { readyResolve = resolve; });
    const result = requestPromise;
    const settle = (value) => { if (ticket !== generation) return; readyResolve?.(value); readyResolve = null; requestPromise = null; emit('access'); };
    const draining = lockTask;
    lockTask = Promise.resolve(draining).catch(() => {}).then(() => {
      if (ticket !== generation || rejectData()) return;
      // ifAvailable과 signal은 함께 쓸 수 없다. 대기열 없이 요청하고 취소한 세대는 즉시 돌려보낸다.
      return navigator.locks.request('guunmong-write:' + key,
      { mode: 'exclusive', ifAvailable: true }, async (lock) => {
        if (ticket !== generation || key !== KEY || rejectData()) return;
        if (!lock) { access = 'reader'; const latest = read(); if (latest) S = freeze(latest); settle(false); return; }
        const latest = read();
        if (!latest || failure) { access = 'unavailable'; if (latest) S = freeze(latest); settle(false); return; }
        if (!latest.rpg) {
          const run = globalThis.crypto?.randomUUID?.();
          if (!run) { failure = 'run-unavailable'; access = 'unavailable'; settle(false); return; }
          latest.rpg = G.experience.normalize(latest, data(), run);
        }
        if (!persist(latest)) { access = 'unavailable'; settle(false); return; }
        S = freeze(latest); failure = null;
        const lifetime = new Promise((resolve) => { heldRelease = resolve; });
        access = 'writer'; settle(true);
        await lifetime;
      });
    }).catch(() => { if (ticket === generation) { access = 'unavailable'; failure = 'locks'; settle(false); } });
    return result;
  }
  function actionResult(sceneId, actionId, options, staff = false) {
    const reason = guard(options?.run, options?.readonly);
    if (reason) return { ok: false, reason, record: S.rpg?.scenes?.[sceneId] || null };
    // 생각 선택 자리의 학생 행동은 고른 말과 한 저장으로 남긴다. 선생님용·깨어난 뒤에는 고른 말을 남기지 않는다.
    const site = !staff && G.play.siteAt(data(), sceneId, actionId);
    let pick = null;
    if (site && G.play.recording(S, options.by)) {
      const invalid = G.experience.validateAction(S, data(), sceneId, actionId, options);
      if (invalid) return { ok: false, reason: invalid, record: S.rpg?.scenes?.[sceneId] || null };
      if (options.choice == null) return { ok: false, reason: 'choice', record: S.rpg?.scenes?.[sceneId] || null };
      if (!G.play.option(site, options.choice)) return { ok: false, reason: 'invalid', record: S.rpg?.scenes?.[sceneId] || null };
      if (S.play.choices[site.id]) return { ok: false, reason: 'duplicate', record: S.rpg?.scenes?.[sceneId] || null };
      pick = { site: site.id, option: options.choice };
    }
    let outcome;
    const ok = transaction(options.run, (next) => {
      outcome = G.experience.apply(next, data(), sceneId, actionId, options, staff);
      if (!outcome.ok) return false;
      if (pick) next.play.choices[pick.site] = { option: pick.option };
      if (staff) {
        if (sceneId !== 'c3-staff' || next.awake) return false;
        next.awake = true; next.awakeAt = Date.now(); next.pos = 'c3-awake'; next.done[sceneId] = true;
        next.rpg.scenes[sceneId].status = 'done'; next.rpg.cursor = G.experience.cursor(data(), next.pos, G.experience.find(data(), next.pos)?.beats[0]?.id);
      }
    }, options, staff ? WAKE_COMMIT : pick ? PLAY : undefined);
    return ok ? { ok: true, reason: null, record: S.rpg.scenes[sceneId] } :
      { ok: false, reason: outcome?.reason || 'unavailable', record: S.rpg?.scenes?.[sceneId] || null };
  }
  // 기록 API 공통 거부: 권한·회차·readonly, 선생님용, 깨어난 뒤. 형식은 js/core/play.js 머리말.
  function playReason(options) {
    const reason = guard(options?.run, options?.readonly);
    if (reason) return reason;
    if (!['student', 'teacher'].includes(options.by)) return 'invalid';
    if (S.teacher || options.by === 'teacher') return 'teacher';
    if (S.awake) return 'awake';
    return null;
  }
  function recordFirst(id, input, options) {
    const refuse = (reason) => ({ ok: false, reason, first: S.play?.firsts?.[id] || null });
    const reason = playReason(options);
    if (reason) return refuse(reason);
    const c = G.play.challenge(data(), id), e = c && G.experience.find(data(), c.scene);
    if (!c || c.kind === 'talk' || !e) return refuse('invalid');
    const rec = S.rpg.scenes[c.scene];
    if (rec?.status === 'auto') return refuse('auto');
    // 지금 장면의 지금 필수 단계에서만 첫 판가름을 받는다(다시 읽기·지난 장면은 기록하지 않는다).
    if (S.pos !== c.scene || S.done[c.scene] === true || G.experience.locked(S, data(), c.scene) ||
        rec && rec.status !== 'active' || (rec ? rec.beat : e.beats[0]?.id) !== c.beat) return refuse('blocked');
    const result = G.play.decide(S, data(), id, input);
    if (result.reason) return refuse(result.reason);
    const ok = transaction(options.run, (next) => {
      next.play.firsts[id] = result.first;
      if (result.choice) next.play.choices[id] = result.choice;
    }, options, PLAY);
    return ok ? { ok: true, reason: null, first: S.play.firsts[id] } : refuse('unavailable');
  }
  function chooseSecretWish(wish, options) {
    const refuse = (reason) => ({ ok: false, reason, secretWish: S.play?.secretWish ?? null });
    const reason = playReason(options);
    if (reason) return refuse(reason);
    if (!WISHES.includes(wish)) return refuse('invalid');
    if (S.play.secretWish !== null) return refuse('decided');
    if (S.ledger['a-wish']?.final !== true) return refuse('blocked');
    const ok = transaction(options.run, (next) => { next.play.secretWish = wish; }, options, PLAY);
    return ok ? { ok: true, reason: null, secretWish: S.play.secretWish } : refuse('unavailable');
  }
  G.save = {
    get state() { return S; }, get key() { return KEY; }, get access() { return access; }, get error() { return failure; }, fresh,
    load(fixture) {
      if (rejectData()) return S;
      if (fixture !== undefined) {
        const key = fixture ? BASE_KEY + '-fixture-' + fixture : BASE_KEY;
        if (key !== KEY) { releaseWriter(); KEY = key; }
      }
      const latest = read(); if (latest) S = freeze(latest);
      if (failure) { releaseWriter(); access = 'unavailable'; emit('access'); }
      return S;
    },
    acquireWriter, releaseWriter, canWrite: (run) => !guard(run),
    write(run) { const ok = !guard(run) && persist(S); if (ok) failure = null; return ok; },
    transact: (run, change, options) => transaction(run, change, options),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset(run, options = {}) {
      if (guard(run, options.readonly) || options.confirmed !== true || typeof options.cancel !== 'function') return false;
      options.cancel();
      if (guard(run, options.readonly)) return false;
      const next = fresh(); for (const key of KEPT) next[key] = S[key];
      const newRun = globalThis.crypto?.randomUUID?.();
      if (!newRun) return false;
      next.rpg = { v: 1, run: newRun, cursor: null, scenes: {} };
      if (!persist(next)) return false;
      S = freeze(next); failure = null; emit('reset'); return true;
    },
    applyExperience(sceneId, actionId, options) { return actionResult(sceneId, actionId, options); },
    recordFirst, chooseSecretWish,
    commitWake(sceneId, actionId, options) {
      if (rejectData()) return { ok: false, reason: 'unavailable', record: S.rpg?.scenes?.[sceneId] || null };
      const b = G.experience.find(data(), sceneId)?.beats.find((b) => b.id === actionId);
      if (sceneId !== 'c3-staff' || b?.trigger.kind !== 'staff') return { ok: false, reason: 'invalid', record: null };
      return actionResult(sceneId, actionId, options, true);
    },
    beginExperience(sceneId, options) {
      if (guard(options?.run, options?.readonly) || !['student', 'teacher'].includes(options?.by)) return false;
      const e = G.experience.find(data(), sceneId);
      if (!e || S.pos !== sceneId || G.experience.locked(S, data(), sceneId) || options.by === 'teacher' && !S.teacher) return false;
      return transaction(options.run, (next) => {
        if (!next.rpg.scenes[sceneId]) next.rpg.scenes[sceneId] = G.experience.record(e);
        const rec = next.rpg.scenes[sceneId];
        if (!next.rpg.cursor || next.rpg.cursor.scene !== sceneId) next.rpg.cursor = G.experience.cursor(data(), sceneId, rec.beat);
      }, options);
    },
    finishExperience(sceneId, options) {
      const reason = guard(options?.run, options?.readonly);
      const rec = S.rpg?.scenes?.[sceneId];
      if (reason) return { ok: false, reason, record: rec || null };
      const e = G.experience.find(data(), sceneId);
      if (!e || !options || typeof options.readonly !== 'boolean' || !['student', 'teacher'].includes(options.by)) return { ok: false, reason: 'invalid', record: rec || null };
      if (G.experience.locked(S, data(), sceneId)) return { ok: false, reason: 'locked', record: rec || null };
      if (S.pos !== sceneId || !rec || rec.status === 'done' || e.beats.some((b) => b.trigger.kind === 'staff') ||
          rec.status === 'active' && G.experience.next(e, rec.actions) !== null || options.by === 'teacher' && !S.teacher) return { ok: false, reason: 'blocked', record: rec || null };
      const ok = transaction(options.run, (next) => {
        if (rec.status !== 'auto') { next.done[sceneId] = true; next.rpg.scenes[sceneId].status = 'done'; }
        const list = (data().scenes || []).filter((s) => !s.optional && s.id !== 'cut-josin');
        next.pos = list[list.findIndex((s) => s.id === sceneId) + 1]?.id || sceneId;
        const nextRecord = next.rpg.scenes[next.pos];
        next.rpg.cursor = G.experience.cursor(data(), next.pos, nextRecord ? nextRecord.beat : G.experience.find(data(), next.pos)?.beats[0]?.id);
        next.step = 'scene';
      }, options);
      return { ok, reason: ok ? null : 'unavailable', record: S.rpg.scenes[sceneId] };
    },
    move(facing, options) {
      if (guard(options?.run, options?.readonly)) return false;
      const c = S.rpg.cursor, rec = c && S.rpg.scenes[c.scene], e = c && G.experience.find(data(), c.scene);
      if (!c || c.scene !== S.pos || G.experience.locked(S, data(), c.scene) || rec && rec.status !== 'active') return false;
      const beat = rec ? rec.beat : e?.beats[0]?.id, stage = G.world.stage(data(), c.scene, beat);
      const moved = stage && G.world.move(stage.map, c, facing, c.scene, beat);
      return !!moved && transaction(options.run, (next) => { next.rpg.cursor = moved; }, options);
    },
    experienceHelp(sceneId, who, options) {
      if (!['student', 'teacher'].includes(who) || guard(options?.run, options?.readonly) || S.pos !== sceneId ||
          G.experience.locked(S, data(), sceneId) || who === 'teacher' && !S.teacher) return false;
      return transaction(options.run, (next) => {
        const rec = next.rpg.scenes[sceneId]; if (!rec || rec.status !== 'active') return false;
        rec.hint = rec.hint === 'teacher' || who === 'teacher' ? 'teacher' : 'student';
      }, options);
    },
    fillBefore(scenes, targetId, options) {
      if (!S.teacher || guard(options?.run, options?.readonly)) return false;
      const index = scenes.findIndex((s) => s.id === targetId); if (index < 0) return false;
      const added = [];
      const ok = transaction(options.run, (next) => {
        for (const scene of scenes.slice(0, index)) {
          const e = G.experience.find(data(), scene.id);
          if (!e || next.rpg.scenes[scene.id] || next.done[scene.id]) continue;
          if (!next.awake && e.beats.some(beat => beat.trigger.kind === 'staff')) continue;
          next.rpg.scenes[scene.id] = { status: 'auto', beat: null, actions: [], hint: 'teacher' }; added.push(scene.id);
        }
      }, options);
      return ok ? added : false;
    },
    ledgerTry(id, correct, options) {
      if (!ACTIVITIES.includes(id)) return false;
      return transaction(options?.run, (next) => {
        const l = next.ledger[id]; if (l?.final) return false;
        if (!l) next.ledger[id] = { first: !!correct, help: null, final: false };
        else if (l.first == null && l.help !== 'teacher') l.first = !!correct;
      }, options);
    },
    ledgerHelp(id, who, options) {
      if (!ACTIVITIES.includes(id) || !['student', 'teacher'].includes(who) || who === 'teacher' && !S.teacher) return false;
      return transaction(options?.run, (next) => {
        let l = next.ledger[id]; if (l?.final) return false;
        if (!l) l = next.ledger[id] = { first: null, help: null, final: false };
        l.help = who === 'teacher' || l.help === 'teacher' ? 'teacher' : 'student';
      }, options);
    },
    ledgerDone(id, options) {
      if (!ACTIVITIES.includes(id)) return false;
      return transaction(options?.run, (next) => { const l = next.ledger[id]; if (!l || l.final) return false; l.final = true; }, options);
    },
    wrongNote(entry, options) {
      if (!entry || !ACTIVITIES.includes(entry.act)) return false;
      return transaction(options?.run, (next) => {
        if (next.wrong.some((w) => w.act === entry.act && w.slot === entry.slot)) return false; next.wrong.push(clone(entry));
      }, options);
    },
  };
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (event) => {
      if (rejectData()) return;
      if (event.key !== KEY && event.key !== null || access === 'writer') return;
      const latest = read(); if (latest) S = freeze(latest);
      emit('storage');
    });
    window.addEventListener('pagehide', releaseWriter);
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) { releaseWriter(); if (!rejectData()) { G.save.load(); acquireWriter(); } }
    });
  }
})();
