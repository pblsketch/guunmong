'use strict';
// 위 막대 도구(꿈 보따리 단추)와 소원 띠.
//  - 소원 띠: 2장 첫 장면부터 지팡이가 난간을 칠 때까지, 꿈 장면의 위 막대 바로 아래에 늘 보이는 얇은 띠.
//    소원 다섯 칸(미색은 '?')은 숫자 없는 막대(G.app.wishes().level), 숨긴 소원에는 작은 표식, 인연 여덟 칸(● 만남 ○ 아직).
//    만나기 전 인연의 이름·그림은 어디에도 내보내지 않는다. 깨어난 뒤에는 선생님용을 포함해 아무에게도 보이지 않는다.
//  - G.hud.collapse(ctx): 깨어남 저장(G.app.wake)이 성공한 지팡이 장면에서만 띠를 무너뜨린다(wake.js가 부른다).
//    소원 칸이 하나씩 비고 → 인연 칸 자리에 만난 이름이 하나씩 떴다 사라지고 → 띠가 사라진다. 숫자를 쓰지 않는다.
(function () {
  const { h } = G.util;
  const H = (G.hud = {});
  const S = () => G.save.state;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 무너짐 시간(밀리초). 소원 칸 비우기 → 이름 → 띠 사라짐, 합쳐 약 6초.
  H.timing = { cells: 1800, names: 3400, fade: 600, reduced: 300, glow: 1100 };
  const DEFAULT_BAND = {
    label: '소원과 인연', wish: '{wish} {level}', levels: ['비어 있음', '조금', '반쯤', '많이 참', '가득 참'],
    hidden: '{wish} 알 수 없음', secret: '숨긴 소원', bonds: '인연 여덟 칸 가운데 {count}',
    bondCounts: ['찬 칸 없음', '한 칸', '두 칸', '세 칸', '네 칸', '다섯 칸', '여섯 칸', '일곱 칸', '여덟 칸'], separator: ', ',
  };
  const DEFAULT_COLLAPSE = { label: '꿈에서 쌓은 소원과 인연이 비어 간다', bonds: '꿈에서 만난 인연' };
  const SLOTS = 8;
  const words = () => ({ ...DEFAULT_BAND, ...(G.data.notes?.ui?.band || {}) });
  const collapseWords = () => ({ ...DEFAULT_COLLAPSE, ...(G.data.notes?.ui?.collapse || {}) });
  const fill = (template, values) => (G.play?.fill ? G.play.fill(template, values) : template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? ''));
  const levelWord = (w, level) => {
    const list = w.levels || DEFAULT_BAND.levels;
    return list[Math.max(0, Math.min(list.length - 1, Math.round((level || 0) * (list.length - 1))))];
  };
  const realName = id => (G.data.wishes || []).find(w => w.id === id)?.name || id;
  const metBonds = () => (G.data.bonds || []).filter(b => S().bonds.includes(b.id));

  // ───────── 위 막대의 꿈 보따리 단추
  let current = null;
  function draw(ctx) {
    if (!ctx?.alive()) return;
    ctx.page.querySelector('.sim-hud')?.remove();
    drawBand(ctx);
    const tools = ctx.page.querySelector('.topbar .tools');
    if (!tools || !ctx.experience) return;
    tools.querySelector('[data-tool="keep"]')?.remove();
    if (G.dream.alive()) tools.appendChild(G.ui.iconBtn('bag', '꿈 보따리', () => {
      if (ctx.alive() && G.dream.alive()) G.dream.open(undefined, ctx);
    }, { dataset: { tool: 'keep' } }));
  }

  // ───────── 소원 띠
  // 꿈 장면: 2장 전부와 3장의 깨어난 선방 앞. 깨어난 뒤에는 누구에게도 보이지 않는다.
  H.bandShown = function (ctx) {
    if (!ctx?.alive() || S().awake) return false;
    return ctx.ch === '2' || (ctx.ch === '3' && !ctx.scene?.awakened);
  };
  let band = null; // { ctx, el, cells, bonds, slots, say, seen, last, timers, collapsing }

  function snapshot() {
    const levels = {};
    for (const w of G.app.wishes()) levels[w.id] = { level: w.level, secret: !!w.secret, hidden: !!w.hidden };
    return { levels, met: S().bonds.length };
  }
  function sayText(snap) {
    const w = words(), parts = [];
    for (const wish of G.app.wishes()) {
      if (wish.hidden || wish.level === null || wish.level === undefined) { parts.push(fill(w.hidden, { wish: realName(wish.id) })); continue; }
      let part = fill(w.wish, { wish: wish.name, level: levelWord(w, wish.level) });
      if (wish.secret) part += ' ' + w.secret;
      parts.push(part);
    }
    parts.push(bondsText(snap.met));
    return parts.join(w.separator);
  }
  function bondsText(count) {
    const w = words(), list = w.bondCounts || DEFAULT_BAND.bondCounts;
    return fill(w.bonds, { count: list[Math.max(0, Math.min(list.length - 1, count))] });
  }

  function build(ctx) {
    const w = words();
    const el = h('div.wish-band', { role: 'group', 'aria-label': w.label, dataset: { band: '' } });
    const say = h('p.sr.band-say');
    const list = h('ul.band-wishes', { 'aria-hidden': 'true' });
    const cells = new Map();
    for (const wish of G.app.wishes()) {
      const gauge = !wish.hidden && wish.level !== null && wish.level !== undefined;
      const fillEl = gauge ? h('span.band-fill') : null;
      const cell = h('li.band-wish' + (gauge ? '' : '.hidden'), { dataset: { wish: wish.id } },
        h('span.band-name', wish.hidden ? '?' : wish.name),
        gauge ? h('span.band-bar', fillEl) : h('span.band-bar.unknown'),
        h('span.band-secret'));
      cells.set(wish.id, { cell, fill: fillEl });
      list.appendChild(cell);
    }
    const slots = Array.from({ length: SLOTS }, () => h('span.band-slot'));
    const names = h('span.band-names', { 'aria-hidden': 'true' });
    const bonds = h('button.band-bonds', { type: 'button', dataset: { band: 'bonds' } }, h('span.band-slots', { 'aria-hidden': 'true' }, slots), names);
    bonds.addEventListener('click', () => {
      if (!band || band.el !== el || band.collapsing || !ctx.alive() || !G.dream?.can('bonds')) return;
      if (document.querySelector('.sheet-back, .fold-ov')) return;
      G.dream.open('bonds', ctx);
    });
    el.append(say, list, bonds);
    return { ctx, el, cells, bonds, slots, names, say, seen: null, last: null, timers: new Set(), collapsing: false, frame: 0 };
  }
  function later(b, fn, ms) {
    const id = setTimeout(() => { b.timers.delete(id); fn(); }, ms);
    b.timers.add(id);
    return id;
  }
  function glow(b, node) {
    if (reduced()) return;
    if (node.classList.contains('glow')) { node.classList.remove('glow'); void node.offsetWidth; }
    node.classList.add('glow');
    later(b, () => node.classList.remove('glow'), H.timing.glow);
  }
  // 저장된 상태로 띠를 맞춘다. 앞 모습과 값이 다른 칸만 잠깐 빛난다(움직임 줄이기면 빛남 없이 바로).
  function update(b) {
    if (b.collapsing) return;
    const snap = snapshot(), prev = b.last;
    for (const [id, part] of b.cells) {
      const now = snap.levels[id] || {};
      if (part.fill) part.fill.style.setProperty('--level', String(now.level || 0));
      part.cell.classList.toggle('secret', !!now.secret);
      if (prev && prev.levels[id] && (prev.levels[id].level !== now.level || prev.levels[id].secret !== now.secret)) glow(b, part.cell);
    }
    b.slots.forEach((slot, i) => slot.classList.toggle('met', i < snap.met));
    if (prev && prev.met !== snap.met) glow(b, b.bonds);
    const text = sayText(snap);
    b.say.textContent = text;
    b.bonds.setAttribute('aria-label', bondsText(snap.met));
    b.last = snap; b.seen = S();
  }
  // 저장은 상태 객체를 새로 얼려 바꾼다. 같은 객체면 바뀐 것이 없다.
  function watch(b) {
    const tick = () => {
      b.frame = 0;
      if (!band || band !== b || b.collapsing || !b.ctx.alive() || !b.el.isConnected) return;
      if (S() !== b.seen) {
        // 깨어남을 저장한 지팡이 장면: 무너짐(wake.js → collapse)이 띠를 맡는다.
        if (S().awake && b.ctx.committed) return;
        if (!H.bandShown(b.ctx)) { removeBand(); return; }
        update(b);
      }
      b.frame = requestAnimationFrame(tick);
    };
    b.frame = requestAnimationFrame(tick);
  }
  function stop(b) {
    for (const id of b.timers) clearTimeout(id);
    b.timers.clear();
    if (b.frame) cancelAnimationFrame(b.frame);
    b.frame = 0;
  }
  function removeBand() {
    if (!band) return;
    const b = band; band = null; stop(b);
    b.el.remove();
    b.ctx.page?.style.removeProperty('--band-h');
  }
  function measure(b) {
    const height = b.el.getBoundingClientRect().height;
    if (height > 0) b.ctx.page.style.setProperty('--band-h', Math.ceil(height) + 'px');
  }
  function drawBand(ctx) {
    // 깨어남을 저장한 지팡이 장면의 띠는 무너짐이 맡는다(설정을 바꿔도 다시 그리지 않는다).
    if (band && band.ctx === ctx && (band.collapsing || ctx.committed && S().awake)) return;
    const keep = band && band.ctx === ctx ? band.last : null;
    removeBand();
    if (!H.bandShown(ctx)) return;
    const top = ctx.page.querySelector('.topbar');
    if (!top) return;
    const b = build(ctx);
    band = b;
    top.appendChild(b.el);
    b.last = keep; // 같은 화면의 다시 그리기는 앞 모습과 비교한다(설정 바꿈만으로는 빛나지 않는다)
    update(b);
    measure(b);
    watch(b);
    ctx.signal.addEventListener('abort', () => { if (band === b) removeBand(); }, { once: true });
  }

  // ───────── 깨어날 때의 무너짐
  // 깨어남 저장이 성공한 지팡이 화면(ctx.committed·awake)에서만 시작한다. 돌려주는 finish()는 띠를 곧바로 없앤다(건너뛰기·이탈).
  H.collapse = function (ctx) {
    const b = band;
    if (!b || b.ctx !== ctx || b.collapsing || !ctx?.alive() || !ctx.committed || !S().awake || !b.el.isConnected) return null;
    b.collapsing = true;
    stop(b);
    const cw = collapseWords();
    b.el.setAttribute('aria-label', cw.label);
    b.say.textContent = cw.label;
    b.bonds.disabled = true;
    b.bonds.removeAttribute('aria-label');
    b.bonds.setAttribute('aria-hidden', 'true');
    const cells = [...b.cells.values()];
    let resolveDone;
    const done = new Promise(resolve => { resolveDone = resolve; });
    const finish = () => {
      if (band === b) removeBand(); else { stop(b); b.el.remove(); }
      resolveDone();
    };
    ctx.signal.addEventListener('abort', finish, { once: true });
    if (reduced()) {
      b.el.dataset.collapse = 'running';
      for (const part of cells) { part.cell.classList.add('emptied'); part.fill?.style.setProperty('--level', '0'); }
      b.slots.forEach(slot => slot.classList.remove('met'));
      later(b, finish, H.timing.reduced);
      return { duration: H.timing.reduced, done, finish };
    }
    b.el.dataset.collapse = 'running';
    const T = H.timing, step = T.cells / Math.max(1, cells.length);
    cells.forEach((part, i) => later(b, () => { part.cell.classList.add('emptied'); part.fill?.style.setProperty('--level', '0'); }, i * step));
    const met = metBonds();
    let at = T.cells;
    if (met.length) {
      later(b, () => {
        b.el.dataset.collapse = 'names';
        b.names.replaceChildren(h('span.band-names-head', cw.bonds));
      }, at);
      const each = T.names / met.length;
      met.forEach((bond, i) => {
        const start = at + i * each;
        let node = null;
        later(b, () => {
          node = h('span.band-gone-name', { dataset: { bond: bond.id } }, bond.name);
          b.names.appendChild(node);
          void node.offsetWidth;
          node.classList.add('shown');
        }, start);
        later(b, () => {
          if (!node) return;
          node.classList.add('gone');
          const slot = b.slots.filter(s => s.classList.contains('met')).at(-1);
          slot?.classList.remove('met');
        }, start + each * 0.7);
        later(b, () => node?.remove(), start + each - 10);
      });
      at += T.names;
    }
    later(b, () => { b.el.dataset.collapse = 'leaving'; }, at);
    const duration = at + T.fade;
    later(b, finish, duration);
    return { duration, done, finish };
  };

  H.refresh = () => draw(current);
  G.app.on('scene', ctx => { current = ctx; draw(ctx); });
  G.app.on('wake', H.refresh);
  G.app.on('settings', H.refresh);
  G.app.on('reset', () => removeBand());
})();
