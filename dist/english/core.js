import { byId, lessons } from './curriculum.js';

export const STORAGE_KEY = 'english-practice-v1';
export const MAX_BYTES = 1000000;
export const HISTORY_LIMIT = 100;
export const emptyState = () => ({ version:1, preferences:{minutes:5,mode:'guided'}, drafts:{}, history:[], difficult:[], mistakes:[] });
export const requiredQuestions = run => run.minutes === 10 ? 2 : 1;
export const hasProduction = run => run.spoken || run.response.trim().length > 0;
export function checklist(run) {
  return {
    learn: run.learn,
    dialogue: run.dialogue,
    practice: run.checked.slice(0,requiredQuestions(run)).every(Boolean),
    speak: hasProduction(run) && run.modelSeen && run.rubric.every(Boolean),
    reflect: run.reflection !== null
  };
}
export const canComplete = run => Object.values(checklist(run)).every(Boolean);
export function startRun(lessonId, minutes, mode, id, now = new Date().toISOString()) {
  if (!byId[lessonId] || ![5,10].includes(minutes) || !['guided','stretch'].includes(mode)) throw new Error('Invalid session settings.');
  return {id,lessonId,minutes,mode,startedAt:now,learn:false,dialogue:false,choices:[null,null],checked:[false,false],response:'',spoken:false,modelSeen:false,rubric:[false,false],reflection:null};
}
export function checkQuestion(state, run, index) {
  const q = byId[run.lessonId].questions[index];
  if (!q || index >= requiredQuestions(run) || !Number.isInteger(run.choices[index])) return null;
  run.checked[index] = true;
  const correct = run.choices[index] === q.answer;
  const key = `${run.lessonId}:question:${index}`;
  if (!correct && !state.mistakes.includes(key)) state.mistakes.push(key);
  return correct;
}
export function completeRun(state, run, now = new Date().toISOString()) {
  if (!canComplete(run) || state.history.some(h => h.id === run.id) || state.drafts[run.lessonId]?.id !== run.id) return false;
  state.history.unshift({...run,choices:[...run.choices],checked:[...run.checked],rubric:[...run.rubric],completedAt:now});
  state.history = state.history.slice(0,HISTORY_LIMIT);
  delete state.drafts[run.lessonId];
  return true;
}
export function localEnglishVoices(voices) {
  return voices.filter(v=>v.localService === true && /^en(?:[-_]|$)/i.test(v.lang));
}

function insist(condition) { if (!condition) throw new Error('Invalid or incompatible progress file. Existing progress has not been changed.'); }
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
function keys(v, expected) { insist(plain(v) && Object.keys(v).every(k=>expected.includes(k)) && expected.every(k=>Object.hasOwn(v,k))); }
function boolean(v) { insist(typeof v === 'boolean'); return v; }
function date(v) { insist(typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v); return v; }
function runFrom(v, completed = false) {
  const runKeys = ['id','lessonId','minutes','mode','startedAt','learn','dialogue','choices','checked','response','spoken','modelSeen','rubric','reflection'];
  keys(v,completed ? [...runKeys,'completedAt'] : runKeys);
  insist(typeof v.id === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(v.id) && Object.hasOwn(byId,v.lessonId));
  insist([5,10].includes(v.minutes) && ['guided','stretch'].includes(v.mode));
  insist(typeof v.response === 'string' && v.response.length <= 2000);
  insist(Array.isArray(v.choices) && v.choices.length === 2 && v.choices.every((n,i)=>n === null || (Number.isInteger(n) && n>=0 && n<byId[v.lessonId].questions[i].options.length)));
  insist(Array.isArray(v.checked) && v.checked.length === 2 && v.checked.every(n=>typeof n === 'boolean'));
  insist(v.checked.every((n,i)=>!n || v.choices[i]!==null));
  insist(v.minutes === 10 || (!v.checked[1] && v.choices[1]===null));
  insist(Array.isArray(v.rubric) && v.rubric.length === 2 && v.rubric.every(n=>typeof n === 'boolean'));
  insist(v.reflection === null || ['again','comfortable'].includes(v.reflection));
  const run = {...v,startedAt:date(v.startedAt),learn:boolean(v.learn),dialogue:boolean(v.dialogue),spoken:boolean(v.spoken),modelSeen:boolean(v.modelSeen),choices:[...v.choices],checked:[...v.checked],rubric:[...v.rubric]};
  if (completed) { run.completedAt=date(v.completedAt); insist(canComplete(run) && Date.parse(v.completedAt)>=Date.parse(v.startedAt)); }
  return run;
}
export function validateState(v) {
  keys(v,['version','preferences','drafts','history','difficult','mistakes']); insist(v.version === 1);
  keys(v.preferences,['minutes','mode']); insist([5,10].includes(v.preferences.minutes) && ['guided','stretch'].includes(v.preferences.mode));
  insist(plain(v.drafts) && Object.keys(v.drafts).length<=lessons.length);
  const state=emptyState(); state.preferences={...v.preferences};
  for (const [id,run] of Object.entries(v.drafts)) { insist(Object.hasOwn(byId,id) && run.lessonId === id); state.drafts[id]=runFrom(run); }
  insist(Array.isArray(v.history) && v.history.length<=HISTORY_LIMIT); state.history=v.history.map(r=>runFrom(r,true));
  const ids=[...Object.values(state.drafts),...state.history].map(r=>r.id); insist(new Set(ids).size===ids.length);
  for (const [field,type,max] of [['difficult','phrase',30],['mistakes','question',20]]) {
    insist(Array.isArray(v[field]) && v[field].length<=max && new Set(v[field]).size===v[field].length);
    insist(v[field].every(key=>{
      if (typeof key!=='string') return false;
      const [id,kind,index,...rest]=key.split(':');
      return !rest.length && Object.hasOwn(byId,id) && kind===type && /^[0-2]$/.test(index) && Number(index)<(type==='phrase'?byId[id].phrases:byId[id].questions).length;
    })); state[field]=[...v[field]];
  }
  return state;
}
export function parseProgress(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length>MAX_BYTES) throw new Error('Progress files must be JSON and no larger than 1 MB.');
  try { return validateState(JSON.parse(text)); } catch { throw new Error('Invalid or incompatible progress file. Existing progress has not been changed.'); }
}
export function loadProgress(storage) {
  try { const raw=storage.getItem(STORAGE_KEY); return {state:raw ? parseProgress(raw):emptyState(),blocked:false,error:''}; }
  catch { return {state:emptyState(),blocked:true,error:'Saved progress could not be read. This visit is temporary. Import a valid backup or clear English data to enable saving.'}; }
}
export function saveProgress(storage,state) {
  try { const text=JSON.stringify(validateState(state)); if (new TextEncoder().encode(text).length>MAX_BYTES) throw new Error(); storage.setItem(STORAGE_KEY,text); return {ok:true,error:''}; }
  catch { return {ok:false,error:'Progress could not be saved in this browser. Keep this tab open and export a JSON backup.'}; }
}
