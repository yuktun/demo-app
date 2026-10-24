import {parse,parseFragment} from 'parse5';
import {mattersURL,MAX_ARTICLE_TEXT,MATTERS_ERRORS,validateArticle} from '../dist/matters.js';

const blocked=new Set(['script','style','noscript','template','iframe','object','embed','svg','math','form','nav','button','input','textarea','select']);
const blocks=new Set(['p','div','section','article','h1','h2','h3','h4','h5','h6','li','ul','ol','blockquote','pre','tr','figure','figcaption','hr']);
export function articleText(html) {
  if(typeof html!=='string'||html.length>2_000_000)throw new Error(MATTERS_ERRORS.format);
  const out=[];
  function visit(node,depth=0){
    if(depth>100)throw new Error(MATTERS_ERRORS.format);
    if(blocked.has(node.tagName)||node.attrs?.some(a=>a.name==='hidden'||(a.name==='aria-hidden'&&a.value==='true')))return;
    if(node.nodeName==='#text'){out.push(node.value.replace(/\s+/g,' '));return;}
    if(node.tagName==='br'){out.push('\n');return;}
    if(blocks.has(node.tagName))out.push('\n\n');
    for(const child of node.childNodes||[])visit(child,depth+1);
    if(node.tagName==='td'||node.tagName==='th')out.push(' ');
    if(blocks.has(node.tagName))out.push('\n\n');
  }
  visit(parseFragment(html));
  const text=out.join('').replace(/[ \t]*\n[ \t]*/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!text||text.length>MAX_ARTICLE_TEXT)throw new Error(MATTERS_ERRORS.format);
  return text;
}
export function extractArticle(pageHTML,inputURL){
  const url=mattersURL(inputURL);const shortHash=url.split('/').at(-1);
  const root=parse(pageHTML);const scripts=[];
  function find(node){if(node.tagName==='script'&&node.attrs?.some(a=>a.name==='id'&&a.value==='__NEXT_DATA__'))scripts.push(node);for(const child of node.childNodes||[])find(child);}
  find(root);if(scripts.length!==1)throw new Error(MATTERS_ERRORS.format);
  let data;try{data=JSON.parse(scripts[0].childNodes.map(n=>n.value||'').join(''));}catch{throw new Error(MATTERS_ERRORS.format);}
  const refs=new Map();const articles=[];let count=0;
  function collect(value,depth=0){
    if(depth>60||++count>100000)throw new Error(MATTERS_ERRORS.format);
    if(!value||typeof value!=='object')return;
    if(value.__typename==='Article'&&value.shortHash===shortHash)articles.push(value);
    for(const [key,item]of Object.entries(value)){if(item&&typeof item==='object'&&key.includes(':')){if(refs.has(key)&&JSON.stringify(refs.get(key))!==JSON.stringify(item))throw new Error(MATTERS_ERRORS.format);refs.set(key,item);}collect(item,depth+1);}
  }
  collect(data);
  const resolve=value=>value&&typeof value==='object'&&typeof value.__ref==='string'?refs.get(value.__ref):value;
  if(articles.length!==1)throw new Error(MATTERS_ERRORS.unavailable);
  const article=articles[0];const access=resolve(article.access);const author=resolve(article.author);const authorStatus=resolve(author?.status);const contents=resolve(article.contents);
  // Unknown/missing access information fails closed. No circle means public in
  // Matters' public article view; a circle needs explicit public access type.
  if(article.state!=='active'||!access||!Object.hasOwn(access,'circle')||(access.type&&access.type!=='public')||(access.circle!==null&&access.type!=='public')||!author||authorStatus?.state!=='active')throw new Error(MATTERS_ERRORS.unavailable);
  return validateArticle({title:article.title,text:articleText(contents?.html),source:{provider:'matters',url,author:author.displayName,license:article.license}},url);
}
