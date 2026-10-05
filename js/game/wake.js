'use strict';
(function () {
  const { h } = G.util;
  G.app.screens.waking = async function (ctx, sc) {
    if (!ctx.readonly && ctx.canAct() && !G.save.beginExperience(sc.id, { run: ctx.run, readonly: false, by: G.save.state.teacher ? 'teacher' : 'student' })) { ctx.fail(); return false; }
    if (ctx.step('waking') === false) return false;
    let snapshot = null;
    const played = await G.cutscene.play(ctx, sc, {
      field: true,
      canSkip: () => !!G.save.state.awake,
      onPause: async (pause, stage) => {
        if (pause !== 'staff') { await ctx.next('계속 ▶'); return; }
        if (ctx.step('staff') === false) return;
        G.audio.play(null);
        await new Promise((resolve) => {
          const b = h('button.btn.seal', { type: 'button', dataset: { act: 'staff' } }, G.data.notes?.ui?.staff || '지팡이로 난간을 친다');
          const notice = h('p.wake-save-error', { role: 'alert', hidden: true });
          let strikeTimer;
          let settled = false;
          const refresh = () => { if (!settled) b.disabled = ctx.readonly ? !(G.save.state.awake && ctx.canBrowse()) : !ctx.canAct(); };
          const off = G.app.on('settings', refresh);
          const end = (ok) => { if (settled) return; settled = true; clearTimeout(strikeTimer); off(); ctx.signal.removeEventListener('abort', cancel); resolve(ok); };
          const cancel = () => end(false);
          ctx.signal.addEventListener('abort', cancel, { once: true });
          b.onclick = () => {
            if (!ctx.alive() || settled || b.disabled || document.querySelector('.sheet-back, .fold-ov')) return;
            if (ctx.readonly ? !(G.save.state.awake && ctx.canBrowse()) : !ctx.canAct()) return;
            b.disabled = true;
            if (!ctx.readonly && !G.app.wake(ctx)) {
              notice.textContent = '기록을 저장하지 못했어요. 저장할 수 있게 되면 다시 난간을 쳐 주세요.';
              notice.hidden = false; refresh(); b.focus({ preventScroll: true }); return;
            }
            const striking = stage.setSpriteFrame('hoseung', 3);
            G.audio.staff();
            snapshot = ctx.field.cloneNode(true);
            snapshot.removeAttribute('data-game-field'); snapshot.inert = true; snapshot.setAttribute('aria-hidden', 'true');
            // 연출에 남기는 그림은 저장 입력과 화면 표식을 갖지 않는다.
            for (const el of [snapshot, ...snapshot.querySelectorAll('*')]) for (const name of ['id', 'tabindex', 'data-world', 'data-object', 'data-act', 'data-sprite', 'data-dialogue']) el.removeAttribute(name);
            if (striking) {
              ctx.step('strike'); ctx.tray(null);
              strikeTimer = setTimeout(() => end(true), 400);
            } else end(true);
          };
          refresh(); ctx.tray(h('div.wake-input', b, notice)); b.focus({ preventScroll: true });
        });
      },
    });
    if (!ctx.alive() || !played) return false;
    if (ctx.step('wake-transition') === false) return false;
    const map = G.data.maps.find(m => m.id === 'map-cell'), art = G.data.sprites[map?.art];
    const room = h('div.wake-room');
    if (art) {
      const scale = Math.ceil(2 * (devicePixelRatio || 1)) / (devicePixelRatio || 1);
      room.appendChild(h('img', { src: art.src, alt: '', style: { width: art.width * scale + 'px', height: art.height * scale + 'px' } }));
    }
    const transition = h('div.wake-transition', { 'aria-hidden': 'true' }, snapshot ? h('div.wake-dream', snapshot) : null, room);
    ctx.field.replaceChildren(transition); G.audio.shatter();
    await new Promise((resolve) => {
      let settled = false;
      const end = () => { if (settled) return; settled = true; clearTimeout(timer); ctx.signal.removeEventListener('abort', end); resolve(); };
      const timer = setTimeout(end, matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1800);
      ctx.signal.addEventListener('abort', end, { once: true });
      ctx.tray(h('button.btn.primary', { type: 'button', disabled: !ctx.canProceed(), dataset: { act: 'skip' }, on: { click: () => { if (ctx.canProceed() && !document.querySelector('.sheet-back, .fold-ov')) end(); } } }, '선방으로 ▶'));
    });
    if (!ctx.alive()) return false;
    ctx.field.replaceChildren(); ctx.tray(null); G.audio.wake(); return true;
  };
})();
