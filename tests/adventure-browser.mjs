/** Real touch-browser acceptance tests. Run with Node and Playwright installed.
 * PLAYWRIGHT_PATH can point to an existing Playwright package. BROWSER_PATH can
 * select an installed Chromium/Edge executable. QA_GAME_ROOT overrides ../game.
 * Campaign progression uses visible UI only; storage is read for assertions.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || process.env.PLAYWRIGHT_MODULE || 'playwright');
const here = dirname(fileURLToPath(import.meta.url));
const gameRoot = resolve(process.env.QA_GAME_ROOT || resolve(here, existsSync(resolve(here, '../dist/adventure')) ? '../dist/adventure' : '../game'));
const { SAVE_KEY, BACKUP_KEY, stats, matchup, captureChance, newGame, act, serialize, validateSave } = await import(pathToFileURL(resolve(gameRoot, 'core.mjs')));
const { CREATURES } = await import(pathToFileURL(resolve(gameRoot, 'data.mjs')));
const species = Object.fromEntries(CREATURES.map(c => [c.id, c]));
const out = resolve(process.env.ADVENTURE_QA_DIR || process.env.QA_OUTPUT || resolve(here, '../qa'));
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const relative = path.replace(/^\/adventure\/?/, '') || 'index.html';
    const file = resolve(gameRoot, relative);
    if (!file.startsWith(gameRoot + sep)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/adventure/`;
const edgeDefault = process.platform === 'win32' ? `${process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)'}/Microsoft/Edge/Application/msedge.exe` : '';
const executablePath = process.env.BROWSER_PATH || (existsSync(edgeDefault) ? edgeDefault : undefined);
let browser, lastPage;
const report = { started: new Date().toISOString(), viewports: [], checks: [], screenshots: [], consoleErrors: [], externalRequests: [] };
const check = (label, condition, detail = '') => {
  assert.ok(condition, `${label}${detail ? ': ' + detail : ''}`);
  report.checks.push(label);
  console.log(`PASS ${label}`);
};
async function screenshot(page, name) {
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: resolve(out, name), fullPage: true });
  report.screenshots.push(name);
}
async function makePage(viewport = { width: 390, height: 844 }, init) {
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1, acceptDownloads: true });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  lastPage = page;
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => report.consoleErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
  page.on('request', req => { if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== new URL(base).origin) report.externalRequests.push(req.url()); });
  report.viewports.push(viewport);
  await page.goto(base);
  return { context, page };
}

const action = (name, extra = '') => `[data-action="${name}"]${extra}`;
async function tap(page, name, extra = '') {
  await page.locator(action(name, extra)).tap();
  // Deliberately exceed the UI's 280 ms turn lock between ordinary choices.
  await page.waitForTimeout(320);
}
async function tab(page, name) {
  await page.locator(`[data-tab="${name}"]`).tap();
}
async function importSave(page, text) {
  await tab(page, 'settings');
  let valid = true;
  try { validateSave(text); } catch { valid = false; }
  await page.locator('#import-file').setInputFiles({ name: 'adventure-save.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  const confirm = page.locator(action('confirmImport'));
  if (valid) { await confirm.waitFor(); await tap(page, 'confirmImport'); }
  else await page.waitForTimeout(320);
}
async function noHorizontalOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  check(label, size.scroll <= size.width + 1, JSON.stringify(size));
}
const readState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
const readRaw = page => page.evaluate(key => localStorage.getItem(key), SAVE_KEY);
async function travel(page, area) {
  await tab(page, 'world');
  await tap(page, 'travel', `[data-id="${area}"]`);
  assert.equal((await readState(page)).area, area);
}
async function lead(page, index) {
  if ((await readState(page)).active === index) return;
  await tab(page, 'team');
  await tap(page, 'lead', `[data-index="${index}"]`);
  await tab(page, 'world');
}
async function rest(page, returnTo) {
  await travel(page, 'town');
  await tap(page, 'heal');
  if (returnTo && returnTo !== 'town') await travel(page, returnTo);
}
async function fight(page, { capture = false, reload = false } = {}) {
  let turns = 0, didReload = false;
  for (; turns < 80; turns++) {
    const s = await readState(page), b = s.battle;
    assert.ok(b, 'battle exists');
    if (b.result) return { result: b.result, turns, enemy: b.enemy.species };
    if (reload && !didReload && turns === 1) {
      const before = await readRaw(page);
      await page.reload();
      await page.locator(action('attack')).first().waitFor();
      check('reload restores exact active battle', await readRaw(page) === before);
      didReload = true;
    }
    const mon = s.team[s.active], max = stats(mon).maxHp;
    if (capture && reload && turns === 0) {
      const visibleChance = await page.locator(action('capture')).innerText();
      check('capture chance is visible before acting', visibleChance.includes(`${Math.round(captureChance(s) * 100)}%`));
      const focus = page.locator(action('focus'));
      await focus.scrollIntoViewIfNeeded();
      const box = await focus.boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(320);
      const after = await readState(page);
      check('rapid touch cannot spend two battle turns', after.battle.turn === b.turn + 1);
      check('weakening increases capture chance', captureChance(after) > captureChance(s));
      continue;
    }
    if (b.intent === 'heavy') { await tap(page, 'guard'); continue; }
    if (mon.hp < max * 0.45 && mon.level >= 7 && b.healsUsed < 2) {
      await tap(page, 'attack', '[data-move="2"]'); continue;
    }
    if (mon.hp < max * 0.43 && s.inventory.potions > 0) { await tap(page, 'potion'); continue; }
    if (capture) {
      assert.ok(s.inventory.orbs > 0, 'capture supply remains');
      if (!b.weakened) { await tap(page, 'focus'); continue; }
      if (captureChance(s) >= 0.68 || b.enemy.hp <= 30) { await tap(page, 'capture'); continue; }
      // Neutral damage avoids accidentally knocking out a creature we want.
      await tap(page, 'attack', '[data-move="0"]');
    } else {
      const effect = matchup(species[mon.species].element, species[b.enemy.species].element);
      await tap(page, 'attack', `[data-move="${effect >= 1 ? 1 : 0}"]`);
    }
  }
  throw new Error(`Battle exceeded ${turns} UI turns`);
}
async function findAndCatch(page, wanted, { reload = false } = {}) {
  for (let encounter = 0; encounter < 40; encounter++) {
    const before = await readState(page);
    if (before.team.some(m => m.hp < stats(m).maxHp * 0.55)) await rest(page, before.area);
    await tap(page, 'explore');
    const s = await readState(page);
    if (!wanted.includes(s.battle.enemy.species) || s.caught.includes(s.battle.enemy.species)) {
      await tap(page, 'run'); await tap(page, 'closeBattle'); continue;
    }
    const result = await fight(page, { capture: true, reload });
    check(`captured ${result.enemy} through touch UI`, result.result === 'caught', JSON.stringify(result));
    await tap(page, 'closeBattle');
    return result;
  }
  throw new Error(`Could not find desired species ${wanted}`);
}
async function guardian(page, area, enemyId) {
  await rest(page, area);
  const s = await readState(page);
  const score = m => matchup(species[m.species].element, species[enemyId].element) / matchup(species[enemyId].element, species[m.species].element) * m.level;
  const index = s.team.map((m, i) => ({ i, value: score(m) })).sort((a, b) => b.value - a.value)[0].i;
  await lead(page, index);
  await tap(page, 'challenge');
  await screenshot(page, `${area}-guardian-portrait.png`);
  const result = await fight(page);
  check(`${area} guardian defeated through touch UI`, result.result === 'won', JSON.stringify(result));
  await tap(page, 'closeBattle');
}

try {
  browser = await chromium.launch({ executablePath, headless: true });
  // The acceptance scenarios below intentionally use touch taps, including the
  // entire first-play campaign. No debug endpoint or injected game state is used.
  const { context, page } = await makePage();
  await page.locator(action('start', '[data-id="bud"]')).waitFor();
  await screenshot(page, '01-title-portrait.png');
  check('game page loads', await page.locator('body').innerText() !== 'Not found');
  check('Traditional Chinese game title', (await page.title()).includes('安東尼大冒險'));
  await noHorizontalOverflow(page, 'portrait title has no horizontal overflow');
  check('sound is off until requested', await page.locator(action('sound')).getAttribute('aria-pressed') === 'false');
  await tap(page, 'sound');
  check('touch enables optional sound', await page.locator(action('sound')).getAttribute('aria-pressed') === 'true');
  await tap(page, 'sound');
  check('sound can be muted', await page.locator(action('sound')).getAttribute('aria-pressed') === 'false');
  await tap(page, 'start', '[data-id="bud"]');
  await screenshot(page, '02-town-portrait.png');
  check('new game begins with selected starter', (await readState(page)).team[0].species === 'bud');
  const pos = await readState(page);
  await page.locator('[data-dir="up"]').tap();
  await page.waitForTimeout(320);
  const moved = await readState(page);
  check('touch direction moves exactly one tile', moved.y === pos.y - 1 && moved.steps === pos.steps + 1);
  const control = page.locator('[data-dir="left"]');
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  const scroll = await page.evaluate(() => scrollY);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(320);
  check('rapid touch cannot double-move', (await readState(page)).steps === moved.steps + 1);
  check('touch movement does not scroll page', await page.evaluate(() => scrollY) === scroll);
  check('game buttons disable double-tap zoom without blocking document zoom', await control.evaluate(el => getComputedStyle(el).touchAction === 'manipulation' || getComputedStyle(el).touchAction === 'none'));
  const zoomPolicy = await page.locator('meta[name="viewport"]').getAttribute('content');
  check('viewport preserves pinch zoom accessibility', !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(zoomPolicy));
  await tap(page, 'pause');
  const frozen = await readRaw(page);
  await page.keyboard.press('ArrowUp');
  check('pause blocks game input', await readRaw(page) === frozen);
  await page.getByRole('dialog').waitFor();
  await tap(page, 'resume');
  // Headless browsers do not consistently background tabs. Drive the actual
  // DOM visibility event, without changing game state, to check this handler.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  await page.getByRole('dialog').waitFor();
  check('background visibility event pauses play', await page.locator(action('resume')).isVisible());
  await tap(page, 'resume');

  await travel(page, 'forest');
  await tap(page, 'gather');
  await findAndCatch(page, ['cinderfox'], { reload: true });
  await tab(page, 'team');
  await screenshot(page, '03-team-portrait.png');
  await tab(page, 'world');
  await guardian(page, 'forest', 'fernowl');
  await travel(page, 'coast');
  await tap(page, 'gather');
  await findAndCatch(page, ['pebblit']);
  await findAndCatch(page, ['foamfin', 'voltkit', 'drip', 'lanternray']);
  await findAndCatch(page, ['foamfin', 'voltkit', 'drip', 'lanternray']);
  check('team cap and reserve collection', (await readState(page)).team.length === 3 && (await readState(page)).reserve.length === 2);
  await tab(page, 'team');
  const teamBefore = await readState(page);
  await tap(page, 'swapReserve', '[data-index="0"]');
  const teamAfter = await readState(page);
  check('reserve exchange updates active team', teamAfter.team[teamBefore.active].uid === teamBefore.reserve[0].uid && teamAfter.reserve[0].uid === teamBefore.team[teamBefore.active].uid);
  await tap(page, 'swapReserve', '[data-index="0"]');
  await tab(page, 'world');
  await guardian(page, 'coast', 'lanternray');
  await travel(page, 'quarry');
  await tap(page, 'gather');
  await guardian(page, 'quarry', 'basaltusk');
  await travel(page, 'town');
  await tap(page, 'talk', '[data-id="ranger"]');
  await tap(page, 'talk', '[data-id="collector"]');
  const claimed = await readState(page);
  check('side quests recognize objectives completed before acceptance', claimed.quests.herbsClaimed && claimed.quests.capturesClaimed);
  await page.reload();
  await page.locator(action('talk', '[data-id="ranger"]')).waitFor();
  await tap(page, 'talk', '[data-id="ranger"]');
  await tap(page, 'talk', '[data-id="collector"]');
  check('quest rewards remain one-time after reload', (await readState(page)).coins === claimed.coins);
  const shopBefore = await readState(page);
  const buy = page.locator(action('buy', '[data-id="orbs"]'));
  await buy.scrollIntoViewIfNeeded();
  const buyBox = await buy.boundingBox();
  await page.touchscreen.tap(buyBox.x + buyBox.width / 2, buyBox.y + buyBox.height / 2);
  await page.touchscreen.tap(buyBox.x + buyBox.width / 2, buyBox.y + buyBox.height / 2);
  await page.waitForTimeout(320);
  const bought = await readState(page);
  check('rapid touch purchase spends once', bought.coins === shopBefore.coins - 12 && bought.inventory.orbs === shopBefore.inventory.orbs + 1);

  await guardian(page, 'summit', 'cloudrake');
  check('full new-game-to-ending path without state injection', (await readState(page)).flags.ending === true);
  await screenshot(page, '04-ending-portrait.png');
  await tab(page, 'journal');
  await screenshot(page, '05-journal-portrait.png');
  await travel(page, 'forest');
  await tap(page, 'explore');
  check('ending allows continued exploration', (await readState(page)).battle?.kind === 'wild');
  await tap(page, 'run'); await tap(page, 'closeBattle');
  await page.setViewportSize({ width: 844, height: 390 });
  report.viewports.push({ width: 844, height: 390 });
  await noHorizontalOverflow(page, 'landscape world has no horizontal overflow');
  await screenshot(page, '06-world-landscape.png');
  await tap(page, 'explore');
  await noHorizontalOverflow(page, 'landscape battle has no horizontal overflow');
  await screenshot(page, '07-battle-landscape.png');
  await tap(page, 'run'); await tap(page, 'closeBattle');
  await page.setViewportSize({ width: 390, height: 844 });
  await tab(page, 'settings');
  const beforeExport = await readRaw(page);
  const downloadPromise = page.waitForEvent('download');
  await tap(page, 'export');
  const download = await downloadPromise;
  const exported = await readFile(await download.path(), 'utf8');
  check('export matches current validated save', serialize(JSON.parse(exported)) === serialize(JSON.parse(beforeExport)));
  const beforeInvalid = await readRaw(page);
  const backupBeforeInvalid = await page.evaluate(key => localStorage.getItem(key), BACKUP_KEY);
  await importSave(page, '{"version":999}');
  check('invalid import preserves current save', await readRaw(page) === beforeInvalid);
  await importSave(page, 'x'.repeat(150001));
  check('oversized import preserves current save', await readRaw(page) === beforeInvalid);
  check('rejected imports preserve backup too', await page.evaluate(key => localStorage.getItem(key), BACKUP_KEY) === backupBeforeInvalid);
  await importSave(page, exported);
  check('export/import roundtrip preserves game', serialize(await readState(page)) === serialize(JSON.parse(exported)));
  await tab(page, 'settings');
  await screenshot(page, '08-save-settings-portrait.png');

  const other = await context.newPage();
  other.on('pageerror', error => report.consoleErrors.push(error.message));
  await other.goto(base);
  await other.locator('[data-tab="world"]').waitFor();
  await page.bringToFront();
  if (await page.locator(action('resume')).isVisible()) await tap(page, 'resume');
  await travel(page, 'town');
  await other.getByRole('dialog').waitFor();
  check('second tab pauses when another tab saves', await other.locator(action('resume')).isVisible());
  const newest = await readRaw(page);
  await other.keyboard.press('ArrowUp');
  check('stale tab cannot overwrite newer progress', await readRaw(page) === newest);
  await other.close();
  check('closing stale tab preserves newest save', await readRaw(page) === newest);
  if (await page.locator(action('resume')).isVisible()) await tap(page, 'resume');

  // A separate documented valid import fixture exercises recovery without
  // altering or bypassing the campaign above.
  let fixture = act(act(newGame('bud'), { type: 'travel', area: 'forest' }), { type: 'explore' });
  fixture.team[0].hp = 1;
  fixture.inventory = { orbs: 0, potions: 0 };
  fixture.coins = 0;
  await importSave(page, serialize(fixture));
  await tab(page, 'world');
  await tap(page, 'attack', '[data-move="0"]');
  check('game over is reachable and shown', (await readState(page)).battle.result === 'lost');
  await screenshot(page, '09-recovery-portrait.png');
  await tap(page, 'closeBattle');
  const recovered = await readState(page);
  check('game over safely returns to town', recovered.area === 'town' && recovered.battle === null && recovered.team.every(m => m.hp === stats(m).maxHp));
  check('bankrupt game over grants emergency supplies', recovered.coins === 0 && recovered.inventory.orbs >= 3 && recovered.inventory.potions >= 2);
  await tap(page, 'heal');
  check('healing remains free when bankrupt', (await readState(page)).coins === 0);
  const backup = await page.evaluate(key => localStorage.getItem(key), BACKUP_KEY);
  check('backup contains a valid save', !!backup && !!JSON.parse(backup).version);
  await page.evaluate(key => localStorage.setItem(key, '{corrupt'), SAVE_KEY);
  await page.reload();
  await page.locator('[data-tab="settings"]').waitFor();
  check('corrupt primary save recovers from backup', await page.locator(action('start')).count() === 0);
  await importSave(page, exported);
  await page.reload();
  check('ending survives export/import and reload', (await readState(page)).flags.ending);

  // A second isolated, schema-valid fixture fills every collection slot. The
  // release/re-capture path below still uses visible UI and persists normally.
  const full = newGame('bud');
  const companions = Array.from({ length: 43 }, (_, index) => {
    const mon = { uid: `c${index + 1}`, species: 'bud', level: 8, xp: 0, hp: 0 };
    mon.hp = stats(mon).maxHp;
    return mon;
  });
  full.team = companions.slice(0, 3);
  full.reserve = companions.slice(3);
  full.nextUid = 44;
  await importSave(page, serialize(full));
  check('full collection fixture imports all 43 companions', (await readState(page)).team.length === 3 && (await readState(page)).reserve.length === 40);
  await travel(page, 'forest');
  await tap(page, 'explore');
  const fullBattle = await readState(page);
  if (await page.locator(action('capture')).isEnabled()) await tap(page, 'capture');
  const rejectedCapture = await readState(page);
  check('full collection blocks capture without spending orbs or turns', rejectedCapture.inventory.orbs === fullBattle.inventory.orbs && rejectedCapture.battle.turn === fullBattle.battle.turn && rejectedCapture.battle.result === null);
  check('full collection warning is visible', await page.locator('#story-message').isVisible() && await page.locator('#story-message').innerText() === rejectedCapture.message && rejectedCapture.message !== fullBattle.message);
  await tab(page, 'team');
  check('reserve release is unavailable during battle', await page.locator('[data-action="release"]:enabled').count() === 0);
  await tab(page, 'world');
  await tap(page, 'run'); await tap(page, 'closeBattle');
  await tab(page, 'team');
  const beforeRelease = await readRaw(page);
  const releaseState = JSON.parse(beforeRelease);
  const releasedUid = releaseState.reserve[0].uid;
  const activeUids = releaseState.team.map(mon => mon.uid);
  await tap(page, 'release', `[data-uid="${releasedUid}"]`);
  await page.getByRole('dialog').waitFor();
  check('reserve release requires explicit confirmation', await page.locator(action('confirmRelease')).isVisible());
  await page.screenshot({ path: resolve(out, '11-reserve-release-confirmation.png'), fullPage: false });
  report.screenshots.push('11-reserve-release-confirmation.png');
  await tap(page, 'cancel');
  check('cancelled release preserves every companion', await readRaw(page) === beforeRelease);
  await tap(page, 'release', `[data-uid="${releasedUid}"]`);
  await tap(page, 'confirmRelease');
  const released = await readState(page);
  check('confirmed release frees exactly one reserve slot', released.reserve.length === 39 && !released.reserve.some(mon => mon.uid === releasedUid));
  check('reserve release preserves all three active companions', JSON.stringify(released.team.map(mon => mon.uid)) === JSON.stringify(activeUids));
  check('reserve release preserves catalogue and story progress', JSON.stringify(released.caught) === JSON.stringify(releaseState.caught) && JSON.stringify(released.flags) === JSON.stringify(releaseState.flags));
  await page.reload();
  await page.locator('[data-tab="world"]').waitFor();
  check('freed reserve slot persists after reload', (await readState(page)).reserve.length === 39);
  await tap(page, 'explore');
  const replacement = await fight(page, { capture: true });
  check('capture succeeds again after reserve release', replacement.result === 'caught' && (await readState(page)).reserve.length === 40);
  await tap(page, 'closeBattle');
  await importSave(page, exported);

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await noHorizontalOverflow(page, `${width}px layout has no horizontal overflow`);
  }
  await context.close();
  const blocked = await makePage({ width: 390, height: 844 }, () => {
    Storage.prototype.setItem = function () { throw new DOMException('Test storage quota unavailable', 'QuotaExceededError'); };
  });
  await tap(blocked.page, 'start', '[data-id="drip"]');
  check('storage failure is clearly surfaced', await blocked.page.locator('p.save-error[role="status"]').isVisible());
  const mapBefore = await blocked.page.locator('#map').getAttribute('aria-label');
  await blocked.page.locator('[data-dir="up"]').tap();
  await blocked.page.waitForTimeout(320);
  check('game remains playable when storage is unavailable', await blocked.page.locator('#map').getAttribute('aria-label') !== mapBefore);
  await tab(blocked.page, 'settings');
  const emergencyDownloadPromise = blocked.page.waitForEvent('download');
  await tap(blocked.page, 'export');
  const emergencyDownload = await emergencyDownloadPromise;
  const emergencySave = validateSave(await readFile(await emergencyDownload.path(), 'utf8'));
  check('manual export rescues progress when autosave fails', emergencySave.team[0].species === 'drip' && emergencySave.steps === 1);
  await screenshot(blocked.page, '10-storage-warning-portrait.png');
  await blocked.context.close();
  check('no browser console errors', report.consoleErrors.length === 0, report.consoleErrors.join('\n'));
  check('no external requests', report.externalRequests.length === 0, report.externalRequests.join('\n'));
} catch (error) {
  report.failure = error.stack;
  if (lastPage && !lastPage.isClosed()) {
    await screenshot(lastPage, 'failure.png').catch(() => {});
    report.failureBody = await lastPage.locator('body').innerText().catch(() => 'Unavailable');
    report.failureState = await readState(lastPage).catch(() => null);
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  await writeFile(resolve(out, 'browser-report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
