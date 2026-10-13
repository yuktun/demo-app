import { OPERATORS, hkTime, isStale, countdown } from './core.js';
import { orderStops, boardingStop, stopKey } from './map-core.js';

let leafletPromise;
function leaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) leafletPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src = new URL('./vendor/leaflet/leaflet.js',import.meta.url).href;
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('地圖程式未能啟動'));
    script.onerror = () => {script.remove();leafletPromise = null;reject(new Error('地圖程式未能載入'));};
    document.head.append(script);
  });
  return leafletPromise;
}
function node(tag,cls,text) {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function control(text,fn,cls='button secondary') {const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function time(value) {const t=hkTime(value);return Number.isFinite(t)?new Intl.DateTimeFormat('zh-HK',{timeZone:'Asia/Hong_Kong',hour:'2-digit',minute:'2-digit',hour12:false}).format(t):'—';}

export function createRouteDetail({loadStops,loadArrival,loadOpposite,saveFavourite,notify}) {
  const dialog = document.getElementById('route-detail');
  const title = document.getElementById('detail-title'),subtitle=document.getElementById('detail-subtitle');
  const frame = document.getElementById('detail-map'),status=document.getElementById('detail-status'),list=document.getElementById('detail-stops');
  const flip=document.getElementById('detail-flip'),fit=document.getElementById('detail-fit'),geo=document.getElementById('detail-location');
  const info=document.getElementById('detail-selection'),arrivals=document.getElementById('detail-arrivals'),stamp=document.getElementById('detail-timestamp');
  const save=document.getElementById('detail-save'),refresh=document.getElementById('detail-refresh');
  const selectionPanel=document.getElementById('detail-selection-panel');
  let current,original,selected,rows=[],opposite,map,markers=new Map(),gpsMarker,gpsAccuracy;
  let routeEpoch=0,etaEpoch=0,etaResult,loadingArrival=false,previousFocus,nextUpdate=0,tileErrors=false,tileLayer;
  const styles={normal:{color:'#ffffff',fillColor:'#176a5d',radius:7,weight:2,fillOpacity:1},boarding:{color:'#095b3c',fillColor:'#b7e4c9',radius:10,weight:3,fillOpacity:1},selected:{color:'#ffffff',fillColor:'#2563eb',radius:11,weight:3,fillOpacity:1}};
  function originalStop() {return original?.dir===current?.dir ? boardingStop(rows,original) : null;}
  function markerStyle(s) {return selected&&stopKey(s)===stopKey(selected)?styles.selected:originalStop()&&stopKey(s)===stopKey(originalStop())?styles.boarding:styles.normal;}
  function header() {
    title.textContent=`${current.route} · 往 ${current.dest}`;
    subtitle.textContent=`${OPERATORS[current.co]}${originalStop()?' · 已收藏上車站：'+originalStop().name:''}`;
  }
  function listSelection() {
    const board=originalStop();
    for(const item of list.querySelectorAll('[data-stop-key]')) {
      const active=selected&&item.dataset.stopKey===stopKey(selected);
      item.classList.toggle('selected',!!active);
      item.querySelector('button').setAttribute('aria-pressed',String(!!active));
      item.querySelector('.boarding-label').hidden=!board||item.dataset.stopKey!==stopKey(board);
      if(active){selectionPanel.hidden=false;item.append(selectionPanel);}
    }
    for(const s of rows) {const m=markers.get(stopKey(s));if(m)m.setStyle(markerStyle(s));}
  }
  function renderList() {
    selectionPanel.hidden=true;list.replaceChildren();
    for(const s of rows) {
      const item=node('li','detail-stop');item.dataset.stopKey=stopKey(s);
      const b=control('',()=>select(s,true),'detail-stop-button');
      b.append(node('span','stop-number',s.seq));const name=node('span','stop-name-text',s.name);name.append(node('small','',s.en||s.stop));b.append(name);item.append(b);
      item.append(node('span','boarding-label','已收藏上車站'));if(!s.coords)item.append(node('small','missing-coordinate','未有官方座標 · 仍可查詢到站'));
      list.append(item);
    }
    listSelection();
  }
  function renderArrivals() {
    arrivals.replaceChildren();
    if(!selected)return;
    if(loadingArrival)arrivals.append(node('p','hint','正在更新到站預報…'));
    if(etaResult?.error)arrivals.append(node('p','warning',`更新失敗：${etaResult.error}。${etaResult.arrivals?.length?'下方僅供查閱上次預報。':'請稍後重試。'}`));
    if(etaResult?.message)arrivals.append(node('p','hint',etaResult.message));
    for(const warning of etaResult?.warnings||[])arrivals.append(node('p','warning',warning));
    if(etaResult?.partnerStop)arrivals.append(node('p','hint',etaResult.partnerStop));
    const stale=etaResult?.error||!navigator.onLine||isStale(etaResult?.timestamp);
    for(const a of etaResult?.arrivals||[]) {
      const expired=stale||isStale(a.timestamp||etaResult.timestamp);const c=expired?{text:'上次預報',unit:'資料已過期',state:'stale'}:countdown(a.time);
      const pill=node('div',`arrival ${c.state}`);pill.dataset.time=a.time||'';pill.dataset.timestamp=a.timestamp||etaResult.timestamp||'';pill.dataset.failed=etaResult.error?'yes':'';
      pill.append(node('strong','',c.text),node('em','',c.unit),node('span','time',time(a.time)),node('span','kind',a.kind));if(a.remark)pill.append(node('p','',a.remark));arrivals.append(pill);
      if(a.operator)pill.append(node('span','operator-label',a.operator==='CTB'?'城巴':etaResult.joint?(etaResult.company?.startsWith('LWB')?'龍運':'九巴'):OPERATORS[a.operator]));
      if(etaResult.joint&&a.dest)pill.append(node('p','',`往 ${a.dest}`));
    }
    stamp.textContent=etaResult?.feeds?etaResult.feeds.map(f=>`${f.co==='CTB'?'城巴':etaResult.company?.startsWith('LWB')?'龍運':'九巴'} ${f.error?'未更新':time(f.timestamp)}`).join(' · ')+' · 香港時間':etaResult?.timestamp?`官方資料時間 ${time(etaResult.timestamp)} · 香港時間`:'尚未更新';
    refresh.disabled=loadingArrival;
  }
  async function updateArrival() {
    if(!dialog.open||!selected||loadingArrival||document.hidden)return;
    const gen=++etaEpoch,s=selected,r={...current,stop:s.stop,name:s.name,seq:s.seq};loadingArrival=true;nextUpdate=0;renderArrivals();
    let result;
    try{if(!navigator.onLine)throw new Error('目前離線');result=await loadArrival(r);}catch(err){result={...etaResult,error:err.message||'未能連接資料服務'};}
    if(gen!==etaEpoch||!dialog.open)return;
    etaResult=result;loadingArrival=false;renderArrivals();nextUpdate=Date.now()+60000;
  }
  function select(s,pan=false) {
    etaEpoch++;loadingArrival=false;etaResult=null;selected=s;nextUpdate=0;
    info.textContent=`${s.seq}. ${s.name}`;save.disabled=false;refresh.disabled=false;
    document.getElementById('detail-coordinate-note').textContent=s.coords?'目前選站以藍圈標示。':'此站未有官方座標；仍可使用清單及到站查詢。';
    listSelection();renderArrivals();
    if(map&&s.coords&&pan)map.panTo(s.coords,{animate:false});
    updateArrival();
  }
  function destroyMap() {if(map)map.remove();map=null;markers.clear();gpsMarker=null;gpsAccuracy=null;tileLayer=null;frame.replaceChildren();}
  function fitBounds() {if(!map)return;const points=rows.filter(s=>s.coords).map(s=>s.coords);if(points.length)map.fitBounds(points,{padding:[20,20],maxZoom:16,animate:false});}
  async function renderMap(gen) {
    destroyMap();fit.disabled=true;frame.hidden=false;tileErrors=false;
    const available=rows.filter(s=>s.coords);
    if(!available.length){frame.hidden=true;status.textContent='官方未提供這些站點的座標，請使用下方車站清單。';return;}
    try {
      const L=await leaflet();if(gen!==routeEpoch||!dialog.open)return;
      map=L.map(frame,{scrollWheelZoom:false,attributionControl:true,zoomControl:true,preferCanvas:false});
      if(navigator.onLine) {
        tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:0,updateWhenIdle:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
        tileLayer.on('tileerror',()=>{if(gen===routeEpoch&&dialog.open){tileErrors=true;status.textContent='底圖暫時未能載入；官方站點標記、清單及到站查詢仍可使用。';}});tileLayer.addTo(map);
      } else status.textContent='目前離線，未載入底圖；下方保留已載入的站點資料。';
      // Initialise the view before adding SVG markers so their keyboard elements exist.
      fitBounds();
      for(const s of available) {
        const marker=L.circleMarker(s.coords,markerStyle(s));const label=node('span','',`${s.seq}. ${s.name}`);marker.bindTooltip(label);
        const pick=()=>{select(s);list.querySelector(`[data-stop-key="${stopKey(s)}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});};marker.on('click',pick);marker.addTo(map);markers.set(stopKey(s),marker);
        const element=marker.getElement();if(element){element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',`選擇第 ${s.seq} 站 ${s.name}`);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});}
      }
      fit.disabled=false;map.invalidateSize();
      // Deliberately no polyline: official stop coordinates do not describe street geometry.
      if(navigator.onLine&&!tileErrors)status.textContent=`${available.length}/${rows.length} 個官方站點有座標 · 標記顯示站點，並非行車線形。`;
    } catch(err) {if(gen===routeEpoch&&dialog.open){frame.hidden=true;status.textContent=`地圖未能載入：${err.message}。仍可使用站點清單及到站查詢。`;}}
  }
  async function loadRoute(r) {
    const gen=++routeEpoch;etaEpoch++;loadingArrival=false;current=r;rows=[];selected=null;opposite=null;nextUpdate=0;etaResult=null;
    destroyMap();selectionPanel.hidden=true;list.replaceChildren();arrivals.replaceChildren();info.textContent='正在載入路線…';status.textContent='正在讀取官方站點及座標…';subtitle.textContent=OPERATORS[r.co];title.textContent=`${r.route} · 往 ${r.dest}`;flip.disabled=true;save.disabled=true;refresh.disabled=true;fit.disabled=true;geo.disabled=true;
    const reverse=loadOpposite(r).then(value=>({value}),error=>({error}));
    try {
      const stops=await loadStops(r);if(gen!==routeEpoch||!dialog.open)return;rows=orderStops(stops);header();renderList();geo.disabled=false;
      if(rows.length)select(originalStop()||rows[0]);else{info.textContent='官方暫未提供車站清單';status.textContent='請稍後按「重新載入」重試。';frame.hidden=true;}
      renderMap(gen);
    }catch(err){if(gen===routeEpoch&&dialog.open){frame.hidden=true;status.textContent=`路線資料未能載入：${err.message}。請按「重新載入」重試。`;info.textContent='暫未有站點資料';}}
    const result=await reverse;if(gen!==routeEpoch||!dialog.open)return;opposite=result.value;flip.disabled=!opposite;flip.title=opposite?'查看官方反方向路線':result.error?'反方向資料暫時未能載入':'官方未提供這個班次的反方向';
  }
  function close() {routeEpoch++;etaEpoch++;nextUpdate=0;loadingArrival=false;geo.disabled=false;destroyMap();rows=[];selected=null;original=null;current=null;etaResult=null; if(dialog.open)dialog.close();if(previousFocus?.isConnected)previousFocus.focus();}
  document.getElementById('detail-close').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(current)close();});
  flip.addEventListener('click',()=>{if(opposite)loadRoute(opposite);});fit.addEventListener('click',fitBounds);
  document.getElementById('detail-retry').addEventListener('click',()=>{if(current)loadRoute(current);});refresh.addEventListener('click',updateArrival);
  save.addEventListener('click',()=>{if(selected)saveFavourite({...current,stop:selected.stop,name:selected.name,seq:selected.seq});});
  geo.addEventListener('click',()=>{
    if(!window.isSecureContext||!navigator.geolocation){notify('定位需要 HTTPS 或 localhost，亦需瀏覽器支援。');return;}
    const gen=routeEpoch;geo.disabled=true;status.textContent='正在取得你允許的位置；你可拒絕並繼續用站點清單。';
    navigator.geolocation.getCurrentPosition(pos=>{
      if(gen!==routeEpoch||!dialog.open)return;geo.disabled=false;
      const point=[pos.coords.latitude,pos.coords.longitude];if(!point.every(Number.isFinite)||!map){status.textContent='已取得位置，但地圖未能使用；請以站點清單查詢。';return;}
      const L=window.L;if(gpsMarker)map.removeLayer(gpsMarker);if(gpsAccuracy)map.removeLayer(gpsAccuracy);
      gpsMarker=L.circleMarker(point,{color:'#fff',fillColor:'#9a55d3',fillOpacity:1,radius:8,weight:3}).bindTooltip(node('span','','你允許使用的目前位置')).addTo(map);
      if(Number.isFinite(pos.coords.accuracy))gpsAccuracy=L.circle(point,{radius:Math.max(0,pos.coords.accuracy),color:'#9a55d3',fillOpacity:.08,weight:1}).addTo(map);
      map.panTo(point,{animate:false});status.textContent='紫色標記是目前位置；不保存定位。底圖服務會得知所檢視的地圖區域。';
    },err=>{if(gen!==routeEpoch||!dialog.open)return;geo.disabled=false;status.textContent=err.code===1?'定位未獲允許；站點清單及到站查詢仍可使用。':'未能取得位置；請改用站點清單。';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
  });
  const tick=setInterval(()=>{
    if(!dialog.open||document.hidden)return;if(nextUpdate&&Date.now()>=nextUpdate)updateArrival();
    for(const item of arrivals.querySelectorAll('.arrival')) {
      const expired=item.dataset.failed||!navigator.onLine||isStale(item.dataset.timestamp);const c=expired?{text:'上次預報',unit:'資料已過期',state:'stale'}:countdown(item.dataset.time);
      item.className=`arrival ${c.state}`;item.querySelector('strong').textContent=c.text;item.querySelector('em').textContent=c.unit;
    }
  },1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dialog.open)updateArrival();});
  window.addEventListener('offline',()=>{if(dialog.open){etaEpoch++;loadingArrival=false;etaResult={...etaResult,error:'目前離線'};renderArrivals();status.textContent='目前離線；已載入站點仍可選擇，預報只供查閱上次資料。';if(map&&tileLayer){map.removeLayer(tileLayer);tileLayer=null;}}});
  window.addEventListener('online',()=>{if(dialog.open)updateArrival();});
  return {open(r){if(r.co==='MTR'){notify('港鐵暫未加入路線地圖。');return;}if(dialog.open)close();previousFocus=document.activeElement;original={...r};dialog.showModal();loadRoute({...r});},close,isOpen:()=>dialog.open,destroy(){close();clearInterval(tick);}};
}
