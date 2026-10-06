"""2026-10-06 승인한 v4 그림(장소 14·선녀 7·NPC 14·물건 8)의 승인 기록과 제품 검증.

python tools/rpg_v4_approved.py --install   승인 후보 바이트를 assets/world에 복사하고 승인 목록을 쓴다(처음 한 번).
python tools/rpg_v4_approved.py            제품 해시·크기·색·투명도·발 기준·근거 해시를 검증한다.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'tools/manifest_rpg_v4_approved.json'
RAW = ROOT / 'assets/raw/rpg-art-v4'
COUNTS = {'map': 14, 'npc': 21, 'prop': 8}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def sprite_of(entry):
    size = 384 if entry['kind'] == 'map' else 32
    return {'src': 'assets/world/' + entry['key'] + '.webp', 'width': size, 'height': 320 if entry['kind'] == 'map' else 32, 'frames': 1, 'rows': 1}


def install():
    if MANIFEST.exists():
        raise ValueError('이미 승인 목록이 있음. 승인된 버전은 덮어쓰지 않는다.')
    report = json.loads((RAW / 'manifest-v1.json').read_text(encoding='utf-8'))
    entries = []
    for e in report['entries']:
        product = ROOT / ('assets/world/' + e['key'] + '.webp')
        if product.exists():
            raise ValueError('제품 파일이 이미 있음: ' + product.name)
        shutil.copyfile(ROOT / e['candidate'], product)
        entries.append({'key': e['key'], 'kind': e['kind'], 'name': e['name'], 'approved_sha256': digest(product), 'candidate': e['candidate'],
                        'original': e['original'], 'original_sha256': e['original_sha256'], 'prompt': e['prompt'], 'prompt_sha256': digest(ROOT / e['prompt']),
                        'sprite': sprite_of(e)})
    reviews = {name: {'path': (RAW / 'review' / name).relative_to(ROOT).as_posix(), 'sha256': digest(RAW / 'review' / name)}
               for name in ['maps-review-v1.png', 'sprites-review-v1.png', 'bridge-fairies-review-v1.png']}
    data = {'version': 1, 'status': 'approved', 'approved_date': '2026-10-06',
            'approval': '사용자가 검토판 세 장(장소 14·선녀 7·NPC 14·물건 8)을 보고 모두 승인했다.',
            'generator': 'Codex CLI image_gen via tools/gen.ps1', 'processor': 'tools/process_rpg_v4.py',
            'entries': entries, 'reviews': reviews}
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('INSTALLED', len(entries))


def load():
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    counts = {k: sum(1 for e in data['entries'] if e['kind'] == k) for k in COUNTS}
    if data.get('status') != 'approved' or counts != COUNTS or len({e['key'] for e in data['entries']}) != sum(COUNTS.values()):
        raise ValueError('v4 승인 목록 불일치')
    return data


def verify(data=None, require_sources=False):
    data = data or load()
    for e in data['entries']:
        if e['sprite'] != sprite_of(e):
            raise ValueError('v4 승인 메타 불일치: ' + e['key'])
        path = ROOT / e['sprite']['src']
        image = Image.open(path)
        if path.read_bytes()[12:16] != b'VP8L' or digest(path) != e['approved_sha256']:
            raise ValueError('v4 무손실·승인 해시 불일치: ' + e['key'])
        if e['kind'] == 'map':
            if image.size != (384, 320) or len(image.convert('RGB').getcolors(1024) or []) > 32:
                raise ValueError('v4 장소 크기·색 불일치: ' + e['key'])
        else:
            rgba = image.convert('RGBA')
            if rgba.size != (32, 32) or len(rgba.getcolors(1024) or []) > 32 or rgba.getextrema()[3] != (0, 255) or rgba.getbbox()[3] != 32:
                raise ValueError('v4 칸·색·투명도·발 기준 불일치: ' + e['key'])
        for key in ['original', 'prompt']:
            source = ROOT / e[key]
            if require_sources and not source.is_file():
                raise ValueError('v4 승인 근거 누락: ' + e[key])
            if source.is_file() and digest(source) != e[key + '_sha256']:
                raise ValueError('v4 승인 근거 해시 불일치: ' + e[key])
        prompt = ROOT / e['prompt']
        if prompt.is_file() and not all(word in prompt.read_text(encoding='ascii') for word in ['NOTEXT', 'TANG']):
            raise ValueError('v4 생성 규칙 누락: ' + e['prompt'])
    for review in data['reviews'].values():
        path = ROOT / review['path']
        if require_sources and not path.is_file():
            raise ValueError('v4 검토판 누락: ' + review['path'])
        if path.is_file() and digest(path) != review['sha256']:
            raise ValueError('v4 검토판 해시 불일치: ' + review['path'])
    print('PASS approved v4: 14 maps, 21 NPC, 8 props, hashes, sizes, colors, transparency, feet, provenance')


if __name__ == '__main__':
    if '--install' in sys.argv:
        install()
    verify(require_sources=True)
