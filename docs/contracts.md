# 바깥에 내놓는 약속

서버 API와 인증이 없는 정적 게임이다. 주소, 브라우저 저장, PNG, 내용 데이터와 화면 검사 표식을 외부 접점으로 제공한다. 기록은 같은 브라우저에만 남는다.

## 주소

`index.html` 뒤의 인자를 읽는다. scene이 ch보다 우선이며 teacher·scene·ch는 적용 후 주소에서 지운다. fixture는 남는다.

| 입력 | 결과 | 잘못되거나 열 수 없는 경우 |
| --- | --- | --- |
| `teacher=1` / `teacher=0` | 선생님용 설정을 저장 | 1 이외 값은 끔 |
| `ch=1`~`5`, `R` 또는 `r` | 해당 장의 첫 진행 단위 | 시작 기록이 있으면 재개 위치와 알림, 없으면 처음 화면 |
| `scene=e03-geomungo` 등 유효 id | 해당 진행 단위 | 없는 id 또는 닫힌 장면도 재개 위치/처음 화면으로 처리 |
| `fixture=1` 또는 영문·숫자·하이픈 이름 | 1은 stub. 시험 자료 하나와 별도 저장 사용 | 형식이 맞지 않으면 실제 자료, 파일이 없으면 내용 없음 안내와 시작 불가 |

선생님용은 수업 편의 기능이며 접근 인증이 아니다. 깨어난 뒤 닫힌 장면을 가리키는 학생 주소는 허용하지 않는다.

## 브라우저 저장

- 실제 열쇠는 `guunmong-v3`, 시험 열쇠는 `guunmong-v3-fixture-<이름>`이다. JSON의 `v`는 3이다(0022). 모든 학생은 새로 시작한다. v3가 없을 때 `guunmong-v2`(시험은 `guunmong-v2-fixture-<이름>`)를 **읽기만** 하여 설정 넷이 불리언이면 가져오고, 진행·기록은 가져오지 않는다. v2가 없거나 깨졌으면 기본값이다. `guunmong-v2`와 `guunmong-v1`은 고치지도 삭제하지도 않는다.
- 맨 위 설정: `music`, `sound`, `voice`, `big`, `teacher`. mode와 전체 화면 저장은 없다. `voice`(대사 목소리, 기본 켜짐, 0024)는 v2에서 가져오지 않고 기본값으로 시작하며, 확인 초기화는 다섯 설정을 모두 남긴다. 저장에 `voice`가 없던 v3 기록은 기본값으로 읽는다.
- 진행 기록의 필수 행동 차례를 고친 장면은 `js/core/experience.js`의 `MOVED`에 전 차례를 적는다. 전 차례 그대로인 기록은 읽을 때 지금 차례로 다시 세우고, 지금 차례에 빈자리가 생기면 그 앞까지만 남긴다(지금: `e10-neungpa`, 0024).
- 진행: `started`, `pos`, `step`, `reach`, `done`, `awake`, `awakeAt`.
- 기록: id 배열 `items`·`bonds`, id→true `pearls`·`seenFiction`, `ledger`, `wrong`, `journal`, `interp`.
- 기타: `name`, `startedAt`, `finishedAt`.
- 새 체험: `rpg:{v:1,run,cursor,scenes}`. 안쪽 enum·순서·참조·좌표의 단일 기준은 js/data/README.md다.
- 선택과 첫 판가름: `play:{ secretWish, choices, firsts, peak }`.
  - `secretWish`: null 또는 'chuljang'|'bugwi'|'pungryu'|'gongmyeong'.
  - `choices`: {[선택 자리 id]: {option}}. 선택 자리는 선택지에 `wish`가 있는 도전·생각 선택이다. 학생이 처음 고른 것만.
  - `firsts`: {[도전 id]: {ok:true|false|null, clues?, tried?}}. 대화가 아닌 도전만. ok:null은 search 첫 판의 판가름 전(tried에 헛짚은 곳). clues는 deduce만(0~단서 수). ok가 정해지면 불변.
  - `peak`: 네 소원의 0~4 정수. 깨어남 저장과 함께 동결.
- 옛 판의 `abil`·`res`·`best`·`events`는 v3에 없다.

ledger는 `a-wish`, `j-match` 두 활동의 `{ first:true|false|null, help:null|'student'|'teacher', final }`만 담는다. 사건 행은 rpg의 상태·행동 근거·도움에서 만든다. 선택·첫 판가름·숨긴 소원은 ledger에 넣지 않는다. journal은 소원 선택·오답 수, 맞대기 선택, 인연 잇기와 revealed를, interp는 first·heard·changed·revised·final을 보존한다.

v3 읽기는 허용된 맨 위 필드와 자료형을 확인하며 기본 객체에 저장된 값을 합친다. 배열은 배열일 때만 받고 `pos`는 null이나 문자열일 때만 받는다. `play` 안은 위 집합(데이터에 있는 자리·선택지·도전·곳 id)에 맞는 값만 받는다. 임의 깊이의 자동 스키마 변환은 아니다. 모양이나 id를 바꾸면 기존 v3 기록을 별도로 고려해야 한다. 파싱·저장소 접근 실패, v가 3이 아닌 기록은 unavailable이며 기존 기록을 덮어쓰지 않는다. 초기화는 확인·화면 취소 뒤 설정 네 개를 남기고 `play`를 비운 새 run의 v3 상태를 한 번 저장하며 실패하면 이전 상태를 유지한다.

`cut-josin`은 선택형 자료로 보존하지만 본편 목록에서는 제외한다. 옛 서장의 pos·ch=0·scene=cut-josin은 현재 본편의 재개 위치/처음 화면으로 처리한다. 깨어난 기록이면 빈 선방 이후로만 재개한다. 장 인덱스 0은 예약해 기존 reach의 의미를 유지한다.


### 권한·회차·트랜잭션

잠금 이름은 guunmong-write:<G.save.key>다. Web Locks exclusive/ifAvailable을 사용하고 acquiring/writer/reader/unavailable를 구분한다. 권한 전·reader·이전 run에는 메모리 변경도 없다. 권한 이전에는 최신 저장을 다시 읽으며 API 부재·요청 실패는 unavailable다. 별도 저장 열쇠·타이머 임대·steal·원격 서버를 만들지 않는다.

G.save.state는 깊게 동결한 스냅샷이다. 직접 대입·push 대신 transact(run,change,{readonly})의 draft 또는 전용 API를 쓴다. 저장 성공 뒤 state가 교체되며 실패는 이전 객체를 지킨다. 같은 run의 awake:true와 최초 awakeAt을 되돌릴 수 없다. 확인 초기화만 run을 바꾸며 기존 화면의 콜백은 이전 run을 유지해 stale로 거부한다.

게임 설정 카드의 최초 읽기 기록도 이 규칙을 따른다. text.mark/block/blocks의 run·readonly는 화면 생성 때의 값을 전달하며 run 없는 렌더와 peek는 기록하지 않는다. 저장 실패 시 안내를 계속 보여 주고 다음 열기에서 다시 저장한다. 꿈 보따리는 open(tab,ctx)로 포착한 화면 권한을 집 카드까지 전달하며, ctx 없는 호출은 열람만 한다.

구슬의 원작 근거·게임 설정 카드는 읽기 기록을 변경하지 않고 전체 설명을 항상 보여 준다. 설정 카드의 showReal은 표시만 제어하며, 옛 seenFiction 기록이 있어도 이 설명을 숨기지 않는다.

| API | 반환 |
| --- | --- |
| acquireWriter() | Promise<boolean>. 권한 확보·최신 저장 읽기 결과 |
| releaseWriter() | 즉시 저장 차단·권한 해제. 완료 Promise를 요구하지 않음 |
| canWrite(run), write(run), transact(run,change,{readonly}) | boolean |
| reset(run,{confirmed:true,cancel}) | boolean. cancel을 먼저 호출, 새 상태 한 번 저장 |
| onChange(fn) | 구독 해제 함수. access/storage/reset 때 화면 폐기·재표시는 app 책임 |
| applyExperience(sceneId,actionId,{by,readonly,run,choice?}) | {ok,reason,record}; reason=null/locked/readonly/blocked/duplicate/invalid/stale/unavailable/choice. 생각 선택 자리(`G.play.siteAt`)의 학생 행동은 choice가 있어야 하며 행동과 선택을 한 저장으로 기록 |
| recordFirst(challengeId,input,options) | {ok,reason,first}. pick {option}(선택 자리면 선택도 함께), deduce {option,clues}, search {spot}(누를 때마다), sequence {ok}. 현재 pos·현재 필수 beat에서만 |
| chooseSecretWish(wishId,options) | {ok,reason,secretWish}. 소원 찾기 확정 뒤 한 번, 넷 중 하나 |
| 기록 안 함 사유 | teacher/auto/awake/decided/duplicate는 규칙상 기록하지 않음(반응만 보이고 진행) |
| finishExperience(sceneId,options), commitWake(sceneId,actionId,options) | 같은 반환형. staff는 app.wake의 commitWake로만 원자 저장 |
| beginExperience(sceneId,options), move(facing,options), experienceHelp(sceneId,who,options) | boolean |

초기 미이관 rpg는 null이며 writer 최초 이관에서 UUID를 만든다. 저장된 rpg의 run이 무효하면 임의 재생성하지 않는다. 소원의 원작분은 actions와 보유한 원작 물건에서 파생하고, 선택분은 `play.choices`에서 파생한다. 읽을 때 experience 장면의 `done`은 rpg 상태가 done일 때만 받는다. `play`의 첫 선택·첫 판가름·숨긴 소원·peak는 일반 transact로 바꿀 수 없고 아래 전용 API로만 기록한다.

구슬 공개 시점이 바뀌어도 이전에 저장된 수집과 필수 행동은 보존한다. 정규화의 예외는 해당 단계 지도에 실제로 있는 선택 구슬 행동과 저장된 수집 사실이 일치하는 경우다. 새 트랜잭션에서는 이전 스냅샷에도 같은 수행자·행동이 있어야 이 예외를 적용하며, 새 수집 요청은 현재 공개 조건을 그대로 검사한다.

pagehide는 즉시 저장 권한을 해제하고 pageshow.persisted는 재확보·최신 읽기 전까지 저장을 막는다. reader는 storage 변화를 읽고 onChange로 이전 화면을 폐기하며 새 회차에 옛 입력을 복사하지 않는다.

## 결과 PNG

[이 장을 그림으로 저장]은 너비 900px의 캔버스로 결과를 그려 다운로드한다. 이름·날짜·물음·해석·근거·수정 흔적·소원·구슬·도움 안내, `secretWish`(없으면 고르지 않음), `peak`(소원별 가장 찼던 정도, 숫자 없는 막대), `recap`(되짚기 요약), `bonds`(꿈에서 만난 인연의 이름)와 `dreamTrace:{before:{label,image},after:{label,image},evidence}`를 포함한다. image는 승인 키 map-chwimi/map-cell이며 evidence는 선택한 해석 근거다. 대비 그림은 잠긴 꿈을 여는 링크가 아니다.

화면의 미저장 이름을 먼저 저장하고 성공한 클릭 시점 모델을 내보낸다. 이름 저장 실패는 다운로드를 중단하고 재시도를 안내한다. 그림·글꼴 준비와 Blob 변환 뒤에도 화면 생존·현재 회차를 확인하며 이탈·초기화된 내보내기는 취소한다. DOM과 PNG는 같은 결과 모델을 사용한다.

파일 이름은 `구운몽_꿈일지_<이름>.png`다. 이름이 비면 이름이라는 기본값을 쓰고 파일 이름 금지 문자를 뺀다. 실패하면 저장 불가 알림을 띄운다. 원격 전송이나 자동 제출은 하지 않는다.

## 내용 입력

`js/data/README.md`가 내용 형식의 단일 기준이다. 파일은 GUUN에 순수 값을 대입하는 script이며 함수나 getter를 넣지 않는다. people·chapters·scenes·wishes·bonds·house·journal·interp·notes·bgm·sprites·maps·experiences·challenges를 읽는다. 실제 데이터 주소에는 `js/core/data.js`의 DATA_VERSION을 `?v=`로 붙인다. 코드와 데이터를 함께 바꿔 배포할 때 이 값과 index.html의 `?v=`를 함께 올린다. 기록용 loaded/missing에는 인자 없는 파일 이름을 남긴다.

`G.checkData(data, options)`는 경고 문자열 배열을 반환한다. 기본은 실제 28단위·12사건·3이음과 모든 새 맵·체험 검사다. 시험용 3사건은 호출자가 명시한 `{profile:'fixture'}`에서만 허용한다. `G.storyText(data)`는 표시용 texts 배열과 한글 음절 count를 반환한다. 읽기 실패는 missing, 검사 위반은 problems에 남기며 missing/problems가 있으면 ok:false로 시작하지 않는다. world-opening/world-event 명시 프로필은 대표 시험만 검사하며 실제 전체 통과와 다르다.

sprites의 공통 값은 `{src,width,height,frames,rows}`다. 새 걷기에는 cell·anchor·directions 확장을 더하며 네 방향의 row/stand/walk가 시트 범위 안인지 검사한다. 일반 시트는 1행·4프레임으로 제한하지 않는다. 현재 준비·지팡이 셀은 96×96/4프레임/1행이고 아이콘은 32×32/1프레임/1행이다. src가 없는 동작은 추측한 파일을 요청하지 않고 대체 표시를 쓴다. 호승의 0기준 2번 프레임은 들어 올린 자세, 3번은 타격이다.

## 화면과 검사 접점

| 표시·함수 | 약속 |
| --- | --- |
| `.play[data-scene][data-ch][data-kind][data-step]` | 현재 진행 단위와 걸음 |
| `#tray [data-act=next]`, `[data-must]` | 다음 진행, 필요한 선택 |
| `.play[data-map][data-beat][data-actor]` | 새 월드의 현재 지도·단계·수행 인물 |
| `[data-world]`, `[data-world-target]` | 월드와 대상 목록(숨은 `.world-tools` 안, 키보드 초점으로 열림) |
| `[data-mission=next]`, `[data-mission=start]` | 새로 시작의 임무 카드 넘기기와 마지막 카드의 시작 |
| `.world-exit` | 다른 장소로 가는 길의 땅 표시. 그 차례에는 `[data-act=interact][data-target=<길 id>]`가 멀리서도 보임 |
| `[data-act=interact][data-target][data-action]` | 현재 대상 상호작용 |
| `[data-word]` | 소원 낱말 선택 |
| `[data-secret-wish]`, `[data-act=secret]` | 숨긴 소원 넷 중 하나 고르기와 확정 |
| `.wish-band[data-band]`, `.band-wish[data-wish]` | 꿈 동안의 소원 띠(숫자 없는 막대·인연 여덟 칸)와 소원 칸 |
| `[data-preview]`, `[data-first]`, `[data-after]` | 선택지의 소원 방향 미리 보기, 다시 읽기의 처음 고른 길, 앞 도전 결과로 바뀐 뒤 장면 표시 |
| `[data-act=skip]`, `[data-act=staff]` | 컷신 생략, 난간 타격. 타격 전 skip은 없음 |
| `[data-act=inspect-picture]` | 잘린 부분을 포함한 구슬 그림 살피기 |
| `[data-act=check]`, `[data-act=revise]`, `[data-act=save-image]` | 맞대기 확정, 해석 한 번 수정, PNG |
| `[data-help]`, `[data-teacher=fill]`, `[data-teacher=show]` | 학생 도움과 선생님 정답 도움 |
| `[data-tool]`, `[data-set]`, `.toast` | 도구·설정·알림. mode 설정은 없음 |
| `G.app.current()` | scene/ch/kind/step/revisit/autoAdvance/data |
| `list`, `canOpen(id)`, `open(id)`, `resume` | 목록, 접근 판정, 열기, 재개 |
| `G.app.on('settings', fn)` | 설정 반영 중 인자 없이 동기 호출. 도구 권한을 갱신한 뒤 현재 장면의 접근 권한을 즉시 다시 검사 |
| `ledgerRows`, `wishes`, `renderPage(model?)` | 장부 14행, 소원 표시 정보, 주어진 결과 모델(생략 시 현재 모델)의 마지막 장 캔버스 |
| `G.dream.can(tab)`, `open(tab)` | 생활 공간·인연·소원·원작 물건·구슬의 접근·표시. 새 말판 탭은 없음 |
| `G.audio.now`, `via`, `hushed` | 곡, rec/element/synth 경로, 화면 접기 정지 여부 |

장부의 사건 상태는 미시작/진행/완료/자동 안내다.

wishes의 각 항목은 id·name·fill(원작분 0~1)·hidden·half·parts·sources와 `level`(표시값÷4, 미색 null)·`canonFull`·`peakLevel`·`secret`을 제공한다. 학생 화면은 막대 길이와 말(많이 참·반쯤 등)로만 보이며 숫자·퍼센트·합계로 표시하지 않는다. 순수 계산은 `G.play`(values·recap·recapLines·e11 등)가 맡는다. 장면이 없으면 current는 null이다. 열 수 없는 id는 알림과 재개 경로로 처리하며, 잠긴 꿈 도구를 학생에게 보여 주지 않는다.

선생님용을 끄면 열려 있던 꿈 도구도 현재 권한에 맞춰 갱신한다. 이미 만든 단추·탭의 콜백은 현재 권한을 다시 확인한다. 허용된 본문·입력은 유지하고 잠긴 꿈 장면은 설정판을 닫기 전에 재개 위치로 이동한다.

## 검사 실행 규약

`node tests/run-all.mjs`는 명시된 열 검사를 순서대로 실행한다. 실패하면 이후 검사를 멈추며 종료 1, 모두 성공하면 종료 0이다. ONLY 환경 변수나 생략 인자를 허용하지 않고 ffmpeg가 없으면 실패한다. 원본 출력은 `tests/shots/run-all-<시각>.log`에 저장한다.

개별 검사는 `node tests/check-<이름>.mjs`로 실행한다. 환경 변수 FFMPEG는 음량 도구 경로다. 개별 bgm 검사의 --no-lufs는 개발 중에만 쓸 수 있으며 완료 증거가 아니다. 화면 검사는 로컬 임의 포트에서 설치된 Chrome을 연다. 빈 검사 대상이나 실행하지 못한 단정을 통과로 세지 않는다.

## 음원 표시

국립국악원 「디지털 이음」과 공공누리 제1유형, 퉁소를 단소로 대신했다는 안내를 처음 화면·설정·README에 표시한다. 화면 출처 글은 11px 이상이고 명암비 4.5 이상이어야 한다. 곡별 악구 번호는 음원 데이터에 유지한다.
