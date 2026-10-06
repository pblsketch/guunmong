'use strict';
// 맞대기 칸 채우기와 도움 사다리. 첫 기록·선생님 도움·final 잠금은 G.save가 맡는다.
// mount(box, act, {tray, readonly, state?, completed?, signal?, run?, canAct?, persist?, onSolved?})
// state는 지역 입력의 시작값이며 persist가 저장된 결과와 분리해 보존한다.
(function () {
  const { h, $$, norm } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const A = (G.activity = {});

  const answersOf = (slot) => [].concat(slot.answer == null ? [] : slot.answer);
  const isRight = (slot, v) => answersOf(slot).some((a) => norm(a) === norm(v));

  A.mount = function (box, act, opt = {}) {
    const scored = act.scored !== false;
    const ro = !!opt.readonly || !!(S().ledger[act.id] && S().ledger[act.id].final);
    // 같은 활동의 선택지는 늘 같은 순서로 섞는다
    const pool = [...(act.choices || [])];
    const choices = G.util.shuffle([...new Set(pool)], G.util.hash(act.id));
    const filled = { ...(opt.state?.picks || {}) };          // 칸 id → 고른 것
    let sel = null;             // 고른 칸
    let tries = opt.state?.tries || 0, memoOpen = !!opt.state?.memoOpen, solved = false, pendingCheck = false;
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));
    const cancel = () => resolveDone({ cancelled: true });
    opt.signal?.addEventListener('abort', cancel, { once: true });
    let warned = false;
    const canAct = () => !ro && !opt.signal?.aborted && (!opt.canAct || opt.canAct());
    const failed = () => {
      if (!warned) G.ui.toast('기록을 저장하지 못했어요. 이 화면의 입력은 남겨 두었으니 다시 시도해 주세요.');
      warned = true;
      return false;
    };
    const persist = () => {
      if (!canAct()) return ro ? true : false;
      if (!opt.persist) return true;
      return opt.persist({ picks: { ...filled }, tries, memoOpen }) ? true : failed();
    };

    const el = h('section.activity', { dataset: { actId: act.id }, 'aria-label': act.title || '읽기 활동' });
    if (!scored) el.classList.add('unscored');
    el.appendChild(h('div.act-head',
      h('span.act-kind', scored ? '읽기 활동' : '읽기 활동 · 정해진 답이 없어요'),
      act.title ? h('h3', act.title) : null,
      act.prompt ? h('p.prompt', T.inline(act.prompt)) : null));

    // 칸
    const slotEls = {};
    const mkSlot = (id) => {
      const def = act.slots.find((s) => s.id === id);
      const b = h('button.slot', { type: 'button', dataset: { slot: id }, 'aria-label': (def && def.label ? def.label : '빈칸') + ' 칸' }, h('span.v', '　'));
      b.addEventListener('click', () => onSlot(id));
      slotEls[id] = b;
      return b;
    };
    const inPassage = new Set();
    if (act.passage) {
      for (const p of T.parse(act.passage)) if (p.k === 'slot') inPassage.add(p.id);
      const body = T.inline(act.passage, { slot: mkSlot, noFace: true });
      // 原文 낙관은 영인 대조를 마친 글(passageKind: 'orig')에만. 그 밖에는 모두 풀이 바탕이다
      const isOrig = act.passageKind === 'orig';
      if (isOrig && T.hasOld(act.passage)) body.classList.add('old');
      el.appendChild(h('div.passage' + (isOrig ? '.mark.orig' : '.gloss'), isOrig ? h('span.seal', '原文') : h('span.tag', '풀이'), h('div.orig-text', body)));
    }
    const rest = act.slots.filter((s) => !inPassage.has(s.id));
    if (rest.length) el.appendChild(h('div.slot-list', rest.map((s) => h('div.slot-row', s.label ? h('span.slot-label', T.inline(s.label)) : null, mkSlot(s.id)))));

    // 고를 것
    const choiceEls = choices.map((c) => {
      const b = h('button.choice', { type: 'button', dataset: { choice: c } }, T.inline(c, { noFace: true }));
      b.addEventListener('click', () => onChoice(c));
      return b;
    });
    el.appendChild(h('div.choices', { role: 'group', 'aria-label': '고를 것' }, choiceEls));

    // 도움 사다리와 선생님용 단추
    const memo = h('div.memo', { hidden: true });
    const btnMemo = h('button.btn.small.help', { type: 'button', dataset: { help: 'memo' }, hidden: true }, '여백 메모 보기');
    const btnAnswer = h('button.btn.small.help', { type: 'button', dataset: { help: 'answer' }, hidden: true }, '정답 보기');
    const tFill = h('button.btn.small.teacher-btn', { type: 'button', dataset: { teacher: 'fill' } }, '정답 채우기');
    const tShow = h('button.btn.small.teacher-btn', { type: 'button', dataset: { teacher: 'show' } }, '정답 보기(선생님)');
    const feedback = h('p.feedback', { role: 'status', 'aria-live': 'polite' });
    if (scored) el.appendChild(h('div.help-row', btnMemo, btnAnswer, tFill, tShow));
    el.appendChild(memo);
    el.appendChild(feedback);
    const explain = h('div.explain', { hidden: true });
    el.appendChild(explain);
    box.appendChild(el);

    const check = h('button.btn.primary', { type: 'button', dataset: { act: 'check' }, disabled: true }, '확인');
    check.addEventListener('click', onCheck);
    if (opt.tray) opt.tray(check);

    // ── 기록(readonly이면 아무것도 바꾸지 않는다)
    const rec = {
      try(ok) { return !scored || ro || canAct() && G.save.ledgerTry(act.id, ok, { run: opt.run, readonly: ro }); },
      help(who) { return !scored || ro || canAct() && G.save.ledgerHelp(act.id, who, { run: opt.run, readonly: ro }); },
      done() { return !scored || ro || canAct() && G.save.ledgerDone(act.id, { run: opt.run, readonly: ro }); },
      wrong(slot, picked) {
        if (!scored || ro) return true;
        if (!canAct()) return false;
        if (S().wrong.some((entry) => entry.act === act.id && entry.slot === slot.id)) return true;
        return G.save.wrongNote({ act: act.id, slot: slot.id, picked, answer: answersOf(slot)[0], note: slot.note || act.wrongNote || '' }, { run: opt.run, readonly: ro });
      },
    };

    function draw() {
      for (const s of act.slots) {
        const b = slotEls[s.id];
        const v = filled[s.id];
        b.querySelector('.v').replaceChildren(v != null ? T.inline(v, { noFace: true }) : document.createTextNode('　'));
        b.classList.toggle('filled', v != null);
        b.classList.toggle('sel', sel === s.id && !solved);
        b.disabled = ro || solved;
      }
      const used = new Set(act.reusable ? [] : Object.values(filled));
      for (const b of choiceEls) b.classList.toggle('used', used.has(b.dataset.choice));
      for (const b of choiceEls) b.disabled = ro || solved;
      check.disabled = ro || solved || act.slots.some((s) => filled[s.id] == null);
    }
    function nextEmpty() { const s = act.slots.find((x) => filled[x.id] == null); return s ? s.id : null; }
    function onSlot(id) {
      if (solved || !canAct()) return;
      G.audio.tap();
      if (filled[id] != null && sel === id) { delete filled[id]; slotEls[id].classList.remove('wrong', 'shown'); }
      pendingCheck = false;
      sel = id;
      persist(); draw();
    }
    function onChoice(c) {
      if (solved || !canAct()) return;
      if (!sel || !act.slots.some((s) => s.id === sel)) sel = nextEmpty() || act.slots[0].id;
      // 한 선택지는 한 칸에만: 다른 칸에 있던 것은 옮긴다(reusable이면 그대로 둔다)
      if (!act.reusable) for (const k in filled) if (filled[k] === c) { delete filled[k]; slotEls[k].classList.remove('wrong', 'shown'); }
      filled[sel] = c;
      pendingCheck = false;
      slotEls[sel].classList.remove('wrong', 'shown');
      G.audio.place();
      sel = nextEmpty() || sel;
      persist(); draw();
    }
    function fillAnswers(cls) {
      for (const s of act.slots) { filled[s.id] = answersOf(s)[0]; slotEls[s.id].classList.remove('wrong'); if (cls) slotEls[s.id].classList.add(cls); }
      sel = null;
      persist(); draw();
    }
    function onCheck() {
      if (solved || !canAct() || act.slots.some((s) => filled[s.id] == null)) return;
      if (!scored) {
        return finish(true, '골랐어요. 왜 그렇게 골랐는지 떠올려 보세요.');
      }
      if (!pendingCheck) {
        const previousTries = tries;
        tries++;
        if (!persist()) { tries = previousTries; draw(); return; }
      }
      const wrong = act.slots.filter((s) => !isRight(s, filled[s.id]));
      if (!rec.try(wrong.length === 0)) { pendingCheck = true; return failed(); }
      if (!wrong.length) { G.audio.ok(); return finish(true, tries === 1 ? '맞았어요!' : '맞았어요.'); }
      G.audio.no();
      for (const s of act.slots) slotEls[s.id].classList.toggle('wrong', wrong.includes(s));
      for (const s of wrong) if (!rec.wrong(s, filled[s.id])) { pendingCheck = true; return failed(); }
      pendingCheck = false;
      feedback.textContent = '붉게 표시된 칸을 다시 읽어 보세요.' + (tries === 1 ? ' 막히면 여백 메모를 볼 수 있어요.' : '');
      // 사다리 1단: 틀린 칸 표시(위) → 여백 메모가 열린다
      btnMemo.hidden = false;
      if (memoOpen) btnAnswer.hidden = false;
      sel = wrong[0].id;
      draw();
      G.ui.shake(el);
    }
    // 사다리 2단: 여백 메모
    btnMemo.addEventListener('click', () => {
      G.audio.hint();
      if (!rec.help('student')) return failed();
      memoOpen = true; persist();
      const wrongSlots = act.slots.filter((s) => slotEls[s.id].classList.contains('wrong'));
      memo.replaceChildren(h('span.tag', '여백 메모'),
        act.memo ? h('p', T.inline(act.memo)) : null,
        ...wrongSlots.filter((s) => s.memo).map((s) => h('p', s.label ? h('b', T.plain(s.label) + ': ') : null, T.inline(s.memo))));
      if (!memo.childNodes[1]) memo.appendChild(h('p', '원문을 한 번 더 천천히 읽어 보세요.'));
      memo.hidden = false;
      btnMemo.hidden = true;
      btnAnswer.hidden = false; // 사다리 3단이 열린다
    });
    // 사다리 3단: 정답 보기(칸에 정답을 넣어 준다. [확인]은 학생이 누른다)
    btnAnswer.addEventListener('click', () => {
      G.audio.tap();
      if (!rec.help('student')) return failed();
      fillAnswers('shown');
      btnAnswer.hidden = true;
      feedback.textContent = '정답을 넣어 두었어요. 원문에서 확인하고 [확인]을 누르세요.';
    });
    // 선생님용: 정답 채우기 / 정답 보기 → 장부에 '도움 사용(선생님용)'. 학생이 풀기 전이면 첫 시도는 null(시도 안 함)로 남는다(G.save.ledgerTry)
    tFill.addEventListener('click', () => { if (rec.help('teacher')) fillAnswers('shown'); else failed(); });
    tShow.addEventListener('click', () => {
      if (!rec.help('teacher')) return failed();
      G.ui.pop(tShow, h('div.answer-key', h('b', '정답'), h('ol', act.slots.map((s) => h('li', s.label ? T.plain(s.label) + ': ' : '', answersOf(s).join(' / '))))));
    });

    function finish(ok, msg) {
      if (!rec.done()) { pendingCheck = true; return failed(); }
      pendingCheck = false;
      solved = true;
      el.classList.add('solved');
      for (const s of act.slots) slotEls[s.id].classList.remove('wrong', 'sel');
      $$('.help', el).forEach((b) => (b.hidden = true));
      feedback.textContent = msg + (ro && !opt.quiet ? ' (다시 읽기라 기록은 그대로예요)' : '');
      if (act.explain) { explain.replaceChildren(h('span.tag', '풀이'), T.inline(act.explain)); explain.hidden = false; }
      draw();
      if (opt.onSolved) opt.onSolved();
      opt.signal?.removeEventListener('abort', cancel);
      resolveDone({ ok, picks: Object.assign({}, filled) });
    }

    // 다시 읽기: 이미 마친 활동이면 고른 답을 보여 준다(채점하지 않는 것)

    sel = nextEmpty();
    draw();
    if (tries > 0 && !opt.completed) {
      for (const slot of act.slots) slotEls[slot.id].classList.toggle('wrong', !isRight(slot, filled[slot.id]));
      btnMemo.hidden = false;
    }
    if (opt.completed) {
      for (const s of act.slots) filled[s.id] = answersOf(s)[0];
      solved = true;
      el.classList.add('solved');
      feedback.textContent = '확정한 맞대기예요. (다시 읽기라 기록은 그대로예요)';
      draw();
      opt.signal?.removeEventListener('abort', cancel);
      resolveDone({ ok: true, picks: { ...filled } });
    }
    return { el, done, check };
  };
})();
