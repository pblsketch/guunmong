import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KEYS = [('npc-fairy-green', '선녀'), ('npc-yuk', '육관대사'), ('npc-nurse', '유모')]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path.with_suffix('.pending.webp'), lossless=True, method=6)
    pending = path.with_suffix('.pending.webp')
    if path.exists() and digest(path) != digest(pending):
        raise ValueError('다른 후보가 이미 있음: ' + str(path))
    if not path.exists():
        pending.replace(path)
    else:
        pending.unlink()


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/raw/rpg-npc-v1')
    parser.add_argument('--version', type=int, default=1)
    args = parser.parse_args()
    if args.version < 1:
        raise ValueError('후보 버전은 양의 정수')
    out = args.output.resolve()
    if not out.is_relative_to((ROOT / 'assets/raw').resolve()):
        raise ValueError('후보는 assets/raw 아래에만 씀')
    manifest_path = out / ('manifest-v' + str(args.version) + '.json')
    if manifest_path.exists() and json.loads(manifest_path.read_text(encoding='utf-8')).get('status') == 'approved':
        raise ValueError('승인 기록 덮어쓰기 금지')
    source = Image.open(args.source).convert('RGBA')
    if source.getextrema()[3][0] != 0:
        raise ValueError('투명 원본이 아님')
    results = []
    for index, (key, name) in enumerate(KEYS):
        rect = (round(source.width * index / 3), 0, round(source.width * (index + 1) / 3), source.height)
        crop = source.crop(rect)
        box = crop.getchannel('A').point(lambda value: 255 if value >= 16 else 0).getbbox()
        if not box:
            raise ValueError('빈 인물 셀: ' + key)
        crop = crop.crop(box)
        factor = min(28 / crop.width, 28 / crop.height)
        small = crop.resize((max(1, round(crop.width * factor)), max(1, round(crop.height * factor))), Image.Resampling.BOX)
        alpha = small.getchannel('A').point(lambda value: 255 if value >= 128 else 0)
        rgb = small.convert('RGB').quantize(colors=31, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
        rgb.putalpha(alpha)
        tight = rgb.getbbox()
        if not tight:
            raise ValueError('축소 후 빈 인물: ' + key)
        rgb = rgb.crop(tight)
        frame = Image.new('RGBA', (32, 32))
        foot = [x + 0.5 for y in range(max(0, rgb.height - 2), rgb.height) for x in range(rgb.width) if rgb.getpixel((x, y))[3]]
        left = round(16 - sum(foot) / len(foot))
        if left < 0 or left + rgb.width > 32:
            raise ValueError('발 정렬이 셀을 벗어남: ' + key)
        frame.paste(rgb, (left, 32 - rgb.height))
        frame.putdata([(r, g, b, a) if a else (0, 0, 0, 0) for r, g, b, a in frame.get_flattened_data()])
        colors = len(frame.getcolors(1024) or [])
        if colors > 32 or frame.getbbox()[3] != 32:
            raise ValueError('색·발 기준 실패: ' + key)
        path = out / 'candidates' / (key + '-v' + str(args.version) + '.webp')
        write_new(frame, path)
        results.append({'key': key, 'name': name, 'candidate': path.relative_to(ROOT).as_posix(), 'sha256': digest(path),
                        'source_cell': list(rect), 'source_bbox': list(box), 'size': [32, 32], 'colors': colors,
                        'anchor': [16, 32], 'status': 'unapproved'})
    font = ImageFont.truetype(str(ROOT / 'tools/fonts_src/Galmuri11.ttf'), 20)
    small_font = ImageFont.truetype(str(ROOT / 'tools/fonts_src/Galmuri11.ttf'), 15)
    sheet = Image.new('RGB', (760, 510), '#e9dfc8')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 18), '필드 NPC 전신 후보 · 승인 전', font=font, fill='#302b23')
    draw.text((24, 50), '왼쪽부터 실제 32px 셀 · 2배 · 3배 · 4배 표시', font=small_font, fill='#514338')
    player = Image.open(ROOT / 'assets/world/walk-seongjin.webp').convert('RGBA').crop((0, 0, 32, 32))
    for i, item in enumerate(results):
        y = 105 + i * 130
        draw.text((24, y + 18), item['name'], font=font, fill='#302b23')
        sprite = Image.open(ROOT / item['candidate']).convert('RGBA')
        for scale, x in [(1, 150), (2, 220), (3, 340), (4, 490)]:
            rendered = sprite.resize((32 * scale, 32 * scale), Image.Resampling.NEAREST)
            sheet.paste(rendered, (x, y + 112 - rendered.height), rendered)
        reference = player.resize((64, 64), Image.Resampling.NEAREST)
        sheet.paste(reference, (665, y + 112 - 64), reference)
    draw.text((630, 488), '기존 성진과 비교', font=small_font, fill='#514338')
    review = out / 'review' / ('npc-review-v' + str(args.version) + '.png')
    review.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(review)
    manifest = {'version': 1, 'status': 'unapproved', 'generator': 'builtin image_gen',
                'source': args.source.resolve().relative_to(ROOT).as_posix(), 'source_sha256': digest(args.source),
                'source_size': list(source.size), 'review': review.relative_to(ROOT).as_posix(),
                'review_sha256': digest(review), 'entries': results}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('후보 3개: 32px·32색 이하·투명·무손실·발 기준 확인')
    print(review.relative_to(ROOT).as_posix())


if __name__ == '__main__':
    main()
