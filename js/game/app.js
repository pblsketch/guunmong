'use strict';
// 장 흐름과 열기 문. 화면은 screens[kind](ctx, scene)로 등록한다.
// ctx.startStep: event의 preview/prep1/prep2/scene 시작 위치. ctx.step(name)은 표시와 진행을 저장한다.
// ctx.finishEvent(): 두 준비 뒤 grade/reward/done과 다음 pos를 한 번에 저장한다.
// T3는 결과 연출 전에 finishEvent를 호출한다. step('grade')도 같은 완료 처리를 보장한다.
// ctx.readonly/revisit이면 기록을 쓰지 않는다. 재생 뒤에는 원래 진행으로 돌아간다.
// ctx.autoAdvance는 현재 경로의 자동 준비 기록이다. readonly로 재생하되 끝나면 다음 pos만 저장한다.
// 과거 자동 준비 사건의 직접 다시 보기는 autoAdvance=false이며 원래 pos로 돌아간다.
// ctx.signal은 이탈 시 abort되며 ctx.next()는 취소 때 false, 클릭 때 true로 끝난다.
// 비동기 대기 뒤 ctx.alive()를 확인한다. ctx.section/ctx.tray는 본문/진행 단추 자리다.
// hook('scene',ctx): 매 화면의 공통 띠, hook('chapter',ctx): 장 안내 뒤,
// hook('between',from,to,ctx): 완료를 먼저 저장한 뒤 장면 사이 연출. 다시 열기에서는 chapter/between 생략.
// on('scene'|'step'|'done'|'chapter'|'wake'|'reset'|'settings',fn), toolbar도 유지한다.
// settings는 applySettings의 동기 알림(인자 없음)이며 본문·진행은 다시 만들지 않는다.
// 깨어남은 c3-staff에서 난간 치기 순간 wake()로만 기록한다.
(function () {
  const { h, $, $$ } = G.util;
  const ui = G.ui, T = G.text;
  const app = (G.app = { booted: false });
  const S = () => G.save.state;
  const root = () => document.getElementById('app');

  const CHAPTERS = [
    { id: '0', label: '서장', name: '「조신 설화」' },
    { id: '1', label: '1장', name: '연화봉' },
    { id: '2', label: '2장', name: '꿈 — 출세 시뮬레이션' },
    { id: '3', label: '3장', name: '깨어남' },
    { id: '4', label: '4장', name: '꿈 일지' },
    { id: '5', label: '5장', name: '육관대사' },
    { id: 'R', label: '결과', name: '꿈 일지 마지막 장' },
  ];
  const DEFAULT_BGM = { 0: 'calm', 1: 'lotus', 2: 'dream', 3: 'feast', 4: 'reflect', 5: 'lotus', R: 'calm' };
  const KIND_NAME = { waking: '지팡이 소리', journal: '꿈 일지', interp: '육관대사의 물음', result: '결과' };
  app.CHAPTERS = CHAPTERS;
  const chIdx = (ch) => CHAPTERS.findIndex((c) => c.id === String(ch));
  const chOf = (ch) => CHAPTERS[chIdx(ch)] || CHAPTERS[0];

  // ───────── 사건(이벤트)과 확장 자리
  const listeners = {};
  app.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  const emit = (ev, ...a) => { for (const fn of listeners[ev] || []) { try { fn(...a); } catch (e) { console.error(e); } } };
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
  app.canOpen = function (id) {
    const sc = byId(id);
    if (!sc) return false;
    if (S().teacher) return true;
    if (dreamLocked(sc)) return false;
    if (S().done[id] || (sc.kind === 'event' && S().events[id]?.grade && !S().events[id].auto)) return true;          // 마친 장면 다시 읽기
    return id === S().pos || id === (resumeTarget() || {}).id; // 지금 하고 있는(해야 할) 장면
  };
  function lockMsg(id) {
    const sc = byId(id);
    if (sc && dreamLocked(sc)) return '깨어난 뒤에는 꿈으로 돌아갈 수 없어요. 다시 꿈꾸려면 처음부터 새로 시작해요.';
    return '아직 열리지 않은 장면이에요. 장은 차례대로 열려요.';
  }

  // ───────── 이어 하기 자리
  function resumeTarget() {
    const L = app.list();
    if (!L.length) return null;
    let t = byId(S().pos) || L[0];
    if (S().awake) {
      // 깨어난 뒤: 선방 앞(꿈)이면 깨어난 선방으로. 이미 마친 장면이면 아직 안 한 다음 장면으로
      let i = Math.max(idx(t.id), Math.min(awakenedIdx(), L.length - 1));
      while ((S().done[L[i].id] || (L[i].kind === 'event' && S().events[L[i].id]?.grade && !S().events[L[i].id].auto)) && i < L.length - 1) i++;
      return L[i];
    }
    // 깨어나기 전: 이미 마친 장면이면(장면 사이 말 걷기 중에 끈 옛 기록 등) 아직 안 한 다음 장면으로
    let i = idx(t.id);
    while ((S().done[L[i].id] || (L[i].kind === 'event' && S().events[L[i].id]?.grade && !S().events[L[i].id].auto)) && i < L.length - 1) i++;
    t = L[i];
    if (t.ch === '3') return firstOf('3'); // 깨어나기 전 3장: 3장 처음(취미궁 잔치)부터
    return t;
  }
  app.resumeTarget = resumeTarget;
  app.resume = function () {
    const t = resumeTarget();
    if (!t) { app.title(); return; }
    // 깨어나기 전 3장을 처음부터 다시 할 때는 3장 장면들을 아직 안 한 것으로 돌린다(장부의 첫 기록은 그대로)
    if (!S().awake && t.ch === '3') {
      for (const s of app.list()) if (s.ch === '3') delete S().done[s.id];
      S().pos = t.id;
      G.save.write();
    }
    play(t.id);
  };
  // 다시 보기에서 돌아올 때는 새로 고침의 3장 되감기를 적용하지 않는다.
  function continueSaved() {
    const saved = byId(S().pos);
    if (saved && app.canOpen(saved.id)) play(saved.id);
    else app.resume();
  }

  app.isAwake = () => !!S().awake;
  // 3장의 지팡이 소리 순간에 부른다. 한 번 기록되면 새로 시작하기 전까지 되돌릴 수 없다
  app.wake = function () {
    if (S().awake || !current || current.scene.id !== 'c3-staff' || current.revisit) return false;
    S().awake = true;
    S().awakeAt = Date.now();
    G.save.write();
    current.refreshTools?.();
    emit('wake');
    return true;
  };

  // ───────── 설정 반영
  app.applySettings = function () {
    const c = document.documentElement.classList;
    c.toggle('big', !!S().big);
    c.toggle('teacher', !!S().teacher);
    const top = document.querySelector('.play .topbar');
    const fold = top?.querySelector('[data-tool="fold"]');
    if (!S().teacher) fold?.remove();
    else if (top && !fold) top.appendChild(ui.iconBtn('fold', '화면 접기(잠깐 멈춤)', () => { if (S().teacher) ui.fold(); }, { dataset: { tool: 'fold' } }));
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
    ui.closeSheets();
    if (opt.replace) history.replaceState({ screen: 'title' }, '');
    else if (!opt.fromPop && !(history.state && history.state.screen === 'title')) history.pushState({ screen: 'title' }, '');
    G.audio.play((G.data.bgm || {}).title || 'calm');
    const st = S();
    const started = st.started && G.data.ok;
    const menu = h('div.menu');
    const go = (fn) => () => { G.audio.unlock(); fn(); };
    if (started) menu.appendChild(h('button.btn.primary', { type: 'button', on: { click: go(() => app.resume()) } }, '이어 하기'));
    menu.appendChild(h('button.btn' + (started ? '' : '.primary'), { type: 'button', disabled: !G.data.ok, on: { click: go(() => app.newGame(started)) } }, started ? '처음부터 새로' : '시작하기'));
    if (started) menu.appendChild(h('button.btn', { type: 'button', on: { click: go(() => app.toc()) } }, '목차'));
    menu.appendChild(h('button.btn', { type: 'button', on: { click: go(() => app.settings()) } }, '설정'));
    const r = root();
    r.replaceChildren(h('div.title-screen',
      h('div.art', G.util.pixImg('assets/ui/title.webp', { cls: 'title-art', maxh: 0.6 })),
      h('div.logo', h('h1', '구운몽'), h('div.sub', '한바탕 꿈')),
      h('p.tagline', '승경도 말판 위에서 양소유의 한평생을 살아 보는 이야기'),
      G.data.ok ? null : h('p.data-missing', '내용 데이터(js/data/)를 아직 불러오지 못했어요. 임시 데이터로 둘러보려면 주소 끝에 ?fixture=1 을 붙이세요.'),
      menu,
      h('div.credit', '김만중 「구운몽」 학습 게임 · 풀이 글은 이 게임을 위해 새로 쓴 것이에요'),
      h('div.credit', '만든이 박준일(온양여자고등학교 국어 교사)'),
      h('div.credit', G.audio.credit()),
      h('div.title-tools', ui.full.offer() ? ui.full.button() : null, musicToggle())));
  };
  // 타이틀 오른쪽 위, 전체 화면 단추 옆의 배경음 켜기/끄기(설정의 '배경음'과 같은 값)
  function musicToggle() {
    const b = h('button.icon-btn.music-toggle', { type: 'button' });
    const draw = () => { const on = S().music; b.innerHTML = ui.ICON[on ? 'musicOn' : 'musicOff']; b.setAttribute('aria-label', on ? '배경음 끄기' : '배경음 켜기'); b.title = b.getAttribute('aria-label'); b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { S().music = !S().music; G.save.write(); G.audio.unlock(); G.audio.music(S().music); draw(); });
    draw();
    return b;
  }

  // ───────── 새로 시작: 확인을 받고 모든 기록을 지운다
  app.newGame = async function (confirmReset) {
    if (confirmReset) {
      const ok = await ui.sheet([h('h3', '처음부터 새로 할까요?'),
        h('p', '지금까지의 기록(진행, 장부, 능력, 물건, 구슬, 깨어남, 해석, 이름)이 모두 지워져요. 설정은 그대로예요.')],
      [{ label: '그만두기', value: false }, { label: '새로 시작', value: true, cls: 'seal' }]);
      if (!ok) return;
    }
    G.save.reset();
    emit('reset');
    const st = S();
    st.started = true;
    st.startedAt = Date.now();
    G.save.write();
    app.applySettings();
    const first = app.list()[0];
    if (first) play(first.id);
  };

  // ───────── 열기(목차·주소·엔진 API). 열 수 없으면 false
  app.open = function (id, opt = {}) {
    if (!app.canOpen(id)) { if (!opt.quiet) ui.toast(lockMsg(id)); return false; }
    play(id, opt);
    return true;
  };

  // ───────── 장면 하나 펼치기
  function play(id, opt = {}) {
    const sc = byId(id);
    if (!sc) return;
    const token = ++playToken;
    current?.abort.abort();
    const abort = new AbortController();
    ui.unpop();
    ui.closeSheets();
    const st = S();
    const rec = st.events[id];
    const revisit = !!st.done[id] || !!(sc.kind === 'event' && rec?.grade);
    const autoAdvance = !!(sc.kind === 'event' && rec?.auto && rec.grade && st.pos === id);
    const continuing = st.started && st.pos === id && !opt.transition;
    const startStep = sc.kind === 'event' ? rec?.turns.length === 2 ? 'scene' : rec?.turns.length === 1 ? 'prep2' : continuing && st.step === 'prep1' ? 'prep1' : 'preview' : sc.kind;
    if (st.teacher && sc.kind === 'event' && !revisit) G.save.fillBefore(app.list(), id);
    if (!revisit) {
      st.pos = id;
      st.started = true;
      st.reach = Math.max(st.reach || 0, chIdx(sc.ch));
      G.save.write();
    }
    current = { scene: sc, revisit, autoAdvance, step: null, abort };
    if (!opt.fromPop) {
      const hs = { scene: id };
      if (opt.replace || (history.state && history.state.scene === id)) history.replaceState(hs, ''); else history.pushState(hs, '');
    }
    G.audio.play(sc.bgm || ((G.data.chapters || {})[sc.ch] || {}).bgm || DEFAULT_BGM[sc.ch]);

    const kind = sc.kind || 'scene';
    const ch = chOf(sc.ch);
    const tray = h('div.tray#tray', { role: 'group', 'aria-label': '진행' });
    const inner = h('div.main-inner');
    const tools = h('div.tools');
    const page = h('div.play.ch-' + (sc.ch === 'R' ? 'r' : sc.ch) + (revisit ? '.revisit' : '') + (sc.reality ? '.reality' : ''), { dataset: { scene: id, ch: sc.ch, kind } },
      h('header.topbar',
        ui.iconBtn('home', '처음 화면', () => app.title(), { dataset: { tool: 'home' } }),
        h('div.where', h('small', ch.label + ' · ' + ch.name), h('strong', sc.title || KIND_NAME[kind] || ch.name)),
        tools,
        ui.iconBtn('toc', '목차', () => app.toc(), { dataset: { tool: 'toc' } }),
        ui.iconBtn('gear', '설정', () => app.settings(), { dataset: { tool: 'settings' } }),
        st.teacher ? ui.iconBtn('fold', '화면 접기(잠깐 멈춤)', () => { if (S().teacher) ui.fold(); }, { dataset: { tool: 'fold' } }) : null),
      revisit && !autoAdvance ? h('div.revisit-bar', h('span', '다시 읽는 중 · 활동을 다시 풀어도 기록은 처음 그대로예요'),
        h('button.btn.small', { type: 'button', on: { click: continueSaved } }, '하던 곳으로')) : null,
      h('main.main', inner),
      tray);
    root().replaceChildren(page);
    window.scrollTo(0, 0);

    const ctx = {
      scene: sc, ch: sc.ch, kind, revisit, readonly: revisit, autoAdvance, main: inner, page, startStep, signal: abort.signal,
      alive: () => token === playToken,
      step(name) {
        if (!ctx.alive()) return;
        if (!ctx.readonly && sc.kind === 'event' && name === 'grade') ctx.finishEvent();
        current.step = name; page.dataset.step = name;
        if (!ctx.readonly && S().pos === sc.id) { S().step = name; G.save.write(); }
        emit('step', ctx, name);
      },
      finishEvent() {
        if (!ctx.alive() || ctx.readonly || sc.kind !== 'event') return S().events[sc.id];
        const rec = G.sim.finish(S(), sc);
        if (!rec.auto) {
          S().done[sc.id] = true;
          const next = app.list()[idx(sc.id) + 1];
          if (next) { S().pos = next.id; S().step = 'preview'; S().reach = Math.max(S().reach, chIdx(next.ch)); }
        }
        G.save.write();
        return rec;
      },
      section(cls) {
        const s = h('section.blk' + (cls ? '.' + cls : ''));
        inner.appendChild(s);
        if (inner.children.length > 1) setTimeout(() => { if (s.isConnected) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
        return s;
      },
      tray(content) { if (!ctx.alive()) return; tray.replaceChildren(); if (content) G.util.append(tray, [content]); tray.classList.toggle('empty', !content); },
      next(label = '다음 ▶', o = {}) {
        return new Promise((resolve) => {
          const b = h('button.btn.' + (o.cls || 'primary'), { type: 'button', dataset: { act: 'next' } }, label);
          const cancelled = () => resolve(false);
          if (!ctx.alive()) { resolve(false); return; }
          abort.signal.addEventListener('abort', cancelled, { once: true });
          b.addEventListener('click', () => { if (!ctx.alive()) return; abort.signal.removeEventListener('abort', cancelled); G.audio.page(); ctx.tray(null); resolve(true); }, { once: true });
          ctx.tray(b);
          setTimeout(() => { if (b.isConnected && !document.querySelector('.sheet-back')) b.focus({ preventScroll: true }); }, 30);
        });
      },
    };
    current.refreshTools = () => {
      if (!ctx.alive()) return;
      tools.replaceChildren();
      if (chIdx(sc.ch) >= 2 && (!S().awake || S().teacher)) tools.appendChild(ui.iconBtn('bag', '인연첩', () => {
        if (ctx.alive()) G.dream?.open('bonds');
      }, { dataset: { tool: 'bonds' } }));
      for (const t of app.toolbar.filter((t) => t.id !== 'dream')) {
        try { if (!t.when || t.when(ctx)) tools.appendChild(ui.iconBtn(t.icon || t.label.slice(0, 1), t.label, () => {
          if (ctx.alive() && (!t.when || t.when(ctx))) t.click(ctx);
        }, { dataset: { tool: t.id } })); } catch (e) { console.error(e); }
      }
    };
    current.refreshTools();
    ctx.tray(null);
    emit('scene', ctx);

    (async () => {
      if (!revisit && !continuing && firstOf(sc.ch) === sc && kind !== 'result') await chapterStep(ctx);
      if (!ctx.alive()) return;
      for (const fn of hooks.scene) { await fn(ctx); if (!ctx.alive()) return; }
      const screen = app.screens[kind];
      if (!screen) { ctx.step(kind); ctx.main.appendChild(h('p', '이 장면을 준비하고 있어요.')); return; }
      await screen(ctx, sc);
      if (!ctx.alive()) return;
      await complete(ctx);
    })().catch((e) => console.error(e));
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
    if (info.fiction) card.appendChild(T.block(Object.assign({ mark: 'fiction' }, info.fiction)));
    await ctx.next('펼치기 ▶');
    if (!ctx.alive()) return;
    ctx.main.replaceChildren();
    for (const fn of hooks.chapter) { await fn(ctx); if (!ctx.alive()) return; }
  }

  // 장면을 마쳤을 때
  async function complete(ctx) {
    const sc = ctx.scene;
    if (ctx.revisit && !ctx.autoAdvance) { continueSaved(); return; }
    const st = S();
    if (!ctx.readonly) {
      emit('done', sc, ctx);
      if (!ctx.alive()) return;
      if (sc.kind === 'link' && !st.done[sc.id]) {
        for (const [key, gain] of Object.entries(sc.bonus?.abil || {})) if (Object.hasOwn(st.abil, key)) st.abil[key] += gain;
        for (const item of sc.bonus?.items || []) if (!st.items.includes(item.id)) st.items.push(item.id);
      }
      st.done[sc.id] = true;
      G.save.write();
    }
    const L = app.list(), next = L[idx(sc.id) + 1];
    if (!next) return;
    // 다음 자리를 장면 사이 화면(말 걷기)보다 먼저 저장한다: 걷는 중에 새로 고침·처음 화면으로 가도 다음 장면 처음부터 이어 간다
    st.pos = next.id;
    st.step = 'preview';
    st.reach = Math.max(st.reach || 0, chIdx(next.ch));
    G.save.write();
    if (!ctx.readonly) for (const fn of hooks.between) { await fn(sc, next, ctx); if (!ctx.alive()) return; }
    if (next.ch !== sc.ch) emit('chapter', next.ch);
    play(next.id, { transition: true });
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
      if (first) !S().bonds.includes(first.id) && S().bonds.push(first.id);
      G.save.write();
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
        firstLabel: e.first === true ? '첫 시도에 맞힘' : e.first === false ? '다시 풀어 맞힘' : '—',
        helpLabel: e.help === 'teacher' ? '도움 사용(선생님용)' : e.help ? '도움 사용' : e.final ? '도움 없음' : '—' };
    };
    const grades = G.data.notes?.ui?.grades || { shine: '빛나는 성공', fine: '훌륭한 성공', near: '아쉬운 성공' };
    const events = app.list().filter((s) => s.kind === 'event').map((sc) => {
      const e = S().events[sc.id];
      const recorded = e && e.grade && !e.auto;
      return { id: sc.id, title: sc.title || sc.id, kind: 'event',
        hits: recorded ? e.hits : null, grade: recorded ? e.grade : null,
        gradeLabel: recorded ? grades[e.grade] : '—', clue: (sc.clues || []).join(' · '),
        firstLabel: recorded ? e.hits + '/2' : '—',
        help: recorded && e.peek ? 'teacher' : null,
        helpLabel: !recorded ? '—' : e.peek ? '도움 사용(선생님용)' : '도움 없음' };
    });
    return [activity('a-wish', '소원 찾기'), ...events, activity('j-match', '꿈 일지 맞대기')];
  };
  app.ledgerTable = function () {
    return h('div.ledger', h('h3', '장부'), h('p.small.muted', '첫 시도와 준비 적중, 도움 사용을 적어요. 감점은 없어요.'),
      h('table', h('thead', h('tr', ...['활동', '첫 시도·적중', '등급', '단서', '도움'].map((text) => h('th', text)))),
        h('tbody', app.ledgerRows().map((r) => h('tr', { dataset: { act: r.id } },
          h('td', r.title), h('td', r.firstLabel), h('td', r.gradeLabel || '—'), h('td', r.clue || '—'), h('td', r.helpLabel))))));
  };

  // 자원은 전체 사건의 최고 보상 합을 목표로 삼는다. 인연은 입력에 넣지 않는다.
  app.wishes = function () {
    const st = S(), scenes = app.list();
    const events = scenes.filter((sc) => sc.kind === 'event');
    const reachedSquares = (G.data.board || []).filter((q) => st.done[q.scene]);
    const musicEvents = events.filter((sc) => sc.core?.includes('eumak'));
    const musicItems = [...new Map(scenes.flatMap((sc) => [...(sc.items || []), ...(sc.bonus?.items || [])])
      .filter((it) => it.kind === 'music' || it.fills?.includes('pungryu')).map((it) => [it.id, it])).values()];
    const musicEarned = musicEvents.reduce((sum, sc) => {
      const rec = st.events[sc.id];
      return sum + (rec?.grade ? G.sim.reward(rec.grade).fame / G.sim.config.rewards.shine.fame : 0);
    }, 0) + musicItems.filter((it) => st.items.includes(it.id)).length;
    return (G.data.wishes || []).map((w) => {
      const hidden = !!w.dreamHidden && !st.journal.revealed?.[w.id];
      const parts = (w.parts || []).map((p) => ({ id: p.id, name: p.name,
        filled: !hidden && reachedSquares.some((q) => q.fills?.includes(w.id + '.' + p.id)) }));
      let fill = 0;
      let sources = [];
      if (!hidden) {
        if (w.dreamHidden) fill = 1;
        else if (parts.length) {
          fill = parts.filter((p) => p.filled).length / parts.length;
          sources = reachedSquares.filter((q) => q.fills?.some((f) => f.startsWith(w.id + '.'))).map((q) => q.id);
        } else if (w.id === 'bugwi' || w.id === 'gongmyeong') {
          const resource = w.id === 'bugwi' ? 'wealth' : 'fame';
          fill = st.res[resource] / Math.max(1, events.length * G.sim.config.rewards.shine[resource]);
        } else if (w.id === 'pungryu') {
          fill = musicEarned / Math.max(1, musicEvents.length + musicItems.length);
          sources = [...musicEvents.filter((sc) => st.events[sc.id]?.grade).map((sc) => sc.id), ...musicItems.filter((it) => st.items.includes(it.id)).map((it) => it.id)];
        }
      }
      fill = G.util.clamp(fill, 0, 1);
      return { id: w.id, name: hidden ? '?' : w.name, fill, hidden,
        half: parts.length > 0 && fill > 0 && fill < 1, filled: fill === 1, parts, sources };
    });
  };
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
    await ui.sheet((close) => {
      const box = h('div.toc', h('h3', '목차'));
      for (const c of CHAPTERS) {
        const scenes = app.list().filter((s) => s.ch === c.id);
        if (!scenes.length) continue;
        const can = scenes.map((s) => app.canOpen(s.id));
        const locked = !can.some(Boolean);
        const dLock = st.awake && !st.teacher && chIdx(c.id) <= 3;
        const here = current && current.scene.ch === c.id;
        const row = h('div.toc-ch' + (locked ? '.locked' : '') + (here ? '.current' : ''), { dataset: { ch: c.id } },
          h('div.toc-title', h('span.no', c.label), h('span.nm', c.name),
            locked ? h('span.lock', dLock ? '잠김 · 깨어난 뒤에는 꿈으로 돌아갈 수 없어요' : '아직 열리지 않았어요') : null));
        const ul = h('div.toc-scenes');
        scenes.forEach((s, i) => {
          const b = h('button.toc-scene' + (st.done[s.id] ? '.done' : '') + (s.id === st.pos ? '.here' : ''), { type: 'button', dataset: { scene: s.id }, disabled: !can[i] },
            s.title || KIND_NAME[s.kind] || c.name, st.done[s.id] ? h('span.badge', '마침') : null);
          b.addEventListener('click', () => { close(null); app.open(s.id); });
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
    const st = S();
    const v = await ui.sheet((close) => {
      const row = (key, label, text, fn) => {
        const b = h('button.btn.small.toggle', { type: 'button', dataset: { set: key }, 'aria-pressed': 'false' });
        const draw = () => { const t = text(); b.textContent = t[0]; b.classList.toggle('primary', t[1]); b.setAttribute('aria-pressed', String(t[1])); };
        b.addEventListener('click', () => { fn(); G.save.write(); app.applySettings(); draw(); });
        draw();
        return h('div.setrow', h('span', label), b);
      };
      const onoff = (k) => () => [st[k] ? '켜짐' : '꺼짐', !!st[k]];
      // 전체 화면은 저장하지 않는 설정이라 따로 그린다(Esc로 풀어도 단추가 따라 바뀐다)
      const fullRow = () => {
        const b = h('button.btn.small.toggle', { type: 'button', dataset: { set: 'full' } });
        b.addEventListener('click', () => ui.full.toggle());
        ui.full.watch(b, () => { const on = ui.full.on(); b.textContent = on ? '켜짐' : '꺼짐'; b.classList.toggle('primary', on); b.setAttribute('aria-pressed', String(on)); });
        return h('div.setrow', h('span', '전체 화면'), b);
      };
      return h('div.settings', h('h3', '설정'),
        row('music', '배경음', onoff('music'), () => { st.music = !st.music; G.audio.unlock(); G.audio.music(st.music); }),
        row('sound', '효과음', onoff('sound'), () => { st.sound = !st.sound; }),
        row('big', '큰 글자', onoff('big'), () => { st.big = !st.big; }),
        row('teacher', '선생님용', onoff('teacher'), () => { st.teacher = !st.teacher; }),
        ui.full.offer() ? fullRow() : null,
        h('div.setrow', h('span', '기록 지우기'), h('button.btn.small.seal', { type: 'button', dataset: { set: 'clear' }, on: { click: () => close('clear') } }, '기록 지우기')),
        h('p.small.muted', '진행 기록은 이 기기의 브라우저에만 저장돼요. 어디로도 보내지 않아요.'),
        h('div.credit-full', h('b', '음원 출처 '), G.audio.creditFull()));
    }, [{ label: '닫기', value: null, cls: 'primary' }], { cls: 'settings-sheet' });
    if (v === 'clear') {
      const ok = await ui.sheet([h('h3', '기록을 지울까요?'), h('p', '진행, 장부, 능력, 물건, 구슬, 깨어남, 해석, 이름이 모두 지워져요. 설정은 그대로예요.')],
        [{ label: '그대로 두기', value: false, cls: 'primary' }, { label: '지우기', value: true, cls: 'seal' }]);
      if (ok) { G.save.reset(); emit('reset'); app.title(); }
      return;
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
    if (q.has('teacher')) { S().teacher = q.get('teacher') === '1'; G.save.write(); }
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
    window.addEventListener('pageshow', (e) => { if (e.persisted) { G.save.load(); app.applySettings(); if (current) recheck(); } });
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
