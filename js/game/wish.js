'use strict';
(function () {
  const { h } = G.util;
  G.app.screens.wish = async function (ctx, sc) {
    ctx.step('wish');
    const S = G.save.state, id = 'a-wish';
    const ro = ctx.readonly || !!S.ledger[id]?.final;
    const record = S.journal.wish || { selected: [], wrong: 0 };
    if (!ro) S.journal.wish = record;
    let solved = ro || sc.answers.every((word) => record.selected.includes(word));
    let answerShown = !!S.ledger[id]?.help;
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    const cancel = () => resolveDone(false);
    ctx.signal.addEventListener('abort', cancel, { once: true });
    const words = new Map(sc.words.map((word) => [word.id, word]));
    const passage = h('div.wish-passage');
    let remaining = sc.monologue;
    const buttons = [];
    while (remaining) {
      const match = sc.words.map((word) => ({ word, index: remaining.indexOf(word.text) })).filter((x) => x.index >= 0).sort((a, b) => a.index - b.index || b.word.text.length - a.word.text.length)[0];
      if (!match) { passage.append(remaining); break; }
      passage.append(remaining.slice(0, match.index));
      const button = h('button.wish-word', { type: 'button', dataset: { word: match.word.id } }, match.word.text);
      buttons.push(button); passage.append(button); remaining = remaining.slice(match.index + match.word.text.length);
    }
    const gauges = h('div.wish-found-list'), feedback = h('p', { role: 'status', 'aria-live': 'polite' });
    const memo = h('div.wish-memo', { hidden: record.wrong < 2 }, sc.memo || '앞으로 바라는 삶을 찾아보세요.');
    const answer = h('button.btn.small', { type: 'button', dataset: { help: 'answer' }, hidden: record.wrong < 2 }, '정답 보기');
    const fill = h('button.btn.small.teacher-btn', { type: 'button', dataset: { teacher: 'fill' } }, '정답 채우기');
    const show = h('button.btn.small.teacher-btn', { type: 'button', dataset: { teacher: 'show' } }, '정답 보기(선생님)');
    ctx.main.append(h('section.wish-search', h('h2', sc.title), h('p.small', '독백에서 앞으로 누리고 싶은 삶을 찾아 누르세요.'), passage, gauges, feedback, memo, h('div.wish-help', answer, fill, show)));
    function draw() {
      for (const b of buttons) {
        const selected = record.selected.includes(b.dataset.word);
        b.disabled = solved || selected;
        b.classList.toggle('selected', selected);
        b.classList.toggle('answer', answerShown && sc.answers.includes(b.dataset.word) && !selected);
      }
      gauges.replaceChildren(...record.selected.map((key) => {
        const def = G.data.wishes.find((w) => w.id === words.get(key)?.wish);
        return h('div.wish-found', { dataset: { wish: def?.id || key } }, h('b', def?.dreamHidden ? '?' : def?.name || words.get(key).text), h('meter', { min: 0, max: 1, value: 0 }));
      }));
      memo.hidden = record.wrong < 2;
      answer.hidden = solved || record.wrong < 2;
      fill.disabled = show.disabled = solved;
    }
    function finish() {
      if (ro || solved || !sc.answers.every((word) => record.selected.includes(word))) return;
      G.save.ledgerTry(id, record.wrong === 0); G.save.ledgerDone(id);
      solved = true; feedback.textContent = '다섯 소원을 찾았어요.'; draw(); resolveDone(true);
    }
    for (const b of buttons) b.onclick = () => {
      if (!ctx.alive() || ro || solved) return;
      const key = b.dataset.word;
      if (sc.answers.includes(key)) {
        if (!record.selected.includes(key)) record.selected.push(key);
        G.audio.pick(); feedback.textContent = '소원을 찾았어요.';
      } else {
        record.wrong++; b.classList.add('wrong'); feedback.textContent = '이 낱말은 바라는 삶이 아니에요.';
        G.save.ledgerTry(id, false); G.save.wrongNote({ act: id, slot: key, picked: words.get(key).text, answer: '소원 낱말' }); G.audio.no();
      }
      G.save.write(); draw(); finish();
    };
    const help = (who, all) => {
      if (!ctx.alive() || ro || solved || (who === 'teacher' && !S.teacher)) return;
      G.save.ledgerHelp(id, who); answerShown = true;
      if (all) { record.selected = [...sc.answers]; G.save.write(); }
      draw(); finish();
    };
    answer.onclick = () => help('student', false); show.onclick = () => help('teacher', false); fill.onclick = () => help('teacher', true);
    draw();
    if (!solved) await done;
    ctx.signal.removeEventListener('abort', cancel);
    if (ctx.alive()) await ctx.next('소원을 품고 ▶');
  };
})();
