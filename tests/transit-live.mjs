// Opt-in official API smoke check; not part of deterministic npm test.
import assert from 'node:assert/strict';
import { BASE, getJSON, normaliseBus, normaliseMtr, normaliseGmb } from '../dist/transit/core.js';
const favourites = [
  {co:'KMB',route:'1A',dir:'O',service:'1',stop:'A3ADFCDF8487ADB9',seq:1,dest:'STAR FERRY'},
  {co:'CTB',route:'1',dir:'O',stop:'001027',seq:1,dest:'Happy Valley'},
  {co:'GMB',route:'1',dir:1,routeId:2006408,stop:'20014489',seq:1,dest:'Central'},
  {co:'MTR',route:'TWL',dir:'UP',stop:'ADM',seq:1},
];
for (const f of favourites) {
  const url = f.co === 'MTR' ? `${BASE.MTR}?line=TWL&sta=ADM&lang=TC` : f.co === 'GMB' ? `${BASE.GMB}/eta/route-stop/2006408/1/1` : f.co === 'CTB' ? `${BASE.CTB}/eta/CTB/001027/1` : `${BASE.KMB}/eta/A3ADFCDF8487ADB9/1A/1`;
  const json = await getJSON(url);
  const result = f.co === 'MTR' ? normaliseMtr(json,f) : f.co === 'GMB' ? normaliseGmb(json,f) : normaliseBus(json,f);
  assert.equal(Array.isArray(result.arrivals),true);
  assert.ok(result.timestamp);
  console.log(`${f.co}: official endpoint responded; ${result.arrivals.length} forecasts; timestamp ${result.timestamp}`);
}
