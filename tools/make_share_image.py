"""링크 공유 썸네일(카카오톡·문자·SNS 미리 보기) 만들기.

승인된 돌다리 장면 그림(assets/sc/sc_bridge.webp)을 1200x630으로 키우고, 게임 부분 글꼴(SIL OFL)로 제목을 얹는다.
새로 그린 그림이 아니라 이미 쓰는 그림과 글꼴만 쓴다. 장면 그림이나 제목이 바뀌면 다시 돌린다.

사용: python tools/make_share_image.py   → assets/ui/share.png
"""
import io, os, tempfile
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
TITLE, SUB = '구운몽: 한바탕 꿈', '김만중 「구운몽」 속을 걸으며 성진의 한평생을 따라가는 학습 게임'


UNPACKED = {}


def font(name, size):
    # 부분 글꼴(woff2)을 임시 TTF로 한 번만 풀어 쓴다(Windows는 열린 글꼴 파일을 덮어쓰지 못한다).
    # 제목 글자가 부분 글꼴에 없으면 멈춘다.
    if name in UNPACKED:
        return ImageFont.truetype(UNPACKED[name], size)
    f = TTFont(os.path.join(ROOT, 'assets', 'fonts', name + '.woff2'))
    f.flavor = None
    cmap = f.getBestCmap()
    missing = [c for c in TITLE + SUB if c != ' ' and ord(c) not in cmap]
    if missing:
        raise SystemExit('부분 글꼴에 없는 글자: ' + ''.join(missing) + ' → python tools/build_fonts.py 먼저')
    path = os.path.join(tempfile.gettempdir(), 'guun-share-' + name + '.ttf')
    f.save(path)
    UNPACKED[name] = path
    return ImageFont.truetype(path, size)


def main():
    art = Image.open(os.path.join(ROOT, 'assets', 'sc', 'sc_bridge.webp')).convert('RGB')
    # 480x270 → 1200x675(최근접, 픽셀 그림 그대로) → 위 15·아래 30을 잘라 630.
    art = art.resize((W, art.height * W // art.width), Image.NEAREST).crop((0, 15, W, 15 + H))
    shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(shade)
    for y in range(H - 190, H):  # 아래쪽을 서서히 어둡게 해 글자를 읽히게
        d.line([(0, y), (W, y)], fill=(20, 18, 14, int(205 * (y - (H - 190)) / 190)))
    img = Image.alpha_composite(art.convert('RGBA'), shade)
    d = ImageDraw.Draw(img)
    title, sub = font('noto-serif-kr', 74), font('noto-serif-kr', 30)
    for dx, dy in [(3, 3), (2, 2)]:
        d.text((56 + dx, H - 158 + dy), TITLE, font=title, fill=(0, 0, 0, 255))
    d.text((56, H - 158), TITLE, font=title, fill=(255, 248, 231, 255))
    d.text((60, H - 66), SUB, font=sub, fill=(239, 227, 198, 255))
    out = os.path.join(ROOT, 'assets', 'ui', 'share.png')
    img.convert('RGB').save(out, optimize=True)
    print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
