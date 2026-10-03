# js/core — 엔진 부품

## 맡는 것

util은 요소·조사·기기 픽셀 배율, save는 v2 저장·장부·육성 저장 래퍼, sim은 화면 없는 준비·등급·보상 계산을 맡는다. data는 읽기·검사·글 총량, audio는 로컬 녹음과 합성, text/ui는 글 표기와 공통 화면, activity는 맞대기와 도움을 담당한다.

## 경계

- app·말판·집·꿈 도구를 여기서 호출하지 않는다. 내용과 정답은 js/data에 둔다.
- 게임에는 프레임워크·서버·원격 분석 도구를 추가하지 않는다. 시험 자료는 tests/fixtures만 사용한다.
- 등록 순서는 util → save → data → audio → text → ui → activity → sim이다. save의 sim 래퍼는 실행 시점에 호출되므로 초기 평가에서 뒤 모듈을 호출하지 않는다.

## 저장과 규칙

- 쓰기는 G.save.write로만 한다. 열쇠는 guunmong-v2와 시험용 guunmong-v2-fixture-이름이다. v1을 읽거나 지우지 않는다.
- reset은 music/sound/big/teacher만 유지한다. mode와 전체 화면은 저장하지 않는다.
- load는 v:2와 맨 위 자료형을 확인하고 기본 객체에 값을 합친다. 안쪽 임의 구조의 마이그레이션으로 오해하지 않는다.
- sim.prepare는 같은 턴의 재선택을 반영하지 않는다. finish는 기존 등급·보상을 다시 더하지 않는다. 조정 가능한 상승·문턱·보상은 config 한곳에 둔다.
- 두 적중이면 늘 shine, 적중 0이면 shine 금지다. 핵심 둘이면 어느 쪽도 적중이고 높은 능력값을 쓴다.
- normalPrep은 대상 앞의 기록 없는 사건만 채운다. 부분 기록·완료 기록·auto 기록을 덮어쓰지 않고 done이나 활동 장부를 만들지 않는다.
- ledger는 a-wish/j-match만 다룬다. teacher 도움을 먼저 쓰면 first:null, final 이후 첫 시도·도움은 불변이다. wrongNote는 활동·칸별 첫 오답만 남긴다.
- activity.mount의 readonly와 final을 존중하고 맞대기 선택은 journal.match.picks에 보존한다. mode에 따른 추가 선택지는 없다.

## 글·표시·소리

- G.checkData의 기본 검사는 실제 12사건이다. 시험 자료만 명시적 fixture 옵션으로 3사건을 검사한다. 데이터 안의 값으로 기준을 낮추지 않는다.
- G.storyText가 글 총량의 단일 계산 경로다. 소원 장면의 lines/narration도 포함하며, 여러 줄을 합쳐 가짜 근거 구절을 만들지 않는다.
- 原文 표시는 영인 대조를 마친 orig에만 붙인다. 현재 자료는 모두 대조 전이다. 게임 설정의 real 안내는 최초 한 번, peek는 기록 없이 표시한다.
- 도트는 pixScale/pixNear로 기기 픽셀 기준 정수·역정수 배율을 사용한다. CSS 커스텀 변수는 style.setProperty로 등록한다.
- 알림은 topbar 또는 화면 상단에 두고 본문과 tray를 가리지 않는다. 전체 화면은 사용자 입력으로만 바꾸고 저장하지 않는다.
- http(s)는 로컬 녹음을 Web Audio로, file는 audio 요소로 재생한다. 실패 시 합성 대체를 사용한다. 화면 접기는 두 소리를 멈추며 바깥 URL을 요청하지 않는다.

## 검증

규칙·저장은 node tests/check-sim.mjs, 형식·글은 check-data.mjs, 화면 연결은 check-engine.mjs와 check-content.mjs로 확인한다. 선생님 도움 먼저, 부분 준비 재접속, 보상 재호출, 자동 기록 재진입, 저장소 실패를 빠뜨리지 않는다. 표시 문구가 달라지면 python tools/build_fonts.py 뒤 글꼴을 함께 반영한다. 최종은 node tests/run-all.mjs 종료 0이다.
