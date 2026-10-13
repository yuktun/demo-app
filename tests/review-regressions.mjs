import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {originalTranscription} from './editor-fixture.mjs';
import {demoScore} from '../dist/practice/editor-core.js';

const run=promisify(execFile);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),out=resolve(process.env.PRACTICE_QA_DIR||'../practice-qa/review-regressions');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(pathname)+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PRACTICE_BROWSER_PATH?{executablePath:process.env.PRACTICE_BROWSER_PATH}:{})});
const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true}),page=await context.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const input=raw=>({name:'original-review-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});
const model=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('letter-score-editor-v1'))?.score);
const saved=()=>page.locator('#save-state').filter({hasText:'已儲存'}).waitFor();
async function load(raw){await page.locator('#import-score').setInputFiles(input(raw));await page.locator('#confirm-accept').click();await saved();}
async function reset(){await page.goto(origin+'/practice/');await page.evaluate(()=>localStorage.removeItem('letter-score-editor-v1'));await page.reload();await page.locator('#measure-grid .score-event').first().waitFor();}
async function download(){const promise=page.waitForEvent('download');await page.locator('#export-score').click();const file=await promise;return JSON.parse(await readFile(await file.path(),'utf8'));}
async function check(name,fn){try{const detail=await fn();results.push({name,passed:true,...detail});console.log('PASS:',name);}catch(e){results.push({name,passed:false,error:e.message});throw e;}finally{await writeFile(resolve(out,'results.json'),JSON.stringify({results,errors},null,2));}}
async function pdfPages(path){const {stdout}=await run(process.env.PDFINFO_PATH||'pdfinfo',[path],{windowsHide:true});const match=stdout.match(/Pages:\s+(\d+)/);assert.ok(match,stdout);return Number(match[1]);}
async function renderFirst(path,name){await run(process.env.PDFTOPPM_PATH||'pdftoppm',['-f','1','-singlefile','-scale-to','1500','-png',path,resolve(out,name)],{windowsHide:true});}

try{
 await reset();
 await check('bar draft survives event deletion and undo',async()=>{
  await page.locator('#measure-grid .score-event:not(.chord)').first().click();await page.locator('#measure-annotation').fill('KEEP THIS BAR DRAFT');await page.locator('#event-delete').click();await page.locator('#confirm-accept').click();assert.equal(await page.locator('#measure-annotation').inputValue(),'KEEP THIS BAR DRAFT');await page.locator('#undo').click();assert.equal(await page.locator('#measure-annotation').inputValue(),'KEEP THIS BAR DRAFT');await page.locator('#measure-form button[type=submit]').click();await saved();assert.equal((await model()).pages[0].measures[0].annotation,'KEEP THIS BAR DRAFT');
 });
 await check('both draft forms apply independently in either order',async()=>{
  await page.locator('#measure-grid .score-event:not(.chord)').first().click();await page.locator('#event-letter').selectOption('F');await page.locator('#measure-label').fill('First label');await page.locator('#event-save').click();assert.equal(await page.locator('#measure-label').inputValue(),'First label');await page.locator('#measure-form button[type=submit]').click();await saved();assert.equal((await model()).pages[0].measures[0].events.find(e=>e.type==='note').letter,'F');assert.equal((await model()).pages[0].measures[0].label,'First label');
  await page.locator('#event-letter').selectOption('A');await page.locator('#measure-label').fill('Second label');await page.locator('#measure-form button[type=submit]').click();assert.equal(await page.locator('#event-letter').inputValue(),'A');await page.locator('#event-save').click();await saved();assert.equal((await model()).pages[0].measures[0].events.find(e=>e.type==='note').letter,'A');assert.equal((await model()).pages[0].measures[0].label,'Second label');
 });
 await check('native unknown fields survive import, UI edit and download',async()=>{
  const raw=demoScore();raw.extra={root:'kept'};raw.pages[0].extra={page:'kept'};raw.pages[0].measures[0].extra={bar:'kept'};raw.pages[0].measures[0].events.find(e=>e.type==='note').extra={event:'kept'};await load(raw);await page.locator('#measure-grid .score-event:not(.chord)').first().click();await page.locator('#event-annotation').fill('Only annotation');await page.locator('#event-save').click();await saved();const output=await download();assert.deepEqual(output.extra,raw.extra);assert.deepEqual(output.pages[0].extra,raw.pages[0].extra);assert.deepEqual(output.pages[0].measures[0].extra,raw.pages[0].measures[0].extra);assert.deepEqual(output.pages[0].measures[0].events.find(e=>e.type==='note').extra,{event:'kept'});
 });
 await check('annotation edit preserves literal source spelling and unicode accidental',async()=>{
  const raw=originalTranscription();raw.measures[0].events[0].note.sourceSpelling='F sharp (two upper dots)';raw.measures[0].events[0].note.accidental='♯';await load(raw);await page.locator('#measure-grid .score-event:not(.chord)').first().click();assert.equal(await page.locator('#event-accidental').inputValue(),'♯');await page.locator('#event-annotation').fill('Only source review annotation');await page.locator('#event-save').click();await saved();const output=await download();assert.deepEqual(output.measures[0].events[0].note,raw.measures[0].events[0].note);assert.equal(output.verification.status,'edited_needs_review');
 });
 await check('malformed source collections, IDs and lanes reject without replacing state',async()=>{
  const before=JSON.stringify(await model());
  for(const mutate of [s=>delete s.measures[0].chords,s=>delete s.measures[0].events[0].id,s=>{const e=s.measures[0].chords.pop();e.type='chord';e.label='Dm';s.measures[0].events.push(e);}]){const raw=originalTranscription();mutate(raw);await page.locator('#import-score').setInputFiles(input(raw));await page.waitForTimeout(50);assert.equal(await page.locator('#confirm-dialog').isVisible(),false);assert.equal(JSON.stringify(await model()),before);}
 });
 await check('actual Print button and direct screen-to-PDF keep positions and one demo page',async()=>{
  await load(demoScore());await page.evaluate(()=>{window.qaPrintLogs=[];addEventListener('beforeprint',()=>{const lane=document.querySelector('#print-pages .melody-lane');window.qaPrintLogs.push({media:matchMedia('print').matches,width:parseFloat(lane.style.width),notes:[...lane.querySelectorAll('.score-event')].map(n=>({left:parseFloat(n.style.left),top:parseFloat(n.style.top)}))});});});
  await page.locator('#print-score').click();const logs=await page.evaluate(()=>window.qaPrintLogs);assert.ok(logs.length);const log=logs[0];assert.equal(log.media,false);assert.ok(log.width>400);assert.ok(log.notes.every(n=>n.top===0));assert.ok(log.notes.every((n,i)=>!i||n.left>log.notes[i-1].left));
  const path=resolve(out,'normal-button-demo.pdf');await page.pdf({path,preferCSSPageSize:true,printBackground:true});assert.equal(await pdfPages(path),1);await renderFirst(path,'normal-button-demo-page-1');return {printLog:log,pdfPages:1};
 });
 await check('dense 46-bar direct print paginates within printable bounds',async()=>{
  const raw=originalTranscription();raw.title='Original 46-bar print regression';raw.measures=Array.from({length:46},(_,i)=>({id:`print-bar-${i}`,order:i+1,source:{page:Math.floor(i/16)+1},events:Array.from({length:8},(_,j)=>({id:`print-note-${i}-${j}`,type:'note',position:{gridIndex:j,rhythmicInterpretation:null},note:{letter:['F','A','D','E'][j%4],accidental:null,sourceSpelling:'original',octaveMark:{dotsAbove:j%3,linesBelow:0}},duration:null})),chords:[{id:`print-chord-${i}`,type:'chord',label:'Dm7/G',position:{gridIndex:1.5,rhythmicInterpretation:null},duration:null}]}));await load(raw);
  const path=resolve(out,'dense-direct.pdf');await page.pdf({path,preferCSSPageSize:true,printBackground:true});const count=await pdfPages(path),sheets=await page.locator('#print-pages .print-page').count();assert.equal(count,sheets);assert.ok(count>=3&&count<=9,`Unexpected ${count} pages`);
  await page.emulateMedia({media:'print'});const bounds=await page.evaluate(()=>[...document.querySelectorAll('#print-pages .print-page')].map(sheet=>({width:sheet.getBoundingClientRect().width,height:sheet.getBoundingClientRect().height,contained:[...sheet.querySelectorAll('.score-event,.beat-grid,.print-footer')].every(n=>{const a=n.getBoundingClientRect(),b=sheet.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})})));assert.ok(bounds.every(b=>b.width>1030&&b.width<1033&&b.height<=704&&b.contained));await page.emulateMedia({media:null});await renderFirst(path,'dense-direct-page-1');return {pdfPages:count,bounds};
 });
 await check('nearby source positions cannot expand beyond the printed sheet',async()=>{
  const raw=originalTranscription();raw.measures=raw.measures.slice(0,1);raw.measures[0].events[0].position.gridIndex=1;const next=structuredClone(raw.measures[0].events[0]);next.id='nearby-source-event';next.position.gridIndex=1.01;raw.measures[0].events.push(next);await load(raw);const path=resolve(out,'nearby-direct.pdf');await page.pdf({path,preferCSSPageSize:true,printBackground:true});assert.equal(await pdfPages(path),1);await page.emulateMedia({media:'print'});assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#print-pages .score-event')].every(n=>{const a=n.getBoundingClientRect(),b=n.closest('.measure-card').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;})),true);await page.emulateMedia({media:null});
 });
 await check('concurrent read-delay writers serialize and reject the losing write',async()=>{
  const race=await browser.newContext(),a=await race.newPage(),b=await race.newPage();try{await a.goto(origin+'/practice/');await a.locator('.measure-head button').first().click();await a.locator('#save-state').filter({hasText:'已儲存'}).waitFor();await b.goto(origin+'/practice/');await Promise.all([a,b].map(p=>p.evaluate(()=>{window.qaWrites=0;const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(k){const value=get.call(this,k);if(k==='letter-score-editor-v1'){const until=performance.now()+200;while(performance.now()<until){}}return value;};Storage.prototype.setItem=function(k,v){if(k==='letter-score-editor-v1')window.qaWrites++;return set.call(this,k,v);};})));await Promise.all([a,b].map(p=>p.locator('#add-measure').click()));await a.waitForTimeout(800);const writes=await Promise.all([a,b].map(p=>p.evaluate(()=>window.qaWrites)));assert.equal(writes.reduce((n,x)=>n+x,0),1);const warnings=await Promise.all([a,b].map(p=>p.locator('#storage-warning').isVisible()));assert.equal(warnings.filter(Boolean).length,1);const durable=await a.evaluate(()=>JSON.parse(localStorage.getItem('letter-score-editor-v1')).score.pages[0].measures.map(m=>m.id)),aIds=await a.locator('#measure-grid .measure-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.measureId)),bIds=await b.locator('#measure-grid .measure-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.measureId));assert.deepEqual(durable,writes[0]?aIds:bIds);assert.notDeepEqual(aIds,bIds);return {writes,warnings};}finally{await race.close();}
 });
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
