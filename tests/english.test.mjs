import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, byId } from '../dist/english/curriculum.js';
import { emptyState, startRun, checklist, canComplete, checkQuestion, completeRun, parseProgress, validateState, loadProgress, saveProgress, localEnglishVoices, STORAGE_KEY, MAX_BYTES } from '../dist/english/core.js';

function practiced(minutes=5,id='session-0001') {
  const state=emptyState(),run=startRun('status',minutes,'guided',id,'2026-01-01T10:00:00.000Z');
  state.drafts.status=run;
  run.learn=true;run.dialogue=true;run.choices[0]=0;checkQuestion(state,run,0);
  if(minutes===10){run.choices[1]=1;checkQuestion(state,run,1);}
  run.spoken=true;run.modelSeen=true;run.rubric=[true,true];run.reflection='comfortable';
  return {state,run};
}
test('curriculum has ten complete original lessons with bounded answer keys and Traditional Chinese support',()=>{
  assert.equal(lessons.length,10);assert.equal(new Set(lessons.map(l=>l.id)).size,10);
  for(const l of lessons){assert.equal(l.phrases.length,3);assert.equal(l.questions.length,2);assert.equal(l.rubric.length,2);assert.equal(l.dialogue.length,4);assert.match(l.zh,/[\u4e00-\u9fff]/u);assert.match(l.speaking,/30/);assert.match(l.challenge,/60/);for(const q of l.questions)assert.ok(q.options[q.answer]);}
});
test('new local progress never invents historic completions',()=>{
  const s=emptyState();assert.deepEqual(s.history,[]);assert.deepEqual(s.drafts,{});
  const r=startRun('status',5,'stretch','session-0001');assert.equal(canComplete(r),false);assert.deepEqual(Object.values(checklist(r)),[false,false,false,false,false]);
});
test('every required action gates completion; written notes alone are not self-review',()=>{
  const {run}=practiced();assert.equal(canComplete(run),true);
  for(const field of ['learn','dialogue','spoken','modelSeen']){const copy=structuredClone(run);copy[field]=false;assert.equal(canComplete(copy),false,field);}
  for(const change of [r=>r.checked[0]=false,r=>r.rubric[0]=false,r=>r.reflection=null]){const copy=structuredClone(run);change(copy);assert.equal(canComplete(copy),false);}
  const copy=structuredClone(run);copy.spoken=false;copy.response='I will send an update tomorrow.';assert.equal(canComplete(copy),true);
});
test('ten-minute sessions require both questions; incorrect attempts become review items without false grading',()=>{
  const {state,run}=practiced(10);run.checked[1]=false;assert.equal(canComplete(run),false);
  run.choices[1]=0;assert.equal(checkQuestion(state,run,1),false);assert.equal(canComplete(run),true);assert.deepEqual(state.mistakes,['status:question:1']);
  checkQuestion(state,run,1);assert.equal(state.mistakes.length,1);
});
test('completion records once, removes the draft and preserves private notes only in state',()=>{
  const {state,run}=practiced();run.response='Original practice sentence.';
  assert.equal(completeRun(state,run,'2026-01-01T10:05:00.000Z'),true);
  assert.equal(completeRun(state,run,'2026-01-01T10:06:00.000Z'),false);
  assert.equal(state.history.length,1);assert.equal(state.history[0].response,run.response);assert.equal(state.drafts.status,undefined);
  assert.deepEqual(parseProgress(JSON.stringify(state)),state);
});
test('unfinished drafts and preferences survive a JSON round trip',()=>{
  const state=emptyState();state.preferences={minutes:10,mode:'stretch'};state.drafts.clarify=startRun('clarify',10,'stretch','session-0002');state.drafts.clarify.response='<script>alert(1)</script>';
  state.difficult=['clarify:phrase:2'];state.mistakes=['clarify:question:1'];
  assert.deepEqual(parseProgress(JSON.stringify(state)),state);
});
test('invalid import fails without mutating existing state, including false completion evidence',()=>{
  const {state,run}=practiced();const original=JSON.stringify(state);
  for(const mutate of [s=>s.version=2,s=>s.preferences.mode='expert',s=>s.drafts.status.minutes=7,s=>s.drafts.status.learn='true',s=>s.drafts.status.choices[0]=99,s=>s.drafts.status.checked[0]=true&&(s.drafts.status.choices[0]=null),s=>s.difficult=['missing:phrase:0'],s=>s.difficult=['status:phrase:0','status:phrase:0'],s=>s.drafts.status.response='x'.repeat(2001),s=>s.drafts.status.startedAt='yesterday',s=>s.secret='x']){
    const invalid=structuredClone(state);mutate(invalid);assert.throws(()=>parseProgress(JSON.stringify(invalid)));assert.equal(JSON.stringify(state),original);
  }
  completeRun(state,run,'2026-01-01T10:05:00.000Z');const invalid=structuredClone(state);invalid.history[0].checked[0]=false;assert.throws(()=>validateState(invalid));
  invalid.history[0].checked[0]=true;invalid.history.push(structuredClone(invalid.history[0]));assert.throws(()=>validateState(invalid));
  assert.throws(()=>parseProgress('{"__proto__":{"polluted":true}}'));assert.equal({}.polluted,undefined);
  assert.throws(()=>parseProgress('x'.repeat(MAX_BYTES+1)));assert.throws(()=>parseProgress('not json'));
});
test('unavailable, corrupt and quota-limited storage are handled without crashes',()=>{
  const bad={getItem(){throw new Error('unavailable');},setItem(){throw new Error('quota');}};
  assert.equal(loadProgress(bad).blocked,true);assert.equal(saveProgress(bad,emptyState()).ok,false);
  let raw='broken';const storage={getItem(){return raw;},setItem(key,value){assert.equal(key,STORAGE_KEY);raw=value;}};
  assert.equal(loadProgress(storage).blocked,true);assert.equal(saveProgress(storage,emptyState()).ok,true);assert.equal(loadProgress(storage).blocked,false);
});
test('completion retention is bounded and attempts remain separate across runs',()=>{
  const state=emptyState();for(let n=0;n<102;n++){const r=practiced(5,`session-${String(n).padStart(4,'0')}`).run;state.drafts.status=r;assert.equal(completeRun(state,r,'2026-01-01T10:05:00.000Z'),true);}
  assert.equal(state.history.length,100);assert.equal(new Set(state.history.map(h=>h.id)).size,100);validateState(state);
});
test('voice gate rejects remote voices, other languages and ambiguous local flags',()=>{
  const local={lang:'en-GB',localService:true};assert.deepEqual(localEnglishVoices([local,{lang:'en-US',localService:false},{lang:'en-US'},{lang:'zh-HK',localService:true}]),[local]);
});
