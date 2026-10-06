(window.GUUN = window.GUUN || {}).challenges = [
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
  },
  {
    "id": "ch-tianjin-poem",
    "scene": "e02-tianjin",
    "beat": "tianjin-write",
    "kind": "pick",
    "title": "섬월이 부를 시",
    "intro": "섬월은 쌓인 시 가운데 아직 한 편도 고르지 않았다. 어떤 시를 쓸까?",
    "options": [
      {
        "id": "boast",
        "label": "벼슬과 집안을 뽐내는 시",
        "reply": "섬월이 종이를 접어 내려놓았다. 자랑은 가락에 얹히지 않았다."
      },
      {
        "id": "heart",
        "label": "눈앞의 풍경에 마음을 담은 시",
        "reply": "섬월이 붓끝을 따라 읽다가 고개를 들었다."
      },
      {
        "id": "mock",
        "label": "다른 선비의 시를 비웃는 시",
        "reply": "선비들이 웅성거렸다. 섬월은 못 들은 척 눈을 돌렸다."
      }
    ],
    "answer": "heart",
    "note": "시의 주제를 고르는 일은 게임이 꾸민 장치예요. 섬월이 소유의 시를 골라 노래한 일은 원작에 있어요."
  },
  {
    "id": "ch-geomungo-tune",
    "scene": "e03-geomungo",
    "beat": "geomungo-play",
    "kind": "pick",
    "title": "마지막 곡조",
    "intro": "소저는 곡마다 이름과 내력을 짚는다. 마음을 전할 마지막 곡은 무엇일까?",
    "options": [
      {
        "id": "battle",
        "label": "싸움터의 기세를 담은 곡",
        "reply": "소저가 곡의 내력만 조용히 짚었다. 마음은 아직 닿지 않았다."
      },
      {
        "id": "parting",
        "label": "헤어짐을 슬퍼하는 곡",
        "reply": "소저가 고개를 끄덕였지만 발 너머는 고요했다."
      },
      {
        "id": "phoenix",
        "label": "봉황이 짝을 찾는 곡, 봉구황",
        "reply": "줄을 고르는 손끝이 조금 떨렸다."
      }
    ],
    "answer": "phoenix",
    "note": "앞서 탄 곡의 이름과 차례는 판본마다 달라요. 봉구황으로 뜻을 전한 일은 두 계열에 모두 있어요."
  },
  {
    "id": "ch-chunun-ghost",
    "scene": "e05-chunun",
    "beat": "chunun-talisman",
    "kind": "deduce",
    "title": "선녀인가, 귀신인가",
    "intro": "부적을 받기 전에 지금까지 본 것을 짚어 보자.",
    "clues": [
      "선녀와 귀신은 목소리가 같았다.",
      "둘 다 소유가 홀로 있을 때만 나타났다.",
      "누구도 얼굴을 똑바로 보이지 않았다."
    ],
    "question": "선녀와 귀신의 정체는 무엇일까?",
    "options": [
      {
        "id": "fairy",
        "label": "정말 하늘에서 내려온 선녀"
      },
      {
        "id": "ghost",
        "label": "정말 장여랑의 귀신"
      },
      {
        "id": "one",
        "label": "한 사람이 두 모습으로 꾸민 일"
      }
    ],
    "answer": "one",
    "fail": "소유는 더 깊이 홀렸다. 단서를 다시 보자.",
    "success": "정체를 알아챘다. 하지만 이야기 속 소유는 아직 모른다.",
    "note": "단서를 모아 추리하는 일은 게임이 꾸민 장치예요. 가춘운이 선녀와 귀신으로 꾸며 소유를 속인 일은 원작에 있어요."
  },
  {
    "id": "ch-gyeonghong-reply",
    "scene": "e06-gyeonghong",
    "beat": "gyeonghong-companion",
    "kind": "talk",
    "at": 0,
    "prompt": "소유는 어떻게 답할까?",
    "options": [
      {
        "id": "welcome",
        "label": "길벗이 생겨 반갑다고 한다",
        "reply": {
          "say": "gyeonghong",
          "text": "그럼 말머리를 나란히 하지요."
        }
      },
      {
        "id": "careful",
        "label": "처음 본 사이라 조심스럽다고 한다",
        "reply": {
          "say": "gyeonghong",
          "text": "눈이 밝으시군요. 그래도 길은 하나인걸요."
        }
      },
      {
        "id": "ask",
        "label": "이름과 고향부터 묻는다",
        "reply": {
          "say": "gyeonghong",
          "text": "적생이라 불러 주세요. 고향 이야기는 길에서 천천히 하지요."
        }
      }
    ]
  },
  {
    "id": "ch-gyeonghong-who",
    "scene": "e06-gyeonghong",
    "beat": "gyeonghong-discover",
    "kind": "deduce",
    "title": "밤사이 바뀐 사람",
    "intro": "아침에 보니 곁의 사람이 섬월이 아니다.",
    "clues": [
      "적생은 낙양까지 꼭 함께 가겠다고 청했다.",
      "적생은 섬월의 이름을 듣고도 놀라지 않았다.",
      "어젯밤 곁에 있던 이의 웃음소리가 적생과 닮았다."
    ],
    "question": "밤사이 섬월과 자리를 바꾼 이는 누구일까?",
    "options": [
      {
        "id": "chunun",
        "label": "별당의 가춘운"
      },
      {
        "id": "gyeonghong",
        "label": "길벗 적생"
      },
      {
        "id": "gyeongpae",
        "label": "정씨 집의 소저"
      }
    ],
    "answer": "gyeonghong",
    "fail": "그 사람은 이 길에 온 적이 없다. 단서를 다시 보자.",
    "success": "길벗의 웃음이 떠올랐다.",
    "note": "단서를 모아 추리하는 일은 게임이 꾸민 장치예요. 적경홍이 남장을 하고 동행하다가 섬월과 자리를 바꾼 일은 원작에 있어요."
  },
  {
    "id": "ch-tungso-melody",
    "scene": "e07-tungso",
    "beat": "tungso-play",
    "kind": "sequence",
    "title": "학을 부르는 가락",
    "intro": "도인에게 배운 가락을 들은 그대로 불어 보자.",
    "instrument": "flute",
    "notes": [
      {
        "label": "궁",
        "midi": 72
      },
      {
        "label": "상",
        "midi": 74
      },
      {
        "label": "각",
        "midi": 76
      },
      {
        "label": "치",
        "midi": 79
      },
      {
        "label": "우",
        "midi": 81
      }
    ],
    "rounds": [
      [
        0,
        2,
        1,
        3
      ],
      [
        0,
        2,
        4,
        3,
        1
      ]
    ],
    "fail": "가락이 엇나가자 밤바람만 불었다. 다시 들어 보자.",
    "success": "가락 끝에 날갯짓 소리가 들렸다.",
    "note": "가락을 따라 부는 일은 게임이 꾸민 장치예요. 소유의 퉁소 소리에 학이 날아든 일은 원작에 있어요."
  },
  {
    "id": "ch-yoyeon-night",
    "scene": "e09-yoyeon",
    "beat": "yoyeon-arrive",
    "kind": "search",
    "title": "꺼져 가는 촛불",
    "intro": "촛불이 하나씩 꺼진다. 다 꺼지기 전에 기척이 나는 곳을 찾아라.",
    "tries": 3,
    "spots": [
      {
        "id": "curtain",
        "label": "흔들리는 장막",
        "clue": "장막이 흔들린다. 바람은 위에서 불었다."
      },
      {
        "id": "screen",
        "label": "병풍 뒤",
        "clue": "접힌 지도뿐, 발자국도 없다."
      },
      {
        "id": "rack",
        "label": "칼 걸이",
        "clue": "칼은 제자리다. 칼집 위로 먼지가 떨어진다."
      },
      {
        "id": "beam",
        "label": "장막 위 들보"
      },
      {
        "id": "door",
        "label": "장막 입구",
        "clue": "파수꾼은 깨어 있었다. 문으로 온 이는 없다."
      }
    ],
    "answer": "beam",
    "fail": "마지막 촛불이 꺼지자 칼바람이 스쳤다. 소유는 겨우 몸을 피했다. 다시 불을 밝히자.",
    "success": "소유가 들보를 올려다보았다.",
    "note": "숨은 곳을 찾는 일은 게임이 꾸민 장치예요. 밤 진영에 비수를 든 요연이 찾아온 일은 원작에 있어요."
  },
  {
    "id": "ch-yoyeon-reply",
    "scene": "e09-yoyeon",
    "beat": "yoyeon-arrive",
    "kind": "talk",
    "at": 0,
    "prompt": "비수를 든 자객 앞에서 소유는?",
    "options": [
      {
        "id": "sword",
        "label": "칼을 뽑아 맞선다",
        "reply": {
          "say": "yoyeon",
          "text": "칼을 뽑으셔도 제 비수가 더 빠릅니다."
        }
      },
      {
        "id": "call",
        "label": "군사를 부른다",
        "reply": {
          "say": "yoyeon",
          "text": "부르셔도 늦어요. 이 장막에 닿는 발소리는 없을 거예요."
        }
      },
      {
        "id": "calm",
        "label": "자리에 앉은 채 숨을 고른다",
        "reply": {
          "say": "yoyeon",
          "text": "두려워하지 않으시는군요. 처음 보는 분이에요."
        }
      }
    ]
  },
  {
    "id": "ch-bansagok-water",
    "scene": "e10-neungpa",
    "beat": "neungpa-share",
    "kind": "search",
    "title": "마실 수 있는 물",
    "intro": "목마른 군사들이 기다린다. 요연의 경고를 떠올려 마실 물을 골라라.",
    "tries": 2,
    "spots": [
      {
        "id": "stream",
        "label": "반사곡 골짜기의 물",
        "clue": "물빛이 검푸르다. 요연이 경계하라던 바로 그 물이다."
      },
      {
        "id": "pool",
        "label": "바위 아래 고인 물",
        "clue": "물가에 풀 한 포기 자라지 않았다."
      },
      {
        "id": "dragon",
        "label": "백룡담에서 흘러온 물"
      },
      {
        "id": "spring",
        "label": "진영 옆 마른 샘",
        "clue": "바닥이 갈라져 한 바가지도 뜰 수 없다."
      }
    ],
    "answer": "dragon",
    "fail": "물을 마신 군사 몇이 배를 움켜쥐고 쓰러졌다. 다시 살펴보자.",
    "success": "맑은 물이 군사들의 목을 적셨다.",
    "note": "마실 물을 고르는 일은 게임이 꾸민 장치예요. 반사곡의 물을 조심하라는 경고와 백룡담에 다녀온 뒤 군사들에게 물을 내준 흐름은 원작을 따라요."
  }
];
