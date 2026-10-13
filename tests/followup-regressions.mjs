import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {demoScore} from '../dist/practice/editor-core.js';
const run=promisify(execFile);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),out=resolve(process.env.PRACTICE_QA_DIR||'../practice-qa/followup');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+decodeURIComponent(pathname)+(pathname.endsWith('/')?'index.html':''));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
// DNS mapping only reaches this local server; it creates a real insecure origin.
const browser=await chromium.launch({headless:true,...(process.env.PRACTICE_BROWSER_PATH?{executablePath:process.env.PRACTICE_BROWSER_PATH}:{}),args:['--host-resolver-rules=MAP review.invalid 127.0.0.1','--no-proxy-server']});
const results=[],errors=[];
async function pageAt(url){const page=await browser.newPage({viewport:{width:1180,height:820},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(url);return page;}
async function check(name,fn){try{const detail=await fn();results.push({name,passed:true,...detail});console.log('PASS:',name);}catch(e){results.push({name,passed:false,error:e.message});throw e;}finally{await writeFile(resolve(out,'results.json'),JSON.stringify({results,errors},null,2));}}
async function download(page,button){const pending=page.waitForEvent('download');await page.locator(button).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));}
try{
 await check('new-event draft survives bar Apply, Undo and Redo then commits once',async()=>{
  const page=await pageAt(origin+'/practice/');try{
   await page.locator('#measure-grid .score-event:not(.chord)').first().click();await page.locator('#event-letter').selectOption('F');await page.locator('#event-save').click();await page.locator('#event-new').click();await page.locator('#event-letter').selectOption('A');await page.locator('#event-annotation').fill('KEEP NEW NOTE DRAFT');
   const retained=async()=>{assert.equal(await page.locator('#event-letter').inputValue(),'A');assert.equal(await page.locator('#event-annotation').inputValue(),'KEEP NEW NOTE DRAFT');assert.ok(await page.locator('#draft-status').innerText());assert.equal(await page.locator('#confirm-dialog').isVisible(),false);};
   await page.locator('#measure-label').fill('Changed bar');await page.locator('#measure-form button[type=submit]').click();await retained();await page.locator('#undo').click();await retained();await page.locator('#undo').click();await retained();await page.locator('#redo').click();await retained();await page.locator('#redo').click();await retained();await page.locator('#event-save').click();const data=await download(page,'#export-score');const events=data.pages[0].measures[0].events.filter(e=>e.annotation==='KEEP NEW NOTE DRAFT');assert.equal(events.length,1);assert.equal(events[0].letter,'A');
  }finally{await page.close();}
 });
 await check('widest valid literal symbols and chords wrap inside each printed card without text loss',async()=>{
  const raw=demoScore(),literal='中'.repeat(40),chord='琴'.repeat(40);raw.pages[0].measures[0].events=[{id:'long-symbol',type:'symbol',lane:'melody',symbol:literal,positionMode:'relative',at:1,duration:null,annotation:'',uncertain:true},{id:'long-chord',type:'chord',chord,positionMode:'relative',at:1,duration:null,annotation:'',uncertain:false}];
  const page=await pageAt(origin+'/practice/');try{
   await page.locator('#import-score').setInputFiles({name:'original-long-tokens.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await page.locator('#confirm-accept').click();const pdf=resolve(out,'long-tokens.pdf');await page.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});await page.emulateMedia({media:'print'});
   const bounds=await page.locator('#print-pages .score-event').evaluateAll(nodes=>nodes.map(n=>{const a=n.getBoundingClientRect(),b=n.closest('.measure-card').getBoundingClientRect();return {text:n.textContent,label:n.getAttribute('aria-label'),width:a.width,height:a.height,fontSize:parseFloat(getComputedStyle(n).fontSize),contained:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth};}));assert.ok(bounds.every(b=>b.contained&&b.scrollWidth<=b.clientWidth+1));assert.ok(bounds.find(b=>b.text===literal).fontSize>=20);assert.ok(bounds.find(b=>b.text===chord).fontSize>=13);assert.ok(bounds.find(b=>b.text===literal).label.includes(literal));
   const extracted=await page.evaluate(async bytes=>{const lib=await import('/practice/vendor/pdf.mjs');lib.GlobalWorkerOptions.workerSrc='/practice/vendor/pdf.worker.mjs';const task=lib.getDocument({data:new Uint8Array(bytes)}),doc=await task.promise;const text=[];try{for(let i=1;i<=doc.numPages;i++)text.push((await (await doc.getPage(i)).getTextContent()).items.map(item=>item.str).join('\n'));return text.join('\n');}finally{await task.destroy();}},[...await readFile(pdf)]);await writeFile(resolve(out,'long-tokens.txt'),extracted);assert.equal([...extracted].filter(c=>c==='中').length,40);assert.equal([...extracted].filter(c=>c==='琴').length,40);await run(process.env.PDFTOPPM_PATH||'pdftoppm',['-f','1','-singlefile','-scale-to','1500','-png',pdf,resolve(out,'long-tokens-page-1')],{windowsHide:true});return {bounds,literalCharacters:40,chordCharacters:40};
  }finally{await page.close();}
 });
 await check('real insecure HTTP editor remains editable/exportable and warns immediately',async()=>{
  const page=await pageAt(origin.replace('127.0.0.1','review.invalid')+'/practice/');try{
   const capability=await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,locks:typeof navigator.locks}));assert.deepEqual(capability,{secure:false,uuid:'undefined',locks:'undefined'});assert.equal(await page.locator('#measure-grid .measure-card').count(),2);assert.equal(await page.locator('#storage-warning').isVisible(),true);await page.locator('#add-measure').click();const data=await download(page,'#export-score');assert.equal(data.pages[0].measures.length,3);assert.equal(await page.evaluate(()=>localStorage.getItem('letter-score-editor-v1')),null);return capability;
  }finally{await page.close();}
 });
 await check('real insecure HTTP companion initializes, starts/pauses and exports IDs',async()=>{
  const page=await pageAt(origin.replace('127.0.0.1','review.invalid')+'/practice/companion.html');try{
   await page.locator('#timer-toggle').waitFor();await page.locator('#timer-toggle').click();await page.locator('#timer-toggle').click();await page.locator('#data-open').click();const data=await download(page,'#backup-export');assert.ok(data.pieces[0].id);assert.ok(data.pieces[0].sections[0].id);assert.equal(data.session.running,false);assert.equal(await page.evaluate(()=>isSecureContext),false);
  }finally{await page.close();}
 });
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));}
