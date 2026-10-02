// 양소유의 집(기획서 §10) — 집 꾸미기는 게임 설정이다. 배치는 채점하지 않는다.
// 단계는 말판 진행에 따라 오른다(from 장면에 들어서면). 그림은 단계마다 가로로 넓어진다.
// 칸: { id, x, y, w, kind } — x·y·w는 집 그림 너비·높이에 대한 %. kind: 'in'(방 안: 위 벽 줄·아래 바닥 줄) / 'yard'(뜰).
// 칸 id는 저장 열쇠다(save.house[물건id] = 칸id). 단계가 오르면 같은 순번의 칸으로 옮겨 간다(inn-1 → bd-1 → ss-1 → cw-1).
// 물건의 slot('in'·'yard'·'any')과 칸의 kind가 맞아야 놓인다(엔진 js/game/house.js). 취미궁 바닥 줄은 그림의 대리석 바닥(y 78~86%)에 맞춰 y 81.
(function () {
  // 줄 하나를 칸 목록으로: prefix, 시작 번호, y, x 목록, kind, w
  const row = (p, n0, y, xs, kind, w) => xs.map((x, i) => ({ id: p + '-' + (n0 + i), x, y, w, kind }));

  (window.GUUN = window.GUUN || {}).house = {
    stages: [
      {
        id: 'inn', name: '객사·초가', from: 's01-huayin', img: 'house_inn', size: [320, 200],
        slots: [...row('inn', 1, 40, [14, 34, 54], 'in', 14), ...row('inn', 4, 72, [24, 50], 'in', 14), ...row('inn', 6, 78, [86], 'yard', 14)],
      },
      {
        id: 'byeoldang', name: '정 사도 댁 별당', from: 's05-chunun', img: 'house_byeoldang', size: [480, 200],
        slots: [...row('bd', 1, 38, [10, 23, 36, 49, 62], 'in', 10), ...row('bd', 6, 72, [10, 23, 36, 49, 62], 'in', 10), ...row('bd', 11, 80, [81, 93], 'yard', 10)],
      },
      {
        id: 'seungsang', name: '승상부', from: 's13-seungsang', img: 'house_seungsang', size: [640, 200],
        slots: [...row('ss', 1, 36, [8, 18, 28, 38, 48, 58, 68], 'in', 8), ...row('ss', 8, 72, [13, 23, 33, 43, 53, 63], 'in', 8), ...row('ss', 14, 80, [82, 89, 96], 'yard', 6)],
      },
      {
        id: 'chwimi', name: '취미궁', from: 'c3-feast', img: 'house_chwimi', size: [800, 200],
        slots: [...row('cw', 1, 34, [6, 15, 24, 33, 42, 51, 60, 69], 'in', 7), ...row('cw', 9, 81, [10, 19, 28, 37, 46, 55, 64, 73], 'in', 7), ...row('cw', 17, 80, [81, 86, 91, 96], 'yard', 5)],
      },
    ],
    fiction: {
      id: 'fc-house',
      title: '집 꾸미기',
      body: '장면마다 얻은 물건을 양소유의 집에 놓아 보세요. 아무 칸에나 놓고 언제든 옮길 수 있어요. 채점하지 않아요.',
      real: '원작은 양소유의 집 안 살림을 이렇게 늘어놓지 않아요. 다만 물건 하나하나는 원작에 나오는 것이에요(그림 모양을 정한 것은 물건 설명에 밝혀 두었어요).',
    },
  };
})();
