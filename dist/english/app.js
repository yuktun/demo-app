import { lessons, byId } from './curriculum.js';
import { STORAGE_KEY, MAX_BYTES, HISTORY_LIMIT, emptyState, startRun, checklist, requiredQuestions, hasProduction, checkQuestion, completeRun, parseProgress, loadProgress, saveProgress, localEnglishVoices } from './core.js';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zh = text => `<span lang="zh-Hant">${esc(text)}</span>`;
const storage = { getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value),removeItem:key=>window.localStorage.removeItem(key) };
const loaded = loadProgress(storage);
let state=loaded.state, blocked=loaded.blocked, view='learn', currentId=null, finished=null, staged=null, importMessage='', importing=false;
const initialRoute=window.location.hash.slice(1);
if(initialRoute.startsWith('practice/') && Object.hasOwn(state.drafts,initialRoute.slice(9))) { currentId=initialRoute.slice(9);view='session'; }
else if(['review','history','data'].includes(initialRoute)) view=initialRoute;
let audioGeneration=0, audioTimer=null, voiceChoice='', audioMessage='Checking this browser for local English voices…', voicesReady=false;
const synth=window.speechSynthesis;
const labels={learn:'Learn phrases',dialogue:'Read / listen',practice:'Try the questions',speak:'Speak & self-review',reflect:'Reflect'};
function storageMessage(message,error=false) { $('storage-status').textContent=message; $('storage-status').classList.toggle('error',error); }
storageMessage(loaded.error || 'Progress stays in this browser. No account needed.',!!loaded.error);
function persist() {
  if (blocked) return;
  const result=saveProgress(storage,state);
  storageMessage(result.ok?'Saved on this device · not synced or backed up':result.error,!result.ok);
}
const run = () => state.drafts[currentId];
function saveRun() { persist(); updateChecklist(); }
function focusMain() { $('main').focus(); }
function render(moveFocus=false) {
  const activeId=document.activeElement?.id;
  window.history.replaceState(null,'',view==='session'?`#practice/${currentId}`:view==='learn'||view==='complete'?'#practice':`#${view}`);
  document.querySelectorAll('[data-nav]').forEach(b=>{ if(b.dataset.nav===view || (view==='session'||view==='complete')&&b.dataset.nav==='learn') b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  $('review-count').textContent=state.mistakes.length+state.difficult.length;
  $('main').innerHTML= view==='session'?session():view==='complete'?completion():view==='review'?review():view==='history'?history():view==='data'?data():home();
  if (view==='session') { updateChecklist(); updateAudio(); }
  if (moveFocus) focusMain(); else if(activeId && $(activeId)) $(activeId).focus();
}
function home() {
  const completedLessons=new Set(state.history.map(h=>h.lessonId)).size;
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow">A small practice. A useful conversation.</p><h1>A little English.<br>A clearer day.</h1><p>Practise the conversations you can use today.<br>${zh('每天練習一點，讓日常及工作表達更清楚。')}</p><div class="hero-chips"><span>10 real-life scenarios</span><span>繁體中文 support</span><span>Private local progress</span></div></div><div class="hero-art" aria-hidden="true"><div class="quote">“We’re on track<br>to finish by Friday.”</div><p lang="zh-Hant">我們按計劃進行，預計星期五完成。</p><p>One useful phrase. One confident next step.</p></div></section>
  <div class="toolbar"><div class="settings"><fieldset><legend>Session length · ${zh('練習時間')}</legend><div class="choices">${[5,10].map(n=>`<label class="choice"><input type="radio" name="minutes" value="${n}" ${state.preferences.minutes===n?'checked':''}>${n} minutes</label>`).join('')}</div></fieldset><fieldset><legend>Practice style · ${zh('練習方式')}</legend><div class="choices">${[['guided','More support'],['stretch','More challenge']].map(([value,text])=>`<label class="choice"><input type="radio" name="mode" value="${value}" ${state.preferences.mode===value?'checked':''}>${text}</label>`).join('')}</div></fieldset></div><div class="summary-stat"><strong>${state.history.length} sessions · ${completedLessons}/10 topics</strong>Completed on this browser</div></div>
  <p class="tiny">5 min: one phrase focus, one question, 30-second speaking. 10 min: all phrases, two questions, 60-second speaking. Times are guides; work at your pace. ${zh('兩種方式都可自由選擇，不代表英語程度評估。')}</p>
  <div class="grid">${lessons.map((l,i)=>{ const draft=state.drafts[l.id], count=state.history.filter(h=>h.lessonId===l.id).length; return `<article class="lesson-card"><div class="card-top"><span>${esc(l.category)}</span><span class="lesson-number">${String(i+1).padStart(2,'0')}</span></div><h3>${esc(l.title)}</h3><p lang="zh-Hant">${esc(l.zh)}</p><div class="lesson-state">${draft?`In progress · ${draft.minutes} min · ${Object.values(checklist(draft)).filter(Boolean).length}/5 steps`:count?`${count} completed session${count>1?'s':''} · ready to practise again`:'New here · no recorded practice'}</div><button class="primary" data-action="start" data-id="${l.id}">${draft?'Resume session':count?'Practise again':'Start practice'} <span aria-hidden="true">↗</span></button></article>`; }).join('')}</div>`;
}
function phrase(l,p,index) {
  const key=`${l.id}:phrase:${index}`,marked=state.difficult.includes(key);
  return `<div class="phrase"><div class="phrase-head"><p class="phrase-en">${esc(p.en)}</p><button id="mark-${index}" data-action="mark" data-key="${key}" aria-pressed="${marked}">${marked?'★ Saved for review':'☆ Save for review'}</button></div><p class="zh" lang="zh-Hant">${esc(p.zh)}</p><p class="note" lang="zh-Hant">${esc(p.note)}</p></div>`;
}
function question(l,index,r) {
  const q=l.questions[index],checked=r.checked[index],correct=r.choices[index]===q.answer;
  return `<fieldset class="question"><legend>${index+1}. ${esc(q.prompt)}</legend><div class="answers">${q.options.map((o,j)=>`<label class="choice"><input id="q-${index}-${j}" type="radio" name="q-${index}" data-question="${index}" value="${j}" ${r.choices[index]===j?'checked':''}>${esc(o)}</label>`).join('')}</div><div class="actions"><button id="check-${index}" data-action="check" data-index="${index}" ${r.choices[index]===null?'disabled':''}>Check this choice</button></div>${checked?`<div class="feedback ${correct?'':'wrong'}" role="status"><strong>${correct?'That choice works.':'Try this wording: '+esc(q.options[q.answer])}</strong><p lang="zh-Hant">${esc(q.explanation)}</p>${correct?'':'This item is saved in Review. You can retry there later.'}</div>`:''}</fieldset>`;
}
function session() {
  const r=run(),l=byId[currentId];
  return `<div class="session-head"><div><p class="eyebrow">${r.minutes}-minute practice · ${r.mode==='guided'?'More support':'More challenge'}</p><h1>${esc(l.title)}</h1><p lang="zh-Hant">${esc(l.zh)}</p></div><button data-action="pause">Save & return</button></div><div class="session-layout"><div class="session-content">
  <section class="panel" id="learn"><div class="step-heading"><span class="step-number">1</span><h2>Make it useful ${zh('實用表達')}</h2></div><p class="scenario">${esc(l.scenario)}</p><p class="tiny">${r.minutes===5?'Focus on the first phrase today. The others are optional.':'Read all three phrases, then choose one to use in your own words.'}</p>${l.phrases.map((p,i)=>phrase(l,p,i)).join('')}<div class="actions"><button id="learn-done" data-action="learn" aria-pressed="${r.learn}">${r.learn?'✓ Phrases reviewed':'I’ve reviewed the phrase focus'}</button></div></section>
  <section class="panel" id="dialogue"><div class="step-heading"><span class="step-number">2</span><h2>Hear it in context ${zh('情境對話')}</h2></div><div class="audio"><div class="actions"><button id="play" data-action="play" disabled>Play dialogue</button><button data-action="stop">Stop</button></div><label class="tiny" for="voice">Local English voice</label><select id="voice" aria-label="Local English voice"></select><p id="audio-status" class="audio-status" role="status"></p></div>${l.dialogue.map(t=>`<div class="turn"><span class="speaker">${esc(t.speaker)}</span><div><p>${esc(t.en)}</p><p class="zh" lang="zh-Hant">${esc(t.zh)}</p></div></div>`).join('')}<p class="tiny">Reading the dialogue is enough if audio is unavailable. ${zh('沒有合適語音時，可直接閱讀對話。')}</p><button id="dialogue-done" data-action="dialogue" aria-pressed="${r.dialogue}">${r.dialogue?'✓ Dialogue reviewed':'I’ve read or listened to the dialogue'}</button></section>
  <section class="panel" id="practice"><div class="step-heading"><span class="step-number">3</span><h2>Choose your words ${zh('用詞練習')}</h2></div><p class="tiny">Try a choice before revealing the explanation. Completion records an attempt; a wrong choice becomes a review item.</p>${l.questions.slice(0,requiredQuestions(r)).map((_,i)=>question(l,i,r)).join('')}</section>
  <section class="panel" id="speak"><div class="step-heading"><span class="step-number">4</span><h2>Your turn to speak ${zh('開口練習')}</h2></div><p>${esc(r.minutes===10?l.challenge:l.speaking)}</p>${r.mode==='guided'?`<p class="notice">Support: use a useful phrase above. Think of your first point, one detail, and a next step. ${zh('提示：用一句實用表達，先說重點，再加細節及下一步。')}</p>`:`<p class="notice">Challenge: use your own wording. Add one follow-up question and try again without notes. ${zh('挑戰：用自己的說法，加一句跟進問題，再試一次不看筆記。')}</p>`}
  <label for="response" class="label">Optional speaking notes · ${zh('可寫下練習句子')}</label><textarea id="response" maxlength="2000" placeholder="Write your own version here. Avoid confidential information.">${esc(r.response)}</textarea><p class="tiny" id="word-count">${r.response.trim()?r.response.trim().split(/\s+/u).length:0} space-separated words · 2,000 characters maximum</p><label class="checkbox"><input id="spoken" type="checkbox" ${r.spoken?'checked':''}>I tried saying my answer aloud. No microphone or recording is used. ${zh('我已開口練習。程式不使用咪高峰或錄音。')}</label><button id="reveal" data-action="reveal" ${hasProduction(r)?'':'disabled'}>${r.modelSeen?'Model shown below':'Show a model & self-review'}</button><p class="self-note">Your notes are not graded. The word count only counts space-separated words; it does not check grammar, meaning or pronunciation. ${zh('不作語意、文法或發音評分。請按示例及清單自行檢視。')}</p>
  ${r.modelSeen?`<div class="model"><p class="eyebrow">One possible answer</p><p>${esc(l.model)}</p><p class="tiny">Your answer can be different and still work. ${zh('答案可以不同；重點是清楚、合適地表達。')}</p></div><fieldset class="rubric"><legend>Compare, improve, then check each item yourself.</legend>${l.rubric.map((item,i)=>`<label class="checkbox"><input id="rubric-${i}" type="checkbox" data-rubric="${i}" ${r.rubric[i]?'checked':''}>${esc(item)}</label>`).join('')}</fieldset>`:''}</section>
  <section class="panel" id="reflect"><div class="step-heading"><span class="step-number">5</span><h2>Take one thing with you ${zh('回顧一下')}</h2></div><p>How would you like to revisit this phrase focus? ${zh('你想如何複習這次的重點表達？')}</p><div class="answers">${[['again','I’d like another try · 想再練一次'],['comfortable','I feel comfortable for now · 暫時覺得掌握了']].map(([value,text])=>`<label class="choice"><input type="radio" name="reflection" value="${value}" ${r.reflection===value?'checked':''}>${text}</label>`).join('')}</div><p class="tiny">Choosing another try adds the first phrase to Review. Your choices describe this exercise, not an assessed level.</p></section>
  </div><aside class="session-sidebar" aria-label="Session checklist"><h2>One step at a time</h2><div id="checklist"></div><button id="finish" class="primary" data-action="finish" disabled>Complete session</button><p class="tiny" id="finish-help">Complete each step to record this session.</p><button class="subtle" data-action="pause">Pause & return later</button></aside></div>`;
}
function updateChecklist() {
  if (view!=='session'||!run()) return;
  const checks=checklist(run()),count=Object.values(checks).filter(Boolean).length;
  $('checklist').innerHTML=`<progress max="5" value="${count}" aria-label="Completed practice steps">${count}/5</progress><ul class="checklist">${Object.entries(checks).map(([key,done])=>`<li class="${done?'done':''}"><span class="check-dot" aria-hidden="true">${done?'✓':'○'}</span><a href="#${key}">${labels[key]}</a><span class="sr-only">${done?' complete':' pending'}</span></li>`).join('')}</ul>`;
  $('finish').disabled=count!==5;
  $('finish-help').textContent=count===5?'Ready to record this practice.':`${count}/5 steps done. ${labels[Object.keys(checks).find(k=>!checks[k])]} is still pending.`;
}
function completion() {
  const l=byId[finished.lessonId];
  return `<section class="celebration"><p class="eyebrow">A useful little step</p><h1>Practice complete.</h1><p>${esc(l.title)} · ${finished.minutes} minutes<br>${zh('這次練習已記錄。下次可複習，或試另一個情境。')}</p><p>${state.history.length} completed sessions on this browser.</p><div class="actions"><button class="primary" data-nav="learn">Choose another practice</button><button data-nav="review">Review saved items</button></div></section>`;
}
function review() {
  const total=state.mistakes.length+state.difficult.length;
  return `<p class="eyebrow">Make useful words stick</p><h1>A little review.</h1><p>${zh('複習答錯或標記較難的項目。')} Retry a question to clear it; remove a phrase when you feel ready.</p>${!total?`<div class="empty"><h2>No review items yet.</h2><p>Wrong choices and phrases you save will appear here. ${zh('答錯的選項及你儲存的表達會在這裏顯示。')}</p><button class="primary" data-nav="learn">Choose a practice</button></div>`:`<div class="review-grid">${state.mistakes.map(key=>{const [id,,index]=key.split(':'),l=byId[id],q=l.questions[index];return `<section class="panel"><p class="eyebrow">Question · ${esc(l.title)}</p><fieldset><legend>${esc(q.prompt)}</legend><div class="answers">${q.options.map((o,j)=>`<label class="choice"><input type="radio" name="review-${key}" value="${j}">${esc(o)}</label>`).join('')}</div></fieldset><div class="actions"><button data-action="review-check" data-key="${key}">Check & review</button></div><p class="page-status" data-feedback="${key}" role="status"></p></section>`;}).join('')}${state.difficult.map(key=>{const [id,,index]=key.split(':'),l=byId[id],p=l.phrases[index];return `<section class="panel"><p class="eyebrow">Saved phrase · ${esc(l.title)}</p><p class="phrase-en">${esc(p.en)}</p><p lang="zh-Hant">${esc(p.zh)}</p><p class="note" lang="zh-Hant">${esc(p.note)}</p><p class="tiny">Say it in a new sentence before removing it.</p><div class="actions"><button data-action="remove-phrase" data-key="${key}">Comfortable now · remove</button><button data-action="start" data-id="${id}">Practise this scenario</button></div></section>`;}).join('')}</div>`}<p id="review-status" class="page-status" role="status"></p>`;
}
function history() {
  const topics=new Set(state.history.map(h=>h.lessonId)).size;
  return `<p class="eyebrow">Your practice record</p><h1>Small steps add up.</h1><p>${state.history.length} completed sessions · ${topics}/10 topics practised · ${Object.keys(state.drafts).length} sessions in progress.</p><p class="tiny">Records start with practice on this browser. The latest ${HISTORY_LIMIT} completed sessions are kept. Dates use your device’s local time.</p>${state.history.length?`<section class="panel">${state.history.map(h=>`<article class="history-item"><div><h3>${esc(byId[h.lessonId].title)}</h3><p>${h.minutes}-minute plan · ${h.mode==='guided'?'More support':'More challenge'} · all 5 steps attempted</p><details><summary>My speaking notes & model</summary><p class="history-response">${h.response?esc(h.response):'No written notes. Speaking was self-confirmed.'}</p><p>${esc(byId[h.lessonId].model)}</p></details></div><time datetime="${esc(h.completedAt)}">${esc(new Date(h.completedAt).toLocaleString())}</time></article>`).join('')}</section>`:`<div class="empty"><h2>Your first session starts here.</h2><p>Only a session with all five steps completed will appear in this list. ${zh('完成全部五個步驟後，紀錄才會顯示。')}</p><button class="primary" data-nav="learn">Start a practice</button></div>`}`;
}
function data() {
  return `<div class="data-layout"><p class="eyebrow">You control your data</p><h1>Kept on this device.</h1><section class="panel"><h2>Local progress, clear limits</h2><p>Answers, practice preferences, review items and session records stay in this browser’s local storage. There are no accounts, analytics, uploads or microphone access.</p><p lang="zh-Hant">答案、練習方式、複習項目及紀錄只儲存在這個瀏覽器。清除瀏覽資料、私人瀏覽模式或儲存空間不足可能令紀錄消失；不同裝置及網址不會自動同步。</p><p class="tiny">Up to 10 unfinished sessions, the latest 100 completions, 2,000 characters per answer and a 1 MB JSON file. Browser storage can be unavailable. Export a backup before clearing data.</p><details><summary>About audio & self-review</summary><p>Audio uses only browser-labelled local English voices and only the fictional model dialogue. If none is available, read the dialogue instead. No speech is recorded. Voice availability and quality depend on the browser and operating system. Browser voice labels are not an independent audit of the speech engine.</p><p>Your own sentences are not graded. Model comparison and a self-review checklist are provided. Multiple-choice questions use fixed answer keys. Speaking confirmation records your own report of practice.</p></details></section><section class="panel"><h2>Backup & restore ${zh('備份及還原')}</h2><p class="notice">A JSON backup includes your private written answers. Save it somewhere you trust. Nothing is sent to a server. Import replaces only this app’s English progress.</p><button class="primary" data-action="export">Export my progress (.json)</button><label for="import-file" class="file-label">Choose an English progress JSON backup</label><input id="import-file" type="file" accept=".json,application/json" ${importing?'disabled':''}><p id="import-status" class="page-status" role="status">${esc(importing?'Reading and checking the file…':importMessage)}</p>${staged?`<div class="import-preview"><h3>Ready to restore</h3><p>${staged.history.length} completions · ${Object.keys(staged.drafts).length} unfinished sessions · ${staged.mistakes.length+staged.difficult.length} review items.</p><p>This replaces your current English progress and written answers. Export your current data first if you want to keep it.</p><div class="actions"><button class="primary" data-action="import-confirm">Replace English progress</button><button data-action="import-cancel">Cancel</button></div></div>`:''}</section><section class="panel"><h2>Start fresh</h2><p>Clear only this app’s English progress. Other apps’ storage is preserved. ${zh('只清除這個英語練習程式的資料。')}</p><button class="danger" data-action="reset">Clear English data…</button></section></div>`;
}

function stopAudio(message='Audio stopped. You can read the dialogue or play it again.') {
  audioGeneration++; clearTimeout(audioTimer); audioTimer=null;
  if (synth) synth.cancel();
  audioMessage=message; if($('audio-status')) $('audio-status').textContent=message;
}
function refreshVoices() {
  voicesReady=true;
  const voices=synth?localEnglishVoices(synth.getVoices()):[];
  audioMessage=voices.length?'Ready · local browser voice. Foreground playback only.':'No local English voice is available. Read the dialogue instead; no remote voice is used.';
  updateAudio();
}
function updateAudio() {
  if(!$('voice')) return;
  const voices=synth?localEnglishVoices(synth.getVoices()):[];
  $('voice').innerHTML=voices.length?voices.map((v,i)=>`<option value="${i}" ${v.voiceURI===voiceChoice?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join(''):'<option>No local English voice</option>';
  $('voice').disabled=!voices.length;
  $('play').disabled=!voices.length;
  $('audio-status').textContent=voices.length?audioMessage:voicesReady?audioMessage:'Checking this browser for local English voices…';
}
function playDialogue() {
  const voices=synth?localEnglishVoices(synth.getVoices()):[],voice=voices[Number($('voice').value)];
  if(!voice || !window.SpeechSynthesisUtterance) { refreshVoices(); return; }
  voiceChoice=voice.voiceURI;
  stopAudio('Playing the model dialogue…');
  const generation=audioGeneration,l=byId[currentId]; let index=0;
  const next=()=>{
    if(generation!==audioGeneration || document.hidden) return;
    if(index>=l.dialogue.length) { audioMessage='Dialogue finished. Mark the reading step when you’re ready.'; $('audio-status').textContent=audioMessage; return; }
    const utterance=new SpeechSynthesisUtterance(l.dialogue[index].en);
    utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.9;
    utterance.onend=()=>{if(generation!==audioGeneration)return;clearTimeout(audioTimer);index++;next();};
    utterance.onerror=()=>{if(generation===audioGeneration)stopAudio('Audio is unavailable or was interrupted. Read the dialogue, or tap Play to retry.');};
    audioTimer=setTimeout(()=>{if(generation===audioGeneration)stopAudio('Audio did not finish. Read the dialogue or tap Play to retry.');},20000);
    try { synth.speak(utterance); } catch { stopAudio('Audio could not start. Read the dialogue instead.'); }
  }; next();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button'); if(!button || button.disabled) return;
  if(button.dataset.nav) { stopAudio(); view=button.dataset.nav; staged=null; render(true); return; }
  const action=button.dataset.action;
  if(action==='start') {
    stopAudio();currentId=button.dataset.id;
    if(!state.drafts[currentId]) state.drafts[currentId]=startRun(currentId,state.preferences.minutes,state.preferences.mode,window.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    persist();view='session';render(true);return;
  }
  if(action==='pause') { stopAudio();persist();view='learn';render(true);return; }
  if(action==='play') { playDialogue();return; }
  if(action==='stop') { stopAudio();return; }
  if(action==='mark') { const key=button.dataset.key;state.difficult=state.difficult.includes(key)?state.difficult.filter(k=>k!==key):[...state.difficult,key];persist();render();return; }
  if(action==='learn'||action==='dialogue') { run()[action]=true;saveRun();render();return; }
  if(action==='check') { checkQuestion(state,run(),Number(button.dataset.index));saveRun();render();return; }
  if(action==='reveal' && hasProduction(run())) { run().modelSeen=true;saveRun();render();return; }
  if(action==='finish') {
    const r=run();if(r && completeRun(state,r)) { finished={...r};persist();stopAudio();view='complete';render(true); } return;
  }
  if(action==='review-check') {
    const key=button.dataset.key,[id,,index]=key.split(':'),q=byId[id].questions[index];
    const selected=document.querySelector(`input[name="review-${key}"]:checked`),feedback=document.querySelector(`[data-feedback="${key}"]`);
    if(!selected) { feedback.textContent='Choose an answer first.'; return; }
    if(Number(selected.value)===q.answer) { state.mistakes=state.mistakes.filter(k=>k!==key);persist();render(true);$('review-status').textContent=`Correct. ${q.explanation} Removed from review.`; }
    else { feedback.textContent=`Try: ${q.options[q.answer]} — ${q.explanation} This item stays in Review.`; }
    return;
  }
  if(action==='remove-phrase') { state.difficult=state.difficult.filter(k=>k!==button.dataset.key);persist();render(true);$('review-status').textContent='Phrase removed from review.';return; }
  if(action==='export') {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='english-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);importMessage='Backup prepared. It contains your written answers.';render();return;
  }
  if(action==='import-cancel') { staged=null;importMessage='Import cancelled. Your progress is unchanged.';render();return; }
  if(action==='import-confirm' && staged) {
    state=staged;staged=null;blocked=false;stopAudio();const result=saveProgress(storage,state);storageMessage(result.ok?'Imported and saved on this device.':result.error,!result.ok);importMessage=result.ok?'English progress restored.':'Imported for this tab only. Export a backup before closing it.';render(true);return;
  }
  if(action==='reset' && window.confirm('Clear all English progress and written answers on this browser? Export a backup first if you want to keep them.')) {
    stopAudio();try {storage.removeItem(STORAGE_KEY);blocked=false;storageMessage('English data cleared. Ready for a fresh start.');} catch {blocked=true;storageMessage('Stored data could not be cleared. This tab is temporary; browser data may return on reload.',true);}
    state=emptyState();staged=null;finished=null;currentId=null;importMessage='';view='learn';render(true);
  }
});
document.addEventListener('change',async event=>{
  const target=event.target;
  if(target.name==='minutes'||target.name==='mode') {state.preferences[target.name]=target.name==='minutes'?Number(target.value):target.value;persist();return;}
  if(target.id==='voice') {stopAudio();const voices=localEnglishVoices(synth.getVoices());voiceChoice=voices[Number(target.value)]?.voiceURI || '';return;}
  if(target.id==='import-file') {
    const file=target.files?.[0];staged=null;if(!file)return;
    importing=true;importMessage='';render();
    try {if(file.size>MAX_BYTES || !/\.json$/i.test(file.name))throw new Error('Choose a JSON backup no larger than 1 MB.');staged=parseProgress(await file.text());importMessage='File validated. Review the replacement below.';} catch(error){importMessage=error.message;}
    importing=false;if(view==='data')render();return;
  }
  if(view!=='session')return;
  const r=run();
  if(target.dataset.question!==undefined) {const i=Number(target.dataset.question);r.choices[i]=Number(target.value);r.checked[i]=false;saveRun();render();}
  else if(target.id==='spoken') {r.spoken=target.checked;saveRun();$('reveal').disabled=!hasProduction(r);}
  else if(target.dataset.rubric!==undefined) {r.rubric[Number(target.dataset.rubric)]=target.checked;saveRun();}
  else if(target.name==='reflection') {r.reflection=target.value;if(target.value==='again'&&!state.difficult.includes(`${r.lessonId}:phrase:0`))state.difficult.push(`${r.lessonId}:phrase:0`);saveRun();}
});
document.addEventListener('input',event=>{
  if(event.target.id!=='response'||view!=='session')return;
  const r=run();r.response=event.target.value;saveRun();$('reveal').disabled=!hasProduction(r);$('word-count').textContent=`${r.response.trim()?r.response.trim().split(/\s+/u).length:0} space-separated words · 2,000 characters maximum`;
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY || event.key===null){blocked=true;storageMessage('English data changed in another tab. Export any unsaved work, then reload to use the latest data. Saving is paused here.',true);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio('Audio stopped while the page was hidden. Tap Play to restart.');});
window.addEventListener('pagehide',()=>stopAudio());
if(synth) synth.addEventListener('voiceschanged',refreshVoices);
render();
if(synth && synth.getVoices().length) refreshVoices();else if(!synth) refreshVoices();else setTimeout(refreshVoices,1200);
