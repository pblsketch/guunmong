'use strict';
// 꿈 보따리: 위 막대의 단추 하나로 말판·집·인연첩·소원 목록·구슬을 펼쳐 보는 판(휴대폰 위 막대가 좁아 하나로 묶었다).
//  - 깨어나기 전: 말판, 집, 인연첩, 소원, 구슬
//  - 깨어난 뒤: 소원과 구슬만 남는다(말판·집·벼슬·인연첩은 사라짐). 선생님용만 모두 다시 본다.
//  - G.dream.can(tab) / G.dream.open(tab): 다른 화면이나 점검이 쓰는 문. 열 수 없으면 false
//  - 인연첩: 처음 만난 장면에서 생긴 카드(이름·신분·능력과 사연·만난 곳)와 다시 만나 덧붙은 사연. 수를 세지 않는다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const ui = G.ui;

  ui.ICON.bag = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>';
  ui.ICON.scroll = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18H6z"/><path d="M4 3h16M4 21h16M9 8h6M9 12h6M9 16h4"/></svg>';

  const TABS = { board: '말판', house: '집', bonds: '인연첩', wishes: '소원', pearls: '구슬' };
  D.tabs = () => (D.alive() ? ['board', 'house', 'bonds', 'wishes', 'pearls'] : ['wishes', 'pearls']);
  D.can = (tab) => D.tabs().includes(tab);
  const label = () => (D.alive() ? '꿈 보따리(말판·집·인연첩·소원)' : '남은 것(소원 목록과 구슬)');

  G.app.bondCard = function (b, more) {
    const person = G.data.people?.[b.face || b.id];
    return h('div.bond-card', { dataset: { bond: b.id } },
      b.face || (person && !person.noFace) ? h('div.bond-face', G.util.pixImg(T.face(b.face || b.id), { size: 48 })) : null,
      h('div', h('span.act-kind', '인연첩'), h('h3', b.name),
        b.status ? h('div.small', b.status) : null,
        b.ability ? h('p', T.inline(b.ability)) : null,
        b.story ? h('p', T.inline(b.story)) : null,
        more ? h('p.more', T.inline(more)) : null,
        b.place ? h('div.small.muted', '만난 곳 · ' + b.place) : null));
  };
  // 인연첩
  D.bondPanel = function () {
    const box = h('div.bond-list');
    const met = (G.data.bonds || []).filter((b) => S().bonds.includes(b.id));
    if (!met.length) box.appendChild(h('p.small.muted', '아직 인연첩이 비어 있어요.'));
    for (const b of met) {
      const card = G.app.bondCard(b);
      const body = card.lastElementChild;
      // 다시 만난 장면마다 덧붙은 사연(한 장면이 여러 사람의 카드에 사연을 덧붙일 수 있다)
      for (const s of G.app.list()) {
        if (!S().done[s.id]) continue;
        for (const r of G.app.remeets(s)) if (r.bond === b.id && r.story) body.appendChild(h('p.more', h('b', '다시 만남 '), T.inline(r.story)));
      }
      box.appendChild(card);
    }
    box.appendChild(h('p.small.muted', '인연은 소원 목록을 채우지 않아요.'));
    return box;
  };

  function pane(tab) {
    if (!D.can(tab)) return null;
    if (tab === 'board') return G.board.view();
    if (tab === 'house') return G.house.view();
    if (tab === 'bonds') return D.bondPanel();
    if (tab === 'wishes') return D.wishList({ detail: true });
    return D.pearlKeep();
  }

  const openBags = new Map();
  D.open = function (tab) {
    if (tab && !D.can(tab)) { ui.toast(S().awake ? '꿈에서 깨어나 말판과 집은 사라졌어요.' : '아직 볼 수 없어요.'); return false; }
    let curTab = tab || D.tabs()[0], box;
    ui.sheet(() => {
      const body = h('div.bag-body');
      const bar = h('div.bag-tabs', { role: 'tablist' });
      const title = h('h3');
      const draw = () => {
        if (!D.can(curTab)) curTab = D.tabs()[0];
        title.textContent = label();
        bar.replaceChildren(...D.tabs().map((t) => h('button.bag-tab', { type: 'button', role: 'tab', dataset: { tab: t }, on: { click: () => {
          if (!box.isConnected || !D.can(t)) return;
          G.audio.tap(); curTab = t; draw();
        } } }, TABS[t])));
        bar.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === curTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
        body.replaceChildren(pane(curTab));
      };
      box = h('div.bag', title, bar, body);
      openBags.set(box, draw);
      draw();
      return box;
    }, [{ label: '닫기', value: null, cls: 'primary' }], { cls: 'bag-sheet' }).then(() => openBags.delete(box));
    return true;
  };

  // 위 막대 단추: 2장(꿈)부터 끝까지. 깨어난 뒤에는 '남은 것'만 보인다
  G.app.toolbar.push({
    id: 'keep', icon: 'bag',
    get label() { return label(); },
    when: () => (S().reach || 0) >= 2 && !!S().awake,
    click: () => D.open(),
  });
  function refresh() {
    for (const [box, draw] of openBags) {
      if (box.isConnected) draw(); else openBags.delete(box);
    }
    G.util.$$('[data-tool="keep"]').forEach((b) => {
      b.setAttribute('aria-label', label()); b.title = label();
      b.innerHTML = ui.ICON[D.alive() ? 'bag' : 'scroll'];
    });
  }
  G.app.on('wake', refresh);
  G.app.on('settings', refresh);
  G.app.on('scene', refresh);
})();
