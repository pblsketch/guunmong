# 바깥에 내놓는 약속

이 게임에는 서버 API가 없다. 바깥 사람·도구가 기대는 접점은 주소 인자, 브라우저 저장, 결과 PNG, 내용 데이터 형식, 자동 점검이 기대는 화면 표시와 실행 규약, 음원 출처 표시 의무다. 아래 약속을 바꾸면 그 접점을 쓰는 쪽(교사 안내문, 학생 기기의 저장, 점검 스크립트)도 함께 바뀌어야 한다.

## 공통 규약

- 모든 접점은 같은 출처의 정적 파일과 그 브라우저 안에서 끝난다. 인증이 없고, 누구나 같은 주소로 같은 게임을 연다.
- 실패는 화면을 멈추지 않는다. 열 수 없는 대상, 없는 파일, 못 쓰는 저장소는 알림을 띄우거나 대체 동작으로 넘어간다.

## 주소 인자

쓰는 사람: 교사(수업 안내, 바로가기), 점검 스크립트. `index.html` 뒤에 붙인다. `ch`·`scene`·`teacher`는 한 번 읽은 뒤 주소에서 지워진다(새로 고침해도 다시 쓰이지 않는다). `fixture`는 남는다.

| 인자 | 입력 | 결과 | 안 될 때 |
| --- | --- | --- | --- |
| `teacher` | `1` 또는 `0` | 선생님용을 켜거나 끄고 **저장한다**(다음에 인자 없이 열어도 유지) | 다른 값은 끈 것(`0`)으로 본다 |
| `ch` | `0`~`5` 또는 `R`(소문자 `r`도 됨) | 그 장의 첫 장면을 연다 | 열 수 없으면: 시작한 기록이 있으면 이어 하기 자리로 가며 "아직 열리지 않은 장면이에요…" 또는 "깨어난 뒤에는 꿈으로 돌아갈 수 없어요…" 알림, 기록이 없으면 타이틀 |
| `scene` | 장면 id(예: `s04-geomungo`) | 그 장면을 연다 | `ch`와 같다. 없는 id도 같다 |
| `fixture` | `1`(= `stub`) 또는 영문·숫자·`-`로 된 이름 | `js/data/` 대신 `tests/fixtures/<이름>.js`만 읽고 저장 열쇠를 `guunmong-v1-fixture-<이름>`으로 바꾼다 | 형식에 안 맞는 이름은 무시하고 실제 데이터를 읽는다. 파일이 없으면 "내용 데이터를 아직 불러오지 못했어요" |

`scene`과 `ch`가 함께 있으면 `scene`이 이긴다. 열 수 있는지는 선생님용 여부, 깨어남, 진행에 따라 정해진다(선생님용이면 모두 열린다).

## 브라우저 저장

- 열쇠: `guunmong-v1`(실제 데이터), `guunmong-v1-fixture-<이름>`(임시 데이터). 값은 JSON 객체 하나다. 다른 열쇠는 쓰지 않는다.
- 맨 위 열쇠: 설정 `music`·`sound`·`big`·`teacher`·`mode`(`'first'`|`'review'`) / 진행 `started`·`pos`(장면 id)·`reach`(0~6)·`done`(장면 id → true)·`awake`·`awakeAt` / 기록 `ledger`(활동 id → `{ first: true|false|null, help: null|'student'|'teacher', final }`)·`wrong`·`picks`·`mind`·`items`·`house`·`houseStage`·`bonds`·`bondNotes`·`pearls`·`seenFiction`·`journal`·`interp` / `name` / `startedAt`·`finishedAt`(밀리초 시각) / `v`(1).
- 공개 뒤 학생 기기에 저장이 남으므로, 열쇠 이름과 장면·활동 id는 바꾸지 않는다. 바꾸면 이어 하기와 장부가 옛 기록을 잃는다.
- 저장소를 못 쓰는 환경(사생활 보호 모드 제한 등)에서는 오류 없이 매번 새로 시작한다.

## 결과 PNG

- 결과 화면의 [이 장을 그림으로 저장]을 누르면 브라우저 안에서 캔버스(너비 900px)에 꿈 일지 마지막 장을 그려 내려받는다. 아무 데도 보내지 않는다.
- 파일 이름: `구운몽_꿈일지_<이름>.png`. 이름이 없으면 `이름`, 파일 이름에 못 쓰는 글자(`\ / : * ? " < > |`)는 뺀다.
- 담기는 것: 제목, 이름, 날짜, 물음, 최종 해석, 근거 구절, 고친 흔적(또는 그대로 둔 것), 소원 목록, 구슬.
- 실패: 캔버스를 못 만들면 "이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요." 알림.

## 내용 데이터 형식

쓰는 사람: 코드를 모르는 교사·작가. 형식의 유일한 기준은 `js/data/README.md`다.

- 파일마다 `(window.GUUN = window.GUUN || {}).<이름> = …;` 한 문장으로 값을 적는다. JSON이 아니라 `<script>`로 읽는 `.js`다.
- 파일: people, chapters, board, scenes, wishes, bonds, house, journal, interp, notes, bgm(배경음은 도구가 만든다).
- 파일이 없거나 형식이 틀려도 게임은 멈추지 않는다. 규칙 위반은 브라우저 콘솔의 `[데이터]` 경고와 `G.data.problems`로 나타난다.

## 자동 점검이 기대는 표시

쓰는 사람: `tests/check-*.mjs`. 이 표시를 지우거나 이름을 바꾸면 점검이 진행하지 못하고 실패한다.

| 표시 | 뜻 |
| --- | --- |
| `#tray [data-act="next"]` | 지금 눌러야 할 진행 단추 |
| `[data-must]` | 진행하려면 꼭 골라야 하는 단추(인연 잇기, 해석·근거 고르기) |
| `[data-act="check"]`, `[data-act="staff"]`, `[data-act="revise"]`, `[data-act="save-image"]` | 활동 확인, 지팡이로 난간 치기, 해석 한 번 고치기, PNG 저장 |
| `[data-help="memo"\|"answer"]`, `[data-teacher="fill"\|"show"]` | 도움 사다리 단추, 선생님용 정답 단추 |
| `[data-tool="home"\|"toc"\|"settings"\|"fold"\|"dream"]` | 위 막대 단추 |
| `[data-set="music"\|"sound"\|"big"\|"mode"\|"teacher"\|"clear"]` | 설정 판 단추 |
| `.play[data-scene][data-ch][data-kind][data-step]` | 지금 장면과 걸음 |
| `.toast` | 알림(위치를 잰다) |
| `G.app.current()` | `{ scene, ch, kind, step, revisit, data }` |
| `G.app.list()`, `canOpen(id)`, `open(id)`, `resume()`, `ledgerRows()`, `wishes()`, `renderPage()` | 장면 목록, 열기 문, 장부 행, 소원 상태, 마지막 장 캔버스 |
| `G.dream.can(tab)`, `G.dream.open(tab)` | 꿈 보따리 탭(`board`·`house`·`bonds`·`wishes`·`pearls`)을 열 수 있는지 |
| `G.audio.now()`, `via()`, `hushed()` | 지금 곡 이름, 재생 방식(`'rec'`·`'element'`·`'synth'`), 화면 접기로 멈춤 |
| `G.data.problems`, `G.data.missing` | 데이터 규칙 위반, 못 읽은 파일 |
| `G.util.josa(낱말, 쌍)` | 조사 고르기 |

## 점검 스크립트 실행 규약

- `node tests/run-all.mjs`: `tests/check-*.mjs`를 이름순으로 하나씩 돌리고 모두 0이면 0, 하나라도 아니면 1로 끝난다. 새 점검은 `check-<이름>.mjs`로 두고 인자 없이 실행해 0/1로 끝나게 한다.
- 각 점검은 실패마다 `✗ <어디>: <무엇>`을 찍는다.
- 환경 변수: `ONLY`(check-content의 화면 판 이름 일부), `FFMPEG`(check-bgm이 쓸 ffmpeg 경로). 인자: check-bgm의 `--no-lufs`.

## 음원 출처 표시 의무

국립국악원 「디지털 이음」 악구는 공공누리 제1유형이라 출처 표시가 이용 조건이다.

- 타이틀 화면 아랫줄, 설정 판의 '음원 출처', README의 '음원 출처' 절에 국립국악원 「디지털 이음」과 공공누리 제1유형을 적는다. 퉁소 곡을 단소로 대신했다는 것도 함께 적는다.
- 곡마다 쓴 악구 번호는 `js/data/bgm.js`의 `src`에 있다.
- 출처 문구는 화면에서 11px 이상, 명암비 4.5 이상으로 읽혀야 한다.
