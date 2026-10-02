'use strict';
// 깨어남(명세 3장·5.5): 취미궁 잔치는 아직 꿈이다. 호승이 지팡이로 땅을 두드리며 다가오는 것도 아직 꿈이다.
// 호승이 지팡이로 돌난간을 치는 바로 그 순간 G.app.wake()로 깨어남을 기록하고(되돌릴 수 없음),
// 소리가 멎은 자리에서 → 지팡이 소리 → 말판·집·벼슬·인연첩이 한꺼번에 사라지고 → 채도를 낮춘 빈 연화봉 선방이 남는다.
// 남는 것은 소원 목록과 찾은 구슬뿐이다.
// 데이터(waking 장면): read(잔치 끝의 무상), approach(땅을 두드리며 다가옴, 아직 꿈), staffPrompt, after(빈 선방), roomImg(빈 선방 그림)
// 빈 선방 그림 아래 한 줄은 notes.ui.zenCaption(원작대로 향로의 불이 꺼진 선방).
// 지팡이가 난간을 치면 흰 구름(assets/ui/cloud_wipe.webp)이 화면을 덮었다가 걷히고, 그 사이에 쌓은 것이 사라진다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const app = G.app;

  // 꿈에서 쌓은 것: 말판, 벼슬, 집, 인연첩(사라질 것) + 소원 목록과 구슬(남을 것)
  function tableau() {
    const offices = (G.data.board || []).filter((q) => q.kind === 'office' && app.list().some((s) => s.square === q.id && D.reached(s.id)));
    const met = (G.data.bonds || []).filter((b) => S().bonds[b.id]);
    const gone = h('div.vanishables',
      h('div.tb-part.tb-board', G.board.view({ mini: true, wishes: false })),
      offices.length ? h('div.tb-part.tb-offices', h('h4', '오른 벼슬'), h('div.office-row', offices.map((q) => h('span.office-badge', q.name)))) : null,
      h('div.tb-part.tb-house', G.house.view({ editable: false, mini: true })),
      met.length ? h('div.tb-part.bond-strip', h('h4', '인연첩'), h('div.bond-names', met.map((b) => h('span.bond-chip', { dataset: { bond: b.id } }, b.name)))) : null);
    const keep = h('div.wake-keep', D.wishList(), D.pearlKeep());
    return { el: h('section.blk.dream-tableau', h('h3.tb-title', '꿈에서 쌓은 것'), gone, keep), gone, keep };
  }

  function zenRoom(sc) {
    // 그림은 장면의 roomImg(없으면 그림 없이 임시 바탕)
    const pic = D.picture(sc.roomImg ? 'assets/sc/' + sc.roomImg + '.webp' : '', 'zen-pic');
    if (!sc.roomImg) pic.img.remove();
    pic.box.classList.add('zen-ph');
    const cap = ((G.data.notes || {}).ui || {}).zenCaption || '연화봉 선방';
    return h('div.zen-room.desat', pic.frame, h('p.zen-cap', T.inline(cap)));
  }

  // 흰 구름이 화면을 덮었다가 걷힌다(정지 그림을 흐리게 드러냈다 지움). 그림은 화면을 덮는 가장 작은 정수배
  function cloudWipe(ms) {
    const el = h('div.cloud-wipe', { 'aria-hidden': 'true' });
    const im = new Image();
    im.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const k = Math.max(1, Math.ceil(Math.max((innerWidth * dpr) / im.naturalWidth, (innerHeight * dpr) / im.naturalHeight)));
      el.style.backgroundImage = 'url("' + im.src + '")';
      el.style.backgroundSize = (im.naturalWidth * k) / dpr + 'px ' + (im.naturalHeight * k) / dpr + 'px';
      el.classList.add('has-img');
    };
    im.src = 'assets/ui/cloud_wipe.webp';
    el.style.animationDuration = ms + 'ms';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms + 60);
  }

  app.screens.waking = async function (ctx, sc) {
    app.sceneHead(ctx, sc);
    if (sc.read && sc.read.length) {
      ctx.step('read');
      ctx.section('reading').appendChild(T.blocks(sc.read));
    }
    const tb = tableau();
    ctx.main.appendChild(tb.el);
    const wasAwake = S().awake;
    if (!wasAwake) {
      await ctx.next('계속 ▶');
      if (!ctx.alive()) return;
      // 아직 꿈: 지팡이로 땅을 두드리며 호승이 다가온다
      ctx.step('approach');
      const a = ctx.section('approach');
      a.appendChild(sc.approach && sc.approach.length ? T.blocks(sc.approach) : h('p.narr', '어디선가 지팡이로 땅을 톡, 톡 두드리는 소리가 가까워져요. 낯선 스님 한 분이 다가와요.'));
      a.appendChild(h('p.small.muted', '아직 꿈속이에요.'));
      [0, 380, 760].forEach((ms) => setTimeout(() => { if (ctx.alive()) G.audio.tap(); }, ms));
      await ctx.next('스님을 맞는다 ▶');
      if (!ctx.alive()) return;
      // 소리가 멎는다 → 지팡이로 난간을 치는 순간 깨어남
      ctx.step('strike');
      G.audio.play(null);
      ctx.page.classList.add('hush');
      const st = ctx.section('strike');
      const btn = h('button.btn.seal.staff', { type: 'button', dataset: { act: 'staff' } }, '지팡이가 돌난간을 친다');
      st.append(h('p.strike-lead', '풍악이 뚝 멎었어요.'), h('p', T.inline(sc.staffPrompt || '스님이 지팡이를 들어 돌난간을 두어 번 쳐요.')), btn);
      await new Promise((resolve) => btn.addEventListener('click', () => {
        btn.disabled = true;
        G.audio.staff();
        app.wake(); // 바로 이 순간 기록(새로 시작하기 전까지 되돌릴 수 없다)
        resolve();
      }, { once: true }));
      if (!ctx.alive()) return;
      // 쌓은 것이 한꺼번에 사라진다
      ctx.page.classList.add('struck');
      const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      cloudWipe(reduceMotion ? 400 : 1800);
      tb.gone.querySelectorAll('.tb-part').forEach((p, i) => { p.style.animationDelay = i * 90 + 'ms'; p.classList.add('vanish'); });
      st.querySelector('.staff').classList.add('vanish');
      await G.util.wait(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1500);
      if (!ctx.alive()) return;
      tb.gone.remove();
      st.remove();
      const a2 = ctx.main.querySelector('.approach');
      if (a2) a2.remove();
    } else {
      tb.gone.remove();
    }
    ctx.step('awake');
    tb.el.querySelector('.tb-title').textContent = '남은 것';
    tb.el.insertBefore(zenRoom(sc), tb.keep);
    if (sc.after && sc.after.length) tb.el.insertBefore(h('div.after', T.blocks(sc.after)), tb.keep);
    tb.el.insertBefore(h('p.wake-note', '꿈에서 깨어났어요. 말판도, 집도, 벼슬도, 인연첩도 없어요. 남은 것은 소원 목록과 구슬뿐이에요.'), tb.keep);
    G.audio.wake();
    await ctx.next();
  };
})();
