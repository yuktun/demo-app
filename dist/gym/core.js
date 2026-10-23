import { plans, byId, alternatives } from "./data.js";
export const KEY = "giant-gym-v1";
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !isNaN(d) && localDate(d) === s;
}
export function addDays(s, n) {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function monday(s = localDate()) {
  const d = new Date(s + "T12:00:00");
  return addDays(s, -((d.getDay() + 6) % 7));
}
export function weekNumber(start, today = localDate()) {
  if (!start || today < start) return 1;
  return (
    Math.floor(
      (Date.parse(today + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        604800000,
    ) + 1
  );
}
export const emptyState = () => ({
  version: 1,
  startDate: "",
  modes: {},
  schedule: {},
  history: [],
  body: [],
  draft: null,
  timer: { duration: 90, remaining: 90, end: null },
});
export const strengthHistory = (s) =>
  s.history
    .filter((h) => h.type !== "Recovery" && h.status === "complete")
    .sort((a, b) => b.finishedAt - a.finishedAt);
export const nextType = (s) =>
  strengthHistory(s)[0]?.type === "A" ? "B" : "A";
export const weekCount = (s, date = localDate()) =>
  strengthHistory(s).filter(
    (h) => h.date >= monday(date) && h.date <= addDays(monday(date), 6),
  ).length;
export function suggestion(s, date = localDate()) {
  const mode = s.modes[monday(date)] || "2";
  return (
    s.schedule[date] ||
    (mode === "recovery" || weekCount(s, date) >= Number(mode)
      ? "Recovery"
      : nextType(s))
  );
}
export function lastLoad(s, id) {
  for (const h of [...s.history].sort((a, b) => b.finishedAt - a.finishedAt)) {
    for (const e of h.exercises || []) {
      if (e.actualId !== id || e.skipped) continue;
      const set = [...e.sets].reverse().find((x) => x.done && x.kg !== null);
      if (set) return set.kg;
    }
  }
  return null;
}
export function makeDraft(s, type, now = Date.now()) {
  return {
    id: globalThis.crypto?.randomUUID?.() || String(now),
    type,
    startedAt: now,
    date: localDate(new Date(now)),
    exercises: plans[type].map((id) => ({
      baseId: id,
      actualId: id,
      variation: "",
      skipped: false,
      sets: [0, 1].map(() => ({ kg: null, reps: null, done: false })),
    })),
  };
}
export const completedSets = (d) =>
  d.exercises
    .filter((e) => !e.skipped)
    .reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
export const fullSession = (d) =>
  completedSets(d) > 0 &&
  d.exercises.every((e) => e.skipped || e.sets.every((x) => x.done));
export function finish(s, partial = false, now = Date.now()) {
  if (!s.draft || !completedSets(s.draft))
    throw Error("至少完成一組，才可儲存訓練。");
  if (!partial && !fullSession(s.draft))
    throw Error("仍有未完成組數，請儲存為部分完成。");
  if (s.history.some((h) => h.id === s.draft.id))
    throw Error("這次訓練已儲存。");
  const next = structuredClone(s);
  next.history.push({
    ...next.draft,
    status: partial ? "partial" : "complete",
    date: localDate(new Date(now)),
    finishedAt: now,
  });
  next.draft = null;
  return next;
}
export const timerRemaining = (t, now = Date.now()) =>
  t.end === null ? t.remaining : Math.max(0, Math.ceil((t.end - now) / 1000));
export function timerAction(
  t,
  action,
  now = Date.now(),
  duration = t.duration,
) {
  const remaining = timerRemaining(t, now);
  if (action === "start")
    return { duration, remaining: duration, end: now + duration * 1000 };
  if (action === "pause") return { ...t, remaining, end: null };
  if (action === "resume")
    return { ...t, remaining, end: now + remaining * 1000 };
  return { duration: t.duration, remaining: t.duration, end: null };
}
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const number = (x, min, max) =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const optional = (x, min, max) => x === null || number(x, min, max);
function requireOk(ok) {
  if (!ok) throw Error("檔案格式無效或版本不相容；原有紀錄沒有變更。");
}
function session(x, draft = false) {
  requireOk(
    object(x) &&
      typeof x.id === "string" &&
      /^[\w-]{1,80}$/.test(x.id) &&
      ["A", "B"].includes(x.type) &&
      validDate(x.date) &&
      number(x.startedAt, 0, 1e14) &&
      Array.isArray(x.exercises) &&
      x.exercises.length === 6,
  );
  if (!draft)
    requireOk(
      ["complete", "partial"].includes(x.status) &&
        number(x.finishedAt, x.startedAt, 1e14),
    );
  const exercises = x.exercises.map((e, i) => {
    requireOk(
      object(e) &&
        e.baseId === plans[x.type][i] &&
        typeof e.actualId === "string" &&
        Object.hasOwn(byId, e.actualId) &&
        [e.baseId, ...alternatives[e.baseId].map((a) => a[0])].includes(
          e.actualId,
        ) &&
        typeof e.skipped === "boolean" &&
        typeof e.variation === "string" &&
        e.variation.length <= 300 &&
        Array.isArray(e.sets) &&
        e.sets.length === 2,
    );
    const sets = e.sets.map((t) => {
      requireOk(
        object(t) &&
          optional(t.kg, 0, 2000) &&
          optional(t.reps, 0, 500) &&
          (t.reps === null || Number.isInteger(t.reps)) &&
          typeof t.done === "boolean" &&
          (!t.done || (t.reps > 0 && (byId[e.actualId].body || t.kg !== null))),
      );
      return { kg: t.kg, reps: t.reps, done: t.done };
    });
    return {
      baseId: e.baseId,
      actualId: e.actualId,
      variation: e.variation,
      skipped: e.skipped,
      sets,
    };
  });
  const clean = {
    id: x.id,
    type: x.type,
    date: x.date,
    startedAt: x.startedAt,
    exercises,
  };
  if (!draft) {
    requireOk(
      completedSets(clean) > 0 &&
        (x.status !== "complete" || fullSession(clean)),
    );
    Object.assign(clean, { finishedAt: x.finishedAt, status: x.status });
  }
  return clean;
}
export function validateState(x) {
  requireOk(
    object(x) &&
      x.version === 1 &&
      (x.startDate === "" || validDate(x.startDate)) &&
      object(x.modes) &&
      object(x.schedule) &&
      Array.isArray(x.history) &&
      x.history.length <= 5000 &&
      Array.isArray(x.body) &&
      x.body.length <= 5000,
  );
  const s = emptyState();
  s.startDate = x.startDate;
  requireOk(
    Object.keys(x.modes).length <= 1000 &&
      Object.keys(x.schedule).length <= 10000,
  );
  for (const [k, v] of Object.entries(x.modes)) {
    requireOk(
      validDate(k) && k === monday(k) && ["2", "3", "recovery"].includes(v),
    );
    s.modes[k] = v;
  }
  for (const [k, v] of Object.entries(x.schedule)) {
    requireOk(validDate(k) && ["A", "B", "Recovery", "Rest"].includes(v));
    s.schedule[k] = v;
  }
  s.history = x.history.map((h) => {
    if (h.type === "Recovery") {
      requireOk(
        object(h) &&
          typeof h.id === "string" &&
          /^[\w-]{1,80}$/.test(h.id) &&
          h.status === "complete" &&
          validDate(h.date) &&
          number(h.finishedAt, 0, 1e14) &&
          number(h.minutes, 0, 300),
      );
      return {
        id: h.id,
        type: "Recovery",
        status: "complete",
        date: h.date,
        finishedAt: h.finishedAt,
        minutes: h.minutes,
      };
    }
    return session(h);
  });
  requireOk(new Set(s.history.map((h) => h.id)).size === s.history.length);
  s.body = x.body.map((b) => {
    requireOk(
      object(b) &&
        validDate(b.date) &&
        optional(b.weight, 20, 500) &&
        optional(b.waist, 20, 300) &&
        optional(b.fat, 1, 75) &&
        [b.weight, b.waist, b.fat].some((v) => v !== null),
    );
    return { date: b.date, weight: b.weight, waist: b.waist, fat: b.fat };
  });
  requireOk(new Set(s.body.map((b) => b.date)).size === s.body.length);
  s.draft = x.draft === null ? null : session(x.draft, true);
  requireOk(!s.draft || !s.history.some((h) => h.id === s.draft.id));
  const t = x.timer;
  requireOk(
    object(t) &&
      [90, 120].includes(t.duration) &&
      number(t.remaining, 0, 120) &&
      (t.end === null || number(t.end, 0, 1e14)),
  );
  s.timer = { duration: t.duration, remaining: t.remaining, end: t.end };
  return s;
}
export function parseBackup(text) {
  requireOk(typeof text === "string" && text.length <= 5000000);
  const x = JSON.parse(text);
  requireOk(x.app === "giant-gym" && x.version === 1);
  return validateState(x.data);
}
export const exportBackup = (s) =>
  JSON.stringify(
    { app: "giant-gym", version: 1, data: validateState(s) },
    null,
    2,
  );
