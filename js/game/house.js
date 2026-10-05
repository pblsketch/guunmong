'use strict';
// 생활 공간은 원작의 신분 변화에 따라 이야기 순서로만 바뀐다.
(function () {
  const { h } = G.util;
  const D = G.dream;
  const S = () => G.save.state;
  const H = (G.house = {});
  H.stages = () => G.data.house?.stages || [];
  H.stageIndex = () => {
    const facts = new Set(G.experience.facts(S(), G.data));
    return H.stages().reduce((found, stage, i) => {
      const reached = stage.fromStory
        ? facts.has(stage.fromStory)
        : !stage.from || D.reached(stage.from);
      return reached ? i : found;
    }, -1);
  };
  H.stage = () => H.stages()[H.stageIndex()] || null;
  H.view = function (opt = {}) {
    const stage = H.stage();
    const box = h('div.house-view' + (opt.mini ? '.mini' : ''), { dataset: { stage: stage?.id || '', mini: opt.mini ? '1' : '' } });
    if (!D.alive()) { box.append(h('p', '꿈의 집은 사라졌어요.')); return box; }
    box.append(h('h3', stage?.name || '아직 집이 없어요'));
    if (!stage) return box;
    const picture = stage.img ? D.picture('assets/house/' + stage.img + '.webp', 'auto-house') : null;
    if (picture) box.append(picture.frame);
    if (stage.story) box.append(h('p.small', stage.story));
    const fiction = G.data.house?.fiction;
    if (fiction && !S().seenFiction[fiction.id]) box.append(G.text.block({ ...fiction, mark: 'fiction' }, { run: opt.run, readonly: opt.readonly }));
    return box;
  };
  H.refresh = () => document.querySelectorAll('.house-view').forEach((box) => box.replaceWith(H.view({ mini: box.dataset.mini === '1' })));
})();
