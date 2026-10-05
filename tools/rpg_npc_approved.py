import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'tools/manifest_rpg_npcs_approved.json'
KEYS = {'npc-fairy-green', 'npc-yuk', 'npc-nurse'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load():
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if data.get('status') != 'approved' or {entry['key'] for entry in data['entries']} != KEYS or len(data['entries']) != 3:
        raise ValueError('NPC 승인 목록 불일치')
    return data


def verify(data=None, require_sources=False):
    data = data or load()
    for entry in data['entries']:
        sprite = entry['sprite']
        expected = {'src': 'assets/world/' + entry['key'] + '.webp', 'width': 32, 'height': 32, 'frames': 1, 'rows': 1}
        if sprite != expected:
            raise ValueError('NPC 승인 메타 불일치: ' + entry['key'])
        path = ROOT / sprite['src']
        image = Image.open(path).convert('RGBA')
        if image.size != (32, 32) or len(image.getcolors(1024) or []) > 32 or image.getextrema()[3] != (0, 255):
            raise ValueError('NPC 셀·색·투명도 불일치: ' + entry['key'])
        if image.getbbox()[3] != 32 or path.read_bytes()[12:16] != b'VP8L' or digest(path) != entry['approved_sha256']:
            raise ValueError('NPC 발·무손실·승인 해시 불일치: ' + entry['key'])
    for key in ['source', 'prompt', 'review']:
        path = ROOT / data[key]['path']
        if require_sources and not path.is_file():
            raise ValueError('NPC 승인 근거 누락: ' + key)
        if path.is_file() and digest(path) != data[key]['sha256']:
            raise ValueError('NPC 승인 근거 해시 불일치: ' + key)
    prompt = ROOT / data['prompt']['path']
    if prompt.is_file():
        value = prompt.read_text(encoding='ascii')
        if 'NOTEXT' not in value or 'TANG' not in value:
            raise ValueError('NPC 생성 규칙 누락')
    print('PASS approved NPC: 3 hashes, 32px, 32 colors, transparency, lossless, provenance')


if __name__ == '__main__':
    verify(require_sources=True)
