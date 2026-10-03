'use strict';
// G.stage.mount(ctx, scene) -> {el, show(line), portrait(id,mood,{shake}), effect(name),
//   walk({from:{x,y},to:{x,y},duration,outfit?}):Promise<boolean>, active(), dispose()}.
// 좌표는 %, duration은 ms. walk는 양소유의 기존 32px 시트만 쓴다.
// G.stage.play(ctx, scene, {lines?}) -> Promise<boolean>: 마지막 줄 뒤 true, 취소면 false.
// ctx.signal/ctx.alive로 취소한다. 이탈 시 대기·애니메이션·관찰자를 해제한다.
// scene.narration 다음 scene.lines가 기본. 줄은 기존 text 블록 + effect/shake를 지원한다.
// G.dream에 기대지 않으므로 board보다 먼저 읽어도 된다.
(function () {
  const { h, pixImg, pixNear } = G.util;
  const effects = ['petals', 'mist', 'ripples', 'candle', 'fire'];
  G.stage = {};
  G.stage.mount = function (ctx, scene = {}) {
    let disposed = false;
    const animations = new Set();
    const pending = new Set();
    const el = h('section.stage', { 'aria-label': scene.title || '이야기 무대' });
    const background = h('div.stage-background');
    const picture = scene.img ? pixImg('assets/sc/' + scene.img + '.webp', { alt: scene.title || '', fit: false }) : null;
    if (picture) background.appendChild(picture);
    const fx = h('div.stage-effects', { 'aria-hidden': 'true' });
    const actors = h('div.stage-actors', { 'aria-hidden': 'true' });
    const face = h('div.stage-portrait');
    const speaker = h('div.stage-speaker');
    const dialogue = h('div.stage-dialogue', { role: 'button', tabindex: '0', 'aria-label': '다음 대사', 'aria-live': 'polite' });
    const speech = h('div.stage-speech', speaker, dialogue);
    el.append(background, fx, actors, face, speech);
    ctx.main.appendChild(el);
    const active = () => !disposed && ctx.alive();
    // 좁은 화면에서는 원래 크기에 가까운 정수배를 유지하고 좌우 가장자리만 자른다.
    // 그림의 가운데와 전체 높이를 보존하며 대사창도 같은 그림 영역 안에 둔다.
    function layout() {
      if (!active()) return;
      if (picture?.naturalWidth) {
        const scale = pixNear(picture.naturalWidth, picture.naturalWidth);
        picture.style.width = picture.naturalWidth * scale + 'px';
        picture.style.height = picture.naturalHeight * scale + 'px';
        el.style.maxWidth = picture.naturalWidth * scale + 4 + 'px';
        background.style.height = picture.naturalHeight * scale + 'px';
      }
      el.style.setProperty('--speech-height', speech.offsetHeight + 'px');
    }
    const layoutObserver = new ResizeObserver(layout);
    layoutObserver.observe(speech);
    picture?.addEventListener('load', layout);
    window.addEventListener('resize', layout);
    layout();
    function animate(target, frames, options) {
      if (!active()) return null;
      const motion = target.animate(frames, options);
      animations.add(motion);
      motion.finished.then(() => animations.delete(motion), () => animations.delete(motion));
      return motion;
    }
    function portrait(id, mood, opt = {}) {
      face.replaceChildren();
      if (!active() || !id) return;
      const person = (G.data.people || {})[id];
      if (!person || person.noFace) return;
      const img = pixImg(G.text.face(id, mood), { cls: 'face', size: 96 });
      face.appendChild(img);
      animate(face, opt.shake ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }] : [{ opacity: 0, transform: 'translateX(30px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 300 });
    }
    function effect(name) {
      if (!active() || !effects.includes(name)) return null;
      const old = fx.querySelector('[data-effect="' + name + '"]');
      if (old) return old;
      const layer = h('div.stage-effect.' + name, { dataset: { effect: name } });
      for (let i = 0; i < 8; i++) layer.appendChild(h('i', { style: { '--i': i, left: (i * 13 + 3) + '%', animationDelay: (-i * 0.27) + 's' } }));
      fx.appendChild(layer);
      return layer;
    }
    function show(line) {
      if (!active()) return;
      const b = typeof line === 'string' ? { text: line } : line || {};
      speaker.textContent = b.say ? G.text.nameOf(b.say) : '';
      portrait(b.say, b.mood, { shake: b.shake });
      dialogue.replaceChildren(b.mark ? G.text.block(b, { peek: ctx.readonly }) : G.text.inline(b.text || b.gloss || '', { noFace: true }));
      if (b.effect) effect(b.effect);
    }
    async function walk(opt = {}) {
      if (!active()) return false;
      const from = opt.from || { x: 10, y: 70 }, to = opt.to || { x: 80, y: 70 };
      const outfit = ['gwan', 'jang', 'sang'].includes(opt.outfit) ? '_' + opt.outfit : '';
      const actor = h('div.stage-actor', { dataset: { person: 'yang' } });
      actor.style.backgroundImage = 'url("assets/board/horse_walk' + outfit + '.webp")';
      actor.style.left = from.x + '%'; actor.style.top = from.y + '%';
      actors.appendChild(actor);
      const size = () => { const f = 32 * pixNear(32, 64); actor.style.setProperty('--frame', f + 'px'); };
      size();
      const observer = new ResizeObserver(size); observer.observe(el);
      const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.max(0, opt.duration ?? 800);
      let resolveCancel;
      const cancelled = new Promise((r) => { resolveCancel = () => r(false); pending.add(resolveCancel); });
      const motion = animate(actor, [{ left: from.x + '%', top: from.y + '%' }, { left: to.x + '%', top: to.y + '%' }], { duration, fill: 'forwards', easing: 'linear' });
      const done = await Promise.race([motion.finished.then(() => true, () => false), cancelled]);
      pending.delete(resolveCancel); observer.disconnect();
      if (active() && done) { actor.style.left = to.x + '%'; actor.style.top = to.y + '%'; actor.classList.add('stopped'); motion.cancel(); }
      return active() && done;
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      for (const motion of animations) motion.cancel();
      animations.clear();
      for (const resolve of pending) resolve();
      pending.clear();
      layoutObserver.disconnect();
      picture?.removeEventListener('load', layout);
      window.removeEventListener('resize', layout);
      ctx.signal.removeEventListener('abort', dispose);
      el.remove();
    }
    ctx.signal.addEventListener('abort', dispose, { once: true });
    if (ctx.signal.aborted) dispose();
    return { el, dialogue, show, portrait, effect, walk, active, dispose };
  };
  G.stage.play = async function (ctx, scene, opt = {}) {
    const stage = G.stage.mount(ctx, scene);
    const list = opt.lines || [...[].concat(scene.narration || []), ...(scene.lines || [])];
    try {
      for (const line of list.length ? list : ['']) {
        if (!stage.active()) return false;
        stage.show(line);
        const next = () => { if (stage.active()) ctx.page.querySelector('#tray [data-act="next"]')?.click(); };
        const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
        stage.dialogue.addEventListener('click', next);
        stage.dialogue.addEventListener('keydown', key);
        await ctx.next();
        stage.dialogue.removeEventListener('click', next);
        stage.dialogue.removeEventListener('keydown', key);
      }
      return stage.active();
    } finally { stage.dispose(); }
  };
})();
