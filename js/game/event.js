'use strict';
// 사건은 기록과 같은 차례로 재생한다. 보상·다음 위치는 ctx.finishEvent가 한 번에 저장한다.
(function () {
  const { h } = G.util;
  const E = (G.event = {});
  E.items = function (items) {
    return h('div.reward-items', (items || []).map((item) => h('div.reward-item', { dataset: { item: item.id } },
      item.img ? G.util.pixImg('assets/items/' + item.img + '.webp', { size: 48 }) : h('span.item-placeholder', '物'),
      h('div', h('b', item.name), item.desc ? h('p.small', G.text.inline(item.desc)) : null))));
  };
  function history(sc) {
    const rec = G.save.state.events[sc.id];
    return h('div.prep-history', h('h3', '그때의 준비'), (rec?.turns || []).map((action, i) => h('p', G.prep.labels('actions')[action] + ' · 윤목 ' + rec.rolls[i])));
  }
  function clues(sc) {
    const p = h('p'), words = (sc.clues || []).slice().sort((a, b) => b.length - a.length);
    let text = sc.preview;
    while (text) {
      const hits = words.map((word) => ({ word, at: text.indexOf(word) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
      if (!hits.length) { p.append(text); break; }
      const hit = hits[0]; p.append(text.slice(0, hit.at), h('mark', hit.word)); text = text.slice(hit.at + hit.word.length);
    }
    const actions = G.prep.labels('actions');
    const preparation = (G.save.state.events[sc.id]?.turns || []).map((action) => h('li', h('b', actions[action]), ' · ', sc.core.includes(G.sim.actions[action]) ? '단서와 이어지는 준비' : '다른 능력을 키운 준비'));
    return h('section.clue-card', h('h2', '단서 짚기'), p,
      h('p', (sc.clues || []).join(' · ') + ' → ' + sc.core.map((id) => G.prep.labels('abilities')[id]).join(' · ')),
      h('div.prep-reflection', h('h3', '내 준비 돌아보기'), h('ul', preparation), h('p.small', '준비에 따라 평판은 달라져도 사건의 결말은 같아요. 다음 예고에서도 단서와 준비를 이어 보세요.')));
  }
  async function scene(ctx, sc) {
    ctx.step('scene'); ctx.main.replaceChildren();
    const done = G.stage.play(ctx, sc);
    const detach = G.pearl.attach(ctx, sc, ctx.main.querySelector('.stage'));
    await done; detach();
    if (!ctx.alive()) return;
    const bonds = (G.data.bonds || []).filter((b) => b.id === sc.meet || G.app.remeets(sc).some((r) => r.bond === b.id));
    if (!bonds.length) return;
    ctx.main.replaceChildren(...bonds.map((b) => G.app.bondCard(b)));
    if (!ctx.readonly && sc.meet && !G.save.state.bonds.includes(sc.meet)) { G.save.state.bonds.push(sc.meet); G.save.write(); }
    await ctx.next('인연첩에 적기 ▶');
  }
  G.app.screens.event = async function (ctx, sc) {
    const order = ['preview', 'prep1', 'prep2', 'scene', 'grade', 'clue'];
    const start = ctx.readonly ? 0 : Math.max(0, order.indexOf(ctx.startStep));
    for (const step of order.slice(start)) {
      if (!ctx.alive()) return;
      if (step.startsWith('prep')) {
        if (!ctx.readonly) await G.prep.run(ctx, sc, step === 'prep1' ? 0 : 1);
      } else if (step === 'scene') await scene(ctx, sc);
      else {
        ctx.main.replaceChildren();
        if (step === 'grade') {
          if (!ctx.readonly) {
            for (const item of sc.items || []) if (!G.save.state.items.includes(item.id)) G.save.state.items.push(item.id);
            ctx.finishEvent();
          }
          ctx.step('grade');
          const rec = G.save.state.events[sc.id];
          const grade = h('section.grade', { dataset: { grade: rec.grade } }, h('span.tag', '사건 결과'),
            h('h2', G.prep.labels('grades')[rec.grade]), h('p', sc.gradeText[rec.grade]),
            h('div.reward-numbers', Object.entries(rec.reward).map(([id, value]) => h('span', { dataset: { resource: id }, style: { whiteSpace: 'nowrap' } }, G.prep.icon(id), G.prep.labels('resources')[id] + ' ', h('b.reward-count', { dataset: { value } }, '+' + value)))));
          ctx.main.append(grade, E.items(sc.items));
          const fiction = G.prep.fiction(ctx, 'items'); if (fiction) ctx.main.append(fiction);
          G.audio.grade(rec.grade);
          const started = performance.now();
          let frame;
          const cancel = () => cancelAnimationFrame(frame);
          const count = (now) => {
            if (!ctx.alive()) return;
            const progress = Math.min(1, (now - started) / 450);
            grade.querySelectorAll('.reward-count').forEach((el) => { el.textContent = '+' + Math.round(Number(el.dataset.value) * progress); });
            if (progress < 1) frame = requestAnimationFrame(count);
            else { grade.dataset.counted = 'true'; ctx.signal.removeEventListener('abort', cancel); }
          };
          ctx.signal.addEventListener('abort', cancel, { once: true });
          frame = requestAnimationFrame(count);
          await G.prep.wait(ctx, 500);
        } else {
          ctx.step(step);
          if (step === 'preview') {
            ctx.main.append(h('h2', sc.title), G.prep.card(sc));
            if (ctx.readonly) ctx.main.append(history(sc));
            for (const key of ['prep', 'score']) { const fiction = G.prep.fiction(ctx, key); if (fiction) ctx.main.append(fiction); }
          } else ctx.main.append(clues(sc));
        }
        if (ctx.alive()) await ctx.next(step === 'clue' ? '다음 칸으로 ▶' : '다음 ▶');
      }
    }
  };
  G.app.screens.link = async function (ctx, sc) {
    ctx.step('link'); await G.stage.play(ctx, sc);
    if (!ctx.alive()) return;
    const bonus = sc.bonus || {};
    ctx.main.replaceChildren(h('h2', sc.title), E.items(bonus.items));
    for (const [key, value] of Object.entries(bonus.abil || {})) ctx.main.append(h('p', G.prep.labels('abilities')[key] + ' +' + value));
    await ctx.next('길 떠나기 ▶');
  };
})();
