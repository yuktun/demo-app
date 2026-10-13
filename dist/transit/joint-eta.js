import {keyOf,OPERATORS} from './core.js';
import {sameTerminus,verifiedPartner,mergeFeeds} from './joint-core.js';

const outcome=p=>p.then(result=>({result}),error=>({error:error.message||'未能連接資料服務'}));
export function createBusArrivalFetcher({fetchSingle,loadVariants,loadStops,loadRegistry,memo}) {
  async function resolve(f,registry) {
    const groups=registry.routes[f.route];if(!groups)return {single:true};
    if(f.co==='KMB'&&f.service!=='1')return {warning:'這個特別班次未能核實另一營運商的服務編號；只顯示所選班次的預報。'};
    return memo('joint-pair-'+keyOf(f),async()=>{
      const preferred=(await loadVariants(f.co,f.route)).find(r=>r.dir===f.dir&&(f.co!=='KMB'||r.service===f.service));
      if(!preferred)return {warning:'路線或班次資料已改動；未能核實聯營對應，請重新選擇方向與上車站。'};
      const eligible=groups.filter(g=>sameTerminus(preferred,g));
      if(!eligible.length)return {warning:'運輸署與營運商的方向資料未能互相核實；目前只顯示所選營運商。'};
      const co=f.co==='KMB'?'CTB':'KMB';
      const variants=(await loadVariants(co,f.route)).filter(r=>(co!=='KMB'||r.service==='1')&&sameTerminus(preferred,r));
      if(!variants.length)return {warning:'另一營運商未有相同方向的已核實班次；目前只顯示所選營運商。'};
      const primary=await loadStops(preferred);
      if(!primary.some(s=>s.stop===f.stop&&s.seq===f.seq))return {warning:'上車站的次序已改動，請使用「換站」重新選擇；未合併另一營運商。'};
      const choices=[];
      for(const r of variants) {
        const partner=await loadStops(r);
        const valid=verifiedPartner(primary,partner,f,eligible.filter(g=>sameTerminus(r,g)),registry.stops);
        if(valid)choices.push({route:r,...valid});
      }
      if(!choices.length)return {warning:'此站的聯營對應未能以官方站名、座標及次序核實；目前只顯示所選營運商。'};
      const score=Math.max(...choices.map(c=>c.score)),best=choices.filter(c=>c.score===score);
      const targets=new Set(best.map(c=>`${c.route.co}|${c.route.dir}|${c.route.service||''}|${c.target.stop}|${c.target.seq}`));
      if(targets.size!==1)return {warning:'此站有多個可能的聯營方向或重複站點；未猜測對應，目前只顯示所選營運商。'};
      const chosen=best[0];
      return {partner:{...chosen.route,stop:chosen.target.stop,seq:chosen.target.seq,name:chosen.target.name},company:chosen.company,officialId:chosen.officialId};
    });
  }
  return async f=>{
    const first=outcome(fetchSingle(f));let pairing;
    try{pairing=await resolve(f,await loadRegistry());}
    catch(err){pairing={warning:`聯營對應資料暫未能讀取：${err.message}。目前只顯示所選營運商，刷新時會重試。`};}
    if(!pairing.partner) {
      const response=await first;if(response.error)throw new Error(`${OPERATORS[f.co]}：${response.error}`);
      return {...response.result,warnings:pairing.warning?[pairing.warning]:[]};
    }
    const [a,b]=await Promise.all([first,outcome(fetchSingle(pairing.partner))]);
    const merged=mergeFeeds([{co:f.co,stop:f.name,...a},{co:pairing.partner.co,stop:pairing.partner.name,...b}]);
    merged.company=pairing.company;
    merged.partnerStop=`${OPERATORS[pairing.partner.co]}對應站：${pairing.partner.name}`;
    return merged;
  };
}
