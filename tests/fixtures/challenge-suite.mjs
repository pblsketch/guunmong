import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { harness, ROOT, ready, start, state, seekTarget, target, challenge } from './rpg-harness.mjs';

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
    // 대상 없는 '이야기 이어 가기' 차례(예: 백룡담에서 진영으로 깸)는 행동 단추로 넘긴다.
    const kind = await p.evaluate(() => G.experience.find(G.data, document.querySelector('.play')?.dataset.scene)?.beats
      .find(b => b.id === document.querySelector('.play')?.dataset.beat)?.trigger.kind);
    if (kind === 'continue') { await p.locator('[data-act="interact"]').click(); continue; }
    const t = await p.evaluate(() => document.querySelector('.world-object.required')?.dataset.object);
    assert.ok(t, '도전 전에 필수 대상이 사라짐: ' + id);
    await seekTarget(p, t);
    await p.locator('[data-act="interact"][data-target="' + t + '"]').click();
  }
  throw Error('도전 창이 열리지 않음: ' + id);
}
const data = (p, id) => p.evaluate(id => JSON.parse(JSON.stringify(G.data.challenges.find(c => c.id === id))), id);
const feedback = p => p.locator('.challenge-feedback').evaluate(el => ({ text: el.textContent, tone: el.dataset.tone }));
// 생각 선택의 '원작과 게임' 노트: 고른 반응과 함께 대화창 안에 접힌 채 보이고, 펼쳐도 대사를 넘기지 않으며 다음 단추를 가리지 않는다.
const nextClear = p => p.evaluate(() => {
  const b = document.querySelector('[data-dialogue] [data-act="next"]');
  if (!b) return '다음 단추 없음';
  const r = b.getBoundingClientRect();
  if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return '다음 단추가 화면 밖: ' + JSON.stringify(r);
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return b.contains(hit) ? '' : '다음 단추를 가림: ' + (hit?.className || hit?.tagName);
});
async function checkTalkNote(p, c, option) {
  const note = p.locator('[data-dialogue] .challenge-note');
  assert.equal(await note.count(), 1, '고른 뒤 원작과 게임 노트가 없음: ' + c.id);
  assert.equal(await note.evaluate(el => el.tagName === 'DETAILS' && !el.open && !!el.closest('[data-dialogue]')), true, '노트가 대화창 안의 접힌 details가 아님');
  assert.equal((await note.locator('summary').innerText()).trim(), '원작과 게임');
  assert.equal(await nextClear(p), '', '접힌 노트');
  await note.locator('summary').click();
  assert.equal(await note.evaluate(el => el.open), true);
  assert.equal((await note.locator('p').innerText()).trim(), c.note);
  assert.equal(await p.locator('.stage-dialogue').innerText(), option.reply.text, '노트를 펼치다 대사가 넘어감');
  assert.equal(await nextClear(p), '', '펼친 노트');
  await p.locator('[data-dialogue] [data-act="next"]').click();
  assert.equal(await p.locator('.challenge-note').count(), 0, '다음 줄에도 노트가 남음');
}

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

await test('추리: 질문·선택지는 처음부터 보이고, 오답 서술 뒤 닫힌 단서 하나가 펼쳐지며, 정체 노트는 성공 뒤에만', async () => {
  const p = await page();
  try {
    await openChallenge(p, 'e06-gyeonghong', 'ch-gyeonghong-who');
    const c = await data(p, 'ch-gyeonghong-who');
    assert.equal(await p.locator('.challenge-question').isVisible(), true, '단서를 펴기 전 질문이 숨음');
    assert.equal(await p.locator('.challenge-question [data-option]').count(), c.options.length);
    assert.equal(await p.locator('.challenge-clue[aria-pressed="true"]').count(), 0);
    assert.ok(!(await p.locator('.challenge-book').innerText()).includes('적경홍'), '풀기 전 정체 노출');
    await p.locator('[data-option="' + c.options.find(o => o.id !== c.answer).id + '"]').click();
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    assert.equal(await p.locator('[data-clue="0"]').getAttribute('aria-pressed'), 'true', '오답 뒤 닫힌 단서가 펼쳐지지 않음');
    assert.equal(await p.locator('.challenge-clue[aria-pressed="true"]').count(), 1);
    assert.equal(await p.locator('.challenge-note').count(), 0, '풀기 전 원작 노트 노출');
    await p.locator('[data-clue="2"]').click();
    assert.equal(await p.locator('.challenge-clue[aria-pressed="true"]').count(), 2, '단서를 원할 때 펼칠 수 없음');
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
    assert.equal(c.note, undefined, '노트 없는 생각 선택의 자료');
    assert.equal(await p.locator('.challenge-note').count(), 0, '노트 없는 생각 선택에 노트가 보임');
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
    await p.waitForSelector('.mission-sheet [data-mission]');
    await p.waitForSelector('[data-world]');
    const m = await p.evaluate(() => JSON.parse(JSON.stringify(G.data.notes.mission)));
    assert.equal(m.cards.length, 3, '임무 카드는 역할·할 일·까닭 세 장');
    assert.equal(await p.locator('.world-screen').getAttribute('data-paused'), 'true', '임무 창이 떠 있는데 필드가 움직임');
    // 카드 한 장씩: 역할 → 할 일 → 까닭. 마지막 장에서만 시작 단추가 나온다.
    for (const [i, card] of m.cards.entries()) {
      const text = await p.locator('.mission-sheet').innerText();
      assert.ok(text.includes(card.head) && text.includes(card.body), '임무 카드 글 누락: ' + card.head);
      assert.ok(!/미색|여덟 인연/.test(text), '임무 카드에 미색·인연 노출');
      assert.equal(await p.locator('[data-mission="start"]').count(), i === m.cards.length - 1 ? 1 : 0, '시작 단추 위치');
      assert.equal(await p.evaluate(() => document.activeElement?.dataset.mission || ''), i === m.cards.length - 1 ? 'start' : 'next', '카드 단추 초점');
      if (i < m.cards.length - 1) await p.locator('[data-mission="next"]').click();
    }
    assert.match(m.cards[0].head, /성진/, '첫 카드가 학생의 역할을 말함');
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

// 학생 기록을 그 장면 처음(또는 필수 행동 prefix개 뒤)으로 맞춰 두고 이어 하기로 연다.
async function seedStudent(p, id, prefix = 0) {
  await p.goto(h.origin + '/index.html'); await ready(p);
  await p.evaluate(({ id, prefix }) => {
    const s = JSON.parse(JSON.stringify(G.save.state));
    const list = G.app.list(), e = G.experience.find(G.data, id);
    s.pos = id; s.step = ''; s.started = true; s.teacher = false; s.music = false; s.sound = false;
    s.play = { secretWish: null, choices: {}, firsts: {}, peak: Object.fromEntries(G.play.WISHES.map(w => [w, 0])) };
    s.done = Object.fromEntries(list.slice(0, list.findIndex(x => x.id === id)).map(x => [x.id, true]));
    s.rpg.scenes = { [id]: { status: 'active', beat: e.beats[prefix].id, actions: e.beats.slice(0, prefix).map(b => ({ id: b.id, by: 'student' })), hint: null } };
    const stage = G.world.stage(G.data, id, e.beats[prefix].id);
    s.rpg.cursor = { scene: id, map: stage.map.id, ...stage.spawn };
    localStorage.setItem(G.save.key, JSON.stringify(s));
  }, { id, prefix });
  await p.reload(); await ready(p);
  await p.getByRole('button', { name: '이어 하기', exact: true }).click();
  await p.waitForSelector('[data-world]');
}

await test('늦게 도착한 탭: 줄이 뜨기 전에 시작된 누름의 click은 줄을 넘기지 않고, 새 누름·키보드는 넘김', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    await seekTarget(p, 'bridge-fairy');
    await p.locator('[data-act="interact"][data-target="bridge-fairy"]').click();
    await p.waitForSelector('[data-dialogue] [data-act="next"]');
    const first = await p.locator('.stage-dialogue').innerText();
    // 행동 단추를 누른 그 누름에서 늦게 따라온 호환 click(detail 1, 새 pointerdown 없음)
    await p.locator('[data-dialogue] [data-act="next"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
    await p.locator('.stage-dialogue').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })));
    await p.waitForTimeout(150);
    assert.equal(await p.locator('.stage-dialogue').innerText(), first, '첫 줄이 늦은 click으로 건너뛰어짐');
    await p.locator('[data-dialogue] [data-act="next"]').click();
    await p.waitForFunction(t => document.querySelector('.stage-dialogue')?.innerText !== t, first);
    const second = await p.locator('.stage-dialogue').innerText();
    await p.locator('.stage-dialogue').focus(); await p.keyboard.press('Enter');
    await p.waitForFunction(t => document.querySelector('.stage-dialogue')?.innerText !== t, second);
  } finally { await p.close(); }
});

await test('장면 길잡이: 앞 이야기와 잇는 안내가 첫 행동 전에만 보이고, 대화 중에는 숨으며 누름을 막지 않음', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e02-tianjin');
    const text = await p.evaluate(() => G.data.scenes.find(s => s.id === 'e02-tianjin').guide);
    const guide = p.locator('[data-guide]');
    assert.equal(await guide.isVisible(), true, '첫 행동 전 길잡이가 안 보임');
    assert.ok((await guide.innerText()).includes(text));
    assert.match(text, /섬월/, '천진교 길잡이가 섬월을 미리 소개하지 않음');
    assert.equal(await guide.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    const t = await p.evaluate(() => document.querySelector('.world-object.required')?.dataset.object);
    await seekTarget(p, t);
    await p.locator('[data-act="interact"][data-target="' + t + '"]').click();
    await p.waitForSelector('[data-dialogue]');
    assert.equal(await guide.isVisible(), false, '대화 중에도 길잡이가 보임');
    await p.screenshot({ path: path.join(out, 'guide-dialogue-390.png') });
    await seedStudent(p, 'e02-tianjin', 1);
    assert.equal(await p.locator('[data-guide]').isVisible(), false, '첫 행동 뒤에도 길잡이가 남음');
    await seedStudent(p, 'e03-geomungo');
    assert.match(await p.locator('[data-guide]').innerText(), /여도사 차림/, '여도사 차림의 까닭 안내 없음');
    await p.goto(h.origin + '/index.html?teacher=1&scene=e12-honrye'); await ready(p); await p.waitForSelector('[data-guide]');
    await p.waitForTimeout(300);
    const replay = await p.evaluate(() => ({ bar: document.querySelector('.revisit-bar').getBoundingClientRect().bottom, guide: document.querySelector('[data-guide]').getBoundingClientRect().top, text: document.querySelector('[data-guide]').innerText }));
    assert.ok(replay.guide >= replay.bar, '다시 읽기 띠가 길잡이를 가림: ' + JSON.stringify(replay));
    assert.ok(!/양녀|경패를|경패가 영양|영양공주.{0,6}경패/.test(replay.text), '혼례 길잡이가 영양공주의 정체를 먼저 밝힘');
  } finally { await p.close(); }
});

await test('구슬 흔적: 가구 그림이 아니라 움직이는 반짝임으로 보임', async () => {
  const p = await page();
  try {
    await p.goto(h.origin + '/index.html?teacher=1&scene=e01-huayin'); await ready(p);
    await p.waitForSelector('[data-world]');
    for (let i = 0; i < 60 && !(await p.locator('.world-pearl').count()); i++) {
      if (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) { await p.locator('[data-dialogue] .choice-tray [data-talk]').first().click(); continue; }
      if (await p.locator('[data-dialogue]').count()) { await p.locator('[data-dialogue] [data-act="next"]').click(); continue; }
      const t = await p.evaluate(() => document.querySelector('.world-object.required')?.dataset.object);
      await seekTarget(p, t); await p.locator('[data-act="interact"][data-target="' + t + '"]').click();
    }
    const pearl = p.locator('.world-pearl').first();
    await pearl.waitFor();
    const look = await pearl.evaluate(el => {
      const glint = el.querySelector('.world-glint'), style = glint && getComputedStyle(glint);
      return { img: el.querySelectorAll('img').length, glint: !!glint, name: style?.animationName, state: style?.animationPlayState, w: el.getBoundingClientRect().width, found: el.classList.contains('found') };
    });
    assert.equal(look.img, 0, '구슬 흔적이 가구 그림으로 그려짐');
    assert.equal(look.glint, true);
    assert.equal(look.found, false);
    assert.equal(look.name, 'world-glint', '반짝임 애니메이션 없음');
    assert.equal(look.state, 'running');
    assert.ok(look.w >= 32, '구슬 흔적이 너무 작음: ' + look.w);
    const samples = [];
    for (let i = 0; i < 3; i++) { samples.push(await pearl.locator('.world-glint').evaluate(el => getComputedStyle(el).opacity)); await p.waitForTimeout(350); }
    assert.ok(new Set(samples).size > 1, '반짝임이 변하지 않음: ' + samples);
    const ids = await p.evaluate(() => G.data.maps.flatMap(m => m.objects || []).filter(o => o.kind === 'pearl' && o.sprite).map(o => o.id));
    assert.deepEqual(ids, [], '구슬 흔적에 가구 sprite가 남음');
  } finally { await p.close(); }
});

await test('가로 휴대폰: 긴 노트가 붙은 줄에서도 다음 단추가 대화 상자 안에서 눌림', async () => {
  const p = await page({ width: 844, height: 390 });
  try {
    await p.goto(h.origin + '/index.html'); await ready(p); await start(p);
    await seekTarget(p, 'bridge-fairy');
    await p.locator('[data-act="interact"][data-target="bridge-fairy"]').click();
    let lines = 0;
    while (await p.locator('[data-dialogue]').count()) {
      if (await p.locator('.choice-tray [data-talk]').count()) { await p.locator('.choice-tray [data-talk]').first().click(); continue; }
      const next = p.locator('[data-dialogue] [data-act="next"]');
      const hit = await next.evaluate(el => {
        const r = el.getBoundingClientRect(), box = el.closest('[data-dialogue]').getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
        return { inside: r.bottom <= Math.min(innerHeight, box.bottom) + 1 && r.top >= box.top - 1, hits: !!top && (top === el || el.contains(top)) };
      });
      assert.ok(hit.inside && hit.hits, (lines + 1) + '번째 줄의 다음 단추가 가로 화면에서 가려짐: ' + JSON.stringify(hit));
      if (await p.locator('[data-dialogue] details, [data-dialogue] .note').count()) await p.screenshot({ path: path.join(out, 'landscape-note-844.png') });
      await next.click(); lines++;
    }
    assert.ok(lines >= 3, '대화 줄을 끝까지 넘기지 못함');
  } finally { await p.close(); }
});

// ── 첫 판가름·생각 선택 기록(명세 4·3.2·6절). 학생 위치만 그 장면 처음으로 맞추고, 그 뒤는 실제 대상·단추로만 진행한다.
const where = p => p.evaluate(() => ({ scene: document.querySelector('.play')?.dataset.scene || '', beat: document.querySelector('.play')?.dataset.beat || '' }));
const bookOpen = (p, id) => async () => (await p.locator('.challenge-book[data-challenge-id="' + id + '"]:not([data-solved])').count()) > 0;
const choiceOpen = p => async () => (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) > 0;
// 멈출 조건이 될 때까지: 도전은 정답으로 풀고, 생각 선택은 첫 선택지, 대사·다음 장소는 실제 다음 단추, 그 밖에는 지금 필수 대상에게 행동한다.
async function advance(p, stop, { choose = true } = {}) {
  for (let i = 0; i < 200; i++) {
    if (await stop()) return;
    if (await p.locator('.challenge-book').count()) { await challenge(p); continue; }
    if (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) {
      if (!choose) throw Error('멈출 곳 전에 생각 선택이 나옴');
      await p.locator('[data-dialogue] .choice-tray [data-talk]').first().click(); continue;
    }
    if (await p.locator('[data-dialogue] [data-act="next"]').count()) { await p.locator('[data-dialogue] [data-act="next"]').click(); continue; }
    if (await p.locator('[data-act="next"]').count()) { await p.locator('[data-act="next"]').first().click(); await p.waitForTimeout(60); continue; }
    const now = await where(p);
    const beat = await p.evaluate(({ scene, beat }) => G.experience.find(G.data, scene)?.beats.find(b => b.id === beat) || null, now);
    if (!beat || !(await p.locator('[data-world]').count())) { await p.waitForTimeout(80); continue; }
    if (beat.trigger.target) await target(p, beat.trigger.target);
    else { await p.waitForFunction(() => document.querySelector('[data-act="interact"]')?.disabled === false); await p.locator('[data-act="interact"]').click(); }
    await p.waitForTimeout(60);
  }
  throw Error('진행 막힘: ' + JSON.stringify(await where(p)));
}
async function resume(p) {
  await p.reload(); await ready(p);
  await p.getByRole('button', { name: '이어 하기', exact: true }).click();
  await p.waitForSelector('[data-world]');
}
const firsts = async (p, id) => (await state(p)).play.firsts[id] ?? null;
const ui = p => p.evaluate(() => JSON.parse(JSON.stringify(G.data.notes.ui.choice)));
const previewOf = (p, o) => p.evaluate(o => {
  const u = G.data.notes.ui.choice, name = id => G.data.wishes.find(w => w.id === id).name;
  return o.stay ? u.stay : o.wish.map(s => name(s.wish) + (s.step > 0 ? u.up : u.down)).join(' ');
}, o);
async function checkPreviews(p, c, attr) {
  for (const o of c.options) {
    const text = (await p.locator('[' + attr + '="' + o.id + '"] [data-preview]').innerText()).trim();
    assert.equal(text, await previewOf(p, o), '미리 보기 방향: ' + c.id + '/' + o.id);
    assert.doesNotMatch(text, /\d/, '미리 보기에 숫자: ' + text);
  }
}

await test('첫 판가름·고르기(시회): 미리 보기 방향, 처음 누른 시가 고른 말과 함께 바로 남고 새로 고침·정답 뒤에도 그대로', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e02-tianjin', 1);
    const c = await data(p, 'ch-tianjin-poem');
    await advance(p, bookOpen(p, c.id));
    await checkPreviews(p, c, 'data-option');
    const wrong = c.options.find(o => o.id !== c.answer);
    await p.locator('[data-option="' + wrong.id + '"]').click();
    let s = await state(p);
    assert.deepEqual(s.play.firsts[c.id], { ok: false }, '처음 누른 시의 첫 결과');
    assert.deepEqual(s.play.choices[c.id], { option: wrong.id }, '처음 누른 시가 고른 말로 남지 않음');
    assert.ok(!s.rpg.scenes['e02-tianjin'].actions.some(a => a.id === c.beat), '풀기 전 행동이 기록됨');
    await resume(p);
    await advance(p, bookOpen(p, c.id));
    assert.equal((await p.locator('[data-option="' + wrong.id + '"] [data-first]').innerText()).trim(), (await ui(p)).first, '처음 고른 시 표시');
    await p.locator('[data-option="' + c.answer + '"]').click();
    s = await state(p);
    assert.deepEqual(s.play.firsts[c.id], { ok: false }, '정답 뒤 첫 결과가 바뀜');
    assert.deepEqual(s.play.choices[c.id], { option: wrong.id }, '정답 뒤 고른 말이 바뀜');
    await p.locator('[data-challenge="continue"]').click();
    await p.waitForSelector('[data-dialogue]');
    assert.ok((await state(p)).rpg.scenes['e02-tianjin'].actions.some(a => a.id === c.beat), '정답 뒤 행동 기록');
  } finally { await p.close(); }
});

await test('첫 판가름·추리 실패: 처음 답과 펼친 단서 수가 남고, 막대는 그대로, 노트는 성공 뒤에만, 뒤 장면은 지금처럼', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e05-chunun', 2);
    const c = await data(p, 'ch-chunun-ghost');
    await advance(p, bookOpen(p, c.id));
    assert.equal(await p.locator('.challenge-question').isVisible(), true);
    const values = await p.evaluate(() => G.play.values(G.save.state, G.data));
    await p.locator('[data-clue="0"]').click();
    await p.locator('[data-option="' + c.options.find(o => o.id !== c.answer).id + '"]').click();
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    assert.equal(await p.locator('[data-clue="1"]').getAttribute('aria-pressed'), 'true', '오답 뒤 닫힌 단서 자동 펼침');
    assert.deepEqual(await firsts(p, c.id), { ok: false, clues: 1 });
    assert.deepEqual(await p.evaluate(() => G.play.values(G.save.state, G.data)), values, '첫 결과가 막대를 움직임');
    assert.equal(await p.locator('.challenge-note').count(), 0);
    await resume(p);
    await advance(p, bookOpen(p, c.id));
    await p.locator('[data-option="' + c.answer + '"]').click();
    assert.equal(await p.locator('.challenge-note').count(), 1, '성공 뒤 원작 노트');
    assert.deepEqual(await firsts(p, c.id), { ok: false, clues: 1 }, '새로 고침·정답 뒤 첫 결과가 바뀜');
    await p.locator('[data-challenge="continue"]').click();
    const next = await data(p, 'ch-gyeonghong-who');
    await advance(p, bookOpen(p, next.id));
    assert.equal(await p.locator('.challenge-clue[aria-pressed="true"]').count(), 0, '첫 실패인데 다음 추리 단서가 미리 펼쳐짐');
    assert.equal(await p.locator('[data-after]').count(), 0, '첫 실패인데 바뀐 시작 안내');
    await p.locator('[data-option="' + next.answer + '"]').click();
    assert.deepEqual(await firsts(p, next.id), { ok: true, clues: 0 });
  } finally { await p.close(); }
});

await test('첫 판가름·추리 성공: 다음 추리(적생)가 단서 하나를 펼친 채 안내와 함께 시작하고 그 단서를 수에 센다', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e05-chunun', 2);
    const c = await data(p, 'ch-chunun-ghost'), next = await data(p, 'ch-gyeonghong-who');
    await advance(p, bookOpen(p, c.id));
    await p.locator('[data-option="' + c.answer + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: true, clues: 0 });
    await p.locator('[data-challenge="continue"]').click();
    await advance(p, bookOpen(p, next.id));
    assert.equal((await p.locator('[data-after]').innerText()).trim(), next.after.text);
    assert.equal(await p.locator('[data-clue="' + next.after.clue + '"]').getAttribute('aria-pressed'), 'true', '미리 펼친 단서');
    assert.match(await p.locator('[data-clue="' + next.after.clue + '"]').innerText(), new RegExp(next.clues[next.after.clue].slice(0, 8)));
    assert.equal(await p.locator('.challenge-clue[aria-pressed="true"]').count(), 1);
    await p.locator('[data-option="' + next.answer + '"]').click();
    assert.deepEqual(await firsts(p, next.id), { ok: true, clues: 1 }, '미리 펼친 단서를 수에 셈');
  } finally { await p.close(); }
});

await test('첫 판가름·찾기 실패: 헛짚은 곳이 하나씩 남아 새로 고침 뒤 이어지고, 행동과 생각 선택은 한 저장(고르기 전 새로 고침은 다시 묻기), 뒤 장면은 지금처럼', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e09-yoyeon', 1);
    const c = await data(p, 'ch-yoyeon-night'), talk = await data(p, 'ch-yoyeon-reply');
    const misses = c.spots.filter(s => s.id !== c.answer).slice(0, c.tries);
    await advance(p, bookOpen(p, c.id));
    await p.locator('[data-spot="' + misses[0].id + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: null, tried: [misses[0].id] });
    await resume(p);
    await advance(p, bookOpen(p, c.id));
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries - 1), '새로 고침이 촛불을 되살림');
    assert.equal(await p.locator('[data-spot="' + misses[0].id + '"]').isDisabled(), true, '헛짚은 곳이 다시 눌림');
    assert.equal(await p.locator('.challenge-spot.checked').count(), 1);
    await p.locator('[data-challenge="leave"]').click();
    await p.waitForFunction(() => document.querySelector('[data-act="interact"]')?.disabled === false);
    await p.locator('[data-act="interact"]').click();
    await p.waitForSelector('.challenge-book[data-challenge-id="' + c.id + '"]');
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries - 1), '물러났다 와도 첫 판이 이어져야 함');
    for (const spot of misses.slice(1)) await p.locator('[data-spot="' + spot.id + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: false, tried: misses.map(s => s.id) });
    assert.deepEqual(await feedback(p), { text: c.fail, tone: 'fail' });
    await p.locator('[data-challenge="retry"]').click();
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(c.tries));
    await p.locator('[data-spot="' + c.answer + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: false, tried: misses.map(s => s.id) }, '다시 한 판이 첫 결과를 바꿈');
    await p.locator('[data-challenge="continue"]').click();
    await advance(p, choiceOpen(p), { choose: false });
    await checkPreviews(p, talk, 'data-talk');
    let s = await state(p);
    assert.ok(!s.rpg.scenes['e09-yoyeon'].actions.some(a => a.id === talk.beat), '고르기 전에 행동이 기록됨');
    assert.equal(s.play.choices[talk.id], undefined);
    await resume(p);
    await advance(p, choiceOpen(p), { choose: false });
    assert.equal(await p.locator('.stage-dialogue').innerText(), talk.prompt, '새로 고침 뒤 같은 질문');
    const picked = talk.options.find(o => o.id === 'call');
    await p.locator('[data-talk="' + picked.id + '"]').click();
    assert.equal(await p.locator('.stage-dialogue').innerText(), picked.reply.text);
    s = await state(p);
    assert.ok(s.rpg.scenes['e09-yoyeon'].actions.some(a => a.id === talk.beat), '고른 뒤 행동 기록');
    assert.deepEqual(s.play.choices[talk.id], { option: picked.id }, '행동과 고른 말이 함께 남음');
    const water = await data(p, 'ch-bansagok-water');
    await advance(p, bookOpen(p, water.id));
    assert.equal(await p.locator('[data-after]').count(), 0, '첫 실패인데 요연의 경고 안내');
    for (const id of water.after.spots) assert.equal(await p.locator('[data-spot="' + id + '"]').isDisabled(), false, '첫 실패인데 미리 표시: ' + id);
    assert.equal(await p.locator('.challenge-spot.checked').count(), 0);
  } finally { await p.close(); }
});

await test('첫 판가름·찾기 성공: 반사곡에서 요연이 경계한 물이 미리 표시되고, 물 나누기 선택은 행동과 한 저장, 다시 읽기는 처음 고른 길만 표시', async () => {
  const p = await page();
  try {
    await seedStudent(p, 'e09-yoyeon', 1);
    const c = await data(p, 'ch-yoyeon-night'), water = await data(p, 'ch-bansagok-water');
    const reply = await data(p, 'ch-yoyeon-reply'), order = await data(p, 'ch-neungpa-order');
    await advance(p, bookOpen(p, c.id));
    await p.locator('[data-spot="' + c.answer + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: true, tried: [] });
    await p.locator('[data-challenge="continue"]').click();
    await advance(p, choiceOpen(p), { choose: false });
    await p.locator('[data-talk="call"]').click();
    await advance(p, bookOpen(p, water.id));
    assert.equal((await p.locator('[data-after]').innerText()).trim(), water.after.text);
    for (const id of water.after.spots) {
      const spot = water.spots.find(s => s.id === id), el = p.locator('[data-spot="' + id + '"]');
      assert.equal(await el.isDisabled(), true, '경계한 물이 눌림: ' + id);
      assert.match(await el.innerText(), new RegExp(spot.clue.slice(0, 6)), '경계한 물의 단서가 펼쳐지지 않음');
    }
    assert.equal(await p.locator('.challenge-tries').getAttribute('data-tries'), String(water.tries), '미리 표시가 촛불을 씀');
    const rest = water.spots.find(s => s.id !== water.answer && !water.after.spots.includes(s.id));
    await p.locator('[data-spot="' + rest.id + '"]').click();
    assert.deepEqual(await firsts(p, water.id), { ok: null, tried: [rest.id] }, '미리 표시한 곳이 헛짚은 곳에 들어감');
    await p.locator('[data-spot="' + water.answer + '"]').click();
    assert.deepEqual(await firsts(p, water.id), { ok: true, tried: [rest.id] });
    await p.locator('[data-challenge="continue"]').click();
    await advance(p, choiceOpen(p), { choose: false });
    await checkPreviews(p, order, 'data-talk');
    assert.ok(!(await state(p)).rpg.scenes['e10-neungpa'].actions.some(a => a.id === order.beat), '고르기 전에 물 나누기 행동이 기록됨');
    await resume(p);
    await advance(p, choiceOpen(p), { choose: false });
    assert.equal(await p.locator('.stage-dialogue').innerText(), order.prompt);
    await p.locator('[data-talk="fallen"]').click();
    let s = await state(p);
    assert.ok(s.rpg.scenes['e10-neungpa'].actions.some(a => a.id === order.beat));
    assert.deepEqual(s.play.choices[order.id], { option: 'fallen' });
    assert.deepEqual(s.play.firsts[water.id], { ok: true, tried: [rest.id] }, '다시 푼 찾기가 첫 결과를 바꿈');
    assert.ok(order.note, '물 나누기 생각 선택의 노트 자료');
    await checkTalkNote(p, order, order.options.find(o => o.id === 'fallen'));
    assert.deepEqual((await state(p)).play.choices[order.id], { option: 'fallen' }, '노트가 기록을 바꿈');
    while (await p.locator('[data-dialogue]').count()) await p.locator('[data-dialogue] [data-act="next"]').click();
    // 다시 읽기: 마친 요연의 진영에서 도전을 해 볼 수 있고, 처음 고른 길만 표시되며 다른 말은 반응만.
    const before = await state(p), levels = await p.evaluate(() => JSON.stringify(G.app.wishes()));
    await p.evaluate(() => G.app.open('e09-yoyeon'));
    await p.waitForSelector('.play.revisit [data-world]');
    await advance(p, choiceOpen(p), { choose: false });
    const marked = await p.locator('[data-talk] [data-first]').evaluateAll(els => els.map(el => el.closest('[data-talk]').dataset.talk));
    assert.deepEqual(marked, ['call'], '처음 고른 길 표시');
    assert.equal((await p.locator('[data-talk="call"] [data-first]').innerText()).trim(), (await ui(p)).first);
    const other = reply.options.find(o => o.id === 'sword');
    await p.locator('[data-talk="' + other.id + '"]').click();
    assert.equal(await p.locator('.stage-dialogue').innerText(), other.reply.text, '다른 말의 반응');
    assert.equal(reply.note, undefined);
    assert.equal(await p.locator('.challenge-note').count(), 0, '노트 없는 생각 선택에 노트가 보임');
    assert.deepEqual((await state(p)).play, before.play, '다시 읽기가 기록을 바꿈');
    assert.deepEqual((await state(p)).rpg.scenes, before.rpg.scenes);
    assert.equal(await p.evaluate(() => JSON.stringify(G.app.wishes())), levels, '다시 읽기가 막대를 움직임');
  } finally { await p.close(); }
});

await test('생각 선택 노트: 다시 읽기(가로 844×390)에서도 물 나누기를 고른 뒤 원작과 게임이 접힌 채 보이고 다음 단추를 가리지 않음', async () => {
  const p = await page({ width: 844, height: 390 });
  try {
    await p.goto(h.origin + '/index.html?teacher=1&scene=e10-neungpa'); await ready(p);
    await p.waitForSelector('[data-world]');
    const order = await data(p, 'ch-neungpa-order');
    const before = await state(p);
    await advance(p, async () => (await p.locator('[data-dialogue] .choice-tray [data-talk]').count()) > 0 && (await p.locator('.stage-dialogue').innerText()) === order.prompt, { choose: false });
    assert.equal(await p.locator('.challenge-note').count(), 0, '고르기 전 노트 노출');
    const picked = order.options.find(o => o.id === 'generals');
    await p.locator('[data-talk="' + picked.id + '"]').click();
    await checkTalkNote(p, order, picked);
    assert.deepEqual((await state(p)).play, before.play, '다시 읽기 노트가 기록을 바꿈');
  } finally { await p.close(); }
});

await test('첫 판가름·가락: 첫 실수는 실패로 남아 새로 고침·성공 뒤에도 그대로, 실수 없이 마친 첫 판은 성공', async () => {
  const p = await page({ width: 844, height: 390 });
  try {
    await seedStudent(p, 'e07-tungso', 1);
    const c = await data(p, 'ch-tungso-melody');
    await advance(p, bookOpen(p, c.id));
    await p.waitForSelector('.challenge-book[data-round="0"][data-ready="true"]', { timeout: 20000 });
    await p.locator('[data-note="' + (c.rounds[0][0] + 1) % c.notes.length + '"]').click();
    assert.deepEqual(await firsts(p, c.id), { ok: false });
    await resume(p);
    await advance(p, async () => (await firsts(p, c.id))?.ok === false && !(await p.locator('.challenge-book').count()) && (await state(p)).rpg.scenes['e07-tungso'].actions.some(a => a.id === c.beat));
    assert.deepEqual(await firsts(p, c.id), { ok: false }, '성공 뒤 첫 실수가 바뀜');
    await seedStudent(p, 'e07-tungso', 1);
    await advance(p, bookOpen(p, c.id));
    assert.equal(await firsts(p, c.id), null);
    await challenge(p);
    assert.deepEqual(await firsts(p, c.id), { ok: true });
  } finally { await p.close(); }
});

const errors = h.errors.splice(0);
await h.close();
assert.deepEqual(errors, [], '브라우저 오류·외부 요청·404');
if (failures.length) { console.error('도전 검사 실패 ' + failures.length + '건: ' + failures.join(', ')); process.exitCode = 1; throw Error('도전 검사 실패'); }
console.log('도전 검사 ' + passed.length + '개 통과');
