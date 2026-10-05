'use strict';
(function () {
  const { h } = G.util;
  let refreshCurrent = null;
  G.app.on('settings', () => refreshCurrent?.());
  G.app.screens.wish = async function (ctx, sc) {
    if (ctx.step('wish') === false) return;
    const id = 'a-wish', options = { run: ctx.run, readonly: ctx.readonly };
    const read = () => {
      const saved = G.save.state.journal.wish;
      return { selected: [...(saved?.selected || [])], wrong: saved?.wrong || 0 };
    };
    let record = read();
    const readonly = () => ctx.readonly || !!G.save.state.ledger[id]?.final;
    const canInput = () => ctx.canAct() && !readonly() && !solved;
    let solved = readonly();
    let answerShown = !!G.save.state.ledger[id]?.help;
    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    const cancel = () => { if (refreshCurrent === draw) refreshCurrent = null; resolveDone(false); };
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
      if (!ctx.alive()) return;
      record = read();
      for (const b of buttons) {
        const selected = record.selected.includes(b.dataset.word);
        b.disabled = !canInput() || selected;
        b.classList.toggle('selected', selected);
        b.classList.toggle('answer', answerShown && sc.answers.includes(b.dataset.word) && !selected);
      }
      gauges.replaceChildren(...record.selected.map((key) => {
        const def = G.data.wishes.find((w) => w.id === words.get(key)?.wish);
        return h('div.wish-found', { dataset: { wish: def?.id || key } }, h('b', def?.dreamHidden ? '?' : def?.name || words.get(key).text), h('meter', { min: 0, max: 1, value: 0 }));
      }));
      memo.hidden = record.wrong < 2;
      answer.hidden = solved || record.wrong < 2;
      answer.disabled = !canInput();
      fill.hidden = show.hidden = !G.save.state.teacher;
      fill.disabled = show.disabled = !canInput() || !G.save.state.teacher;
    }
    function failed() {
      if (!ctx.alive()) return;
      feedback.textContent = '기록을 저장하지 못했어요. 다시 시도해 주세요.';
      if (G.save.error === 'storage') ctx.fail();
      else draw();
    }
    function finish() {
      if (!ctx.alive() || solved || !sc.answers.every((word) => record.selected.includes(word))) return;
      if (!G.save.state.ledger[id]?.final) {
        if (!ctx.canAct() || ctx.readonly || !G.save.transact(ctx.run, next => {
          if (next.ledger[id]?.final || !sc.answers.every(word => next.journal.wish?.selected?.includes(word))) return false;
          const ledger = next.ledger[id] || (next.ledger[id] = { first: null, help: null, final: false });
          if (ledger.first == null && ledger.help !== 'teacher') ledger.first = (next.journal.wish?.wrong || 0) === 0;
          ledger.final = true;
        }, options)) { failed(); return; }
      }
      solved = true; feedback.textContent = '다섯 소원을 찾았어요.'; draw(); resolveDone(true);
    }
    function store(change) {
      if (!canInput()) return false;
      const ok = G.save.transact(ctx.run, next => {
        if (next.ledger[id]?.final) return false;
        const value = { selected: [...(next.journal.wish?.selected || [])], wrong: next.journal.wish?.wrong || 0 };
        change(value, next);
        next.journal.wish = value;
        if (sc.answers.every(word => value.selected.includes(word))) {
          const ledger = next.ledger[id] || (next.ledger[id] = { first: value.wrong === 0, help: null, final: false });
          if (ledger.first == null && ledger.help !== 'teacher') ledger.first = value.wrong === 0;
          ledger.final = true;
        }
      }, options);
      if (!ok) { failed(); return false; }
      record = read(); return true;
    }
    for (const b of buttons) b.onclick = () => {
      if (!canInput() || document.querySelector('.sheet-back, .fold-ov')) return;
      const key = b.dataset.word;
      if (record.selected.includes(key)) return;
      if (sc.answers.includes(key)) {
        if (!store(value => value.selected.push(key))) return;
        G.audio.pick(); feedback.textContent = '소원을 찾았어요.';
      } else {
        if (!store((value, next) => {
          value.wrong++;
          const ledger = next.ledger[id] || (next.ledger[id] = { first: false, help: null, final: false });
          if (ledger.first == null && ledger.help !== 'teacher') ledger.first = false;
          if (!next.wrong.some(entry => entry.act === id && entry.slot === key)) next.wrong.push({ act: id, slot: key, picked: words.get(key).text, answer: '소원 낱말' });
        })) return;
        b.classList.add('wrong'); feedback.textContent = '이 낱말은 바라는 삶이 아니에요.'; G.audio.no();
      }
      draw(); finish();
    };
    const help = (who, all) => {
      if (!canInput() || document.querySelector('.sheet-back, .fold-ov') || (who === 'teacher' && !G.save.state.teacher) || (who === 'student' && record.wrong < 2)) return;
      if (all) {
        if (!store((value, next) => {
          const ledger = next.ledger[id] || (next.ledger[id] = { first: null, help: null, final: false });
          ledger.help = who === 'teacher' || ledger.help === 'teacher' ? 'teacher' : 'student';
          value.selected = [...sc.answers];
        })) return;
      } else if (!G.save.ledgerHelp(id, who, options)) { failed(); return; }
      answerShown = true;
      draw(); finish();
    };
    answer.onclick = () => help('student', false); show.onclick = () => help('teacher', false); fill.onclick = () => help('teacher', true);
    refreshCurrent = draw;
    draw(); finish();
    if (!solved) await done;
    ctx.signal.removeEventListener('abort', cancel);
    if (refreshCurrent === draw) refreshCurrent = null;
    if (ctx.alive() && solved) await ctx.next('소원을 품고 ▶');
  };
})();
