'use strict';
// 읽기 활동: '원문을 읽고 구절·단서·낱말을 골라 칸에 넣는' 한 가지 틀(명세 4.3). 리듬·카드 대결·퍼즐 같은 별도 조작은 없다.
//  - 모든 칸을 채워야 [확인]을 누를 수 있다(여러 칸을 한 번에 확정해 찍기를 막는다).
//  - 채점하는 활동에서 틀리면 도움 사다리가 차례로 열린다: 틀린 칸 표시 → 여백 메모(힌트) → 정답 보기.
//  - 장부에는 첫 시도 정확도와 도움 사용만 남는다(감점 없음). 선생님용 '정답 채우기'·'정답 보기'는 '도움 사용(선생님용)'.
//  - 채점하지 않는 활동(scored: false)은 고른 것을 picks에만 남기고 장부에 넣지 않는다.
//  - 이미 마친 활동을 다시 풀거나(다시 읽기) readonly이면 기록을 하나도 바꾸지 않는다.
// 꿈 일지(4장)처럼 다른 화면에서도 같은 틀을 쓸 수 있게 화면 흐름과 떼어 두었다.
//
// G.activity.mount(box, act, opt) → { done: Promise<{ ok, picks }> , el }
//   act: js/data/README.md의 '읽기 활동' 형식. act.reusable이면 한 선택지를 여러 칸에 넣을 수 있다(꿈 일지: 여러 사건이 한 소원으로)
//   opt: { tray(content), readonly, mode: 'first'|'review', onSolved }
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
    const mode = opt.mode || S().mode;
    // 선택지: 다시 읽기에서는 헷갈리는 선택지(extra)가 더 들어간다. 같은 활동은 늘 같은 순서로 섞는다
    const pool = [...(act.choices || []), ...(mode === 'review' ? act.extra || [] : [])];
    const choices = G.util.shuffle([...new Set(pool)], G.util.hash(act.id));
    const filled = {};          // 칸 id → 고른 것
    let sel = null;             // 고른 칸
    let tries = 0, memoOpen = false, solved = false;
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));

    const el = h('section.activity', { dataset: { actId: act.id }, 'aria-label': act.title || '읽기 활동' });
    if (!scored) el.classList.add('unscored');
    el.appendChild(h('div.act-head',
      h('span.act-kind', scored ? '읽기 활동' : '읽기 활동 · 채점하지 않아요'),
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
      try(ok) { if (!ro && scored) G.save.ledgerTry(act.id, ok); },
      help(who) { if (!ro && scored) G.save.ledgerHelp(act.id, who); },
      done() { if (!ro && scored) G.save.ledgerDone(act.id); },
      wrong(slot, picked) { if (!ro && scored) { G.save.wrongNote({ act: act.id, slot: slot.id, picked, answer: answersOf(slot)[0], note: slot.note || act.wrongNote || '' }); G.save.write(); } },
    };

    function draw() {
      for (const s of act.slots) {
        const b = slotEls[s.id];
        const v = filled[s.id];
        b.querySelector('.v').replaceChildren(v != null ? T.inline(v, { noFace: true }) : document.createTextNode('　'));
        b.classList.toggle('filled', v != null);
        b.classList.toggle('sel', sel === s.id && !solved);
      }
      const used = new Set(act.reusable ? [] : Object.values(filled));
      for (const b of choiceEls) b.classList.toggle('used', used.has(b.dataset.choice));
      check.disabled = solved || act.slots.some((s) => filled[s.id] == null);
    }
    function nextEmpty() { const s = act.slots.find((x) => filled[x.id] == null); return s ? s.id : null; }
    function onSlot(id) {
      if (solved) return;
      G.audio.tap();
      if (filled[id] != null && sel === id) { delete filled[id]; slotEls[id].classList.remove('wrong', 'shown'); }
      sel = id;
      draw();
    }
    function onChoice(c) {
      if (solved) return;
      if (!sel || !act.slots.some((s) => s.id === sel)) sel = nextEmpty() || act.slots[0].id;
      // 한 선택지는 한 칸에만: 다른 칸에 있던 것은 옮긴다(reusable이면 그대로 둔다)
      if (!act.reusable) for (const k in filled) if (filled[k] === c) { delete filled[k]; slotEls[k].classList.remove('wrong', 'shown'); }
      filled[sel] = c;
      slotEls[sel].classList.remove('wrong', 'shown');
      G.audio.place();
      sel = nextEmpty() || sel;
      draw();
    }
    function fillAnswers(cls) {
      for (const s of act.slots) { filled[s.id] = answersOf(s)[0]; slotEls[s.id].classList.remove('wrong'); if (cls) slotEls[s.id].classList.add(cls); }
      sel = null;
      draw();
    }
    function onCheck() {
      if (solved || act.slots.some((s) => filled[s.id] == null)) return;
      if (!scored) {
        if (!ro) { S().picks[act.id] = Object.assign({}, filled); G.save.write(); }
        return finish(true, '골랐어요. 채점하지 않는 활동이에요.');
      }
      tries++;
      const wrong = act.slots.filter((s) => !isRight(s, filled[s.id]));
      rec.try(wrong.length === 0);
      if (!wrong.length) { G.audio.ok(); return finish(true, tries === 1 ? '맞았어요!' : '맞았어요.'); }
      G.audio.no();
      for (const s of act.slots) slotEls[s.id].classList.toggle('wrong', wrong.includes(s));
      for (const s of wrong) rec.wrong(s, filled[s.id]);
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
      rec.help('student');
      memoOpen = true;
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
      rec.help('student');
      fillAnswers('shown');
      btnAnswer.hidden = true;
      feedback.textContent = '정답을 넣어 두었어요. 원문에서 확인하고 [확인]을 누르세요.';
    });
    // 선생님용: 정답 채우기 / 정답 보기 → 장부에 '도움 사용(선생님용)'. 학생이 풀기 전이면 첫 시도는 null(시도 안 함)로 남는다(G.save.ledgerTry)
    tFill.addEventListener('click', () => { rec.help('teacher'); fillAnswers('shown'); });
    tShow.addEventListener('click', () => {
      rec.help('teacher');
      G.ui.pop(tShow, h('div.answer-key', h('b', '정답'), h('ol', act.slots.map((s) => h('li', s.label ? T.plain(s.label) + ': ' : '', answersOf(s).join(' / '))))));
    });

    function finish(ok, msg) {
      solved = true;
      rec.done();
      el.classList.add('solved');
      for (const s of act.slots) slotEls[s.id].classList.remove('wrong', 'sel');
      $$('.help', el).forEach((b) => (b.hidden = true));
      feedback.textContent = msg + (ro && !opt.quiet ? ' (다시 읽기라 기록은 그대로예요)' : '');
      if (act.explain) { explain.replaceChildren(h('span.tag', '풀이'), T.inline(act.explain)); explain.hidden = false; }
      draw();
      if (opt.onSolved) opt.onSolved();
      resolveDone({ ok, picks: Object.assign({}, filled) });
    }

    // 다시 읽기: 이미 마친 활동이면 고른 답을 보여 준다(채점하지 않는 것)
    if (!scored && S().picks[act.id] && ro) Object.assign(filled, S().picks[act.id]);
    sel = nextEmpty();
    draw();
    return { el, done, check };
  };
})();
