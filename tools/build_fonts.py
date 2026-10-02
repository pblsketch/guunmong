# -*- coding: utf-8 -*-
"""게임에 쓰인 글자만 남긴 부분 글꼴(woff2)을 만든다.

    python tools/build_fonts.py

원본 글꼴(모두 SIL Open Font License 1.1)은 tools/fonts_src/에 둔다(저장소에는 올리지 않음).
없으면 아래 주소에서 내려받는다.
  - Galmuri11.ttf      갈무리(도트 글꼴)  https://github.com/quiple/galmuri
  - NotoSerifKR-VF.ttf  Noto Serif KR      https://github.com/google/fonts/tree/main/ofl/notoserifkr
글이나 데이터를 고쳐 새 글자가 생겼다면 이 스크립트를 다시 돌리세요.

만드는 글꼴(css/style.css의 @font-face와 이름이 같다)
  - assets/fonts/galmuri.woff2               제목·단추·말판 이름(GuunPixel)
  - assets/fonts/noto-serif-kr.woff2         본문·풀이(GuunSerif)
  - assets/fonts/noto-serif-cjk-kr-old.woff2 한문 회목·한자(GuunOld). Noto Serif KR의 한자 부분에서 만든다
OFL은 고친 글꼴(부분 글꼴 포함)에 원래 이름을 그대로 쓰지 않게 하므로 글꼴 이름을 Guun…으로 바꾼다.
"""
import os, glob, sys, urllib.request, shutil
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts_src')
OUT = os.path.join(ROOT, 'assets', 'fonts')
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

URLS = {
    'Galmuri11.ttf': 'https://github.com/quiple/galmuri/raw/main/dist/Galmuri11.ttf',
    'OFL-Galmuri.txt': 'https://raw.githubusercontent.com/quiple/galmuri/main/ofl.md',
    'NotoSerifKR-VF.ttf': 'https://github.com/google/fonts/raw/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf',
    'OFL-NotoSerifKR.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/OFL.txt',
}
for name, url in URLS.items():
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        print('내려받는 중', name)
        urllib.request.urlretrieve(url, p)


def used_chars():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    files = glob.glob(os.path.join(ROOT, 'js', '**', '*.js'), recursive=True)
    files += [os.path.join(ROOT, 'index.html'), os.path.join(ROOT, 'manifest.webmanifest')]
    for f in files:
        if os.path.exists(f):
            with open(f, encoding='utf-8') as fh:
                chars |= set(fh.read())
    chars |= set('→←↑↓·…「」『』〔〕《》“”‘’―○●◇◆☆★')
    return ''.join(sorted(c for c in chars if c >= ' '))


def is_han(c):
    o = ord(c)
    return 0x3400 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or 0x20000 <= o <= 0x2FFFF


def rename(font, family):
    for rec in font['name'].names:
        if rec.nameID in (1, 4, 16, 21):
            rec.string = family
        elif rec.nameID == 6:
            rec.string = family.replace(' ', '')
        elif rec.nameID == 3:
            rec.string = family.replace(' ', '') + ';subset'


def build(src, out, text, family, weight=None):
    font = TTFont(src)
    if weight and 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': weight})
    cmap = font.getBestCmap()
    missing = [c for c in text if ord(c) not in cmap and c.strip()]
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    rename(font, family)
    font.flavor = 'woff2'
    font.save(out)
    print(f'{os.path.basename(out)}: 글자 {len(text)}개, {os.path.getsize(out) // 1024}KB, 글꼴에 없는 글자 {len(missing)}개'
          + (f' ({"".join(missing[:40])})' if missing else ''))
    return missing


text = used_chars()
han = ''.join(c for c in text if is_han(c))
build(os.path.join(SRC, 'Galmuri11.ttf'), os.path.join(OUT, 'galmuri.woff2'), text, 'GuunPixel')
build(os.path.join(SRC, 'NotoSerifKR-VF.ttf'), os.path.join(OUT, 'noto-serif-kr.woff2'), text, 'GuunSerif', weight=500)
build(os.path.join(SRC, 'NotoSerifKR-VF.ttf'), os.path.join(OUT, 'noto-serif-cjk-kr-old.woff2'),
      han + '·「」()0123456789 ', 'GuunOld', weight=500)
# 라이선스 전문(OFL은 글꼴과 함께 라이선스를 배포하도록 요구한다)
with open(os.path.join(OUT, 'OFL.txt'), 'w', encoding='utf-8') as f:
    for n in ('OFL-Galmuri.txt', 'OFL-NotoSerifKR.txt'):
        f.write(f'===== {n[4:-4]} =====\n')
        f.write(open(os.path.join(SRC, n), encoding='utf-8').read().strip() + '\n\n')
print('assets/fonts/OFL.txt 씀')
