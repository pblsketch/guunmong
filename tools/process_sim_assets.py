# -*- coding: utf-8 -*-
"""승인된 96px 그림의 원본 재가공. 제품 파일은 자동으로 덮어쓰지 않는다.

python tools/process_sim_assets.py
python tools/process_sim_assets.py --check
python tools/process_sim_assets.py --manifest manifest96.json
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import pixlib as px
from process_sprites import outline

BASE = Path(px.RAW) / "sim-v2"
LABELS = {"study": "학문", "geomungo": "거문고", "sword": "검술", "strategy": "병법", "hoseung": "호승 · 지팡이",
          "munjang": "문장", "eumak": "음악", "muye": "무예", "jiryak": "지략", "gong": "공", "fame": "명성", "wealth": "재물"}


def manifest(filename="tools/manifest_sim96.json"):
    source = BASE / filename
    if not source.exists():
        source = Path(px.ROOT) / filename
    return json.loads(source.read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_parts(entry):
    arr = px.load_keyed("sim-v2/" + entry["source"][:-4], entry["key"])
    expected = [4, 3] if entry["kind"] == "icon" else [entry["frames"]] * entry["rows"]
    rows, clean = px.grid_boxes(arr, expected)
    assert [len(row) for row in rows] == expected, (entry["name"], "frame segmentation", rows)
    if entry["kind"] == "icon":
        x, y = entry["atlasCell"]
        boxes = [rows[y][x]]
    else:
        boxes = [box for row in rows for box in row]
    return [px.crop_box(arr, clean, box) for box in boxes], boxes


def process(entry):
    dest = BASE / entry["candidate"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    if entry.get("copyFrom"):
        shutil.copyfile(BASE / entry["copyFrom"], dest)
        return {"name": entry["name"], "source": entry["source"], "source_sha256": sha(BASE / entry["source"]),
                "candidate": entry["candidate"], "candidate_sha256": sha(dest), "copied_from": entry["copyFrom"], "cell": entry["cell"]}
    cw, ch = entry["cell"]
    margin_x, margin_y = max(1, round(cw / 32)), max(1, round(ch / 32))
    anchor_x, floor_y = cw / 2, ch - margin_y
    parts, boxes = source_parts(entry)
    # 프레임마다 따로 맞추면 지팡이가 들릴 때 몸까지 작아지므로 공통 배율만 쓴다.
    scale = min(ch * 0.875 / max(p.shape[0] for p in parts), cw * 0.875 / max(p.shape[1] for p in parts))
    if entry["kind"] == "sheet":
        for p in parts:
            pivot = px.foot_x(p)
            scale = min(scale, cw * 0.4375 / max(pivot, 1), cw * 0.4375 / max(p.shape[1] - pivot, 1))
    sheet = Image.new("RGBA", (cw * entry["frames"], ch * entry["rows"]), (0, 0, 0, 0))
    placement = []
    for i, part in enumerate(parts):
        size = (max(1, round(part.shape[1] * scale)), max(1, round(part.shape[0] * scale)))
        im = px.box_resize(Image.fromarray(part, "RGBA"), size)
        box = im.getbbox()
        assert box, (entry["name"], i, "empty frame")
        im = im.crop(box)
        pivot = px.foot_x(np.array(im))
        x = round(anchor_x - pivot) if entry["kind"] == "sheet" else (cw - im.width) // 2
        y = floor_y - im.height if entry["kind"] == "sheet" else (ch - im.height) // 2
        assert x >= margin_x and y >= margin_y and x + im.width <= cw - margin_x and y + im.height <= ch - margin_y, (entry["name"], i, "clipping", im.size, x, y)
        sheet.alpha_composite(im, ((i % entry["frames"]) * cw + x, (i // entry["frames"]) * ch + y))
        placement.append({"frame": i, "x": x, "y": y, "w": im.width, "h": im.height})
    # 원본 검의 가는 금속 테두리를 다시 어둡게 하면 칼날 전체가 검게 뭉친다.
    sheet = px.quantize(outline(sheet, entry.get("edgeDarken", 0.72)))
    if dest.suffix == ".webp":
        px.save_webp(sheet, str(dest))
    else:
        sheet.save(dest, "PNG")
    return {"name": entry["name"], "source": entry["source"], "source_sha256": sha(BASE / entry["source"]),
            "candidate": entry["candidate"], "candidate_sha256": sha(dest), "scale": scale, "cell": entry["cell"], "pivot": [anchor_x, floor_y - 1],
            "source_boxes": [[int(v) for v in box] for box in boxes], "placements": placement}


def verify(entries, output="validation.json"):
    rows, errors = [], []
    for entry in entries:
        p = BASE / entry["candidate"]
        if not p.is_file():
            errors.append(f"missing {p.name}")
            continue
        im = Image.open(p).convert("RGBA")
        cw, ch = entry["cell"]
        margin_x, margin_y = max(1, round(cw / 32)), max(1, round(ch / 32))
        colors = px.count_colors(im)
        expected = (cw * entry["frames"], ch * entry["rows"])
        if im.size != expected or colors > 32:
            errors.append(f"{p.name}: size={im.size}, colors={colors}")
        a = np.array(im)
        if not set(np.unique(a[..., 3])).issubset({0, 255}) or not np.any(a[..., 3] == 0):
            errors.append(f"{p.name}: alpha")
        if p.suffix == ".webp" and p.read_bytes()[12:16] != b"VP8L":
            errors.append(f"{p.name}: not lossless VP8L")
        frame_info, frames = [], []
        for i in range(entry["frames"] * entry["rows"]):
            x, y = (i % entry["frames"]) * cw, (i // entry["frames"]) * ch
            fr = im.crop((x, y, x + cw, y + ch))
            fa = np.array(fr)
            box = fr.getbbox()
            if not box:
                errors.append(f"{p.name}: frame {i} empty")
                continue
            if box[0] < margin_x or box[1] < margin_y or box[2] > cw - margin_x or box[3] > ch - margin_y:
                errors.append(f"{p.name}: frame {i} empty or edge clipped")
            foot = px.foot_x(fa)
            if entry["kind"] == "sheet" and (box[3] != ch - margin_y or abs(foot - cw / 2) > 1.5):
                errors.append(f"{p.name}: frame {i} unstable baseline/pivot {foot}, {box}")
            frame_info.append({"frame": i, "bbox": box, "foot_x": foot, "bottom_y": box[3] - 1, "opaque_pixels": int(np.count_nonzero(fa[..., 3]))})
            frames.append(fa)
        differences = [int(np.count_nonzero(np.any(frames[i] != frames[i - 1], axis=2))) for i in range(1, len(frames))]
        if differences and min(differences) < max(3, round(cw * ch * 3 / 1024)):
            errors.append(f"{p.name}: animation frames indistinguishable {differences}")
        palette = sorted({tuple(pixel[:3]) for pixel in a.reshape(-1, 4) if pixel[3]})
        if entry.get("copyFrom") and sha(p) != sha(BASE / entry["copyFrom"]):
            errors.append(f"{p.name}: preserved icon changed")
        rows.append({"name": entry["name"], "file": entry["candidate"], "cell": entry["cell"], "size": im.size, "colors_with_transparency": colors, "shared_opaque_palette": [[int(c) for c in rgb] for rgb in palette],
                     "sha256": sha(p), "frames": frame_info, "changed_pixels": differences, "lossless": True})
        print(f"{entry['name']}: {im.width}x{im.height}, {colors} colors, {entry['frames']} frames, changes={differences}")
    result = {"approval": "pending", "files": rows, "errors": errors, "visual_review_required": True}
    (BASE / output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    for e in errors:
        print("FAIL", e)
    print(f"{len(rows)}/{len(entries)} candidates; {len(errors)} errors")
    return not errors and len(rows) == len(entries) == 12


def on_background(im, color):
    out = Image.new("RGBA", im.size, color)
    out.alpha_composite(im)
    return out.convert("RGB")


def reviews(entries, directory="review", scales=(1, 4)):
    out = BASE / directory
    out.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 18)
    small = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 14)
    layout = []
    for scale in scales:
        width = max(740, 210 + max(e["cell"][0] * e["frames"] for e in entries) * scale)
        heights = [max(70, e["cell"][1] * e["rows"] * scale + 28) for e in entries]
        board = Image.new("RGB", (width, 75 + sum(heights)), "#eee5d5")
        draw = ImageDraw.Draw(board)
        draw.text((20, 16), f"구운몽 · 승인 대기 후보 · {scale}배 · 게임 미반영", font=font, fill="#302a27")
        y = 65
        for e, row_height in zip(entries, heights):
            im = Image.open(BASE / e["candidate"]).convert("RGBA")
            draw.text((18, y), LABELS[e["name"]], font=font, fill="#302a27")
            draw.text((18, y + 28), f'{e["cell"][0]}×{e["cell"][1]} · {e["frames"]}프레임', font=small, fill="#635749")
            enlarged = px.upscale(im, scale)
            board.paste(on_background(enlarged, "#d8c6a5"), (190, y))
            layout.append({"name": e["name"], "scale": scale, "file": f"review_{scale}x.png", "box": [190, y, 190 + enlarged.width, y + enlarged.height], "candidate_sha256": sha(BASE / e["candidate"])})
            y += row_height
        board.save(out / f"review_{scale}x.png")
    (out / "layout.json").write_text(json.dumps(layout, indent=2), encoding="utf-8")
    gif_scale = max(scales)
    for e in entries:
        if e["kind"] != "sheet":
            continue
        im = Image.open(BASE / e["candidate"]).convert("RGBA")
        pal_image = on_background(px.upscale(im, gif_scale), "#eee5d5").quantize(colors=32, method=Image.Quantize.MEDIANCUT)
        count = e["frames"]
        order = list(range(count)) if e["name"] == "hoseung" else list(range(count)) + list(range(count - 2, 0, -1))
        fw, fh = e["cell"][0] * gif_scale, e["cell"][1] * gif_scale
        frames = [pal_image.crop((i * fw, 0, (i + 1) * fw, fh)) for i in order]
        durations = [1600 if i == e.get("pauseFrame") else 500 for i in order] if e["name"] == "hoseung" else [220] * len(order)
        frames[0].save(out / (e["name"] + ".gif"), save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=False, disposal=2)
    cards = []
    for e in entries:
        path = "../" + e["candidate"] + "?v=" + sha(BASE / e["candidate"])[:12]
        frames = e["frames"]
        cw, ch = e["cell"]
        views = "".join(f'<div><p>{scale}배' + (' · 준비 UI 크기' if cw == 96 and scale == 1 else '') + f'</p><canvas width="{cw}" height="{ch}" style="width:{cw*scale}px;height:{ch*scale}px" data-scale="{scale}" data-src="{path}" data-frames="{frames}" data-name="{e["name"]}"></canvas></div>' for scale in scales)
        cards.append(f'<article><h2>{LABELS[e["name"]]}</h2><p>{e["name"]} · {cw}×{ch} · {frames}프레임</p><div class="pair">{views}</div><div class="sheet-window"><img class="sheet" src="{path}" alt="전체 프레임"></div></article>')
    html = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>구운몽 그림 후보 검토</title><style>body{background:#eee5d5;color:#302a27;font-family:Malgun Gothic,sans-serif;max-width:1100px;margin:32px auto;padding:0 20px}button{padding:10px 18px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:18px}article{min-width:0;padding:18px;background:#fff9ed;border:1px solid #ad9b80}h2{margin:0}p{font-size:14px}canvas,img{image-rendering:pixelated}canvas{background:#d8c6a5}.pair{display:flex;gap:16px;flex-wrap:wrap;align-items:end}.sheet-window{overflow:auto;margin-top:20px}.sheet{display:block;max-width:none}body.dark canvas{background:#273348}</style>
<h1>구운몽 · 그림 후보 12종</h1><p>사용자 확인 대기 · 게임 미반영. 셀 96×96의 1배는 준비 화면 표시 크기입니다. 아이콘은 32×32를 유지합니다.</p><p><button id="play">일시 정지</button> <button id="step">한 프레임</button> <button id="bg">밝은/어두운 바탕</button></p><main>''' + "".join(cards) + '''</main><script>
let playing=true,tick=0,last=0;const views=[];document.querySelectorAll('canvas').forEach(c=>{const im=new Image();im.onload=()=>{views.push({c,im});draw()};im.src=c.dataset.src});
function draw(){views.forEach(({c,im})=>{const n=+c.dataset.frames,w=c.width,h=c.height;const order=c.dataset.name==='hoseung'?[0,0,1,2,2,2,2,2,3,3]:[...Array(n).keys(),...Array(Math.max(0,n-2)).keys()].map((v,i)=>i<n?v:n-2-v);const f=n===1?0:order[tick%order.length];const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,w,h);ctx.drawImage(im,f*w,0,w,h,0,0,w,h)})}
function loop(t){if(t-last>220){if(playing)tick++;last=t;draw()}requestAnimationFrame(loop)}requestAnimationFrame(loop);
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'일시 정지':'재생'};document.querySelector('#step').onclick=()=>{playing=false;document.querySelector('#play').textContent='재생';tick++;draw()};document.querySelector('#bg').onclick=()=>document.body.classList.toggle('dark');
</script></html>'''
    (out / "preview.html").write_text(html, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--only", nargs="*")
    parser.add_argument("--manifest", default="tools/manifest_sim96.json")
    args = parser.parse_args()
    spec = manifest(args.manifest)
    entries = spec["entries"]
    if not args.check:
        records = []
        for entry in entries:
            if args.only and entry["name"] not in args.only:
                continue
            records.append(process(entry))
        processing = spec.get("processing", "processing.json")
        (BASE / (Path(processing).stem + "_" + "_".join(args.only) + ".json" if args.only else processing)).write_text(json.dumps(records, indent=2), encoding="utf-8")
        if args.only:
            print("partial processing", len(records))
            return 0
    passed = verify(entries, spec.get("validation", "validation.json"))
    if passed and not args.check:
        reviews(entries, spec.get("review", "review"), spec.get("reviewScales", [1, 4]))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
