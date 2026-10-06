'use strict';
// 소리
//  - 배경음: 국립국악원 「디지털 이음」 국악기 연주 악구(공공누리 제1유형, 출처 표시 필수)를 이어 붙인 녹음(assets/bgm/*.mp3).
//    곡 배정·음량·출처 문구는 데이터(js/data/bgm.js, 형식은 js/data/README.md)가 정한다. 장면마다 곡이 바뀐다.
//      · http(s)로 열면 fetch로 받아 Web Audio로 반복 재생한다(최근 세 곡만 풀어 둔다).
//      · 파일로 열면(file://) 브라우저가 fetch를 막으므로 <audio> 요소로 곧장 튼다.
//      · 녹음을 못 받으면(파일이 없거나 오프라인) 아래의 합성 곡으로 대신한다.
//  - 효과음: 브라우저에서 합성한다(같은 만든이의 「사씨남정기」「도산십이곡」 합성 엔진을 가져왔다:
//    가야금 Karplus-Strong, 대금, 해금, 장구·북·징, 합성한 공간 울림).
//  - 배경음과 효과음은 설정에서 따로 끈다. 화면 접기(선생님용)는 소리를 모두 멈춘다.
//  - 첫 터치(또는 키 누름) 전에는 소리를 만들지 않는다(브라우저 정책).
(function () {
  const MUSIC_VOL = 0.5, SFX_VOL = 0.8;
  let ctx = null, comp, musicBus, sfxBus, revIn;
  let ksCache = {}, noiseBuf = null;
  let hushed = false;
  const A = (G.audio = { track: null, unlocked: false });
  const S = () => G.save.state;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 소리 길(버스) 만들기: 실제 재생과 점검용 오프라인 렌더에 함께 쓴다
  function buildGraph(c) {
    const cp = c.createDynamicsCompressor();
    cp.threshold.value = -14; cp.knee.value = 12; cp.ratio.value = 3; cp.attack.value = 0.01; cp.release.value = 0.25;
    const master = c.createGain(); master.gain.value = 1;
    cp.connect(master); master.connect(c.destination);
    const mb = c.createGain(); mb.gain.value = MUSIC_VOL; mb.connect(cp);
    const sb = c.createGain(); sb.gain.value = SFX_VOL; sb.connect(cp);
    const rev = c.createConvolver();
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) { const k = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.4) * (i < 400 ? i / 400 : 1); }
    }
    rev.buffer = ir;
    const ri = c.createGain(); ri.gain.value = 1;
    const ro = c.createGain(); ro.gain.value = 0.3;
    const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 5000;
    ri.connect(rev); rev.connect(rl); rl.connect(ro); ro.connect(cp);
    return { comp: cp, musicBus: mb, sfxBus: sb, revIn: ri };
  }


  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    ({ comp, musicBus, sfxBus, revIn } = buildGraph(ctx));
    musicBus.gain.value = S().music ? MUSIC_VOL : 0;
    // 다른 탭으로 가면 소리를 멈춘다(교실에서 여러 기기가 동시에 울리지 않게)
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (!hushed) ctx.resume();
      const el = cur && cur.el;
      if (el) { if (document.hidden || hushed) el.pause(); else el.play().catch(() => {}); }
    });
    A.ctx = ctx;
    return ctx;
  }

  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; return b; }
  function send(node, out, wet) { node.connect(out); if (wet > 0) { const s = gainNode(wet); node.connect(s); s.connect(revIn); } }

  // ───────── 가야금 (Karplus-Strong)
  function ksBuffer(midi) {
    if (ksCache[midi]) return ksCache[midi];
    const sr = ctx.sampleRate, f = mtof(midi);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * (midi < 60 ? 3.2 : 2.4));
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < N; i++) ring[i] = (ring[i] + ring[i - 1]) * 0.5; // 명주실처럼 부드러운 소리
    const decay = 0.9955 + 0.003 * Math.min(1, Math.max(0, (midi - 45) / 40));
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[idx], b = ring[(idx + 1) % N];
      ring[idx] = (a + b) * 0.5 * decay;
      d[i] = a;
      idx = (idx + 1) % N;
    }
    return (ksCache[midi] = buf);
  }
  function gayageum(t, midi, dur, vel, orn, out, wet = 0.28) {
    const src = ctx.createBufferSource();
    src.buffer = ksBuffer(Math.round(midi));
    const r = src.playbackRate;
    r.setValueAtTime(orn.includes('<') ? 0.945 : 1, t);
    if (orn.includes('<')) r.linearRampToValueAtTime(1, t + 0.09);
    if (orn.includes('~') && dur > 0.35) { // 농현: 줄을 눌렀다 놓았다
      for (let k = 0, tt = t + 0.18; tt < t + dur; k++, tt += 0.11) r.linearRampToValueAtTime(k % 2 ? 1 : 1.022, tt);
      r.linearRampToValueAtTime(1, t + dur);
    }
    if (orn.includes('>')) { r.setValueAtTime(1, t + Math.max(0.05, dur - 0.18)); r.linearRampToValueAtTime(0.95, t + dur); }
    const lp = filt('lowpass', 3800), body = filt('peaking', 900, 1); body.gain.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.55, t);
    g.gain.setTargetAtTime(0.0001, t + dur + 0.05, 0.35);
    src.connect(body); body.connect(lp); lp.connect(g); send(g, out, wet);
    src.start(t); src.stop(t + dur + 2.2);
  }

  // ───────── 대금
  function daegeum(t, midi, dur, vel, orn, out, prev, wet = 0.36) {
    const f = mtof(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sine';
    const o2 = ctx.createOscillator(); o2.type = 'triangle';
    const o3 = ctx.createOscillator(); o3.type = 'sine';
    const set = (fq, at) => { o1.frequency.setValueAtTime(fq, at); o2.frequency.setValueAtTime(fq, at); o3.frequency.setValueAtTime(fq * 2, at); };
    const ramp = (fq, at) => { o1.frequency.linearRampToValueAtTime(fq, at); o2.frequency.linearRampToValueAtTime(fq, at); o3.frequency.linearRampToValueAtTime(fq * 2, at); };
    if (prev) { set(mtof(prev), t); ramp(f, t + 0.07); }
    else if (orn.includes('<')) { set(f * 0.94, t); ramp(f, t + 0.1); }
    else set(f, t);
    if (orn.includes('>')) { const s = t + Math.max(0.1, dur - 0.2); set(f, s); ramp(f * 0.955, t + dur); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t);
    const vs = t + Math.min(0.45, dur * 0.4), depth = f * (orn.includes('~') ? 0.016 : 0.006);
    lg.gain.linearRampToValueAtTime(0, vs); lg.gain.linearRampToValueAtTime(depth, Math.min(t + dur, vs + 0.4));
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const mix = ctx.createGain(); mix.gain.value = 1;
    const g2 = gainNode(0.14), g3 = gainNode(0.05);
    o1.connect(mix); o2.connect(g2); g2.connect(mix); o3.connect(g3); g3.connect(mix);
    const n = noise(), bp = filt('bandpass', f * 1.6, 0.9), ng = gainNode(0.035 * vel); // 숨소리
    n.connect(bp); bp.connect(ng); ng.connect(mix);
    const ch = noise(), hp = filt('highpass', 2500), cg = ctx.createGain(); // 첫소리의 바람 잡음
    cg.gain.setValueAtTime(0.0001, t); cg.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.01); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    ch.connect(hp); hp.connect(cg); cg.connect(mix);
    const env = ctx.createGain(), peak = 0.2 * vel;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + (prev ? 0.03 : 0.08));
    env.gain.setValueAtTime(peak, t + Math.max(0.09, dur - 0.06));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.16);
    const lp = filt('lowpass', 4200);
    mix.connect(lp); lp.connect(env); send(env, out, wet);
    const end = t + dur + 0.3;
    [o1, o2, o3, lfo, n, ch].forEach((s) => { s.start(t); s.stop(end); });
  }

  // ───────── 해금
  function haegeum(t, midi, dur, vel, orn, out, prev, wet = 0.3) {
    const f = mtof(midi);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 7;
    const setF = (fq, at) => { o1.frequency.setValueAtTime(fq, at); o2.frequency.setValueAtTime(fq, at); };
    const rampF = (fq, at) => { o1.frequency.linearRampToValueAtTime(fq, at); o2.frequency.linearRampToValueAtTime(fq, at); };
    if (prev) { setF(mtof(prev), t); rampF(f, t + 0.06); }
    else if (orn.includes('<')) { setF(f * 0.9, t); rampF(f, t + 0.12); }
    else setF(f, t);
    if (orn.includes('>')) { const s = t + Math.max(0.08, dur - 0.18); setF(f, s); rampF(f * 0.95, t + dur); }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6.2;
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * (orn.includes('~') ? 0.02 : 0.009), t + Math.min(dur, 0.35));
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    const bp = filt('bandpass', 1100, 0.8), pk = filt('peaking', 2500, 1.4); pk.gain.value = 6;
    const lp = filt('lowpass', 3600);
    const env = ctx.createGain(), peak = 0.11 * vel;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + (prev ? 0.04 : 0.1));
    env.gain.setValueAtTime(peak, t + Math.max(0.1, dur - 0.05));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    o1.connect(bp); o2.connect(bp); bp.connect(pk); pk.connect(lp); lp.connect(env); send(env, out, wet);
    const end = t + dur + 0.25;
    [o1, o2, lfo].forEach((s) => { s.start(t); s.stop(end); });
  }

  // ───────── 지속음·배경음
  function drone(t, midi, dur, vel, out) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi);
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = mtof(midi) * 1.5; o2.detune.value = -4;
    const lp = filt('lowpass', 480, 0.7);
    const g = ctx.createGain(), g2 = gainNode(0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04 * vel, t + 0.9);
    g.gain.setValueAtTime(0.04 * vel, t + Math.max(1, dur - 0.9)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); send(g, out, 0.2);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function pad(t, midi, dur, vel, out) {
    const lp = filt('lowpass', 1800);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 1.2);
    g.gain.setValueAtTime(0.05 * vel, t + Math.max(1.3, dur - 1)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    for (const dt of [-7, 0, 7]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi); o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 1.3);
    }
    lp.connect(g); send(g, out, 0.5);
  }

  // ───────── 타악: 장구·북·징
  function hit(t, kind, vel, out) {
    const kung = (tt, v) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(96, tt); o.frequency.exponentialRampToValueAtTime(56, tt + 0.2);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.6 * v, tt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.38);
      o.connect(g); send(g, out, 0.12); o.start(tt); o.stop(tt + 0.42);
      const n = noise(), lp = filt('lowpass', 380), ng = ctx.createGain();
      ng.gain.setValueAtTime(0.2 * v, tt); ng.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
      n.connect(lp); lp.connect(ng); ng.connect(out); n.start(tt); n.stop(tt + 0.08);
    };
    const deok = (tt, v) => {
      const n = noise(), bp = filt('bandpass', 2700, 2.5), g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.42 * v, tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07);
      n.connect(bp); bp.connect(g); send(g, out, 0.15); n.start(tt); n.stop(tt + 0.09);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(820, tt); o.frequency.exponentialRampToValueAtTime(560, tt + 0.04);
      const og = ctx.createGain(); og.gain.setValueAtTime(0.12 * v, tt); og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      o.connect(og); og.connect(out); o.start(tt); o.stop(tt + 0.06);
    };
    if (kind === 'kung') kung(t, vel);
    else if (kind === 'deok') deok(t, vel);
    else if (kind === 'deong') { kung(t, vel); deok(t, vel * 0.9); }
    else if (kind === 'gideok') { deok(t - 0.07, vel * 0.45); deok(t, vel); }
    else if (kind === 'buk') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(74, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); send(g, out, 0.2); o.start(t); o.stop(t + 0.65);
      const n = noise(), lp = filt('lowpass', 260), ng = ctx.createGain();
      ng.gain.setValueAtTime(0.3 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t); n.stop(t + 0.12);
    } else if (kind === 'jing') {
      const f0 = 108;
      [[1, 1], [2.02, 0.55], [2.74, 0.4], [3.46, 0.28], [4.22, 0.18], [5.4, 0.1]].forEach(([m, a], i) => {
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f0 * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f0 * m, t + 1.2);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * a * vel, t + 0.03 + i * 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2 - i * 0.4);
        o.connect(g); send(g, out, 0.45); o.start(t); o.stop(t + 4.3);
      });
    }
  }
  // ───────── 악보 읽기
  // 표기: 음(1~5, 0=쉼) + 옥타브(^ 위, v 아래) : 길이(단위 수) + 꾸밈(~ 떨기, < 밀어 올리기, > 꺾어 내리기)
  // 예) "1:4 2:2 3:2 | 4:6~ 1^:2": | 는 마디 구분(보기 편하게)
  // 선법: 평조(밝고 너그러움) = 솔라도레미 꼴, 계면조(슬프고 애절함) = 라도레미솔 꼴
  const MODES = { pyeong: [0, 2, 5, 7, 9], gyemyeon: [0, 3, 5, 7, 10] };
  function parse(str, mode, tonic) {
    const out = [];
    let pos = 0;
    for (const tok of str.split(/\s+/)) {
      if (!tok || tok === '|') continue;
      const m = tok.match(/^([0-5])([\^v]*):(\d+(?:\.\d+)?)([~<>]*)$/);
      if (!m) { console.warn('악보 오류', tok); continue; }
      const deg = +m[1], dur = +m[3];
      if (deg > 0) {
        let oct = 0; for (const c of m[2]) oct += c === '^' ? 1 : -1;
        out.push({ pos, dur, midi: tonic + MODES[mode][deg - 1] + 12 * oct, orn: m[4] || '' });
      }
      pos += dur;
    }
    return { notes: out, len: pos };
  }
  const snap = (midi, mode, tonic) => { // 선법 밖의 음을 가장 가까운 선법 음으로
    const pcs = MODES[mode].map((x) => (x + tonic) % 12);
    for (let d = 0; d < 6; d++) for (const s of [0, -1, 1]) { const m = midi + d * s; if (pcs.includes(((m % 12) + 12) % 12)) return m; }
    return midi;
  };

  // 장단(마디 안의 위치, 소리, 세기)
  const JANGDAN = {
    jungmori8: [[0, 'deong', 0.55], [4, 'kung', 0.4], [6, 'deok', 0.25]],
    gutgeori12: [[0, 'deong', 0.9], [3, 'gideok', 0.6], [5, 'deok', 0.4], [6, 'kung', 0.8], [8, 'deok', 0.5], [9, 'kung', 0.7], [11, 'deok', 0.4]],
    jungjung12: [[0, 'deong', 0.6], [3, 'deok', 0.3], [6, 'kung', 0.55], [9, 'deok', 0.35], [10, 'deok', 0.22]],
    semachi9: [[0, 'deong', 0.9], [3, 'deok', 0.5], [5, 'deok', 0.35], [6, 'kung', 0.8], [7, 'deok', 0.4]],
    jajin12: [[0, 'deong', 1], [0, 'buk', 0.9], [2, 'deok', 0.55], [3, 'kung', 0.8], [5, 'deok', 0.55], [6, 'kung', 0.9], [6, 'buk', 0.7], [8, 'deok', 0.55], [9, 'kung', 0.8], [11, 'gideok', 0.65]],
    sneak12: [[0, 'kung', 0.5], [3, 'deok', 0.22], [6, 'kung', 0.35], [9, 'deok', 0.22], [11, 'deok', 0.14]],
    night12: [[0, 'kung', 0.45], [9, 'deok', 0.2]],
  };


  // ───────── 합성 곡(녹음을 못 받을 때 대신 트는 곡. 이 게임을 위해 새로 지은 짧은 가락)
  // unit = 한 박(초), bar = 마디 길이(박), gain = 곡끼리 음량 맞춤, drum = 장단 세기 배율
  const TRACKS = {
    // 타이틀·결과: 중모리에 대금이 길게, 가야금이 받친다
    calm: {
      mode: 'pyeong', tonic: 67, gain: 0.6, unit: 60 / 104, bar: 8, jangdan: 'jungmori8', drum: 0.4, jing: [0], drone: 43,
      lead: { inst: 'daegeum', vel: 0.8, mel: '1:4 2:2 3:2 | 5:6~ 3:2 | 2:2 3:2 2:2 1:2 | 2:8~ | 3:2 5:2 1^:4 | 5:6~ 3:2 | 2:3 3:1 2:2 1:2 | 1:8~' },
      acc: { inst: 'gayageum', style: 'beats', beat: 4, oct: -12, vel: 0.4 },
    },
    // 연화봉(현실의 절): 장단 없이 높은 가야금과 은은한 배경음
    lotus: {
      mode: 'pyeong', tonic: 72, gain: 1.2, unit: 60 / 120, bar: 12, jangdan: null, drone: null,
      lead: { inst: 'gayageum', vel: 0.6, mel: '5:3 1^:3 2^:6~ | 1^:3 5:3 3:6~ | 2:3 3:3 5:3 3:3 | 2:12~ | 3:3 5:3 1^:6~ | 2^:3 1^:3 5:6~ | 3:3 2:3 1:3 2:3 | 1:12~' },
      acc: { inst: 'pad', style: 'chord', oct: -12, vel: 0.8 },
    },
    // 꿈(승경도): 세마치로 걸음을 옮기듯 밝게
    dream: {
      mode: 'pyeong', tonic: 67, gain: 1.25, unit: 60 / 160, bar: 9, jangdan: 'semachi9', drum: 0.4, drone: 43,
      lead: { inst: 'gayageum', vel: 0.8, mel: '1:3 3:3 5:3 | 1^:6~ 5:3 | 3:3 5:3 3:3 | 2:9~ | 3:3 5:3 1^:3 | 2^:6~ 1^:3 | 5:3 3:3 2:3 | 1:9~' },
      second: { inst: 'daegeum', style: 'long', min: 6, oct: 0, vel: 0.36 },
      acc: { inst: 'gayageum', style: 'bass', beat: 3, oct: -12, vel: 0.34 },
    },
    // 잔치: 밝은 굿거리
    feast: {
      mode: 'pyeong', tonic: 72, gain: 1.1, unit: 60 / 190, bar: 12, jangdan: 'gutgeori12', drum: 0.55, jing: [0], drone: 48,
      lead: { inst: 'gayageum', vel: 0.85, mel: '1:3 2:3 3:3 5:3 | 1^:6~ 5:3 3:3 | 5:3 1^:3 2^:3 1^:3 | 5:12~ | 3:3 5:3 3:3 2:3 | 1:6~ 2:3 3:3 | 2:3 3:3 2:3 5v:3 | 1:12~' },
      second: { inst: 'daegeum', style: 'long', min: 6, oct: 0, vel: 0.4 },
      acc: { inst: 'gayageum', style: 'bass', beat: 6, oct: -12, vel: 0.4 },
    },
    // 무상·깨어남: 계면조로 기울고 해금이 낮게 운다
    sorrow: {
      mode: 'gyemyeon', tonic: 69, gain: 1.3, unit: 60 / 96, bar: 12, jangdan: 'night12', drum: 0.6, drone: 45,
      lead: { inst: 'haegeum', vel: 0.8, mel: '1:6 2:3 3:3 | 4:6~ 3:3 2:3> | 1:3 2:3 1:3 5v:3 | 1:12~ | 3:6 4:3 5:3 | 4:6~ 3:6 | 2:3 1:3 2:3 3:3 | 1:12~' },
      acc: { inst: 'gayageum', style: 'bass', beat: 6, oct: -12, vel: 0.36 },
    },
    // 꿈 일지·육관대사: 대금이 천천히, 장단 없음
    reflect: {
      mode: 'pyeong', tonic: 69, gain: 1.1, unit: 60 / 80, bar: 8, jangdan: null, drone: 45,
      lead: { inst: 'daegeum', vel: 0.75, mel: '3:4 5:4 | 1^:6~ 5:2 | 3:2 2:2 1:4 | 2:8~ | 1:4 2:2 3:2 | 5:6~ 3:2 | 2:2 3:2 2:4 | 1:8~' },
      acc: { inst: 'pad', style: 'chord', oct: -12, vel: 0.7 },
    },
  };

  // ───────── 녹음 곡(데이터가 정함)
  const bgm = () => ((G.data && G.data.bgm) || {});
  const recDef = (name) => (bgm().tracks || {})[name] || null;
  // 합성으로 대신할 곡 이름: 데이터의 synth → 같은 이름의 합성 곡 → calm
  function synthName(name) {
    const d = recDef(name);
    if (d && d.synth && TRACKS[d.synth]) return d.synth;
    return TRACKS[name] ? name : 'calm';
  }
  const decode = (c, ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)); // 옛 사파리는 콜백 꼴만 된다
  const bytes = {};          // 곡 이름 → 내려받은 파일(Promise<ArrayBuffer>)
  const decoded = new Map(); // 곡 이름 → 풀어 둔 소리(최근 세 곡)
  const failed = {};         // 못 받은 곡(합성으로 대신)
  function fetchRec(name) {
    const d = recDef(name);
    if (!bytes[name]) {
      bytes[name] = fetch(d.file).then((r) => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.arrayBuffer(); });
      bytes[name].catch(() => { delete bytes[name]; });
    }
    return bytes[name];
  }
  async function loadRec(name) {
    if (decoded.has(name)) { const it = decoded.get(name); decoded.delete(name); decoded.set(name, it); return it; }
    const buf = await decode(ctx, (await fetchRec(name)).slice(0)); // 풀면 원본이 비워지므로 복사본을 넘긴다
    // MP3 앞뒤의 빈 틈: len(반복 길이)이 적혀 있으면 그만큼만 반복한다
    const len = Math.min(recDef(name).len || buf.duration, buf.duration);
    let start = 0;
    const extra = buf.duration - len;
    if (extra > 0.005) {
      const d = buf.getChannelData(0), lim = Math.floor(Math.min(extra, 0.08) * buf.sampleRate);
      let i = 0; while (i < lim && Math.abs(d[i]) < 1e-4) i++;
      start = i / buf.sampleRate;
    }
    const it = { buf, start, len: Math.min(len, buf.duration - start) };
    decoded.set(name, it);
    while (decoded.size > 3) decoded.delete(decoded.keys().next().value);
    return it;
  }
  // 곧 쓸 곡 파일을 미리 받아 둔다(파일로 열었을 때는 하지 않는다)
  A.prefetch = function (...names) {
    if (viaElement || !S().music) return;
    for (const n of names) if (recDef(n) && recDef(n).file && !failed[n]) fetchRec(n).catch(() => { failed[n] = true; });
  };

  // 출처 표시(공공누리 제1유형): 타이틀에는 짧게, 설정에는 온전히
  A.credit = () => bgm().credit || '배경음 국립국악원 「디지털 이음」 국악기 연주(공공누리 제1유형)';
  A.creditFull = function () {
    if (bgm().creditFull) return bgm().creditFull;
    const srcs = [...new Set(Object.values(bgm().tracks || {}).map((t) => t.src).filter(Boolean))];
    return '배경음은 국립국악원이 공공누리 제1유형으로 개방한 「디지털 이음」 국악기 연주 악구' +
      (srcs.length ? '(' + srcs.join('·') + ')' : '') +
      '를 이어 붙여 썼어요. 녹음을 불러오지 못하면 브라우저에서 합성한 가락으로 대신해요. 효과음은 브라우저에서 합성해요.';
  };
  function buildTrack(def) {
    const u = def.unit, ev = [];
    const L = parse(def.lead.mel, def.mode, def.tonic);
    const total = L.len;
    let prevEnd = -1, prevMidi = null;
    for (const n of L.notes) {
      const legato = def.lead.inst !== 'gayageum' && Math.abs(n.pos - prevEnd) < 0.01;
      ev.push({ t: n.pos * u, inst: def.lead.inst, midi: n.midi, dur: n.dur * u * (def.lead.inst === 'gayageum' ? 1 : 0.97), vel: def.lead.vel, orn: n.orn, prev: legato ? prevMidi : null });
      prevEnd = n.pos + n.dur; prevMidi = n.midi;
    }
    // 둘째 소리(헤테로포니: 같은 선율을 길게 따라 부른다)
    const S2 = def.second;
    if (S2) for (const n of L.notes) if (n.dur >= S2.min) ev.push({ t: n.pos * u, inst: S2.inst, midi: n.midi + S2.oct, dur: n.dur * u * 0.95, vel: S2.vel, orn: n.orn.replace('<', '') });
    // 반주
    const C = def.acc;
    if (C) {
      if (C.style === 'beats' || C.style === 'bass') {
        for (const n of L.notes) {
          if (n.pos % C.beat !== 0) continue;
          const m = C.style === 'bass' ? snap(n.midi + C.oct - (n.midi - def.tonic >= 12 ? 12 : 0), def.mode, def.tonic) : n.midi + C.oct;
          ev.push({ t: n.pos * u, inst: C.inst, midi: m, dur: Math.min(n.dur, C.beat * 2) * u, vel: C.vel, orn: n.dur >= C.beat * 2 ? '~' : '' });
        }
      } else if (C.style === 'arp') {
        for (let b = 0; b * def.bar < total; b++) {
          const first = L.notes.find((n) => n.pos >= b * def.bar) || L.notes[0];
          const root = first.midi + C.oct - 12 * Math.max(0, Math.floor((first.midi - def.tonic) / 12));
          const tones = [root, snap(root + 7, def.mode, def.tonic), root + 12, snap(root + 7, def.mode, def.tonic)];
          for (let k = 0; k * C.beat < def.bar; k++) ev.push({ t: (b * def.bar + k * C.beat) * u, inst: C.inst, midi: tones[k % 4], dur: C.beat * u * 1.5, vel: C.vel * (k === 0 ? 1.15 : 0.85), orn: '' });
        }
      } else if (C.style === 'ostinato') {
        const O = parse(C.mel, def.mode, def.tonic);
        for (let b = 0; b * def.bar < total; b++) for (const n of O.notes) ev.push({ t: (b * def.bar + n.pos) * u, inst: C.inst, midi: n.midi, dur: n.dur * u, vel: C.vel, orn: '' });
      } else if (C.style === 'chord') {
        for (let b = 0; b * def.bar < total; b++) {
          const first = L.notes.find((n) => n.pos >= b * def.bar) || L.notes[0];
          const root = def.tonic + C.oct + ((first.midi - def.tonic) % 12 + 12) % 12;
          for (const m of [root - 12, snap(root - 5, def.mode, def.tonic), root]) ev.push({ t: b * def.bar * u, inst: 'pad', midi: m, dur: def.bar * u, vel: C.vel, orn: '' });
        }
      }
    }
    // 장단·징·지속음
    const bars = Math.round(total / def.bar), dv = def.drum == null ? 1 : def.drum;
    for (let b = 0; b < bars; b++) {
      if (def.jangdan) for (const [p, k, v] of JANGDAN[def.jangdan]) ev.push({ t: (b * def.bar + p) * u, drum: k, vel: v * dv });
      if (def.jing && def.jing.includes(b)) ev.push({ t: b * def.bar * u + 0.01, drum: 'jing', vel: 0.8 });
      if (def.drone && b % 2 === 0) ev.push({ t: b * def.bar * u, inst: 'drone', midi: def.drone, dur: def.bar * 2 * u, vel: 1 });
    }
    ev.sort((a, b) => a.t - b.t);
    return { notes: ev, length: total * u };
  }

  function playEvent(n, t, out) {
    if (n.drum) return hit(t, n.drum, n.vel, out);
    if (n.inst === 'gayageum') gayageum(t, n.midi, n.dur, n.vel, n.orn, out);
    else if (n.inst === 'daegeum') daegeum(t, n.midi, n.dur, n.vel, n.orn, out, n.prev);
    else if (n.inst === 'haegeum') haegeum(t, n.midi, n.dur, n.vel, n.orn, out, n.prev);
    else if (n.inst === 'drone') drone(t, n.midi, n.dur, n.vel, out);
    else if (n.inst === 'pad') pad(t, n.midi, n.dur, n.vel, out);
  }

  // ───────── 재생
  // file://로 열면 브라우저가 fetch로 파일 읽기를 막는다 → 그때는 <audio>로 곧장 튼다(음량은 요소 볼륨으로)
  const viaElement = location.protocol === 'file:';
  function fadeEl(el, to, sec, done) {
    clearInterval(el._fade);
    const from = el.volume, steps = Math.max(1, Math.round(sec * 20));
    let k = 0;
    el._fade = setInterval(() => {
      el.volume = Math.max(0, Math.min(1, from + (to - from) * (++k / steps)));
      if (k >= steps) { clearInterval(el._fade); if (done) done(); }
    }, 50);
  }
  const built = {};
  const trackOf = (name) => built[name] || (built[name] = buildTrack(TRACKS[name]));
  let sched = null, cur = null;

  function startTrack(name) {
    stopTrack(true);
    const d = recDef(name);
    if (d && d.file && !failed[name]) return viaElement ? startElement(name, d) : startRec(name, d);
    startSynth(name);
  }
  function startRec(name, d) {
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(musicBus);
    if (d.wet) { const w = gainNode(d.wet); bus.connect(w); w.connect(revIn); }
    const me = (cur = { name, bus, rec: true, src: null });
    loadRec(name).then((r) => {
      if (cur !== me) return;
      const src = ctx.createBufferSource();
      src.buffer = r.buf; src.loop = true; src.loopStart = r.start; src.loopEnd = r.start + r.len;
      src.connect(bus);
      const t = ctx.currentTime + 0.05;
      src.start(t, r.start);
      me.src = src;
      bus.gain.setValueAtTime(0.0001, t);
      bus.gain.exponentialRampToValueAtTime(d.gain || 1, t + 1.5);
    }).catch(() => {
      failed[name] = true;
      if (cur === me) { cur = null; bus.disconnect(); startSynth(name); }
    });
  }
  function startElement(name, d) {
    const el = new Audio(d.file); el.loop = true; el.volume = 0;
    const me = (cur = { name, el, rec: true, src: null });
    const fail = () => { failed[name] = true; if (cur === me) { cur = null; el.pause(); startSynth(name); } };
    el.addEventListener('error', fail, { once: true });
    el.play().then(() => {
      if (cur !== me) { el.pause(); return; }
      me.src = el;
      fadeEl(el, Math.min(1, MUSIC_VOL * (d.gain || 1)), 1.2);
    }).catch((e) => {
      if (e && e.name === 'NotAllowedError') { if (cur === me) cur = null; } // 아직 첫 터치 전: 다음 unlock에서 다시
      else fail();
    });
  }
  function startSynth(name) {
    const sn = synthName(name);
    const tr = trackOf(sn);
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(musicBus);
    bus.gain.exponentialRampToValueAtTime(TRACKS[sn].gain || 1, ctx.currentTime + 1.2);
    const me = (cur = { name, bus, synth: sn, notes: tr.notes, length: tr.length, idx: 0, loopStart: ctx.currentTime + 0.15 });
    const tick = () => {
      if (cur !== me) return;
      const ahead = ctx.currentTime + 0.3;
      for (let guard = 0; guard < 400; guard++) {
        const n = me.notes[me.idx];
        const t = me.loopStart + n.t;
        if (t > ahead) break;
        if (t >= ctx.currentTime - 0.05) { try { playEvent(n, t, me.bus); } catch (e) { /* 무시 */ } }
        me.idx++;
        if (me.idx >= me.notes.length) { me.idx = 0; me.loopStart += me.length + 0.6; } // 한 바퀴 뒤 잠깐 숨
      }
    };
    tick();
    sched = setInterval(tick, 80);
  }
  function stopTrack(fast) {
    if (sched) { clearInterval(sched); sched = null; }
    if (cur && cur.el) { const el = cur.el; fadeEl(el, 0, fast ? 0.6 : 1.2, () => el.pause()); }
    else if (cur && ctx && cur.bus) {
      const b = cur.bus, src = cur.src, now = ctx.currentTime, end = now + (fast ? 0.8 : 1.5);
      b.gain.cancelScheduledValues(now);
      b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), now);
      b.gain.exponentialRampToValueAtTime(0.0001, end);
      if (src && src.stop) { try { src.stop(end + 0.1); } catch (e) { /* 이미 멈춤 */ } }
      setTimeout(() => b.disconnect(), 3000);
    }
    cur = null;
  }
  // 지금 들려야 할 곡을 맞춘다(배경음을 끄거나 화면을 접으면 멈춘다)
  function sync() {
    if (!ctx) return;
    const want = !hushed && S().music && A.track ? A.track : null;
    if (!want) { if (cur) stopTrack(false); return; }
    if (!cur || cur.name !== want) startTrack(want);
  }

  A.unlock = function () {
    A.unlocked = true;
    if (!init()) return;
    if (ctx.state === 'suspended' && !document.hidden && !hushed) ctx.resume();
    sync();
  };
  // 장면의 곡 정하기(같은 곡이면 그대로 이어서). null이면 멈춘다
  A.play = function (name) {
    A.track = name || null;
    sync();
  };
  // 배경음 켜기/끄기(설정)
  A.music = function (want) {
    if (!A.unlocked || !init()) return;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(want ? MUSIC_VOL : 0, now + 0.8);
    if (want && ctx.state === 'suspended' && !hushed) ctx.resume();
    sync();
  };
  // 화면 접기: 모든 소리를 멈춘다 / 다시 펼치기
  A.hush = function () {
    hushed = true;
    stopTrack(true);
    if (ctx && ctx.state === 'running') ctx.suspend();
  };
  A.unhush = function () {
    hushed = false;
    if (ctx && !document.hidden) ctx.resume();
    sync();
  };
  A.hushed = () => hushed;
  function tone(type, f0, f1, dur, vol, t0 = 0) {
    const t = ctx.currentTime + t0;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(dur, vol, f0, f1, type = 'bandpass', t0 = 0, q = 1) {
    const t = ctx.currentTime + t0;
    const n = noise(), f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
  }

  // ───────── 효과음(배경음과 따로 끈다)
  const sfxOn = () => A.unlocked && !hushed && S().sound && init() && ctx.state !== 'closed';
  const pl = (m, dt = 0, v = 0.8, dur = 0.5, orn = '') => gayageum(ctx.currentTime + dt, m, dur, v, orn, sfxBus, 0.25);
  const SFX = {
    tap: () => hiss(0.03, 0.1, 2600, 1800, 'bandpass', 0, 3),                                           // 누르기: 얇은 나무 소리
    pick: () => pl(81, 0, 0.4, 0.25),                                                                   // 낱말·구절 고르기
    place: () => { hit(ctx.currentTime, 'deok', 0.4, sfxBus); pl(79, 0.03, 0.4, 0.3); },               // 칸에 넣기·물건 놓기
    page: () => { hiss(0.24, 0.1, 700, 2800, 'bandpass', 0, 0.7); hiss(0.12, 0.05, 3000, 6500, 'highpass', 0.06); }, // 종이 넘기기
    stamp: () => { hit(ctx.currentTime, 'kung', 0.8, sfxBus); hiss(0.09, 0.16, 800, 200, 'lowpass'); }, // 낙관
    ok: () => { [74, 79, 81, 86].forEach((m, i) => pl(m, i * 0.07, 0.8, 0.7)); hit(ctx.currentTime + 0.02, 'deok', 0.45, sfxBus); }, // 맞음
    no: () => { pl(64, 0, 0.6, 0.45, '>'); pl(62, 0.16, 0.55, 0.6, '>'); },                          // 틀림: 가야금을 꺾어 내린다
    hint: () => daegeum(ctx.currentTime, 81, 0.7, 0.6, '~', sfxBus, null, 0.4),                       // 여백 메모
    step: () => { hit(ctx.currentTime, 'deok', 0.25, sfxBus); hit(ctx.currentTime + 0.16, 'deok', 0.18, sfxBus); }, // 말이 한 칸 감
    pearl: () => { pl(86, 0, 0.6, 0.4); pl(91, 0.08, 0.6, 0.9, '~'); hiss(0.6, 0.04, 2400, 6000, 'highpass', 0.02); }, // 구슬 찾음
    chapter: () => { hit(ctx.currentTime, 'jing', 0.55, sfxBus); hit(ctx.currentTime, 'buk', 0.6, sfxBus); }, // 장 펼치기
    // 지팡이 소리: 마른 나무를 두 번 두드리고, 징이 길게 남는다(깨어남)
    staff: () => {
      const t = ctx.currentTime;
      [0, 0.42].forEach((dt, i) => {
        hit(t + dt, 'kung', i ? 0.9 : 0.7, sfxBus);
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(420, t + dt); o.frequency.exponentialRampToValueAtTime(180, t + dt + 0.09);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.5, t + dt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.12);
        o.connect(g); send(g, sfxBus, 0.6); o.start(t + dt); o.stop(t + dt + 0.15);
      });
      hit(t + 0.9, 'jing', 0.7, sfxBus);
    },
    wake: () => { pad(ctx.currentTime, 69, 2.2, 0.8, sfxBus); pl(81, 0.3, 0.35, 1.2, '~'); },          // 빈 선방
    fanfare: () => { [67, 69, 72, 74, 76, 79, 81].forEach((m, i) => pl(m, i * 0.08, 0.75, 0.9)); hit(ctx.currentTime + 0.6, 'jing', 0.8, sfxBus); hit(ctx.currentTime + 0.6, 'buk', 0.7, sfxBus); },
  };
  SFX.roll = () => { [0, 0.06, 0.13, 0.22].forEach((t, i) => tone('triangle', 260 + i * 60, 140, 0.05, 0.12, t)); };
  SFX.gradeNear = () => { [60, 64].forEach((m, i) => pl(m, i * 0.12, 0.35, 0.5)); };
  SFX.gradeFine = () => { [60, 64, 67].forEach((m, i) => pl(m, i * 0.10, 0.45, 0.6)); };
  SFX.gradeShine = () => { [60, 64, 67, 72].forEach((m, i) => pl(m, i * 0.08, 0.60, 0.7)); };
  SFX.shatter = () => { hiss(1.1, 0.18, 5000, 160, 'highpass'); [0, 0.12, 0.28].forEach((t, i) => tone('triangle', 180 - i * 30, 40, 0.4, 0.12, t)); };
  for (const k of Object.keys(SFX)) A[k] = () => { if (!sfxOn()) return; try { SFX[k](); } catch (e) { /* 무시 */ } };
  A.SFX_NAMES = Object.keys(SFX);
  // 위기 도전의 가락 한 음: flute는 대금 소리로 퉁소를, zither는 가야금 소리로 거문고를 대신한다.
  A.note = (midi, instrument) => {
    if (!sfxOn()) return;
    try { if (instrument === 'flute') daegeum(ctx.currentTime, midi, 0.45, 0.7, '', sfxBus, null, 0.35); else pl(midi, 0, 0.8, 0.6); } catch (e) { /* 무시 */ }
  };
  A.grade = (grade) => A[{ near: 'gradeNear', fine: 'gradeFine', shine: 'gradeShine' }[grade] || 'gradeNear']();

  // ───────── 점검용: 곡을 오프라인으로 렌더해 AudioBuffer로 돌려준다(게임과 같은 소리 길)
  //  opt.synth === true 이면 녹음이 있어도 합성 곡을 렌더한다
  A.render = async function (name, seconds = 20, rate = 44100, opt = {}) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(2, Math.ceil(seconds * rate), rate);
    const d = recDef(name);
    if (d && d.file && opt.synth !== true) {
      const buf = await off.decodeAudioData((await fetchRec(name)).slice(0));
      const g = buildGraph(off);
      const tb = off.createGain(); tb.gain.value = d.gain || 1; tb.connect(g.musicBus);
      const src = off.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(tb); src.start(0, Math.min(10, buf.duration / 3));
      return off.startRendering();
    }
    const saved = [ctx, comp, musicBus, sfxBus, revIn, ksCache, noiseBuf];
    try {
      ctx = off; ksCache = {}; noiseBuf = null;
      ({ comp, musicBus, sfxBus, revIn } = buildGraph(off));
      const sn = synthName(name), tr = buildTrack(TRACKS[sn]);
      const tb = off.createGain(); tb.gain.value = TRACKS[sn].gain || 1; tb.connect(musicBus);
      for (let loop = 0; loop * tr.length < seconds; loop++) {
        for (const n of tr.notes) { const t = loop * (tr.length + 0.6) + n.t + 0.05; if (t < seconds) playEvent(n, t, tb); }
      }
    } finally {
      [ctx, comp, musicBus, sfxBus, revIn, ksCache, noiseBuf] = saved;
    }
    return off.startRendering();
  };
  A.now = () => (cur ? cur.name : null);                                        // 지금 흐르는(또는 받는 중인) 곡 이름
  A.via = () => (cur ? (cur.el ? 'element' : cur.synth ? 'synth' : 'rec') : null); // 어떻게 트는지(점검용)
  A.TRACKS = TRACKS;
})();
