'use strict';
window.GUUN = {
  "bgm": {
    "title": "calm",
    "tracks": {
      "lotus": {
        "file": "assets/bgm/lotus.mp3",
        "len": 103.83,
        "gain": 1,
        "wet": 0,
        "synth": "lotus",
        "src": "대금 풍류 「상령산」 악구 w3-141-010·020·030"
      },
      "hell": {
        "file": "assets/bgm/hell.mp3",
        "len": 92.547,
        "gain": 1,
        "wet": 0,
        "synth": "sorrow",
        "src": "아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006"
      },
      "spring": {
        "file": "assets/bgm/spring.mp3",
        "len": 41.01,
        "gain": 1,
        "wet": 0,
        "synth": "dream",
        "src": "양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040"
      },
      "dream": {
        "file": "assets/bgm/dream.mp3",
        "len": 63.999,
        "gain": 1,
        "wet": 0,
        "synth": "dream",
        "src": "양금 풍류 「타령」 악구 s5-118-010~090"
      }
    },
    "credit": "배경음 국립국악원 「디지털 이음」 국악기 연주 음원(공공누리 제1유형) · 퉁소 곡은 단소 연주로 대신함",
    "creditFull": "공공누리 제1유형 출처 표시: 국립국악원 「디지털 이음」 국악기 연주 음원(악구), https://www.gugak.go.kr/digitaleum/ . 쓴 악구: 대금 풍류 「청성곡」 악구 w3-190-010~050 · 해금 산조(지영희류) 진양조 악구 s3-001-001~006 · 대금 풍류 「상령산」 악구 w3-141-010·020·030 · 아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006 · 양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040 · 소금 연례악 「수제천」 악구 w4-440-010·012·014·019·022~025 · 피리 경기대풍류 「당악」 악구 w1-719-001~004 · 거문고 풍류(현악영산회상) 「상령산」 악구 s2-111-010·020 · 가야금 산조(성금련류) 굿거리 악구 s1-001-040~048 · 태평소 행악 「대취타」 악구 w2-510-001~013 · 단소 풍류 「청성곡」 악구 w5-190-010·020·025·030(퉁소 대신 단소) · 피리 연례악 「수제천」 악구 w1-440-010·020·030 · 대금 산조 진양조 악구 w3-001-001~006 · 양금 풍류 「우조가락도드리」 악구 s5-133-010~060 · 양금 풍류 「타령」 악구 s5-118-010~090 · 단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소) · 대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070 · 거문고 풍류 「윗도드리」 악구 s2-122-010~040. 악구를 이어 붙이고 음량을 맞춰 썼어요. 퉁소 곡(난양공주의 달밤, 취미궁)은 퉁소 녹음이 없어 단소 연주로 대신했어요. 녹음을 불러오지 못할 때도 합성한 가락으로 대신해요. 효과음은 브라우저에서 합성해요."
  },
  "bonds": [
    {
      "id": "chae",
      "name": "진채봉",
      "face": "chae",
      "status": "진 어사의 딸, 뒤에는 궁중의 여중서",
      "ability": "시로 자기 마음을 먼저 전한다.",
      "story": "버들 노래에 답시를 보내 소유와 혼약했다.",
      "place": "화음현 버들 아래와 누각",
      "fairy": "돌다리의 선녀 · 연두 띠",
      "color": "연두(버들)",
      "fairyFace": "fairy_chae",
      "aliases": [
        "채봉"
      ]
    }
  ],
  "challenges": [
    {
      "id": "ch-bridge-reply",
      "scene": "c1-bridge",
      "beat": "bridge-meet",
      "kind": "talk",
      "at": 1,
      "prompt": "성진은 어떻게 답할까?",
      "options": [
        {
          "id": "polite",
          "label": "길을 비켜 달라고 정중히 청한다",
          "reply": {
            "say": "fairy_chae",
            "text": "말씀은 고우시네요. 그래도 길값은 길값이지요."
          }
        },
        {
          "id": "laugh",
          "label": "중에게 무슨 재물이 있겠느냐며 웃는다",
          "reply": {
            "say": "fairy_chae",
            "text": "빈손이라 하시니 더 궁금해지는걸요."
          }
        },
        {
          "id": "look",
          "label": "말없이 손에 든 것을 살핀다",
          "reply": {
            "say": "fairy_chae",
            "text": "무엇을 내놓으실지 기다려 볼게요."
          }
        }
      ]
    }
  ],
  "chapters": {
    "1": {
      "intro": "성진으로 돌다리를 걷고, 선방에서 떠오르는 소원을 찾아보세요.",
      "recap": "성진이 용궁 심부름을 마치고 연화봉으로 돌아오는 길이에요.",
      "bgm": "lotus"
    },
    "2": {
      "intro": "양소유로 사람에게 다가가 말을 듣고, 원작의 행동을 이어 가세요.",
      "recap": "성진은 세상의 삶을 동경하다가 소유로 태어났어요. 과거를 향해 길을 나섭니다.",
      "bgm": "dream",
      "fiction": {
        "id": "fc-world",
        "title": "걷고 이야기하는 한평생",
        "body": "탐색 순서는 고를 수 있어요. 시를 전하고 악기를 연주하는 일과 사건의 차례는 원작을 따라요.",
        "real": "소설의 장소를 걸을 수 있는 작은 공간으로 꾸몄어요. 자리와 동선은 게임의 연출이에요."
      }
    }
  },
  "experiences": [
    {
      "scene": "c1-bridge",
      "map": "map-bridge",
      "actor": "seongjin",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "bridge-meet",
          "trigger": {
            "kind": "talk",
            "target": "bridge-fairy"
          },
          "lines": [
            0,
            1,
            5
          ],
          "effects": []
        },
        {
          "id": "bridge-flower",
          "trigger": {
            "kind": "use",
            "target": "bridge-flower"
          },
          "lines": [
            2,
            3
          ],
          "effects": [
            {
              "kind": "story",
              "id": "c1-bridge:flowers"
            }
          ]
        },
        {
          "id": "bridge-home",
          "trigger": {
            "kind": "exit",
            "target": "bridge-home"
          },
          "lines": [
            4
          ],
          "effects": []
        }
      ],
      "optional": []
    },
    {
      "scene": "c1-cell",
      "map": "map-cell",
      "actor": "seongjin",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "cell-window",
          "trigger": {
            "kind": "inspect",
            "target": "cell-window"
          },
          "lines": [
            0
          ],
          "effects": []
        },
        {
          "id": "cell-sit",
          "trigger": {
            "kind": "use",
            "target": "cell-cushion"
          },
          "lines": [
            1,
            2
          ],
          "effects": []
        }
      ],
      "optional": [
        {
          "id": "cell-book",
          "trigger": {
            "kind": "inspect",
            "target": "cell-book"
          },
          "lines": [
            3
          ],
          "effects": []
        }
      ]
    },
    {
      "scene": "c1-exile",
      "map": "map-cell",
      "actor": "seongjin",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "exile-listen",
          "trigger": {
            "kind": "talk",
            "target": "exile-master"
          },
          "lines": [
            0
          ],
          "effects": []
        },
        {
          "id": "exile-answer",
          "trigger": {
            "kind": "talk",
            "target": "exile-answer"
          },
          "lines": [
            1
          ],
          "effects": []
        },
        {
          "id": "exile-leave",
          "trigger": {
            "kind": "exit",
            "target": "exile-door"
          },
          "lines": [
            2
          ],
          "effects": []
        }
      ],
      "optional": []
    },
    {
      "scene": "e01-huayin",
      "map": "map-huayin",
      "actor": "yang",
      "spawn": {
        "x": 5,
        "y": 8,
        "facing": "up"
      },
      "beats": [
        {
          "id": "huayin-look",
          "trigger": {
            "kind": "inspect",
            "target": "huayin-willow"
          },
          "lines": [
            1,
            2,
            0
          ],
          "effects": []
        },
        {
          "id": "huayin-write",
          "trigger": {
            "kind": "use",
            "target": "huayin-brush"
          },
          "lines": [
            3,
            4
          ],
          "effects": []
        },
        {
          "id": "huayin-send",
          "trigger": {
            "kind": "talk",
            "target": "huayin-nurse"
          },
          "lines": [
            5,
            6
          ],
          "effects": []
        },
        {
          "id": "huayin-reply",
          "trigger": {
            "kind": "use",
            "target": "huayin-reply"
          },
          "lines": [
            7,
            8
          ],
          "effects": [
            {
              "kind": "item",
              "id": "it-yangryu"
            },
            {
              "kind": "bond",
              "id": "chae"
            },
            {
              "kind": "story",
              "id": "e01-huayin:reply"
            }
          ]
        },
        {
          "id": "huayin-leave",
          "trigger": {
            "kind": "exit",
            "target": "huayin-road"
          },
          "lines": [
            10,
            11
          ],
          "effects": []
        }
      ],
      "optional": [
        {
          "id": "huayin-pearl",
          "trigger": {
            "kind": "inspect",
            "target": "huayin-pearl"
          },
          "lines": [
            9
          ],
          "effects": [
            {
              "kind": "pearl",
              "id": "chae"
            }
          ]
        }
      ]
    }
  ],
  "house": {
    "stages": []
  },
  "interp": {},
  "journal": {},
  "maps": [
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
        {
          "id": "bridge-fairy-green-stay",
          "x": 6,
          "y": 3,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-green"
        },
        {
          "id": "bridge-fairy-scarlet",
          "x": 4,
          "y": 0,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-scarlet"
        },
        {
          "id": "bridge-fairy-ivory",
          "x": 5,
          "y": 0,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-ivory"
        },
        {
          "id": "bridge-fairy-pink",
          "x": 6,
          "y": 0,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-pink"
        },
        {
          "id": "bridge-fairy-violet",
          "x": 7,
          "y": 0,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-violet"
        },
        {
          "id": "bridge-fairy-gold",
          "x": 5,
          "y": 1,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-gold"
        },
        {
          "id": "bridge-fairy-navy",
          "x": 6,
          "y": 1,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-navy"
        },
        {
          "id": "bridge-fairy-aqua",
          "x": 5,
          "y": 2,
          "kind": "npc",
          "solid": true,
          "label": "선녀",
          "decor": true,
          "visibleAt": [
            "c1-bridge:bridge-meet",
            "c1-bridge:bridge-flower"
          ],
          "action": null,
          "sprite": "npc-fairy-aqua"
        },
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
          "id": "exile-master-stay",
          "x": 7,
          "y": 4,
          "kind": "npc",
          "solid": true,
          "label": "육관대사",
          "decor": true,
          "visibleAt": [
            "c1-exile:exile-leave"
          ],
          "action": null,
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
          "id": "huayin-willow-stay",
          "x": 2,
          "y": 3,
          "kind": "scenery",
          "solid": true,
          "label": "누각에 닿은 버들",
          "decor": true,
          "visibleAt": [
            "e01-huayin:huayin-write",
            "e01-huayin:huayin-send",
            "e01-huayin:huayin-reply",
            "e01-huayin:huayin-leave"
          ],
          "action": null,
          "sprite": "prop-willow"
        },
        {
          "id": "huayin-nurse-stay",
          "x": 9,
          "y": 3,
          "kind": "npc",
          "solid": true,
          "label": "유모",
          "decor": true,
          "visibleAt": [
            "e01-huayin:huayin-reply"
          ],
          "action": null,
          "sprite": "npc-nurse"
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
    "yuk": {
      "name": "육관대사",
      "face": "yuk",
      "moods": [
        "stern",
        "smile"
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
    },
    "chae": {
      "name": "진채봉",
      "face": "chae",
      "moods": [
        "shy",
        "tears"
      ]
    },
    "fairy_chae": {
      "name": "연두 띠의 선녀",
      "face": "fairy_chae"
    },
    "yumo": {
      "name": "유모",
      "noFace": true
    }
  },
  "scenes": [
    {
      "id": "c1-bridge",
      "ch": "1",
      "kind": "scene",
      "title": "돌다리에서",
      "img": "sc_bridge",
      "bgm": "lotus",
      "lines": [
        "용궁 심부름에서 돌아오는 성진 앞을 팔선녀가 막았다.",
        {
          "say": "fairy_chae",
          "text": "이 다리를 지나려면 길값을 내셔야지요."
        },
        {
          "say": "seongjin",
          "text": "길값이라면 이 꽃으로 치르지요."
        },
        "복숭아꽃이 구슬로 바뀌었다. 선녀들은 한 알씩 들고 웃으며 떠났다.",
        "성진은 다리를 건너 연화봉의 선방으로 돌아갔다.",
        {
          "mark": "fiction",
          "id": "fc-opening-space",
          "title": "게임이 꾸민 부분",
          "body": "걸어 다니는 길과 방, 눌러 볼 수 있는 대상은 게임이 꾸민 연출이에요. 인물의 말도 원작의 뜻을 살려 새로 썼어요.",
          "real": "돌다리에서 선녀들을 만난 뒤 선방으로 돌아와 세상의 삶을 동경하게 되는 흐름은 원작을 따라요."
        }
      ]
    },
    {
      "id": "c1-cell",
      "ch": "1",
      "kind": "scene",
      "title": "잠들지 못하는 선방",
      "img": "sc_cell",
      "bgm": "lotus",
      "lines": [
        "창 너머 밤빛이 조용한 선방에 스며든다.",
        {
          "say": "seongjin",
          "text": "눈을 감아도 다리 위 웃음이 떠오른다.",
          "mood": "troubled"
        },
        {
          "say": "seongjin",
          "text": "깨달아도 내 이름을 누가 기억할까.",
          "mood": "troubled"
        },
        "방석과 경전은 그대로인데 성진의 마음은 다리 위에 머물러 있다."
      ]
    },
    {
      "id": "c1-wish",
      "ch": "1",
      "kind": "wish",
      "title": "성진의 소원 찾기",
      "img": "sc_cell",
      "bgm": "lotus",
      "monologue": "출장입상하여 밖에서는 장수, 안에서는 재상이 되고 싶다. 비단옷을 걸치는 부귀도 누리고 싶다.\n미색을 눈에 담고, 귀에는 풍류를 채우고, 공명을 후세에 전하고 싶다.\n물그릇과 경전, 염주만 곁에 있는 지금은 쓸쓸하다.",
      "words": [
        {
          "id": "w-chuljang",
          "text": "출장입상",
          "wish": "chuljang"
        },
        {
          "id": "w-bugwi",
          "text": "부귀",
          "wish": "bugwi"
        },
        {
          "id": "w-misaek",
          "text": "미색",
          "wish": "misaek"
        },
        {
          "id": "w-pungryu",
          "text": "풍류",
          "wish": "pungryu"
        },
        {
          "id": "w-gongmyeong",
          "text": "공명",
          "wish": "gongmyeong"
        },
        {
          "id": "w-water",
          "text": "물그릇"
        },
        {
          "id": "w-book",
          "text": "경전"
        },
        {
          "id": "w-beads",
          "text": "염주"
        }
      ],
      "answers": [
        "w-chuljang",
        "w-bugwi",
        "w-misaek",
        "w-pungryu",
        "w-gongmyeong"
      ],
      "memo": "가지고 있는 물건과 앞으로 누리고 싶은 삶을 구별해 보세요."
    },
    {
      "id": "c1-exile",
      "ch": "1",
      "kind": "scene",
      "title": "대사의 꾸짖음",
      "img": "sc_exile",
      "bgm": "lotus",
      "lines": [
        {
          "say": "yuk",
          "text": "선녀를 그리워하고 부귀를 탐하느라 수행을 잊었구나.",
          "mood": "stern"
        },
        {
          "say": "seongjin",
          "text": "마음을 거두겠습니다. 보내지 말아 주십시오.",
          "mood": "troubled"
        },
        {
          "say": "yuk",
          "text": "가고자 한 곳으로 네가 가는 것이다. 돌아올 길 또한 거기에 있다."
        }
      ]
    },
    {
      "id": "c1-rebirth",
      "ch": "1",
      "kind": "scene",
      "title": "저승을 지나",
      "img": "sc_hell",
      "bgm": "hell",
      "lines": [
        "황건역사가 성진을 저승으로 데려갔다. 팔선녀도 같은 자리에 왔다.",
        "지장보살은 수행자의 오고 감은 그가 바란 길을 따른다고 일렀다.",
        "선녀들도 인간 세상에서 살기를 청했다.",
        "성진은 바람에 실려 양 처사의 집에서 아기로 태어났다.",
        "양 처사는 하늘이 보낸 아이라 여기고 소유라 이름 붙였다."
      ]
    },
    {
      "id": "e01-huayin",
      "guide": "성진은 인간 세상의 양소유로 다시 태어났다. 자라서 글재주가 뛰어난 소유는 과거를 보러 집을 떠난다.",
      "ch": "2",
      "kind": "event",
      "title": "화음현의 버들 노래",
      "img": "sc_huayin",
      "bgm": "spring",
      "preview": "누각 앞 버들 노래에 답시가 온다. 마음을 전할 한 구절을 떠올려 보자.",
      "clues": [
        "버들 노래",
        "답시"
      ],
      "core": [
        "munjang"
      ],
      "lines": [
        {
          "mark": "fiction",
          "id": "fc-pearls",
          "title": "그림 속 구슬 흔적",
          "body": "반짝이는 곳을 누르면 숨은 구슬을 찾을 수 있어요. 그냥 지나쳐도 이야기는 이어져요.",
          "real": "정경패·난양공주의 탄생에는 명주 이야기가 전해져요. 모든 만남에 흔적을 숨기고 띠 색으로 잇는 것은 게임의 장치예요."
        },
        "과거 길에 오른 소유가 화음현의 버들 아래 멈췄다.",
        {
          "say": "yang",
          "text": "늘어진 가지가 누각까지 닿는구나."
        },
        {
          "say": "yang",
          "text": "이 버들을 시에 담아 누각으로 전하자."
        },
        "소유가 붓을 들어 버들을 읊은 양류사를 적었다.",
        "유모가 소유의 시를 누각에 전했다.",
        {
          "say": "chae",
          "text": "저 노래에는 답시로 말을 건네야겠어요.",
          "mood": "shy"
        },
        "유모가 채봉의 답시를 들고 돌아왔다.",
        "소유와 채봉은 혼약을 맺었다. 소유는 시전을 품에 넣었다.",
        "버들잎 곁에 둥근 빛이 머문다. 이 구슬 흔적은 게임 설정이다.",
        "소유는 시전을 간직하고 다시 과거 길로 향했다.",
        {
          "mark": "note",
          "title": "대표 구간 종료",
          "body": "전체 본편 완료 아님. 돌다리부터 화음현까지의 대표 구간만 진행했어요."
        }
      ],
      "gradeText": {
        "shine": "버들에 마음을 실은 시라는 찬탄이 퍼졌다.",
        "fine": "마음을 또렷이 담은 시라는 평을 들었다.",
        "near": "뜻을 전한 시였다. 여운은 조금 짧았다."
      },
      "items": [
        {
          "id": "it-yangryu",
          "name": "양류사 시전",
          "img": "item_yangryu",
          "slot": "in",
          "fills": [],
          "desc": "채봉이 답시를 써 보낸 종이. 훗날 서로를 알아보는 단서가 된다."
        }
      ],
      "meet": "chae",
      "pearl": {
        "x": 25,
        "y": 23,
        "r": 6,
        "hint": "버들잎 사이 둥근 빛",
        "trace": "fiction"
      }
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
