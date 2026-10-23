import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { plans, byId, exercises, photos, phase } from "../data.js";
import {
  emptyState,
  makeDraft,
  finish,
  nextType,
  weekCount,
  weekNumber,
  monday,
  addDays,
  localDate,
  validDate,
  suggestion,
  lastLoad,
  timerAction,
  timerRemaining,
  exportBackup,
  parseBackup,
  validateState,
} from "../core.js";
const now = new Date("2026-10-23T12:00:00").getTime();
function complete(s, type = "A", time = now) {
  s.draft = makeDraft(s, type, time);
  for (const e of s.draft.exercises)
    for (const t of e.sets)
      Object.assign(t, {
        kg: byId[e.actualId].body ? null : 10,
        reps: 10,
        done: true,
      });
  return finish(s, false, time + 1000);
}
test("faithful 12 exercise prescription and phase progression", () => {
  assert.deepEqual(
    plans.A.map((id) => [byId[id].en, byId[id].sets, byId[id].reps]),
    [
      ["Leg Press", 2, "10–12"],
      ["Chest Press", 2, "10–12"],
      ["Seated Row", 2, "10–12"],
      ["Leg Curl", 2, "12–15"],
      ["Lateral Raise", 2, "12–15"],
      ["Triceps Pushdown", 2, "12–15"],
    ],
  );
  assert.deepEqual(
    plans.B.map((id) => [byId[id].en, byId[id].sets, byId[id].reps]),
    [
      ["Sit-to-Stand", 2, "10–12"],
      ["Incline Chest Press", 2, "10–12"],
      ["Lat Pulldown", 2, "10–12"],
      ["Glute Bridge", 2, "10–12"],
      ["Reverse Pec Deck", 2, "12–15"],
      ["Biceps Curl", 2, "12–15"],
    ],
  );
  assert.match(phase(1).strength, /RIR 3–4/);
  assert.match(phase(2).cardio, /15–20/);
  assert.match(phase(3).strength, /2–3/);
  assert.match(phase(4).cardio, /20–30/);
  assert.match(phase(5).strength, /醫療/);
  assert.match(phase(8).cardio, /150/);
});
test("A/B only alternates after complete strength; partial/recovery/draft ignored", () => {
  let s = emptyState();
  assert.equal(nextType(s), "A");
  s.draft = makeDraft(s, "B", now);
  assert.equal(nextType(s), "A");
  s = complete(s);
  assert.equal(nextType(s), "B");
  s.draft = makeDraft(s, "B", now + 2000);
  Object.assign(s.draft.exercises[0].sets[0], { reps: 10, done: true });
  s = finish(s, true, now + 3000);
  assert.equal(nextType(s), "B");
  s.history.push({
    id: "recovery",
    type: "Recovery",
    status: "complete",
    date: localDate(new Date(now)),
    finishedAt: now + 4000,
    minutes: 0,
  });
  assert.equal(nextType(s), "B");
  assert.equal(weekCount(s, localDate(new Date(now))), 1);
});
test("completion is explicit, date reflects finish, duplicate finish prevented", () => {
  let s = emptyState();
  s.draft = makeDraft(s, "A", now);
  assert.throws(() => finish(s));
  Object.assign(s.draft.exercises[0].sets[0], { kg: 12, reps: 11, done: true });
  assert.throws(() => finish(s, false));
  s = finish(s, true, now + 86400000);
  assert.equal(s.history[0].date, "2026-10-24");
  assert.equal(s.draft, null);
  assert.throws(() => finish(s, true));
  assert.equal(s.history.length, 1);
});
test("actual exercise last load, skipped sets and substitutions stay distinct", () => {
  let s = emptyState();
  s.draft = makeDraft(s, "A", now);
  s.draft.exercises[0].actualId = "sitstand";
  Object.assign(s.draft.exercises[0].sets[0], { kg: 5, reps: 10, done: true });
  s = finish(s, true, now + 1000);
  assert.equal(lastLoad(s, "sitstand"), 5);
  assert.equal(lastLoad(s, "legpress"), null);
  assert.equal(lastLoad(s, "chest"), null);
});
test("local Monday-Sunday and DST-safe week calculations", () => {
  assert.equal(monday("2026-10-25"), "2026-10-19");
  assert.equal(monday("2026-10-26"), "2026-10-26");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(weekNumber("2026-03-02", "2026-03-16"), 3);
  assert.equal(weekNumber("2026-10-23", "2026-10-22"), 1);
  assert.equal(validDate("2026-02-30"), false);
  for (const TZ of ["Asia/Hong_Kong", "America/New_York", "Pacific/Honolulu"]) {
    const r = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import {localDate,monday,weekNumber} from './dist/gym/core.js';if(localDate(new Date(2026,9,26,0,1))!=='2026-10-26'||monday('2026-10-25')!=='2026-10-19'||weekNumber('2026-03-02','2026-03-16')!==3)process.exit(1)`,
      ],
      { env: { ...process.env, TZ } },
    );
    assert.equal(r.status, 0, r.stderr?.toString());
  }
});
test("2/3 day, recovery week, manual scheduling and weekly boundary", () => {
  let s = complete(emptyState());
  s = complete(s, "B", now + 2000);
  assert.equal(suggestion(s, "2026-10-23"), "Recovery");
  s.modes["2026-10-19"] = "3";
  assert.equal(suggestion(s, "2026-10-23"), "A");
  s.modes["2026-10-19"] = "recovery";
  assert.equal(suggestion(s, "2026-10-23"), "Recovery");
  s.schedule["2026-10-23"] = "B";
  assert.equal(suggestion(s, "2026-10-23"), "B");
  assert.equal(weekCount(s, "2026-10-26"), 0);
});
test("timestamp timer start/pause/resume/reset and background elapsed", () => {
  let t = emptyState().timer;
  t = timerAction(t, "start", 1000, 120);
  assert.equal(timerRemaining(t, 31000), 90);
  t = timerAction(t, "pause", 31000);
  assert.equal(timerRemaining(t, 900000), 90);
  t = timerAction(t, "resume", 900000);
  assert.equal(timerRemaining(t, 960000), 30);
  assert.equal(timerRemaining(t, 999999), 0);
  t = timerAction(t, "reset");
  assert.equal(t.end, null);
  assert.equal(t.remaining, 120);
});
test("JSON roundtrip only known Gym fields; empty and draft allowed", () => {
  const s = complete(emptyState());
  s.body = [{ date: "2026-10-23", weight: 80, waist: 90, fat: 20 }];
  s.draft = makeDraft(s, "B", now + 5000);
  s.extra = "unrelated";
  const result = parseBackup(exportBackup(s));
  assert.equal(result.extra, undefined);
  delete s.extra;
  assert.deepEqual(result, s);
  assert.deepEqual(parseBackup(exportBackup(emptyState())), emptyState());
});
test("invalid imports reject unknown exercises, duplicates, invalid metrics/sets/date/timer/version", () => {
  for (const mutate of [
    (s) => (s.version = 2),
    (s) =>
      (s.body = [{ date: "2026-02-30", weight: 80, waist: null, fat: null }]),
    (s) =>
      (s.body = [{ date: "2026-10-23", weight: "80", waist: null, fat: null }]),
    (s) => (s.timer.end = "soon"),
    (s) => s.history.push(s.history[0]),
    (s) => (s.history[0].exercises[0].actualId = "__proto__"),
    (s) => (s.history[0].exercises[0].sets[0].reps = -1),
    (s) => (s.schedule = { __proto__: "A", bad: "A" }),
  ]) {
    const s = complete(emptyState());
    mutate(s);
    assert.throws(() => validateState(s));
  }
  assert.throws(() => parseBackup("{}"));
  assert.throws(() => parseBackup("x"));
  assert.throws(() => parseBackup("x".repeat(5000001)));
});
test("all rendered media are local and present", () => {
  for (const e of exercises) {
    const filename = photos[e.id]?.file || e.id + ".svg";
    assert.ok(
      existsSync(new URL("../assets/" + filename, import.meta.url)),
      filename,
    );
  }
});
