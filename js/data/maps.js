(window.GUUN = window.GUUN || {}).maps = [
  {
    "id": "map-bridge",
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
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
        1,
        1,
        0,
        0,
        0,
        0,
        0
      ]
    ],
    "art": "map-bridge",
    "objects": [
      {
        "id": "bridge-fairy",
        "x": 6,
        "y": 3,
        "kind": "npc",
        "solid": true,
        "label": "연두 띠의 선녀",
        "visibleAt": [
          "c1-bridge:bridge-meet"
        ],
        "action": "bridge-meet",
        "person": "fairy_chae",
        "sprite": "npc-fairy-green"
      },
      { "id": "bridge-fairy-scarlet", "x": 4, "y": 0, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-scarlet" },
      { "id": "bridge-fairy-ivory", "x": 5, "y": 0, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-ivory" },
      { "id": "bridge-fairy-pink", "x": 6, "y": 0, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-pink" },
      { "id": "bridge-fairy-violet", "x": 7, "y": 0, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-violet" },
      { "id": "bridge-fairy-gold", "x": 5, "y": 1, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-gold" },
      { "id": "bridge-fairy-navy", "x": 6, "y": 1, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-navy" },
      { "id": "bridge-fairy-aqua", "x": 5, "y": 2, "kind": "npc", "solid": true, "label": "선녀", "decor": true, "visibleAt": ["c1-bridge:bridge-meet"], "action": null, "sprite": "npc-fairy-aqua" },
      {
        "id": "bridge-flower",
        "x": 5,
        "y": 4,
        "kind": "item",
        "solid": true,
        "label": "복숭아꽃",
        "verb": "건네기",
        "sprite": "prop-peach",
        "visibleAt": [
          "c1-bridge:bridge-flower"
        ],
        "action": "bridge-flower"
      },
      {
        "id": "bridge-home",
        "x": 6,
        "y": 8,
        "kind": "exit",
        "solid": true,
        "label": "선방으로 돌아가는 길",
        "sprite": "prop-path",
        "visibleAt": [
          "c1-bridge:bridge-home"
        ],
        "action": "bridge-home"
      }
    ]
  },
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
        "id": "cell-window",
        "x": 6,
        "y": 2,
        "kind": "scenery",
        "solid": true,
        "label": "창가",
        "sprite": "prop-window",
        "visibleAt": [
          "c1-cell:cell-window",
          "c1-cell:cell-sit"
        ],
        "action": "cell-window"
      },
      {
        "id": "cell-cushion",
        "x": 5,
        "y": 5,
        "kind": "scenery",
        "solid": true,
        "label": "방석",
        "verb": "앉기",
        "visibleAt": [
          "c1-cell:cell-window",
          "c1-cell:cell-sit"
        ],
        "action": "cell-sit",
        "sprite": "prop-cushion"
      },
      {
        "id": "cell-book",
        "x": 3,
        "y": 4,
        "kind": "scenery",
        "solid": true,
        "label": "경전",
        "visibleAt": [
          "c1-cell:cell-window",
          "c1-cell:cell-sit"
        ],
        "action": "cell-book",
        "sprite": "prop-table"
      },
      {
        "id": "exile-master",
        "x": 7,
        "y": 4,
        "kind": "npc",
        "solid": true,
        "label": "육관대사",
        "visibleAt": [
          "c1-exile:exile-listen"
        ],
        "action": "exile-listen",
        "person": "yuk",
        "sprite": "npc-yuk"
      },
      {
        "id": "exile-answer",
        "x": 7,
        "y": 4,
        "kind": "npc",
        "solid": true,
        "label": "육관대사",
        "visibleAt": [
          "c1-exile:exile-answer"
        ],
        "action": "exile-answer",
        "person": "yuk",
        "sprite": "npc-yuk"
      },
      {
        "id": "exile-door",
        "x": 5,
        "y": 9,
        "kind": "exit",
        "solid": true,
        "label": "저승으로 향하는 출입구",
        "sprite": "prop-gate",
        "visibleAt": [
          "c1-exile:exile-leave"
        ],
        "action": "exile-leave"
      },
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
    "id": "map-huayin",
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
    "art": "map-huayin",
    "objects": [
      {
        "id": "huayin-willow",
        "x": 2,
        "y": 3,
        "kind": "scenery",
        "solid": true,
        "label": "누각에 닿은 버들",
        "sprite": "prop-willow",
        "visibleAt": [
          "e01-huayin:huayin-look"
        ],
        "action": "huayin-look"
      },
      {
        "id": "huayin-brush",
        "x": 5,
        "y": 4,
        "kind": "item",
        "solid": true,
        "label": "붓과 종이",
        "verb": "시 쓰기",
        "visibleAt": [
          "e01-huayin:huayin-write"
        ],
        "action": "huayin-write",
        "sprite": "prop-table"
      },
      {
        "id": "huayin-nurse",
        "x": 8,
        "y": 3,
        "kind": "npc",
        "solid": true,
        "label": "유모",
        "visibleAt": [
          "e01-huayin:huayin-send"
        ],
        "action": "huayin-send",
        "person": "yumo",
        "sprite": "npc-nurse"
      },
      {
        "id": "huayin-reply",
        "x": 8,
        "y": 3,
        "kind": "item",
        "solid": true,
        "label": "유모가 건넨 답시",
        "verb": "받기",
        "visibleAt": [
          "e01-huayin:huayin-reply"
        ],
        "action": "huayin-reply",
        "sprite": "prop-table"
      },
      {
        "id": "huayin-road",
        "x": 6,
        "y": 9,
        "kind": "exit",
        "solid": true,
        "label": "과거 길",
        "sprite": "prop-path",
        "visibleAt": [
          "e01-huayin:huayin-leave"
        ],
        "action": "huayin-leave"
      },
      {
        "id": "huayin-pearl",
        "x": 3,
        "y": 4,
        "kind": "pearl",
        "solid": true,
        "label": "버들잎 곁 구슬 흔적 · 선택",
        "visibleAt": [],
        "action": "huayin-pearl"
      }
    ]
  },
  {
    "id": "map-namjeon",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0,0]
    ],
    "art": "map-bridge",
    "objects": [
      { "id": "namjeon-ridge", "x": 4, "y": 6, "kind": "scenery", "solid": true, "label": "산등성이의 좁은 길", "sprite": "prop-path", "visibleAt": ["l-namjeon:namjeon-climb"], "action": "namjeon-climb" },
      { "id": "namjeon-dosa", "x": 5, "y": 1, "kind": "npc", "solid": true, "label": "남전산 도인", "sprite": "npc-hermit", "visibleAt": ["l-namjeon:namjeon-learn"], "action": "namjeon-learn", "person": "dosa" },
      { "id": "namjeon-instruments", "x": 7, "y": 4, "kind": "item", "solid": true, "label": "거문고와 백옥 퉁소", "verb": "받기", "visibleAt": ["l-namjeon:namjeon-receive"], "action": "namjeon-receive", "sprite": "prop-chest" }
    ]
  },
  {
    "id": "map-tianjin",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-tianjin",
    "objects": [
      { "id": "tianjin-guests", "x": 2, "y": 2, "kind": "scenery", "solid": true, "label": "시를 겨루는 선비들", "visibleAt": ["e02-tianjin:tianjin-enter"], "action": "tianjin-enter", "sprite": "prop-stool" },
      { "id": "tianjin-brush", "x": 5, "y": 4, "kind": "item", "solid": true, "label": "시전과 붓", "verb": "시 쓰기", "visibleAt": ["e02-tianjin:tianjin-write"], "action": "tianjin-write", "sprite": "prop-table" },
      { "id": "tianjin-seomwol", "x": 9, "y": 3, "kind": "npc", "solid": true, "label": "계섬월", "sprite": "npc-singer", "visibleAt": ["e02-tianjin:tianjin-listen"], "action": "tianjin-listen", "person": "seomwol" },
      { "id": "tianjin-pearl", "x": 9, "y": 7, "kind": "pearl", "solid": true, "label": "술잔 곁 구슬 흔적 · 선택", "visibleAt": ["e02-tianjin:tianjin-listen"], "action": "tianjin-pearl" }
    ]
  },
  {
    "id": "map-jeong-house",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-jeong-house",
    "objects": [
      { "id": "geomungo-clothes", "x": 2, "y": 6, "kind": "item", "solid": true, "label": "여도사 차림", "verb": "갈아입기", "visibleAt": ["e03-geomungo:geomungo-dress"], "action": "geomungo-dress", "sprite": "prop-chest" },
      { "id": "geomungo-instrument", "x": 5, "y": 4, "kind": "item", "solid": true, "label": "거문고", "verb": "타기", "visibleAt": ["e03-geomungo:geomungo-play"], "action": "geomungo-play", "sprite": "prop-table" },
      { "id": "geomungo-listener", "x": 9, "y": 3, "kind": "npc", "solid": true, "label": "발 너머 소저", "sprite": "npc-noble-lady", "visibleAt": ["e03-geomungo:geomungo-response"], "action": "geomungo-response", "person": "gyeongpae" },
      { "id": "geomungo-pearl", "x": 9, "y": 7, "kind": "pearl", "solid": true, "label": "창가의 구슬 흔적 · 선택", "visibleAt": [], "action": "geomungo-pearl" }
    ]
  },
  {
    "id": "map-exam",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-exam",
    "objects": [
      { "id": "exam-seat", "x": 5, "y": 4, "kind": "scenery", "solid": true, "label": "시험장의 책상과 붓", "verb": "글 쓰기", "visibleAt": ["e04-exam:exam-write"], "action": "exam-write", "sprite": "prop-table" },
      { "id": "exam-list", "x": 9, "y": 2, "kind": "scenery", "solid": true, "label": "합격자 발표", "visibleAt": ["e04-exam:exam-result"], "action": "exam-result", "sprite": "prop-wall-grey" }
    ]
  },
  {
    "id": "map-hallim",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-hallim",
    "objects": [
      { "id": "hallim-desk", "x": 7, "y": 3, "kind": "scenery", "solid": true, "label": "한림원의 새 자리", "visibleAt": [], "action": null, "sprite": "prop-table" }
    ]
  },
  {
    "id": "map-chunun-garden",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0]
    ],
    "art": "map-huayin",
    "objects": [
      { "id": "chunun-fairy", "x": 8, "y": 3, "kind": "npc", "solid": true, "label": "흰 옷의 낯선 이", "sprite": "npc-white-robe", "visibleAt": ["e05-chunun:chunun-fairy"], "action": "chunun-fairy", "person": "chunun" },
      { "id": "chunun-ghost", "x": 2, "y": 3, "kind": "npc", "solid": true, "label": "장여랑이라 하는 이", "sprite": "npc-white-robe", "visibleAt": ["e05-chunun:chunun-ghost"], "action": "chunun-ghost", "person": "chunun" },
      { "id": "chunun-talisman", "x": 6, "y": 5, "kind": "item", "solid": true, "label": "귀신을 쫓는다는 부적", "verb": "몸에 지니기", "visibleAt": ["e05-chunun:chunun-talisman"], "action": "chunun-talisman", "sprite": "prop-table" }
    ]
  },
  {
    "id": "map-chunun-room",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-chunun-room",
    "objects": [
      { "id": "chunun-screen", "x": 5, "y": 3, "kind": "scenery", "solid": true, "label": "걷힌 병풍", "visibleAt": ["e05-chunun:chunun-reveal"], "action": null, "sprite": "prop-wall-red" },
      { "id": "chunun-revealed", "x": 8, "y": 3, "kind": "npc", "solid": true, "label": "가춘운", "sprite": "npc-white-robe", "visibleAt": ["e05-chunun:chunun-reveal"], "action": "chunun-reveal", "person": "chunun" },
      { "id": "chunun-pearl", "x": 2, "y": 7, "kind": "pearl", "solid": true, "label": "잎 곁 구슬 흔적 · 선택", "visibleAt": [], "action": "chunun-pearl" }
    ]
  },
  {
    "id": "map-hebei",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-hebei",
    "objects": [
      { "id": "hebei-edict", "x": 2, "y": 2, "kind": "item", "solid": true, "label": "황제의 조서", "visibleAt": ["l-hebei:hebei-edict"], "action": "hebei-edict", "sprite": "prop-table" },
      { "id": "hebei-token", "x": 6, "y": 5, "kind": "item", "solid": true, "label": "사신의 부절", "verb": "내보이기", "visibleAt": ["l-hebei:hebei-token"], "action": "hebei-token", "sprite": "prop-chest" },
      { "id": "hebei-king", "x": 9, "y": 2, "kind": "npc", "solid": true, "label": "연왕", "sprite": "npc-yeonwang", "visibleAt": ["l-hebei:hebei-persuade"], "action": "hebei-persuade", "person": "yeonwang" }
    ]
  },
  {
    "id": "map-gyeonghong-road",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0]
    ],
    "art": "map-huayin",
    "objects": [
      { "id": "gyeonghong-horse", "x": 2, "y": 4, "kind": "scenery", "solid": true, "label": "함께 달릴 말", "visibleAt": ["e06-gyeonghong:gyeonghong-road"], "action": "gyeonghong-road", "sprite": "prop-stool" },
      { "id": "gyeonghong-boy", "x": 9, "y": 4, "kind": "npc", "solid": true, "label": "적생", "sprite": "npc-jeoksaeng", "visibleAt": ["e06-gyeonghong:gyeonghong-companion"], "action": "gyeonghong-companion", "person": "gyeonghong" }
    ]
  },
  {
    "id": "map-gyeonghong-room",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-gyeonghong-room",
    "objects": [
      { "id": "gyeonghong-seat", "x": 4, "y": 3, "kind": "scenery", "solid": true, "label": "밤사이 바뀐 자리", "visibleAt": ["e06-gyeonghong:gyeonghong-discover"], "action": "gyeonghong-discover", "sprite": "prop-cushion" },
      { "id": "gyeonghong-revealed", "x": 8, "y": 3, "kind": "npc", "solid": true, "label": "적경홍", "sprite": "npc-gyeonghong", "visibleAt": ["e06-gyeonghong:gyeonghong-reveal"], "action": "gyeonghong-reveal", "person": "gyeonghong" },
      { "id": "gyeonghong-pearl", "x": 9, "y": 7, "kind": "pearl", "solid": true, "label": "거울 곁 구슬 흔적 · 선택", "visibleAt": [], "action": "gyeonghong-pearl" }
    ]
  },
  {
    "id": "map-tungso",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0]
    ],
    "art": "map-chwimi",
    "objects": [
      { "id": "tungso-night", "x": 2, "y": 6, "kind": "scenery", "solid": true, "label": "한림원의 밤 뜰", "sprite": "prop-lantern", "visibleAt": ["e07-tungso:tungso-night"], "action": "tungso-night" },
      { "id": "tungso-instrument", "x": 5, "y": 4, "kind": "item", "solid": true, "label": "백옥 퉁소", "verb": "불기", "visibleAt": ["e07-tungso:tungso-play"], "action": "tungso-play", "sprite": "prop-table" },
      { "id": "tungso-crane", "x": 9, "y": 2, "kind": "scenery", "solid": true, "label": "가락에 내려온 학", "sprite": "prop-crane", "visibleAt": ["e07-tungso:tungso-crane"], "action": "tungso-crane" },
      { "id": "tungso-message", "x": 8, "y": 6, "kind": "scenery", "solid": true, "label": "궁중에서 전해 온 이야기", "visibleAt": ["e07-tungso:tungso-message"], "action": "tungso-message", "sprite": "prop-chest" },
      { "id": "tungso-pearl", "x": 2, "y": 2, "kind": "pearl", "solid": true, "label": "달빛 속 구슬 흔적 · 선택", "visibleAt": ["e07-tungso:tungso-message"], "action": "tungso-pearl" }
    ]
  },
  {
    "id": "map-bongnae",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,1,0],
      [0,0,0,0,0,0,0,0,0,0,0,0]
    ],
    "art": "map-bongnae",
    "objects": [
      { "id": "bongnae-fan", "x": 2, "y": 3, "kind": "item", "solid": true, "label": "궁중의 부채와 비단", "visibleAt": ["l-bongnae:bongnae-fan"], "action": "bongnae-fan", "sprite": "prop-table" },
      { "id": "bongnae-brush", "x": 6, "y": 5, "kind": "item", "solid": true, "label": "궁녀의 부채", "verb": "시 써 주기", "visibleAt": ["l-bongnae:bongnae-write"], "action": "bongnae-write", "sprite": "prop-stool" },
      { "id": "bongnae-reply", "x": 9, "y": 3, "kind": "item", "solid": true, "label": "돌아온 답시", "verb": "읽기", "visibleAt": ["l-bongnae:bongnae-reply"], "action": "bongnae-reply", "sprite": "prop-chest" }
    ]
  },
  {
    "id": "map-feast",
    "width": 12,
    "height": 10,
    "tile": 32,
    "walk": [
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0,0]
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
  },
  {
    "id": "map-wonsu", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-wonsu",
    "objects": [
      { "id": "wonsu-prison", "x": 2, "y": 2, "kind": "scenery", "solid": true, "label": "옥문", "visibleAt": ["e08-wonsu:wonsu-prison"], "action": "wonsu-prison", "sprite": "prop-wall-grey" },
      { "id": "wonsu-summons", "x": 5, "y": 2, "kind": "item", "solid": true, "label": "조정의 부름", "visibleAt": ["e08-wonsu:wonsu-summons"], "action": "wonsu-summons", "sprite": "prop-table" },
      { "id": "wonsu-command", "x": 8, "y": 2, "kind": "npc", "solid": true, "label": "군대 앞 지휘관", "sprite": "npc-general", "visibleAt": ["e08-wonsu:wonsu-command"], "action": "wonsu-command" },
      { "id": "wonsu-victory", "x": 8, "y": 6, "kind": "scenery", "solid": true, "label": "위교의 전황", "visibleAt": ["e08-wonsu:wonsu-victory"], "action": "wonsu-victory", "sprite": "prop-wall-red" },
      { "id": "wonsu-appointment", "x": 3, "y": 6, "kind": "item", "solid": true, "label": "대원수의 검과 교지", "verb": "받기", "visibleAt": ["e08-wonsu:wonsu-appointment"], "action": "wonsu-appointment", "sprite": "prop-chest" }
    ]
  },
  {
    "id": "map-yoyeon", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-yoyeon",
    "objects": [
      { "id": "yoyeon-night", "x": 2, "y": 2, "kind": "scenery", "solid": true, "label": "밤 진영", "visibleAt": ["e09-yoyeon:yoyeon-night"], "action": "yoyeon-night", "sprite": "prop-wall-grey" },
      { "id": "yoyeon-arrive", "x": 8, "y": 2, "kind": "npc", "solid": true, "label": "비수를 든 자객", "sprite": "npc-assassin", "visibleAt": ["e09-yoyeon:yoyeon-arrive"], "action": "yoyeon-arrive", "person": "yoyeon" },
      { "id": "yoyeon-choice", "x": 7, "y": 5, "kind": "npc", "solid": true, "label": "칼을 내려놓으려는 자객", "sprite": "npc-assassin", "visibleAt": ["e09-yoyeon:yoyeon-choice"], "action": "yoyeon-choice" },
      { "id": "yoyeon-speak", "x": 7, "y": 5, "kind": "npc", "solid": true, "label": "심요연", "sprite": "npc-yoyeon", "visibleAt": ["e09-yoyeon:yoyeon-speak"], "action": "yoyeon-speak", "person": "yoyeon" },
      { "id": "yoyeon-warning", "x": 3, "y": 6, "kind": "npc", "solid": true, "label": "심요연", "sprite": "npc-yoyeon", "visibleAt": ["e09-yoyeon:yoyeon-warning"], "action": "yoyeon-warning", "person": "yoyeon" },
      { "id": "yoyeon-pearl", "x": 9, "y": 7, "kind": "pearl", "solid": true, "label": "촛대 아래 구슬 흔적 · 선택", "visibleAt": ["e09-yoyeon:yoyeon-speak","e09-yoyeon:yoyeon-warning"], "action": "yoyeon-pearl" }
    ]
  },
  {
    "id": "map-bansagok", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-bansagok",
    "objects": [
      { "id": "neungpa-water", "x": 4, "y": 3, "kind": "scenery", "solid": true, "label": "반사곡의 물", "visibleAt": ["e10-neungpa:neungpa-water"], "action": "neungpa-water", "sprite": "prop-floor-grey" },
      { "id": "neungpa-enter", "x": 8, "y": 6, "kind": "exit", "solid": true, "label": "백룡담으로 이어지는 물길", "sprite": "prop-pool", "visibleAt": ["e10-neungpa:neungpa-enter"], "action": "neungpa-enter" }
    ]
  },
  {
    "id": "map-baekryong", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-baekryong",
    "objects": [
      { "id": "neungpa-meet", "x": 8, "y": 2, "kind": "npc", "solid": true, "label": "백능파", "sprite": "npc-neungpa", "visibleAt": ["e10-neungpa:neungpa-meet"], "action": "neungpa-meet", "person": "neungpa" },
      { "id": "neungpa-defeat", "x": 3, "y": 2, "kind": "scenery", "solid": true, "label": "남해 태자가 물러난 물가", "visibleAt": ["e10-neungpa:neungpa-defeat"], "action": "neungpa-defeat", "sprite": "prop-wall-red" },
      { "id": "neungpa-share", "x": 7, "y": 5, "kind": "item", "solid": true, "label": "군사들에게 나눌 물", "verb": "나눠 주기", "visibleAt": ["e10-neungpa:neungpa-share"], "action": "neungpa-share", "sprite": "prop-table" },
      { "id": "neungpa-monk", "x": 3, "y": 6, "kind": "npc", "solid": true, "label": "남악의 늙은 스님", "sprite": "npc-old-monk", "visibleAt": ["e10-neungpa:neungpa-monk"], "action": "neungpa-monk" },
      { "id": "neungpa-pearl", "x": 9, "y": 7, "kind": "pearl", "solid": true, "label": "물밑 구슬 흔적 · 선택", "visibleAt": ["e10-neungpa:neungpa-defeat","e10-neungpa:neungpa-share","e10-neungpa:neungpa-monk"], "action": "neungpa-pearl" }
    ]
  },
  {
    "id": "map-seungsang", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-seungsang",
    "objects": [
      { "id": "seungsang-return", "x": 2, "y": 2, "kind": "scenery", "solid": true, "label": "도성으로 돌아온 군대", "visibleAt": ["e11-seungsang:seungsang-return"], "action": "seungsang-return", "sprite": "prop-wall-red" },
      { "id": "seungsang-edict", "x": 6, "y": 2, "kind": "item", "solid": true, "label": "대승상 교지", "verb": "받기", "visibleAt": ["e11-seungsang:seungsang-edict"], "action": "seungsang-edict", "sprite": "prop-table" },
      { "id": "seungsang-portrait", "x": 9, "y": 4, "kind": "scenery", "solid": true, "label": "기린각의 초상", "visibleAt": ["e11-seungsang:seungsang-portrait"], "action": "seungsang-portrait", "sprite": "prop-wall-grey" },
      { "id": "seungsang-news", "x": 3, "y": 6, "kind": "npc", "solid": true, "label": "경패의 소식을 전한 사람", "sprite": "npc-messenger", "visibleAt": ["e11-seungsang:seungsang-news"], "action": "seungsang-news" }
    ]
  },
  {
    "id": "map-honrye", "width": 12, "height": 10, "tile": 32,
    "walk": [[0,0,0,0,0,0,0,0,0,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0,0,0,0]],
    "art": "map-honrye",
    "objects": [
      { "id": "honrye-ceremony", "x": 5, "y": 2, "kind": "scenery", "solid": true, "label": "혼례청", "visibleAt": ["e12-honrye:honrye-ceremony"], "action": "honrye-ceremony", "sprite": "prop-wall-red" },
      { "id": "honrye-robes", "x": 2, "y": 5, "kind": "item", "solid": true, "label": "기린 도포와 옥대", "verb": "갖춰 입기", "visibleAt": ["e12-honrye:honrye-robes"], "action": "honrye-robes", "sprite": "prop-chest" },
      { "id": "honrye-poems", "x": 8, "y": 3, "kind": "npc", "solid": true, "label": "진채봉", "sprite": "npc-chae", "visibleAt": ["e12-honrye:honrye-poems"], "action": "honrye-poems", "person": "chae" },
      { "id": "honrye-reveal", "x": 8, "y": 6, "kind": "scenery", "solid": true, "label": "죽었다던 이의 소식", "visibleAt": ["e12-honrye:honrye-reveal"], "action": "honrye-reveal", "sprite": "prop-wall-red" },
      { "id": "honrye-gyeongpae", "x": 8, "y": 6, "kind": "npc", "solid": true, "label": "정경패", "sprite": "npc-noble-lady", "visibleAt": ["e12-honrye:honrye-gyeongpae"], "action": "honrye-gyeongpae", "person": "gyeongpae" },
      { "id": "honrye-joke", "x": 4, "y": 7, "kind": "npc", "solid": true, "label": "정경패", "sprite": "npc-noble-lady", "visibleAt": ["e12-honrye:honrye-joke"], "action": "honrye-joke", "person": "gyeongpae" }
    ]
  }
];
