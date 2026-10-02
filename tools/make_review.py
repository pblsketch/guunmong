# -*- coding: utf-8 -*-
"""사람이 눈으로 판단할 검토용 모음 그림을 만든다(글자 없음).

    python tools/make_review.py           # 2단계(§17 전부): phase2_contact(.png, _preview.jpg), phase2_contact_scenes
    python tools/make_review.py phase1    # 1단계 표본 모음(이미 커밋한 그림)

- design/review/phase1_contact.png
    게임용 표본(장면·초상·말 시트·집·판)을 정수배(가장 가까운 이웃)로 키워 늘어놓고,
    맨 아래에 설정 그림 7장(design/ref)을 줄여 붙인다. 투명 부분은 체크무늬.
    순서: 장면 3(x3) / 초상 yang 4 + gyeongpae 3(x3) / 말 시트(x4) / 집(x3) / 판(x2) / 설정 그림.
- design/review/phase1_contact_scenes.png
    장면 3장을 4배로 키운 것(왼쪽)과 생성 원본(가운데 16:9, 같은 크기로 줄임, 오른쪽)을 나란히.
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as px  # noqa: E402

ROOT, RAW = px.ROOT, px.RAW
REV = os.path.join(ROOT, "design", "review")
BG, GAP, MAXW = (46, 44, 56), 24, 2960

SCENES = ["sc_bridge", "sc_geomungo", "sc_c3_feast"]
PORTRAITS = ["yang", "yang_smile", "yang_shock", "yang_disguise", "gyeongpae", "gyeongpae_blush", "gyeongpae_sly"]
REFS = ["ref_seongjin_yang", "ref_masters", "ref_women_1", "ref_women_2", "ref_fairies", "ref_others", "ref_piece"]


def checker(size, k=8):
    im = Image.new("RGB", size, (200, 200, 205))
    light = Image.new("RGB", (k, k), (228, 228, 232))
    for y in range(0, size[1], k):
        for x in range((y // k) % 2 * k, size[0], 2 * k):
            im.paste(light, (x, y))
    return im


def tile(path, k):
    im = Image.open(path).convert("RGBA")
    big = px.upscale(im, k)
    base = checker(big.size, 4 * k).convert("RGBA")
    base.alpha_composite(big)
    return base.convert("RGB")


def pack(items, maxw=MAXW):
    """items: [Image | None]. None은 줄바꿈. 왼쪽부터 채우고 넘치면 다음 줄."""
    rows, row, w = [], [], 0
    for it in items:
        if it is None or (row and w + GAP + it.width > maxw):
            if row:
                rows.append(row)
            row, w = [], 0
            if it is None:
                continue
        row.append(it)
        w += it.width + (GAP if len(row) > 1 else 0)
    if row:
        rows.append(row)
    W = max(sum(i.width for i in r) + GAP * (len(r) - 1) for r in rows) + 2 * GAP
    H = sum(max(i.height for i in r) for r in rows) + GAP * (len(rows) + 1)
    out = Image.new("RGB", (W, H), BG)
    y = GAP
    for r in rows:
        x = GAP
        for i in r:
            out.paste(i, (x, y))
            x += i.width + GAP
        y += max(i.height for i in r) + GAP
    return out


def a(*parts):
    return os.path.join(ROOT, "assets", *parts)



def contact():
    items = []
    for s in SCENES:
        if os.path.exists(a("sc", s + ".webp")):
            items.append(tile(a("sc", s + ".webp"), 3))
    items.append(None)
    for p in PORTRAITS:
        if os.path.exists(a("pt", p + ".webp")):
            items.append(tile(a("pt", p + ".webp"), 3))
    items.append(None)
    for path, k in [(a("board", "horse_walk.webp"), 4), (a("house", "house_inn.webp"), 3), (a("board", "board.webp"), 2)]:
        if os.path.exists(path):
            items.append(tile(path, k))
    items.append(None)
    for r in REFS:
        p = os.path.join(ROOT, "design", "ref", r + ".png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGB")
            items.append(im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS))
    out = pack(items)
    os.makedirs(REV, exist_ok=True)
    out.save(os.path.join(REV, "phase1_contact.png"), optimize=True)
    print("phase1_contact.png", out.size)


def contact_scenes():
    items = []
    for s in SCENES:
        p, r = a("sc", s + ".webp"), os.path.join(RAW, s + ".png")
        if not (os.path.exists(p) and os.path.exists(r)):
            continue
        big = tile(p, 4)
        raw = px.center_crop(Image.open(r).convert("RGB"), 16 / 9).resize(big.size, Image.LANCZOS)
        items += [big, raw, None]
    out = pack(items, maxw=2 * 1280 + 3 * GAP)
    out.save(os.path.join(REV, "phase1_contact_scenes.png"), optimize=True)
    print("phase1_contact_scenes.png", out.size)


# ── 2단계: §17 전부 ──
SCENES_ALL = ["sc_josin_dream", "sc_josin_wake", "sc_bridge", "sc_cell", "sc_exile", "sc_hell", "sc_rebirth", "sc_huayin",
              "sc_namjeon", "sc_tianjin", "sc_geomungo", "sc_chunun", "sc_hebei", "sc_handan", "sc_tungso", "sc_bongnae",
              "sc_wonsu", "sc_yoyeon", "sc_neungpa", "sc_seungsang", "sc_honrye", "sc_c3_feast", "sc_c3_monk",
              "sc_c3_awake", "sc_c4_journal", "sc_c5_dialogue", "sc_c5_ordination"]
PT_ALL = ["seongjin", "seongjin_troubled", "seongjin_awake", "yuk", "yuk_stern", "yuk_smile", "yang", "yang_smile",
          "yang_shock", "yang_disguise", "hoseung", "hoseung_laugh", "josin", "josin_aged", "dosa", "dosa_smile", "yeomra",
          "yeomra_stern", "jeong13", "jeong13_laugh", "chae", "chae_shy", "chae_tears", "seomwol", "seomwol_smile",
          "seomwol_sly", "gyeongpae", "gyeongpae_blush", "gyeongpae_sly", "chunun", "chunun_ghost", "chunun_giggle",
          "gyeonghong", "gyeonghong_disguise", "gyeonghong_smile", "nanyang", "nanyang_smile", "yoyeon", "yoyeon_blade",
          "yoyeon_smile", "neungpa", "neungpa_sad", "neungpa_smile", "fairy_chae", "fairy_seomwol", "fairy_gyeongpae",
          "fairy_chunun", "fairy_gyeonghong", "fairy_nanyang", "fairy_yoyeon", "fairy_neungpa"]
ITEMS = ["item_yangryu", "item_geomungo", "item_sijeon", "item_yeogwan", "item_bujeok", "item_bujeol", "item_cheonrima",
         "item_tungso", "item_mungbang", "item_chammageom", "item_bisu", "item_mulbyeong", "item_hasa", "item_girinpo"]
# (assets 아래 경로, 배율) 묶음. None은 줄바꿈
GROUPS2 = (
    [(f"pt/{p}.webp", 2) for p in PT_ALL] + [None]
    + [(f"board/{n}.webp", 4) for n in ("horse_walk", "horse_walk_gwan", "horse_walk_jang", "horse_walk_sang")] + [None]
    + [(f"house/{n}.webp", 2) for n in ("house_inn", "house_byeoldang", "house_seungsang", "house_chwimi")] + [None]
    + [("board/board.webp", 2)] + [(f"board/{n}.webp", 3) for n in ("tile_place", "tile_office", "tile_start", "tile_end",
                                                                     "tile_done", "tile_now", "board_cloud")] + [None]
    + [(f"items/{n}.webp", 4) for n in ITEMS] + [(f"ui/{n}.webp", 6) for n in ("pearl", "pearl_trace", "pearl_empty")] + [None]
    + [("ui/title.webp", 2), ("ui/icon-512.png", 1), ("ui/icon-192.png", 1), ("ui/cloud_wipe.webp", 2)] + [None]
    + [(f"ui/{n}.webp", 4) for n in ("frame_gloss", "frame_dream", "frame_real", "journal_page", "btn_frame", "seal_blank",
                                     "wish_fill", "wish_mist", "divider_knot", "corner_cloud")]
    + [(f"ui/{n}.webp", 3) for n in ("wish_board", "gyoji", "card_frame", "card_back")]
)


def save_with_preview(out, name):
    out.save(os.path.join(REV, name + ".png"), optimize=True)
    k = max(1, -(-out.width // 2400))  # 미리 보기 JPG는 너비 2400 이하로(정수분의 1, 가장 가까운 이웃)
    prev = out.resize((out.width // k, out.height // k), Image.NEAREST) if k > 1 else out
    prev.save(os.path.join(REV, name + "_preview.jpg"), quality=88, optimize=True)
    print(name + ".png", out.size, "+ _preview.jpg")


def contact2():
    items = [tile(a("sc", s + ".webp"), 2) for s in SCENES_ALL if os.path.exists(a("sc", s + ".webp"))] + [None]
    for g in GROUPS2:
        if g is None:
            items.append(None)
        elif os.path.exists(a(g[0])):
            items.append(tile(a(g[0]), g[1]))
        else:
            print("  missing", g[0])
    save_with_preview(pack(items, maxw=3000), "phase2_contact")


def contact2_scenes():
    items = [tile(a("sc", s + ".webp"), 3) for s in SCENES_ALL if os.path.exists(a("sc", s + ".webp"))]
    save_with_preview(pack(items, maxw=3 * 1440 + 4 * GAP), "phase2_contact_scenes")


if __name__ == "__main__":
    if "phase1" in sys.argv[1:]:
        contact()
        contact_scenes()
    else:
        contact2()
        contact2_scenes()
