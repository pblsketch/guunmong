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
    if (!ctx.alive() || !solved || !await secretWish(ctx)) return;
    if (ctx.alive()) await ctx.next('소원을 품고 ▶');
  };

  // 숨긴 소원(소원 찾기 확정 바로 뒤, 같은 화면). 드러난 넷 가운데 하나를 한 번만 고른다.
  // 고르기 전에는 다음으로 갈 수 없고, 창을 닫았다 열면 같은 자리에서 다시 묻는다.
  // 선생님용은 core가 기록을 거부(teacher)하므로 반응만 보이고 막지 않는다. 다시 읽기는 고른 것만 보인다.
  // 어떻게 이루는지는 알려 주지 않는다. 화면 글은 notes.ui.secretWish(데이터 점검이 열쇠를 확인)에서 읽고, 아래는 같은 값의 대비용이다.
  const SECRET = { title: '숨긴 소원', prompt: '소원 가운데 꿈에서 가장 먼저 이루고 싶은 것 하나를 마음속에 숨겨 두세요.',
    hint: '한 번 고르면 바꿀 수 없어요. 어떻게 이룰지는 알려 주지 않아요.',
    button: '이 소원을 숨기고 꿈으로', review: '처음 숨긴 소원', saved: '마음속에 숨겨 두었어요.', teacher: '선생님용에서는 숨긴 소원을 기록하지 않아요.',
    retry: '기록을 저장하지 못했어요. 다시 시도해 주세요.' };
  const RULE = ['teacher', 'auto', 'awake', 'decided', 'duplicate'];
  function secretWish(ctx) {
    const text = { ...SECRET, ...(G.data.notes?.ui?.secretWish || {}) };
    const name = (id) => G.data.wishes.find((w) => w.id === id)?.name || id;
    const chosen = () => G.save.state.play?.secretWish ?? null;
    const box = h('section.secret-wish', { 'aria-label': text.title });
    const review = (id, note) => box.replaceChildren(h('h3', text.review),
      id ? h('p.secret-wish-chosen', { dataset: { secretChosen: id } }, h('b', name(id))) : null,
      note ? h('p.small', { role: 'status', 'aria-live': 'polite' }, note) : null);
    if (ctx.readonly || chosen()) {
      // 다시 읽기·이미 정한 기록: 고른 것만 보이고 선택지는 그리지 않는다.
      if (chosen()) { review(chosen()); ctx.main.append(box); }
      return Promise.resolve(true);
    }
    let picked = null, decided = false, settle;
    const gate = new Promise((resolve) => { settle = resolve; });
    const quit = () => { if (refreshCurrent === draw) refreshCurrent = null; settle(false); };
    ctx.signal.addEventListener('abort', quit, { once: true });
    const choices = G.play.WISHES.map((id) => h('button.btn.secret-wish-option', { type: 'button', 'aria-pressed': 'false', dataset: { secretWish: id } }, name(id)));
    const confirm = h('button.btn.primary', { type: 'button', dataset: { act: 'secret' } }, text.button);
    const feedback = h('p.small', { role: 'status', 'aria-live': 'polite' });
    box.append(h('h3', text.title), h('p', text.prompt), h('p.small.secret-wish-hint', text.hint),
      h('div.secret-wish-options', { role: 'group', 'aria-label': text.title }, ...choices), confirm, feedback);
    ctx.main.append(box);
    const blocked = () => !ctx.canAct() || decided || !!document.querySelector('.sheet-back, .fold-ov');
    function draw() {
      if (!ctx.alive() || decided) return;
      for (const b of choices) { b.disabled = !ctx.canAct(); b.setAttribute('aria-pressed', String(b.dataset.secretWish === picked)); }
      confirm.disabled = !ctx.canAct() || !picked && !G.save.state.teacher;
    }
    function close(note) {
      decided = true;
      ctx.signal.removeEventListener('abort', quit);
      if (refreshCurrent === draw) refreshCurrent = null;
      review(chosen(), note); settle(true);
    }
    for (const b of choices) b.onclick = () => {
      if (blocked()) return;
      picked = b.dataset.secretWish; feedback.textContent = ''; draw();
    };
    confirm.onclick = () => {
      if (blocked()) return;
      const teacher = !!G.save.state.teacher;
      if (!picked && !teacher) return;
      const result = G.save.chooseSecretWish(picked, { run: ctx.run, readonly: ctx.readonly, by: teacher ? 'teacher' : 'student' });
      if (!ctx.alive()) return;
      if (result.ok) { G.audio.pick(); close(text.saved); return; }
      // 규칙상 기록하지 않는 경우(선생님용·깨어난 뒤·이미 정함): 반응만 보이고 이어 간다.
      if (RULE.includes(result.reason)) { close(result.reason === 'teacher' ? text.teacher : result.reason === 'decided' ? text.saved : ''); return; }
      if (G.save.error === 'storage') { ctx.fail(); return; }
      feedback.textContent = text.retry; draw();
    };
    refreshCurrent = draw;
    draw();
    setTimeout(() => { if (ctx.alive() && box.isConnected) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30);
    return gate;
  }
})();
