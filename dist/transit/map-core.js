export function coordinate(row) {
  const lat = row?.lat ?? row?.latitude ?? row?.coordinates?.wgs84?.latitude;
  const lng = row?.lng ?? row?.long ?? row?.longitude ?? row?.coordinates?.wgs84?.longitude;
  if (lat === null || lng === null || lat === undefined || lng === undefined || lat === '' || lng === '') return null;
  const pair = [Number(lat),Number(lng)];
  return pair.every(Number.isFinite) && pair[0] >= -90 && pair[0] <= 90 && pair[1] >= -180 && pair[1] <= 180 ? pair : null;
}
export function stopKey(s) { return `${s.stop}|${s.seq}`; }
export function orderStops(rows) { return [...rows].filter(s => Number.isFinite(s.seq) && s.seq > 0).sort((a,b) => a.seq-b.seq); }
export function boardingStop(rows, f) { return rows.find(s => s.stop === f.stop && s.seq === f.seq) || null; }
export function oppositeDirection(r) { return r.co === 'GMB' ? (r.dir === 1 ? 2 : 1) : (r.dir === 'O' ? 'I' : 'O'); }
export function chooseOpposite(rows, r) {
  return rows.find(x => x.co === r.co && x.route === r.route && x.dir === oppositeDirection(r) && (r.co === 'KMB' ? x.service === r.service : r.co === 'GMB' ? x.routeId === r.routeId : true)) || null;
}
