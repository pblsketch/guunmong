"""승인한 여도사 차림 걷기 원본·제품·20프레임을 검증한다."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
import process_topdown_candidates as pipeline

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'tools/manifest_rpg_disguise_approved.json'
def check(require_sources=False):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8-sig'))
    assert manifest['status'] == 'approved' and manifest['approved_date'] == '2026-10-05'
    file = ROOT / manifest['product']
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest(file) == manifest['candidate_sha'], 'Approved product differs.'
    image = Image.open(file).convert('RGBA')
    assert file.read_bytes()[12:16] == b'VP8L', 'Lossless WebP required.'
    reports = pipeline.validate_sheet(image,manifest['entry'])
    assert set(np.array(image)[...,3].flatten()) <= {0,255}, 'Binary transparency required.'
    source = ROOT / manifest['entry']['original']
    if require_sources or source.exists():
        assert digest(source) == manifest['source_sha']
        base = source.parent.parent
        assert digest(base/'source/prompt.txt') == manifest['prompt_sha']
        assert digest(base/'review/walk-review-v2.png') == manifest['review_sha']
    for path, value in manifest['references'].items(): assert digest(ROOT/path) == value
    return len(reports)
if __name__ == '__main__':
    print('PASS approved disguise: '+str(check(True))+' frames, exact hashes, 32px, feet16/30, lossless, binary alpha, provenance')
