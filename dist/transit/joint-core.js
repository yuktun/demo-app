import {distance,hkTime,OPERATORS} from './core.js';

export function normalName(value='') {
  return String(value).toUpperCase().replace(/\([A-Z]{1,3}\d{3,4}\)/g,'').replace(/（[A-Z]{1,3}\d{3,4}）/g,'')
    .replace(/巴士總站|巴士站|總站|BUS TERMINUS|BUS STOP|TERMINUS/g,'').replace(/[^\p{L}\p{N}]/gu,'');
}
export function similarName(a,b) {
  const pairs=[[normalName(a.name?.split(/[,，]/)[0]),normalName(b.name?.split(/[,，]/)[0])],[normalName(a.en?.split(',')[0]),normalName(b.en?.split(',')[0])]];
  return pairs.some(([x,y])=>Math.min(x.length,y.length)>=2&&(x.includes(y)||y.includes(x)));
}
export function nearStops(a,b,max=45) {
  return a?.coords?.length===2&&b?.coords?.length===2&&a.coords.every(Number.isFinite)&&b.coords.every(Number.isFinite)&&distance(...a.coords,...b.coords)<=max;
}
export function alignToRegistry(primary,official) {
  const n=primary.length,m=official.length;
  if(n<3||m<3)return null;
  const edges=primary.map(a=>official.map(b=>nearStops(a,b,80)&&(b.names.some(name=>similarName(a,{name}))||b.en.some(en=>similarName(a,{en})))));
  const left=Array.from({length:n+1},()=>Array(m+1).fill(0)),right=Array.from({length:n+1},()=>Array(m+1).fill(0));
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)left[i+1][j+1]=Math.max(left[i][j+1],left[i+1][j],edges[i][j]?left[i][j]+1:0);
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)right[i][j]=Math.max(right[i+1][j],right[i][j+1],edges[i][j]?right[i+1][j+1]+1:0);
  const score=left[n][m];if(score<3)return null;
  const choices=primary.map(()=>[]),reverse=official.map(()=>[]);
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(edges[i][j]&&left[i][j]+1+right[i+1][j+1]===score){choices[i].push(j);reverse[j].push(i);}
  const matches=new Map(),byOfficial=new Map();
  for(let i=0;i<n;i++){const [j]=choices[i];if(choices[i].length===1&&reverse[j].length===1){matches.set(`${primary[i].stop}|${primary[i].seq}`,j);byOfficial.set(j,primary[i]);}}
  return {score,matches,byOfficial};
}
export function verifiedPartner(primary,partner,sourceStop,groups,bank) {
  const selected=primary.find(s=>s.stop===sourceStop.stop&&s.seq===sourceStop.seq);if(!selected)return null;
  const candidates=[];
  for(const group of groups) {
    const official=group.stops.map(([seq,id])=>({...bank[id],seq}));
    const a=alignToRegistry(primary,official),b=alignToRegistry(partner,official);if(!a||!b)continue;
    const position=a.matches.get(`${sourceStop.stop}|${sourceStop.seq}`);if(position===undefined)continue;
    const target=b.byOfficial.get(position);if(!target||!nearStops(selected,target,80))continue;
    // A single shared official station, not merely the closest company stop.
    candidates.push({target,score:a.score+b.score,company:group.company,officialId:group.stops[position][1]});
  }
  if(!candidates.length)return null;
  const max=Math.max(...candidates.map(c=>c.score)),best=candidates.filter(c=>c.score===max);
  const keys=new Set(best.map(c=>`${c.target.stop}|${c.target.seq}`));
  return keys.size===1?best[0]:null;
}
export function sameTerminus(a,b) {
  const clean=value=>normalName(value).replace(/STATION|ESTATE|站|邨/g,'');
  return [[clean(a.orig),clean(b.orig)],[clean(a.dest),clean(b.dest)]].every(([x,y])=>Math.min(x.length,y.length)>=2&&(x.includes(y)||y.includes(x)));
}
export function mergeFeeds(feeds) {
  const good=feeds.filter(f=>!f.error);
  if(!good.length)throw new Error(feeds.map(f=>`${OPERATORS[f.co]}：${f.error}`).join('；'));
  const arrivals=good.flatMap(f=>f.result.arrivals.filter(a=>Number.isFinite(hkTime(a.time))).map(a=>({...a,operator:f.co,timestamp:a.timestamp||f.result.timestamp})));
  // Equal times across companies may be distinct buses; never deduplicate by ETA.
  arrivals.sort((a,b)=>hkTime(a.time)-hkTime(b.time));
  const timestamps=good.map(f=>f.result.timestamp).filter(t=>Number.isFinite(hkTime(t))).sort((a,b)=>hkTime(b)-hkTime(a));
  const warnings=feeds.filter(f=>f.error).map(f=>`${OPERATORS[f.co]}資料未能更新：${f.error}。目前只列出已成功讀取的預報。`);
  for(const f of good)if(!f.result.arrivals.some(a=>Number.isFinite(hkTime(a.time)))) {
    const notes=[...new Set(f.result.arrivals.map(a=>a.remark).filter(Boolean))].join('；');
    warnings.push(`${OPERATORS[f.co]}暫未提供有效到站預報${notes?'（'+notes+'）':''}；不代表停駛。`);
  }
  return {joint:true,arrivals,timestamp:timestamps[0],feeds:feeds.map(f=>({co:f.co,timestamp:f.result?.timestamp,error:f.error||'',message:f.result?.message||'',stop:f.stop})),warnings,message:arrivals.length?'':'兩個營運商暫未有有效到站預報；不代表停駛。'};
}
