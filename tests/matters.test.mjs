import test from 'node:test';
import assert from 'node:assert/strict';
import {mattersURL,mattersBookId,sourceMetadata,validateArticle,MattersRequest,boundedText,MATTERS_ERRORS} from '../dist/matters.js';
const url='https://matters.town/a/synthetic123';
const article={title:'Synthetic article',text:'First paragraph.\n\nSecond paragraph.',source:{provider:'matters',url,author:'Example author',license:'cc_by_nc_nd_4'}};
const response=()=>new Response(JSON.stringify(article),{headers:{'Content-Type':'application/json'}});
test('Matters URLs restrict scheme, exact host, credentials, port and article path',()=>{
  assert.equal(mattersURL(url+'/?utm_source=share#comment'),url);
  assert.equal(mattersBookId(url),'matters-synthetic123');
  for(const bad of ['http://matters.town/a/synthetic123','https://matters.town.evil.test/a/synthetic123','https://user@matters.town/a/synthetic123','https://matters.town:444/a/synthetic123','https://matters.town/@author','https://matters.town/a/%2fsecret','https://127.0.0.1/a/synthetic123','javascript:alert(1)','https://matters.town\\@evil.test/a/synthetic123','https://matters.town/a/../private',null])assert.throws(()=>mattersURL(bad));
});
test('source and response identity are validated, including unknown license',()=>{
  assert.deepEqual(validateArticle(article,url),article);
  assert.throws(()=>validateArticle(article,url.replace('synthetic123','different123')));
  assert.throws(()=>sourceMetadata({...article.source,license:'invented'}));
  assert.throws(()=>validateArticle({...article,text:''},url));
  assert.throws(()=>validateArticle({...article,title:'x'.repeat(121)},url));
});
test('import request sends only canonical URL, omits credentials and blocks redirects',async()=>{
  let seen;const request=new MattersRequest({endpoint:'/api/matters',fetcher:async(endpoint,options)=>{seen={endpoint,options};return response();}});
  assert.deepEqual(await request.load(url+'?tracking=yes'),article);
  assert.equal(seen.options.credentials,'omit');assert.equal(seen.options.redirect,'error');assert.deepEqual(JSON.parse(seen.options.body),{url});
});
test('disabled importer never sends a request',async()=>{
  let calls=0;await assert.rejects(new MattersRequest({endpoint:'',fetcher:()=>calls++}).load(url),{message:MATTERS_ERRORS.disabled});assert.equal(calls,0);
});
test('browser fetch is called without the importer as receiver',async()=>{
  let receiver='unset';const request=new MattersRequest({endpoint:'/api/matters',fetcher:async function(){receiver=this;return response();}});
  await request.load(url);assert.equal(receiver,undefined);
});
test('cancel and replacement suppress a stale transport that ignores abort',async()=>{
  const pending=[];const request=new MattersRequest({endpoint:'/api/matters',fetcher:()=>new Promise(resolve=>pending.push(resolve))});
  const first=request.load(url);const firstResult=assert.rejects(first,{name:'AbortError'});
  const second=request.load(url);pending[0](response());await firstResult;pending[1](response());assert.deepEqual(await second,article);
  const third=request.load(url);const thirdResult=assert.rejects(third,{name:'AbortError'});request.cancel();pending[2](response());await thirdResult;
});
test('timeout, network errors, denied and malformed responses stay actionable',async()=>{
  const slow=new MattersRequest({endpoint:'/api/matters',timeoutMs:5,fetcher:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))});
  await assert.rejects(slow.load(url),{message:MATTERS_ERRORS.timeout});
  for(const [fetcher,message]of [[async()=>{throw new Error('network');},MATTERS_ERRORS.network],[async()=>new Response('{}',{status:403}),MATTERS_ERRORS.unavailable],[async()=>new Response('<html>'),MATTERS_ERRORS.format],[async()=>new Response('{',{headers:{'Content-Type':'application/json'}}),MATTERS_ERRORS.format]])await assert.rejects(new MattersRequest({endpoint:'/api/matters',fetcher}).load(url),{message});
});
test('response limit counts streamed bytes and rejects corrupt UTF-8',async()=>{
  await assert.rejects(boundedText(new Response('abcdef'),3),{message:MATTERS_ERRORS.tooLarge});
  await assert.rejects(boundedText(new Response(new Uint8Array([255])),3),{message:MATTERS_ERRORS.format});
});
test('abort interrupts a stalled response stream without waiting for another chunk',async()=>{
  const controller=new AbortController();const response=new Response(new ReadableStream({start(){}}));
  const result=assert.rejects(boundedText(response,100,controller.signal),{name:'AbortError'});controller.abort();await result;
});
