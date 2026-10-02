// 승경도 말판(기획서 §8-1). 칸은 양소유가 원작에서 실제로 거친 곳(place)과 벼슬(office)뿐이다. 떨어지는 칸은 없다.
// 4×4 칸을 뱀 모양으로 아래에서 위로 오른다(위로 갈수록 벼슬이 높다). x·y는 board.webp에 대한 %.
// fills: 이 칸의 장면을 마치면 채워지는 소원. 출장입상은 반 칸씩 점 표기로 적는다('chuljang.chul' 장수 / 'chuljang.ip' 재상, README 17절 1번).
// start: 출발 칸(장면 없음). 2장 첫머리에 말이 여기에 섰다가 첫 칸으로 걸어간다.
// outfit: 이 칸에 도착하면 말의 옷이 바뀐다(horse_walk_<outfit>.webp, 없으면 기본 말 그림).
// heading: 이 칸에 도착할 때 보일 회목 카드(대조 대기라 풀이만).
(window.GUUN = window.GUUN || {}).board = [
  { id: 'sq-suju', name: '수주현', kind: 'place', scene: null, start: true, x: 12.5, y: 86, fills: [] },
  { id: 'sq-huayin', name: '화음현', kind: 'place', scene: 's01-huayin', x: 37.5, y: 86, fills: [] },
  { id: 'sq-namjeon', name: '남전산', kind: 'place', scene: 's02-namjeon', x: 62.5, y: 86, fills: [] },
  { id: 'sq-tianjin', name: '낙양 천진교', kind: 'place', scene: 's03-tianjin', x: 87.5, y: 86, fills: [] },
  { id: 'sq-jeongbu', name: '정 사도 댁', kind: 'place', scene: 's04-geomungo', x: 87.5, y: 62, fills: [] },
  { id: 'sq-hallim', name: '장원급제·한림학사', kind: 'office', scene: 's05-chunun', x: 62.5, y: 62, fills: ['gongmyeong'], outfit: 'gwan' },
  { id: 'sq-sasin', name: '하북 사신', kind: 'office', scene: 's06-hebei', x: 37.5, y: 62, fills: [] },
  { id: 'sq-handan', name: '한단·낙양', kind: 'place', scene: 's07-gyeonghong', x: 12.5, y: 62, fills: [] },
  { id: 'sq-yebu', name: '예부상서', kind: 'office', scene: 's08-tungso', x: 12.5, y: 38, fills: ['bugwi'] },
  { id: 'sq-bongnae', name: '봉래전', kind: 'place', scene: 's09-bongnae', x: 37.5, y: 38, fills: [] },
  { id: 'sq-wonsu', name: '정서대원수', kind: 'office', scene: 's10-wonsu', x: 62.5, y: 38, fills: ['chuljang.chul'], outfit: 'jang' },
  { id: 'sq-jeokseol', name: '적설산 진영', kind: 'place', scene: 's11-yoyeon', x: 87.5, y: 38, fills: [] },
  { id: 'sq-baekryong', name: '반사곡·백룡담', kind: 'place', scene: 's12-neungpa', x: 87.5, y: 14, fills: [] },
  { id: 'sq-seungsang', name: '대승상·위국공', kind: 'office', scene: 's13-seungsang', x: 62.5, y: 14, fills: ['chuljang.ip', 'gongmyeong'], outfit: 'sang' },
  // 부마 칸의 소원 채움은 물건 it-girinpo(기린 도포와 옥대)가 맡는다(같은 것을 두 번 세지 않음)
  { id: 'sq-buma', name: '부마', kind: 'office', scene: 's14-honrye', x: 37.5, y: 14, fills: [] },
  {
    id: 'sq-chwimi', name: '취미궁', kind: 'place', scene: 'c3-feast', x: 12.5, y: 14, fills: ['bugwi'],
    heading: { hoe: 15, part: 'both', gloss: '부마는 금 술잔으로 벌주를 마시고, 임금은 은혜로 취미궁을 빌려주다', status: '대조 대기' },
  },
];
