'use strict';
// play(ctx, scene, {canSkip?, onPause?, field?}) -> Promise<boolean>. at는 자동 진행 간격,
// 화면 누름은 다음 줄로 앞당긴다. pause는 자동 진행을 막고 onPause 또는 다음 단추를 기다린다.
// 그림은 stage의 정수배 배치를 유지한다. 이동은 배율이 아닌 translate만 바꾼다.
// onPause의 stage.setSpriteFrame(id, index)는 반복 재생을 끄고 0부터 센 자세를 고정한다.
(function () {
  const { h, pixImg, pixNear } = G.util;
  const DISPLAY_SIZE = 96;
  const C = (G.cutscene = {});
  C.play = async function (ctx, sc, opt = {}) {
    const timeline = sc.timeline || [];
    const target = opt.field && ctx.field ? { ...ctx, main: ctx.field } : ctx;
    const map = opt.field && G.world.stage(G.data, sc.id)?.map;
    const art = map && G.data.sprites[map.art];
    const monk = map?.objects.find(object => object.person === 'hoseung');
    const focus = monk && { x: (monk.x + .5) / map.width, y: (monk.y + 1) / map.height };
    const stage = G.stage.mount(target, { ...sc, img: timeline[0]?.img || sc.img }, { field: !!opt.field, pictureSrc: art?.src, focus });
    if (opt.field) stage.el.parentElement.classList.add('field-cutscene');
    stage.el.classList.add('cutscene');
    const figures = h('div.cut-figures', { 'aria-hidden': 'true' }); stage.el.append(figures);
    const cells = new Map();
    const controlledStaff = timeline.some((frame) => frame.pause === 'staff');
    function placeFigures() {
      if (!opt.field || !map || !art || !stage.active()) return;
      const picture = stage.el.querySelector('.stage-background img');
      if (!picture?.naturalWidth) return;
      const r = picture.getBoundingClientRect(), field = ctx.field.getBoundingClientRect();
      for (const actor of figures.children) {
        const object = map.objects.find(object => object.person === actor.dataset.sprite);
        if (!object) continue;
        actor.style.left = (r.left - field.left + (object.x + .5) / map.width * r.width) / field.width * 100 + '%';
        actor.style.top = (r.top - field.top + (object.y + 1) / map.height * r.height) / field.height * 100 + '%';
      }
    }
    const picture = stage.el.querySelector('.stage-background img');
    if (opt.field) { window.addEventListener('resize', placeFigures); picture?.addEventListener('load', placeFigures); }
    stage.setSpriteFrame = (id, index) => {
      const sprite = cells.get(id);
      if (!stage.active() || !sprite || !Number.isInteger(index) || index < 0 || index >= sprite.columns * sprite.rows) return false;
      sprite.cell.style.animation = 'none';
      sprite.cell.style.backgroundPosition = -(index % sprite.columns) * sprite.width + 'px ' + -Math.floor(index / sprite.columns) * sprite.height + 'px';
      return true;
    };
    const motions = new Set();
    let skipped = false, camera = null;
    const canSkip = () => typeof opt.canSkip === 'function' ? opt.canSkip() : opt.canSkip !== false;
    function wait(ms, pause) {
      return new Promise((resolve) => {
        let timer;
        const cleanup = () => { clearTimeout(timer); ctx.signal.removeEventListener('abort', abort); stage.el.removeEventListener('click', advance); stage.dialogue.removeEventListener('click', advance); stage.dialogue.removeEventListener('keydown', key); };
        const end = (value) => { cleanup(); resolve(value); };
        const shownAt = performance.now();
        const advance = (e) => { if (G.util.staleTap(e, shownAt)) return; if (ctx.alive() && ctx.canProceed() && !document.querySelector('.sheet-back, .fold-ov')) end(true); };
        const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); } };
        const abort = () => end(false);
        const next = h('button.btn.primary', { type: 'button', disabled: !ctx.canProceed(), dataset: { act: 'next' }, on: { click: advance } }, '다음 ▶');
        const controls = [next];
        if (!pause && canSkip()) controls.push(h('button.btn.small', { type: 'button', disabled: !ctx.canProceed(), dataset: { act: 'skip' }, on: { click: () => {
          if (!ctx.alive() || !ctx.canProceed() || document.querySelector('.sheet-back, .fold-ov')) return;
          skipped = true; end(true);
        } } }, '건너뛰기'));
        ctx.tray(controls);
        ctx.signal.addEventListener('abort', abort, { once: true });
        if (!pause) { stage.el.addEventListener('click', advance); stage.dialogue.addEventListener('click', advance); stage.dialogue.addEventListener('keydown', key); }
        if (!pause) timer = setTimeout(advance, ms);
        if (!ctx.alive()) abort();
      });
    }
    function sprites(defs) {
      figures.replaceChildren();
      cells.clear();
      for (const def of defs) {
        const entry = G.data.sprites?.[def.id];
        const actor = h('div.cut-figure', { dataset: { sprite: def.id }, style: { left: def.x + '%', top: def.y + '%' } });
        if (entry && /^assets\/[a-z0-9/_-]+\.webp$/i.test(entry.src)) {
          const scale = pixNear(entry.width, DISPLAY_SIZE), w = entry.width * scale, height = entry.height * scale;
          const cell = h('div.cut-sprite', { style: { width: w + 'px', height: height + 'px', backgroundImage: 'url("' + entry.src + '")', backgroundSize: w * entry.frames + 'px ' + height * (entry.rows || 1) + 'px' } });
          cell.style.setProperty('--frames', String(entry.frames));
          cell.style.setProperty('--sheet-end', -w * entry.frames + 'px');
          cells.set(def.id, { cell, width: w, height, columns: entry.frames, rows: entry.rows || 1 });
          if (controlledStaff && def.id === 'hoseung') stage.setSpriteFrame(def.id, 0);
          actor.append(cell);
        } else {
          const person = G.data.people?.[def.id];
          if (person && !person.noFace) actor.append(pixImg(G.text.face(def.id), { size: DISPLAY_SIZE }));
          else actor.append(h('span.cut-fallback', person?.name || '인물'));
        }
        figures.append(actor);
      }
      placeFigures();
    }
    try {
      for (let i = 0; i < timeline.length; i++) {
        if (!ctx.alive() || skipped) break;
        const frame = timeline[i];
        stage.el.dataset.frame = i;
        stage.el.dataset.at = frame.at;
        if (frame.img && !art) {
          const img = stage.el.querySelector('.stage-background img');
          if (img) img.src = 'assets/sc/' + frame.img + '.webp';
        }
        if (frame.sprites) sprites(frame.sprites);
        if (frame.pause === 'staff') stage.setSpriteFrame('hoseung', 2);
        if (frame.effect) {
          stage.el.querySelectorAll('.stage-effect, .cut-light, .cut-shatter').forEach((el) => el.remove());
          if (['light', 'shatter'].includes(frame.effect)) stage.el.append(h('div.cut-' + frame.effect, { 'aria-hidden': 'true' }));
          else if (!stage.effect(frame.effect)) throw Error('Unknown cutscene effect: ' + frame.effect);
        }
        if (frame.move && !art) {
          camera?.cancel();
          const img = stage.el.querySelector('.stage-background img');
          if (img) {
            camera = img.animate([{ translate: '0px 0px' }, { translate: frame.move.x + 'px ' + frame.move.y + 'px' }], { duration: frame.move.duration, fill: 'forwards', easing: 'linear' });
            motions.add(camera);
          }
          stage.el.dataset.move = JSON.stringify(frame.move);
        }
        const lines = frame.lines?.length ? frame.lines : [''];
        const duration = Math.max(0, (timeline[i + 1]?.at ?? (frame.at + (frame.move?.duration || 2500))) - frame.at);
        for (let n = 0; n < lines.length; n++) {
          if (!ctx.alive() || skipped) break;
          stage.show(lines[n]);
          const pause = n === lines.length - 1 && frame.pause;
          if (pause && opt.onPause) { ctx.tray(null); await opt.onPause(pause, stage); }
          else await wait(duration / lines.length, pause);
        }
      }
      return ctx.alive();
    } finally {
      if (opt.field) { window.removeEventListener('resize', placeFigures); picture?.removeEventListener('load', placeFigures); }
      for (const motion of motions) motion.cancel(); stage.dispose(); ctx.tray(null);
    }
  };
  G.app.screens.cut = async (ctx, sc) => { ctx.step('cut'); await C.play(ctx, sc); };
})();
