'use strict';
// 월드 체험이 없는 옛 자료를 읽기 위한 화면. 현재 본편 사건과 이음은 world 화면을 쓴다.
(function () {
  const { h } = G.util;
  const E = (G.event = {});
  E.items = function (items) {
    return h('div.reward-items', (items || []).map(item => h('div.reward-item', { dataset: { item: item.id } },
      item.img ? G.util.pixImg('assets/items/' + item.img + '.webp', { size: 48 }) : h('span.item-placeholder', '物'),
      h('div', h('b', item.name), item.desc ? h('p.small', G.text.inline(item.desc)) : null))));
  };
  async function legacy(ctx, scene, label) {
    ctx.step('scene');
    await G.stage.play(ctx, scene);
    if (!ctx.alive()) return false;
    if (scene.items?.length) ctx.main.appendChild(E.items(scene.items));
    return ctx.next(label);
  }
  G.app.screens.event = (ctx, scene) => legacy(ctx, scene, '다음 사건으로 ▶');
  G.app.screens.link = (ctx, scene) => legacy(ctx, scene, '길 떠나기 ▶');
})();
