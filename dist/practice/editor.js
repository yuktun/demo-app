import {demoScore,blankScore,blankMeasure,newId,validateScore,parseScore,serializeScore,eventLabel,ScoreHistory,ScoreStore,MAX_JSON} from './editor-core.js';
const $=id=>document.getElementById(id), el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=text;return n;};
let history=new ScoreHistory(demoScore()),view={pageId:'',measureId:'',eventId:'',size:'comfortable'},store,unsaved=false,draftDirty=false,measureDirty=false,metadataDirty=false,confirmResolve=null,lastFocus=null,renderedMeasureId='',renderedEventId='',saveGeneration=0;
const score=()=>history.score;
const page=()=>score().pages.find(p=>p.id===view.pageId)??score().pages[0];
const measure=()=>page().measures.find(m=>m.id===view.measureId)??page().measures[0];
const selectedEvent=()=>measure().events.find(e=>e.id===view.eventId);
const status=s=>{$('status').textContent=s;};
function warning(s){$('storage-warning').hidden=false;$('storage-warning').textContent=s;$('save-state').textContent='尚未安全儲存 · 請匯出 JSON';}
function repairView(){view.pageId=page().id;view.measureId=measure().id;if(!selectedEvent())view.eventId='';if(!['compact','comfortable','large'].includes(view.size))view.size='comfortable';}
async function save(){const generation=++saveGeneration;unsaved=true;$('save-state').textContent='正在儲存…';try{if(!store)throw new Error('瀏覽器無法使用本機儲存；本頁可暫時編輯，請匯出 JSON。');await store.save(score(),view);if(generation===saveGeneration){unsaved=false;$('save-state').textContent='已儲存於此瀏覽器';$('storage-warning').hidden=true;}}catch(e){unsaved=true;warning(e.message);}}
function ask(title,body,accept='確認'){if(confirmResolve)return Promise.resolve(false);lastFocus=document.activeElement;$('confirm-title').textContent=title;$('confirm-body').textContent=body;$('confirm-accept').textContent=accept;$('confirm-dialog').showModal();return new Promise(resolve=>{confirmResolve=resolve;});}
function resolveAsk(value){$('confirm-dialog').close();const resolve=confirmResolve;confirmResolve=null;resolve?.(value);lastFocus?.focus();}
$('confirm-accept').onclick=()=>resolveAsk(true);$('confirm-cancel').onclick=()=>resolveAsk(false);$('confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();resolveAsk(false);});
async function discardDraft(){if(!draftDirty&&!measureDirty)return true;const accepted=await ask('尚有未套用的內容','離開將捨棄目前編輯面板的草稿。已套用的樂譜不受影響。','捨棄草稿');if(accepted){draftDirty=false;measureDirty=false;}return accepted;}
function on(id,event,fn){$(id).addEventListener(event,async e=>{try{await fn(e);}catch(error){status(error.message||'操作未完成。');}});}
function commit(mutate,message,{clearEvent=false,clearMeasure=false}={}){history.commit(mutate);repairView();if(clearEvent)draftDirty=false;if(clearMeasure)measureDirty=false;render();save();if(message)status(message);}
function formSnapshot(id){return [...$(id).querySelectorAll('input,select,textarea')].map(field=>({id:field.id,value:field.value,checked:field.checked}));}
function restoreForm(fields){for(const f of fields){$(f.id).value=f.value;if(typeof f.checked==='boolean')$(f.id).checked=f.checked;}}
function keys(){return `參考調／原調：${score().referenceKey||'未填'}　　選用調：${score().selectedKey||'未填'}`;}
function selectOptions(node,entries,value){node.replaceChildren(...entries.map(([v,t])=>{const option=el('option','',t);option.value=v;return option;}));node.value=value;}
function reviewText(p){const entries=p.measures.flatMap(m=>m.events),unknown=entries.filter(e=>e.duration==null).length,uncertain=entries.filter(e=>e.uncertain).length;return [uncertain?`${uncertain} 個事件待核對`:'',unknown?`${unknown} 個事件的時值未確認`:''].filter(Boolean).join(' · ');}
function positionFraction(e,m){return e.positionMode==='relative'?e.at:e.positionMode==='source-grid'?(e.at+0.5)/(m.beats*m.subdivision):(e.at+0.5/m.subdivision)/m.beats;}
function makeMeasure(m,print=false){
 const card=el('article','measure-card'+(!print&&m.id===view.measureId?' selected':''));card.dataset.measureId=m.id;
 const head=el('div','measure-head'),button=el('button','',`小節 ${m.label||'未命名'}`);button.type='button';button.setAttribute('aria-label',`編輯小節 ${m.label||'未命名'}`);if(!print)button.onclick=()=>selectMeasure(m.id);else button.tabIndex=-1;head.append(button,el('span','measure-edit-hint',`${m.beats} 格計數 · 編輯`));card.append(head);
 const body=el('div','bar-body'),chords=el('div','event-lane chord-lane'),notes=el('div','event-lane melody-lane');
 for(const e of m.events){const chord=e.type==='chord'||e.type==='symbol'&&e.lane==='chord';const b=el('button',`score-event${chord?' chord':''}${e.uncertain?' uncertain':''}${!print&&e.id===view.eventId?' selected':''}`);b.type='button';b.dataset.eventId=e.id;b.dataset.fraction=positionFraction(e,m);b.setAttribute('aria-label',eventLabel(e));b.title=eventLabel(e)+(e.annotation?' · '+e.annotation:'');
  if(e.type==='note'){const stack=el('span','note-stack'),dots=el('span','note-dots','•'.repeat(Math.max(0,e.octave))),letter=el('span','note-letter',e.letter+e.accidental.replaceAll('#','♯').replaceAll('b','♭')),lines=el('span','note-lines');for(let i=0;i<Math.max(0,-e.octave);i++)lines.append(el('i'));stack.append(dots,letter,lines);b.append(stack);}else b.textContent=e.type==='chord'?e.chord:e.type==='symbol'?e.symbol:'休';
  if(!print)b.onclick=()=>selectMeasure(m.id,e.id);else b.tabIndex=-1;(chord?chords:notes).append(b);
 }
 if(!notes.children.length)notes.append(el('span','empty-bar','（未記錄旋律）'));
 const grid=el('div','beat-grid');for(let i=0;i<m.beats*m.subdivision;i++){const label=i%m.subdivision===0?String(i/m.subdivision+1):m.subdivision===2?'a':['','e','&','a'][i%m.subdivision];grid.append(el('span','beat-cell',label));}
 body.append(chords,notes,grid);if(m.annotation)body.append(el('p','bar-note',m.annotation));card.append(body);return card;
}
function layoutLanes(root=$('measure-grid')){
 const printing=root.id==='print-pages'||!!root.closest?.('#print-pages');
 for(const body of root.querySelectorAll('.bar-body')){
  let required=0;
  for(const lane of body.querySelectorAll('.event-lane')){const items=[...lane.querySelectorAll('.score-event')].sort((a,b)=>Number(a.dataset.fraction)-Number(b.dataset.fraction));for(let i=1;i<items.length;i++){const delta=Number(items[i].dataset.fraction)-Number(items[i-1].dataset.fraction);if(delta>0)required=Math.max(required,((items[i].offsetWidth+items[i-1].offsetWidth)/2+4)/delta);}}
  const css=getComputedStyle(body),available=Math.max(0,body.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight));
  const width=printing?available:Math.max(available,Math.min(2400,Math.ceil(required)));
  for(const track of body.querySelectorAll('.event-lane,.beat-grid'))track.style.width=width+'px';
 }
 for(const lane of root.querySelectorAll('.event-lane')){const rowEnds=[];const items=[...lane.querySelectorAll('.score-event')].sort((a,b)=>Number(a.dataset.fraction)-Number(b.dataset.fraction)),rowHeight=printing?Math.max(lane.classList.contains('chord-lane')?28:46,...items.map(b=>b.offsetHeight+4)):(lane.classList.contains('chord-lane')?48:64);for(const b of items){const maxX=Math.max(0,lane.clientWidth-b.offsetWidth),x=Math.max(0,Math.min(maxX,Number(b.dataset.fraction)*lane.clientWidth-b.offsetWidth/2));let row=0;while(rowEnds[row]!=null&&rowEnds[row]>x-3)row++;rowEnds[row]=x+b.offsetWidth;b.style.left=x+'px';b.style.top=row*rowHeight+'px';}lane.style.height=Math.max(rowHeight,rowEnds.length*rowHeight)+'px';}
}
function render(){
 const barDraft=measureDirty?formSnapshot('measure-form'):null,eventDraft=draftDirty?formSnapshot('event-form'):null,priorMeasure=renderedMeasureId,priorEvent=renderedEventId;
 repairView();$('document-title').textContent=score().title||'未命名樂譜';$('paper-title').textContent=score().title||'未命名樂譜';$('key-summary').textContent=keys();$('paper-keys').textContent=keys();$('score-annotation').textContent=score().annotation;$('review-summary').textContent=reviewText(page());
 selectOptions($('page-select'),score().pages.map(p=>[p.id,p.label||String(score().pages.indexOf(p)+1)]),view.pageId);$('page-count').textContent=`共 ${score().pages.length} 頁`;
 const index=score().pages.indexOf(page());$('previous-page').disabled=index===0;$('next-page').disabled=index===score().pages.length-1;$('delete-page').disabled=score().pages.length===1;$('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;
 document.body.dataset.size=view.size;$('score-size').value=view.size;$('measure-grid').classList.toggle('dense',page().measures.some(m=>m.events.filter(e=>e.type==='note').length>=6));$('measure-grid').replaceChildren(...page().measures.map(m=>makeMeasure(m)));renderInspector();
 measureDirty=false;
 if(barDraft&&priorMeasure===view.measureId){restoreForm(barDraft);measureDirty=true;}
 if(eventDraft&&priorMeasure===view.measureId&&priorEvent===view.eventId){restoreForm(eventDraft);draftDirty=true;typeUI();positionUI();$('draft-status').textContent='草稿尚未套用';}
 renderedMeasureId=view.measureId;renderedEventId=view.eventId;layoutLanes();
}
function renderInspector(){const m=measure();$('inspector-title').textContent=`小節 ${m.label||'未命名'}`;$('measure-label').value=m.label;$('measure-beats').value=m.beats;$('measure-subdivision').value=m.subdivision;$('measure-annotation').value=m.annotation;const i=page().measures.indexOf(m);$('measure-up').disabled=i===0;$('measure-down').disabled=i===page().measures.length-1;$('delete-measure').disabled=page().measures.length===1;fillEvent();}
function positionUI(convert=false){const mode=$('event-position-mode').value,field=$('event-at');$('position-label').textContent=mode==='relative'?'橫向位置（0–100%）':mode==='source-grid'?'來源格線索引（0 起算）':'第幾拍（1 起算）';field.min=mode==='beat'?'1':'0';field.max=mode==='relative'?'100':mode==='source-grid'?String(measure().beats*measure().subdivision-0.03125):String(measure().beats+0.96875);if(convert)field.value=mode==='beat'?'1':'0';}
function typeUI(){const type=$('event-type').value;$('note-fields').hidden=type!=='note';$('chord-fields').hidden=type!=='chord';$('symbol-fields').hidden=type!=='symbol';}
function fillEvent(){const e=selectedEvent();$('event-heading').textContent=e?'編輯事件':'新增事件';$('event-type').value=e?.type??'note';$('event-letter').value=e?.letter??'C';$('event-accidental').value=e?.accidental??'';$('event-octave').value=e?.octave??0;$('event-chord').value=e?.chord??'';$('event-symbol').value=e?.symbol??'';$('event-lane').value=e?.lane??'melody';$('event-position-mode').value=e?.positionMode??'beat';positionUI();$('event-at').value=e?(e.positionMode==='relative'?e.at*100:e.positionMode==='source-grid'?e.at:e.at+1):1;$('event-duration').value=e?.duration??'';$('event-uncertain').checked=e?.uncertain??false;$('event-annotation').value=e?.annotation??'';$('event-save').textContent=e?'套用事件修改':'新增到小節';$('event-delete').disabled=!e;draftDirty=false;$('draft-status').textContent='';typeUI();}
async function selectMeasure(id,eventId=''){if(!await discardDraft())return;view.measureId=id;view.eventId=eventId;render();$('inspector').classList.add('open');save();if(eventId)$('event-form').scrollIntoView({block:'nearest'});}
function changeDraft(){draftDirty=true;$('draft-status').textContent='草稿尚未套用';}
$('event-form').addEventListener('input',changeDraft);$('event-form').addEventListener('change',changeDraft);$('measure-form').addEventListener('input',()=>{measureDirty=true;});$('measure-form').addEventListener('change',()=>{measureDirty=true;});
on('event-type','change',typeUI);on('event-position-mode','change',()=>positionUI(true));
on('event-new','click',async()=>{if(!await discardDraft())return;view.eventId='';render();});
on('event-form','submit',e=>{e.preventDefault();const mode=$('event-position-mode').value,type=$('event-type').value;
 const event={...selectedEvent(),id:view.eventId||newId(),type,positionMode:mode,at:mode==='relative'?Number($('event-at').value)/100:mode==='source-grid'?Number($('event-at').value):Number($('event-at').value)-1,duration:$('event-duration').value===''?null:Number($('event-duration').value),uncertain:$('event-uncertain').checked,annotation:$('event-annotation').value};
 if(type==='note'){event.letter=$('event-letter').value;event.accidental=$('event-accidental').value;event.octave=Number($('event-octave').value);}if(type==='chord')event.chord=$('event-chord').value;if(type==='symbol'){event.symbol=$('event-symbol').value;event.lane=$('event-lane').value;}
 const mid=measure().id,pid=page().id;history.commit(s=>{const m=s.pages.find(p=>p.id===pid).measures.find(m=>m.id===mid);const i=m.events.findIndex(x=>x.id===event.id);if(i>=0)m.events[i]=event;else m.events.push(event);});view.eventId=event.id;draftDirty=false;render();save();status('事件已套用。可用「復原」返回。');
});
on('measure-form','submit',e=>{e.preventDefault();const mid=measure().id,pid=page().id;commit(s=>{const m=s.pages.find(p=>p.id===pid).measures.find(m=>m.id===mid);m.label=$('measure-label').value;m.beats=Number($('measure-beats').value);m.subdivision=Number($('measure-subdivision').value);m.annotation=$('measure-annotation').value;},'小節設定已套用；事件草稿保留，事件位置未自動改動。',{clearMeasure:true});});
on('event-delete','click',async()=>{if(!selectedEvent() || !await ask('刪除此事件？','刪除後可用「復原」返回。此事件的未套用草稿會一併移除；小節草稿會保留。','刪除'))return;const pid=page().id,mid=measure().id,eid=view.eventId;commit(s=>{const m=s.pages.find(p=>p.id===pid).measures.find(m=>m.id===mid);m.events=m.events.filter(e=>e.id!==eid);},'事件已刪除；小節草稿保留。',{clearEvent:true});});
on('inspector-close','click',async()=>{if(!await discardDraft())return;renderInspector();$('inspector').classList.remove('open');document.querySelector(`[data-measure-id="${CSS.escape(view.measureId)}"] .measure-head button`)?.focus();});
for(const action of ['undo','redo'])on(action,'click',async()=>{const target=(action==='undo'?history.past:history.future).at(-1);if(!target)return;const targetMeasure=target.pages.flatMap(p=>p.measures).find(m=>m.id===view.measureId);if((measureDirty&&!targetMeasure||draftDirty&&(!targetMeasure||view.eventId&&!targetMeasure.events.some(e=>e.id===view.eventId)))&&!await discardDraft())return;if(history[action]()){render();save();status(action==='undo'?'已復原上一步；同一小節的草稿保留。':'已重做；同一小節的草稿保留。');}});
on('add-measure','click',async()=>{if(!await discardDraft())return;const m=blankMeasure(String(page().measures.length+1)),pid=page().id;history.commit(s=>s.pages.find(p=>p.id===pid).measures.push(m));view.measureId=m.id;view.eventId='';render();save();$('inspector').classList.add('open');});
on('delete-measure','click',async()=>{if(page().measures.length<=1||!await ask('刪除此小節？','這個小節的所有事件將一併刪除。可用復原返回。','刪除小節'))return;const pid=page().id,mid=measure().id;commit(s=>{const p=s.pages.find(p=>p.id===pid);p.measures=p.measures.filter(m=>m.id!==mid);},'小節已刪除。');});
for(const [id,delta] of [['measure-up',-1],['measure-down',1]])on(id,'click',async()=>{if(!await discardDraft())return;const pid=page().id,mid=measure().id;commit(s=>{const p=s.pages.find(p=>p.id===pid),i=p.measures.findIndex(m=>m.id===mid);if(i+delta<0||i+delta>=p.measures.length)return;[p.measures[i],p.measures[i+delta]]=[p.measures[i+delta],p.measures[i]];},'小節次序已更新，標籤保留原樣。');});
async function switchPage(id){if(!await discardDraft()){ $('page-select').value=view.pageId;return;}view.pageId=id;view.measureId='';view.eventId='';$('inspector').classList.remove('open');render();save();}
on('page-select','change',()=>switchPage($('page-select').value));for(const [id,delta] of [['previous-page',-1],['next-page',1]])on(id,'click',()=>{const p=score().pages[score().pages.indexOf(page())+delta];if(p)return switchPage(p.id);});
on('add-page','click',async()=>{if(!await discardDraft())return;const label=String(Math.max(0,...score().pages.map(p=>Number(p.label)||0))+1),p={id:newId(),label,measures:[blankMeasure('1')]};history.commit(s=>s.pages.push(p));view.pageId=p.id;view.measureId='';view.eventId='';render();save();});
on('delete-page','click',async()=>{if(score().pages.length<=1||!await ask('刪除本頁？','本頁全部小節及事件將被刪除，可用復原返回。','刪除本頁'))return;const pid=page().id;commit(s=>{s.pages=s.pages.filter(p=>p.id!==pid);},'頁面已刪除。');$('inspector').classList.remove('open');});
on('score-size','change',()=>{view.size=$('score-size').value;document.body.dataset.size=view.size;layoutLanes();save();});
on('focus-view','click',async()=>{if(!await discardDraft())return;const active=document.body.classList.toggle('focus');$('inspector').classList.remove('open');$('focus-view').setAttribute('aria-pressed',String(active));$('focus-view').textContent=active?'返回編輯':'專注看譜';layoutLanes();});
on('metadata-open','click',async()=>{if(!await discardDraft())return;$('score-title').value=score().title;$('reference-key').value=score().referenceKey;$('selected-key').value=score().selectedKey;$('document-annotation').value=score().annotation;metadataDirty=false;$('metadata-dialog').showModal();});
$('metadata-form').addEventListener('input',()=>{metadataDirty=true;});
async function closeMetadata(){if(metadataDirty&&!await ask('捨棄樂譜資料草稿？','標題與調性尚未套用。','捨棄草稿'))return;metadataDirty=false;$('metadata-dialog').close();}
on('metadata-close','click',closeMetadata);$('metadata-dialog').addEventListener('cancel',e=>{e.preventDefault();closeMetadata();});
on('metadata-form','submit',e=>{e.preventDefault();commit(s=>{s.title=$('score-title').value;s.referenceKey=$('reference-key').value;s.selectedKey=$('selected-key').value;s.annotation=$('document-annotation').value;},'樂譜資料已更新。音符及和弦沒有移調。');metadataDirty=false;$('metadata-dialog').close();});
on('new-score','click',async()=>{if(!await ask('建立新樂譜？','將取代目前樂譜。請先匯出 JSON；本次開啟期間也可用復原返回。','建立新譜'))return;history.replace(blankScore());draftDirty=false;measureDirty=false;view.pageId='';render();save();status('已建立空白樂譜。');});
on('import-score','change',async()=>{const f=$('import-score').files[0];$('import-score').value='';if(!f)return;if(f.size>MAX_JSON)throw new Error('JSON 樂譜最多 2 MB；目前樂譜未更改。');const candidate=parseScore(await f.text());if(!await ask('匯入並取代目前樂譜？',`${candidate.title} · ${candidate.pages.length} 頁、${candidate.pages.reduce((n,p)=>n+p.measures.length,0)} 小節。請先匯出目前樂譜；未套用草稿將捨棄。`,'匯入樂譜'))return;history.replace(candidate);view.pageId='';view.eventId='';draftDirty=false;measureDirty=false;render();save();status('已匯入。原始轉錄的未知欄位及來源資料會隨 JSON 保留。');});
on('export-score','click',async()=>{if((draftDirty||measureDirty)&&!await ask('匯出已套用的樂譜？','目前草稿尚未套用。JSON 將只包含已套用的內容；草稿仍會留在面板。','匯出已套用內容'))return;const data=serializeScore(score()),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='letter-score-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status('已交給瀏覽器下載。請確認 JSON 備份已保存。');});
function preparePrint(){
 const root=$('print-pages');root.replaceChildren();root.classList.add('print-measuring');
 try{
  const ruler=el('div');ruler.style.height='186mm';root.append(ruler);const printableHeight=ruler.getBoundingClientRect().height-2;ruler.remove();
  for(const p of score().pages){
   let part=0;
   const makeSheet=()=>{part++;const sheet=el('section','print-page score-paper'),head=el('div','paper-header');head.append(el('h2','',score().title),el('div','paper-keys',keys()));const grid=el('div','measure-grid');sheet.append(head);if(part===1){if(score().annotation)sheet.append(el('p','score-annotation',score().annotation));const summary=reviewText(p);if(summary)sheet.append(el('p','review-summary',summary));}sheet.append(grid,el('p','print-footer',`來源頁 ${p.label}${part>1?' · 續頁 '+part:''} · 字母與標記按輸入保留；未確認時值不作節奏推斷`));root.append(sheet);return {sheet,grid};};
   let current=makeSheet();
   for(let i=0;i<p.measures.length;i+=2){const cards=p.measures.slice(i,i+2).map(m=>makeMeasure(m,true)),previous=current.grid.children.length;current.grid.append(...cards);layoutLanes(current.sheet);
    if(previous&&current.sheet.getBoundingClientRect().height>printableHeight){cards.forEach(c=>c.remove());layoutLanes(current.sheet);current=makeSheet();current.grid.append(...cards);layoutLanes(current.sheet);}
   }
  }
 }finally{root.classList.remove('print-measuring');}
}
on('print-score','click',async()=>{if((draftDirty||measureDirty)&&!await ask('列印已套用的樂譜？','未套用草稿不會出現在列印。','繼續列印'))return;preparePrint();window.print();});
window.addEventListener('beforeprint',preparePrint);
on('help-open','click',()=>$('help-dialog').showModal());on('help-close','click',()=>$('help-dialog').close());
window.addEventListener('beforeunload',e=>{if(unsaved||draftDirty||measureDirty||metadataDirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key==='letter-score-editor-v1'&&store&&e.newValue!==store.baseline){store.blocked=true;warning('另一分頁已更改樂譜。本頁暫停儲存，請先匯出 JSON，再重新整理。');}});
window.addEventListener('resize',()=>layoutLanes());
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$(e.shiftKey?'redo':'undo').click();}});
for(const symbol of ['♯','♭']){const option=el('option','',`${symbol}（保留來源字元）`);option.value=symbol;$('event-accidental').append(option);}
try{store=new ScoreStore(window.localStorage);const saved=store.load();if(saved){history=new ScoreHistory(saved.score);if(saved.view&&typeof saved.view==='object')view={...view,...saved.view};}$('save-state').textContent=saved?'已載入本機樂譜':'原創示例 · 套用編輯後自動儲存';}catch(e){warning(store?e.message:'瀏覽器無法使用本機儲存。本頁可暫時編輯，請匯出 JSON；重新整理可能失去更改。');}
render();
if(!navigator.locks?.request)warning('此瀏覽器或連線不支援安全的跨分頁儲存。目前可編輯及匯出 JSON，但不會自動儲存；請使用支援 Web Locks 的 HTTPS 瀏覽器或 localhost。');
