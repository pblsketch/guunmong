'use strict';
// 글 표시 규칙(명세 11절). 데이터의 글을 화면 요소로 바꾼다. 형식은 js/data/README.md의 '글 표기'.
//
//  덩이(블록)
//    { orig, gloss }                → 붉은 낙관 原文 + 그 아래 한지 바탕 풀이(풀이를 함께 표시)
//    { gloss }                      → 풀이만
//    { say: 인물id, mood, text }    → 인물의 말(풀이 층). 얼굴이 함께 보인다
//    { text }                       → 이야기 글(풀이 층)
//    { mark: 'fiction', id, title, body, real } → 청록 '게임 설정'. 처음 나올 때만 "실제로는 →"을 함께 보인다
//    { mark: 'variant', title, body }           → 황토 '이본 노트'
//    { mark: 'interp', title, body }            → 쪽빛 '해석'(채점하지 않음)
//    { mark: 'note', title, body }              → 알아 두기
//  줄 안 표기
//    **굵게**        {호칭|인물id} → 이름 옆에 얼굴이 자동으로 나온다
//    [[칸id]]        → 읽기 활동의 빈칸(활동 화면에서만)
//  옛한글(첫가끝 자모·아래아)이 든 原文은 옛한글 글꼴로 보인다.
//  얼굴 그림(96×96)은 정해진 크기(줄 안 24px, 말풍선 48px) 가까이 기기 픽셀 기준 정수배로만 줄이고 키운다.
(function () {
  const { h, pixImg } = G.util;
  const T = (G.text = {});
  const S = () => G.save.state;
  const OLD = /[ᄀ-ᇿꥠ-꥿ힰ-퟿ㆍᆞᆢ]/;
  T.hasOld = (s) => OLD.test(String(s || ''));

  // 인물 얼굴 그림 경로(assets/pt/<face>[_<mood>].webp)
  T.face = function (id, mood) {
    const p = (G.data.people || {})[id] || {};
    const base = p.face || id;
    const m = mood && p.moods && p.moods.includes(mood) ? '_' + mood : '';
    return 'assets/pt/' + base + m + '.webp';
  };
  T.nameOf = (id) => ((G.data.people || {})[id] || {}).name || id;

  // 줄 안 표기 → 조각
  T.parse = function (s) {
    const out = [];
    const re = /\*\*(.+?)\*\*|\{([^}|]+)\|([\w-]+)\}|\[\[([\w-]+)\]\]/g;
    let last = 0, m;
    s = String(s == null ? '' : s);
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ k: 't', t: s.slice(last, m.index) });
      if (m[1] != null) out.push({ k: 'b', t: m[1] });
      else if (m[2] != null) out.push({ k: 'p', t: m[2], id: m[3] });
      else out.push({ k: 'slot', id: m[4] });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ k: 't', t: s.slice(last) });
    return out;
  };
  // 표기를 걷어 낸 맨글
  T.plain = (s) => T.parse(s).map((p) => (p.k === 'slot' ? '___' : p.t)).join('');

  // 줄 안 표기 → 요소. opt.slot(id)가 있으면 빈칸을 그 함수가 만든다
  T.inline = function (s, opt = {}) {
    const span = h('span.tx');
    for (const p of T.parse(s)) {
      if (p.k === 't') appendLines(span, p.t);
      else if (p.k === 'b') span.appendChild(h('b', p.t));
      else if (p.k === 'p') {
        const el = h('span.person', { dataset: { id: p.id } });
        if (!opt.noFace && !((G.data.people || {})[p.id] || {}).noFace) el.appendChild(pixImg(T.face(p.id), { cls: 'face', size: 24 }));
        el.appendChild(document.createTextNode(p.t));
        span.appendChild(el);
      } else if (p.k === 'slot') span.appendChild(opt.slot ? opt.slot(p.id) : h('span.blank', '　　'));
    }
    return span;
  };
  function appendLines(el, t) {
    t.split('\n').forEach((line, i) => { if (i) el.appendChild(h('br')); if (line) el.appendChild(document.createTextNode(line)); });
  }

  // 原文 한 덩이
  T.orig = function (text, opt = {}) {
    const old = opt.old || T.hasOld(text);
    const body = T.inline(text, Object.assign({ noFace: true }, opt));
    if (old) body.classList.add('old');
    return h('div.mark.orig', h('span.seal', '原文'), h('div.orig-text', body), opt.src ? h('div.src', opt.src) : null);
  };
  // 풀이 한 덩이
  T.gloss = function (text, opt = {}) {
    return h('div.gloss', h('span.tag', '풀이'), h('div.gloss-text', T.inline(text, opt)));
  };

  const KIND = { fiction: '게임 설정', variant: '이본 노트', interp: '해석', note: '알아 두기' };
  T.mark = function (b, opt = {}) {
    const el = h('div.mark.' + b.mark, h('span.tag', KIND[b.mark] || b.mark),
      b.title ? h('h4', b.title) : null,
      b.body ? h('div.body', T.inline(b.body)) : null);
    if (b.mark === 'interp') el.appendChild(h('div.unscored', '여러 해석이 있어요 · 채점하지 않아요'));
    if (b.mark === 'fiction') {
      const key = b.id || b.title || '';
      if (b.real && (opt.showReal || !S().seenFiction[key])) el.appendChild(h('div.real', h('b', '실제로는 → '), T.inline(b.real)));
      if (key && !S().seenFiction[key] && !opt.peek && !opt.readonly && opt.run) {
        if (!G.save.transact(opt.run, draft => { draft.seenFiction[key] = true; }, { readonly: opt.readonly })) {
          G.ui.toast('안내를 읽은 기록을 저장하지 못했어요. 다시 열면 안내가 나와요.');
        }
      }
    }
    return el;
  };

  T.say = function (b) {
    const p = (G.data.people || {})[b.say] || {};
    return h('div.say' + (p.noFace ? '.noface' : ''),
      !p.noFace ? h('div.who', pixImg(T.face(b.say, b.mood), { cls: 'face', size: 48 })) : null,
      h('div.bubble', h('span.nm', p.name || b.say), T.inline(b.text, { noFace: true })));
  };

  // 덩이 하나 → 요소
  T.block = function (b, opt = {}) {
    if (typeof b === 'string') b = { text: b };
    if (b.mark) return T.mark(b, opt);
    if (b.say) return T.say(b);
    if (b.orig != null) {
      const pair = h('div.pair', T.orig(b.orig, { old: b.old, src: b.src }));
      if (b.gloss) {
        pair.appendChild(T.gloss(b.gloss));

      }
      return pair;
    }
    if (b.gloss != null) return h('div.pair.gloss-only', T.gloss(b.gloss));
    return h('p.narr', T.inline(b.text || ''));
  };
  T.blocks = function (list, opt = {}) {
    return h('div.read', (list || []).map((b) => T.block(b, opt)));
  };
})();
