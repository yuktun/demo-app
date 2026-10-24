import {mattersURL,boundedText,MATTERS_ERRORS} from '../dist/matters.js';
import {extractArticle} from './extract.mjs';

const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
// Standards-based Request/Response handler. No cookies, tokens, arbitrary hosts,
// redirects, alternate endpoints, fallback proxies, article cache or body logs.
export function createHandler({allowedOrigin,fetcher=globalThis.fetch,timeoutMs=10000,maxConcurrent=2}={}){
  let active=0;
  return async request=>{
    const origin=request.headers.get('origin');
    if(!allowedOrigin||origin!==allowedOrigin)return json({error:'origin'},403);
    const cors={'Access-Control-Allow-Origin':allowedOrigin,'Vary':'Origin'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    if(request.method!=='POST')return json({error:'method'},405,{...cors,'Allow':'POST, OPTIONS'});
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'content-type'},415,cors);
    if(active>=maxConcurrent)return json({error:'busy'},429,{...cors,'Retry-After':'10'});
    active++;
    const timeout=new AbortController();const abort=()=>timeout.abort();request.signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,timeoutMs);
    let stage='request';
    try{
      if(request.signal.aborted)throw new DOMException('Canceled','AbortError');
      let input;try{input=JSON.parse(await boundedText(request,4096,timeout.signal));}catch(error){if(timeout.signal.aborted)throw error;return json({error:'request'},400,cors);}
      let url;try{url=mattersURL(input.url);}catch{return json({error:'url'},400,cors);}
      stage='fetch';
      const response=await fetcher(url,{method:'GET',redirect:'manual',credentials:'omit',headers:{'Accept':'text/html'},signal:timeout.signal});
      // Redirect targets are never followed, including same-host redirects.
      if(response.status!==200){await response.body?.cancel();return json({error:'unavailable'},[401,403,404,410].includes(response.status)?422:502,cors);}
      if(response.url&&response.url!==url)return json({error:'redirect'},422,cors);
      if(!response.headers.get('content-type')?.includes('text/html'))return json({error:'format'},422,cors);
      const html=await boundedText(response,4_000_000,timeout.signal);
      if(timeout.signal.aborted)throw new DOMException('Canceled','AbortError');
      stage='parse';
      return json(extractArticle(html,url),200,cors);
    }catch(error){return json({error:error.message===MATTERS_ERRORS.tooLarge?'too-large':timeout.signal.aborted?'timeout':stage==='fetch'?'network':'unavailable'},error.message===MATTERS_ERRORS.tooLarge?413:timeout.signal.aborted?504:stage==='fetch'?502:422,cors);}
    finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);active--;}
  };
}
