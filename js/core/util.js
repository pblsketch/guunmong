'use strict';
// 공용 도구: 요소 만들기, 섞기, 기다리기, 도트 그림 정수배 맞추기 등
// (같은 만든이의 「사씨남정기」 util.js를 가져와 이 게임에 맞게 줄였다)
window.G = window.G || {};
(function () {
  const U = (G.util = {});

  // h('div.cls#id', {attrs}, children...): 간단한 요소 생성기
  U.h = function (sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
    }
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'on') for (const ev in v) el.addEventListener(ev, v[ev]);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    U.append(el, kids);
    return el;
  };
  U.append = function (el, kids) {
    for (const k of [kids].flat(Infinity)) {
      if (k == null || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  };
  // 늦은 호환 click 막기: 실기기(특히 iOS)는 손을 뗀 뒤 click을 늦게 보내, 그사이 나타난 대사창·다음 단추가 그 click을 받아 첫 줄이 넘어갈 수 있다.
  // since 뒤에 시작된 누름에서 온 click만 받는다. 키보드 click(detail 0)과 새로 누른 입력은 그대로 통과한다.
  let lastPress = -Infinity;
  document.addEventListener('pointerdown', () => { lastPress = performance.now(); }, true);
  U.staleTap = (e, since) => !!e && e.detail !== 0 && lastPress < since;
  U.$ = (s, r = document) => r.querySelector(s);
  U.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 같은 씨앗이면 같은 순서로 섞는다(새로 고침해도 선택지 순서가 그대로)
  U.shuffle = function (a, seed) {
    a = a.slice();
    let s = seed == null ? Math.floor(Math.random() * 1e9) : seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.hash = function (str) {
    let x = 7;
    for (const ch of String(str)) x = (x * 31 + ch.codePointAt(0)) % 233280;
    return x;
  };
  U.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.norm = (s) => String(s == null ? '' : s).replace(/\s+/g, '').normalize('NFC');

  // 조사 고르기: 낱말의 마지막 한글 글자에 받침이 있는지로 '을/를'·'이/가'·'은/는'·'와/과'·'으로/로' 가운데 하나를 고른다.
  // 닫는 문장부호·따옴표·괄호(괄호 안의 한자 등)는 건너뛰고, 숫자는 읽는 소리로 본다. 두 꼴을 함께 내지 않는다.
  //   U.josa('거문고', '은/는') → '는'   U.josa('「…도구다.」', '을/를') → '를'   U.josa('서울', '으로/로') → '로'
  const DIGIT_JONG = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0]; // 영·일·이·삼·사·오·육·칠·팔·구의 받침(0이면 받침 없음, 8은 ㄹ)
  const AFTER_JONG = new Set(['을', '이', '은', '과', '으로', '아', '이나', '이랑', '이에요']);
  U.josa = function (word, pair) {
    // 두 꼴은 어느 차례로 적어도 된다('와/과'·'과/와' 모두). 받침 뒤에 오는 꼴을 앞으로
    let [withJong, noJong] = String(pair).split('/');
    if (AFTER_JONG.has(noJong)) [withJong, noJong] = [noJong, withJong];
    const s = String(word == null ? '' : word);
    let jong = 0;
    for (let i = s.length - 1; i >= 0; i--) {
      const c = s.charCodeAt(i);
      if (c >= 0xac00 && c <= 0xd7a3) { jong = (c - 0xac00) % 28; break; }
      if (c >= 48 && c <= 57) { jong = DIGIT_JONG[c - 48]; break; }
    }
    if (withJong === '으로') return jong && jong !== 8 ? '으로' : '로'; // ㄹ 받침 뒤에는 '로'
    return jong ? withJong : noJong;
  };

  // **굵게** → <b> (그 밖의 글은 이스케이프)
  U.bold = (s) => U.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // ───────── 도트 그림: 정수배로만 키우고 줄인다(부드럽게 하지 않음)
  // 배율은 기기 픽셀 기준이다. 그림 한 픽셀이 기기 픽셀 n개(또는 1/n개)가 되게 하고, CSS px로 돌려준다.
  // (휴대폰처럼 devicePixelRatio가 2·3인 화면에서도 그림 픽셀이 고르게 보인다)
  const dpr = () => window.devicePixelRatio || 1;
  // 너비 avail(CSS px) 안에 들어가는 가장 큰 정수배
  U.pixScale = function (nw, avail) {
    const dev = Math.max(1, Math.floor(avail * dpr()));
    const k = dev >= nw ? Math.floor(dev / nw) : 1 / Math.ceil(nw / dev);
    return k / dpr();
  };
  // 목표 크기 target(CSS px)에 가장 가까운 정수배(얼굴·물건처럼 크기가 정해진 그림)
  U.pixNear = function (nw, target) {
    const want = (target * dpr()) / nw;
    const k = want >= 1 ? Math.max(1, Math.round(want)) : 1 / Math.max(1, Math.round(1 / want));
    return k / dpr();
  };
  // 그림이 들어갈 너비에 맞춰 원래 크기의 n배(또는 1/n배)로 맞춘다.
  // data-maxh(화면 높이에 대한 비율)가 있으면 그 높이도 넘지 않게 한다(타이틀 그림 등).
  U.fitPixel = function (img) {
    let box = img.parentElement;
    if (!img.naturalWidth) return;
    if (!box || !img.isConnected) { requestAnimationFrame(() => { if (img.isConnected) U.fitPixel(img); }); return; }
    const nw = img.naturalWidth, nh = img.naturalHeight || nw;
    // 그림에 꼭 맞게 줄어드는 틀(장면 그림 틀)은 그 바깥 너비에서 틀 테두리를 뺀 만큼을 쓴다
    let edge = 0;
    if (box.classList.contains('scene-img')) { const bs = getComputedStyle(box); edge = parseFloat(bs.borderLeftWidth || 0) + parseFloat(bs.borderRightWidth || 0); box = box.parentElement; }
    const cs = getComputedStyle(box);
    let avail = (box.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0) - edge) || nw;
    const mh = parseFloat(img.dataset.maxh || 0);
    if (mh > 0) avail = Math.min(avail, (window.innerHeight * mh * nw) / nh);
    const s = U.pixScale(nw, avail);
    img.style.width = nw * s + 'px';
    img.style.height = nh * s + 'px';
    img.style.maxWidth = 'none';
  };
  // 정해진 크기(목표 target CSS px)에 가까운 정수배로
  U.sizePixel = function (img, target) {
    if (!img.naturalWidth) return;
    const s = U.pixNear(img.naturalWidth, target);
    img.style.width = img.naturalWidth * s + 'px';
    img.style.height = (img.naturalHeight || img.naturalWidth) * s + 'px';
  };
  let fitTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => U.$$('img.pix[data-fit]').forEach(U.fitPixel), 80);
  });

  // 그림 요소: 파일이 아직 없으면 자리만 남기고 숨긴다
  //  opt.fit(기본 true): 들어갈 너비에 맞춰 정수배 · opt.size: 이 크기(CSS px) 가까이 정수배 · opt.maxh: 화면 높이 비율 한도
  U.pixImg = function (src, opt = {}) {
    const ds = opt.fit === false || opt.size ? {} : { fit: '1' };
    if (opt.maxh) ds.maxh = String(opt.maxh);
    const img = U.h('img.pix', { src, alt: opt.alt || '', draggable: 'false', dataset: ds });
    if (opt.cls) img.classList.add(...opt.cls.split(' '));
    img.addEventListener('load', () => {
      img.classList.remove('missing');
      if (opt.size) U.sizePixel(img, opt.size);
      else if (opt.fit !== false) U.fitPixel(img);
    });
    img.addEventListener('error', () => img.classList.add('missing'));
    return img;
  };
})();
