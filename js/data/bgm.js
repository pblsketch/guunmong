// 배경음 곡 배정과 출처 문구 — tools/make_bgm.py가 만든다(손으로 고치지 말고 스크립트를 고쳐 다시 만든다).
// 녹음: 국립국악원 「디지털 이음」 국악기 연주 음원 악구(공공누리 제1유형: 상업 이용·편집 가능, 출처 표시 필수).
// 곡 이름·쓰는 곳은 기획서 §18. src에 쓴 악구 번호(국립국악원 악구 코드)를 적는다.
// file이 없는 곡은 녹음 없이 synth의 합성 곡으로만 튼다. 퉁소 곡은 「디지털 이음」에 퉁소 악구가 없어 단소 연주로 대신한다.
(window.GUUN = window.GUUN || {}).bgm = {
  title: 'calm',
  tracks: {
    calm: { file: 'assets/bgm/calm.mp3', len: 78.860, gain: 1.0, wet: 0, synth: 'calm', src: '대금 풍류 「청성곡」 악구 w3-190-010~050' },
    josin: { file: 'assets/bgm/josin.mp3', len: 76.209, gain: 1.0, wet: 0, synth: 'sorrow', src: '해금 산조(지영희류) 진양조 악구 s3-001-001~006' },
    lotus: { file: 'assets/bgm/lotus.mp3', len: 103.830, gain: 1.0, wet: 0, synth: 'lotus', src: '대금 풍류 「상령산」 악구 w3-141-010·020·030' },
    hell: { file: 'assets/bgm/hell.mp3', len: 92.547, gain: 1.0, wet: 0, synth: 'sorrow', src: '아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006' },
    spring: { file: 'assets/bgm/spring.mp3', len: 41.010, gain: 1.0, wet: 0, synth: 'dream', src: '양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040' },
    mountain: { file: 'assets/bgm/mountain.mp3', len: 69.024, gain: 1.0, wet: 0.12, synth: 'lotus', src: '소금 연례악 「수제천」 악구 w4-440-010·012·014·019·022~025' },
    feast: { file: 'assets/bgm/feast.mp3', len: 17.439, gain: 1.0, wet: 0, synth: 'feast', src: '피리 경기대풍류 「당악」 악구 w1-719-001~004' },
    geomungo: { file: 'assets/bgm/geomungo.mp3', len: 90.004, gain: 1.0, wet: 0, synth: 'reflect', src: '거문고 풍류(현악영산회상) 「상령산」 악구 s2-111-010·020' },
    prank: { file: 'assets/bgm/prank.mp3', len: 44.652, gain: 1.0, wet: 0, synth: 'dream', src: '가야금 산조(성금련류) 굿거리 악구 s1-001-040~048' },
    march: { file: 'assets/bgm/march.mp3', len: 166.606, gain: 1.0, wet: 0, synth: 'feast', src: '태평소 행악 「대취타」 악구 w2-510-001~013' },
    tungso: { file: 'assets/bgm/tungso.mp3', len: 27.044, gain: 1.0, wet: 0.12, synth: 'lotus', src: '단소 풍류 「청성곡」 악구 w5-190-010·020·025·030(퉁소 대신 단소)' },
    palace: { file: 'assets/bgm/palace.mp3', len: 111.265, gain: 1.0, wet: 0, synth: 'feast', src: '피리 연례악 「수제천」 악구 w1-440-010·020·030' },
    night: { file: 'assets/bgm/night.mp3', len: 67.475, gain: 1.0, wet: 0, synth: 'sorrow', src: '대금 산조 진양조 악구 w3-001-001~006' },
    water: { file: 'assets/bgm/water.mp3', len: 52.363, gain: 1.0, wet: 0, synth: 'dream', src: '양금 풍류 「우조가락도드리」 악구 s5-133-010~060' },
    dream: { file: 'assets/bgm/dream.mp3', len: 63.999, gain: 1.0, wet: 0, synth: 'dream', src: '양금 풍류 「타령」 악구 s5-118-010~090' },
    chwimi: { file: 'assets/bgm/chwimi.mp3', len: 41.728, gain: 1.0, wet: 0.12, synth: 'sorrow', src: '단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소)' },
    awake: { file: 'assets/bgm/awake.mp3', len: 31.866, gain: 1.0, wet: 0.12, synth: 'reflect', src: '대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070' },
    reflect: { file: 'assets/bgm/reflect.mp3', len: 99.311, gain: 1.0, wet: 0, synth: 'reflect', src: '거문고 풍류 「윗도드리」 악구 s2-122-010~040' },
  },
  credit: '배경음 국립국악원 「디지털 이음」 국악기 연주 음원(공공누리 제1유형) · 퉁소 곡은 단소 연주로 대신함',
  creditFull: '공공누리 제1유형 출처 표시: 국립국악원 「디지털 이음」 국악기 연주 음원(악구), https://www.gugak.go.kr/digitaleum/ . 쓴 악구: 대금 풍류 「청성곡」 악구 w3-190-010~050 · 해금 산조(지영희류) 진양조 악구 s3-001-001~006 · 대금 풍류 「상령산」 악구 w3-141-010·020·030 · 아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006 · 양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040 · 소금 연례악 「수제천」 악구 w4-440-010·012·014·019·022~025 · 피리 경기대풍류 「당악」 악구 w1-719-001~004 · 거문고 풍류(현악영산회상) 「상령산」 악구 s2-111-010·020 · 가야금 산조(성금련류) 굿거리 악구 s1-001-040~048 · 태평소 행악 「대취타」 악구 w2-510-001~013 · 단소 풍류 「청성곡」 악구 w5-190-010·020·025·030(퉁소 대신 단소) · 피리 연례악 「수제천」 악구 w1-440-010·020·030 · 대금 산조 진양조 악구 w3-001-001~006 · 양금 풍류 「우조가락도드리」 악구 s5-133-010~060 · 양금 풍류 「타령」 악구 s5-118-010~090 · 단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소) · 대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070 · 거문고 풍류 「윗도드리」 악구 s2-122-010~040. 악구를 이어 붙이고 음량을 맞춰 썼어요. 퉁소 곡(난양공주의 달밤, 취미궁)은 퉁소 녹음이 없어 단소 연주로 대신했어요. 녹음을 불러오지 못할 때도 합성한 가락으로 대신해요. 효과음은 브라우저에서 합성해요.',
};
