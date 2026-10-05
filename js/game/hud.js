'use strict';
(function () {
  const H = (G.hud = {});
  let current = null;
  function draw(ctx) {
    if (!ctx?.alive()) return;
    ctx.page.querySelector('.sim-hud')?.remove();
    const tools = ctx.page.querySelector('.topbar .tools');
    if (!tools || !ctx.experience) return;
    tools.querySelector('[data-tool="keep"]')?.remove();
    if (G.dream.alive()) tools.appendChild(G.ui.iconBtn('bag', '꿈 보따리', () => {
      if (ctx.alive() && G.dream.alive()) G.dream.open(undefined, ctx);
    }, { dataset: { tool: 'keep' } }));
  }
  H.refresh = () => draw(current);
  G.app.on('scene', ctx => { current = ctx; draw(ctx); });
  G.app.on('wake', H.refresh);
  G.app.on('settings', H.refresh);
})();
