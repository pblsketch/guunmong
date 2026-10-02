# 내용 데이터 형식 약속 (`js/data/`)

이 폴더의 `.js` 파일들이 게임의 **내용**이다. 코드를 고치지 않고 이 파일만 바꿔 장면·문항·노트를 고칠 수 있다.
엔진(`js/core/`, `js/game/`)은 여기 적힌 모양만 믿고 읽는다. 뒤 작업(말판·집·구슬·일지·깨어남·결과 화면, 콘텐츠, 그림, 소리)은 이 약속을 따른다.
항목을 더해야 하면 이 문서에 먼저 적고 쓴다.

- 임시 데이터는 이 폴더에 두지 않는다. 점검용 임시 데이터는 `tests/fixtures/stub.js`에 있고, 주소에 `?fixture=1`을 붙였을 때만 읽힌다(`?fixture=이름` → `tests/fixtures/이름.js`).
- 파일이 없으면 엔진은 없는 대로 넘어가고, 타이틀에 "내용 데이터를 아직 불러오지 못했어요"라고 보인다.
- 데이터를 읽은 뒤 `G.checkData()`가 아래 **지켜야 할 규칙**을 확인해 어긋난 곳을 `G.data.problems`(콘솔 경고)로 남긴다. 자동 점검은 이 목록이 비어 있는지 본다.

## 1. 파일과 적는 법

`index.html`을 파일로 바로 열어도(`file://`) 동작해야 하므로 JSON이 아니라 `<script>`로 읽는 `.js` 파일이다. 모든 파일은 `window.GUUN` 아래에 제 몫을 적는다.

```js
// js/data/scenes.js
(window.GUUN = window.GUUN || {}).scenes = [ /* … */ ];
```

| 파일 | 적는 곳 | 내용 | 맡는 작업 |
| --- | --- | --- | --- |
| `people.js` | `GUUN.people` | 인물(이름·얼굴 그림) | 콘텐츠 |
| `chapters.js` | `GUUN.chapters` | 장마다 안내·지난 이야기·곡·게임 설정 카드 | 콘텐츠 |
| `board.js` | `GUUN.board` | 승경도 말판 칸 | 콘텐츠 |
| `scenes.js` | `GUUN.scenes` | 모든 장면(0장~결과), 원작 순서 | 콘텐츠 |
| `wishes.js` | `GUUN.wishes` | 성진의 소원 목록 | 콘텐츠 |
| `bonds.js` | `GUUN.bonds` | 여덟 인연 카드 | 콘텐츠 |
| `house.js` | `GUUN.house` | 집 단계와 물건 칸 | 콘텐츠 |
| `journal.js` | `GUUN.journal` | 꿈 일지 짝 | 콘텐츠 |
| `interp.js` | `GUUN.interp` | 해석 선택지와 근거 구절 후보 | 콘텐츠 |
| `notes.js` | `GUUN.notes` | 오답·이본·작품 노트, 생각 나눔 질문, 교사용 안내 | 콘텐츠 |
| `bgm.js` | `GUUN.bgm` | 배경음 곡 배정과 출처 문구 | 소리 |

읽는 순서와 목록은 `js/core/data.js`의 `FILES`에 있다. 파일을 더하면 거기에도 적는다.

## 2. 글 표기 (명세 11절)

화면에 나오는 글은 모두 `js/core/text.js`가 아래 표기를 읽어 그린다.

### 2.1 덩이(블록) — 장면의 `read` 배열 등에 쓴다

| 모양 | 화면 |
| --- | --- |
| `{ orig: '…', gloss: '…', src?: '출처', old?: true }` | 붉은 낙관 **原文** 덩이와 그 아래 한지 바탕 **풀이**. 다시 읽기에서는 풀이를 가리고 '풀이 보기' 단추만 남긴다 |
| `{ gloss: '…' }` | 풀이만(원문을 생략한 대목). 다시 읽기에서도 보인다 |
| `{ say: '인물id', mood?: '표정', text: '…' }` | 인물의 말(풀이 층). 처음 읽기에서는 얼굴 그림이 함께 나온다 |
| `{ text: '…' }` 또는 그냥 문자열 | 이야기 글(풀이 층) |
| `{ mark: 'fiction', id: '고유id', title, body, real }` | 청록 **게임 설정**. 같은 `id`가 **처음** 나올 때만 `real`을 "실제로는 →"과 함께 보인다(본 것은 저장됨) |
| `{ mark: 'variant', title, body }` | 황토 **이본 노트**(판본마다 다른 곳) |
| `{ mark: 'interp', title, body }` | 쪽빛 **해석**(여러 해석이 있는 것, 채점하지 않음 표시가 붙음) |
| `{ mark: 'note', title, body }` | 알아 두기 |

- `orig`는 저작권이 끝난 판본에서 **한 글자도 바꾸지 않고** 가져온다. `src`에 판본·쪽을 적을 수 있다.
- 옛한글(첫가끝 자모, 아래아 `ㆍ`/`ᆞ`)이 든 원문은 자동으로 옛한글 글꼴로 보인다. 자동 판별이 안 되는 글은 `old: true`.
- `gloss`·`text`·`say`는 이 게임을 위해 새로 쓴 현대어다. 교과서·지도서·번역서 문장을 쓰지 않는다.

### 2.2 줄 안 표기 — 모든 글 칸에서 쓴다

| 표기 | 뜻 |
| --- | --- |
| `**굵게**` | 굵은 글씨 |
| `{호칭|인물id}` | 인물 호칭. 처음 읽기에서 이름 옆에 얼굴(`assets/pt/…`)이 자동으로 나온다. 다시 읽기에서는 글만 |
| `[[칸id]]` | 읽기 활동의 빈칸(활동의 `passage` 안에서만) |
| 줄바꿈 `\n` | 줄을 바꾼다 |

## 3. 인물 `GUUN.people`

```js
GUUN.people = {
  yang: { name: '양소유', face: 'yang', moods: ['smile', 'shock'] },
  // …
};
```

- 얼굴 그림: `assets/pt/<face>.webp`, 표정은 `assets/pt/<face>_<mood>.webp`(`moods`에 적힌 것만). `face`가 없으면 id를 쓴다.

## 4. 장 `GUUN.chapters`

장 목록(0·1·2·3·4·5·R)과 이름은 엔진에 고정돼 있다(명세 3절). 데이터는 장마다 덧붙일 것만 적는다.

```js
GUUN.chapters = {
  '1': {
    intro: '장을 펼칠 때 한 줄 안내(선택)',
    recap: '지난 이야기(처음 읽기에서만 장 첫머리에 나옴)',
    bgm: 'lotus',                       // 이 장의 기본 곡(장면에 bgm이 없을 때)
    fiction: { id: 'board', title, body, real }, // 장 첫머리에 보일 게임 설정 카드(선택)
  },
};
```

## 5. 장면 `GUUN.scenes`

**원작 순서 그대로** 적는다. 장(ch)은 0→1→2→3→4→5→R 순서로만 나와야 하고, 같은 장 안에서는 적은 순서가 곧 진행 순서다. 학생은 순서를 바꾸거나 건너뛸 수 없다.

```js
{
  id: 's02-tianjin',            // 고유 id(저장 열쇠이므로 한번 정하면 바꾸지 않는다)
  ch: '2',                      // '0'~'5' 또는 'R'
  kind: 'scene',                // 화면 종류(아래 5.1). 없으면 'scene'
  title: '낙양 천진교 시회',
  place: '낙양',                 // 장면 이름 아래 작은 글(선택)
  img: 'sc_tianjin',            // 장면 그림 assets/sc/<img>.webp (선택)
  imgAfter: 'sc_josin_wake',    // 읽기 활동을 마친 뒤 바뀌는 장면 그림(선택)
  heading: { hoe: 2, part: 'a', gloss: '…', status: '대조 대기' }, // 회목 카드(여러 회에 걸치면 배열, 17절 6번)
  reality: false,               // true면 현실(연화봉) 장면: 그림 채도를 낮춘다
  bgm: 'dream',                 // 곡 이름(bgm.js의 tracks 열쇠 또는 합성 곡 이름). 없으면 장의 곡
  square: 'sq-luoyang',         // 이 장면으로 들어가는 말판 칸 id(2장)
  big: true,                    // 큰 활동 장면(교과서 수록 대목)인지. 분량 조절 표시용
  read: [ /* 2.1의 덩이 */ ],
  activity: { /* 5.2 */ },
  mind: { /* 5.3 */ },
  item: { /* 5.4 */ },
  fills: ['pungryu'],           // 이 장면을 마치면 채워지는 소원(일·사건으로 채움, 7절 규칙)
  meet: 'gyeom',                // 이 장면에서 처음 만나는 인연 id(여덟 여인)
  remeet: { bond: 'chae', story: '다시 만나 덧붙는 사연' }, // 다시 만나는 장면(여러 사람이면 배열)
  pearl: { x: 62, y: 38, r: 7, hint: '…', trace: 'fiction' },  // 숨은 구슬(여인을 처음 만나는 여덟 장면에만, 5.6)
  // waking 장면에서만: approach(땅을 두드리며 다가옴, 아직 꿈), staffPrompt(난간을 치는 대목), after(빈 선방), roomImg(선방 그림)
  flow: ['read', 'activity', 'mind', 'item', 'bond', 'pearl'], // 걸음 순서를 바꿀 때만(선택)
  awakened: false,              // 3장의 '깨어난 선방' 장면이면 true(5.5)
}
```

### 5.1 화면 종류 `kind`

| kind | 쓰는 장 | 하는 일 |
| --- | --- | --- |
| `scene`(기본) | 0~3 | 읽기 → 읽기 활동 → 마음 고르기 → 물건 → 인연 → 구슬 (데이터가 없는 걸음은 건너뜀) |
| `waking` | 3 | 지팡이 소리 장면. 지팡이 소리가 나는 **순간** `G.app.wake()`로 깨어남을 기록 |
| `journal` | 4 | 꿈 일지(10절) |
| `interp` | 5 | 육관대사의 물음과 해석 고르기(11절) |
| `result` | R | 결과 화면(꿈 일지 마지막 장, 장부, 노트) |

비어 있는 장이 있으면 엔진이 기본 장면을 채운다(3장: 지팡이 + 깨어난 선방, 4·5·R: 기본 화면). 위 화면의 실제 모습은 `js/game/`의 화면 모듈이 `G.app.screens[kind]`에 끼운다(16절).

### 5.2 읽기 활동 `activity` — "원문을 읽고 구절·단서·낱말을 골라 칸에 넣는" 한 가지 틀

리듬·카드 대결·퍼즐·윤목 같은 별도 조작은 없다. 원작 속 시험(시회의 시, 거문고 곡조, 남장한 적경홍의 단서, 가춘운 장난의 단서, 토번 정벌 등)도 모두 이 틀로 만든다.

```js
activity: {
  id: 'a-tianjin',              // 장부 열쇠(바꾸지 않는다)
  type: 'slots',                // 늘 'slots'(생략 가능)
  scored: true,                 // false면 채점하지 않음(장부에 넣지 않고 고른 것만 저장)
  title: '시회의 시',
  prompt: '원문을 읽고 빈칸에 들어갈 구절을 고르세요.',
  passage: '… [[a]] … [[b]] …',        // 빈칸이 든 글(선택). 풀이 바탕이 기본이고, 영인 대조를 마친 원문만 passageKind: 'orig'(原文 낙관)
  slots: [
    { id: 'a', answer: '정답', memo: '이 칸의 여백 메모', label: '첫째 구절' },
    { id: 'b', answer: ['정답', '같이 맞는 답'] },   // 여러 답 허용
  ],                            // passage에 없는 칸은 label과 함께 아래 목록으로 나온다
  choices: ['정답', '같이 맞는 답', '헷갈리는 것'], // 고를 것. 한 선택지는 한 칸에만 들어간다
  extra: ['다시 읽기에서만 더 들어가는 헷갈리는 것'],
  memo: '활동 전체의 여백 메모(힌트)',
  explain: '맞힌 뒤 보이는 풀이',
  wrongNote: '오답 노트에 남길 설명',
}
```

- **정답 판정에는 모든 이본에 공통인 사실만** 쓴다. 판본마다 다른 것은 정답으로 삼지 않고 이본 노트로 보인다.
- 모든 칸을 채워야 [확인]을 누를 수 있다(여러 칸을 한 번에 확정해 찍기를 막는다).
- 도움 사다리(채점 활동): 틀리면 **틀린 칸 표시 → 여백 메모 → 정답 보기** 순으로 열린다.
- 장부에는 활동마다 첫 시도 정확도와 도움 사용만 남는다(감점 없음). 선생님용 '정답 채우기'·'정답 보기'를 쓰면 '도움 사용(선생님용)'.
- 선택지 순서는 활동 id로 정한 씨앗으로 섞어, 새로 고침해도 같다.

### 5.3 마음 고르기 `mind` — 채점하지 않음

```js
mind: {
  prompt: '이때 양소유의 마음은?',
  options: [
    { id: 'm1', text: '마음', evidence: '이 마음을 읽어 낼 수 있는 원문 구절', reply: '고른 뒤 한 줄(선택)' },
  ],
}
```

- 선택지는 **모두 원문으로 읽어 낼 수 있는 마음**만 넣는다. 원작 행동과 어긋나는 마음(거절·겸양 등)은 넣지 않는다.
- 고른 것은 `save.mind[장면id]`에 남아 꿈 일지에 다시 나온다. 정답이 없고 `scored`를 두지 않는다.

### 5.4 집에 놓을 물건 `item` — 장면마다 하나

```js
item: { id: 'it-silk', name: '양류사를 적은 비단', desc: '…', img: 'item_silk', fills: ['pungryu'], slot: 'any' }
```

- 장면의 `item` 걸음에서 학생이 그 자리에서 집 칸에 바로 놓을 수 있다(놓지 않고 지나가도 된다. 위 막대의 꿈 보따리 → 집에서 언제든 놓고 옮긴다).

- 그림: `assets/items/<img 또는 id>.webp`. 원작 속 물건만 쓴다.
- `fills`: 이 물건이 채우는 소원(부귀·공명의 하사품, 풍류의 거문고·퉁소 등). 7절 규칙을 따른다.
- 배치는 채점하지 않는다. 놓은 자리는 `save.house[물건id] = 칸id`.

### 5.5 3장과 깨어남

3장은 `[취미궁 잔치(scene)…, 지팡이(waking), 깨어난 선방(scene, awakened: true), …]` 순서로 적는다.
- 지팡이 소리 **전**에 끄면 3장 처음(첫 장면)부터, **뒤**에 끄면 `awakened: true` 장면부터 이어 한다.
- 깨어난 뒤에는 0~3장 가운데 `awakened` 장면 **앞**의 모든 장면이 잠긴다(선생님용 제외).
- `waking` 장면 화면(`js/game/wake.js`)의 차례: `read`(잔치 끝의 무상) → `approach`(호승이 지팡이로 **땅을** 두드리며 다가옴. 아직 꿈) → 음악이 멎음 → `staffPrompt` 뒤 [지팡이가 돌난간을 친다]를 누르는 **순간** `G.app.wake()` → 말판·벼슬·집·인연첩이 한꺼번에 사라짐 → 채도를 낮춘 빈 선방(`roomImg`, `assets/sc/<roomImg>.webp`)과 `after`. 남는 것은 소원 목록과 찾은 구슬뿐이다.

```js
{ id: 'c3-staff', ch: '3', kind: 'waking', title: '지팡이 소리', read: [/* … */],
  approach: [/* 덩이 */], staffPrompt: '호승이 지팡이를 들어 돌난간을 두어 번 친다.', after: [/* 덩이 */], roomImg: 'sc_room_empty' }
```

### 5.6 숨은 구슬 `pearl`

```js
pearl: { x: 62, y: 38, r: 7, hint: '꽃잎 하나가 이상하게 반짝인다' }
```

- 여덟 여인을 **처음 만나는** 여덟 장면(`meet`가 있는 장면)에만 둔다. 다시 만나는 장면에는 두지 않는다.
- `x`·`y`·`r`는 장면 그림 너비·높이에 대한 백분율(%). 찾기는 선택이고 못 찾아도 진행이 막히지 않는다(감점 없음).
- 찾은 것은 `save.pearls[인연id] = true`. 장면 그림 위에 `assets/ui/pearl_trace.webp`(반짝임)를 같은 배율로 겹치고, 찾으면 `pearl.webp`로 바뀐다. 못 찾은 구슬은 `pearl_empty.webp`.
- `trace: 'canon'`(원작에 구슬이 나오는 정경패·난양공주)이면 `canon`(원작 근거)을 '알아 두기'로, 그 밖이면 게임 설정 카드(`notes.ui.pearlFiction`)를 붙인다.

## 6. 승경도 말판 `GUUN.board`

```js
GUUN.board = [
  { id: 'sq-huayin', name: '화음현', kind: 'place', scene: 's01-huayin', x: 8, y: 86, fills: [] },
  { id: 'sq-hallim', name: '한림학사', kind: 'office', scene: 's04-hallim', x: 30, y: 70, fills: ['gongmyeong'] },
];
```

- 칸은 양소유가 원작에서 실제로 거친 **벼슬(`office`)과 장소(`place`)만**. 파직·귀양·사약처럼 **떨어지는 칸은 두지 않는다**(`fall`·`down` 같은 항목도 없다). 윤목 굴리기도 없다.
- 순서는 장면 순서를 따른다. 장면을 마치면 말이 원작대로 다음 칸으로 간다.
- `x`·`y`: 말판 그림(`assets/board/board.webp`)에 대한 백분율 위치. 칸 이름은 도트 글꼴로 그린다(그림에 글자를 넣지 않는다).
- 승경도 판이라는 틀 자체는 게임 설정이다 → 2장 `chapters['2'].fiction`에 실제 승경도 놀이 소개를 `real`로 적는다.
- `start: true`(장면 없음, `scene: null`): 출발 칸. 2장 첫머리에 말이 여기 섰다가 첫 칸으로 걸어간다.
- `outfit: 'gwan'|'jang'|'sang'`: 그 칸에 도착하면 말 그림이 `assets/board/horse_walk_<outfit>.webp`로 바뀐다(없으면 기본 말 그림).
- `kind: 'office'` 칸에 도착하면 교지 카드(`assets/ui/gyoji.webp` 위에 벼슬 이름)와 채워질 소원을 보인다. `heading`이 있으면 회목 카드도 보인다.
- `fills`의 출장입상은 점 표기로 반 칸씩: `'chuljang.chul'`(장수), `'chuljang.ip'`(재상).

## 7. 소원 목록 `GUUN.wishes` 과 채움 규칙

```js
GUUN.wishes = [
  { id: 'chuljang', name: '출장입상', hanja: '出將入相', evidence: '성진 독백의 원문 구절' },
  { id: 'bugwi', name: '부귀', evidence: '…' },
  { id: 'misaek', name: '미색', evidence: '…', dreamHidden: true },
  { id: 'pungryu', name: '풍류', evidence: '…' },
  { id: 'gongmyeong', name: '공명', evidence: '…' },
];
```

- 1장의 소원 찾기는 채점하는 읽기 활동이고, 소원 목록은 모든 학생에게 같다.
- 무엇이 무엇을 채우나:
  - **출장입상·부귀·공명** ← 벼슬·재물·명예: 말판 칸의 `fills`, 하사품 같은 물건의 `item.fills`, 장면의 `fills`.
  - **풍류** ← **사람이 아니라 일과 물건**(천진교 시회, 거문고, 퉁소 등): 장면의 `fills`, 물건의 `item.fills`.
  - **미색**(`dreamHidden: true`) ← **아무것도 채우지 않는다.** 꿈 내내 '?'로 비어 있고, 꿈 일지에서 "성진의 이 마음이 여덟 인연을 꿈꾸었다"를 잇는 순간에만 드러난다(`save.journal.revealed.misaek = true`).
  - **인연(여덟 여인)은 어떤 소원도 채우지 않는다.** 인연 카드에 `fills`를 두지 않는다.
- 지금 채움 상태는 `G.app.wishes()`가 계산한다(마친 장면 + 받은 물건 + 그 장면의 말판 칸).
- `parts`가 있는 소원(출장입상)은 `'소원id.칸id'`로 한 칸씩 채운다. 한 칸만 차면 반(`half`), 모든 칸이 차야 가득(`filled`). 다른 소원의 `size`는 막대 칸 수(채운 것의 수만큼 먹물이 찬다).

## 8. 인연 카드 `GUUN.bonds` — 여덟 여인

```js
GUUN.bonds = [
  {
    id: 'chae', name: '진채봉', face: 'chae',
    status: '진 어사의 딸',                 // 신분
    ability: '시',                          // 능력과 사연(꾀·검술·시·음악 등)
    story: '처음 만났을 때의 사연',
    place: '화음현',                        // 만난 곳
    fairy: '팔선녀 가운데 누구였는지(4장에서 구슬로 뒤집힐 때)',
  },
];
```

- 카드는 처음 만나는 장면(`scene.meet`)에서 생기고, 다시 만나는 장면(`scene.remeet`)은 `story`를 덧붙이기만 한다.
- **인연은 소원을 채우지 않고, 개수로 세지 않고, 점수에 들어가지 않는다.** 화면 어디에도 "몇 명" 같은 수를 보이지 않는다.

## 9. 집 `GUUN.house`

```js
GUUN.house = {
  stages: [
    { id: 'inn', name: '객사·초가', from: 's01-huayin', img: 'house_inn', slots: [{ id: 'inn-1', x: 20, y: 60 }] },
    { id: 'byeoldang', name: '정 사도 댁 별당', from: 's03-…', img: 'house_byeoldang', slots: [/* … */] },
    { id: 'seungsang', name: '승상부', from: 's12-…', img: 'house_seungsang', slots: [/* … */] },
    { id: 'chwimi', name: '취미궁', from: 'c3-feast', img: 'house_chwimi', slots: [/* … */] },
  ],
  fiction: { id: 'house', title: '집 꾸미기', body: '…', real: '…' },
};
```

- `from`: 이 장면에 들어서면 집이 이 단계로 오른다. 단계는 말판 진행에 따라 오르며 학생이 고르지 않는다.
- 칸은 `slots: [{ id, x, y }]`(백분율 위치) 또는 `grid: [열, 행]`(칸 id는 `<단계id>-1`, `-2`, …로 자동). 단계가 오르면 놓아 둔 물건은 새 집의 같은 순번 칸(차 있으면 첫 빈칸)으로 옮겨진다. 뒤 단계일수록 칸을 늘린다.
- 단계 순번(0~3)마다 화면의 집 크기와 꾸밈이 커진다(그림이 없을 때의 임시 집도 단계마다 넓고 화려하다).
- 그림 `assets/house/<img>.webp`, 칸 위치 `x`·`y`는 백분율. 단계마다 눈에 띄게 넓고 화려해진다.
- 배치는 채점하지 않는다. 집 꾸미기라는 틀은 게임 설정이다(`fiction`).
- 칸 종류: 칸의 `kind`는 `'in'`(방 안)·`'yard'`(뜰), 물건의 `slot`은 `'in'`·`'yard'`·`'any'`. 방 안 물건은 방 안 칸에만, 뜰 물건은 뜰 칸에만 놓인다(`kind`가 없는 칸은 어디나). 단계가 오를 때도 종류가 맞는 칸으로 옮긴다.
- 깨어나면 집은 사라지고 다시 보여 주지 않는다.

## 10. 꿈 일지 `GUUN.journal` (4장)

```js
GUUN.journal = {
  pairs: [
    { id: 'j-tubeon', event: '대원수로 토번 정벌', wish: 'chuljang', scored: true, evidence: '원문 근거 구절' },
    { id: 'j-…', event: '…', wish: 'pungryu', scored: false, note: '해석이 갈리는 까닭' }, // '해석' 짝: 채점하지 않음
  ],
  bondLink: {                     // "성진의 어떤 마음이 여덟 인연을 꿈꾸었는가"
    prompt: '…', choices: ['bugwi', 'misaek', 'gongmyeong'], answer: 'misaek', evidence: '원문 근거 구절',
  },
};
```

- **원문에 분명히 드러나는 짝만 채점**(`scored: true`, `evidence` 필수). 갈릴 수 있는 짝은 `scored: false`로 두고 화면에 쪽빛 '해석' 표시를 붙인다.
- 채점 짝은 여러 칸을 모두 채워야 한 번에 확정한다. 틀리면 읽기 활동과 같은 도움 사다리. 장부 열쇠는 `journal` 화면이 정하고 이름을 `G.app.activityTitles[id]`에 적는다.
- `event`에 인연(여인)을 두지 않는다. 인연은 `bondLink`로만 성진의 마음과 잇는다. 이 잇기를 하는 순간 미색 칸이 드러난다.
- 짝에 덧붙일 수 있는 것: `kind`(`office`·`item`·`scene`, 칸 이름 앞에 [벼슬]처럼 보임), `memo`(여백 메모. 없으면 `evidence`를 씀), `note`(오답 노트·해석 짝 설명).
- 맞대기 활동의 선택지는 드러난 소원 이름(미색 제외)이고, 한 소원을 여러 칸에 넣을 수 있다(읽기 활동의 `reusable: true`). 장부 열쇠는 `journal.id`(없으면 `'journal-match'`), 이름은 `journal.title`(없으면 '꿈 일지 맞대기'). `journal.prompt`·`journal.memo`로 안내와 활동 전체 메모를 바꿀 수 있다.
- `bondLink`는 채점하지 않는다. 학생이 무엇을 고르든 잇는 순간 `answer` 소원(미색)이 드러나고 `reveal`(덩이 배열: 근거 구절과 해석 카드)이 글 표시 규칙대로 보인다. `bondLink`의 글에는 原文 낙관을 붙이지 않는다(예전 형식의 `evidence`도 풀이로만). `choices`는 소원 id 목록(미색은 드러나기 전 '?'로 보임). `memo`는 고르기 전 여백 메모, `wrong`은 미색이 아닌 것을 골랐을 때의 한 줄(`{ 고른 소원id: '…' }` 또는 문자열).
- `journal.extra`: 다시 읽기에서만 맞대기 칩에 더 들어가는 헷갈리는 칩(예: '학문(어려서 성현의 글을 읽음)').
- '해석' 짝에서는 소원 칩 말고 '어느 칸도 아님'도 고를 수 있다(`picks[짝id] = 'none'`). 어느 소원과도 잇지 않는 짝은 `wish: null`.
- 기록: `save.journal = { picks: { 해석짝id: 소원id 또는 'none' }, bondLink: 고른 소원id, revealed: { 미색id: true } }`.
- 2장에서 고른 마음(`save.mind`)이 일지에 다시 나와 소원과 나란히 보인다.

## 11. 해석 `GUUN.interp` (5장)

```js
GUUN.interp = {
  question: '꿈속의 삶은 헛것인가?',
  options: [ { id: 'i1', text: '…' }, { id: 'i2', text: '…' }, { id: 'i3', text: '…' } ], // 3~4개
  evidence: [ { id: 'e1', text: '원문 구절', from: '어느 대목' }, { id: 'e8', text: '…', after: true } ], // 근거 구절 후보(after: 대사의 대답을 들은 뒤 고칠 때만 보임)
  dialogue: [ /* 덩이: 성진과 대사의 문답(대사가 답하기 전까지). 장면의 read 다음에 이어진다 */ ],
  lastWords: { orig: '대사의 마지막 말 원문', gloss: '풀이', src: '출처' },             // "아직 꿈에서 깨지 못했다"
  ending: [ /* 덩이: 팔선녀의 출가와 결말 */ ],
};
```

- 학생은 대사의 마지막 말 **전에** 해석 하나와 근거 구절 하나를 고르고, 들은 뒤 **한 번** 고칠 수 있다.
- 채점하지 않는다. 저장: `save.interp = { first: { option, evidence }, heard, changed: { option, evidence } | null, revised, final }`. 고친 흔적은 결과에 남는다.
  - `heard`: 대사의 마지막 말을 들었음. 그 뒤에는 새로 고침해도 처음 고른 것을 다시 고를 수 없고 고칠 기회만 남는다.
  - 고치기를 열었다가 같은 것을 고르면 고치지 않은 것(`revised: false`, `changed: null`)으로 본다.

## 12. 노트 `GUUN.notes`

```js
GUUN.notes = {
  work: ['작품 노트(문자열 또는 { title, body })'],
  variants: [{ title: '이본', body: '판본마다 다른 곳' }],
  discuss: ['생각 나눔 질문'],
  teacher: {                       // 교사용 안내(선생님용 목차에 보임)
    when: '공통국어2 「구운몽」 단원 …',
    time: '한 차시(35~45분) …',
    questions: ['끝난 뒤 물을 질문 1', '질문 2'],
    extra: '모둠 디브리핑 안내',     // 선생님용 목차에 보임
    ledger: '장부 보는 법',          // 선생님용 목차와 결과 화면 장부 아래에 보임
  },
  ui: {                            // 화면에 붙는 짧은 글(엔진에 박아 두지 않는다)
    zenCaption: '빈 선방 그림 아래 한 줄',
    pearlFiction: { id, title, body, real },   // 게임이 숨긴 구슬의 게임 설정 카드
    pearlCanon: { title },                      // 원작 근거 구슬의 알아 두기 제목
  },
};
```

- 오답 노트는 활동의 `wrongNote`·칸의 `note`로 적고, 학생이 틀린 것만 결과에 모인다(`save.wrong`).
- 공개 화면·데이터에는 교과서 출판사 이름을 쓰지 않는다. 교과 연계는 "공통국어2 「구운몽」 단원"처럼 과목·단원으로만 적는다.

## 13. 배경음 `GUUN.bgm`

```js
GUUN.bgm = {
  title: 'calm',                    // 타이틀 곡
  tracks: {
    dream: { file: 'assets/bgm/dream.mp3', len: 78.9, gain: 1.0, wet: 0, synth: 'dream', src: '가야금 「…」' },
    // …
  },
  credit: '배경음 국립국악원 「디지털 이음」 국악기 연주(공공누리 제1유형)',  // 타이틀의 짧은 출처
  creditFull: '…',                  // 설정 화면의 온전한 출처(없으면 tracks의 src를 모아 엔진이 만든다)
};
```

- 곡 이름은 장면의 `bgm`, 장의 `bgm`, `title`이 가리킨다. 장면마다 곡이 바뀐다(같은 곡이면 이어서 흐른다).
- `len`: 반복 길이(초, MP3 끝의 빈 틈을 뺀 길이). `gain`: 곡끼리 음량 맞춤. `wet`: 공간 울림(꿈 장면 등).
- `synth`: 녹음을 못 받을 때 대신 틀 합성 곡(`calm`·`lotus`·`dream`·`feast`·`sorrow`·`reflect`). 없으면 같은 이름의 합성 곡, 그것도 없으면 `calm`.
- 녹음은 국립국악원 「디지털 이음」 악구(공공누리 제1유형: 상업 이용·편집 가능, **출처 표시 필수**). 출처 문구는 타이틀·설정 화면과 README에 보인다.
- 장에 곡이 없으면 기본: 0 `calm`, 1 `lotus`, 2 `dream`, 3 `feast`, 4 `reflect`, 5 `lotus`, R `calm`.

## 14. 에셋 경로 약속

| 무엇 | 경로 |
| --- | --- |
| 장면 그림 | `assets/sc/<scene.img>.webp` (480×270, 16:9) |
| 인물 얼굴(표정) | `assets/pt/<face>.webp`, `assets/pt/<face>_<mood>.webp` |
| 물건 | `assets/items/<item.img 또는 item.id>.webp` |
| 집 단계 | `assets/house/<stage.img>.webp` |
| 말판·말 | `assets/board/board.webp`, `assets/board/horse_walk.webp`(걷기 스프라이트 띠) |
| 구슬 | `assets/ui/pearl.webp` |
| 타이틀·아이콘 | `assets/ui/title.webp`, `assets/ui/icon-192.png` |
| 배경음 | `assets/bgm/<이름>.mp3` |
| 글꼴 | `assets/fonts/galmuri.woff2`(제목·단추·말판), `assets/fonts/noto-serif-kr.woff2`(본문·풀이), `assets/fonts/noto-serif-cjk-kr-old.woff2`(옛한글 원문) |

- 그림은 도트(픽셀) 화풍이고 **글자를 넣지 않는다.** 화면에서는 정수배로만 키우고 부드럽게 하지 않는다(`image-rendering: pixelated`, `G.util.pixImg`).
- 그림이 아직 없으면 그 자리를 숨기고 넘어간다.
- 모든 그림·소리·글꼴은 상업적으로 쓸 수 있어야 한다.

## 15. 저장 (`G.save.state`, 이 브라우저의 localStorage에만)

| 열쇠 | 뜻 |
| --- | --- |
| `music`·`sound`·`big`·`teacher`·`mode` | 설정(새로 시작·기록 지우기에도 남음) |
| `started`·`pos`·`reach`·`done` | 진행: 지금 장면, 열린 장, 마친 장면 |
| `awake`·`awakeAt` | 깨어남(새로 시작하기 전까지 되돌릴 수 없음) |
| `ledger` | 장부: 활동 id → `{ first, help: null·'student'·'teacher', final }` |
| `wrong` | 오답 노트 `[{ act, slot, picked, answer, note }]` |
| `picks` | 채점하지 않는 활동의 고른 것 |
| `mind`·`items`·`house`·`bonds`·`bondNotes`·`pearls` | 고른 마음, 얻은 물건, 집 배치, 인연첩, 덧붙은 사연, 찾은 구슬 |
| `seenFiction` | 이미 본 게임 설정(처음에만 '실제로는 →') |
| `journal`·`interp` | 꿈 일지 기록(`picks`·`bondLink`·`revealed`), 해석과 고친 흔적(11절) |
| `houseStage` | 이미 알린 집 단계 순번(단계가 오를 때 한 번 알림) |
| `name` | 결과 화면에 쓸 이름(선택) |

- 장부는 첫 기록만 남는다. 마친 활동을 다시 풀어도(깨어나기 전 다시 읽기) 바뀌지 않는다.
- 아무것도 밖으로 보내지 않는다. 분석 도구를 넣지 않는다.

## 16. 엔진 확장 지점 (화면 모듈이 쓰는 곳)

자세한 설명은 `js/game/app.js` 머리 주석. 화면 모듈 파일은 `index.html`에서 `app.js` 다음, `main.js` 앞에 넣는다.

| 자리 | 쓰임 |
| --- | --- |
| `G.app.screens[kind] = async (ctx, scene) => {}` | 장면 종류별 화면(`waking`·`journal`·`interp`·`result` 등). 끝나면 다음 장면으로 |
| `G.app.steps[name] = async (ctx, scene) => {}` | `scene` 화면 안의 걸음. `item`(집 배치), `pearl`(구슬 찾기), `bond`(인연첩)를 바꿔 끼운다 |
| `G.app.hook('between', async (from, to, ctx) => {})` | 장면 사이(말판에서 말 걷기 등) |
| `G.app.hook('chapter', async (ctx) => {})` | 장 첫머리 카드 뒤, 첫 장면 앞(2장 출발 칸에서 첫 칸으로 걷기) |
| `G.app.on('scene'·'step'·'done'·'chapter'·'wake'·'reset', fn)` | 사건 듣기 |
| `G.app.toolbar.push({ id, label, icon, when, click })` | 위 막대 단추(인연첩·집·소원 목록) |
| `G.app.wake()` | 지팡이 소리 순간에 부른다 |
| `G.app.wishes()`, `G.app.ledgerRows()`, `G.app.ledgerTable()`, `G.app.bondCard()` | 소원 상태, 장부, 인연 카드 |
| `G.activity.mount(box, act, opt)` | 읽기 활동(칸 채우기 + 도움 사다리)을 다른 화면에서도 쓴다(꿈 일지 등). `act.reusable`이면 한 선택지를 여러 칸에 넣을 수 있다 |
| `G.dream.can(tab)`, `G.dream.open(tab)` | 꿈 보따리(위 막대 `data-tool="dream"`)의 탭 `board`·`house`·`bonds`·`wishes`·`pearls`. 깨어난 뒤에는 `wishes`·`pearls`만(선생님용 제외) |
| `G.board.view()`, `G.house.view()`, `G.dream.wishList()`, `G.dream.pearlKeep()` | 말판·집·소원 목록·구슬 그리기 |
| `G.app.renderPage()`, `G.app.saveImage()` | 꿈 일지 마지막 장을 캔버스에 그림 / PNG로 내려받기 |

화면 모듈(`js/game/`): `board.js`(말판·말 걷기·소원 목록), `house.js`(집·물건 놓기), `pearl.js`(숨은 구슬), `bag.js`(꿈 보따리·인연첩), `wake.js`(깨어남), `journal.js`(꿈 일지), `interp.js`(해석 고르기), `result.js`(결과·그림 저장).
점검 도구가 쓰는 표시: 꼭 골라야 하는 단추에는 `data-must`가 붙는다(인연 잇기, 해석·근거 고르기). 진행 단추는 `#tray [data-act="next"]`.
| `ctx.readonly` | 다시 읽기: 기록을 바꾸지 않는다 |

## 17. 기획서가 더한 항목 (`design/기획서_v1.md` §20과 콘텐츠 작업에서 더한 것)

여기 적은 항목은 데이터에 이미 들어 있다. **'엔진 대기'**라고 적은 것은 지금 엔진(`js/core`·`js/game`)이 아직 읽지 않는 항목이다. 엔진이 읽지 않아도 화면이 깨지지 않게 적었고, 엔진이 읽게 되면 데이터는 그대로 둔다.
- 화면 문구 가운데 내용에 속하는 것(빈 선방의 한 줄, 구슬의 게임 설정 카드)은 `notes.ui`에 둔다(12절).

| # | 항목 | 모양 | 지금 |
| --- | --- | --- | --- |
| 1 | 출장입상의 두 칸 | `wishes`의 `chuljang`에 `parts: [{ id: 'chul', name: '장수' }, { id: 'ip', name: '재상' }]`. 다른 소원은 `size`(부귀 5, 풍류 4, 공명 4)로 막대 칸 수 | 엔진이 읽는다. 말판 칸은 `fills: ['chuljang.chul']`·`['chuljang.ip', …]`로 반 칸씩 채우고, 소원 목록에 장수·재상 두 칸이 보인다(한 칸이면 반 半, 둘이면 滿). 막대 칸 수(`size`)도 그린다 |
| 2 | 말판 출발 칸 | `sq-suju`: `scene: null, start: true` | 엔진이 읽는다. 2장 첫머리에 말이 이 칸에 섰다가 첫 칸으로 걸어간다 |
| 3 | 말 옷 바꾸기 | 칸에 `outfit: 'gwan'|'jang'|'sang'` → 도착하면 `assets/board/horse_walk_<outfit>.webp` | 엔진이 읽는다(그림이 없으면 기본 말 그림) |
| 4 | 벼슬 칸 도착 연출 | `kind: 'office'` 칸에 들어설 때 교지 카드(`assets/ui/gyoji.webp`)와 채워지는 소원 | 엔진이 읽는다(그림이 없으면 CSS로 그린 교지) |
| 5 | 물건 칸 종류 | 집 칸 `{ id, x, y, w, kind: 'in'|'yard' }`, 물건 `slot: 'in'|'yard'|'any'`. `w`는 칸 너비(그림 너비에 대한 %) | 엔진이 읽는다(`w`, `kind`·`slot` 제한. 맞지 않는 칸은 흐리게 보이고 놓이지 않는다) |
| 6 | 原文 대조 전 글 | 회목·핵심 구절은 대조 전에 `{ gloss }`만 쓴다. 회목은 장면에 `heading: { hoe, part: 'a'|'b'|'both', gloss, status: '대조 대기' }`(여러 회에 걸치면 배열). 대조 뒤에 `orig`·`src`를 더하고 `status`를 지운다 | 엔진이 읽는다(장면 머리의 회목 카드, 原文 낙관 없이 풀이만). 대조 전이므로 **데이터 어디에도 `orig`가 없다** |
| 7 | 해석 근거의 두 단계 | `interp.evidence` 항목에 `after: true`(대사의 대답을 들은 뒤 고칠 때만 보임, E8~E10) | 엔진이 읽는다(대사의 말을 듣기 전에는 `after` 항목을 엔진이 뺀다). 데이터는 `after` 표시를 단 맨 배열이다 |
| 8 | 다시 만남 여러 명 | `remeet`를 배열로 받을 수 있게 | 엔진이 읽는다(`s13`은 정경패·난양공주, `s14`는 진채봉 등 여러 사람의 카드에 사연이 덧붙는다) |
| 9 | 숨은 구슬의 근거 | `pearl.trace: 'canon'|'fiction'`, `pearl.canon`(원작 근거, canon일 때) | 원작 근거는 정경패(`s04`)·난양공주(`s08`) 둘뿐이고 나머지 여섯은 `fiction`. 엔진이 읽는다(canon이면 원작 근거 '알아 두기', fiction이면 게임 설정 카드 `notes.ui.pearlFiction`) |
| 10 | 장면 뒤 그림 | 장면에 `imgAfter`(활동 뒤 바뀌는 그림, 예: `sc_josin_wake`, `sc_rebirth`) | 엔진이 읽는다 |
| 11 | 말판 칸의 회목 | 칸에 `heading`(6번과 같은 모양, 예: `sq-chwimi`의 15회) | 엔진이 읽는다(칸에 도착할 때 회목 카드) |
| 12 | 인연 잇기의 근거 | `journal.bondLink.reveal: [덩이]`(미색이 드러난 뒤 보일 근거 구절과 해석 카드), `bondLink.id`(`'j-bond'`), `bondLink.memo`, `bondLink.wrong` | 엔진이 읽는다(`reveal`은 글 표시 규칙대로, `memo`는 여백 메모, `wrong`은 고른 것에 따른 한 줄. 채점하지 않으므로 `id`는 장부에 넣지 않는다). `bondLink` 글에는 原文 낙관을 붙이지 않는다 |
| 13 | 해석 선택지의 어울리는 근거 | `interp.options[].fits: ['E5', …]`(참고용, 채점 아님) | 교사용 참고. 화면 표시는 엔진 대기 |
| 14 | 대사의 대답 | `interp.lastWords: { say: '인물id', text: '…' }`(풀이로 쓴 대사의 말). 대조가 끝나면 `orig`·`gloss`·`src`로 바꾼다 | 엔진이 읽는다 |
| 15 | 물건의 게임 설정 | 물건 그림의 모양이나 집에 들이는 일이 게임 설정이면 `item.fiction: '실제로는 → …'`를 두고, `desc`에도 '게임 설정 · 실제로는 →'을 한 줄 적는다 | `desc`만 엔진이 읽는다 |
| 16 | 장의 곡과 게임 설정 카드 id | 기획서 §19-5의 id(`fc-board`, `fc-wishes`, `fc-pearls`, `fc-house`, `fc-fairy-color`, `fc-piece`)를 `mark: 'fiction'` 덩이와 `chapters[ch].fiction`, `house.fiction`의 `id`로 쓴다 | 엔진이 읽는다 |
| 17 | 교사용 안내 덧붙임 | `notes.teacher.extra`(모둠 디브리핑 안내), `notes.teacher.ledger`(장부 보는 법) | 엔진이 읽는다(선생님용 목차의 교사용 안내, `ledger`는 선생님용 결과 화면 장부 아래에도) |

- 인물의 얼굴: 얼굴 그림이 없는 인물(정 사도·두연사·태후·황제·월왕·연왕·용왕·황건역사·지장보살·유모·서동)은 `people`에 `noFace: true`로 두고, 장면 글에서 `say`나 `{호칭|id}`로 쓰지 않는다(이름만 이야기 글에 쓴다). 얼굴 그림 경로가 생기지 않게 하기 위해서다.
- 이야기 글의 웃음 연출 대사(예: "아차.")는 원작에 없는 한마디다. 처음 나오는 웃음 장면(`s04`)에 게임 설정 카드 `fc-comic`으로 밝힌다.

## 18. 지켜야 할 규칙 (데이터 점검이 보는 것)

1. 장면은 장 순서대로, 같은 장 안에서는 원작 순서대로 적는다. 결말을 바꾸지 않는다.
2. 미색(`dreamHidden`) 소원을 어떤 `fills`에도 넣지 않는다.
3. 인연 카드에 `fills`를 두지 않는다. 일지 짝의 `event`에 인연을 두지 않는다. 인연은 세지 않는다.
4. 말판 칸은 `office`·`place`만. 떨어지는 칸 없음.
5. 구슬은 `meet`가 있는 장면에만.
6. 활동은 `slots` 틀만. 채점 활동의 모든 칸에 `answer`가 있다.
7. 채점하지 않는 것: 마음 고르기, 집 배치, 구슬 찾기, `scored: false` 일지 짝, 해석 고르기.
8. 채점하는 일지 짝마다 `evidence`가 있다. 해석 선택지는 3~4개.
