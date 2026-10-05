"""승인 전 탑다운 후보의 영어 프롬프트와 제작 목록을 만든다."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "assets/raw/topdown-v3"
NOTEXT = "NOTEXT: Absolutely no text, letters, Chinese characters, numbers, labels, UI, watermark, signatures, grid lines or swatches."
TANG = "TANG: Tang dynasty China, 7th to 9th century. Tang robes, round collars, futou caps; no Korean hanbok, Japanese kimono, Ming or Qing clothing."
STYLE = "16-bit pixel art matching the attached reference palette and chunky square pixels, dark outlines, restrained traditional colors, no antialiasing or blur."
MAP = "A NEW playable orthographic 3/4 top-down RPG environment, camera looking down at the ground, visible tops of objects, horizontal and vertical movement lanes. NOT a side-view stage, NOT a perspective landscape, NOT an isometric diamond. 12 by 10 logical tiles, 32px tiles, final 384x320. All essential walkable lanes and exits in the central 80 percent. NO people, NPCs, protagonists, animals or characters baked into the map. Keep floor clear for separate dynamic sprites and props."
PLACES = {
    "map-bridge": ("assets/sc/sc_bridge.webp", "Lotus Peak stone bridge crossing a mountain stream from bottom to top. Broad straight walkable grey stone bridge, low railings, grey rock banks, pine trees at edges, blue stream. The bridge walking surface must be wide and visible from above. No maiden or monk, no flowers held by anyone."),
    "map-cell": ("assets/sc/sc_cell.webp", "An EMPTY compact cutaway monastery meditation cell. ARCHITECTURE ONLY: one back wall at the top, short side walls, open south doorway at bottom center, a window in the back wall, plain muted grey stone floor. Completely REMOVE ALL movable furniture seen in reference: NO tables, desks, stools, chests, pots, vases, candles, incense burners, scrolls, statues or cushions ANYWHERE. No characters. Plain bare floor only. Furniture and cushion are separate dynamic assets, not part of this background. This EXACT same map will be reused at the beginning and after waking, with identical walls, doorway and cushion position. Clear movement space, quiet indigo and grey palette."),
    "map-huayin": ("assets/sc/sc_huayin.webp", "A small Huayin county town street: grey stone paving, willow trees at edges, red timber building facades to the north, open wide south entry, readable lanes to both side exits. No people on street, balconies or windows, no mounted rider, no shop text, no future NPC. Architecture and trees ONLY. No tables, pots, jars, crates, benches, stools, chests, vases, shop goods or movable furniture anywhere. Bare open paving for all separate dynamic props."),
    "map-chwimi": ("assets/sc/sc_c3_feast.webp", "Chwimi palace open terrace at sunset. An empty broad stone tiled terrace, red timber pavilion along north edge, low stone balustrade along east edge reachable from the floor, distant autumn colors only outside terrace edges. No seated guests, monk, scholar, women or tables. No movable props baked in. Clear top-down floor for a chancellor sprite and separate furniture."),
}
ACTORS = {
    "walk-seongjin": ("assets/pt/seongjin.webp", "Young monk Seongjin, shaved head, pale grey wrap robe, brown prayer beads, same gentle face as reference.", "magenta"),
    "walk-yang-scholar": ("assets/board/horse_walk.webp", "Young Yang Soyu, light blue scholar robe, black soft head wrap, same face and hairstyle as reference. No horse.", "magenta"),
    "walk-yang-chancellor": ("assets/board/horse_walk_sang.webp", "Yang Soyu as chancellor, purple round-collar Tang official robe, black futou cap, gold belt. Preserve the character design of reference. No horse.", "green"),
}


def main():
    entries = []
    for key, (ref, desc) in PLACES.items():
        entries.append(dict(id=key, kind="map", reference=ref, mode="style", description=desc,
                            width=384, height=320, tile=32, prompt=f"{STYLE}\n{MAP}\n{desc}\n{TANG}\n{NOTEXT}"))
    for key, (ref, desc, chroma) in ACTORS.items():
        layout = ("A sprite sheet, EXACTLY 4 rows and 5 columns, equal invisible cells with generous empty gaps. "
                  "Row 1 DOWN facing viewer, row 2 LEFT, row 3 RIGHT, row 4 UP back view. "
                  "Every row: column 1 standing still, columns 2-5 four DIFFERENT consecutive walking poses. "
                  "Feet alternate visibly. Draw all twenty complete full-body figures at identical scale. "
                  "No duplicated stand frame as walk cycle. Final cells 32x32, body height about 28 pixels, "
                  "foot anchor 16,30; large pixel blocks readable at actual 32px. No weapons, trails or shadow. "
                  f"Solid flat pure {'#00FF00 green' if chroma == 'green' else '#FF00FF magenta'} background everywhere.")
        entries.append(dict(id=key, kind="walk", reference=ref, mode="same", description=desc,
                            width=160, height=128, frames=5, rows=4, chroma=chroma,
                            cell=dict(width=32, height=32), anchor=dict(x=16, y=30),
                            directions={d:dict(row=i, stand=0, walk=[1,2,3,4]) for i,d in enumerate(["down","left","right","up"])},
                            prompt=f"{STYLE}\n{layout}\n{desc}\n{TANG}\n{NOTEXT}"))
    entries.append(dict(id="kit-room", kind="props", reference="assets/sc/sc_cell.webp", mode="style",
                        width=128, height=64, frames=4, rows=2, chroma="magenta",
                        prompt=f"{STYLE}\nAn orthographic 3/4 top-down RPG reusable tile and prop sheet, EXACTLY 2 rows, 4 columns with generous pure #FF00FF magenta gaps. Eight isolated objects, NO people. Row 1: plain grey floor square tile, plain timber floor square tile, grey stone wall segment, red timber wall segment. Row 2: round straw meditation cushion, small dark wooden low table, small wooden stool, closed plain wooden chest. Each fully visible, distinct, one per cell, flat tops seen from above, same scale for a 32px world. No items on table, no writing on chest. No external shadows, no scenery connecting cells.\n{TANG}\n{NOTEXT}"))
    for e in entries:
        version = "v2" if e["id"] in ["map-cell","map-huayin"] else "v1"
        suffix = "-v2" if version == "v2" else ""
        p = ROOT / "tools/prompts" / ("topdown_v3_" + e["id"] + suffix + ".txt")
        p.write_text(e.pop("prompt") + "\n", encoding="ascii")
        candidate_version = "v2" if e["id"] in ["walk-yang-chancellor","kit-room"] else version
        e.update(prompt=p.relative_to(ROOT).as_posix(), original=f"{BASE}/originals/{e['id']}-{version}.png",
                 candidate=f"{BASE}/candidates/{e['id']}-{candidate_version}.webp", status="unapproved")
        if e["id"] in ["walk-yang-scholar","walk-yang-chancellor"]:
            e["sourceDirections"] = ["down","right","left","up"]
        if e["id"] == "kit-room":
            e["tileFrames"] = [0,1]
            e["frameKeys"] = ["floor-grey","floor-wood","wall-grey","wall-red","cushion","table","stool","chest"]
    manifest = dict(version=1, status="art approval pending", base=BASE, assets=entries,
                    reusedStaff="assets/sprites/hoseung.webp", sharedCell="map-cell")
    (ROOT / "tools/manifest_topdown_v3.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"UNAPPROVED: {len(entries)} ASCII prompts and candidate manifest")


if __name__ == "__main__":
    main()
