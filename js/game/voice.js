'use strict';
// 대사 목소리. tools/make_tts.py가 미리 만든 파일만 재생하고, 실행 중에는 바깥 주소를 부르지 않는다.
// 목록(js/data/voice.js)이 비어 있으면 아무것도 내려받지 않고 설정 줄도 보이지 않는다.
// G.voice.ready -> 들을 대사가 있는가 / G.voice.say(화면에 보인 글 또는 그 배열: 차례로 읽음) / G.voice.stop()
(function () {
  const map = window.GUUN_VOICE || {};
  const V = (G.voice = { ready: Object.keys(map).length > 0, say() {}, stop() {} });
  if (!V.ready) return;
  let audio = null, turn = 0;
  const hash = (t) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193) >>> 0; return ('0000000' + h.toString(16)).slice(-8); };
  V.stop = () => { turn++; if (audio) { audio.pause(); audio = null; } };
  V.say = (text) => {
    V.stop();
    if (!G.save.state.voice) return;
    const files = [].concat(text || []).map((t) => map[hash(t)]).filter(Boolean), mine = turn;
    const next = () => {
      const file = mine === turn && files.shift();
      if (!file) { if (mine === turn) audio = null; return; }
      const a = (audio = new Audio(file));
      a.addEventListener('ended', () => { if (audio === a) next(); });
      a.play().catch(() => {});
    };
    // 소리를 내려받는 동안에는 문서의 load가 늦어진다. 첫 화면이 다 뜬 뒤에 읽는다(느린 학교 망).
    if (document.readyState === 'complete') next(); else window.addEventListener('load', next, { once: true });
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) V.stop(); });
})();
