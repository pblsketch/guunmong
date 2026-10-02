// 배경음 점검: js/data/bgm.js의 곡마다 MP3가 있거나(크기가 알맞은지) 합성만 쓰는 곡으로 적혀 있는지,
// 기획서 §18의 곡 이름이 모두 있는지, 출처 표시(공공누리 제1유형)가 있는지 본다.
//   node check-bgm.mjs            (tests/ 안에서. run-all.mjs가 부른다)
//     ffmpeg가 있으면 ebur128로 곡마다 음량(LUFS)·봉우리도 재어 -20±2 LUFS, 봉우리 < -0.5 dBTP(클리핑 없음)인지 본다(명세 16절 소리 점검).
//     ffmpeg는 PATH, 환경 변수 FFMPEG, ~/ffmpeg/bin/ffmpeg.exe 순서로 찾는다. 없으면 음량 점검만 건너뛴다고 알린다.
//   node check-bgm.mjs --no-lufs  (음량 재기를 건너뛴다)
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const issues = [];
const ok = (cond, where, msg) => { if (!cond) { issues.push(`${where}: ${msg}`); console.log('  ✗', `${where}: ${msg}`); } return !!cond; };

// 기획서 §18의 곡 이름(멈춤 제외)과 합성 곡 이름(js/core/audio.js TRACKS)
const NAMES = ['calm', 'josin', 'lotus', 'hell', 'spring', 'mountain', 'feast', 'geomungo', 'prank', 'march',
  'tungso', 'palace', 'night', 'water', 'dream', 'chwimi', 'awake', 'reflect'];
const SYNTHS = ['calm', 'lotus', 'dream', 'feast', 'sorrow', 'reflect'];
const PHRASE = /[swm]\d-\d{3}-\d{3}/; // 국립국악원 악구 번호

const file = path.join(ROOT, 'js', 'data', 'bgm.js');
const text = fs.readFileSync(file, 'utf8');
const box = { window: {} };
vm.runInNewContext(text, box, { filename: 'bgm.js' });
const bgm = (box.window.GUUN || {}).bgm;
ok(bgm && typeof bgm === 'object', 'bgm.js', 'window.GUUN.bgm이 없음');
const tracks = (bgm && bgm.tracks) || {};

ok(bgm && tracks[bgm.title], 'title', `타이틀 곡(${bgm && bgm.title})이 tracks에 없음`);
for (const n of NAMES) ok(tracks[n], n, '§18의 곡이 tracks에 없음');

let rec = 0, synthOnly = 0;
for (const [name, t] of Object.entries(tracks)) {
  ok(SYNTHS.includes(t.synth), name, `synth(${t.synth})가 합성 곡 이름이 아님`);
  if (!t.file) { synthOnly++; continue; } // 합성만 쓰는 곡
  rec++;
  ok(t.file === `assets/bgm/${name}.mp3`, name, `파일 경로가 약속(assets/bgm/<이름>.mp3)과 다름: ${t.file}`);
  const f = path.join(ROOT, t.file);
  if (!ok(fs.existsSync(f), name, `${t.file}이 없음`)) continue;
  const size = fs.statSync(f).size;
  ok(size > 50 * 1024 && size < 3 * 1024 * 1024, name, `파일 크기가 이상함(${size} B)`);
  const head = fs.readFileSync(f).subarray(0, 3);
  ok(head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0), name, 'MP3 머리가 아님');
  ok(typeof t.len === 'number' && t.len > 10 && t.len < 300, name, `len(${t.len})이 이상함`);
  if (typeof t.len === 'number') {
    const kbps = (size * 8) / 1000 / t.len;
    ok(kbps > 56 && kbps < 110, name, `길이에 비해 크기가 이상함(${kbps.toFixed(1)} kbps)`);
  }
  ok(typeof t.gain === 'number' && t.gain > 0 && t.gain <= 2, name, `gain(${t.gain})이 이상함`);
  ok(typeof t.src === 'string' && PHRASE.test(t.src), name, 'src에 악구 번호가 없음');
}
ok(rec > 0, 'tracks', '녹음 곡이 하나도 없음');

// 출처 표시(공공누리 제1유형)
for (const k of ['credit', 'creditFull']) {
  const s = bgm && bgm[k];
  ok(typeof s === 'string' && s.includes('국립국악원') && s.includes('디지털 이음') && s.includes('공공누리 제1유형'), k, '출처 문구(국립국악원 「디지털 이음」·공공누리 제1유형)가 없음');
  // 퉁소 곡은 단소 연주로 대신했다(타이틀의 짧은 문구에도 적는다)
  ok(typeof s === 'string' && /퉁소/.test(s) && /단소/.test(s), k, '퉁소 대신 단소를 썼다는 표시가 없음');
}
// 공개 파일에 쓰면 안 되는 이름 두 개(이 파일에도 글자로 남기지 않도록 글자 번호로 적는다)
const BANNED = [[0xC9C0, 0xD559, 0xC0AC], [0xD2F0, 0xC194, 0xB8E8, 0xC158]].map((c) => String.fromCharCode(...c));
for (const w of BANNED) ok(!text.includes(w), 'bgm.js', '쓰면 안 되는 이름이 있음');

// 음량·클리핑(ffmpeg가 있을 때)
if (!process.argv.includes('--no-lufs')) {
  const ff = [process.env.FFMPEG, 'ffmpeg', path.join(os.homedir(), 'ffmpeg', 'bin', 'ffmpeg.exe')]
    .find((p) => p && spawnSync(p, ['-version']).status === 0);
  if (!ff) console.log('  ffmpeg를 찾지 못해 음량(LUFS)·봉우리 점검을 건너뜀(FFMPEG 환경 변수로 위치를 알려 주면 잰다)');
  else {
    console.log('  곡         LUFS   TP(dBTP)');
    for (const [name, t] of Object.entries(tracks)) {
      if (!t.file) { console.log(`  ${name.padEnd(9)}  (합성만)`); continue; }
      const r = spawnSync(ff, ['-hide_banner', '-nostats', '-i', path.join(ROOT, t.file), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
      const I = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
      const P = [...r.stderr.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].pop();
      const i = I ? +I[1] : NaN, p = P ? +P[1] : NaN;
      console.log(`  ${name.padEnd(9)} ${i.toFixed(1).padStart(6)} ${p.toFixed(1).padStart(8)}`);
      ok(Math.abs(i + 20) <= 2, name, `음량이 -20±2 LUFS 밖(${i})`);
      ok(p < -0.5, name, `봉우리가 너무 큼(${p} dBTP)`);
    }
  }
}

console.log(`배경음 ${Object.keys(tracks).length}곡(녹음 ${rec} · 합성만 ${synthOnly})`);
if (issues.length) { console.log(`✗ ${issues.length}건`); process.exit(1); }
console.log('✓ 배경음 점검 통과');
