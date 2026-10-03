'use strict';
// 화면 부품: 알림, 풍선 도움말, 아래에서 올라오는 판(시트), 아이콘, 화면 접기
// (같은 만든이의 「사씨남정기」「도산십이곡」 ui를 가져와 고쳤다)
(function () {
  const { h } = G.util;
  const ui = (G.ui = {});

  // 알림: 읽는 글과 진행 단추를 가리지 않도록 위 막대(.topbar) 자리에 띄운다.
  //  - 위 막대의 빈 곳(장면 이름 글자와 오른쪽 단추 사이)에 들어가면 거기에, 모자라면(휴대폰) 위 막대 전체를 덮는다.
  //    덮는 동안 단추가 가려지므로 알림을 누르면 바로 닫힌다.
  //  - 위 막대가 없는 화면(타이틀)에서는 화면 맨 위에 띄운다. 새 알림이 오면 앞 알림을 바꾼다.
  let toastEl = null, toastTimer = null;
  ui.toast = function (text, ms = 2200) {
    if (toastEl) toastEl.remove();
    clearTimeout(toastTimer);
    const el = (toastEl = h('div.toast', { role: 'status' }, text));
    const close = () => { el.remove(); if (toastEl === el) toastEl = null; };
    el.addEventListener('click', close);
    document.body.appendChild(el);
    placeToast(el);
    toastTimer = setTimeout(close, ms);
  };
  function placeToast(el) {
    const bar = G.util.$$('.topbar').find((b) => b.offsetParent !== null);
    if (!bar) { el.classList.add('top'); return; }
    const r = bar.getBoundingClientRect();
    const bb = parseFloat(getComputedStyle(bar).borderBottomWidth) || 0;
    const H = Math.max(36, r.height - bb); // 아래 테두리는 남긴다
    // 장면 이름 글자의 오른쪽 끝(글자 마디만 잰다. 글자 상자는 막대 가운데까지 늘어나 있다)
    let left = r.left + 8;
    const where = bar.querySelector('.where');
    if (where) {
      const tw = document.createTreeWalker(where, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects()) left = Math.max(left, Math.min(q.right, where.getBoundingClientRect().right) + 12);
      }
    }
    const btns = G.util.$$('button', bar).map((b) => b.getBoundingClientRect()).filter((q) => q.width && q.left >= left - 12);
    const right = (btns.length ? Math.min(...btns.map((q) => q.left)) : r.right) - 12;
    el.style.top = Math.max(0, r.top) + 'px';
    if (el.offsetWidth <= right - left) {
      // 빈 곳 가운데에 작은 띠로
      const pad = 6;
      el.classList.add('in-bar');
      el.style.left = left + (right - left - el.offsetWidth) / 2 + 'px';
      el.style.top = Math.max(0, r.top) + pad + 'px';
      el.style.minHeight = H - pad * 2 + 'px';
    } else {
      // 위 막대 전체를 덮는다
      el.classList.add('cover');
      el.style.left = r.left + 'px';
      el.style.width = r.width + 'px';
      el.style.minHeight = H + 'px';
    }
  }

  // 풍선 도움말: 요소 가까이에 뜬다. 아무 곳이나 누르면 닫힌다
  let popEl = null;
  ui.pop = function (anchor, content) {
    ui.unpop();
    popEl = h('div.pop', { role: 'note' }, content);
    document.body.appendChild(popEl);
    const r = anchor.getBoundingClientRect(), pr = popEl.getBoundingClientRect();
    let x = r.left + r.width / 2 - pr.width / 2, y = r.top - pr.height - 8;
    if (y < 60) y = r.bottom + 8;
    x = G.util.clamp(x, 8, window.innerWidth - pr.width - 8);
    popEl.style.left = x + 'px'; popEl.style.top = y + 'px';
    setTimeout(() => document.addEventListener('pointerdown', ui.unpop, { once: true }), 0);
  };
  ui.unpop = function () { if (popEl) { popEl.remove(); popEl = null; } };

  // 아래에서 올라오는 판. 단추를 누르면 닫히고 그 값을 돌려준다.
  // content가 함수면 close(값)를 받아 내용을 만든다(판 안의 단추로 닫을 때).
  // opt.dismiss === false 이면 바깥 누르기·Esc로 닫히지 않는다(꼭 골라야 하는 판)
  ui.sheet = function (content, buttons = [{ label: '닫기', value: null, cls: 'primary' }], opt = {}) {
    return new Promise((resolve) => {
      const back = h('div.sheet-back');
      const box = h('div.sheet' + (opt.cls ? '.' + opt.cls : ''), { role: 'dialog', 'aria-modal': 'true' });
      let done = false;
      const close = (v) => { if (done) return; done = true; document.removeEventListener('keydown', onKey); back.remove(); if (last && last.focus) try { last.focus(); } catch (e) { /* 무시 */ } resolve(v); };
      box.appendChild(typeof content === 'function' ? content(close) : h('div', content));
      if (buttons && buttons.length) {
        const acts = h('div.actions');
        for (const b of buttons) acts.appendChild(h('button.btn' + (b.cls ? '.' + b.cls : ''), { type: 'button', on: { click: () => { G.audio.tap(); close(b.value); } } }, b.label));
        box.appendChild(acts);
      }
      back.appendChild(box);
      if (opt.dismiss !== false) back.addEventListener('click', (e) => { if (e.target === back) close(null); });
      const onKey = (e) => { if (e.key === 'Escape' && opt.dismiss !== false) { e.preventDefault(); close(null); } };
      document.addEventListener('keydown', onKey);
      const last = document.activeElement;
      document.body.appendChild(back);
      const first = box.querySelector('.actions .btn.primary, .actions .btn.seal') || box.querySelector('.actions .btn') || box.querySelector('button');
      if (first) setTimeout(() => { if (!done) first.focus(); }, 30);
    });
  };
  ui.shake = function (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
  ui.closeSheets = function () { G.util.$$('.sheet-back').forEach((b) => b.remove()); };

  // 확인 판: 그만두기/하기
  ui.confirm = function (title, body, yes = '하기', no = '그만두기') {
    return ui.sheet([h('h3', title), body ? h('p', body) : null], [{ label: no, value: false }, { label: yes, value: true, cls: 'seal' }]);
  };

  // ───────── 아이콘(SVG)
  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H5z"/><path d="M10 20v-6h4v6"/></svg>',
    toc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
    fold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 5l4.5 2v12L3 17zM7.5 7l4.5-2v12l-4.5 2zM12 5l4.5 2v12L12 17zM16.5 7L21 5v12l-4.5 2z"/></svg>',
    musicOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    musicOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    fullExit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
  };
  ui.ICON = ICON;
  // 아이콘 단추. icon이 ICON에 없으면 글자로 보인다
  ui.iconBtn = function (icon, label, fn, attrs = {}) {
    return h('button.icon-btn', Object.assign({ type: 'button', 'aria-label': label, title: label, html: ICON[icon] || G.util.esc(icon), on: { click: (e) => { G.audio.tap(); fn(e); } } }, attrs));
  };

  // ───────── 전체 화면: 브라우저의 주소창과 막대를 감춘다
  //  - 사람이 누를 때만 켤 수 있고(브라우저 규칙), 새로 고침하면 풀린다. 그래서 저장하지 않는다.
  //  - 지원하지 않는 브라우저(아이폰 사파리, 앱 안의 브라우저)에서는 다른 길을 알림으로 알려 준다.
  //  - 홈 화면에 설치해 연 게임(standalone)은 이미 주소창이 없다. 그래도 켤 수 있으면(안드로이드) 상태 표시줄까지 감춘다.
  const docEl = document.documentElement;
  const full = (ui.full = {});
  full.can = () => !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
  full.installed = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
  full.on = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  // 단추를 보일지: 켤 수 있거나, 켤 수 없어도 알려 줄 다른 길이 있을 때(설치한 게임에는 없음)
  full.offer = () => full.can() || !full.installed();
  full.hint = function () {
    const ua = navigator.userAgent;
    const msg = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua) ? '앱 안의 브라우저에서는 전체 화면이 막혀요. 메뉴에서 다른 브라우저로 열어 주세요.'
      : /iPhone|iPod/i.test(ua) ? '아이폰에서는 공유 단추 → 홈 화면에 추가로 설치한 뒤 열면 주소창 없이 볼 수 있어요.'
        : '이 브라우저는 전체 화면을 지원하지 않아요.';
    ui.toast(msg, 5000);
  };
  full.toggle = async function () {
    if (full.on()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit.call(document); } catch (e) { /* 이미 풀림 */ }
      document.dispatchEvent(new Event('guun-full'));
      return;
    }
    if (!full.can()) { full.hint(); return; }
    try {
      if (docEl.requestFullscreen) await docEl.requestFullscreen({ navigationUI: 'hide' });
      else docEl.webkitRequestFullscreen();
    } catch (e) { full.hint(); }
    document.dispatchEvent(new Event('guun-full'));
  };
  // 전체 화면이 켜지고 꺼질 때(Esc·뒤로 가기로 풀 때 포함) draw를 다시 부른다. el이 화면에서 빠지면 그만 듣는다
  //  브라우저의 fullscreenchange는 다음 그리기 때에야 오므로, toggle이 끝날 때 보내는 'guun-full'도 함께 듣는다
  full.watch = function (el, draw) {
    const evs = ['fullscreenchange', 'webkitfullscreenchange', 'guun-full'];
    const f = () => { if (!el.isConnected) { evs.forEach((ev) => document.removeEventListener(ev, f)); return; } draw(); };
    evs.forEach((ev) => document.addEventListener(ev, f));
    draw();
  };
  // 아이콘 단추(타이틀용)
  full.button = function () {
    const b = ui.iconBtn('full', '전체 화면', () => full.toggle(), { dataset: { tool: 'full' } });
    b.classList.add('full-toggle');
    full.watch(b, () => {
      const on = full.on(), label = on ? '전체 화면 끝내기' : '전체 화면';
      b.innerHTML = ICON[on ? 'fullExit' : 'full'];
      b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(on));
    });
    return b;
  };

  // ───────── 화면 접기: 화면을 덮고 소리를 멈춘다(선생님이 "화면 접으세요" 할 때)
  ui.fold = function () {
    if (document.querySelector('.fold-ov')) return;
    G.audio.hush();
    const ov = h('div.fold-ov', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '화면 접음' },
      h('div.fold-art', ...[0, 1, 2, 3, 4, 5].map(() => h('i'))),
      h('p', '화면을 접었어요. 선생님 말씀을 들어요.'),
      h('button.btn.primary', { type: 'button', on: { click: () => { ov.remove(); G.audio.unhush(); } } }, '다시 펼치기'));
    document.body.appendChild(ov);
    setTimeout(() => { const b = ov.querySelector('button'); if (b) b.focus(); }, 30);
  };
})();
