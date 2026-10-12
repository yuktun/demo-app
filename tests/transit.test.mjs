import test from 'node:test';
import assert from 'node:assert/strict';
import { hkTime, countdown, isStale, normaliseBus, normaliseMtr, normaliseGmb, restoreFavourites, classify, keyOf, distance, getJSON, pool } from '../dist/transit/core.js';
const f = {co:'KMB',route:'1A',dir:'O',service:'1',stop:'A3ADFCDF8487ADB9',seq:1,name:'上車站',dest:'目的地'};
test('HK timestamps are parsed independently of the viewer timezone and midnight rollover',() => {
  assert.equal(hkTime('2026-10-12 00:01:00'),Date.parse('2026-10-11T16:01:00Z'));
  assert.equal(hkTime('2026-10-12T00:01:00+08:00'),hkTime('2026-10-12 00:01:00'));
  assert.equal(countdown('2026-10-12 00:01:00',hkTime('2026-10-11 23:59:30')).text,'2');
  assert.equal(countdown(null).state,'none');
  assert.equal(countdown('bad').state,'none');
  assert.equal(countdown('2026-10-12 00:01:00',hkTime('2026-10-12 00:03:00')).state,'past');
});
test('unknown, old, and implausibly future data are marked stale',() => {
  const now = hkTime('2026-10-12 18:00:00');
  assert.equal(isStale('2026-10-12 17:56:00',now),true);
  assert.equal(isStale(null,now),true);
  assert.equal(isStale('2026-10-12 18:02:00',now),true);
  assert.equal(isStale('2026-10-12 17:59:00',now),false);
});
test('KMB filters direction, service variant, and repeated stop sequence',() => {
  const r = {route:'1A',dir:'O',service_type:1,seq:1,eta_seq:1,eta:'2026-10-12T18:01:00+08:00',rmk_tc:'未開出'};
  const json = {generated_timestamp:'2026-10-12T18:00:00+08:00',data:[{...r,dir:'I'},{...r,service_type:2},{...r,seq:17},{...r,route:'2'},r]};
  const out = normaliseBus(json,f); assert.equal(out.arrivals.length,1); assert.equal(out.arrivals[0].kind,'時間表預報');
  assert.equal(normaliseBus({data:[]},f).arrivals.length,0);
});
test('Citybus does not mix opposite directions or loop sequences',() => {
  const c = {...f,co:'CTB',stop:'001027'};
  const out = normaliseBus({data:[{route:'1A',dir:'I',seq:1},{route:'1A',dir:'O',seq:9},{route:'1A',dir:'O',seq:1,eta:null}]},c);
  assert.equal(out.arrivals.length,1); assert.equal(out.arrivals[0].time,null);
  assert.equal(out.arrivals[0].kind,'官方 ETA');
});
test('MTR alerts and unavailable directions never generate synthetic trains',() => {
  const m = {...f,co:'MTR',route:'TWL',stop:'ADM',dir:'UP'};
  assert.equal(normaliseMtr({status:0,message:'服務調整'},m).alert,true);
  assert.equal(normaliseMtr({status:1,data:{}},m).arrivals.length,0);
  const out = normaliseMtr({status:1,isdelay:'Y',curr_time:'2026-10-12 18:00:00',data:{'TWL-ADM':{UP:[{dest:'TSW',time:'2026-10-12 18:02:00',plat:'1'}],DOWN:[{dest:'CEN'}]}}},m,{TSW:'荃灣'});
  assert.equal(out.arrivals.length,1); assert.equal(out.arrivals[0].dest,'荃灣'); assert.match(out.message,/延誤/);
});
test('GMB route-stop payload preserves scheduled remarks and enabled status',() => {
  const g = {...f,co:'GMB',routeId:2006408,dir:1};
  const json = {generated_timestamp:'2026-10-12T18:00:00+08:00',data:{stop_id:20014489,enabled:true,eta:[{diff:1,timestamp:'2026-10-12T18:01:00+08:00',remarks_tc:'未開出',remarks_en:'Scheduled'}]}};
  assert.equal(normaliseGmb(json,g).arrivals[0].kind,'時間表預報');
  json.data.enabled = false; assert.equal(normaliseGmb(json,g).arrivals.length,0);
  assert.equal(normaliseGmb({data:{enabled:true,eta:[]}},g).arrivals.length,0);
  assert.equal(classify('特別班次'),'官方 ETA');
  assert.equal(classify('原定班次'),'時間表預報');
});
test('corrupt or malicious saved favourites are rejected, valid entries deduplicated and bounded',() => {
  assert.deepEqual(restoreFavourites('bad'),[]); assert.deepEqual(restoreFavourites('{}'),[]);
  assert.deepEqual(restoreFavourites(JSON.stringify([f,f,{...f,stop:'../../secret'},{...f,co:'UNKNOWN'},{...f,seq:0}])),[f]);
  assert.equal(restoreFavourites(JSON.stringify(Array.from({length:40},(_,i) => ({...f,seq:i+1})))).length,24);
  assert.notEqual(keyOf(f),keyOf({...f,seq:2}));
});
test('distance is a local straight-line calculation',() => { assert.equal(distance(22,114,22,114),0); assert.ok(distance(22,114,22.001,114) > 110); });
test('network failures and HTTP errors propagate; credentials are omitted',async () => {
  await assert.rejects(getJSON('https://example.test',async () => ({ok:false,status:503})),/503/);
  const value = await getJSON('https://example.test',async (_,opts) => {assert.equal(opts.credentials,'omit');assert.equal(opts.referrerPolicy,'no-referrer');return {ok:true,json:async () => ({data:[]})};});
  assert.deepEqual(value,{data:[]});
  await getJSON('https://example.test',async (_,opts) => {assert.equal(opts.cache,'default');return {ok:true,json:async () => ({})};},'default');
});
test('request fan-out is bounded and result order is preserved',async () => {
  let active = 0, max = 0;
  const out = await pool([1,2,3,4,5],async x => {active++;max=Math.max(max,active);await new Promise(r => setTimeout(r,5));active--;return x*2;},2);
  assert.deepEqual(out,[2,4,6,8,10]);assert.equal(max,2);
});
