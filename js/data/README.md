# 내용 데이터 형식 약속

내용 데이터의 유일한 형식 기준이다. 파일은 script로 읽고 `window.GUUN` 아래 값을 둔다.
데이터에 함수나 getter를 넣지 않는다. 새 플레이는 이동·대화·관찰·물건 상호작용이며 사건·결말·벼슬·집 단계는 고정이다. 구판 준비·윤목·수치는 호환 보존용이다.
임시 내용은 `tests/fixtures/`에만 둔다. `?fixture=1`은 stub이며 저장도 분리된다.

## 파일

| 파일 | GUUN 열쇠 | 내용 |
| --- | --- | --- |
| people.js | people | 인물·얼굴·표정 |
| chapters.js | chapters | 장 안내·지난 이야기·기본 곡·설정 카드 |
| scenes.js | scenes | 모든 진행 단위, 원작 차례 |
| wishes.js | wishes | 다섯 소원 |
| bonds.js | bonds | 인연 카드 |
| house.js | house | 이야기 조건에 따른 생활 공간·구판 장식 자리 보존 |
| journal.js | journal | 맞대기와 인연 잇기 |
| interp.js | interp | 문답·해석·근거·대사의 답·결말 |
| notes.js | notes | 작품·이본·교사 안내·화면 문구 |
| bgm.js | bgm | 기존 음원 정보, 도구로만 생성 |
| sprites.js | sprites | 승인된 그림과 방향별 걷기 메타 |
| maps.js | maps | 공유 장소·보행 칸·대상 |
| experiences.js | experiences | 장면별 순서 있는 행동·본문 줄 참조·원작 효과 |
| challenges.js | challenges | 원작 위기 대목의 도전과 생각 선택 |

`js/core/data.js`의 FILES가 위 파일을 읽는다. 모든 진행 단위는 scenes에, 승인된 동작·아이콘 메타는 sprites에 둔다.

본편은 `optional`이 없는 28단위이며 `c1-bridge`부터 시작한다. `cut-josin`만 `optional:true`로 보존한다. 결과의 선택형 비교 읽기에서만 읽으며 본편 목록·목차·진행 저장에 넣지 않는다. 다른 장면에 optional을 붙이면 데이터 오류다. 옛 `pos:cut-josin` 기록은 현재 본편의 재개 위치로 이어 간다.

scenes의 `guide`는 140자 이하 문자열이며 앞 장면과 이번 장면을 잇는 '이야기 길잡이'다. 월드 장면에서 그 장면의 첫 행동을 하기 전까지 위쪽에 보이고 누름을 가로채지 않는다. 장 안내의 지난 이야기처럼 안내 글로 보아 이야기 총량에서 뺀다. 숨은 정체·미래 사건·이본마다 다른 세부를 쓰지 않는다.

`notes.mission`은 `{title,lead,goals[],why,start}`이며 새로 시작할 때 돌다리 위 임무 창과 이야기 지도(목차)에 보인다. 기록을 쓰지 않는다. 미래 사건·숨은 정체·인연 개수를 쓰지 않는다.

`notes.comparison`은 `{scene,title,lead,question}`이며 scene은 선택형 자료 id다. 비교 읽기는 기본으로 접혀 있고 열거나 읽어도 점수·진행·깨어남·해석을 바꾸지 않는다.
이본 노트의 `comparison`이 자료 id를 가리키면 해당 비교 읽기 안에만 표시하고 일반 이본 노트에서는 제외한다.

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

## maps와 experiences

승인된 `prop-floor-wood` 또는 `prop-floor-grey`를 map.art로 지정하면 32px 바닥을 맵 칸마다 정수 배율로 반복한다. 전체 방으로 이미지를 늘이지 않는다. 벽·가구는 승인된 prop 키를 사용하는 objects와 walk 마스크로 배치한다. 이는 승인 그림을 재사용하는 맵 구성이며 새 그림 파일을 만들지 않는다.

`rpg-front`는 기존 도입 여섯 단위부터 봉래전까지 앞부분 열다섯 단위의 명시 대표 프로필이다. 기존 28단위 production 검사와 별도로 순서·종류·장·필수 체험·승인 자산을 엄격 검사하며 학습과 재탄생에는 체험을 강제하지 않는다. 앞 성취를 저장 주입으로 만들지 않고 처음부터 실제 행동으로 시전·악기를 받아 이어 간다.

꿈 공통 도구는 `G.dream`이 제공한다. `picture/overlay`, `wishList`, `pearlKeep`, `items`, `reached`를 집·보따리·구슬·일지가 함께 쓰며 말판 자료나 준비 모듈을 요구하지 않는다. 꿈 보따리 탭은 `house/bonds/items/wishes/pearls`이고, 깨어난 일반 학생에게는 `wishes/pearls`만 남는다. `items`는 장면의 물건 정의와 저장된 물건 id를 맞대어 보여 줄 뿐 별도 개수·점수를 저장하지 않는다.

두 파일은 GUUN.maps와 GUUN.experiences에 순수 배열을 대입한다. 함수·getter·G 호출을 넣지 않는다. 실제 자료에는 승인 자산 키만 사용한다. placeholder는 명시 시험 프로필에만 허용하며 실제 자료 검사에서 거부한다.

| 자료 | 형식 |
| --- | --- |
| map | {id,width,height,tile,walk,art,objects}. id는 유일 문자열, 크기는 양의 정수. walk는 height×width의 0/1 배열, 1이 보행 칸 |
| object | {id,x,y,kind,solid,label,visibleAt,action,person?,sprite?,verb?,decor?}. id는 맵 안에서 유일, x/y는 맵 안 정수. kind는 npc/item/scenery/exit/pearl. solid는 boolean, action은 행동 id 또는 null. person은 실제 인물 id이며 label과 구분. verb는 행동 단추·지금 할 일에 보일 8자 이하 동사(예: 앉기, 불기)이며 없으면 행동 종류의 기본 동사(말 걸기·살펴보기·사용하기·길 따라가기)를 쓴다. decor:true는 action:null인 장식(예: 돌다리의 팔선녀)으로 대상 목록·초점·누르기에서 빠지고 solid면 통행만 막는다. person·verb를 두지 않는다 |
| experience | {scene,map,actor,spawn,beats,optional}. scene은 기존 id, actor는 seongjin/yang, spawn은 {x,y,facing}, facing은 up/down/left/right. 안전 입구는 보행 가능하고 공개된 solid 칸이 아님 |
| beat | {id,trigger:{kind,target},lines,effects,map?,spawn?,appearance?}. id는 장면의 beats와 optional 전체에서 유일. kind는 inspect/talk/use/exit/continue/staff. target은 현재 map 대상 id, continue/staff는 null |
| lines | 해당 scenes.lines의 0기준 정수 인덱스 배열. 본문을 복사하거나 text 필드를 추가하지 않음 |
| effect | {kind,id}. kind는 item/bond/pearl/story/none. item은 해당 장면의 기존 물건 id, bond/pearl은 최초 meet 인연 id, none은 id:null. 수치·소원·보상 필드 금지 |
| optional | beat 배열이며 필수 완료에 포함하지 않음. 장소 전환·출구·staff와 필수 물건·인연·원작 사실 수령은 두지 않음. 구슬 효과는 optional에만 둠 |

house.stages의 각 단계는 `{id,name,from,fromStory?,img,story?,size?,slots?}`다. 현재 화면은 `from` 또는 `fromStory`의 이야기 조건으로 단계를 정하고 `img`와 `story`를 표시한다. `fromStory`가 있으면 해당 원작 사실을 실제 행동으로 얻었거나 `from` 장면을 마친 옛 기록에서만 단계를 연다. size/slots는 구판 자산 위치 자료로 보존하지만 재화나 물건 수로 공간을 꾸미지 않는다.

visibleAt:[]는 이 experience에서 항상 보인다. 값이 있으면 현재 scene:필수beat 문자열이 목록에 있을 때만 보인다. 모든 공개 단계는 해당 map을 사용하는 실제 필수 beat를 참조한다. 숨긴 정체는 호칭·초상·대상 목록·자산 이름에도 미리 나타내지 않는다.

공유 지도에서 공개되는 action은 각 scene/beat마다 그 장면의 행동 id와 대상 id에 연결돼야 한다. 필수 행동은 정의된 수행 단계의 지도도 현재 공개 지도와 같아야 한다. 공개된 미래 필수 행동을 현재 단계로 강제하지는 않으며 수행 순서 검사는 별도로 유지한다. 연결이 없는 공개 대상은 visible-action: scene:beat/map/object 경고로 시작을 막는다.

beat의 map/spawn은 그 행동을 수행하는 단계에 들어갈 때 적용한다. map 전환에는 새 안전 spawn이 필요하다. 두 필드가 없으면 이전 장소·유효 위치를 유지한다. appearance가 없으면 해당 이야기 단계의 기본 옷을 쓴다. 화면은 장소 전환 때 현재 대화·이동·관찰자를 취소한다.

첫 선방 c1-cell과 마지막 c3-awake는 map-cell을 공유한다. 재탄생·학습·컷신·결과에 experience를 강제하지 않는다. c1-rebirth를 제외한 scene, event, link에는 실제 experience가 필요하다. staff를 commitWake로 저장할 때는 c3-staff의 마지막 필수 beat에 kind:staff/target:null을 둔다. staff 기록만으로 awake를 추정하지 않는다.

staff는 자동 안내로 마치지 않는다. 교사 바로가기의 앞선 자동 안내에서도 타격 전 staff를 자동 완료로 만들지 않는다. 옛 auto staff가 남아 있으면 실제 입력을 기다리고 commitWake의 원자 저장으로만 실제 타격 행동·완료·awake/awakeAt·선방 위치를 확정한다. 그때 기존 teacher 힌트와 다른 auto·옛 기록을 보존한다. 일반 transact/apply/finish는 auto staff를 실제 완료로 바꾸지 못한다. 교사 미래 장면 미리보기는 readonly이며 학생 pos나 대상의 active·수행 기록을 만들지 않는다.

story는 해당 행동의 원작 단계 id인 scene:stage 문자열이다. 소원이 소비하는 고정 id는 e08-wonsu:appointment, e11-seungsang:appointment, e11-seungsang:portrait다. l-namjeon에는 it-geomungo/it-tungso, e12-honrye에는 it-girinpo의 필수 수령 효과가 필요하다. 여덟 최초 meet에는 필수 bond와 선택 pearl 효과를 각각 둔다. facts는 저장된 actions에서 파생하며 별도 점수 저장은 없다.

시작 전에 모든 맵·장면·줄·대상·행동·효과·가시성 참조, 안전 입구, 필수 대상 인접 칸 경로, 출구 순서를 검사한다. 실제 누락 콘텐츠를 시험 대체 자료로 통과시키지 않는다.

## 장면 공통과 차례

`{ id, ch, kind, title, img?, bgm?, lines?, narration?, heading?, reality? }`

- ch는 문자열 0~5 또는 R, kind는 필수다. lines는 줄 배열, narration은 문자열 또는 줄 배열이다.
- kind는 cut, scene, wish, event, link, waking, journal, interp, result만 쓴다.
- 자료 배열의 차례(선택형 cut-josin은 본편 진행에서 제외): cut-josin → c1-bridge → c1-cell → c1-wish → c1-exile → c1-rebirth →
  e01 → l-namjeon → e02 → e03 → e04 → e05 → l-hebei → e06 → e07 → l-bongnae →
  e08 → e09 → e10 → e11 → e12 → c3-feast → c3-monk → c3-staff → c3-awake →
  c4-journal → c5-dialogue → c5-ordination → r-result.
- 사건 id는 `e01-<이름>`부터 `e12-<이름>`까지다. 실제 id는 아래 사건 표와 같으며 저장 기록이 가리키므로 유지한다.
- cut-josin은 cut/0, c5-ordination은 cut/5, c3-staff는 waking/3이다.
- c3-awake는 scene/3이며 유일한 awakened:true다. 이 장면 앞은 깨어난 뒤 잠긴다.
- c4-journal은 journal/4, c5-dialogue는 interp/5, r-result는 result/R이다.
- 나머지 c1·c3 장면은 scene이다. c1-wish만 wish다. 구형 read/activity/mind/flow는 쓰지 않는다.

## 사건 event와 구판 호환

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
  meet: 'chae',
  pearl: { x: 30, y: 40, r: 7, trace: 'fiction', hint: '흔적' },
  remeet: [{ bond: 'chae', story: '다시 만난 사연' }],
}
```

새 체험은 scenes.lines/items/meet와 experiences를 소비한다. 예시의 preview/clues/core/gradeText 및 준비 설명은 남아 있는 구판 데이터의 호환 형식이며 새 성장 계산에 사용하지 않는다. clues가 남아 있으면 예고에 있는 낱말인지, core가 남아 있으면 기존 능력 enum인지 검사한다.
능력 id: munjang(문장), eumak(음악), muye(무예), jiryak(지략).
사건 순서의 core는 문장, 문장, 음악, 문장, 지략, 지략, 음악, 무예·지략, 무예, 지략, 무예·지략, 문장이다.
11·12번만 원작 검증 뒤 조정할 수 있다. 처음 만나는 번호는 1,2,3,5,6,7,9,10이다.
여덟 곳에 서로 다른 meet와 구슬 객체 하나씩 둔다. pearl의 좌표·반지름은 백분율이다.
trace가 canon이면 canon 근거 글도 둔다. 원작 구슬 근거는 정경패와 난양공주뿐이다.
물건은 `{id,name,img,desc,fills:[],slot}`이다. slot은 in/yard/any다. 없는 사건도 items:[]를 둔다.
재회는 `remeet:[{bond,story}]` 배열로 쓴다. app.remeets는 이전 단일 객체도 읽지만 새 데이터는 배열로 통일한다.
인연 이름·aliases 뒤에 여인을 소유 대상으로 쓰는 등급 문구는 금지다.
grade-object는 이름·목적격 조사 뒤의 얻/차지/맞이/데려를 검사한다.
그 사이에 아내로·자신의 것으로 같은 소유 보어, 집으로·내 곁으로 같은 방향 표현,
마침내·온전히 같은 부사가 이어져도 검사한다. 허용하는 중간 표현은 data.js의 OBJECT_MODIFIERS에 모은다.
이름만으로 차단하지 않으며, 다른 절에서 시·곡조·평판을 대상으로 쓴 동사까지 이어 잡지 않는다.
구판 등급 글도 가춘운·적경홍의 속임수를 간파하는 내용으로 바꾸지 않는다. 현행은 정해진 공개 서술을 읽은 뒤 실명·초상을 보여 주며 등급별 결과를 만들지 않는다.

새 사건의 완료는 ctx.finishExperience로 필수 행동·done·다음 pos를 함께 저장한다. 직접 다시 보기는 readonly다.

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

link: `{ id: 'l-namjeon'|'l-hebei'|'l-bongnae', ch: '2', kind: 'link', title, img?, bgm?, lines, bonus: { abil: { eumak: 2 }, items: [물건] } }`.
준비·등급은 없다. bonus.abil의 남전산 음악 덤 2는 구판 자료 호환값으로만 보존한다.
bonus.abil은 구판 호환 값이다. 새 이음은 물건 수령의 행동 사실만 일회 저장하며 능력 덤을 적용하지 않는다.

wish: `{ id: 'c1-wish', ch: '1', kind: 'wish', title, monologue, words: [{ id, text, wish? }], answers: [낱말id], memo }`.
monologue는 문자열, words.text는 그 안에 있는 누를 낱말이다. 정답 다섯에는 wish로 소원 id를 연결한다.
answers에는 정답 낱말 id 다섯을 둔다. 독백의 다른 바람을 오답으로 쓰지 않는다. 활동 id는 a-wish다.
현재 정답은 출장입상·부귀·미색·풍류·공명, 오답 낱말은 물그릇·경전·염주다. 두 번째 오답부터 메모와 정답 보기 단추가 보인다.
정답 보기는 남은 낱말을 강조한다. 선생님 정답 채우기는 선택 목록을 채운다. 한 번 고른 낱말과 오답 횟수는 즉시 저장한다.

## 말판·소원·인연·집

- 구판 말판(board.js·장면의 square)은 2026-10-07에 지웠다. 현행 화면은 말판을 읽지 않는다.
- wishes: `[{ id, name, hanja?, evidence, parts?, dreamHidden? }]`.
  출장입상·공명은 저장된 원작 단계, 부귀·풍류는 원작 물건 수령 사실에서 계산한다. 옛 능력·재화·최고값은 입력이 아니며 미색은 꿈 내내 숨긴다.
  G.app.wishes()는 `{ id, name, fill, hidden, half, filled, parts, sources, level, canonFull, peakLevel, secret }` 배열이다. fill은 원작 바닥만의 0~1, level은 고른 말까지 더한 표시값/최대(0~1), peakLevel은 최고값/최대이며 미색은 둘 다 null이다. canonFull은 원작 바닥이 가득, secret은 숨긴 소원이다. 숨긴 이름은 `?`다. parts는 `{id,name,filled}` 배열이다. 막대 계산·되짚기는 G.play(js/core/play.js 머리말)다.
- bonds: `[{ id, name, aliases?, face?, status, ability, story, place, fairy, fairyFace?, color? }]`.
  ability는 설명용 문자열이다. grade/grades/gradeText/shine/fine/near와 fills/wish/abil/res/reward는 금지다.
  인연은 소원 막대에 영향을 주지 않고, 띠의 여덟 칸(●○) 밖에서 수로 세지 않는다.
- house: `{ stages: [{ id, name, from: 장면id, img, slots: [{ id, x, y, w, kind: 'in'|'yard' }] }], fiction? }`.
  stages에는 위에서 정의한 fromStory와 story도 사용할 수 있다. 현재는 이야기 조건으로 공간의 그림·설명을 표시하며 items를 칸에 자동 장식하지 않는다. slots는 구판 장식 좌표로 보존한다.
  새 체험은 재화나 물건 수를 꾸밈 입력으로 쓰지 않으며 직접 배치·효율은 없다.

## 일지·해석·노트

journal: `{ id: 'j-match', title, prompt, memo, pairs: [{ id: 'j-…', event, kind?, wish, evidence, memo? }], bondLink: { id: 'j-bond', prompt, choices, answer: 'misaek', reveal } }`.
채점할 다섯 pairs만 둔다. 장수·재상→출장입상, 도포와 옥대→부귀, 두 악기→풍류, 기린각→공명.
드러난 소원 넷을 선택지로 쓰며 재사용 가능하다. 해석 짝과 마음 나란히 보기는 없다.
bondLink는 어느 선택이든 미색을 드러낸다. 인연 잇기와 구슬은 채점하지 않는다.

interp: `{ question, options: [{ id, text, fits? }], evidence: [{ id, text, from?, after?, template? }], recap, dialogue: [줄], lastWords: 줄 또는 [줄], ending: [줄] }`.
options는 네 개, evidence는 이야기에서 읽는 열 개와 틀 근거 E11 하나를 더한 열한 개다. fits는 해석의 관련 근거 목록이며 채점 정답이 아니다. fits의 id는 모두 evidence에 있어야 한다. 틀이 아닌 근거 text는 실제 이야기 한 줄에 그대로 있어야 한다.
E1~E7은 1·3장, after:true인 E8~E10은 대사의 응답에 나온다. after 근거는 응답 뒤에만 보인다. 응답 전에 고르고 들은 뒤 한 번만 고친다.

### 되짚기 틀과 E11

틀 문장은 데이터 파일에 순수 문자열로 두고, 화면이 학생 기록(고른 말·첫 결과·숨긴 소원·가장 찼던 소원)으로 채운다. 자리 표시는 `{이름}`이고, 바뀌는 앞말에 조사가 붙으면 `{이름:을/를}`처럼 조사 한 쌍을 적는다. 화면은 채운 값에 G.util.josa로 고른 한 꼴만 붙인다(두 꼴을 함께 내지 않는다). 쓸 수 있는 조사 쌍은 을/를·이/가·은/는·와/과·으로/로다. 틀에 숫자를 쓰지 않으며, 허락되지 않은 자리 이름이나 남는 중괄호가 있으면 데이터 오류다.

`evidence`의 `{ id:'E11', template:true, text, from }`는 '내가 꿈에서 고른 길'이다. text는 `{top:을/를}` 자리를 가진 틀이고, top은 학생이 가장 많이 고른 쪽의 이름이다. 소원 쪽이면 `recap.pickName`을 그 소원 이름으로 채운 값, 물러남이면 `recap.stayName`이다. 같은 횟수가 여럿이면(▲끼리 또는 ▲와 물러남) 모두 가운뎃점(·)으로 잇는다. E11은 i-own의 fits에 들어 있다. 학생의 선택 기록이 하나도 없으면 화면에 보이지 않는다. 틀 근거는 template:true로 표시하며, 이야기 줄에 있어야 한다는 검사에서 빠진다. 이야기 글 셈에는 가장 길게 채운 꼴(top에 네 소원 쪽 이름과 stayName을 모두 넣은 줄)로 든다. 지금 틀 근거는 E11 하나뿐이다.

`interp.recap`은 5장 c5-dialogue 첫머리, 기존 대사 "사람의 세상을 겪어 보니 어떠했느냐?" 앞에서 육관대사가 하는 되짚기다. 아래 차례로 줄을 만든다.

| 열쇠 | 자리 | 쓰임 |
| --- | --- | --- |
| chose | items | 1. 고른 말. items는 `item`을 채운 조각을 ", "로 이은 값. ▲를 한 번 이상 고른 소원을 wishes 차례로, 이어서 물러남을 한 번 이상 골랐으면 그것을 둔다. 0번인 쪽은 말하지 않는다 |
| item | name, times | 조각 하나. name은 pickName 또는 stayName을 채운 값, times는 counts의 말 |
| pickName | wish | 소원 쪽 이름. wish는 소원 이름(wishes.name) |
| stayName | — | 물러남 쪽 이름 |
| counts | — | 횟수를 숫자 없이 말하는 낱말 배열. 0기준 n번 칸이 n+1번이다. 길이는 소원을 움직이는 선택 자리 수 이상 |
| none | — | 1의 대체 줄. 학생 기록이 하나도 없을 때 chose 대신 쓴다 |
| teacher | — | 학생 기록도 있고 선생님 도움으로 넘긴 자리도 있을 때 chose 뒤에 더하는 줄 |
| first | — | 2. 첫 결과. `[{challenge, ok, fail}]` 배열이며 challenge는 talk가 아닌 도전 id다. 차례대로, 첫 판가름이 성공이면 ok, 실패면 fail 문장을 쓴다. 판가름이 없으면 말하지 않는다. 지금은 ch-chunun-ghost와 ch-yoyeon-night |
| wishLine | secret, peak | 3. 숨긴 소원과 가장 찼던 소원. secret은 숨긴 소원 이름, peak는 가장 찼던 소원 이름들을 ·로 이은 값(같은 값이 여럿이면 모두) |
| peakOnly | peak | 3의 대체 줄. 숨긴 소원이 없을 때 |
| ask | — | 4. 물음 "그 삶은 처음 바라던 삶과 같았느냐?". 답을 고르는 칸은 없고 이어서 기존 대사와 해석 고르기로 간다 |

recap의 다른 열쇠는 쓰지 않는다. 되짚기 틀은 이야기 글 셈에 든다(아래 '검사와 이야기 글 셈').

notes: `{ work, variants, discuss, teacher: { when, time, questions, extra, ledger }, ui }`.
teacher.ledger의 구판 적중·등급 문구는 새 사건 행에서 사용하지 않는다. 새 행은 상태·살펴본 근거·도움을 보여 준다. discuss는 생각 나눔 질문 두 개의 문자열 배열이다.
ui는 아래처럼 글과 카드의 값만 둔다. 어떤 문구를 실제로 쓸지는 해당 화면 모듈이 정한다. 결과 화면은 저장 기록에서 만든 하나의 모델을 DOM과 PNG가 함께 쓰며 `dreamTrace:{before:{label,image},after:{label,image},evidence}`를 포함한다. 현재 image는 승인된 `map-chwimi`와 `map-cell`이다.

```text
ui
  abilities: {munjang,eumak,muye,jiryak} → 표시 이름
  actions: {study,geomungo,sword,strategy} → 표시 이름
  grades: {shine,fine,near} → 표시 이름
  resources: {gong,fame,wealth} → 표시 이름
  fiction: {prep,score,comic,pearls,items} → {mark:'fiction',id,title,body,real}
  result: {before,after,save,bonds,secretWish,noSecret,peak,recap} (zero·scoreNotice는 구판 호환 문구이며 새 결과에서 사용하지 않음)
  journal: {pearls,unfound,unscored}
  secretWish: {title,prompt,hint,button,review,saved,teacher,retry}
  band: {label,wish,levels[5],hidden,secret,bonds,bondCounts[9],separator}
  choice: {up,down,stay,first}
  collapse: {label,bonds}
  preview, prep, clue, grade, wishHidden, pearl, staff, teacherPeek, audioNotice: 문자열
```

| 열쇠 | 쓰임 |
| --- | --- |
| result.bonds | 결과와 무너짐 뒤에 남는 '꿈에서 만난 인연' 제목. 수를 세는 말은 붙이지 않는다 |
| result.secretWish, result.noSecret | 결과의 숨긴 소원 제목과, 고르지 않았을 때의 값 |
| result.peak | 소원별 가장 찼던 정도에서 빈 선방으로 이어지는 막대 그림의 제목 |
| result.recap | 결과의 되짚기 요약 제목 |
| secretWish | 1장 소원 찾기 바로 뒤 숨긴 소원 고르기의 제목·물음·도움말·확인 단추, 다시 읽기에서 보이는 제목 |
| band.label | 소원 띠의 화면 낭독 이름 |
| band.wish | 소원 한 칸의 낭독 틀. `{wish}`는 소원 이름, `{level}`은 levels의 말 |
| band.levels | 소원의 정도를 비어 있음→가득 참 차례 다섯 낱말로 말한다. levels[Math.round(표시값 ÷ 최대 × 4)]를 쓴다(최대가 4이면 표시값 그대로). 숫자를 쓰지 않는다 |
| band.hidden | 미색 칸의 낭독 틀. `{wish}`는 미색의 이름이며 값은 말하지 않는다(예: 미색 알 수 없음). 눈에 보이는 칸은 꿈 내내 '?'다 |
| band.secret | 숨긴 소원 칸에 붙는 작은 표식의 낭독 말 |
| band.bonds, band.bondCounts | 인연 여덟 칸의 낭독 틀과 `{count}`에 넣을 말. bondCounts의 n번 칸이 찬 칸 n개다. 이 낭독 말 밖에서는 인연 수를 세지 않는다 |
| band.separator | 낭독 조각을 잇는 말 |
| choice.up, choice.down, choice.stay | 고르기 전 선택지 옆의 방향 표시. 소원 이름 뒤에 up/down을 붙이고(예: 공명▲ 풍류▼), 물러남에는 stay를 쓴다. 숫자를 쓰지 않는다 |
| choice.first | 끝난 장면을 다시 읽을 때 학생이 처음 고른 선택지에 붙는 표시 |
| collapse.label, collapse.bonds | 난간 타격 뒤 무너짐 연출의 낭독 말과, 이름이 나타났다 사라지는 자리의 제목 |

ui의 새 문구에는 숫자를 쓰지 않는다. 인연은 띠의 낭독 말 밖에서 수로 세지 않는다.

인연 카드의 등급별 갈림이나 수치 보상은 ui에도 넣지 않는다.
소원 값은 학생 화면·결과·장부 어디에도 숫자로 쓰지 않는다. 깨어날 때의 무너짐은 막대가 비는 연출(collapse)로만 보인다.

## 저장 v3와 규칙 API

열쇠는 guunmong-v3 또는 guunmong-v3-fixture-<이름>. v3가 없을 때 같은 이름의 v2에서 설정 넷만 읽고 진행·기록은 가져오지 않는다. v2·v1은 고치거나 지우지 않는다.
fresh()의 열쇠:

- 설정: music, sound, big, teacher. reset 뒤에도 유지한다. mode는 없다.
- 진행: started, pos(null 또는 문자열), step, reach, done, awake, awakeAt.
- 기록: items:[id], bonds:[id], pearls:{인연id:true}, seenFiction:{id:true}, ledger, wrong, journal, interp.
- 체험: rpg:{v:1,run,cursor,scenes}.
- 선택과 첫 판가름: play:{secretWish:null|소원id, choices:{자리id:{option}}, firsts:{도전id:{ok:true|false|null, clues?, tried?}}, peak:{chuljang,bugwi,pungryu,gongmyeong}}. ok:null은 search 첫 판의 판가름 전이며 tried에 헛짚은 곳이 쌓인다. peak는 0~4 정수이며 깨어남 저장과 함께 동결한다.
- 기타: v:3, name, startedAt, finishedAt.

옛 판의 abil·res·best·events는 v3에 없다. play 안은 데이터에 있는 자리·선택지·도전·곳 id와 위 자료형만 받는다.
ledger는 a-wish·j-match만 받으며 `{first:true|false|null, help:null|'student'|'teacher', final}`이다.
선생님 도움이 먼저면 first:null, final 뒤에는 불변이다. wrong은 `[{act,slot,picked,answer,note?}]`다.
journal은 `{ wish?: {selected:[낱말id], wrong:수}, match?: {picks,tries,memoOpen}, bondLink?: 소원id, revealed?: {misaek:true} }`이다. match의 활동 진행은 G.activity.mount가 관리한다.
interp는 `{first:{option,evidence}, heard, changed:{option,evidence}|null, revised, final}`이다.

새 하위 저장은 rpg:{v:1,run,cursor,scenes}다. run은 1~128자의 영문·숫자·밑줄·하이픈 고유 문자열이다. rpg가 없는 옛 판만 writer 최초 이관에서 UUID를 만든다. 기존 rpg의 run이 무효하면 새 run을 만들지 않고 unavailable로 열람만 허용한다. fresh/load의 미이관 상태는 rpg:null이며 이 상태를 저장하지 않는다. 저장된 rpg:null은 잘못된 기존 rpg로 처리한다.

cursor는 null 또는 {scene,map,x,y,facing}이고 scene은 pos, map은 현재 beat의 유효 지도와 일치해야 한다. solid·벽·범위 밖·다른 지도·다른 장면 위치는 안전 입구로 복구한다. scenes는 기존 id → {status,beat,actions,hint} 객체다. status는 active/done/auto, beat는 다음 필수 행동 id 또는 null, actions는 유일 {id,by:student|teacher} 배열, hint는 null/student/teacher다. actions의 필수 순서를 검증하며 무효 부가 필드만 기본화한다. 행동 없는 auto는 actions:[]의 auto로 보존한다. done은 필수 행동이 모두 기록된 경우에만 유지하고, 행동이 없는 기록은 active로 읽는다. 장부·해석·awake는 초기화하지 않는다.

읽기는 rpg 검증·복구 → 검증된 완료 정보로 pos 재개 판정 → 최종 pos의 cursor 검증 순서다. 옛 완료 근거도 없고 필수 actions도 빈 가짜 status:done으로 다음 장면을 열지 않는다. 있는 기록의 beat:null과 기록 자체가 없는 경우는 다르다. 전자는 마지막 단계 지도, 후자만 첫 단계 지도에서 시작한다.

### 저장 API

G.save.state는 깊게 동결한 읽기 전용 스냅샷이다. 직접 대입·push는 금지다. 모든 화면은 ctx 생성 때 읽은 run을 보존하고 변경 뒤 state를 다시 읽는다. 공통 options는 {by:'student'|'teacher',readonly:boolean,run:string}이다.

자료 준비가 명시적으로 실패한 `G.data.ok === false`에서는 core도 읽기·정규화·이관·권한 요청·저장을 거부한다. `load(fixture)`는 현재 스냅샷을 그대로 반환하며 저장 열쇠를 바꾸지 않는다. `acquireWriter()`는 false, 쓰기 API는 기존 실패 반환값을 주고 `access:'unavailable'`, `error:'data-not-ready'`로 알린다. 대기한 권한 콜백과 storage·pageshow 복귀도 같은 검사를 한다. run·awake·행동·해석과 저장 원문은 보존하며 `releaseWriter()`는 자료 실패 중에도 정상 해제한다. 자료 검사 성공 후 기존 load·권한 요청으로 재시도한다. 로더를 실행하지 않는 순수 단위 검사 자료는 ok 표식을 생략할 수 있으나 명시 false는 예외 없이 거부한다.

app이 접근을 확인하고 pos를 바꿀 때는 같은 draft에서 rpg.cursor도 cursor(data,새scene,그scene의현재beat)로 설정한다. 이 helper는 월드가 없는 학습·컷신에는 null을 반환한다. pos만 바꾸고 다른 장면의 cursor를 남긴 트랜잭션은 거부한다. ctx.alive와 run을 확인하고 성공 이후에만 화면·연출을 바꾼다.

| API | 입력·반환 |
| --- | --- |
| load(fixture?) | 기존 열쇠를 읽어 스냅샷 반환. 최초 이관 run은 만들지 않음 |
| access / error | acquiring/writer/reader/unavailable, 실패 코드 또는 null |
| acquireWriter() | Promise<boolean>. exclusive/ifAvailable로 권한을 얻고 최신 저장 재읽기·writer 이관 뒤 true |
| releaseWriter() | 즉시 쓰기 차단·수명 Promise 해제. 별도 열쇠·타이머 임대·steal 없음 |
| canWrite(run), write(run) | 소유권·현재 회차 검사, boolean. write는 현재 스냅샷을 저장하며 변경은 transact로 수행 |
| transact(run,change,{readonly?}={}) | mutable draft에 동기 change를 호출하고 성공한 저장 뒤 state를 교체. change가 false를 반환하면 취소. boolean |
| reset(run,{confirmed:true,cancel}) | 화면 취소 함수를 먼저 호출하고 설정 네 개만 남긴 새 run을 한 번 저장. boolean, 실패 시 기존 state/run 유지 |
| onChange(fn) | fn('access'|'storage'|'reset') 구독, 구독 해제 함수 반환. app은 기존 화면을 폐기·현재 권한으로 다시 그림 |
| beginExperience(sceneId,options) | 현재 체험 기록과 안전 위치를 준비. boolean |
| applyExperience(sceneId,actionId,options) | {ok,reason,record}. reason은 null/locked/readonly/blocked/duplicate/invalid/stale/unavailable. 현재 단계·공개 대상·인접 위치·수행자·중복·회차를 검사하고 효과를 함께 저장 |
| finishExperience(sceneId,options) | 같은 반환형. 필수 완료 뒤 done과 다음 pos 원자 저장. auto는 상태·행동을 보존하고 다음 pos만 이동 |
| commitWake(sceneId,actionId,options) | app.wake의 저장 접점. c3-staff staff 행동·awake/awakeAt·선방 pos를 원자 저장. 일반 apply/finish에서는 staff 거부 |
| move(facing,options) | 보행 완료 칸을 저장. boolean. readonly 다시 보기의 위치는 화면의 임시 상태에서만 이동 |
| experienceHelp(sceneId,who,options) | 도움 우선순위 유지. boolean |
| fillBefore(scenes,targetId,options) | teacher writer만 앞선 미기록 장면에 auto 안내. 추가 id 배열 또는 false. 부분 준비·기존 기록 보존 |
| ledgerTry(id,ok,options), ledgerHelp(id,who,options), ledgerDone(id,options), wrongNote(entry,options) | boolean. 두 활동의 첫 시도·teacher 도움·final과 첫 오답 보존 |
| recordFirst(challengeId,input,options), chooseSecretWish(wishId,options) | {ok,reason,first} / {ok,reason,secretWish}. 도전의 첫 판가름(시회는 고른 말과 함께)과 숨긴 소원. 생각 선택 자리의 학생 행동은 applyExperience의 options.choice로 행동과 한 저장. 입력·거부 이유는 js/core/play.js 머리말 |

실패한 저장은 이전 객체를 그대로 유지한다. 같은 run의 awake:true와 최초 awakeAt은 되돌리지 않으며 확인 초기화만 새 run을 만든다. 마친 done, 활동 final·첫 시도와 해석 first/final, play의 choices·firsts·secretWish·peak를 일반 트랜잭션으로 바꿀 수 없다. play는 recordFirst·applyExperience({choice})·chooseSecretWish로만 기록한다.

객체의 구조 동등 비교는 모든 안쪽 키집합·값·자료형을 검사하되 키 삽입 순서는 무시한다. actions 등 배열은 길이·인덱스·순서를 지킨다. 따라서 뒤 auto가 먼저 이관된 뒤 현재 부분 사건을 추가할 수 있으며 기존 배열을 정렬하거나 비교 조건을 생략하지 않는다.

### 순수 계산 API

| API | 반환·책임 |
| --- | --- |
| G.world.visible(object,scene,beat), objects(map,scene,beat) | boolean, 현재 공개 대상 배열 |
| walkable(map,x,y,scene,beat), adjacent(a,b) | 유효 보행 칸, 맨해튼 거리 1 검사 |
| move(map,cursor,facing,scene,beat) | 새 cursor 또는 null. 입력 객체 불변 |
| path(map,from,target,scene,beat,beside=true) | 시작을 포함한 {x,y} 경로 배열 또는 null. 기본은 대상 인접 칸, false면 대상 칸 |
| stage(data,sceneId,beatId) | {scene,map:지도객체,spawn,beat,actor,appearance} 또는 null. beatId:null이면 마지막 필수 단계의 지도 |
| G.experience.find(data,sceneId), record(experience), next(experience,actions), cursor(data,sceneId,beat) | 정의 조회, 새 active 기록, 다음 필수 id 또는 null, 안전 cursor 또는 null |
| normalize(state,data,newRun?) | rpg 또는 null 반환. 원래 state 불변, 기존 무효 run은 run:null로 열람만 허용 |
| resume(state,data), locked(state,data,sceneId), finished(state,id) | 안전 재개 id, 깨어남 잠금, 완료 판정(done 또는 rpg 상태 done) |
| validateAction(state,data,sceneId,actionId,options), apply(state,data,sceneId,actionId,options) | reason 또는 {ok,reason,record}. apply만 전달한 draft를 변경하며 DOM·저장소·app 호출 없음 |
| facts(state,data), wishes(state,data) | 원작 story id 배열, 소원 표시 배열(fill=원작분, level=표시값÷4, canonFull, peakLevel, secret). 선택분은 G.play에서, 인연은 입력 아님 |
| storyIds | wonsu/seungsang/portrait의 고정 단계 id 객체 |
| G.play.canon/choiceSum/values(state,data), sites/siteAt/challenge/after/first, recap/recapLines/e11(state,data), fill(template,values) | 소원 막대·선택 자리·첫 결과·5장 되짚기의 순수 계산. 형식은 js/core/play.js 머리말 |

## 위기 도전과 생각 선택

challenges는 배열이며 항목은 {id,scene,beat,kind,...}다. id는 ch-로 시작하고 유일하다. scene/beat는 실제 experience의 필수 beat다. 한 beat에는 도전(talk 아닌 것) 하나와 생각 선택(talk) 하나까지 둘 수 있다. 같은 beat에 둘이 있으면 도전을 푼 뒤 생각 선택을 묻는다. 처음 수행할 때 도전을 풀어야 그 beat의 행동이 기록되며 다시 읽기에서는 기록 없이 해 볼 수 있다.

모든 도전의 첫 판가름과, 소원을 움직이는 선택 자리에서 학생이 처음 고른 선택지는 기록되어 소원 막대·뒤 장면 변화·5장 되짚기에 쓰인다. 기록의 모양과 거부 조건은 저장 쪽 계약이 정하며 이 자료에는 기록 필드를 두지 않는다. 첫 결과는 막대를 움직이지 않고 채점·장부에도 들어가지 않는다.

| kind | 필드 |
| --- | --- |
| talk | at(그 beat lines 배열의 0기준 위치. 이 줄을 보인 뒤 고른다), prompt, options[{id,label,reply:{say?,text},wish?,stay?}] 둘 이상, note?. 무엇을 골라도 다음 원작 대사로 이어진다. 게임이 꾸민 선택 자리이면 note에 그 사실을 적는다 |
| pick | title, intro, options[{id,label,reply,wish?}], answer, note, music?. 틀린 선택지의 reply가 이야기 속 대가이고 그 선택지만 잠긴다 |
| deduce | title, intro, clues[문자열 둘 이상], question, options[{id,label}], answer, fail, success, note, after?. 질문과 선택지는 처음부터 보이고 단서는 원할 때 펼친다. 틀리면 fail 뒤 아직 닫힌 단서 하나가 펼쳐진다 |
| search | title, intro, spots[{id,label,clue?}] 셋 이상, answer(clue 없음), tries(1 이상, 자리 수 미만), fail, success, note, after?. 틀린 자리는 clue를 보이고 기회를 하나 쓴다. 기회가 다하면 fail 뒤 처음부터 다시 한다 |
| sequence | title, intro, instrument(flute/zither), notes[{label,midi}] 3~7, rounds[[음 번호…] 길이 3 이상], fail, success, note. 들려준 가락을 빛과 소리로 함께 보인다 |

note는 성공한 뒤(생각 선택은 고른 뒤) '원작과 게임'에만 보인다. 숨은 정체를 title·intro·선택지에 미리 쓰지 않는다. 점수·시간 제한·게임 오버·장부 필드를 두지 않는다.

### 소원 증감과 물러남

선택지의 `wish`는 `[{ wish, step }]` 배열이며 그 선택지를 처음 골랐을 때 소원 막대가 움직이는 방향이다.

- wish는 드러난 소원 넷 chuljang·bugwi·pungryu·gongmyeong만 쓴다. misaek은 값이 없고 꿈 내내 '?'이므로 어떤 선택도 움직이지 못한다. 그 밖의 id도 오류다.
- step은 1(▲) 또는 -1(▼)뿐이다. 한 선택지 안에서 같은 소원을 두 번 적지 않는다. 배열은 비우지 않는다.
- wish는 talk와 pick의 선택지에만 둔다. deduce·search·sequence의 첫 결과는 막대를 움직이지 않는다. 인연 카드·구슬(scene.pearl)·체험 효과에도 소원 증감을 두지 않는다.
- 풍류(pungryu)는 시·음악에 관한 말로만 움직인다. pungryu가 든 선택지는 `music:true`로 표시한 자리에만 둔다. music은 true만 쓴다.
- 여인 앞의 선택은 만남이 아니라 고른 말의 성격만 반영한다.
- `stay:true`는 물러남(소원 그대로)이다. talk 자리에만 두며 wish와 함께 쓰지 않는다. 소원을 움직이는 talk 자리에는 물러남 선택지가 정확히 하나 있다. 정답이 있는 pick(시회)에는 물러남이 없다.
- pick에서는 처음 누른 선택지의 wish만 반영한다. 그 뒤 다시 골라 정답에 닿아야 원작대로 진행한다.
- 선생님용으로 고르거나 바로가기로 넘긴 자리, 깨어난 뒤, 다시 읽기의 선택은 막대를 움직이지 않는다.

이번 묶음의 선택 자리는 아래뿐이다. ch-bridge-reply·ch-gyeonghong-reply는 소원을 움직이지 않으므로 wish·stay를 두지 않는다.

| 자리 | 선택지 | 증감 |
| --- | --- | --- |
| ch-tianjin-poem(e02, music:true, 정답 heart) | boast / heart / mock | 부귀▲ 풍류▼ / 풍류▲ / 공명▲ 풍류▼ |
| ch-yoyeon-reply(e09 yoyeon-arrive) | sword / call / calm | 공명▲ / 출장입상▲ / 물러남 |
| ch-neungpa-order(e10 neungpa-share, at:0) | generals / reward / fallen | 출장입상▲ / 공명▲ / 물러남 |

ch-neungpa-order는 반사곡의 물을 고른 뒤 물을 나눌 차례를 묻는 생각 선택이다. 무엇을 골라도 원작대로 군사들이 물을 마시며, 꾸민 장치라는 사실을 note에 적는다.

### 뒤 장면 변화 after

찾기(search)·추리(deduce) 도전은 `after: { from, spots?, clue?, text }`를 둘 수 있다. 앞 도전 from의 첫 판가름이 성공일 때만 이 도전의 시작 모습이 바뀐다. 첫 결과가 실패이거나 없으면(선생님 도움·바로가기·미판가름) 지금처럼 시작한다.

- from은 talk가 아닌 다른 도전 id이며, 그 장면이 이 도전의 장면보다 원작 차례에서 앞서야 한다.
- search는 spots만 쓴다. 이 도전의 spots에 있는 id이고 answer가 아니며 clue를 가진 자리다. 서로 다르고, 남는 자리가 둘 이상이어야 한다. 미리 표시한 자리는 clue를 펼친 채 보이고 누를 수 없으며 촛불을 쓰지 않고 헛짚은 곳에 넣지 않는다.
- deduce는 clue만 쓴다. clues의 0기준 번호이며 그 단서를 펼친 채 시작한다. 미리 펼친 단서도 답할 때 펼쳐져 있던 단서 수에 센다.
- text는 바뀐 시작과 함께 한 번 보이는 짧은 안내다. 이야기 글 셈에 든다.

| 도전 | from | 변화 |
| --- | --- | --- |
| ch-bansagok-water | ch-yoyeon-night | spots stream·pool을 요연이 경계한 물로 미리 표시 |
| ch-gyeonghong-who | ch-chunun-ghost | clue 1을 펼친 채 시작(답을 바로 주지 않는 단서) |

## 검사와 이야기 글 셈

G.checkData(data=G.data,options={})는 경고 배열이며 기본 production은 기존 28단위·12사건·3이음·여덟 인연·근거 열하나(이야기 근거 열과 틀 근거 E11)·되짚기 틀과 모든 새 맵·체험·도전을 검사한다. 도전 검사는 위 '소원 증감과 물러남'·'뒤 장면 변화 after'의 규칙을 모두 본다. fixture는 구판 3사건 자료 전용이며 데이터 자신이 가진 fixture 값으로 기준을 낮추지 않는다.

엔진 부품 시험은 호출자가 {profile:'world-opening'} 또는 {profile:'world-event'}를 명시한다. 전자는 c1-bridge/c1-cell/c3-awake, 후자는 e04-exam/e08-wonsu를 이 순서로 검사하며 대체 표시를 허용한다. 대표 콘텐츠의 rpg-opening은 c1-bridge/c1-cell/c1-wish/c1-exile/c1-rebirth/e01-huayin 여섯 단위, rpg-waking은 c3-feast/c3-monk/c3-staff/c3-awake 네 단위를 정확한 순서로 검사한다. 대표 콘텐츠는 승인된 자산 키만 사용하며 대체 표시는 허용하지 않는다. rpg-opening의 월드는 돌다리·선방·꾸짖음·첫 만남에, rpg-waking의 체험은 네 단위 모두에 필요하다. 두 대표 fixture는 같은 이름의 명시 프로필과 별도 저장 열쇠로 읽는다. 작은 시험의 맵·행동·보행·줄·효과 검증은 본편 전체 통과가 아니다. G.checkWorldData는 새 월드 계약, G.checkSprites는 그림 메타의 경고 배열이다. 로더는 missing/problems가 있으면 ok:false로 시작을 막는다.

G.storyText(data)는 {texts,count}다. event/link/cut/waking/wish의 lines·narration, 1·3·5장 scene/interp의 lines·narration, timeline.lines, wish.monologue, 남아 있는 구판 gradeText, interp.dialogue/lastWords/ending을 센다. 기존 셈에서 제외한 종류에 월드가 있으면 참조한 본문 줄도 한 번 포함한다. refs는 새 글을 복사하지 않는다. challenges의 intro·fail·success·clues·spots.clue·options.reply·after.text도 센다. interp.recap은 가장 길게 채운 줄로 센다. 드러난 소원 넷과 물러남을 모두 counts의 가장 긴 말로 고른 chose(와 teacher를 더한 쪽과 none 가운데 긴 것), first마다 ok·fail 가운데 긴 것, 가장 긴 소원 이름과 넷 모두를 넣은 wishLine(peakOnly보다 길면), ask를 더한다. 틀 근거(template:true, 지금 E11)도 같은 방식으로 가장 길게 채워 센다. mark 카드·예고·노트·인연 카드·해석 선택지·틀이 아닌 근거·단추·화면 문구(notes.ui)와 도전의 title·question·prompt·선택지 label·note는 제외한다. 강조·인물 링크 표식을 벗기고 가~힣만 세며 5,000 이하다. 틀이 아닌 실제 근거는 한 줄 안에 있어야 한다.

## 승인된 동작 그림과 아이콘

sprites는 순수 대입 데이터다. 공통 항목은 {src,width,height,frames,rows}이며 width/height는 전체 파일이 아닌 셀 크기다. 모든 크기·프레임·행 수는 양의 정수이며 src는 assets 아래 로컬 WebP/PNG 경로다. 기존 지팡이·준비96px/4프레임/1행과 아이콘32px/1프레임/1행은 아래 현재 자산 표를 따른다. 일반 검증기는 새 걷기 자산을 고정 1행·4프레임으로 제한하지 않는다.

월드 걷기 메타에는 cell:{width,height}, anchor:{x,y}, directions가 추가된다. 확장 하나가 있으면 셋 모두 필요하다. cell은 공통 width/height와 같고 anchor는 셀 안의 발 기준점(0≤x≤width, 0≤y≤height)이다. directions는 up/down/left/right 각각 {row,stand,walk}다. row는 0≤row<rows 정수, stand와 walk 배열의 각 값은 0≤index<frames 정수다. walk는 비어 있지 않다. 기존 지팡이·아이콘에는 확장을 강제하지 않는다. 현재 승인된 걷기 셀은 32px, 5열×4행이다. 승인 메타와 제품 해시를 임의로 바꾸지 않는다.

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

### 승인된 탑다운 장소·걷기·재사용 키트

`tools/manifest_topdown_approved.json`은 2026-10-04 사용자가 `contact-sheet-v1.png`에서 선택한 여덟 후보의 승인 범위·SHA256·생성 원본·프롬프트·제품 경로를 고정한다. 이전 후보는 승인 대상이 아니다. 제품 복사는 후보 파일의 바이트를 그대로 사용하며 재생성하거나 재가공하지 않는다.

| 열쇠 | 제품 경로 | 한 셀 | 열×행 |
| --- | --- | --- | --- |
| map-bridge / map-cell / map-huayin / map-chwimi | assets/world/같은-열쇠.webp | 384×320 | 1×1 |
| walk-seongjin / walk-yang-scholar / walk-yang-chancellor | assets/world/같은-열쇠.webp | 32×32 | 5×4 |
| kit-room | assets/world/kit-room.webp | 32×32 | 4×2 |
| prop-floor-grey / prop-floor-wood / prop-wall-grey / prop-wall-red / prop-cushion / prop-table / prop-stool / prop-chest | assets/world/같은-열쇠.webp | 32×32 | 1×1 |

걷기 항목은 `{src,width:32,height:32,frames:5,rows:4,cell:{width:32,height:32},anchor:{x:16,y:30},directions}`다. `directions`의 up/down/left/right는 각각 `{row,stand,walk}`이고 행 번호는 아래 0·왼쪽 1·오른쪽 2·위 3이다. 서기는 0번, 걷기는 `[1,2,3,4]`이며 모든 번호는 시트 범위 안에 있다. 실제 파일은 160×128이다. 기존 96px 지팡이·아이콘에는 cell/anchor/directions를 요구하지 않는다.

키트의 `frameKeys`는 행 우선 순서로 `floor-grey,floor-wood,wall-grey,wall-red,cushion,table,stool,chest`다. `prop-` 파일은 승인 키트의 해당 32px 칸을 픽셀 변경 없이 무손실로 분리한 것이다. 승인 기록에 원본 키트 해시·잘라낸 좌표·분리 파일 해시를 남긴다. 선방 배경은 처음·마지막에 `map-cell` 하나를 공유하고 방석은 별도 `prop-cushion`으로 표시한다. 맵 배경에는 인물·미래 NPC를 넣지 않는다. 맵 자료·화면은 승인된 열쇠와 실제 파일만 참조한다.

### 필드 NPC 전신 그림

2026-10-05 승인한 여도사 차림의 양소유 걷기는 `walk-yang-disguise`다. 제품 메타는 32×32/5프레임/4행, 발 `(16,30)`이며 아래·왼쪽·오른쪽·위의 서기 0번과 걷기 1~4번이다. 전체 시트 파일 160×128과 셀 크기를 혼동하지 않는다. 기존 학사 옷·여도사 초상을 참조한 별도 변형이며 원본을 바꾸지 않았다. 승인·프롬프트·검토판·참조·제품 해시는 `tools/manifest_rpg_disguise_approved.json`, 검증은 `tools/rpg_disguise_approved.py`에 있다.

`tools/manifest_rpg_npcs_approved.json`은 2026-10-04 사용자가 승인한 선녀·육관대사·유모 후보 세 개의 제품 경로·해시·원본·프롬프트·검토판을 고정한다. `npc-fairy-green/npc-yuk/npc-nurse`는 각각 assets/world의 같은 이름 WebP이며 `{src,width:32,height:32,frames:1,rows:1}`의 정지 그림이다. 걷기 방향과 행을 지어내지 않는다. 발은 셀의 아래쪽 `(16,32)`에 맞추고 표시에서 기본 정지 그림 앵커를 사용한다. 기존 걷기의 `(16,30)`과 지팡이 96px는 그대로다. 지도 대상의 sprite로 연결하며 인물 호칭·정체 공개 시점을 바꾸지 않는다. noFace인 유모의 전신 그림은 큰 대화 초상을 새로 등록한 것이 아니다.

### 호승의 지팡이 동작

필드의 호승은 기존 승인 `hoseung` 시트의 0번 자세를 정지 전신으로 재사용한다. 원본은 96px/4프레임이며 바이트와 메타를 바꾸지 않는다. 화면은 이 NPC를 96px 셀의 정수 기기 픽셀 배율로 표시하고 발을 맵의 대상 좌표에 맞춘다. 32px 보행 시트로 축소하거나 새 걷기 행을 만들지 않는다. 타격 컷신도 같은 취미궁 맵과 대상의 발 위치에서 2번·3번 자세를 사용한다.

- hoseung의 0기준 **2번은 들어 올린 자세**, **3번은 내려치는 자세**다. 현재 네 프레임 배열에서 이 순서를 유지한다.
- waking 타임라인에 pause:'staff'가 있어야 하며, 그 프레임까지 hoseung을 sprites에 배치해야 한다.
- G.cutscene.play는 이 컷신의 호승 반복 재생을 끄고 pause에서 2번을 고정한다. 클릭 전 3번 자세가 흘러나와서는 안 된다.
- 난간 치기 클릭은 현재 화면의 G.app.wake(ctx)를 동기 호출하고 저장 성공 때만 3번 자세로 바꾼다. 실패 때는 2번 자세·기존 기록과 다시 누를 수 있는 단추·오류 안내를 유지한다. 등록 시트가 있으면 타격을 400ms 보여 준 뒤 같은 선방으로 공간을 전환한다.
- 사용 가능한 시트가 없어도 얼굴·이름 대체 표시와 깨어남 단추로 진행한다. 이때 타격 프레임 대기는 생략한다.
- 컷신의 stage.setSpriteFrame(id,index)는 0기준 인덱스이며 범위를 벗어나거나 해당 셀이 없으면 false다. 제품 sprites 항목에 별도의 pauseFrame/strikeFrame 필드를 요구하지 않는다.

### 생성 원본과 가공 기록

준비·지팡이 묶음의 원본은 tools/gen.ps1을 통한 Codex CLI 이미지 생성이며 요청은 tools/prompts/sim_source_*.txt에 보존돼 있다. 탑다운·정지 NPC·여도사 걷기는 각각의 승인 manifest에 실제 CLI 또는 내장 image_gen 생성 경로·원본·프롬프트를 보존한다. 모든 그림의 생성 경로를 하나로 고쳐 쓰지 않는다.
당시 요청의 32px 표현은 생성 이력이며 최종 배포 크기가 아니다. 원본을 다시 생성하거나 그 문구를 96px 요청이었다고 고쳐 쓰지 않았다.
tools/manifest_sim96.json이 현재 출하 파일·셀·승인 해시·원본·프롬프트의 근거다. 다음 명령은 원본이 보존된 환경에서 실행한다.

```text
python tools/process_sim_assets.py --manifest tools/manifest_sim96.json
python tools/check_assets.py
```

가공은 assets/raw/sim-v2/candidates96/에 후보를 쓰며 제품 파일을 자동 덮어쓰지 않는다. 그림을 바꿀 때는 다시 검토·승인한 파일만 제품 경로와 메타에 반영한다.
생성 원본, 이전 32px 후보, 96px 후보와 검토판은 assets/raw/sim-v2/에 보존하되 git에 넣지 않는다. 이 준비·지팡이 묶음의 제품은 승인된 96px 동작이다. 현행 월드의 32px 걷기·정지 NPC는 별도 승인 묶음이며 준비 화면은 실행하지 않는다.

## 현재 화면 접점

무대·컷신 공통 API와 새 저장 API는 현재 index/app/main에 연결돼 있다. 월드는 ctx.finishExperience로 완료한다. 옛 판의 prep·board·sim 모듈은 0022에서 지웠다. event는 월드가 없는 옛 자료의 읽기 화면, hud는 꿈 보따리 단추와 소원 띠·무너짐을 맡는다.

| API | 입력·반환·책임 |
| --- | --- |
| G.stage.mount(ctx,scene) | 무대를 만들고 `{el,dialogue,show,portrait,effect,walk,active,dispose}`를 반환 |
| stage.show(line) | 문자열·text/gloss·mark 카드 표시. say/mood로 얼굴을, shake로 흔들림을, effect로 무대 효과를 고름 |
| stage.portrait(id,mood,{shake}) | people에 얼굴이 있는 인물만 표시. 얼굴 없는 인물은 say나 호칭 표기에 쓰지 않음 |
| stage.walk({from,to,duration,outfit}) | 양소유만 이동. from/to는 `{x,y}` 백분율, duration은 ms, outfit은 gwan/jang/sang 또는 기본. Promise<boolean> |
| G.stage.play(ctx,scene,{lines?}) | 기본은 narration 다음 lines. 줄마다 진행 단추·대사창 입력을 기다리고 끝/취소 여부를 반환 |
| G.cutscene.play(ctx,scene,{canSkip?,onPause?}) | timeline 실행. canSkip은 boolean 또는 함수. onPause(pause,stage)를 기다리며 취소·이탈 시 정리 |
| G.hud.refresh() | 꿈 보따리 단추와 소원 띠를 현재 장면·권한에 맞춰 다시 그림. 띠는 2장~난간 타격 전, 깨어난 뒤에는 없음 |
| G.hud.collapse(ctx) | 깨어남 저장 성공 뒤 소원 칸을 하나씩 비우고 만난 이의 이름을 하나씩 지우는 연출. Promise. 동작 줄이기면 한 번에 |

준비 스프라이트와 컷신 스프라이트는 `--frames`·`--sheet-end`를 style.setProperty로 등록해야 한다. h의 style 객체에 커스텀 속성을 넣기만 하면 CSS 애니메이션에 전달되지 않는다.

### ctx와 저장 시점

- `scene/ch/kind/main/page/startStep/signal`은 현재 화면의 데이터·DOM·재개 지점을 제공한다.
- `readonly/revisit`인 화면은 지속 기록을 다시 쓰지 않는다. `autoAdvance`는 자동 안내를 현재 진행에서 지나가는 경우이며 최초 수행자·행동·구판 기록을 더하지 않고 다음 위치만 저장한다.
- `ctx.run`은 화면 생성 때의 회차다. `ctx.alive()`는 현재 회차와 취소 여부를 확인하고 `ctx.canAct()`는 현재 접근·writer 권한도 확인한다. 비동기 대기 뒤 확인하고 signal의 abort 때 타이머·관찰자·애니메이션을 해제한다.
- `ctx.step(name)`은 화면 data-step을 바꾸고 쓰기 가능한 현재 진행이면 저장한다. 새 사건 완료는 grade 단계가 아니라 필수 행동 뒤 ctx.finishExperience로 done과 다음 pos를 함께 확정한다.
- 새 `ctx.finishExperience()`는 현재 run/readonly로 G.save.finishExperience를 호출하며 필수 완료·다음 pos를 한 번 저장한다.
- `ctx.section(className)`은 본문 section, `ctx.tray(content)`는 아래 진행 자리다. `ctx.next(label,options)`는 클릭이면 true, 이탈이면 false인 Promise다.
- `G.app.screens[kind](ctx,scene)`으로 화면을 등록한다. scene 알림은 화면과 도구를 연결한다. 월드는 구판 scene/chapter/between 훅을 실행하지 않으며 새 동작은 screens.world 또는 on으로 연결한다. 구판 훅으로 준비·말판을 되살리지 않는다.
- `G.app.current()`는 `{scene,ch,kind,step,revisit,autoAdvance,data}`를 반환한다. 모든 열기 경로는 canOpen을 거친다.
- `G.app.wake(ctx)`는 c3-staff의 현재 writer·run과 실제 타격 맥락을 확인하고 commitWake로 staff 행동·완료·awake·최초 awakeAt·선방 pos를 한 번 저장한다. 결과·일지·장부에 필요한 items·play 등의 기록을 지우지 않는다. 저장 성공 뒤 소원 띠의 무너짐을 보이고 꿈 화면을 닫으며 공간·옷·물건·사람·음악의 대비로 깨어남을 표현한다.

### 꿈 밖 화면의 걸음

| kind | data-step 차례 | 기록 |
| --- | --- | --- |
| cut | cut | 컷신 도중 종료하면 처음부터 재생 |
| wish | wish | selected·wrong 즉시 저장, 다섯 소원을 마치면 a-wish 확정 |
| waking | waking → staff → strike → shatter | 시트가 없으면 strike 대기 생략. staff 클릭 때 깨어남 저장 |
| journal | activity → journal-bond → journal-pearls | 맞대기 먼저 확정, 어느 인연 잇기 선택이든 미색 공개·찾은 구슬 카드 뒤집기 |
| interp | interp-dialogue → interp-pick → interp-answer → interp-revise → ending | first는 응답 듣기 진입 전에 저장, heard는 응답 뒤, final 뒤에는 다시 수정하지 않음 |

5장 대화 일부를 마친 상태에서는 앞선 걸음을 생략할 수 있다. lastWords는 카드가 섞인 배열도 허용한다. 구슬을 놓친 카드는 흐리게 남으며 장부 점수로 바꾸지 않는다.

## 학습 확정과 PNG 모델

맞대기 지역 picks/tries/memoOpen은 저장된 스냅샷과 분리하고 현재 run·readonly·취소 신호를 persist와 장부 API에 전달한다. 부분 오답 저장 실패 뒤 재시도는 act/slot의 첫 오답을 중복 기록하지 않는다. 해석은 확인한 선택을 동결하며 저장 실패 때에도 같은 선택으로 재시도한다.

app.ledgerRows의 사건 표시는 미시작/진행/완료/자동 안내다. 선택·첫 판가름·숨긴 소원은 장부에 넣지 않는다. app.lastPage의 dreamTrace와 이름·해석·근거·소원·구슬·도움 모델은 DOM과 900px PNG가 함께 사용한다. app.saveImage는 미저장 이름부터 저장한 뒤 클릭 시점 모델을 고정하며 그림·글꼴·Blob 대기 뒤 원래 run과 화면 생존을 확인한다. 저장 실패는 다운로드 중단, 이탈·초기화는 취소이며 외부 전송은 없다.
