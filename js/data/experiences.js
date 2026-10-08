(window.GUUN = window.GUUN || {}).experiences = [
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
          10
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
  },
  {
    "scene": "l-namjeon",
    "map": "map-namjeon",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "namjeon-climb", "trigger": { "kind": "inspect", "target": "namjeon-ridge" }, "lines": [0], "effects": [], "appearance": "walk-yang-scholar" },
      { "id": "namjeon-learn", "trigger": { "kind": "talk", "target": "namjeon-dosa" }, "lines": [1], "effects": [], "appearance": "walk-yang-scholar" },
      { "id": "namjeon-receive", "trigger": { "kind": "use", "target": "namjeon-instruments" }, "lines": [2], "effects": [
        { "kind": "item", "id": "it-geomungo" },
        { "kind": "item", "id": "it-tungso" },
        { "kind": "story", "id": "l-namjeon:instruments" }
      ], "appearance": "walk-yang-scholar" }
    ],
    "optional": []
  },
  {
    "scene": "e02-tianjin",
    "map": "map-tianjin",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "tianjin-enter", "trigger": { "kind": "inspect", "target": "tianjin-guests" }, "lines": [0], "effects": [], "appearance": "walk-yang-scholar" },
      { "id": "tianjin-write", "trigger": { "kind": "use", "target": "tianjin-brush" }, "lines": [1,2], "effects": [
        { "kind": "item", "id": "it-sijeon" },
        { "kind": "story", "id": "e02-tianjin:poem" }
      ], "appearance": "walk-yang-scholar" },
      { "id": "tianjin-listen", "trigger": { "kind": "talk", "target": "tianjin-seomwol" }, "lines": [3,4,5], "effects": [
        { "kind": "bond", "id": "seomwol" },
        { "kind": "story", "id": "e02-tianjin:song" }
      ], "appearance": "walk-yang-scholar" }
    ],
    "optional": [
      { "id": "tianjin-pearl", "trigger": { "kind": "inspect", "target": "tianjin-pearl" }, "lines": [6], "effects": [{ "kind": "pearl", "id": "seomwol" }], "appearance": "walk-yang-scholar" }
    ]
  },
  {
    "scene": "e03-geomungo",
    "map": "map-jeong-house",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "geomungo-dress", "trigger": { "kind": "use", "target": "geomungo-clothes" }, "lines": [0,1], "effects": [{ "kind": "item", "id": "it-yeogwan" }], "appearance": "walk-yang-disguise" },
      { "id": "geomungo-play", "trigger": { "kind": "use", "target": "geomungo-instrument" }, "lines": [2,3,4], "effects": [{ "kind": "story", "id": "e03-geomungo:performance" }], "appearance": "walk-yang-disguise" },
      { "id": "geomungo-response", "trigger": { "kind": "talk", "target": "geomungo-listener" }, "lines": [5,6], "effects": [
        { "kind": "bond", "id": "gyeongpae" },
        { "kind": "story", "id": "e03-geomungo:response" }
      ], "appearance": "walk-yang-disguise" }
    ],
    "optional": [
      { "id": "geomungo-pearl", "trigger": { "kind": "inspect", "target": "geomungo-pearl" }, "lines": [7], "effects": [{ "kind": "pearl", "id": "gyeongpae" }], "appearance": "walk-yang-disguise" }
    ]
  },
  {
    "scene": "e04-exam",
    "map": "map-exam",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "exam-write", "trigger": { "kind": "use", "target": "exam-seat" }, "lines": [0,1,2], "effects": [{ "kind": "story", "id": "e04-exam:essay" }], "appearance": "walk-yang-scholar" },
      { "id": "exam-result", "trigger": { "kind": "inspect", "target": "exam-list" }, "lines": [3,4], "effects": [{ "kind": "story", "id": "e04-exam:pass" }], "appearance": "walk-yang-scholar" },
      { "id": "exam-hallim", "trigger": { "kind": "continue", "target": null }, "lines": [5], "effects": [{ "kind": "story", "id": "e04-exam:hallim" }], "map": "map-hallim", "spawn": { "x": 5, "y": 8, "facing": "up" }, "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
  {
    "scene": "e05-chunun",
    "map": "map-chunun-garden",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "chunun-fairy", "trigger": { "kind": "talk", "target": "chunun-fairy" }, "lines": [0,1], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "chunun-ghost", "trigger": { "kind": "talk", "target": "chunun-ghost" }, "lines": [2,3], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "chunun-talisman", "trigger": { "kind": "use", "target": "chunun-talisman" }, "lines": [4,5], "effects": [{ "kind": "item", "id": "it-bujeok" }], "appearance": "walk-yang-chancellor" },
      { "id": "chunun-reveal", "trigger": { "kind": "talk", "target": "chunun-revealed" }, "lines": [6,7], "effects": [
        { "kind": "bond", "id": "chunun" },
        { "kind": "story", "id": "e05-chunun:reveal" }
      ], "map": "map-chunun-room", "spawn": { "x": 5, "y": 8, "facing": "up" }, "appearance": "walk-yang-chancellor" }
    ],
    "optional": [
      { "id": "chunun-pearl", "trigger": { "kind": "inspect", "target": "chunun-pearl" }, "lines": [8], "effects": [{ "kind": "pearl", "id": "chunun" }], "appearance": "walk-yang-chancellor" }
    ]
  },
  {
    "scene": "l-hebei",
    "map": "map-hebei",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "hebei-edict", "trigger": { "kind": "inspect", "target": "hebei-edict" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "hebei-token", "trigger": { "kind": "use", "target": "hebei-token" }, "lines": [1], "effects": [{ "kind": "item", "id": "it-bujeol" }], "appearance": "walk-yang-chancellor" },
      { "id": "hebei-persuade", "trigger": { "kind": "talk", "target": "hebei-king" }, "lines": [2], "effects": [{ "kind": "story", "id": "l-hebei:persuasion" }], "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
  {
    "scene": "e06-gyeonghong",
    "map": "map-gyeonghong-road",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "gyeonghong-road", "trigger": { "kind": "inspect", "target": "gyeonghong-horse" }, "lines": [0], "effects": [{ "kind": "item", "id": "it-cheonrima" }], "appearance": "walk-yang-chancellor" },
      { "id": "gyeonghong-companion", "trigger": { "kind": "talk", "target": "gyeonghong-boy" }, "lines": [1,2], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "gyeonghong-discover", "trigger": { "kind": "inspect", "target": "gyeonghong-seat" }, "lines": [3,4], "effects": [], "map": "map-gyeonghong-room", "spawn": { "x": 5, "y": 8, "facing": "up" }, "appearance": "walk-yang-chancellor" },
      { "id": "gyeonghong-reveal", "trigger": { "kind": "talk", "target": "gyeonghong-revealed" }, "lines": [5,6], "effects": [
        { "kind": "bond", "id": "gyeonghong" },
        { "kind": "story", "id": "e06-gyeonghong:reveal" }
      ], "appearance": "walk-yang-chancellor" }
    ],
    "optional": [
      { "id": "gyeonghong-pearl", "trigger": { "kind": "inspect", "target": "gyeonghong-pearl" }, "lines": [7], "effects": [{ "kind": "pearl", "id": "gyeonghong" }], "appearance": "walk-yang-chancellor" }
    ]
  },
  // privateart-pending: e06의 적생 남장 걷기 후보도 승인 전이다. 현재 승인 몸체를 유지하고 공개 label과 person만 분리한다.
  {
    "scene": "e07-tungso",
    "map": "map-tungso",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "tungso-night", "trigger": { "kind": "inspect", "target": "tungso-night" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "tungso-play", "trigger": { "kind": "use", "target": "tungso-instrument" }, "lines": [1,2,3], "effects": [{ "kind": "story", "id": "e07-tungso:performance" }], "appearance": "walk-yang-chancellor" },
      { "id": "tungso-crane", "trigger": { "kind": "inspect", "target": "tungso-crane" }, "lines": [4], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "tungso-message", "trigger": { "kind": "inspect", "target": "tungso-message" }, "lines": [5], "effects": [
        { "kind": "bond", "id": "nanyang" },
        { "kind": "story", "id": "e07-tungso:hearsay" }
      ], "appearance": "walk-yang-chancellor" }
    ],
    "optional": [
      { "id": "tungso-pearl", "trigger": { "kind": "inspect", "target": "tungso-pearl" }, "lines": [6], "effects": [{ "kind": "pearl", "id": "nanyang" }], "appearance": "walk-yang-chancellor" }
    ]
  },
  {
    "scene": "l-bongnae",
    "map": "map-bongnae",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "bongnae-fan", "trigger": { "kind": "inspect", "target": "bongnae-fan" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "bongnae-write", "trigger": { "kind": "use", "target": "bongnae-brush" }, "lines": [1], "effects": [{ "kind": "story", "id": "l-bongnae:poem" }], "appearance": "walk-yang-chancellor" },
      { "id": "bongnae-reply", "trigger": { "kind": "use", "target": "bongnae-reply" }, "lines": [2,3], "effects": [
        { "kind": "item", "id": "it-mungbang" },
        { "kind": "story", "id": "l-bongnae:reply" }
      ], "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
  {
    "scene": "e08-wonsu",
    "map": "map-wonsu",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "wonsu-prison", "trigger": { "kind": "inspect", "target": "wonsu-prison" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "wonsu-summons", "trigger": { "kind": "inspect", "target": "wonsu-summons" }, "lines": [1], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "wonsu-command", "trigger": { "kind": "talk", "target": "wonsu-command" }, "lines": [2], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "wonsu-victory", "trigger": { "kind": "inspect", "target": "wonsu-victory" }, "lines": [3], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "wonsu-appointment", "trigger": { "kind": "use", "target": "wonsu-appointment" }, "lines": [4,5], "effects": [
        { "kind": "story", "id": "e08-wonsu:appointment" },
        { "kind": "item", "id": "it-chammageom" }
      ], "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
  {
    "scene": "e09-yoyeon",
    "map": "map-yoyeon",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "yoyeon-night", "trigger": { "kind": "inspect", "target": "yoyeon-night" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "yoyeon-arrive", "trigger": { "kind": "talk", "target": "yoyeon-arrive" }, "lines": [1,2], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "yoyeon-choice", "trigger": { "kind": "talk", "target": "yoyeon-choice" }, "lines": [3], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "yoyeon-speak", "trigger": { "kind": "talk", "target": "yoyeon-speak" }, "lines": [4], "effects": [
        { "kind": "bond", "id": "yoyeon" },
        { "kind": "item", "id": "it-bisu" }
      ], "appearance": "walk-yang-chancellor" },
      { "id": "yoyeon-warning", "trigger": { "kind": "talk", "target": "yoyeon-warning" }, "lines": [5], "effects": [{ "kind": "story", "id": "e09-yoyeon:warning" }], "appearance": "walk-yang-chancellor" }
    ],
    "optional": [
      { "id": "yoyeon-pearl", "trigger": { "kind": "inspect", "target": "yoyeon-pearl" }, "lines": [6], "effects": [{ "kind": "pearl", "id": "yoyeon" }], "appearance": "walk-yang-chancellor" }
    ]
  },
  {
    "scene": "e10-neungpa",
    "map": "map-bansagok",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "neungpa-water", "trigger": { "kind": "inspect", "target": "neungpa-water" }, "lines": [0], "effects": [{ "kind": "story", "id": "e10-neungpa:warning-heeded" }], "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-enter", "trigger": { "kind": "exit", "target": "neungpa-enter" }, "lines": [1], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-meet", "trigger": { "kind": "talk", "target": "neungpa-meet" }, "lines": [2], "effects": [{ "kind": "bond", "id": "neungpa" }], "map": "map-baekryong", "spawn": { "x": 5, "y": 8, "facing": "up" }, "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-defeat", "trigger": { "kind": "inspect", "target": "neungpa-defeat" }, "lines": [3], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-monk", "trigger": { "kind": "talk", "target": "neungpa-monk" }, "lines": [4,5], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-return", "trigger": { "kind": "continue", "target": null }, "lines": [6], "effects": [{ "kind": "story", "id": "e10-neungpa:return" }], "map": "map-yoyeon", "spawn": { "x": 5, "y": 8, "facing": "up" }, "appearance": "walk-yang-chancellor" },
      { "id": "neungpa-share", "trigger": { "kind": "use", "target": "neungpa-share" }, "lines": [7], "effects": [{ "kind": "item", "id": "it-mulbyeong" }], "appearance": "walk-yang-chancellor" }
    ],
    "optional": [
      { "id": "neungpa-pearl", "trigger": { "kind": "inspect", "target": "neungpa-pearl" }, "lines": [8], "effects": [{ "kind": "pearl", "id": "neungpa" }], "appearance": "walk-yang-chancellor" }
    ]
  },
  {
    "scene": "e11-seungsang",
    "map": "map-seungsang",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "seungsang-return", "trigger": { "kind": "inspect", "target": "seungsang-return" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "seungsang-edict", "trigger": { "kind": "use", "target": "seungsang-edict" }, "lines": [1,2,3], "effects": [
        { "kind": "story", "id": "e11-seungsang:appointment" },
        { "kind": "item", "id": "it-hasa" }
      ], "appearance": "walk-yang-chancellor" },
      { "id": "seungsang-portrait", "trigger": { "kind": "inspect", "target": "seungsang-portrait" }, "lines": [4], "effects": [{ "kind": "story", "id": "e11-seungsang:portrait" }], "appearance": "walk-yang-chancellor" },
      { "id": "seungsang-news", "trigger": { "kind": "talk", "target": "seungsang-news" }, "lines": [5,6], "effects": [], "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
  {
    "scene": "e12-honrye",
    "map": "map-honrye",
    "actor": "yang",
    "spawn": { "x": 5, "y": 8, "facing": "up" },
    "beats": [
      { "id": "honrye-ceremony", "trigger": { "kind": "inspect", "target": "honrye-ceremony" }, "lines": [0], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "honrye-robes", "trigger": { "kind": "use", "target": "honrye-robes" }, "lines": [1], "effects": [{ "kind": "item", "id": "it-girinpo" }], "appearance": "walk-yang-chancellor" },
      { "id": "honrye-poems", "trigger": { "kind": "talk", "target": "honrye-poems" }, "lines": [2,3,4,5], "effects": [{ "kind": "story", "id": "e12-honrye:reunion" }], "appearance": "walk-yang-chancellor" },
      { "id": "honrye-reveal", "trigger": { "kind": "inspect", "target": "honrye-reveal" }, "lines": [6], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "honrye-gyeongpae", "trigger": { "kind": "talk", "target": "honrye-gyeongpae" }, "lines": [7], "effects": [], "appearance": "walk-yang-chancellor" },
      { "id": "honrye-joke", "trigger": { "kind": "talk", "target": "honrye-joke" }, "lines": [8], "effects": [], "appearance": "walk-yang-chancellor" }
    ],
    "optional": []
  },
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
        "lines": [0],
        "effects": [],
        "appearance": "walk-yang-chancellor"
      },
      {
        "id": "feast-overlook",
        "trigger": {
          "kind": "inspect",
          "target": "feast-overlook"
        },
        "lines": [1, 2],
        "effects": [],
        "appearance": "walk-yang-chancellor"
      },
      {
        "id": "feast-vow",
        "trigger": {
          "kind": "inspect",
          "target": "feast-vow"
        },
        "lines": [3, 4],
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
        "lines": [0],
        "effects": [],
        "appearance": "walk-yang-chancellor"
      },
      {
        "id": "monk-greeting",
        "trigger": {
          "kind": "talk",
          "target": "feast-visitor"
        },
        "lines": [1, 2],
        "effects": [],
        "appearance": "walk-yang-chancellor"
      },
      {
        "id": "monk-question",
        "trigger": {
          "kind": "talk",
          "target": "feast-question"
        },
        "lines": [3, 4],
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
        "lines": [0],
        "effects": []
      },
      {
        "id": "awake-window",
        "trigger": {
          "kind": "inspect",
          "target": "awake-window"
        },
        "lines": [1],
        "effects": []
      },
      {
        "id": "awake-door",
        "trigger": {
          "kind": "inspect",
          "target": "awake-door"
        },
        "lines": [2],
        "effects": []
      }
    ],
    "optional": []
  }
];
