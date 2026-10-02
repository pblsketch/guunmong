# -*- coding: utf-8 -*-
"""assets/raw/*.png(Codex 생성 원본)를 게임용 도트 그림으로 가공한다(기획서 §17).

    python tools/process_assets.py [이름...]      # 이름을 주면 그것만

- ref_*            → design/ref/<이름>.png (설정 그림 1536x1024 흰 바탕. 게임에 들어가지 않음)
- sc_*             → assets/sc/<이름>.webp      480x270 (가운데 16:9 자르기 → 면적 평균 → 32색)
- house_*          → assets/house/<이름>.webp   단계별 크기(객사 320x200 …)
- board            → assets/board/board.webp     320x480 (+ §8-1 칸 좌표에 맞춘 먹 점선 길)
- pt_<face>_sheet  → assets/pt/<face>.webp, <face>_<mood>.webp  96x96 투명 배경
                     (한 인물의 표정을 마젠타 바탕 한 장에 그려 얼굴을 맞추고, 칸으로 나눈다.
                      표정끼리 같은 배율·같은 팔레트를 쓴다.)
- *_sheet(물건·칸·화면 장식) → 마젠타 바탕 격자에서 칸마다 잘라 정한 크기로(fill: 꽉 채움 / fit: 비율 유지)
- title_art → assets/ui/title.webp 320x480 · icon_art → assets/ui/icon-192.png, icon-512.png
- cloud_wipe → assets/ui/cloud_wipe.webp 480x270(투명 바탕 구름)
- 구슬 세 장(16px 안팎)은 생성 그림을 줄이면 뭉개지므로 직접 찍는다(beads()).
모든 결과는 무손실 webp(아이콘만 png), 32색 이하(투명은 31색 + 투명).
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as px  # noqa: E402

ROOT, RAW = px.ROOT, px.RAW
OUT = {k: os.path.join(ROOT, "assets", k) for k in ("sc", "pt", "house", "board", "items", "ui")}
REFDIR = os.path.join(ROOT, "design", "ref")
REF_SIZE = (1536, 1024)

SCENE = (480, 270)
HOUSE = {"house_inn": (320, 200), "house_byeoldang": (480, 200), "house_seungsang": (640, 200), "house_chwimi": (800, 200)}
BOARD = {"board": (320, 480)}
# 말판 칸 가운데(%, 기획서 §8-1 표의 순서 0~15). 칸 틀은 엔진이 tile_*.webp(48x48)로 겹쳐 그리므로,
# 판 그림에는 칸 사이를 잇는 뱀 모양 길(먹 점선)만 정확한 좌표에 직접 찍는다.
BOARD_SQ = [(12.5, 86), (37.5, 86), (62.5, 86), (87.5, 86), (87.5, 62), (62.5, 62), (37.5, 62), (12.5, 62),
            (12.5, 38), (37.5, 38), (62.5, 38), (87.5, 38), (87.5, 14), (62.5, 14), (37.5, 14), (12.5, 14)]
TILE_HALF, DOT, DOT_STEP, WASH = 24, 2, 5, 8
PT = 96
# 초상 시트: 이름 → (줄마다 칸 수, 칸 순서대로 출력 파일 이름, 배경 키)
def _pt(face, moods):
    return [face + (f"_{m}" if m else "") for m in moods]


PT_SHEETS = {
    "pt_yang_sheet": ([2, 2], _pt("yang", [None, "smile", "shock", "disguise"]), "magenta"),
    "pt_gyeongpae_sheet": ([3], _pt("gyeongpae", [None, "blush", "sly"]), "magenta"),
    "pt_seongjin_sheet": ([3], _pt("seongjin", [None, "troubled", "awake"]), "magenta"),
    "pt_yuk_sheet": ([3], _pt("yuk", [None, "stern", "smile"]), "magenta"),
    "pt_hoseung_sheet": ([2], _pt("hoseung", [None, "laugh"]), "magenta"),
    "pt_josin_sheet": ([2], _pt("josin", [None, "aged"]), "magenta"),
    "pt_dosa_sheet": ([2], _pt("dosa", [None, "smile"]), "magenta"),
    "pt_yeomra_sheet": ([2], _pt("yeomra", [None, "stern"]), "magenta"),
    "pt_jeong13_sheet": ([2], _pt("jeong13", [None, "laugh"]), "magenta"),
    "pt_chae_sheet": ([3], _pt("chae", [None, "shy", "tears"]), "magenta"),
    "pt_seomwol_sheet": ([3], _pt("seomwol", [None, "smile", "sly"]), "magenta"),
    "pt_chunun_sheet": ([3], _pt("chunun", [None, "ghost", "giggle"]), "magenta"),
    "pt_gyeonghong_sheet": ([3], _pt("gyeonghong", [None, "disguise", "smile"]), "green"),
    "pt_nanyang_sheet": ([2], _pt("nanyang", [None, "smile"]), "magenta"),
    "pt_yoyeon_sheet": ([3], _pt("yoyeon", [None, "blade", "smile"]), "magenta"),
    "pt_neungpa_sheet": ([3], _pt("neungpa", [None, "sad", "smile"]), "magenta"),
    "pt_fairies_a_sheet": ([3, 2], ["fairy_chae", "fairy_seomwol", "fairy_gyeongpae", "fairy_chunun", "fairy_neungpa"], "magenta"),
    "pt_fairies_b_sheet": ([3], ["fairy_gyeonghong", "fairy_nanyang", "fairy_yoyeon"], "green"),
}


def _item(n):
    return (f"items/{n}.webp", (32, 32), "fit")


# 여러 물건을 한 장에 그린 시트: 이름 → (줄마다 칸 수, [(assets 아래 경로, (w, h), 'fill'|'fit')])
OBJ_SHEETS = {
    "items_sheet": ([5, 5, 4], [_item(n) for n in (
        "item_yangryu", "item_geomungo", "item_sijeon", "item_yeogwan", "item_bujeok", "item_bujeol", "item_cheonrima",
        "item_tungso", "item_mungbang", "item_chammageom", "item_bisu", "item_mulbyeong", "item_hasa", "item_girinpo")]),
    "tiles_sheet": ([4, 3], [("board/tile_place.webp", (48, 48), "fill"), ("board/tile_office.webp", (48, 48), "fill"),
                             ("board/tile_start.webp", (48, 48), "fill"), ("board/tile_end.webp", (48, 48), "fill"),
                             ("board/tile_done.webp", (48, 48), "fit"), ("board/tile_now.webp", (52, 52), "fill"),
                             ("board/board_cloud.webp", (64, 32), "fit")]),
    "ui_frames_sheet": ([3, 3], [("ui/frame_gloss.webp", (48, 48), "fill"), ("ui/frame_dream.webp", (48, 48), "fill"),
                                 ("ui/frame_real.webp", (48, 48), "fill"), ("ui/journal_page.webp", (64, 64), "fill"),
                                 ("ui/btn_frame.webp", (24, 24), "fill"), ("ui/seal_blank.webp", (24, 24), "fill")]),
    "ui_panels_sheet": ([2, 2], [("ui/wish_board.webp", (160, 64), "fill"), ("ui/gyoji.webp", (160, 96), "fill"),
                                 ("ui/card_frame.webp", (96, 128), "fill"), ("ui/card_back.webp", (96, 128), "fill")]),
    "ui_small_sheet": ([4], [("ui/divider_knot.webp", (16, 48), "fit"), ("ui/corner_cloud.webp", (24, 24), "fit"),
                             ("ui/wish_fill.webp", (16, 8), "fill"), ("ui/wish_mist.webp", (32, 16), "fill")]),
}


def flat(name, size, out_path):
    im = Image.open(os.path.join(RAW, name + ".png")).convert("RGB")
    im = px.center_crop(im, size[0] / size[1])
    im = px.quantize(px.box_resize(im, size))
    n = px.save_webp(im, out_path)
    print(f"{name}: {size[0]}x{size[1]} {n} colors -> {os.path.relpath(out_path, ROOT)}")


def board(name, size, out_path):
    """판 바탕(생성) → 31색 → 칸 사이 길을 찍는다: 옅은 먹 번짐 띠(폭 8px) + 먹 점선(2px 점, 5px 간격).
    두 색 모두 팔레트 안에서 고르므로 32색 이하가 유지된다."""
    im = Image.open(os.path.join(RAW, name + ".png")).convert("RGB")
    im = px.quantize(px.box_resize(px.center_crop(im, size[0] / size[1]), size), n=px.MAX_COLORS - 1)
    arr = np.array(im)
    cols = np.unique(arr.reshape(-1, 3), axis=0)
    ink = cols[cols.astype(int).sum(1).argmin()]
    W, H = size
    paper = np.median(arr[H // 3:2 * H // 3, W // 4:3 * W // 4].reshape(-1, 3), axis=0)
    wash = cols[np.abs(cols.astype(float) - paper * 0.86).sum(1).argmin()]
    pts = [(round(x * W / 100), round(y * H / 100)) for x, y in BOARD_SQ]

    def stamp(x, y, r, c):
        arr[y - r // 2:y - r // 2 + r, x - r // 2:x - r // 2 + r] = c

    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = max(abs(x1 - x0), abs(y1 - y0))
        for t in range(L + 1):  # 번짐 띠: 칸 가운데에서 가운데까지(칸 그림이 위를 덮는다)
            stamp(round(x0 + (x1 - x0) * t / L), round(y0 + (y1 - y0) * t / L), WASH, wash)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        # 점선: 칸 가장자리 사이만
        if y0 == y1:
            d = 1 if x1 > x0 else -1
            a, b = (x0 + d * (TILE_HALF + 2), y0), (x1 - d * (TILE_HALF + 2), y1)
        else:
            a, b = (x0, y0 - (TILE_HALF + 2)), (x1, y1 + (TILE_HALF + 2))
        L = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        for i in range(L // DOT_STEP + 1):
            t = i * DOT_STEP / L
            stamp(round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t), DOT, ink)
    n = px.save_webp(Image.fromarray(arr, "RGB"), out_path)
    print(f"{name}: {W}x{H} {n} colors (path on 16 squares) -> {os.path.relpath(out_path, ROOT)}")


def portraits(name):
    counts, outs, key = PT_SHEETS[name]
    arr = px.load_keyed(name, key)
    rows, clean = px.grid_boxes(arr, counts)
    subs = [px.crop_box(arr, clean, b) for row in rows for b in row]
    if len(subs) != len(outs):
        print(f"  ! {name}: {len(subs)} cells, expected {len(outs)}")
    # 같은 배율: 가장 큰 칸이 96x96 안(위 여백 2px)에 들어가게
    s = min(min(PT / sb.shape[1], (PT - 2) / sb.shape[0]) for sb in subs)
    smalls = []
    for sb in subs:
        im = px.box_resize(Image.fromarray(sb, "RGBA"), (max(1, round(sb.shape[1] * s)), max(1, round(sb.shape[0] * s))))
        canvas = Image.new("RGBA", (PT, PT), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((PT - im.width) // 2, PT - im.height))  # 가슴 아래가 칸 밑에 닿게
        smalls.append(canvas)
    pal = px.shared_palette(smalls)
    for im, out in zip(smalls, outs):
        n = px.save_webp(px.quantize(im, pal=pal), os.path.join(OUT["pt"], out + ".webp"))
        print(f"{name}: {out}.webp {PT}x{PT} {n} colors")


def objects(name):
    """격자로 그린 물건들을 칸마다 잘라 정한 크기로. fill은 꽉 채우고(틀·칸·판), fit은 비율을 지켜 가운데에 둔다."""
    counts, outs = OBJ_SHEETS[name]
    arr = px.load_keyed(name)
    rows, clean = px.grid_boxes(arr, counts)
    subs = [px.crop_box(arr, clean, b) for row in rows for b in row]
    if len(subs) != len(outs):
        print(f"  ! {name}: {len(subs)} cells, expected {len(outs)}")
    for sb, (rel, (w, h), mode) in zip(subs, outs):
        im = Image.fromarray(sb, "RGBA")
        if mode == "fill":
            im = px.box_resize(im, (w, h))
        else:
            s = min(w / im.width, h / im.height)
            small = px.box_resize(im, (max(1, round(im.width * s)), max(1, round(im.height * s))))
            im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            im.alpha_composite(small, ((w - small.width) // 2, (h - small.height) // 2))
        if im.getchannel("A").getextrema() == (255, 255):
            im = im.convert("RGB")  # 꽉 찬 그림은 알파 없이
        n = px.save_webp(px.quantize(im), os.path.join(ROOT, "assets", rel))
        print(f"{name}: {rel} {w}x{h} {n} colors")


def title(name):
    flat(name, (320, 480), os.path.join(OUT["ui"], "title.webp"))


def icons(name):
    """앱 아이콘: 마젠타 밖은 투명, 32색 이하 팔레트 PNG."""
    im = Image.fromarray(px.load_keyed(name), "RGBA")
    im = px.center_crop(im, 1.0)
    for n in (512, 192):
        q = px.quantize(px.box_resize(im, (n, n)))
        path = os.path.join(OUT["ui"], f"icon-{n}.png")
        q.save(path, optimize=True)
        c = px.count_colors(path)
        assert c <= px.MAX_COLORS, (path, c)
        print(f"{name}: icon-{n}.png {c} colors")


def cloud_wipe(name):
    """화면을 덮는 구름: 생성 그림(마젠타 틈)을 16:9로 잘라 480x270, 틈은 투명."""
    im = px.center_crop(Image.fromarray(px.load_keyed(name), "RGBA"), 16 / 9)
    n = px.save_webp(px.quantize(px.box_resize(im, SCENE)), os.path.join(OUT["ui"], "cloud_wipe.webp"))
    print(f"{name}: cloud_wipe.webp {SCENE[0]}x{SCENE[1]} {n} colors")


def beads():
    """구슬 세 장을 한 점씩 찍는다(16px 이하라 생성 그림을 줄이면 뭉개진다). 색은 엔진 CSS의 구슬 색과 맞춤."""
    W, P1, P2, P3, O = (255, 255, 255), (243, 214, 228), (201, 143, 176), (150, 96, 128), (92, 58, 80)

    def disc(n, cx, cy, r):
        yy, xx = np.mgrid[0:n, 0:n] + 0.5
        return (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r

    # pearl 16x16: 테두리 → 진한 분홍 → 옅은 분홍 → 흰 빛, 왼쪽 위 반짝임
    a = np.zeros((16, 16, 4), np.uint8)
    for m, c in [(disc(16, 8, 8, 7.5), O), (disc(16, 8, 8, 6.6), P3), (disc(16, 7.4, 7.4, 5.6), P2),
                 (disc(16, 6.8, 6.8, 4.2), P1), (disc(16, 6, 6, 2.2), W)]:
        a[m] = c + (255,)
    px.save_webp(Image.fromarray(a, "RGBA"), os.path.join(OUT["ui"], "pearl.webp"))
    # pearl_empty 16x16: 흐린 빈 원(테두리 1px)
    e = np.zeros((16, 16, 4), np.uint8)
    e[disc(16, 8, 8, 7.5) & ~disc(16, 8, 8, 6.4)] = (168, 150, 160, 255)
    px.save_webp(Image.fromarray(e, "RGBA"), os.path.join(OUT["ui"], "pearl_empty.webp"))
    # pearl_trace 12x12: 작은 네 갈래 반짝임, 대비 낮게(배경에 묻히도록)
    t = np.zeros((12, 12, 4), np.uint8)
    for i in (2, 3, 4, 7, 8, 9):
        t[i, 5:7] = (236, 220, 228, 255)
        t[5:7, i] = (236, 220, 228, 255)
    t[1, 5:7] = t[10, 5:7] = (226, 214, 222, 255)
    t[5:7, 1] = t[5:7, 10] = (226, 214, 222, 255)
    t[5:7, 5:7] = P1 + (255,)
    px.save_webp(Image.fromarray(t, "RGBA"), os.path.join(OUT["ui"], "pearl_trace.webp"))
    print("beads: pearl.webp 16x16, pearl_empty.webp 16x16, pearl_trace.webp 12x12")


def refs(name):
    """설정 그림은 1536x1024 흰 바탕 PNG(§17-1). Codex가 다른 크기로 주면 비율을 지켜 줄이고 흰 여백을 붙인다."""
    os.makedirs(REFDIR, exist_ok=True)
    im = Image.open(os.path.join(RAW, name + ".png")).convert("RGB")
    W, H = REF_SIZE
    if im.size != REF_SIZE:
        s = min(W / im.width, H / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        canvas = Image.new("RGB", REF_SIZE, (255, 255, 255))
        canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
        im = canvas
    im.save(os.path.join(REFDIR, name + ".png"), optimize=True)
    print(f"{name}: -> design/ref/{name}.png {im.size}")


def run(names):
    for f in sorted(os.listdir(RAW)):
        key = f[:-4]
        if not f.endswith(".png") or (names and key not in names):
            continue
        try:
            if key.startswith("ref_"):
                refs(key)
            elif key.startswith("sc_"):
                flat(key, SCENE, os.path.join(OUT["sc"], key + ".webp"))
            elif key in HOUSE:
                flat(key, HOUSE[key], os.path.join(OUT["house"], key + ".webp"))
            elif key in BOARD:
                board(key, BOARD[key], os.path.join(OUT["board"], key + ".webp"))
            elif key in PT_SHEETS:
                portraits(key)
            elif key in OBJ_SHEETS:
                objects(key)
            elif key == "title_art":
                title(key)
            elif key == "icon_art":
                icons(key)
            elif key == "cloud_wipe":
                cloud_wipe(key)
        except Exception as e:  # 한 장이 잘못돼도 나머지는 만든다
            print(f"  ! {key}: {e}")


if __name__ == "__main__":
    names = set(sys.argv[1:])
    run(names)
    if not names or "beads" in names:
        beads()
