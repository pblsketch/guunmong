'use strict';
(function () {
  const actions = Object.freeze({ study: 'munjang', geomungo: 'eumak', sword: 'muye', strategy: 'jiryak' });
  const config = {
    baseGain: 2,
    thresholds: [6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39],
    rewards: {
      near: { gong: 2, fame: 3, wealth: 4 },
      fine: { gong: 5, fame: 7, wealth: 9 },
      shine: { gong: 9, fame: 12, wealth: 15 },
    },
    linkBonus: 2,
    get maxAbility() { return this.thresholds.length * 2 * (this.baseGain + 3) + this.linkBonus; },
  };
  function number(id) {
    const match = /^e(0[1-9]|1[0-2])-[a-z0-9-]+$/.exec(id);
    if (!match) throw new Error('Invalid event id: ' + id);
    return Number(match[1]);
  }
  function core(event) {
    number(event.id);
    if (!Array.isArray(event.core) || event.core.length < 1 || event.core.length > 2 ||
        new Set(event.core).size !== event.core.length || event.core.some((k) => !Object.values(actions).includes(k))) {
      throw new Error('Invalid event core: ' + event.id);
    }
    return event.core;
  }
  function roll(id, turn) {
    if (turn !== 0 && turn !== 1) throw new Error('Invalid turn');
    return ((number(id) - 1) * 2 + turn) % 3 + 1;
  }
  function growth(action, value) {
    if (!Object.hasOwn(actions, action) || ![1, 2, 3].includes(value)) throw new Error('Invalid preparation');
    return config.baseGain + value;
  }
  const threshold = (event) => config.thresholds[number(event.id) - 1];
  function grade(event, hits, abil) {
    const keys = core(event);
    if (![0, 1, 2].includes(hits)) throw new Error('Invalid hits');
    if (hits === 2) return 'shine';
    const high = Math.max(...keys.map((k) => abil[k] || 0)) >= threshold(event);
    return hits === 1 ? (high ? 'shine' : 'fine') : (high ? 'fine' : 'near');
  }
  function reward(value) {
    if (!Object.hasOwn(config.rewards, value)) throw new Error('Invalid grade');
    return { ...config.rewards[value] };
  }
  function record() {
    return { turns: [], rolls: [], hits: 0, grade: null, reward: null, peek: false, auto: false };
  }
  function prepare(state, event, turn, action) {
    const keys = core(event);
    const value = roll(event.id, turn);
    const gain = growth(action, value);
    const saved = state.events[event.id];
    if (saved && (saved.grade || saved.turns[turn] !== undefined)) return saved;
    if (turn !== (saved ? saved.turns.length : 0)) throw new Error('Preparation out of order');
    const rec = saved || (state.events[event.id] = record());
    rec.turns.push(action);
    rec.rolls.push(value);
    rec.hits += keys.includes(actions[action]) ? 1 : 0;
    state.abil[actions[action]] += gain;
    state.pos = event.id;
    state.step = turn === 0 ? 'prep2' : 'scene';
    return rec;
  }
  function finish(state, event) {
    core(event);
    const rec = state.events[event.id];
    if (rec && rec.grade) return rec;
    if (!rec || rec.turns.length !== 2) throw new Error('Preparation incomplete');
    rec.grade = grade(event, rec.hits, state.abil);
    rec.reward = reward(rec.grade);
    for (const key of ['gong', 'fame', 'wealth']) state.res[key] += rec.reward[key];
    state.best = Math.max(state.best, state.res.gong + state.res.fame + state.res.wealth);
    state.step = 'grade';
    return rec;
  }
  function normalTurns(event) {
    const keys = core(event);
    const names = Object.keys(actions);
    return [names.find((a) => actions[a] === keys[0]), names.find((a) => !keys.includes(actions[a]))];
  }
  function normalPrep(state, scenes, targetId) {
    const end = scenes.findIndex((s) => s.id === targetId);
    if (end < 0) throw new Error('Unknown target: ' + targetId);
    const pending = scenes.slice(0, end).filter((s) => s.kind === 'event' && !Object.hasOwn(state.events, s.id));
    pending.forEach(core);
    const pos = state.pos;
    const step = state.step;
    for (const event of pending) {
      normalTurns(event).forEach((action, turn) => prepare(state, event, turn, action));
      finish(state, event).auto = true;
    }
    state.pos = pos;
    state.step = step;
    return pending.map((s) => s.id);
  }
  G.sim = { config, actions, roll, growth, threshold, grade, reward, record, prepare, finish, normalTurns, normalPrep };
})();
