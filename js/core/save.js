'use strict';
// 진행 저장: 이 브라우저(localStorage)에만 저장하고 어디로도 보내지 않는다.
// 같은 기기에서 탭 두 개로 열면 나중에 저장한 쪽이 남는다(한 사람이 한 기기에서 하는 게임이라 따로 막지 않는다).
// 임시 데이터(?fixture=…)로 열면 다른 칸에 저장해 실제 진행과 섞이지 않게 한다.
(function () {
  const BASE_KEY = 'guunmong-v1';
  // 새로 시작해도 남기는 것(기록이 아니라 설정)
  const SETTINGS = ['music', 'sound', 'big', 'teacher', 'mode'];
  const fresh = () => ({
    v: 1,
    // ── 설정
    music: true,            // 배경음
    sound: true,            // 효과음
    big: false,             // 큰 글자
    teacher: false,         // 선생님용
    mode: 'first',          // 읽기 방식: first 처음 읽기 / review 다시 읽기
    // ── 진행
    started: false,
    pos: null,              // 지금 장면 id(끄면 이 장면 처음부터 이어 한다)
    reach: 0,               // 열린 가장 먼 장의 순번(0~6)
    done: {},               // 마친 장면 id → true
    awake: false,           // 깨어남(3장 지팡이 소리). 새로 시작하기 전까지 되돌릴 수 없다
    awakeAt: 0,
    // ── 기록
    ledger: {},             // 채점 활동 id → { first: 첫 시도 정확도, help: null|'student'|'teacher', final: 마침 }
    wrong: [],              // 오답 노트 [{ act, slot, picked, answer }]
    picks: {},              // 채점하지 않는 활동의 고른 답: 활동 id → { 칸 id: 고른 것 }
    mind: {},               // 마음 고르기: 장면 id → 선택지 id
    items: {},              // 얻은 물건: 물건 id → { scene }
    house: {},              // 집 배치: 물건 id → 칸 id
    bonds: {},              // 인연첩: 인연 id → true
    bondNotes: {},          // 다시 만나 덧붙은 사연: 장면 id → true
    pearls: {},             // 찾은 구슬: 인연 id → true
    seenFiction: {},        // 이미 본 게임 설정(처음 볼 때만 '실제로는 →')
    journal: {},            // 꿈 일지(4장) 기록
    interp: {},             // 해석 고르기와 고친 흔적(5장)
    name: '',               // 결과 화면에 쓸 이름(선택, 이 브라우저에만)
    startedAt: 0,
    finishedAt: 0,
  });
  let S = fresh();
  let KEY = BASE_KEY;

  G.save = {
    get state() { return S; },
    get key() { return KEY; },
    fresh,
    // fixture: 임시 데이터 이름(없으면 실제 진행)
    load(fixture) {
      if (fixture !== undefined) KEY = fixture ? BASE_KEY + '-fixture-' + fixture : BASE_KEY;
      S = fresh();
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) S = Object.assign(fresh(), JSON.parse(raw));
      } catch (e) { /* 저장소를 못 쓰는 환경: 새로 시작 */ }
      return S;
    },
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 공간이 없거나 막힘: 무시 */ }
    },
    // 모든 기록을 지운다(설정은 남긴다)
    reset() {
      const keep = {};
      for (const k of SETTINGS) keep[k] = S[k];
      S = Object.assign(fresh(), keep);
      this.write();
      return S;
    },

    // ───────── 장부(첫 시도 정확도·도움 사용만, 감점 없음)
    // 첫 제출에서만 first가 정해진다. 마친(final) 활동은 다시 풀어도 바뀌지 않는다.
    // 학생이 풀기 전에 선생님용 도움(정답 채우기·보기)을 썼으면 first는 null(시도 안 함)로 둔다.
    ledgerTry(id, ok) {
      const L = S.ledger[id];
      if (L && L.final) return;
      if (!L) S.ledger[id] = { first: !!ok, help: null, final: false };
      else if (L.first == null && L.help !== 'teacher') L.first = !!ok;
      this.write();
    },
    ledgerHelp(id, who) {
      let L = S.ledger[id];
      if (L && L.final) return;
      if (!L) L = S.ledger[id] = { first: null, help: null, final: false };
      L.help = who === 'teacher' || L.help === 'teacher' ? 'teacher' : 'student';
      this.write();
    },
    ledgerDone(id) {
      const L = S.ledger[id];
      if (!L || L.final) return;
      L.final = true;
      this.write();
    },
    wrongNote(entry) {
      if (!S.wrong.some((w) => w.act === entry.act && w.slot === entry.slot)) S.wrong.push(entry);
    },
  };
})();
