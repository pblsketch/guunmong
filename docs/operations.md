# 운영

모든 명령은 Windows의 저장소 맨 위(`E:\github\고전 문학 게임\구운몽`)에서 실행한다고 가정한다. 경로에 공백과 한글이 있으므로 경로는 언제나 따옴표로 감싼다.

## 준비물

| 무엇 | 필요한 일 | 없으면 |
| --- | --- | --- |
| 브라우저 | 게임 실행 | — |
| Python 3 | 로컬 서버, 자산 도구 | 파일로 열기만 가능 |
| Node 20 이상 + npm | 자동 점검 | 점검 불가 |
| Google Chrome(설치본) | 자동 점검(playwright가 `channel: 'chrome'`으로 연다) | 점검이 브라우저를 못 띄움 |
| git | 권리 점검 | 권리 점검 실패 |
| ffmpeg | 배경음 만들기, 배경음 음량 점검 | 전체 점검 시작 단계에서 실패 |
| Python 패키지 Pillow, numpy, scipy | 그림 가공·점검 | 그림 도구 실패 |
| Python 패키지 fonttools, brotli | 부분 글꼴(woff2) 만들기 | 글꼴 도구 실패 |
| Codex CLI(로그인됨, `~/.codex/auth.json`) + PowerShell | 그림 생성 | 그림 생성 불가 |

아래 설치가 필요한 경우 사용자 확인을 받은 뒤 실행한다. 게임 실행에는 이 개발 도구 설치가 필요하지 않다.

```powershell
pip install pillow numpy scipy fonttools brotli
cd tests
npm install          # playwright만 설치. 브라우저는 설치된 Chrome을 쓰므로 playwright install은 필요 없다
cd ..
```

## 실행

| 방법 | 명령 | 쓰임 |
| --- | --- | --- |
| 로컬 서버 | `python -m http.server 8767 --bind 127.0.0.1` → http://127.0.0.1:8767 | 평소 확인. 배경음이 Web Audio로 돈다 |
| 파일로 열기 | `index.html` 더블클릭 | `file://`에서도 시작·저장·소리가 되는지 확인. 배경음은 `<audio>`로 돈다 |

주소 바로가기: `?teacher=1`(선생님용 켜기, `0`은 끄기), `?ch=2`(그 장의 첫 장면), `?scene=e03-geomungo`(그 장면), `?fixture=1`(점검용 임시 데이터, 저장도 따로). `ch`·`scene`은 열 수 있을 때만 열린다. 아직 안 연 장면을 보려면 `?teacher=1`을 함께 붙인다.

일반 본편은 fixture 없이 연다. `?fixture=rpg-opening`은 도입 여섯 단위, `?fixture=rpg-waking`은 깨어남 네 단위의 별도 시험 기록이다. 대표 주소·교사 바로가기로 전체 학생 완주를 대신하지 않는다.

같은 저장 열쇠에 한 탭만 진행·저장한다. 다른 탭은 읽기 전용이며 writer를 닫은 뒤 이어 하기로 권한을 요청해 최신 기록을 읽는다. Web Locks가 없거나 권한 요청이 실패하면 저장 가능한 플레이가 열리지 않는다.

## 기록 초기화

- 게임 안: 설정 → 기록 지우기 또는 처음 화면 → 처음부터 새로. 확인 후 화면·대기를 먼저 취소하고 설정 네 개만 남긴 새 회차를 한 번 저장한다. 실패하면 기존 기록을 유지한다.
- 설정까지 지우려면 브라우저 개발자 도구에서 localStorage의 `guunmong-v3`(임시 데이터는 `guunmong-v3-fixture-stub`)을 지운다. 이전 판 기록 `guunmong-v2`는 게임이 지우지 않으므로 필요하면 따로 지운다.

구판 guunmong-v1은 새 판의 초기화가 읽거나 지우지 않는다.

## 자동 점검

게임 실행에는 npm 의존이 없지만 검사는 Node 20 이상, Playwright, 설치된 Chrome, Python 자산 검사 패키지와 ffmpeg를 요구한다. 설치가 필요하면 사용자 확인을 먼저 받는다.

```powershell
node tests/run-all.mjs
node tests/check-content.mjs
node tests/check-sim.mjs
python tools/check_assets.py
```

전체 실행은 ONLY 또는 생략 인자를 거부하고 ffmpeg 경로를 먼저 확인한다. ffmpeg는 FFMPEG 환경 변수, PATH, 사용자 폴더 ffmpeg/bin에서 찾는다. 설치된 Playwright 1.63.0의 Node 요구는 20 이상이며, 이 기기의 검증은 Node 24.15.0에서 수행했다.

| 검사 | 범위 |
| --- | --- |
| check-assets | 승인 자산 204개, 세 화면 크기의 실제 접근·정수배·동작 재생·외부 요청 없음 |
| check-bgm | 18곡의 파일·출처·음량 -20 LUFS ±2·봉우리 -0.5 dBTP 아래 |
| check-content | 로딩 관찰 회귀, 출처·소리·파일 열기, 학생 세 판의 전체 흐름·오답·재접속·잠금·해석·실제 PNG |
| check-data | 실제 데이터 구조·글 총량·근거·자산 이름·교과서 대조 |
| check-dream | 혼례까지 실제 행동·물건·소원·생활 공간, 독립 꿈 도구·구슬·읽기 전용·잠금 |
| check-chapters | 일지·해석 실패 재시도·확정 잠금·장부·PNG 이름과 모델·비동기 취소 |
| check-engine | 진행·재개·readonly·자동 안내·설정·자료 실패 보존·HTTP/file 권한·bfcache |
| check-rpg | 키보드·터치·대상 목록, 대표/실제 월드의 행동·정체 공개·지팡이·맵 전환·큰 글자 |
| check-rights | 추적 파일·이력·커밋 글·자료 이름·본문 겹침 |
| check-sim | 체험·보행·저장 호환·회차·일회성 효과·검증기 양성/음성 회귀 |

열 검사 중 전체 학생 세 경로는 휴대폰 390×844 직접·정답, 태블릿 820×1180 선택 관찰·구슬·오답 도움, PC 1280×860 돌아보기·재접속·혼합이다. Chrome의 화면 크기 검사이며 실제 기기나 수업 시간 측정과 다르다. 각 검사는 로컬 임의 포트 서버를 정리하고, 캡처와 원본 실행 로그는 tests/shots에 남긴다.

새 파일은 명시적으로 스테이지한 뒤 권리 검사를 실행한다. check-data는 원래 저장소 design/source의 본문 추출본이 없으면 실패한다. 자료를 저장소에 올려 해결하지 않는다. 개별 check-rights는 자료 부재 시 본문 대조가 생략될 수 있으므로 그 출력만으로 전체 권리 검증을 주장하지 않는다.

작업 폴더에 tests/node_modules가 없으면 원래 폴더의 의존성을 Windows 연결점으로 잇는다. 연결점을 정리할 때 원본 의존성 폴더까지 지우지 않는다.

```powershell
New-Item -ItemType Junction -Path tests/node_modules -Target 'E:/github/고전 문학 게임/구운몽/tests/node_modules'
```

## 내용을 고친 뒤

1. `js/data/*.js`를 고친다(형식은 `js/data/README.md`).
2. `python tools/build_fonts.py` — 새 글자가 있으면 woff2가 바뀐다. 1보다 먼저 돌리면 새 글자가 빠진다.
3. `cd tests; node run-all.mjs`
4. 고친 데이터와 바뀐 글꼴을 함께 커밋한다.

## 배경음 다시 만들기

전제: `tools/music_src/<악구 번호>.wav`(국립국악원 「디지털 이음」 악구, git 제외)와 ffmpeg가 이 기기에 있다.

```powershell
python tools/make_bgm.py               # 18곡 전부와 js/data/bgm.js
python tools/make_bgm.py calm lotus    # 몇 곡만(bgm.js는 늘 전체를 다시 쓴다)
cd tests; node check-bgm.mjs
```

새 악구를 받으려면 국립국악원 누리집의 내려받기 양식(사용 목적·기관명)을 내야 한다. 제출 전에 사용자에게 확인을 받는다.

## 그림 다시 만들기

기존 장면·초상 등 원본이 없는 그림은 새 생성과 사용자 검토가 필요하다. 준비·지팡이·새 아이콘의 생성 원본은 assets/raw/sim-v2에 보존되어 있어 다시 가공할 수 있다.

```powershell
python tools/make_prompts.py                                    # tools/prompts/*.txt, tools/manifest_*.tsv
powershell -ExecutionPolicy Bypass -File tools/genqueue.ps1 -Manifest tools/manifest_phase2.tsv -Parallel 3 -Only sc_bridge
python tools/process_assets.py sc_bridge                        # 말 시트는 python tools/process_sprites.py horse_walk
python tools/check_assets.py                                    # 승인 제품 204개의 경로·크기·32색·무손실·해시
python tools/make_review.py                                     # design/review/ 모아 보기
```

새 동작과 아이콘은 다음 명령으로 후보를 다시 만든다. 원본 폴더가 먼저 있어야 하며 제품 파일은 자동으로 바뀌지 않는다.

```powershell
python tools/process_sim_assets.py --manifest tools/manifest_sim96.json
python tools/process_sim_assets.py --manifest tools/manifest_sim96.json --check
```

- 새 그림은 모아 보기로 사용자에게 먼저 보여 주고 확인을 받은 뒤 게임에 넣는다. 승인 파일을 복사하면 sprites 메타와 제품 해시·검사 규격도 함께 맞춘다.
- 끝나면 `%TEMP%\codex-img-guun-*` 폴더(자격 증명 복사본이 들어 있음)를 지운다.
- 환경 변수: `GUUN_CODEX_BIN`(codex.exe 경로, 없으면 데스크톱 앱에 딸린 최신 것 → PATH의 `codex`), `GUUN_CODEX_MODEL`(이미지 생성을 부를 모델, 없으면 `~/.codex/config.toml`의 모델). `gen.ps1 -UseModel`이 둘보다 앞선다.

탑다운·정지 NPC·여도사 걷기의 승인 이력은 각각 `tools/manifest_topdown_approved.json`, `tools/manifest_rpg_npcs_approved.json`, `tools/manifest_rpg_disguise_approved.json`에 있다. 원본은 CLI 또는 내장 image_gen의 실제 생성 이력대로 보존한다. 승인 원본이 있는 환경의 추가 검사는 다음과 같다.

```powershell
python tools/check_assets.py --topdown-provenance
python tools/rpg_disguise_approved.py
node tools/check_topdown_products.mjs
```

제품 검사와 후보 가공은 다르다. 승인 바이트·메타 교체나 새 생성은 사용자 검토 뒤에만 반영하고, 미승인 후보와 원본 폴더는 보존한다.

## 글꼴 다시 만들기

```powershell
python tools/build_fonts.py
```

원본 글꼴이 `tools/fonts_src/`에 없으면 GitHub에서 갈무리(Galmuri11.ttf)와 Noto Serif KR(가변 글꼴)과 각 OFL 전문을 받는다(인터넷 필요). 결과는 `assets/fonts/galmuri.woff2`(GuunPixel), `noto-serif-kr.woff2`(GuunSerif, 굵기 500), `noto-serif-cjk-kr-old.woff2`(GuunOld, 한자만), `OFL.txt`.

## 공개

공개 주소는 https://pblsketch.github.io/guunmong/ 이다. 2026-10-05 사용자 배포 지시에 따라 탑다운 개편을 기존 공개 저장소 main에 반영했다. 최초 제품 배포 커밋은 6ff7b19이며 GitHub Pages built를 확인했다. 후속 보완도 검증한 추적 파일만 아래 절차로 갱신한다. 작업 저장소 master는 변경하지 않았다.

내보낸 추적 파일 455개의 Git 트리는 검증한 작업판 15fd470과 같았다. 공개 런타임 231개는 HTTP 200과 원본 SHA256을 대조했다. 공개 서버가 텍스트를 LF로 제공하므로 텍스트만 CRLF/LF를 정규화했으며 그림·음원·글꼴은 바이트 그대로 일치했다. 공개 Chrome에서 새 학생의 돌다리→화음현, 키보드·터치·보따리·배경음 설정·저장·재접속·두 탭 권한 이전·가로/세로를 검사해 종료 0, 화면 오류 0이었다. 로컬 증거는 tests/shots/deploy-live.log와 deploy-2026-10-05/live.json 및 캡처에 있다. 공개 전체 완주나 실기기·학생 수업을 검사한 것으로 쓰지 않는다.

공개 위치는 pblsketch 계정의 GitHub Pages(저장소 이름 `guunmong`, 바꿀 수 있음)다. 저장소 만들기, 올리기, Pages 켜기는 각각 사용자에게 먼저 확인을 받는다. 작업 저장소의 이력은 올리지 않고, 지금 추적 파일만 새 저장소의 첫 커밋으로 옮긴다.

같은 날 후속 모바일 보완은 공개 제품 커밋 90a3918로 반영했다. 추적 457개 파일의 트리가 작업판 a1836db와 일치했고 Pages built를 확인했다. 공개 첫 화면 8조건·두 손 조작 4조건과 초기 흐름·저장·재접속·권한 이전은 종료 0이며, 런타임 231개가 Git blob 원본 바이트와 모두 일치했다. 근거는 tests/shots/mobile-public-title.log, mobile-public-controls.log, mobile-public-runtime.log다. 그 뒤 커밋은 배포 확인을 기록한 문서 변경이다.

2026-10-07 위기 도전·임무 창·이야기 지도·승인 그림 43개를 공개 제품 커밋 599c6b0으로 반영했다. 작업판 5f1da79와 Git 트리(64e5a1c)가 같고, 내보낸 사본의 권리 검사가 통과했으며 Pages built를 확인했다. 공개 주소에서 새 파일 HTTP 200·원본 해시 일치, 실제 Chrome으로 새 시작의 임무 창·돌다리 팔선녀·느낌표·이야기 지도와 화면 오류 0을 확인했다(tests/shots/explore/live-*.png). 공개 전체 완주나 실기기·수업 검증이 아니다. Windows tar 대신 Python tarfile로 풀어 한글 이름 문제를 피했다.

```powershell
cd tests; node run-all.mjs; cd ..                                   # 1. 작업 저장소에서 전체 통과
$out = "E:\github\guunmong-public"                                  # 2. 작업 저장소 밖의 빈 폴더
New-Item -ItemType Directory $out | Out-Null
git archive --format=tar -o "$env:TEMP\guunmong.tar" HEAD           # 3. 추적 파일만(무시 파일·이력 없음)
tar -xf "$env:TEMP\guunmong.tar" -C $out
cd $out
Get-ChildItem -Force -Directory -Filter '.*'; Test-Path design/source   # 4. 점으로 시작하는 폴더가 하나도 없고, False여야 한다
git init -b main; git add -A; git commit -m "구운몽: 한바탕 꿈"       # 5. 이력 없는 첫 커밋
node tests/check-rights.mjs                                         # 6. 내보낸 곳에서 권리 점검 0(node 기본 모듈만 쓰므로 npm install 불필요)
# 7. (사용자 확인 뒤) GitHub에 저장소를 만들고 올린 뒤 Pages를 main 가지의 루트(/)로 켠다
```

- 2026-10-03 첫 공개를 이 순서로 했다. 내보낸 폴더는 `E:\github\guunmong-public`이고 원격은 pblsketch/guunmong, Pages는 main 가지의 루트다. 고친 것을 다시 올릴 때는 이 폴더의 추적 파일을 지운 뒤 3을 다시 풀고, 6을 거쳐 새 커밋으로 올린다(작업 저장소의 이력은 여전히 올리지 않는다). 올리기 전에 사용자 확인을 받는다.
- Windows `tar`는 한글 이름 일부(`design/research/01_원작_검증노트.md`, `design/기획서_v1.md`)를 "Invalid empty pathname"으로 풀지 못한다. 그런 파일은 `git show HEAD:<경로> > <내보낸 곳>/<경로>`로 옮기고, 커밋한 뒤 두 저장소의 `git rev-parse HEAD^{tree}`가 같은지 본다.
- 3은 HEAD에 커밋된 것만 내보낸다. 커밋하지 않은 고침은 빠진다. PowerShell 파이프로 tar를 넘기면 바이너리가 깨지므로 파일(`-o`)로 내보낸다. 풀고 나서 한글 이름 파일(`design/기획서_v1.md` 등)이 제대로 풀렸는지 본다.
- 6의 15자 겹침 점검은 원래 폴더의 교과서 본문 추출본을 절대 경로로 읽으므로 이 기기에서만 의미가 있다.
- 공개 뒤 README의 웹 주소(https://pblsketch.github.io/guunmong/)가 열리는지, 휴대폰에서 시작·저장·소리가 되는지 직접 확인한다. 자동 점검은 지금 로컬 서버만 대상으로 하므로 공개 주소는 사람이 확인한다.
