import { initialState, validateState, restored, elapsed, start, pause, clamp, uid, fileType, MAX_FILE, MAX_BACKUP } from './core.js';
import { LocalStore } from './storage.js';
import { Metronome } from './metronome.js';
import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href;
const $ = id => document.getElementById(id);
let state = initialState(), store = new LocalStore(), storageReady = false, blocked = false, saveQueue = Promise.resolve(), pendingSave, busy = false;
let pdf = null, pdfTask = null, renderTask = null, scoreGeneration = 0, renderEpoch = 0, pageCount = 0, pendingRestore = null, lastCheckpoint = Date.now();
const piece = () => state.pieces.find(p => p.id === state.pieceId);
const section = () => piece().sections.find(s => s.id === state.sectionId);
const notice = message => { $('notice').textContent = message; };
const warn = message => { $('storage-warning').hidden = false; $('storage-warning').textContent = message; $('save-status').textContent = '尚未安全儲存 · 請匯出備份'; };
const metro = new Metronome({ interrupted: () => notice('音訊被裝置暫停，節拍器已停止。請再次按下啟動。'), beat: n => { $('beat-light').classList.toggle('pulse', n % 2 === 0); }, stopped: () => { $('metro-toggle').textContent = '啟動節拍器'; $('metro-toggle').setAttribute('aria-pressed', 'false'); $('beat-light').classList.remove('pulse'); } });
function checkpoint() {
  if (state.session.running) { state.session.elapsedMs = elapsed(state.session); state.session.startedAt = Date.now(); }
}
function save(immediate = false) {
  clearTimeout(pendingSave);
  const commit = () => {
    if (!storageReady || blocked) return;
    checkpoint(); const snapshot = structuredClone(state);
    $('save-status').textContent = '正在儲存…';
    saveQueue = saveQueue.then(async () => {
      if (blocked) return;
      try { await store.save(snapshot); $('save-status').textContent = '已儲存於這個瀏覽器'; }
      catch (e) { blocked = true; warn(e.message); }
    });
  };
  if (immediate) commit(); else pendingSave = setTimeout(commit, 350);
}
function stopAudio() { metro.stop(); }
function pauseAll(message) { pause(state.session); stopAudio(); save(true); drawTimer(); if (message) notice(message); }
function drawTimer() {
  const ms = elapsed(state.session), remaining = Math.max(0, Math.ceil((state.session.targetMinutes * 60000 - ms) / 1000));
  $('timer').textContent = `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;
  $('session-progress').value = ms / (state.session.targetMinutes * 60000);
  $('timer-toggle').textContent = state.session.running ? '暫停練習' : ms ? '繼續練習' : '開始練習';
  $('timer-toggle').disabled = remaining === 0;
  $('session-end').disabled = ms === 0;
  $('timer-state').textContent = remaining === 0 ? '目標完成 · 可以記錄或延長' : state.session.running ? '正在練習' : ms ? '已暫停，準備好再繼續' : '準備好了就開始';
}
function options(el, entries, selected) { el.replaceChildren(...entries.map(([value,text]) => { const o = document.createElement('option'); o.value=value; o.textContent=text; return o; })); el.value=selected; }
const date = timestamp => new Intl.DateTimeFormat('zh-Hant', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(timestamp);
function drawHistory() {
  $('history-list').replaceChildren(...section().history.slice(-10).reverse().map(h => { const li=document.createElement('li'); li.textContent=`${date(h.at)} · ${h.tempo} BPM · 難度 ${h.difficulty}/5${h.note ? ' · '+h.note : ''}`; return li; }));
}
function drawSections() {
  $('section-list').replaceChildren(...piece().sections.map(s => { const b=document.createElement('button'); b.textContent=`${s.title} · ${s.minutes} 分`; b.setAttribute('aria-pressed',String(s.id===state.sectionId)); b.onclick=()=>{ stopAudio(); state.sectionId=s.id; drawSections(); save(); }; return b; }));
  const s=section(); $('section-title').value=s.title; $('section-minutes').value=s.minutes; $('section-notes').value=s.notes; $('tempo').value=s.tempo;
  $('section-remove').disabled=piece().sections.length===1;
  const total=piece().sections.reduce((a,s)=>a+s.minutes,0); $('plan-total').textContent=`本曲計劃 ${total} 分鐘 · 本次目標 ${state.session.targetMinutes} 分鐘（可自行調整）`;
  drawHistory();
}
function drawPlan() {
  options($('piece-select'),state.pieces.map(p=>[p.id,p.title]),state.pieceId);
  $('piece-title').value=piece().title; $('piece-remove').disabled=state.pieces.length===1;
  $('session-minutes').value=state.session.targetMinutes; $('questions').value=state.questions;
  drawSections(); drawTimer();
}
function dataBytes(data) { const raw=atob(data.split(',')[1]); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function decodeImage(data) {
  const img = new Image(); img.src=data; await img.decode();
  if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 40000000) throw new Error('圖片無法讀取或超過 4,000 萬像素。');
  return img;
}
const pdfOptions = data => ({ data, isEvalSupported:false, stopAtErrors:true, useSystemFonts:true, cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href, cMapPacked:true, standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href, wasmUrl:new URL('./vendor/wasm/',import.meta.url).href });
async function checkScore(file) {
  const bytes=dataBytes(file.data); if (fileType(bytes)!==file.type) throw new Error('檔案內容與格式不符。');
  if (file.type==='application/pdf') {
    const task=pdfjs.getDocument(pdfOptions(bytes));
    task.onPassword=()=>{ task.destroy(); };
    try { const doc=await task.promise; if (doc.numPages > 500) throw new Error('PDF 最多支援 500 頁。'); await doc.getPage(1); }
    finally { await task.destroy(); }
  } else await decodeImage(file.data);
}
async function closeScore() {
  renderEpoch++;
  if (renderTask) { renderTask.cancel(); try { await renderTask.promise; } catch {} renderTask=null; }
  if (pdfTask) { const old=pdfTask; pdfTask=null; pdf=null; await old.destroy(); }
}
function pageControls() {
  $('page-label').textContent=pageCount ? `${piece().page} / ${pageCount} 頁` : '未載入樂譜';
  $('page-prev').disabled=piece().page<=1 || !pageCount; $('page-next').disabled=piece().page>=pageCount;
}
async function loadScore() {
  const generation=++scoreGeneration; await closeScore(); if (generation!==scoreGeneration) return;
  pageCount=0; $('score-empty').hidden=true; $('score-surface').hidden=true; pageControls();
  const files=piece().score; $('score-name').textContent=files.map(f=>f.name).join(' · ') || '尚未匯入 · 不含預設歌曲樂譜'; $('score-remove').disabled=!files.length;
  if (!files.length) { $('score-empty').hidden=false; return; }
  try {
    if (files[0].type==='application/pdf') {
      pdfTask=pdfjs.getDocument(pdfOptions(dataBytes(files[0].data))); const task=pdfTask; task.onPassword=()=>task.destroy();
      const doc=await task.promise; if (generation!==scoreGeneration) return; pdf=doc; pageCount=doc.numPages;
    } else pageCount=files.length;
    piece().page=clamp(piece().page,1,pageCount); await renderScore(generation);
  } catch (e) { if (generation===scoreGeneration) { pageCount=0; pageControls(); notice('樂譜未能顯示。請使用未加密、完整的 PDF 或有效圖片重新匯入。'); } }
}
async function renderScore(generation=scoreGeneration, preserve=false) {
  if (!pageCount) return;
  const epoch=++renderEpoch;
  if (renderTask) { renderTask.cancel(); try { await renderTask.promise; } catch {} renderTask=null; }
  if (generation!==scoreGeneration || epoch!==renderEpoch) return;
  const view=$('score-viewport'), surface=$('score-surface');
  const x=view.scrollLeft/Math.max(1,view.scrollWidth-view.clientWidth), y=view.scrollTop/Math.max(1,view.scrollHeight-view.clientHeight);
  surface.hidden=false; surface.style.width=`${Number($('zoom').value)*100}%`;
  $('pdf-canvas').hidden=!pdf; $('score-image').hidden=!!pdf;
  try {
    if (pdf) {
      const page=await pdf.getPage(piece().page); if (generation!==scoreGeneration || epoch!==renderEpoch) return;
      const base=page.getViewport({scale:1}), width=surface.clientWidth || 700;
      const ratio=Math.min(devicePixelRatio || 1,2), scale=Math.min(width/base.width*ratio,Math.sqrt(12000000/(base.width*base.height)));
      const viewport=page.getViewport({scale}), canvas=$('pdf-canvas'); canvas.width=Math.floor(viewport.width); canvas.height=Math.floor(viewport.height);
      const task=page.render({canvasContext:canvas.getContext('2d'),viewport}); renderTask=task; await task.promise; if(renderTask===task)renderTask=null;
    } else { $('score-image').src=piece().score[piece().page-1].data; await $('score-image').decode(); }
    if (generation!==scoreGeneration || epoch!==renderEpoch) return;
    pageControls(); view.scrollLeft=preserve ? x*(view.scrollWidth-view.clientWidth) : 0; view.scrollTop=preserve ? y*(view.scrollHeight-view.clientHeight) : 0;
  } catch (e) { if (e.name!=='RenderingCancelledException') notice('這一頁未能顯示，請嘗試另一頁或重新匯入。'); }
}
function on(id, event, fn) { $(id).addEventListener(event, async e => { try { await fn(e); } catch (error) { notice(error.message || '操作未完成，請重試。'); } }); }
function bindText(id, getter, key, max) { on(id,'input',()=>{ getter()[key]=$(id).value.slice(0,max); save(); }); }
bindText('section-notes',section,'notes',5000); bindText('questions',()=>state,'questions',10000);
on('piece-title','change',()=>{ piece().title=$('piece-title').value.trim().slice(0,120)||'未命名歌曲'; drawPlan(); save(); });
on('section-title','change',()=>{ section().title=$('section-title').value.trim().slice(0,120)||'未命名段落'; drawSections(); save(); });
on('section-minutes','change',()=>{ section().minutes=clamp(Math.round(Number($('section-minutes').value)||1),1,180); drawSections(); save(); });
on('session-minutes','change',()=>{ pause(state.session); state.session.targetMinutes=clamp(Math.round(Number($('session-minutes').value)||30),1,180); state.session.elapsedMs=Math.min(state.session.elapsedMs,state.session.targetMinutes*60000); drawPlan(); save(true); });
on('timer-toggle','click',()=>{ if(state.session.running) pause(state.session); else start(state.session); drawTimer(); save(true); });
on('session-end','click',()=>{ pauseAll(); if(!state.session.elapsedMs)return; state.sessions.push({at:Date.now(),minutes:Math.round(state.session.elapsedMs/600)/100}); state.sessions=state.sessions.slice(-500); state.session.elapsedMs=0; drawTimer(); save(true); notice('本次練習已記錄。下一次可以重新開始。'); });
on('piece-select','change',async()=>{ stopAudio(); state.pieceId=$('piece-select').value; state.sectionId=piece().sections[0].id; drawPlan(); await loadScore(); save(); });
on('piece-add','click',async()=>{ if(state.pieces.length>=50)throw new Error('最多可建立 50 首歌曲。'); stopAudio(); const s={id:uid(),title:'新段落',minutes:10,notes:'',tempo:80,history:[]}; const p={id:uid(),title:'新歌曲',sections:[s],score:[],page:1}; state.pieces.push(p); state.pieceId=p.id; state.sectionId=s.id; drawPlan(); await loadScore(); save(); $('piece-title').focus(); $('piece-title').select(); });
on('piece-remove','click',async()=>{ if(state.pieces.length<=1 || !confirm('刪除此歌曲、樂譜及段落紀錄？此動作無法復原。'))return; stopAudio(); state.pieces=state.pieces.filter(p=>p.id!==state.pieceId); state.pieceId=state.pieces[0].id; state.sectionId=piece().sections[0].id; drawPlan(); await loadScore(); save(); });
on('section-add','click',()=>{ if(piece().sections.length>=100)throw new Error('每首歌曲最多 100 個段落。'); stopAudio(); const s={id:uid(),title:'新段落',minutes:5,notes:'',tempo:80,history:[]}; piece().sections.push(s); state.sectionId=s.id; drawSections(); save(); $('section-title').focus(); $('section-title').select(); });
on('section-remove','click',()=>{ if(piece().sections.length<=1 || !confirm('刪除此段落及它的紀錄？'))return; stopAudio(); piece().sections=piece().sections.filter(s=>s.id!==state.sectionId); state.sectionId=piece().sections[0].id; drawSections(); save(); });
function tempo(value) { section().tempo=clamp(Math.round(Number(value)||80),30,240); $('tempo').value=section().tempo; metro.tempo=section().tempo; save(); }
on('tempo','change',()=>tempo($('tempo').value)); on('tempo-down','click',()=>tempo(section().tempo-5)); on('tempo-up','click',()=>tempo(section().tempo+5));
on('beats','change',()=>{ metro.beats=Number($('beats').value); metro.index=0; });
on('metro-toggle','click',async()=>{
  if(metro.active || metro.ctx){stopAudio();return;}
  try { const promise=metro.start(section().tempo,Number($('beats').value)); $('metro-toggle').textContent='停止節拍器'; $('metro-toggle').setAttribute('aria-pressed','true'); await promise; }
  catch { stopAudio(); notice('音訊未能啟動。請檢查裝置音量及播放權限，再按一次啟動。'); }
});
on('history-add','click',()=>{ section().history.push({at:Date.now(),tempo:section().tempo,difficulty:Number($('difficulty').value),note:$('history-note').value.slice(0,1000)}); section().history=section().history.slice(-500); $('history-note').value=''; drawHistory(); save(); notice('已記錄本段速度與主觀感覺。'); });
on('score-input','change',async()=>{
  const input=$('score-input'), files=[...input.files]; input.value=''; if(!files.length || busy)return;
  const target=piece(); busy=true; input.disabled=true;
  try {
    if(files.length>30 || files.some(f=>!f.size || f.size>MAX_FILE))throw new Error('最多 30 張圖片，或 1 份 PDF；每個檔案須介乎 1 byte 至 20 MB。');
    if(files.reduce((a,f)=>a+f.size,0)>40*1024*1024)throw new Error('一次匯入合計最多 40 MB。');
    const score=[]; notice('正在本機檢查樂譜…');
    for(const f of files){ const bytes=new Uint8Array(await f.arrayBuffer()), type=fileType(bytes); const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(new Blob([bytes],{type}));});const entry={name:f.name.slice(0,200),type,data};await checkScore(entry);score.push(entry); }
    if(score.some(f=>f.type==='application/pdf') && score.length!==1)throw new Error('PDF 請逐份匯入；多頁圖片可一起選取。');
    const candidate=structuredClone(state); const dest=candidate.pieces.find(p=>p.id===target.id); if(!dest)throw new Error('歌曲已變更，請重試。'); dest.score=score;dest.page=1; validateState(candidate);
    if(target.score.length && !confirm('以新樂譜取代這首歌曲的現有樂譜？'))return;
    target.score=score;target.page=1;if(piece().id===target.id)await loadScore();save(true);notice('樂譜已在本機開啟。請匯出備份，以免瀏覽器資料被清除。');
  } catch(e){notice(/[\u3400-\u9fff]/.test(e.message||'') ? e.message+' 原有樂譜已保留。' : '無法匯入。請選擇完整、未加密的 PDF 或有效圖片；原有樂譜已保留。');}
  finally{busy=false;input.disabled=false;}
});
on('score-remove','click',async()=>{if(!confirm('移除這首歌曲的本機樂譜？'))return;piece().score=[];piece().page=1;await loadScore();save();});
for(const [id,delta] of [['page-prev',-1],['page-next',1]])on(id,'click',async()=>{piece().page=clamp(piece().page+delta,1,pageCount||1);const generation=++scoreGeneration;await renderScore(generation);save();});
on('zoom','change',()=>renderScore(scoreGeneration,true));
on('focus-toggle','click',()=>{const focus=document.body.classList.toggle('focus');$('focus-toggle').setAttribute('aria-pressed',String(focus));$('focus-toggle').textContent=focus?'返回練習計劃':'專注看譜';setTimeout(()=>renderScore(scoreGeneration,true),50);});
on('data-open','click',()=>{ $('session-history').replaceChildren(...state.sessions.slice(-10).reverse().map(h=>{const li=document.createElement('li');li.textContent=`${date(h.at)} · ${h.minutes} 分鐘`;return li;}));$('data-dialog').showModal(); });
on('data-close','click',()=>$('data-dialog').close());
on('backup-export','click',()=>{ checkpoint(); const snapshot=structuredClone(state);restored(snapshot);const blob=new Blob([JSON.stringify(snapshot)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`practice-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notice('備份已交給瀏覽器下載。請確認檔案已保存。'); });
on('backup-input','change',async()=>{
  const file=$('backup-input').files[0];$('backup-input').value='';if(!file || busy)return;busy=true;
  try{if(file.size>MAX_BACKUP)throw new Error('備份最多 60 MB。');const candidate=restored(validateState(JSON.parse(await file.text())));for(const p of candidate.pieces)for(const f of p.score)await checkScore(f);pendingRestore=candidate;$('restore-summary').textContent=`${candidate.pieces.length} 首歌曲、${candidate.pieces.reduce((a,p)=>a+p.sections.length,0)} 個段落。`;$('data-dialog').close();$('restore-dialog').showModal();}
  catch{notice('備份無效、超過 60 MB 或包含無法讀取的樂譜。現有資料未被更改。');}finally{busy=false;}
});
on('restore-cancel','click',()=>{pendingRestore=null;$('restore-dialog').close();});
$('restore-dialog').addEventListener('cancel',()=>{pendingRestore=null;});
on('restore-confirm','click',async()=>{
  if(!pendingRestore || busy)return;busy=true;$('restore-confirm').disabled=true;$('workspace').inert=true;
  try{if(!storageReady || blocked)throw new Error('目前無法安全儲存。請先匯出現有資料，於可使用本機儲存的瀏覽器重試。');pauseAll();await saveQueue;if(blocked)throw new Error('儲存失敗，還原已取消。');await store.save(pendingRestore);state=pendingRestore;pendingRestore=null;$('restore-dialog').close();drawPlan();await loadScore();notice('備份已還原。計時及節拍器保持暫停。');}
  finally{busy=false;$('restore-confirm').disabled=false;$('workspace').inert=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll('已暫停計時及節拍器。返回後請自行繼續。');});
window.addEventListener('pagehide',()=>pauseAll());
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderScore(scoreGeneration,true),200);});
setInterval(()=>{if(state.session.running && elapsed(state.session)>=state.session.targetMinutes*60000){pauseAll();notice('已到本次目標時間。可以結束記錄，或調整目標後繼續。');}drawTimer();if(state.session.running && Date.now()-lastCheckpoint>=5000){lastCheckpoint=Date.now();save(true);}},250);
try{const saved=await store.open();if(saved)state=restored(validateState(saved));storageReady=true;$('save-status').textContent=saved?'已載入本機資料 · 計時已暫停':'尚未建立紀錄 · 更改會自動儲存';if(saved)await store.save(structuredClone(state));}
catch{blocked=true;warn('無法讀取本機資料，或資料已損壞。本頁仍可暫時使用，但不會覆寫原有資料；請匯出本次備份。');}
drawPlan();await loadScore();
