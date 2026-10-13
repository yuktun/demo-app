import { BASE, OPERATORS, hkTime, countdown, isStale, keyOf, restoreFavourites, normaliseBus, normaliseMtr, normaliseGmb, distance, getJSON, pool } from './core.js';
import { createRouteDetail } from './route-map.js';
import { coordinate, chooseOpposite } from './map-core.js';
import { createBusArrivalFetcher } from './joint-eta.js';

const $ = id => document.getElementById(id);
const STORAGE = 'next-ride.favourites.v1';
const PREFS = 'next-ride.prefs.v1';
const STOP_CACHE = 'next-ride.kmb-stop-catalogue.v1';
let stopCatalogueTime = '';
let favourites = [], prefs = { interval: 60, theme: 'light' }, saved = true;
try { favourites = restoreFavourites(localStorage.getItem(STORAGE)); Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS)) || {}); }
catch { saved = false; }
if (![0,30,60,120].includes(Number(prefs.interval))) prefs.interval = 60;
if (!['light','dark'].includes(prefs.theme)) prefs.theme = 'light';
document.documentElement.dataset.theme = prefs.theme;
$('interval').value = prefs.interval;
let view = 'home', operator = 'KMB', selection = null, pickerRows = [], resultRows = [];
let routeGeneration = 0, pickerGeneration = 0, nearbyGeneration = 0, refreshGeneration = 0;
let refreshing = false, nextRefresh = 0, location = null, stationData, names = {};
const boards = new Map(), cache = new Map();
// Static catalogues respect the provider's HTTP cache to avoid redundant large downloads.
const catalogue = url => getJSON(url, fetch, 'default');
const labels = { AEL:'機場快綫', TCL:'東涌綫', TML:'屯馬綫', TKL:'將軍澳綫', EAL:'東鐵綫', SIL:'南港島綫', TWL:'荃灣綫', ISL:'港島綫', KTL:'觀塘綫', DRL:'迪士尼綫' };
const destinations = { AEL:['機場 / 博覽館','香港'], TCL:['東涌','香港'], TML:['屯門','烏溪沙'], TKL:['寶琳 / 康城','北角 / 調景嶺'], EAL:['羅湖 / 落馬洲及其他北行終點','金鐘及其他南行終點'], SIL:['海怡半島','金鐘'], TWL:['荃灣','中環'], ISL:['柴灣','堅尼地城'], KTL:['調景嶺','黃埔'], DRL:['欣澳','迪士尼'] };
const routeDetail = createRouteDetail({loadStops:routeStops,loadArrival:fetchArrival,loadOpposite:findOpposite,saveFavourite:addFavourite,notify:notice});
const fetchBusArrival=createBusArrivalFetcher({fetchSingle:fetchSingleBus,loadVariants:busVariants,loadStops:routeStops,loadRegistry:()=>memo('joint-registry',()=>catalogue('./joint-routes.json')),memo});

function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
function button(text, fn, cls = 'button secondary') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
function notice(text) { $('notice').textContent = text; $('notice').hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => { $('notice').hidden = true; }, 6500); }
function storageState() { $('storage-state').textContent = saved ? '收藏已保存在這個瀏覽器。' : '瀏覽器儲存不可用；本次仍可查詢，但收藏或設定可能未能保存。'; }
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify(favourites)); localStorage.setItem(PREFS, JSON.stringify(prefs)); saved = true; }
  catch { saved = false; notice('未能保存；本次收藏仍可使用，請勿當作備份。'); }
  storageState();
}
function memo(key, fn) {
  if (!cache.has(key)) { const p = Promise.resolve().then(fn).catch(err => { if (cache.get(key) === p) cache.delete(key); throw err; }); cache.set(key,p); }
  return cache.get(key);
}
function clock(value) { const time = hkTime(value); return Number.isFinite(time) ? new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(time) : '時間未提供'; }
function shortClock(value) { const time = hkTime(value); return Number.isFinite(time) ? new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hour12:false}).format(time) : '—'; }
function connection() { $('connection').textContent = navigator.onLine ? '官方資料 · 香港時間' : '目前離線 · 到站資料未更新'; }
function switchView(next) {
  view = next;
  for (const name of ['home','search','nearby','settings']) $(`${name}-view`).hidden = name !== next;
  for (const b of document.querySelectorAll('[data-view]')) { if (b.dataset.view === next) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }
  window.scrollTo({top:0,behavior:'instant'});
  if (next === 'home') refresh();
  else { nextRefresh = 0; $('next-refresh').textContent = ''; }
}
function schedule() { nextRefresh = prefs.interval && view === 'home' && !document.hidden ? Date.now() + Number(prefs.interval)*1000 : 0; }
function addFavourite(f) {
  if (favourites.some(x => keyOf(x) === keyOf(f))) { notice('這個方向及上車站已在收藏。'); return; }
  if (favourites.length >= 24) { notice('收藏已達 24 項，請先移除不需要的路線。'); return; }
  favourites.push(f); persist(); notice(`已收藏 ${f.route} · ${f.name}`); renderBoards();
}
function removeFavourite(f) { favourites = favourites.filter(x => keyOf(x) !== keyOf(f)); boards.delete(keyOf(f)); persist(); renderBoards(); }
function moveFavourite(f, delta) { const i = favourites.findIndex(x => keyOf(x) === keyOf(f)); const j = i+delta; if (j < 0 || j >= favourites.length) return; [favourites[i],favourites[j]] = [favourites[j],favourites[i]]; persist(); renderBoards(); }
function renderBoards() {
  $('boards').replaceChildren(); $('empty').hidden = !!favourites.length; $('refresh').disabled = refreshing || !favourites.length;
  favourites.forEach((f,i) => {
    const data = boards.get(keyOf(f));
    const card = el('article','board');
    const head = el('div','board-head'); head.append(el('span','route-badge',f.co === 'MTR' ? labels[f.route] || f.route : f.route));
    const operatorName=data?.joint ? `${data.company?.startsWith('LWB')?'龍運':'九巴'}＋城巴（聯營）` : OPERATORS[f.co];
    const info = el('div','board-info'); info.append(el('h2','',f.name),el('p','',`${operatorName} · 往 ${f.dest}`)); head.append(info);
    const body = el('div','board-body');
    if (!data) body.append(el('p','hint','按「刷新全部」載入官方預報。'));
    else {
      const stale = data.error || !navigator.onLine || isStale(data.timestamp);
      if (data.loading) body.append(el('p','hint','正在更新…'));
      if (data.error) body.append(el('p','warning',`更新失敗：${data.error}。${data.arrivals?.length ? '下方只供查閱上次預報。' : '請稍後重試。'}`));
      else if (stale) body.append(el('p','warning','資料已過期或離線，請刷新後再作出行參考。'));
      if (data.message) body.append(el('p',data.alert ? 'warning' : 'hint',data.message));
      for(const warning of data.warnings||[])body.append(el('p','warning',warning));
      if(data.partnerStop)body.append(el('p','hint',data.partnerStop));
      const grid = el('div','arrival-grid');
      for (const a of data.arrivals || []) {
        const expired = stale || isStale(a.timestamp || data.timestamp);
        const c = expired ? {text:'上次預報',unit:'資料已過期',state:'stale'} : countdown(a.time);
        const item = el('div',`arrival ${c.state}`);
        item.dataset.time = a.time || ''; item.dataset.timestamp = a.timestamp || data.timestamp || ''; item.dataset.failed = data.error ? 'yes' : '';
        item.append(el('strong','',c.text),el('em','',c.unit),el('span','time',shortClock(a.time)),el('span','kind',a.kind));
        if(a.operator)item.append(el('span','operator-label',a.operator==='CTB'?'城巴':data.joint?(data.company?.startsWith('LWB')?'龍運':'九巴'):OPERATORS[a.operator]));
        if ((f.co === 'MTR' || data.joint) && a.dest) item.append(el('p','',`往 ${a.dest}`));
        if (a.remark) item.append(el('p','',a.remark));
        grid.append(item);
      }
      body.append(grid);
    }
    const footer = el('div','board-footer'),times=el('span');
    if(data?.feeds)for(const feed of data.feeds)times.append(el('span','feed-time',`${feed.co==='CTB'?'城巴':data.company?.startsWith('LWB')?'龍運':'九巴'} ${feed.error?'未更新':clock(feed.timestamp)}`));
    else times.textContent=data?.timestamp?`資料 ${clock(data.timestamp)}`:'尚未更新';
    footer.append(times);
    const actions = el('div','board-actions');
    const up = button('↑',() => moveFavourite(f,-1),'small-button'); up.setAttribute('aria-label',`將 ${f.route} ${f.name} 向上移`); up.disabled = i === 0;
    const down = button('↓',() => moveFavourite(f,1),'small-button'); down.setAttribute('aria-label',`將 ${f.route} ${f.name} 向下移`); down.disabled = i === favourites.length-1;
    actions.append(up,down);
    if (f.co !== 'MTR') actions.append(button('地圖',() => routeDetail.open(f),'small-button'));
    actions.append(button('換站',() => openFavourite(f),'small-button'),button('移除',() => removeFavourite(f),'small-button')); footer.append(actions);
    card.append(head,body,footer); $('boards').append(card);
  });
}
async function fetchArrival(f) {
  if (f.co === 'MTR') { await ensureStations().catch(() => {}); return normaliseMtr(await getJSON(`${BASE.MTR}?line=${f.route}&sta=${f.stop}&lang=TC`),f,names); }
  if (f.co === 'GMB') return normaliseGmb(await getJSON(`${BASE.GMB}/eta/route-stop/${f.routeId}/${f.dir}/${f.seq}`),f);
  return fetchBusArrival(f);
}
async function fetchSingleBus(f) {
  const path=f.co==='KMB'?`/eta/${f.stop}/${f.route}/${f.service}`:`/eta/CTB/${f.stop}/${f.route}`;
  return normaliseBus(await getJSON(BASE[f.co]+path),f);
}
async function busVariants(co,route) {
  return (await routeList(co)).filter(r=>r.route===route).flatMap(r=>co==='KMB'?[{co,route:r.route,dir:r.bound,service:r.service_type,orig:r.orig_tc,dest:r.dest_tc}]:[{co,route:r.route,dir:'O',orig:r.orig_tc,dest:r.dest_tc},{co,route:r.route,dir:'I',orig:r.dest_tc,dest:r.orig_tc}]);
}
async function refresh() {
  if (refreshing || !favourites.length || document.hidden) { schedule(); return; }
  if (!navigator.onLine) { connection(); renderBoards(); schedule(); return; }
  refreshing = true; nextRefresh = 0; const gen = ++refreshGeneration;
  const list = [...favourites];
  for (const f of list) boards.set(keyOf(f),{...boards.get(keyOf(f)),loading:true});
  renderBoards();
  await pool(list,async f => {
    let result;
    try { result = await fetchArrival(f); }
    catch (err) { result = {...boards.get(keyOf(f)),error:err.message || '未能連接資料服務'}; }
    if (gen === refreshGeneration && favourites.some(x => keyOf(x) === keyOf(f))) { boards.set(keyOf(f),{...result,loading:false}); renderBoards(); }
  });
  refreshing = false; connection(); renderBoards(); schedule();
}
async function kmbStops() {
  return memo('kmb-stops', async () => {
    // A legitimate public catalogue can be reused across reloads in this tab.
    // Never retry a blocked response through another origin or a modified URL.
    try {
      const cached = JSON.parse(sessionStorage.getItem(STOP_CACHE));
      if (cached && Array.isArray(cached.data) && Date.now()-cached.savedAt >= 0 && Date.now()-cached.savedAt < 86400000) { stopCatalogueTime = cached.timestamp; return cached.data; }
    } catch { /* Storage may be unavailable; the official request still works independently. */ }
    const json = await catalogue(BASE.KMB+'/stop');
    if (!Array.isArray(json.data)) throw new Error('站點資料格式未能辨識');
    stopCatalogueTime = json.generated_timestamp;
    try { sessionStorage.setItem(STOP_CACHE,JSON.stringify({savedAt:Date.now(),timestamp:json.generated_timestamp,data:json.data})); } catch { /* Static cache is optional. */ }
    return json.data;
  });
}
async function stopInfo(co,id) {
  if (co === 'KMB') { const row = (await kmbStops()).find(s => s.stop === id); if (!row) throw new Error('此站已不在車站資料中'); return row; }
  return memo('ctb-stop-'+id,async () => { const row = (await catalogue(BASE.CTB+'/stop/'+id)).data; if (!row) throw new Error('未能取得站名'); return row; });
}
function renderOperators() {
  $('operators').replaceChildren();
  for (const [co,label] of Object.entries(OPERATORS)) { const b = button(label,() => chooseOperator(co),''); b.setAttribute('aria-pressed',String(operator === co)); $('operators').append(b); }
}
function chooseOperator(co) {
  operator = co; routeGeneration++; pickerGeneration++; selection = null; $('picker').hidden = true; $('results').replaceChildren(); $('query').value = '';
  $('region-label').hidden = co !== 'GMB'; $('line-label').hidden = co !== 'MTR';
  $('query-label').textContent = co === 'MTR' ? '車站名稱 / 代碼' : co === 'GMB' ? '路線號碼' : '路線號碼 / 目的地';
  $('query').placeholder = co === 'MTR' ? '例如 金鐘、ADM' : co === 'GMB' ? '例如 1、20M' : '例如 1A、旺角';
  $('search-status').textContent = co === 'GMB' ? '選擇地區並輸入路線號碼。' : co === 'MTR' ? '選擇路線，再搜尋或選擇車站。' : '輸入路線或目的地名稱。';
  renderOperators(); if (co === 'MTR') searchRoutes();
}
async function routeList(co) { return memo(co+'-routes',async () => (await catalogue(BASE[co] + (co === 'KMB' ? '/route/' : '/route/CTB'))).data || []); }
function resultRow(title,subtitle,action,label = '選擇') {
  const row = el('div','result'), info = el('div'); info.append(el('b','',title),el('small','',subtitle)); row.append(info,button(label,action)); return row;
}
async function searchRoutes() {
  const gen = ++routeGeneration, co = operator, q = $('query').value.trim().toUpperCase(), region = $('region').value, line = $('line').value;
  $('results').replaceChildren(); $('picker').hidden = true; pickerGeneration++;
  $('search-status').textContent = '正在載入官方路線資料…';
  try {
    let rows;
    if (co === 'MTR') {
      await ensureStations();
      rows = (stationData[line] || []).filter(s => !q || (s.name+' '+s.en+' '+s.stop).toUpperCase().includes(q)).map(s => ({co,route:line,...s}));
    } else if (co === 'GMB') {
      if (!/^[0-9A-Z-]{1,12}$/.test(q)) throw new Error('請輸入有效的小巴路線號碼，例如 1 或 20M');
      const data = (await catalogue(`${BASE.GMB}/route/${region}/${q}`)).data || [];
      rows = data.flatMap(r => (r.directions || []).map(d => ({co,route:r.route_code,routeId:Number(r.route_id),dir:Number(d.route_seq),dest:d.dest_tc,orig:d.orig_tc,description:r.description_tc,region})));
    } else {
      if (!q) { $('search-status').textContent = '請輸入路線號碼或目的地，避免一次列出全部路線。'; return; }
      const data = await routeList(co);
      rows = data.filter(r => [r.route,r.orig_tc,r.dest_tc,r.orig_en,r.dest_en].join(' ').toUpperCase().includes(q)).sort((a,b) => Number(b.route === q)-Number(a.route === q)).flatMap(r => co === 'KMB' ? [{co,route:r.route,dir:r.bound,service:r.service_type,dest:r.dest_tc,orig:r.orig_tc}] : [{co,route:r.route,dir:'O',dest:r.dest_tc,orig:r.orig_tc},{co,route:r.route,dir:'I',dest:r.orig_tc,orig:r.dest_tc}]);
    }
    if (gen !== routeGeneration || co !== operator) return;
    resultRows = rows.slice(0,60);
    $('search-status').textContent = rows.length ? `${rows.length} 個結果${rows.length > 60 ? '；顯示首 60 個，請收窄搜尋' : ''}` : '找不到符合的路線或車站，請檢查地區及號碼。';
    for (const r of resultRows) {
      const row = resultRow(co === 'MTR' ? r.name : `${r.route} · 往 ${r.dest}`,co === 'MTR' ? `${labels[r.route]} · ${r.en}` : `${r.orig} → ${r.dest}${r.service && r.service !== '1' ? ' · 特別班次 '+r.service : ''}${r.description ? ' · '+r.description : ''}`,() => co === 'MTR' ? pickMtr(r) : pickStops(r));
      if (co !== 'MTR') row.append(button('地圖',() => routeDetail.open(r),'small-button'));
      $('results').append(row);
    }
  } catch (err) { if (gen === routeGeneration) $('search-status').textContent = `無法載入：${err.message}。請重試。`; }
}
async function ensureStations() {
  if (stationData) return;
  const data = await memo('mtr-stations',() => catalogue('./stations.json'));
  stationData = data; names = Object.fromEntries(Object.values(data).flat().map(s => [s.stop,s.name]));
}
async function routeStops(r) {
  if (r.co === 'GMB') {
    const rows = await memo(`gmb-stops-${r.routeId}-${r.dir}`,async () => (await catalogue(`${BASE.GMB}/route-stop/${r.routeId}/${r.dir}`)).data?.route_stops || []);
    return pool(rows,async s => { let coords = null; try {const info = await memo('gmb-stop-'+s.stop_id,async () => (await catalogue(`${BASE.GMB}/stop/${s.stop_id}`)).data);coords = coordinate(info);}catch{} return {stop:String(s.stop_id),name:s.name_tc,en:s.name_en,seq:Number(s.stop_seq),coords}; });
  }
  const bound = r.dir === 'O' ? 'outbound' : 'inbound';
  const path = r.co === 'KMB' ? `/route-stop/${r.route}/${bound}/${r.service}` : `/route-stop/CTB/${r.route}/${bound}`;
  const rows = await memo(`${r.co}-${path}`,async () => (await catalogue(BASE[r.co]+path)).data || []);
  return pool(rows,async s => { try { const info = await stopInfo(r.co,s.stop); return {stop:s.stop,seq:Number(s.seq),name:info.name_tc,en:info.name_en,coords:coordinate(info)}; } catch { return {stop:s.stop,seq:Number(s.seq),name:`站名暫不可用 (${s.stop})`,en:'',coords:null}; } });
}
async function findOpposite(r) {
  let rows;
  if (r.co === 'GMB') {
    const data = (await catalogue(`${BASE.GMB}/route/${r.routeId}`)).data || [];
    rows = data.flatMap(x => (x.directions || []).map(d => ({co:'GMB',route:x.route_code,routeId:Number(x.route_id),region:x.region,dir:Number(d.route_seq),orig:d.orig_tc,dest:d.dest_tc,description:x.description_tc})));
  } else {
    const data = (await routeList(r.co)).filter(x => x.route === r.route);
    rows = data.flatMap(x => r.co === 'KMB' ? [{co:'KMB',route:x.route,dir:x.bound,service:x.service_type,orig:x.orig_tc,dest:x.dest_tc}] : [{co:'CTB',route:x.route,dir:'O',orig:x.orig_tc,dest:x.dest_tc},{co:'CTB',route:x.route,dir:'I',orig:x.dest_tc,dest:x.orig_tc}]);
  }
  return chooseOpposite(rows,r);
}
async function pickStops(r, replacing) {
  const gen = ++pickerGeneration; selection = {route:r,replacing}; pickerRows = [];
  $('picker').hidden = false; $('picker-title').textContent = `${r.route} · 選擇上車站`; $('picker-subtitle').textContent = `往 ${r.dest} · 正在載入車站…`; $('stop-filter').value = ''; $('stop-filter').hidden = false; $('stop-results').replaceChildren();
  $('picker').scrollIntoView({behavior:'smooth',block:'start'});
  try {
    const rows = await routeStops(r);
    if (gen !== pickerGeneration) return;
    pickerRows = rows; $('picker-subtitle').textContent = `往 ${r.dest} · ${rows.length} 個車站`; renderStopPicker();
  } catch (err) { if (gen === pickerGeneration) $('picker-subtitle').textContent = `無法載入車站：${err.message}，請重新選擇路線。`; }
}
function saveSelection(f) {
  if (selection?.replacing) {
    const previous = selection.replacing;
    if (favourites.some(x => keyOf(x) === keyOf(f) && keyOf(x) !== keyOf(previous))) { notice('這個站已在收藏。'); return; }
    const i = favourites.findIndex(x => keyOf(x) === keyOf(previous));
    if (i !== -1) { favourites[i] = f; boards.delete(keyOf(previous)); persist(); renderBoards(); notice('已更新上車站。'); }
  } else addFavourite(f);
  switchView('home');
}
function renderStopPicker() {
  const q = $('stop-filter').value.trim().toUpperCase(); $('stop-results').replaceChildren();
  const rows = pickerRows.filter(s => (s.name+' '+s.en+' '+s.stop).toUpperCase().includes(q));
  for (const s of rows) $('stop-results').append(resultRow(`${s.seq}. ${s.name}`,s.en || s.stop,() => { const r = selection.route; saveSelection({...r,stop:s.stop,name:s.name,seq:s.seq}); },'收藏此站'));
  if (!rows.length) $('stop-results').append(el('p','hint','沒有符合的車站。'));
}
async function pickMtr(r,replacing) {
  pickerGeneration++; selection = {route:r,replacing}; $('picker').hidden = false; $('picker-title').textContent = `${r.name} · 選擇方向`; $('picker-subtitle').textContent = `${labels[r.route]} · 個別列車可能以中途站為終點`; $('stop-filter').hidden = true; $('stop-results').replaceChildren();
  ['UP','DOWN'].forEach((dir,i) => $('stop-results').append(resultRow(`往 ${destinations[r.route][i]}`,'以到站預報中每班列車的終點為準',() => saveSelection({co:'MTR',route:r.route,stop:r.stop,name:r.name,seq:1,dir,dest:destinations[r.route][i]}),'收藏方向')));
  $('picker').scrollIntoView({behavior:'smooth',block:'start'});
}
function openFavourite(f) { switchView('search'); chooseOperator(f.co); if (f.co === 'MTR') { $('line').value = f.route; pickMtr(f,f); } else pickStops(f,f); }

async function searchStops(useLocation = false) {
  const gen = ++nearbyGeneration, q = $('stop-query').value.trim().toUpperCase(), radius = Number($('radius').value);
  if (!useLocation && q.length < 2) { $('near-status').textContent = '請輸入至少兩個字，或按按鈕使用定位。'; $('near-results').replaceChildren(); return; }
  $('near-status').textContent = '正在載入官方九巴 / 龍運站點…'; $('near-results').replaceChildren();
  try {
    let rows = await kmbStops();
    if (useLocation && location) rows = rows.map(s => ({...s,metres:distance(location.latitude,location.longitude,Number(s.lat),Number(s.long))})).filter(s => s.metres <= radius).sort((a,b) => a.metres-b.metres);
    else rows = rows.filter(s => (s.name_tc+' '+s.name_en+' '+s.stop).toUpperCase().includes(q));
    if (gen !== nearbyGeneration) return;
    const date = hkTime(stopCatalogueTime);
    const sourceDate = Number.isFinite(date) ? new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : '日期未提供';
    $('near-status').textContent = `${rows.length} 個車站${rows.length > 40 ? '，顯示首 40 個' : ''}${useLocation ? ' · 距離為直線距離' : ''} · 站點清單 ${sourceDate}`;
    for (const s of rows.slice(0,40)) $('near-results').append(resultRow(s.name_tc,`${s.name_en}${s.metres !== undefined ? ' · '+Math.round(s.metres)+' 米' : ''}`,() => routesAtStop(s)));
  } catch (err) { if (gen === nearbyGeneration) $('near-status').textContent = `無法載入：${err.message}。請重試。`; }
}
async function routesAtStop(stop) {
  const gen = ++nearbyGeneration; $('near-status').textContent = `正在查詢 ${stop.name_tc} 的路線…`;
  try {
    const json = await getJSON(BASE.KMB+'/stop-eta/'+stop.stop); if (gen !== nearbyGeneration) return;
    const groups = new Map();
    for (const s of json.data || []) { const r = {co:'KMB',route:s.route,dir:s.dir,service:String(s.service_type),stop:stop.stop,name:stop.name_tc,dest:s.dest_tc,seq:Number(s.seq)}; groups.set(keyOf(r),r); }
    $('near-results').replaceChildren(); $('near-status').textContent = `${stop.name_tc} · ${groups.size} 個有提供資料的方向`;
    for (const r of groups.values()) $('near-results').append(resultRow(`${r.route} · 往 ${r.dest}`,`九巴 / 龍運 · ${r.service === '1' ? '一般班次' : '特別班次 '+r.service}`,() => {addFavourite(r);switchView('home');},'收藏'));
    if (!groups.size) $('near-results').append(el('p','hint','官方暫沒有提供這個站的路線資料。可改用路線搜尋。'));
  } catch (err) { if (gen === nearbyGeneration) $('near-status').textContent = `無法查詢此站：${err.message}。`; }
}

for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click',() => switchView(b.dataset.view));
$('first-add').addEventListener('click',() => switchView('search'));
$('refresh').addEventListener('click',refresh);
$('theme').addEventListener('click',() => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = prefs.theme; persist(); });
$('route-form').addEventListener('submit',e => {e.preventDefault();searchRoutes();});
$('line').addEventListener('change',searchRoutes);
$('region').addEventListener('change',() => {routeGeneration++;$('results').replaceChildren();$('picker').hidden = true;pickerGeneration++;});
$('stop-filter').addEventListener('input',renderStopPicker);
$('picker-close').addEventListener('click',() => {pickerGeneration++;$('picker').hidden = true;});
$('interval').addEventListener('change',() => {prefs.interval = Number($('interval').value);persist();schedule();});
$('clear-cache').addEventListener('click',() => {cache.clear();try{sessionStorage.removeItem(STOP_CACHE);}catch{}routeGeneration++;pickerGeneration++;nearbyGeneration++;notice('此分頁的資料快取已清除，下次搜尋會重新載入。');});
let stopDebounce;
$('stop-query').addEventListener('input',() => {clearTimeout(stopDebounce);nearbyGeneration++;stopDebounce = setTimeout(() => searchStops(),350);});
$('stop-search').addEventListener('click',() => {clearTimeout(stopDebounce);searchStops();});
$('radius').addEventListener('change',() => {if (location) searchStops(true);});
$('locate').addEventListener('click',() => {
  if (!window.isSecureContext || !navigator.geolocation) { $('near-status').textContent = '此瀏覽器或連線不支援定位，請以站名搜尋。定位需要 HTTPS 或 localhost。'; return; }
  $('locate').disabled = true; $('near-status').textContent = '正在取得位置；你可以拒絕並改以站名搜尋。';
  navigator.geolocation.getCurrentPosition(pos => {location = {latitude:pos.coords.latitude,longitude:pos.coords.longitude};$('locate').disabled = false;searchStops(true);},err => {$('locate').disabled = false;$('near-status').textContent = err.code === 1 ? '定位未獲允許，請改用站名搜尋。' : '未能取得位置，請改用站名搜尋。';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
});
document.addEventListener('visibilitychange',() => { if (!document.hidden && view === 'home') refresh(); else nextRefresh = 0; });
window.addEventListener('offline',() => {connection();renderBoards();});
window.addEventListener('online',() => {connection();if (view === 'home') refresh();});
setInterval(() => {
  if (document.hidden || view !== 'home') return;
  if (nextRefresh && Date.now() >= nextRefresh) refresh();
  $('next-refresh').textContent = nextRefresh ? `${Math.max(0,Math.ceil((nextRefresh-Date.now())/1000))} 秒後更新` : refreshing ? '正在更新…' : '手動更新';
  for (const item of document.querySelectorAll('.arrival')) {
    const expired = item.dataset.failed || !navigator.onLine || isStale(item.dataset.timestamp);
    const c = expired ? {text:'上次預報',unit:'資料已過期',state:'stale'} : countdown(item.dataset.time);
    item.className = `arrival ${c.state}`; item.querySelector('strong').textContent = c.text; item.querySelector('em').textContent = c.unit;
  }
},1000);
for (const [code,name] of Object.entries(labels)) { const option = el('option','',name); option.value = code; $('line').append(option); }
$('line').value = 'TWL';
storageState(); connection(); renderOperators(); renderBoards();
ensureStations().catch(() => {}); refresh();
