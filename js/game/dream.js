'use strict';
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = (G.dream = G.dream || {});
  const list = () => G.app.list();
  const sceneIndex = id => list().findIndex(scene => scene.id === id);

  D.alive = () => !S().awake || !!S().teacher;
  D.reached = function (id) {
    const index = sceneIndex(id);
    if (index < 0) return false;
    if (S().awake || S().done[id]) return true;
    const current = G.app.current();
    const here = sceneIndex(current && !current.revisit ? current.scene : S().pos);
    return here >= index;
  };
  D.plainName = value => T.plain(value || '');
  D.items = function () {
    const result = {};
    for (const scene of list()) {
      for (const item of [...(scene.items || []), ...(scene.bonus?.items || [])]) result[item.id] = { scene: scene.id, ...item };
    }
    return result;
  };
  D.sourceName = function (id) {
    const storyNames = {
      'e08-wonsu:appointment': '정서대원수 임명',
      'e11-seungsang:appointment': '대승상 임명',
      'e11-seungsang:portrait': '기린각 초상',
    };
    if (storyNames[id]) return storyNames[id];
    const item = D.items()[id];
    if (item) return item.name;
    const scene = list().find(value => value.id === id);
    return scene ? scene.title || '원작의 사건' : '원작의 사건';
  };

  function fitTo(img, frame) {
    if (!img.naturalWidth) return;
    if (!frame.isConnected) { requestAnimationFrame(() => frame.isConnected && fitTo(img, frame)); return; }
    const style = getComputedStyle(frame), parent = frame.parentElement, parentStyle = getComputedStyle(parent);
    const edge = parseFloat(style.borderLeftWidth || 0) + parseFloat(style.borderRightWidth || 0) + parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
    const available = parent.clientWidth - parseFloat(parentStyle.paddingLeft || 0) - parseFloat(parentStyle.paddingRight || 0) - edge || img.naturalWidth;
    const scale = G.util.pixScale(img.naturalWidth, available);
    img.style.width = img.naturalWidth * scale + 'px';
    img.style.height = img.naturalHeight * scale + 'px';
    img.style.maxWidth = 'none';
    frame.style.setProperty('--px', scale);
    frame.querySelectorAll('img.pix-ovl').forEach(overlay => sizeOverlay(overlay, scale));
  }
  function sizeOverlay(overlay, scale) {
    if (!overlay.naturalWidth || !scale) return;
    overlay.style.width = overlay.naturalWidth * scale + 'px';
    overlay.style.height = overlay.naturalHeight * scale + 'px';
  }
  D.picture = function (src, cls) {
    const img = G.util.pixImg(src, { fit: false });
    const box = h('div.pic-box.ph', img);
    const frame = h('div.pic-frame' + (cls ? '.' + cls.split(' ').join('.') : ''), box);
    img.addEventListener('load', () => { box.classList.remove('ph'); fitTo(img, frame); });
    img.addEventListener('error', () => box.classList.add('ph'));
    return { frame, box, img };
  };
  D.overlay = function (src, cls) {
    const overlay = G.util.pixImg(src, { fit: false, cls: 'pix-ovl' + (cls ? ' ' + cls : '') });
    overlay.addEventListener('load', () => { const frame = overlay.closest('.pic-frame'); if (frame) sizeOverlay(overlay, Number(frame.style.getPropertyValue('--px')) || 0); });
    return overlay;
  };
  D.fitAll = function () {
    G.util.$$('.pic-frame').forEach(frame => { const img = frame.querySelector('.pic-box:not(.ph) > img'); if (img) fitTo(img, frame); });
  };
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(D.fitAll, 90); });

  D.wishList = function (options = {}) {
    const box = h('div.wish-list', { role: 'group', 'aria-label': '성진의 소원 목록', dataset: { detail: options.detail ? '1' : '' } });
    box.appendChild(h('div.wl-head', h('span.tag.fic', '게임 설정'), h('h4', '성진의 소원')));
    const ul = h('ul');
    for (const wish of G.app.wishes()) {
      const definition = (G.data.wishes || []).find(value => value.id === wish.id) || {};
      const row = h('li.wish' + (wish.filled ? '.filled' : '') + (wish.half ? '.half' : '') + (wish.hidden ? '.hidden' : ''), { dataset: { wish: wish.id } },
        h('span.nm', wish.name), !wish.hidden && definition.hanja ? h('span.hanja', definition.hanja) : null,
        wish.filled ? h('span.stamp', { 'aria-label': '채워짐' }, '滿') : wish.half ? h('span.stamp.half', { 'aria-label': '반쯤 채워짐' }, '半') : null);
      if (!wish.hidden && wish.parts?.length) row.appendChild(h('span.wbar.parts', { 'aria-hidden': 'true' }, wish.parts.map(part => h('span.cell.part' + (part.filled ? '.on' : ''), { dataset: { part: part.id } }, part.name))));
      if (options.detail && wish.sources?.length) row.appendChild(h('div.src', wish.sources.map(D.sourceName).join(' · ')));
      if (options.detail && wish.hidden) row.appendChild(h('div.src', '꿈 일지에서만 드러나요'));
      ul.appendChild(row);
    }
    box.appendChild(ul);
    return box;
  };
  D.refreshWishes = () => G.util.$$('.wish-list').forEach(element => element.replaceWith(D.wishList({ detail: element.dataset.detail === '1' })));
  D.pearlScenes = () => list().filter(scene => scene.pearl && scene.meet);
  D.bead = function (found) {
    const bead = h('span.bead' + (found ? '.found' : '.missed'));
    const img = G.util.pixImg('assets/ui/' + (found ? 'pearl' : 'pearl_empty') + '.webp', { size: 24, cls: 'bead-img' });
    img.addEventListener('load', () => bead.classList.add('has-img'));
    bead.appendChild(img);
    return bead;
  };
  D.pearlKeep = function () {
    return h('div.pearl-keep', { role: 'group', 'aria-label': '구슬' }, h('h4', '구슬'), h('div.beads', D.pearlScenes().map(scene => {
      const bead = D.bead(!!S().pearls[scene.meet]); bead.dataset.bond = scene.meet; bead.setAttribute('aria-label', S().pearls[scene.meet] ? '찾은 구슬' : '찾지 못한 구슬'); return bead;
    })), h('p.small.muted', '구슬 찾기는 선택이며 점수로 세지 않아요.'));
  };
})();
