'use strict';
(function () {
  const { h } = G.util;
  const I = () => G.data.interp || {};
  G.app.interpText = (id) => I().options.find((o) => o.id === id)?.text || '';
  G.app.interpEvidence = (id) => I().evidence.find((e) => e.id === id) || {};
  function picker(ctx, previous, heard, label) {
    const pick = { option: previous?.option || null, evidence: previous?.evidence || null };
    const box = h('div.interp-pick-box', h('h3', I().question));
    const options = h('div.interp-opts'), evidence = h('div.ev-opts');
    box.append(options, h('h4', '근거 구절'), evidence); ctx.main.append(box);
    let nextReady = false;
    let resolvePick;
    const result = new Promise((resolve) => { resolvePick = resolve; });
    const cancel = () => resolvePick(null); ctx.signal.addEventListener('abort', cancel, { once: true });
    function draw() {
      box.querySelectorAll('button').forEach((b) => {
        const chosen = b.dataset.opt ? pick.option === b.dataset.opt : pick.evidence === b.dataset.ev;
        b.classList.toggle('chosen', chosen); b.setAttribute('aria-pressed', String(chosen));
        if ((b.dataset.opt && !pick.option) || (b.dataset.ev && !pick.evidence)) b.setAttribute('data-must', ''); else b.removeAttribute('data-must');
      });
      if (pick.option && pick.evidence && !nextReady) {
        nextReady = true;
        ctx.next(label).then((ok) => { ctx.signal.removeEventListener('abort', cancel); resolvePick(ok && ctx.alive() ? { ...pick } : null); });
      }
    }
    for (const op of I().options) options.append(h('button.interp-opt', { type: 'button', dataset: { opt: op.id }, on: { click: () => { if (!ctx.alive()) return; pick.option = op.id; G.audio.pick(); draw(); } } }, G.text.inline(op.text)));
    for (const ev of I().evidence.filter((e) => heard || !e.after)) evidence.append(h('button.ev-opt', { type: 'button', dataset: { ev: ev.id }, on: { click: () => { if (!ctx.alive()) return; pick.evidence = ev.id; G.audio.pick(); draw(); } } }, G.text.inline(ev.text), ev.from ? h('small', ev.from) : null));
    draw(); return result;
  }
  const summary = (pick) => h('div.interp-sum', h('p', G.text.inline(G.app.interpText(pick?.option))), h('p', G.text.inline(G.app.interpEvidence(pick?.evidence).text || '')));
  G.app.screens.interp = async function (ctx, sc) {
    const st = G.save.state.interp;
    const ro = ctx.readonly || !!st.final;
    if (!st.first) {
      ctx.step('interp-dialogue'); await G.stage.play(ctx, sc, { lines: [...(sc.lines || []), ...(I().dialogue || [])] });
      if (!ctx.alive()) return;
    }
    if (!st.first && !ro) {
      ctx.main.replaceChildren(); ctx.step('interp-pick');
      const choice = await picker(ctx, null, false, '대사의 답을 듣는다 ▶');
      if (!choice || !ctx.alive()) return;
      st.first = choice; st.changed = null; st.revised = false; G.save.write();
    }
    ctx.main.replaceChildren(); ctx.step('interp-answer');
    await G.stage.play(ctx, sc, { lines: [].concat(I().lastWords || []) });
    if (!ctx.alive()) return;
    if (!ro) { st.heard = true; G.save.write(); }
    ctx.main.replaceChildren(); ctx.step('interp-revise');
    ctx.main.append(h('h3', '대사의 말을 듣고 나니 어떤가요?'), summary(st.changed || st.first));
    if (!ro) {
      const revise = h('button.btn', { type: 'button', dataset: { act: 'revise' } }, '한 번 고치기'); ctx.main.append(revise);
      const choice = await new Promise((resolve) => { revise.onclick = () => resolve('revise'); ctx.next('이대로 둔다 ▶').then(() => resolve('keep')); });
      if (!ctx.alive()) return;
      if (choice === 'revise') {
        ctx.main.replaceChildren(); ctx.tray(null);
        const changed = await picker(ctx, st.first, true, '고친 것으로 정한다 ▶');
        if (!changed || !ctx.alive()) return;
        st.revised = changed.option !== st.first.option || changed.evidence !== st.first.evidence;
        st.changed = st.revised ? changed : null;
      }
      st.final = true; G.save.write();
    } else await ctx.next('기록 확인 ▶');
    if (!ctx.alive()) return;
    ctx.main.replaceChildren(); ctx.step('ending');
    await G.stage.play(ctx, sc, { lines: I().ending || [] });
  };
})();
