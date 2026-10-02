'use strict';
// 화면 흐름(명세 3절): 타이틀 → 0 서장 → 1 연화봉 → 2 꿈 → 3 깨어남 → 4 꿈 일지 → 5 육관대사 → R 결과.
// 진행은 이 순서뿐이다. 목차·설정은 위에 겹쳐 뜬다.
//
// ───────── 확장 지점(말판·집·구슬·일지·깨어남·결과 화면을 맡는 뒤 작업이 쓰는 곳) ─────────
//  G.app.screens[kind] = async (ctx, scene) => {}
//      장면 종류(scene.kind)별 화면. 돌려준 Promise가 끝나면 그 장면을 마친 것으로 보고 다음 장면으로 간다.
//      기본: 'scene'(읽기 → 활동 → 마음 → 물건 → 인연 → 구슬). 'waking'·'journal'·'interp'·'result'는 화면 모듈이 채운다.
//  G.app.steps[name] = async (ctx, scene) => {}
//      'scene' 화면 안의 걸음. 기본 순서는 G.app.flow(장면에 flow가 있으면 그것). 'item'은 house.js가 채우고, 'pearl'·'bond'는 바꿔 끼우라고 둔 자리다.
//  G.app.hook('between', async (from, to, ctx) => {})
//      장면을 마치고 다음 장면으로 가기 전(예: 2장 말판에서 말이 다음 칸으로 걷기). 다시 읽기에서는 부르지 않는다.
//  G.app.hook('chapter', async (ctx) => {})
//      장 첫머리 카드를 넘긴 바로 뒤, 그 장 첫 장면을 펼치기 전(예: 2장 말판의 출발 칸에서 첫 칸으로 걷기). 다시 읽기에서는 부르지 않는다.
//  G.app.on(event, fn) — 'scene'(ctx) · 'step'(ctx, name) · 'done'(scene, ctx) · 'chapter'(chId) · 'wake' · 'reset'
//  G.app.toolbar.push({ id, label, icon, when(ctx), click(ctx) }) — 위 막대에 단추 더하기(인연첩·집·소원 목록 등)
//  G.app.wake() — 3장에서 지팡이 소리가 나는 바로 그 순간에 부른다. 깨어남을 기록한다(새로 시작하기 전까지 되돌릴 수 없음)
//  ctx(화면에 넘기는 것): { scene, ch, revisit, readonly, main, page, alive(), step(name), section(cls), tray(el), next(label) }
//      readonly(=revisit)이면 장부·마음·물건·구슬 등 기록을 바꾸지 않는다.
//
// ───────── 지켜야 할 규칙
//  - 깨어난 뒤에는 0~3장(깨어난 선방 장면 앞까지)을 선생님용이 아니면 열 수 없다: 뒤로 가기·새로 고침·목차·주소 모두.
//  - 이어 하기: 깨어나기 전 3장에서 끄면 3장 처음, 깨어난 뒤 그 앞에서 끄면 깨어난 선방, 그 밖에는 그 장면 처음부터.
//  - 깨어나기 전에는 마친 장면을 다시 읽을 수 있지만 기록은 처음 그대로다.
(function () {
  const { h, $, $$ } = G.util;
  const ui = G.ui, T = G.text;
  const app = (G.app = { booted: false });
  const S = () => G.save.state;
  const root = () => document.getElementById('app');

  const CHAPTERS = [
    { id: '0', label: '서장', name: '「조신 설화」' },
    { id: '1', label: '1장', name: '연화봉' },
    { id: '2', label: '2장', name: '꿈 — 승경도' },
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
  const hooks = { between: [], chapter: [] };
  app.hook = (name, fn) => { (hooks[name] = hooks[name] || []).push(fn); };
  app.toolbar = [];
  app.screens = {};
  app.steps = {};
  app.flow = ['read', 'activity', 'mind', 'item', 'bond', 'pearl'];

  // ───────── 장면 목록(데이터 + 비어 있는 장의 기본 화면)
  let LIST = null;
  app.list = function () {
    if (LIST) return LIST;
    const src = (G.data.scenes || []).filter((s) => s && s.id && chIdx(s.ch) >= 0).map((s) => Object.assign({}, s, { ch: String(s.ch) }));
    const has = (ch) => src.some((s) => s.ch === ch);
    if (src.length) {
      if (!has('3')) src.push({ id: 'ch3-staff', ch: '3', kind: 'waking' }, { id: 'ch3-room', ch: '3', awakened: true, title: '연화봉 선방' });
      if (!has('4')) src.push({ id: 'ch4-journal', ch: '4', kind: 'journal', title: KIND_NAME.journal });
      if (!has('5')) src.push({ id: 'ch5-master', ch: '5', kind: 'interp', title: KIND_NAME.interp });
      if (!has('R')) src.push({ id: 'result', ch: 'R', kind: 'result', title: KIND_NAME.result });
    }
    // 장 순서대로(같은 장 안에서는 데이터에 적힌 원작 순서 그대로)
    LIST = src.map((s, i) => [s, i]).sort((a, b) => chIdx(a[0].ch) - chIdx(b[0].ch) || a[1] - b[1]).map((x) => x[0]);
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
    if (S().done[id]) return true;          // 마친 장면 다시 읽기
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
      while (S().done[L[i].id] && i < L.length - 1) i++;
      return L[i];
    }
    // 깨어나기 전: 이미 마친 장면이면(장면 사이 말 걷기 중에 끈 옛 기록 등) 아직 안 한 다음 장면으로
    let i = idx(t.id);
    while (S().done[L[i].id] && i < L.length - 1) i++;
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

  app.isAwake = () => !!S().awake;
  // 3장의 지팡이 소리 순간에 부른다. 한 번 기록되면 새로 시작하기 전까지 되돌릴 수 없다
  app.wake = function () {
    if (S().awake) return false;
    S().awake = true;
    S().awakeAt = Date.now();
    G.save.write();
    emit('wake');
    return true;
  };

  // ───────── 설정 반영
  app.applySettings = function () {
    const c = document.documentElement.classList;
    c.toggle('big', !!S().big);
    c.toggle('teacher', !!S().teacher);
    c.toggle('mode-review', S().mode === 'review');
    c.toggle('mode-first', S().mode !== 'review');
  };

  // ───────── 지금 화면
  let current = null, playToken = 0;
  app.current = function () {
    if (!current) return null;
    const sc = current.scene;
    return { scene: sc.id, ch: sc.ch, kind: sc.kind || 'scene', step: current.step, revisit: current.revisit, data: sc };
  };

  // ───────── 타이틀
  app.title = function (opt = {}) {
    playToken++;
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
      musicToggle()));
  };
  // 타이틀 오른쪽 위의 배경음 켜기/끄기(설정의 '배경음'과 같은 값)
  function musicToggle() {
    const b = h('button.icon-btn.music-toggle', { type: 'button' });
    const draw = () => { const on = S().music; b.innerHTML = ui.ICON[on ? 'musicOn' : 'musicOff']; b.setAttribute('aria-label', on ? '배경음 끄기' : '배경음 켜기'); b.title = b.getAttribute('aria-label'); b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { S().music = !S().music; G.save.write(); G.audio.unlock(); G.audio.music(S().music); draw(); });
    draw();
    return b;
  }

  // ───────── 새로 시작: 확인을 받고 모든 기록을 지운 뒤 읽기 방식을 고른다
  app.newGame = async function (confirmReset) {
    if (confirmReset) {
      const ok = await ui.sheet([h('h3', '처음부터 새로 할까요?'),
        h('p', '지금까지의 기록(진행, 장부, 고른 마음, 집, 구슬, 깨어남, 해석, 이름)이 모두 지워져요. 설정은 그대로예요.')],
      [{ label: '그만두기', value: false }, { label: '새로 시작', value: true, cls: 'seal' }]);
      if (!ok) return;
    }
    G.save.reset();
    emit('reset');
    const mode = await ui.sheet([
      h('h3', '어떻게 읽을까요?'),
      h('p', h('b', '처음 읽기'), ' — 작품을 처음 만나요. 원문 아래 풀이가 보이고, 인물 이름 옆에 얼굴이 나오고, 장마다 지난 이야기가 나와요.'),
      h('p', h('b', '다시 읽기'), ' — 작품을 읽은 뒤 복습해요. 풀이를 가리고 자동 표시가 없으며, 헷갈리는 선택지가 더 들어가요.'),
      h('p.small.muted', '설정에서 언제든 바꿀 수 있어요.'),
    ], [{ label: '다시 읽기', value: 'review' }, { label: '처음 읽기', value: 'first', cls: 'primary' }], { dismiss: false });
    const st = S();
    st.mode = mode || 'first';
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
    ui.unpop();
    ui.closeSheets();
    const st = S();
    const revisit = !!st.done[id];
    if (!revisit) {
      st.pos = id;
      st.started = true;
      st.reach = Math.max(st.reach || 0, chIdx(sc.ch));
      G.save.write();
    }
    current = { scene: sc, revisit, step: null };
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
        ui.iconBtn('fold', '화면 접기(잠깐 멈춤)', () => ui.fold(), { dataset: { tool: 'fold' } })),
      revisit ? h('div.revisit-bar', h('span', '다시 읽는 중 · 활동을 다시 풀어도 기록은 처음 그대로예요'),
        h('button.btn.small', { type: 'button', on: { click: () => app.resume() } }, '하던 곳으로')) : null,
      h('main.main', inner),
      tray);
    root().replaceChildren(page);
    window.scrollTo(0, 0);

    const ctx = {
      scene: sc, ch: sc.ch, kind, revisit, readonly: revisit, main: inner, page,
      alive: () => token === playToken,
      step(name) { if (!ctx.alive()) return; current.step = name; page.dataset.step = name; emit('step', ctx, name); },
      section(cls) {
        const s = h('section.blk' + (cls ? '.' + cls : ''));
        inner.appendChild(s);
        if (inner.children.length > 1) setTimeout(() => { if (s.isConnected) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
        return s;
      },
      tray(content) { tray.replaceChildren(); if (content) G.util.append(tray, [content]); tray.classList.toggle('empty', !content); },
      next(label = '다음 ▶', o = {}) {
        return new Promise((resolve) => {
          const b = h('button.btn.' + (o.cls || 'primary'), { type: 'button', dataset: { act: 'next' } }, label);
          b.addEventListener('click', () => { if (!ctx.alive()) return; G.audio.page(); ctx.tray(null); resolve(); });
          ctx.tray(b);
          setTimeout(() => { if (b.isConnected && !document.querySelector('.sheet-back')) b.focus({ preventScroll: true }); }, 30);
        });
      },
    };
    for (const t of app.toolbar) {
      try { if (!t.when || t.when(ctx)) tools.appendChild(ui.iconBtn(t.icon || t.label.slice(0, 1), t.label, () => t.click(ctx), { dataset: { tool: t.id } })); } catch (e) { console.error(e); }
    }
    ctx.tray(null);
    emit('scene', ctx);

    (async () => {
      if (!revisit && firstOf(sc.ch) === sc && kind !== 'result') await chapterStep(ctx);
      if (!ctx.alive()) return;
      const screen = app.screens[kind] || app.screens.scene;
      await screen(ctx, sc);
      if (!ctx.alive()) return;
      await complete(ctx);
    })().catch((e) => console.error(e));
  }
  app.play = (id) => app.open(id);

  // 장을 펼칠 때: 장 이름과 (처음 읽기라면) 지난 이야기
  async function chapterStep(ctx) {
    ctx.step('chapter');
    G.audio.chapter();
    const c = chOf(ctx.ch), info = (G.data.chapters || {})[ctx.ch] || {};
    const card = ctx.section('chapter-card');
    card.append(h('div.ch-no', c.label), h('h2', c.name), info.intro ? h('p.ch-intro', T.inline(info.intro)) : null);
    if (S().mode !== 'review' && info.recap) card.appendChild(h('div.recap', h('span.tag', '지난 이야기'), h('p', T.inline(info.recap))));
    if (info.fiction) card.appendChild(T.block(Object.assign({ mark: 'fiction' }, info.fiction)));
    await ctx.next('펼치기 ▶');
    if (!ctx.alive()) return;
    ctx.main.replaceChildren();
    for (const fn of hooks.chapter) { await fn(ctx); if (!ctx.alive()) return; }
  }

  // 장면을 마쳤을 때
  async function complete(ctx) {
    const sc = ctx.scene;
    emit('done', sc, ctx);
    if (ctx.revisit) { app.resume(); return; }
    const st = S();
    st.done[sc.id] = true;
    G.save.write();
    const L = app.list(), next = L[idx(sc.id) + 1];
    if (!next) return;
    // 다음 자리를 장면 사이 화면(말 걷기)보다 먼저 저장한다: 걷는 중에 새로 고침·처음 화면으로 가도 다음 장면 처음부터 이어 간다
    st.pos = next.id;
    st.reach = Math.max(st.reach || 0, chIdx(next.ch));
    G.save.write();
    for (const fn of hooks.between) { await fn(sc, next, ctx); if (!ctx.alive()) return; }
    if (next.ch !== sc.ch) emit('chapter', next.ch);
    play(next.id);
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
    sceneHead(ctx, sc);
    for (const name of sc.flow || app.flow) {
      const fn = app.steps[name];
      if (!fn || !ctx.alive()) continue;
      await fn(ctx, sc);
    }
  };

  // 읽기
  app.steps.read = async function (ctx, sc) {
    if (!sc.read || !sc.read.length) return;
    ctx.step('read');
    ctx.section('reading').appendChild(T.blocks(sc.read));
    await ctx.next();
  };
  // 읽기 활동(원작 속 시험)
  app.steps.activity = async function (ctx, sc) {
    if (!sc.activity) return;
    ctx.step('activity');
    const m = G.activity.mount(ctx.section('act'), sc.activity, { tray: ctx.tray, readonly: ctx.readonly });
    await m.done;
    if (!ctx.alive()) return;
    if (sc.imgAfter) app.sceneImage(ctx, sc.imgAfter);
    await ctx.next();
  };
  // 마음 고르기(채점하지 않음, 꿈 일지에 쓰임)
  app.steps.mind = async function (ctx, sc) {
    const M = sc.mind;
    if (!M || !(M.options || []).length) return;
    ctx.step('mind');
    const s = ctx.section('mind');
    s.appendChild(h('div.act-head', h('span.act-kind', '마음 고르기 · 채점하지 않아요'), h('h3', T.inline(M.prompt || '이때 양소유의 마음은 어땠을까요?'))));
    const prev = S().mind[sc.id];
    const reply = h('div.mind-reply', { hidden: true });
    const btns = M.options.map((o) => h('button.mind-opt', { type: 'button', dataset: { opt: o.id } },
      h('span.t', T.inline(o.text)), o.evidence ? h('span.ev', T.inline(o.evidence, { noFace: true })) : null));
    s.append(h('div.mind-opts', btns), reply);
    const show = (o) => {
      btns.forEach((b) => { b.disabled = true; b.classList.toggle('chosen', b.dataset.opt === o.id); });
      if (o.reply) { reply.replaceChildren(T.inline(o.reply)); reply.hidden = false; }
    };
    if (ctx.readonly) {
      const o = M.options.find((x) => x.id === prev);
      if (o) show(o); else btns.forEach((b) => (b.disabled = true));
    } else {
      await new Promise((resolve) => btns.forEach((b, i) => b.addEventListener('click', () => {
        const o = M.options[i];
        S().mind[sc.id] = o.id;
        G.save.write();
        G.audio.pick();
        show(o);
        resolve();
      })));
    }
    if (!ctx.alive()) return;
    await ctx.next();
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
      if (first) S().bonds[first.id] = true;
      if (again.length) S().bondNotes[sc.id] = true;
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
    const L = S().ledger;
    const order = app.list().filter((s) => s.activity).map((s) => s.activity.id);
    const ids = Object.keys(L).sort((a, b) => (order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9));
    return ids.map((id) => {
      const e = L[id];
      return {
        id, title: actTitle(id), first: e.first, help: e.help, final: e.final,
        firstLabel: e.first === true ? '첫 시도에 맞힘' : e.first === false ? '다시 풀어 맞힘' : '—',
        helpLabel: e.help === 'teacher' ? '도움 사용(선생님용)' : e.help ? '도움 사용' : '도움 없음',
      };
    });
  };
  app.ledgerTable = function () {
    const rows = app.ledgerRows();
    return h('div.ledger', h('h3', '장부'), h('p.small.muted', '첫 시도와 도움 사용만 적어요. 감점은 없어요.'),
      rows.length ? h('table', h('thead', h('tr', h('th', '활동'), h('th', '첫 시도'), h('th', '도움'))),
        h('tbody', rows.map((r) => h('tr', { dataset: { act: r.id } }, h('td', r.title), h('td', r.firstLabel), h('td', r.helpLabel))))) : h('p.small', '아직 기록이 없어요.'));
  };

  // ───────── 소원 목록(꿈 동안 채워지는 상태). 인연은 소원을 채우지 않는다. dreamHidden 소원(미색)은 꿈 내내 '?'
  //  - 칸이 나뉜 소원(parts, 출장입상의 장수·재상)은 'chuljang.chul'처럼 점 표기로 반 칸씩 채운다.
  //    한 칸만 차면 반(half), 모든 칸이 차야 가득(filled). 예전 데이터의 part 항목(fills: ['chuljang'], part: 'chul')도 읽는다.
  app.wishes = function () {
    const st = S(), D = G.data;
    const filled = {}, parts = {}, whole = {};
    const add = (ids, from, part0) => {
      for (const f of [].concat(ids || [])) {
        const [w, p1] = String(f).split('.');
        const p = p1 || part0;
        (filled[w] = filled[w] || []).push(from);
        if (p) { const m = (parts[w] = parts[w] || {}); (m[p] = m[p] || []).push(from); } else whole[w] = true;
      }
    };
    for (const sc of app.list()) {
      if (!st.done[sc.id]) continue;
      add(sc.fills, sc.id, sc.part);
      if (sc.item && st.items[sc.item.id]) add(sc.item.fills, sc.item.id, sc.item.part);
      const sq = (D.board || []).find((q) => q.id === sc.square);
      if (sq) add(sq.fills, sq.id, sq.part);
    }
    return (D.wishes || []).map((w) => {
      const hidden = !!w.dreamHidden && !(st.journal && st.journal.revealed && st.journal.revealed[w.id]);
      const defs = Array.isArray(w.parts) ? w.parts : [];
      const ps = defs.map((p) => ({ id: p.id, name: p.name, filled: !hidden && (!!whole[w.id] || !!((parts[w.id] || {})[p.id] || []).length) }));
      const got = ps.filter((p) => p.filled).length;
      const full = hidden ? false : defs.length ? got === defs.length : !!filled[w.id];
      const half = !hidden && defs.length > 0 && got > 0 && got < defs.length;
      return { id: w.id, name: hidden ? '?' : w.name, hidden, filled: full, half, parts: ps, sources: hidden ? [] : filled[w.id] || [] };
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
      return h('div.settings', h('h3', '설정'),
        row('music', '배경음', onoff('music'), () => { st.music = !st.music; G.audio.unlock(); G.audio.music(st.music); }),
        row('sound', '효과음', onoff('sound'), () => { st.sound = !st.sound; }),
        row('big', '큰 글자', onoff('big'), () => { st.big = !st.big; }),
        row('mode', '읽기 방식', () => [st.mode === 'review' ? '다시 읽기' : '처음 읽기', st.mode !== 'review'], () => { st.mode = st.mode === 'review' ? 'first' : 'review'; }),
        row('teacher', '선생님용', onoff('teacher'), () => { st.teacher = !st.teacher; }),
        h('div.setrow', h('span', '기록 지우기'), h('button.btn.small.seal', { type: 'button', dataset: { set: 'clear' }, on: { click: () => close('clear') } }, '기록 지우기')),
        h('p.small.muted', '읽기 방식을 바꾸면 풀이 가리기는 바로, 얼굴 표시와 헷갈리는 선택지는 다음 장면부터 바뀌어요.'),
        h('p.small.muted', '진행 기록은 이 기기의 브라우저에만 저장돼요. 어디로도 보내지 않아요.'),
        h('div.credit-full', h('b', '음원 출처 '), G.audio.creditFull()));
    }, [{ label: '닫기', value: null, cls: 'primary' }], { cls: 'settings-sheet' });
    if (v === 'clear') {
      const ok = await ui.sheet([h('h3', '기록을 지울까요?'), h('p', '진행, 장부, 고른 마음, 집, 구슬, 깨어남, 해석, 이름이 모두 지워져요. 설정은 그대로예요.')],
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
    else if (target && S().started) { app.resume(); ui.toast(lockMsg(target)); }
    else app.title({ replace: true });
    window.addEventListener('popstate', onPop);
    // 뒤로 가기로 예전 화면이 캐시에서 되살아나면(bfcache) 저장된 상태로 다시 판단한다
    window.addEventListener('pageshow', (e) => { if (e.persisted) { G.save.load(); app.applySettings(); if (current) recheck(); } });
    app.booted = true;
  };
  function onPop(e) {
    const st = e.state;
    if (!st || !st.scene) { app.title({ fromPop: true }); return; }
    if (current && current.scene.id === st.scene) return;
    if (app.canOpen(st.scene)) { play(st.scene, { fromPop: true }); return; }
    ui.toast(lockMsg(st.scene));
    if (current) history.pushState({ scene: current.scene.id }, ''); // 지금 화면에 그대로 머문다
    else app.resume();
  }
})();
