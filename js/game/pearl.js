'use strict';
// 여덟 구슬(명세 5.4): 성진이 던진 복숭아꽃이 된 여덟 구슬. 여인을 처음 만나는 장면의 그림 어딘가에 흔적이 하나씩 숨어 있다.
//  - 장면 그림을 눌러 찾는다. 찾기는 선택이고, 못 찾아도 진행이 막히지 않으며 감점도 없다(장부에 넣지 않는다).
//  - 찾은 것은 save.pearls[인연id] = true. 못 찾은 구슬은 꿈 일지에서 흐리게 나온다.
//  - 위치는 데이터의 pearl: { x, y, r } (장면 그림 너비·높이에 대한 백분율, 가운데 기준).
//    그림 위에 작은 반짝임(assets/ui/pearl_trace.webp)을 장면 그림과 같은 배율로 겹치고, 찾으면 구슬(pearl.webp)로 바뀐다.
//  - 흔적의 근거(pearl.trace): 'canon'(원작에 구슬이 나오는 정경패·난양공주)이면 원작 근거(pearl.canon)를 '알아 두기'로,
//    그 밖(이 게임이 숨긴 여섯 구슬)이면 게임 설정 카드를 붙인다. 두 카드의 글은 notes.ui(pearlCanon·pearlFiction)에 있다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const UI = () => ((G.data.notes || {}).ui || {});

  // 흔적의 근거 카드: 원작이면 알아 두기, 게임이 숨긴 것이면 게임 설정
  function traceCard(P) {
    if (P.trace === 'canon') return P.canon ? T.mark({ mark: 'note', title: (UI().pearlCanon || {}).title || '', body: P.canon }) : null;
    const f = UI().pearlFiction;
    return f ? T.mark(Object.assign({ mark: 'fiction' }, f)) : null;
  }

  G.app.steps.pearl = async function (ctx, sc) {
    const P = sc.pearl;
    if (!P || !sc.meet) return;
    ctx.step('pearl');
    const s = ctx.section('pearl-blk');
    s.appendChild(h('div.act-head',
      h('span.act-kind', '숨은 구슬 · 찾지 않아도 돼요'),
      h('h3', '장면 그림을 다시 살펴보세요'),
      h('p.small', '그림 어딘가에 여덟 구슬 가운데 하나의 흔적이 숨어 있을지도 몰라요. 찾았다 싶은 곳을 눌러 보세요.'),
      P.hint ? h('p.small.muted.pearl-hint', T.inline(P.hint)) : null));
    const pic = D.picture(sc.img ? 'assets/sc/' + sc.img + '.webp' : '', 'pearl-pic' + (sc.reality ? ' desat' : ''));
    if (!sc.img) pic.img.remove();
    const r = Math.max(3, P.r || 6);
    const trace = D.overlay('assets/ui/pearl_trace.webp', 'trace');
    trace.addEventListener('load', () => spot.classList.add('has-img'));
    const spot = h('button.pearl-spot', { type: 'button', 'aria-label': '그림 속 반짝이는 곳', style: { left: P.x + '%', top: P.y + '%', width: r * 2 + '%' } }, h('span.bead-glint'), trace);
    pic.box.appendChild(spot);
    const status = h('p.pearl-status', { role: 'status', 'aria-live': 'polite' });
    s.append(pic.frame, status);
    const card = traceCard(P);
    if (card) s.appendChild(card);
    const show = () => {
      spot.classList.add('found');
      spot.disabled = true;
      spot.setAttribute('aria-label', '찾은 구슬');
      trace.src = 'assets/ui/pearl.webp';
      status.textContent = '구슬 하나를 찾았어요. 이 구슬이 무엇이었는지는 꿈 일지에서 알게 돼요.';
    };
    if (S().pearls[sc.meet]) show();
    spot.addEventListener('click', () => {
      if (spot.classList.contains('found')) return;
      G.audio.pearl();
      if (!ctx.readonly) { S().pearls[sc.meet] = true; G.save.write(); }
      show();
    });
    await ctx.next('다음 ▶');
  };
})();
