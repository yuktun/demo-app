import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),path=resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!path.startsWith(root+sep)&&path!==root){res.writeHead(403).end();return;}
  try {res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));} catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.ENGLISH_BROWSER_PATH?{executablePath:process.env.ENGLISH_BROWSER_PATH}:{})});
const errors=[],external=[];
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
await context.addInitScript(()=>{
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},addEventListener(){},speak(){throw new Error('No voice');}},configurable:true});
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
const nav=async label=>page.locator('nav').getByRole('button',{name:label}).click();
const start=async()=>{await nav('Practice');await page.getByRole('button',{name:'Start practice'}).first().click();};
const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
try {
  await page.goto(origin+'/english/');await page.getByRole('heading',{name:'A little English. A clearer day.'}).waitFor();
  await page.goto(origin+'/english/#practice/__proto__');await page.getByRole('heading',{name:'A little English. A clearer day.'}).waitFor();
  await noOverflow();assert.equal(await page.getByRole('button',{name:'Start practice'}).count(),10);
  await page.screenshot({path:resolve(process.env.ENGLISH_QA_DIR||'../english-qa','home-mobile.png'),fullPage:true});
  await page.keyboard.press('Tab');assert.equal(await page.locator('.skip').evaluate(el=>el===document.activeElement),true);
  await nav('History');await page.getByRole('heading',{name:'Your first session starts here.'}).waitFor();
  await nav('Review');await page.getByRole('heading',{name:'No review items yet.'}).waitFor();
  await start();assert.equal(await page.locator('#finish').isDisabled(),true);assert.equal(await page.locator('.model').count(),0);assert.equal(await page.locator('#reveal').isDisabled(),true);
  await page.getByText('No local English voice is available.',{exact:false}).waitFor();assert.equal(await page.locator('#play').isDisabled(),true);
  await page.locator('#learn-done').click();await page.locator('#dialogue-done').click();
  await page.locator('#q-0-1').check();await page.locator('#check-0').click();await page.getByText('This item is saved in Review.',{exact:false}).waitFor();
  await page.locator('#response').fill('We are on track. I will send a brief update tomorrow.');await page.locator('#reveal').click();await page.locator('#rubric-0').check();
  await page.reload();await page.locator('#response').waitFor();assert.match(await page.locator('#response').inputValue(),/on track/);assert.equal(await page.locator('#rubric-0').isChecked(),true);assert.equal(await page.locator('#finish').isDisabled(),true);
  await page.locator('#rubric-1').check();await page.getByRole('radio',{name:'I’d like another try'}).check();assert.equal(await page.locator('#finish').isEnabled(),true);
  await page.locator('#finish').dblclick();await page.getByRole('heading',{name:'Practice complete.'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('english-practice-v1')).history.length),1);
  await page.reload();await nav('History');assert.equal(await page.locator('.history-item').count(),1);
  await nav('Review');assert.equal(await page.locator('.review-grid .panel').count(),2);
  await page.getByRole('radio',{name:'We’ll finish by Friday.',exact:true}).check();await page.getByRole('button',{name:'Check & review'}).click();assert.match(await page.locator('#review-status').innerText(),/Removed from review/);
  await page.getByRole('button',{name:'Comfortable now'}).click();await page.getByRole('heading',{name:'No review items yet.'}).waitFor();
  await nav('Practice');await page.getByRole('radio',{name:'10 minutes'}).check();await page.getByRole('radio',{name:'More challenge'}).check();await page.getByRole('button',{name:'Practise again'}).first().click();
  assert.equal(await page.locator('.question').count(),2);assert.equal(await page.locator('#finish').isDisabled(),true);await page.getByRole('button',{name:'Save & return',exact:true}).click();await page.getByRole('button',{name:'Resume session'}).click();assert.equal(await page.locator('.question').count(),2);
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:844});await noOverflow();}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(process.env.ENGLISH_QA_DIR||'../english-qa','session-mobile.png'),fullPage:true});
  await nav('My data');const before=await page.evaluate(()=>localStorage.getItem('english-practice-v1'));
  await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});await page.getByText('Invalid or incompatible progress file.',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('english-practice-v1')),before);
  await page.locator('#import-file').setInputFiles({name:'big.json',mimeType:'application/json',buffer:Buffer.from('x'.repeat(1000001))});await page.getByText('Choose a JSON backup no larger than 1 MB.',{exact:false}).waitFor();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Export my progress'}).click();const download=await downloaded;assert.equal(download.suggestedFilename(),'english-progress.json');
  const imported=JSON.parse(before);imported.drafts.status.response='<img src=x onerror=alert(1)> & original notes';
  await page.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});await page.getByRole('heading',{name:'Ready to restore'}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('english-practice-v1')),before);
  await page.getByRole('button',{name:'Replace English progress'}).click();await page.getByText('English progress restored.').waitFor();await nav('Practice');await page.getByRole('button',{name:'Resume session'}).click();assert.equal(await page.locator('#response').inputValue(),imported.drafts.status.response);assert.equal(await page.locator('img').count(),0);
  await page.evaluate(()=>{const other=document.createElement('iframe');other.src='/english/';other.id='second-tab';document.body.append(other);});await page.locator('#second-tab').waitFor();await page.frameLocator('#second-tab').locator('nav').getByRole('button',{name:'My data'}).waitFor();await page.frameLocator('#second-tab').locator('nav').getByRole('button',{name:'My data'}).click();
  await page.evaluate(()=>{const frame=document.querySelector('#second-tab');frame.contentWindow.localStorage.setItem('english-practice-v1',frame.contentWindow.localStorage.getItem('english-practice-v1')+' ');});await page.getByText('English data changed in another tab.',{exact:false}).waitFor();await page.evaluate(()=>document.querySelector('#second-tab').remove());await page.reload();
  await page.evaluate(()=>localStorage.setItem('other-app-test','preserve'));
  await nav('My data');page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Clear English data'}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('english-practice-v1')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('other-app-test')),'preserve');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const corrupt=await browser.newContext();await corrupt.addInitScript(()=>localStorage.setItem('english-practice-v1','broken'));const cp=await corrupt.newPage();await cp.goto(origin+'/english/');await cp.getByText('Saved progress could not be read.',{exact:false}).waitFor();await cp.getByRole('button',{name:'Start practice'}).first().click();assert.equal(await cp.evaluate(()=>localStorage.getItem('english-practice-v1')),'broken');await corrupt.close();
  const quota=await browser.newContext();await quota.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','QuotaExceededError');};});const qp=await quota.newPage();await qp.goto(origin+'/english/');await qp.getByRole('button',{name:'Start practice'}).first().click();await qp.getByText('Progress could not be saved in this browser.',{exact:false}).waitFor();await qp.locator('#response').fill('Still usable without storage.');assert.equal(await qp.locator('#response').inputValue(),'Still usable without storage.');await quota.close();
  const speech=await browser.newContext();await speech.addInitScript(()=>{
    window.spokenModels=[];window.cancelled=0;window.speechMode='complete';
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
    const nativeTimeout=window.setTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms===20000?500:ms,...args);
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Remote',lang:'en-US',localService:false,voiceURI:'remote'},{name:'Local test',lang:'en-GB',localService:true,voiceURI:'local'}],addEventListener(){},cancel(){window.cancelled++;},speak(u){window.lastUtterance=u;window.spokenModels.push({text:u.text,voice:u.voice.voiceURI});if(window.speechMode==='complete')queueMicrotask(()=>u.onend());else if(window.speechMode==='error')queueMicrotask(()=>u.onerror());}},configurable:true});
  });const sp=await speech.newPage();sp.on('pageerror',e=>errors.push(e.message));await sp.goto(origin+'/english/');await sp.getByRole('button',{name:'Start practice'}).first().click();assert.equal(await sp.locator('#voice option').count(),1);await sp.locator('#play').click();await sp.getByText('Dialogue finished.',{exact:false}).waitFor();assert.equal(await sp.evaluate(()=>window.spokenModels.length),4);assert.equal(await sp.evaluate(()=>window.spokenModels.every(m=>m.voice==='local')),true);assert.equal(await sp.locator('#dialogue-done').getAttribute('aria-pressed'),'false');
  await sp.evaluate(()=>window.speechMode='hold');await sp.locator('#play').click();await sp.getByRole('button',{name:'Stop',exact:true}).click();await sp.evaluate(()=>window.lastUtterance.onend());assert.equal(await sp.evaluate(()=>window.spokenModels.length),5);
  await sp.evaluate(()=>window.speechMode='error');await sp.locator('#play').click();await sp.getByText('Audio is unavailable or was interrupted.',{exact:false}).waitFor();
  await sp.evaluate(()=>window.speechMode='hold');await sp.locator('#play').click();await sp.getByText('Audio did not finish.',{exact:false}).waitFor();assert.equal(await sp.locator('#dialogue-done').getAttribute('aria-pressed'),'false');assert.deepEqual(errors,[]);await speech.close();
  await page.goto(origin+'/');await page.locator('#book-title').waitFor();await page.goto(origin+'/transit/');await page.locator('main').waitFor();
  console.log('PASS: mobile / keyboard, new & returning state, reload resume, honest audio fallback, local voice gate, gated and duplicate completion, review, 10-minute challenge, backup/import/XSS, cross-tab conflict, corrupt/quota storage, existing app entry points.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
