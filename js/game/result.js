'use strict';
// 결과(명세 7절): 꿈 일지 마지막 장 + 장부 + 오답 노트 + 생각 나눔 질문 + 작품 노트.
//  - 마지막 장: 이름(입력하지 않아도 됨, 이 브라우저에만 저장), 날짜, 고른 해석과 근거 구절, 고친 흔적.
//    이 장을 그림(PNG)으로 저장할 수 있다(캔버스에 직접 그려 내려받기. 아무 데도 보내지 않는다).
//  - 장부: 활동별 첫 시도 정확도와 도움 사용, 찾은 구슬 수. 감점도 점수도 없다. 인연은 세지 않는다.
//  - 사라진 집과 말판은 다시 보여 주지 않는다.
(function () {
  const { h } = G.util;
  const T = G.text;
  const S = () => G.save.state;
  const D = G.dream;
  const app = G.app;

  const dateOf = (t) => { const d = new Date(t || Date.now()); return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; };
  const plain = (s) => T.plain(s || '');

  // 마지막 장에 쓸 글(화면과 그림이 같은 글을 쓴다)
  app.lastPage = function () {
    const st = S(), it = st.interp || {};
    const I = G.data.interp || {};
    const fin = it.changed || it.first || null;
    const ev = (id) => app.interpEvidence ? app.interpEvidence(id) : {};
    const opt = (id) => (app.interpText ? app.interpText(id) : '');
    const lines = {
      name: st.name || '',
      date: dateOf(st.finishedAt),
      question: plain(I.question || '꿈속의 삶은 헛것일까요?'),
      interp: fin ? plain(opt(fin.option)) : '(고르지 않음)',
      evidence: fin ? plain(ev(fin.evidence).text) : '',
      trace: '',
      score: '꿈에서 쌓은 것 ' + st.best + ' → 깨고 남은 것 0',
      scoreNotice: '점수로 평가하지 않아요',
    };
    if (it.revised && it.first && it.changed) {
      // 조사는 해석 글(「」 안)의 마지막 글자로 고르고, 근거 구절은 뒤에 따로 적는다(두 꼴을 함께 찍지 않음)
      const was = '「' + plain(opt(it.first.option)) + '」';
      lines.trace = '처음에는 ' + was + G.util.josa(was, '을/를') + ' 골랐다가(근거: ' + plain(ev(it.first.evidence).text) + '), 대사의 말을 듣고 고쳤어요.';
    } else if (it.first) {
      lines.trace = '대사의 말을 들은 뒤에도 처음 고른 해석을 그대로 두었어요.';
    }
    return lines;
  };

  function pageEl() {
    const L = app.lastPage();
    const st = S();
    const nameIn = h('input.name-in', { type: 'text', name: 'student-name', maxlength: '20', autocomplete: 'off', placeholder: '이름(쓰지 않아도 돼요)', value: st.name || '', 'aria-label': '이름(선택)' });
    nameIn.addEventListener('input', () => { st.name = nameIn.value.trim().slice(0, 20); G.save.write(); });
    const it = st.interp || {};
    return h('div.journal-page', { role: 'region', 'aria-label': '꿈 일지 마지막 장' },
      h('div.jp-head', h('span.seal', '夢'), h('h2', '꿈 일지 마지막 장')),
      h('div.jp-meta', h('label', h('span', '이름 '), nameIn), h('span.jp-date', L.date)),
      h('div.jp-score', h('strong', L.score), h('p', L.scoreNotice)),
      h('div.jp-q', h('b', '물음 '), L.question),
      h('div.jp-block', h('h4', '나의 해석'), h('p.jp-interp', L.interp)),
      h('div.jp-block', h('h4', '근거 구절'), h('p.jp-ev', L.evidence || '—')),
      h('div.jp-block.jp-trace', h('h4', it.revised ? '고친 흔적' : '고친 흔적 없음'), h('p', L.trace || '—')),
      h('div.jp-keep', h('section', h('h4', '성진의 소원'), h('ul.result-wishes', app.wishes().map((w) => h('li', w.name)))), D.pearlKeep()),
      h('p.small.muted', '해석은 채점하지 않아요. 친구의 해석과 근거를 견주어 보세요.'));
  }

  function ledgerBox() {
    const rows = app.ledgerRows();
    const tried = rows.filter((r) => r.first != null);
    const firstOk = tried.filter((r) => r.first === true).length;
    const helped = rows.filter((r) => r.help).length;
    const ps = D.pearlScenes();
    const found = ps.filter((s) => S().pearls[s.meet]).length;
    return h('div.ledger-box',
      h('div.stats',
        h('div.stat', h('b', tried.length ? firstOk + ' / ' + tried.length : '—'), h('span', '첫 시도에 맞힌 활동')),
        h('div.stat', h('b', String(helped)), h('span', '도움 사용한 활동')),
        h('div.stat', h('b', '찾은 구슬 ' + found + ' / ' + ps.length), h('span', '점수로 치지 않아요'))),
      app.ledgerTable(),
      ((G.data.notes || {}).teacher || {}).ledger ? h('details.teacher-guide', { open: S().teacher },
        h('summary', '선생님께 · 장부 보는 법'), h('p', T.inline(G.data.notes.teacher.ledger)),
        G.data.notes.teacher.when ? h('p', T.inline(G.data.notes.teacher.when)) : null,
        G.data.notes.teacher.time ? h('p', T.inline(G.data.notes.teacher.time)) : null) : null);
  }

  app.screens.result = async function (ctx) {
    ctx.step('result');
    const st = S();
    if (!ctx.readonly && !st.finishedAt) { st.finishedAt = Date.now(); G.save.write(); }
    G.audio.fanfare();
    const s = ctx.section('result');
    s.appendChild(pageEl());
    s.appendChild(h('div.save-row',
      h('button.btn.primary', { type: 'button', dataset: { act: 'save-image' }, on: { click: () => app.saveImage() } }, '이 장을 그림으로 저장'),
      h('p.small.muted', '저장이 안 되는 기기에서는 화면을 캡처해 제출하세요.')));
    s.appendChild(ledgerBox());
    if (st.wrong.length) {
      s.appendChild(h('div.notes.wrong-notes', h('h3', '오답 노트'), h('ul', st.wrong.map((w) => {
        const t = app.activityTitles[w.act] || (app.list().find((x) => x.activity && x.activity.id === w.act) || {}).title || w.act;
        return h('li', h('b', plain(t)), ' — 고른 것: ' + plain(w.picked) + ' / 정답: ' + plain(w.answer), w.note ? h('div.small.muted', T.inline(w.note)) : null);
      }))));
    } else s.appendChild(h('div.notes.wrong-notes', h('h3', '오답 노트'), h('p.small', '틀린 칸이 없어요.')));
    const N = G.data.notes || {};
    const comparison = N.comparison;
    const comparisonScene = (G.data.scenes || []).find((scene) => scene.optional && scene.id === comparison?.scene);
    if (comparisonScene) {
      const reading = h('details.comparison-reading', h('summary', comparison.title), h('p', T.inline(comparison.lead)));
      let picture;
      for (const frame of comparisonScene.timeline || []) {
        if (frame.img && frame.img !== picture) {
          picture = frame.img;
          reading.append(h('div.scene-img', G.util.pixImg('assets/sc/' + picture + '.webp', { alt: comparisonScene.title })));
        }
        reading.append(T.blocks(frame.lines || []));
      }
      reading.append(h('p.comparison-question', T.inline(comparison.question)));
      reading.append(...(N.variants || []).filter((note) => note.comparison === comparison.scene).map((note) => T.block({ ...note, mark: 'variant' })));
      s.append(reading);
    }
    if ((N.discuss || []).length) s.appendChild(h('div.notes', h('h3', '생각 나눔 질문'), h('ol', N.discuss.map((q) => h('li', T.inline(q))))));
    if ((N.work || []).length) s.appendChild(h('div.notes', h('h3', '작품 노트'), N.work.map((w) => T.block(typeof w === 'string' ? { mark: 'note', body: w } : Object.assign({ mark: 'note' }, w)))));
    const variants = (N.variants || []).filter((note) => !note.comparison);
    if (variants.length) s.appendChild(h('div.notes', h('h3', '이본 노트'), variants.map((w) => T.block(Object.assign({ mark: 'variant' }, w)))));
    ctx.tray(h('button.btn', { type: 'button', on: { click: () => app.title() } }, '처음 화면'));
    await new Promise((resolve) => ctx.signal.addEventListener('abort', resolve, { once: true }));
  };

  // ───────── 마지막 장을 그림 파일로(글자를 캔버스에 직접 그린다. 「사씨남정기」 필사기 저장을 고쳐 씀)
  function wrap(g, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      let line = '';
      for (const ch of para) {
        if (g.measureText(line + ch).width > maxW && line) {
          if (/[.,!?。？！…]/.test(ch)) {
            const last = line.match(/\S+$/)?.[0] || line.slice(-1);
            const keep = last.length < line.length ? last : line.slice(-1);
            out.push(line.slice(0, -keep.length).trimEnd()); line = keep + ch;
          } else { out.push(line); line = ch === ' ' ? '' : ch; }
        } else line += ch;
      }
      out.push(line);
    }
    return out;
  }
  app.renderPage = function () {
    const L = app.lastPage();
    const st = S();
    const W = 900, c = document.createElement('canvas');
    const serif = getComputedStyle(document.documentElement).getPropertyValue('--serif') || 'serif';
    const pixel = getComputedStyle(document.documentElement).getPropertyValue('--pixel') || 'sans-serif';
    const g0 = c.getContext('2d');
    // 높이를 먼저 잰다
    const px = 70, inner = W - px * 2 - 60;
    g0.font = `26px ${serif}`;
    const blocks = [
      ['꿈의 기록', L.score + '\n' + L.scoreNotice, '#2b2320'],
      ['물음', L.question, '#2b2320'],
      ['나의 해석', L.interp, '#34508f'],
      ['근거 구절', L.evidence || '—', '#2b2320'],
      [st.interp && st.interp.revised ? '고친 흔적' : '고친 흔적 없음', L.trace || '—', '#5b4a3c'],
      ['소원', G.app.wishes().map((w) => w.name).join(' · '), '#5b4a3c'],
      ['구슬', '찾은 구슬 ' + D.pearlScenes().filter((s) => st.pearls[s.meet]).length + ' / ' + D.pearlScenes().length + ' (점수로 치지 않음)', '#5b4a3c'],
    ].map(([k, v, col]) => ({ k, col, lines: wrap(g0, v, inner) }));
    let H = 250;
    for (const b of blocks) H += 52 + b.lines.length * 40 + 18;
    H += 90;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#efe3c6'; g.fillRect(0, 0, W, H);
    // 책장(광곽: 바깥 굵은 선 + 안쪽 가는 선)
    g.fillStyle = '#f8f0dc'; g.fillRect(px - 30, 30, W - (px - 30) * 2, H - 60);
    g.strokeStyle = '#5b4a3c'; g.lineWidth = 6; g.strokeRect(px - 12, 48, W - (px - 12) * 2, H - 96);
    g.lineWidth = 1.5; g.strokeRect(px - 2, 58, W - (px - 2) * 2, H - 116);
    // 제목·도장
    g.fillStyle = '#2b2320'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `400 40px ${pixel}`; g.fillText('구운몽 · 꿈 일지 마지막 장', px + 20, 120);
    g.strokeStyle = '#b8342a'; g.lineWidth = 5; g.strokeRect(W - px - 90, 78, 64, 64);
    g.fillStyle = '#b8342a'; g.font = `700 40px ${serif}`; g.textAlign = 'center'; g.fillText('夢', W - px - 58, 126);
    g.textAlign = 'left'; g.fillStyle = '#5b4a3c'; g.font = `24px ${serif}`;
    g.fillText('이름  ' + (L.name || '　　　　'), px + 20, 172);
    g.textAlign = 'right'; g.fillText(L.date, W - px - 20, 172);
    g.strokeStyle = 'rgba(43,35,32,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + 20, 192); g.lineTo(W - px - 20, 192); g.stroke();
    let y = 240;
    g.textAlign = 'left';
    for (const b of blocks) {
      g.fillStyle = '#1f7a74'; g.font = `400 24px ${pixel}`; g.fillText(b.k, px + 20, y);
      y += 40;
      g.fillStyle = b.col; g.font = `26px ${serif}`;
      for (const ln of b.lines) { g.fillText(ln, px + 40, y); y += 40; }
      y += 30;
    }
    g.fillStyle = '#8a7862'; g.font = `18px ${serif}`; g.textAlign = 'right';
    g.fillText('김만중 「구운몽」 학습 게임 · 해석은 채점하지 않아요', W - px - 20, H - 74);
    return c;
  };
  app.saveImage = function () {
    const st = S();
    let c;
    try { c = app.renderPage(); } catch (e) { console.error(e); G.ui.toast('이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요.'); return; }
    const fname = '구운몽_꿈일지_' + (st.name || '이름').replace(/[\\/:*?"<>|]/g, '') + '.png';
    c.toBlob((blob) => {
      if (!blob) { G.ui.toast('이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요.'); return; }
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: fname });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      G.audio.stamp();
    }, 'image/png');
  };
})();
