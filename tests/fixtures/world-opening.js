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
      "id": "c1-bridge",
      "ch": "1",
      "kind": "scene",
      "title": "돌다리 · 조작 시험",
      "lines": [
        {
          "text": "현재 장소를 살펴보고 말을 듣는다.",
          "say": "seongjin"
        },
        "원작의 일을 따라 다음 장소로 향한다."
      ]
    },
    {
      "id": "c1-cell",
      "ch": "1",
      "kind": "scene",
      "title": "선방 · 배치 시험",
      "lines": [
        "현재 장소를 살펴보고 말을 듣는다."
      ]
    },
    {
      "id": "c3-awake",
      "ch": "3",
      "kind": "scene",
      "title": "돌아온 선방 · 배치 시험",
      "lines": [
        "현재 장소를 살펴보고 말을 듣는다."
      ],
      "awakened": true
    }
  ],
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
          "id": "bridge-voice",
          "x": 4,
          "y": 5,
          "label": "성진",
          "action": "bridge-talk",
          "visibleAt": [
            "c1-bridge:bridge-talk"
          ],
          "kind": "npc",
          "sprite": "walk-seongjin",
          "solid": true,
          "person": "seongjin"
        },
        {
          "id": "bridge-exit",
          "x": 10,
          "y": 5,
          "label": "선방으로",
          "action": "bridge-leave",
          "visibleAt": [
            "c1-bridge:bridge-leave"
          ],
          "kind": "exit",
          "sprite": "prop-stool",
          "solid": true
        },
        {
          "id": "unreachable",
          "x": 3,
          "y": 3,
          "label": "물 건너 바위",
          "action": null,
          "visibleAt": [],
          "kind": "scenery",
          "sprite": "prop-wall-grey",
          "solid": true
        },
        {
          "id": "front-table",
          "x": 5,
          "y": 6,
          "label": "탁자",
          "action": null,
          "visibleAt": [],
          "kind": "scenery",
          "sprite": "prop-table",
          "solid": true
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
          "id": "cushion",
          "x": 4,
          "y": 5,
          "label": "방석",
          "action": "cell-look",
          "visibleAt": [
            "c1-cell:cell-look"
          ],
          "kind": "scenery",
          "sprite": "prop-cushion",
          "solid": true
        },
        {
          "id": "awake-cushion",
          "x": 4,
          "y": 5,
          "label": "방석",
          "action": "awake-look",
          "visibleAt": [
            "c3-awake:awake-look"
          ],
          "kind": "scenery",
          "sprite": "prop-cushion",
          "solid": true
        },
        {
          "id": "door",
          "x": 10,
          "y": 5,
          "label": "출입구",
          "action": null,
          "visibleAt": [],
          "kind": "scenery",
          "sprite": "prop-wall-red",
          "solid": true
        }
      ]
    }
  ],
  "experiences": [
    {
      "scene": "c1-bridge",
      "map": "map-bridge",
      "actor": "seongjin",
      "spawn": {
        "x": 2,
        "y": 5,
        "facing": "down"
      },
      "beats": [
        {
          "id": "bridge-talk",
          "trigger": {
            "kind": "talk",
            "target": "bridge-voice"
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
          "id": "bridge-leave",
          "trigger": {
            "kind": "exit",
            "target": "bridge-exit"
          },
          "lines": [
            1
          ],
          "effects": [
            {
              "kind": "none",
              "id": null
            }
          ]
        }
      ],
      "optional": []
    },
    {
      "scene": "c1-cell",
      "map": "map-cell",
      "actor": "seongjin",
      "spawn": {
        "x": 2,
        "y": 5,
        "facing": "down"
      },
      "beats": [
        {
          "id": "cell-look",
          "trigger": {
            "kind": "inspect",
            "target": "cushion"
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
        }
      ],
      "optional": []
    },
    {
      "scene": "c3-awake",
      "map": "map-cell",
      "actor": "seongjin",
      "spawn": {
        "x": 2,
        "y": 5,
        "facing": "down"
      },
      "beats": [
        {
          "id": "awake-look",
          "trigger": {
            "kind": "inspect",
            "target": "awake-cushion"
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
        }
      ],
      "optional": []
    }
  ]
};
