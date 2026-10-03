# js/game — 진행과 화면

## 맡는 것과 경계

app은 접근 판정·재개·깨어남·목차·설정·장부를, stage는 그림과 그 아래 글·인물·효과를 맡는다. prep/event/hud가 꿈 육성을, cutscene/wish/wake가 컷신·소원·깨어남을 담당한다. board/house/pearl/bag는 말판·자동 장식·구슬·꿈 도구, journal/interp/result는 꿈 밖의 정리와 PNG를 맡는다.

저장·계산·글 표기·소리는 core를 사용하고 localStorage를 직접 만지지 않는다. 장면 글·정답·곡·좌표는 data에서 읽는다. 생성 자산·음원 정의·검사 파일은 이 모듈의 일반 수정 범위가 아니다.

## 연결 지점

- screens[kind](ctx,scene)의 Promise가 끝나면 다음 진행으로 간다. 결과는 계속 머문다.
- hook(scene)는 공통 띠, hook(chapter)는 장 안내 뒤, hook(between)는 완료 저장 뒤에 연결한다. 직접 다시 보기에서는 chapter/between을 생략한다.
- on의 scene/step/done/chapter/wake/reset/settings와 toolbar를 사용한다. settings는 인자 없는 동기 알림이다. 새 화면이 열기 문을 우회하지 않게 한다.
- ctx.startStep은 재개할 사건 걸음이다. ctx.step은 표시를 알리며 쓰기 가능한 현재 진행만 저장한다. ctx.finishEvent는 보상·마침·다음 pos를 확정한다. 결과 연출 전에 호출하고 보상을 별도로 다시 더하지 않는다.
- ctx.next는 tray 단추를 만들고 취소되면 false다. 모든 비동기 경계에서 alive를 확인하고 signal 취소를 정리한다.
- G.stage.mount/play가 공통 대사를 제공한다. cutscene.play의 onPause는 stage.setSpriteFrame을 받아 자세를 고정할 수 있다. 파일 초기화 시 뒤 모듈을 호출하지 않는다.

## 기록과 접근

- 목차·주소·history·open 모두 canOpen을 지난다. 학생은 깨어난 뒤 c3-awake 앞의 장면을 열 수 없다.
- 준비는 G.save.prepare로 즉시 저장한다. 등급 단계는 ctx.finishEvent로 확정한다. 이음 덤은 app 완료 경로가 한 번 적용하므로 화면이 중복 적용하지 않는다.
- 두 턴이 저장됐으면 대사부터, 등급까지 저장됐으면 다음 단위부터 재개한다. 깨어남 전 3장은 취미궁부터, 저장 뒤는 선방부터다.
- 직접 다시 보기의 ctx.readonly/revisit는 기록을 바꾸지 않는다. ctx.autoAdvance는 자동 준비 기록이 현재 순차 경로에 있는 경우이며, 읽기 전용 재생 후 다음 pos만 옮긴다. auto·보상·능력·done·장부는 보존한다.
- 선생님 바로가기는 기존 부분 기록도 덮어쓰지 않는다. 자동 기록을 실제 수행으로 표시하지 않는다.
- 설정이 바뀌면 도구·HUD·열린 꿈 도구의 권한을 즉시 갱신하고, 이미 만들어진 단추도 클릭 시 다시 검사한다. 허용된 장면의 본문과 선택은 보존하되 잠긴 장면은 설정판이 열린 동안에도 즉시 재개 위치로 옮긴다.

## 꿈 표시

- HUD는 꿈 점수·능력·소원만 표시한다. 인연은 수치에 더하지 않고 수집 개수도 표시하지 않는다. 미색은 글·도움말 모두 물음표다.
- G.app.wishes가 fill/parts/hidden 등을 제공한다. 인연을 입력으로 덧붙이지 않는다.
- 같은 square를 잇는 사건 사이에서는 말이 걷지 않는다. 집 단계는 이야기 위치로만, 재물은 장식 수준만 바꾼다. 직접 배치 저장은 없다.
- G.house.view({mini}), G.board.view, G.dream.wishList/pearlKeep/picture를 유지한다. 깨어난 학생에게 board/house/bonds 탭을 다시 열지 않는다.
- 구슬은 readonly에서 추가하지 않는다. 중심 잘림·대사창 가림이 있으면 그림 살피기로 원래 좌표의 구슬을 찾게 한다. 원작 근거 둘과 설정 여섯의 카드를 유지한다.
- 준비·지팡이 시트는 메타의 96px 셀과 프레임 수로 그린다. 목록에 없으면 파일을 추측해 요청하지 않는다. 아이콘은 G.prep.icon을 쓰고 미등록이면 글만 남긴다.

## 깨어남과 꿈 밖

- c3-staff의 난간 단추를 누를 때만 app.wake를 호출한다. 올린 자세는 0기준 2번 프레임에서 멈추고, 클릭 동기 저장 후 3번 내려치기를 보인 다음 부서진다. 클릭 전 skip은 없고, 연출 중 재접속은 이미 깨어난 상태여야 한다.
- 부서질 말판·점수·집·인연 표시를 저장 전 준비하되, 연출을 먼저 하고 나중에 awake를 저장하지 않는다. 최고 점수·과거 장부는 결과를 위해 보존한다.
- 소원 찾기는 a-wish, 맞대기는 j-match다. 첫 기록과 도움 표시를 유지한다. 인연 잇기는 어느 선택이든 미색을 공개하며 채점하지 않는다.
- 해석 첫 선택은 응답 전에 기록하고 heard 이후 잠근다. after 근거는 응답 뒤에만 보이고 수정은 한 번이다. final 뒤에는 다시 고치지 않는다.
- 마지막 장과 PNG에 최고 점수→0·평가 안내·해석·근거·수정 흔적을 모두 담는다. 이름은 기기 안에서만 저장하고 파일명 금지 문자를 제거한다.

## 검증

check-engine, check-dream, check-chapters로 경계를 확인하고 check-content의 실제 학생 세 판으로 연결을 검증한다. check-assets는 새 시트 자동 재생·호승 자세·정수배·파일 요청까지 확인한다. 명시적 사용자 선택 없이 시험용 상태 주입으로 완주를 대신하지 않는다. 최종은 node tests/run-all.mjs 종료 0이다.
