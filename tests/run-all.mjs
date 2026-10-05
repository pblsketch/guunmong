// 전체 완료 문. 선택 실행/음량 생략 없이 명시된 열 검사를 실행하고 원본 출력을 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('./', import.meta.url));
const files = ['check-assets.mjs', 'check-bgm.mjs', 'check-content.mjs', 'check-data.mjs', 'check-dream.mjs', 'check-chapters.mjs', 'check-engine.mjs', 'check-rpg.mjs', 'check-rights.mjs', 'check-sim.mjs'];
fs.mkdirSync(path.join(here, 'shots'), { recursive: true });
const logPath = path.join(here, 'shots', 'run-all-' + new Date().toISOString().replace(/[:.]/g, '-') + '.log');
const output = fs.createWriteStream(logPath);
const log = (s) => { console.log(s); output.write(s + '\n'); };
log('전체 실행 로그: ' + logPath);
let failed = false;
const rows = [];
try {
  if (process.env.ONLY || process.argv.length > 2) throw Error('전체 검사는 선택 실행이나 생략 인자를 받지 않는다');
  const ffmpeg = [process.env.FFMPEG, 'ffmpeg', path.join(os.homedir(), 'ffmpeg/bin/ffmpeg.exe')].find((p) => p && spawnSync(p, ['-version'], { windowsHide: true }).status === 0);
  if (!ffmpeg) throw Error('음량·봉우리 검사에 필요한 ffmpeg가 없다');
  log('ffmpeg: ' + ffmpeg);
  for (const file of files) {
    const started = Date.now(); log('\n▶ ' + file);
    const code = await new Promise((resolve) => {
      const child = spawn(process.execPath, [file], { cwd: here, env: { ...process.env, FFMPEG: ffmpeg }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', (chunk) => { process.stdout.write(chunk); output.write(chunk); });
      child.stderr.on('data', (chunk) => { process.stderr.write(chunk); output.write(chunk); });
      child.on('error', (e) => { log('실행 실패: ' + e.message); resolve(-1); });
      child.on('close', (status) => resolve(status ?? -1));
    });
    const row = (code === 0 ? 'PASS ' : 'FAIL ') + file + ' (exit ' + code + ', ' + ((Date.now() - started) / 1000).toFixed(1) + '초)';
    rows.push(row); log(row);
    if (code !== 0) { failed = true; break; }
  }
} catch (e) { failed = true; log('✗ ' + e.message); }
log('\n' + rows.join('\n'));
log(rows.filter((s) => s.startsWith('PASS')).length + '/' + files.length + ' passed');
await new Promise((resolve) => output.end(resolve));
process.exit(failed || rows.length !== files.length ? 1 : 0);
