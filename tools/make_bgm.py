# -*- coding: utf-8 -*-
"""국립국악원 「디지털 이음」 국악기 악구(WAV)를 이어 붙여 장면별 배경음(assets/bgm/*.mp3)과
곡 배정 데이터(js/data/bgm.js)를 만든다.

    python tools/make_bgm.py            # 모든 곡
    python tools/make_bgm.py calm lotus # 몇 곡만(bgm.js는 늘 전체를 다시 쓴다)

- 원본: tools/music_src/<악구 번호>.wav (용량이 커서 git에 넣지 않는다, .gitignore).
  국립국악원 「디지털 이음」 › 악구 다운로드(https://www.gugak.go.kr/digitaleum/front/phrase/list.do)
  공공누리 제1유형(상업 이용·편집 가능, 출처 표시 필수). 이 게임은 이웃 작품(도산십이곡·사씨남정기·
  영웅소설·판소리 사설)을 만들 때 이미 받아 둔 악구만 옮겨 썼다. 곡마다 쓴 악구 번호는 TRACKS와 bgm.js의 src에 있다.
- 잇는 법(join)
    cont : 한 연주를 잘게 나눈 연속 악구. 5ms만 겹쳐 잇는다(원래 연주가 그대로 이어진다).
    bar  : 한 악곡에서 떨어진 대목(장단 경계). 앞 악구 끝을 짧게 줄이고 다음 악구 첫 박에 붙인다(길이 그대로).
    xf   : 장단이 자유로운 곡의 떨어진 대목. 0.15초 겹쳐 잇는다.
    gap  : 앞뒤에 긴 무음이 붙은 악구(대금 상령산). 무음을 숨 쉬는 틈만큼만 남기고 잇는다.
- 되풀이(loop)
    metric : 장단이 일정한 곡. 길이를 그대로 두고(되풀이해도 박이 밀리지 않게) 끝·처음만 살짝 여닫는다.
    xfade  : 장단이 자유로운 곡. 끝 x초를 처음 x초에 겹쳐(크로스페이드) 이음새 없이 돈다.
    rest   : 쉼으로 끝나는 곡. 그대로 되풀이한다.
- 음량은 곡마다 -20 LUFS(EBU R128)로 맞추고, 봉우리는 -1.5 dBFS 아래로 부드럽게 누른다.
  모노 44.1kHz, MP3 80kbps. 만든 뒤 MP3를 다시 풀어 음량·봉우리를 잰다.
- 퉁소(tungso·chwimi): 「디지털 이음」 악구 목록에 퉁소가 없다(2026-10 확인). 같은 세로로 부는 대나무 관악기인 단소의 「청성곡」 악구(w5-190)로 대신한다.
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'music_src')
OUT = os.path.join(ROOT, 'assets', 'bgm')
DATA = os.path.join(ROOT, 'js', 'data', 'bgm.js')
SR = 44100
TARGET = -20.0     # LUFS
CEIL = -1.5        # dBFS(봉우리 한도)
BITRATE = '80k'
FFMPEG = shutil.which('ffmpeg') or os.path.expanduser('~/ffmpeg/bin/ffmpeg.exe')


def seq(prefix, nums, suffix=''):
    return [f'{prefix}{n:03d}{suffix}' for n in nums]


# 곡 이름 → 악구·잇는 법·되풀이. 곡 이름과 쓰는 곳은 기획서 §18을 따른다.
# src: 출처 표시에 쓰는 악기·악곡과 악구 번호(국립국악원 악구 코드)
TRACKS = {
    'calm': dict(files=seq('w3-190-', range(10, 51, 10)), join='cont', loop='xfade', x=2.5, synth='calm',
                 src='대금 풍류 「청성곡」 악구 w3-190-010~050'),
    'josin': dict(files=seq('s3-001-', range(1, 7)), join='cont', loop='metric', synth='sorrow',
                  src='해금 산조(지영희류) 진양조 악구 s3-001-001~006'),
    'lotus': dict(files=seq('w3-141-', [10, 20, 30]), join='gap', loop='rest', synth='lotus',
                  src='대금 풍류 「상령산」 악구 w3-141-010·020·030'),
    'hell': dict(files=seq('s4-001-', range(1, 7)), join='cont', loop='metric', synth='sorrow',
                 src='아쟁 산조(윤윤석류) 진양조 악구 s4-001-001~006'),
    'spring': dict(files=seq('s5-117-', [10, 15, 30, 40], '-yangum'), join='bar', loop='metric', synth='dream',
                   src='양금 풍류 「염불도드리」 악구 s5-117-010·015·030·040'),
    'mountain': dict(files=seq('w4-440-', [10, 12, 14, 19, 22, 23, 24, 25]), join='xf', loop='xfade', x=2.0, synth='lotus', wet=0.12,
                     src='소금 연례악 「수제천」 악구 w4-440-010·012·014·019·022~025'),
    'feast': dict(files=seq('w1-719-', range(1, 5)), join='cont', loop='metric', synth='feast',
                  src='피리 경기대풍류 「당악」 악구 w1-719-001~004'),
    'geomungo': dict(files=seq('s2-111-', [10, 20], 'g'), join='bar', loop='rest', synth='reflect',
                     src='거문고 풍류(현악영산회상) 「상령산」 악구 s2-111-010·020'),
    'prank': dict(files=seq('s1-001-', range(40, 49)), join='cont', loop='metric', synth='dream',
                  src='가야금 산조(성금련류) 굿거리 악구 s1-001-040~048'),
    'march': dict(files=seq('w2-510-', range(1, 14)), join='cont', loop='metric', synth='feast',
                  src='태평소 행악 「대취타」 악구 w2-510-001~013'),
    'palace': dict(files=seq('w1-440-', [10, 20, 30]), join='cont', loop='xfade', x=2.0, synth='feast',
                   src='피리 연례악 「수제천」 악구 w1-440-010·020·030'),
    'night': dict(files=seq('w3-001-', range(1, 7)), join='cont', loop='metric', synth='sorrow',
                  src='대금 산조 진양조 악구 w3-001-001~006'),
    'water': dict(files=seq('s5-133-', [10, 15, 20, 30, 40, 50, 60], '-yangum'), join='bar', loop='metric', synth='dream',
                  src='양금 풍류 「우조가락도드리」 악구 s5-133-010~060'),
    'dream': dict(files=seq('s5-118-', [10, 20, 35, 55, 60, 70, 80, 90], '-yangum'), join='bar', loop='metric', synth='dream',
                  src='양금 풍류 「타령」 악구 s5-118-010~090'),
    'awake': dict(files=seq('w3-190-', [60, 70]), join='cont', loop='rest', lead=4.0, synth='reflect', wet=0.12,
                  src='대금 풍류 「청성곡」 끝 가락 악구 w3-190-060·070'),
    'tungso': dict(files=seq('w5-190-', [10, 20, 25, 30]), join='cont', loop='xfade', x=2.0, synth='lotus', wet=0.12,
                   src='단소 풍류 「청성곡」 악구 w5-190-010·020·025·030(퉁소 대신 단소)'),
    'chwimi': dict(files=seq('w5-190-', [40, 43, 46, 50, 53, 55, 57]), join='cont', loop='xfade', x=2.0, synth='sorrow', wet=0.12,
                   src='단소 풍류 「청성곡」 악구 w5-190-040~057(퉁소 대신 단소)'),
    'reflect': dict(files=seq('s2-122-', range(10, 41, 10), 'g'), join='bar', loop='metric', synth='reflect',
                    src='거문고 풍류 「윗도드리」 악구 s2-122-010~040'),
}
# 녹음이 없는 곡: 합성 곡으로만 튼다(file 없음)
SYNTH_ONLY = {}
ORDER = ['calm', 'josin', 'lotus', 'hell', 'spring', 'mountain', 'feast', 'geomungo', 'prank', 'march',
         'tungso', 'palace', 'night', 'water', 'dream', 'chwimi', 'awake', 'reflect']

CREDIT = '배경음 국립국악원 「디지털 이음」 국악기 연주 음원(공공누리 제1유형) · 퉁소 곡은 단소 연주로 대신함'
CREDIT_FULL = ('공공누리 제1유형 출처 표시: 국립국악원 「디지털 이음」 국악기 연주 음원(악구), '
               'https://www.gugak.go.kr/digitaleum/ . 쓴 악구: {list}. '
               '악구를 이어 붙이고 음량을 맞춰 썼어요. 퉁소 곡(난양공주의 달밤, 취미궁)은 퉁소 녹음이 없어 단소 연주로 대신했어요. '
               '녹음을 불러오지 못할 때도 합성한 가락으로 대신해요. 효과음은 브라우저에서 합성해요.')


# ───────── 소리 다루기
def load(code):
    hit = [f for f in os.listdir(SRC) if f.lower().startswith(code.lower()) and f.lower().endswith('.wav')]
    if not hit:
        raise SystemExit(f'tools/music_src에 {code} 악구가 없음')
    r = subprocess.run([FFMPEG, '-v', 'error', '-i', os.path.join(SRC, hit[0]), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def ramp(n, up=True):
    t = np.linspace(0, 1, n) if n > 1 else np.ones(max(n, 0))
    return np.sin(t * np.pi / 2) if up else np.cos(t * np.pi / 2)


def xfade(a, b, sec):
    n = min(int(sec * SR), len(a), len(b))
    if n <= 0:
        return np.concatenate([a, b])
    return np.concatenate([a[:-n], a[-n:] * ramp(n, False) + b[:n] * ramp(n, True), b[n:]])


def edge(x, fin, fout):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a: x[:a] *= ramp(a, True)
    if b: x[-b:] *= ramp(b, False)
    return x


def trim(x, lead, tail, db=-45):
    """앞뒤 무음을 줄인다. 소리 앞은 lead초, 소리 뒤는 tail초까지만 남긴다."""
    thr = 10 ** (db / 20)
    w = int(0.01 * SR)
    k = len(x) // w
    on = np.nonzero(np.abs(x[:k * w]).reshape(k, w).max(axis=1) > thr)[0]
    if not len(on):
        return x
    s = max(0, on[0] * w - int(lead * SR))
    e = min(len(x), (on[-1] + 1) * w + int(tail * SR))
    return x[s:e]


def limit(x, ceil_db):
    """넘치는 봉우리만 부드럽게 누른다(앞뒤 10ms를 함께 줄였다가 풀어 준다)."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    c = 10 ** (ceil_db / 20)
    need = np.minimum(1.0, c / np.maximum(np.abs(x), 1e-9))
    if need.min() >= 1.0:
        return x, 0.0
    L = int(0.01 * SR)
    g = uniform_filter1d(minimum_filter1d(need, size=2 * L + 1), size=L)
    g = np.minimum(g, need)
    return x * g, float(20 * np.log10(g.min()))


def measure(args, data=None):
    """ffmpeg ebur128로 통합 음량(LUFS)과 true peak(dBTP)를 잰다."""
    r = subprocess.run([FFMPEG, '-hide_banner', '-nostats'] + args + ['-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=data, capture_output=True)
    err = r.stderr.decode('utf-8', 'replace')
    i = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])
    tp = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', err)
    return i, (float(tp[-1]) if tp and tp[-1] != '-inf' else None)


def lufs(x):
    return measure(['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-'], x.astype(np.float32).tobytes())[0]


def build(t):
    parts = [load(f) for f in t['files']]
    j = t['join']
    if j == 'cont':
        y = parts[0]
        for p in parts[1:]:
            y = xfade(y, p, 0.005)
    elif j == 'bar':
        y = np.concatenate([edge(p, 0.01, 0.06) for p in parts])
    elif j == 'xf':
        y = edge(parts[0], 0.01, 0)
        for p in parts[1:]:
            y = xfade(y, p, 0.15)
    elif j == 'gap':
        y = np.concatenate([edge(trim(p, 0.4, 1.2), 0.02, 0.3) for p in parts])
    else:
        raise ValueError(j)
    lp = t['loop']
    if lp == 'xfade':
        n = int(t['x'] * SR)
        y = np.concatenate([y[-n:] * ramp(n, False) + y[:n] * ramp(n, True), y[n:-n]])
    elif lp == 'metric':
        y = edge(y, 0.015, 0.1)
    elif lp == 'rest':
        y = edge(y, 0.02, 0.3)
    if t.get('lead'):
        y = np.concatenate([np.zeros(int(t['lead'] * SR)), y])
    # 음량 맞추기 → 봉우리 누르기 → 누른 만큼 음량이 줄었으면 한 번 더 맞춘다
    gr = 0.0
    for _ in range(3):
        y = y * 10 ** ((TARGET - lufs(y)) / 20)
        y, gr = limit(y, CEIL)
        if abs(lufs(y) - TARGET) < 0.2:
            break
    return y, gr


def encode(y, path):
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', path],
                   input=np.clip(y, -1, 1).astype(np.float32).tobytes(), check=True)


# ───────── js/data/bgm.js 쓰기
def js_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def write_data(lens):
    pieces = []
    for name in ORDER:
        if name in TRACKS and TRACKS[name]['src'] not in pieces:
            pieces.append(TRACKS[name]['src'])
    lines = [
        '// 배경음 곡 배정과 출처 문구 — tools/make_bgm.py가 만든다(손으로 고치지 말고 스크립트를 고쳐 다시 만든다).',
        '// 녹음: 국립국악원 「디지털 이음」 국악기 연주 음원 악구(공공누리 제1유형: 상업 이용·편집 가능, 출처 표시 필수).',
        '// 곡 이름·쓰는 곳은 기획서 §18. src에 쓴 악구 번호(국립국악원 악구 코드)를 적는다.',
        '// file이 없는 곡은 녹음 없이 synth의 합성 곡으로만 튼다. 퉁소 곡은 「디지털 이음」에 퉁소 악구가 없어 단소 연주로 대신한다.',
        '(window.GUUN = window.GUUN || {}).bgm = {',
        "  title: 'calm',",
        '  tracks: {',
    ]
    for name in ORDER:
        if name in TRACKS:
            t = TRACKS[name]
            lines.append(f"    {name}: {{ file: 'assets/bgm/{name}.mp3', len: {lens[name]:.3f}, gain: 1.0, wet: {t.get('wet', 0)}, "
                         f"synth: {js_str(t['synth'])}, src: {js_str(t['src'])} }},")
        else:
            s = SYNTH_ONLY[name]
            lines.append(f"    {name}: {{ synth: {js_str(s['synth'])} }}, // 합성만: {s['why']}")
    lines += [
        '  },',
        f'  credit: {js_str(CREDIT)},',
        f"  creditFull: {js_str(CREDIT_FULL.format(list=' · '.join(pieces)))},",
        '};',
        '',
    ]
    io.open(DATA, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))


def main(names):
    os.makedirs(OUT, exist_ok=True)
    info_path = os.path.join(SRC, 'build_info.json')
    info = json.load(io.open(info_path, encoding='utf-8')) if os.path.exists(info_path) else {}
    print(f"{'곡':10}{'악구':>4}{'길이(초)':>9}{'LUFS':>8}{'TP(dB)':>8}{'누름(dB)':>9}{'KB':>6}")
    for name, t in TRACKS.items():
        if names and name not in names:
            continue
        y, gr = build(t)
        path = os.path.join(OUT, name + '.mp3')
        encode(y, path)
        i, tp = measure(['-i', path])   # 만든 MP3를 다시 풀어 잰다
        info[name] = {'len': int(len(y) / SR * 1000) / 1000,  # ms 아래는 버린다(파일보다 길지 않게)
                      'lufs': i, 'tp': tp, 'gr': round(gr, 2),
                      'kb': os.path.getsize(path) // 1024, 'files': t['files']}
        print(f"{name:10}{len(t['files']):>4}{len(y) / SR:9.1f}{i:8.1f}{tp if tp is not None else 0:8.1f}{gr:9.1f}{info[name]['kb']:6d}")
    json.dump(info, io.open(info_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    missing = [n for n in TRACKS if n not in info]
    if missing:
        raise SystemExit('길이를 모르는 곡이 있어 bgm.js를 쓰지 않음: ' + ', '.join(missing))
    write_data({n: info[n]['len'] for n in TRACKS})
    print('js/data/bgm.js 씀')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
