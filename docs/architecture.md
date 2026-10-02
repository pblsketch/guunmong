# 시스템 구성

브라우저 하나에서 끝나는 정적 웹 게임이다. 실행 중에 바깥으로 나가는 요청이 없고, 같은 폴더의 정적 파일(HTML·CSS·JS·webp·mp3·woff2)만 읽는다. 저장소에는 게임 본체 말고도 자산을 만드는 도구(`tools/`)와 자동 점검(`tests/`)이 함께 있으며, 이 둘은 게임이 실행될 때 전혀 쓰이지 않는다.

## 런타임 구성 요소와 의존 방향

모든 코드는 전역 이름공간 `G` 아래에 붙고, 내용 데이터는 `window.GUUN` 아래에 붙는다. 모듈 시스템이 없으므로 **`index.html`의 `<script>` 순서가 곧 의존 순서**다. 뒤에 읽히는 파일만 앞 파일을 쓸 수 있다.

```
js/data/*.js  ──(window.GUUN)──▶  js/core/  ──▶  js/game/app.js  ──▶  js/game/<화면 모듈>  ──▶  js/main.js
 순수 데이터                      엔진 부품        장 흐름·확장 지점      확장 지점에 끼워 넣음      시작
```

| 구성 요소 | 하는 일 | 기대는 것 |
| --- | --- | --- |
| `js/data/*.js` (11개) | 장면·말판·소원·인연·집·일지·해석·노트·인물·장 안내·배경음 배정을 `window.GUUN.<이름>`에 적는다 | 아무것도 없음(`G`를 부르지 않는다) |
| `js/core/util.js` → `G.util` | 요소 만들기, 씨앗 섞기, 조사 고르기, 도트 그림 정수배 맞추기 | 없음 |
| `js/core/save.js` → `G.save` | 진행 상태 한 덩이를 localStorage에 쓰고 읽음, 장부 기록 | util |
| `js/core/data.js` → `G.loadData`, `G.checkData`, `G.data` | 데이터 파일을 `<script>`로 읽고 규칙 위반을 `G.data.problems`에 모음 | util |
| `js/core/audio.js` → `G.audio` | 배경음(녹음 → 합성 대체)과 합성 효과음 | `G.data.bgm`, save |
| `js/core/text.js` → `G.text` | 글 표기(原文·풀이·게임 설정·이본 노트·해석·인물 말)를 화면 요소로 | `G.data.people`, save |
| `js/core/ui.js` → `G.ui` | 알림, 풍선 도움말, 아래 판(시트), 아이콘, 화면 접기 | audio |
| `js/core/activity.js` → `G.activity` | '읽고 골라 넣기' 활동 한 틀과 도움 사다리·장부 기록 | text, save, ui, audio |
| `js/game/app.js` → `G.app` | 장 흐름, 열기 문(`canOpen`), 이어 하기, 깨어남 기록, 목차·설정, 기본 화면들, 확장 지점 | core 전부 |
| `js/game/board.js` → `G.board`, `G.dream` | 승경도 말판과 말 걷기, 소원 목록, 꿈 화면들이 같이 쓰는 도구(`G.dream`) | app |
| `js/game/house.js` → `G.house` | 집 단계와 물건 놓기(`steps.item`을 바꿔 끼움) | app, `G.dream` |
| `js/game/pearl.js` | 숨은 구슬(`steps.pearl`) | app, `G.dream` |
| `js/game/bag.js` | 위 막대의 꿈 보따리(말판·집·인연첩·소원·구슬) | app, `G.dream` |
| `js/game/wake.js` | 3장 지팡이 장면(`screens.waking`) | app, board, house, `G.dream` |
| `js/game/journal.js` | 4장 꿈 일지(`screens.journal`) | app, activity, `G.dream` |
| `js/game/interp.js` | 5장 해석 고르기(`screens.interp`) | app |
| `js/game/result.js` | 결과 화면과 마지막 장 PNG(`screens.result`) | app, interp가 내놓는 함수, `G.dream` |
| `js/main.js` | 소리 잠금 풀기, 데이터 읽기 → 저장 읽기 → `G.app.boot()` | 위 전부 |

- `js/core/`는 `G.app`·`G.dream`을 한 번도 부르지 않는다. 화면 모듈은 `app.js`를 고치지 않고 확장 지점(`screens`·`steps`·`hook`·`on`·`toolbar`)으로만 끼어든다.
- `G.dream`은 `board.js`가 만든다. house·pearl·bag·wake·journal·result는 파일을 읽는 순간 `G.dream`을 잡아 두므로 `board.js`가 이들보다 앞에 있어야 한다.

## 데이터 읽기

1. `data.js`가 `FILES` 목록(people, chapters, board, scenes, wishes, bonds, house, journal, interp, notes, bgm)대로 `<script>`를 `async=false`로 붙인다. 못 읽은 파일은 `G.data.missing`에 남기고 그대로 넘어간다. 장면이 하나도 없으면 타이틀에 "내용 데이터를 아직 불러오지 못했어요"가 뜨고 시작 단추가 꺼진다.
2. 주소에 `?fixture=<이름>`이 있으면 `js/data/` 대신 `tests/fixtures/<이름>.js` 하나만 읽고(`1`은 `stub`), 저장 열쇠도 따로 쓴다.
3. 읽은 뒤 `G.checkData()`가 데이터 규칙(미색을 채우는 항목, 인연의 채움, 떨어지는 말판 칸, 구슬 위치, 활동 틀 등)을 확인해 `G.data.problems`에 모은다. 게임은 멈추지 않고 경고만 남기며, 자동 점검이 이 목록이 비었는지 본다.

JSON을 `fetch`하지 않고 `<script>`로 읽는 까닭은 `index.html`을 파일로 바로 열었을 때(`file://`)도 동작해야 하기 때문이다.

## 한 판의 흐름 (처음 시작부터 결과까지)

1. **시작**: `main.js`가 첫 터치·키 입력에 소리 잠금을 풀도록 걸어 두고, http(s)일 때만 `manifest.webmanifest` 링크를 붙인다. `G.loadData()` → `G.save.load()` → `G.app.boot()`.
2. **boot**: `?teacher=1/0`을 상태에 저장한다. 바로가기 인자(`ch`·`scene`·`teacher`)는 `history.replaceState`로 주소에서 지운다(`fixture`만 남김). `?scene`·`?ch` 대상이 `canOpen`을 통과하면 그 장면을, 못 통과하면 이어 하기 자리로 가며 알림을 띄우고, 둘 다 없으면 타이틀을 띄운다.
3. **새로 시작**: 이미 시작한 기록이 있으면 확인 판 → `G.save.reset()`(설정 다섯 개만 남김) → `reset` 사건 → 읽기 방식 고르기(닫을 수 없는 판) → 첫 장면 `play()`.
4. **`play(id)`**: 마친 장면이 아니면 `pos`·`reach`를 저장한다. `history.pushState({ scene })`, 곡은 `scene.bgm` → `chapters[ch].bgm` → 장별 기본 곡 순서로 고른다. 위 막대(처음 화면·`toolbar` 단추들·목차·설정·화면 접기)와 아래 판(`#tray`)이 있는 화면을 그리고 `ctx`를 만들어 `scene` 사건을 낸다.
5. **장 첫머리**: 그 장의 첫 장면이고 다시 여는 것이 아니면 장 카드(안내, 처음 읽기면 지난 이야기, 게임 설정 카드) → [펼치기] → `hook('chapter')`. 2장에서는 여기서 말이 출발 칸(수주현)에서 첫 칸으로 걷는다.
6. **장면 화면**: `screens[scene.kind]`, 없으면 `screens.scene`. 기본 장면 화면은 `scene.flow` 또는 `G.app.flow` 순서(read → activity → mind → item → bond → pearl)로 `steps`를 차례로 부른다. 각 걸음은 [다음]을 누를 때까지 기다린다.
7. **장면 마침**: `done` 사건 → 다시 여는 중이면 이어 하기 자리로. 아니면 `done[id] = true`와 함께 `pos`·`reach`를 다음 장면으로 먼저 저장 → `hook('between')`(두 장면 모두 말판 칸이 있으면 말이 다음 칸으로 걷고, 벼슬 칸이면 교지 카드) → 장이 바뀌면 `chapter` 사건 → 다음 장면 `play()`. `pos`를 걷기 전에 저장하므로 걷는 화면에서 새로 고침·탭 닫기·처음 화면으로 가도 다음 장면 처음부터 이어 한다.
8. **3장**: 취미궁 잔치·호승 장면을 지나 `c3-staff`(`kind: 'waking'`)에서 지금까지 쌓은 것(말판·벼슬·집·인연첩)과 남을 것(소원·구슬)을 한 화면에 늘어놓는다 → [계속] → 땅을 두드리며 다가오는 소리(아직 꿈) → 음악이 멎고 [지팡이가 돌난간을 친다] → 누르는 순간 `G.app.wake()`가 깨어남을 저장하고 `wake` 사건을 낸다 → 흰 구름이 덮었다 걷히며 쌓은 것이 사라지고 채도를 낮춘 빈 선방이 남는다. 다음 장면 `c3-awake`(`awakened: true`)가 깨어난 뒤 이어 하기의 기준점이다.
9. **4장·5장·결과**: 꿈 일지 화면(묶음 확정 맞대기 → 해석 짝 → 인연 잇기 → 구슬과 팔선녀), 해석 화면(대사의 응답 전에 고르기 → 응답 → 한 번 고치기), 출가 장면, 결과 화면. 결과 화면은 끝나지 않는 화면이며 마지막 장을 캔버스로 그려 PNG로 내려받게 한다.

## 열기 문

목차, 주소 바로가기, 뒤로/앞으로 가기, `G.app.open()`이 모두 `G.app.canOpen(id)` 하나를 지난다.

- 선생님용이면 모두 열린다.
- 깨어난 뒤 0~3장 가운데 깨어난 선방(`awakened: true`) 앞 장면은 닫힌다.
- 마친 장면은 열리되 '다시 여는 중'(`ctx.revisit` = `ctx.readonly`)으로 열려 기록을 바꾸지 않는다.
- 그 밖에는 지금 자리(`pos`)와 이어 하기 자리만 열린다.

뒤로 가기로 닫힌 장면에 가려 하면 알림을 띄우고 지금 장면을 다시 기록에 쌓아 그 자리에 머문다. 브라우저가 예전 화면을 캐시에서 되살리면(`pageshow`의 `persisted`) 저장소를 다시 읽고 지금 화면을 다시 판단한다.

## 저장

`G.save.state` 한 덩이가 진행·기록·설정을 모두 담고, 바뀔 때마다 통째로 직렬화해 localStorage 열쇠 `guunmong-v1`(임시 데이터로 열면 `guunmong-v1-fixture-<이름>`)에 쓴다. 읽을 때는 `Object.assign(fresh(), 저장된 것)`이라 새로 생긴 맨 위 열쇠는 기본값으로 채워진다. 저장소를 못 쓰는 환경에서는 예외를 삼키고 매번 새로 시작한다.

## 소리

| 상황 | 배경음 재생 방식 |
| --- | --- |
| http(s)로 열림 | 같은 폴더의 mp3를 `fetch` → Web Audio로 반복(최근 세 곡만 풀어 둠) |
| 파일로 열림(`file://`) | 브라우저가 `fetch`를 막으므로 `<audio>` 요소로 곧장 재생 |
| 녹음을 못 받음 | 곡 데이터의 `synth` 이름으로 브라우저에서 합성한 가락 |

효과음은 언제나 합성이다. 배경음과 효과음은 각각 다른 소리 길(버스)을 거쳐 따로 끄고, 화면 접기는 둘 다 멈춘다. 탭이 가려지면 소리 맥락을 멈춘다.

## 표시

- 글은 `G.text`가 데이터의 덩이(`{ orig, gloss }`, `{ gloss }`, `{ say }`, `{ text }`, `{ mark }`)와 줄 안 표기(`**굵게**`, `{호칭|인물id}`, `[[칸id]]`)를 읽어 그린다.
- 도트 그림은 `G.util.pixImg`·`G.dream.picture`가 **기기 픽셀 기준 정수배(또는 1/정수배)**로만 크기를 정하고, 창 크기가 바뀌면 다시 맞춘다. 그림이 없으면 같은 자리에 임시 바탕을 둔다.
- 글꼴은 세 개의 부분 글꼴(GuunPixel = 갈무리, GuunSerif = Noto Serif KR, GuunOld = Noto Serif KR의 한자 부분)이고, 글자가 없으면 CSS의 대체 글꼴로 내려간다.

## 경계: 기기 밖으로 무엇이 나가는가

- 나가는 것: 없다. 분석 도구, 외부 글꼴·CDN, 원격 요청이 없다. 학생 이름도 localStorage에만 있다.
- 사용자 손에 남는 것: 결과 화면에서 학생이 직접 누를 때 내려받는 PNG 한 장(`구운몽_꿈일지_<이름>.png`).
- 들어오는 것: 같은 출처의 정적 파일뿐이다.

## 만드는 도구와 점검

게임 파일은 손으로 쓰는 것(`js/`, `css/`, `index.html`)과 도구가 만드는 것으로 나뉜다.

```
그림   tools/make_prompts.py ─▶ tools/prompts/*.txt + tools/manifest_*.tsv
         ─▶ tools/genqueue.ps1 ─▶ tools/gen.ps1(Codex CLI 이미지 생성) ─▶ assets/raw/*.png (커밋 안 함)
         ─▶ tools/process_assets.py · process_sprites.py (pixlib: 크로마 키 빼기, 가운데 자르기, 면적 평균, 32색)
         ─▶ assets/{sc,pt,board,house,items,ui}/*.webp ─▶ tools/check_assets.py · make_review.py(design/review/)
배경음 tools/music_src/*.wav (국립국악원 악구, 커밋 안 함) ─▶ tools/make_bgm.py(ffmpeg) ─▶ assets/bgm/*.mp3 + js/data/bgm.js
글꼴   tools/fonts_src/*.ttf (커밋 안 함) + js/**/*.js·index.html·manifest의 글자 ─▶ tools/build_fonts.py ─▶ assets/fonts/*.woff2 + OFL.txt
점검   tests/run-all.mjs ─▶ check-*.mjs 하나씩(각자 127.0.0.1 임의 포트에 작은 정적 서버 + 설치된 Chrome)
```

## 바깥 의존

| 쓰는 때 | 무엇 |
| --- | --- |
| 게임 실행 | 없음(브라우저만) |
| 그림 만들기 | Codex CLI 이미지 생성(로그인된 `~/.codex/auth.json`), Python(Pillow, numpy, scipy), PowerShell |
| 배경음 만들기 | 국립국악원 「디지털 이음」 악구 WAV(이미 받아 둔 것), ffmpeg, numpy |
| 글꼴 만들기 | 갈무리·Noto Serif KR 원본(없으면 GitHub에서 받음), fontTools(woff2 압축 포함) |
| 점검 | Node, `tests/package.json`의 playwright, 설치된 Google Chrome, git, (있으면) ffmpeg |
