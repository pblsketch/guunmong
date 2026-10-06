'use strict';
// 위기 도전과 생각 선택(js/data/challenges.js).
// G.challenge.find(sceneId, beatId, 'play'|'talk') -> 자료 또는 null
// G.challenge.play(ctx, challenge, host) -> Promise<boolean>: 풀면 true, 물러나거나 취소되면 false.
//  - 도전 결과·실패는 저장하지 않는다. 풀었을 때 월드가 기존 행동 완료 경로로 이어 간다.
//  - 실패는 이야기 속 대가(서술)를 보이고 같은 도전을 다시 하게 한다. 점수·장부·능력치를 만들지 않는다.
//  - ctx.signal 취소와 ctx.allow() 권한을 단추마다 다시 확인한다. 소리 없이도 풀 수 있게 가락은 빛으로도 보인다.
(function () {
  const { h } = G.util;
  const C = G.challenge = {};
  C.find = function (sceneId, beatId, slot = 'play') {
    return (G.data.challenges || []).find(c => c.scene === sceneId && c.beat === beatId && (slot === 'talk') === (c.kind === 'talk')) || null;
  };
  C.play = function (ctx, c, host) {
    return new Promise(resolve => {
      let settled = false, won = false;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive() && !won) fn(); }, ms); timers.add(t); };
      const alive = () => !settled && ctx.alive() && !ctx.signal.aborted;
      const allowed = () => alive() && (!ctx.allow || ctx.allow());
      const feedback = h('p.challenge-feedback', { role: 'status', 'aria-live': 'polite' });
      const body = h('div.challenge-body');
      const actions = h('div.challenge-actions');
      const leave = h('button.btn.small.challenge-leave', { type: 'button', dataset: { challenge: 'leave' } }, '잠시 물러나기');
      const book = h('section.challenge-book', { role: 'dialog', 'aria-modal': 'true', 'aria-label': c.title, dataset: { challengeId: c.id, kind: c.kind } },
        h('h3.challenge-title', c.title), h('p.challenge-intro', c.intro), body, feedback, actions);
      const layer = h('div.world-challenge', book);
      host.appendChild(layer);
      const end = ok => {
        if (settled) return; settled = true;
        for (const t of timers) clearTimeout(t); timers.clear();
        ctx.signal.removeEventListener('abort', cancel); layer.remove(); resolve(ok);
      };
      const cancel = () => end(false);
      ctx.signal.addEventListener('abort', cancel, { once: true });
      const button = (cls, label, onClick, data = {}) => h('button.btn' + cls, { type: 'button', dataset: data, on: { click: e => { if (allowed()) onClick(e); } } }, label);
      leave.addEventListener('click', () => { if (alive()) end(false); });
      const say = (text, tone) => { feedback.textContent = text || ''; feedback.dataset.tone = tone || ''; };
      const fail = text => {
        say(text, 'fail'); G.audio.no();
        book.classList.remove('shake'); void book.offsetWidth; book.classList.add('shake');
      };
      function solved(text) {
        won = true; book.dataset.solved = 'true'; delete book.dataset.ready;
        for (const t of timers) clearTimeout(t); timers.clear();
        G.audio.ok(); body.querySelectorAll('button').forEach(b => { b.disabled = true; });
        say(text, 'ok'); actions.replaceChildren();
        if (c.note) actions.appendChild(h('details.challenge-note', h('summary', '원작과 게임'), h('p', c.note)));
        const next = button('.primary', '이어 가기 ▶', () => end(true), { challenge: 'continue' });
        actions.appendChild(next); next.focus({ preventScroll: true });
      }
      const kinds = {
        pick() {
          body.appendChild(h('div.challenge-options', c.options.map(o => button('.challenge-option', o.label, e => {
            G.audio.pick();
            if (o.id === c.answer) solved(o.reply);
            else { e.currentTarget.disabled = true; fail(o.reply); }
          }, { option: o.id }))));
        },
        deduce() {
          const seen = new Set();
          const question = h('div.challenge-question', { hidden: true }, h('p', h('b', c.question)),
            h('div.challenge-options', c.options.map(o => button('.challenge-option', o.label, e => {
              G.audio.pick();
              if (o.id === c.answer) solved(c.success); else { e.currentTarget.disabled = true; fail(c.fail); }
            }, { option: o.id }))));
          const cards = c.clues.map((text, i) => {
            const card = button('.challenge-clue', '단서 ' + (i + 1) + ' 펼치기', () => {
              if (seen.has(i)) return;
              seen.add(i); G.audio.page(); card.replaceChildren(h('span', text)); card.classList.add('open'); card.setAttribute('aria-pressed', 'true');
              if (seen.size === c.clues.length) { question.hidden = false; say('단서를 모두 보았다. 이제 골라 보자.'); question.querySelector('button')?.focus({ preventScroll: true }); }
            }, { clue: String(i) });
            card.setAttribute('aria-pressed', 'false');
            return card;
          });
          body.append(h('div.challenge-clues', cards), question);
          say('단서를 모두 펼쳐 보자.');
        },
        search() {
          let left = c.tries;
          const lamps = h('p.challenge-tries', { dataset: { tries: String(left) } });
          const grid = h('div.challenge-spots');
          const draw = () => {
            lamps.dataset.tries = String(left);
            lamps.replaceChildren(h('span', '남은 기회 '), ...Array.from({ length: c.tries }, (_, i) => h('i.challenge-lamp' + (i < left ? '.lit' : ''), { 'aria-hidden': 'true' })), h('span.sr', String(left)));
          };
          const reset = () => {
            left = c.tries; draw(); say(''); actions.replaceChildren(leave);
            grid.replaceChildren(...c.spots.map(spot => button('.challenge-spot', spot.label, e => {
              G.audio.tap();
              if (spot.id === c.answer) { solved(c.success); return; }
              const el = e.currentTarget; el.disabled = true; el.classList.add('checked');
              el.replaceChildren(h('b', spot.label), h('span', spot.clue));
              left--; draw();
              if (left > 0) { say(spot.clue); return; }
              fail(c.fail); grid.querySelectorAll('button').forEach(b => { b.disabled = true; });
              const again = button('.primary', '다시 하기', reset, { challenge: 'retry' });
              actions.replaceChildren(again, leave); again.focus({ preventScroll: true });
            }, { spot: spot.id })));
          };
          body.append(lamps, grid); reset();
        },
        sequence() {
          let round = 0, input = [], playing = false;
          const pads = c.notes.map((n, i) => button('.challenge-pad', n.label, () => {
            if (playing) return;
            sound(i); flash(i);
            const want = c.rounds[round][input.length];
            if (i !== want) { input = []; fail(c.fail); return; }
            input.push(i);
            if (input.length < c.rounds[round].length) return;
            input = []; round++; delete book.dataset.ready; pads.forEach(p => { p.disabled = true; });
            if (round >= c.rounds.length) { solved(c.success); return; }
            say('가락이 이어진다. 한 번 더, 조금 더 길게.'); later(demo, 700);
          }, { note: String(i) }));
          const progress = h('p.challenge-round');
          const listen = button('', '가락 다시 듣기', () => { if (!playing) demo(); }, { challenge: 'listen' });
          function sound(i) { G.audio.note(c.notes[i].midi, c.instrument); }
          function flash(i) { const pad = pads[i]; pad.classList.remove('lit'); void pad.offsetWidth; pad.classList.add('lit'); later(() => pad.classList.remove('lit'), 320); }
          function demo() {
            playing = true; input = []; pads.forEach(p => { p.disabled = true; }); listen.disabled = true;
            book.dataset.round = String(round); delete book.dataset.ready;
            progress.textContent = '가락 ' + (round + 1) + ' / ' + c.rounds.length;
            say('잘 듣고 빛나는 차례를 기억하자.');
            c.rounds[round].forEach((n, k) => later(() => { sound(n); flash(n); }, 450 + k * 520));
            later(() => { playing = false; pads.forEach(p => { p.disabled = false; }); listen.disabled = false; book.dataset.ready = 'true'; say('이제 같은 차례로 눌러 불어 보자.'); pads[0].focus({ preventScroll: true }); }, 450 + c.rounds[round].length * 520 + 200);
          }
          pads.forEach(p => { p.disabled = true; }); listen.disabled = true;
          body.append(progress, h('div.challenge-pads', pads));
          actions.prepend(listen);
          later(demo, 400);
        },
      };
      actions.appendChild(leave);
      kinds[c.kind]();
      (body.querySelector('button:not([disabled])') || leave).focus({ preventScroll: true });
    });
  };
  // 생각 선택: 대사 창 안에서 고르고 상대의 반응을 본다. 무엇을 골라도 원작의 다음 사건으로 이어진다.
  C.choose = function (ctx, c, mount) {
    return new Promise(resolve => {
      let settled = false;
      const done = value => { if (settled) return; settled = true; ctx.signal.removeEventListener('abort', cancel); tray.remove(); resolve(value); };
      const cancel = () => done(null);
      const tray = h('div.tray.choice-tray', { role: 'group', 'aria-label': c.prompt }, c.options.map(o => h('button.btn.choice', { type: 'button', dataset: { talk: o.id }, on: { click: () => {
        if (!settled && ctx.alive() && (!ctx.allow || ctx.allow())) { G.audio.pick(); done(o); }
      } } }, o.label)));
      ctx.signal.addEventListener('abort', cancel, { once: true });
      if (ctx.signal.aborted || !ctx.alive()) { done(null); return; }
      mount(tray); tray.querySelector('button')?.focus({ preventScroll: true });
    });
  };
})();
