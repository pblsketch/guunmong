// 권리 점검(명세 13절·16절, 인계 규칙 7): 공개할 저장소의 모든 파일과 이력에 교과서 파일이 없고, 출판사·유통사 이름이 없는지 본다.
//   node check-rights.mjs        (tests/ 안에서. run-all.mjs가 부른다)
//  - 지금 올라가 있는 파일(git ls-files)과 모든 이력(git log -p --all, 커밋 글 포함)에 쓰면 안 되는 이름 두 개가 없는지
//    (이 파일에도 그 이름이 글자로 남지 않도록 글자 번호로 만든다)
//  - 교과서 파일이 올라가 있지 않은지: design/source/ 아래 파일, 교과서처럼 이름 붙은 .hwp·.hwpx·.pptx·.ppt·.pdf(이력 포함)
//  - .dryforge/(기획 문서)가 어느 이력에도 올라간 적이 없는지
//  - 교과서 본문 추출본(이 기기에만 있음)과 15자 이상 겹치는 글이 올라간 파일에 없는지(추출본이 없으면 건너뜀)
// 하나라도 어긋나면 '✗'를 찍고 종료 코드 1로 끝난다.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
// 교과서 자료는 저장소 바깥(원래 폴더의 design/source/)에만 있다. 작업 폴더(worktree)에서 돌려도 같은 곳을 본다
const SOURCE_DIR = 'E:/github/고전 문학 게임/구운몽/design/source';
const TEXTBOOK = path.join(SOURCE_DIR, '교과서_본문추출.txt');
const issues = [];
const log = (...a) => console.log(...a);
const ok = (cond, where, msg) => { if (!cond) { issues.push(`${where}: ${msg}`); log('  ✗', `${where}: ${msg}`); } return !!cond; };

// 쓰면 안 되는 이름 두 개(출판사·유통사). 글자 번호로 만든다
const BANNED = [[0xC9C0, 0xD559, 0xC0AC], [0xD2F0, 0xC194, 0xB8E8, 0xC158]].map((c) => String.fromCharCode(...c));
const BANNED_LABEL = ['출판사 이름', '유통사 이름'];

function git(args, opt = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: opt.buffer ? 'buffer' : 'utf8', maxBuffer: 1024 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' 실패: ' + (r.stderr || '').toString().slice(0, 300));
  return r.stdout;
}
// git이 한글 경로를 \354\233... 처럼 따옴표로 감싸지 않게 한다
const GIT_Q = ['-c', 'core.quotepath=false'];

// ───────── 1. 올라가 있는 파일
log('▶ 올라가 있는 파일');
const tracked = git([...GIT_Q, 'ls-files', '-z']).split('\0').filter(Boolean);
log('  파일 ' + tracked.length + '개');
const isBinary = (buf) => buf.subarray(0, 8192).includes(0);
const texts = []; // { f, t }
for (const f of tracked) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue; // 지운 뒤 아직 커밋하지 않은 파일
  const buf = fs.readFileSync(p);
  // 그림·소리·글꼴 같은 바이너리도 이름이 UTF-8로 박혀 있을 수 있으니 바이트로 찾는다
  for (let i = 0; i < BANNED.length; i++) ok(!buf.includes(Buffer.from(BANNED[i], 'utf8')), 'words', f + '에 ' + BANNED_LABEL[i] + '이 있음');
  if (!isBinary(buf)) texts.push({ f, t: buf.toString('utf8') });
}

// ───────── 2. 모든 이력(모든 가지·태그, 바이너리도 글로 펼쳐서)과 커밋 글
log('▶ 이력');
const revs = git(['rev-list', '--all']).split('\n').filter(Boolean);
const history = git([...GIT_Q, 'log', '-p', '--all', '--text', '--no-color', '--format=commit %H%n%B'], { buffer: true });
for (let i = 0; i < BANNED.length; i++) {
  const hit = history.indexOf(Buffer.from(BANNED[i], 'utf8'));
  if (!ok(hit < 0, 'history', '이력(내용 또는 커밋 글)에 ' + BANNED_LABEL[i] + '이 있음')) {
    const before = history.subarray(0, hit).toString('utf8');
    const c = before.lastIndexOf('commit ');
    log('    첫 자리: ' + before.slice(c, c + 47) + ' 근처');
  }
}
// 이력에 한 번이라도 올라간 파일 이름
const everNames = new Set(git([...GIT_Q, 'log', '--all', '--name-only', '--format=']).split('\n').map((s) => s.trim()).filter(Boolean));
for (const f of tracked) everNames.add(f);
log('  커밋 ' + revs.length + '개 · 이력에 나온 파일 이름 ' + everNames.size + '개');

// ───────── 3. 교과서 파일과 기획 문서
log('▶ 교과서 파일·기획 문서');
const DOC_EXT = /\.(hwp|hwpx|pptx?|pdf)$/i;
// 교과서처럼 이름 붙은 파일: 교과서·지도서·학습지·활동지·제재 정리·작가 소개·단원, 또는 design/source/에 있는 파일과 같은 이름
const TEXTBOOK_NAME = /교과서|지도서|학습지|활동지|제재\s*정리|작가\s*소개|단원|공통국어|textbook/i;
const sourceNames = fs.existsSync(SOURCE_DIR) ? new Set(fs.readdirSync(SOURCE_DIR).map((n) => n.normalize('NFC'))) : new Set();
for (const f of everNames) {
  const name = f.normalize('NFC');
  const base = name.split('/').pop();
  ok(!/^design\/source\//.test(name), 'source', '교과서 자료 폴더(design/source/)의 파일이 올라간 적이 있음: ' + f);
  ok(!/^\.dryforge(\/|$)/.test(name), 'dryforge', '기획 문서(.dryforge/)가 올라간 적이 있음: ' + f);
  ok(!(DOC_EXT.test(base) && TEXTBOOK_NAME.test(base)), 'source', '교과서처럼 이름 붙은 문서 파일이 올라간 적이 있음: ' + f);
  ok(!sourceNames.has(base), 'source', 'design/source/의 교과서 파일과 같은 이름의 파일이 올라간 적이 있음: ' + f);
}
// .gitignore가 둘을 빼고 있는지(앞으로 실수로 올리지 않게)
const ignored = (p) => spawnSync('git', ['check-ignore', '-q', '--no-index', p], { cwd: ROOT }).status === 0;
ok(ignored('.dryforge/spec.md'), 'gitignore', '.gitignore가 .dryforge/를 빼지 않음');
ok(ignored('design/source/x.pdf'), 'gitignore', '.gitignore가 design/source/를 빼지 않음');
log('  교과서 자료 폴더 ' + (sourceNames.size ? sourceNames.size + '개 파일과 이름을 견줌' : '없음(이름 견주기 건너뜀)'));

// ───────── 4. 교과서 본문 추출본과 15자 이상 겹치는 글(공백·문장부호를 뺀 글자로 잰다. check-content.mjs와 같은 잣대)
log('▶ 교과서 본문과 겹침');
const N = 15;
const norm = (s) => String(s).replace(/\*\*/g, '').replace(/\{([^}|]+)\|[\w-]+\}/g, '$1').replace(/\[\[[\w-]+\]\]/g, '').replace(/[\s.,!?'"“”‘’·…\-—–()\[\]{}「」『』《》〈〉:;~|\/\\]/g, '');
if (fs.existsSync(TEXTBOOK)) {
  const tb = norm(fs.readFileSync(TEXTBOOK, 'utf8'));
  const grams = new Set();
  for (let i = 0; i + N <= tb.length; i++) grams.add(tb.slice(i, i + N));
  let hits = 0;
  for (const { f, t } of texts) {
    // 한 파일에서 겹치는 곳을 모두 모아 처음 몇 개만 보인다
    const lines = t.split('\n');
    const found = [];
    lines.forEach((line, li) => {
      const s = norm(line);
      for (let i = 0; i + N <= s.length; i++) if (grams.has(s.slice(i, i + N))) { found.push((li + 1) + '행 "' + s.slice(i, i + N) + '"'); break; }
    });
    // 줄을 넘는 겹침도 본다(파일 전체를 이어 붙여서)
    if (!found.length) {
      const s = norm(t);
      for (let i = 0; i + N <= s.length; i++) if (grams.has(s.slice(i, i + N))) { found.push('여러 줄에 걸쳐 "' + s.slice(i, i + N) + '"'); break; }
    }
    if (found.length) { hits++; ok(false, 'overlap', f + ' — 교과서 본문과 ' + N + '자 이상 겹침: ' + found.slice(0, 3).join(', ') + (found.length > 3 ? ` 외 ${found.length - 3}곳` : '')); }
  }
  log('  교과서 본문 추출본 ' + tb.length + '자와 글 파일 ' + texts.length + '개를 견줌 · 겹친 파일 ' + hits + '개');
} else log('  교과서 본문 추출본이 이 기기에 없어 겹침 점검을 건너뜀');

log(issues.length ? `✗ 권리 점검 실패 ${issues.length}건` : '✓ 권리 점검 통과');
process.exit(issues.length ? 1 : 0);
