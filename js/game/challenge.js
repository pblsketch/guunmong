'use strict';
// 위기 도전과 생각 선택(js/data/challenges.js).
// G.challenge.find(sceneId, beatId, 'play'|'talk') -> 자료 또는 null
// G.challenge.play(ctx, challenge, host) -> Promise<boolean>: 풀면 true, 물러나거나 취소되면 false.
//  - ctx.options()가 있으면 학생의 첫 판가름을 정해지는 순간 G.save.recordFirst로 저장한다(결정 0022, 바뀌지 않음).
//    고르기는 처음 누른 선택지, 추리는 처음 답과 그때 펼친 단서 수, 찾기는 첫 판의 헛짚은 곳 하나씩(새로 고침 뒤 이어짐),
//    가락은 첫 실수(실패) 또는 실수 없이 마친 첫 판(성공). 다시 읽기·선생님용 등은 core가 거부하며 반응만 보인다.
//  - 실패는 이야기 속 대가(서술)를 보이고 같은 도전을 다시 하게 한다. 정답에 닿아야 원작대로 이어 간다. 점수·장부를 만들지 않는다.
//  - 앞 도전의 첫 판가름이 성공이면 G.play.after의 바뀐 시작(미리 표시한 곳·펼친 단서)과 안내를 보인다.
//  - ctx.signal 취소와 ctx.allow() 권한을 단추마다 다시 확인한다. 소리 없이도 풀 수 있게 가락은 빛으로도 보인다.
// G.challenge.choose(ctx, talk, mount) -> Promise<선택지|null>: 생각 선택. 저장은 부르는 쪽(world)이 행동과 함께 한다.
// G.challenge.preview(option) / label(option, firstId): 방향 미리 보기('공명▲ 풍류▼', '소원 그대로')와 '처음 고른 길' 표시.
// G.challenge.note(text) -> 접힌 '원작과 게임' details. 도전은 성공 뒤, 생각 선택은 고른 반응과 함께(stage) 보인다.
(function () {
  const { h } = G.util;
  const C = G.challenge = {};
  C.find = function (sceneId, beatId, slot = 'play') {
    return (G.data.challenges || []).find(c => c.scene === sceneId && c.beat === beatId && (slot === 'talk') === (c.kind === 'talk')) || null;
  };
  // 고르기 전 방향 미리 보기: 소원을 움직이는 선택지에 '공명▲ 풍류▼', 물러남에 '소원 그대로'. 숫자는 쓰지 않는다.
  const choiceUi = () => G.data.notes?.ui?.choice || {};
  C.preview = function (o) {
    const u = choiceUi();
    if (o?.stay === true) return u.stay || '소원 그대로';
    if (!Array.isArray(o?.wish) || !o.wish.length) return '';
    return o.wish.map(s => ((G.data.wishes || []).find(w => w.id === s.wish)?.name || s.wish) + (s.step > 0 ? u.up || '▲' : u.down || '▼')).join(' ');
  };
  // 선택지 단추의 글: 이름, 방향 미리 보기, 학생이 처음 고른 선택지면 '처음 고른 길'.
  C.label = function (o, firstId) {
    const preview = C.preview(o);
    return [h('span.choice-label', o.label), preview ? h('span.choice-preview', { dataset: { preview: '' } }, preview) : null,
      firstId && o.id === firstId ? h('span.choice-first', { dataset: { first: '' } }, choiceUi().first || '처음 고른 길') : null];
  };
  const firstChoice = id => G.save.state.play?.choices?.[id]?.option || null;
  C.note = text => h('details.challenge-note', h('summary', '원작과 게임'), h('p', text));
  C.play = function (ctx, c, host) {
    return new Promise(resolve => {
      let settled = false, won = false;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive() && !won) fn(); }, ms); timers.add(t); };
      const alive = () => !settled && ctx.alive() && !ctx.signal.aborted;
      const allowed = () => alive() && (!ctx.allow || ctx.allow());
      // 첫 판가름: 학생의 첫 판만 정해지는 순간 저장한다. 저장 실패(권한·회차)면 오류 화면으로 넘기고 반응을 보이지 않는다.
      const stored = () => G.play.first(G.save.state, c.id);
      let deciding = !!ctx.options && !ctx.readonly && G.play.recording(G.save.state, ctx.options().by) && !(stored() && stored().ok !== null);
      const record = input => {
        if (!deciding) return true;
        const r = G.save.recordFirst(c.id, input, ctx.options());
        if (!r.ok && (r.reason === 'unavailable' || r.reason === 'stale')) { deciding = false; if (ctx.fail) ctx.fail(); end(false); return false; }
        if (!r.ok || r.first?.ok !== null) deciding = false;
        return true;
      };
      // 뒤 장면 변화: 앞 도전의 첫 판가름이 성공이면 바뀐 시작과 안내 한 줄.
      const after = G.play.after(G.save.state, G.data, c.id);
      const afterNote = after?.text ? h('p.challenge-after', { role: 'note', dataset: { after: '' } }, after.text) : null;
      const feedback = h('p.challenge-feedback', { role: 'status', 'aria-live': 'polite' });
      const body = h('div.challenge-body');
      const actions = h('div.challenge-actions');
      const leave = h('button.btn.small.challenge-leave', { type: 'button', dataset: { challenge: 'leave' } }, '잠시 물러나기');
      const book = h('section.challenge-book', { role: 'dialog', 'aria-modal': 'true', 'aria-label': c.title, dataset: { challengeId: c.id, kind: c.kind } },
        h('h3.challenge-title', c.title), h('p.challenge-intro', c.intro), afterNote, body, feedback, actions);
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
        if (c.note) actions.appendChild(C.note(c.note));
        const next = button('.primary', '이어 가기 ▶', () => end(true), { challenge: 'continue' });
        actions.appendChild(next); next.focus({ preventScroll: true });
      }
      const kinds = {
        pick() {
          // 시회처럼 소원을 움직이는 고르기는 처음 누른 선택지가 고른 말로도 함께 남는다(recordFirst 한 저장).
          const firstId = firstChoice(c.id);
          body.appendChild(h('div.challenge-options', c.options.map(o => button('.challenge-option', C.label(o, firstId), e => {
            const el = e.currentTarget;
            G.audio.pick();
            if (!record({ option: o.id })) return;
            if (o.id === c.answer) solved(o.reply);
            else { el.disabled = true; fail(o.reply); }
          }, { option: o.id }))));
        },
        deduce() {
          const seen = new Set();
          const cards = c.clues.map((text, i) => {
            const card = button('.challenge-clue', '단서 ' + (i + 1) + ' 펼치기', () => open(i, true), { clue: String(i) });
            card.setAttribute('aria-pressed', 'false');
            return card;
          });
          function open(i, sound) {
            if (seen.has(i) || !cards[i]) return;
            seen.add(i); if (sound) G.audio.page();
            cards[i].replaceChildren(h('span', c.clues[i])); cards[i].classList.add('open'); cards[i].setAttribute('aria-pressed', 'true');
          }
          if (Number.isInteger(after?.clue)) open(after.clue, false);
          // 질문과 선택지는 처음부터 보인다. 틀리면 실패 서술 뒤 아직 닫힌 단서 하나가 펼쳐진다.
          const question = h('div.challenge-question', h('p', h('b', c.question)),
            h('div.challenge-options', c.options.map(o => button('.challenge-option', o.label, e => {
              const el = e.currentTarget;
              G.audio.pick();
              if (!record({ option: o.id, clues: seen.size })) return;
              if (o.id === c.answer) { solved(c.success); return; }
              el.disabled = true; fail(c.fail);
              const closed = cards.findIndex((_, i) => !seen.has(i));
              if (closed >= 0) open(closed, false);
            }, { option: o.id }))));
          body.append(h('div.challenge-clues', cards), question);
        },
        search() {
          // 미리 표시한 곳(after.spots)은 단서를 펼친 채 누를 수 없고 촛불을 쓰지 않는다.
          const marked = after?.spots || [];
          let left = c.tries;
          const lamps = h('p.challenge-tries', { dataset: { tries: String(left) } });
          const grid = h('div.challenge-spots');
          const draw = () => {
            lamps.dataset.tries = String(left);
            lamps.replaceChildren(h('span', '남은 기회 '), ...Array.from({ length: c.tries }, (_, i) => h('i.challenge-lamp' + (i < left ? '.lit' : ''), { 'aria-hidden': 'true' })), h('span.sr', String(left)));
          };
          const check = (el, spot) => { el.disabled = true; el.classList.add('checked'); el.replaceChildren(h('b', spot.label), h('span', spot.clue)); };
          const press = (spot, el) => {
            G.audio.tap();
            if (!record({ spot: spot.id })) return;
            if (spot.id === c.answer) { solved(c.success); return; }
            check(el, spot); left--; draw();
            if (left > 0) { say(spot.clue); return; }
            fail(c.fail); grid.querySelectorAll('button').forEach(b => { b.disabled = true; });
            const again = button('.primary', '다시 하기', () => reset([]), { challenge: 'retry' });
            actions.replaceChildren(again, leave); again.focus({ preventScroll: true });
          };
          // 첫 판이 아직 진행 중이면(새로 고침·물러남 뒤) 헛짚은 곳과 꺼진 촛불을 그대로 잇는다.
          const reset = tried => {
            left = c.tries - tried.length; draw(); say(''); actions.replaceChildren(leave);
            grid.replaceChildren(...c.spots.map(spot => {
              if (marked.includes(spot.id)) return h('button.btn.challenge-spot.checked.warned', { type: 'button', disabled: true, dataset: { spot: spot.id, warned: '' } }, h('b', spot.label), h('span', spot.clue));
              const el = button('.challenge-spot', spot.label, () => press(spot, el), { spot: spot.id });
              if (tried.includes(spot.id)) check(el, spot);
              return el;
            }));
          };
          body.append(lamps, grid);
          reset(deciding && stored()?.ok === null ? (stored().tried || []).filter(id => c.spots.some(s => s.id === id)) : []);
        },
        sequence() {
          let round = 0, input = [], playing = false;
          const pads = c.notes.map((n, i) => button('.challenge-pad', n.label, () => {
            if (playing) return;
            sound(i); flash(i);
            const want = c.rounds[round][input.length];
            if (i !== want) { if (!record({ ok: false })) return; input = []; fail(c.fail); return; }
            input.push(i);
            if (input.length < c.rounds[round].length) return;
            input = []; round++; delete book.dataset.ready; pads.forEach(p => { p.disabled = true; });
            if (round >= c.rounds.length) { if (!record({ ok: true })) return; solved(c.success); return; }
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
  // 고르기 전 방향 미리 보기를 보이고, 학생이 처음 고른 선택지에는 '처음 고른 길'을 붙인다(다시 읽기).
  C.choose = function (ctx, c, mount) {
    return new Promise(resolve => {
      let settled = false;
      const done = value => { if (settled) return; settled = true; ctx.signal.removeEventListener('abort', cancel); tray.remove(); resolve(value); };
      const cancel = () => done(null);
      const firstId = firstChoice(c.id);
      const tray = h('div.tray.choice-tray', { role: 'group', 'aria-label': c.prompt }, c.options.map(o => h('button.btn.choice', { type: 'button', dataset: { talk: o.id }, on: { click: () => {
        if (!settled && ctx.alive() && (!ctx.allow || ctx.allow())) { G.audio.pick(); done(o); }
      } } }, C.label(o, firstId))));
      ctx.signal.addEventListener('abort', cancel, { once: true });
      if (ctx.signal.aborted || !ctx.alive()) { done(null); return; }
      mount(tray); tray.querySelector('button')?.focus({ preventScroll: true });
    });
  };
})();
