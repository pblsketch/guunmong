# -*- coding: utf-8 -*-
"""기존 141장과 승인된 탑다운 그림의 경로·크기·32색·무손실·해시를 점검한다.

    python tools/check_assets.py        # 문제가 있으면 종료 코드 1
    python tools/check_assets.py --sim-candidates --sim-manifest manifest96.json
"""
import os
import sys
import json
import hashlib

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as px  # noqa: E402

ROOT = px.ROOT
SC = ["sc_josin_dream", "sc_josin_wake", "sc_bridge", "sc_cell", "sc_exile", "sc_hell", "sc_rebirth", "sc_huayin",
      "sc_namjeon", "sc_tianjin", "sc_geomungo", "sc_chunun", "sc_hebei", "sc_handan", "sc_tungso", "sc_bongnae",
      "sc_wonsu", "sc_yoyeon", "sc_neungpa", "sc_seungsang", "sc_honrye", "sc_c3_feast", "sc_c3_monk", "sc_c3_awake",
      "sc_c4_journal", "sc_c5_dialogue", "sc_c5_ordination"]
PT = {"seongjin": ["troubled", "awake"], "yuk": ["stern", "smile"], "yang": ["smile", "shock", "disguise"],
      "hoseung": ["laugh"], "josin": ["aged"], "dosa": ["smile"], "yeomra": ["stern"], "jeong13": ["laugh"],
      "chae": ["shy", "tears"], "seomwol": ["smile", "sly"], "gyeongpae": ["blush", "sly"], "chunun": ["ghost", "giggle"],
      "gyeonghong": ["disguise", "smile"], "nanyang": ["smile"], "yoyeon": ["blade", "smile"], "neungpa": ["sad", "smile"]}
FAIRIES = ["chae", "seomwol", "gyeongpae", "chunun", "gyeonghong", "nanyang", "yoyeon", "neungpa"]
ITEMS = ["yangryu", "geomungo", "sijeon", "yeogwan", "bujeok", "bujeol", "cheonrima", "tungso", "mungbang",
         "chammageom", "bisu", "mulbyeong", "hasa", "girinpo"]

# (경로, (w, h), 투명 배경 필요?)
EXPECT = [(f"sc/{n}.webp", (480, 270), False) for n in SC]
for face, moods in PT.items():
    EXPECT += [(f"pt/{face}.webp", (96, 96), True)] + [(f"pt/{face}_{m}.webp", (96, 96), True) for m in moods]
EXPECT += [(f"pt/fairy_{f}.webp", (96, 96), True) for f in FAIRIES]
EXPECT += [(f"board/{n}.webp", (192, 128), True) for n in ("horse_walk", "horse_walk_gwan", "horse_walk_jang", "horse_walk_sang")]
EXPECT += [("board/board.webp", (320, 480), False)] + [(f"board/{n}.webp", (48, 48), n in ("tile_done",))
                                                        for n in ("tile_place", "tile_office", "tile_start", "tile_end", "tile_done")]
EXPECT += [("board/tile_now.webp", (52, 52), True), ("board/board_cloud.webp", (64, 32), True)]
EXPECT += [(f"house/{n}.webp", s, False) for n, s in (("house_inn", (320, 200)), ("house_byeoldang", (480, 200)),
                                                      ("house_seungsang", (640, 200)), ("house_chwimi", (800, 200)))]
EXPECT += [(f"items/item_{n}.webp", (32, 32), True) for n in ITEMS]
EXPECT += [("ui/pearl.webp", (16, 16), True), ("ui/pearl_trace.webp", (12, 12), True), ("ui/pearl_empty.webp", (16, 16), True)]
EXPECT += [("ui/title.webp", (320, 480), False), ("ui/icon-192.png", (192, 192), False), ("ui/icon-512.png", (512, 512), False),
           ("ui/frame_gloss.webp", (48, 48), False), ("ui/frame_dream.webp", (48, 48), False), ("ui/frame_real.webp", (48, 48), False),
           ("ui/seal_blank.webp", (24, 24), False), ("ui/wish_board.webp", (160, 64), False), ("ui/wish_fill.webp", (16, 8), False),
           ("ui/wish_mist.webp", (32, 16), False), ("ui/gyoji.webp", (160, 96), False), ("ui/card_frame.webp", (96, 128), False),
           ("ui/card_back.webp", (96, 128), False), ("ui/journal_page.webp", (64, 64), False), ("ui/cloud_wipe.webp", (480, 270), True),
           ("ui/divider_knot.webp", (16, 48), True), ("ui/corner_cloud.webp", (24, 24), True), ("ui/btn_frame.webp", (24, 24), False)]


APPROVED = json.loads(open(os.path.join(ROOT, "tools", "manifest_sim96.json"), encoding="utf-8").read())["entries"]
EXPECT += [(e["product"].removeprefix("assets/"), (e["cell"][0] * e["frames"], e["cell"][1] * e["rows"]), True) for e in APPROVED]
import topdown_approved as topdown
import rpg_npc_approved as npcs
import rpg_disguise_approved as disguise
import rpg_v4_approved as v4
TOPDOWN = topdown.load()
for entry in TOPDOWN["entries"] + TOPDOWN["derived"]:
    s = entry["sprite"]
    opaque = entry.get("kind") == "map" or entry["key"] in ("prop-floor-grey", "prop-floor-wood")
    EXPECT.append((s["src"].removeprefix("assets/"), (s["width"]*s["frames"], s["height"]*s["rows"]), not opaque))
NPCS = npcs.load()
EXPECT.append(('world/walk-yang-disguise.webp', (160,128), True))
for entry in NPCS['entries']:
    EXPECT.append((entry['sprite']['src'].removeprefix('assets/'), (32, 32), True))
V4 = v4.load()
for entry in V4['entries']:
    s = entry['sprite']
    EXPECT.append((s['src'].removeprefix('assets/'), (s['width'], s['height']), entry['kind'] != 'map'))


def main():
    bad, counts = [], {}
    for rel, size, alpha in EXPECT:
        p = os.path.join(ROOT, "assets", rel)
        if not os.path.exists(p):
            bad.append(f"missing {rel}")
            continue
        im = Image.open(p)
        n = px.count_colors(p)
        counts[rel] = n
        if im.size != size:
            bad.append(f"{rel}: size {im.size} != {size}")
        if n > px.MAX_COLORS:
            bad.append(f"{rel}: {n} colors")
        if rel.endswith(".webp"):
            with open(p, "rb") as f:
                if f.read(16)[12:16] != b"VP8L":
                    bad.append(f"{rel}: not lossless")
        if alpha and "A" not in im.getbands():
            bad.append(f"{rel}: no alpha")
    print(f"{len(EXPECT)} expected, {len(counts)} present, max colors {max(counts.values()) if counts else '-'}")
    for rel in sorted(counts):
        print(f"  {counts[rel]:2d}  {rel}")
    for b in bad:
        print("  !", b)
    for entry in APPROVED:
        product = os.path.join(ROOT, entry["product"])
        if os.path.exists(product) and hashlib.sha256(open(product, "rb").read()).hexdigest() != entry["approved_sha256"]:
            bad.append("approved hash mismatch " + entry["name"])
            print("  !", bad[-1])
    try:
        topdown.verify(TOPDOWN, "--topdown-provenance" in sys.argv[1:])
        npcs.verify(NPCS, "--topdown-provenance" in sys.argv[1:])
        disguise.check("--topdown-provenance" in sys.argv[1:])
        v4.verify(V4, "--topdown-provenance" in sys.argv[1:])
    except (ValueError, OSError, KeyError) as error:
        bad.append("topdown " + str(error))
        print("  !", bad[-1])
    if "--sim-candidates" in sys.argv[1:]:
        # 승인 전 후보는 선택 검사만 한다. 제품 필수 목록에는 승인 뒤 등록한다.
        import process_sim_assets as sim
        manifest_name = sys.argv[sys.argv.index("--sim-manifest") + 1] if "--sim-manifest" in sys.argv else "tools/manifest_sim96.json"
        spec = sim.manifest(manifest_name)
        if not sim.verify(spec["entries"], spec.get("validation", "validation.json")):
            bad.append("simulation candidates failed")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
