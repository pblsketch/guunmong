// 인물(이름·얼굴 그림). 형식은 js/data/README.md 3절.
// 얼굴 그림: assets/pt/<face>.webp, 표정은 assets/pt/<face>_<mood>.webp (기획서 §17-3, 96×96).
// 얼굴이 없는 인물은 noFace: true. 장면 글에서 say나 {호칭|id}로 쓰지 않고 이름만 이야기 글에 쓴다.
(window.GUUN = window.GUUN || {}).people = {
  // 연화봉(현실)
  seongjin: { name: '성진', face: 'seongjin', moods: ['troubled', 'awake'] },
  yuk: { name: '육관대사', face: 'yuk', moods: ['stern', 'smile'] },
  hoseung: { name: '호승', face: 'hoseung', moods: ['laugh'] },
  yeomra: { name: '염라대왕', face: 'yeomra', moods: ['stern'] },
  josin: { name: '조신', face: 'josin', moods: ['aged'] },

  // 꿈
  yang: { name: '양소유', face: 'yang', moods: ['smile', 'shock', 'disguise'] },
  dosa: { name: '남전산 도인', face: 'dosa', moods: ['smile'] },
  jeong13: { name: '정십삼', face: 'jeong13', moods: ['laugh'] },

  // 여덟 인연(인연첩 카드의 얼굴과 같다)
  chae: { name: '진채봉', face: 'chae', moods: ['shy', 'tears'] },
  seomwol: { name: '계섬월', face: 'seomwol', moods: ['smile', 'sly'] },
  gyeongpae: { name: '정경패', face: 'gyeongpae', moods: ['blush', 'sly'] },
  chunun: { name: '가춘운', face: 'chunun', moods: ['ghost', 'giggle'] },
  gyeonghong: { name: '적경홍', face: 'gyeonghong', moods: ['disguise', 'smile'] },
  nanyang: { name: '난양공주', face: 'nanyang', moods: ['smile'] },
  yoyeon: { name: '심요연', face: 'yoyeon', moods: ['blade', 'smile'] },
  neungpa: { name: '백능파', face: 'neungpa', moods: ['sad', 'smile'] },

  // 팔선녀(4장에서 구슬로 카드가 뒤집힐 때. 띠 색은 게임 설정)
  fairy_chae: { name: '연두 띠의 선녀', face: 'fairy_chae' },
  fairy_seomwol: { name: '다홍 띠의 선녀', face: 'fairy_seomwol' },
  fairy_gyeongpae: { name: '상아빛 띠의 선녀', face: 'fairy_gyeongpae' },
  fairy_chunun: { name: '분홍 띠의 선녀', face: 'fairy_chunun' },
  fairy_gyeonghong: { name: '보라 띠의 선녀', face: 'fairy_gyeonghong' },
  fairy_nanyang: { name: '금빛 띠의 선녀', face: 'fairy_nanyang' },
  fairy_yoyeon: { name: '남색 띠의 선녀', face: 'fairy_yoyeon' },
  fairy_neungpa: { name: '물빛 띠의 선녀', face: 'fairy_neungpa' },

  // 얼굴 그림이 없는 인물(이름만 나온다)
  jeongsado: { name: '정 사도', noFace: true },
  dusa: { name: '두연사', noFace: true },
  taehu: { name: '태후', noFace: true },
  hwangje: { name: '황제', noFace: true },
  wolwang: { name: '월왕', noFace: true },
  yeonwang: { name: '연왕', noFace: true },
  yongwang: { name: '동정 용왕', noFace: true },
  hwanggeon: { name: '황건역사', noFace: true },
  jijang: { name: '지장보살', noFace: true },
  yumo: { name: '유모', noFace: true },
  seodong: { name: '서동', noFace: true },
};
