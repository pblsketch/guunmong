'use strict';
(function () {
  const { h } = G.util;
  G.app.screens.waking = async function (ctx, sc) {
    ctx.step('waking');
    let snapshot = null;
    await G.cutscene.play(ctx, sc, {
      canSkip: () => !!G.save.state.awake,
      onPause: async (pause, stage) => {
        if (pause !== 'staff') { await ctx.next('계속 ▶'); return; }
        ctx.step('staff'); G.audio.play(null);
        const before = G.save.state;
        snapshot = h('div.dream-shatter',
          h('div.shatter-piece', { dataset: { fragment: 'score' } }, h('h3', '꿈 점수'), h('strong', before.res.gong + before.res.fame + before.res.wealth)),
          h('div.shatter-piece', { dataset: { fragment: 'board' } }, G.board.view({ mini: true, wishes: false })),
          h('div.shatter-piece', { dataset: { fragment: 'house' } }, G.house.view({ mini: true })),
          h('div.shatter-piece', { dataset: { fragment: 'bonds' } }, h('h3', '인연첩'), (G.data.bonds || []).filter((b) => before.bonds.includes(b.id)).map((b) => h('span.bond-chip', b.name))));
        await new Promise((resolve) => {
          const b = h('button.btn.seal', { type: 'button', dataset: { act: 'staff' } }, G.data.notes?.ui?.staff || '지팡이로 난간을 친다');
          let strikeTimer;
          const end = (ok) => { clearTimeout(strikeTimer); ctx.signal.removeEventListener('abort', cancel); resolve(ok); };
          const cancel = () => end(false);
          ctx.signal.addEventListener('abort', cancel, { once: true });
          b.onclick = () => {
            if (!ctx.alive() || b.disabled) return;
            b.disabled = true;
            if (!ctx.readonly) G.app.wake();
            const striking = stage.setSpriteFrame('hoseung', 3);
            G.audio.staff();
            if (striking) {
              ctx.step('strike'); ctx.tray(null);
              strikeTimer = setTimeout(() => end(true), 400);
            } else end(true);
          };
          ctx.tray(b);
        });
      },
    });
    if (!ctx.alive()) return;
    ctx.step('shatter');
    ctx.main.replaceChildren(snapshot || h('div.dream-shatter'));
    G.dream.fitAll(); G.audio.shatter();
    await new Promise((resolve) => {
      const end = () => { clearTimeout(timer); ctx.signal.removeEventListener('abort', end); resolve(); };
      const timer = setTimeout(end, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1800);
      ctx.signal.addEventListener('abort', end, { once: true });
      ctx.tray(h('button.btn.primary', { type: 'button', dataset: { act: 'skip' }, on: { click: end } }, '깨어나기 ▶'));
    });
    if (!ctx.alive()) return;
    ctx.main.replaceChildren(); ctx.tray(null); G.audio.wake();
  };
})();
