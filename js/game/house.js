'use strict';
// 집 단계는 이야기 진행으로, 장식은 받은 물건 순서로 계산한다. 배치 상태를 저장하지 않는다.
(function () {
  const { h } = G.util;
  const D = G.dream;
  const S = () => G.save.state;
  const H = (G.house = {});
  H.stages = () => G.data.house?.stages || [];
  H.stageIndex = () => H.stages().reduce((found, stage, i) => !stage.from || D.reached(stage.from) ? i : found, -1);
  H.stage = () => H.stages()[H.stageIndex()] || null;
  H.slotsOf = (stage) => stage?.slots || [];
  H.icon = (item, size = 48) => item.img ? G.util.pixImg('assets/items/' + item.img + '.webp', { size: typeof size === 'number' ? size : 32, cls: 'item-icon' }) : h('span.item-placeholder', '物');
  H.view = function (opt = {}) {
    const stage = H.stage();
    const box = h('div.house-view' + (opt.mini ? '.mini' : ''), { dataset: { stage: stage?.id || '', decor: Math.min(3, Math.floor(S().res.wealth / 30)), mini: opt.mini ? '1' : '' } });
    if (!D.alive()) { box.append(h('p', '꿈의 집은 사라졌어요.')); return box; }
    box.append(h('h3', stage?.name || '아직 집이 없어요'));
    if (!stage) return box;
    const owned = S().items.map((id) => D.items()[id]).filter(Boolean);
    const slots = H.slotsOf(stage), used = new Set();
    const picture = stage.img ? D.picture('assets/house/' + stage.img + '.webp', 'auto-house') : null;
    if (picture) {
      const decor = Number(box.dataset.decor);
      for (let i = 0; i < decor * 2; i++) picture.box.append(h('i.house-sprig', { 'aria-hidden': 'true', style: { left: (8 + i * 15) + '%' } }));
      box.append(picture.frame);
    }
    const keep = h('div.house-keeps');
    for (const item of owned) {
      const slot = slots.find((s) => !used.has(s.id) && (!item.slot || item.slot === 'any' || !s.kind || s.kind === item.slot));
      if (slot) used.add(slot.id);
      if (picture && slot) {
        const ornament = h('span.house-ornament', { title: item.name, style: { left: slot.x + '%', top: slot.y + '%' } });
        if (item.img) ornament.append(D.overlay('assets/items/' + item.img + '.webp', 'ornament-img'));
        else ornament.append(h('span.item-placeholder', '物'));
        picture.box.append(ornament);
      }
      keep.append(h('div.house-owned', { dataset: { item: item.id } }, H.icon(item), h('span', item.name)));
    }
    box.append(keep);
    const fiction = G.data.house?.fiction;
    if (fiction && !S().seenFiction[fiction.id]) box.append(G.text.block({ ...fiction, mark: 'fiction' }, { peek: !!G.app.current()?.revisit }));
    return box;
  };
  H.refresh = () => document.querySelectorAll('.house-view').forEach((box) => box.replaceWith(H.view({ mini: box.dataset.mini === '1' })));
})();
