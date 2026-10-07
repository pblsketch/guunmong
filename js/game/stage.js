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
  G.stage.mount = function (ctx, scene = {}, opt = {}) {
    let disposed = false;
    const animations = new Set();
    const pending = new Set();
    const el = h('section.stage', { 'aria-label': scene.title || '이야기 무대' });
    const background = h('div.stage-background');
    const pictureSrc = opt.pictureSrc || (scene.img ? 'assets/sc/' + scene.img + '.webp' : null);
    const picture = !opt.textOnly && pictureSrc ? pixImg(pictureSrc, { alt: scene.title || '', fit: false }) : null;
    if (picture) background.appendChild(picture);
    const fx = h('div.stage-effects', { 'aria-hidden': 'true' });
    const actors = h('div.stage-actors', { 'aria-hidden': 'true' });
    const face = h('div.stage-portrait');
    const speaker = h('div.stage-speaker');
    const dialogue = h('div.stage-dialogue', { role: 'button', tabindex: '0', 'aria-label': '다음 대사', 'aria-live': 'polite' });
    const speech = h('div.stage-speech', speaker, dialogue);
    el.append(background, fx, actors, face);
    const story = h('div.stage-story', el, speech);
    if (opt.textOnly) {
      story.classList.add('world-dialogue'); story.dataset.dialogue = '';
      el.replaceChildren(face); el.classList.add('dialogue-portrait');
    }
    ctx.main.appendChild(story);
    const active = () => !disposed && ctx.alive();
    // 좁은 화면에서는 원래 크기에 가까운 정수배를 유지하고 좌우 가장자리만 자른다.
    // 그림과 글은 따로 펼쳐 긴 설명도 그림을 덮거나 잘리지 않게 한다.
    function layout() {
      if (!active()) return;
      if (picture?.naturalWidth) {
        const dpr = devicePixelRatio || 1;
        const scale = opt.field ? Math.ceil(Math.max(ctx.main.clientWidth / picture.naturalWidth, ctx.main.clientHeight / picture.naturalHeight) * dpr) / dpr : pixNear(picture.naturalWidth, picture.naturalWidth);
        picture.style.width = picture.naturalWidth * scale + 'px';
        picture.style.height = picture.naturalHeight * scale + 'px';
        if (opt.field && opt.focus) {
          const pixel = value => Math.round(value * dpr) / dpr;
          picture.style.left = pixel(Math.max(ctx.main.clientWidth - picture.naturalWidth * scale, Math.min(0, ctx.main.clientWidth * .65 - opt.focus.x * picture.naturalWidth * scale))) + 'px';
          picture.style.top = pixel(Math.max(ctx.main.clientHeight - picture.naturalHeight * scale, Math.min(0, ctx.main.clientHeight * .5 - opt.focus.y * picture.naturalHeight * scale))) + 'px';
          picture.style.transform = 'none';
        }
        el.style.maxWidth = picture.naturalWidth * scale + 4 + 'px';
        background.style.height = picture.naturalHeight * scale + 'px';
      }
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
    const portraitSize = opt.textOnly ? 48 : 96;
    function portrait(id, mood, opt = {}) {
      face.replaceChildren();
      if (!active() || !id) return;
      const person = (G.data.people || {})[id];
      if (!person || person.noFace) return;
      const img = pixImg(G.text.face(id, mood), { cls: 'face', size: portraitSize });
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
      // 인물 대상: 그 인물의 말과 서술 줄에 공개 호칭을 쓴다. 물건 대상과 생각 선택의 질문 줄은 대상 이름을 화자로 쓰지 않는다.
      const targetSpeaking = !!opt.targetPerson && !b.prompt && (!b.say || b.say === opt.targetPerson);
      speaker.textContent = opt.label && targetSpeaking ? opt.label : b.say ? G.text.nameOf(b.say) : '';
      portrait(opt.hideFace && targetSpeaking ? null : b.say, b.mood, { shake: b.shake });
      dialogue.replaceChildren(b.mark ? G.text.block(b, { run: ctx.run, readonly: ctx.readonly }) : G.text.inline(b.text || b.gloss || '', { noFace: true }));
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
      story.remove();
    }
    ctx.signal.addEventListener('abort', dispose, { once: true });
    if (ctx.signal.aborted) dispose();
    return { el, dialogue, show, portrait, effect, walk, active, dispose };
  };
  G.stage.play = async function (ctx, scene, opt = {}) {
    const stage = G.stage.mount(ctx, scene, opt);
    const list = opt.lines || [...[].concat(scene.narration || []), ...(scene.lines || [])];
    const step = async (line) => {
      if (!stage.active()) return false;
      stage.show(line);
      const shownAt = performance.now();
      const next = (e) => { if (G.util.staleTap(e, shownAt)) return; if (stage.active()) (opt.textOnly ? ctx.main : ctx.page).querySelector(opt.textOnly ? '[data-act="next"]' : '#tray [data-act="next"]')?.click(); };
      const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
      stage.dialogue.addEventListener('click', next);
      stage.dialogue.addEventListener('keydown', key);
      const done = await ctx.next();
      stage.dialogue.removeEventListener('click', next);
      stage.dialogue.removeEventListener('keydown', key);
      return !!done && stage.active();
    };
    try {
      for (const [index, line] of (list.length ? list : ['']).entries()) {
        if (!await step(line)) return false;
        // 생각 선택(opt.choice): 이 줄 뒤에 말을 고르고 상대의 반응을 본 다음 원래 대사로 돌아간다.
        if (opt.choice && index === opt.choice.at) {
          stage.show({ text: opt.choice.prompt, prompt: true });
          const picked = await G.challenge.choose({ ...ctx, allow: opt.choice.allow }, opt.choice, (tray) => stage.dialogue.closest('.stage-story').appendChild(tray));
          if (!picked || !stage.active()) return false;
          // onPick(선택지): 반응을 보이기 전에 부르는 쪽이 행동과 고른 말을 함께 저장한다. false면 멈춘다.
          if (opt.choice.onPick && !opt.choice.onPick(picked)) return false;
          // 꾸민 선택 자리의 note: 반응과 함께 대화창 안(다음 단추 앞)에 접힌 '원작과 게임'으로 보이고, 다음 줄로 넘어가면 걷는다.
          const note = opt.choice.note ? G.challenge.note(opt.choice.note) : null;
          if (note) { note.dataset.talkNote = opt.choice.id; stage.dialogue.closest('.stage-story').appendChild(note); }
          const shown = await step(picked.reply);
          note?.remove();
          if (!shown) return false;
        }
      }
      return stage.active();
    } finally { stage.dispose(); }
  };
})();
