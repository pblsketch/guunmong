'use strict';
// 승경도 말판(명세 4.2)과 그 옆에 걸린 성진의 소원 목록(5.1), 그리고 꿈 화면들이 같이 쓰는 도구(G.dream).
//  - 칸은 양소유가 원작에서 실제로 거친 벼슬·장소뿐이다. 떨어지는 칸도, 윤목 굴리기도 없다.
//  - 2장 첫머리에 말이 출발 칸(start, 수주현)에 섰다가 첫 칸으로 걸어간다(G.app.hook('chapter')).
//    장면을 마치면 말이 원작 순서대로 다음 칸으로 걸어간다(G.app.hook('between')). 다시 읽기에서는 걷지 않는다.
//  - 벼슬 칸(office)에 들어서면 교지 카드(assets/ui/gyoji.webp)에 벼슬 이름과 채워질 소원을 보인다.
//    칸에 회목(heading)이 있으면 회목 카드도 보인다(대조 대기라 풀이만, 原文 낙관 없음).
//  - 움직이는 그림은 이 말뿐이다. 말 그림(assets/board/horse_walk.webp)은 32×32 칸 6열 × 4줄(192×128)이고
//    발밑 기준점은 칸의 (16, 30)이다. 줄: 0 서 있기(2칸, 400ms) · 1 오른쪽 걷기(4칸, 120ms) · 2 오른쪽 뛰기(6칸, 80ms) · 3 위로 걷기(4칸, 120ms).
//    왼쪽으로 갈 때는 좌우를 뒤집는다. 장소 칸으로는 걷고, 벼슬 칸으로는 뛰고, 윗줄로 오를 때는 위로 걷는다.
//  - 말의 옷: 칸의 outfit('gwan' 관복·'jang' 갑옷·'sang' 승상)에 도착하면 horse_walk_<outfit>.webp로 바뀐다.
//    옷 그림이 없으면 기본 말 그림, 그것도 없으면 CSS로 그린 임시 말을 쓴다. 그림은 기기 픽셀 기준 정수배로만 키운다.
//  - 소원 목록: 출장입상·부귀·공명은 벼슬·재물·명예로, 풍류는 음악·악기로 채워진다. 인연은 어떤 소원도 채우지 않는다.
//    미색(dreamHidden)은 꿈 내내 '?'이고, 꿈 일지에서 성진의 마음과 인연을 잇는 순간에만 드러난다(G.app.wishes()).
//    칸이 나뉜 소원(출장입상: 장수·재상)은 한 칸만 차면 반, 둘 다 차면 가득 찬다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = (G.dream = G.dream || {});
  const B = (G.board = {});

  // ───────── 꿈 화면들이 같이 쓰는 것
  const L = () => G.app.list();
  const sIdx = (id) => L().findIndex((s) => s.id === id);
  // 꿈에서 쌓은 것(말판·집·벼슬·인연첩)을 볼 수 있는가: 깨어나기 전, 또는 선생님용
  D.alive = () => !S().awake || !!S().teacher;
  // 그 장면에 이미 들어섰는가(마쳤거나 지금 자리이거나 그 앞). 깨어난 뒤에는 꿈 전체를 지나온 것으로 본다
  D.reached = function (id) {
    const i = sIdx(id);
    if (i < 0) return false;
    if (S().awake || S().done[id]) return true;
    const p = sIdx(S().pos);
    return p >= 0 && i <= p;
  };
  D.plainName = (s) => T.plain(s || '');
  D.items = function () {
    const out = {};
    for (const s of L()) if (s.item && s.item.id) out[s.item.id] = Object.assign({ scene: s.id }, s.item);
    return out;
  };
  // 소원을 채운 것의 이름(말판 칸·물건·장면)
  D.sourceName = function (id) {
    const q = (G.data.board || []).find((x) => x.id === id);
    if (q) return q.name;
    const it = D.items()[id];
    if (it) return it.name;
    const s = L().find((x) => x.id === id);
    return s ? s.title || id : id;
  };

  // 도트 그림 한 장(장면·선방·집 그림 등). 그림이 없으면 같은 자리에 임시 바탕(.ph)을 둔다.
  // 그림이 있으면 틀 너비에 맞춰 기기 픽셀 기준 정수배로만 키운다. 위에 얹는 것(구슬 자리, 집 칸)은 box에 넣는다(백분율 위치).
  // 위에 얹는 도트 그림(img.pix-ovl, 예: 구슬의 반짝임)도 같은 배율로 키운다.
  D.picture = function (src, cls) {
    const img = G.util.pixImg(src, { fit: false });
    const box = h('div.pic-box.ph', img);
    const frame = h('div.pic-frame' + (cls ? '.' + cls.split(' ').join('.') : ''), box);
    img.addEventListener('load', () => { box.classList.remove('ph'); fitTo(img, frame); });
    img.addEventListener('error', () => box.classList.add('ph'));
    return { frame, box, img };
  };
  function fitTo(img, frame) {
    if (!img.naturalWidth) return;
    if (!frame.isConnected) { requestAnimationFrame(() => { if (frame.isConnected) fitTo(img, frame); }); return; }
    // 틀은 그림에 꼭 맞게 줄어든다: 바깥(부모) 너비에서 틀 테두리를 뺀 만큼에 맞춘다
    const fs = getComputedStyle(frame), par = frame.parentElement, ps = getComputedStyle(par);
    const edge = parseFloat(fs.borderLeftWidth || 0) + parseFloat(fs.borderRightWidth || 0) + parseFloat(fs.paddingLeft || 0) + parseFloat(fs.paddingRight || 0);
    const avail = (par.clientWidth - parseFloat(ps.paddingLeft || 0) - parseFloat(ps.paddingRight || 0) - edge) || img.naturalWidth;
    const s = G.util.pixScale(img.naturalWidth, avail);
    img.style.width = img.naturalWidth * s + 'px';
    img.style.height = img.naturalHeight * s + 'px';
    img.style.maxWidth = 'none';
    frame.style.setProperty('--px', s);
    frame.querySelectorAll('img.pix-ovl').forEach((o) => sizeOvl(o, s));
  }
  function sizeOvl(o, s) {
    if (!o.naturalWidth || !s) return;
    o.style.width = o.naturalWidth * s + 'px';
    o.style.height = o.naturalHeight * s + 'px';
  }
  // 그림 위에 얹는 작은 도트 그림(그림과 같은 배율)
  D.overlay = function (src, cls) {
    const o = G.util.pixImg(src, { fit: false, cls: 'pix-ovl' + (cls ? ' ' + cls : '') });
    o.addEventListener('load', () => { const f = o.closest('.pic-frame'); if (f) sizeOvl(o, parseFloat(f.style.getPropertyValue('--px')) || 0); });
    return o;
  };
  D.fitAll = function () {
    G.util.$$('.pic-frame').forEach((f) => { const i = f.querySelector('.pic-box:not(.ph) > img'); if (i) fitTo(i, f); });
    G.util.$$('.board-art').forEach(fitBoard);
  };
  let fitTimer = null;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(D.fitAll, 90); });

  // ───────── 소원 목록(족자처럼 걸린 것). opt.detail이면 무엇으로 채워졌는지도 보인다
  //  막대 칸(size: 부귀 5·풍류 4·공명 4)은 채운 것의 수만큼 먹물이 찬다. 출장입상은 장수·재상 두 칸
  D.wishList = function (opt = {}) {
    const box = h('div.wish-list', { role: 'group', 'aria-label': '성진의 소원 목록', dataset: { detail: opt.detail ? '1' : '' } });
    box.appendChild(h('div.wl-head', h('span.tag.fic', '게임 설정'), h('h4', '성진의 소원')));
    const ul = h('ul');
    for (const w of G.app.wishes()) {
      const def = (G.data.wishes || []).find((x) => x.id === w.id) || {};
      const li = h('li.wish' + (w.filled ? '.filled' : '') + (w.half ? '.half' : '') + (w.hidden ? '.hidden' : ''), { dataset: { wish: w.id }, title: w.hidden ? '꿈 일지에서 드러나요' : '' },
        h('span.nm', w.name),
        !w.hidden && def.hanja ? h('span.hanja', def.hanja) : null,
        w.filled ? h('span.stamp', { 'aria-label': '채워짐' }, '滿') : w.half ? h('span.stamp.half', { 'aria-label': '반쯤 채워짐' }, '半') : null);
      if (!w.hidden) {
        if ((w.parts || []).length) {
          li.appendChild(h('span.wbar.parts', { 'aria-hidden': 'true' }, w.parts.map((p) => h('span.cell.part' + (p.filled ? '.on' : ''), { dataset: { part: p.id } }, p.name))));
        } else if (def.size) {
          const on = w.filled ? Math.max(1, Math.min(def.size, w.sources.length)) : 0;
          li.appendChild(h('span.wbar', { 'aria-hidden': 'true' }, Array.from({ length: def.size }, (_, i) => h('span.cell' + (i < on ? '.on' : '')))));
        }
      }
      if (opt.detail && w.sources.length) li.appendChild(h('div.src', w.sources.map(D.sourceName).join(' · ')));
      if (opt.detail && w.hidden) li.appendChild(h('div.src', '꿈 내내 비어 있어요'));
      ul.appendChild(li);
    }
    box.appendChild(ul);
    return box;
  };
  // 미색이 드러나는 순간처럼 소원 상태가 바뀌면 화면의 모든 소원 목록을 다시 그린다
  D.refreshWishes = function () {
    G.util.$$('.wish-list').forEach((el) => el.replaceWith(D.wishList({ detail: el.dataset.detail === '1' })));
  };

  // 구슬(찾은 것은 빛나고 못 찾은 것은 흐리다). 인연 이름은 쓰지 않는다
  D.pearlScenes = () => L().filter((s) => s.pearl && s.meet);
  // 구슬 하나(찾은 것 pearl.webp, 못 찾은 것 pearl_empty.webp, 16×16을 정수배로). 그림이 없으면 CSS 동그라미
  D.bead = function (found) {
    const b = h('span.bead' + (found ? '.found' : '.missed'));
    const img = G.util.pixImg('assets/ui/' + (found ? 'pearl' : 'pearl_empty') + '.webp', { size: 24, cls: 'bead-img' });
    img.addEventListener('load', () => b.classList.add('has-img'));
    b.appendChild(img);
    return b;
  };
  D.pearlKeep = function () {
    const ps = D.pearlScenes();
    return h('div.pearl-keep', { role: 'group', 'aria-label': '여덟 구슬' },
      h('h4', '구슬'),
      h('div.beads', ps.map((s) => {
        const f = !!S().pearls[s.meet];
        const b = D.bead(f);
        b.dataset.bond = s.meet;
        b.title = f ? '찾은 구슬' : '찾지 못한 구슬';
        b.setAttribute('aria-label', b.title);
        return b;
      })),
      h('p.small.muted', ps.some((s) => S().pearls[s.meet]) ? '찾은 구슬이 무엇이었는지는 꿈 일지에서 알게 돼요.' : '여인 장면의 그림에 구슬의 흔적이 숨어 있어요. 찾지 않아도 괜찮아요.'));
  };

  // ───────── 말판
  const squares = () => G.data.board || [];
  B.start = () => squares().find((q) => q.start) || null;
  // 지금 말이 있는 칸: 들어선 장면 가운데 가장 늦은 장면의 칸. 아직 없으면 출발 칸
  B.here = function () {
    let at = null;
    for (const s of L()) if (s.square && D.reached(s.id)) at = s.square;
    if (!at && B.start()) at = B.start().id;
    return at;
  };
  // 그 칸에서 말이 입은 옷: 그 칸까지 지나온 칸 가운데 마지막 outfit('' = 기본)
  B.outfitAt = function (id) {
    const Q = squares();
    const i = Q.findIndex((q) => q.id === id);
    let o = '';
    for (let k = 0; k <= i; k++) if (Q[k].outfit) o = Q[k].outfit;
    return o;
  };
  function posOf(q, i, n) {
    if (q.x != null && q.y != null) return { x: q.x, y: q.y };
    // 위치가 없으면 아래에서 위로 지그재그
    const cols = 3, r = Math.floor(i / cols), c = i % cols;
    const cc = r % 2 ? cols - 1 - c : c;
    const rows = Math.max(1, Math.ceil(n / cols));
    return { x: 18 + cc * 32, y: 88 - (rows > 1 ? (r * 76) / (rows - 1) : 0) };
  }

  // 말 그림(옷마다 한 장). 한 번만 알아본다. 옷 그림이 없으면 기본 그림, 그것도 없으면 false(임시 말)
  const COLS = 6, ROWS = 4;
  const MOTION = { idle: { row: 0, n: 2, ms: 400 }, walk: { row: 1, n: 4, ms: 120 }, run: { row: 2, n: 6, ms: 80 }, up: { row: 3, n: 4, ms: 120 } };
  const sheets = {};
  function sheet(outfit) {
    const key = outfit || '';
    if (sheets[key]) return sheets[key];
    sheets[key] = new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ src: im.src, w: im.naturalWidth, h: im.naturalHeight, f: im.naturalWidth / COLS });
      im.onerror = () => res(key ? sheet('') : false);
      im.src = 'assets/board/horse_walk' + (key ? '_' + key : '') + '.webp';
    });
    return sheets[key];
  }
  sheet('');
  // 말 한 마리 꾸미기: 옷 그림과 동작(idle·walk·run·up), 왼쪽이면 뒤집기
  function dressPiece(p, outfit) {
    p.dataset.outfit = outfit || '';
    p.className = p.className.replace(/\boutfit-\w+/g, '').trim();
    if (outfit) p.classList.add('outfit-' + outfit);
    return sheet(outfit).then((sh) => {
      if (p.dataset.outfit !== (outfit || '')) return;
      if (!sh) { p.classList.add('ph'); p.classList.remove('sprite'); p.style.backgroundImage = ''; return; }
      p.classList.remove('ph');
      p.classList.add('sprite');
      p.style.backgroundImage = `url("${sh.src}")`;
      p._sheet = sh;
      scalePiece(p);
    });
  }
  // 말판 그림과 같은 배율(말판이 1배면 말도 1배)
  function scalePiece(p) {
    const sh = p._sheet;
    if (!sh) return;
    const art = p.closest('.board-art');
    const s = (art && parseFloat(art.style.getPropertyValue('--px'))) || G.util.pixNear(sh.f, 40);
    p.style.setProperty('--f', sh.f * s + 'px');
    p.style.setProperty('--fx', 16 * s + 'px');
    p.style.setProperty('--fy', 30 * s + 'px');
    p.style.backgroundSize = `${sh.w * s}px ${sh.h * s}px`;
    setMotion(p, p.dataset.motion || 'idle');
  }
  function setMotion(p, m) {
    const mo = MOTION[m] || MOTION.idle;
    p.dataset.motion = m;
    p.style.setProperty('--row', mo.row);
    p.style.setProperty('--n', mo.n);
    p.style.setProperty('--dur', mo.n * mo.ms + 'ms');
  }

  // 말판 그림을 기기 픽셀 기준 정수배로(너비와 화면 높이 안에서). 그림이 없으면 CSS 바탕 그대로
  function fitBoard(art) {
    const img = art.querySelector('.board-img');
    if (!img || !img.naturalWidth || !art.isConnected) return;
    const wrap = art.parentElement;
    const mini = !!art.closest('.board-view.mini');
    const cs = getComputedStyle(wrap);
    const cols = cs.gridTemplateColumns.split(' ');
    let avail = cols.length > 1 ? parseFloat(cols[0]) : wrap.clientWidth;
    const maxH = mini ? 260 : Math.max(320, window.innerHeight * 0.68);
    avail = Math.min(avail || img.naturalWidth, (maxH * img.naturalWidth) / img.naturalHeight);
    const s = G.util.pixScale(img.naturalWidth, avail);
    art.style.setProperty('--px', s);
    art.style.width = img.naturalWidth * s + 'px';
    art.style.height = img.naturalHeight * s + 'px';
    art.classList.add('has-img');
    art.querySelectorAll('.piece').forEach(scalePiece);
  }

  // 말판 하나 그리기. opt: { at: 말이 있는 칸, from: 걸어 나설 칸, mini, wishes(기본 true) }
  B.view = function (opt = {}) {
    const Q = squares();
    const at = opt.from || opt.at || B.here();
    const atIdx = Q.findIndex((q) => q.id === at);
    const fic = ((G.data.chapters || {})['2'] || {}).fiction || {};
    const v = h('div.board-view' + (opt.mini ? '.mini' : ''), { dataset: { at: at || '' } });
    v.appendChild(h('div.board-frame-tag', h('span.tag.fic', '게임 설정'), h('b', fic.title ? T.plain(fic.title) : '승경도 말판')));
    const art = h('div.board-art', { role: 'img', 'aria-label': '승경도 말판' });
    const img = G.util.pixImg('assets/board/board.webp', { fit: false, cls: 'board-img' });
    img.addEventListener('load', () => fitBoard(art));
    art.appendChild(img);
    // 칸을 잇는 길
    const pts = Q.map((q, i) => posOf(q, i, Q.length));
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'board-path'); svg.setAttribute('aria-hidden', 'true');
    const pl = document.createElementNS(svgNS, 'polyline');
    pl.setAttribute('points', pts.map((p) => p.x + ',' + p.y).join(' '));
    svg.appendChild(pl);
    art.appendChild(svg);
    Q.forEach((q, i) => {
      const st = atIdx < 0 ? 'ahead' : i < atIdx ? 'passed' : i === atIdx ? 'here' : 'ahead';
      const kind = q.kind === 'office' ? 'office' : 'place';
      art.appendChild(h('div.sq.' + kind + '.' + st + (q.start ? '.start' : ''), { dataset: { sq: q.id, kind }, style: { left: pts[i].x + '%', top: pts[i].y + '%' } },
        h('span.sq-kind', q.start ? '출발' : kind === 'office' ? '벼슬' : '곳'), h('span.sq-name', String(q.name).replace(/·/g, '·​'))));
    });
    const piece = h('div.piece', { dataset: { at: at || '', from: opt.from || '', motion: 'idle' }, 'aria-hidden': 'true' }, h('i.ph-body'));
    if (atIdx >= 0) { piece.style.left = pts[atIdx].x + '%'; piece.style.top = pts[atIdx].y + '%'; } else piece.hidden = true;
    piece.classList.add('ph');
    dressPiece(piece, B.outfitAt(at));
    art.appendChild(piece);
    const wrap = h('div.board-wrap', art);
    if (opt.wishes !== false) wrap.appendChild(D.wishList());
    v.appendChild(wrap);
    if (!opt.mini) v.appendChild(h('p.board-real', h('b', '실제로는 → '), fic.real ? T.inline(fic.real) : '실제 승경도는 조선 양반집 아이들이 윤목을 굴려 벼슬 오르기를 겨루던 놀이예요. 이 말판은 양소유가 원작에서 실제로 거친 벼슬과 곳으로만 꾸몄고, 떨어지는 칸이 없어요.'));
    v._pts = pts;
    return v;
  };

  // 말을 한 칸씩 걸린다(지나는 칸마다 발소리). 장소 칸으로는 걷고 벼슬 칸으로는 뛰고, 윗줄로 오를 때는 위로 걷는다
  B.walk = async function (v, fromId, toId) {
    const Q = squares();
    const a = Q.findIndex((q) => q.id === fromId), b = Q.findIndex((q) => q.id === toId);
    const piece = v.querySelector('.piece');
    if (!piece || b < 0) return;
    await sheet(piece.dataset.outfit);
    const pts = v._pts;
    const dir = a < 0 || b >= a ? 1 : -1;
    let i = a < 0 ? b - 1 : a;
    piece.hidden = false;
    if (a < 0) { piece.style.left = '0%'; piece.style.top = '100%'; }
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    while (i !== b) {
      i += dir;
      const x0 = parseFloat(piece.style.left), y0 = parseFloat(piece.style.top);
      const up = pts[i].y < y0 - 1;
      setMotion(piece, up ? 'up' : Q[i].kind === 'office' ? 'run' : 'walk');
      piece.classList.add('walking');
      piece.classList.toggle('left', !up && pts[i].x < x0);
      piece.style.left = pts[i].x + '%';
      piece.style.top = pts[i].y + '%';
      G.audio.step();
      await G.util.wait(reduce ? 350 : Q[i].kind === 'office' ? 600 : 750);
      const el = v.querySelector(`.sq[data-sq="${Q[i].id}"]`);
      v.querySelectorAll('.sq.here').forEach((x) => { x.classList.remove('here'); x.classList.add('passed'); });
      if (el) { el.classList.remove('ahead'); el.classList.add('here'); }
      // 옷이 바뀌는 칸에 도착하면 그 자리에서 갈아입는다
      const o = B.outfitAt(Q[i].id);
      if (o !== piece.dataset.outfit) await dressPiece(piece, o);
    }
    piece.classList.remove('walking', 'left');
    setMotion(piece, 'idle');
    piece.dataset.at = toId;
    v.dataset.at = toId;
  };

  // 교지 카드(벼슬 칸 도착): 교지 두루마리 그림 위에 벼슬 이름, 아래에 이 벼슬로 채워질 소원(미색은 나오지 않는다)
  B.gyoji = function (q) {
    const names = [...new Set((q.fills || []).map(G.app.fillName).filter(Boolean))];
    const art = h('div.gyoji-art', G.util.pixImg('assets/ui/gyoji.webp', { size: 320, cls: 'gyoji-img' }), h('b.gyoji-name', q.name));
    return h('div.gyoji-card', { role: 'group', 'aria-label': '교지' },
      art,
      h('div.gyoji-text', h('span.tag', '교지'), ' ', h('b', q.name), ' 벼슬을 내린다',
        h('p.gyoji-fills', names.length ? '채워질 소원 · ' + names.join(' · ') : '이 벼슬로 채워질 소원은 없어요')));
  };

  // 말판 위 걷기 한 번(장면 사이 / 2장 첫머리 출발): 걷고 나면 칸 이름, 벼슬 칸이면 교지 카드, 회목이 있으면 회목 카드
  async function walkScreen(ctx, fromId, toId, lead) {
    ctx.main.replaceChildren();
    window.scrollTo(0, 0);
    ctx.step('walk');
    const s = ctx.section('walk-blk');
    const v = B.view({ from: fromId });
    const toQ = squares().find((q) => q.id === toId);
    const note = h('p.walk-note', { role: 'status', 'aria-live': 'polite' }, lead || '양소유의 말이 다음 칸으로 가요…');
    s.append(v, note);
    await G.util.wait(450);
    if (!ctx.alive()) return;
    await B.walk(v, fromId, toId);
    if (!ctx.alive()) return;
    note.replaceChildren('다음 칸 · ', h('b', toQ.name), toQ.kind === 'office' ? ' (벼슬)' : '');
    if (toQ.kind === 'office') { s.appendChild(B.gyoji(toQ)); G.audio.stamp(); }
    const hc = G.app.headingCard(toQ.heading);
    if (hc) s.appendChild(hc);
    await ctx.next('다음 칸으로 ▶');
  }

  // 장면을 마치고 다음 장면으로 갈 때: 두 장면 모두 말판 칸이 있으면 말이 걸어간다
  G.app.hook('between', async function (from, to, ctx) {
    if (!from.square || !to.square || from.square === to.square) return;
    if (!squares().some((q) => q.id === to.square)) return;
    await walkScreen(ctx, from.square, to.square);
  });
  // 2장 첫머리: 말이 출발 칸(수주현)에 섰다가 첫 장면의 칸으로 길을 떠난다
  G.app.hook('chapter', async function (ctx) {
    const st = B.start(), sc = ctx.scene;
    if (!st || ctx.revisit || !sc.square || sc.square === st.id) return;
    if (!squares().some((q) => q.id === sc.square)) return;
    await walkScreen(ctx, st.id, sc.square, '양소유가 ' + st.name + ' 집을 떠나 길에 올라요…');
    if (ctx.alive()) ctx.main.replaceChildren();
  });
})();
