// 꿈 일지(4장, 기획서 §13). 원문에 분명히 드러나는 짝만 채점하고(scored: true, evidence 필수), 갈릴 수 있는 짝은 '해석'(scored: false).
// 인연(여덟 여인)은 짝의 event에 두지 않는다. 인연은 bondLink로만 성진의 마음과 잇고, 그 순간 미색이 드러난다.
// evidence는 새로 쓴 풀이다(한문 원문 후보는 대조 대기).
(window.GUUN = window.GUUN || {}).journal = {
  id: 'j-match',
  title: '꿈 일지 맞대기',
  prompt: '꿈속에서 쌓은 것이 성진의 어떤 소원과 맞닿아 있는지 칸마다 골라 넣으세요. 다섯 칸을 모두 채운 뒤 한 번에 확인해요.',
  memo: '독백의 구절과 꿈속 사건을 소리 내어 나란히 읽어 보세요.',
  // 다시 읽기에서만 더 들어가는 헷갈리는 칩(기획서 §13-1): 독백에 있지만 바람의 전제일 뿐 소원 칸이 아니다
  extra: ['학문(어려서 성현의 글을 읽음)'],
  pairs: [
    {
      id: 'j-wonsu', note: '정서대원수 → 출장입상 가운데 장수(나가면 장수).', kind: 'office', event: '정서대원수가 되어 토번을 침', wish: 'chuljang', part: 'chul', scored: true,
      evidence: '혼잣말 "나가면 삼군을 거느리는 장수" · 깨어난 성진의 회상 "나가서는 삼군을 이끌었다"',
      memo: '\'나가면\' 무엇이 된다고 했나요?',
    },
    {
      id: 'j-seungsang', note: '대승상 → 출장입상 가운데 재상(들어오면 재상).', kind: 'office', event: '대승상이 됨', wish: 'chuljang', part: 'ip', scored: true,
      evidence: '혼잣말 "들어오면 온 벼슬아치의 우두머리" · 깨어난 성진의 회상 "들어와서는 온 벼슬아치를 거느렸다"',
      memo: '\'들어오면\' 무엇이 된다고 했나요?',
    },
    {
      id: 'j-girinpo', note: '기린 도포와 옥대 → 부귀(비단 도포와 인끈).', kind: 'item', event: '기린 도포와 옥대를 입음', wish: 'bugwi', scored: true,
      evidence: '혼잣말 "몸에는 비단 도포, 허리에는 인끈" · 대사의 꾸짖음 "세상의 부귀를 마음에 두었다"',
      memo: '성진이 부러워한 옷차림을 떠올려 보세요.',
    },
    {
      id: 'j-geomungo', note: '거문고와 퉁소 → 풍류(귀로 듣는 좋은 소리).', kind: 'item', event: '남전산 도인의 거문고와 퉁소로 곡을 탐', wish: 'pungryu', scored: true,
      evidence: '혼잣말 "귀로는 좋은 소리를 듣고" · 한글 완판본 "좋은 풍류 소리"',
      memo: '귀가 하는 일이에요.',
    },
    {
      id: 'j-girin', note: '기린각 → 공명(뒷세상까지 남는 이름).', kind: 'scene', event: '기린각에 얼굴이 그려짐', wish: 'gongmyeong', scored: true,
      evidence: '혼잣말 "죽어서는 이름을 뒷세상까지 남기고" · 기린각은 공을 세운 신하의 얼굴을 걸어 이름을 남기는 곳',
      memo: '죽은 뒤에도 남는 것이에요.',
    },
    { id: 'h-tianjin', kind: 'scene', event: '천진교 시회에서 섬월이 내 시를 노래함', wish: 'gongmyeong', scored: false, note: '시로 이름을 떨친 일(공명)로도, 노래를 귀로 들은 일(풍류)로도 읽혀요. 혼잣말의 풍류는 소리이므로, 이 게임은 꿈속에서 이 일을 공명 쪽에 두었어요.' },
    { id: 'h-hebei', kind: 'office', event: '하북에 사신으로 가서 연왕을 굴복시킴', wish: 'gongmyeong', scored: false, note: '나가서 세운 공이라 \'출장\'과 닮았지만 장수가 아니라 사신이었어요. 공명으로도 읽혀요.' },
    { id: 'h-tungso', kind: 'scene', event: '퉁소로 학을 춤추게 함', wish: 'pungryu', scored: false, note: '음악(풍류)이지만, 이 일이 공주와의 혼인으로 이어졌어요.' },
    { id: 'h-chwimi', kind: 'scene', event: '취미궁을 빌려 받고 벼슬에서 물러남', wish: 'bugwi', scored: false, note: '부귀의 끝으로도, 바람을 내려놓기 시작한 자리로도 읽혀요.' },
    // wish: null — 어느 소원과도 잇지 않는다. 학생은 '어느 칸도 아님'을 고를 수 있다(기획서 §13-2)
    { id: 'h-prison', kind: 'scene', event: '부마를 사양하고 옥에 갇힘', wish: null, scored: false, note: '어느 소원과도 잇기 어려워요. 소원과 상관없는 일도 꿈에 있었어요.' },
  ],
  bondLink: {
    id: 'j-bond',
    prompt: '성진의 어떤 마음이 꿈속의 여덟 인연을 꿈꾸었을까요?',
    choices: ['bugwi', 'pungryu', 'gongmyeong', 'misaek'],
    answer: 'misaek',
    memo: '1장에서 찾은 다섯 칸 가운데, 꿈 내내 가려져 있던 칸은?',
    wrong: { pungryu: '풍류는 귀로 듣는 소리였어요. 사람으로 채우지 않았어요.' },
    // 미색이 드러난 뒤 보일 근거와 해석(README 17절 12번). 대조 전이라 原文이 아니라 풀이로 쓴다.
    // memo: 고르기 전의 여백 메모, wrong: 미색이 아닌 것을 골랐을 때의 한 줄(고른 소원 id → 글, 채점하지 않는다)
    reveal: [
      { gloss: '혼잣말: 눈으로는 고운 빛을 보고' },
      { gloss: '대사의 꾸짖음: 돌아와서도 선녀들을 잊지 못하고' },
      { gloss: '깨어난 성진: 높은 자리와 재물, 남녀의 사랑이 다 허깨비라는 것을 그 꿈으로 보게 하셨어' },
      { mark: 'interp', title: '인연을 소원 칸에 넣지 않은 까닭', body: '여덟 사람은 성진이 모은 물건이 아니라, 저마다 사연과 재주를 가진 사람으로 꿈에 나왔어요. 그 사람들 또한 스스로 바란 것을 따라 꿈에 들어왔지요(1장, 저승에서 선녀들이 한 청).' },
    ],
  },
};
