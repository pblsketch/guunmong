// 임시 데이터(점검용). 주소에 ?fixture=1 을 붙였을 때만 읽힌다. 실제 내용이 아니다.
// 형식은 js/data/README.md를 따른다. 장면 수를 줄였을 뿐 모든 항목의 모양을 한 번씩 담았다.
(function () {
  const D = (window.GUUN = window.GUUN || {});

  D.people = {
    p1: { name: '(임시) 인물 갑', face: 'stub_p1', moods: ['smile'] },
    p2: { name: '(임시) 인물 을', face: 'stub_p2' },
  };

  D.chapters = {
    '0': { intro: '(임시) 서장 안내 글.' },
    '1': { recap: '(임시) 지난 이야기: 서장에서 있었던 일.' },
    '2': { recap: '(임시) 지난 이야기: 1장에서 있었던 일.', fiction: { id: 'board', title: '(임시) 말판', body: '(임시) 말판은 게임 장치예요.', real: '(임시) 실제 놀이 소개.' } },
    '3': { recap: '(임시) 지난 이야기: 꿈속의 일.' },
    '4': { recap: '(임시) 지난 이야기: 깨어남.' },
    '5': { recap: '(임시) 지난 이야기: 꿈 일지.' },
  };

  D.wishes = [
    { id: 'w-a', name: '(임시) 소원 가', evidence: '(임시) 근거 구절 가' },
    { id: 'w-b', name: '(임시) 소원 나', evidence: '(임시) 근거 구절 나' },
    { id: 'w-hidden', name: '(임시) 숨은 소원', dreamHidden: true, evidence: '(임시) 근거 구절 다' },
    { id: 'w-music', name: '(임시) 풍류', evidence: '(임시) 근거 구절 라' },
  ];

  D.board = [
    { id: 'sq1', name: '(임시) 장소 칸', kind: 'place', scene: 'c2-a', x: 10, y: 80 },
    { id: 'sq2', name: '(임시) 벼슬 칸', kind: 'office', scene: 'c2-b', fills: ['w-a'], x: 40, y: 60 },
    { id: 'sq3', name: '(임시) 둘째 벼슬 칸', kind: 'office', scene: 'c2-c', fills: ['w-a'], x: 70, y: 40 },
    { id: 'sq4', name: '(임시) 마지막 장소 칸', kind: 'place', scene: 'c3-feast', x: 86, y: 14 },
  ];

  D.bonds = [
    { id: 'b1', name: '(임시) 인연 하나', face: 'stub_p2', status: '(임시) 신분', ability: '(임시) 능력과 사연', place: '(임시) 만난 곳', fairy: '(임시) 팔선녀 정체' },
    { id: 'b2', name: '(임시) 인연 둘', status: '(임시) 둘째 신분', ability: '(임시) 둘째 능력', story: '(임시) 둘째 사연', place: '(임시) 둘째 만난 곳', fairy: '(임시) 둘째 팔선녀' },
  ];

  D.house = {
    stages: [
      { id: 'h1', name: '(임시) 집 1단계', from: 'c2-a', img: 'stub_house1', slots: [{ id: 'h1-a', x: 25, y: 65 }, { id: 'h1-b', x: 70, y: 65 }] },
      { id: 'h2', name: '(임시) 집 2단계', from: 'c2-b', img: 'stub_house2', slots: [{ id: 'h2-a', x: 18, y: 62 }, { id: 'h2-b', x: 50, y: 62 }, { id: 'h2-c', x: 82, y: 62 }] },
      { id: 'h3', name: '(임시) 집 3단계', from: 'c2-c', img: 'stub_house3', grid: [4, 2] },
    ],
    fiction: { id: 'house', title: '(임시) 집 꾸미기', body: '(임시) 집 꾸미기는 게임 장치예요.', real: '(임시) 원작에는 집 꾸미기가 없어요.' },
  };

  D.scenes = [
    {
      id: 'c0-a', ch: '0', title: '(임시) 서장 장면', place: '(임시) 장소', img: 'stub_c0', bgm: 'stub-a',
      read: [
        { orig: '(임시 原文) 가나다 ᄒᆞ라', gloss: '(임시 풀이) {인물 갑|p1}이 길을 떠난다.' },
        { say: 'p1', mood: 'smile', text: '(임시) 인물의 말.' },
        { mark: 'fiction', id: 'frame', title: '(임시) 게임 설정', body: '(임시) 이것은 게임 장치예요.', real: '(임시) 실제로는 이렇다.' },
      ],
      activity: {
        id: 'a-c0', scored: true, title: '(임시) 낱말 넣기', prompt: '(임시) 원문을 읽고 빈칸에 알맞은 말을 넣어요.',
        passage: '(임시) 첫째 칸 [[s1]], 둘째 칸 [[s2]].',
        slots: [{ id: 's1', answer: '갑', memo: '(임시) 첫째 칸 힌트' }, { id: 's2', answer: '을', memo: '(임시) 둘째 칸 힌트' }],
        choices: ['갑', '을', '병'], extra: ['정'],
        memo: '(임시) 여백 메모', explain: '(임시) 풀이 설명', wrongNote: '(임시) 오답 노트 설명',
      },
    },
    {
      id: 'c1-a', ch: '1', title: '(임시) 연화봉 장면', img: 'stub_c1', bgm: 'stub-b', reality: true,
      read: [
        { orig: '(임시 原文) 라마바', gloss: '(임시 풀이) 둘째 장면.' },
        { mark: 'fiction', id: 'frame', title: '(임시) 같은 게임 설정', body: '(임시) 두 번째로 나옴.', real: '(임시) 이 줄은 보이면 안 됨.' },
        { mark: 'variant', title: '(임시) 이본 노트', body: '(임시) 판본마다 다른 곳.' },
        { mark: 'interp', title: '(임시) 해석', body: '(임시) 여러 해석.' },
      ],
      activity: {
        id: 'a-c1', scored: true, title: '(임시) 소원 찾기',
        slots: [{ id: 'w1', label: '(임시) 바람 1', answer: '(임시) 바람 가' }, { id: 'w2', label: '(임시) 바람 2', answer: '(임시) 바람 나' }],
        choices: ['(임시) 바람 가', '(임시) 바람 나', '(임시) 바람 아님'], extra: ['(임시) 헷갈림'],
      },
    },
    { id: 'c1-b', ch: '1', title: '(임시) 연화봉 둘째 장면', reality: true, read: [{ gloss: '(임시 풀이) 풀이만 있는 덩이.' }] },
    {
      id: 'c2-a', ch: '2', title: '(임시) 꿈 장면 하나', img: 'stub_c2a', square: 'sq1', meet: 'b1', fills: ['w-b'],
      pearl: { x: 30, y: 40, r: 8 },
      read: [{ orig: '(임시 原文) 사아자', gloss: '(임시 풀이) 꿈 장면.' }],
      activity: {
        id: 'a-c2', scored: true, title: '(임시) 단서 고르기', passage: '(임시) 단서는 [[k1]]이다.',
        slots: [{ id: 'k1', answer: '단서', memo: '(임시) 단서 힌트' }], choices: ['단서', '헛단서'], extra: ['또 헛단서'],
      },
      mind: { prompt: '(임시) 이때의 마음은?', options: [{ id: 'm1', text: '(임시) 마음 하나', evidence: '(임시) 근거' }, { id: 'm2', text: '(임시) 마음 둘' }] },
      item: { id: 'it1', name: '(임시) 물건 하나', desc: '(임시) 물건 설명', img: 'stub_item1', fills: ['w-b'] },
    },
    {
      id: 'c2-b', ch: '2', title: '(임시) 꿈 장면 둘', square: 'sq2', remeet: { bond: 'b1', story: '(임시) 덧붙는 사연' },
      read: [{ orig: '(임시 原文) 차카타', gloss: '(임시 풀이) 다시 만남.' }],
      activity: {
        id: 'a-c2b', scored: false, title: '(임시) 채점하지 않는 활동',
        slots: [{ id: 'u1', label: '(임시) 고르기' }], choices: ['(임시) 하나', '(임시) 둘'],
      },
      mind: { options: [{ id: 'n1', text: '(임시) 마음 셋' }, { id: 'n2', text: '(임시) 마음 넷' }] },
      item: { id: 'it2', name: '(임시) 물건 둘', fills: ['w-a'] },
    },
    {
      id: 'c2-c', ch: '2', title: '(임시) 꿈 장면 셋', img: 'stub_c2c', square: 'sq3', meet: 'b2',
      pearl: { x: 70, y: 30, r: 8, hint: '(임시) 구슬 힌트' },
      read: [{ gloss: '(임시 풀이) 둘째 인연을 처음 만남.' }],
      mind: { options: [{ id: 'q1', text: '(임시) 마음 다섯' }, { id: 'q2', text: '(임시) 마음 여섯' }] },
      item: { id: 'it3', name: '(임시) 악기', kind: 'music', fills: ['w-music'] },
    },
    { id: 'c3-feast', ch: '3', title: '(임시) 잔치', bgm: 'stub-a', square: 'sq4', read: [{ gloss: '(임시 풀이) 잔치 장면.' }] },
    {
      id: 'c3-staff', ch: '3', kind: 'waking', title: '(임시) 지팡이', read: [{ gloss: '(임시 풀이) 지팡이 앞.' }],
      approach: [{ gloss: '(임시 풀이) 지팡이로 땅을 두드리며 호승이 다가온다(아직 꿈).' }],
      staffPrompt: '(임시) 호승이 지팡이로 돌난간을 친다.',
      after: [{ gloss: '(임시 풀이) 빈 선방의 성진.' }],
      roomImg: 'stub_room',
    },
    { id: 'c3-room', ch: '3', awakened: true, reality: true, title: '(임시) 빈 선방', read: [{ gloss: '(임시 풀이) 깨어난 방.' }] },
    { id: 'c4-journal', ch: '4', kind: 'journal', title: '(임시) 꿈 일지' },
    { id: 'c5-master', ch: '5', kind: 'interp', title: '(임시) 육관대사', read: [{ gloss: '(임시 풀이) 성진이 대사 앞에 엎드린다.' }] },
    { id: 'r-result', ch: 'R', kind: 'result', title: '(임시) 결과' },
  ];

  D.journal = {
    pairs: [
      { id: 'j1', event: '(임시) 사건 하나', wish: 'w-a', scored: true, evidence: '(임시) 근거' },
      { id: 'j3', event: '(임시) 사건 셋', kind: 'item', wish: 'w-music', scored: true, evidence: '(임시) 근거 셋', memo: '(임시) 사건 셋 힌트' },
      { id: 'j2', event: '(임시) 사건 둘', wish: 'w-b', scored: false, note: '(임시) 해석이 갈림' },
    ],
    bondLink: { prompt: '(임시) 어떤 마음이 인연을 꿈꾸었나', answer: 'w-hidden', choices: ['w-a', 'w-b', 'w-hidden'], evidence: '(임시) 근거' },
  };

  D.interp = {
    question: '(임시) 꿈속의 삶은 헛것인가?',
    options: [{ id: 'i1', text: '(임시) 해석 하나' }, { id: 'i2', text: '(임시) 해석 둘' }, { id: 'i3', text: '(임시) 해석 셋' }],
    evidence: [{ id: 'e1', text: '(임시) 근거 구절 하나', from: '(임시) 대목 하나' }, { id: 'e2', text: '(임시) 근거 구절 둘' }, { id: 'e3', text: '(임시) 근거 구절 셋' }],
    dialogue: [{ say: 'p1', text: '(임시) 성진: 꿈을 꾸었습니다.' }],
    lastWords: { orig: '(임시 原文) 대사의 마지막 말', gloss: '(임시 풀이) 너는 아직 꿈에서 깨지 못했다.' },
    ending: [{ gloss: '(임시 풀이) 팔선녀가 출가하고 모두 극락으로 간다.' }],
  };

  D.notes = {
    work: ['(임시) 작품 노트'],
    variants: [{ title: '(임시) 이본', body: '(임시) 이본 설명' }],
    discuss: ['(임시) 생각 나눔 질문'],
    teacher: { when: '(임시) 수업 시점', time: '(임시) 예상 시간', questions: ['(임시) 질문 하나', '(임시) 질문 둘'] },
  };

  D.bgm = {
    title: 'stub-a',
    tracks: {
      'stub-a': { file: 'assets/bgm/stub-a.mp3', gain: 1, synth: 'calm', src: '(임시 출처) 가야금 악구' },
      'stub-b': { file: 'assets/bgm/stub-b.mp3', gain: 1, synth: 'lotus', src: '(임시 출처) 대금 악구' },
    },
  };
})();
