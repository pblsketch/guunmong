# 규칙

## 완료 조건

- `tests/`에서 `node run-all.mjs`가 **종료 코드 0**으로 끝나야 완료다. 여섯 점검(check-assets, check-bgm, check-content, check-dream, check-engine, check-rights) 가운데 하나라도 1이면 완료가 아니다.
- master에 합치기 전, 공개용으로 내보내기 전에 전체를 돌린다. `ONLY=`나 `--no-lufs`로 일부만 돌린 결과는 완료 근거가 아니다.
- 점검을 통과시키려고 점검의 기준을 낮추지 않는다. 기준을 바꿔야 한다면(예: 原文 대조를 마쳐 原文 표시가 생김) 그 까닭이 되는 데이터 변경과 같은 커밋에서 바꾼다.

## 의존성과 실행 환경

- 게임은 빌드 없이 돈다. 번들러, 프레임워크, npm 패키지, CDN 스크립트, 바깥 글꼴을 게임에 들이지 않는다. 바깥 주소로 가는 요청이 하나라도 생기면 그림 점검이 실패한다.
- `index.html`을 파일로 바로 열어도(`file://`) 시작·저장·소리가 되어야 한다. 그래서 데이터는 JSON `fetch`가 아니라 `<script>`로 읽고, 모듈(`import`)을 쓰지 않는다.
- npm 의존은 `tests/package.json`의 playwright 하나뿐이다. 점검은 playwright가 내려받는 브라우저가 아니라 설치된 Google Chrome(`channel: 'chrome'`)을 쓴다.

## 스크립트 순서와 모듈 경계

- `index.html`의 순서: `js/core/`(util → save → data → audio → text → ui → activity) → `js/game/app.js` → 화면 모듈(board → house → pearl → bag → wake → journal → interp → result) → `js/main.js`. 새 화면 모듈은 `app.js` 다음, `main.js` 앞에 넣는다. `board.js`는 `G.dream`을 만들므로 그것을 쓰는 모듈보다 앞이다.
- `js/data/`의 파일은 `window.GUUN.<이름>`에 값을 적는 일만 한다. `G`를 부르거나 함수·getter를 두지 않는다. 그림·배경음·내용 점검이 브라우저 없이 node에서 이 파일들을 그대로 실행해 읽는다.
- `js/core/`는 `G.app`·`G.dream`·`G.board`·`G.house`를 부르지 않는다.
- 화면 모듈은 `G.app.screens`·`steps`·`hook`·`on`·`toolbar`로만 흐름에 끼어든다. 화면 하나를 더하려고 `app.js`의 흐름 코드를 고치지 않는다.
- 임시 데이터는 `tests/fixtures/`에만 둔다. `js/data/`에 임시 데이터나 `(임시)`·`TODO`라는 글자를 두면 내용 점검이 실패한다.

## 데이터 형식

- 내용 데이터의 형식은 `js/data/README.md` 하나가 기준이다. 새 항목은 그 문서에 먼저 적고 쓴다.
- 데이터 파일을 더하면 `js/core/data.js`의 `FILES`, `js/data/README.md`의 파일 표, `tests/check-assets.mjs`가 읽는 데이터 파일 목록을 함께 고친다.
- 데이터 규칙은 `G.checkData()`가 확인하고 결과 목록(`G.data.problems`)은 비어 있어야 한다. 규칙의 내용을 코드에서 따로 우회하지 않는다. 데이터 규칙을 하나 더하면 `G.checkData()`에 확인을 더한다.
- 장면 id(`c<장>-…`, `s<두 자리>-…`), 활동 id(`a-…`), 말판 칸(`sq-…`), 물건(`it-…`), 게임 설정 카드(`fc-…`), 일지 짝(`j-…` 채점, `h-…` 해석)의 접두를 지킨다. 공개한 뒤에는 장면·활동 id를 바꾸지 않는다(학생 기기의 저장이 id로 기록을 가리킨다).

## 생성 파일

| 파일 | 만드는 것 | 손으로 고치면 |
| --- | --- | --- |
| `js/data/bgm.js` | `tools/make_bgm.py` | 다음 실행 때 통째로 덮어쓰인다. 곡 배정·출처를 바꾸려면 스크립트의 `TRACKS`를 고친다 |
| `assets/bgm/*.mp3` | `tools/make_bgm.py` | 음량 기준(-20 LUFS ±2, 봉우리 -0.5 dBTP 아래)을 벗어나면 배경음 점검이 실패한다 |
| `assets/fonts/*.woff2`, `OFL.txt` | `tools/build_fonts.py` | 글자 목록이 어긋난다 |
| `assets/{sc,pt,board,house,items,ui}/*` | `tools/process_assets.py`, `tools/process_sprites.py` | 32색·무손실 webp·크기 점검이 깨질 수 있다 |

- 화면에 보이는 글(데이터, 화면 문구, 출처 문구)을 바꾸고 새 글자가 생겼다면 **같은 커밋에** `python tools/build_fonts.py`로 만든 글꼴을 함께 넣는다.

## 글

- 모든 풀이·대사·설명은 새로 쓴다. 교과서·지도서·번역서 문장을 쓰지 않고, 교과서 본문과 15자 이상 이어서 같은 글을 어느 추적 파일에도 두지 않는다.
- 조사를 두 꼴로 함께 찍지 않는다(`을(를)`, `이(가)`, `은(는)`, `와(과)` 금지). 앞말이 바뀌는 자리는 `G.util.josa(낱말, '을/를')`로 고른다. 데이터·엔진 글에 두 꼴이 있으면 내용 점검이 실패한다.
- 얼굴 그림이 없는 인물(`people`에서 `noFace: true`)은 `say`나 `{호칭|id}`로 가리키지 않고 이름만 이야기 글에 쓴다. 표정 이름은 그 인물의 표정 목록에 있는 것만 쓴다.
- 原文 덩이(`orig`)와 활동의 `passageKind: 'orig'`는 영인 대조를 마친 글에만 쓴다. 대조 전 회목은 `{ hoe, part, gloss, status: '대조 대기' }`로 두고, `orig`와 `status`를 함께 두지 않는다.

## 화면

- 도트 그림은 `G.util.pixImg` 또는 `G.dream.picture`로만 놓는다. 크기를 CSS 비율(`width: 100%` 등)로 정하지 않고, 부드럽게 보간하지 않는다(`image-rendering: pixelated`). 보이는 도트 그림의 배율이 기기 픽셀 기준 정수배(또는 1/정수배)가 아니면 그림 점검이 실패한다.
- 흐린 글씨는 `--ink-3`(`#6a5a47`)보다 밝게 하지 않는다. 한지 바탕에서 명암비 4.5 이상이어야 하고, 출처 문구는 11px 이상이어야 한다.
- 알림은 `G.ui.toast()`로만 띄운다. 알림이 읽는 글 칸이나 진행 단추(`#tray`)를 가리면 내용 점검이 실패한다.
- 진행 단추는 `ctx.next()`가 `#tray`에 만든다(`data-act="next"`). 꼭 골라야 하는 단추에는 `data-must`를 붙인다. 점검이 이 표시로 진행한다.
- 그림에는 글자를 넣지 않는다. 인물은 당나라 옷을 입는다. 그림마다 32색 이하, 무손실 webp(아이콘만 png)다. 현실(연화봉) 장면은 꿈 장면보다 채도를 낮춘다.

## 기록과 잠금

- 상태는 `G.save.state`를 고친 뒤 `G.save.write()`로만 저장한다. 다른 localStorage 열쇠를 만들지 않는다.
- 장면 걸음과 화면은 `ctx.readonly`가 참이면 장부·마음·물건·집·인연·구슬·해석 기록을 하나도 바꾸지 않는다.
- 장면을 여는 모든 길은 `G.app.canOpen()`을 지난다. 깨어남은 `G.app.wake()`로만 기록하고, `awake`를 다른 곳에서 바꾸지 않는다(`G.save.reset()`만 지운다).
- 채점하지 않는 활동은 `scored: false`로 두고 장부에 넣지 않는다. 인연·구슬은 장부 행이 되지 않는다.

## 커밋과 브랜치

- 커밋 글은 한국어로 쓴다. 커밋 글에도 금지된 두 이름(교과서 출판사 이름과 교사 자료 사이트 이름)을 쓰지 않는다. 권리 점검은 커밋 글까지 본다.
- `.gitignore`가 빼는 것(기획 문서 폴더, `design/source/`, `assets/raw/`, `tools/fonts_src/`, `tools/music_src/`, `tests/node_modules`, `tests/shots/`, `.claude/`, `.omc/`)을 `git add -f`로 넣지 않는다.
- 일은 master에서 하거나 작업 가지에서 하고 `Merge …` 커밋으로 master에 합친다. 합치기 전에 완료 조건을 확인한다.

## 사용자 확인이 필요한 바깥 행동

다음은 할 때마다 사용자에게 먼저 묻고, 답을 받은 뒤에만 한다: GitHub 저장소 만들기·올리기·Pages 켜기, 국립국악원 내려받기 양식 제출, 프로그램 설치(예: 국립중앙도서관 뷰어), 교사 자료 사이트 접속(로그인은 사용자가 직접). 비밀번호는 대신 입력하지 않는다. 새로 만든 그림은 게임에 넣기 전에 사용자에게 먼저 보여 준다.
