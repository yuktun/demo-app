import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normaliseBus,restoreFavourites,hkTime} from '../dist/transit/core.js';
import {verifiedPartner,mergeFeeds,sameTerminus} from '../dist/transit/joint-core.js';
import {createBusArrivalFetcher} from '../dist/transit/joint-eta.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/transit-joint.json',import.meta.url)));
const registry=JSON.parse(fs.readFileSync(new URL('../dist/transit/joint-routes.json',import.meta.url)));
const stop680={co:'KMB',route:'680',dir:'O',service:'1',stop:'15FF958BE6921BAA',seq:4,name:'馬鞍山市中心總站',dest:'金鐘站(東)'};
function harness({fail=[],capture=[],registryOverride=registry}={}) {
  const cache=new Map();
  const fetcher=createBusArrivalFetcher({
    memo(key,fn){if(!cache.has(key)){const p=Promise.resolve().then(fn).catch(e=>{cache.delete(key);throw e;});cache.set(key,p);}return cache.get(key);},
    loadRegistry:async()=>registryOverride,
    loadVariants:async(co,r)=>fixture.variants[r][co],
    loadStops:async r=>fixture.routes[r.route][r.dir][r.co==='KMB'?'kmb':'ctb'],
    fetchSingle:async f=>{capture.push(f);if(fail.includes(f.co))throw new Error('test unavailable');return normaliseBus(fixture.eta[f.co],f);},
  });
  return fetcher;
}
test('official roster gates joint lookup; unrelated same-number routes remain single-feed',async()=>{
  assert.ok(registry.routes['680']);assert.equal(registry.routes['1'],undefined);assert.equal(registry.routes['1A'],undefined);
  const requests=[];const result=await harness({capture:requests})({...stop680,route:'1'});assert.equal(requests.length,1);assert.equal(result.joint,undefined);
});
test('680 maps KMB outbound MA952 to Citybus inbound 001950 sequence 4',async()=>{
  const requests=[];const result=await harness({capture:requests})(stop680);
  assert.equal(result.joint,true);assert.equal(requests.length,2);
  assert.deepEqual([requests[1].co,requests[1].dir,requests[1].stop,requests[1].seq],['CTB','I','001950',4]);
  assert.ok(result.arrivals.some(a=>a.operator==='KMB'));assert.ok(result.arrivals.some(a=>a.operator==='CTB'));
  assert.ok(result.arrivals.every((a,i,v)=>!i||hkTime(v[i-1].time)<=hkTime(a.time)));
  assert.equal(result.arrivals.find(a=>a.operator==='KMB').kind,'時間表預報');assert.equal(result.arrivals.find(a=>a.operator==='CTB').kind,'官方 ETA');
});
test('Citybus favorites resolve symmetrically to the exact KMB service and stop',async()=>{
  const requests=[];const result=await harness({capture:requests})({...stop680,co:'CTB',dir:'I',service:undefined,stop:'001950'});
  assert.equal(result.joint,true);assert.deepEqual([requests[1].co,requests[1].dir,requests[1].service,requests[1].stop,requests[1].seq],['KMB','O','1','15FF958BE6921BAA',4]);
});
test('both directions of several official joint routes use metadata, not identical O/I assumptions',async()=>{
  for(const route of ['680','101','102','182'])for(const dir of ['O','I']){
    const requests=[];const first=fixture.routes[route][dir].kmb[0];
    const r=await harness({capture:requests})({...stop680,route,dir,stop:first.stop,seq:first.seq,name:first.name});
    assert.equal(r.joint,true,`${route} ${dir}`);
    const own=fixture.variants[route].KMB.find(v=>v.dir===dir&&v.service==='1');assert.ok(sameTerminus(own,requests[1]));
    if(route==='680')assert.notEqual(requests[1].dir,dir);if(route==='102')assert.equal(requests[1].dir,dir);
  }
});
test('every verified map-selected 680 stop is bound to a shared TD station; inconsistent coordinates are skipped',()=>{
  const primary=fixture.routes['680'].O.kmb,partner=fixture.routes['680'].I.ctb;
  const results=primary.map(s=>verifiedPartner(primary,partner,s,registry.routes['680'],registry.stops));
  assert.ok(results.filter(Boolean).length>=25);
  assert.equal(results[primary.findIndex(s=>s.name==='中央圖書館')],null);
  assert.equal(results[3].officialId,'6175');
});
test('special service numbers are preserved without borrowing unspecified partner departures',async()=>{
  const requests=[];const r=await harness({capture:requests})({...stop680,service:'3'});
  assert.equal(requests.length,1);assert.equal(requests[0].service,'3');assert.match(r.warnings[0],/特別班次/);assert.equal(r.joint,undefined);
});
test('partial operator failures retain the successful feed and explicit operator error, including preferred-feed failure',async()=>{
  for(const co of ['KMB','CTB']){
    const r=await harness({fail:[co]})(stop680);assert.equal(r.joint,true);assert.ok(r.arrivals.length);assert.ok(r.arrivals.every(a=>a.operator!==co));assert.match(r.warnings[0],/未能更新/);assert.equal(r.feeds.find(f=>f.co===co).error,'test unavailable');
  }
  await assert.rejects(harness({fail:['KMB','CTB']})(stop680),/test unavailable/);
});
test('a failed partner ETA is retried; static mapping does not cache the failed arrival',async()=>{
  const fail=['CTB'],calls=[];const fetcher=harness({fail,capture:calls});assert.equal((await fetcher(stop680)).arrivals.some(a=>a.operator==='CTB'),false);
  fail.length=0;assert.equal((await fetcher(stop680)).arrivals.some(a=>a.operator==='CTB'),true);assert.equal(calls.length,4);
});
test('shared timestamps are not deduplicated across distinct operator records; placeholders are not invented buses',()=>{
  const a={time:'2026-10-13T14:00:00+08:00',kind:'官方 ETA',timestamp:'2026-10-13T13:59:00+08:00'};
  const r=mergeFeeds([{co:'KMB',result:{arrivals:[a,{...a,time:null,remark:'九巴時段'}],timestamp:a.timestamp}},{co:'CTB',result:{arrivals:[a],timestamp:a.timestamp}}]);assert.equal(r.arrivals.length,2);assert.notEqual(r.arrivals[0].operator,r.arrivals[1].operator);
});
test('a successfully read empty or cycle-placeholder partner feed is explicitly shown as unavailable, not as a bus',()=>{
  const timestamp='2026-10-13T14:00:00+08:00';const r=mergeFeeds([{co:'KMB',result:{arrivals:[{time:timestamp}],timestamp}},{co:'CTB',result:{arrivals:[{time:'',remark:'九巴時段'}],timestamp}}]);assert.equal(r.arrivals.length,1);assert.match(r.warnings[0],/城巴.*未提供.*九巴時段/);
});
test('operator-specific raw filtering excludes wrong direction, stop, operator and service',()=>{
  const json=structuredClone(fixture.eta.CTB);const good=json.data[0];json.data=[good,{...good,dir:'O'},{...good,stop:'999999'},{...good,co:'KMB'}];assert.equal(normaliseBus(json,{...stop680,co:'CTB',dir:'I',stop:'001950'}).arrivals.length,1);
});
test('individual short-working destinations remain attached to forecasts rather than being replaced by the selected terminus',()=>{
  const json=structuredClone(fixture.eta.CTB);json.data[0].dest_tc='北角碼頭';const rows=normaliseBus(json,{...stop680,co:'CTB',dir:'I',stop:'001950'}).arrivals;assert.equal(rows[0].dest,'北角碼頭');
});
test('ordered official aliases disambiguate repeated stop occurrences and refuse ambiguous matches',()=>{
  const point=(n)=>[22.3+n*.001,114.1];const bank={A:{coords:point(0),names:['Alpha'],en:['Alpha']},B:{coords:point(1),names:['Beta'],en:['Beta']},C:{coords:point(2),names:['Gamma'],en:['Gamma']}};
  const groups=[{company:'KMB+CTB',stops:[[1,'A'],[2,'B'],[3,'A'],[4,'C']]}];
  const mk=(ids)=>ids.map((id,i)=>({stop:id,seq:i+1,name:bank[id].names[0],en:bank[id].en[0],coords:bank[id].coords}));
  const own=mk(['A','B','A','C']),partner=mk(['A','B','A','C']);assert.equal(verifiedPartner(own,partner,own[2],groups,bank).target.seq,3);
  assert.equal(verifiedPartner(own,mk(['A','A','B','A','C']),own[0],groups,bank),null);
});
test('existing favorites remain valid and unchanged; no partner fields or migration are required',async()=>{
  const stored=JSON.stringify([stop680]);const f=restoreFavourites(stored);await harness()(f[0]);assert.equal(JSON.stringify(f),stored);
});
