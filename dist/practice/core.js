export const VERSION = 1;
export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_BACKUP = 60 * 1024 * 1024;
export {createId as uid} from './id.js';
import {createId as uid} from './id.js';
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function initialState() {
  const section = { id: uid(), title: '想練習的段落', minutes: 10, notes: '', tempo: 80, history: [] };
  const piece = { id: uid(), title: '我的第一首歌', sections: [section], score: [], page: 1 };
  return { version: VERSION, pieces: [piece], pieceId: piece.id, sectionId: section.id, questions: '', session: { targetMinutes: 30, elapsedMs: 0, running: false, startedAt: null }, sessions: [] };
}
export function elapsed(session, now = Date.now()) {
  return clamp(session.elapsedMs + (session.running ? Math.max(0, now - session.startedAt) : 0), 0, session.targetMinutes * 60000);
}
export function pause(session, now = Date.now()) {
  session.elapsedMs = elapsed(session, now); session.running = false; session.startedAt = null;
}
export function start(session, now = Date.now()) {
  if (!session.running && session.elapsedMs < session.targetMinutes * 60000) { session.startedAt = now; session.running = true; }
}
export function restored(state) {
  // A checkpoint is the last known foreground practice time. Closed-tab time is never counted.
  state.session.running = false; state.session.startedAt = null; return state;
}
export function validateState(value) {
  const fail = () => { throw new Error('備份格式不正確、版本不支援或內容超出限制。'); };
  const obj = x => x && typeof x === 'object' && !Array.isArray(x);
  const str = (x, max) => typeof x === 'string' && x.length <= max;
  const num = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  const ids = new Set();
  const id = x => { if (!str(x, 80) || !x || ids.has(x)) fail(); ids.add(x); };
  if (!obj(value) || value.version !== VERSION || !Array.isArray(value.pieces) || value.pieces.length < 1 || value.pieces.length > 50) fail();
  let total = 0;
  for (const p of value.pieces) {
    if (!obj(p)) fail(); id(p.id);
    if (!str(p.title, 120) || !p.title.trim() || !Array.isArray(p.sections) || !p.sections.length || p.sections.length > 100 || !Array.isArray(p.score) || p.score.length > 30 || !Number.isInteger(p.page) || !num(p.page, 1, 500)) fail();
    for (const s of p.sections) {
      if (!obj(s)) fail(); id(s.id);
      if (!str(s.title, 120) || !s.title.trim() || !str(s.notes, 5000) || !num(s.minutes, 1, 180) || !num(s.tempo, 30, 240) || !Array.isArray(s.history) || s.history.length > 500) fail();
      for (const h of s.history) if (!obj(h) || !num(h.at, 0, 1e14) || !num(h.tempo, 30, 240) || !Number.isInteger(h.difficulty) || !num(h.difficulty, 1, 5) || !str(h.note, 1000)) fail();
    }
    for (const f of p.score) {
      if (!obj(f) || !str(f.name, 200) || !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(f.type) || !str(f.data, Math.ceil(MAX_FILE * 4 / 3) + 100)) fail();
      if (!f.data.startsWith(`data:${f.type};base64,`) || !/^[A-Za-z0-9+/]+={0,2}$/.test(f.data.split(',')[1])) fail();
      total += f.data.length;
    }
    if (p.score.some(f => f.type === 'application/pdf') && p.score.length !== 1) fail();
  }
  const p = value.pieces.find(p => p.id === value.pieceId);
  const s = value.session;
  if (total > MAX_BACKUP - 2e6 || !p || !p.sections.some(s => s.id === value.sectionId) || !str(value.questions, 10000) || !obj(s) || !Number.isInteger(s.targetMinutes) || !num(s.targetMinutes, 1, 180) || !num(s.elapsedMs, 0, s.targetMinutes * 60000) || typeof s.running !== 'boolean' || (s.startedAt !== null && !num(s.startedAt, 0, 1e14)) || (s.running && s.startedAt === null) || !Array.isArray(value.sessions) || value.sessions.length > 500) fail();
  for (const h of value.sessions) if (!obj(h) || !num(h.at, 0, 1e14) || !num(h.minutes, 0, 180)) fail();
  // Reconstruct through JSON to detach the caller's object; UI only uses textContent/value.
  return JSON.parse(JSON.stringify(value));
}
export function fileType(bytes) {
  const b = bytes;
  if (b.length > 5 && String.fromCharCode(...b.slice(0, 5)) === '%PDF-') return 'application/pdf';
  if (b.length > 8 && [137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)) return 'image/png';
  if (b.length > 3 && b[0]===255 && b[1]===216 && b[2]===255) return 'image/jpeg';
  if (b.length > 12 && String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP') return 'image/webp';
  throw new Error('請選擇有效的 PDF、PNG、JPEG 或 WebP 樂譜。');
}
