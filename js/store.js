// 数据层：配方/记录/价格存 localStorage，照片存 IndexedDB
(function(){
const KEY='breadnotes.v1';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const FLOUR_RE=/(面粉|高筋|低筋|中筋|全麦粉|黑麦粉|面包粉|法国粉|T\d{2,3}|斯佩尔特|小麦粉|裸麦)/i;
const NOT_FLOUR_RE=/(奶粉|泡打粉|可可粉|抹茶粉|肉桂粉|糖粉|玉米淀粉|苏打粉|酵母)/;
const WATER_MAP=[[/^(水|冰水|温水|清水)/,1],[/牛奶|鲜奶/,0.88],[/(全蛋|鸡蛋|蛋液)/,0.75],[/蛋黄/,0.5],[/蛋白/,0.88],[/酸奶/,0.85],[/淡奶油|稀奶油/,0.6],[/鲁邦|酸种|液种/,0.5],[/汤种/,0.8]];
function isFlour(n){return FLOUR_RE.test(n)&&!NOT_FLOUR_RE.test(n)}
function waterRatio(n){for(const [re,v] of WATER_MAP) if(re.test(n)) return v; return 0}
const norm=s=>(s||'').replace(/[（(].*?[)）]/g,'').replace(/\s/g,'').toLowerCase();

function defaults(){
  return {recipes:[],bakes:[],prices:(window.DEFAULT_PRICES||[]).map(([name,price,size])=>({id:uid(),name,price,size})),settings:{theme:'#c8873a',mode:'auto'}};
}
let S;
try{S=JSON.parse(localStorage.getItem(KEY))||defaults()}catch(e){S=defaults()}
S.settings=Object.assign({theme:'#c8873a',mode:'auto'},S.settings);
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));

// ---- IndexedDB photos ----
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{const r=indexedDB.open('breadnotes',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbp}
async function tx(mode,fn){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('photos',mode);const st=t.objectStore('photos');const r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})}
const Photos={
  put:async(blob)=>{const id='p_'+uid();await tx('readwrite',s=>s.put(blob,id));return id},
  get:id=>tx('readonly',s=>s.get(id)),
  del:id=>tx('readwrite',s=>s.delete(id)),
  all:async()=>{const d=await db();return new Promise((res,rej)=>{const out={};const t=d.transaction('photos');const c=t.objectStore('photos').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue()}else res(out)};c.onerror=()=>rej(c.error)})},
  clear:()=>tx('readwrite',s=>s.clear())
};
const urlCache={};
async function photoURL(id){if(urlCache[id])return urlCache[id];const b=await Photos.get(id);if(!b)return'';return urlCache[id]=URL.createObjectURL(b)}
async function compress(file,max=1280,q=0.82){
  const bmp=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=URL.createObjectURL(file)});
  const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
  c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);URL.revokeObjectURL(bmp.src);
  return new Promise(r=>c.toBlob(r,'image/jpeg',q));
}

// ---- prices & calc ----
function findPrice(name){const n=norm(name);if(!n)return null;
  return S.prices.find(p=>norm(p.name)===n)||S.prices.find(p=>{const m=norm(p.name);return m&&(n.includes(m)||m.includes(n))})||null}
function perGram(name){const p=findPrice(name);return p&&p.size>0?p.price/p.size:null}
function calc(recipe,scale=1){
  const ings=recipe.ingredients||[];const flour=ings.filter(i=>i.isFlour).reduce((a,i)=>a+(+i.grams||0),0);
  const total=ings.reduce((a,i)=>a+(+i.grams||0),0);const water=ings.reduce((a,i)=>a+(+i.grams||0)*waterRatio(i.name),0);
  let cost=0,missing=[];
  const rows=ings.map(i=>{const g=(+i.grams||0)*scale;const pg=perGram(i.name);if(pg==null&&g>0)missing.push(i.name);const c=pg==null?0:pg*g;cost+=c;
    return {...i,g,pct:flour?(+i.grams||0)/flour*100:0,cost:c,priced:pg!=null}});
  const n=Math.max(1,+recipe.yieldCount||1);
  return {rows,flour:flour*scale,total:total*scale,hydration:flour?water/flour*100:0,cost,perLoaf:cost/(n*scale),missing,pieceWeight:total/n};
}
function parseIngredients(text){
  const out=[];const re=/^[\s·•\-*\d.、)）]*([^\d\s:：][^:：\d]*?)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(kg|千克|公斤|g|克|ml|毫升|l|升|个|只|颗)?/i;
  for(let line of text.split(/[\n\r]+|[，,；;](?=[^\d]*\d)/)){line=line.trim();if(!line||/^https?:/.test(line))continue;
    const m=line.match(re);if(!m)continue;let name=m[1].replace(/[：:\s]+$/,'').trim();let v=parseFloat(m[2]);const u=(m[3]||'g').toLowerCase();
    if(!name||name.length>20||/^(步骤|第|烤|温度|时间|发酵|分钟|小时)/.test(name))continue;
    if(/kg|千克|公斤|^l$|升/.test(u))v*=1000; if(/个|只|颗/.test(u)&&/蛋/.test(name))v*=50; else if(/个|只|颗/.test(u))continue;
    out.push({name,grams:Math.round(v*10)/10,isFlour:isFlour(name)})}
  return out;
}
window.Store={S,save,uid,Photos,photoURL,compress,isFlour,waterRatio,findPrice,perGram,calc,parseIngredients,
  reset(){localStorage.removeItem(KEY)},
  replace(data){Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,defaults(),data);save()}};
})();
