import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    ),
    p = resolve(
      root,
      "." + pathname + (pathname.endsWith("/") ? "index.html" : ""),
    );
  if (!p.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".jpg": "image/jpeg",
        ".md": "text/plain",
      }[extname(p)] || "application/octet-stream",
    );
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.GYM_BROWSER_PATH
    ? { executablePath: process.env.GYM_BROWSER_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
  timezoneId: "Asia/Hong_Kong",
  acceptDownloads: true,
});
const page = await context.newPage(),
  errors = [],
  external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (
    !r.url().startsWith(origin) &&
    !r.url().startsWith("blob:") &&
    !r.url().startsWith("data:")
  )
    external.push(r.url());
});
const qa = resolve(process.env.GYM_QA_DIR || "../gym-qa");
await mkdir(qa, { recursive: true });
const nav = async (label) =>
  page.locator("nav").getByRole("button", { name: label }).click();
const stored = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("giant-gym-v1")));
const overflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
const set = async (i, j, kg, reps) => {
  if (kg !== null)
    await page.locator(`[data-set="${i}:${j}:kg"]`).fill(String(kg));
  await page.locator(`[data-set="${i}:${j}:reps"]`).fill(String(reps));
  await page.locator(`[data-set="${i}:${j}:done"]`).check();
};
try {
  await page.clock.install({ time: new Date("2026-10-23T04:00:00Z") });
  await page.goto(origin + "/gym/");
  await page.getByRole("heading", { name: /練好每一下/ }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await overflow();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.locator(".skip").evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("#main").focus();
  await page.screenshot({ path: resolve(qa, "today-390.png"), fullPage: true });
  await nav("我的進度");
  for (const id of ["weight", "waist", "fat"])
    assert.equal(await page.locator("#body-" + id).inputValue(), "");
  await nav("動作圖鑑");
  assert.equal(await page.locator("#library-list .exercise").count(), 12);
  await page.locator("#exercise-search").fill("Lat Pulldown");
  assert.equal(await page.locator("#library-list .exercise").count(), 1);
  await page.locator('[data-view="pulldown"]').click();
  await page.locator("dialog").waitFor({ state: "visible" });
  assert.match(await page.locator("#modal-content").innerText(), /CC BY 2.0/);
  await page.locator("#modal-close").click();
  await page.locator("#exercise-search").fill("");
  for (const img of await page.locator("#library-list img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((im) => im.decode());
    assert.equal(await img.evaluate((im) => im.naturalWidth > 0), true);
  }
  await page.screenshot({
    path: resolve(qa, "library-390.png"),
    fullPage: true,
  });
  await nav("今日訓練");
  await page.locator("#start").click();
  await page.locator('[data-set="0:0:done"]').click();
  assert.equal(await page.locator('[data-set="0:0:done"]').isChecked(), false);
  await set(0, 0, 12.5, 11);
  await page.reload();
  await page.locator("#start").click();
  assert.equal(await page.locator('[data-set="0:0:kg"]').inputValue(), "12.5");
  assert.equal(await page.locator('[data-set="0:0:reps"]').inputValue(), "11");
  assert.equal(await page.locator('[data-set="0:0:done"]').isChecked(), true);
  await page.locator('[data-timer="120"]').click();
  await page.clock.fastForward(30000);
  assert.equal(await page.locator("#timer-value").innerText(), "01:30");
  await page.locator("#timer-pause").click();
  await page.clock.fastForward(60000);
  assert.equal(await page.locator("#timer-value").innerText(), "01:30");
  await page.locator("#timer-pause").click();
  await page.reload();
  await page.locator("#start").click();
  await page.clock.fastForward(91000);
  assert.equal(await page.locator("#timer-value").innerText(), "00:00");
  await page.locator("#timer-reset").click();
  assert.equal(await page.locator("#timer-value").innerText(), "02:00");
  await page.locator('[data-timer="90"]').click();
  assert.equal(await page.locator("#timer-value").innerText(), "01:30");
  await page.locator('[data-sub="0"]').click();
  await page.locator('[data-alt="1"]').click();
  await page.locator("#confirm-sub").click();
  assert.equal(await page.locator('[data-set="0:0:kg"]').inputValue(), "");
  await set(0, 0, 6, 10);
  await set(0, 1, 6, 10);
  for (let i = 1; i < 6; i++) await page.locator(`[data-skip="${i}"]`).click();
  await page.screenshot({
    path: resolve(qa, "workout-390.png"),
    fullPage: true,
  });
  await page.locator("#finish").click();
  await page.locator("#confirm-finish").evaluate((b) => {
    b.click();
    b.click();
  });
  assert.equal((await stored()).history.length, 1);
  assert.equal((await stored()).history[0].status, "complete");
  assert.equal((await stored()).history[0].exercises[0].actualId, "sitstand");
  assert.match(await page.locator(".big").innerText(), /GYM B/);
  await page.locator("#recover").click();
  await page.locator("#start").click();
  await page.locator("#recovery-save").click();
  assert.equal((await stored()).history.length, 2);
  await page.locator("#start").click();
  await page.locator("#recovery-save").click();
  assert.equal((await stored()).history.length, 2);
  await page.locator("#choose").click();
  await page.locator('[data-start="B"]').click();
  assert.equal(
    await page.locator('[data-set="0:0:kg"]').getAttribute("placeholder"),
    "6",
  );
  await set(0, 0, null, 10);
  await page.locator("#finish").click();
  await page.locator("#confirm-finish").click();
  assert.equal((await stored()).history.at(-1).status, "partial");
  await nav("週計劃");
  await page.locator("#week-mode").selectOption("3");
  assert.equal(Object.values((await stored()).modes)[0], "3");
  await page.locator("#week-mode").selectOption("recovery");
  assert.equal(Object.values((await stored()).modes)[0], "recovery");
  await page.locator("#week-mode").selectOption("2");
  const firstDay = page.locator("[data-day]").first(),
    from = await firstDay.getAttribute("data-day");
  await firstDay.selectOption("A");
  await page.locator(`[data-move="${from}"]`).click();
  await page.locator("#move-date").fill("2026-11-02");
  await page.locator("#move-preview").click();
  assert.equal((await stored()).schedule[from], "A");
  await page.locator("#move-confirm").click();
  assert.equal((await stored()).schedule[from], "Recovery");
  assert.equal((await stored()).schedule["2026-11-02"], "A");
  await page.screenshot({ path: resolve(qa, "plan-390.png"), fullPage: true });
  await nav("我的進度");
  await page.locator("#body-weight").fill("80");
  await page.locator("#body-waist").fill("90");
  await page.locator("#body-fat").fill("20");
  await page.getByRole("button", { name: "儲存量度", exact: true }).click();
  assert.equal((await stored()).body.length, 1);
  await page.locator("#load-exercise").selectOption("sitstand");
  assert.match(await page.locator("#load-chart").innerText(), /6 kg/);
  await page.screenshot({
    path: resolve(qa, "progress-390.png"),
    fullPage: true,
  });
  await page.evaluate(() => localStorage.setItem("other-module", "preserve"));
  const before = await page.evaluate(() =>
    localStorage.getItem("giant-gym-v1"),
  );
  await page
    .locator("#import")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  assert.match(await page.locator("#notice").innerText(), /匯入失敗/);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("giant-gym-v1")),
    before,
  );
  await page
    .locator("#import")
    .setInputFiles({
      name: "large.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(5000001),
    });
  assert.match(await page.locator("#notice").innerText(), /檔案太大/);
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadEvent,
    backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.app, "giant-gym");
  assert.equal(JSON.stringify(backup).includes("other-module"), false);
  backup.data.history[0].exercises[0].variation =
    "<img src=x onerror=alert(1)> & literal text";
  const file = {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page.locator("#import").setInputFiles(file);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("giant-gym-v1")),
    before,
  );
  await page.locator("#modal-close").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("giant-gym-v1")),
    before,
  );
  await page.locator("#import").setInputFiles(file);
  await page.locator("#confirm-import").click();
  assert.equal(
    (await stored()).history[0].exercises[0].variation,
    backup.data.history[0].exercises[0].variation,
  );
  assert.equal(await page.locator('img[src="x"]').count(), 0);
  for (const width of [320, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const label of ["今日訓練", "週計劃", "動作圖鑑", "我的進度"]) {
      await nav(label);
      await overflow();
    }
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await nav("今日訓練");
  await page.locator("#choose").click();
  await page.locator('[data-start="B"]').click();
  await overflow();
  await page.screenshot({
    path: resolve(qa, "workout-320.png"),
    fullPage: true,
  });
  await nav("我的進度");
  const beforeClear = await stored();
  await page.locator("#clear").click();
  await page.locator("#confirm-clear").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("giant-gym-v1")),
    null,
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("other-module")),
    "preserve",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const quota = await browser.newContext();
  await quota.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Unavailable", "QuotaExceededError");
    };
  });
  const qp = await quota.newPage();
  await qp.goto(origin + "/gym/");
  await qp.locator("#start").click();
  assert.match(await qp.locator("#notice").innerText(), /無法儲存/);
  await quota.close();
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw new DOMException("Denied", "SecurityError");
    };
  });
  const dp = await denied.newPage();
  await dp.goto(origin + "/gym/");
  assert.match(await dp.locator("#notice").innerText(), /無法讀取/);
  await denied.close();
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("giant-gym-v1", "corrupt"),
  );
  const cp = await corrupt.newPage();
  await cp.goto(origin + "/gym/");
  await cp.locator("#start").click();
  assert.equal(
    await cp.evaluate(() => localStorage.getItem("giant-gym-v1")),
    "corrupt",
  );
  await corrupt.close();
  const conflict = await browser.newContext();
  const c1 = await conflict.newPage(),
    c2 = await conflict.newPage();
  await c1.goto(origin + "/gym/");
  await c2.goto(origin + "/gym/");
  await c1.locator("#start").click();
  await c2.getByText("另一個分頁已更改健身資料。", { exact: false }).waitFor();
  await conflict.close();
  for (const path of [
    "/",
    "/transit/",
    "/english/",
    "/adventure/",
    "/practice/",
  ]) {
    const r = await page.goto(origin + path);
    assert.equal(r.status(), 200, path);
  }
  console.log(
    "PASS browser: mobile navigation/keyboard; 12 library items and media decode; per-set reload/resume; timer 90/120, pause/resume/reset/elapsed across reload; substitution/reset/actual last load; skips, explicit/duplicate/partial finish; recovery dedupe; 2/3/recovery modes and confirmed move; empty fields/body trends/history; backup roundtrip/preview/cancel/invalid/oversize/XSS; isolated clear; storage quota/denied/corrupt/conflict; 320–1280px overflow; other app entry points.",
  );
  console.log("Synthetic QA screenshots:", qa);
  assert.ok(beforeClear.history.length >= 3);
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
