'use strict';
// 육관대사의 물음과 해석 고르기(명세 6.3, 5장). 채점하지 않는다.
//  1) 문답을 따라 읽는다(scene.read + GUUN.interp.dialogue).
//  2) 대사가 "아직 꿈에서 깨지 못했다"고 답하기 **전에** 해석 하나(3~4개 중)와 근거 구절 하나(후보 목록)를 고른다.
//  3) 대사의 마지막 말(GUUN.interp.lastWords)을 듣는다.
//  4) 들은 뒤 **한 번** 고칠 수 있다(해석과 근거를 함께). 고치지 않아도 된다.
//  5) 팔선녀의 출가와 결말(GUUN.interp.ending).
// 저장: save.interp = { first: { option, evidence }, heard, changed: { option, evidence } | null, revised, final }
//  - 대사의 말을 들은 뒤(heard)에는 새로 고침해도 처음 고른 것을 다시 고를 수 없고, 고칠 기회만 남는다.
// 근거 구절 후보(GUUN.interp.evidence)의 after: true 항목(대사의 대답에서 나온 구절)은 대사의 말을 들은 뒤 고칠 때만 보인다.
//  거르기는 이 화면이 한다. 예전 데이터 형식(evidence가 읽는 때에 따라 거르는 getter이고 전체가 allEvidence)도 그대로 읽는다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const app = G.app;
  const I = () => G.data.interp || {};
  const ist = () => { const s = S(); if (!s.interp || typeof s.interp !== 'object') s.interp = {}; return s.interp; };
  const optText = (id) => ((I().options || []).find((o) => o.id === id) || {}).text || '';
  const allEv = () => I().allEvidence || I().evidence || [];
  const evFor = (heard) => allEv().filter((e) => heard || !e.after); // 대사의 말 전에는 after 항목을 뺀다
  const evOf = (id) => allEv().find((e) => e.id === id) || {};
  app.interpText = optText;
  app.interpEvidence = evOf;

  // 해석·근거 고르는 판. pre: 미리 골라 둘 것. must: 꼭 골라야 하면 표시(data-must). heard: 대사의 말을 들은 뒤(after 근거도 보임). onChange(pick)
  function picker(pre, o = {}) {
    const pick = { option: pre && pre.option || null, evidence: pre && pre.evidence || null };
    const box = h('div.interp-pick-box');
    box.appendChild(h('h4', T.inline(I().question || '꿈속의 삶은 헛것일까요?')));
    const opts = (I().options || []).map((op) => h('button.interp-opt', { type: 'button', dataset: { opt: op.id }, disabled: !!o.locked }, T.inline(op.text, { noFace: true })));
    box.appendChild(h('div.interp-opts', { role: 'group', 'aria-label': '해석' }, opts));
    box.appendChild(h('h4.ev-head', '그렇게 읽은 근거가 되는 구절 하나'));
    const evs = evFor(!!o.heard).map((e) => h('button.ev-opt', { type: 'button', dataset: { ev: e.id }, disabled: !!o.locked }, h('span.ev-t', T.inline(e.text, { noFace: true })), e.from ? h('span.ev-from', e.from) : null));
    box.appendChild(h('div.ev-opts', { role: 'group', 'aria-label': '근거 구절' }, evs));
    const draw = () => {
      opts.forEach((b) => { b.classList.toggle('chosen', b.dataset.opt === pick.option); b.setAttribute('aria-pressed', String(b.dataset.opt === pick.option)); if (o.must && !o.locked && !pick.option) b.setAttribute('data-must', ''); else b.removeAttribute('data-must'); });
      evs.forEach((b) => { b.classList.toggle('chosen', b.dataset.ev === pick.evidence); b.setAttribute('aria-pressed', String(b.dataset.ev === pick.evidence)); if (o.must && !o.locked && !pick.evidence) b.setAttribute('data-must', ''); else b.removeAttribute('data-must'); });
    };
    opts.forEach((b) => b.addEventListener('click', () => { pick.option = b.dataset.opt; G.audio.pick(); draw(); if (o.onChange) o.onChange(pick); }));
    evs.forEach((b) => b.addEventListener('click', () => { pick.evidence = b.dataset.ev; G.audio.pick(); draw(); if (o.onChange) o.onChange(pick); }));
    draw();
    box.pick = pick;
    return box;
  }
  // 고른 것을 글로
  function summary(p, cls) {
    const e = evOf(p.evidence);
    return h('div.interp-sum' + (cls ? '.' + cls : ''), h('p', h('b', '해석 '), T.inline(optText(p.option), { noFace: true })), h('p', h('b', '근거 '), T.inline(e.text || '', { noFace: true }), e.from ? h('span.small.muted', ' · ' + e.from) : null));
  }
  // 둘 다 골랐을 때만 아래 판에 진행 단추를 둔다
  function waitBoth(ctx, box, label) {
    return new Promise((resolve) => {
      const upd = () => {
        if (box.pick.option && box.pick.evidence) {
          if (!ctx.page.querySelector('#tray [data-act="next"]')) ctx.next(label).then(resolve);
        } else ctx.tray(null);
      };
      box.addEventListener('click', () => setTimeout(upd, 0));
      upd();
    });
  }

  app.screens.interp = async function (ctx, sc) {
    app.sceneHead(ctx, sc);
    const st = ist();
    // 1) 문답
    const lead = [...(sc.read || []), ...(I().dialogue || [])];
    if (lead.length) {
      ctx.step('read');
      ctx.section('reading').appendChild(T.blocks(lead));
      await ctx.next();
      if (!ctx.alive()) return;
    }
    // 2) 대사의 마지막 말 전에 고른다
    const ro = ctx.readonly || st.final;
    ctx.step('interp-pick');
    const ps = ctx.section('interp-pick');
    ps.appendChild(h('div.act-head', h('span.act-kind', '해석 고르기 · 채점하지 않아요'), h('h3', '대사가 답하기 전에 골라 보세요'),
      h('p.small', '해석 하나와 그 근거가 되는 구절 하나를 고르세요. 대사의 말을 들은 뒤 한 번 고칠 수 있어요.')));
    const locked = !!(st.heard || ro);
    const box = picker(st.first, { must: !locked, locked });
    ps.appendChild(box);
    if (!locked) {
      await waitBoth(ctx, box, '대사의 답을 듣는다 ▶');
      if (!ctx.alive()) return;
      st.first = { option: box.pick.option, evidence: box.pick.evidence, at: Date.now() };
      st.heard = true;
      st.changed = null;
      st.revised = false;
      G.save.write();
      box.querySelectorAll('button').forEach((b) => { b.disabled = true; b.removeAttribute('data-must'); });
    } else if (!st.first) {
      ps.appendChild(h('p.small.muted', '고른 해석이 없어요.'));
    }
    // 3) 대사의 마지막 말
    ctx.step('interp-answer');
    const lw = I().lastWords || {};
    const ls = ctx.section('last-words');
    ls.appendChild(h('div.act-head', h('span.act-kind.master', '육관대사')));
    if (lw.orig || lw.gloss) ls.appendChild(T.block(lw.orig ? { orig: lw.orig, gloss: lw.gloss, src: lw.src } : { gloss: lw.gloss }));
    if (lw.say) ls.appendChild(T.block({ say: lw.say, text: lw.text || '' }));
    // 4) 한 번 고치기
    ctx.step('interp-revise');
    const rs = ctx.section('interp-revise');
    if (ro || st.final) {
      rs.appendChild(h('h4', st.revised ? '대사의 말을 듣고 고친 해석' : '대사의 말을 들은 뒤에도 그대로 둔 해석'));
      if (st.first) rs.appendChild(summary(st.changed || st.first));
      await ctx.next();
    } else {
      rs.appendChild(h('h4', '대사의 말을 듣고 나니 어떤가요?'));
      rs.appendChild(h('p.small', '처음 고른 해석을 그대로 두어도 되고, 한 번 고칠 수도 있어요. 고친 흔적은 꿈 일지 마지막 장에 남아요.'));
      rs.appendChild(summary(st.first, 'first'));
      const rev = h('button.btn.small', { type: 'button', dataset: { act: 'revise' } }, '한 번 고치기');
      rs.appendChild(h('div.revise-row', rev));
      const choice = await new Promise((resolve) => {
        ctx.next('이대로 둔다 ▶').then(() => resolve('keep'));
        rev.addEventListener('click', () => resolve('revise'), { once: true });
      });
      if (!ctx.alive()) return;
      if (choice === 'revise') {
        rev.disabled = true;
        G.audio.tap();
        const nb = picker(st.first, { heard: true });
        rs.appendChild(nb);
        ctx.tray(null);
        await new Promise((resolve) => ctx.next('고친 것으로 정한다 ▶').then(resolve));
        if (!ctx.alive()) return;
        const p = nb.pick;
        const diff = p.option !== st.first.option || p.evidence !== st.first.evidence;
        st.changed = diff ? { option: p.option, evidence: p.evidence, at: Date.now() } : null;
        st.revised = diff;
        nb.querySelectorAll('button').forEach((b) => (b.disabled = true));
      } else {
        st.changed = null;
        st.revised = false;
      }
      st.final = true;
      G.save.write();
      rev.disabled = true;
      rev.remove();
      rs.appendChild(h('p.small.muted', st.revised ? '고친 흔적이 남았어요.' : '처음 고른 해석 그대로예요.'));
    }
    if (!ctx.alive()) return;
    // 5) 팔선녀의 출가와 결말
    ctx.step('ending');
    const es = ctx.section('ending');
    const end = I().ending || [];
    es.appendChild(end.length ? T.blocks(end) : h('p.narr', '팔선녀도 스스로 깨달아 머리를 깎고 대사의 제자가 되었어요.'));
    await ctx.next('꿈 일지 마지막 장으로 ▶');
  };
})();
