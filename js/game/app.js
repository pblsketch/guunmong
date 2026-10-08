'use strict';
// 저장은 화면 생성 시점 run과 현재 권한을 검사한다.
(function () {
  const { h, $, $$ } = G.util;
  const ui = G.ui, T = G.text;
  const app = (G.app = { booted: false });
  const S = () => G.save.state;
  const root = () => document.getElementById('app');
  const run = () => S().rpg?.run;
  const writer = (r = run()) => G.save.canWrite(r);
  const options = ctx => ({ run: ctx.run, readonly: ctx.readonly, by: S().teacher ? 'teacher' : 'student' });
  const isDone = id => G.experience.finished(S(), id);
  const sheets = new Set();
  let lastField = null;
  function rememberField() {
    const camera = document.querySelector('[data-game-field] .world-camera');
    if (!camera) return;
    lastField = camera.cloneNode(true);
    lastField.classList.add('world-backdrop');
    lastField.removeAttribute('tabindex');
    lastField.setAttribute('aria-hidden', 'true');
    lastField.inert = true;
    const map = lastField.querySelector('[data-world]');
    if (map) { map.classList.add('world-backdrop-map'); map.removeAttribute('data-world'); map.removeAttribute('tabindex'); }
    for (const el of lastField.querySelectorAll('[data-object],[data-world-target],[data-act]')) {
      el.removeAttribute('data-object'); el.removeAttribute('data-world-target'); el.removeAttribute('data-act');
    }
  }
  function gameShell(page, scene, mode) {
    const field = h('div.game-field', { dataset: { gameField: '' }, 'aria-hidden': mode === 'world' ? 'false' : 'true' });
    if (lastField) field.appendChild(lastField.cloneNode(true));
    if (mode !== 'world' && scene?.img) field.appendChild(h('img.scene-backdrop', { src: 'assets/sc/' + scene.img + '.webp', alt: '' }));
    const shell = h('div.game-shell', { dataset: { gameShell: '', mode } });
    if (mode === 'menu') shell.append(field, page);
    else { page.prepend(field); shell.append(page); }
    return { shell, field };
  }
  function closeSheets() { for (const close of [...sheets]) close(null); ui.closeSheets(); }
  function sheet(content, buttons, opt) {
    let closer;
    return ui.sheet(close => {
      closer = close; sheets.add(close);
      return typeof content === 'function' ? content(close) : h('div', content);
    }, buttons, opt).finally(() => sheets.delete(closer));
  }
  const confirm = (title, body, yes, no) => sheet([h('h3', title), h('p', body)], [{ label: no, value: false }, { label: yes, value: true, cls: 'seal' }]);
  function cancel() { playToken++; current?.abort.abort(); current = null; ui.unpop(); closeSheets(); }
  function savingDenied() { ui.toast('이 탭에서는 기록을 바꿀 수 없어요. 저장 탭에서 이어 해 주세요.'); }
  function accessNotice() {
    const mode = G.save.access;
    const r = run();
    if (mode === 'writer') return null;
    const msg = mode === 'reader' ? '다른 탭에서 진행 중이에요. 그 탭을 닫은 뒤 이어 할 수 있어요.' : mode === 'acquiring' ? '저장 권한을 확인하고 있어요.' : '저장 권한을 얻지 못했어요. 기존 기록만 읽을 수 있어요.';
    return h('div.save-access', { role: 'status', dataset: { access: mode } }, h('p', msg), h('button.btn.small', { type: 'button', disabled: mode === 'acquiring', dataset: { act: 'acquire' }, on: { click: async e => {
      if (!e.currentTarget.isConnected || r !== run()) return;
      const ok = await G.save.acquireWriter();
      if (ok) { app.applySettings(); app.resume(); } else app.title({ replace: true });
    } } }, '이 탭에서 이어 하기'));
  }

  const CHAPTERS = [
    { id: '0', label: '서장', name: '「조신 설화」' },
    { id: '1', label: '1장', name: '연화봉' },
    { id: '2', label: '2장', name: '꿈속의 삶' },
    { id: '3', label: '3장', name: '깨어남' },
    { id: '4', label: '4장', name: '꿈 일지' },
    { id: '5', label: '5장', name: '육관대사' },
    { id: 'R', label: '결과', name: '꿈 일지 마지막 장' },
  ];
  // 환몽 구조: 각 장이 현실인지 꿈인지 이야기 지도에 표시한다.
  const FRAME = { 1: { kind: 'real', label: '현실' }, 2: { kind: 'dream', label: '꿈' }, 3: { kind: 'wake', label: '꿈 → 깨어남' }, 4: { kind: 'real', label: '현실' }, 5: { kind: 'real', label: '현실' }, R: { kind: 'real', label: '현실' } };
  const DEFAULT_BGM = { 0: 'calm', 1: 'lotus', 2: 'dream', 3: 'feast', 4: 'reflect', 5: 'lotus', R: 'calm' };
  const KIND_NAME = { waking: '지팡이 소리', journal: '꿈 일지', interp: '육관대사의 물음', result: '결과' };
  app.CHAPTERS = CHAPTERS;
  const chIdx = (ch) => CHAPTERS.findIndex((c) => c.id === String(ch));
  const chOf = (ch) => CHAPTERS[chIdx(ch)] || CHAPTERS[0];

  // ───────── 사건(이벤트)과 확장 자리
  const listeners = {};
  app.on = (ev, fn) => {
    const bucket = listeners[ev] = listeners[ev] || []; bucket.push(fn);
    return () => { const index = bucket.indexOf(fn); if (index >= 0) bucket.splice(index, 1); };
  };
  const emit = (ev, ...a) => { for (const fn of [...(listeners[ev] || [])]) { try { fn(...a); } catch (e) { console.error(e); } } };
  const hooks = { between: [], chapter: [], scene: [] };
  app.hook = (name, fn) => { (hooks[name] = hooks[name] || []).push(fn); };
  app.toolbar = [];
  app.screens = {};
  app.steps = {};
  app.flow = ['scene'];

  // ───────── 장면 목록(데이터 + 비어 있는 장의 기본 화면)
  let LIST = null;
  app.list = function () {
    if (LIST) return LIST;
    const src = (G.data.scenes || []).filter((s) => s && s.id && !s.optional && chIdx(s.ch) >= 0).map((s) => Object.assign({}, s, { ch: String(s.ch) }));
    LIST = src;
    return LIST;
  };
  const byId = (id) => app.list().find((s) => s.id === id) || null;
  const idx = (id) => app.list().findIndex((s) => s.id === id);
  const firstOf = (ch) => app.list().find((s) => s.ch === String(ch)) || null;
  app.byId = byId;
  // 깨어난 선방 장면(3장에서 awakened: true). 없으면 4장 첫 장면
  function awakenedIdx() {
    const L = app.list();
    let i = L.findIndex((s) => s.awakened);
    if (i < 0) i = L.findIndex((s) => chIdx(s.ch) >= 4);
    return i < 0 ? L.length : i;
  }
  // 깨어난 뒤 잠기는 장면인가(0~3장 중 깨어난 선방 앞)
  const dreamLocked = (sc) => S().awake && chIdx(sc.ch) <= 3 && idx(sc.id) < awakenedIdx();

  // ───────── 열 수 있는가(목차·주소·뒤로 가기·엔진 API가 모두 이 문을 지난다)
  function studentCanOpen(id) {
    const sc = byId(id);
    if (!sc) return false;
    if (dreamLocked(sc)) return false;
    if (!S().awake && G.experience.find(G.data, 'c3-staff') && idx(id) >= awakenedIdx()) return false;
    if (isDone(id) || S().rpg?.scenes?.[id]?.status === 'auto') return true;
    return id === S().pos || id === (resumeTarget() || {}).id; // 지금 하고 있는(해야 할) 장면
  }
  app.canOpen = id => !!byId(id) && (S().teacher || studentCanOpen(id));
  function lockMsg(id) {
    const sc = byId(id);
    if (sc && dreamLocked(sc)) return '깨어난 뒤에는 꿈으로 돌아갈 수 없어요. 다시 꿈꾸려면 처음부터 새로 시작해요.';
    return '아직 열리지 않은 장면이에요. 장은 차례대로 열려요.';
  }

  // ───────── 이어 하기 자리
  function resumeTarget() { return byId(G.experience.resume(S(), G.data)) || app.list()[0] || null; }
  app.resumeTarget = resumeTarget;
  app.resume = function () { const t = resumeTarget(); if (!t) { app.title(); return false; } return app.open(t.id, { resume: true, reenact: !S().awake && t.ch === '3' && !t.awakened }); };
  // 다시 보기에서 돌아올 때는 새로 고침의 3장 되감기를 적용하지 않는다.
  function continueSaved() {
    const saved = byId(S().pos);
    if (saved && app.canOpen(saved.id)) play(saved.id);
    else app.resume();
  }

  app.isAwake = () => !!S().awake;
  // 3장의 지팡이 소리 순간에 부른다. 한 번 기록되면 새로 시작하기 전까지 되돌릴 수 없다
  app.wake = function (ctx = current?.ctx) {
    if (ctx !== current?.ctx || !ctx?.alive() || ctx.scene.id !== 'c3-staff' || ctx.readonly || !app.canOpen(ctx.scene.id) || S().awake) return false;
    const action = G.experience.find(G.data, ctx.scene.id)?.beats.find(b => b.trigger.kind === 'staff');
    if (!action) return false;
    const outcome = G.save.commitWake(ctx.scene.id, action.id, options(ctx));
    if (!outcome.ok) return false;
    ctx.committed = true; current.refreshTools?.(); emit('wake'); return true;
  };

  // ───────── 설정 반영
  app.applySettings = function () {
    const c = document.documentElement.classList;
    c.toggle('big', !!S().big);
    c.toggle('teacher', !!S().teacher);
    const top = document.querySelector('.play .topbar');
    const fold = top?.querySelector('[data-tool="fold"]');
    if (!S().teacher) fold?.remove();
    else if (top && !fold) {
      const owner = current?.ctx;
      top.appendChild(ui.iconBtn('fold', '화면 접기(잠깐 멈춤)', e => { if (owner?.screenAlive() && e.currentTarget.isConnected && S().teacher) ui.fold(); }, { dataset: { tool: 'fold' } }));
    }
    current?.refreshTools?.();
    // 본문을 다시 열지 않고 설정을 따르는 도구만 즉시 갱신한다.
    emit('settings');
    recheck();
  };

  // ───────── 지금 화면
  let current = null, playToken = 0;
  app.current = function () {
    if (!current) return null;
    const sc = current.scene;
    return { scene: sc.id, ch: sc.ch, kind: sc.kind || 'scene', step: current.step, revisit: current.revisit, autoAdvance: current.autoAdvance, data: sc };
  };

  // ───────── 타이틀
  app.title = function (opt = {}) {
    playToken++;
    current?.abort.abort();
    current = null;
    ui.unpop();
    closeSheets();
    if (opt.replace) history.replaceState({ screen: 'title' }, '');
    else if (!opt.fromPop && !(history.state && history.state.screen === 'title')) history.pushState({ screen: 'title' }, '');
    G.audio.play((G.data.bgm || {}).title || 'calm');
    const st = S();
    const started = st.started && G.data.ok;
    const menu = h('div.menu');
    const titleToken = playToken, titleRun = run();
    const go = (fn) => () => { if (titleToken !== playToken || titleRun !== run()) return; G.audio.unlock(); fn(); };
    if (started) menu.appendChild(h('button.btn.primary', { type: 'button', on: { click: go(() => app.resume()) } }, '이어 하기'));
    menu.appendChild(h('button.btn' + (started ? '' : '.primary'), { type: 'button', disabled: !G.data.ok || !writer(), on: { click: go(() => app.newGame(started)) } }, started ? '처음부터 새로' : '시작하기'));
    if (started) menu.appendChild(h('button.btn', { type: 'button', on: { click: go(() => app.toc()) } }, '목차'));
    menu.appendChild(h('button.btn', { type: 'button', on: { click: go(() => app.settings()) } }, '설정'));
    const r = root();
    const title = h('div.title-screen.game-menu-window',
      h('div.art', G.util.pixImg('assets/ui/title.webp', { cls: 'title-art', maxh: 0.6 })),
      h('div.logo', h('h1', '구운몽'), h('div.sub', '한바탕 꿈')),
      h('p.tagline', '성진과 양소유의 공간을 걷고 이야기를 따라가요.'), accessNotice(),
      G.data.ok ? null : h('p.data-missing', '내용 데이터(js/data/)를 아직 불러오지 못했어요. 임시 데이터로 둘러보려면 주소 끝에 ?fixture=1 을 붙이세요.'),
      menu,
      h('div.credit', '김만중 「구운몽」 학습 게임 · 풀이 글은 이 게임을 위해 새로 쓴 것이에요'),
      h('div.credit', '만든이 박준일(온양여자고등학교 국어 교사)'),
      h('div.credit', G.audio.credit()),
      h('div.title-tools', ui.full.offer() ? ui.full.button() : null, musicToggle()));
    r.replaceChildren(gameShell(title, null, 'menu').shell);
  };
  // 타이틀 오른쪽 위, 전체 화면 단추 옆의 배경음 켜기/끄기(설정의 '배경음'과 같은 값)
  function musicToggle() {
    const r = run();
    const b = h('button.icon-btn.music-toggle', { type: 'button' });
    b.disabled = !writer(r);
    const draw = () => { const on = S().music; b.innerHTML = ui.ICON[on ? 'musicOn' : 'musicOff']; b.setAttribute('aria-label', on ? '배경음 끄기' : '배경음 켜기'); b.title = b.getAttribute('aria-label'); b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { if (!b.isConnected || !G.save.transact(r, n => { n.music = !n.music; })) { savingDenied(); return; } G.audio.unlock(); G.audio.music(S().music); draw(); });
    draw();
    return b;
  }

  // ───────── 새로 시작: 확인을 받고 모든 기록을 지운다
  app.newGame = async function (confirmReset) {
    const r = run();
    if (!writer(r)) { savingDenied(); return false; }
    if (confirmReset && !await confirm('처음부터 새로 할까요?', '지금까지의 기록이 모두 지워져요. 설정은 그대로예요.', '새로 시작', '그만두기')) return false;
    if (!G.save.reset(r, { confirmed: true, cancel })) { savingDenied(); app.title(); return false; }
    emit('reset'); app.applySettings();
    const first = app.list()[0], opened = first ? app.open(first.id) : false;
    // 미션 퍼스트: 새로 시작하면 돌다리 위에 임무 창을 먼저 띄운다. 기록을 쓰지 않으며 이야기 지도에서 다시 볼 수 있다.
    if (opened) app.mission({ start: true });
    return opened;
  };

  // ───────── 임무: 학생의 역할·할 일·끝까지 살아야 하는 까닭(notes.mission.cards)
  // 새로 시작하면 돌다리 그림 위에서 카드 세 장을 한 장씩 넘긴다. 마지막 카드의 단추가 시작이다. 기록을 쓰지 않는다.
  function missionBlock(m) {
    return h('div.mission', { dataset: { mission: '' } },
      h('ol.mission-goals', (m.cards || []).map(c => h('li', h('b', c.head), ' ', c.body))));
  }
  app.mission = function (opt = {}) {
    const m = (G.data.notes || {}).mission;
    if (!m) return Promise.resolve(null);
    const r = run(), cards = m.cards || [];
    if (!opt.start) return sheet(close => h('div', h('h3', m.title || '이번 임무'), missionBlock(m),
      h('div.actions', h('button.btn.primary', { type: 'button', dataset: { mission: 'close' }, on: { click: () => { G.audio.tap(); close(true); } } }, '닫기'))), [], { cls: 'mission-sheet', dismiss: true }).then(v => (r === run() ? v : null));
    return sheet(close => {
      let at = 0;
      const box = h('div.mission-card', { role: 'group', 'aria-roledescription': '임무 카드', 'aria-live': 'polite' });
      const draw = () => {
        const c = cards[at] || {}, last = at >= cards.length - 1;
        const button = h('button.btn.primary', { type: 'button', dataset: { mission: last ? 'start' : 'next' }, on: { click: () => {
          G.audio.tap(); if (last) close(true); else { at++; draw(); }
        } } }, last ? (m.start || '시작 ▶') : (m.next || '다음 ▶'));
        box.replaceChildren(
          h('p.mission-step', cards.map((_, i) => h('span' + (i === at ? '.on' : ''), { 'aria-hidden': 'true' })), h('span.sr', (at + 1) + '/' + cards.length)),
          h('h3.mission-head', c.head || ''), h('p.mission-body', c.body || ''), h('div.actions', button));
        button.focus({ preventScroll: true });
      };
      draw();
      return box;
    }, [], { cls: 'mission-sheet.mission-start', dismiss: false }).then(v => (r === run() ? v : null));
  };
  // 이야기 속 위치: 본편 목록에서 몇 번째인지, 꿈 사건 몇 번째인지
  app.position = function (id) {
    const list = app.list(), index = list.findIndex(s => s.id === id);
    const events = list.filter(s => /^e\d{2}-/.test(s.id)), event = events.findIndex(s => s.id === id);
    return { index: index + 1, total: list.length, event: event + 1, events: events.length };
  };

  // ───────── 열기(목차·주소·엔진 API). 열 수 없으면 false
  app.open = function (id, opt = {}) {
    if (!G.data.ok) return false;
    if (!app.canOpen(id)) { if (!opt.quiet) ui.toast(lockMsg(id)); return false; }
    return play(id, opt) !== false;
  };

  // ───────── 장면 하나 펼치기
  function play(id, opt = {}) {
    const sc = byId(id);
    if (!sc || !app.canOpen(id)) return false;
    rememberField();
    const token = ++playToken;
    current?.abort.abort();
    const abort = new AbortController();
    ui.unpop();
    closeSheets();
    const st = S();
    const experience = G.experience.find(G.data, id);
    const rec = st.rpg?.scenes?.[id];
    const manualStaff = id === 'c3-staff' && !st.awake && rec?.status === 'auto';
    const preview = st.teacher && id !== 'c3-staff' && !studentCanOpen(id);
    const autoAdvance = !manualStaff && rec?.status === 'auto' && st.pos === id;
    const revisit = !manualStaff && (preview || isDone(id) || rec?.status === 'auto');
    const continuing = st.started && st.pos === id && !opt.transition;
    const startStep = experience ? 'world' : sc.kind;
    const r = run();
    let entryReady = true;
    if (st.teacher && (!revisit || preview && !isDone(id) && rec?.status !== 'auto') && writer(r)) entryReady = G.save.fillBefore(app.list(), id, { run: r, readonly: false, by: 'teacher' }) !== false;
    if (entryReady && !revisit && writer(r)) entryReady = G.save.transact(r, n => {
      n.pos = id; n.started = true; n.startedAt ||= Date.now(); n.reach = Math.max(n.reach, chIdx(sc.ch));
      if (n.rpg.cursor?.scene !== id) n.rpg.cursor = experience ? G.experience.cursor(G.data, id, n.rpg.scenes[id]?.beat ?? experience.beats[0].id) : null;
    });
    current = { scene: sc, revisit, autoAdvance, step: null, abort };
    if (entryReady && !opt.fromPop) {
      const hs = { scene: id };
      if (opt.replace || (history.state && history.state.scene === id)) history.replaceState(hs, ''); else history.pushState(hs, '');
    }
    G.audio.play(sc.bgm || ((G.data.chapters || {})[sc.ch] || {}).bgm || DEFAULT_BGM[sc.ch]);

    const kind = sc.kind || 'scene';
    const ch = chOf(sc.ch);
    const tray = h('div.tray#tray', { role: 'group', 'aria-label': '진행' });
    const inner = h('div.main-inner');
    const tools = h('div.tools');
    const menu = fn => e => { if (ctx.screenAlive() && e.currentTarget.isConnected && page.contains(e.currentTarget)) fn(); };
    const mode = kind === 'waking' ? 'cinematic' : experience ? 'world' : 'window';
    const page = h('div.play.ch-' + (sc.ch === 'R' ? 'r' : sc.ch) + (revisit ? '.revisit' : '') + (sc.reality ? '.reality' : ''), { dataset: { scene: id, ch: sc.ch, kind } },
      h('header.topbar',
        ui.iconBtn('home', '처음 화면', menu(() => app.title()), { dataset: { tool: 'home' } }),
        h('div.where', { title: '이야기 지도 열기', on: { click: menu(() => app.toc()) } },
          h('small', h('span.where-label', ch.label), h('span.where-name', ' · ' + ch.name), h('span.where-pos', { dataset: { position: '' } }, ' · ' + app.position(id).index + '/' + app.position(id).total)),
          h('strong', sc.title || KIND_NAME[kind] || ch.name)),
        tools,
        ui.iconBtn('toc', '이야기 지도·목차', menu(() => app.toc()), { dataset: { tool: 'toc' } }),
        ui.iconBtn('gear', '설정', menu(() => app.settings()), { dataset: { tool: 'settings' } }),
        st.teacher ? ui.iconBtn('fold', '화면 접기(잠깐 멈춤)', menu(() => { if (S().teacher) ui.fold(); }), { dataset: { tool: 'fold' } }) : null),
      revisit && !autoAdvance ? h('div.revisit-bar', h('span', '다시 읽는 중 · 활동을 다시 풀어도 기록은 처음 그대로예요'),
        h('button.btn.small', { type: 'button', on: { click: () => { if (ctx.alive()) continueSaved(); } } }, '하던 곳으로')) : null,
      accessNotice(), h('main.main', inner),
      tray);
    const mounted = gameShell(page, sc, mode);
    root().replaceChildren(mounted.shell);
    window.scrollTo(0, 0);

    const ctx = {
      scene: sc, ch: sc.ch, kind, revisit, readonly: revisit, autoAdvance, reenact: !!opt.reenact && !st.awake && sc.ch === '3' && !sc.awakened, run: r, experience, committed: false, failed: false, main: inner, page, field: mounted.field, shell: mounted.shell, startStep, signal: abort.signal,
      screenAlive: () => token === playToken && r === run() && current?.ctx === ctx && page.isConnected,
      alive: () => ctx.screenAlive() && !abort.signal.aborted && !ctx.failed,
      canAct: () => ctx.alive() && !ctx.committed && app.canOpen(sc.id) && writer(r),
      canBrowse: () => ctx.alive() && ctx.readonly && app.canOpen(sc.id),
      canProceed: () => ctx.canAct() || ctx.canBrowse() || ctx.committed && ctx.alive() && writer(r),
      step(name) {
        if (!ctx.alive()) return false;
        if (!ctx.readonly && S().pos === sc.id && ctx.canAct() && !G.save.transact(r, n => { n.step = name; })) return ctx.fail();
        current.step = name; page.dataset.step = name;
        emit('step', ctx, name);
        return true;
      },
      fail() {
        if (!ctx.alive()) return false;
        ctx.failed = true; abort.abort(); inner.inert = false;
        mounted.shell.dataset.mode = 'window'; mounted.field.inert = true;
        mounted.field.setAttribute('aria-hidden', 'true');
        page.dataset.step = 'error'; current.step = 'error';
        inner.replaceChildren(h('section.blk', { role: 'alert', dataset: { saveError: G.save.error || 'screen' } },
          h('h2', G.save.error === 'storage' ? '기록을 저장하지 못했어요.' : '장면을 열지 못했어요.'),
          h('p', '진행 기록은 그대로예요. 다시 시도해 주세요.')));
        const retry = h('button.btn.primary', { type: 'button', dataset: { act: 'retry' }, on: { click: e => {
          if (!ctx.screenAlive() || !e.currentTarget.isConnected) return;
          app.open(id, { ...opt, replace: true });
        } } }, '다시 시도');
        tray.replaceChildren(retry); tray.classList.remove('empty'); retry.focus({ preventScroll: true });
        return false;
      },
      finishExperience() {
        if (!ctx.alive()) return { ok: false, reason: 'stale', record: null };
        if (ctx.committed) return { ok: true, reason: null, record: S().rpg.scenes[sc.id] };
        if (!ctx.canAct() || ctx.readonly && !ctx.autoAdvance) return { ok: false, reason: 'readonly', record: null };
        const result = G.save.finishExperience(sc.id, { ...options(ctx), readonly: false });
        if (result.ok) ctx.committed = true;
        return result;
      },
      section(cls) {
        const s = h('section.blk' + (cls ? '.' + cls : ''));
        if (!ctx.alive()) return s;
        inner.appendChild(s);
        if (inner.children.length > 1) setTimeout(() => { if (ctx.alive() && s.isConnected) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
        return s;
      },
      tray(content) { if (!ctx.alive()) return; tray.replaceChildren(); if (content) G.util.append(tray, [content]); tray.classList.toggle('empty', !content); },
      next(label = '다음 ▶', o = {}) {
        return new Promise((resolve) => {
          const b = h('button.btn.' + (o.cls || 'primary'), { type: 'button', disabled: !ctx.canProceed(), dataset: { act: 'next' } }, label), shownAt = performance.now();
          let settled = false;
          const finish = value => {
            if (settled) return;
            settled = true; abort.signal.removeEventListener('abort', cancelled); b.removeEventListener('click', clicked); resolve(value);
          };
          const cancelled = () => finish(false);
          const clicked = (e) => {
            if (G.util.staleTap(e, shownAt) || !ctx.canProceed() || document.querySelector('.sheet-back, .fold-ov')) return;
            G.audio.page(); ctx.tray(null); finish(true);
          };
          if (!ctx.alive() || abort.signal.aborted) { resolve(false); return; }
          abort.signal.addEventListener('abort', cancelled, { once: true });
          b.addEventListener('click', clicked);
          ctx.tray(b);
          setTimeout(() => { if (ctx.alive() && b.isConnected && !document.querySelector('.sheet-back')) b.focus({ preventScroll: true }); }, 30);
        });
      },
    };
    current.ctx = ctx;
    page.dataset.access = G.save.access;
    page.dataset.readonly = String(ctx.readonly);
    if (!writer(r) && !(experience && kind !== 'waking' && ctx.readonly)) inner.inert = true;
    current.refreshTools = () => {
      if (!ctx.alive()) return;
      tools.replaceChildren();
      if (!experience && chIdx(sc.ch) >= 2 && (!S().awake || S().teacher)) tools.appendChild(ui.iconBtn('bag', '인연첩', () => {
        if (ctx.alive() && app.canOpen(sc.id) && (!S().awake || S().teacher)) G.dream?.open('bonds', ctx);
      }, { dataset: { tool: 'bonds' } }));
      for (const t of app.toolbar.filter((t) => t.id !== 'dream' && !experience)) {
        try { if (!t.when || t.when(ctx)) tools.appendChild(ui.iconBtn(t.icon || t.label.slice(0, 1), t.label, () => {
          if (ctx.alive() && (!t.when || t.when(ctx))) t.click(ctx);
        }, { dataset: { tool: t.id } })); } catch (e) { console.error(e); }
      }
    };
    current.refreshTools();
    ctx.tray(null);
    if (!entryReady) return ctx.fail();
    emit('scene', ctx);

    (async () => {
      if (!experience && !revisit && !continuing && firstOf(sc.ch) === sc && kind !== 'result') await chapterStep(ctx);
      if (!ctx.alive()) return;
      for (const fn of experience ? [] : hooks.scene) { await fn(ctx); if (!ctx.alive()) return; }
      const screen = experience && kind !== 'waking' ? app.screens.world : app.screens[kind];
      if (!screen) { ctx.step(kind); ctx.main.appendChild(h('p', '이 장면을 준비하고 있어요.')); return; }
      const completed = await screen(ctx, sc);
      if (!ctx.alive()) return;
      if (completed === false) { ctx.fail(); return; }
      await complete(ctx);
    })().catch((e) => { console.error(e); ctx.fail(); });
    return true;
  }
  app.play = (id) => app.open(id);

  // 장을 펼칠 때: 장 이름과 지난 이야기
  async function chapterStep(ctx) {
    ctx.step('chapter');
    G.audio.chapter();
    const c = chOf(ctx.ch), info = (G.data.chapters || {})[ctx.ch] || {};
    const card = ctx.section('chapter-card');
    card.append(h('div.ch-no', c.label), h('h2', c.name), info.intro ? h('p.ch-intro', T.inline(info.intro)) : null);
    if (info.recap) card.appendChild(h('div.recap', h('span.tag', '지난 이야기'), h('p', T.inline(info.recap))));
    if (info.fiction) card.appendChild(T.block(Object.assign({ mark: 'fiction' }, info.fiction), { run: ctx.run, readonly: ctx.readonly }));
    await ctx.next('펼치기 ▶');
    if (!ctx.alive()) return;
    ctx.main.replaceChildren();
    for (const fn of hooks.chapter) { await fn(ctx); if (!ctx.alive()) return; }
  }

  // 장면을 마쳤을 때
  async function complete(ctx) {
    if (!ctx.alive()) return;
    const sc = ctx.scene;
    if (sc.id === 'c3-staff' && (!ctx.committed || !S().awake) && (!ctx.readonly || ctx.reenact || ctx.autoAdvance)) { ctx.fail(); return; }
    if (ctx.revisit && !ctx.autoAdvance && !ctx.reenact) { continueSaved(); return; }
    if (!ctx.canProceed()) return;
    const next = app.list()[idx(sc.id) + 1];
    if (ctx.reenact && ctx.readonly) {
      if (!G.save.transact(ctx.run, n => {
        n.pos = next?.id || sc.id; n.step = 'scene';
        const record = next && n.rpg.scenes[next.id];
        n.rpg.cursor = next ? G.experience.cursor(G.data, next.id, record ? record.beat : G.experience.find(G.data, next.id)?.beats[0]?.id) : null;
      })) { ctx.fail(); return; }
    } else if (ctx.experience) {
      if (!ctx.committed && !ctx.finishExperience().ok) { ctx.fail(); return; }
    } else {
      if (!G.save.transact(ctx.run, n => {
        n.done[sc.id] = true; n.pos = next?.id || sc.id; n.step = 'scene';
        n.rpg.cursor = next ? G.experience.cursor(G.data, next.id, G.experience.find(G.data, next.id)?.beats[0]?.id) : null;
        if (next) n.reach = Math.max(n.reach, chIdx(next.ch));
      }, { readonly: ctx.readonly })) { ctx.fail(); return; }
    }
    emit('done', sc, ctx);
    if (!next || !ctx.alive()) return;
    if (!ctx.experience && !G.experience.find(G.data, next.id) && !ctx.readonly) for (const fn of hooks.between) { await fn(sc, next, ctx); if (!ctx.alive()) return; }
    if (next.ch !== sc.ch) emit('chapter', next.ch);
    app.open(next.id, { transition: true, reenact: ctx.reenact });
  }

  // ───────── 회목 카드(기획서 §4-3): 한문본 16회의 장 제목. heading 하나 또는 여러 회에 걸치면 배열
  //  - 原文 낙관은 영인본과 대조를 마친 회목(orig가 있고 status가 없는 것)에만 붙인다.
  //  - '대조 대기'(status)인 회목은 한문을 내지 않고 새로 쓴 풀이만 작은 카드로 보인다.
  const HOE_PART = { a: '앞 구', b: '뒤 구' };
  app.headingCard = function (heading) {
    const list = [].concat(heading || []).filter((x) => x && (x.gloss || x.orig));
    if (!list.length) return null;
    return h('div.hoe-cards', list.map((x) => {
      const verified = !!x.orig && !x.status;
      return h('div.hoe-card', { dataset: { hoe: x.hoe || '' } },
        h('span.hoe-no', h('span.tag', '회목'), ' 제' + x.hoe + '회' + (HOE_PART[x.part] ? ' ' + HOE_PART[x.part] : '')),
        verified ? T.block({ orig: x.orig, gloss: x.gloss, src: x.src }) : h('p.hoe-gloss', T.inline(x.gloss || '', { noFace: true })));
    }));
  };

  // ───────── 기본 화면들
  function sceneHead(ctx, sc) {
    const s = ctx.section('scene-head');
    if (sc.img) s.appendChild(h('div.scene-img', G.util.pixImg('assets/sc/' + sc.img + '.webp', { alt: sc.title || '' })));
    s.appendChild(h('h2.scene-title', sc.title || KIND_NAME[sc.kind] || ''));
    if (sc.place) s.appendChild(h('div.place', sc.place));
    const hc = app.headingCard(sc.heading);
    if (hc) s.appendChild(hc);
    return s;
  }
  app.sceneHead = sceneHead;
  // 장면 그림 바꾸기(imgAfter: 활동을 마친 뒤 바뀌는 그림. 예: 깨어난 조신, 다시 태어난 소유)
  app.sceneImage = function (ctx, img) {
    if (!img) return;
    const head = ctx.main.querySelector('.scene-head');
    if (!head) return;
    const src = 'assets/sc/' + img + '.webp';
    const old = head.querySelector('.scene-img img');
    if (old) { old.classList.remove('missing'); old.setAttribute('src', src); return; }
    head.insertBefore(h('div.scene-img', G.util.pixImg(src, { alt: ctx.scene.title || '' })), head.querySelector('.scene-title'));
  };

  app.screens.scene = async function (ctx, sc) {
    ctx.step('scene');
    await G.stage.play(ctx, sc);
  };
  app.screens.link = async function (ctx, sc) {
    ctx.step('link');
    await G.stage.play(ctx, sc);
  };

  // 인연첩(처음 만남 / 다시 만나 사연 덧붙이기). 인연은 소원을 채우지 않고 개수로 세지 않는다
  // remeet는 하나({ bond, story }) 또는 여러 사람의 배열. 한 장면에서 여러 카드에 사연이 덧붙는다
  app.remeets = (sc) => [].concat((sc && sc.remeet) || []).filter((r) => r && r.bond);
  app.steps.bond = async function (ctx, sc) {
    const bonds = G.data.bonds || [];
    const first = sc.meet ? bonds.find((x) => x.id === sc.meet) : null;
    const again = app.remeets(sc).map((r) => ({ b: bonds.find((x) => x.id === r.bond), story: r.story || '' })).filter((x) => x.b);
    if (!first && !again.length) return;
    ctx.step('bond');
    const s = ctx.section('bond');
    if (first) s.appendChild(app.bondCard(first));
    for (const x of again) s.appendChild(app.bondCard(x.b, x.story || ' '));
    if (!ctx.readonly) {
      G.save.transact(ctx.run, n => { if (first && !n.bonds.includes(first.id)) n.bonds.push(first.id); }, { readonly: ctx.readonly });
    }
    await ctx.next(first ? '인연첩에 적기 ▶' : '다음 ▶');
  };
  app.bondCard = function (b, more) {
    return h('div.bond-card', { dataset: { bond: b.id } },
      h('div.bond-face', G.util.pixImg(T.face(b.face || b.id), { cls: 'face', size: 48 })),
      h('div', h('span.act-kind', more ? '인연첩 · 다시 만남' : '인연첩'), h('h3', b.name),
        b.status ? h('div.small', b.status) : null,
        b.ability ? h('p', h('b', '능력과 사연 '), T.inline(b.ability)) : null,
        b.story ? h('p', T.inline(b.story)) : null,
        more && String(more).trim() ? h('p.more', T.inline(more)) : null,
        b.place ? h('div.small.muted', '만난 곳 · ' + b.place) : null));
  };
  // 숨은 구슬: 기본은 아무것도 하지 않는다(장면 그림을 눌러 찾는 화면은 뒤 작업이 바꿔 끼운다)
  app.steps.pearl = async function () {};

  // 'item' 걸음과 'waking'·'journal'·'interp'·'result' 화면은 화면 모듈(house·wake·journal·interp·result.js)이 맡는다.
  // index.html이 임시 데이터(?fixture=)에서도 늘 같은 모듈을 읽으므로 app.js에는 기본 화면을 두지 않는다.

  // ───────── 장부
  const activityTitles = {};
  app.activityTitles = activityTitles; // 장면 밖 활동(꿈 일지 등)의 이름: id → 이름
  function actTitle(id) {
    if (activityTitles[id]) return activityTitles[id];
    const sc = app.list().find((s) => s.activity && s.activity.id === id);
    return sc ? sc.activity.title || sc.title || id : id;
  }
  app.ledgerRows = function () {
    const activity = (id, title) => {
      const e = S().ledger[id] || { first: null, help: null, final: false };
      return { id, title: activityTitles[id] || title, ...e,
        firstLabel: e.first === true ? '첫 시도에 맞힘' : e.first === false ? '다시 풀어 맞힘' : '없음',
        helpLabel: e.help === 'teacher' ? '도움 사용(선생님용)' : e.help ? '도움 사용' : e.final ? '도움 없음' : '없음' };
    };
    const events = app.list().filter(sc => sc.kind === 'event').map(sc => {
      const rec = S().rpg?.scenes?.[sc.id];
      const e = G.experience.find(G.data, sc.id);
      const actionIds = new Set((rec?.actions || []).map(action => action.id));
      const performed = !!e && e.beats.every(beat => actionIds.has(beat.id));
      const status = rec?.status === 'auto' ? '자동 안내' : performed ? '완료' : rec ? '진행' : '미시작';
      const lines = (rec?.actions || []).flatMap(a => [...(e?.beats || []), ...(e?.optional || [])].find(b => b.id === a.id)?.lines || []);
      const clue = [...new Set(lines)].map(i => sc.lines[i]).map(l => typeof l === 'string' ? l : l.text || l.gloss || '').join(' · ');
      return { id: sc.id, title: sc.title, kind: 'event', status, firstLabel: status, gradeLabel: '없음', clue, help: rec?.hint || null, helpLabel: rec?.hint === 'teacher' ? '도움 사용(선생님용)' : rec?.hint ? '도움 사용' : '없음' };
    });
    return [activity('a-wish', '소원 찾기'), ...events, activity('j-match', '꿈 일지 맞대기')];
  };
  app.ledgerTable = function () {
    return h('div.ledger', h('h3', '장부'), h('p.small.muted', '학습의 첫 시도와 사건에서 살펴본 근거, 도움을 적어요.'),
      h('table', h('thead', h('tr', ...['활동', '상태·첫 시도', '살펴본 근거', '도움'].map(text => h('th', text)))),
        h('tbody', app.ledgerRows().map(r => h('tr', { dataset: { act: r.id } }, h('td', r.title), h('td', r.firstLabel), h('td', r.clue || '없음'), h('td', r.helpLabel))))));
  };
  app.wishes = () => G.experience.wishes(S(), G.data);
  // 소원 채움 표기('chuljang.chul' 등)를 이름으로: 출장입상(장수). 꿈 동안 가려진 소원은 이름을 내지 않는다
  app.fillName = function (f) {
    const [w, p] = String(f).split('.');
    const def = (G.data.wishes || []).find((x) => x.id === w);
    if (!def || def.dreamHidden) return null;
    const part = p && (def.parts || []).find((x) => x.id === p);
    return def.name + (part ? '(' + part.name + ')' : '');
  };

  // ───────── 목차
  app.toc = async function () {
    const st = S();
    const r = run();
    await sheet((close) => {
      const box = h('div.toc', h('h3', '이야기 지도'));
      // 지금 위치와 전체 길이, 환몽 구조(현실 → 꿈 → 현실), 임무를 한 창에서 본다.
      const hereId = current?.scene.id || st.pos, pos = app.position(hereId), hereScene = app.list().find(s => s.id === hereId);
      if (hereScene) {
        const chNow = CHAPTERS.find(c => c.id === hereScene.ch);
        box.appendChild(h('div.story-now', { dataset: { storyNow: '' } },
          h('p', h('b', '지금 위치 '), (chNow ? chNow.label + ' ' + chNow.name + ' · ' : '') + (hereScene.title || KIND_NAME[hereScene.kind] || ''),
            ' (전체 ' + pos.index + '/' + pos.total + (pos.event ? ' · 꿈의 사건 ' + pos.event + '/' + pos.events : '') + ')'),
          h('div.story-bar', { role: 'img', 'aria-label': '이야기 진행 ' + pos.index + '/' + pos.total }, h('span', { style: { width: Math.round(pos.index / pos.total * 100) + '%' } }))));
      }
      const mission = (G.data.notes || {}).mission;
      if (mission) box.appendChild(h('details.story-mission', h('summary', mission.title || '이번 임무'), missionBlock(mission)));
      for (const c of CHAPTERS) {
        const scenes = app.list().filter((s) => s.ch === c.id);
        if (!scenes.length) continue;
        const can = scenes.map((s) => app.canOpen(s.id));
        const locked = !can.some(Boolean);
        const dLock = st.awake && !st.teacher && chIdx(c.id) <= 3;
        const here = current && current.scene.ch === c.id;
        const row = h('div.toc-ch' + (locked ? '.locked' : '') + (here ? '.current' : ''), { dataset: { ch: c.id } },
          h('div.toc-title', h('span.no', c.label), h('span.nm', c.name), FRAME[c.id] ? h('span.frame', { dataset: { frame: FRAME[c.id].kind } }, FRAME[c.id].label) : null,
            locked ? h('span.lock', dLock ? '잠김 · 깨어난 뒤에는 꿈으로 돌아갈 수 없어요' : '아직 열리지 않았어요') : null));
        const ul = h('div.toc-scenes');
        scenes.forEach((s, i) => {
          const b = h('button.toc-scene' + (st.done[s.id] ? '.done' : '') + (s.id === st.pos ? '.here' : ''), { type: 'button', dataset: { scene: s.id }, disabled: !can[i] },
            s.title || KIND_NAME[s.kind] || c.name, st.done[s.id] ? h('span.badge', '마침') : null);
          b.addEventListener('click', () => { if (r !== run() || !b.isConnected) return; close(null); app.open(s.id); });
          ul.appendChild(b);
        });
        row.appendChild(ul);
        box.appendChild(row);
      }
      box.appendChild(h('p.small.muted', st.awake
        ? '깨어난 뒤에는 꿈(0~3장)으로 돌아갈 수 없어요. 다시 꿈꾸려면 처음 화면에서 처음부터 새로 시작해요.'
        : '마친 장면은 다시 열어 읽을 수 있어요. 다시 풀어도 장부는 처음 기록 그대로예요.'));
      if (st.teacher) box.appendChild(teacherGuide());
      return box;
    }, [{ label: '닫기', value: null, cls: 'primary' }], { cls: 'toc-sheet' });
  };
  function teacherGuide() {
    const g = (G.data.notes || {}).teacher || {};
    return h('div.teacher-guide', h('h4', '선생님께'),
      h('p', h('b', '수업에 넣을 때 '), g.when || '공통국어2 「구운몽」 단원'),
      h('p', h('b', '예상 시간 '), g.time || '한 차시(35~45분)'),
      (g.questions || []).length ? h('div', h('b', '끝난 뒤 물을 질문'), h('ol', g.questions.map((q) => h('li', T.inline(q))))) : null,
      g.extra ? h('p.tg-extra', h('b', '모둠 디브리핑 '), T.inline(g.extra)) : null,
      g.ledger ? h('p.tg-ledger', h('b', '장부 보는 법 '), T.inline(g.ledger)) : null,
      h('p.small.muted', '주소 끝 ?teacher=1 로 켜고 ?teacher=0 으로 꺼요. 선생님용에서는 모든 장을 열 수 있고, 활동마다 정답 채우기·정답 보기가 생겨요(장부에는 도움 사용(선생님용)으로 남아요). 위 막대의 화면 접기는 화면을 덮고 소리를 멈춰요.'));
  }

  // ───────── 설정
  app.settings = async function () {
    const r = run();
    const v = await sheet(close => {
      const row = (key, label) => {
        const b = h('button.btn.small.toggle', { type: 'button', disabled: !writer(r), dataset: { set: key } });
        const draw = () => { const on = S()[key]; b.textContent = on ? '켜짐' : '꺼짐'; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('primary', on); };
        b.addEventListener('click', () => {
          if (!b.isConnected) return;
          if (!G.save.transact(r, n => { n[key] = !n[key]; })) { savingDenied(); return; }
          G.audio.unlock(); G.audio.music(S().music); if (!S().voice) G.voice?.stop(); app.applySettings(); draw();
        }); draw(); return h('div.setrow', h('span', label), b);
      };
      const full = h('button.btn.small', { type: 'button', dataset: { set: 'full' }, on: { click: () => ui.full.toggle() } }, '전체 화면');
      ui.full.watch(full, () => full.setAttribute('aria-pressed', String(ui.full.on())));
      return h('div.settings', h('h3', '설정'), row('music', '배경음'), row('sound', '효과음'), G.voice?.ready ? row('voice', '목소리') : null, row('big', '큰 글자'), row('teacher', '선생님용'), full,
        h('div.setrow', h('span', '기록 지우기'), h('button.btn.small.seal', { type: 'button', disabled: !writer(r), dataset: { set: 'clear' }, on: { click: () => { if (writer(r)) close('clear'); } } }, '기록 지우기')),
        h('p.small.muted', '진행 기록은 이 기기의 브라우저에만 저장돼요.'), h('div.credit-full', h('b', '음원 출처 '), G.audio.creditFull()));
    }, [{ label: '닫기', value: null, cls: 'primary' }], { cls: 'settings-sheet' });
    if (v === 'clear' && await confirm('기록을 지울까요?', '진행과 기록이 모두 지워져요. 설정은 그대로예요.', '지우기', '그대로 두기')) {
      if (G.save.reset(r, { confirmed: true, cancel })) { emit('reset'); app.title(); } else savingDenied();
    }
    recheck();
  };

  // 지금 화면이 더는 열 수 없는 것이 되면(선생님용을 끄거나 다른 탭에서 깨어남 등) 이어 하기 자리로
  function recheck() {
    if (current && !app.canOpen(current.scene.id) && !(current.scene.id === (resumeTarget() || {}).id)) app.resume();
  }

  // ───────── 시작: 주소 바로가기와 뒤로 가기
  //   ?ch=2      그 장의 첫 장면(열 수 있을 때만)      ?scene=id  그 장면(열 수 있을 때만)
  //   ?teacher=1 선생님용 켜기 / ?teacher=0 끄기       ?fixture=1 임시 데이터(점검용)
  app.boot = function () {
    const q = new URLSearchParams(location.search);
    if (q.has('teacher')) G.save.transact(run(), n => { n.teacher = q.get('teacher') === '1'; });
    app.applySettings();
    // 바로가기 인자는 한 번 쓰고 주소에서 지운다(새로 고침해도 다시 쓰이지 않게). 임시 데이터 표시는 남긴다
    const keep = new URLSearchParams();
    if (q.get('fixture')) keep.set('fixture', q.get('fixture'));
    history.replaceState(null, '', location.pathname + (keep.toString() ? '?' + keep : '') + location.hash);
    let target = null;
    if (G.data.ok) {
      if (q.get('scene')) target = q.get('scene');
      else if (q.get('ch')) { const f = firstOf(q.get('ch').toUpperCase()); target = f && f.id; }
    }
    if (target && app.canOpen(target)) play(target, { replace: true });
    else if (S().started && (q.get('scene') || q.get('ch'))) { app.resume(); ui.toast(lockMsg(target)); }
    else app.title({ replace: true });
    window.addEventListener('popstate', onPop);
    // 뒤로 가기로 예전 화면이 캐시에서 되살아나면(bfcache) 저장된 상태로 다시 판단한다
    G.save.onChange(reason => {
      if (!app.booted) return;
      if (reason === 'storage' || reason === 'access' || reason === 'reset') { cancel(); app.applySettings(); app.title({ replace: true }); }
    });
    window.addEventListener('pagehide', cancel);
    window.addEventListener('pageshow', e => { if (e.persisted) { cancel(); app.applySettings(); app.title({ replace: true }); } });
    app.booted = true;
  };
  function onPop(e) {
    const st = e.state;
    if (!st || !st.scene) { app.title({ fromPop: true }); return; }
    if (current && current.scene.id === st.scene && app.canOpen(st.scene)) return;
    if (app.canOpen(st.scene)) { play(st.scene, { fromPop: true }); return; }
    ui.toast(lockMsg(st.scene));
    if (current && app.canOpen(current.scene.id)) history.pushState({ scene: current.scene.id }, ''); // 지금 화면에 그대로 머문다
    else app.resume();
  }
})();
