import test from 'node:test';
import assert from 'node:assert/strict';
import {extractArticle,articleText} from '../extract.mjs';
import {createHandler} from '../handler.mjs';
import {syntheticPage} from './fixtures.mjs';
const url='https://matters.town/a/synthetic123';const origin='https://reader.example';
const request=(body={url},extra={})=>new Request('https://service.example/api/matters',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body),...extra});
const upstream=html=>new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
test('extracts only matching active public article with author and license',()=>{
  const result=extractArticle(syntheticPage(),url);assert.equal(result.title,'Synthetic title');assert.equal(result.text,'First & paragraph.\n\nSecond section\n\nSecond paragraph.\nNext line.');assert.equal(result.source.author,'Example author');assert.equal(result.source.url,url);
});
test('HTML is parsed as inert data; scripts, forms, frames and hidden text omitted',()=>{
  assert.equal(articleText('<p>Hello <a href="javascript:alert(1)">link</a>.</p><script>bad()</script><iframe src="https://evil.test">secret</iframe><img src="https://evil.test/track"><p hidden>hidden</p><p aria-hidden="true">hidden</p><form>secret</form><p>Bye</p>'),'Hello link.\n\nBye');
});
test('nonpublic, unknown access, inactive, wrong article and malformed pages fail closed',()=>{
  for(const change of [{state:'archived'},{state:'banned'},{access:{circle:{id:'circle'},type:'paywall'}},{access:{circle:{id:'circle'}}},{access:{circle:null,type:'private'}},{access:{}},{access:null},{shortHash:'different123'},{contents:{html:''}},{author:null},{author:{displayName:'Example author',status:{state:'banned'}}},{author:{displayName:'Example author'}},{license:'invented'}])assert.throws(()=>extractArticle(syntheticPage(change),url));
  for(const html of ['<p>not article data</p>','<script id="__NEXT_DATA__">{</script>',syntheticPage()+syntheticPage()])assert.throws(()=>extractArticle(html,url));
  assert.doesNotThrow(()=>extractArticle(syntheticPage({access:{circle:{id:'circle'},type:'public'}}),url));
});
test('service fetches only fixed public host, with no credentials or redirects',async()=>{
  let seen;const handler=createHandler({allowedOrigin:origin,fetcher:async(target,options)=>{seen={target,options};return upstream(syntheticPage());}});
  const response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.json()).source.author,'Example author');assert.equal(seen.target,url);assert.equal(seen.options.redirect,'manual');assert.equal(seen.options.credentials,'omit');assert.deepEqual(Object.keys(seen.options.headers),['Accept']);
});
test('invalid inputs and disallowed origins never cause an upstream request',async()=>{
  let calls=0;const handler=createHandler({allowedOrigin:origin,fetcher:async()=>{calls++;return upstream(syntheticPage());}});
  for(const input of ['http://127.0.0.1/private','https://matters.town.evil.test/a/synthetic123','https://matters.town/a/%252fprivate'])assert.equal((await handler(request({url:input}))).status,400);
  assert.equal((await handler(request({}, {headers:{origin:'https://evil.test','Content-Type':'application/json'}}))).status,403);
  assert.equal((await handler(request({}, {headers:{'Content-Type':'application/json'}}))).status,403);
  assert.equal((await handler(request({}, {body:'x'.repeat(5000)}))).status,400);assert.equal(calls,0);
});
test('service never follows redirects or retries denied/private articles',async()=>{
  for(const status of [301,302,307,401,403,404,410]){let calls=0;const handler=createHandler({allowedOrigin:origin,fetcher:async()=>{calls++;return new Response('',{status,headers:{Location:'http://127.0.0.1/private'}});}});assert.notEqual((await handler(request())).status,200);assert.equal(calls,1);}
  const handler=createHandler({allowedOrigin:origin,fetcher:async()=>upstream(syntheticPage({access:{circle:{id:'locked'}}}))});assert.equal((await handler(request())).status,422);
});
test('bounded downloads, timeout and in-flight capacity reject without partial import',async()=>{
  const large=createHandler({allowedOrigin:origin,fetcher:async()=>new Response('body',{headers:{'Content-Type':'text/html','Content-Length':'4000001'}})});assert.equal((await large(request())).status,413);
  const slow=createHandler({allowedOrigin:origin,timeoutMs:5,fetcher:(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))});assert.equal((await slow(request())).status,504);
  let finish;const busy=createHandler({allowedOrigin:origin,maxConcurrent:1,fetcher:()=>new Promise(resolve=>{finish=resolve;})});const first=busy(request());await new Promise(resolve=>setImmediate(resolve));assert.equal((await busy(request())).status,429);finish(upstream(syntheticPage()));assert.equal((await first).status,200);
});
test('slow request bodies honor deadline and upstream network errors remain distinct',async()=>{
  const handler=createHandler({allowedOrigin:origin,timeoutMs:5,fetcher:async()=>{throw new Error('network');}});
  assert.equal((await handler(request())).status,502);
  const slow=new Request('https://service.example/api/matters',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:new ReadableStream({start(){}}),duplex:'half'});
  assert.equal((await handler(slow)).status,504);
});
