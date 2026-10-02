# -*- coding: utf-8 -*-
"""말판의 말 스프라이트 원본(assets/raw/horse_walk*.png, 마젠타 바탕)을 게임용 시트로 만든다(기획서 §17-4).

    python tools/process_sprites.py [이름...]

- 시트 192x128 = 6열 x 4줄, 한 칸 32x32, 투명 배경, 발밑 기준점은 칸의 (16, 30).
- 줄 0 서 있기 2 / 줄 1 오른쪽 걷기 4 / 줄 2 오른쪽 뛰기 6 / 줄 3 위로 걷기 4.
- 1) 마젠타(승상 옷은 초록) 배경을 색으로 빼고  2) 줄마다 기대 개수만큼 빈 틈으로 프레임을 자르고
  3) 모든 프레임에 같은 배율(서 있기 첫 프레임의 키 = 28px)을 쓰고
  4) 발 부분 가운데를 x=16, 가장 아래 불투명 줄을 y=30에 맞춘다(걸을 때 튀지 않게)
  5) 가장자리 1px을 어둡게 해 테두리를 세우고(작은 칸에서 읽히게)
  6) 시트 전체를 한 팔레트(불투명 31색 + 투명)로 줄인다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pixlib as px  # noqa: E402

ROOT, RAW = px.ROOT, px.RAW
OUT = os.path.join(ROOT, "assets", "board")
CELL, COLS = 32, 6
PIVOT = (16, 30)
ROWS = [2, 4, 6, 4]
HEIGHT = 28  # 서 있기 프레임의 키(px)
# 시트 이름 → 배경 키(승상 옷은 자줏빛이라 초록 바탕으로 생성)
SHEETS = {"horse_walk": "magenta", "horse_walk_gwan": "magenta", "horse_walk_jang": "magenta", "horse_walk_sang": "green"}


def outline(im, k=0.45):
    """그림 가장자리 1px을 어둡게 해 테두리를 세운다(32px 칸에서도 모양이 읽히게). 색은 뒤에서 다시 팔레트로 맞춘다."""
    a = np.array(im)
    m = a[..., 3] > 0
    edge = m & ~ndimage.binary_erosion(m)
    a[edge, :3] = (a[edge, :3].astype(np.float32) * k).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def sheet(name):
    arr = px.load_keyed(name, SHEETS[name])
    rows, clean = px.grid_boxes(arr, ROWS)
    got = [len(r) for r in rows]
    if got != ROWS:
        print(f"  ! {name}: frames per row {got}, expected {ROWS}")
    first = px.crop_box(arr, clean, rows[0][0])
    s = HEIGHT / first.shape[0]
    out = Image.new("RGBA", (COLS * CELL, len(ROWS) * CELL), (0, 0, 0, 0))
    for ri, row in enumerate(rows):
        for ci, b in enumerate(row[:COLS]):
            sub = px.crop_box(arr, clean, b)
            cx = px.foot_x(sub) * s
            im = px.box_resize(Image.fromarray(sub, "RGBA"), (max(1, round(sub.shape[1] * s)), max(1, round(sub.shape[0] * s))))
            # 알파가 남은 실제 그림 범위로 다시 맞춘다(줄인 뒤 아래쪽 투명 줄 제거)
            bb = im.getbbox()
            if bb:
                cx -= bb[0]
                im = im.crop(bb)
            x = round(PIVOT[0] - cx)
            y = PIVOT[1] + 1 - im.height
            if x < 0 or y < 0 or x + im.width > CELL:
                print(f"  ! {name} row {ri} col {ci}: {im.size} at ({x},{y}) leaves the 32x32 cell, clipped")
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            part = im.crop((max(0, -x), max(0, -y), min(im.width, CELL - x), min(im.height, CELL - y)))
            cell.alpha_composite(part, (max(0, x), max(0, y)))
            out.alpha_composite(cell, (ci * CELL, ri * CELL))
    out = outline(out)
    out = px.quantize(out)
    n = px.save_webp(out, os.path.join(OUT, name + ".webp"))
    print(f"{name}: {out.width}x{out.height} scale x{s:.3f} {n} colors")


def run(names):
    for name in SHEETS:
        if (names and name not in names) or not os.path.exists(os.path.join(RAW, name + ".png")):
            continue
        try:
            sheet(name)
        except Exception as e:
            print(f"  ! {name}: {e}")


if __name__ == "__main__":
    run(set(sys.argv[1:]))
