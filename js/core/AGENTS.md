# js/core — 엔진 부품

## 맡는 것과 경계

experience는 순서·행동·원작 사실·저장 이관, world는 보행·가시성·경로·장소 전환을 순수 계산한다. play는 소원 막대 값(원작분 바닥 + 선택분)·선택 자리·뒤 장면 변화·되짚기 모델과 문장·E11을 순수 계산한다(G.play). save는 v3 저장과 단일 writer 권한, 선택·첫 판가름·숨긴 소원 기록 API를, data는 로컬 script 읽기·형식 검사·글 총량을 맡는다. util/text/ui/activity/audio의 공통 기능은 유지한다.

- world/experience는 DOM·저장소에 접근하지 않는 순수 계산이며, save/data는 app·꿈 도구·말판·집을 호출하지 않는다. ui/text/activity는 공통 DOM 표시를 맡고 장 진행을 직접 제어하지 않는다.
- 서버·원격 분석·새 저장 열쇠를 만들지 않는다. 시험 자료는 tests/fixtures에만 둔다.
- index.html은 world → experience → play → save → data 등 공통 부품 → app 순서로 등록한다. save가 호출할 세 순수 모듈(world·experience·play)은 main의 load 전에 모두 있어야 한다.

## 저장과 규칙

- G.save.state는 깊게 동결한 읽기 전용 스냅샷이다. 직접 대입·push 금지. 변경은 현재 ctx가 보관한 run과 readonly를 넘겨 저장 트랜잭션 또는 전용 API로 한다. 성공 뒤 새 상태를 다시 읽는다.
- 게임 설정 카드의 최초 읽기 기록도 text.mark/block/blocks에 전달한 run·readonly로 트랜잭션을 거친다. run 없는 렌더·peek·readonly는 기록하지 않으며 실패한 첫 안내는 다음 열기에서 다시 저장한다.
- 저장 열쇠는 guunmong-v3(시험 guunmong-v3-fixture-<이름>), v:3이다. v3가 없을 때 같은 이름의 v2에서 설정 넷만 읽고 진행·기록은 가져오지 않는다. v2·v1은 고치거나 지우지 않는다. rpg가 없는 새 판은 writer 최초 저장에서만 run을 생성한다. 기존 run이 무효하면 unavailable로 열람만 허용한다.
- Web Locks의 exclusive/ifAvailable을 사용한다. 이 옵션과 signal은 함께 쓸 수 없으므로 취소한 세대의 콜백을 거부하고 수명 Promise를 해제한다. reader/acquiring/unavailable에서는 메모리와 저장 모두 불변이다.
- acquireWriter는 최신 저장을 다시 읽는다. pagehide는 즉시 권한을 해제하고 pageshow.persisted는 최신 기록과 권한 확보 전까지 저장을 막는다. storage·access·reset 변화는 onChange로 알리며 화면 취소·재표시는 app이 연결한다.
- 실패한 setItem은 기존 상태 객체와 run을 유지한다. 같은 run에서 awake는 단조롭고 awakeAt은 최초값이다. reset(run,{confirmed:true,cancel})은 취소를 먼저 호출하고 설정 네 개만 남긴 새 run을 한 번 저장한다.
- 행동은 현재 장면·필수 순서·공개 대상·인접 칸·수행자·도움·중복을 검사한다. staff는 일반 apply/finish로 수행하지 않는다. app.wake가 commitWake의 성공을 확인한 뒤에만 연출한다.
- awake:false→true는 commitWake만 허용한다. 현재 staff 위치·실제 staff 행동 하나의 추가·완료·최초 시각·선방 위치와 커서를 같은 저장에서 검증한다. 공개 transact로 awake나 위치만 바꿔 지팡이를 생략하지 못한다.
- auto를 새 actions로 만들지 않는다. 소원의 원작분은 저장된 원작 단계와 물건에서, 선택분은 play.choices에서 파생하며 원작분 아래로 내려가지 않는다. 인연·구슬·첫 판가름은 소원 입력이 아니다.
- play의 choices·firsts·secretWish·peak는 일반 transact로 바꿀 수 없고 recordFirst·applyExperience({choice})·chooseSecretWish로만 기록한다. 처음 것만 저장하고 바꾸지 않는다. 선생님용·auto·깨어난 뒤·readonly·reader·이전 run은 기록하지 않는다. 생각 선택 자리의 학생 행동은 선택과 한 저장으로만 기록한다. peak는 깨어남 저장과 함께 동결한다.
- 구슬 공개 시점의 변경으로 이미 저장된 선택 수집과 필수 행동을 지우지 않는다. 정규화는 실제 지도 대상·선택 구슬·수집 사실의 일치를 확인하고, 트랜잭션에서는 이전 스냅샷의 같은 행동만 보존 예외로 인정한다. 새 행동의 공개 조건은 완화하지 않는다.
- staff의 자동 안내는 실제 타격을 대신하지 않는다. 옛 auto staff는 실제 입력을 받은 commitWake만 한 번의 저장에서 실제 완료로 바꿀 수 있다. 기존 teacher 힌트·다른 auto·play 기록을 유지하며 일반 transact/apply/finish는 이 예외를 갖지 않는다. 타격 전 선방 이후의 학생 접근과 교사 미리보기의 학생 수행 기록 생성을 막는다.
- ledger는 a-wish/j-match의 정오답·첫 시도·도움을 유지한다. teacher 도움과 final/해석 first/final을 되돌리지 않는다.
- activity는 저장 스냅샷을 직접 고치지 않고 지역 picks/tries/memoOpen을 persist로 넘긴다. 일부 오답 저장 뒤 실패하면 이미 저장한 act/slot의 첫 오답을 중복 기록하지 않으며 같은 확인을 멱등 재시도한다. 생성 때의 run·취소 신호·canAct를 도움·오답·확정에도 전달한다.

## 글·소리·검증

G.checkData 기본은 실제 28단위·12사건·3이음이다. world-opening/world-event는 엔진 부품의 명시 시험 프로필이고 rpg-opening/rpg-waking은 각각 도입 6단위와 깨어남 4단위의 대표 콘텐츠 프로필이다. 대표 콘텐츠는 승인 자산 키를 사용하고 임시 그림을 허용하지 않는다. 실제 누락 맵이나 대체 그림으로 본편을 통과시키지 않는다. G.storyText는 새 월드가 참조하는 본문까지 복사 없이 합산한다. 영인 대조 전 orig는 금지다. 기기 픽셀 정수·역정수 배율, style.setProperty, 상단 알림, 로컬 소리 경로를 유지한다.

node tests/check-sim.mjs와 check-data.mjs로 양성·음성 사례를 검사한다. tests/fixtures/verify-save-browser.mjs는 실제 Chrome의 HTTP/file 두 탭 core 권한을 확인하며 전체 게임 검증과 다르다. 전체 완료는 node tests/run-all.mjs 종료 0이다. 표시 글을 바꾸면 부분 글꼴을 재생성한다.
