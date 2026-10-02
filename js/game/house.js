'use strict';
// 양소유의 집(명세 5.3): 말판 진행에 따라 단계가 오르고(객사·초가 → 정 사도 댁 별당 → 승상부 → 취미궁, 단계 구분은 데이터),
// 장면에서 얻은 물건을 학생이 칸 위에 마음대로 놓고 옮긴다. 배치는 채점하지 않고 save.house[물건id] = 칸id 로만 남는다.
//  - 놓으면 그 자리에 바로 보인다. 단계가 오를수록 집이 눈에 띄게 넓고 화려해진다(그림이 없으면 CSS로 그린 임시 집).
//  - 단계가 올라 예전 칸이 없어지면 놓아 둔 물건을 새 집의 같은 순번(없으면 빈) 칸으로 옮겨 둔다.
//  - 깨어나면 집은 사라지고 다시 보여 주지 않는다(선생님용만 볼 수 있다). 집 꾸미기라는 틀은 게임 설정이다.
//  - 조작: 물건(보따리 또는 놓인 것)을 누르고 → 칸을 누른다. 놓인 칸을 누르면 그 물건을 집어 옮길 수 있다. 키보드는 Tab·Enter.
//  - 칸 종류(기획서 §10): 칸의 kind는 'in'(방 안)·'yard'(뜰), 물건의 slot은 'in'·'yard'·'any'. 방 안 물건은 방 안 칸에만,
//    뜰 물건은 뜰 칸에만, any는 어디나 놓인다(kind가 없는 칸도 어디나). 맞지 않는 칸은 흐리게 보이고 눌러도 놓이지 않는다.
//  - 집 그림은 기기 픽셀 기준 정수배로 키우고, 물건 그림(32×32)도 같은 배율로 놓는다. 뒤 단계의 넓은 집은 좌우로 끌어 본다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const H = (G.house = {});

  H.stages = () => ((G.data.house || {}).stages || []);
  // 지금 단계: from 장면에 들어선 마지막 단계(from이 없으면 처음부터)
  H.stageIndex = function () {
    let k = -1;
    H.stages().forEach((st, i) => { if (!st.from || D.reached(st.from)) k = i; });
    return k;
  };
  H.stage = () => H.stages()[H.stageIndex()] || null;
  // 칸 목록: slots(백분율 위치) 또는 grid: [열, 행]
  H.slotsOf = function (st) {
    if (!st) return [];
    if (Array.isArray(st.slots) && st.slots.length) return st.slots;
    const [cols, rows] = Array.isArray(st.grid) ? st.grid : [3, 2];
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ id: st.id + '-' + (r * cols + c + 1), x: ((c + 0.5) / cols) * 100, y: 42 + ((r + 0.5) / rows) * 54, w: Math.min(16, 56 / cols) });
    return out;
  };
  const owned = () => Object.keys(S().items || {}).filter((id) => D.items()[id]);
  // 물건이 그 칸에 맞는가(칸 종류 제한)
  const want = (it) => (it && it.slot) || 'any';
  const kindOf = (sl) => (sl && sl.kind) || 'any';
  H.fits = function (itemId, slot) {
    const w = want(D.items()[itemId]), k = kindOf(slot);
    return w === 'any' || k === 'any' || w === k;
  };
  const slotById = (id) => { for (const st of H.stages()) { const sl = H.slotsOf(st).find((x) => x.id === id); if (sl) return sl; } return null; };
  const KIND_NAME = { in: '방 안', yard: '뜰' };

  // 단계가 바뀌어 없는 칸(또는 종류가 맞지 않는 칸)에 놓인 물건을 새 집 칸으로 옮긴다
  //  예전 단계에서의 순번을 그대로 쓰되(inn-1 → bd-1), 그 칸이 차 있거나 종류가 맞지 않으면 종류가 맞는 첫 빈칸으로. 없으면 보따리로
  H.settle = function () {
    const st = H.stage();
    if (!st) return;
    const slots = H.slotsOf(st), ids = slots.map((x) => x.id);
    const house = S().house;
    let changed = false;
    const ok = (it, id) => ids.includes(id) && H.fits(it, slots[ids.indexOf(id)]);
    const taken = new Set(Object.keys(house).filter((it) => ok(it, house[it])).map((it) => house[it]));
    for (const it of Object.keys(house)) {
      if (ok(it, house[it])) continue;
      let n = -1;
      for (const old of H.stages()) { const k = H.slotsOf(old).findIndex((x) => x.id === house[it]); if (k >= 0) { n = k; break; } }
      const free = (id) => !taken.has(id) && ok(it, id);
      const to = n >= 0 && ids[n] && free(ids[n]) ? ids[n] : ids.find(free);
      if (to) { house[it] = to; taken.add(to); } else delete house[it];
      changed = true;
    }
    if (changed) G.save.write();
  };

  // ───────── 고른 물건(놓을 것 / 옮길 것)
  let sel = null;
  H.select = (id) => { sel = id; H.refresh(); };
  // 놓기. 칸 종류가 맞지 않으면 놓지 않고 false. 차 있으면 자리를 바꾸되, 바뀔 물건이 내 옛 칸에 맞지 않으면 그것은 보따리로
  function place(itemId, slotId) {
    const house = S().house;
    if (!H.fits(itemId, slotById(slotId))) return false;
    const other = Object.keys(house).find((k) => house[k] === slotId && k !== itemId);
    const prev = house[itemId];
    if (other) {
      if (prev && H.fits(other, slotById(prev))) house[other] = prev;
      else if (prev) return false; // 자리를 바꿀 수 없으면 그대로 둔다
      else delete house[other];
    }
    house[itemId] = slotId;
    G.save.write();
    G.audio.place();
    return true;
  }
  function onSlot(slotId, editable) {
    if (!editable) return;
    const house = S().house;
    const there = Object.keys(house).find((k) => house[k] === slotId);
    if (sel && sel !== there) {
      if (place(sel, slotId)) sel = null;
      else {
        const w = want(D.items()[sel]);
        G.audio.tap();
        const nm = D.plainName(D.items()[sel].name);
        G.ui.toast(KIND_NAME[w] ? nm + G.util.josa(nm, '은/는') + ' ' + KIND_NAME[w] + ' 칸에만 놓을 수 있어요.' : '그 칸에는 놓을 수 없어요.');
      }
    }
    else if (there && sel === there) sel = null;      // 같은 것을 다시 누르면 내려놓기 취소
    else if (there) { sel = there; G.audio.tap(); } // 놓인 물건을 집어 든다(옮기기)
    H.refresh();
  }
  function unplace() {
    if (!sel) return;
    delete S().house[sel];
    sel = null;
    G.save.write();
    G.audio.tap();
    H.refresh();
  }

  // 물건 그림(없으면 이름 첫 글자로 만든 임시 칸). size: 목표 크기(CSS px, 정수배로 맞춤) 또는 'house'(집 그림과 같은 배율)
  H.icon = function (it, size) {
    const nm = D.plainName(it.name).replace(/^\(임시\)\s*/, '');
    const g = h('span.item-ico' + (size === 'house' ? '.in-house' : ''), h('span.glyph', nm.slice(0, 1) || '物'));
    const img = G.util.pixImg('assets/items/' + (it.img || it.id) + '.webp', size === 'house' ? { fit: false, cls: 'item-pix' } : { size: size || 32, cls: 'item-pix' });
    img.addEventListener('load', () => {
      g.classList.add('has-img');
      if (size !== 'house') return;
      const art = img.closest('.house-art');
      const s = art && parseFloat(art.style.getPropertyValue('--px'));
      if (s) { img.style.width = img.naturalWidth * s + 'px'; img.style.height = img.naturalHeight * s + 'px'; }
    });
    g.appendChild(img);
    return g;
  };

  // 집 한 채 그리기. opt: { editable(기본: 깨어나기 전), fiction(게임 설정 카드), mini }
  H.view = function (opt = {}) {
    H.settle();
    const k = H.stageIndex();
    const st = H.stages()[k];
    const editable = opt.editable != null ? opt.editable : !S().awake;
    const v = h('div.house-view' + (opt.mini ? '.mini' : ''), { dataset: { stage: st ? st.id : '', opts: JSON.stringify({ editable: opt.editable, mini: !!opt.mini }) } });
    if (!st) { v.appendChild(h('p.small.muted', '아직 집이 없어요. 꿈속 말판을 따라가면 집이 생겨요.')); return v; }
    v.classList.add('stage-' + Math.min(k, 3));
    const fic = (G.data.house || {}).fiction;
    v.appendChild(h('div.house-head', h('span.tag.fic', '게임 설정'), h('h4', st.name), h('span.small.muted', '집 꾸미기 · 채점하지 않아요')));
    if (opt.fiction && fic) v.appendChild(T.mark(Object.assign({ mark: 'fiction' }, fic)));
    const art = h('div.house-art', { role: 'group', 'aria-label': st.name + ' 안' },
      h('div.deco', { 'aria-hidden': 'true' }, h('i.roof'), h('i.ridge'), h('i.wall'), h('i.pillars'), h('i.floor'), h('i.orn.o1'), h('i.orn.o2'), h('i.cloud')));
    const img = G.util.pixImg('assets/house/' + (st.img || st.id) + '.webp', { fit: false, cls: 'house-img' });
    img.addEventListener('load', () => { art.classList.add('has-img'); fitHouse(art); });
    art.appendChild(img);
    const items = D.items();
    const house = S().house;
    for (const sl of H.slotsOf(st)) {
      const it = Object.keys(house).find((x) => house[x] === sl.id);
      const nofit = editable && sel && sel !== it && !H.fits(sel, sl);
      const b = h('button.hslot' + (it ? '.full' : '') + (it && it === sel ? '.sel' : '') + (nofit ? '.nofit' : ''), {
        type: 'button', dataset: { slot: sl.id, kind: kindOf(sl) }, disabled: !editable,
        style: { left: sl.x + '%', top: sl.y + '%', width: (sl.w || 16) + '%' },
        'aria-label': (it ? D.plainName(items[it].name) + G.util.josa(D.plainName(items[it].name), '이/가') + ' 놓인 칸' : '빈칸') + (KIND_NAME[kindOf(sl)] ? ' · ' + KIND_NAME[kindOf(sl)] : '') + (nofit ? ' · 고른 물건은 놓을 수 없어요' : ''),
      });
      if (it && items[it]) b.appendChild(h('span.placed', { dataset: { item: it } }, H.icon(items[it], 'house')));
      b.addEventListener('click', () => onSlot(sl.id, editable));
      art.appendChild(b);
    }
    v.appendChild(h('div.house-stage', art));
    if (img.complete && img.naturalWidth) requestAnimationFrame(() => fitHouse(art));
    // 보따리(아직 놓지 않은 물건)
    if (editable) {
      const loose = owned().filter((id) => !house[id]);
      const bundle = h('div.bundle', { role: 'group', 'aria-label': '보따리' }, h('span.bundle-label', '보따리'));
      if (!loose.length) bundle.appendChild(h('span.small.muted', owned().length ? '모두 집에 놓았어요' : '아직 얻은 물건이 없어요'));
      for (const id of loose) {
        const b = h('button.bitem' + (sel === id ? '.sel' : ''), { type: 'button', dataset: { item: id }, 'aria-pressed': String(sel === id) }, H.icon(items[id]), h('span.bnm', D.plainName(items[id].name)));
        b.addEventListener('click', () => { sel = id; G.audio.tap(); H.refresh(); });
        bundle.appendChild(b);
      }
      v.appendChild(bundle);
      const hint = sel ? (house[sel] ? '옮길 칸을 누르세요. 보따리로 되돌릴 수도 있어요.' : '놓을 칸을 누르세요.') : '물건을 누른 뒤 집 안의 칸을 누르면 놓여요. 놓인 물건을 누르면 옮길 수 있어요.';
      v.appendChild(h('div.house-hint', h('span.small', hint),
        sel && house[sel] ? h('button.btn.small', { type: 'button', dataset: { house: 'unplace' }, on: { click: unplace } }, '보따리로') : null));
    }
    return v;
  };
  // 집 그림을 기기 픽셀 기준 정수배로. 배율은 첫 단계(가장 좁은 집)가 틀에 들어가는 값으로 모든 단계에 같게 쓴다
  // (뒤 단계일수록 집이 넓어지고, 틀보다 넓으면 좌우로 끌어 본다). 놓인 물건 그림(32×32)도 같은 배율
  function fitHouse(art) {
    const img = art.querySelector('.house-img');
    const stage = art.parentElement;
    if (!img || !img.naturalWidth || !stage || !art.isConnected) return;
    const first = (H.stages()[0] || {}).size || [img.naturalWidth, img.naturalHeight];
    const mini = !!art.closest('.house-view.mini');
    const avail = Math.min(stage.clientWidth || first[0], mini ? 360 : 99999);
    const s = G.util.pixScale(first[0], avail);
    art.style.setProperty('--px', s);
    art.style.width = img.naturalWidth * s + 'px';
    art.style.height = img.naturalHeight * s + 'px';
    art.querySelectorAll('.hslot .item-pix').forEach((p) => { if (p.naturalWidth) { p.style.width = p.naturalWidth * s + 'px'; p.style.height = p.naturalHeight * s + 'px'; } });
  }
  H.fitAll = () => G.util.$$('.house-art.has-img').forEach(fitHouse);
  let fitT = null;
  window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(H.fitAll, 90); });

  // 화면에 있는 모든 집을 다시 그린다(같은 상태를 보여 주도록). 포커스는 같은 칸·물건으로 돌려준다
  H.refresh = function () {
    const a = document.activeElement;
    const key = a && a.dataset ? (a.dataset.slot ? '[data-slot="' + a.dataset.slot + '"]' : a.dataset.item && a.classList.contains('bitem') ? '.bitem[data-item="' + a.dataset.item + '"]' : null) : null;
    G.util.$$('.house-view').forEach((el) => {
      let o = {};
      try { o = JSON.parse(el.dataset.opts || '{}'); } catch (e) { /* 무시 */ }
      const keepFic = !!el.querySelector('.mark.fiction');
      const nv = H.view(o);
      if (keepFic) { const f = el.querySelector('.mark.fiction'); const head = nv.querySelector('.house-head'); if (f && head) head.after(f); }
      el.replaceWith(nv);
    });
    if (key) { const t = document.querySelector('.house-view ' + key) || document.querySelector('.house-view .hslot'); if (t) t.focus({ preventScroll: true }); }
  };

  // 장면에 들어설 때: 집 단계가 오르면 알린다
  G.app.on('scene', (ctx) => {
    if (ctx.revisit || S().awake) return;
    const k = H.stageIndex();
    if (k < 0) return;
    const was = S().houseStage == null ? -1 : S().houseStage;
    if (k > was) {
      S().houseStage = k;
      H.settle();
      G.save.write();
      G.ui.toast(was < 0 ? '양소유의 집이 생겼어요 · ' + H.stages()[k].name : '집이 넓어졌어요 · ' + H.stages()[k].name);
    }
  });
  G.app.on('reset', () => { sel = null; });

  // 집에 놓을 물건(장면 걸음 'item'을 바꿔 끼운다): 얻은 물건을 보여 주고 그 자리에서 집에 놓게 한다
  G.app.steps.item = async function (ctx, sc) {
    const it = sc.item;
    if (!it) return;
    ctx.step('item');
    const s = ctx.section('item');
    s.appendChild(h('div.item-card', H.icon(it, 64),
      h('div', h('span.act-kind', '얻은 물건'), h('h3', it.name), it.desc ? h('p', T.inline(it.desc)) : null)));
    if (!ctx.readonly) { S().items[it.id] = { scene: sc.id }; G.save.write(); }
    if (D.alive() && !S().awake && H.stage() && S().items[it.id]) {
      if (!S().house[it.id]) sel = it.id;
      s.appendChild(h('p.small.muted.house-lead', '집 안 아무 칸에나 놓아 보세요. 나중에 위 막대의 꿈 보따리에서 옮길 수 있어요. 채점하지 않아요.'));
      s.appendChild(H.view({ fiction: true }));
    }
    await ctx.next('챙기기 ▶');
    sel = null;
  };
})();
