'use strict';
(function () {
  const { h } = G.util;
  const I = () => G.data.interp || {};
  G.app.interpText = (id) => I().options.find((o) => o.id === id)?.text || '';
  // 틀 근거(E11 '내가 꿈에서 고른 길')는 저장된 근거 id만 남기고, 화면·결과·PNG가 같은 기록에서 글을 다시 만든다.
  // 학생이 고른 말이 없으면 글이 없어(null) 고를 수 없다. 깨어난 뒤에는 기록이 얼어 있어 언제 만들어도 같은 글이다.
  const filled = (e) => (e.template ? { ...e, text: (e.id === 'E11' && G.play?.e11?.(G.save.state, G.data)) || '' } : e);
  G.app.interpEvidence = (id) => { const e = I().evidence.find((x) => x.id === id); return e ? filled(e) : {}; };
  const shownEvidence = (heard) => I().evidence.filter((e) => heard || !e.after).map(filled).filter((e) => !e.template || e.text);
  // 5장 첫머리 되짚기(G.play.recapLines): 고른 말·첫 결과·숨긴 소원과 가장 찼던 소원·물음. 답하는 칸 없이 기존 대사로 잇는다.
  const recapLines = () => (G.play?.recapLines ? G.play.recapLines(G.save.state, G.data) : []).map((text) => ({ say: 'yuk', text }));
  function picker(ctx, previous, heard, label) {
    const pick = { option: previous?.option || null, evidence: previous?.evidence || null };
    const box = h('div.interp-pick-box', h('h3', I().question));
    const options = h('div.interp-opts'), evidence = h('div.ev-opts');
    box.append(options, h('h4', '근거 구절'), evidence); ctx.main.append(box);
    let nextReady = false, locked = false;
    let resolvePick;
    const result = new Promise((resolve) => { resolvePick = resolve; });
    const cancel = () => resolvePick(null); ctx.signal.addEventListener('abort', cancel, { once: true });
    function draw() {
      box.querySelectorAll('button').forEach((b) => {
        const chosen = b.dataset.opt ? pick.option === b.dataset.opt : pick.evidence === b.dataset.ev;
        b.classList.toggle('chosen', chosen); b.setAttribute('aria-pressed', String(chosen)); b.disabled = locked;
        if ((b.dataset.opt && !pick.option) || (b.dataset.ev && !pick.evidence)) b.setAttribute('data-must', ''); else b.removeAttribute('data-must');
      });
      if (pick.option && pick.evidence && !nextReady) {
        nextReady = true;
        ctx.next(label).then((ok) => {
          if (ok && ctx.alive()) { locked = true; draw(); }
          ctx.signal.removeEventListener('abort', cancel); resolvePick(ok && ctx.alive() ? { ...pick } : null);
        });
      }
    }
    for (const op of I().options) options.append(h('button.interp-opt', { type: 'button', dataset: { opt: op.id }, on: { click: () => { if (locked || !ctx.canAct()) return; pick.option = op.id; G.audio.pick(); draw(); } } }, G.text.inline(op.text)));
    for (const ev of shownEvidence(heard)) evidence.append(h('button.ev-opt', { type: 'button', dataset: { ev: ev.id }, on: { click: () => { if (locked || !ctx.canAct()) return; pick.evidence = ev.id; G.audio.pick(); draw(); } } }, G.text.inline(ev.text), ev.from ? h('small', ev.from) : null));
    draw(); return result;
  }
  const summary = (pick) => h('div.interp-sum', h('p', G.text.inline(G.app.interpText(pick?.option))), h('p', G.text.inline(G.app.interpEvidence(pick?.evidence).text || '')));
  G.app.screens.interp = async function (ctx, sc) {
    let st = G.save.state.interp || {};
    const ro = ctx.readonly || !!st.final;
    const save = (change) => {
      if (!ctx.alive() || !ctx.canAct()) return false;
      const ok = G.save.transact(ctx.run, (draft) => change(draft.interp), { readonly: ctx.readonly });
      if (!ok) G.ui.toast('해석을 저장하지 못했어요. 현재 선택을 확인하고 다시 시도해 주세요.');
      else st = G.save.state.interp;
      return ok;
    };
    const saveWithRetry = async (change) => {
      while (ctx.alive()) {
        if (save(change)) return true;
        if (!await ctx.next('다시 저장 ▶')) return false;
      }
      return false;
    };
    if (!st.first) {
      ctx.step('interp-dialogue'); await G.stage.play(ctx, sc, { lines: [...(sc.lines || []), ...recapLines(), ...(I().dialogue || [])] });
      if (!ctx.alive()) return;
    }
    if (!st.first && !ro) {
      ctx.main.replaceChildren(); ctx.step('interp-pick');
      const choice = await picker(ctx, null, false, '대사의 답을 듣는다 ▶');
      if (!choice || !ctx.alive()) return;
      if (!await saveWithRetry((draft) => { draft.first = choice; draft.changed = null; draft.revised = false; })) return false;
    }
    ctx.main.replaceChildren(); ctx.step('interp-answer');
    await G.stage.play(ctx, sc, { lines: [].concat(I().lastWords || []) });
    if (!ctx.alive()) return;
    if (!ro && !await saveWithRetry((draft) => { draft.heard = true; })) return false;
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
        const revised = changed.option !== st.first.option || changed.evidence !== st.first.evidence;
        if (!await saveWithRetry((draft) => { draft.revised = revised; draft.changed = revised ? changed : null; draft.final = true; })) return false;
      } else {
        if (!await saveWithRetry((draft) => { draft.revised = false; draft.changed = null; draft.final = true; })) return false;
      }
    } else await ctx.next('기록 확인 ▶');
    if (!ctx.alive()) return;
    ctx.main.replaceChildren(); ctx.step('ending');
    await G.stage.play(ctx, sc, { lines: I().ending || [] });
  };
})();
