export const FORMAT = 'letter-score';
export const MAX_JSON = 2 * 1024 * 1024;
export {createId as newId} from './id.js';
import {createId as newId} from './id.js';
const copy = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw new Error(message); };
const jsonBytes = value => new TextEncoder().encode(JSON.stringify(value, null, 2)).length;
const checkSize = value => { if (jsonBytes(value) > MAX_JSON) fail('JSON 樂譜（UTF-8，包括備份格式）最多 2 MB。'); };
const text = (value, max, label, fallback = '') => {
  const s = value ?? fallback;
  if (typeof s !== 'string' || s.length > max) fail(`${label}格式不正確或過長。`);
  return s;
};
const number = (value, min, max, label) => {
  if (!Number.isFinite(value) || value < min || value > max) fail(`${label}超出範圍。`);
  return value;
};
const list = (value, max, label, min = 0) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${label}數量不正確。`);
  return value;
};
export function blankMeasure(label = '') { return { id: newId(), label, beats: 4, subdivision: 2, events: [], annotation: '' }; }
export function blankScore() {
  return { format: FORMAT, version: 1, title: '未命名樂譜', referenceKey: '', selectedKey: '', annotation: '', pages: [{ id: newId(), label: '1', measures: [blankMeasure('1')] }] };
}
export function demoScore() {
  const score = blankScore(); score.title = '四拍小風景'; score.referenceKey = 'C'; score.selectedKey = 'C';
  score.annotation = '原創操作示例，並非任何歌曲的改編。點選音符或和弦即可編輯。調性只作標示，不會自動移調。';
  const bar = score.pages[0].measures[0];
  bar.events = [
    { id: newId(), type: 'chord', at: 0, duration: 2, chord: 'C', annotation: '', uncertain: false },
    { id: newId(), type: 'chord', at: 2, duration: 2, chord: 'Am', annotation: '', uncertain: false },
    ...['C','D','E','G'].map((letter,i)=>({ id:newId(), type:'note', at:i, duration:1, letter, accidental:'', octave: i===3 ? 1 : 0, annotation:'', uncertain:false }))
  ];
  const second=blankMeasure('2');second.events=[{id:newId(),type:'note',at:0,duration:2,letter:'E',accidental:'',octave:0,annotation:'',uncertain:false},{id:newId(),type:'rest',at:2,duration:2,annotation:'',uncertain:false}];score.pages[0].measures.push(second);
  return score;
}
export function validateScore(input) {
  if (!input || typeof input !== 'object' || input.format !== FORMAT || input.version !== 1) fail('不是支援的 letter-score 第 1 版樂譜。');
  const ids = new Set(); let eventCount=0, measureCount=0;
  const id = value => { const s=text(value,80,'識別碼',newId());if(!s || ids.has(s) || ['__proto__','constructor','prototype'].includes(s))fail('識別碼重複或不正確。');ids.add(s);return s; };
  const score = { ...copy(input), format:FORMAT, version:1, title:text(input.title,160,'標題','未命名樂譜'), referenceKey:text(input.referenceKey,40,'原調'), selectedKey:text(input.selectedKey,40,'選用調'), annotation:text(input.annotation,10000,'樂譜備註'), pages:[] };
  for (const p of list(input.pages,100,'頁面',1)) {
    if(!p || typeof p!=='object')fail('頁面格式不正確。');
    const page={...copy(p),id:id(p.id),label:text(p.label,40,'頁碼'),measures:[]};
    for (const m of list(p.measures,200,'小節',1)) {
      if(!m || typeof m!=='object')fail('小節格式不正確。');
      const bar={...copy(m),id:id(m.id),label:text(m.label,60,'小節標籤'),beats:number(m.beats,1,12,'每小節拍數'),subdivision:m.subdivision,annotation:text(m.annotation,2000,'小節備註'),events:[]};
      if(!Number.isInteger(bar.beats) || ![1,2,4].includes(bar.subdivision))fail('小節拍數或格線細分不支援。');
      for(const e of list(m.events,200,'小節事件')) {
        if(!e || !['note','chord','rest','symbol'].includes(e.type))fail('音符／和弦類型不支援；未匯入任何部分。');
        const mode=e.positionMode??'beat';if(!['beat','relative','source-grid'].includes(mode))fail('位置模式不支援。');
        const event={...copy(e),id:id(e.id),type:e.type,positionMode:mode,at:number(e.at,0,mode==='relative'?1:mode==='source-grid'?bar.beats*bar.subdivision-0.03125:bar.beats-0.03125,'事件位置'),duration:e.duration==null?null:number(e.duration,0.03125,bar.beats,'時值'),annotation:text(e.annotation,1000,'事件備註'),uncertain:e.uncertain??false};
        if(mode==='beat' && event.duration!==null && event.at+event.duration>bar.beats+1e-8)fail('事件超出小節，請先調整位置或時值。');
        if(typeof event.uncertain!=='boolean')fail('待核對標示不正確。');
        if(e.type==='note') { if(!/^[A-G]$/.test(e.letter) || !['','#','b','♯','♭','♮','##','bb'].includes(e.accidental??''))fail('音名或升降記號不正確。');event.letter=e.letter;event.accidental=e.accidental??'';event.octave=number(e.octave,-3,3,'八度標記');if(!Number.isInteger(event.octave))fail('八度標記須為整數。'); }
        if(e.type==='chord') { event.chord=text(e.chord,40,'和弦');if(!event.chord.trim())fail('請填寫和弦名稱。'); }
        if(e.type==='symbol') {event.symbol=text(e.symbol,40,'原樣符號');if(!event.symbol)fail('請填寫原樣符號。');event.lane=e.lane??'melody';if(!['melody','chord'].includes(event.lane))fail('符號位置不正確。');}
        bar.events.push(event);eventCount++;
      }
      page.measures.push(bar);measureCount++;
    }
    score.pages.push(page);
  }
  if(eventCount>10000 || measureCount>2000)fail('樂譜最多 2,000 個小節、10,000 個事件。');
  checkSize(score);
  if(input.sourceDocument!=null){
    const baseline=fromTranscription(input.sourceDocument,false);
    score.sourceDocument=copy(input.sourceDocument);
    checkSize(projectSource(score,baseline));
  }
  return score;
}
export function parseScore(json) {
  if(typeof json!=='string' || new TextEncoder().encode(json).length>MAX_JSON)fail('JSON 樂譜最多 2 MB。');
  let value;try{value=JSON.parse(json);}catch{fail('JSON 無法讀取；目前樂譜未更改。');}
  // A score may be supplied directly or wrapped by a transcription export.
  if(value?.score?.format===FORMAT)value=value.score;
  if(value?.documentType==='editable-letter-note-chord-score')return fromTranscription(value);
  return validateScore(value);
}
export function eventLabel(e) {
  const name=e.type==='note' ? `${e.letter}${e.accidental}${e.octave>0?'，上方 '+e.octave+' 點':e.octave<0?'，下方 '+(-e.octave)+' 線':''}` : e.type==='chord' ? `和弦 ${e.chord}` : e.type==='symbol'?`原樣符號 ${e.symbol}`:'休止';
  const position=e.positionMode==='relative'?`橫向 ${Math.round(e.at*1000)/10}%（非已確認拍點）`:e.positionMode==='source-grid'?`來源格線 ${e.at}（非已確認拍點）`:`第 ${e.at+1} 拍`;
  return `${name}，${position}，${e.duration==null?'時值未確認':'時值 '+e.duration+' 拍'}${e.uncertain?'，待核對':''}`;
}
export class ScoreHistory {
  constructor(score) { this.score=validateScore(score);this.past=[];this.future=[]; }
  commit(mutate) {
    const draft=copy(this.score);mutate(draft);const next=validateScore(draft);
    if(JSON.stringify(next)===JSON.stringify(this.score))return false;
    this.past.push(this.score);this.future=[];this.score=next;
    while(this.past.length>40 || this.past.reduce((n,s)=>n+JSON.stringify(s).length,0)>12000000)this.past.shift();
    return true;
  }
  replace(score) { const next=validateScore(score);this.past.push(this.score);this.past=this.past.slice(-10);this.future=[];this.score=next; }
  undo() { if(!this.past.length)return false;this.future.push(this.score);this.score=this.past.pop();return true; }
  redo() { if(!this.future.length)return false;this.past.push(this.score);this.score=this.future.pop();return true; }
}
export class ScoreStore {
  constructor(storage, key='letter-score-editor-v1', locks=globalThis.navigator?.locks) { this.storage=storage;this.key=key;this.baseline=null;this.blocked=false;this.locks=locks;this.queue=Promise.resolve(); }
  load() {
    try { this.baseline=this.storage.getItem(this.key);if(!this.baseline)return null;const record=JSON.parse(this.baseline);return {score:validateScore(record.score),view:record.view}; }
    catch { this.blocked=true;throw new Error('無法讀取本機樂譜。現有儲存不會被覆寫；可暫時編輯並匯出 JSON。'); }
  }
  save(score,view) {
    const snapshot=copy(score),snapshotView=copy(view);
    const operation=this.queue.catch(()=>{}).then(()=>{
      if(!this.locks?.request)throw new Error('此瀏覽器不支援安全的跨分頁儲存。本頁可暫時編輯，請匯出 JSON；請用支援 Web Locks 的 HTTPS 瀏覽器保存。');
      return this.locks.request(`${this.key}-write`,{mode:'exclusive'},()=>this.write(snapshot,snapshotView));
    });
    this.queue=operation;return operation;
  }
  write(score,view) {
    if(this.blocked)throw new Error('本機儲存已暫停。請先匯出 JSON，再重新整理以載入另一分頁的資料。');
    try {
      if(this.storage.getItem(this.key)!==this.baseline){this.blocked=true;throw new Error('另一分頁已更改樂譜。為免覆寫，本頁暫停儲存；請先匯出 JSON。');}
      const record=JSON.stringify({score:validateScore(score),view,revision:newId()});this.storage.setItem(this.key,record);this.baseline=record;
    } catch(e) { if(this.blocked)throw e;throw new Error('儲存失敗或空間不足。本次編輯仍在頁面內，請立即匯出 JSON；重新整理會失去未儲存的更改。'); }
  }
}

// Adapter for a manually transcribed letter-score document. No recognition or pitch inference.
export function fromTranscription(input, keepSource=true) {
  if(input?.schemaVersion!=='1.0.0' || input?.documentType!=='editable-letter-note-chord-score')fail('轉錄文件版本不支援。');
  const beats=number(input.beatGrid?.countsPerMeasure,1,12,'來源格線計數');
  const columns=list(input.beatGrid?.printedColumns,48,'來源格線',1);
  const subdivision=columns.length/beats;if(![1,2,4].includes(subdivision))fail('來源格線細分不支援。');
  const doc={format:FORMAT,version:1,title:text(input.title,160,'標題'),referenceKey:text(input.referenceKey?.label,40,'原調'),selectedKey:text(input.selectedKey?.label,40,'選用調'),annotation:text(input.editor?.annotation,10000,'備註'),pages:[]};
  const pages=new Map();
  const sourceIds=new Set();
  const sourceId=value=>{if(typeof value!=='string'||!value||value.length>80||sourceIds.has(value)||['__proto__','constructor','prototype'].includes(value))fail('來源小節與事件必須有唯一、穩定的識別碼；未匯入任何部分。');sourceIds.add(value);return value;};
  for(const raw of list(input.measures,2000,'來源小節',1)) {
    const pageLabel=String(raw.editor?.pageLabel??raw.source?.page??1);
    if(!pages.has(pageLabel)){const p={id:`source-page-${pages.size+1}`,label:pageLabel,measures:[]};pages.set(pageLabel,p);doc.pages.push(p);}
    const m={id:sourceId(raw.id),label:raw.editor?.label??String(raw.order??''),beats:raw.editor?.beats??beats,subdivision:raw.editor?.subdivision??subdivision,annotation:raw.editor?.annotation??'',events:[]};
    for(const [collection,lane] of [['events','melody'],['chords','chord']])for(const e of list(raw[collection],200,'來源事件集合')) {
      if(!e || !(lane==='chord'?['chord','uninterpreted_mark']:['note','rest','uninterpreted_mark']).includes(e.type))fail('來源事件位於不相容的旋律／和弦集合；未匯入任何部分。');
      const event={id:sourceId(e.id),type:e.type,positionMode:e.editor?.positionMode??'source-grid',at:e.editor?.at??e.position?.gridIndex,duration:e.duration??null,annotation:e.editor?.annotation??'',uncertain:e.editor?.uncertain??(!Number.isInteger(e.position?.gridIndex)||e.type==='uninterpreted_mark')};
      if(e.type==='note') {const n=e.note;const marks=n?.octaveMark;if(!marks || !Number.isInteger(marks.dotsAbove)||!Number.isInteger(marks.linesBelow)||marks.dotsAbove<0||marks.linesBelow<0||marks.dotsAbove&&marks.linesBelow)fail('無法無損表示來源八度標記。');event.letter=n.letter;event.accidental=n.accidental??'';event.octave=marks.dotsAbove-marks.linesBelow;}
      else if(e.type==='chord')event.chord=e.label;
      else if(e.type==='uninterpreted_mark'){event.type='symbol';event.symbol=e.label;event.lane=lane;}
      else if(e.type!=='rest')fail('來源含未支援的事件類型，未匯入任何部分。');
      m.events.push(event);
    }
    pages.get(pageLabel).measures.push(m);
  }
  if(keepSource)doc.sourceDocument=copy(input);
  return validateScore(doc);
}
export function exportScore(score) {
  const current=validateScore(score);if(!current.sourceDocument)return current;
  const output=projectSource(current,fromTranscription(current.sourceDocument,false));checkSize(output);return output;
}
export function serializeScore(score) {
  const output=exportScore(score);checkSize(output);return JSON.stringify(output,null,2);
}
function projectSource(current,baseline) {
  const output=copy(current.sourceDocument);
  const beforeMeasures=new Map(baseline.pages.flatMap(p=>p.measures.map(m=>[m.id,{bar:m,page:p}]))),rawMeasures=new Map(output.measures.map(m=>[m.id,m]));
  let changed=false;const changedIds=[];
  if(current.title!==baseline.title){output.title=current.title;changed=true;}
  for(const key of ['referenceKey','selectedKey'])if(current[key]!==baseline[key]){output[key]={...output[key],label:current[key]};changed=true;}
  if(current.annotation!==baseline.annotation){output.editor={...output.editor,annotation:current.annotation};changed=true;}
  output.measures=[];let order=0;
  for(const page of current.pages)for(const m of page.measures) {
    order++;const prior=beforeMeasures.get(m.id),raw=copy(rawMeasures.get(m.id)??{id:m.id,order,source:null,events:[],chords:[]});
    const oldEvents=new Map([...raw.events,...raw.chords].map(e=>[e.id,e])),beforeEvents=new Map(prior?.bar.events.map(e=>[e.id,e])??[]);
    if(!prior || JSON.stringify(m)!==JSON.stringify(prior.bar) || page.label!==prior.page.label || raw.order!==order){changed=true;changedIds.push(m.id);raw.editor={...raw.editor,pageLabel:page.label,label:m.label,beats:m.beats,subdivision:m.subdivision,annotation:m.annotation,order,verificationStatus:'edited_needs_review'};}
    const events=[],chords=[];
    for(const e of m.events){
      const old=oldEvents.get(e.id),before=beforeEvents.get(e.id);let rawEvent=copy(old??{id:e.id,type:e.type,position:{gridIndex:0,alignment:'user_entered',rhythmicInterpretation:null},duration:null});
      if(!before || JSON.stringify(e)!==JSON.stringify(before)) {
        const lane=e.type==='chord'||e.type==='symbol'&&e.lane==='chord';
        rawEvent.type=e.type==='symbol'?'uninterpreted_mark':e.type;
        rawEvent.editor={...rawEvent.editor,positionMode:e.positionMode,at:e.at,annotation:e.annotation,uncertain:e.uncertain,verificationStatus:'edited_needs_review'};
        if(!before || before.at!==e.at || before.positionMode!==e.positionMode)rawEvent.position={...rawEvent.position,gridIndex:e.positionMode==='source-grid'?e.at:e.positionMode==='relative'?e.at*m.beats*m.subdivision:e.at*m.subdivision,alignment:'user_edited',rhythmicInterpretation:e.positionMode==='beat'?{unit:'beat',at:e.at}:null};
        rawEvent.duration=e.duration;
        if(e.type==='note'){
          if(!old?.note)rawEvent.note={sourceSpelling:e.letter+e.accidental,letter:e.letter,accidental:e.accidental||null,octaveMark:{dotsAbove:Math.max(0,e.octave),linesBelow:Math.max(0,-e.octave)}};
          else {
            if(e.letter!==before?.letter)rawEvent.note.letter=e.letter;
            if(e.accidental!==before?.accidental)rawEvent.note.accidental=e.accidental||null;
            if(e.octave!==before?.octave)rawEvent.note.octaveMark={...rawEvent.note.octaveMark,dotsAbove:Math.max(0,e.octave),linesBelow:Math.max(0,-e.octave)};
          }
        }
        if(e.type==='chord'||e.type==='symbol'){rawEvent.label=e.type==='chord'?e.chord:e.symbol;rawEvent.boxed=lane;}
        if(e.type!=='note')delete rawEvent.note;if(e.type==='note'||e.type==='rest'){delete rawEvent.label;delete rawEvent.boxed;}
      }
      (e.type==='chord'||e.type==='symbol'&&e.lane==='chord'?chords:events).push(rawEvent);
    }
    raw.events=events;raw.chords=chords;output.measures.push(raw);
  }
  if(output.measures.length!==rawMeasures.size)changed=true;
  if(changed){output.verification={...output.verification,status:'edited_needs_review'};output.editor={...output.editor,changedMeasureIds:changedIds,verificationStatus:'edited_needs_review'};}
  return output;
}
