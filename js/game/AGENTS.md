# js/game — 장 흐름과 꿈 화면

## 맡는 것
- `app.js`(`G.app`): 장 순서 0→1→2→3→4→5→R, 장면 목록, 열기 문 `canOpen`, 이어 하기 자리 `resumeTarget`, 깨어남 기록 `wake()`, 타이틀·새로 시작·목차·설정·선생님 안내, 기본 장면 화면과 걸음, 회목 카드, 장부 표, 소원 상태 계산 `wishes()`, 확장 지점.
- 화면 모듈: `board.js`(말판·말 걷기·교지·소원 목록, 공용 도구 `G.dream`), `house.js`(집 단계·물건 놓기), `pearl.js`(숨은 구슬), `bag.js`(꿈 보따리), `wake.js`(3장 지팡이 장면과 사라짐), `journal.js`(꿈 일지), `interp.js`(해석 고르기), `result.js`(결과·마지막 장 PNG).

## 맡지 않는 것
- 글 표기, 활동 틀, 저장 형식, 소리 엔진은 `js/core/`의 것을 부른다. 여기서 localStorage를 직접 만지지 않는다.
- 내용(글·정답·곡 이름·좌표)은 `js/data/`에서 읽는다. 장면별 글이나 정답을 화면 코드에 박지 않는다.
- `js/data/bgm.js`(도구가 만듦), `tests/` 점검 코드, 자산 파일은 이 폴더의 일이 아니다.

## 확장 지점(화면 모듈이 끼어드는 유일한 길)
- `G.app.screens[kind] = async (ctx, scene) => {}`: 장면 종류별 화면. Promise가 끝나면 장면을 마친 것으로 보고 다음으로 간다. 결과 화면은 끝나지 않는 Promise로 머문다.
- `G.app.steps[name] = async (ctx, scene) => {}`: 기본 장면 화면의 걸음. 순서는 `scene.flow` 또는 `G.app.flow`(`read`·`activity`·`mind`·`item`·`bond`·`pearl`). house가 `item`을, pearl이 `pearl`을 바꿔 끼운다.
- `G.app.hook('chapter', fn)`: 장 카드 뒤 첫 장면 앞. `G.app.hook('between', fn(from, to, ctx))`: 장면을 마친 뒤 다음 장면 앞. 둘 다 마친 장면을 다시 열 때는 불리지 않는다(읽기 방식과 무관).
- `G.app.on('scene'|'step'|'done'|'chapter'|'wake'|'reset', fn)`, `G.app.toolbar.push({ id, label, icon, when(ctx), click(ctx) })`.
- 새 화면 모듈은 `index.html`에서 `app.js` 다음, `main.js` 앞에 넣고, `G.dream`을 쓰면 `board.js` 뒤에 둔다(모듈들이 읽히는 순간 `G.dream`을 잡아 둔다). 새 모듈 때문에 `app.js`의 흐름 코드를 고치지 않는다.

## 지켜야 할 것
- 장면을 여는 모든 길(목차, 주소, 뒤로 가기, `G.app.open`)은 `canOpen`을 지난다: 선생님용이면 모두, 깨어난 뒤 0~3장의 `awakened: true` 장면 앞은 닫힘, 마친 장면은 다시 열기, 그 밖에는 지금 자리와 이어 하기 자리만.
- `G.app.wake()`는 `c3-staff`에서 [지팡이가 돌난간을 친다]를 누르는 그 순간에만 부른다. 땅을 두드리며 다가오는 단계에서는 부르지 않는다. `awake`를 다른 곳에서 바꾸지 않는다.
- 이어 하기: 깨어나기 전 3장이면 3장 첫 장면으로(3장의 `done`을 지우되 장부는 둠), 깨어난 뒤 선방 앞이면 `awakened` 장면으로, 그 밖에는 `pos` 장면 처음부터. 깨어나기 전에도 마친 장면은 건너뛴다(말이 걷는 화면에서 끊겨도 다음 장면 처음부터 이어 함).
- 모든 걸음·화면은 `ctx.readonly`(마친 장면 다시 열기)가 참이면 장부·마음·물건·집·인연·구슬·일지·해석 기록을 쓰지 않는다. 비동기 대기 뒤에는 `ctx.alive()`를 확인하고 거짓이면 바로 돌아간다(다른 장면으로 넘어간 뒤의 쓰기를 막는다).
- 소원 상태(`G.app.wishes()`)는 마친 장면의 `fills`, 얻은 물건의 `fills`, 장면 말판 칸의 `fills`로만 계산한다. 인연은 어떤 소원도 채우지 않는다. `dreamHidden` 소원(미색)은 `journal.revealed[id]`가 생기기 전까지 이름 '?'에 채움 없음이다. `'chuljang.chul'` 같은 점 표기는 칸이 나뉜 소원의 반 칸이다.
- 깨어난 뒤에는 `G.dream.alive()`가 거짓(선생님용 제외)이고, 꿈 보따리는 `wishes`·`pearls` 탭만 연다. 말판·집·인연첩은 결과 화면에서도 다시 그리지 않는다.
- 인연 수를 세어 보이는 화면을 만들지 않는다. 구슬 수는 결과 화면에 "점수로 치지 않아요"와 함께만 보인다.
- 꿈 일지 맞대기는 `G.activity.mount`에 `reusable: true`로 넘겨 한 소원을 여러 칸에 쓰게 하고, 장부 열쇠는 `journal.id`(`j-match`)다. '해석' 짝과 인연 잇기는 장부에 넣지 않는다. 인연 잇기는 무엇을 고르든 `revealed[미색]`을 세우고 소원 목록을 다시 그린다.
- 해석: 첫 선택을 저장하며 `heard = true`를 세운 뒤에는 첫 선택을 다시 열지 않는다. 고치기는 한 번, 같은 것을 고르면 `revised = false`. `final`이 서면 잠근다. `after: true` 근거는 응답을 들은 뒤 고칠 때만 보인다.
- 진행 단추는 `ctx.next()`(아래 판 `#tray`, `data-act="next"`), 꼭 골라야 하는 단추에는 `data-must`. 점검이 이 표시로 진행한다.
- 도트 그림은 `G.util.pixImg`·`G.dream.picture`·`G.dream.overlay`로만 놓는다(정수배).

## 시험할 것
- `cd tests; node check-engine.mjs; node check-dream.mjs`(임시 데이터) 뒤 `node check-content.mjs`(실제 데이터 완주 세 판). 마지막에 `node run-all.mjs`.
- 경계: 장면 중간 새로 고침, 3장 지팡이 직전과 직후에 새로 고침, 깨어난 뒤 뒤로 가기·목차·`?ch=2`·`?scene=`으로 꿈 장면 열기, 선생님용을 켠 채 깨어났다가 끄기(지금 화면이 닫힌 장면이면 이어 하기 자리로 옮겨야 함), 구슬을 하나도 안 찾고 완주, 해석을 열었다가 그대로 정하기, 마친 꿈 장면을 다시 열어 물건을 다른 칸에 놓으려 하기(바뀌지 않아야 함).
