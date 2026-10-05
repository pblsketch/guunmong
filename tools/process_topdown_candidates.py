"""승인 전 탑다운 원본을 가공한다. 제품 자산에는 쓰지 않는다."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import pixlib as px

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "tools/manifest_topdown_v3.json"


def validate_metadata(entry):
    for field in ["width", "height", "frames", "rows"]:
        if type(entry[field]) is not int or entry[field] <= 0:
            raise ValueError(f"invalid {field}")
    if (entry["width"],entry["height"]) != (32*entry["frames"],32*entry["rows"]):
        raise ValueError("sheet dimensions do not match 32px cells")
    if entry["kind"] == "walk":
        if entry["cell"] != dict(width=32, height=32) or entry["anchor"] != dict(x=16, y=30):
            raise ValueError("walk cell/anchor must be 32px and 16,30")
        if set(entry["directions"]) != {"up","down","left","right"}:
            raise ValueError("four directions required")
        if len({v["row"] for v in entry["directions"].values()}) != 4:
            raise ValueError("direction rows must be distinct")
        for direction in entry["directions"].values():
            if type(direction["row"]) is not int or not 0 <= direction["row"] < entry["rows"]:
                raise ValueError("direction row out of range")
            indices = [direction["stand"]] + direction["walk"]
            if len(direction["walk"]) != 4 or len(set(indices)) != len(indices):
                raise ValueError("one stand and four separate walk indices required")
            if any(type(i) is not int or not 0 <= i < entry["frames"] for i in indices):
                raise ValueError("frame index out of range")


def validate_sheet(im, entry):
    validate_metadata(entry)
    if im.size != (entry["width"],entry["height"]):
        raise ValueError("actual sheet size differs from metadata")
    if px.count_colors(im) > 32:
        raise ValueError("palette exceeds 32")
    reports = []
    for row in range(entry["rows"]):
        frames = []
        for col in range(entry["frames"]):
            frame = im.crop((col*32,row*32,(col+1)*32,(row+1)*32)).convert("RGBA")
            box = frame.getbbox()
            if row*entry["frames"]+col in entry.get("tileFrames",[]):
                if box != (0,0,32,32) or np.any(np.array(frame)[...,3] != 255):
                    raise ValueError("floor tile must fill its entire 32px cell")
                reports.append(dict(row=row,frame=col,bbox=list(box),tile=True))
                continue
            if not box or box[0] <= 0 or box[1] <= 0 or box[2] >= 32 or box[3] >= 32:
                raise ValueError(f"empty/clipped frame {row}:{col}")
            foot = px.foot_x(np.array(frame))
            if entry["kind"] == "walk" and (box[3] != 31 or abs(foot-16) > 1):
                raise ValueError(f"foot drift {row}:{col}: x={foot}, bottom={box[3]-1}")
            frames.append(frame.tobytes())
            reports.append(dict(row=row,frame=col,bbox=list(box),footX=foot,footY=box[3]-1))
        if entry["kind"] == "walk" and len(set(frames[1:])) < 3:
            raise ValueError(f"walk frames lack visible changes in row {row}")
    return reports


def fit_frames(rows, entry):
    if len(rows) != entry["rows"] or any(len(row) != entry["frames"] for row in rows):
        raise ValueError("extracted frame count differs from metadata")
    if entry["kind"] == "walk":
        scale = 28 / rows[0][0].height
    else:
        scale = 28 / max(max(f.size) for row in rows for f in row)
    out = Image.new("RGBA", (entry["width"],entry["height"]), (0,0,0,0))
    for ri,row in enumerate(rows):
        for ci,frame in enumerate(row):
            if ri*entry["frames"]+ci in entry.get("tileFrames",[]):
                out.alpha_composite(px.box_resize(frame,(32,32)),(ci*32,ri*32))
                continue
            small = px.box_resize(frame,(max(1,round(frame.width*scale)),max(1,round(frame.height*scale))))
            if not small.getbbox():
                raise ValueError("frame vanished during downscale")
            small = small.crop(small.getbbox())
            y = 31-small.height
            if entry["kind"] == "walk":
                # 최종 32px 셀의 발 띠로 정렬해야 축소 전/후 띠 차이로 2px 흔들리지 않는다.
                band = np.array(small)[max(0,28-y):]
                xs = np.nonzero(band[...,3]>100)[1]
                if not len(xs): raise ValueError("no foot pixels after resize")
                x = round(16-float(np.median(xs)))
            else:
                x = (32-small.width)//2
            if x <= 0 or y <= 0 or x+small.width >= 32:
                raise ValueError(f"clipped frame {ri}:{ci}: {small.size} at {x},{y}; regenerate source")
            out.alpha_composite(small,(ci*32+x,ri*32+y))
    return px.quantize(out)


def extract(entry):
    name = str(Path(entry["original"]).relative_to("assets/raw").with_suffix("")).replace("\\","/")
    arr = px.load_keyed(name, entry["chroma"])
    boxes,clean = px.grid_boxes(arr,[entry["frames"]]*entry["rows"])
    if len(boxes) != entry["rows"] or any(len(row) != entry["frames"] for row in boxes):
        raise ValueError("source frame count mismatch")
    for ri,row in enumerate(boxes):
        for ci,box in enumerate(row):
            x0,y0,x1,y1 = box
            if ci and np.any(clean[y0:y1,max(0,x0-1):x0+1]):
                raise ValueError(f"source frames overlap at {ri}:{ci}")
        if ri and np.any(clean[max(0,row[0][1]-1):row[0][1]+1]):
            raise ValueError("source rows overlap")
    if entry["kind"] == "walk":
        source = entry.get("sourceDirections",["down","left","right","up"])
        if set(source) != {"down","left","right","up"} or len(source) != 4:
            raise ValueError("invalid inspected source direction order")
        boxes = [boxes[source.index(d)] for d in ["down","left","right","up"]]
    frames = [[Image.fromarray(px.crop_box(arr,clean,box),"RGBA") for box in row] for row in boxes]
    return frames,boxes


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_candidate(entry):
    path = ROOT / entry["candidate"]
    im = Image.open(path)
    if im.size != (entry["width"],entry["height"]) or px.count_colors(im) > 32:
        raise ValueError(f"{entry['id']}: size/palette failure")
    if path.read_bytes()[12:16] != b"VP8L":
        raise ValueError("candidate must be lossless WebP")
    if entry["kind"] == "map" and (entry["tile"] != 32 or im.width % 32 or im.height % 32):
        raise ValueError("map dimensions must be whole 32px tiles")
    frames = validate_sheet(im,entry) if entry["kind"] != "map" else []
    return dict(id=entry["id"],status="unapproved",original=entry["original"],candidate=entry["candidate"],
                originalSize=list(Image.open(ROOT / entry["original"]).size),
                actualSize=list(im.size),colors=px.count_colors(im),sha256=sha(path),
                originalSha256=sha(ROOT / entry["original"]),frames=frames,
                metadata={k:v for k,v in entry.items() if k in ["width","height","frames","rows","cell","anchor","directions","tile","sourceDirections","tileFrames","frameKeys"]})


def process(entry):
    source = ROOT / entry["original"]
    if not source.is_file(): raise ValueError(f"missing original: {source}")
    if entry["kind"] == "map":
        im = Image.open(source).convert("RGB")
        cropped = px.center_crop(im,entry["width"]/entry["height"])
        im = px.quantize(px.box_resize(cropped,(entry["width"],entry["height"])))
        boxes = None
    else:
        frames,boxes = extract(entry)
        im = fit_frames(frames,entry)
        validate_sheet(im,entry)
    target = ROOT / entry["candidate"]
    if target.exists():
        old = Image.open(target).convert(im.mode)
        if old.size != im.size or old.tobytes() != im.tobytes():
            raise ValueError("existing candidate differs; choose a new versioned name")
    else:
        px.save_webp(im,str(target))
    report = check_candidate(entry)
    report["sourceBoxes"] = [[[int(v) for v in box] for box in row] for row in boxes] if boxes else None
    print(f"UNAPPROVED {entry['id']} {im.width}x{im.height} colors={report['colors']} frames={len(report['frames'])}", flush=True)
    return report


def review(manifest):
    base = ROOT / manifest["base"]
    out = base / "review"
    out.mkdir(parents=True,exist_ok=True)
    fontpath = Path("C:/Windows/Fonts/malgun.ttf")
    font = ImageFont.truetype(str(fontpath),20) if fontpath.exists() else ImageFont.load_default()
    smallfont = ImageFont.truetype(str(fontpath),14) if fontpath.exists() else ImageFont.load_default()
    board = Image.new("RGB",(1600,1750),"#eee6d6")
    draw = ImageDraw.Draw(board)
    draw.text((20,15),"승인 전 후보 · 32px 월드 · 발 기준 (16,30) · 제품 반영 없음",font=font,fill="#222222")
    names = {"map-bridge":"돌다리","map-cell":"공유 선방","map-huayin":"화음현","map-chwimi":"취미궁",
             "walk-seongjin":"성진","walk-yang-scholar":"양소유 · 선비복","walk-yang-chancellor":"양소유 · 승상복","kit-room":"재사용 바닥·벽·가구"}
    maps = [e for e in manifest["assets"] if e["kind"] == "map"]
    for i,e in enumerate(maps):
        x = 20+(i%2)*790; y=65+(i//2)*400
        draw.text((x,y),names[e["id"]]+" · 390px 창 / 그림 384×320 1배",font=font,fill="#222222")
        draw.rectangle((x,y+35,x+389,y+365),fill="#d1c4ad")
        board.paste(Image.open(ROOT/e["candidate"]).convert("RGB"),(x+3,y+40))
        draw.text((x+407,y+45),"인물 없는 새 탑다운",font=smallfont,fill="#222222")
        draw.text((x+407,y+75),"동적 인물·소품 분리",font=smallfont,fill="#222222")
    for i,e in enumerate([e for e in manifest["assets"] if e["kind"] != "map"]):
        x=20+(i%2)*790; y=880+(i//2)*400
        draw.text((x,y),names[e["id"]]+" · 원래 크기 / 2배 / 첫 칸 4배",font=font,fill="#222222")
        im=Image.open(ROOT/e["candidate"]).convert("RGBA")
        board.paste(im,(x,y+40),im)
        big=px.upscale(im,2); board.paste(big,(x+180,y+40),big)
        first=px.upscale(im.crop((0,0,32,32)),4); board.paste(first,(x+530,y+40),first)
        draw.line((x+530+64,y+40+116,x+530+64,y+40+128),fill="#ba392b",width=2)
        draw.text((x,y+310),"행: 아래/왼쪽/오른쪽/위 · 열: 서기 + 걷기 4칸" if e["kind"]=="walk" else "바닥 2종 · 벽 2종 · 방석/탁자/의자/상자",font=smallfont,fill="#222222")
    board.save(out/"contact-sheet-v1.png")
    cell=next(e for e in manifest["assets"] if e["id"]=="map-cell")
    kit=next(e for e in manifest["assets"] if e["id"]=="kit-room")
    actor=next(e for e in manifest["assets"] if e["id"]=="walk-seongjin")
    comparison=Image.new("RGB",(800,390),"#eee6d6")
    cd=ImageDraw.Draw(comparison)
    for i,title in enumerate(["처음 선방 · 같은 맵/방석/출구","마지막 선방 · 같은 맵/방석/출구"]):
        cd.text((i*400+3,8),title,font=smallfont,fill="#222222")
        room=Image.open(ROOT/cell["candidate"]).convert("RGBA")
        cushion=Image.open(ROOT/kit["candidate"]).crop((0,32,32,64)).convert("RGBA")
        stand=Image.open(ROOT/actor["candidate"]).crop((0,0,32,32)).convert("RGBA")
        room.alpha_composite(cushion,(192,160));room.alpha_composite(stand,(160,192))
        comparison.paste(room,(i*400+3,40),room)
    comparison.save(out/"shared-cell-comparison-v1.png")
    payload=json.dumps([dict(id=e["id"],kind=e["kind"],src="../candidates/"+Path(e["candidate"]).name,
                            name=names[e["id"]],width=e["width"],height=e["height"],rows=e.get("rows"),frames=e.get("frames")) for e in manifest["assets"]],ensure_ascii=False)
    html = """<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>탑다운 승인 전 후보</title><style>body{margin:0;background:#eee6d6;color:#25211e;font:16px system-ui}main{max-width:1580px;margin:auto;padding:12px}h1{font-size:24px}h2{font-size:18px}section{padding:12px 0;border-bottom:1px solid #776a59}img,canvas{image-rendering:pixelated}canvas{background:#c6b99f}.maps,.actors{display:flex;flex-wrap:wrap;gap:16px}.phone{width:390px;max-width:100%;background:#d1c4ad}.viewport{width:100%;overflow:auto;box-sizing:border-box;padding:3px}.scene{position:relative;width:384px;height:320px}.scene img{width:384px;height:320px;display:block}.scene canvas{position:absolute;background:transparent;left:176px;top:190px}.scales{display:flex;gap:12px;align-items:start;flex-wrap:wrap}.row{display:flex;gap:8px;align-items:center}button{font:inherit;padding:8px}p{line-height:1.6}</style>
<main><h1>승인 전 탑다운 후보</h1><p>새 그림 승인 대기. 제품 자산과 저장 기록을 사용하지 않는 검토판입니다. 32px 실제 크기, 2배·4배 정수배와 390px 장소를 비교합니다. 표정은 기존 큰 초상이 맡습니다.</p><button id="pause">걷기 멈춤</button><div class="maps" id="maps"></div><div class="maps" id="cell-comparison"></div><div class="actors" id="actors"></div><section><h2>기존 승인 지팡이 · 96px 그대로</h2><canvas id="staff" width="384" height="96"></canvas><p>0: 시작 / 1: 동작 / 2: 들어 올림 / 3: 타격. 기존 파일을 재사용하며 축소·변경하지 않습니다.</p></section></main>
<script>const assets=PAYLOAD;const jobs=[];let paused=false,tick=0;document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'걷기 재생':'걷기 멈춤'};
function canvas(parent,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;parent.append(c);return c}
function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
async function start(){const images={};for(const a of assets)images[a.id]=await load(a.src);
for(const a of assets){if(a.kind==='map'){const s=document.createElement('section');s.className='phone';s.innerHTML='<h2>'+a.name+' · 390px 창</h2><div class="viewport"><div class="scene"><img src="'+a.src+'" alt="'+a.name+'"></div></div>';document.querySelector('#maps').append(s);const c=canvas(s.querySelector('.scene'),32,32);const actor=a.id==='map-bridge'||a.id==='map-cell'?'walk-seongjin':a.id==='map-chwimi'?'walk-yang-chancellor':'walk-yang-scholar';jobs.push({c,im:images[actor],row:0,scale:1});}
else{const s=document.createElement('section');s.innerHTML='<h2>'+a.name+'</h2>';document.querySelector('#actors').append(s);const sheet=canvas(s,a.width,a.height);sheet.getContext('2d').drawImage(images[a.id],0,0);if(a.kind==='walk'){for(let row=0;row<4;row++){const line=document.createElement('div');line.className='row';line.textContent=['아래','왼쪽','오른쪽','위'][row];s.append(line);for(const scale of [1,2,4])jobs.push({c:canvas(line,32*scale,32*scale),im:images[a.id],row,scale});}}else{const c=canvas(s,a.width*2,a.height*2);const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(images[a.id],0,0,c.width,c.height)}}}
for(const title of ['처음 선방 · 배치 비교','마지막 선방 · 배치 비교']){const s=document.createElement('section');s.className='cell-reuse';s.style.width='390px';s.style.maxWidth='100%';s.innerHTML='<h2>'+title+'</h2><div class="viewport"><div class="scene"><img src="'+assets.find(a=>a.id==='map-cell').src+'" alt="같은 선방 맵"></div></div><p>방석 (6,5), 성진 (5,6) · 검토용 배치</p>';document.querySelector('#cell-comparison').append(s);const scene=s.querySelector('.scene');const cushion=canvas(scene,32,32);cushion.style.left='192px';cushion.style.top='160px';cushion.dataset.prop='cushion';cushion.getContext('2d').drawImage(images['kit-room'],0,32,32,32,0,0,32,32);const monk=canvas(scene,32,32);monk.style.left='160px';monk.style.top='192px';monk.getContext('2d').drawImage(images['walk-seongjin'],0,0,32,32,0,0,32,32);}
const staff=await load('../../../sprites/hoseung.webp');document.querySelector('#staff').getContext('2d').drawImage(staff,0,0);document.documentElement.dataset.ready='true';animate();}
function animate(){for(const j of jobs){const ctx=j.c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,j.c.width,j.c.height);const frame=paused?0:1+(tick%4);ctx.drawImage(j.im,frame*32,j.row*32,32,32,0,0,32*j.scale,32*j.scale);j.c.dataset.frame=frame;j.c.dataset.scale=j.scale;}if(!paused&&!document.hidden)tick++;}
const timer=setInterval(()=>{if(!document.hidden)animate()},180);addEventListener('pagehide',()=>clearInterval(timer));start().catch(e=>{document.documentElement.dataset.error=String(e)});</script></html>"""
    (out/"animation-review-v1.html").write_text(html.replace("PAYLOAD",payload),encoding="utf-8")
    print(f"REVIEW {out / 'contact-sheet-v1.png'}\nREVIEW {out / 'animation-review-v1.html'}")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--only",nargs="*")
    args=parser.parse_args()
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest["status"] != "art approval pending" or any(e["status"]!="unapproved" for e in manifest["assets"]):
        raise ValueError("this pipeline is for unapproved candidates only")
    reports=[]
    for entry in manifest["assets"]:
        if args.only and entry["id"] not in args.only: continue
        reports.append(check_candidate(entry) if args.check else process(entry))
    base=ROOT/manifest["base"]
    base.mkdir(parents=True,exist_ok=True)
    reportname="check-report.json" if args.check else "processing-report.json"
    (base/reportname).write_text(json.dumps(reports,indent=2)+"\n",encoding="utf-8")
    if not args.only and not args.check: review(manifest)
    print(f"PASS {len(reports)} candidates; approval pending")


if __name__=="__main__":
    main()
