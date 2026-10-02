'use strict';
// 시작점: 내용 데이터를 읽고(없어도 멈추지 않음), 저장된 진행을 불러온 뒤 첫 화면을 띄운다.
// 주소 뒤에 붙이는 바로가기(자세한 것은 js/game/app.js의 app.boot):
//   ?teacher=1 / ?teacher=0   선생님용 켜기 / 끄기
//   ?ch=2, ?scene=장면id      그 장·장면으로(열 수 있을 때만. 깨어난 뒤 0~3장은 선생님용만)
//   ?fixture=1                임시 데이터(tests/fixtures/stub.js)로 열기 — 점검용
// 아무것도 밖으로 보내지 않는다(분석 도구 없음). 저장은 이 브라우저에만 한다.
(function () {
  // 첫 터치·키 누름에서 소리를 켤 수 있게(브라우저 정책)
  const unlock = () => { if (G.audio) G.audio.unlock(); };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  // 앱 설치용 정보(아이콘 assets/ui/icon-192.png·icon-512.png). 파일로 열었을 때(file://)는 브라우저가 읽지 못하므로 붙이지 않는다
  if (/^https?:$/.test(location.protocol)) document.head.appendChild(G.util.h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));

  G.loadData().then(() => {
    G.save.load(G.data.fixture || null);
    G.app.boot();
  }).catch((e) => {
    console.error(e);
    const app = document.getElementById('app');
    if (app) app.textContent = '게임을 여는 중에 문제가 생겼어요. 새로 고침해 보세요.';
  });
})();
