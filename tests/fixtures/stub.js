// 임시 형식 점검 데이터. 실제 사건 검사는 profile 옵션 없이 별도로 한다.
(function () {
  const D = (window.GUUN = {});
  D.people = { yang: { name: '(임시) 소유', face: 'yang', moods: ['smile'] } };
  D.chapters = { '2': { bgm: 'dream', fiction: { id: 'fc-prep', title: '(임시) 준비', body: '(임시) 능력 수치', real: '(임시) 게임 설정' } } };
  D.wishes = [
    { id: 'chuljang', name: '(임시) 출장입상', parts: [{ id: 'chul', name: '장수' }, { id: 'ip', name: '재상' }] },
    { id: 'bugwi', name: '(임시) 부귀' }, { id: 'gongmyeong', name: '(임시) 공명' },
    { id: 'pungryu', name: '(임시) 풍류' }, { id: 'misaek', name: '(임시) 미색', dreamHidden: true },
  ];
  D.bonds = [
    { id: 'b1', name: '(임시) 인연 가', story: '(임시) 같은 카드', fairy: '(임시) 정체 가' },
    { id: 'b2', name: '(임시) 인연 나', story: '(임시) 같은 카드', fairy: '(임시) 정체 나' },
    { id: 'b3', name: '(임시) 인연 다', story: '(임시) 같은 카드', fairy: '(임시) 정체 다' },
  ];
  const evidence = Array.from({ length: 10 }, (_, i) => ({ id: 'E' + (i + 1), text: '(임시) 근거 ' + (i + 1) + ' 끝', after: i >= 7 }));
  const scene = (id, ch, text) => ({ id, ch, kind: 'scene', title: '(임시) 장면', lines: [text] });
  const event = (n, core) => ({
    id: 'e0' + n + '-stub', ch: '2', kind: 'event', title: '(임시) 사건 ' + n,
    preview: '(임시) 글과 곡조와 군사를 살핀다.', clues: ['곡조'], core,
    img: 'sc_huayin', bgm: 'dream', lines: [{ say: 'yang', text: '(임시) 사건이 이어진다.' }],
    gradeText: { shine: '(임시) 높은 평판', fine: '(임시) 좋은 평판', near: '(임시) 작은 평판' },
    items: [{ id: 'it-stub-' + n, name: '(임시) 물건', fills: [] }],
    square: 'sq-stub-' + n, meet: 'b' + n,
    pearl: { x: 30, y: 40, r: 7, trace: 'fiction', hint: '(임시) 빛' },
  });
  D.scenes = [
    { id: 'cut-josin', ch: '0', kind: 'cut', title: '(임시) 서장', timeline: [{ at: 0, lines: ['(임시) 꿈의 시작'], effect: 'mist' }] },
    scene('c1-bridge', '1', evidence[0].text),
    scene('c1-cell', '1', evidence[1].text),
    { id: 'c1-wish', ch: '1', kind: 'wish', title: '(임시) 소원',
      monologue: '(임시) 출장입상 부귀 공명 풍류 미색 돌',
      words: [
        { id: 'w1', text: '출장입상', wish: 'chuljang' }, { id: 'w2', text: '부귀', wish: 'bugwi' },
        { id: 'w3', text: '공명', wish: 'gongmyeong' }, { id: 'w4', text: '풍류', wish: 'pungryu' },
        { id: 'w5', text: '미색', wish: 'misaek' }, { id: 'w6', text: '돌' },
      ], answers: ['w1', 'w2', 'w3', 'w4', 'w5'], memo: '(임시) 바람 찾기' },
    scene('c1-exile', '1', evidence[2].text),
    scene('c1-rebirth', '1', evidence[3].text),
    event(1, ['munjang']),
    { id: 'l-namjeon', ch: '2', kind: 'link', title: '(임시) 이음', square: 'sq-link', lines: ['(임시) 악기를 받는다.'],
      bonus: { abil: { eumak: 2 }, items: [{ id: 'it-stub-music', name: '(임시) 악기', fills: ['pungryu'] }] } },
    event(2, ['eumak']), event(3, ['muye', 'jiryak']),
    scene('c3-feast', '3', evidence[4].text), scene('c3-monk', '3', evidence[5].text),
    { id: 'c3-staff', ch: '3', kind: 'waking', title: '(임시) 지팡이', timeline: [
      { at: 0, lines: ['(임시) 지팡이를 든다.'], pause: 'staff' },
      { at: 1000, lines: ['(임시) 꿈이 흩어진다.'], effect: 'shatter' },
    ] },
    { ...scene('c3-awake', '3', evidence[6].text), awakened: true, reality: true },
    { id: 'c4-journal', ch: '4', kind: 'journal', title: '(임시) 일지' },
    { id: 'c5-dialogue', ch: '5', kind: 'interp', title: '(임시) 문답' },
    { id: 'c5-ordination', ch: '5', kind: 'cut', title: '(임시) 출가', timeline: [{ at: 0, lines: ['(임시) 마지막 길'] }] },
    { id: 'r-result', ch: 'R', kind: 'result', title: '(임시) 결과' },
  ];
  D.board = D.scenes.filter((s) => s.square).map((s, i) => ({ id: s.square, scene: s.id, name: '(임시) 칸', kind: 'place', x: 10 + i * 20, y: 80 - i * 15 }));
  D.house = { stages: [{ id: 'h-start', name: '(임시) 집', from: 'e01-stub', slots: [{ id: 'in1', kind: 'in', x: 50, y: 60, w: 20 }] }] };
  D.journal = { id: 'j-match', title: '(임시) 맞대기', pairs: ['chuljang', 'chuljang', 'bugwi', 'pungryu', 'gongmyeong'].map((wish, i) => ({
    id: 'j-' + i, event: '(임시) 사실 ' + i, wish, evidence: '(임시) 짝의 근거',
  })), bondLink: { id: 'j-bond', prompt: '(임시) 마음 잇기', choices: ['bugwi', 'misaek'], answer: 'misaek', reveal: ['(임시) 숨은 소원'] } };
  D.interp = { question: '(임시) 꿈의 뜻', options: [1, 2, 3, 4].map((n) => ({ id: 'i' + n, text: '(임시) 해석 ' + n })), evidence,
    dialogue: ['(임시) 대답 전 문답'], lastWords: [{ text: evidence[7].text }, { text: evidence[8].text }], ending: [evidence[9].text] };
  D.notes = { work: ['(임시) 작품 노트'], variants: [], discuss: ['(임시) 생각 나눔'], teacher: { ledger: '(임시) 장부 안내' }, ui: {} };
  D.bgm = { title: 'calm', tracks: {} };
  D.sprites = {};
})();
