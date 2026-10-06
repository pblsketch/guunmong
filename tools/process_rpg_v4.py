"""v4 후보(장소 14·선녀 7·NPC 14·물건 8)를 assets/raw/rpg-art-v4/candidates에만 가공한다.

원본은 assets/raw/rpg-art-v4/originals의 생성 그림이다. 제품 assets/world에는 쓰지 않는다.
지도는 가운데 비율 자르기·면적 평균 축소·32색, 인물·물건은 크로마 키 제거·칸 분할·28px 축소·31색+투명·발 바닥 정렬이다.
사용: python tools/process_rpg_v4.py [--review]
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import pixlib as px  # noqa: E402

RAW = ROOT / 'assets/raw/rpg-art-v4'
ORIG, CAND, REVIEW = RAW / 'originals', RAW / 'candidates', RAW / 'review'
MAPS = ['map-tianjin', 'map-jeong-house', 'map-exam', 'map-hallim', 'map-chunun-room', 'map-hebei', 'map-gyeonghong-room',
        'map-bongnae', 'map-wonsu', 'map-yoyeon', 'map-bansagok', 'map-baekryong', 'map-seungsang', 'map-honrye']
ATLASES = {
    'fairies': ('green', [('npc-fairy-scarlet', '선녀 · 다홍 띠'), ('npc-fairy-ivory', '선녀 · 상아빛 띠'), ('npc-fairy-pink', '선녀 · 분홍 띠'),
                          ('npc-fairy-violet', '선녀 · 보라 띠'), ('npc-fairy-gold', '선녀 · 금빛 띠'), ('npc-fairy-navy', '선녀 · 남색 띠'),
                          ('npc-fairy-aqua', '선녀 · 물빛 띠')]),
    'npc-a': ('green', [('npc-hermit', '남전산 도인'), ('npc-singer', '계섬월'), ('npc-noble-lady', '발 너머 소저·정경패'), ('npc-white-robe', '흰 옷의 낯선 이·가춘운'),
                        ('npc-yeonwang', '연왕'), ('npc-jeoksaeng', '적생'), ('npc-gyeonghong', '적경홍')]),
    'npc-b': ('magenta', [('npc-general', '군대 앞 지휘관'), ('npc-assassin', '비수를 든 자객'), ('npc-yoyeon', '심요연'), ('npc-neungpa', '백능파'),
                          ('npc-old-monk', '남악의 늙은 스님'), ('npc-messenger', '소식을 전한 사람'), ('npc-chae', '진채봉')]),
    'props': ('magenta', [('prop-peach', '복숭아꽃'), ('prop-path', '길 표지'), ('prop-gate', '출입구'), ('prop-window', '창가'),
                          ('prop-willow', '버들'), ('prop-crane', '학'), ('prop-lantern', '석등'), ('prop-pool', '물길')]),
}
VERSION = 'v3'  # v1·v2는 이웃 칸 조각이 남아 보존만 한다.
KEYS = {'green': (0, 255, 0), 'magenta': (255, 0, 255)}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_new(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        old = Image.open(path).convert(image.mode)
        if old.size != image.size or old.tobytes() != image.tobytes():
            raise ValueError('다른 후보가 이미 있음(새 버전 이름 필요): ' + str(path))
        return
    px.save_webp(image, str(path))


def unkey(image, key):
    rgb = np.asarray(image.convert('RGB')).astype(np.int32)
    k = np.array(KEYS[key])
    dist = np.abs(rgb - k).sum(axis=2)
    if key == 'green':
        spill = (rgb[:, :, 1] > 160) & (rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2]) > 90)
    else:
        spill = (rgb[:, :, 0] > 160) & (rgb[:, :, 2] > 160) & (rgb[:, :, 1] < 110) & (np.abs(rgb[:, :, 0] - rgb[:, :, 2]) < 70)
    alpha = np.where((dist < 120) | spill, 0, 255).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(out, 'RGBA')


def keep_main(crop):
    """이웃 칸에서 넘어온 조각과 키 잔여 점을 지운다. 가장 큰 덩어리의 4% 미만인 덩어리는 버린다."""
    from scipy import ndimage
    arr = np.asarray(crop).copy()
    mask = arr[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        main = int(np.argmax(sizes)) + 1
        edge = set(np.unique(np.concatenate([lab[:, :3].ravel(), lab[:, -3:].ravel()]))) - {0, main}
        good = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.04 and i + 1 not in edge]
        keep = np.isin(lab, good)
        arr[..., 3] = np.where(keep, arr[..., 3], 0)
    return Image.fromarray(arr, 'RGBA')


def cell(crop, height):
    crop = keep_main(crop)
    box = crop.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
    if not box:
        raise ValueError('빈 칸')
    crop = crop.crop(box)
    factor = min(height / crop.width, height / crop.height)
    small = crop.resize((max(1, round(crop.width * factor)), max(1, round(crop.height * factor))), Image.Resampling.BOX)
    alpha = small.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    rgb = small.convert('RGB').quantize(colors=31, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    rgb.putalpha(alpha)
    tight = rgb.getbbox()
    if not tight:
        raise ValueError('축소 뒤 빈 칸')
    rgb = rgb.crop(tight)
    frame = Image.new('RGBA', (32, 32))
    foot = [x + 0.5 for y in range(max(0, rgb.height - 2), rgb.height) for x in range(rgb.width) if rgb.getpixel((x, y))[3]]
    left = round(16 - sum(foot) / len(foot))
    left = max(0, min(32 - rgb.width, left))
    frame.paste(rgb, (left, 32 - rgb.height))
    frame.putdata([(r, g, b, a) if a else (0, 0, 0, 0) for r, g, b, a in frame.get_flattened_data()])
    colors = len(frame.getcolors(1024) or [])
    if colors > 32 or frame.getbbox()[3] != 32:
        raise ValueError('색·발 기준 실패')
    return frame, list(box)


def main():
    report = {'status': 'unapproved', 'entries': []}
    for key in MAPS:
        src = ORIG / (key + '-v1.png')
        if not src.exists():
            print('MISSING', key); continue
        path = CAND / (key + '-v1.webp')
        if not path.exists():  # 32색 계산은 장마다 수십 초라 이미 가공한 후보는 다시 계산하지 않는다(덮어쓰기도 하지 않는다).
            im = Image.open(src).convert('RGB')
            write_new(px.quantize(px.box_resize(px.center_crop(im, 384 / 320), (384, 320))), path)
        report['entries'].append({'key': key, 'kind': 'map', 'name': key, 'original': src.relative_to(ROOT).as_posix(), 'original_sha256': digest(src),
                                  'prompt': 'tools/prompts/rpg_v4_' + key + '.txt', 'candidate': path.relative_to(ROOT).as_posix(), 'sha256': digest(path),
                                  'size': [384, 320], 'colors': px.count_colors(str(path))})
        print('UNAPPROVED', key, '384x320')
    green = Image.open(ROOT / 'assets/world/npc-fairy-green.webp').convert('RGBA')
    person_height = green.getbbox()[3] - green.getbbox()[1]
    for atlas, (key, names) in ATLASES.items():
        src = ORIG / (atlas + '-v1.png')
        if not src.exists():
            print('MISSING', atlas); continue
        im = unkey(Image.open(src), key)
        n = len(names)
        for i, (name, label) in enumerate(names):
            rect = (round(im.width * i / n), 0, round(im.width * (i + 1) / n), im.height)
            try:
                frame, box = cell(im.crop(rect), person_height if atlas != 'props' else 28)
            except ValueError as error:
                print('FAILED', name, error); continue
            path = CAND / (name + '-' + VERSION + '.webp'); write_new(frame, path)
            report['entries'].append({'key': name, 'kind': 'prop' if atlas == 'props' else 'npc', 'name': label, 'atlas': atlas,
                                      'original': src.relative_to(ROOT).as_posix(), 'original_sha256': digest(src), 'prompt': 'tools/prompts/rpg_v4_' + atlas + '.txt',
                                      'source_cell': list(rect), 'source_bbox': box, 'candidate': path.relative_to(ROOT).as_posix(), 'sha256': digest(path),
                                      'size': [32, 32], 'anchor': [16, 32], 'colors': len(frame.getcolors(1024) or [])})
            print('UNAPPROVED', name, '32x32')
    (RAW / 'manifest-v1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if '--review' in sys.argv:
        review(report)


def review(report):
    REVIEW.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(str(ROOT / 'tools/fonts_src/Galmuri11.ttf'), 16)
    maps = [e for e in report['entries'] if e['kind'] == 'map']
    sheet = Image.new('RGB', (4 * 784, ((len(maps) + 3) // 4) * 690), (238, 230, 214))
    d = ImageDraw.Draw(sheet)
    for i, e in enumerate(maps):
        x, y = (i % 4) * 784, (i // 4) * 690
        im = Image.open(ROOT / e['candidate']).convert('RGB').resize((768, 640), Image.Resampling.NEAREST)
        sheet.paste(im, (x + 8, y + 36)); d.text((x + 10, y + 8), e['key'] + ' · 2배', fill=(37, 33, 30), font=font)
    sheet.save(REVIEW / 'maps-review-v1.png')
    sprites = [e for e in report['entries'] if e['kind'] != 'map']
    sheet = Image.new('RGB', (8 * 190, ((len(sprites) + 7) // 8) * 230), (238, 230, 214))
    d = ImageDraw.Draw(sheet)
    for i, e in enumerate(sprites):
        x, y = (i % 8) * 190, (i // 8) * 230
        im = Image.open(ROOT / e['candidate']).convert('RGBA')
        bg = Image.new('RGBA', (128, 128), (198, 185, 159, 255)); bg.alpha_composite(im.resize((128, 128), Image.Resampling.NEAREST))
        sheet.paste(bg.convert('RGB'), (x + 30, y + 30)); sheet.paste(Image.alpha_composite(Image.new('RGBA', (32, 32), (198, 185, 159, 255)), im).convert('RGB'), (x + 160, y + 126))
        d.text((x + 8, y + 6), e['key'], fill=(37, 33, 30), font=font); d.text((x + 8, y + 168), e['name'], fill=(37, 33, 30), font=font)
    sheet.save(REVIEW / 'sprites-review-v1.png')
    bridge = Image.open(ROOT / 'assets/world/map-bridge.webp').convert('RGBA')
    fairies = [green] if (green := Image.open(ROOT / 'assets/world/npc-fairy-green.webp').convert('RGBA')) else []
    fairies += [Image.open(ROOT / e['candidate']).convert('RGBA') for e in sprites if e['key'].startswith('npc-fairy-')]
    spots = [(6, 3), (5, 0), (6, 0), (5, 1), (6, 1), (5, 2), (6, 2), (5, 3)]
    for im, (cx, cy) in zip(fairies, spots):
        bridge.alpha_composite(im, (cx * 32, cy * 32))
    seongjin = Image.open(ROOT / 'assets/world/walk-seongjin.webp').convert('RGBA').crop((0, 96, 32, 128))
    bridge.alpha_composite(seongjin, (6 * 32, 4 * 32 - 2))
    bridge.crop((96, 0, 288, 224)).resize((192 * 4, 224 * 4), Image.Resampling.NEAREST).save(REVIEW / 'bridge-fairies-review-v1.png')
    print('REVIEW', REVIEW.relative_to(ROOT).as_posix())


if __name__ == '__main__':
    main()
