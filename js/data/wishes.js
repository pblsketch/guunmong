// 성진의 소원 목록(기획서 §7). 1장 선방의 혼잣말에서 찾는다. 모든 학생에게 같다.
// evidence: 혼잣말의 근거 구절(새로 쓴 풀이). 한문 원문 후보는 대조 대기라 쓰지 않는다(origStatus).
// 채움 규칙: 출장입상·부귀·공명 ← 벼슬·재물·명예 / 풍류 ← 귀로 듣는 음악과 악기만 / 미색 ← 아무것도 채우지 않음.
// 인연(여덟 여인)은 어떤 소원도 채우지 않는다.
(window.GUUN = window.GUUN || {}).wishes = [
  {
    id: 'chuljang', name: '출장입상', hanja: '出將入相',
    evidence: '나가면 삼군을 거느리는 장수, 들어오면 온 벼슬아치의 우두머리',
    parts: [{ id: 'chul', name: '장수' }, { id: 'ip', name: '재상' }],
    note: '성어는 혼잣말에 그대로 나오지 않는다. 짝을 이룬 두 마디를 줄인 말이다.',
    origStatus: '대조 대기',
  },
  {
    id: 'bugwi', name: '부귀', hanja: '富貴', size: 5,
    evidence: '몸에는 비단 도포, 허리에는 인끈',
    also: '대사의 꾸짖음: 세상의 부귀를 마음에 두었다(두 계열 본 공통)',
    origStatus: '대조 대기',
  },
  {
    id: 'misaek', name: '미색', hanja: '美色', dreamHidden: true,
    evidence: '눈으로 고운 빛을 봄',
    also: '대사의 꾸짖음: 선녀를 그리는 마음 / 한글 완판본은 낱말 그대로 \'미색\'',
    origStatus: '대조 대기',
  },
  {
    id: 'pungryu', name: '풍류', hanja: '風流', size: 4,
    evidence: '귀로 좋은 소리를 들음',
    also: '한글 완판본: 좋은 풍류 소리. 이 혼잣말의 풍류는 귀로 듣는 음악이다',
    origStatus: '대조 대기',
  },
  {
    id: 'gongmyeong', name: '공명', hanja: '功名', size: 4,
    evidence: '죽어서는 이름을 뒷세상까지 남김',
    also: '두 계열 본 모두 낱말 그대로 \'공명\'',
    origStatus: '대조 대기',
  },
];
