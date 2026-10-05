"""승인된 여덟 파일의 바이트 복사와 키트 칸 분리·검사. 생성·재가공 없음."""
import argparse
import hashlib
import io
import json
from pathlib import Path

from PIL import Image

import pixlib as px
from process_topdown_candidates import validate_sheet

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'tools/manifest_topdown_approved.json'
SELECTED={
    'map-bridge':'map-bridge-v1.webp','map-cell':'map-cell-v2.webp',
    'map-huayin':'map-huayin-v2.webp','map-chwimi':'map-chwimi-v1.webp',
    'walk-seongjin':'walk-seongjin-v1.webp','walk-yang-scholar':'walk-yang-scholar-v1.webp',
    'walk-yang-chancellor':'walk-yang-chancellor-v2.webp','kit-room':'kit-room-v2.webp'
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load():
    return json.loads(MANIFEST.read_text(encoding='utf-8'))


def validate_manifest(spec):
    if spec['status']!='approved' or len(spec['entries'])!=8 or {e['key'] for e in spec['entries']}!=set(SELECTED):
        raise ValueError('approved selection must contain exactly eight reviewed keys')
    keys=set()
    for e in spec['entries']:
        if e['candidate']!='assets/raw/topdown-v3/candidates/'+SELECTED[e['key']]:
            raise ValueError('superseded or unreviewed candidate')
        if e['sprite']['src']!='assets/world/'+e['key']+'.webp':
            raise ValueError('product path mismatch')
        keys.add(e['key'])
        if e['size']!=[e['sprite']['width']*e['sprite']['frames'],e['sprite']['height']*e['sprite']['rows']]:
            raise ValueError('sprite cell/frame size mismatch')
        if e['kind']=='walk':
            from process_topdown_candidates import validate_metadata
            validate_metadata(dict(kind='walk',width=e['size'][0],height=e['size'][1],**{k:e['sprite'][k] for k in ['frames','rows','cell','anchor','directions']}))
            expected={d:dict(row=i,stand=0,walk=[1,2,3,4]) for i,d in enumerate(['down','left','right','up'])}
            if e['sprite']['directions']!=expected:raise ValueError('reviewed direction order changed')
    if len(spec['derived'])!=8:raise ValueError('eight kit crops required')
    kit=next(e for e in spec['entries'] if e['key']=='kit-room')
    for i,e in enumerate(spec['derived']):
        if e['key']!='prop-'+kit['sprite']['frameKeys'][i] or e['key'] in keys:
            raise ValueError('kit frame key mismatch')
        if e['source']!='kit-room' or e['source_sha256']!=kit['approved_sha256']:
            raise ValueError('unapproved crop source')
        if e['crop']!=[(i%4)*32,(i//4)*32,(i%4+1)*32,(i//4+1)*32]:
            raise ValueError('crop coordinates mismatch')
        if e['sprite']!=dict(src='assets/world/'+e['key']+'.webp',width=32,height=32,frames=1,rows=1):
            raise ValueError('crop sprite mismatch')
        keys.add(e['key'])


def write_preserved(path,data):
    if path.exists():
        if path.read_bytes()!=data:raise ValueError('refusing to overwrite changed product: '+str(path))
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)


def install(spec):
    validate_manifest(spec)
    # 일부 복사 뒤 승인 불일치가 드러나지 않도록 모든 소스를 먼저 검사한다.
    for e in spec['entries']:
        if digest((ROOT/e['candidate']).read_bytes())!=e['approved_sha256']:
            raise ValueError('approved candidate bytes changed: '+e['key'])
    if digest((ROOT/spec['review']['path']).read_bytes())!=spec['review']['sha256']:
        raise ValueError('review sheet changed')
    for e in spec['entries']:write_preserved(ROOT/e['sprite']['src'],(ROOT/e['candidate']).read_bytes())
    kit=next(e for e in spec['entries'] if e['key']=='kit-room')
    image=Image.open(ROOT/kit['sprite']['src']).convert('RGBA')
    for e in spec['derived']:
        crop=image.crop(e['crop'])
        if digest(crop.tobytes())!=e['pixel_sha256']:raise ValueError('approved crop pixels changed')
        buf=io.BytesIO();crop.save(buf,'WEBP',lossless=True,quality=100,method=6,exact=True)
        if digest(buf.getvalue())!=e['approved_sha256']:raise ValueError('crop encoding hash mismatch')
        write_preserved(ROOT/e['sprite']['src'],buf.getvalue())
    print('INSTALLED 8 byte-identical approved files + 8 pixel-identical kit crops')


def verify(spec,require_sources=False):
    validate_manifest(spec)
    for e in spec['entries']+spec['derived']:
        path=ROOT/e['sprite']['src'];data=path.read_bytes()
        if digest(data)!=e['approved_sha256']:raise ValueError('approved product hash mismatch: '+e['key'])
        with Image.open(io.BytesIO(data)) as opened:im=opened.copy()
        size=(e['sprite']['width']*e['sprite']['frames'],e['sprite']['height']*e['sprite']['rows'])
        if im.size!=size or px.count_colors(im)>32 or data[12:16]!=b'VP8L':
            raise ValueError('size/palette/lossless mismatch: '+e['key'])
        if e.get('kind')=='walk':
            s=e['sprite'];validate_sheet(im,dict(kind='walk',width=size[0],height=size[1],**{k:s[k] for k in ['frames','rows','cell','anchor','directions']}))
        if 'candidate' in e:
            for field,hashfield in [('candidate','approved_sha256'),('original','original_sha256'),('prompt','prompt_sha256'),('reference','reference_sha256')]:
                source=ROOT/e[field]
                if (require_sources or source.exists()) and digest(source.read_bytes())!=e[hashfield]:
                    raise ValueError('provenance mismatch: '+e['key']+' '+field)
        else:
            source=ROOT/next(x for x in spec['entries'] if x['key']==e['source'])['sprite']['src']
            expected=Image.open(source).convert('RGBA').crop(e['crop']).tobytes()
            if im.convert('RGBA').tobytes()!=expected or digest(expected)!=e['pixel_sha256']:
                raise ValueError('kit crop pixels differ: '+e['key'])
    review=ROOT/spec['review']['path']
    if (require_sources or review.exists()) and digest(review.read_bytes())!=spec['review']['sha256']:
        raise ValueError('review provenance mismatch')
    print('PASS approved topdown: 8 exact hashes, 8 exact crops, 60 walk frames, metadata and provenance')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--install',action='store_true');parser.add_argument('--require-sources',action='store_true')
    args=parser.parse_args();spec=load()
    if args.install:install(spec)
    verify(spec,args.require_sources)


if __name__=='__main__':main()
