# 내용 데이터 형식 약속 v2

내용 데이터의 유일한 형식 기준이다. 파일은 script로 읽고 `window.GUUN` 아래 값을 둔다.
데이터에 함수나 getter를 넣지 않는다. 준비와 윤목·수치는 게임 설정이며 사건·결말·벼슬·집 단계는 고정이다.
임시 내용은 `tests/fixtures/`에만 둔다. `?fixture=1`은 stub이며 저장도 분리된다.

## 파일

| 파일 | GUUN 열쇠 | 내용 |
| --- | --- | --- |
| people.js | people | 인물·얼굴·표정 |
| chapters.js | chapters | 장 안내·지난 이야기·기본 곡·설정 카드 |
| scenes.js | scenes | 모든 진행 단위, 원작 차례 |
| board.js | board | 장소·벼슬 칸 |
| wishes.js | wishes | 다섯 소원 |
| bonds.js | bonds | 인연 카드 |
| house.js | house | 집 단계·자동 장식 자리 |
| journal.js | journal | 맞대기와 인연 잇기 |
| interp.js | interp | 문답·해석·근거·대사의 답·결말 |
| notes.js | notes | 작품·이본·교사 안내·화면 문구 |
| bgm.js | bgm | 기존 음원 정보, 도구로만 생성 |
| sprites.js | sprites | 승인된 새 그림 목록 |

`js/core/data.js`의 FILES가 위 파일을 읽는다. 모든 진행 단위는 scenes에, 승인된 동작·아이콘 메타는 sprites에 둔다.

## 글·그림·소리

대사창 줄은 문자열 또는 `{ text, say?, mood?, effect?, shake? }`, `{ gloss }`다. say는 얼굴이 있는 인물 id다.
`**강조**`, `{호칭|인물id}` 표기를 유지한다. 풀이와 얼굴은 항상 보인다. 읽기 방식 mode는 없다.
별도 카드 `{ mark: 'fiction'|'variant'|'interp'|'note', id?, title, body, real? }`도 가능하다.
설정 카드는 첫 등장에만 real을 보인다. 회목은 `{ hoe, part, gloss, status: '대조 대기' }`다.
지금은 영인 대조가 끝난 글이 없어 orig를 쓰지 않는다. 정답과 core는 이본 공통 사실로 정한다.

people는 `{ 인물id: { name, face?, moods?, noFace? } }`, chapters는 `{ 장: { intro?, recap?, bgm?, fiction? } }`다.
장면 img는 `assets/sc/<img>.webp`, 얼굴은 `assets/pt/<face>[_<mood>].webp`,
물건은 `assets/items/<img>.webp`, 집은 `assets/house/<img>.webp`다. 도트는 정수배로 표시한다.
bgm은 `bgm.tracks`의 열쇠다. bgm은 `{ title, tracks: { 곡id: { file, len, gain, wet, synth, src } }, credit, creditFull }`이다.
음원 출처는 국립국악원 「디지털 이음」·공공누리 제1유형, 퉁소 대신 단소라는 안내를 유지한다.

## 장면 공통과 차례

`{ id, ch, kind, title, img?, bgm?, lines?, narration?, heading?, reality? }`

- ch는 문자열 0~5 또는 R, kind는 필수다. lines는 줄 배열, narration은 문자열 또는 줄 배열이다.
- kind는 cut, scene, wish, event, link, waking, journal, interp, result만 쓴다.
- 고정 차례: cut-josin → c1-bridge → c1-cell → c1-wish → c1-exile → c1-rebirth →
  e01 → l-namjeon → e02 → e03 → e04 → e05 → l-hebei → e06 → e07 → l-bongnae →
  e08 → e09 → e10 → e11 → e12 → c3-feast → c3-monk → c3-staff → c3-awake →
  c4-journal → c5-dialogue → c5-ordination → r-result.
- 사건 id는 `e01-<이름>`부터 `e12-<이름>`까지다. 실제 id는 아래 사건 표와 같으며 저장 기록이 가리키므로 유지한다.
- cut-josin은 cut/0, c5-ordination은 cut/5, c3-staff는 waking/3이다.
- c3-awake는 scene/3이며 유일한 awakened:true다. 이 장면 앞은 깨어난 뒤 잠긴다.
- c4-journal은 journal/4, c5-dialogue는 interp/5, r-result는 result/R이다.
- 나머지 c1·c3 장면은 scene이다. c1-wish만 wish다. 구형 read/activity/mind/flow는 쓰지 않는다.

## 사건 event

| 번호 | id | 제목 | core | meet |
| --- | --- | --- | --- | --- |
| 1 | `e01-huayin` | 화음현의 버들 노래 | munjang | chae |
| 2 | `e02-tianjin` | 천진교 주루의 시회 | munjang | seomwol |
| 3 | `e03-geomungo` | 여도사의 거문고 | eumak | gyeongpae |
| 4 | `e04-exam` | 장원급제 | munjang | — |
| 5 | `e05-chunun` | 선녀인가, 귀신인가 | jiryak | chunun |
| 6 | `e06-gyeonghong` | 적생의 정체 | jiryak | gyeonghong |
| 7 | `e07-tungso` | 달밤의 퉁소 | eumak | nanyang |
| 8 | `e08-wonsu` | 옥에서 대원수로 | muye, jiryak | — |
| 9 | `e09-yoyeon` | 진영의 자객 | muye | yoyeon |
| 10 | `e10-neungpa` | 반사곡과 백룡담 | jiryak | neungpa |
| 11 | `e11-seungsang` | 개선과 승상 | muye, jiryak | — |
| 12 | `e12-honrye` | 혼례와 버들 노래 | munjang | — |

```js
{
  id: 'e01-huayin', ch: '2', kind: 'event', title: '화음현',
  preview: '다음 일을 알리는 짧은 글', clues: ['알리는'], core: ['munjang'],
  img: 'sc_huayin', bgm: 'spring', lines: [{ say: 'yang', text: '새로 쓴 대사' }],
  gradeText: { shine: '평판 상', fine: '평판 중', near: '평판 하' },
  items: [{ id: 'it-yangryu', name: '양류사 시전', img: 'item_yangryu', desc: '설명', fills: [], slot: 'in' }],
  square: 'sq-huayin', meet: 'chae',
  pearl: { x: 30, y: 40, r: 7, trace: 'fiction', hint: '흔적' },
  remeet: [{ bond: 'chae', story: '다시 만난 사연' }],
}
```

clues는 예고에 그대로 있는 낱말 배열, core는 서로 다른 능력 1~2개다.
능력 id: munjang(문장), eumak(음악), muye(무예), jiryak(지략).
사건 순서의 core는 문장, 문장, 음악, 문장, 지략, 지략, 음악, 무예·지략, 무예, 지략, 무예·지략, 문장이다.
11·12번만 원작 검증 뒤 조정할 수 있다. 처음 만나는 번호는 1,2,3,5,6,7,9,10이다.
여덟 곳에 서로 다른 meet와 구슬 객체 하나씩 둔다. pearl의 좌표·반지름은 백분율이다.
trace가 canon이면 canon 근거 글도 둔다. 원작 구슬 근거는 정경패와 난양공주뿐이다.
물건은 `{id,name,img,desc,fills:[],slot}`이다. slot은 in/yard/any다. 없는 사건도 items:[]를 둔다.
재회는 `remeet:[{bond,story}]` 배열로 쓴다. app.remeets는 이전 단일 객체도 읽지만 새 데이터는 배열로 통일한다. 자원 보상은 G.sim.reward에서 계산하며 데이터에 복제하지 않는다.
인연 이름·aliases 뒤에 여인을 소유 대상으로 쓰는 등급 문구는 금지다.
grade-object는 이름·목적격 조사 뒤의 얻/차지/맞이/데려를 검사한다.
그 사이에 아내로·자신의 것으로 같은 소유 보어, 집으로·내 곁으로 같은 방향 표현,
마침내·온전히 같은 부사가 이어져도 검사한다. 허용하는 중간 표현은 data.js의 OBJECT_MODIFIERS에 모은다.
이름만으로 차단하지 않으며, 다른 절에서 시·곡조·평판을 대상으로 쓴 동사까지 이어 잡지 않는다.
가춘운·적경홍에서는 속은 뒤의 품·평판만 바꾸며 속임수를 알아채는 연출을 넣지 않는다.

step: preview → prep1 → prep2 → scene → grade → clue → walk.
준비 선택은 G.save.prepare로 저장한다. 사건 화면의 완료 확정은 ctx.finishEvent를 사용해 등급·보상과 다음 진행을 함께 저장한다.
장 흐름의 이어 하기는 grade 기록이 있으면 다음 진행 단위로, 두 턴만 있으면 사건 첫 줄로 간다.
다시 열기에서는 readonly를 지키며 준비·보상을 재기록하지 않는다.

## 컷신 cut / waking

```js
{
  id: 'c3-staff', ch: '3', kind: 'waking', title: '들어 올린 지팡이',
  img: 'sc_c3_monk', bgm: 'chwimi',
  timeline: [
    { at: 0, img: 'sc_c3_monk', lines: ['호승이 난간 앞으로 다가섰다.'],
      effect: 'mist', move: { x: 6, y: 0, duration: 2000 } },
    { at: 2000, lines: ['호승이 지팡이를 높이 들었다.'],
      sprites: [{ id: 'hoseung', x: 70, y: 50 }], pause: 'staff' },
  ],
}
```

at·duration은 밀리초이며 timeline은 시간순이다. at는 자동으로 넘길 간격의 기준이며 화면을 눌러 앞당길 수 있다.
프레임의 `{sprites:[{id,x,y}]}`에서 id는 sprites의 열쇠, x·y는 무대 안의 백분율이다. frames나 파일 경로를 장면에 중복해서 쓰지 않는다.
`move:{x,y,duration}`의 x·y는 배경 그림의 이동량(px)이다. 배경 확대가 아니라 translate로 움직인다.
일반 무대 effect는 petals/mist/ripples/candle/fire다. 컷신은 light/shatter를 추가 지원한다.
`pause:'next'`는 다음 단추를 기다리며, `pause:'staff'`는 깨어남 화면의 onPause가 처리한다.
목록에 없으면 파일을 요청하지 않고 기존 얼굴 등으로 대신한다.
waking은 같은 timeline에 pause:'staff'를 정확히 한 번 둔다.
그 멈춤에서 난간 치기 단추를 누를 때만 G.app.wake()를 부른다. 그 전에는 건너뛰지 않는다.
그 뒤의 부서짐 연출은 건너뛸 수 있다. 저장 상태의 awake는 화면 코드에서 직접 대입하지 않는다.

## 이음 link / 소원 wish

link: `{ id: 'l-namjeon'|'l-hebei'|'l-bongnae', ch: '2', kind: 'link', title, img?, bgm?, lines, square, bonus: { abil: { eumak: 2 }, items: [물건] } }`.
준비·등급은 없다. 남전산 음악 덤 기본값은 G.sim.config.linkBonus(2)다. 자료의 수치도 이 값에 맞춘다.
덤 적용과 마침 저장은 app의 complete 경로에서 한 번만 한다. normalPrep은 사건만 채우며 이음 덤은 건드리지 않는다.

wish: `{ id: 'c1-wish', ch: '1', kind: 'wish', title, monologue, words: [{ id, text, wish? }], answers: [낱말id], memo }`.
monologue는 문자열, words.text는 그 안에 있는 누를 낱말이다. 정답 다섯에는 wish로 소원 id를 연결한다.
answers에는 정답 낱말 id 다섯을 둔다. 독백의 다른 바람을 오답으로 쓰지 않는다. 활동 id는 a-wish다.
현재 정답은 출장입상·부귀·미색·풍류·공명, 오답 낱말은 물그릇·경전·염주다. 두 번째 오답부터 메모와 정답 보기 단추가 보인다.
정답 보기는 남은 낱말을 강조한다. 선생님 정답 채우기는 선택 목록을 채운다. 한 번 고른 낱말과 오답 횟수는 즉시 저장한다.

## 말판·소원·인연·집

- board: `[{ id: 'sq-…', name, kind: 'office'|'place', scene, x, y, start?, outfit?, fills? }]`.
  출발 칸만 scene:null이다. outfit은 gwan/jang/sang. 사건과 이음 모두 칸을 지난다.
  떨어지는 칸은 없다. fills는 대원수의 chuljang.chul과 승상의 chuljang.ip만 둔다.
  꿈의 사건 12개+이음 3개는 14개 장면 칸을 쓴다. e04-exam과 e05-chunun은 sq-hallim을 공유하며 칸의 scene은 e04-exam이다.
  같은 칸을 잇는 두 사건 사이에는 추가 걷기가 없다. 전체 말판은 수주현 출발과 취미궁을 더해 16칸이다.
- wishes: `[{ id, name, hanja?, evidence, parts?, dreamHidden? }]`.
  부귀는 wealth, 공명은 fame, 풍류는 음악 사건과 악기다. 미색은 꿈 내내 숨긴다.
  G.app.wishes()는 `{ id, name, fill, hidden, half, filled, parts, sources }` 배열이다. fill은 0~1이고 숨긴 이름은 `?`다. parts는 `{id,name,filled}` 배열이다.
- bonds: `[{ id, name, aliases?, face?, status, ability, story, place, fairy, fairyFace?, color? }]`.
  ability는 설명용 문자열이다. grade/grades/gradeText/shine/fine/near와 fills/wish/abil/res/reward는 금지다.
  인연은 수치에 영향을 주지 않고 개수로 보이지 않는다.
- house: `{ stages: [{ id, name, from: 장면id, img, slots: [{ id, x, y, w, kind: 'in'|'yard' }] }], fiction? }`.
  단계는 원작 진행으로 고정한다. 받은 items는 순서대로 알맞은 칸에 자동 장식한다.
  재물은 같은 단계의 꾸밈만 바꾸며 직접 배치 기능은 없다.

## 일지·해석·노트

journal: `{ id: 'j-match', title, prompt, memo, pairs: [{ id: 'j-…', event, kind?, wish, evidence, memo? }], bondLink: { id: 'j-bond', prompt, choices, answer: 'misaek', reveal } }`.
채점할 다섯 pairs만 둔다. 장수·재상→출장입상, 도포와 옥대→부귀, 두 악기→풍류, 기린각→공명.
드러난 소원 넷을 선택지로 쓰며 재사용 가능하다. 해석 짝과 마음 나란히 보기는 없다.
bondLink는 어느 선택이든 미색을 드러낸다. 인연 잇기와 구슬은 채점하지 않는다.

interp: `{ question, options: [{ id, text, fits? }], evidence: [{ id, text, from?, after? }], dialogue: [줄], lastWords: 줄 또는 [줄], ending: [줄] }`.
options는 네 개, evidence는 열 개다. fits는 해석의 관련 근거 목록이며 채점 정답이 아니다. 근거 text는 실제 이야기 한 줄에 그대로 있어야 한다.
E1~E7은 1·3장, after:true인 E8~E10은 대사의 응답에 나온다. after 근거는 응답 뒤에만 보인다. 응답 전에 고르고 들은 뒤 한 번만 고친다.

notes: `{ work, variants, discuss, teacher: { when, time, questions, extra, ledger }, ui }`.
teacher.ledger는 사건 적중·등급·도움 안내다. discuss는 생각 나눔 질문 두 개의 문자열 배열이다.
ui는 아래처럼 글과 카드의 값만 둔다. 어떤 문구를 실제로 쓸지는 해당 화면 모듈이 정한다.

```text
ui
  abilities: {munjang,eumak,muye,jiryak} → 표시 이름
  actions: {study,geomungo,sword,strategy} → 표시 이름
  grades: {shine,fine,near} → 표시 이름
  resources: {gong,fame,wealth} → 표시 이름
  fiction: {prep,score,comic,pearls,items} → {mark:'fiction',id,title,body,real}
  result: {before,after,zero,scoreNotice,save}
  journal: {pearls,unfound,unscored}
  preview, prep, clue, grade, wishHidden, pearl, staff, teacherPeek, audioNotice: 문자열
```

인연 카드의 등급별 갈림이나 수치 보상은 ui에도 넣지 않는다.
결과에는 최고 꿈 점수→0과 평가에 쓰지 않는다는 안내를 둔다. 장부에는 꿈 점수를 넣지 않는다.

## 저장 v2와 규칙 API

열쇠는 guunmong-v2 또는 guunmong-v2-fixture-<이름>. v1은 읽거나 지우지 않는다.
fresh()의 열쇠:

- 설정: music, sound, big, teacher. reset 뒤에도 유지한다. mode는 없다.
- 진행: started, pos, step, reach, done, awake, awakeAt.
- 육성: abil:{munjang,eumak,muye,jiryak}, res:{gong,fame,wealth}, best, events.
- 기록: items:[id], bonds:[id], pearls:{인연id:true}, seenFiction:{id:true}, ledger, wrong, journal, interp.
- 기타: v:2, name, startedAt, finishedAt.

`events[id] = { turns: [행동id,행동id], rolls: [수,수], hits, grade, reward, peek, auto }`.
미완성 turns/rolls는 길이 0~1, grade/reward는 null이다. hits는 현재 적중 수이며 peek/auto는 boolean이다.
reward는 {gong,fame,wealth}. auto 기록은 장부에서 —이며 done도 아니다. 뒤 채우기에서 덮어쓰지 않는다.
ledger는 a-wish·j-match만 받으며 `{first:true|false|null, help:null|'student'|'teacher', final}`이다.
선생님 도움이 먼저면 first:null, final 뒤에는 불변이다. wrong은 `[{act,slot,picked,answer,note?}]`다.
journal은 `{ wish?: {selected:[낱말id], wrong:수}, match?: {picks,tries,memoOpen}, bondLink?: 소원id, revealed?: {misaek:true} }`이다. match의 활동 진행은 G.activity.mount가 관리한다.
interp는 `{first:{option,evidence}, heard, changed:{option,evidence}|null, revised, final}`이다.

| API | 계약 |
| --- | --- |
| G.sim.config | baseGain=2, thresholds=[6,9,…,39], rewards, linkBonus=2. maxAbility는 12사건×2턴×최대상승+덤=122. 조정은 이곳에서 |
| G.sim.actions | study→munjang, geomungo→eumak, sword→muye, strategy→jiryak |
| roll(id,turn) | turn은 0/1. 사건 번호와 턴으로 1~3 결정. 12사건에서 각 값 8회 |
| growth(action,roll) | 기본 상승+윤목. 행동 및 1~3 범위 검사 |
| threshold(event) | 사건 번호로 문턱 조회 |
| grade(event,hits,abil) | 핵심 둘이면 높은 수치. 2→shine, 1→문턱 이상 shine/미만 fine, 0→이상 fine/미만 near |
| reward(grade) | 등급별 자원의 새 객체. near < fine < shine |
| record() | 길이 0의 준비 배열과 기본 사건 기록 |
| normalTurns(event) | 첫 core의 행동, 고정 행동 순서에서 core가 아닌 첫 행동 |
| prepare(state,event,turn,action) | 메모리 상태 변경. 이미 고른 턴은 보존, 턴 순서 검사, pos/step 기록 |
| finish(state,event) | 두 턴 뒤 첫 등급·보상·best만 확정. done·물건·인연은 건드리지 않음 |
| normalPrep(state,scenes,targetId) | 대상 앞 사건을 순서대로 채움. events에 열쇠가 있으면 부분 기록도 보존. auto:true, done/장부는 쓰지 않음. 채운 id 배열 반환. 기존 pos/step 유지 |
| G.save.prepare(event,turn,action) | sim.prepare 후 즉시 write. 사건 기록 반환 |
| G.save.finishEvent(event) | sim.finish 후 즉시 write. 사건 기록 반환 |
| G.save.fillBefore(scenes,targetId) | sim.normalPrep 후 write. 채운 id 배열 반환 |
| G.save.peekEvent(event) | teacher일 때만 peek를 세우고 write. 확정 기록 보존 |

sim은 DOM·저장소·G.app에 접근하지 않는다. 화면은 G.save 래퍼를 호출한다.
readonly/awake 접근 차단은 app.canOpen과 장면 ctx가 담당한다. wake는 G.app.wake만 호출한다.
stage/prep/event/hud/cutscene/wish는 실제 화면 모듈이며 index.html에 등록돼 있다. 데이터에 DOM·함수·getter를 넣지 않는다.

## 검사와 이야기 글 셈

G.checkData(data=G.data,options={})는 경고 배열이다. 기본은 실제 사건 12개·인연 8곳·근거 10개·전체 순서 검사다.
호출자가 `{profile:'fixture'}`를 명시하면 사건 3개·이음 l-namjeon 하나를 검사한다.
나머지 글자 수·근거 10개·자료형·깨어남 경계 규칙은 같다. 데이터의 fixture 열쇠로 검사를 완화할 수 없다.
loader만 fixture 주소에서 옵션을 넘긴다. 실제 데이터 검사는 옵션 없이 호출한다.

G.storyText(data)는 `{texts:[표시용 문자열],count:한글음절수}`다. 모든 글자 수 점검이 재사용한다.
포함: event/link/cut/waking/wish의 lines·narration, 1·3·5장 scene/interp의 lines·narration,
cut/waking timeline.lines, wish.monologue, event.gradeText 세 값, interp.dialogue·lastWords·ending.
wish는 독백뿐 아니라 공통 대사와 서술도 각각 합산한다.
제외: preview·clues, mark 카드, 노트, 인연 카드, 일지 칸, 해석 선택지·근거 목록, 장 안내·단추.
강조 기호를 벗기고 인물 표기는 호칭만 남긴다. 가~힣만 세며 4,400 이하가 기준이다.
데이터 전체를 세고, 중복해서 적으면 적은 횟수대로 센다. 근거는 서로 다른 줄을 이어 붙여 검사하지 않는다.

## 승인된 동작 그림과 아이콘

sprites는 순수 대입 데이터다. 항목은 `{src,width,height,frames,rows}`이고 width·height는 **전체 파일이 아니라 한 셀**의 크기다.

| 열쇠 | src | 셀 | frames | rows |
| --- | --- | --- | ---: | ---: |
| study | assets/sprites/study.webp | 96×96 | 4 | 1 |
| geomungo | assets/sprites/geomungo.webp | 96×96 | 4 | 1 |
| sword | assets/sprites/sword.webp | 96×96 | 4 | 1 |
| strategy | assets/sprites/strategy.webp | 96×96 | 4 | 1 |
| hoseung | assets/sprites/hoseung.webp | 96×96 | 4 | 1 |
| munjang | assets/ui/icon_munjang.png | 32×32 | 1 | 1 |
| eumak | assets/ui/icon_eumak.png | 32×32 | 1 | 1 |
| muye | assets/ui/icon_muye.png | 32×32 | 1 | 1 |
| jiryak | assets/ui/icon_jiryak.png | 32×32 | 1 | 1 |
| gong | assets/ui/icon_gong.png | 32×32 | 1 | 1 |
| fame | assets/ui/icon_fame.png | 32×32 | 1 | 1 |
| wealth | assets/ui/icon_wealth.png | 32×32 | 1 | 1 |

동작 파일은 384×96, 아이콘은 32×32다. 시트 전체에서 불투명 31색과 투명 한 색을 공유하고 무손실로 저장한다.
2026-10-03의 32·64·96 비교 뒤 동작의 최종 셀은 96×96으로 정했다. 말판의 기존 32×32 걷기 셀과 구별한다.
준비·컷신 인물의 목표 표시는 96 CSS px이며 기기 픽셀 기준 정수·역정수 배율을 쓴다. 아이콘은 기본 목표 16 CSS px에 가까운 허용 배율을 고른다.
준비 목록에 없으면 기존 양소유 얼굴, 컷신 목록에 없으면 해당 인물의 기존 얼굴·이름으로 대체한다. 아이콘은 null을 돌려 기존 글자만 남긴다. 미등록 경로를 추측해서 요청하지 않는다.

### 호승의 지팡이

- hoseung의 0기준 **2번은 들어 올린 자세**, **3번은 내려치는 자세**다. 현재 네 프레임 배열에서 이 순서를 유지한다.
- waking 타임라인에 pause:'staff'가 있어야 하며, 그 프레임까지 hoseung을 sprites에 배치해야 한다.
- G.cutscene.play는 이 컷신의 호승 반복 재생을 끄고 pause에서 2번을 고정한다. 클릭 전 3번 자세가 흘러나와서는 안 된다.
- 난간 치기 클릭은 G.app.wake()를 먼저 호출하고 3번 자세로 바꾼다. 등록 시트가 있으면 타격을 400ms 보여 준 뒤 부서짐으로 간다.
- 사용 가능한 시트가 없어도 얼굴·이름 대체 표시와 깨어남 단추로 진행한다. 이때 타격 프레임 대기는 생략한다.
- 컷신의 stage.setSpriteFrame(id,index)는 0기준 인덱스이며 범위를 벗어나거나 해당 셀이 없으면 false다. 제품 sprites 항목에 별도의 pauseFrame/strikeFrame 필드를 요구하지 않는다.

### 생성 원본과 가공 기록

원본 생성은 tools/gen.ps1을 통한 Codex CLI 내장 이미지 생성이다. 실제 생성 요청은 tools/prompts/sim_source_*.txt에 그대로 보존돼 있다.
당시 요청의 32px 표현은 생성 이력이며 최종 배포 크기가 아니다. 원본을 다시 생성하거나 그 문구를 96px 요청이었다고 고쳐 쓰지 않았다.
tools/manifest_sim96.json이 현재 출하 파일·셀·승인 해시·원본·프롬프트의 근거다. 다음 명령은 원본이 보존된 환경에서 실행한다.

```text
python tools/process_sim_assets.py --manifest tools/manifest_sim96.json
python tools/check_assets.py
```

가공은 assets/raw/sim-v2/candidates96/에 후보를 쓰며 제품 파일을 자동 덮어쓰지 않는다. 그림을 바꿀 때는 다시 검토·승인한 파일만 제품 경로와 메타에 반영한다.
생성 원본, 이전 32px 후보, 96px 후보와 검토판은 assets/raw/sim-v2/에 보존하되 git에 넣지 않는다. 현재 제품은 승인된 96px 동작만 사용한다.

## 화면 모듈과 진행 계약

데이터를 고칠 때 아래 소비 방식도 함께 확인한다. 숨긴 계획 문서나 작업 번호에 기대지 않는다.

| API | 입력·반환·책임 |
| --- | --- |
| G.stage.mount(ctx,scene) | 무대를 만들고 `{el,dialogue,show,portrait,effect,walk,active,dispose}`를 반환 |
| stage.show(line) | 문자열·text/gloss·mark 카드 표시. say/mood로 얼굴을, shake로 흔들림을, effect로 무대 효과를 고름 |
| stage.portrait(id,mood,{shake}) | people에 얼굴이 있는 인물만 표시. 얼굴 없는 인물은 say나 호칭 표기에 쓰지 않음 |
| stage.walk({from,to,duration,outfit}) | 양소유만 이동. from/to는 `{x,y}` 백분율, duration은 ms, outfit은 gwan/jang/sang 또는 기본. Promise<boolean> |
| G.stage.play(ctx,scene,{lines?}) | 기본은 narration 다음 lines. 줄마다 진행 단추·대사창 입력을 기다리고 끝/취소 여부를 반환 |
| G.cutscene.play(ctx,scene,{canSkip?,onPause?}) | timeline 실행. canSkip은 boolean 또는 함수. onPause(pause,stage)를 기다리며 취소·이탈 시 정리 |
| G.prep.run(ctx,scene,turn) | turn은 0/1. 선택 즉시 G.save.prepare, 동작·윤목·상승 표시, 다음 단추까지 기다림 |
| G.prep.labels(kind) | notes.ui 이름과 기본 이름을 합침 |
| G.prep.icon(id,target=16) | 등록된 한 프레임 그림을 정수배 img로 반환하거나 null. 이름은 옆 글자로 유지 |
| G.prep.wait(ctx,ms) | 이탈하면 false. 동작 줄이기 환경에서는 연출 대기를 줄임 |
| G.hud.refresh() | 살아 있는 현재 꿈 화면의 수치·소원·능력 갱신. 깨어난 학생 상태에서는 띠를 제거 |

준비 스프라이트와 컷신 스프라이트는 `--frames`·`--sheet-end`를 style.setProperty로 등록해야 한다. h의 style 객체에 커스텀 속성을 넣기만 하면 CSS 애니메이션에 전달되지 않는다.

### ctx와 저장 시점

- `scene/ch/kind/main/page/startStep/signal`은 현재 화면의 데이터·DOM·재개 지점을 제공한다.
- `readonly/revisit`인 화면은 능력·보상·인연·물건·일지 기록을 다시 쓰지 않는다. `autoAdvance`는 자동 준비로 채운 사건을 현재 진행에서 지나가는 경우이며, 기록을 더하지 않고 다음 위치만 저장한다.
- `ctx.alive()`는 현재 화면인지 확인한다. 비동기 대기 뒤 확인하고 signal의 abort 때 타이머·관찰자·애니메이션을 해제한다.
- `ctx.step(name)`은 화면 data-step을 바꾸고 쓰기 가능한 현재 진행이면 저장한다. 사건의 grade 단계에서 완료 기록을 확정한다.
- `ctx.finishEvent()`는 두 준비 뒤 등급·보상과 실제 사건의 done·다음 pos를 한 번의 저장으로 확정한다. 자동 준비 사건을 done으로 바꾸지 않는다.
- `ctx.section(className)`은 본문 section, `ctx.tray(content)`는 아래 진행 자리다. `ctx.next(label,options)`는 클릭이면 true, 이탈이면 false인 Promise다.
- `G.app.screens[kind](ctx,scene)`으로 화면을 등록한다. scene 훅은 매 화면, chapter 훅은 장 안내 뒤, between 훅은 완료 저장 뒤에 호출한다. 마친 장면 다시 보기에서는 chapter/between을 생략한다.
- `G.app.current()`는 `{scene,ch,kind,step,revisit,autoAdvance,data}`를 반환한다. 모든 열기 경로는 canOpen을 거친다.
- `G.app.wake()`는 c3-staff의 쓰기 가능한 첫 클릭에서만 awake·awakeAt을 저장한다. 결과·일지·장부에 필요한 events·best·items 등의 기록을 삭제하거나 수치 0으로 덮지 않는다. 꿈 화면을 닫고 결과에는 최고값→0이라는 주제 표현을 그린다.

### 꿈 밖 화면의 걸음

| kind | data-step 차례 | 기록 |
| --- | --- | --- |
| cut | cut | 컷신 도중 종료하면 처음부터 재생 |
| wish | wish | selected·wrong 즉시 저장, 다섯 소원을 마치면 a-wish 확정 |
| waking | waking → staff → strike → shatter | 시트가 없으면 strike 대기 생략. staff 클릭 때 깨어남 저장 |
| journal | activity → journal-bond → journal-pearls | 맞대기 먼저 확정, 어느 인연 잇기 선택이든 미색 공개·찾은 구슬 카드 뒤집기 |
| interp | interp-dialogue → interp-pick → interp-answer → interp-revise → ending | first는 응답 듣기 진입 전에 저장, heard는 응답 뒤, final 뒤에는 다시 수정하지 않음 |

5장 대화 일부를 마친 상태에서는 앞선 걸음을 생략할 수 있다. lastWords는 카드가 섞인 배열도 허용한다. 구슬을 놓친 카드는 흐리게 남으며 장부 점수로 바꾸지 않는다.
