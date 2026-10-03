'use strict';
// run(ctx, scene, turn): 선택 즉시 저장하고 연출 뒤 다음 단추를 기다린다. 취소하면 false.
(function () {
  const { h, pixImg, pixNear } = G.util;
  const P = (G.prep = {});
  const defaults = { abilities: { munjang: '문장', eumak: '음악', muye: '무예', jiryak: '지략' }, actions: { study: '학문', geomungo: '거문고', sword: '검술', strategy: '병법' }, grades: { shine: '빛나는 성공', fine: '훌륭한 성공', near: '아쉬운 성공' }, resources: { gong: '공', fame: '명성', wealth: '재물' } };
  P.labels = (kind) => ({ ...defaults[kind], ...G.data.notes?.ui?.[kind] });
  P.icon = function (id, target = 16) {
    const def = G.data.sprites?.[id];
    if (!def || !/^assets\//.test(def.src) || !(def.width > 0 && def.height > 0) || def.frames !== 1 || def.rows !== 1) return null;
    const scale = pixNear(def.width, target);
    const img = pixImg(def.src, { fit: false, cls: 'sim-icon' });
    img.dataset.icon = id;
    img.setAttribute('aria-hidden', 'true');
    Object.assign(img.style, { width: def.width * scale + 'px', height: def.height * scale + 'px', verticalAlign: 'middle', marginRight: '3px' });
    return img;
  };
  P.card = (sc) => h('div.preview-card', h('span.tag', '예고'), h('p', G.text.inline(sc.preview)));
  P.fiction = (ctx, key) => {
    const f = G.data.notes?.ui?.fiction?.[key];
    return f && !G.save.state.seenFiction[f.id] ? G.text.block(f, { peek: ctx.readonly }) : null;
  };
  P.wait = (ctx, ms) => new Promise((resolve) => {
    const end = (ok) => { clearTimeout(timer); ctx.signal.removeEventListener('abort', cancel); resolve(ok && ctx.alive()); };
    const cancel = () => end(false);
    const timer = setTimeout(() => end(true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms);
    ctx.signal.addEventListener('abort', cancel, { once: true });
    if (!ctx.alive()) cancel();
  });
  function actor(action) {
    const def = G.data.sprites?.[action];
    if (def && /^assets\//.test(def.src) && def.width > 0 && def.height > 0 && def.frames >= 2 && def.frames <= 4) {
      const scale = pixNear(def.width, 96), width = def.width * scale, height = def.height * scale;
      const sprite = h('div.prep-sprite', { role: 'img', 'aria-label': P.labels('actions')[action],
        style: { width: width + 'px', height: height + 'px', backgroundImage: 'url("' + def.src + '")', backgroundSize: (width * def.frames) + 'px ' + (height * (def.rows || 1)) + 'px' } });
      sprite.style.setProperty('--sheet-end', (-width * def.frames) + 'px');
      sprite.style.setProperty('--frames', String(def.frames));
      return sprite;
    }
    return h('div.prep-fallback', pixImg(G.text.face('yang'), { size: 96 }), h('span', action ? P.labels('actions')[action] + ' 준비' : '어떤 준비를 할까?'));
  }
  P.run = async function (ctx, sc, turn) {
    if (!ctx.alive() || ctx.readonly) return false;
    ctx.step('prep' + (turn + 1)); ctx.main.replaceChildren(); ctx.tray(null);
    const card = h('section.prep-panel', h('h2', '준비 ' + (turn + 1) + ' / 2'), P.card(sc));
    const actionLabels = P.labels('actions'), abilityLabels = P.labels('abilities');
    const display = h('div.prep-display', actor(null));
    const roll = h('div.yunmok', { role: 'status', 'aria-live': 'polite' }, '윤목');
    const gain = h('div.prep-gain', { role: 'status' });
    const buttons = h('div.prep-actions');
    card.append(display, roll, gain, buttons);
    const peek = h('button.btn.small.teacher-btn', { type: 'button', dataset: { teacher: 'peek' } }, G.data.notes?.ui?.teacherPeek || '핵심 능력 보기');
    peek.onclick = () => { if (!ctx.alive()) return; G.save.peekEvent(sc); if (G.save.state.events[sc.id]?.peek) peek.textContent = sc.core.map((k) => abilityLabels[k]).join(' · '); };
    if (G.save.state.events[sc.id]?.peek) peek.textContent = sc.core.map((k) => abilityLabels[k]).join(' · ');
    card.append(peek);
    ctx.main.append(card);
    let chosen = false;
    const action = await new Promise((resolve) => {
      const cancelled = () => resolve(null);
      ctx.signal.addEventListener('abort', cancelled, { once: true });
      for (const id of Object.keys(G.sim.actions)) {
        const button = h('button.btn.prep-action', { type: 'button', dataset: { act: 'prep', action: id } }, h('b', actionLabels[id]), h('span.small', abilityLabels[G.sim.actions[id]]));
        button.onclick = () => {
          if (chosen || !ctx.alive()) return;
          chosen = true;
          G.save.prepare(sc, turn, id);
          G.hud.refresh();
          buttons.querySelectorAll('button').forEach((b) => { b.disabled = true; b.classList.toggle('selected', b === button); });
          peek.disabled = true;
          ctx.signal.removeEventListener('abort', cancelled);
          resolve(id);
        };
        buttons.append(button);
      }
    });
    if (!action || !ctx.alive()) return false;
    display.replaceChildren(actor(action)); display.classList.add('training');
    roll.classList.add('rolling'); G.audio.roll();
    if (!await P.wait(ctx, 550)) return false;
    roll.classList.remove('rolling');
    const rec = G.save.state.events[sc.id], value = rec.rolls[turn], ability = G.sim.actions[action];
    roll.textContent = '윤목 ' + value;
    gain.append(h('strong', abilityLabels[ability] + ' +' + G.sim.growth(action, value)), h('meter', { min: 0, max: G.sim.config.maxAbility, value: G.save.state.abil[ability], 'aria-label': abilityLabels[ability] }));
    display.classList.remove('training');
    return await ctx.next(turn === 0 ? '다음 준비 ▶' : '사건 만나기 ▶');
  };
})();
