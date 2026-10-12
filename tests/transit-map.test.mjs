import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinate, orderStops, boardingStop, stopKey, chooseOpposite } from '../dist/transit/map-core.js';
test('official KMB/Citybus and GMB WGS84 coordinates are interpreted without inventing a location',()=>{
  assert.deepEqual(coordinate({lat:'22.3',long:'114.2'}),[22.3,114.2]);
  assert.deepEqual(coordinate({coordinates:{wgs84:{latitude:22.3,longitude:114.2}}}),[22.3,114.2]);
  for(const row of [{},{lat:null,long:114},{lat:'',long:114},{lat:91,long:114},{lat:22,long:181},{lat:'NaN',long:114}])assert.equal(coordinate(row),null);
});
test('route order is official sequence; repeated stop IDs remain distinct',()=>{
  const a={stop:'A',seq:1},b={stop:'B',seq:2},a2={stop:'A',seq:3};
  assert.deepEqual(orderStops([a2,b,{stop:'bad',seq:NaN},a]),[a,b,a2]);
  assert.notEqual(stopKey(a),stopKey(a2));assert.equal(boardingStop([a,b,a2],a2),a2);assert.equal(boardingStop([a,b],a2),null);
});
test('direction changes preserve KMB service variant and never silently choose a different variant',()=>{
  const r={co:'KMB',route:'89D',dir:'O',service:'2'};
  const wrong={...r,dir:'I',service:'1'},right={...r,dir:'I'};
  assert.equal(chooseOpposite([wrong,right],r),right);assert.equal(chooseOpposite([wrong],r),null);
});
test('Citybus and GMB directions use operator-specific identifiers',()=>{
  const c={co:'CTB',route:'1',dir:'O'};const ci={...c,dir:'I'};assert.equal(chooseOpposite([ci],c),ci);
  const g={co:'GMB',route:'1',dir:1,routeId:2006408};const gi={...g,dir:2};assert.equal(chooseOpposite([{...gi,routeId:999},gi],g),gi);
});
