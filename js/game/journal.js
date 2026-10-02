'use strict';
// 꿈 일지(명세 6.1·6.2, 4장): 꿈속 사건(벼슬·물건·장면)을 성진의 소원과 맞대고, 여덟 구슬로 팔선녀의 정체를 푼다.
//  1) 첫머리: 소원 목록(미색은 아직 '?')과 2장에서 고른 양소유의 마음을 나란히 본다.
//  2) 맞대기: 데이터가 scored: true로 표시한 짝만 채점한다. 여러 칸을 모두 채워야 한 번에 확정하고(묶음 확정),
//     틀리면 읽기 활동과 같은 도움 사다리(틀린 칸 → 여백 메모 → 정답 보기). 장부 열쇠는 'journal-match'(데이터 journal.id로 바꿀 수 있음).
//     다시 읽기에서는 journal.extra(헷갈리는 칩, 예: '학문')가 더 들어간다.
//     scored: false 짝은 쪽빛 '해석'으로 보이고 골라도 채점하지 않는다(save.journal.picks). 소원 칩 말고 '어느 칸도 아님'도 고를 수 있다('none').
//  3) 인연 잇기: "성진의 어떤 마음이 여덟 인연을 꿈꾸었는가". 채점하지 않으며, 잇는 순간 꿈 내내 '?'였던 미색 칸이 드러난다.
//     드러난 뒤 bondLink.reveal(근거 구절과 해석 카드, 덩이)을 글 표시 규칙대로 보인다. bondLink 글에는 原文 낙관을 붙이지 않는다
//     (예전 형식의 evidence도 풀이로만 보인다). memo는 고르기 전 여백 메모, wrong은 미색이 아닌 것을 골랐을 때의 한 줄.
//     인연은 소원 칸에 넣지 않고 세지 않는다.
//  4) 구슬과 팔선녀: 찾은 구슬마다 인연 카드가 뒤집혀 팔선녀의 정체가 드러나고, 못 찾은 구슬은 흐리게 보인다.
// 사라진 말판·집은 다시 보여 주지 않는다(글로 남은 기록만).
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const app = G.app;

  const J = () => G.data.journal || {};
  const wishDefs = () => G.data.wishes || [];
  const wishName = (id) => { const w = wishDefs().find((x) => x.id === id); return w ? w.name : id; };
  const jst = () => { const s = S(); if (!s.journal || typeof s.journal !== 'object') s.journal = {}; return s.journal; };
  const KIND = { office: '벼슬', item: '물건', scene: '장면' };

  // 2장에서 고른 마음
  function minds() {
    const out = [];
    for (const s of app.list()) {
      if (!s.mind || !(s.mind.options || []).length) continue;
      const pick = S().mind[s.id];
      const o = s.mind.options.find((x) => x.id === pick);
      if (o) out.push({ scene: s, text: o.text });
    }
    return out;
  }

  function top() {
    const ms = minds();
    return h('div.journal-top',
      h('div.jt-col.wish-col', D.wishList({ detail: true })),
      h('div.jt-col.mind-col', h('h4', '꿈속 양소유의 마음'), h('p.small.muted', '2장에서 고른 마음이에요. 채점하지 않았어요.'),
        ms.length ? h('ul', ms.map((m) => h('li', h('span.mind-scene', m.scene.title || ''), ' ', T.inline(m.text, { noFace: true })))) : h('p.small', '고른 마음이 없어요.')));
  }

  // 채점하는 짝으로 읽기 활동(칸 채우기 틀)을 만든다. 선택지는 드러난 소원 이름(미색 제외), 한 소원을 여러 칸에 쓸 수 있다
  function matchActivity() {
    const pairs = (J().pairs || []).filter((p) => p.scored !== false);
    if (!pairs.length) return null;
    const visible = wishDefs().filter((w) => !w.dreamHidden);
    return {
      id: J().id || 'journal-match', scored: true, reusable: true,
      title: J().title || '꿈 일지 맞대기',
      prompt: J().prompt || '꿈속에서 쌓은 것이 성진의 어떤 소원과 맞닿아 있는지 칸마다 골라 넣으세요. 모든 칸을 채운 뒤 한 번에 확인해요.',
      slots: pairs.map((p) => ({ id: p.id, label: (KIND[p.kind] ? '[' + KIND[p.kind] + '] ' : '') + p.event, answer: wishName(p.wish), memo: p.memo || (p.evidence ? '원문 근거: ' + p.evidence : ''), note: p.note || (p.evidence ? '원문 근거: ' + p.evidence : '') })),
      choices: visible.map((w) => w.name),
      extra: J().extra || [],
      memo: J().memo || '성진의 독백에서 그 소원이 어떤 말로 적혀 있었는지 떠올려 보세요.',
      explain: pairs.filter((p) => p.evidence).map((p) => T.plain(p.event) + ' → ' + T.plain(wishName(p.wish)) + ' · ' + p.evidence).join('\n'),
    };
  }

  // '해석' 짝: 골라도 채점하지 않는다
  function interpPairs(readonly) {
    const pairs = (J().pairs || []).filter((p) => p.scored === false);
    if (!pairs.length) return null;
    const box = h('div.interp-pairs');
    box.appendChild(h('div.mark.interp', h('span.tag', '해석'), h('h4', '갈릴 수 있는 짝'), h('div.body', '아래 짝은 읽는 사람마다 다르게 이을 수 있어요. 골라 보고 친구와 견주어 보세요.'), h('div.unscored', '여러 해석이 있어요 · 채점하지 않아요')));
    const visible = wishDefs().filter((w) => !w.dreamHidden);
    for (const p of pairs) {
      const row = h('div.interp-pair', { dataset: { pair: p.id } }, h('div.ip-event', h('span.tag.itag', '해석'), ' ', T.inline(p.event, { noFace: true }), h('span.small.muted', ' · 채점하지 않아요')));
      const opts = h('div.ip-opts');
      const draw = () => opts.querySelectorAll('button').forEach((b) => b.classList.toggle('chosen', (jst().picks || {})[p.id] === b.dataset.wish));
      // 소원 칩과 '어느 칸도 아님'(기획서 §13-2)
      for (const w of [...visible, { id: 'none', name: '어느 칸도 아님' }]) {
        opts.appendChild(h('button.ip-opt' + (w.id === 'none' ? '.none' : ''), { type: 'button', dataset: { wish: w.id }, disabled: !!readonly, on: { click: () => {
          const j = jst(); j.picks = j.picks || {}; j.picks[p.id] = w.id; G.save.write(); G.audio.pick(); draw();
        } } }, w.name));
      }
      row.appendChild(opts);
      if (p.note) row.appendChild(h('p.small.muted', T.inline(p.note)));
      draw();
      box.appendChild(row);
    }
    return box;
  }

  // 성진의 마음과 여덟 인연 잇기 → 미색이 드러난다(채점하지 않음)
  async function bondLink(ctx) {
    const BL = J().bondLink || {};
    const answer = BL.answer || (wishDefs().find((w) => w.dreamHidden) || {}).id;
    const ids = (BL.choices && BL.choices.length ? BL.choices : wishDefs().map((w) => w.id));
    const s = ctx.section('bond-link');
    const met = (G.data.bonds || []).filter((b) => S().bonds[b.id]);
    s.appendChild(h('div.act-head', h('span.act-kind', '잇기 · 채점하지 않아요'), h('h3', T.inline(BL.prompt || '성진의 어떤 마음이 꿈속의 여덟 인연을 꿈꾸었을까요?'))));
    s.appendChild(h('div.bond-names.link-bonds', (met.length ? met : G.data.bonds || []).map((b) => h('span.bond-chip', b.name))));
    s.appendChild(h('p.small.muted', '인연은 소원 칸을 채우지 않아요. 성진의 마음 하나와 이어 보기만 해요.'));
    if (BL.memo) s.appendChild(h('p.small.link-memo', h('span.tag', '여백 메모'), ' ', T.inline(BL.memo)));
    const shown = !!(jst().revealed || {})[answer];
    const opts = ids.map((id) => {
      const w = wishDefs().find((x) => x.id === id) || { id, name: id };
      const isHidden = w.dreamHidden && !shown;
      return h('button.link-opt', { type: 'button', dataset: { wish: id } }, isHidden ? '? (꿈 내내 비어 있던 칸)' : w.name);
    });
    s.appendChild(h('div.link-opts', opts));
    const out = h('div.link-out', { role: 'status', 'aria-live': 'polite' });
    s.appendChild(out);
    const reveal = (picked) => {
      opts.forEach((b) => { b.removeAttribute('data-must'); b.disabled = true; b.classList.toggle('chosen', b.dataset.wish === picked); });
      const wn = wishName(answer);
      const other = picked && picked !== answer;
      const wrong = other ? (typeof BL.wrong === 'string' ? BL.wrong : (BL.wrong || {})[picked]) : null;
      // 근거: reveal 덩이(글 표시 규칙대로) 또는 예전 형식의 evidence(풀이로만). 대조 전 글이므로 原文 낙관을 붙이지 않는다
      const ev = (BL.reveal || []).length ? T.blocks(BL.reveal) : BL.evidence ? T.blocks([{ gloss: BL.evidence }]) : null;
      out.replaceChildren(...[
        h('p.reveal', '꿈 내내 ', h('b', '?'), '로 비어 있던 칸이 드러났어요 → ', h('b.reveal-name', wn)),
        ev,
        wrong ? h('p.small.link-wrong', T.inline(wrong)) : null,
        other ? h('p.small.muted', '고른 마음(' + T.plain(wishName(picked)) + ')과 함께 생각해 볼 수 있어요. 채점하지 않아요.') : null,
      ].filter(Boolean));
    };
    if (shown || ctx.readonly) { reveal(jst().bondLink || null); return; }
    opts.forEach((b) => b.setAttribute('data-must', ''));
    await new Promise((resolve) => opts.forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      const j = jst();
      j.bondLink = b.dataset.wish;
      j.revealed = Object.assign({}, j.revealed, { [answer]: true }); // 바로 이 순간 미색이 드러난다
      G.save.write();
      G.audio.stamp();
      reveal(b.dataset.wish);
      D.refreshWishes();
      resolve();
    })));
  }

  // 구슬 → 팔선녀
  // 카드 그림(인연 카드 틀 card_frame 96×128 / 뒷면 card_back)은 기기 픽셀 기준 정수배(넓은 화면 2배, 휴대폰 1배).
  // 카드 앞면에는 구슬, 뒤집힌 면에는 같은 색 띠의 선녀 얼굴. 이름과 정체는 카드 아래 글로 보인다.
  function fairies() {
    const box = h('div.fairy-grid');
    const s = G.util.pixNear(96, window.innerWidth >= 700 ? 192 : 96);
    box.style.setProperty('--cw', 96 * s + 'px');
    box.style.setProperty('--ch', 128 * s + 'px');
    const pearlBonds = new Set(D.pearlScenes().map((x) => x.meet));
    const list = (G.data.bonds || []).filter((b) => S().bonds[b.id] || pearlBonds.has(b.id));
    list.forEach((b, i) => {
      const found = !!S().pearls[b.id];
      const card = h('div.fairy-card' + (found ? '.found' : '.missed'), { dataset: { bond: b.id } },
        h('div.fc-pic',
          h('div.fc-inner',
            h('div.fc-front', D.bead(found)),
            h('div.fc-back', b.fairyFace ? h('span.fc-face', G.util.pixImg(T.face(b.fairyFace), { size: 48 * Math.max(1, Math.round(s)), cls: 'face' })) : D.bead(true)))),
        h('div.fc-cap',
          h('b.cap-name', b.name), b.status ? h('span.small.cap-status', b.status) : null,
          h('span.cap-fairy', h('span.small', '→ '), h('b', b.fairy || '팔선녀'))),
        found ? null : h('span.fc-note', '찾지 못한 구슬'));
      if (found) setTimeout(() => { card.classList.add('flipped'); G.audio.pearl(); }, 250 + i * 260);
      box.appendChild(card);
    });
    return box;
  }

  app.screens.journal = async function (ctx, sc) {
    app.sceneHead(ctx, sc);
    if (sc.read && sc.read.length) ctx.section('reading').appendChild(T.blocks(sc.read));
    ctx.step('journal-wishes');
    ctx.section('jt').appendChild(top());
    await ctx.next('맞대기 시작 ▶');
    if (!ctx.alive()) return;

    // 맞대기(채점하는 짝만, 묶음 확정 + 도움 사다리)
    const act = matchActivity();
    if (act) {
      sc.activity = act; // 장부 이름·점검 도구가 이 화면의 활동을 찾도록
      app.activityTitles[act.id] = act.title;
      ctx.step('activity');
      const box = ctx.section('act');
      const m = G.activity.mount(box, act, { tray: ctx.tray, readonly: ctx.readonly });
      const ip = interpPairs(ctx.readonly);
      if (ip) box.appendChild(ip);
      await m.done;
      if (!ctx.alive()) return;
      await ctx.next();
      if (!ctx.alive()) return;
    } else {
      const ip = interpPairs(ctx.readonly);
      if (ip) { ctx.step('journal-interp'); ctx.section('act').appendChild(ip); await ctx.next(); if (!ctx.alive()) return; }
    }

    // 인연 잇기 → 미색
    ctx.step('journal-bond');
    await bondLink(ctx);
    if (!ctx.alive()) return;
    await ctx.next();
    if (!ctx.alive()) return;

    // 구슬과 팔선녀
    ctx.step('journal-pearls');
    const s = ctx.section('fairies');
    s.append(h('div.act-head', h('span.act-kind', '여덟 구슬'), h('h3', '구슬이 비추는 인연의 본모습')),
      h('p.small', '찾은 구슬마다 인연첩의 카드가 뒤집혀요. 찾지 못한 구슬은 흐리게 남아요.'), fairies());
    await ctx.next('일지를 덮는다 ▶');
  };
})();
