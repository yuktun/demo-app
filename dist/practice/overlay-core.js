// Source-bound overlay validation and display transforms. No recognition runs here.
const clone=x=>JSON.parse(JSON.stringify(x));
export function finite(x,name){if(typeof x!=='number'||!Number.isFinite(x))throw Error(`${name} must be a finite number.`);return x;}
export function numeric(value,name){if(typeof value!=='string'||!value.trim())throw Error(`${name} is required.`);return finite(Number(value),name);}
export function validatePitch(p){if(!p||!['C','D','E','F','G','A','B'].includes(p.step)||!Number.isInteger(p.alter)||p.alter< -2||p.alter>2||!Number.isInteger(p.octave)||p.octave<0||p.octave>9)throw Error('Use a note A–G, accidental −2 to +2, and an octave from 0 to 9.');}
export function point(p,page,name){finite(p?.x,name);finite(p?.y,name);if(p.x<0||p.y<0||p.x>page.width||p.y>page.height)throw Error(`${name} lies outside the original page.`);}
export function validateOrigin(origin,page){
 if(!origin||!['manual','audiveris'].includes(origin.kind))throw Error('Missing label origin.');
 try{
  point(origin.anchor,page,'Original anchor');
  if(origin.kind==='manual'){if(origin.pitch!==undefined)validatePitch(origin.pitch);return;}
  validatePitch(origin.pitch);
  for(const key of ['engine','headId','chordId','voice','slot','mappingEvidence'])if(typeof origin[key]!=='string'||!origin[key].trim()||origin[key].length>240)throw Error(`${key} is required.`);
  if(!Number.isSafeInteger(origin.measure)||origin.measure<1)throw Error('measure must be a positive integer.');
  for(const key of ['omrSha256','musicxmlSha256'])if(typeof origin[key]!=='string'||!/^[0-9a-f]{64}$/i.test(origin[key]))throw Error(`${key} must be a SHA-256 hash.`);
  for(const key of ['onsetQuarter','durationQuarter']){
   const value=origin[key];if(typeof value!=='string'||!/^\d+(?:\/[1-9]\d*)?$/.test(value))throw Error(`${key} must be a nonnegative rational.`);
   const [n,d=1]=value.split('/').map(Number);if(!Number.isSafeInteger(n)||!Number.isSafeInteger(d)||(key==='durationQuarter'&&n===0))throw Error(`${key} is invalid.`);
  }
  for(const key of ['x','y','w','h']){const value=finite(origin.boundsPixels?.[key],`Original bounds ${key}`);if(value<0||(['w','h'].includes(key)&&value===0))throw Error('Original bounds are invalid.');}
  if(!Array.isArray(origin.mapping)||origin.mapping.length!==6)throw Error('Original mapping must contain six affine coefficients.');
  origin.mapping.forEach(value=>finite(value,'Original mapping coefficient'));
  const [a,b,c,d]=origin.mapping;if(!Number.isFinite(a*d-b*c)||a*d-b*c===0)throw Error('Original mapping is not invertible.');
 }catch(e){throw Error(`Invalid ${origin.kind} label provenance: ${e.message}`);}
}
export function viewValid(v,p){if(!v||![0,90,180,270].includes(v.rotation))throw Error('Rotation must be 0°, 90°, 180° or 270°.');const c=v.crop;for(const k of ['x','y','width','height'])finite(c?.[k],`Crop ${k}`);if(c.x<0||c.y<0||c.width<1||c.height<1||c.x+c.width>p.width+1e-6||c.y+c.height>p.height+1e-6)throw Error('Crop must remain inside the original page.');}
export function validatePack(pack,current){
 if(!pack||pack.format!=='source-score-overlay'||pack.version!==1)throw Error('Unsupported overlay file.');
 if(!current||pack.source?.sha256!==current.source.sha256||pack.source?.bytes!==current.source.bytes)throw Error('Source identity mismatch. Open the exact original file before importing these labels.');
 if(JSON.stringify(pack.pages)!==JSON.stringify(current.pages))throw Error('Page dimensions or geometry do not match this original.');
 if(!Array.isArray(pack.labels)||pack.labels.length>5000||![3,4,5].includes(pack.baseOctave))throw Error('Invalid overlay data.');
 const ids=new Set();for(const l of pack.labels){const p=pack.pages.find(p=>p.number===l?.page);if(!p||typeof l.id!=='string'||!l.id||l.id.length>120||ids.has(l.id))throw Error('Invalid label ID or page.');ids.add(l.id);validatePitch(l.pitch);point(l.anchor,p,'Note anchor');point(l.position,p,'Label position');if(typeof l.reviewed!=='boolean')throw Error('Invalid review state.');validateOrigin(l.origin,p);}
 for(const p of pack.pages)viewValid(pack.views?.[p.number],p);
 return clone(pack);
}
export function transform(v){const c=v.crop;switch(v.rotation){case 0:return [1,0,0,1,-c.x,-c.y];case 90:return [0,1,-1,0,c.y+c.height,-c.x];case 180:return [-1,0,0,-1,c.x+c.width,c.y+c.height];case 270:return [0,-1,1,0,-c.y,c.x+c.width];}}
