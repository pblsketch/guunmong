# -*- coding: utf-8 -*-
"""도트 그림 가공 공용 함수(process_assets.py, process_sprites.py, make_review.py가 함께 쓴다).

규칙(기획서 §17):
  - 가운데를 잘라 비율을 맞춤 → 면적 평균(BOX)으로 줄임 → 32색 이하 → 무손실 webp.
  - 투명 배경 그림은 불투명 색 31개 + 투명 1 = 32색 이하.
  - 투명 배경이 필요한 그림은 마젠타(#FF00FF) 단색 배경으로 생성해 색으로 빼낸다
    (「영웅소설」 tools/process_sprites.py의 마젠타 제거·빈 틈 분할·발밑 피벗을 옮겨 옴).
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
MAX_COLORS = 32


# ── 자르기·줄이기 ──
def center_crop(im, aspect):
    """aspect = 너비/높이. 가운데를 잘라 비율을 맞춘다."""
    w, h = im.size
    if w / h > aspect:
        nw = round(h * aspect)
        x0 = (w - nw) // 2
        return im.crop((x0, 0, x0 + nw, h))
    nh = round(w / aspect)
    y0 = (h - nh) // 2
    return im.crop((0, y0, w, y0 + nh))


def box_resize(im, size):
    """면적 평균으로 줄인다. RGBA면 알파를 곱해 줄인 뒤 되돌리고 알파를 0/255로 가른다."""
    if im.mode != "RGBA":
        return im.convert("RGB").resize(size, Image.BOX)
    arr = np.array(im).astype(np.float32)
    arr[..., :3] *= arr[..., 3:4] / 255.0
    small = np.array(Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA").resize(size, Image.BOX)).astype(np.float32)
    al = small[..., 3:4]
    small[..., :3] = np.where(al > 0, small[..., :3] * 255.0 / np.maximum(al, 1), 0)
    small[..., 3] = np.where(small[..., 3] > 110, 255, 0)
    return Image.fromarray(small.clip(0, 255).astype(np.uint8), "RGBA")


# ── 색 줄이기 ──
# 면적이 큰 색(하늘·안개)이 팔레트를 다 차지하면 작은 인물의 옷 색(인연 색)이 회색으로 묻힌다.
# 그래서 OKLab 공간에서, 고유 색마다 '개수의 0.3제곱 x 채도 가중'을 무게로 준 k-평균으로 팔레트를 고른다.
COUNT_EXP, CHROMA_W, SEEDS = 0.3, 20.0, 3


def _srgb_to_oklab(rgb):
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * c[:, 0] + 0.5363325363 * c[:, 1] + 0.0514459929 * c[:, 2]
    m = 0.2119034982 * c[:, 0] + 0.6806995451 * c[:, 1] + 0.1073969566 * c[:, 2]
    s = 0.0883024619 * c[:, 0] + 0.2817188376 * c[:, 1] + 0.6299787005 * c[:, 2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], axis=1)


def _nearest(lab, centers, chunk=65536):
    out = np.empty(len(lab), dtype=np.int32)
    for i in range(0, len(lab), chunk):
        d = ((lab[i:i + chunk, None, :] - centers[None, :, :]) ** 2).sum(-1)
        out[i:i + chunk] = d.argmin(1)
    return out


def palette(pixels, n, iters=24):
    """pixels: (N,3) uint8 → (k,3) uint8 팔레트(k ≤ n). 시작점을 바꿔 SEEDS번 돌리고 오차가 가장 작은 것."""
    uniq, cnt = np.unique(pixels.reshape(-1, 3), axis=0, return_counts=True)
    if len(uniq) <= n:
        return uniq.astype(np.uint8)
    lab = _srgb_to_oklab(uniq)
    # 개수에 약한 무게(제곱근보다 평평하게) + 채도가 높은 색에 무게를 더 준다(OKLab 채도 0.1 ≈ 무게 x3)
    w = cnt.astype(np.float64) ** COUNT_EXP * (1.0 + CHROMA_W * np.hypot(lab[:, 1], lab[:, 2]))
    best = None
    for seed in range(SEEDS):
        rng = np.random.default_rng(seed)
        centers = [lab[rng.choice(len(lab), p=w / w.sum())]]
        d2 = ((lab - centers[0]) ** 2).sum(1)
        for _ in range(1, n):  # k-means++ 시작점
            p = w * d2
            centers.append(lab[rng.choice(len(lab), p=p / p.sum())])
            d2 = np.minimum(d2, ((lab - centers[-1]) ** 2).sum(1))
        centers = np.array(centers)
        for _ in range(iters):
            lbl = _nearest(lab, centers)
            for k in range(n):
                m = lbl == k
                if m.any():
                    centers[k] = (lab[m] * w[m, None]).sum(0) / w[m].sum()
        lbl = _nearest(lab, centers)
        # 팔레트 색은 실제로 있던 색 가운데 무게중심에 가장 가까운 것(없는 색을 만들지 않음)
        pal = []
        for k in range(n):
            m = np.nonzero(lbl == k)[0]
            if len(m):
                pal.append(uniq[m[((lab[m] - centers[k]) ** 2).sum(1).argmin()]])
        pal = np.unique(np.array(pal, dtype=np.uint8), axis=0)
        pl = _srgb_to_oklab(pal)
        err = (w * ((lab - pl[_nearest(lab, pl)]) ** 2).sum(1)).sum()
        if best is None or err < best[0]:
            best = (err, pal)
    return best[1]


def apply_palette(rgb, pal):
    """rgb: (H,W,3) uint8 → 가장 가까운 팔레트 색(OKLab)."""
    flat = rgb.reshape(-1, 3)
    uniq, inv = np.unique(flat, axis=0, return_inverse=True)
    idx = _nearest(_srgb_to_oklab(uniq), _srgb_to_oklab(pal))
    return pal[idx][inv.reshape(-1)].reshape(rgb.shape)


def quantize(im, n=MAX_COLORS, pal=None):
    """RGB → n색 이하. RGBA → 불투명 n-1색 + 투명. pal을 주면 그 팔레트를 쓴다(여러 장이 같은 팔레트)."""
    if im.mode == "RGBA":
        arr = np.array(im)
        opaque = arr[..., 3] > 0
        if pal is None:
            pal = palette(arr[opaque][:, :3], n - 1)
        rgb = apply_palette(arr[..., :3], pal)
        out = np.dstack([rgb, np.where(opaque, 255, 0).astype(np.uint8)])
        out[~opaque] = 0
        return Image.fromarray(out, "RGBA")
    arr = np.array(im.convert("RGB"))
    if pal is None:
        pal = palette(arr, n)
    return Image.fromarray(apply_palette(arr, pal), "RGB")


def shared_palette(images, n=MAX_COLORS):
    """여러 RGBA 그림의 불투명 픽셀을 모아 n-1색 팔레트 하나를 만든다(한 인물의 표정들, 한 스프라이트 시트)."""
    px_ = [np.array(im)[np.array(im)[..., 3] > 0][:, :3] for im in images]
    return palette(np.concatenate(px_), n - 1)


def count_colors(path_or_im):
    im = Image.open(path_or_im) if isinstance(path_or_im, str) else path_or_im
    im = im.convert("RGBA")
    arr = np.array(im).reshape(-1, 4)
    arr[arr[:, 3] == 0] = 0  # 투명은 한 색으로 센다
    return len(np.unique(arr, axis=0))


def save_webp(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", lossless=True, quality=100, method=6, exact=True)
    n = count_colors(path)
    assert n <= MAX_COLORS, f"{path}: {n} colors"
    return n


# ── 마젠타 배경 빼기·프레임 나누기 ──
def load_keyed(name, key="magenta"):
    """assets/raw/<name>.png를 읽어 단색 배경을 투명으로 바꾼 RGBA 배열을 돌려준다.
    key: 'magenta'(#FF00FF, 기본) 또는 'green'(#00FF00, 보라 옷이 있는 그림)."""
    im = Image.open(os.path.join(RAW, name + ".png")).convert("RGBA")
    a = np.array(im).astype(np.int16)
    rgb, alpha = a[..., :3], a[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == "green":
        bg = (g > 170) & (r < 110) & (b < 110)
    else:
        bg = (r > 170) & (b > 170) & (g < 110) & (np.abs(r - b) < 70)
    alpha = np.where(bg, 0, alpha)
    # 번짐 걷기: 투명 가장자리 2px 안의 배경색 기운만 회색 쪽으로 당긴다
    # (그림 안쪽의 보라·분홍·초록 옷 색은 건드리지 않는다)
    edge = ndimage.binary_dilation(alpha == 0, iterations=2) & (alpha > 0)
    if key == "green":
        m = np.maximum(r, b)
        spill = edge & (g > m + 25)
        rgb[..., 1] = np.where(spill, m + (g - m) // 6, g)
        near = ndimage.binary_dilation(alpha == 0, iterations=1) & (alpha > 0)
        weak = near & (g > 150) & (r < 140) & (b < 140)
    else:
        spill = edge & (r > g + 25) & (b > g + 25)
        m = np.minimum(r, b)
        rgb[..., 0] = np.where(spill, np.minimum(r, g + (m - g) // 6), r)
        rgb[..., 2] = np.where(spill, np.minimum(b, g + (m - g) // 6), b)
        near = ndimage.binary_dilation(alpha == 0, iterations=1) & (alpha > 0)
        weak = near & (r > 150) & (b > 150) & (g < 140)
    alpha = np.where(weak, 0, alpha)
    return np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)


def split_1d(proj, n, min_gap=2):
    """1차원 투영에서 내용 구간을 n개로 나눈다. 넓은 빈 틈부터 고르고, 치우치면 균등 분할점 근처의 틈을 쓴다."""
    idx = np.nonzero(proj > 0)[0]
    if len(idx) == 0:
        return []
    lo, hi = idx.min(), idx.max() + 1
    gaps, run = [], None
    for x in range(lo, hi):
        if proj[x] == 0:
            run = x if run is None else run
        elif run is not None:
            if x - run >= min_gap:
                gaps.append((run, x))
            run = None
    if n <= 1:
        return [(lo, hi)]

    def segs(cuts):
        pts = [lo] + list(cuts) + [hi]
        return [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]

    def ok(sg):
        ws = [b - a for a, b in sg]
        return min(ws) > 0.45 * np.median(ws)

    by_width = sorted(gaps, key=lambda g: -(g[1] - g[0]))[: n - 1]
    cuts = sorted((a + b) // 2 for a, b in by_width)
    if len(cuts) == n - 1 and ok(segs(cuts)):
        return segs(cuts)
    cuts, W = [], hi - lo
    for i in range(1, n):
        target = lo + W * i / n
        cand = [((a + b) // 2) for a, b in gaps if abs((a + b) / 2 - target) < W / n * 0.45]
        if cand:
            cuts.append(min(cand, key=lambda c: abs(c - target)))
        else:
            w0, w1 = int(target - W / n * 0.3), int(target + W / n * 0.3)
            cuts.append(w0 + int(np.argmin(proj[w0:w1])))
    return segs(sorted(cuts))


def clean_mask(arr, min_size=30):
    mask = arr[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, np.nonzero(sizes >= min_size)[0] + 1)


def grid_boxes(arr, counts):
    """counts: 줄마다 프레임 수. [[(x0,y0,x1,y1), ...], ...]"""
    clean = clean_mask(arr)
    rows = split_1d(clean.sum(axis=1), len(counts), min_gap=3)
    out = []
    for (y0, y1), c in zip(rows, counts):
        cols = split_1d(clean[y0:y1].sum(axis=0), c, min_gap=2)
        out.append([(x0, y0, x1, y1) for x0, x1 in cols])
    return out, clean


def crop_box(arr, mask, b):
    x0, y0, x1, y1 = b
    sub = arr[y0:y1, x0:x1].copy()
    sub[..., 3] = np.where(mask[y0:y1, x0:x1], sub[..., 3], 0)
    ys, xs = np.nonzero(sub[..., 3] > 40)
    if len(ys):
        sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return sub


def foot_x(sub):
    """아래쪽 12% 줄의 불투명 픽셀 가운데 = 발밑 피벗 x"""
    a = sub[..., 3] > 100
    band = a[int(a.shape[0] * 0.88):]
    xs = np.nonzero(band)[1]
    if len(xs) == 0:
        xs = np.nonzero(a)[1]
    return float(np.median(xs))


def upscale(im, k):
    """정수배 확대(가장 가까운 이웃)."""
    return im.resize((im.width * k, im.height * k), Image.NEAREST)
