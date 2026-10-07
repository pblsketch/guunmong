'use strict';
window.GUUN = {
  "bgm": {
    "title": "calm",
    "tracks": {
      "chwimi": {
        "file": "assets/bgm/chwimi.mp3",
        "len": 41.728,
        "gain": 1,
        "wet": 0.12,
        "synth": "sorrow",
        "src": "단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소)"
      },
      "awake": {
        "file": "assets/bgm/awake.mp3",
        "len": 31.866,
        "gain": 1,
        "wet": 0.12,
        "synth": "reflect",
        "src": "대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070"
      }
    },
    "credit": "배경음 국립국악원 「디지털 이음」 국악기 연주 음원(공공누리 제1유형) · 퉁소 곡은 단소 연주로 대신함",
    "creditFull": "공공누리 제1유형 출처 표시: 국립국악원 「디지털 이음」 국악기 연주 음원(악구), https://www.gugak.go.kr/digitaleum/ . 쓴 악구: 대금 풍류 「청성곡」 악구 w3-190-010~050 · 해금 산조(지영희류) 진양조 악구 s3-001-001~006 · 대금 풍류 「상령산」 악구 w3-141-010·020·030 · 아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006 · 양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040 · 소금 연례악 「수제천」 악구 w4-440-010·012·014·019·022~025 · 피리 경기대풍류 「당악」 악구 w1-719-001~004 · 거문고 풍류(현악영산회상) 「상령산」 악구 s2-111-010·020 · 가야금 산조(성금련류) 굿거리 악구 s1-001-040~048 · 태평소 행악 「대취타」 악구 w2-510-001~013 · 단소 풍류 「청성곡」 악구 w5-190-010·020·025·030(퉁소 대신 단소) · 피리 연례악 「수제천」 악구 w1-440-010·020·030 · 대금 산조 진양조 악구 w3-001-001~006 · 양금 풍류 「우조가락도드리」 악구 s5-133-010~060 · 양금 풍류 「타령」 악구 s5-118-010~090 · 단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소) · 대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070 · 거문고 풍류 「윗도드리」 악구 s2-122-010~040. 악구를 이어 붙이고 음량을 맞춰 썼어요. 퉁소 곡(난양공주의 달밤, 취미궁)은 퉁소 녹음이 없어 단소 연주로 대신했어요. 녹음을 불러오지 못할 때도 합성한 가락으로 대신해요. 효과음은 브라우저에서 합성해요."
  },
  "bonds": [],
  "challenges": [],
  "chapters": {
    "3": {
      "intro": "원하던 것을 누린 소유가 높은 대에 올라요. 아직 꿈속이에요.",
      "recap": "소유는 공을 세우고 혼례를 마쳤어요. 벼슬을 내려놓고 취미궁에 머물게 됩니다.",
      "bgm": "chwimi"
    }
  },
  "experiences": [
    {
      "scene": "c3-feast",
      "map": "map-feast",
      "actor": "yang",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "feast-palace",
          "trigger": {
            "kind": "inspect",
            "target": "feast-palace"
          },
          "lines": [
            0,
            5
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        },
        {
          "id": "feast-overlook",
          "trigger": {
            "kind": "inspect",
            "target": "feast-overlook"
          },
          "lines": [
            1,
            2
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        },
        {
          "id": "feast-vow",
          "trigger": {
            "kind": "inspect",
            "target": "feast-vow"
          },
          "lines": [
            3,
            4
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        }
      ],
      "optional": []
    },
    {
      "scene": "c3-monk",
      "map": "map-feast",
      "actor": "yang",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "monk-hear",
          "trigger": {
            "kind": "inspect",
            "target": "feast-footsteps"
          },
          "lines": [
            0
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        },
        {
          "id": "monk-greeting",
          "trigger": {
            "kind": "talk",
            "target": "feast-visitor"
          },
          "lines": [
            1,
            2
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        },
        {
          "id": "monk-question",
          "trigger": {
            "kind": "talk",
            "target": "feast-question"
          },
          "lines": [
            3,
            4
          ],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        }
      ],
      "optional": []
    },
    {
      "scene": "c3-staff",
      "map": "map-feast",
      "actor": "yang",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "staff-strike",
          "trigger": {
            "kind": "staff",
            "target": null
          },
          "lines": [],
          "effects": [],
          "appearance": "walk-yang-chancellor"
        }
      ],
      "optional": []
    },
    {
      "scene": "c3-awake",
      "map": "map-cell",
      "actor": "seongjin",
      "spawn": {
        "x": 5,
        "y": 6,
        "facing": "up"
      },
      "beats": [
        {
          "id": "awake-cushion",
          "trigger": {
            "kind": "inspect",
            "target": "awake-cushion"
          },
          "lines": [
            0
          ],
          "effects": []
        },
        {
          "id": "awake-window",
          "trigger": {
            "kind": "inspect",
            "target": "awake-window"
          },
          "lines": [
            1
          ],
          "effects": []
        },
        {
          "id": "awake-door",
          "trigger": {
            "kind": "inspect",
            "target": "awake-door"
          },
          "lines": [
            2
          ],
          "effects": []
        }
      ],
      "optional": []
    }
  ],
  "house": {
    "stages": []
  },
  "interp": {},
  "journal": {},
  "maps": [
    {
      "id": "map-cell",
      "width": 12,
      "height": 10,
      "tile": 32,
      "walk": [
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      "art": "map-cell",
      "objects": [
        {
          "id": "awake-cushion",
          "x": 5,
          "y": 5,
          "kind": "scenery",
          "solid": true,
          "label": "그대로 놓인 방석",
          "visibleAt": [
            "c3-awake:awake-cushion"
          ],
          "action": "awake-cushion",
          "sprite": "prop-cushion"
        },
        {
          "id": "awake-window",
          "x": 6,
          "y": 2,
          "kind": "scenery",
          "solid": true,
          "label": "선방의 창가",
          "sprite": "prop-window",
          "visibleAt": [
            "c3-awake:awake-window"
          ],
          "action": "awake-window"
        },
        {
          "id": "awake-door",
          "x": 5,
          "y": 9,
          "kind": "scenery",
          "solid": true,
          "label": "닫힌 출입구",
          "sprite": "prop-gate",
          "visibleAt": [
            "c3-awake:awake-door"
          ],
          "action": "awake-door"
        }
      ]
    },
    {
      "id": "map-feast",
      "width": 12,
      "height": 10,
      "tile": 32,
      "walk": [
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          1,
          1,
          1,
          1,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          1,
          1,
          1,
          1,
          0,
          0,
          0,
          0
        ]
      ],
      "art": "map-chwimi",
      "objects": [
        {
          "id": "feast-palace",
          "x": 2,
          "y": 3,
          "kind": "scenery",
          "solid": true,
          "label": "물러나 머문 취미궁",
          "visibleAt": [
            "c3-feast:feast-palace"
          ],
          "action": "feast-palace",
          "sprite": "prop-stool"
        },
        {
          "id": "feast-overlook",
          "x": 10,
          "y": 4,
          "kind": "scenery",
          "solid": true,
          "label": "옛 궁터와 무덤이 보이는 높은 대",
          "sprite": "prop-lantern",
          "visibleAt": [
            "c3-feast:feast-overlook"
          ],
          "action": "feast-overlook"
        },
        {
          "id": "feast-vow",
          "x": 5,
          "y": 4,
          "kind": "scenery",
          "solid": true,
          "label": "뜻을 함께한 이들",
          "visibleAt": [
            "c3-feast:feast-vow"
          ],
          "action": "feast-vow",
          "sprite": "prop-table"
        },
        {
          "id": "feast-footsteps",
          "x": 2,
          "y": 6,
          "kind": "scenery",
          "solid": true,
          "label": "돌길의 지팡이 소리",
          "sprite": "prop-path",
          "visibleAt": [
            "c3-monk:monk-hear"
          ],
          "action": "monk-hear"
        },
        {
          "id": "feast-visitor",
          "x": 4,
          "y": 4,
          "kind": "npc",
          "solid": true,
          "label": "지팡이 짚은 낯선 승려",
          "visibleAt": [
            "c3-monk:monk-greeting"
          ],
          "action": "monk-greeting",
          "person": "hoseung",
          "sprite": "hoseung"
        },
        {
          "id": "feast-question",
          "x": 4,
          "y": 4,
          "kind": "npc",
          "solid": true,
          "label": "지팡이 짚은 낯선 승려",
          "visibleAt": [
            "c3-monk:monk-question"
          ],
          "action": "monk-question",
          "person": "hoseung",
          "sprite": "hoseung"
        }
      ]
    }
  ],
  "notes": {
    "work": [
      {
        "title": "김만중의 소설",
        "body": "「구운몽」은 성진이 양소유의 삶을 겪고 돌아오는 이야기예요. 한문과 한글의 여러 판본으로 읽혀 왔어요."
      },
      {
        "title": "꿈을 드나드는 짜임",
        "body": "연화봉에서 꿈으로 들어가 다시 연화봉에 닿아요. 바라는 삶을 꿈에서 겪고, 돌아온 자리에서 그 삶을 다시 생각해요."
      },
      {
        "title": "서로 다른 판본",
        "body": "장면의 큰 차례는 한문 을사본 계열을 따르고, 정답은 한글 완판본과 공통인 사실로 정했어요. 세부가 다르면 이본 노트로 구별해요."
      },
      {
        "title": "이 게임의 풀이",
        "body": "풀이와 대사는 새로 쓴 현대어예요. 영인 대조를 마친 글이 없으므로 原文 낙관을 붙이지 않았어요."
      }
    ],
    "variants": [
      {
        "title": "꽃에서 구슬로",
        "body": "복숭아꽃이 구슬로 바뀌는 일은 같아요. 꽃의 수와 염주에 관한 세부는 판본에 따라 달라요."
      },
      {
        "title": "미색과 풍류",
        "body": "완판본에는 미색과 풍류 소리라는 말이 있어요. 한문 계열은 고운 모습과 아름다운 소리로 표현해요."
      },
      {
        "title": "양류사의 글자",
        "body": "버들 노래의 첫 구절 일부는 판본마다 달라요. 게임은 시의 글자를 맞히게 하지 않아요."
      },
      {
        "title": "거문고 곡목",
        "body": "여덟째 곡목은 두 계열에서 같게 확인되지 않았어요. 봉구황과 곡을 알아듣는 장면을 단서로 삼았어요."
      },
      {
        "title": "탄생의 명주",
        "body": "정경패 탄생의 명주는 한문 계열에서 확인했으나 완판본에서는 확인하지 못했어요. 난양공주의 탄생 꿈은 두 계열에 있어요."
      },
      {
        "title": "장주와 나비",
        "body": "장주와 나비의 비유는 한문 계열의 응답에 있어요. 완판본은 꿈과 세상을 나누는 성진의 마음을 짚고 말을 줄여요."
      },
      {
        "title": "출가의 세부",
        "body": "팔선녀의 몸단장과 머리를 깎는 과정은 판본마다 서술 길이가 달라요. 여기서는 출가와 가르침을 듣는 일만 보여요."
      },
      {
        "title": "조신의 세월",
        "comparison": "cut-josin",
        "body": "조신의 꿈을 서술하는 대목과 인물의 말에 나온 햇수가 달라요. 숫자를 외우기보다 한평생과 깨어남을 견주어 보세요."
      }
    ],
    "discuss": [
      "취미궁과 선방을 나란히 보면 어떤 생각이 드나요? 그 경험과 작품의 구절을 이어 설명해 보세요.",
      "성진이 처음 바라던 삶과 깨어난 뒤 선택한 삶은 어떻게 다른가요? 작품의 사건을 근거로 이야기해 보세요."
    ],
    "comparison": {
      "scene": "cut-josin",
      "title": "「조신 설화」와 꿈 비교하기 · 선택",
      "lead": "「조신 설화」는 구운몽의 한 장면이 아닌 별개의 이야기예요. 양소유의 삶을 다 겪은 뒤, 두 인물이 꿈에서 무엇을 얻고 잃었는지 견주어 보세요.",
      "question": "조신과 양소유가 겪은 삶은 어떻게 달랐나요? 둘의 깨어남을 비교하면 꿈을 어떻게 해석할 수 있나요?"
    },
    "teacher": {
      "when": "공통국어2 「구운몽」을 읽는 수업에서 사용해요. 결과의 해석과 구절을 토대로 대화하세요.",
      "time": "기본 약 44분: 연화봉 3분, 꿈 30분, 깨어남 2분, 일지 3분, 문답·출가 4분, 결과 2분. 조신 설화 비교 읽기는 결과에서 원하는 경우에만 해요. 익숙한 반은 35분 안팎으로 조절할 수 있어요.",
      "questions": [
        "어떤 예고의 낱말을 읽고 준비를 골랐나요?",
        "대사의 말을 듣고 해석이나 근거를 바꾼 까닭은 무엇인가요?"
      ],
      "extra": "사건의 길과 결말은 모두 같아요. 구슬 찾기는 선택이며 인연은 점수와 연결하지 않아요. 기록은 이 브라우저에 남으므로 공용 기기는 수업 뒤 확인을 거쳐 지워 주세요.",
      "ledger": "소원 찾기·맞대기는 첫 시도와 도움을 봐요. 사건은 미시작·진행·완료·자동 안내를 구분하고, 학생이 살펴본 행동 근거와 도움 여부를 읽어요. 옛 준비 적중과 등급은 새 수행으로 바꾸지 않아요."
    },
    "ui": {
      "abilities": {
        "munjang": "문장",
        "eumak": "음악",
        "muye": "무예",
        "jiryak": "지략"
      },
      "actions": {
        "study": "학문",
        "geomungo": "거문고",
        "sword": "검술",
        "strategy": "병법"
      },
      "grades": {
        "shine": "빛나는 성공",
        "fine": "훌륭한 성공",
        "near": "아쉬운 성공"
      },
      "resources": {
        "gong": "공",
        "fame": "명성",
        "wealth": "재물"
      },
      "fiction": {
        "prep": {
          "mark": "fiction",
          "id": "fc-prep",
          "title": "예고를 읽고 준비하기",
          "body": "학문·거문고·검술·병법 가운데 두 번 골라요. 윤목은 능력이 오르는 폭만 바꿔요.",
          "real": "원작에 이런 훈련이나 능력 수치는 없어요. 결말은 바뀌지 않으며 선택으로 달라지는 것은 평판 연출과 수치예요."
        },
        "score": {
          "mark": "fiction",
          "id": "fc-score",
          "title": "꿈에서 쌓는 수치",
          "body": "공·명성·재물을 더한 값이 꿈 점수예요. 많이 쌓아도 깨어나면 모두 사라져요.",
          "real": "소설의 공적과 살림을 게임의 숫자로 나타냈어요. 점수로 평가하지 않아요."
        },
        "comic": {
          "mark": "fiction",
          "id": "fc-comic",
          "title": "새로 쓴 대사",
          "body": "인물의 말과 짧은 농담은 사건의 뜻을 살려 새로 썼어요.",
          "real": "웃음이 나는 사건은 소설에도 있어요. 화면의 대사와 표정은 원문 인용이 아니에요."
        },
        "pearls": {
          "mark": "fiction",
          "id": "fc-pearls",
          "title": "그림 속 구슬 흔적",
          "body": "반짝이는 곳을 누르면 숨은 구슬을 찾을 수 있어요. 그냥 지나쳐도 이야기는 이어져요.",
          "real": "정경패·난양공주의 탄생에는 명주 이야기가 전해져요. 모든 만남에 흔적을 숨기고 띠 색으로 잇는 것은 게임의 장치예요."
        },
        "items": {
          "mark": "fiction",
          "id": "fc-items",
          "title": "사건을 기억하는 장식",
          "body": "장면의 물건은 집에 저절로 놓여요. 천리마·비수·물병·궤짝의 설명도 살펴보세요.",
          "real": "원작 물건을 소유가 모두 모았다는 뜻은 아니에요. 보관 장소나 장식 모양을 게임에서 정한 경우 물건 설명에 밝혔어요."
        }
      },
      "preview": "예고의 단서에서 준비할 일을 찾아보세요.",
      "prep": "같은 행동을 다시 골라도 돼요. 준비는 두 번이에요.",
      "clue": "예고의 단서를 다시 짚어 보세요.",
      "grade": "평판은 달라도 사건의 결과와 인연은 같아요.",
      "wishHidden": "미색은 꿈 내내 무엇과 이어지는지 가려 두어요.",
      "pearl": "구슬 찾기는 선택이에요. 점수로 치지 않아요.",
      "staff": "지팡이로 난간을 친다",
      "result": {
        "before": "꿈에서 쌓은 것",
        "after": "깨고 남은 것",
        "zero": 0,
        "scoreNotice": "점수로 평가하지 않아요",
        "save": "이 장을 그림으로 저장",
        "bonds": "꿈에서 만난 인연",
        "secretWish": "숨긴 소원",
        "noSecret": "고르지 않음",
        "peak": "가장 찼던 소원 → 빈 선방",
        "recap": "육관대사의 되짚기"
      },
      "journal": {
        "pearls": "구슬에서 팔선녀로",
        "unfound": "찾지 못한 구슬",
        "unscored": "인연 잇기와 구슬은 채점하지 않아요"
      },
      "teacherPeek": "핵심 능력 보기",
      "audioNotice": "국립국악원 「디지털 이음」 · 공공누리 제1유형 · 퉁소 대신 단소",
      "secretWish": {
        "title": "숨긴 소원",
        "prompt": "소원 가운데 꿈에서 가장 먼저 이루고 싶은 것 하나를 마음속에 숨겨 두세요.",
        "hint": "한 번 고르면 바꿀 수 없어요. 어떻게 이룰지는 알려 주지 않아요.",
        "button": "이 소원을 숨기고 꿈으로",
        "review": "처음 숨긴 소원",
        "saved": "마음속에 숨겨 두었어요.",
        "teacher": "선생님용에서는 숨긴 소원을 기록하지 않아요.",
        "retry": "기록을 저장하지 못했어요. 다시 시도해 주세요."
      },
      "band": {
        "label": "소원과 인연",
        "wish": "{wish} {level}",
        "levels": [
          "비어 있음",
          "조금",
          "반쯤",
          "많이 참",
          "가득 참"
        ],
        "hidden": "{wish} 알 수 없음",
        "secret": "숨긴 소원",
        "bonds": "인연 여덟 칸 가운데 {count}",
        "bondCounts": [
          "찬 칸 없음",
          "한 칸",
          "두 칸",
          "세 칸",
          "네 칸",
          "다섯 칸",
          "여섯 칸",
          "일곱 칸",
          "여덟 칸"
        ],
        "separator": ", "
      },
      "choice": {
        "up": "▲",
        "down": "▼",
        "stay": "소원 그대로",
        "first": "처음 고른 길"
      },
      "collapse": {
        "label": "꿈에서 쌓은 소원과 인연이 비어 간다",
        "bonds": "꿈에서 만난 인연"
      }
    }
  },
  "people": {
    "seongjin": {
      "name": "성진",
      "face": "seongjin",
      "moods": [
        "troubled",
        "awake"
      ]
    },
    "hoseung": {
      "name": "호승",
      "face": "hoseung",
      "moods": [
        "laugh"
      ]
    },
    "yang": {
      "name": "양소유",
      "face": "yang",
      "moods": [
        "smile",
        "shock",
        "disguise"
      ]
    }
  },
  "scenes": [
    {
      "id": "c3-feast",
      "ch": "3",
      "kind": "scene",
      "title": "취미궁 높은 대",
      "img": "sc_c3_feast",
      "bgm": "chwimi",
      "lines": [
        "소유는 벼슬에서 물러나 황제가 빌려준 취미궁에 머물렀다.",
        "국화 핀 높은 대에서 옛 제왕의 궁터와 무덤을 바라봤다.",
        {
          "say": "yang",
          "text": "저토록 강한 제왕도 사라졌구나. 우리 누대도 끝내 흔적만 남겠지."
        },
        {
          "say": "yang",
          "text": "누린 한평생도 눈 깜빡할 틈 같구나. 이제 불도를 구하고 싶소."
        },
        "함께한 이들도 그 길에 뜻을 모았다.",
        {
          "mark": "note",
          "title": "교사 시연용 대표 구간",
          "body": "앞 장의 성취를 새 학생 수행으로 저장하지 않아요. 취미궁부터 같은 선방까지의 깨어남 흐름만 확인해요."
        }
      ]
    },
    {
      "id": "c3-monk",
      "ch": "3",
      "kind": "scene",
      "title": "낯익은 호승",
      "img": "sc_c3_monk",
      "bgm": "chwimi",
      "lines": [
        "돌길을 두드리는 소리와 함께 호승이 다가왔다.",
        {
          "say": "hoseung",
          "text": "오래 함께 지낸 벗을 잊으셨소?",
          "mood": "laugh"
        },
        {
          "say": "yang",
          "text": "남악에서 꿈에 뵌 스님이십니까?"
        },
        {
          "say": "hoseung",
          "text": "꿈의 얼굴만 떠올리니, 승상은 아직 꿈을 깨닫지 못했구려.",
          "mood": "laugh"
        },
        {
          "say": "yang",
          "text": "그렇다면 저를 깨우쳐 주십시오."
        }
      ]
    },
    {
      "id": "c3-staff",
      "ch": "3",
      "kind": "waking",
      "title": "들어 올린 지팡이",
      "img": "sc_c3_monk",
      "bgm": "chwimi",
      "timeline": [
        {
          "at": 0,
          "img": "sc_c3_monk",
          "lines": [
            "호승이 난간 앞으로 다가섰다."
          ],
          "effect": "mist",
          "move": {
            "x": 6,
            "y": 0,
            "duration": 2000
          }
        },
        {
          "at": 2000,
          "lines": [
            "호승이 지팡이를 높이 들었다."
          ],
          "sprites": [
            {
              "id": "hoseung",
              "x": 70,
              "y": 50
            }
          ],
          "pause": "staff"
        }
      ]
    },
    {
      "id": "c3-awake",
      "ch": "3",
      "kind": "scene",
      "title": "다시 선방",
      "img": "sc_c3_awake",
      "bgm": "awake",
      "awakened": true,
      "lines": [
        "흰 구름이 걷히자 선방의 방석 위였다.",
        {
          "say": "seongjin",
          "text": "벼슬도 재물도 사랑도 꿈으로 겪으며 덧없음을 보았구나.",
          "mood": "awake"
        },
        {
          "say": "seongjin",
          "text": "이 모든 것을 스승께서 보여 주신 걸까.",
          "mood": "awake"
        }
      ]
    }
  ],
  "sprites": {
    "study": {
      "src": "assets/sprites/study.webp",
      "width": 96,
      "height": 96,
      "frames": 4,
      "rows": 1
    },
    "geomungo": {
      "src": "assets/sprites/geomungo.webp",
      "width": 96,
      "height": 96,
      "frames": 4,
      "rows": 1
    },
    "sword": {
      "src": "assets/sprites/sword.webp",
      "width": 96,
      "height": 96,
      "frames": 4,
      "rows": 1
    },
    "strategy": {
      "src": "assets/sprites/strategy.webp",
      "width": 96,
      "height": 96,
      "frames": 4,
      "rows": 1
    },
    "hoseung": {
      "src": "assets/sprites/hoseung.webp",
      "width": 96,
      "height": 96,
      "frames": 4,
      "rows": 1
    },
    "munjang": {
      "src": "assets/ui/icon_munjang.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "eumak": {
      "src": "assets/ui/icon_eumak.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "muye": {
      "src": "assets/ui/icon_muye.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "jiryak": {
      "src": "assets/ui/icon_jiryak.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "gong": {
      "src": "assets/ui/icon_gong.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "fame": {
      "src": "assets/ui/icon_fame.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "wealth": {
      "src": "assets/ui/icon_wealth.png",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "map-bridge": {
      "src": "assets/world/map-bridge.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-cell": {
      "src": "assets/world/map-cell.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-huayin": {
      "src": "assets/world/map-huayin.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-chwimi": {
      "src": "assets/world/map-chwimi.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "walk-seongjin": {
      "src": "assets/world/walk-seongjin.webp",
      "width": 32,
      "height": 32,
      "frames": 5,
      "rows": 4,
      "cell": {
        "width": 32,
        "height": 32
      },
      "anchor": {
        "x": 16,
        "y": 30
      },
      "directions": {
        "down": {
          "row": 0,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "left": {
          "row": 1,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "right": {
          "row": 2,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "up": {
          "row": 3,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        }
      }
    },
    "walk-yang-scholar": {
      "src": "assets/world/walk-yang-scholar.webp",
      "width": 32,
      "height": 32,
      "frames": 5,
      "rows": 4,
      "cell": {
        "width": 32,
        "height": 32
      },
      "anchor": {
        "x": 16,
        "y": 30
      },
      "directions": {
        "down": {
          "row": 0,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "left": {
          "row": 1,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "right": {
          "row": 2,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "up": {
          "row": 3,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        }
      }
    },
    "walk-yang-chancellor": {
      "src": "assets/world/walk-yang-chancellor.webp",
      "width": 32,
      "height": 32,
      "frames": 5,
      "rows": 4,
      "cell": {
        "width": 32,
        "height": 32
      },
      "anchor": {
        "x": 16,
        "y": 30
      },
      "directions": {
        "down": {
          "row": 0,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "left": {
          "row": 1,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "right": {
          "row": 2,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "up": {
          "row": 3,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        }
      }
    },
    "kit-room": {
      "src": "assets/world/kit-room.webp",
      "width": 32,
      "height": 32,
      "frames": 4,
      "rows": 2,
      "frameKeys": [
        "floor-grey",
        "floor-wood",
        "wall-grey",
        "wall-red",
        "cushion",
        "table",
        "stool",
        "chest"
      ]
    },
    "prop-floor-grey": {
      "src": "assets/world/prop-floor-grey.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-floor-wood": {
      "src": "assets/world/prop-floor-wood.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-wall-grey": {
      "src": "assets/world/prop-wall-grey.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-wall-red": {
      "src": "assets/world/prop-wall-red.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-cushion": {
      "src": "assets/world/prop-cushion.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-table": {
      "src": "assets/world/prop-table.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-stool": {
      "src": "assets/world/prop-stool.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-chest": {
      "src": "assets/world/prop-chest.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-green": {
      "src": "assets/world/npc-fairy-green.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-yuk": {
      "src": "assets/world/npc-yuk.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "walk-yang-disguise": {
      "src": "assets/world/walk-yang-disguise.webp",
      "width": 32,
      "height": 32,
      "frames": 5,
      "rows": 4,
      "cell": {
        "width": 32,
        "height": 32
      },
      "anchor": {
        "x": 16,
        "y": 30
      },
      "directions": {
        "down": {
          "row": 0,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "left": {
          "row": 1,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "right": {
          "row": 2,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        },
        "up": {
          "row": 3,
          "stand": 0,
          "walk": [
            1,
            2,
            3,
            4
          ]
        }
      }
    },
    "npc-nurse": {
      "src": "assets/world/npc-nurse.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "map-tianjin": {
      "src": "assets/world/map-tianjin.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-jeong-house": {
      "src": "assets/world/map-jeong-house.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-exam": {
      "src": "assets/world/map-exam.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-hallim": {
      "src": "assets/world/map-hallim.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-chunun-room": {
      "src": "assets/world/map-chunun-room.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-hebei": {
      "src": "assets/world/map-hebei.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-gyeonghong-room": {
      "src": "assets/world/map-gyeonghong-room.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-bongnae": {
      "src": "assets/world/map-bongnae.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-wonsu": {
      "src": "assets/world/map-wonsu.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-yoyeon": {
      "src": "assets/world/map-yoyeon.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-bansagok": {
      "src": "assets/world/map-bansagok.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-baekryong": {
      "src": "assets/world/map-baekryong.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-seungsang": {
      "src": "assets/world/map-seungsang.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "map-honrye": {
      "src": "assets/world/map-honrye.webp",
      "width": 384,
      "height": 320,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-scarlet": {
      "src": "assets/world/npc-fairy-scarlet.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-ivory": {
      "src": "assets/world/npc-fairy-ivory.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-pink": {
      "src": "assets/world/npc-fairy-pink.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-violet": {
      "src": "assets/world/npc-fairy-violet.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-gold": {
      "src": "assets/world/npc-fairy-gold.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-navy": {
      "src": "assets/world/npc-fairy-navy.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-fairy-aqua": {
      "src": "assets/world/npc-fairy-aqua.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-hermit": {
      "src": "assets/world/npc-hermit.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-singer": {
      "src": "assets/world/npc-singer.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-noble-lady": {
      "src": "assets/world/npc-noble-lady.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-white-robe": {
      "src": "assets/world/npc-white-robe.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-yeonwang": {
      "src": "assets/world/npc-yeonwang.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-jeoksaeng": {
      "src": "assets/world/npc-jeoksaeng.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-gyeonghong": {
      "src": "assets/world/npc-gyeonghong.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-general": {
      "src": "assets/world/npc-general.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-assassin": {
      "src": "assets/world/npc-assassin.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-yoyeon": {
      "src": "assets/world/npc-yoyeon.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-neungpa": {
      "src": "assets/world/npc-neungpa.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-old-monk": {
      "src": "assets/world/npc-old-monk.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-messenger": {
      "src": "assets/world/npc-messenger.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "npc-chae": {
      "src": "assets/world/npc-chae.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-peach": {
      "src": "assets/world/prop-peach.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-path": {
      "src": "assets/world/prop-path.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-gate": {
      "src": "assets/world/prop-gate.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-window": {
      "src": "assets/world/prop-window.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-willow": {
      "src": "assets/world/prop-willow.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-crane": {
      "src": "assets/world/prop-crane.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-lantern": {
      "src": "assets/world/prop-lantern.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    },
    "prop-pool": {
      "src": "assets/world/prop-pool.webp",
      "width": 32,
      "height": 32,
      "frames": 1,
      "rows": 1
    }
  },
  "wishes": [
    {
      "id": "chuljang",
      "name": "출장입상",
      "hanja": "出將入相",
      "evidence": "밖에서는 장수, 안에서는 재상",
      "parts": [
        {
          "id": "chul",
          "name": "장수"
        },
        {
          "id": "ip",
          "name": "재상"
        }
      ]
    },
    {
      "id": "bugwi",
      "name": "부귀",
      "hanja": "富貴",
      "evidence": "비단옷을 걸치는 부귀"
    },
    {
      "id": "misaek",
      "name": "미색",
      "hanja": "美色",
      "evidence": "미색을 눈에 담고",
      "dreamHidden": true
    },
    {
      "id": "pungryu",
      "name": "풍류",
      "hanja": "風流",
      "evidence": "귀에는 풍류를 채우고"
    },
    {
      "id": "gongmyeong",
      "name": "공명",
      "hanja": "功名",
      "evidence": "공명을 후세에 전하고"
    }
  ],
  "board": []
};
