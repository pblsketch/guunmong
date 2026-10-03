# 바깥에 내놓는 약속

서버 API와 인증이 없는 정적 게임이다. 주소, 브라우저 저장, PNG, 내용 데이터와 화면 검사 표식을 외부 접점으로 제공한다. 기록은 같은 브라우저에만 남는다.

## 주소

`index.html` 뒤의 인자를 읽는다. scene이 ch보다 우선이며 teacher·scene·ch는 적용 후 주소에서 지운다. fixture는 남는다.

| 입력 | 결과 | 잘못되거나 열 수 없는 경우 |
| --- | --- | --- |
| `teacher=1` / `teacher=0` | 선생님용 설정을 저장 | 1 이외 값은 끔 |
| `ch=0`~`5`, `R` 또는 `r` | 해당 장의 첫 진행 단위 | 시작 기록이 있으면 재개 위치와 알림, 없으면 처음 화면 |
| `scene=e03-geomungo` 등 유효 id | 해당 진행 단위 | 없는 id 또는 닫힌 장면도 재개 위치/처음 화면으로 처리 |
| `fixture=1` 또는 영문·숫자·하이픈 이름 | 1은 stub. 시험 자료 하나와 별도 저장 사용 | 형식이 맞지 않으면 실제 자료, 파일이 없으면 내용 없음 안내와 시작 불가 |

선생님용은 수업 편의 기능이며 접근 인증이 아니다. 깨어난 뒤 닫힌 장면을 가리키는 학생 주소는 허용하지 않는다.

## 브라우저 저장

- 실제 열쇠는 `guunmong-v2`, 시험 열쇠는 `guunmong-v2-fixture-<이름>`이다. JSON의 `v`는 2다. `guunmong-v1`은 읽지도 삭제하지도 않는다.
- 맨 위 설정: `music`, `sound`, `big`, `teacher`. mode와 전체 화면 저장은 없다.
- 진행: `started`, `pos`, `step`, `reach`, `done`, `awake`, `awakeAt`.
- 육성: `abil`의 munjang/eumak/muye/jiryak, `res`의 gong/fame/wealth, 최고값 `best`, 사건별 `events`.
- 기록: id 배열 `items`·`bonds`, id→true `pearls`·`seenFiction`, `ledger`, `wrong`, `journal`, `interp`.
- 기타: `name`, `startedAt`, `finishedAt`.

사건 기록은 `{ turns, rolls, hits, grade, reward, peek, auto }`다. turns/rolls는 길이 0~2, 미완료 grade/reward는 null, reward는 공·명성·재물 객체다. 자동 준비는 auto:true로 남으며 실제 마침과 구분한다.

ledger는 `a-wish`, `j-match` 두 활동의 `{ first:true|false|null, help:null|'student'|'teacher', final }`만 담는다. 사건 행은 events를 읽어 만든다. journal은 소원 선택·오답 수, 맞대기 선택, 인연 잇기와 revealed를, interp는 first·heard·changed·revised·final을 보존한다.

v2 읽기는 허용된 맨 위 필드와 자료형을 확인하며 기본 객체에 저장된 값을 합친다. 배열은 배열일 때만 받는다. 임의 깊이의 자동 스키마 변환은 아니다. 모양이나 id를 바꾸면 기존 v2 기록을 별도로 고려해야 한다. 파싱 또는 저장소 접근 실패 시 새 기본 상태로 실행하고, 저장이 막힌 환경에서는 영속 보존을 보장하지 않는다. 초기화는 설정 네 개를 남긴 v2 기록을 새로 쓴다.

## 결과 PNG

[이 장을 그림으로 저장]은 너비 900px의 캔버스로 결과를 그려 다운로드한다. 이름·날짜·물음·해석·근거·수정 흔적·소원·구슬·최고 꿈 점수→0·평가에 쓰지 않는다는 안내가 포함된다.

파일 이름은 `구운몽_꿈일지_<이름>.png`다. 이름이 비면 이름이라는 기본값을 쓰고 파일 이름 금지 문자를 뺀다. 실패하면 저장 불가 알림을 띄운다. 원격 전송이나 자동 제출은 하지 않는다.

## 내용 입력

`js/data/README.md`가 내용 형식의 단일 기준이다. 파일은 GUUN에 순수 값을 대입하는 script이며 함수나 getter를 넣지 않는다. people·chapters·board·scenes·wishes·bonds·house·journal·interp·notes·bgm·sprites를 읽는다.

`G.checkData(data, options)`는 경고 문자열 배열을 반환한다. 기본은 실제 12사건 검사다. 시험용 3사건은 호출자가 명시한 `{profile:'fixture'}`에서만 허용한다. `G.storyText(data)`는 표시용 texts 배열과 한글 음절 count를 반환한다. 읽기 실패는 missing, 검사 위반은 problems에 남기며 자료가 없으면 시작하지 않는다.

sprites의 각 값은 `{src,width,height,frames,rows}`다. 현재 준비·지팡이 셀은 96×96/4프레임/1행이고 아이콘은 32×32/1프레임/1행이다. src가 없는 동작은 추측한 파일을 요청하지 않고 대체 표시를 쓴다. 호승의 0기준 2번 프레임은 들어 올린 자세, 3번은 타격이다.

## 화면과 검사 접점

| 표시·함수 | 약속 |
| --- | --- |
| `.play[data-scene][data-ch][data-kind][data-step]` | 현재 진행 단위와 걸음 |
| `#tray [data-act=next]`, `[data-must]` | 다음 진행, 필요한 선택 |
| `[data-act=prep][data-action]` | 네 준비 행동 중 하나 선택 |
| `[data-teacher=peek]` | 선생님용 핵심 능력 보기 |
| `[data-word]` | 소원 낱말 선택 |
| `.grade[data-grade]` | shine/fine/near 결과 |
| `[data-act=skip]`, `[data-act=staff]` | 컷신 생략, 난간 타격. 타격 전 skip은 없음 |
| `[data-act=inspect-picture]` | 잘린 부분을 포함한 구슬 그림 살피기 |
| `[data-act=check]`, `[data-act=revise]`, `[data-act=save-image]` | 맞대기 확정, 해석 한 번 수정, PNG |
| `[data-help]`, `[data-teacher=fill]`, `[data-teacher=show]` | 학생 도움과 선생님 정답 도움 |
| `[data-tool]`, `[data-set]`, `.toast` | 도구·설정·알림. mode 설정은 없음 |
| `G.app.current()` | scene/ch/kind/step/revisit/autoAdvance/data |
| `list`, `canOpen(id)`, `open(id)`, `resume` | 목록, 접근 판정, 열기, 재개 |
| `G.app.on('settings', fn)` | 설정 반영 중 인자 없이 동기 호출. 도구 권한을 갱신한 뒤 현재 장면의 접근 권한을 즉시 다시 검사 |
| `ledgerRows`, `wishes`, `renderPage` | 장부 14행, 소원 표시 정보, 마지막 장 캔버스 |
| `G.dream.can(tab)`, `open(tab)` | board/house/bonds/wishes/pearls 탭 접근·표시 |
| `G.audio.now`, `via`, `hushed` | 곡, rec/element/synth 경로, 화면 접기 정지 여부 |

wishes의 각 항목은 id·name·fill(0~1)·hidden·half·parts·sources 등의 표시 정보를 제공한다. 장면이 없으면 current는 null이다. 열 수 없는 id는 알림과 재개 경로로 처리하며, 잠긴 꿈 도구를 학생에게 보여 주지 않는다.

선생님용을 끄면 열려 있던 꿈 도구도 현재 권한에 맞춰 갱신한다. 이미 만든 단추·탭의 콜백은 현재 권한을 다시 확인한다. 허용된 본문·입력은 유지하고 잠긴 꿈 장면은 설정판을 닫기 전에 재개 위치로 이동한다.

## 검사 실행 규약

`node tests/run-all.mjs`는 명시된 아홉 검사를 순서대로 실행한다. 실패하면 이후 검사를 멈추며 종료 1, 모두 성공하면 종료 0이다. ONLY 환경 변수나 생략 인자를 허용하지 않고 ffmpeg가 없으면 실패한다. 원본 출력은 `tests/shots/run-all-<시각>.log`에 저장한다.

개별 검사는 `node tests/check-<이름>.mjs`로 실행한다. 환경 변수 FFMPEG는 음량 도구 경로다. 개별 bgm 검사의 --no-lufs는 개발 중에만 쓸 수 있으며 완료 증거가 아니다. 화면 검사는 로컬 임의 포트에서 설치된 Chrome을 연다. 빈 검사 대상이나 실행하지 못한 단정을 통과로 세지 않는다.

## 음원 표시

국립국악원 「디지털 이음」과 공공누리 제1유형, 퉁소를 단소로 대신했다는 안내를 처음 화면·설정·README에 표시한다. 화면 출처 글은 11px 이상이고 명암비 4.5 이상이어야 한다. 곡별 악구 번호는 음원 데이터에 유지한다.
