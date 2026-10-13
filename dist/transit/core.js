export const BASE = {
  KMB: 'https://data.etabus.gov.hk/v1/transport/kmb',
  CTB: 'https://rt.data.gov.hk/v2/transport/citybus',
  GMB: 'https://data.etagmb.gov.hk',
  MTR: 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php',
};
export const OPERATORS = { KMB: '九巴 / 龍運', CTB: '城巴', GMB: '專線小巴', MTR: '港鐵' };
export function hkTime(value) {
  if (!value) return NaN;
  const text = String(value);
  return Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(text) ? text.replace(' ', 'T') + '+08:00' : text);
}
export function countdown(value, now = Date.now()) {
  const delta = hkTime(value) - now;
  if (!Number.isFinite(delta)) return { text: '未有預報', unit: '', state: 'none' };
  if (delta < -60000) return { text: '已過預計時間', unit: '', state: 'past' };
  if (delta <= 60000) return { text: '即將', unit: '到站', state: 'soon' };
  return { text: String(Math.ceil(delta / 60000)), unit: '分鐘', state: 'future' };
}
export function isStale(timestamp, now = Date.now()) {
  const time = hkTime(timestamp);
  return !Number.isFinite(time) || now - time > 180000 || time - now > 60000;
}
export function keyOf(f) { return [f.co, f.route, f.dir, f.service || '', f.routeId || '', f.stop, f.seq].join('|'); }
export function validFavourite(f) {
  if (!f || !OPERATORS[f.co] || typeof f.route !== 'string' || typeof f.stop !== 'string') return false;
  if (!Number.isInteger(f.seq) || f.seq < 1 || f.seq > 500) return false;
  if (!['name', 'dest'].every(k => typeof f[k] === 'string' && f[k].length <= 250)) return false;
  if (f.co === 'MTR') return /^[A-Z]{3}$/.test(f.route) && /^[A-Z]{3}$/.test(f.stop) && ['UP', 'DOWN'].includes(f.dir);
  if (!/^[A-Z0-9-]{1,12}$/.test(f.route)) return false;
  if (f.co === 'GMB') return /^\d{1,12}$/.test(f.stop) && Number.isInteger(f.routeId) && f.routeId > 0 && [1,2].includes(f.dir);
  return ['O','I'].includes(f.dir) && (f.co === 'KMB' ? /^[A-F0-9]{16}$/.test(f.stop) && /^\d{1,3}$/.test(f.service) : /^\d{6}$/.test(f.stop));
}
export function restoreFavourites(raw) {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter(f => { if (!validFavourite(f) || seen.has(keyOf(f))) return false; seen.add(keyOf(f)); return true; }).slice(0,24);
  } catch { return []; }
}
export function classify(remark = '', explicit) {
  if (explicit === 'schedule' || /預定|原定|時間表|未開出|scheduled/i.test(remark)) return '時間表預報';
  if (explicit === 'live') return '即時預報';
  return '官方 ETA'; // APIs without an explicit live/schedule field are not labelled GPS-live.
}
export function normaliseBus(json, f) {
  const rows = (Array.isArray(json.data) ? json.data : []).filter(r => String(r.route) === f.route && String(r.dir) === f.dir && Number(r.seq) === f.seq && (!r.co || r.co === f.co) && (!r.stop || String(r.stop) === f.stop) && (f.co !== 'KMB' || String(r.service_type) === f.service));
  const arrivals = rows.sort((a,b) => Number(a.eta_seq) - Number(b.eta_seq)).slice(0,3).map(r => ({ time: r.eta, dest: r.dest_tc || f.dest, remark: r.rmk_tc || '', kind: classify(`${r.rmk_tc||''} ${r.rmk_en||''}`), timestamp: r.data_timestamp, operator:f.co }));
  return { arrivals, timestamp: json.generated_timestamp, message: arrivals.length ? '' : '此方向暫無到站預報；不代表停駛。' };
}
export function normaliseMtr(json, f, names = {}) {
  if (Number(json.status) !== 1) return { arrivals: [], timestamp: json.curr_time, message: json.message || '港鐵暫未提供資料', alert: true };
  const station = json.data?.[f.route + '-' + f.stop];
  const arrivals = (station?.[f.dir] || []).slice(0,4).map(r => ({ time: r.time, dest: names[r.dest] || r.dest, remark: `月台 ${r.plat}${r.route === 'RAC' ? ' · 經馬場' : ''}${r.timetype === 'D' ? ' · 開出' : ''}`, kind: '官方 ETA', timestamp: station.curr_time || json.curr_time }));
  return { arrivals, timestamp: station?.curr_time || json.curr_time, message: (json.isdelay || json.Isdelay) === 'Y' ? '港鐵表示列車有延誤。' : arrivals.length ? '' : '此方向暫無列車預報；請查閱港鐵公告。' };
}
export function normaliseGmb(json, f) {
  const row = json.data;
  const arrivals = row?.enabled === false ? [] : (row?.eta || []).slice(0,3).map(r => ({ time: r.timestamp, dest: f.dest, remark: r.remarks_tc || '', kind: classify(`${r.remarks_tc || ''} ${r.remarks_en || ''}`), timestamp: json.generated_timestamp }));
  return { arrivals, timestamp: json.generated_timestamp, message: row?.enabled === false ? '此站未啟用到站預報。' : arrivals.length ? '' : '此小巴站暫無到站預報；不以班次間距推算到站。' };
}
export function distance(a,b,c,d) {
  const rad = x => x * Math.PI / 180;
  const q = Math.sin(rad(c-a)/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1-q));
}
export async function getJSON(url, fetcher = fetch, cacheMode = 'no-store') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetcher(url, { signal: controller.signal, cache: cacheMode, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`資料服務回應 ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('資料服務逾時，請稍後重試');
    throw err;
  } finally { clearTimeout(timer); }
}
export async function pool(items, fn, limit = 4) {
  const out = new Array(items.length); let index = 0;
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => { while (index < items.length) { const i = index++; out[i] = await fn(items[i], i); } }));
  return out;
}
