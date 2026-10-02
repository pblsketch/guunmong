# js/core — 엔진 부품

## 맡는 것
`G.util`(요소·섞기·조사·도트 정수배), `G.save`(localStorage 한 덩이와 장부), `G.loadData`·`G.checkData`(데이터 읽기와 규칙 확인), `G.audio`(배경음·합성 효과음), `G.text`(글 표기), `G.ui`(알림·풍선·시트·아이콘·화면 접기), `G.activity`(읽고 골라 넣기 활동과 도움 사다리). 형제 작품(「사씨남정기」「도산십이곡」)의 부품을 가져와 고친 것이라 다음 편에서도 다시 쓴다.

## 맡지 않는 것
- 장 흐름, 열기 문, 이어 하기, 깨어남, 목차·설정 화면은 `js/game/app.js`의 일이다. 여기서 `G.app`, `G.dream`, `G.board`, `G.house`를 부르지 않는다.
- 게임 내용(글·문항·곡 배정)은 `js/data/`에 둔다. 여기에 장면 글이나 정답을 박지 않는다(화면 문구 기본값만 둔다).
- `tests/fixtures/`의 임시 데이터를 고치지 않는다.

## 지켜야 할 것
- 파일 순서는 util → save → data → audio → text → ui → activity이고, 각 파일은 앞 파일만 쓴다.
- 저장은 `G.save.write()` 하나로만 한다. 열쇠는 `guunmong-v1`(임시 데이터는 `guunmong-v1-fixture-<이름>`). `reset()`은 설정 다섯(`music`·`sound`·`big`·`teacher`·`mode`)만 남기고 나머지를 지운다. `load()`의 `Object.assign(fresh(), 저장된 것)`은 안쪽 객체를 섞지 않는다.
- 장부: `ledgerTry`는 첫 제출에서만 `first`를 정한다. `ledgerHelp`는 한 번 `'teacher'`가 되면 `'student'`로 내려가지 않는다. `final`이 된 기록은 어떤 함수로도 바뀌지 않는다. `wrongNote`는 같은 활동·같은 칸에 하나만 남긴다.
- `G.activity.mount`는 `opt.readonly`이거나 이미 `final`인 활동이면 장부·오답·picks를 하나도 바꾸지 않는다. 채점하지 않는 활동(`scored: false`)은 `picks`에만 남기고 장부에 넣지 않는다. 모든 칸을 채워야 [확인]이 켜진다.
- 선택지 순서는 `G.util.shuffle(목록, G.util.hash(활동 id))`로 정해 새로 고침해도 같다. 다시 읽기(`mode === 'review'`)에서만 `extra`가 더해진다.
- `G.text`는 `{ orig }` 덩이와 `passageKind: 'orig'`에만 原文 낙관을 붙인다. 그 밖의 글은 풀이 바탕이다. 옛한글 자모가 든 글에는 `old` 표시를 붙인다(지금 GuunOld 글꼴은 한자만 있다).
- 게임 설정 카드(`mark: 'fiction'`)의 "실제로는 →"은 `seenFiction[id]`가 없을 때 한 번만 보인다. `opt.peek`으로 그릴 때는 본 것으로 치지 않는다.
- 도트 그림은 `pixScale`·`pixNear`로 기기 픽셀 기준 정수배(또는 1/정수배)만 쓴다. `devicePixelRatio`를 곱해 계산하고 CSS px로 돌려준다.
- 알림(`G.ui.toast`)은 보이는 `.topbar`의 빈 곳에 띠로, 모자라면 위 막대 전체를 덮고, 위 막대가 없으면 맨 위에 뜬다. 본문·`#tray`를 가리면 안 된다.
- 소리: http(s)는 `fetch` + Web Audio(최근 세 곡만 풀어 둠), `file://`은 `<audio>`, 못 받으면 곡 데이터의 `synth` 합성 곡. 첫 사용자 입력 전에는 소리 맥락을 만들지 않는다. `hush()`/`unhush()`는 화면 접기용으로 배경음·효과음을 모두 멈춘다. 바깥 주소를 `fetch`하지 않는다.
- `G.checkData()`는 데이터 규칙을 글로 된 경고 목록으로만 돌려준다(던지지 않는다). 규칙을 더하면 경고 문구에 장면·항목 id를 넣는다.

## 고칠 때
- 조사가 앞말에 따라 바뀌면 `G.util.josa(낱말, '을/를')`를 쓴다. `'을(를)'` 같은 두 꼴은 점검이 막는다.
- 화면에 보일 새 문구를 넣었으면 부분 글꼴을 다시 만든다(`python tools/build_fonts.py`).
- 확인: `cd tests; node check-engine.mjs`(임시 데이터로 저장·이어 하기·도움 사다리·장부·읽기 방식·설정·선생님용·글 표기·곡 바뀜·파일로 열기). 소리를 고쳤으면 `node check-content.mjs`의 소리 켜고 끄기와 파일로 열기도 본다. 마지막에 `node run-all.mjs`.
- 꼭 시험할 경계: 첫 시도 전에 선생님용 정답 채우기 → 확인(첫 시도는 기록 없음 `first: null`, 결과 장부에 '—', 도움은 선생님용. 새로 고침을 사이에 둬도 같음), 마친 활동을 다시 열어 틀리게 풀기(장부 불변), 저장소가 막힌 브라우저(예외 없이 새로 시작), `file://`에서 배경음 재생 방식이 `'element'`인지.
