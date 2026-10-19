// App lifecycle acceptance uses mocked speech and explicit visibility events.
// NATIVE_SPEECH=1 instead opens an isolated headed browser, uses its real local
// Chinese voice, and minimizes/restores its window. No system settings change.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const out=resolve(process.env.BACKGROUND_QA_DIR||'qa/background');await mkdir(out,{recursive:true});
const native=process.env.NATIVE_SPEECH==='1';
const report={mode:native?'headed native speech':'headless mocked speech / simulated visibility',checks:[],limitations:[],pageErrors:[]};
const check=(label,condition)=>{assert.ok(condition,label);report.checks.push(label);console.log('PASS '+label);};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;const file=resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));if(!file.startsWith(root.replace(/[\\/]$/,'')+sep)){res.writeHead(403);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/`;
const edge=`${process.env['ProgramFiles(x86)']||'C:/Program Files (x86)'}/Microsoft/Edge/Application/msedge.exe`;
let browser;let lastPage;
try{
  browser=await chromium.launch({headless:!native,executablePath:process.env.BROWSER_PATH||(existsSync(edge)?edge:undefined),...(native?{ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await context.newPage();lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));
  if(!native)await page.addInitScript(()=>{
    let hidden=false;
    Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
    window.__visibility=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'));};
    const utterances=[];const voice={name:'Synthetic local voice',voiceURI:'synthetic-zh',lang:'zh-HK',localService:true};
    window.__speech={utterances,cancels:0,end:index=>utterances[index].onend?.(),boundary:(index,charIndex)=>utterances[index].onboundary?.({charIndex}),interrupt:index=>utterances[index].onerror?.({error:'interrupted'})};
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[voice],addEventListener(){},cancel(){window.__speech.cancels++;},speak(u){utterances.push(u);queueMicrotask(()=>u.onstart?.());}}});
  });
  await page.goto(base);await page.locator('.segment').first().waitFor();
  const importText=async text=>{await page.locator('#open-import').click();await page.locator('#paste-title').fill('Synthetic background reading');await page.locator('#paste-text').fill(text);await page.locator('#import-paste').click();await page.locator('#import-dialog').waitFor({state:'hidden'});};
  const state=()=>page.evaluate(()=>({label:document.querySelector('#play').getAttribute('aria-label'),status:document.querySelector('#player-status').textContent,chapter:document.querySelector('#chapter-title').textContent,spoken:window.__speech?.utterances.length,cancels:window.__speech?.cancels,saved:JSON.parse(localStorage.getItem('tingye-reader-v1')),hidden:document.hidden}));
  if(native){
    await page.waitForFunction(()=>speechSynthesis.getVoices().length>0,{},{timeout:7000}).catch(()=>{});
    const voices=await page.evaluate(()=>speechSynthesis.getVoices().filter(v=>v.localService&&/^(zh|yue|cmn)([-_]|$)/i.test(v.lang)).map(v=>({name:v.name,lang:v.lang,localService:v.localService})));
    report.voices=voices;
    const cdp=await context.newCDPSession(page);const {windowId}=await cdp.send('Browser.getWindowForTarget');
    if(!voices.length){
      report.limitations.push('No browser-labelled local Chinese/Cantonese voice is available in this isolated Windows Edge environment; native speech cannot be verified.');
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForFunction(()=>document.hidden,{},{polling:100,timeout:10000});check('actual headed window minimizes to hidden',await page.evaluate(()=>document.hidden));
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();await page.waitForFunction(()=>!document.hidden);check('actual headed window restores to visible',await page.evaluate(()=>!document.hidden));
      console.log('LIMITATION '+report.limitations[0]);
    }else{
      await page.evaluate(()=>{
        const synth=speechSynthesis;const speak=synth.speak.bind(synth);window.__nativeTrace=[];
        synth.speak=u=>{const id=window.__nativeTrace.filter(e=>e.event==='enqueue').length;window.__nativeTrace.push({event:'enqueue',id,hidden:document.hidden});for(const event of ['start','end','error','pause','resume'])u.addEventListener(event,e=>window.__nativeTrace.push({event,id,hidden:document.hidden,error:e.error}));speak(u);};
        document.addEventListener('visibilitychange',()=>window.__nativeTrace.push({event:'visibility',hidden:document.hidden}));
      });
      await importText('第一章 背景測試\n這是合成測試的第一段文字。\n\n這是合成測試的第二段文字。\n第二章 下一章\n這是合成測試的第三段文字。\n\n這是合成測試的最後一段文字。');
      await page.locator('#play').click();await page.waitForFunction(()=>window.__nativeTrace.some(e=>e.event==='start'),{},{timeout:15000});check('native local Chinese speech starts',true);
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});report.minimizedBounds=await cdp.send('Browser.getWindowBounds',{windowId});
      const hiddenOnMinimize=await page.waitForFunction(()=>document.hidden,{},{polling:100,timeout:2500}).then(()=>true,()=>false);
      if(hiddenOnMinimize){
        check('native page becomes hidden after minimize',true);
        await page.waitForFunction(()=>window.__nativeTrace.some(e=>e.event==='end'&&e.hidden)&&window.__nativeTrace.filter(e=>e.event==='start').length>=2,{},{polling:100,timeout:45000});
        check('native speech ends one segment and starts the next while minimized',true);
      }else{
        report.limitations.push('CDP reports a minimized window, but this execution environment keeps document.visibilityState visible. Native minimized-window speech progression is observable, but hidden-window semantics require validation on the user desktop.');
        await page.waitForFunction(()=>window.__nativeTrace.some(e=>e.event==='end')&&window.__nativeTrace.filter(e=>e.event==='start').length>=2,{},{polling:100,timeout:45000});
        check('native speech progresses while window bounds report minimized (renderer remains visible)',true);
      }
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});await page.bringToFront();await page.waitForFunction(()=>!document.hidden);
      const other=await context.newPage();await other.bringToFront();
      const hiddenOnTab=await page.waitForFunction(()=>document.hidden,{},{polling:100,timeout:2500}).then(()=>true,()=>false);
      if(hiddenOnTab){
        const endedBefore=await page.evaluate(()=>window.__nativeTrace.filter(e=>e.event==='end').length);
        await page.waitForFunction(count=>window.__nativeTrace.filter(e=>e.event==='end'&&e.hidden).length>0&&window.__nativeTrace.filter(e=>e.event==='end').length>count,endedBefore,{polling:100,timeout:45000});check('native speech progresses with another tab active and renderer hidden',true);
        check('native background speech crosses to next chapter',(await page.locator('#chapter-title').innerText()).includes('下一章'));
        await page.evaluate(()=>document.querySelector('#play').click());const speechCount=await page.evaluate(()=>window.__nativeTrace.filter(e=>e.event==='enqueue').length);check('explicit native pause command while hidden is honored',(await state()).label==='開始朗讀');
        await page.evaluate(()=>document.querySelector('#stop').click());await other.close();await page.bringToFront();check('restore after native pause/stop queues no new speech',await page.evaluate(count=>window.__nativeTrace.filter(e=>e.event==='enqueue').length===count,speechCount));
      }else{
        report.limitations.push('The automated tab switch also leaves renderer visibility visible; native hidden-tab speech cannot be verified in this environment.');await other.close();await page.bringToFront();
      }
      await page.locator('#stop').click();report.nativeTrace=await page.evaluate(()=>window.__nativeTrace);report.limitations.push('Native event callbacks observed; audible output was not independently listened to. Phone lock screen, sleep and discarded tabs not tested.');
    }
    await cdp.detach();
  }else{
    await importText('第一章 背景測試\n第一段背景文字。\n\n第二段背景文字。\n第二章 下一章\n第三段背景文字。\n\n最後一段背景文字。');
    await page.locator('#play').click();const initial=await state();check('explicit Play starts one utterance',initial.spoken===1&&initial.label==='暫停朗讀');
    await page.evaluate(()=>{__speech.boundary(0,3);for(let i=0;i<8;i++){__visibility(true);window.dispatchEvent(new Event('blur'));__visibility(false);}__visibility(true);});
    let current=await state();check('repeated hide/show and blur neither cancel nor duplicate speech',current.spoken===1&&current.cancels===initial.cancels&&current.label==='暫停朗讀');
    await page.evaluate(()=>__speech.end(0));current=await state();check('hidden completion advances exactly one segment',current.spoken===2&&current.status.includes('2 / 2'));
    await page.evaluate(()=>__speech.end(0));check('duplicate end callback cannot skip a segment',(await state()).spoken===2);
    await page.evaluate(()=>__speech.end(1));current=await state();check('hidden completion crosses chapter boundary',current.spoken===3&&current.chapter.includes('下一章'));
    check('hidden progress is saved',current.saved.positions[current.saved.bookId].position.chapter===1);
    await page.evaluate(()=>{__speech.boundary(2,2);document.querySelector('#play').click();});const paused=await state();check('explicit pause while hidden is honored',paused.label==='開始朗讀');
    await page.evaluate(()=>{__speech.end(2);__visibility(false);__visibility(false);});check('return after pause never restarts or advances',(await state()).spoken===3&&(await state()).status===paused.status);
    await page.locator('#play').click();check('manual resume uses last boundary',await page.evaluate(()=>__speech.utterances[3].text===__speech.utterances[2].text.slice(2)));
    await page.evaluate(()=>{__speech.boundary(3,1);__speech.interrupt(3);__visibility(true);__visibility(false);});const interrupted=await state();check('interruption stays paused without automatic retry',interrupted.label==='開始朗讀'&&interrupted.spoken===4);
    await page.locator('#play').click();check('explicit Play can resume after interruption',(await state()).spoken===5);
    await page.evaluate(()=>{__visibility(true);document.querySelector('#stop').click();__speech.end(4);__visibility(false);});const stopped=await state();check('stop while hidden prevents stale completion and auto restart',stopped.spoken===5&&stopped.label==='開始朗讀');
    await page.locator('#play').click();await page.evaluate(()=>{__visibility(true);window.dispatchEvent(new PageTransitionEvent('pagehide'));});const navigation=await state();check('actual page-exit handler still pauses and persists',navigation.label==='開始朗讀'&&navigation.saved.bookId);
    await page.evaluate(()=>{__visibility(false);window.dispatchEvent(new PageTransitionEvent('pageshow'));});check('page restore does not auto-start',(await state()).spoken===6);
    await page.locator('#play').click();await page.evaluate(()=>{__visibility(true);__speech.end(6);__speech.end(7);});current=await state();check('final hidden completion ends once at 100 percent',current.label==='開始朗讀'&&await page.locator('#overall-progress').innerText()==='100%');
    await page.evaluate(()=>{__speech.end(7);__visibility(false);__visibility(false);});check('return after completion does not loop',(await state()).spoken===8);
    await page.reload();await page.locator('#book-title').filter({hasText:'Synthetic background reading'}).waitFor();check('refresh preserves final position and completion',await page.locator('#overall-progress').innerText()==='100%');
    await page.locator('#open-settings').click();check('settings still open',await page.locator('#settings-dialog').isVisible());await page.keyboard.press('Escape');
    await page.locator('#font-up').click();await page.locator('#font-down').click();
    for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});if(width<=720){await page.locator('#chapters-toggle').press('Enter');await page.locator('#chapters-close').press('Escape');check(width+' menu restores keyboard focus',await page.evaluate(()=>document.activeElement.id)==='chapters-toggle');}check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,`reader-${width}.png`)});}
    report.limitations.push('Speech engine and visibility are mocked in deterministic tests; these assertions do not establish audible background playback.');
  }
  check('no browser page errors',report.pageErrors.length===0);
}catch(error){report.error=error.message;throw error;}
finally{if(native&&lastPage&&!lastPage.isClosed()){report.nativeTrace=await lastPage.evaluate(()=>window.__nativeTrace||[]).catch(()=>[]);report.finalVisibility=await lastPage.evaluate(()=>document.visibilityState).catch(()=>null);}await writeFile(resolve(out,native?'native-report.json':'mock-report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();server.close();}
