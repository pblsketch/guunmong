'use strict';
(function () {
  const { h } = G.util;
  const H = (G.hud = {});
  let current = null;
  function draw(ctx) {
    let box = ctx.page.querySelector('.sim-hud');
    const st = G.save.state;
    if (!['2', '3'].includes(ctx.ch) || (st.awake && !st.teacher)) { box?.remove(); return; }
    if (!box) {
      box = h('aside.sim-hud', { 'aria-label': '꿈에서 쌓은 것' });
      ctx.page.querySelector('.topbar').after(box);
    }
    const abilityNames = G.prep.labels('abilities');
    const wishes = G.app.wishes().map((w) => {
      const wrap = h('div.hud-wish', { dataset: { wish: w.id }, title: w.name });
      if (w.hidden) { wrap.textContent = '?'; return wrap; }
      wrap.append(h('span', w.name), w.parts?.length ? h('span.hud-halves', w.parts.map((p) => h('i' + (p.filled ? '.filled' : ''), { title: p.name }, p.name))) : h('meter', { min: 0, max: 1, value: w.fill, 'aria-label': w.name }));
      return wrap;
    });
    box.replaceChildren(h('div.hud-top', h('strong', '꿈 점수 ', h('span', { dataset: { score: '' } }, st.res.gong + st.res.fame + st.res.wealth)),
      h('div', h('button.btn.small', { type: 'button', dataset: { hud: 'board' }, on: { click: () => G.dream.open('board') } }, '말판'),
        h('button.btn.small', { type: 'button', dataset: { hud: 'house' }, on: { click: () => G.dream.open('house') } }, '집'))),
      h('div.hud-wishes', wishes),
      h('div.hud-abilities', Object.entries(abilityNames).map(([id, label]) => h('span', { dataset: { ability: id }, style: { whiteSpace: 'nowrap' } }, G.prep.icon(id), label + ' ', h('b', st.abil[id])))));
  }
  H.refresh = () => { if (current?.alive()) draw(current); };
  G.app.hook('scene', (ctx) => {
    current = ctx;
    draw(ctx);
  });
  G.app.on('step', H.refresh);
  G.app.on('wake', H.refresh);
  G.app.on('settings', H.refresh);
})();
