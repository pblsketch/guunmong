# tools — 그림·배경음·글꼴을 만드는 도구

## 맡는 것
| 도구 | 하는 일 | 결과 |
| --- | --- | --- |
| `make_prompts.py` | 그림 프롬프트(영어)와 생성 목록, 인물 참조 묶음(`ref#n`) | `prompts/*.txt`, `manifest_*.tsv` |
| `genqueue.ps1` | 생성 목록을 최대 N개씩 동시에 `gen.ps1`로 | `assets/raw/<이름>.png` |
| `gen.ps1` | Codex CLI 이미지 생성 한 장(임시 `CODEX_HOME`, 참조 모드) | 생성 원본 한 장 |
| `pixlib.py` | 크로마 키 빼기, 가운데 자르기, 면적 평균 줄이기, OKLab 가중 32색, 프레임 나누기 | (라이브러리) |
| `process_assets.py` | 장면·초상·말판·집·물건·화면 장식·제목·아이콘 가공, 구슬 직접 찍기 | `assets/{sc,pt,board,house,items,ui}/` |
| `process_sprites.py` | 말 걷기 시트(32×32 칸 6열×4줄, 발밑 (16,30)) | `assets/board/horse_walk*.webp` |
| `process_sim_assets.py` | manifest_sim96의 셀 크기·발 기준으로 동작과 아이콘 후보 가공 | assets/raw/sim-v2/candidates96 및 검토판 |
| `manifest_sim96.json` | 승인 제품과 생성 원본·프롬프트·해시 연결 | 재가공·정적 검사 기준 |
| `check_assets.py` | 승인 자산 204개의 경로·크기·32색·무손실·승인 해시 | 종료 코드 |
| `make_topdown_prompts.py`, `generate_topdown_candidates.py`, `process_topdown_candidates.py` | 탑다운 원본·후보 가공과 검토판 | assets/raw/topdown-v3의 보존 자료 |
| `topdown_approved.py`, `rpg_npc_approved.py`, `rpg_disguise_approved.py` | 각 approved manifest의 승인 제품·원본 검증 | 승인 해시·메타 대조 |
| `process_rpg_v4.py`, `rpg_v4_approved.py` | v4 후보(장소 14·선녀 7·NPC 14·물건 8)를 assets/raw/rpg-art-v4에 가공·검토판, 승인 설치(--install 한 번)와 제품 검증 | 후보·검토판, manifest_rpg_v4_approved.json |
| `process_rpg_npcs.py`, `check_topdown_products.mjs` | 정지 NPC 후보 가공, 실제 제품 HTTP·프레임·정수배 확인 | 후보 및 검사 출력 |
| `make_review.py` | 사용자 확인용 모아 보기 | `design/review/` |
| `make_bgm.py` | 국립국악원 악구 WAV를 이어 곡으로, 음량 맞추기 | `assets/bgm/*.mp3`, `js/data/bgm.js` |
| `build_fonts.py` | 게임에 쓰인 글자만 남긴 부분 글꼴 | `assets/fonts/*.woff2`, `OFL.txt` |

## 맡지 않는 것
- 게임 실행 코드(`js/`, `css/`, `index.html`)와 점검(`tests/`)은 여기서 고치지 않는다.
- 원본(`assets/raw/`, `fonts_src/`, `music_src/`)은 git에 넣지 않는다. `.gitignore`가 뺀다. `git add -f` 금지.
- 사용권이 확인되지 않은 그림·음원·글꼴을 원본으로 들이지 않는다(그림은 승인된 Codex CLI 및 내장 image_gen 생성, 소리는 「디지털 이음」 공공누리 제1유형, 글꼴은 SIL OFL).

## 지켜야 할 것
- 보존된 생성 경로는 CLI와 내장 image_gen을 모두 포함한다. 실제 경로·프롬프트·참조·원본·승인 해시를 자산 묶음별로 보존하며 CLI로 만들지 않은 원본을 CLI 이력으로 바꾸지 않는다.
- 프롬프트는 영어 ASCII만. 그림에 글자를 넣지 말라는 문구(`NOTEXT`)와 당나라 옷 문구(`TANG`)를 뺀 프롬프트를 만들지 않는다.
- 생성 크기를 믿지 않는다. Codex는 요청한 크기를 무시하기도 한다(1536×1024 요청 → 1672×941). 가공은 언제나 목표 비율로 가운데를 자른 뒤 줄인다. 프롬프트는 가장자리가 잘린다고 보고 중요한 것을 가운데 80% 안에 두게 쓴다.
- 크로마 키: 기본 마젠타(#FF00FF), 보라·분홍 옷이 든 시트(적경홍 초상, 선녀 시트 b, `horse_walk_sang`)는 초록(#00FF00). 프롬프트 쪽(`make_prompts.py`의 `KEY_GREEN`)과 가공 쪽(`process_assets.py`·`process_sprites.py`의 시트 표)이 같은 키여야 한다. 버들 초록 옷(진채봉)이 든 시트에 초록 키를 쓰지 않는다.
- 게임 그림은 32색 이하(투명 그림은 31색 + 투명), 무손실 webp(아이콘만 png). 장면 480×270, 초상 96×96, 말 시트 192×128(32px 셀), 준비·지팡이 시트 384×96(96px 셀 4개), 능력·자원 아이콘 32×32, 집 단계별 너비 320·480·640·800 × 높이 200, 구판 말판 320×480. 승인 탑다운 장소는 384×320, 걷기는 32px 셀 5열×4행(160×128), 정지 NPC는 32px 한 셀이다. 걷기 발은 (16,30), 정지 NPC는 (16,32)이며 지팡이 96px와 혼동하지 않는다.
- 16px 안팎의 아주 작은 그림은 생성해 줄이지 않고 코드로 찍는다(`beads()`).
- `gen.ps1`의 임시 `CODEX_HOME`(최소 설정 세 줄 + `auth.json` 복사본) 방식을 유지한다. 전역 설정을 쓰면 시작이 몇 분씩 멈춘다. 생성을 마치면 `%TEMP%\codex-img-guun-*`를 지운다(자격 증명 복사본).
- `make_bgm.py`는 몇 곡만 만들 때도 `js/data/bgm.js` 전체를 다시 쓴다. 곡 배정·출처는 `TRACKS`에서 고친다. 곡마다 -20 LUFS, 봉우리 -1.5 dBFS 아래, 모노 44.1kHz MP3 80kbps. 퉁소 곡(`tungso`·`chwimi`)은 단소 「청성곡」이며 출처 문구에 그렇게 적는다.
- `build_fonts.py`는 `js/**/*.js`, `index.html`, `manifest.webmanifest`의 글자만 모은다. GuunOld는 한자와 몇몇 부호만 담는다(옛한글 자모 없음). 부분 글꼴 이름은 OFL에 따라 `Guun…`으로 바꾼다.
- 새로 만든 그림은 모아 보기로 사용자에게 먼저 보여 준 뒤에만 `assets/`에 넣는다.

현재 204개는 기존 141개·탑다운 16개·NPC 3개·여도사 걷기 1개·v4 43개(장소 14·선녀 7·NPC 14·물건 8, tools/manifest_rpg_v4_approved.json)다. 탑다운 16개에는 승인 후보 그대로 8개와 키트에서 픽셀 변경 없이 분리한 칸 8개가 포함된다. `manifest_topdown_v3.json`의 미승인 후보 목록과 세 approved manifest를 구분한다.

## 동작 시트와 원본 보존

- 준비 네 동작은 공통 배율과 발 기준을 유지한다. 호승은 0기준 2번이 올림, 3번이 타격이다. 셀 순서를 바꾸면 화면의 멈춤·타격과 어긋난다.
- 32px 동작을 확대하면 얼굴·손·소품이 사라져 2026-10-03 비교 후 96px로 정했다. 화면 표시를 크게 늘리는 대신 원본 정보를 보존한 선택이다.
- `python tools/process_sim_assets.py --manifest tools/manifest_sim96.json`은 후보를 만들며 제품을 덮어쓰지 않는다. `--check`로 크기·색·프레임을 확인한다.
- 제품 복사 전 후보를 보여 승인받고 sprites 메타·정적 검사·해시를 함께 맞춘다. 원본과 32/96 후보·검토판은 assets/raw/sim-v2에 남긴다. 작업 폴더 정리 전에 원본이 보존됐는지 확인한다.
- 원본 프롬프트의 32px 표현은 실제 생성 요청 이력이다. 최종 가공 규격이 96px라는 이유로 그 기록을 고쳐 쓰지 않는다.

## 확인
- 그림: `python tools/check_assets.py` → 0, `python tools/make_review.py`로 모아 보기 → 사용자 확인 → `cd tests; node check-assets.mjs`(정수배·파일·바깥 요청).
- 배경음: `cd tests; node check-bgm.mjs`(ffmpeg가 있어야 음량까지 잰다. 출력에 곡별 LUFS 표가 있어야 함).
- 글꼴: 스크립트 출력의 "글꼴에 없는 글자 N개"를 본다. 자동 점검은 글자 빠짐을 보지 않는다.
- 마지막에 `cd tests; node run-all.mjs`.
