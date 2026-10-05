'use strict';
window.GUUN = {
  "people": {
    "seongjin": {
      "name": "성진",
      "face": "seongjin"
    },
    "yang": {
      "name": "양소유",
      "face": "yang"
    }
  },
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
    }
  },
  "scenes": [
    {
      "id": "e04-exam",
      "ch": "2",
      "kind": "event",
      "title": "시험장과 한림원 · 연결 시험",
      "lines": [
        {
          "text": "현재 장소를 살펴보고 말을 듣는다.",
          "say": "yang"
        },
        {
          "text": "원작의 일을 따라 다음 장소로 향한다.",
          "say": "yang"
        },
        "탁자를 살펴본다."
      ],
      "items": [
        {
          "id": "it-test-paper",
          "name": "시험용 시권",
          "img": "item_yangryu"
        }
      ]
    },
    {
      "id": "e08-wonsu",
      "ch": "2",
      "kind": "event",
      "title": "옥과 위교 · 연결 시험",
      "lines": [
        "현재 장소를 살펴보고 말을 듣는다.",
        "원작의 일을 따라 다음 장소로 향한다."
      ]
    }
  ],
  "maps": [
    {
      "id": "map-exam",
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
          0,
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
          0,
          1,
          0,
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
          0,
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
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      "art": "map-huayin",
      "objects": [
        {
          "id": "paper",
          "x": 4,
          "y": 5,
          "label": "시권",
          "action": "exam-write",
          "visibleAt": [
            "e04-exam:exam-write"
          ],
          "kind": "item",
          "sprite": "prop-chest",
          "solid": true
        },
        {
          "id": "table",
          "x": 8,
          "y": 6,
          "label": "탁자",
          "action": "exam-optional",
          "visibleAt": [
            "e04-exam:exam-write"
          ],
          "kind": "scenery",
          "sprite": "prop-table",
          "solid": true
        }
      ]
    },
    {
      "id": "map-hallim",
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
          0,
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
          0,
          1,
          0,
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
          0,
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
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      "art": "map-chwimi",
      "objects": [
        {
          "id": "official",
          "x": 4,
          "y": 5,
          "label": "임명 안내",
          "action": "exam-appoint",
          "visibleAt": [
            "e04-exam:exam-appoint"
          ],
          "kind": "npc",
          "sprite": "walk-yang-scholar",
          "solid": true,
          "person": "yang"
        },
        {
          "id": "table",
          "x": 8,
          "y": 6,
          "label": "탁자",
          "action": "exam-optional",
          "visibleAt": [
            "e04-exam:exam-appoint"
          ],
          "kind": "scenery",
          "sprite": "prop-table",
          "solid": true
        }
      ]
    },
    {
      "id": "map-prison",
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
          0,
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
          0,
          1,
          0,
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
          0,
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
          0,
          0,
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
          "id": "prison-door",
          "x": 4,
          "y": 5,
          "label": "위교로",
          "action": "wonsu-exit",
          "visibleAt": [
            "e08-wonsu:wonsu-exit"
          ],
          "kind": "exit",
          "sprite": "prop-stool",
          "solid": true
        }
      ]
    },
    {
      "id": "map-camp",
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
          0,
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
          0,
          1,
          0,
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
          0,
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
          0,
          0,
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
          "id": "camp-order",
          "x": 4,
          "y": 5,
          "label": "원작 행동 시작",
          "action": "wonsu-order",
          "visibleAt": [
            "e08-wonsu:wonsu-order"
          ],
          "kind": "item",
          "sprite": "prop-chest",
          "solid": true
        }
      ]
    }
  ],
  "experiences": [
    {
      "scene": "e04-exam",
      "map": "map-exam",
      "actor": "yang",
      "spawn": {
        "x": 2,
        "y": 5,
        "facing": "down"
      },
      "beats": [
        {
          "id": "exam-write",
          "trigger": {
            "kind": "use",
            "target": "paper"
          },
          "lines": [
            0
          ],
          "effects": [
            {
              "kind": "item",
              "id": "it-test-paper"
            }
          ]
        },
        {
          "id": "exam-appoint",
          "trigger": {
            "kind": "talk",
            "target": "official"
          },
          "lines": [
            1
          ],
          "effects": [
            {
              "kind": "none",
              "id": null
            }
          ],
          "map": "map-hallim",
          "spawn": {
            "x": 2,
            "y": 5,
            "facing": "right"
          },
          "appearance": "walk-yang-chancellor"
        }
      ],
      "optional": [
        {
          "id": "exam-optional",
          "trigger": {
            "kind": "inspect",
            "target": "table"
          },
          "lines": [
            2
          ],
          "effects": [
            {
              "kind": "none",
              "id": null
            }
          ]
        }
      ]
    },
    {
      "scene": "e08-wonsu",
      "map": "map-prison",
      "actor": "yang",
      "spawn": {
        "x": 2,
        "y": 5,
        "facing": "down"
      },
      "beats": [
        {
          "id": "wonsu-exit",
          "trigger": {
            "kind": "exit",
            "target": "prison-door"
          },
          "lines": [
            0
          ],
          "effects": [
            {
              "kind": "none",
              "id": null
            }
          ]
        },
        {
          "id": "wonsu-order",
          "trigger": {
            "kind": "use",
            "target": "camp-order"
          },
          "lines": [
            1
          ],
          "effects": [
            {
              "kind": "none",
              "id": null
            }
          ],
          "map": "map-camp",
          "spawn": {
            "x": 2,
            "y": 5,
            "facing": "right"
          }
        }
      ],
      "optional": []
    }
  ]
};
