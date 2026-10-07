'use strict';
(function () {
  const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const runValid = (v) => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
  const all = (e) => [...e.beats, ...(e.optional || [])];
  const find = (data, scene) => (data.experiences || []).find((e) => e.scene === scene);
  // 마친 진행 단위: 체험 장면은 검증된 rpg 완료, 그 밖의 장면은 done 기록으로 판정한다.
  const finished = (state, id) => state.done?.[id] === true || state.rpg?.scenes?.[id]?.status === 'done';
  const locked = (state, data, id) => {
    const scenes = data.scenes || [], boundary = scenes.findIndex((s) => s.id === 'c3-awake');
    const index = scenes.findIndex((s) => s.id === id);
    return !state.teacher && state.awake && index >= 0 && boundary >= 0 && index < boundary;
  };
  function next(e, actions) {
    return e.beats.find((b) => !actions.some((a) => a.id === b.id))?.id || null;
  }
  function record(e) { return { status: 'active', beat: e.beats[0]?.id || null, actions: [], hint: null }; }
  function cursor(data, scene, beat) {
    const stage = G.world.stage(data, scene, beat);
    return stage && G.world.walkable(stage.map, stage.spawn.x, stage.spawn.y, scene, beat) ?
      { scene, map: stage.map.id, ...stage.spawn } : null;
  }
  function normalize(state, data, newRun, previous) {
    const old = state.rpg;
    if (old == null && !newRun) return null;
    if (old != null && (!object(old) || !runValid(old.run))) return { v: 1, run: null, cursor: null, scenes: {} };
    const result = { v: 1, run: old ? old.run : newRun, cursor: null, scenes: {} };
    const validVersion = !old || old.v === 1;
    for (const e of data.experiences || []) {
      const value = validVersion && object(old?.scenes) ? old.scenes[e.scene] : null;
      if (!object(value)) continue;
      const rec = record(e);
      let valid = object(value) && Array.isArray(value.actions);
      if (valid) for (const action of value.actions) {
        const b = object(action) && all(e).find((b) => b.id === action.id);
        const stage = G.world.stage(data, e.scene, next(e, rec.actions));
        // 구슬 공개 시점이 바뀌어도 이미 저장한 수집과 필수 행동은 보존한다.
        const collectedPearl = b && (e.optional || []).includes(b) && b.effects.length === 1 &&
          b.effects[0].kind === 'pearl' && state.pearls?.[b.effects[0].id] === true &&
          (!previous || previous.rpg?.scenes[e.scene]?.actions.some(a => a.id === action.id && a.by === action.by)) &&
          stage?.map.objects.some(o => o.kind === 'pearl' && o.id === b.trigger.target && o.action === b.id);
        if (!b || !['student', 'teacher'].includes(action.by) || rec.actions.some((a) => a.id === action.id) ||
            (e.beats.includes(b) && next(e, rec.actions) !== b.id) || (b.trigger.kind === 'staff' && !state.awake) ||
            (b.trigger.target !== null && !collectedPearl && (!stage || !G.world.objects(stage.map, e.scene, next(e, rec.actions))
              .some((o) => o.id === b.trigger.target && o.action === b.id)))) { valid = false; break; }
        rec.actions.push({ id: action.id, by: action.by });
      }
      if (!valid) rec.actions = [];
      rec.beat = next(e, rec.actions);
      rec.status = rec.beat === null && value.status === 'done' ? 'done' :
        value.status === 'auto' && rec.actions.length === 0 ? 'auto' : 'active';
      if (rec.status !== 'active') rec.beat = null;
      rec.hint = ['student', 'teacher'].includes(value?.hint) ? value.hint : null;
      result.scenes[e.scene] = rec;
    }
    const rec = result.scenes[state.pos], e = find(data, state.pos);
    const beat = rec ? rec.beat : e?.beats[0]?.id;
    const stage = e && G.world.stage(data, state.pos, beat);
    const c = validVersion ? old?.cursor : null;
    if (object(c) && stage && c.scene === state.pos && c.map === stage.map.id &&
        Object.hasOwn(G.world.directions, c.facing) && G.world.walkable(stage.map, c.x, c.y, c.scene, beat)) {
      result.cursor = { scene: c.scene, map: c.map, x: c.x, y: c.y, facing: c.facing };
    } else if (!locked(state, data, state.pos)) result.cursor = e ? cursor(data, state.pos, beat) : null;
    return result;
  }
  function resume(state, data) {
    const list = (data.scenes || []).filter((s) => !s.optional && s.id !== 'cut-josin');
    if (!list.length) return state.pos;
    let index = Math.max(0, list.findIndex((s) => s.id === state.pos));
    if (state.awake) index = Math.max(index, list.findIndex((s) => s.id === 'c3-awake'));
    while (index < list.length - 1 && finished(state, list[index].id)) index++;
    const staff = list.findIndex(s => s.id === 'c3-staff');
    if (!state.awake && (list[index].ch === '3' || !state.teacher && staff >= 0 && index >= staff)) {
      const feast = list.findIndex(s => s.id === 'c3-feast');
      index = feast >= 0 ? feast : staff;
    }
    return list[Math.max(0, index)].id;
  }
  function validateAction(state, data, sceneId, actionId, options, allowStaff = false) {
    if (!options || typeof options.readonly !== 'boolean' || !['student', 'teacher'].includes(options.by)) return 'invalid';
    if (options.readonly) return 'readonly';
    if (options.run !== state.rpg?.run) return 'stale';
    const e = find(data, sceneId), b = e && all(e).find((b) => b.id === actionId);
    if (!e || !b || !state.rpg) return 'invalid';
    if (locked(state, data, sceneId)) return 'locked';
    if (options.by === 'teacher' && !state.teacher) return 'blocked';
    const rec = state.rpg.scenes[sceneId];
    if (rec?.actions.some((a) => a.id === actionId)) return 'duplicate';
    const manualStaff = allowStaff && !state.awake && sceneId === 'c3-staff' && e.beats.length === 1 && b.trigger.kind === 'staff' && rec?.status === 'auto' && rec.actions.length === 0;
    if (state.pos !== sceneId || state.done?.[sceneId] === true || (rec && rec.status !== 'active' && !manualStaff)) return 'blocked';
    const current = manualStaff ? b.id : rec ? rec.beat : e.beats[0]?.id;
    if (e.beats.includes(b) && b.id !== current) return 'blocked';
    if (b.trigger.kind === 'staff' && !allowStaff) return 'blocked';
    const stage = G.world.stage(data, sceneId, current);
    if (!stage) return 'invalid';
    if (b.trigger.target != null) {
      const target = G.world.objects(stage.map, sceneId, current).find((o) => o.id === b.trigger.target && o.action === actionId);
      const c = state.rpg.cursor;
      if (!target || !c || c.scene !== sceneId || c.map !== stage.map.id || !G.world.walkable(stage.map, c.x, c.y, sceneId, current) ||
          !G.world.adjacent(c, target)) return 'blocked';
    }
    return null;
  }
  function apply(state, data, sceneId, actionId, options, allowStaff = false) {
    const reason = validateAction(state, data, sceneId, actionId, options, allowStaff);
    if (reason) return { ok: false, reason, record: state.rpg?.scenes?.[sceneId] || null };
    const e = find(data, sceneId), b = all(e).find((b) => b.id === actionId);
    const rec = state.rpg.scenes[sceneId] || (state.rpg.scenes[sceneId] = record(e));
    if (rec.status === 'auto') { rec.status = 'active'; rec.beat = b.id; }
    const before = G.world.stage(data, sceneId, rec.beat);
    rec.actions.push({ id: actionId, by: options.by });
    for (const effect of b.effects) {
      if (effect.kind === 'item' && !state.items.includes(effect.id)) state.items.push(effect.id);
      if (effect.kind === 'bond' && !state.bonds.includes(effect.id)) state.bonds.push(effect.id);
      if (effect.kind === 'pearl') state.pearls[effect.id] = true;
    }
    rec.beat = next(e, rec.actions);
    const after = G.world.stage(data, sceneId, rec.beat);
    if (after && (before.map.id !== after.map.id || e.beats.find((b) => b.id === rec.beat)?.spawn)) {
      state.rpg.cursor = cursor(data, sceneId, rec.beat);
    } else if (after && state.rpg.cursor && !G.world.walkable(after.map, state.rpg.cursor.x, state.rpg.cursor.y, sceneId, rec.beat)) {
      state.rpg.cursor = cursor(data, sceneId, rec.beat);
    }
    return { ok: true, reason: null, record: rec };
  }
  const STORY = Object.freeze({ wonsu: 'e08-wonsu:appointment', seungsang: 'e11-seungsang:appointment', portrait: 'e11-seungsang:portrait' });
  function facts(state, data) {
    const result = new Set();
    for (const e of data.experiences || []) {
      const rec = state.rpg?.scenes?.[e.scene];
      if (!rec || rec.status === 'auto') continue;
      for (const action of rec.actions) for (const effect of all(e).find((b) => b.id === action.id)?.effects || []) {
        if (effect.kind === 'story') result.add(effect.id);
      }
    }
    return [...result];
  }
  // 소원 표시. fill은 원작 바닥(0..1), level은 고른 말까지 더한 표시값(0..1)이다. 막대 계산은 G.play(js/core/play.js).
  function wishes(state, data) {
    const story = new Set(facts(state, data));
    const sources = {
      chuljang: [STORY.wonsu, STORY.seungsang].filter((id) => story.has(id)),
      bugwi: state.items.includes('it-girinpo') ? ['it-girinpo'] : [],
      pungryu: ['it-geomungo', 'it-tungso'].filter((id) => state.items.includes(id)),
      gongmyeong: story.has(STORY.portrait) ? [STORY.portrait] : [],
    };
    const P = G.play, canon = P.canon(state, data), value = P.values(state, data), peak = state.play?.peak || {};
    return (data.wishes || []).map((w) => {
      const hidden = w.id === 'misaek' && !state.journal?.revealed?.misaek;
      const from = sources[w.id] || [], gauge = P.WISHES.includes(w.id);
      const fill = w.id === 'misaek' ? (hidden ? 0 : 1) : gauge ? canon[w.id] / P.CANON_MAX : 0;
      return { id: w.id, name: hidden ? '?' : w.name, hidden, fill, filled: fill === 1,
        half: fill === 0.5, sources: from, parts: (w.parts || []).map((p, i) => ({ ...p, filled: story.has([STORY.wonsu, STORY.seungsang][i]) })),
        level: gauge ? value[w.id] / P.MAX : null, canonFull: gauge && canon[w.id] >= P.CANON_MAX,
        peakLevel: gauge ? (peak[w.id] || 0) / P.MAX : null, secret: gauge && state.play?.secretWish === w.id };
    });
  }
  G.experience = { runValid, find, record, next, cursor, normalize, resume, finished, locked, validateAction, apply, facts, wishes, storyIds: STORY };
})();
