'use strict';
// 시작점: 자료 검사에 성공한 뒤에만 저장된 진행을 불러오고 첫 화면을 띄운다.
// 주소 뒤에 붙이는 바로가기(자세한 것은 js/game/app.js의 app.boot):
//   ?teacher=1 / ?teacher=0   선생님용 켜기 / 끄기
//   ?ch=2, ?scene=장면id      그 장·장면으로(열 수 있을 때만. 깨어난 뒤 0~3장은 선생님용만)
//   ?fixture=1                임시 데이터(tests/fixtures/stub.js)로 열기(점검용)
// 아무것도 밖으로 보내지 않는다(분석 도구 없음). 저장은 이 브라우저에만 한다.
(function () {
  // 첫 터치·키 누름에서 소리를 켤 수 있게(브라우저 정책)
  const unlock = () => { if (G.audio) G.audio.unlock(); };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  // 앱 설치용 정보(아이콘 assets/ui/icon-192.png·icon-512.png). 파일로 열었을 때(file://)는 브라우저가 읽지 못하므로 붙이지 않는다
  if (/^https?:$/.test(location.protocol)) document.head.appendChild(G.util.h('link', { rel: 'manifest', href: 'manifest.webmanifest' }));

  function startupError(dataFailed) {
    const app = document.getElementById('app');
    if (app) app.replaceChildren(G.util.h('p.loading', { role: 'alert', dataset: { startupError: dataFailed ? 'data' : 'boot' } },
      dataFailed ? '게임 자료를 읽지 못해 시작할 수 없어요. 기록을 새로 저장하거나 지우지 않았어요. 새로 고침해서 다시 시도해 주세요.' :
        '게임을 여는 중에 문제가 생겼어요. 새로 고침해서 다시 시도해 주세요.'));
  }

  async function startup() {
    let dataReady = false;
    try {
      await G.loadData();
      if (G.data.ok !== true) { startupError(true); return; }
      dataReady = true;
      G.save.load(G.data.fixture || null);
      await G.save.acquireWriter();
      G.app.boot();
    } catch (e) {
      console.error(e);
      startupError(!dataReady);
    }
  }
  startup();
})();
