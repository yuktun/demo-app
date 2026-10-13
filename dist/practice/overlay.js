import * as pdfjsLibrary from './vendor/pdf.mjs';
import {demoFixtures as fixtures} from './overlay-demo.js';
import {numeric,validatePitch,validatePack,viewValid,transform} from './overlay-core.js';
pdfjsLibrary.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const clone=x=>JSON.parse(JSON.stringify(x));
let state=null, originalBytes=null, pageNumber=1, selected=null, dirty=false, modified=false, generation=0, history=[], adding=false, reanchor=false;
let sourceMode='', busy=false, drag=null,formDirty=false;const pointers=new Set();
function setBusy(value){busy=value;document.querySelectorAll('button,input,select').forEach(e=>{if(!['demo-pdf','demo-png','source-file'].includes(e.id))e.disabled=value||!state;});if(state&&!value)updateCounters();}
function mayLeaveForm(){return !formDirty||confirm('要捨棄尚未套用的音高修正嗎？取消後可先套用修正。');}
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
const fail=e=>status(e?.message||String(e),true);
function pageInfo(){return state.pages[pageNumber-1];}
function view(){return state.views[pageNumber];}
function checkpoint(){history.push(clone({labels:state.labels,views:state.views,baseOctave:state.baseOctave,conventionConfirmed:state.conventionConfirmed}));if(history.length>100)history.shift();dirty=modified=true;}
function updateCounters(){const labels=state.labels.filter(l=>l.page===pageNumber);$('preview-state').textContent=`${labels.filter(l=>l.reviewed).length} / ${labels.length} 已核對`;$('undo').disabled=!history.length;}
function create(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
function labelSize(){return Math.max(12,Math.min(pageInfo().width/75,pageInfo().height/22));}
function renderLabels(){
 const layer=$('overlay');layer.replaceChildren();layer.style.display=$('show-overlay').checked?'':'none';const size=labelSize();
 for(const l of state.labels.filter(l=>l.page===pageNumber)){
  if(l.id===selected){layer.append(create('line',{x1:l.position.x,y1:l.position.y+size*.5,x2:l.anchor.x,y2:l.anchor.y,class:'leader'}));layer.append(create('circle',{cx:l.anchor.x,cy:l.anchor.y,r:size*.28,class:'headmark'}));}
  const g=create('g',{class:`label ${l.reviewed?'reviewed':''} ${l.id===selected?'selected':''}`,'data-id':l.id,transform:`translate(${l.position.x} ${l.position.y})`,tabindex:0,role:'button','aria-label':`${l.pitch.step}${l.pitch.alter?l.pitch.alter>0?' sharp':' flat':''}${l.pitch.octave}, ${l.reviewed?'reviewed':'unreviewed'}`});
  const accidental=({'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'})[l.pitch.alter];const width=size*(l.pitch.alter?1.85:1.4);
  g.append(create('rect',{x:-width/2,y:-size*1.12,width,height:size*2.15,rx:size*.18}));
  g.append(create('text',{y:size*.31,'font-size':size},l.pitch.step+accidental));
  const octave=l.pitch.octave-state.baseOctave;if(octave)g.append(create('text',{y:octave>0?-size*.62:size*.89,'font-size':size*.5,class:'octave'},'•'.repeat(Math.abs(octave))));
  g.append(create('title',{},`${l.pitch.step}${accidental}${l.pitch.octave} · ${l.origin.kind==='audiveris'?'OMR head '+l.origin.headId:'Manual label'}`));layer.append(g);
 }
 updateCounters();
}
function render(){if(!state)return;const p=pageInfo(),v=view(),rotated=v.rotation%180!==0,w=rotated?v.crop.height:v.crop.width,h=rotated?v.crop.width:v.crop.height;
 $('score').setAttribute('viewBox',`0 0 ${w} ${h}`);$('world').setAttribute('transform',`matrix(${transform(v).join(' ')})`);const im=$('original-image');im.setAttribute('href',p.image);im.setAttribute('width',p.width);im.setAttribute('height',p.height);
 const fit=Math.max(150,$('scroll').clientWidth-34),zoom=Number($('zoom').value)/100;$('score').style.width=`${fit*zoom}px`;$('score').style.height=`${fit*zoom*h/w}px`;$('zoom-value').textContent=`${$('zoom').value}%`;
 for(const k of ['x','y','width','height'])$('crop-'+k).value=v.crop[k];$('score').classList.toggle('adding',adding||reanchor);renderLabels();
}
function currentLabel(){return state?.labels.find(l=>l.id===selected);}
function selection(){formDirty=false;const l=currentLabel(),panel=$('selection');panel.replaceChildren();if(!l){const h=document.createElement('h2');h.textContent='點選一個標註';const p=document.createElement('p');p.textContent='點選字母以核對音高，或拖曳到相應音符上方。';panel.append(h,p);return;}
 const h=document.createElement('h2');h.textContent='編輯所選標註';const provenance=document.createElement('p');provenance.textContent=l.origin.kind==='audiveris'?`Recognized ${l.origin.pitch.step}${l.origin.pitch.alter?` (${l.origin.pitch.alter>0?'+':''}${l.origin.pitch.alter})`:''}${l.origin.pitch.octave} · measure ${l.origin.measure} · head ${l.origin.headId}`:'手動新增，並非自動識譜結果。';
 const row=document.createElement('div');row.className='row';for(const [id,title,values]of [['note-step','音名',['C','D','E','F','G','A','B']],['note-alter','升降記號',[['-2','重降'],['-1','降'],['0','原音'],['1','升'],['2','重升']]]]){const field=document.createElement('label');field.className='field';field.textContent=title;const input=document.createElement('select');input.id=id;for(const item of values){const option=document.createElement('option');option.value=Array.isArray(item)?item[0]:item;option.textContent=Array.isArray(item)?item[1]:item;input.append(option);}field.append(input);row.append(field);}
 const oct=document.createElement('label');oct.className='field';oct.textContent='科學音高八度數字';const input=document.createElement('input');input.type='number';input.min=0;input.max=9;input.step=1;input.id='note-octave';input.required=true;oct.append(input);
 const apply=document.createElement('button');apply.id='apply-pitch';apply.className='primary';apply.textContent='套用修正';apply.onclick=()=>{try{const pitch={step:$('note-step').value,alter:Number($('note-alter').value),octave:numeric($('note-octave').value,'Octave')};validatePitch(pitch);checkpoint();l.pitch=pitch;l.reviewed=false;renderLabels();selection();status('已套用到草稿，請對照原譜核對。');}catch(e){fail(e);}};
 const review=document.createElement('button');review.id='review-label';review.textContent=l.reviewed?'改為待核對':'標記已核對';review.onclick=()=>{if(formDirty)return fail(Error('請先套用音高修正，再標記為已核對。'));if(!state.conventionConfirmed)return fail(Error('請先確認不加點的八度規則，再標記為已核對。'));checkpoint();l.reviewed=!l.reviewed;renderLabels();selection();};
 const controls=document.createElement('div');controls.className='row';controls.style.marginTop='10px';controls.append(apply,review);
 const anchor=document.createElement('button');anchor.id='reanchor';anchor.textContent='更改音符錨點';anchor.style.marginTop='12px';anchor.onclick=()=>{if(!mayLeaveForm())return;formDirty=false;reanchor=true;adding=false;render();status('點選正確的音符頭；原始識別座標會保留在來源紀錄。');};
 const del=document.createElement('button');del.id='delete-label';del.textContent='刪除標註';del.onclick=()=>{checkpoint();state.labels=state.labels.filter(x=>x.id!==selected);selected=null;renderLabels();selection();};del.style.marginTop='8px';
 const rp=document.createElement('p');rp.className='review';rp.textContent=l.reviewed?'你已核對':'待核對，請對照原譜';panel.append(h,provenance,row,oct,controls,rp,anchor,del);$('note-step').value=l.pitch.step;$('note-alter').value=l.pitch.alter;$('note-octave').value=l.pitch.octave;
}
async function pdfjs(){return pdfjsLibrary;}
function bytes64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function loadDocument(bytes,name,mime){
 if(bytes.length>20*1024*1024)throw Error('This experiment supports files up to 20 MB.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const pages=[];let isPdf=new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';
 if(isPdf){mime='application/pdf';const lib=await pdfjs(),task=lib.getDocument({data:bytes.slice(),isEvalSupported:false,useSystemFonts:true,disableFontFace:false,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href});let doc;
  try{doc=await task.promise;if(doc.numPages>20)throw Error('This experiment supports PDFs up to 20 pages.');let total=0;for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),vp=p.getViewport({scale:2}),w=Math.ceil(vp.width),h=Math.ceil(vp.height);total+=w*h;if(w*h>12000000||total>40000000)throw Error('This PDF exceeds the local preview pixel limit.');const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;await p.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;pages.push({number:i,width:w,height:h,geometry:{kind:'pdf',view:p.view,rotation:p.rotate,userUnit:p.userUnit,renderScale:2,transform:vp.transform},image:canvas.toDataURL('image/png')});p.cleanup();}}
  finally{await task.destroy();}
 }else{if(!/^image\/(png|jpeg|webp)$/.test(mime))throw Error('Choose a PDF, PNG, JPEG or WebP file.');const url=URL.createObjectURL(new Blob([bytes],{type:mime}));try{const im=new Image();im.src=url;await im.decode();if(im.naturalWidth*im.naturalHeight>16000000)throw Error('This image exceeds the 16 megapixel preview limit.');const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);pages.push({number:1,width:c.width,height:c.height,geometry:{kind:'raster',orientation:'browser-decoded'},image:c.toDataURL('image/png')});}finally{URL.revokeObjectURL(url);}}
 return {source:{sha256:hash,bytes:bytes.length,name,mime},pages};
}
function metadataPages(pages){return pages.map(({image,...p})=>clone(p));}
function serializable(){if(!state)return null;const p=clone(state);p.pages=metadataPages(state.pages);return p;}
function mayReplace(){return !(dirty||formDirty)||confirm('這份草稿有未儲存的標註、裁切或未套用修正。要取代嗎？取消後可先儲存或匯出。');}
async function changeSource(loader,mode,pack=null){
 if(!mayReplace())return false;const token=++generation;setBusy(true);status('正在開啟原譜…');
 try{const source=await loader();const loaded=await loadDocument(source.bytes,source.name,source.mime);if(token!==generation)return false;
  let next={format:'source-score-overlay',version:1,source:loaded.source,pages:metadataPages(loaded.pages),labels:[],baseOctave:4,conventionConfirmed:false,views:Object.fromEntries(loaded.pages.map(p=>[p.number,{crop:{x:0,y:0,width:p.width,height:p.height},rotation:0}])),provenance:{mode:'viewer-manual',warning:'No recognition engine connected.'}};
  if(pack){next=validatePack(pack,next);next.conventionConfirmed=false;}
  next.pages=loaded.pages;state=next;originalBytes=source.bytes.slice();sourceMode=mode;document.body.dataset.sourceMode=pack?'recognized-demo':'manual';selected=null;pageNumber=1;dirty=modified=false;history=[];adding=reanchor=false;$('show-overlay').checked=true;$('zoom').value=100;$('confirm-convention').checked=false;$('base-octave').value=state.baseOctave;
  $('source-title').textContent=state.source.name;$('source-description').textContent=pack?'原創範例：10 個音符來自實際 Audiveris 識譜結果。未識別的拍號、一個休止符和一個和弦仍可在原譜看見。':'檢視／手動標註模式：這次開啟的檔案未連接自動識譜。';$('source-meta').textContent=`${state.pages.length} page(s) · SHA-256 ${state.source.sha256.slice(0,16)}…`;
  $('page-select').replaceChildren(...state.pages.map(p=>{const o=document.createElement('option');o.value=p.number;o.textContent=p.number;return o;}));render();selection();status(pack?'預先識譜範例：所有字母均待核對。請確認八度規則，並逐一對照原譜。':'已在本機以檢視／手動標註模式開啟。可自行新增標註，或匯入與此原檔完全相符的已存標註。');return true;
 }catch(e){if(token===generation)fail(e);return false;}finally{if(token===generation)setBusy(false);}
}
async function demo(ext){const f=fixtures[ext];return changeSource(async()=>({bytes:bytes64(f.bytes),name:f.pack.source.name,mime:f.pack.source.mime}),'demo',f.pack);}
function download(bytes,name,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function importOverlay(pack){const validated=validatePack(pack,{source:state.source,pages:metadataPages(state.pages)});if(!mayReplace())return false;checkpoint();const pages=state.pages;state=validated;state.pages=pages;state.conventionConfirmed=false;$('confirm-convention').checked=false;$('base-octave').value=state.baseOctave;selected=null;render();selection();status('已為相符原檔還原標註。繼續核對前，請再確認八度規則。');return true;}
function storageKey(){return `source-score-overlay:v1:${state.source.sha256}`;}
function pointFromScreen(x,y){return new DOMPoint(x,y).matrixTransform($('world').getScreenCTM().inverse());}
function clampPoint(p){const pg=pageInfo();return {x:Math.max(0,Math.min(pg.width,p.x)),y:Math.max(0,Math.min(pg.height,p.y))};}
function cancelDrag(){if(drag?.snapshot){state.labels=drag.snapshot;history.splice(drag.historyLength);dirty=drag.wasDirty;modified=drag.wasModified;}drag=null;renderLabels();}
// Never cancel browser pinch gestures. Two pointers or pointercancel roll back a partial drag.
$('score').addEventListener('pointerdown',e=>{
 pointers.add(e.pointerId);if(pointers.size>1){cancelDrag();return;}if(!state||busy)return;
 if(!mayLeaveForm())return;formDirty=false;
 const hit=e.target.closest('.label');if(hit){selected=hit.dataset.id;selection();renderLabels();const l=currentLabel();drag={id:selected,pointerId:e.pointerId,start:pointFromScreen(e.clientX,e.clientY),position:clone(l.position),snapshot:clone(state.labels),historyLength:history.length,wasDirty:dirty,wasModified:modified,moved:false};return;}
 if(adding||reanchor){const p=clampPoint(pointFromScreen(e.clientX,e.clientY));checkpoint();if(reanchor){const l=currentLabel();l.anchor=p;l.reviewed=false;}else{const id='manual-'+crypto.randomUUID();state.labels.push({id,page:pageNumber,pitch:{step:'C',alter:0,octave:4},anchor:p,position:clampPoint({x:p.x,y:p.y-labelSize()*3}),reviewed:false,origin:{kind:'manual',anchor:clone(p)}});selected=id;}adding=reanchor=false;render();selection();return;}
 selected=null;renderLabels();selection();
});
window.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId||pointers.size!==1)return;const p=pointFromScreen(e.clientX,e.clientY),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<labelSize()*.08)return;if(!drag.moved){checkpoint();drag.moved=true;}const l=currentLabel();l.position=clampPoint({x:drag.position.x+dx,y:drag.position.y+dy});l.reviewed=false;renderLabels();});
window.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(drag?.pointerId===e.pointerId){drag=null;selection();}});
window.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);cancelDrag();});
$('overlay').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.label')){e.preventDefault();if(!mayLeaveForm())return;selected=e.target.closest('.label').dataset.id;selection();renderLabels();}});
$('selection').addEventListener('input',()=>{formDirty=true;});$('selection').addEventListener('change',()=>{formDirty=true;});
$('demo-pdf').onclick=()=>demo('pdf');$('demo-png').onclick=()=>demo('png');
$('source-file').onchange=e=>{const file=e.target.files[0];if(file)changeSource(async()=>({bytes:new Uint8Array(await file.arrayBuffer()),name:file.name,mime:file.type}),'upload');e.target.value='';};
$('overlay-file').onchange=async e=>{const file=e.target.files[0],token=generation;if(file)try{if(file.size>3000000)throw Error('Overlay JSON exceeds the 3 MB limit.');const text=await file.text();if(token!==generation)throw Error('Source changed while reading labels. Import them again.');importOverlay(JSON.parse(text));}catch(err){fail(err);}e.target.value='';};
$('show-overlay').onchange=renderLabels;$('zoom').oninput=render;$('fit').onclick=()=>{$('zoom').value=100;render();};
$('page-select').onchange=()=>{if(!mayLeaveForm()){$('page-select').value=pageNumber;return;}pageNumber=Number($('page-select').value);selected=null;render();selection();};
$('rotate').onclick=()=>{checkpoint();view().rotation=(view().rotation+90)%360;render();};
$('apply-crop').onclick=()=>{try{const v={rotation:view().rotation,crop:Object.fromEntries(['x','y','width','height'].map(k=>[k,numeric($('crop-'+k).value,`Crop ${k}`)]))};viewValid(v,pageInfo());checkpoint();state.views[pageNumber]=v;render();}catch(e){fail(e);}};
$('full-page').onclick=()=>{checkpoint();const p=pageInfo();view().crop={x:0,y:0,width:p.width,height:p.height};render();};
$('undo').onclick=()=>{if(!mayLeaveForm())return;if(history.length){Object.assign(state,history.pop());dirty=modified=true;selected=null;adding=reanchor=false;$('base-octave').value=state.baseOctave;$('confirm-convention').checked=!!state.conventionConfirmed;render();selection();}};
$('base-octave').onchange=()=>{if(!mayLeaveForm()){$('base-octave').value=state.baseOctave;return;}checkpoint();state.baseOctave=Number($('base-octave').value);state.conventionConfirmed=false;$('confirm-convention').checked=false;state.labels.forEach(l=>l.reviewed=false);renderLabels();selection();};
$('confirm-convention').onchange=()=>{checkpoint();state.conventionConfirmed=$('confirm-convention').checked;updateCounters();};
$('add-label').onclick=()=>{adding=true;reanchor=false;render();status('點選原譜音符頭以手動新增標註，這並非自動識譜。');};
$('save').onclick=()=>{if(formDirty)return fail(Error('請先套用音高修正，再儲存。'));try{localStorage.setItem(storageKey(),JSON.stringify(serializable()));dirty=false;status('已為此原檔儲存到此裝置；可匯出標註作獨立備份。');}catch(e){fail(Error('裝置儲存空間不可用或已滿，請匯出標註以保留草稿。'));}};
$('restore').onclick=()=>{try{const data=localStorage.getItem(storageKey());if(!data)throw Error('此裝置沒有這份原檔的已存標註。');importOverlay(JSON.parse(data));}catch(e){fail(e);}};
$('export').onclick=()=>{if(formDirty)return fail(Error('請先套用音高修正，再匯出。'));const text=JSON.stringify(serializable(),null,2);$('export-text').value=text;$('export-dialog').showModal();download(text,'score-labels.overlay.json','application/json');status('匯出內容已包含原檔身分、座標和修正。請確認下載或複製 JSON；裝置儲存須另行操作。');};
$('select-export').onclick=()=>{$('export-text').focus();$('export-text').select();};$('close-export').onclick=()=>$('export-dialog').close();
$('download-source').onclick=()=>download(originalBytes,state.source.name,state.source.mime);
window.addEventListener('resize',render);window.addEventListener('beforeunload',e=>{if(dirty||formDirty){e.preventDefault();e.returnValue='';}});
if(new URL(location.href).searchParams.has('qa'))window.__overlayTest={get:()=>serializable(),dirty:()=>dirty,load:changeSource,demo,importOverlay,validatePack,transform,pointFromScreen,sourceBytes:()=>Array.from(originalBytes),select:id=>{selected=id;renderLabels();selection();},render,fixtures,pages:()=>metadataPages(state.pages)};
await demo('pdf');
