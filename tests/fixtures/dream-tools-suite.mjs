import assert from 'node:assert/strict';
import { harness, start, target, dialogue, state, ready, secretWish } from './rpg-harness.mjs';

const h = await harness();
const raw = page => page.evaluate(() => localStorage.getItem(G.save.key));
const at = (page, id, timeout) => page.waitForFunction(scene => document.querySelector('.play')?.dataset.scene === scene, id, timeout ? { timeout } : undefined);
let passed = 0;
const DIGIT = /[0-9０-９]/;

// ── 소원 띠(명세 3.3)와 깨어날 때의 무너짐(명세 7) ──────────────────────────
// 띠는 .play .topbar 안의 .wish-band 하나다. 화면 글·낭독 글·도움말 어디에도 숫자가 없어야 한다.
async function band(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.play .topbar .wish-band');
    if (!el) return null;
    const labels = [el, ...el.querySelectorAll('*')].flatMap(node => ['aria-label', 'title'].map(name => node.getAttribute(name)).filter(Boolean));
    const level = cell => cell.querySelector('.band-fill')?.style.getPropertyValue('--level') || null;
    return {
      text: el.textContent, labels, say: el.querySelector('.band-say')?.textContent || '',
      wishes: [...el.querySelectorAll('.band-wish')].map(cell => ({ id: cell.dataset.wish, name: cell.querySelector('.band-name')?.textContent, level: level(cell), secret: cell.classList.contains('secret'), hasFill: !!cell.querySelector('.band-fill') })),
      slots: el.querySelectorAll('.band-bonds .band-slot').length, met: el.querySelectorAll('.band-bonds .band-slot.met').length,
      collapse: el.dataset.collapse || null,
    };
  });
}
const bandWords = b => [b.text, b.say, ...b.labels].join(' ');
function assertNoDigits(b, where) { assert.doesNotMatch(bandWords(b), DIGIT, where + ': 띠 글·낭독에 숫자 없음'); }
// 띠가 대사·단추·조작 영역을 가리지 않는지 같은 동기 구간에서 잰다.
async function bandLayout(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.play .topbar .wish-band');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const hit = r => r.width > 0 && r.height > 0 && r.left < box.right - .5 && r.right > box.left + .5 && r.top < box.bottom - .5 && r.bottom > box.top + .5;
    const selector = ['.world-dialogue', '.field-cutscene .stage-speech', '.world-actions', '.world-tools', '.world-joystick', '.world-goal', '.world-heading', '.world-guide',
      '.revisit-bar', '.save-access', '.challenge-book', '.play > .tray:not(.empty)', '.game-shell[data-mode="window"] .play > .main', '.play button', '.play [role="button"]'].join(',');
    const covered = [...document.querySelectorAll(selector)]
      .filter(node => !el.contains(node) && !node.closest('.topbar') && !node.closest('[data-world]') && node.checkVisibility({ visibilityProperty: true }) && hit(node.getBoundingClientRect()))
      .map(node => node.className + ' ' + (node.textContent || '').slice(0, 20));
    return { box: box.toJSON(), width: innerWidth, height: innerHeight, covered, clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
      topbarBottom: document.querySelector('.play .topbar').getBoundingClientRect().bottom };
  });
}
async function assertBandLayout(page, where) {
  const layout = await bandLayout(page);
  assert.ok(layout, where + ': 띠 표시');
  assert.ok(layout.box.left >= -0.5 && layout.box.right <= layout.width + 0.5 && layout.box.top >= 0 && layout.box.height > 0, where + ': 띠가 화면 안');
  assert.ok(layout.box.top >= layout.topbarBottom - 1, where + ': 띠는 위 막대 아래');
  assert.equal(layout.clipped, false, where + ': 띠 내용 잘림 없음');
  assert.deepEqual(layout.covered, [], where + ': 띠가 대사·단추·조작 영역을 가리지 않음');
  return layout;
}
async function setBig(page, on) {
  if (!!(await state(page)).big === on) return;
  await page.locator('[data-tool="settings"]').click();
  await page.locator('.settings-sheet [data-set="big"]').click();
  await page.locator('.settings-sheet .actions button').click();
  await page.locator('.settings-sheet').waitFor({ state: 'detached' });
  assert.equal(!!(await state(page)).big, on);
}
// 세로 390×844·가로 844×390 × 일반·큰 글자 네 조건
async function conditions(page, check) {
  for (const [width, height] of [[390, 844], [844, 390]]) for (const big of [false, true]) {
    await page.setViewportSize({ width, height }); await setBig(page, big); await page.waitForTimeout(150);
    await check(width + 'x' + height + (big ? ' 큰 글자' : ' 일반'));
  }
  await page.setViewportSize({ width: 390, height: 844 }); await setBig(page, false);
}
// 띠의 빛남·무너짐을 시간 순서대로 적는다(검사 쪽은 관찰만 한다).
async function recordBand(page) {
  await page.evaluate(() => {
    window.bandLog = []; const start = performance.now();
    const stored = () => { try { return JSON.parse(localStorage.getItem(G.save.key)).awake; } catch { return null; } };
    const note = (kind, extra = {}) => window.bandLog.push({ kind, t: performance.now() - start, awake: G.save.state.awake, stored: stored(), ...extra });
    window.bandObserver?.disconnect();
    window.bandObserver = new MutationObserver(list => {
      for (const m of list) {
        const node = m.target, was = (m.oldValue || '').split(/\s+/); // 낱말로 비교한다('band-gone-name'에 'gone'이 들어 있다)
        if (m.type === 'attributes' && node.classList) {
          if (node.matches('.wish-band') && m.attributeName === 'data-collapse' && node.dataset.collapse) note('collapse', { value: node.dataset.collapse, emptied: node.querySelectorAll('.band-wish.emptied').length, cells: node.querySelectorAll('.band-wish').length, names: node.querySelectorAll('.band-gone-name.shown').length });
          if (m.attributeName !== 'class') continue;
          if (node.matches('.band-wish') && node.classList.contains('emptied') && !was.includes('emptied')) note('empty', { wish: node.dataset.wish });
          if (node.matches('.band-gone-name') && node.classList.contains('shown') && !was.includes('shown')) note('name', { bond: node.dataset.bond, text: node.textContent });
          if (node.matches('.band-gone-name') && node.classList.contains('gone') && !was.includes('gone')) note('gone', { bond: node.dataset.bond });
          if (node.classList.contains('glow') && !was.includes('glow')) note('glow', { what: node.dataset.wish || (node.matches('.band-bonds') ? 'bonds' : node.className) });
        }
        if (m.type === 'childList') for (const gone of m.removedNodes) if (gone.nodeType === 1 && (gone.matches('.wish-band') || gone.querySelector('.wish-band'))) note('removed');
      }
    });
    window.bandObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'data-collapse'] });
  });
}
const bandLog = page => page.evaluate(() => window.bandLog);
const next = page => page.locator('#tray [data-act="next"]').click();
const atWorld = (page, scene) => page.waitForFunction(id => document.querySelector('.play')?.dataset.scene === id && !!document.querySelector('[data-world]'), scene);
// 대표 도입 자료(1장 다섯 단위 + 2장 첫 장면)를 실제 학생 입력으로 지나간다. 1장 동안 띠는 없어야 한다.
async function toHuayin(page) {
  await start(page); await atWorld(page, 'c1-bridge');
  assert.equal(await band(page), null, '1장 돌다리: 띠 없음');
  for (const id of ['bridge-fairy', 'bridge-flower', 'bridge-home']) { await target(page, id); await dialogue(page); }
  await next(page); await atWorld(page, 'c1-cell'); assert.equal(await band(page), null, '1장 선방: 띠 없음');
  for (const id of ['cell-window', 'cell-cushion']) { await target(page, id); await dialogue(page); }
  await next(page); await at(page, 'c1-wish'); assert.equal(await band(page), null, '1장 소원 찾기: 띠 없음');
  for (const id of await page.evaluate(() => G.app.current().data.answers)) { const b = page.locator('[data-word="' + id + '"]'); if (!await b.isDisabled()) await b.click(); }
  await secretWish(page, 'pungryu'); assert.equal(await band(page), null, '1장 숨긴 소원: 띠 없음');
  await next(page); await atWorld(page, 'c1-exile'); assert.equal(await band(page), null, '1장 꾸짖음: 띠 없음');
  for (const id of ['exile-master', 'exile-answer', 'exile-door']) { await target(page, id); await dialogue(page); }
  await next(page); await at(page, 'c1-rebirth'); assert.equal(await band(page), null, '1장 재탄생: 띠 없음');
  for (let turns = 0; await page.locator('.play[data-scene="c1-rebirth"]').count(); turns++) { assert.ok(turns < 12, '재탄생 연결'); await next(page).catch(() => {}); await page.waitForTimeout(30); }
  await atWorld(page, 'e01-huayin');
}
// 실제 자료의 취미궁 앞까지 마친 기록을 넣는다(무너짐 표시 회귀용. 학생 완주 증거가 아니다).
async function seedFeast(page, bonds) {
  await page.evaluate(bonds => {
    const s = JSON.parse(JSON.stringify(G.save.state)), list = G.app.list(), id = 'c3-feast', e = G.experience.find(G.data, id);
    s.pos = id; s.step = ''; s.started = true; s.teacher = false; s.music = false; s.sound = false; s.reach = 3;
    s.done = Object.fromEntries(list.slice(0, list.findIndex(x => x.id === id)).map(x => [x.id, true]));
    s.bonds = G.data.bonds.slice(0, bonds).map(b => b.id); s.items = ['it-girinpo', 'it-geomungo'];
    s.rpg.scenes = { [id]: { status: 'active', beat: e.beats[0].id, actions: [], hint: null } };
    const stage = G.world.stage(G.data, id, e.beats[0].id); s.rpg.cursor = { scene: id, map: stage.map.id, ...stage.spawn };
    localStorage.setItem(G.save.key, JSON.stringify(s));
  }, bonds);
  await page.reload(); await ready(page);
  await page.getByRole('button', { name: '이어 하기', exact: true }).click();
}
async function walkToStaff(page) {
  for (const scene of ['c3-feast', 'c3-monk']) {
    await atWorld(page, scene);
    const targets = await page.evaluate(id => G.experience.find(G.data, id).beats.map(beat => beat.trigger.target), scene);
    for (const id of targets) { await target(page, id); await dialogue(page); }
    await page.locator('#tray [data-act="next"]').click();
  }
  await at(page, 'c3-staff');
  for (let i = 0; i < 20 && !await page.locator('[data-act="staff"]').count(); i++) await page.locator('#tray [data-act="next"]').click({ timeout: 1000 }).catch(() => {});
  await page.waitForSelector('[data-act="staff"]');
}

async function toStaff(page) {
  await start(page);
  for (const scene of ['c3-feast', 'c3-monk']) {
    await at(page, scene);
    const targets = await page.evaluate(id => G.experience.find(G.data, id).beats.map(beat => beat.trigger.target), scene);
    for (const id of targets) { await target(page, id); await dialogue(page); }
    await page.locator('#tray [data-act="next"]').click();
  }
  await at(page, 'c3-staff');
  if (!await page.locator('[data-act="staff"]').count()) await page.locator('#tray [data-act="next"]').click();
  await page.waitForSelector('[data-act="staff"]');
}

async function closeSheet(page, selector) {
  await page.locator(selector + ' .actions button').click();
  await page.locator(selector).waitFor({ state: 'detached' });
}

try {
  const page = await h.page('rpg-waking', { width: 390, height: 844 });
  try {
    await toStaff(page);
    const staffBand = await band(page);
    assert.ok(staffBand, '3장 지팡이 앞(아직 꿈): 띠 표시');
    assertNoDigits(staffBand, '지팡이 앞');
    const capturedRun = (await state(page)).rpg.run;
    assert.equal(await page.evaluate(() => G.dream.alive()), true);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', true], ['bonds', true], ['items', true], ['board', false]]);

    await page.locator('[data-tool="settings"]').click();
    await page.evaluate(() => { window.oldTeacherButton = document.querySelector('.settings-sheet [data-set="teacher"]'); });
    await closeSheet(page, '.settings-sheet');
    await page.evaluate(() => { window.oldKeepBeforeWake = document.querySelector('[data-tool="keep"]'); });
    await page.locator('[data-tool="keep"]').click();
    await page.waitForSelector('.bag-sheet .bag');
    assert.equal(await page.locator('.bag-sheet [data-tab="house"]').getAttribute('aria-selected'), 'true');
    await page.evaluate(() => { window.oldHouseBeforeWake = document.querySelector('.bag-sheet [data-tab="house"]'); });
    await closeSheet(page, '.bag-sheet');

    await page.locator('[data-act="staff"]').click();
    await at(page, 'c3-awake', 10000);
    assert.equal(await band(page), null, '깨어난 선방: 띠 없음');
    const awakened = await state(page), awakenedRaw = await raw(page);
    assert.equal(awakened.awake, true);
    assert.ok(awakened.awakeAt > 0);
    assert.equal(awakened.rpg.run, capturedRun, '실제 깨어남은 같은 run을 유지');
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', false], ['bonds', false], ['items', false], ['board', false]]);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 0, '깨어난 학생에게 꿈 도구 숨김');
    const denied = await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.open(tab)]));
    assert.deepEqual(denied, [['house', false], ['bonds', false], ['items', false], ['board', false]]);
    await page.evaluate(() => {
      oldTeacherButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldHouseBeforeWake.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldKeepBeforeWake.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    assert.equal(await page.locator('.bag-sheet').count(), 0);
    assert.deepEqual(await state(page), awakened, '깨어남 전 옛 DOM이 상태를 바꾸지 않음');
    assert.equal(await raw(page), awakenedRaw, '깨어남 전 옛 DOM이 저장 원문을 바꾸지 않음');
    passed++;
    console.log('PASS 실제 4단위 깨어남 · 학생 꿈 도구/API · 옛 DOM · captured run 잠금');

    await page.locator('[data-tool="settings"]').click();
    await page.locator('.settings-sheet [data-set="teacher"]').click();
    await closeSheet(page, '.settings-sheet');
    assert.equal((await state(page)).teacher, true);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', true], ['bonds', true], ['items', true], ['board', false]]);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 1, '깨어난 교사에게 꿈 보따리 표시');
    assert.equal(await band(page), null, '깨어난 뒤 선생님용에도 띠 없음');
    await page.locator('[data-tool="keep"]').click();
    await page.waitForSelector('.bag-sheet .bag');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)),
      ['house', 'bonds', 'items', 'wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet .house-view').count(), 1);
    await page.evaluate(() => {
      window.oldTeacherKeep = document.querySelector('[data-tool="keep"]');
      window.oldTeacherHouse = document.querySelector('.bag-sheet [data-tab="house"]');
      window.teacherToolRun = G.save.state.rpg.run;
      G.app.settings();
    });
    await page.waitForSelector('.settings-sheet');
    await page.locator('.settings-sheet [data-set="teacher"]').click();
    await closeSheet(page, '.settings-sheet');

    assert.equal((await state(page)).teacher, false);
    assert.equal(await page.evaluate(() => teacherToolRun === G.save.state.rpg.run), true);
    assert.equal(await page.locator('[data-tool="keep"]').count(), 0, '교사 OFF 즉시 도구 제거');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)), ['wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet [data-tab="wishes"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.bag-sheet .house-view,.bag-sheet .bond-list,.bag-sheet .item-list').count(), 0);
    assert.deepEqual(await page.evaluate(() => ['house', 'bonds', 'items', 'board'].map(tab => [tab, G.dream.can(tab)])),
      [['house', false], ['bonds', false], ['items', false], ['board', false]]);

    const offState = await state(page), offRaw = await raw(page);
    const sheets = await page.locator('.bag-sheet').count();
    const stale = await page.evaluate(() => {
      oldTeacherHouse.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      oldTeacherKeep.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { house: G.dream.open('house'), bonds: G.dream.open('bonds'), items: G.dream.open('items'), board: G.dream.open('board') };
    });
    assert.deepEqual(stale, { house: false, bonds: false, items: false, board: false });
    assert.equal(await page.locator('.bag-sheet').count(), sheets, '옛 도구가 새 판을 열지 않음');
    assert.deepEqual(await page.locator('.bag-sheet [data-tab]').evaluateAll(elements => elements.map(element => element.dataset.tab)), ['wishes', 'pearls']);
    assert.equal(await page.locator('.bag-sheet .house-view,.bag-sheet .bond-list,.bag-sheet .item-list').count(), 0);
    assert.deepEqual(await state(page), offState, '교사 OFF 뒤 옛 DOM/API 상태 불변');
    assert.equal(await raw(page), offRaw, '교사 OFF 뒤 옛 DOM/API 저장 원문 불변');
    passed++;
    console.log('PASS 교사 ON/OFF · 열린 보따리 축소 · 옛 탭/도구/API 잠금');

    await closeSheet(page, '.bag-sheet');
    assert.deepEqual(h.errors, [], h.errors.join('\n'));
  } finally {
    await page.context().close();
  }

  // 1장 없음 → 2장 첫 장면부터 띠. 숫자·만나지 않은 이름 없음, 인연은 막대를 움직이지 않음, 네 화면 조건에서 가림 없음.
  {
    const page = await h.page('rpg-opening', { width: 390, height: 844 });
    try {
      await toHuayin(page);
      const first = await band(page);
      assert.ok(first, '2장 첫 장면: 띠 표시');
      assertNoDigits(first, '2장 첫 장면');
      const data = await page.evaluate(() => ({ wishes: G.data.wishes.map(w => [w.id, w.name]), bonds: G.data.bonds.map(b => [b.id, b.name]), ui: G.data.notes.ui.band, levels: G.app.wishes().map(w => [w.id, w.level]) }));
      assert.deepEqual(first.wishes.map(w => w.id), data.wishes.map(([id]) => id), '다섯 소원 칸');
      const misaek = first.wishes.find(w => w.id === 'misaek');
      assert.equal(misaek.name, '?', '미색은 ?'); assert.equal(misaek.hasFill, false, '미색은 막대 없음');
      for (const [id, level] of data.levels) if (id !== 'misaek') assert.equal(Number(first.wishes.find(w => w.id === id).level), level, id + ' 막대는 G.app.wishes().level');
      assert.equal(first.slots, 8, '인연 여덟 칸'); assert.equal(first.met, 0, '아직 만난 인연 없음');
      for (const [, name] of data.bonds) assert.ok(!bandWords(first).includes(name), '만나기 전 이름 비공개: ' + name);
      assert.equal(await page.locator('.wish-band img').count(), 0, '띠에 인물 그림 없음');
      assert.ok(first.say.includes(data.ui.hidden.replace('{wish}', '미색')), '미색 낭독: ' + first.say);
      assert.ok(first.say.includes(data.ui.bonds.replace('{count}', data.ui.bondCounts[0])), '인연 칸 낭독: ' + first.say);
      assert.ok(data.ui.levels.some(word => first.say.includes(word)), '정도는 낱말로 낭독');

      // 숨긴 소원 표식: 소원 찾기 뒤 실제 단추로 숨긴 소원(풍류)이 띠의 그 칸 하나에만 표시된다.
      assert.equal((await state(page)).play.secretWish, 'pungryu', '숨긴 소원 실제 기록');
      await page.waitForSelector('.wish-band .band-wish[data-wish="pungryu"].secret');
      const marked = await band(page);
      assert.deepEqual(marked.wishes.filter(w => w.secret).map(w => w.id), ['pungryu'], '숨긴 소원 하나에만 표식');
      assert.ok(marked.say.includes(data.ui.secret), '숨긴 소원 낭독');
      assertNoDigits(marked, '숨긴 소원 표식');

      // 네 화면 조건마다: 걷는 화면과 대화가 열린 화면 모두 가림 없음. 그 사이 진채봉을 만난다.
      await recordBand(page);
      const before = await page.evaluate(() => G.app.wishes().map(w => [w.id, w.level]));
      const beats = ['huayin-willow', 'huayin-brush', 'huayin-nurse', 'huayin-reply'];
      await conditions(page, async label => {
        await assertBandLayout(page, label + ' 걷기');
        await target(page, beats.shift());
        await page.waitForSelector('[data-dialogue]');
        await assertBandLayout(page, label + ' 대화');
        await dialogue(page);
      });
      assert.deepEqual((await state(page)).bonds, ['chae'], '진채봉을 실제로 만남');
      const met = await band(page);
      assert.equal(met.met, 1, '만난 인연 한 칸 ●');
      assert.ok(met.say.includes(data.ui.bonds.replace('{count}', data.ui.bondCounts[1])), '인연 칸 낭독 갱신');
      assert.ok(!bandWords(met).includes('진채봉'), '띠 칸에는 이름을 쓰지 않음');
      assertNoDigits(met, '인연 만난 뒤');
      assert.deepEqual(await page.evaluate(() => G.app.wishes().map(w => [w.id, w.level])), before, '인연은 소원 값을 움직이지 않음');
      assert.deepEqual(met.wishes.map(w => w.level), marked.wishes.map(w => w.level), '인연은 막대를 움직이지 않음');
      const glows = (await bandLog(page)).filter(e => e.kind === 'glow');
      assert.deepEqual(glows.map(e => e.what), ['bonds'], '바뀐 인연 칸만 잠깐 빛남(크기·글자 바꿈은 빛나지 않음)');

      // 인연 칸을 누르면 꿈 보따리의 인연첩과 같은 내용(만난 사람 이름)
      await page.locator('.wish-band .band-bonds').click();
      await page.waitForSelector('.bag-sheet .bag');
      assert.equal(await page.locator('.bag-sheet [data-tab="bonds"]').getAttribute('aria-selected'), 'true');
      assert.deepEqual(await page.locator('.bag-sheet .bond-card h3').allInnerTexts(), ['진채봉']);
      await closeSheet(page, '.bag-sheet');
      assert.deepEqual(h.errors, [], h.errors.join('\n'));
      passed++;
      console.log('PASS 띠: 1장 없음·2장 표시·숫자 없음·미색 ?·숨긴 소원 표식·인연은 막대 불변·인연첩·네 화면 조건 가림 없음');
    } finally {
      await page.context().close();
    }
  }

  // 움직임 줄이기: 값이 바뀌어도 빛나지 않고 바로 바뀐다.
  {
    const page = await h.page('rpg-opening', { width: 390, height: 844 }, { reducedMotion: 'reduce' });
    try {
      await toHuayin(page);
      assert.equal(await page.locator('.wish-band .band-fill').first().evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(v => parseFloat(v) === 0)), true, '막대 바로 바뀜');
      await recordBand(page);
      for (const id of ['huayin-willow', 'huayin-brush', 'huayin-nurse', 'huayin-reply']) { await target(page, id); await dialogue(page); }
      assert.equal((await band(page)).met, 1);
      assert.deepEqual((await bandLog(page)).filter(e => e.kind === 'glow'), [], '움직임 줄이기에서는 빛남 없음');
      passed++;
      console.log('PASS 띠: 움직임 줄이기에서는 빛남 없이 바로 바뀜');
    } finally {
      await page.context().close();
    }
  }

  // 깨어남 저장이 실패하면 무너지지 않고, 성공한 뒤에만 무너진다.
  {
    const page = await h.page('rpg-waking', { width: 390, height: 844 });
    try {
      await toStaff(page);
      await recordBand(page);
      await page.evaluate(() => { window.realSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === G.save.key) throw new DOMException('검사 저장 실패', 'QuotaExceededError'); return window.realSetItem.call(this, key, value); }; });
      await page.locator('[data-act="staff"]').click();
      await page.waitForTimeout(900);
      assert.equal(await page.locator('.wake-save-error').isVisible(), true, '기존 오류 안내');
      const kept = await band(page);
      assert.ok(kept, '저장 실패: 띠 그대로');
      assert.equal(kept.collapse, null, '저장 실패: 무너짐 시작 없음');
      assert.equal(await page.locator('.wish-band .band-wish.emptied').count(), 0);
      assert.deepEqual(await bandLog(page), [], '저장 실패: 띠 변화 없음');
      assert.equal((await state(page)).awake, false);
      await page.evaluate(() => { Storage.prototype.setItem = window.realSetItem; });
      await page.locator('[data-act="staff"]').click();
      await page.waitForFunction(() => document.querySelector('.wish-band')?.dataset.collapse);
      assertNoDigits(await band(page), '무너지는 중');
      await at(page, 'c3-awake', 10000);
      assert.equal(await band(page), null, '선방 도착: 띠 사라짐');
      const log = await bandLog(page), cells = await page.evaluate(() => G.data.wishes.map(w => w.id));
      const start = log.find(e => e.kind === 'collapse');
      assert.ok(start, '무너짐 시작');
      assert.equal(start.awake, true, '무너짐은 깨어남 저장 뒤'); assert.equal(start.stored, true, '저장 원문에도 깨어남이 있을 때');
      assert.equal(log.indexOf(start), 0, '무너짐 전 다른 띠 변화 없음');
      assert.deepEqual(log.filter(e => e.kind === 'empty').map(e => e.wish), cells, '소원 칸이 차례로 빔');
      const empties = log.filter(e => e.kind === 'empty');
      for (let i = 1; i < empties.length; i++) assert.ok(empties[i].t - empties[i - 1].t >= 150, '한 칸씩 빔');
      assert.equal(log.at(-1).kind, 'removed', '마지막에 띠가 사라짐');
      assert.equal(log.filter(e => e.kind === 'glow').length, 0, '무너짐에 빛남·축하 없음');
      passed++;
      console.log('PASS 무너짐: 저장 실패면 시작 없음 · 저장 성공 뒤 소원 칸 차례로 비고 띠 사라짐');
    } finally {
      await page.context().close();
    }
  }

  // 움직임 줄이기: 무너짐은 한꺼번에 빈다.
  {
    const page = await h.page('rpg-waking', { width: 390, height: 844 }, { reducedMotion: 'reduce' });
    try {
      await toStaff(page);
      await recordBand(page);
      await page.locator('[data-act="staff"]').click();
      await at(page, 'c3-awake', 10000);
      const log = await bandLog(page), start = log.find(e => e.kind === 'collapse');
      assert.ok(start && start.awake, '저장 뒤 무너짐');
      assert.equal(start.emptied, start.cells, '움직임 줄이기: 모든 칸이 한꺼번에 빔');
      assert.equal(log.filter(e => e.kind === 'name' || e.kind === 'glow').length, 0);
      const removed = log.find(e => e.kind === 'removed');
      assert.ok(removed && removed.t - start.t < 1200, '움직임 줄이기: 곧바로 사라짐');
      assert.equal(await band(page), null);
      passed++;
      console.log('PASS 무너짐: 움직임 줄이기에서는 한꺼번에 빔');
    } finally {
      await page.context().close();
    }
  }

  // 실제 자료: 만난 인연 다섯. 무너질 때만 만난 이름이 하나씩 떴다 사라지고, 일지에는 이름이 남는다.
  {
    const page = await h.page('', { width: 390, height: 844 });
    try {
      await seedFeast(page, 5);
      const bonds = await page.evaluate(() => G.data.bonds.map(b => ({ id: b.id, name: b.name })));
      const met = bonds.slice(0, 5), unmet = bonds.slice(5);
      await atWorld(page, 'c3-feast');
      const feast = await band(page);
      assert.ok(feast, '취미궁(아직 꿈): 띠');
      assert.equal(feast.met, 5);
      for (const b of bonds) assert.ok(!bandWords(feast).includes(b.name), '띠 칸에 이름 없음: ' + b.name);
      await walkToStaff(page);
      await conditions(page, label => assertBandLayout(page, '지팡이 ' + label));
      await recordBand(page);
      const clicked = Date.now();
      await page.locator('[data-act="staff"]').click();
      await page.waitForSelector('.wish-band .band-gone-name.shown');
      const during = await band(page);
      assertNoDigits(during, '이름이 뜨는 중');
      for (const b of unmet) assert.ok(!bandWords(during).includes(b.name), '만나지 않은 이름은 무너질 때도 없음: ' + b.name);
      await at(page, 'c3-awake', 15000);
      assert.equal(await band(page), null, '선방: 띠 없음');
      const log = await bandLog(page), start = log.find(e => e.kind === 'collapse');
      assert.equal(start.awake, true); assert.equal(start.stored, true);
      const names = log.filter(e => e.kind === 'name'), gone = log.filter(e => e.kind === 'gone'), empties = log.filter(e => e.kind === 'empty');
      assert.equal(empties.length, 5);
      assert.deepEqual(names.map(e => e.bond), met.map(b => b.id), '만난 차례대로 이름');
      assert.deepEqual(names.map(e => e.text), met.map(b => b.name));
      assert.ok(names[0].t >= empties.at(-1).t, '소원 칸이 다 빈 뒤 이름');
      for (let i = 0; i < names.length; i++) {
        const out = gone.find(e => e.bond === names[i].bond);
        assert.ok(out && out.t > names[i].t, '이름이 떴다 사라짐');
        if (names[i + 1]) assert.ok(names[i + 1].t >= out.t - 1, '하나씩');
      }
      const removed = log.find(e => e.kind === 'removed');
      assert.ok(removed.t >= gone.at(-1).t, '이름이 다 사라진 뒤 띠가 사라짐');
      const total = removed.t - start.t;
      assert.ok(total >= 4500 && total <= 7500, '무너짐 약 6초: ' + Math.round(total));
      assert.ok(Date.now() - clicked < 15000);

      // 깨어난 뒤: 학생·선생님 누구에게도 띠가 없다. 일지에는 만난 이름이 그대로 남는다.
      for (const id of await page.evaluate(() => G.experience.find(G.data, 'c3-awake').beats.map(b => b.trigger.target))) { await target(page, id); await dialogue(page); }
      for (let i = 0; i < 20 && !await page.locator('.journal-fairies').count(); i++) await page.locator('#tray [data-act="next"]').click({ timeout: 1000 }).catch(() => {});
      await page.waitForSelector('.journal-fairies');
      assert.equal(await band(page), null, '일지: 띠 없음');
      const fairies = await page.locator('.journal-fairies').innerText();
      for (const b of met) assert.ok(fairies.includes(b.name), '일지에 이름 유지: ' + b.name);
      await page.locator('[data-tool="settings"]').click();
      await page.locator('.settings-sheet [data-set="teacher"]').click();
      await closeSheet(page, '.settings-sheet');
      assert.equal((await state(page)).teacher, true);
      assert.equal(await page.evaluate(() => G.app.open('e05-chunun')), true, '선생님용은 꿈 장면을 열 수 있음');
      await page.waitForFunction(() => document.querySelector('.play')?.dataset.scene === 'e05-chunun');
      await page.waitForTimeout(200);
      assert.equal(await band(page), null, '깨어난 뒤 선생님용 꿈 장면: 띠 없음');
      assert.equal(await page.evaluate(() => G.app.open('c3-feast')), true);
      await at(page, 'c3-feast'); await page.waitForTimeout(200);
      assert.equal(await band(page), null, '깨어난 뒤 선생님용 취미궁: 띠 없음');
      assert.deepEqual(h.errors, [], h.errors.join('\n'));
      passed++;
      console.log('PASS 무너짐: 실제 자료 만난 이름 다섯 차례·약 6초·지팡이 네 화면 조건·일지 이름 유지·깨어난 뒤 선생님에게도 띠 없음');
    } finally {
      await page.context().close();
    }
  }

  assert.equal(passed, 7, 'focused 회귀 일곱 묶음 모두 실행');
  console.log('꿈 도구·띠·무너짐 focused 회귀 7개 통과 (교사 preview·학생 전체 완주 검증 아님)');
} finally {
  await h.close();
}
