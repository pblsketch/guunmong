'use strict';
// 학생 기록은 기존 v2 열쇠 하나에만 저장한다.
(function () {
  const BASE_KEY = 'guunmong-v2';
  const SETTINGS = ['music', 'sound', 'big', 'teacher'];
  const ACTIVITIES = ['a-wish', 'j-match'];
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
  const fresh = () => ({
    v: 2, music: true, sound: true, big: false, teacher: false,
    started: false, pos: null, step: 'preview', reach: 0, done: {}, awake: false, awakeAt: 0,
    abil: { munjang: 0, eumak: 0, muye: 0, jiryak: 0 }, res: { gong: 0, fame: 0, wealth: 0 }, best: 0, events: {},
    ledger: {}, wrong: [], items: [], bonds: [], pearls: {}, seenFiction: {}, journal: {}, interp: {},
    name: '', startedAt: 0, finishedAt: 0, rpg: null,
  });
  let S = freeze(fresh()), KEY = BASE_KEY, access = 'acquiring', failure = null;
  let generation = 0, heldRelease = null, requestPromise = null, readyResolve = null, lockTask = null;
  const listeners = new Set();
  const data = () => G.data || {};
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
    if (!G.experience || !G.world) { failure = 'modules'; return null; }
    const state = fresh();
    try {
      const raw = localStorage.getItem(KEY), saved = raw && JSON.parse(raw);
      if (saved && saved.v !== 2) throw Error('invalid-version');
      if (saved) {
        for (const key of Object.keys(state)) {
          const value = saved[key];
          if (value === undefined || key === 'v' || key === 'rpg') continue;
          if (Array.isArray(state[key])) { if (Array.isArray(value)) state[key] = clone(value); }
          else if (object(state[key])) { if (object(value)) state[key] = { ...state[key], ...clone(value) }; }
          else if (typeof value === typeof state[key] || (key === 'pos' && typeof value === 'string')) state[key] = value;
        }
        state.rpg = Object.hasOwn(saved, 'rpg') ? (saved.rpg === null ? { run: null } : clone(saved.rpg)) : null;
        state.ledger = Object.fromEntries(Object.entries(state.ledger).filter(([id]) => ACTIVITIES.includes(id)));
      }
      if (rejectData()) return null;
      if (S.awake && G.experience.runValid(state.rpg?.run) && state.rpg.run === S.rpg?.run) {
        state.awake = true; state.awakeAt = S.awakeAt;
      }
      state.rpg = G.experience.normalize(state, data());
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
  const WAKE_COMMIT = Symbol('wake-commit');
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
    if (next.v !== 2 || next.rpg?.run !== run || next.rpg?.v !== 1) return false;
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
    for (const key of ['abil', 'res', 'best', 'events']) if (!sameStructure(next[key], S[key])) return false;
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
    let outcome;
    const ok = transaction(options.run, (next) => {
      outcome = G.experience.apply(next, data(), sceneId, actionId, options, staff);
      if (!outcome.ok) return false;
      if (staff) {
        if (sceneId !== 'c3-staff' || next.awake) return false;
        next.awake = true; next.awakeAt = Date.now(); next.pos = 'c3-awake'; next.done[sceneId] = true;
        next.rpg.scenes[sceneId].status = 'done'; next.rpg.cursor = G.experience.cursor(data(), next.pos, G.experience.find(data(), next.pos)?.beats[0]?.id);
      }
    }, options, staff ? WAKE_COMMIT : undefined);
    return ok ? { ok: true, reason: null, record: S.rpg.scenes[sceneId] } :
      { ok: false, reason: outcome?.reason || 'unavailable', record: S.rpg?.scenes?.[sceneId] || null };
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
      const next = fresh(); for (const key of SETTINGS) next[key] = S[key];
      const newRun = globalThis.crypto?.randomUUID?.();
      if (!newRun) return false;
      next.rpg = { v: 1, run: newRun, cursor: null, scenes: {} };
      if (!persist(next)) return false;
      S = freeze(next); failure = null; emit('reset'); return true;
    },
    applyExperience(sceneId, actionId, options) { return actionResult(sceneId, actionId, options); },
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
          if (!e || next.rpg.scenes[scene.id] || Object.hasOwn(next.events, scene.id) || next.done[scene.id]) continue;
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
    // 구판 육성 호출을 새 수행으로 바꾸지 않는다. 화면 연결은 이 호출들을 제거해야 한다.
    prepare() { return false; }, finishEvent() { return false; }, peekEvent() { return false; },
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
