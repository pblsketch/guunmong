'use strict';
(function () {
  const { h } = G.util, W = G.world;
  const verbs = { inspect: '살펴보기', talk: '말걸기', use: '원작 행동 시작하기', exit: '길 따라가기', continue: '이야기 이어가기', staff: '난간 치기' };
  const keyDirections = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  const screen = G.worldScreen = {};
  screen.play = function (ctx, scene) {
    const experience = G.experience.find(G.data, scene.id);
    if (!experience || !ctx.alive()) return Promise.resolve(false);
    const replay = ctx.readonly;
    const options = () => ({ run: ctx.run, readonly: ctx.readonly, by: G.save.state.teacher ? 'teacher' : 'student' });
    const saved = () => G.save.state.rpg?.scenes?.[scene.id];
    if (!replay && ctx.canAct() && !G.save.beginExperience(scene.id, options())) { ctx.fail(); return Promise.resolve(false); }
    if (ctx.step('world') === false) return Promise.resolve(false);
    let beatIndex = replay || ctx.reenact || !saved() ? 0 : experience.beats.findIndex(b => b.id === saved()?.beat);
    if (beatIndex < 0) beatIndex = experience.beats.length;
    let stage, cursor, actor, world, visible = [], scale = 1, frame = 0;
    let busy = false, finished = false, disposed = false, route = [], raf = null, motion = null, generation = 0, selected = null;
    const keys = new Map(), taps = [], objectArt = new Map(), mapListeners = [];
    const box = h('section.world-screen'), heading = h('h2.world-heading');
    const goal = h('p.world-goal', { dataset: { goal: '' } });
    const camera = h('div.world-camera'), actions = h('div.world-actions'), list = h('div.world-target-list');
    const targets = h('details.world-targets', h('summary', '대상 목록'), list);
    const speech = h('div.world-speech');
    const pad = h('div.world-pad', { role: 'group', 'aria-label': '이동 방향' });
    const controls = h('details.world-controls', h('summary', '조작 안내'), h('p', '방향키·WASD로 걷기 · Enter·Space로 행동하기. 화면을 누르면 그곳으로 걸어요. 대상은 가까이 간 뒤 한 번 더 누르세요.'));
    const help = h('div.world-help');
    const tools = h('details.world-tools', h('summary', '조작 도구'), h('div.world-tools-panel', targets, controls, h('details', h('summary', '방향 버튼'), pad), help));
    tools.addEventListener('toggle', () => { if (tools.open) { stop(); refresh(); } else if (!blocked()) world?.focus({ preventScroll: true }); });
    box.append(heading, goal, camera, actions, speech, tools);
    ctx.field.replaceChildren(box);
    let resolve;
    const result = new Promise(r => { resolve = r; });
    const active = () => !disposed && ctx.alive() && !ctx.signal.aborted;
    const permitted = () => active() && !finished && (ctx.canAct() || ctx.canBrowse());
    const blocked = () => !permitted() || busy || document.hidden || !!document.querySelector('.sheet-back, .fold-ov');
    const beat = () => experience.beats[beatIndex] || null;
    const viewOnly = () => replay || ctx.reenact && saved()?.actions.some(a => a.id === beat()?.id);
    const localBeat = () => beat()?.id ?? null;
    const spriteMeta = key => G.data.sprites?.[key] || null;
    const actorKey = () => stage.appearance || (stage.actor === 'seongjin' ? 'walk-seongjin' : 'walk-yang-scholar');
    function stop() {
      generation++; route = []; keys.clear(); taps.length = 0;
      cancelAnimationFrame(raf); raf = null; motion = null; frame = 0;
      if (actor) pose(false);
    }
    function place(el, x, y, meta, size) {
      const width = meta?.cell?.width || meta?.width || stage.map.tile, height = meta?.cell?.height || meta?.height || stage.map.tile;
      const anchor = meta?.anchor || { x: width / 2, y: height };
      const footX = (x + .5) * stage.map.tile, footY = (y + 1) * stage.map.tile;
      el.style.left = Math.round(footX - anchor.x) * size + 'px'; el.style.top = Math.round(footY - anchor.y) * size + 'px';
      el.style.width = width * size + 'px'; el.style.height = height * size + 'px'; el.style.zIndex = String(Math.round(footY));
      el.style.backgroundSize = width * (meta?.frames || 1) * size + 'px ' + height * (meta?.rows || 1) * size + 'px';
    }
    function follow(x, y) {
      const dpr = devicePixelRatio || 1, pixel = v => Math.round(v * dpr) / dpr;
      const width = stage.map.width * stage.map.tile * scale, height = stage.map.height * stage.map.tile * scale;
      const limitX = Math.floor(Math.max(0, width - camera.clientWidth) * dpr) / dpr;
      const limitY = Math.floor(Math.max(0, height - camera.clientHeight) * dpr) / dpr;
      const offsetX = Math.min(limitX, pixel(Math.max(0, (x + .5) * stage.map.tile * scale - camera.clientWidth / 2)));
      const offsetY = Math.min(limitY, pixel(Math.max(0, (y + 1) * stage.map.tile * scale - camera.clientHeight / 2)));
      const insetX = pixel(Math.max(0, (camera.clientWidth - width) / 2)), insetY = pixel(Math.max(0, (camera.clientHeight - height) / 2));
      world.style.transform = 'translate(' + (insetX - offsetX) + 'px,' + (insetY - offsetY) + 'px)';
      Object.assign(camera.dataset, { x: String(offsetX), y: String(offsetY), insetX: String(insetX), insetY: String(insetY), scale: String(scale) });
    }
    function pose(walking) {
      if (!active() || !actor || !stage) return;
      const meta = spriteMeta(actorKey()), dir = meta?.directions?.[cursor.facing], cell = meta?.cell || { width: stage.map.tile, height: stage.map.tile };
      const index = walking && dir?.walk?.length ? dir.walk[frame % dir.walk.length] : dir?.stand || 0;
      actor.style.backgroundPosition = -index * cell.width * scale + 'px ' + -(dir?.row || 0) * cell.height * scale + 'px';
      Object.assign(actor.dataset, { frame: String(index), facing: cursor.facing, x: String(cursor.x), y: String(cursor.y), moving: String(!!motion) });
      const point = motion?.point || cursor;
      place(actor, point.x, point.y, meta, scale); follow(point.x, point.y);
    }
    function layout() {
      if (!active() || !stage || !world) return;
      scale = Math.ceil(2 * (devicePixelRatio || 1)) / (devicePixelRatio || 1);
      world.style.width = stage.map.width * stage.map.tile * scale + 'px'; world.style.height = stage.map.height * stage.map.tile * scale + 'px';
      const tiles = world.querySelector('.world-tiles');
      if (tiles) tiles.style.backgroundSize = stage.map.tile * scale + 'px ' + stage.map.tile * scale + 'px';
      for (const o of visible) {
        const el = world.querySelector('[data-object="' + o.id + '"]'), art = objectArt.get(o.id);
        if (!el) continue;
        const size = art?.portrait ? G.util.pixNear(96, 48) : art?.native ? G.util.pixNear(96, 96) : scale;
        place(el, o.x, o.y, art?.meta, size);
        if (art?.portrait || art?.native) {
          const width = (art.meta?.width || 96) * size, height = (art.meta?.height || 96) * size;
          el.style.left = ((o.x + .5) * stage.map.tile * scale - width / 2) + 'px';
          el.style.top = ((o.y + 1) * stage.map.tile * scale - height) + 'px';
        }
        if (el.firstChild?.classList.contains('world-sprite')) {
          el.firstChild.style.width = el.style.width; el.firstChild.style.height = el.style.height; el.firstChild.style.backgroundSize = el.style.backgroundSize;
          const dir = art?.meta?.directions?.down;
          el.firstChild.style.backgroundPosition = -(dir?.stand || 0) * (art?.meta?.cell?.width || art?.meta?.width || 32) * size + 'px ' + -(dir?.row || 0) * (art?.meta?.cell?.height || art?.meta?.height || 32) * size + 'px';
        }
      }
      pose(!!motion);
    }
    const resize = new ResizeObserver(layout); resize.observe(camera);
    function actionFor(o) { return [...experience.beats, ...experience.optional].find(b => b.id === o.action && b.trigger.target === o.id); }
    function allowed(o) { const b = actionFor(o); return !!b && (b === beat() || experience.optional.includes(b)); }
    function near() {
      const candidates = motion ? [] : visible.filter(o => W.adjacent(cursor, o) && allowed(o));
      return candidates.find(o => o.id === selected) || candidates.find(o => o.action === beat()?.id) || candidates[0];
    }
    function refresh() {
      if (!active()) return;
      const b = beat(), target = visible.find(o => o.id === b?.trigger.target), nearby = near();
      goal.textContent = b ? '지금 할 일 · ' + (target ? target.label + ' — ' : '') + verbs[b.trigger.kind] : '이 장면의 필수 행동을 마쳤어요.';
      actions.replaceChildren();
      help.replaceChildren();
      box.dataset.finished = String(finished);
      if (nearby) {
        const a = actionFor(nearby);
        actions.appendChild(h('button.btn.primary', { type: 'button', disabled: blocked(), dataset: { act: 'interact', target: nearby.id, action: a.id }, on: { click: () => interact(nearby) } }, nearby.label + ' · ' + verbs[a.trigger.kind]));
      } else if (b?.trigger.target === null && b.trigger.kind !== 'staff') {
        actions.appendChild(h('button.btn.primary', { type: 'button', disabled: blocked(), dataset: { act: 'interact', target: '', action: b.id }, on: { click: () => interact(null) } }, verbs[b.trigger.kind]));
      }
      if (b && b.trigger.kind !== 'staff') help.appendChild(h('button.btn.small', { type: 'button', disabled: blocked(), dataset: { help: 'next' }, on: { click: () => {
        if (blocked()) return;
        if (!viewOnly() && !G.save.experienceHelp(scene.id, G.save.state.teacher ? 'teacher' : 'student', options())) { ctx.fail(); return; }
        if (target) seek(target); else G.ui.toast(verbs[b.trigger.kind]);
      } } }, '다음 행동 안내'));
      for (const el of [...list.children, ...pad.children, ...(world?.querySelectorAll('[data-object]') || [])]) el.disabled = blocked();
      world?.setAttribute('aria-disabled', String(!permitted()));
    }
    function validCursor() {
      const stored = G.save.state.rpg?.cursor;
      return viewOnly() || G.save.state.pos === scene.id && stored?.scene === scene.id && stored.map === stage.map.id && stored.x === cursor.x && stored.y === cursor.y;
    }
    function move(facing) {
      if (blocked() || !validCursor()) { stop(); refresh(); return; }
      const next = W.move(stage.map, cursor, facing, scene.id, localBeat()); cursor.facing = facing;
      if (!next) { stop(); refresh(); return; }
      const ticket = generation, started = performance.now(), from = { ...cursor };
      motion = { point: from }; pose(true); refresh();
      const tick = now => {
        raf = null;
        if (ticket !== generation || blocked() || !validCursor()) { stop(); refresh(); return; }
        const t = Math.min(1, (now - started) / 180);
        motion.point = { x: from.x + (next.x - from.x) * t, y: from.y + (next.y - from.y) * t }; frame = Math.floor((now - started) / 55); pose(true);
        if (t < 1) { raf = requestAnimationFrame(tick); return; }
        if (!viewOnly() && !G.save.move(facing, options())) { stop(); ctx.fail(); return; }
        if (!active() || ticket !== generation) return;
        cursor = viewOnly() ? next : { ...G.save.state.rpg.cursor };
        motion = null; frame = 0; pose(false); refresh(); advance(ticket);
      };
      raf = requestAnimationFrame(tick);
    }
    function advance(ticket) {
      if (ticket !== generation || blocked()) { stop(); refresh(); return; }
      if (motion) return;
      let facing = taps.shift() || (keys.size ? [...keys.values()].at(-1) : null);
      if (!facing && route.length) {
        const next = route.shift(), dx = next.x - cursor.x, dy = next.y - cursor.y;
        facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
      }
      if (facing) move(facing); else { pose(false); refresh(); }
    }
    function seek(o) {
      if (blocked() || !visible.includes(o)) return;
      stop(); selected = o.id; targets.open = false; tools.open = false;
      const path = W.path(stage.map, cursor, o, scene.id, localBeat());
      if (!path) { G.ui.toast('그곳까지 닿을 수 있는 길이 없어요.'); refresh(); return; }
      route = path.slice(1); world.focus({ preventScroll: true }); advance(generation);
    }
    function mount() {
      if (!active()) return;
      stop(); for (const remove of mapListeners.splice(0)) remove();
      stage = W.stage(G.data, scene.id, localBeat());
      if (!stage) { dispose(); return; }
      const c = !viewOnly() && G.save.state.rpg.cursor;
      if (c?.scene === scene.id && c.map === stage.map.id && W.walkable(stage.map, c.x, c.y, scene.id, localBeat())) cursor = { ...c };
      else if (!cursor || cursor.map !== stage.map.id || beat()?.spawn || !W.walkable(stage.map, cursor.x, cursor.y, scene.id, localBeat())) cursor = { scene: scene.id, map: stage.map.id, ...stage.spawn };
      selected = null; Object.assign(ctx.page.dataset, { map: stage.map.id, beat: localBeat() || '', actor: stage.actor });
      heading.textContent = scene.place || scene.title;
      world = h('div', { tabindex: '0', role: 'group', 'aria-label': '이동 공간', dataset: { world: '' } });
      const art = spriteMeta(stage.map.art);
      if (art && stage.map.art.startsWith('prop-floor-') && art.width === stage.map.tile && art.height === stage.map.tile) {
        world.appendChild(h('div.world-art.world-tiles', { 'aria-hidden': 'true', style: { backgroundImage: 'url("' + art.src + '")', backgroundRepeat: 'repeat' } }));
      } else if (art) world.appendChild(h('img.world-art', { src: art.src, alt: '', draggable: 'false' }));
      actor = h('div.world-sprite.world-actor', { 'aria-hidden': 'true', dataset: { actor: stage.actor } });
      const meta = spriteMeta(actorKey()); if (meta) actor.style.backgroundImage = 'url("' + meta.src + '")'; world.appendChild(actor);
      visible = W.objects(stage.map, scene.id, localBeat()); list.replaceChildren(); objectArt.clear();
      for (const o of visible) {
        const object = h('button.world-object' + (o.action === beat()?.id ? '.required' : ''), { type: 'button', 'aria-label': o.label, dataset: { object: o.id }, on: { click: () => {
          if (!blocked() && !motion && W.adjacent(cursor, o) && allowed(o)) interact(o); else seek(o);
        } } });
        const asset = spriteMeta(o.sprite), person = G.data.people?.[o.person];
        const body = asset && (o.kind !== 'npc' || !o.sprite.startsWith('prop-'));
        const portrait = !body && person?.face && !person.noFace && G.text.nameOf(o.person) === o.label;
        if (body) {
          const img = h('div.world-sprite'); img.style.backgroundImage = 'url("' + asset.src + '")'; object.appendChild(img); objectArt.set(o.id, { meta: asset, native: o.kind === 'npc' && asset.width === 96 && !asset.cell });
        } else if (portrait) {
          object.appendChild(G.util.pixImg(G.text.face(o.person), { alt: '', size: 48 })); objectArt.set(o.id, { portrait: true, meta: { width: 96, height: 96 } }); object.classList.add('world-person');
        } else {
          object.appendChild(h('span.world-marker', o.label)); object.dataset.artPending = String(o.kind === 'npc'); objectArt.set(o.id, { meta: null });
        }
        world.appendChild(object);
        list.appendChild(h('button.btn.small', { type: 'button', dataset: { worldTarget: o.id }, on: { click: () => seek(o) } }, o.label + (o.action === beat()?.id ? ' · 다음 행동' : '')));
      }
      const pointer = e => {
        if (blocked() || e.target.closest('button')) return;
        const rect = world.getBoundingClientRect();
        const dest = { x: Math.floor((e.clientX - rect.left) / scale / stage.map.tile), y: Math.floor((e.clientY - rect.top) / scale / stage.map.tile) };
        stop(); const path = W.path(stage.map, cursor, dest, scene.id, localBeat(), false);
        if (!path) { G.ui.toast('그곳까지 닿을 수 있는 길이 없어요.'); return; }
        route = path.slice(1); world.focus({ preventScroll: true }); advance(generation);
      };
      world.addEventListener('click', pointer); mapListeners.push(() => world.removeEventListener('click', pointer));
      camera.replaceChildren(world); layout(); refresh(); if (!blocked()) world.focus({ preventScroll: true });
    }
    async function interact(o) {
      if (blocked() || motion || o && (!visible.includes(o) || !W.adjacent(cursor, o) || !allowed(o))) return;
      const b = o ? actionFor(o) : beat(); if (!b || b.trigger.kind === 'staff' || b.trigger.target !== null && !o) return;
      stop();
      tools.open = false;
      if (!viewOnly() && !saved()?.actions.some(a => a.id === b.id)) { const outcome = G.save.applyExperience(scene.id, b.id, options()); if (!outcome.ok) { ctx.fail(); return; } }
      busy = true; refresh();
      const dialogueCtx = { ...ctx, main: speech, next(label = '다음 ▶') {
        return new Promise(r => {
          if (!active()) { r(false); return; }
          const next = h('button.btn.primary', { type: 'button', dataset: { act: 'next' } }, label);
          const tray = h('div.tray', next); speech.querySelector('[data-dialogue]').appendChild(tray);
          let settled = false;
          const end = ok => { if (settled) return; settled = true; ctx.signal.removeEventListener('abort', cancelled); tray.remove(); r(ok); };
          const cancelled = () => end(false); ctx.signal.addEventListener('abort', cancelled, { once: true });
          next.addEventListener('click', () => { if (permitted() && !document.querySelector('.sheet-back, .fold-ov')) end(true); }); next.focus({ preventScroll: true });
        });
      } };
      const label = o?.label, hideFace = !!o?.person && G.text.nameOf(o.person) !== label;
      const done = await G.stage.play(dialogueCtx, scene, { textOnly: true, label, hideFace, targetPerson: o?.person, lines: b.lines.map(i => scene.lines[i]) });
      if (!active() || !done) return;
      if (b.effects.some(effect => effect.kind === 'pearl') && !await G.pearl.explain({ ...dialogueCtx, readonly: !!viewOnly(), peek: true }, scene)) return;
      if (!active()) return;
      busy = false; speech.replaceChildren(); if (b === beat()) beatIndex++; mount(); if (!beat()) await finish();
    }
    async function finish() {
      if (!active() || finished) return;
      stop(); finished = true;
      if ((!replay || ctx.autoAdvance) && !ctx.finishExperience().ok) { ctx.fail(); return; }
      refresh();
      const next = G.app.list()[G.app.list().findIndex(s => s.id === scene.id) + 1];
      if (!next) { ctx.tray(null); box.appendChild(h('p.world-end', { role: 'status', dataset: { profileEnd: '' } }, '이 시험 구간을 마쳤어요. 본편 전체 완료는 아니에요.')); resolve(true); return; }
      if (await ctx.next(replay ? '다시 보기 마치기 ▶' : '다음 장소로 ▶')) { if (active()) resolve(true); }
    }
    function press(id, facing) {
      if (blocked() || keys.has(id)) return;
      route = []; keys.set(id, facing); taps.push(facing); advance(generation);
    }
    const keydown = e => {
      if (e.target !== world || e.ctrlKey || e.altKey || e.metaKey || blocked()) return;
      const facing = keyDirections[e.key];
      if (facing) { e.preventDefault(); if (!e.repeat) press(e.code || e.key, facing); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const o = near(); if (o) interact(o); else if (beat()?.trigger.target === null) interact(null); }
    };
    const keyup = e => { if (keys.delete(e.code || e.key)) e.preventDefault(); };
    for (const [facing, label, arrow] of [['up', '위로 걷기', '↑'], ['left', '왼쪽으로 걷기', '←'], ['down', '아래로 걷기', '↓'], ['right', '오른쪽으로 걷기', '→']]) {
      const button = h('button.world-direction', { type: 'button', 'aria-label': label, dataset: { direction: facing } }, arrow);
      button.addEventListener('pointerdown', e => { if (blocked() || e.button !== 0) return; e.preventDefault(); button.setPointerCapture(e.pointerId); world.focus({ preventScroll: true }); press('pointer-' + e.pointerId, facing); });
      const release = e => keys.delete('pointer-' + e.pointerId);
      button.addEventListener('pointerup', release); button.addEventListener('lostpointercapture', release);
      button.addEventListener('pointercancel', () => { stop(); refresh(); });
      button.addEventListener('click', e => { if (e.detail === 0 && !blocked()) { world.focus({ preventScroll: true }); taps.push(facing); advance(generation); } }); pad.appendChild(button);
    }
    let wasModal = false;
    const pause = () => {
      const modalOpen = !!document.querySelector('.sheet-back, .fold-ov'); if (document.hidden || modalOpen) stop();
      if (modalOpen !== wasModal) { wasModal = modalOpen; refresh(); if (!blocked()) world?.focus({ preventScroll: true }); }
    };
    const focus = e => { if (!world?.contains(e.target) && !pad.contains(e.target)) stop(); };
    const blur = () => { stop(); refresh(); };
    const modal = new MutationObserver(pause); modal.observe(document.body, { childList: true, subtree: true });
    const unsubscribe = G.save.onChange(reason => { if (['storage', 'access', 'reset'].includes(reason)) dispose(); });
    document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup); document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', pause); window.addEventListener('blur', blur);
    function dispose() {
      if (disposed) return;
      stop(); disposed = true; resize.disconnect(); modal.disconnect(); unsubscribe(); for (const remove of mapListeners.splice(0)) remove();
      document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', pause); window.removeEventListener('blur', blur); ctx.signal.removeEventListener('abort', dispose); box.remove(); resolve(false);
    }
    ctx.signal.addEventListener('abort', dispose, { once: true }); mount(); if (!beat()) finish(); return result;
  };
  G.app.screens.world = screen.play;
})();
