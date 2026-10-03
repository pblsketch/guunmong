'use strict';
(function () {
  const { h } = G.util;
  const T = G.text;
  const name = (id) => G.data.wishes.find((w) => w.id === id)?.name || id;
  G.app.screens.journal = async function (ctx, sc) {
    const st = G.save.state, data = G.data.journal;
    const journal = st.journal;
    if (!ctx.readonly) journal.match ||= { picks: {} };
    ctx.main.append(h('h2', sc.title || '꿈 일지'), G.dream.wishList());
    const matchBox = h('section.journal-match');
    const linkBox = h('section.bond-link', h('h3', data.bondLink.prompt));
    const out = h('div.link-out', { role: 'status' });
    const buttons = data.bondLink.choices.map((id) => h('button.btn.link-opt', { type: 'button', dataset: { wish: id, must: '' }, disabled: true }, G.data.wishes.find((w) => w.id === id)?.dreamHidden && !journal.revealed?.[id] ? '?' : name(id)));
    linkBox.append(h('p.small', '어떤 마음과 잇든 채점하지 않아요.'), h('div.link-opts', buttons), out);
    const fairies = h('section.journal-fairies', h('h3', '구슬이 비추는 팔선녀'));
    const scale = G.util.pixNear(96, 96);
    const grid = h('div.fairy-grid');
    grid.style.setProperty('--cw', 96 * scale + 'px');
    grid.style.setProperty('--ch', 128 * scale + 'px');
    for (const b of G.data.bonds) {
      const found = !!st.pearls[b.id];
      const card = h('div.fairy-card' + (found ? '.found' : '.missed'), { dataset: { bond: b.id } },
        h('div.fc-pic', h('div.fc-inner', h('div.fc-front', G.dream.bead(found)), h('div.fc-back', b.fairyFace ? G.util.pixImg(T.face(b.fairyFace), { size: 48 }) : G.dream.bead(true)))),
        h('div.fc-cap', h('b', b.name), h('span.cap-fairy', b.fairy || '팔선녀')), found ? null : h('span.fc-note', '찾지 못한 구슬'));
      grid.append(card);
    }
    fairies.append(grid); ctx.main.append(matchBox, linkBox, fairies);
    const pairs = data.pairs;
    const act = { id: 'j-match', title: data.title || '맞대기', prompt: data.prompt, reusable: true,
      slots: pairs.map((p) => ({ id: p.id, label: p.event, answer: name(p.wish), memo: p.memo || p.evidence })),
      choices: G.data.wishes.filter((w) => !w.dreamHidden).map((w) => w.name), memo: data.memo };
    G.app.activityTitles['j-match'] = act.title;
    ctx.step('activity');
    const activity = G.activity.mount(matchBox, act, { tray: ctx.tray, readonly: ctx.readonly, state: journal.match, completed: !!st.ledger['j-match']?.final, signal: ctx.signal });
    await activity.done;
    if (!ctx.alive()) return;
    ctx.step('journal-bond'); ctx.tray(null);
    const answer = data.bondLink.answer;
    const reveal = () => {
      buttons.forEach((b) => { b.disabled = true; b.removeAttribute('data-must'); b.textContent = name(b.dataset.wish); b.classList.toggle('chosen', b.dataset.wish === journal.bondLink); });
      out.replaceChildren(T.blocks(data.bondLink.reveal || [], { peek: ctx.readonly }));
      G.dream.refreshWishes();
      grid.querySelectorAll('.found').forEach((card) => card.classList.add('flipped'));
    };
    if (journal.revealed?.[answer]) reveal();
    else if (!ctx.readonly) {
      await new Promise((resolve) => {
        const cancel = () => resolve(false); ctx.signal.addEventListener('abort', cancel, { once: true });
        buttons.forEach((b) => { b.disabled = false; b.onclick = () => {
          if (!ctx.alive() || b.disabled) return;
          journal.bondLink = b.dataset.wish;
          journal.revealed = { ...journal.revealed, [answer]: true };
          G.save.write(); reveal(); G.audio.pearl();
          ctx.signal.removeEventListener('abort', cancel); resolve(true);
        }; });
      });
    }
    if (!ctx.alive()) return;
    ctx.step('journal-pearls'); await ctx.next('육관대사 앞으로 ▶');
  };
})();
