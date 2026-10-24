// Local acceptance test. Uses synthetic upstream HTML only, no Matters requests.
// npm --prefix importer ci first. Set PLAYWRIGHT_PATH / BROWSER_PATH if needed.
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createPreviewServer} from '../importer/server.mjs';
import {syntheticPage,articleURL} from '../importer/tests/fixtures.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=resolve(process.env.MATTERS_QA_DIR||'qa/matters');await mkdir(out,{recursive:true});
let calls=0;let mode='success';let release;
const fetcher=async(url,{signal})=>{
  calls++;assert.equal(url,articleURL);
  if(mode==='slow')return new Promise(resolve=>{release=()=>resolve(new Response(syntheticPage(),{headers:{'Content-Type':'text/html'}}));signal.addEventListener('abort',()=>resolve(new Response('',{status:499})));});
  if(mode==='denied')return new Response('',{status:403});
  if(mode==='private')return new Response(syntheticPage({access:{circle:{id:'locked'},type:'paywall'}}),{headers:{'Content-Type':'text/html'}});
  if(mode==='network')throw new Error('synthetic network failure');
  return new Response(syntheticPage(),{headers:{'Content-Type':'text/html'}});
};
const server=createPreviewServer({fetcher,onError:error=>console.error('Preview error:',error.message)});await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
const defaultEdge=`${process.env['ProgramFiles(x86)']||'C:/Program Files (x86)'}/Microsoft/Edge/Application/msedge.exe`;
let browser;let checks=0;
const check=(label,condition)=>{assert.ok(condition,label);checks++;console.log('PASS '+label);};
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||(existsSync(defaultEdge)?defaultEdge:undefined)});
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];const external=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>{if(!req.url().startsWith(base)&&!req.url().startsWith('data:'))external.push(req.url());});
    page.on('console',message=>{if(message.type()==='error')console.error('Browser:',message.text());});
    // Deterministic local TTS engine: exercises reader transport and never speaks.
    await page.addInitScript(()=>{
      const local={name:'Synthetic local Chinese',voiceURI:'synthetic-zh',lang:'zh-HK',localService:true};
      Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}}});
      Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[local],addEventListener(){},cancel(){},speak(u){queueMicrotask(()=>u.onstart?.());}}});
    });
    await page.goto(base);await page.locator('.segment').first().waitFor();
    const open=async()=>{await page.locator('#open-import').click();await page.locator('#import-dialog').waitFor({state:'visible'});};
    await open();await page.locator('#matters-url').fill('https://evil.example/a/synthetic123');await page.locator('#matters-url').press('Enter');
    check(width+' invalid URL visible error',await page.locator('#matters-error').isVisible());
    const before=calls;await page.locator('#matters-url').fill(articleURL+'?utm_source=share');await page.locator('#matters-url').press('Enter');
    await Promise.race([page.locator('#import-dialog').waitFor({state:'hidden'}),page.locator('#matters-error').waitFor({state:'visible'}).then(async()=>{throw new Error(await page.locator('#matters-error').innerText());})]);await page.locator('#book-title').filter({hasText:'Synthetic title'}).waitFor();
    check(width+' one explicit public request',calls===before+1);
    if(width<=720)await page.locator('#chapters-toggle').click();
    check(width+' attribution source',await page.locator('#article-source a').first().getAttribute('href')===articleURL);
    check(width+' attribution author/license',/Example author/.test(await page.locator('#article-source').innerText())&&/CC BY-NC-ND 4.0/.test(await page.locator('#article-source').innerText()));
    await page.screenshot({path:resolve(out,`source-${width}.png`)});
    if(width<=720)await page.locator('#chapters-close').click();
    await page.locator('#next-segment').click();const status=await page.locator('#player-status').innerText();
    await page.locator('#play').click();await page.getByRole('button',{name:'暫停朗讀',exact:true}).waitFor();await page.locator('#play').click();
    await page.locator('#stop').click();
    await open();await page.locator('#matters-url').fill(articleURL);const repeatCalls=calls;await page.locator('#import-matters').click();await page.locator('#import-dialog').waitFor({state:'hidden'});
    check(width+' repeat URL reuses book without refetch',calls===repeatCalls);
    check(width+' repeat import retains segment',/2 \/ 4/.test(await page.locator('#player-status').innerText())||status.split('·').at(-1)===(await page.locator('#player-status').innerText()).split('·').at(-1));
    await page.reload();await page.locator('#book-title').filter({hasText:'Synthetic title'}).waitFor();
    check(width+' reload retains book and position',(await page.locator('#player-status').innerText()).includes(status.split('·').at(-1).trim()));
    if(width<=720){await page.locator('#chapters-toggle').click();check(width+' reload retains attribution',(await page.locator('#article-source').innerText()).includes('Example author'));await page.locator('#chapters-close').click();}
    // Existing paste import remains local and independent of URL import.
    await open();await page.locator('#paste-title').fill('Synthetic pasted book');await page.locator('#paste-text').fill('第一章 合成測試\n測試文字第一段。\n\n測試文字第二段。');await page.locator('#import-paste').click();await page.locator('#import-dialog').waitFor({state:'hidden'});
    check(width+' paste import preserved',(await page.locator('#chapter-title').innerText()).includes('合成測試'));
    await open();await page.locator('#book-file').setInputFiles({name:'synthetic.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 檔案測試\n合成檔案文字。')});await page.locator('#import-dialog').waitFor({state:'hidden'});
    check(width+' TXT import preserved',(await page.locator('#chapter-title').innerText()).includes('檔案測試'));
    await page.locator('#open-settings').click();check(width+' settings preserved',await page.locator('#settings-dialog').isVisible());await page.keyboard.press('Escape');
    check(width+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    // Use another clean context so no deduplicated book hides service errors.
    const fresh=await context.newPage();await fresh.goto(base);await fresh.locator('.segment').first().waitFor();await fresh.locator('#open-import').click();await fresh.locator('#matters-url').fill(articleURL);
    // IndexedDB is shared, so remove the synthetic article in this test context.
    if(width<=720){await fresh.keyboard.press('Escape');await fresh.locator('#chapters-toggle').click();}else await fresh.keyboard.press('Escape');
    await fresh.locator('#book-select').selectOption('matters-synthetic123');await fresh.locator('#delete-book').click();await fresh.locator('#confirm-delete').click();await fresh.locator('#delete-dialog').waitFor({state:'hidden'});if(width<=720)await fresh.locator('#chapters-close').click();
    await fresh.locator('#open-import').click();
    for(const failure of ['denied','private','network']){mode=failure;await fresh.locator('#import-matters').click();await fresh.locator('#matters-error').waitFor({state:'visible'});check(width+' '+failure+' does not replace book',(await fresh.locator('#import-dialog').isVisible())&&(await fresh.locator('#book-title').innerText())!=='Synthetic title');}
    mode='slow';await fresh.locator('#import-matters').click();await fresh.locator('#cancel-matters').waitFor({state:'visible'});await fresh.locator('#cancel-matters').click();release?.();
    check(width+' cancel restores keyboard focus',await fresh.evaluate(()=>document.activeElement.id)==='matters-url');
    check(width+' cancel remains in import dialog',await fresh.locator('#import-dialog').isVisible());
    await fresh.locator('#import-matters').click();await fresh.locator('#cancel-matters').waitFor({state:'visible'});await fresh.keyboard.press('Escape');release?.();await fresh.locator('#import-dialog').waitFor({state:'hidden'});check(width+' Escape cancels request',await fresh.locator('#cancel-matters').isHidden());
    await fresh.locator('#open-import').click();await fresh.locator('#import-matters').click();await fresh.locator('#cancel-matters').waitFor({state:'visible'});await fresh.locator('#paste-title').fill('Synthetic replacement');await fresh.locator('#paste-text').fill('合成替代文字。');await fresh.locator('#import-paste').click();release?.();await fresh.locator('#import-dialog').waitFor({state:'hidden'});check(width+' newer paste import wins over stale article',(await fresh.locator('#book-title').innerText())==='Synthetic replacement');
    mode='success';await fresh.locator('#open-import').click();await fresh.screenshot({path:resolve(out,`import-${width}.png`)});
    check(width+' no remote resources',external.length===0);check(width+' no page errors',errors.length===0);
    await context.close();
  }
  const disabledServer=createPreviewServer({enableImporter:false});await new Promise(done=>disabledServer.listen(0,'127.0.0.1',done));
  try{
    const page=await browser.newPage();const requests=[];page.on('request',req=>{if(req.url().includes('/api/'))requests.push(req.url());});
    await page.goto(`http://127.0.0.1:${disabledServer.address().port}/`);await page.locator('.segment').first().waitFor();await page.locator('#open-import').click();
    check('production config keeps URL import disabled',await page.locator('#import-matters').isDisabled());check('disabled setup explains paste alternative',(await page.locator('#matters-status').innerText()).includes('尚未啟用'));
    await page.locator('#matters-url').fill(articleURL);await page.locator('#matters-url').press('Enter');check('disabled URL Enter sends no request',requests.length===0);
    await page.locator('#paste-title').fill('Offline paste');await page.locator('#paste-text').fill('合成離線文字。');await page.locator('#import-paste').click();await page.locator('#import-dialog').waitFor({state:'hidden'});check('production paste works without service',(await page.locator('#book-title').innerText())==='Offline paste');
    check('production CSP remains network-closed',await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content').then(value=>value.includes("connect-src 'none'")));
    await page.close();
  }finally{disabledServer.close();}
  console.log(`PASS ${checks} browser assertions`);
}finally{if(browser)await browser.close();server.close();}
