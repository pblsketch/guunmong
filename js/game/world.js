'use strict';
(function () {
  const { h } = G.util, W = G.world;
  const verbs = { inspect: '살펴보기', talk: '말 걸기', use: '사용하기', exit: '길 따라가기', continue: '이야기 이어 가기', staff: '난간 치기' };
  // 한 칸 걷는 시간(ms)과 걷기 그림 한 장의 시간. 좁은 휴대폰에서도 눈으로 따라갈 수 있는 걸음.
  const STEP_MS = 260, FRAME_MS = 65;
  const keyDirections = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  const verbOf = (o, b) => o?.verb || verbs[b.trigger.kind];
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
    let stage, cursor, actor, world, visible = [], scale = 1, frame = 0, hudTop = 0;
    let busy = false, finished = false, disposed = false, route = [], raf = null, motion = null, generation = 0, selected = null, autoExit = null;
    let joystickPointer = null, actionPointer = null, ignorePointerClick = false;
    const keys = new Map(), taps = [], objectArt = new Map(), mapListeners = [];
    const box = h('section.world-screen'), heading = h('h2.world-heading');
    const goal = h('p.world-goal', { dataset: { goal: '' } });
    // 장면 길잡이: 앞 장면과 이번 장면을 잇는 안내. 이 장면의 첫 행동을 하기 전까지만 보이고 누름을 가로채지 않는다.
    const guide = scene.guide ? h('p.world-guide', { role: 'note', dataset: { guide: '' } }, h('b', '이야기 길잡이 '), scene.guide) : null;
    const camera = h('div.world-camera'), actions = h('div.world-actions'), list = h('div.world-target-list');
    const actionName = h('span.world-action-name'), actionVerb = h('strong.world-action-verb');
    const actionButton = h('button.btn.primary.world-interact', { type: 'button', hidden: true }, actionName, actionVerb);
    const actionHint = h('span.world-action-hint', '가까이 다가가세요');
    actions.append(actionButton, actionHint);
    const joystickKnob = h('span.world-joystick-knob');
    const joystick = h('div.world-joystick', { 'aria-hidden': 'true', dataset: { active: 'false' } }, h('span.world-joystick-base'), joystickKnob, h('span.world-joystick-label', '끌어서 이동'));
    box.dataset.touch = String(matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    const targets = h('details.world-targets', h('summary', '대상 목록'), list);
    const speech = h('div.world-speech');
    const pad = h('div.world-pad', { role: 'group', 'aria-label': '이동 방향' });
    const controls = h('details.world-controls', h('summary', '조작 안내'), h('p', '왼쪽을 누른 채 끌면 걸어요. 가까이 가서 오른쪽 노란 단추로 말 걸기·살펴보기를 해요. 화면을 눌러 이동할 수도 있어요. PC는 방향키·WASD로 걷고 E·Enter·Space로 행동해요.'));
    const help = h('div.world-help');
    const tools = h('details.world-tools', h('summary', '대상 목록·조작 안내'), h('div.world-tools-panel', targets, controls, h('details', h('summary', '방향 버튼'), pad), help));
    tools.addEventListener('toggle', () => { if (tools.open) { stop(); refresh(); } else if (!blocked()) world?.focus({ preventScroll: true }); });
    box.append(heading, goal, ...(guide ? [guide] : []), camera, joystick, actions, speech, tools);
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
      generation++; route = []; autoExit = null; keys.clear(); taps.length = 0;
      resetJoystick();
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
      // 세로 휴대폰(hudTop > 0)은 지금 할 일 띠 아래부터 화면 끝까지를 맵이 보이는 곳으로 본다.
      const viewHeight = camera.clientHeight - hudTop;
      const limitY = Math.floor(Math.max(0, height - viewHeight) * dpr) / dpr;
      const offsetX = Math.min(limitX, pixel(Math.max(0, (x + .5) * stage.map.tile * scale - camera.clientWidth / 2)));
      const offsetY = Math.min(limitY, pixel(Math.max(0, (y + 1) * stage.map.tile * scale - viewHeight / 2)));
      const insetX = pixel(Math.max(0, (camera.clientWidth - width) / 2));
      const insetY = !hudTop ? pixel(Math.max(0, (camera.clientHeight - height) / 2)) : pixel(height >= viewHeight ? hudTop : camera.clientHeight - height);
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
      const dpr = devicePixelRatio || 1, base = Math.ceil(2 * dpr) / dpr, mapWidth = stage.map.width * stage.map.tile, mapHeight = stage.map.height * stage.map.tile;
      scale = base; hudTop = 0;
      // 세로 휴대폰처럼 맵이 화면보다 넓을 때는 아래에 빈 띠가 남지 않게, 지금 할 일 띠 아래부터 화면 아래 끝까지 맵이 차도록 키운다.
      // 배율은 기기 픽셀 정수 단계만 쓴다(픽셀 그림이 고르게 보이게). 한 단계 아래로도 24px 안쪽만 모자라면 그 단계를 아래에 붙인다.
      if (mapWidth * base > camera.clientWidth) {
        hudTop = Math.max(0, goal.getBoundingClientRect().bottom - camera.getBoundingClientRect().top);
        const room = camera.clientHeight - hudTop, need = room / mapHeight * dpr;
        const low = Math.max(base, Math.floor(need) / dpr), high = Math.max(base, Math.ceil(need) / dpr);
        scale = room - mapHeight * low <= 24 ? low : high;
      }
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
    let cameraWidth = camera.clientWidth, cameraHeight = camera.clientHeight;
    const resize = new ResizeObserver(() => {
      const width = camera.clientWidth, height = camera.clientHeight;
      if (width !== cameraWidth || height !== cameraHeight) { stop(); resetActionPointer(); }
      cameraWidth = width; cameraHeight = height; layout(); refresh();
    }); resize.observe(camera);
    function actionFor(o) { return [...experience.beats, ...experience.optional].find(b => b.id === o.action && b.trigger.target === o.id); }
    function allowed(o) { const b = actionFor(o); return !!b && (b === beat() || experience.optional.includes(b)); }
    function near() {
      const candidates = visible.filter(o => W.adjacent(cursor, o) && allowed(o));
      return candidates.find(o => o.id === selected) || candidates.find(o => o.action === beat()?.id) || candidates[0];
    }
    function refresh() {
      if (!active()) return;
      const b = beat(), target = visible.find(o => o.id === b?.trigger.target), nearby = near();
      goal.textContent = b ? '지금 할 일 · ' + (target ? target.label + ': ' + verbOf(target, b) : verbs[b.trigger.kind]) : '이 장면의 필수 행동을 마쳤어요.';
      help.replaceChildren();
      box.dataset.finished = String(finished);
      if (guide) guide.hidden = finished || busy || (!replay && !!saved()?.actions?.length);
      // 선생님용 다시 읽기 띠는 큰 글자·좁은 화면에서 높이가 바뀌므로 실제 아래 끝에 맞춘다.
      const bar = replay && guide && !guide.hidden && guide.offsetParent && ctx.page.querySelector('.revisit-bar');
      if (bar) guide.style.top = Math.round(bar.getBoundingClientRect().bottom - guide.offsetParent.getBoundingClientRect().top + 6) + 'px';
      box.dataset.paused = String(blocked()); box.dataset.toolsOpen = String(tools.open);
      if (blocked()) resetActionPointer();
      // 다른 장소로 가는 길(exit)은 그 자리까지 되돌아가지 않아도 된다. 어디서든 단추를 누르면 인물이 길까지 걸어가 넘어간다.
      const exitTarget = !nearby && b?.trigger.kind === 'exit' && target ? target : null;
      const action = nearby ? actionFor(nearby) : exitTarget ? b : b?.trigger.target === null && b.trigger.kind !== 'staff' ? b : null;
      const shown = nearby || exitTarget;
      actionButton.hidden = !action; actionButton.disabled = blocked(); actionHint.hidden = !!action || blocked();
      if (action) {
        Object.assign(actionButton.dataset, { act: 'interact', target: shown?.id || '', action: action.id });
        actionName.textContent = shown?.label || ''; actionVerb.textContent = verbOf(shown, action);
        actionButton.setAttribute('aria-label', (shown ? shown.label + ' · ' : '') + verbOf(shown, action));
      } else {
        for (const key of ['act', 'target', 'action']) delete actionButton.dataset[key];
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
      if (!next) { if (joystickPointer?.dragged) { route = []; pose(false); refresh(); } else { stop(); refresh(); } return; }
      const ticket = generation, started = performance.now(), from = { ...cursor };
      motion = { point: from }; pose(true); refresh();
      const tick = now => {
        raf = null;
        if (ticket !== generation || blocked() || !validCursor()) { stop(); refresh(); return; }
        const t = Math.min(1, (now - started) / STEP_MS);
        motion.point = { x: from.x + (next.x - from.x) * t, y: from.y + (next.y - from.y) * t }; frame = Math.floor((now - started) / FRAME_MS); pose(true);
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
      if (facing) { move(facing); return; }
      pose(false); refresh();
      if (autoExit) {
        const o = visible.find(v => v.id === autoExit); autoExit = null;
        if (o && W.adjacent(cursor, o) && allowed(o)) interact(o);
      }
    }
    function seek(o) {
      if (blocked() || !visible.includes(o)) return;
      stop(); selected = o.id; targets.open = false; tools.open = false;
      const path = W.path(stage.map, cursor, o, scene.id, localBeat());
      if (!path) { G.ui.toast('그곳까지 닿을 수 있는 길이 없어요.'); refresh(); return false; }
      route = path.slice(1); world.focus({ preventScroll: true }); advance(generation);
      return true;
    }
    function goExit(o) {
      if (blocked() || motion || !o || o.kind !== 'exit' || !allowed(o)) return false;
      if (W.adjacent(cursor, o)) { interact(o); return true; }
      if (seek(o)) { autoExit = o.id; if (!motion && !route.length) advance(generation); }
      return true;
    }
    function mount() {
      if (!active()) return;
      stop(); resetActionPointer(); for (const remove of mapListeners.splice(0)) remove();
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
        // 장식 대상(decor): 원작 장면의 군중처럼 서 있기만 한다. 대상 목록·초점·누르기에서 빠지고 통행만 막는다.
        if (o.decor) {
          const asset = spriteMeta(o.sprite), decor = h('div.world-object.world-decor', { 'aria-hidden': 'true', dataset: { object: o.id, kind: o.kind, decor: '' } });
          if (asset) { const img = h('div.world-sprite'); img.style.backgroundImage = 'url("' + asset.src + '")'; decor.appendChild(img); objectArt.set(o.id, { meta: asset }); }
          world.appendChild(decor); continue;
        }
        const object = h('button.world-object' + (o.action === beat()?.id ? '.required' : ''), { type: 'button', 'aria-label': o.label, dataset: { object: o.id, kind: o.kind }, on: { click: () => {
          if (!blocked() && !motion && W.adjacent(cursor, o) && allowed(o)) interact(o); else if (o.kind === 'exit' && allowed(o)) goExit(o); else seek(o);
        } } });
        // 구슬 흔적: 가구 그림 대신 반짝임을 그린다. 찾은 뒤에는 작게 멈춘 빛만 남는다.
        if (o.kind === 'pearl') {
          const found = !!saved()?.actions.some(a => a.id === o.action);
          object.classList.add('world-pearl'); if (found) object.classList.add('found');
          object.appendChild(h('span.world-glint', { 'aria-hidden': 'true' })); objectArt.set(o.id, { meta: null });
          world.appendChild(object);
          list.appendChild(h('button.btn.small', { type: 'button', dataset: { worldTarget: o.id }, on: { click: () => seek(o) } }, o.label));
          continue;
        }
        // 길(exit)의 길 표시 그림(비석 모양) 대신 땅 위에 흐르는 빛과 화살표로 갈 곳을 보인다.
        if (o.kind === 'exit' && o.sprite === 'prop-path') {
          object.classList.add('world-exit'); object.appendChild(h('span.world-exit-glow', { 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));
          objectArt.set(o.id, { meta: null }); world.appendChild(object);
          list.appendChild(h('button.btn.small', { type: 'button', dataset: { worldTarget: o.id }, on: { click: () => seek(o) } }, o.label + (o.action === beat()?.id ? ' · 다음 행동' : '')));
          continue;
        }
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
      const fresh = !viewOnly() && !saved()?.actions.some(a => a.id === b.id);
      // 위기 도전: 처음 수행할 때와 다시 읽기에서 연다. 풀어야 행동이 기록되고(다시 읽기는 기록 없음), 물러나면 같은 자리에서 다시 시도한다.
      const trial = (fresh || replay) && G.challenge?.find(scene.id, b.id, 'play');
      // 생각 선택 자리(결정 0022): 학생 기록이면 행동은 고른 순간 고른 말과 한 저장으로 남긴다. 고르기 전 새로 고침은 같은 질문으로 돌아온다.
      const site = fresh && !ctx.readonly && G.play.siteAt(G.data, scene.id, b.id);
      const together = !!site && G.play.recording(G.save.state, options().by);
      if (trial) {
        busy = true; refresh();
        const solved = await G.challenge.play({ ...ctx, allow: permitted, options }, trial, box);
        if (!active()) return;
        busy = false;
        if (!solved) { refresh(); world?.focus({ preventScroll: true }); return; }
        if (blocked() || motion || o && (!visible.includes(o) || !W.adjacent(cursor, o))) { refresh(); return; }
      }
      if (fresh && !together) { const outcome = G.save.applyExperience(scene.id, b.id, options()); if (!outcome.ok) { ctx.fail(); return; } }
      busy = true; refresh();
      const dialogueCtx = { ...ctx, main: speech, next(label = '다음 ▶') {
        return new Promise(r => {
          if (!active()) { r(false); return; }
          const next = h('button.btn.primary', { type: 'button', dataset: { act: 'next' } }, label), shownAt = performance.now();
          const tray = h('div.tray', next); speech.querySelector('[data-dialogue]').appendChild(tray);
          let settled = false;
          const end = ok => { if (settled) return; settled = true; ctx.signal.removeEventListener('abort', cancelled); tray.remove(); r(ok); };
          const cancelled = () => end(false); ctx.signal.addEventListener('abort', cancelled, { once: true });
          next.addEventListener('click', e => { if (G.util.staleTap(e, shownAt)) return; if (permitted() && !document.querySelector('.sheet-back, .fold-ov')) end(true); }); next.focus({ preventScroll: true });
        });
      } };
      const label = o?.label, hideFace = !!o?.person && G.text.nameOf(o.person) !== label;
      const talk = (fresh || replay) && G.challenge?.find(scene.id, b.id, 'talk');
      const pickTogether = o => {
        if (!permitted()) return false;
        const outcome = G.save.applyExperience(scene.id, b.id, { ...options(), choice: o.id });
        if (outcome.ok || outcome.reason === 'duplicate') return true;
        ctx.fail(); return false;
      };
      const choice = talk ? { ...talk, allow: () => permitted() && !document.querySelector('.sheet-back, .fold-ov'), onPick: together && talk.id === site.id ? pickTogether : null } : null;
      const done = await G.stage.play(dialogueCtx, scene, { textOnly: true, label, hideFace, targetPerson: o?.person, lines: b.lines.map(i => scene.lines[i]), choice });
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
    function resetJoystick() {
      const pointer = joystickPointer; joystickPointer = null; keys.delete('joystick');
      joystick.dataset.active = 'false'; delete joystick.dataset.direction;
      joystick.style.removeProperty('left'); joystick.style.removeProperty('top'); joystickKnob.style.removeProperty('transform');
      if (pointer && box.hasPointerCapture(pointer.id)) box.releasePointerCapture(pointer.id);
    }
    const beginJoystick = e => {
      if (!['touch', 'pen'].includes(e.pointerType) || blocked() || tools.open || joystickPointer || !e.target.closest('.world-camera') || e.target.closest('button')) return;
      box.dataset.touch = 'true';
      const bounds = box.getBoundingClientRect(), x = e.clientX - bounds.left, y = e.clientY - bounds.top;
      const top = Math.max(104, goal.getBoundingClientRect().bottom - bounds.top + 8);
      if (x > bounds.width * .6 || y < top) return;
      stop(); ignorePointerClick = false;
      joystickPointer = { id: e.pointerId, x: e.clientX, y: e.clientY, dragged: false };
      joystick.style.left = Math.max(54, Math.min(x, bounds.width * .6 - 10)) + 'px';
      joystick.style.top = Math.max(Math.min(top + 52, bounds.height - 68), Math.min(y, bounds.height - 68)) + 'px';
      world.focus({ preventScroll: true });
    };
    const moveJoystick = e => {
      if (!joystickPointer || e.pointerId !== joystickPointer.id) return;
      if (blocked() || tools.open) { stop(); refresh(); return; }
      const dx = e.clientX - joystickPointer.x, dy = e.clientY - joystickPointer.y, distance = Math.hypot(dx, dy);
      if (distance < 8) { keys.delete('joystick'); delete joystick.dataset.direction; joystickKnob.style.removeProperty('transform'); return; }
      if (!joystickPointer.dragged) { joystickPointer.dragged = true; box.setPointerCapture(e.pointerId); }
      e.preventDefault(); joystick.dataset.active = 'true';
      const fraction = Math.min(1, 44 / distance);
      joystickKnob.style.transform = `translate(calc(-50% + ${dx * fraction}px), calc(-50% + ${dy * fraction}px))`;
      const facing = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
      joystick.dataset.direction = facing; route = []; taps.length = 0; keys.set('joystick', facing); advance(generation);
    };
    const endJoystick = e => {
      if (!joystickPointer || e.pointerId !== joystickPointer.id) return;
      if (joystickPointer.dragged) ignorePointerClick = true;
      resetJoystick(); if (!motion) { pose(false); refresh(); }
    };
    const cancelJoystick = e => { if (joystickPointer?.id === e.pointerId) { stop(); refresh(); } };
    const clickGuard = e => {
      if (e.detail === 0) return;
      if (ignorePointerClick || joystickPointer?.dragged && !e.target.closest('.world-actions,.world-tools')) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    box.addEventListener('pointerdown', () => { ignorePointerClick = false; }, true);
    box.addEventListener('pointerdown', beginJoystick);
    box.addEventListener('pointermove', moveJoystick);
    box.addEventListener('lostpointercapture', e => { if (e.target === box) cancelJoystick(e); });
    box.addEventListener('click', clickGuard, true);
    window.addEventListener('pointerup', endJoystick);
    window.addEventListener('pointercancel', cancelJoystick);
    function resetActionPointer() {
      const pointer = actionPointer; actionPointer = null;
      if (pointer) ignorePointerClick = true;
      if (pointer && actionButton.hasPointerCapture(pointer.id)) actionButton.releasePointerCapture(pointer.id);
    }
    function activateNearby() {
      if (!actionButton.isConnected || actionButton.hidden || blocked()) return;
      stop(); const nearby = near();
      if (nearby) interact(nearby);
      else if (beat()?.trigger.kind === 'exit') goExit(visible.find(o => o.id === beat().trigger.target));
      else if (beat()?.trigger.target === null) interact(null);
    }
    actionButton.addEventListener('pointerdown', e => {
      if (e.button !== 0 || actionPointer || actionButton.hidden || blocked()) return;
      e.preventDefault(); stop(); refresh();
      actionPointer = { id: e.pointerId, action: actionButton.dataset.action, target: actionButton.dataset.target };
      actionButton.setPointerCapture(e.pointerId);
    });
    actionButton.addEventListener('pointerup', e => {
      if (actionPointer?.id !== e.pointerId) return;
      const pointer = actionPointer, bounds = actionButton.getBoundingClientRect(); resetActionPointer();
      if (e.clientX >= bounds.left && e.clientX <= bounds.right && e.clientY >= bounds.top && e.clientY <= bounds.bottom &&
          pointer.action === actionButton.dataset.action && pointer.target === actionButton.dataset.target) activateNearby();
    });
    actionButton.addEventListener('pointercancel', e => { if (actionPointer?.id === e.pointerId) resetActionPointer(); });
    actionButton.addEventListener('lostpointercapture', e => { if (e.target === actionButton && actionPointer?.id === e.pointerId) resetActionPointer(); });
    actionButton.addEventListener('click', e => { if (e.detail === 0) activateNearby(); });
    const keydown = e => {
      if (e.target !== world || e.ctrlKey || e.altKey || e.metaKey || blocked()) return;
      const facing = keyDirections[e.key];
      if (facing) { e.preventDefault(); if (!e.repeat) press(e.code || e.key, facing); }
      else if (['Enter', ' ', 'e', 'E'].includes(e.key)) { e.preventDefault(); const o = near(); if (o) interact(o); else if (beat()?.trigger.kind === 'exit') goExit(visible.find(v => v.id === beat().trigger.target)); else if (beat()?.trigger.target === null) interact(null); }
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
    let wasModal = false, wasHidden = document.hidden;
    const pause = () => {
      const modalOpen = !!document.querySelector('.sheet-back, .fold-ov'); if (document.hidden || modalOpen) { stop(); resetActionPointer(); }
      if (modalOpen !== wasModal || document.hidden !== wasHidden) { wasModal = modalOpen; wasHidden = document.hidden; refresh(); if (!blocked()) world?.focus({ preventScroll: true }); }
    };
    const focus = e => { if (!world?.contains(e.target) && !pad.contains(e.target)) stop(); };
    const blur = () => { stop(); resetActionPointer(); refresh(); };
    const modal = new MutationObserver(pause); modal.observe(document.body, { childList: true, subtree: true });
    const unsubscribe = G.save.onChange(reason => { if (['storage', 'access', 'reset'].includes(reason)) dispose(); });
    document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup); document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', pause); window.addEventListener('blur', blur);
    function dispose() {
      if (disposed) return;
      stop(); resetActionPointer(); disposed = true; resize.disconnect(); modal.disconnect(); unsubscribe(); for (const remove of mapListeners.splice(0)) remove();
      document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', pause); window.removeEventListener('blur', blur); ctx.signal.removeEventListener('abort', dispose); box.remove(); resolve(false);
      window.removeEventListener('pointerup', endJoystick); window.removeEventListener('pointercancel', cancelJoystick);
    }
    ctx.signal.addEventListener('abort', dispose, { once: true }); mount(); if (!beat()) finish(); return result;
  };
  G.app.screens.world = screen.play;
})();
