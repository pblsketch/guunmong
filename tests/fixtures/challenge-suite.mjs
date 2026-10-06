import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness, ROOT, ready, start, state, seekTarget, challenge } from './rpg-harness.mjs';

// 위기 도전과 생각 선택(결정 0019). 실제 제품 HTML과 실제 단추로만 조작한다.
const h = await harness();
const out = path.join(ROOT, 'tests/shots/challenges'); fs.mkdirSync(out, { recursive: true });
const passed = [], failures = [];
async function test(name, fn) {
  try { await fn(); passed.push(name); console.log('PASS 도전 ' + name); }
  catch (error) { failures.push(name); console.error('FAIL 도전 ' + name + ': ' + error.stack); }
}
async function page(viewport = { width: 390, height: 844 }, big = false) {
  const context = await h.browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  context.on('page', h.observe);
  const p = await context.newPage();
  p.close = () => context.close();
  if (big) {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    await p.locator('[data-tool="settings"]').click(); await p.locator('[data-set="big"]').click(); await p.keyboard.press('Escape');
  }
  return p;
}
// 선생님용 주소로 마친 장면처럼 다시 읽기를 열고, 원하는 필수 행동의 도전 창까지 실제 대상 목록·행동 단추·대사로 간다.
async function openChallenge(p, scene, id) {
  await p.goto(h.origin + '/index.html?teacher=1&scene=' + scene); await ready(p);
  await p.waitForSelector('[data-world]');
  for (let i = 0; i < 40; i++) {
    if (await p.locator('.challenge-book[data-challenge-id="' + id + '"]').count()) return;
    if (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) { await p.locator('[data-dialogue] .choice-tray [data-talk]').first().click(); continue; }
    if (await p.locator('[data-dialogue]').count()) { await p.locator('[data-dialogue] [data-act="next"]').click(); continue; }
    const t = await p.evaluate(() => document.querySelector('.world-object.required')?.dataset.object);
    assert.ok(t, '도전 전에 필수 대상이 사라짐: ' + id);
    await seekTarget(p, t);
    await p.locator('[data-act="interact"][data-target="' + t + '"]').click();
  }
  throw Error('도전 창이 열리지 않음: ' + id);
}
const data = (p, id) => p.evaluate(id => JSON.parse(JSON.stringify(G.data.challenges.find(c => c.id === id))), id);
const feedback = p => p.locator('.challenge-feedback').evaluate(el => ({ text: el.textContent, tone: el.dataset.tone }));

await test('고르기: 오답의 이야기 속 대가·그 선택지만 잠김·정답 뒤 노트와 이어 가기', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e02-tianjin', 'ch-tianjin-poem');
    const c = await data(p, 'ch-tianjin-poem'), wrong = c.options.find(o => o.id !== c.answer);
    assert.equal(await p.locator('.challenge-note').count(), 0, '풀기 전 원작 노트 노출');
    await p.locator('[data-option="' + wrong.id + '"]').click();
    assert.deepEqual(await feedback(p), { text: wrong.reply, tone: 'fail' });
    assert.equal(await p.locator('[data-option="' + wrong.id + '"]').isDisabled(), true);
    assert.equal(await p.locator('[data-option="' + c.answer + '"]').isDisabled(), false);
    await p.locator('[data-option="' + c.answer + '"]').click();
    assert.equal((await feedback(p)).tone, 'ok');
    assert.equal(await p.locator('.challenge-note').count(), 1);
    await p.locator('[data-challenge="continue"]').click();
    await p.waitForSelector('[data-dialogue]');
    assert.equal(await p.locator('.world-challenge').count(), 0);
  } finally { await p.close(); }
});

await test('찾기: 틀린 자리 단서·기회 감소·소진 뒤 실패 서술과 다시 하기 초기화·정답', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e09-yoyeon', 'ch-yoyeon-night');
    const c = await data(p, 'ch-yoyeon-night'), misses = c.spots.filter(s => s.id !== c.answer).slice(0, c.tries);
    for (const [i, spot] of misses.entries()) {
      await p.locator('[data-spot="' + spot.id + '"]').click();
      assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries - i - 1));
      assert.match(await p.locator('[data-spot="' + spot.id + '"]').innerText(), new RegExp(spot.clue.slice(0, 6)));
    }
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    assert.equal(await p.locator('[data-spot="' + c.answer + '"]').isDisabled(), true, '기회가 다한 뒤에도 고를 수 있음');
    await p.locator('[data-challenge="retry"]').click();
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries));
    assert.equal(await p.locator('.challenge-spot.checked').count(), 0);
    await p.locator('[data-spot="' + c.answer + '"]').click();
    assert.deepEqual(await feedback(p), { text: c.success, tone: 'ok' });
    await p.locator('[data-challenge="continue"]').click();
    await p.waitForSelector('[data-dialogue]');
  } finally { await p.close(); }
});

await test('추리: 단서를 모두 펼치기 전 질문 숨김·오답 서술·정체 노트는 성공 뒤에만', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e06-gyeonghong', 'ch-gyeonghong-who');
    const c = await data(p, 'ch-gyeonghong-who');
    assert.equal(await p.locator('.challenge-question').isHidden(), true);
    assert.ok(!(await p.locator('.challenge-book').innerText()).includes('적경홍'), '풀기 전 정체 노출');
    for (let i = 0; i < c.clues.length - 1; i++) await p.locator('[data-clue="' + i + '"]').click();
    assert.equal(await p.locator('.challenge-question').isHidden(), true, '단서를 다 보기 전에 질문이 열림');
    await p.locator('[data-clue="' + (c.clues.length - 1) + '"]').click();
    assert.equal(await p.locator('.challenge-question').isVisible(), true);
    await p.locator('[data-option="' + c.options.find(o => o.id !== c.answer).id + '"]').click();
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    await p.locator('[data-option="' + c.answer + '"]').click();
    await p.locator('.challenge-note summary').click();
    assert.match(await p.locator('.challenge-note').innerText(), /적경홍/);
    await p.locator('[data-challenge="continue"]').click();
  } finally { await p.close(); }
});

await test('가락: 들려주는 동안 입력 잠금·틀린 음 실패·두 가락 성공 뒤 단추가 다시 풀리지 않음', async () => {
  const p = await page({ width: 844, height: 390 });
  try {
    await openChallenge(p, 'e07-tungso', 'ch-tungso-melody');
    const c = await data(p, 'ch-tungso-melody');
    assert.equal(await p.locator('[data-note="0"]').isDisabled(), true, '가락을 들려주는 중 입력 가능');
    await p.waitForSelector('.challenge-book[data-round="0"][data-ready="true"]', { timeout: 20000 });
    const wrongNote = (c.rounds[0][0] + 1) % c.notes.length;
    await p.locator('[data-note="' + wrongNote + '"]').click();
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    for (const [round, notes] of c.rounds.entries()) {
      await p.waitForSelector('.challenge-book[data-round="' + round + '"][data-ready="true"]', { timeout: 20000 });
      for (const n of notes) await p.locator('[data-note="' + n + '"]').click();
    }
    assert.equal(await p.locator('.challenge-book').getAttribute('data-solved'), 'true');
    await p.waitForTimeout(2600);
    assert.equal(await p.locator('.challenge-pad:not([disabled])').count(), 0, '성공 뒤 예약된 가락이 단추를 다시 풂');
    await p.screenshot({ path: path.join(out, 'tungso-844x390-solved.png') });
    await p.locator('[data-challenge="continue"]').click();
    await p.waitForSelector('[data-dialogue]');
  } finally { await p.close(); }
});

await test('물러나기: 창이 닫히고 같은 대상에서 처음부터 다시 열림', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e10-neungpa', 'ch-bansagok-water');
    const c = await data(p, 'ch-bansagok-water');
    await p.locator('[data-spot="' + c.spots.find(s => s.id !== c.answer).id + '"]').click();
    await p.locator('[data-challenge="leave"]').click();
    assert.equal(await p.locator('.world-challenge').count(), 0);
    assert.equal(await p.locator('[data-dialogue]').count(), 0, '물러났는데 대사가 이어짐');
    await p.waitForFunction(() => document.querySelector('[data-act="interact"]')?.disabled === false);
    await p.locator('[data-act="interact"]').click();
    await p.waitForSelector('.challenge-book[data-challenge-id="ch-bansagok-water"]');
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries));
    await challenge(p);
    await p.waitForSelector('[data-dialogue]');
  } finally { await p.close(); }
});

await test('화면 이탈: 처음 화면으로 나가면 도전 창·예약된 가락이 정리됨', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e07-tungso', 'ch-tungso-melody');
    await p.locator('[data-tool="home"], .topbar .icon-btn').first().click();
    await p.waitForFunction(() => !document.querySelector('.world-challenge'));
    await p.waitForTimeout(3000);
    assert.equal(await p.locator('.world-challenge, .challenge-book').count(), 0);
  } finally { await p.close(); }
});

for (const [tag, viewport, big] of [['390x844-big', { width: 390, height: 844 }, true], ['844x390', { width: 844, height: 390 }, false], ['844x390-big', { width: 844, height: 390 }, true], ['667x375', { width: 667, height: 375 }, false]]) {
  await test('가로·세로·큰 글자 ' + tag + ': 도전 창 단추가 모두 스크롤로 닿고 가리지 않음', async () => {
    const p = await page(viewport, big);
    try {
      await openChallenge(p, 'e09-yoyeon', 'ch-yoyeon-night');
      const bad = await p.evaluate(() => {
        const book = document.querySelector('.challenge-book'), r = book.getBoundingClientRect(), issues = [];
        if (r.top < 0 || r.bottom > innerHeight + 1 || r.left < 0 || r.right > innerWidth + 1) issues.push('창이 화면 밖 ' + JSON.stringify(r));
        for (const b of book.querySelectorAll('button')) {
          b.scrollIntoView({ block: 'nearest' });
          const q = b.getBoundingClientRect(), hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
          if (q.width < 40 || q.height < 40) issues.push('작은 단추 ' + b.textContent);
          if (!b.contains(hit)) issues.push('가린 단추 ' + b.textContent);
        }
        return issues;
      });
      await p.screenshot({ path: path.join(out, 'yoyeon-' + tag + '.png') });
      assert.deepEqual(bad, []);
    } finally { await p.close(); }
  });
}

await test('생각 선택: 학생 첫 장면에서 세 말 중 고른 반응을 보고 원작 대사로 이어지며 행동이 한 번 기록됨', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    await seekTarget(p, 'bridge-fairy');
    await p.locator('[data-act="interact"][data-target="bridge-fairy"]').click();
    const c = await data(p, 'ch-bridge-reply');
    for (let i = 0; i <= c.at; i++) {
      assert.equal(await p.locator('.choice-tray').count(), 0, '선택이 너무 일찍 나옴');
      await p.locator('[data-dialogue] [data-act="next"]').click();
    }
    await p.waitForSelector('.choice-tray');
    assert.equal(await p.locator('.choice-tray [data-talk]').count(), c.options.length);
    assert.equal(await p.locator('.stage-dialogue').innerText(), c.prompt);
    assert.equal(await p.locator('.stage-speaker').innerText(), '', '생각 선택 질문 줄에 상대 이름이 화자로 찍힘');
    const picked = c.options[1];
    await p.locator('[data-talk="' + picked.id + '"]').click();
    assert.equal(await p.locator('.stage-dialogue').innerText(), picked.reply.text);
    assert.equal(await p.locator('.stage-speaker').innerText(), '연두 띠의 선녀');
    while (await p.locator('[data-dialogue]').count()) await p.locator('[data-dialogue] [data-act="next"]').click();
    const s = await state(p);
    assert.deepEqual(s.rpg.scenes['c1-bridge'].actions.map(a => a.id), ['bridge-meet']);
    assert.ok(!JSON.stringify(s).includes(picked.id), '고른 말이 저장에 남음');
  } finally { await p.close(); }
});

await test('물건 행동의 대사 이름 칸은 물건 이름이 아니라 말하는 인물', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    await seekTarget(p, 'bridge-fairy');
    await p.locator('[data-act="interact"][data-target="bridge-fairy"]').click();
    while (await p.locator('[data-dialogue]').count()) {
      if (await p.locator('.choice-tray [data-talk]').count()) await p.locator('.choice-tray [data-talk]').first().click();
      else await p.locator('[data-dialogue] [data-act="next"]').click();
    }
    await seekTarget(p, 'bridge-flower');
    await p.locator('[data-act="interact"][data-target="bridge-flower"]').click();
    await p.waitForSelector('[data-dialogue]');
    assert.equal(await p.locator('.stage-speaker').innerText(), '성진');
  } finally { await p.close(); }
});

await test('임무 창: 새로 시작하면 돌다리 위에 먼저 뜨고 이동이 멈추며, 닫으면 진행하고 이어 하기에는 다시 뜨지 않음', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html'); await ready(p);
    await p.getByRole('button', { name: '시작하기', exact: true }).click();
    await p.waitForSelector('.mission-sheet [data-mission="start"]');
    await p.waitForSelector('[data-world]');
    const m = await p.evaluate(() => JSON.parse(JSON.stringify(G.data.notes.mission)));
    const text = await p.locator('.mission-sheet').innerText();
    for (const part of [m.title, m.why, ...m.goals]) assert.ok(text.includes(part), '임무 글 누락: ' + part);
    assert.ok(!/미색|인연 d|여덟 인연/.test(text), '임무 창에 미색·인연 개수 노출');
    assert.equal(await p.locator('.world-screen').getAttribute('data-paused'), 'true', '임무 창이 떠 있는데 필드가 움직임');
    const before = JSON.stringify((await state(p)).rpg);
    await p.locator('[data-mission="start"]').click();
    await p.waitForFunction(() => !document.querySelector('.mission-sheet') && document.querySelector('.world-screen')?.dataset.paused === 'false');
    assert.equal(JSON.stringify((await state(p)).rpg), before, '임무 창이 기록을 바꿈');
    await p.reload(); await ready(p);
    await p.getByRole('button', { name: '이어 하기', exact: true }).click(); await p.waitForSelector('[data-world]');
    await p.waitForTimeout(300);
    assert.equal(await p.locator('.mission-sheet').count(), 0, '이어 하기에 임무 창이 다시 뜸');
  } finally { await p.close(); }
});

await test('이야기 지도: 휴대폰 위 막대의 위치, 지금 위치·진행 막대·현실/꿈 표시·임무 다시 보기', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    const pos = p.locator('.topbar [data-position]');
    assert.equal(await pos.isVisible(), true, '휴대폰 위 막대에 이야기 위치가 안 보임');
    const total = await p.evaluate(() => G.app.list().length);
    assert.equal((await pos.innerText()).trim(), '· 1/' + total);
    await p.locator('.topbar .where').click();
    await p.waitForSelector('.toc-sheet [data-story-now]');
    const now = await p.locator('[data-story-now]').innerText();
    assert.match(now, /지금 위치/); assert.match(now, /돌다리에서/); assert.match(now, new RegExp('1/' + total));
    const frames = await p.locator('.toc-title .frame').evaluateAll(els => els.map(el => el.dataset.frame));
    assert.ok(frames.includes('real') && frames.includes('dream') && frames.includes('wake'), '현실·꿈·깨어남 구조 표시 없음: ' + frames);
    await p.locator('.story-mission summary').click();
    assert.equal(await p.locator('.story-mission .mission-goals li').count(), 3);
    await p.screenshot({ path: path.join(out, 'story-map-390.png') });
  } finally { await p.close(); }
});

const errors = h.errors.splice(0);
await h.close();
assert.deepEqual(errors, [], '브라우저 오류·외부 요청·404');
if (failures.length) { console.error('도전 검사 실패 ' + failures.length + '건: ' + failures.join(', ')); process.exitCode = 1; throw Error('도전 검사 실패'); }
console.log('도전 검사 ' + passed.length + '개 통과');
