# 운영

모든 명령은 Windows의 저장소 맨 위(`E:\github\고전 문학 게임\구운몽`)에서 실행한다고 가정한다. 경로에 공백과 한글이 있으므로 경로는 언제나 따옴표로 감싼다.

## 준비물

| 무엇 | 필요한 일 | 없으면 |
| --- | --- | --- |
| 브라우저 | 게임 실행 | — |
| Python 3 | 로컬 서버, 자산 도구 | 파일로 열기만 가능 |
| Node 18 이상 + npm | 자동 점검 | 점검 불가 |
| Google Chrome(설치본) | 자동 점검(playwright가 `channel: 'chrome'`으로 연다) | 점검이 브라우저를 못 띄움 |
| git | 권리 점검 | 권리 점검 실패 |
| ffmpeg | 배경음 만들기, 배경음 음량 점검 | 배경음을 못 만듦, 음량 점검은 건너뜀 |
| Python 패키지 Pillow, numpy, scipy | 그림 가공·점검 | 그림 도구 실패 |
| Python 패키지 fonttools, brotli | 부분 글꼴(woff2) 만들기 | 글꼴 도구 실패 |
| Codex CLI(로그인됨, `~/.codex/auth.json`) + PowerShell | 그림 생성 | 그림 생성 불가 |

```powershell
pip install pillow numpy scipy fonttools brotli
cd tests
npm install          # playwright만 설치. 브라우저는 설치된 Chrome을 쓰므로 playwright install은 필요 없다
cd ..
```

## 실행

| 방법 | 명령 | 쓰임 |
| --- | --- | --- |
| 로컬 서버 | `python -m http.server 8767` → http://127.0.0.1:8767 | 평소 확인. 배경음이 Web Audio로 돈다 |
| 파일로 열기 | `index.html` 더블클릭 | `file://`에서도 시작·저장·소리가 되는지 확인. 배경음은 `<audio>`로 돈다 |

주소 바로가기: `?teacher=1`(선생님용 켜기, `0`은 끄기), `?ch=2`(그 장의 첫 장면), `?scene=s04-geomungo`(그 장면), `?fixture=1`(점검용 임시 데이터, 저장도 따로). `ch`·`scene`은 열 수 있을 때만 열린다. 아직 안 연 장면을 보려면 `?teacher=1`을 함께 붙인다.

## 기록 초기화

- 게임 안: 설정 → 기록 지우기(확인 후 기록 전체 삭제, 설정은 남음), 또는 처음 화면 → 처음부터 새로.
- 설정까지 지우려면 브라우저 개발자 도구에서 localStorage의 `guunmong-v1`(임시 데이터는 `guunmong-v1-fixture-stub`)을 지운다.

## 자동 점검

```powershell
cd tests
node run-all.mjs                         # 전체(10분 남짓). 종료 코드 0이어야 완료
node check-engine.mjs                    # 하나만(check-assets, check-bgm, check-content, check-dream, check-engine, check-rights)
$env:ONLY = '휴대폰'; node check-content.mjs; Remove-Item Env:ONLY   # 내용 점검의 화면 판 하나만(휴대폰·태블릿·데스크톱)
node check-bgm.mjs --no-lufs             # 음량 재기 없이
```

| 점검 | 보는 것 |
| --- | --- |
| check-engine | 임시 데이터로 장 진행, 이어 하기, 깨어난 뒤 잠금(선생님용 예외), 새로 시작, 도움 사다리와 장부, 읽기 방식, 설정 저장, 선생님용·화면 접기, 글 표기, 장면별 곡 바뀜, 파일로 열기 |
| check-dream | 임시 데이터로 말 걷기, 소원 목록(미색 '?'), 인연첩, 집 놓기·옮기기·저장, 구슬 놓치고 진행, 깨어남 순간과 사라짐, 꿈 일지 묶음 확정·해석 짝·미색 드러남·팔선녀, 해석 한 번 고치기, 결과 PNG |
| check-content | 실제 데이터의 규칙(장면마다 활동·마음·물건, 여덟 구슬, 일지 근거, 해석 3~4개, 原文 없음, 그림·소리 이름, 얼굴 있는 인물만, 금칙어, 조사 두 꼴, 교과서 15자 겹침)과 선생님용 없이 0장→결과 완주 세 판(휴대폰 390×844 처음 읽기, 태블릿 820×1180 다시 읽기, 데스크톱 1280×860 처음 읽기): 일부러 틀리기, 중간 새로 고침, 깨어난 뒤 뒤로 가기·새로 고침·목차·주소, PNG 저장, 알림 위치, 명암비, 출처 문구, 소리 켜고 끄기, 실제 데이터 파일로 열기 |
| check-assets | 데이터·엔진·CSS가 가리키는 그림이 모두 있음, 바깥 요청 없음, 보이는 도트 그림이 정수배, 화면 장식 그림을 실제로 씀. 화면 캡처를 `tests/shots/`에 |
| check-bgm | 곡마다 mp3 크기·머리·비트율, 곡 이름 18개, 악구 번호, 출처 문구, (ffmpeg 있으면) -20 LUFS ±2와 봉우리 -0.5 dBTP 아래 |
| check-rights | 추적 파일·모든 이력·커밋 글에 금지된 두 이름 없음, 교과서 파일과 기획 문서 폴더가 이력에 없음, `.gitignore`, 교과서 본문 15자 겹침 |

권리 점검은 `git ls-files`로 파일을 고르므로 새 파일은 `git add`로 스테이지한 뒤에 돌려야 검사 대상이 된다.

작업 가지 폴더(worktree)에서는 점검 전에 `tests/node_modules`를 원래 폴더의 것과 연결점으로 잇는다(worktree 맨 위에서):

```powershell
cmd /c mklink /J tests\node_modules "E:\github\고전 문학 게임\구운몽\tests\node_modules"
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

이 기기의 `assets/raw/`에는 화풍 시안 네 장만 남아 있다. 게임 그림 하나를 고치려면 가공만 다시 하는 것이 아니라 새로 생성해야 한다.

```powershell
python tools/make_prompts.py                                    # tools/prompts/*.txt, tools/manifest_*.tsv
powershell -ExecutionPolicy Bypass -File tools/genqueue.ps1 -Manifest tools/manifest_phase2.tsv -Parallel 3 -Only sc_bridge
python tools/process_assets.py sc_bridge                        # 말 시트는 python tools/process_sprites.py horse_walk
python tools/check_assets.py                                    # 129장의 경로·크기·32색·무손실
python tools/make_review.py                                     # design/review/ 모아 보기
```

- 새 그림은 모아 보기로 사용자에게 먼저 보여 주고 확인을 받은 뒤 게임에 넣는다.
- 끝나면 `%TEMP%\codex-img-guun-*` 폴더(자격 증명 복사본이 들어 있음)를 지운다.
- 환경 변수: `GUUN_CODEX_BIN`(codex.exe 경로, 없으면 데스크톱 앱에 딸린 최신 것 → PATH의 `codex`), `GUUN_CODEX_MODEL`(이미지 생성을 부를 모델, 없으면 `~/.codex/config.toml`의 모델). `gen.ps1 -UseModel`이 둘보다 앞선다.

## 글꼴 다시 만들기

```powershell
python tools/build_fonts.py
```

원본 글꼴이 `tools/fonts_src/`에 없으면 GitHub에서 갈무리(Galmuri11.ttf)와 Noto Serif KR(가변 글꼴)과 각 OFL 전문을 받는다(인터넷 필요). 결과는 `assets/fonts/galmuri.woff2`(GuunPixel), `noto-serif-kr.woff2`(GuunSerif, 굵기 500), `noto-serif-cjk-kr-old.woff2`(GuunOld, 한자만), `OFL.txt`.

## 공개(아직 하지 않음)

공개 위치는 pblsketch 계정의 GitHub Pages(저장소 이름 `guunmong`, 바꿀 수 있음)다. 저장소 만들기, 올리기, Pages 켜기는 각각 사용자에게 먼저 확인을 받는다. 작업 저장소의 이력은 올리지 않고, 지금 추적 파일만 새 저장소의 첫 커밋으로 옮긴다.

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

- 3은 HEAD에 커밋된 것만 내보낸다. 커밋하지 않은 고침은 빠진다. PowerShell 파이프로 tar를 넘기면 바이너리가 깨지므로 파일(`-o`)로 내보낸다. 풀고 나서 한글 이름 파일(`design/기획서_v1.md` 등)이 제대로 풀렸는지 본다.
- 6의 15자 겹침 점검은 원래 폴더의 교과서 본문 추출본을 절대 경로로 읽으므로 이 기기에서만 의미가 있다.
- 공개 뒤 README의 웹 주소(https://pblsketch.github.io/guunmong/)가 열리는지, 휴대폰에서 시작·저장·소리가 되는지 직접 확인한다. 자동 점검은 지금 로컬 서버만 대상으로 하므로 공개 주소는 사람이 확인한다.
