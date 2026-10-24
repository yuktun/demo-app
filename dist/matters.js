// Shared validation; importing this module never makes a network request.
export const MAX_ARTICLE_TEXT = 1_000_000;
export const MATTERS_ERRORS = {
  url: '請輸入 https://matters.town/a/… 格式嘅文章連結。',
  unavailable: '文章未能公開讀取，可能已刪除、只限會員，或 Matters 暫時拒絕存取。',
  format: '文章格式未受支援，未有匯入。你可以複製公開文章文字後貼上。',
  network: '暫時連接唔到文章服務，請稍後再試；亦可以貼上公開文章文字。',
  timeout: '讀取文章逾時，請稍後再試。',
  disabled: '文章連結匯入尚未啟用。你可以先複製公開文章文字，再使用下方貼上功能。',
  tooLarge: '文章太長，請改用貼上文字或 TXT 檔案。',
};
export function mattersURL(input) {
  if (typeof input !== 'string' || input.length > 2048 || /[\\\s\u0000-\u001f]/.test(input.trim())) throw new Error(MATTERS_ERRORS.url);
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error(MATTERS_ERRORS.url); }
  if (url.protocol !== 'https:' || url.hostname !== 'matters.town' || url.port || url.username || url.password || !/^\/a\/[A-Za-z0-9_-]{6,64}\/?$/.test(url.pathname)) throw new Error(MATTERS_ERRORS.url);
  return `https://matters.town${url.pathname.replace(/\/$/, '')}`;
}
const licenses = {
  cc_0: ['CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  cc_by_nc_nd_2: ['CC BY-NC-ND 2.0', 'https://creativecommons.org/licenses/by-nc-nd/2.0/'],
  cc_by_nc_nd_4: ['CC BY-NC-ND 4.0', 'https://creativecommons.org/licenses/by-nc-nd/4.0/'],
  arr: ['保留所有權利', ''],
};
export function sourceMetadata(source) {
  if (!source || source.provider !== 'matters' || typeof source.author !== 'string' || !source.author.trim() || source.author.length > 120 || !Object.hasOwn(licenses, source.license)) throw new Error(MATTERS_ERRORS.format);
  const url = mattersURL(source.url);
  return {provider:'matters',url,author:source.author.trim(),license:source.license};
}
export function licenseInfo(code) { return licenses[code] || ['授權資料未能確認', '']; }
export function validateArticle(article, requestedURL) {
  if (!article || typeof article.title !== 'string' || !article.title.trim() || article.title.length > 120 || typeof article.text !== 'string' || !article.text.trim() || article.text.length > MAX_ARTICLE_TEXT) throw new Error(MATTERS_ERRORS.format);
  const source = sourceMetadata(article.source);
  if (source.url !== mattersURL(requestedURL)) throw new Error(MATTERS_ERRORS.format);
  return {title:article.title.trim(),text:article.text,source};
}
export function mattersBookId(url) { return `matters-${mattersURL(url).split('/').at(-1)}`; }

// One active request, bounded response, and generation checks prevent canceled or
// obsolete responses from importing a book even when a transport ignores abort.
export class MattersRequest {
  constructor({endpoint,fetcher=globalThis.fetch,timeoutMs=12000}) { Object.assign(this,{endpoint,timeoutMs});this.fetcher=(...args)=>fetcher(...args);this.generation=0;this.controller=null; }
  cancel() { this.generation++;this.controller?.abort();this.controller=null; }
  async load(input) {
    this.cancel();
    const url=mattersURL(input);
    if(!this.endpoint)throw new Error(MATTERS_ERRORS.disabled);
    const generation=this.generation;const controller=new AbortController();this.controller=controller;
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},this.timeoutMs);
    try {
      const response=await this.fetcher(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),credentials:'omit',redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error([403,404,410,422].includes(response.status)?MATTERS_ERRORS.unavailable:response.status===413?MATTERS_ERRORS.tooLarge:MATTERS_ERRORS.network);
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error(MATTERS_ERRORS.format);
      const text=await boundedText(response,4_100_000,controller.signal);
      if(generation!==this.generation||controller.signal.aborted)throw new DOMException('Canceled','AbortError');
      let article;try{article=JSON.parse(text);}catch{throw new Error(MATTERS_ERRORS.format);}
      return validateArticle(article,url);
    } catch(error) {
      if(generation!==this.generation)throw new DOMException('Canceled','AbortError');
      if(timedOut)throw new Error(MATTERS_ERRORS.timeout);
      if(controller.signal.aborted)throw new DOMException('Canceled','AbortError');
      if(Object.values(MATTERS_ERRORS).includes(error.message))throw error;
      throw new Error(MATTERS_ERRORS.network);
    } finally {clearTimeout(timer);if(this.controller===controller)this.controller=null;}
  }
}
export async function boundedText(response,maxBytes,signal) {
  if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw new Error(MATTERS_ERRORS.tooLarge);}
  if(!response.body)throw new Error(MATTERS_ERRORS.format);
  const reader=response.body.getReader();const chunks=[];let size=0;
  const abort=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
  try{while(true){if(signal?.aborted)throw new DOMException('Canceled','AbortError');const {done,value}=await reader.read();if(signal?.aborted)throw new DOMException('Canceled','AbortError');if(done)break;size+=value.byteLength;if(size>maxBytes)throw new Error(MATTERS_ERRORS.tooLarge);chunks.push(value);}}finally{signal?.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error(MATTERS_ERRORS.format);}
}
