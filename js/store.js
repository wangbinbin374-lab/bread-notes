// 数据层：配方/记录/价格存 localStorage，照片存 IndexedDB
(function(){
const KEY='breadnotes.v1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const C=window.BreadCalc;const {isFlour,waterRatio,norm}=C;
function defaults(){
  return {recipes:[],bakes:[],prices:(window.DEFAULT_PRICES||[]).map(([name,price,size,unit])=>({id:uid(),name,price,size,unit:unit||'g'})),settings:{theme:'#c8873a',mode:'auto'}};
}
const safeId=v=>{const s=String(v==null?'':v).replace(/[^\w-]/g,'');return s||uid()};
// 清洗数据：旧数据保持兼容（缺 unit = 克），非法值归零，id 只允许安全字符
function sanitize(d){d=d&&typeof d==='object'?d:{};const out=Object.assign(defaults(),d);
  out.recipes=(Array.isArray(out.recipes)?out.recipes:[]).filter(r=>r&&typeof r==='object').map(r=>Object.assign({},r,{id:safeId(r.id),cover:String(r.cover||'').replace(/[^\w-]/g,''),scanPhoto:String(r.scanPhoto||'').replace(/[^\w-]/g,''),name:String(r.name||'未命名配方'),
    ingredients:(Array.isArray(r.ingredients)?r.ingredients:[]).filter(i=>i&&typeof i==='object').map(i=>Object.assign({},i,{name:String(i.name||''),grams:Math.max(0,+i.grams||0),isFlour:!!i.isFlour}))}));
  out.bakes=(Array.isArray(out.bakes)?out.bakes:[]).filter(b=>b&&typeof b==='object').map(b=>Object.assign({},b,{id:safeId(b.id),recipeId:b.recipeId==null?b.recipeId:String(b.recipeId).replace(/[^\w-]/g,''),cost:Number.isFinite(+b.cost)?Math.max(0,+b.cost):0,photos:(Array.isArray(b.photos)?b.photos:[]).map(x=>String(x).replace(/[^\w-]/g,'')).filter(Boolean)}));
  out.prices=(Array.isArray(out.prices)?out.prices:[]).filter(p=>p&&typeof p==='object').map(p=>Object.assign({},p,{id:safeId(p.id),name:String(p.name||''),price:Math.max(0,+p.price||0),size:Math.max(0,+p.size||0),unit:['g','kg','ml','L','pc'].includes(p.unit)?p.unit:'g'}));
  out.settings=Object.assign({theme:'#c8873a',mode:'auto'},out.settings);if(!/^#[0-9a-f]{6}$/i.test(out.settings.theme))out.settings.theme='#c8873a';if(!['auto','light','dark'].includes(out.settings.mode))out.settings.mode='auto';
  return out}
let S;
try{S=sanitize(JSON.parse(localStorage.getItem(KEY))||defaults())}catch(e){S=defaults()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){window.dispatchEvent(new CustomEvent('bn-save-error',{detail:e}))}};

// ---- IndexedDB photos ----
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{const r=indexedDB.open('breadnotes',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>res(r.result);r.onerror=()=>{dbp=null;rej(r.error)};r.onblocked=()=>{dbp=null;rej(new Error('blocked'))}});dbp.catch(()=>{dbp=null});return dbp}
async function tx(mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('photos',mode);const st=t.objectStore('photos');const r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('abort'))})}
const Photos={
  put:async(blob)=>{const id='p_'+uid();await tx('readwrite',s=>s.put(blob,id));return id},
  get:id=>tx('readonly',s=>s.get(id)),
  del:id=>tx('readwrite',s=>s.delete(id)),
  all:async()=>{const d=await db();return new Promise((res,rej)=>{const out={};const t=d.transaction('photos');const c=t.objectStore('photos').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else res(out)};c.onerror=()=>rej(c.error)})},
  clear:()=>tx('readwrite',s=>s.clear())
};
const urlCache={};
async function photoURL(id){if(!id)return'';if(urlCache[id])return urlCache[id];try{const b=await Photos.get(id);if(!b)return'';return urlCache[id]=URL.createObjectURL(b)}catch(e){return''}}
async function compress(file,max=1280,q=0.82){
  const bmp=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=URL.createObjectURL(file)});
  const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);URL.revokeObjectURL(bmp.src);
  return new Promise(r=>c.toBlob(r,'image/jpeg',q));
}

// ---- prices & calc（纯函数见 calc.js）----
const findPrice=name=>C.findPrice(S.prices,name);
const perGram=name=>C.perGram(S.prices,name);
const calc=(recipe,scale=1)=>C.calc(recipe,scale,S.prices);
const parseIngredients=C.parseIngredients;
window.Store={S,save,uid,sanitize,safeId,Photos,photoURL,compress,isFlour,waterRatio,findPrice,perGram,calc,parseIngredients,
  reset(){localStorage.removeItem(KEY)},
  replace(data){Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,sanitize(data));save()}};
})();
