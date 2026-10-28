// 网络优先：有网时总拿最新文件；离线时用缓存。改动静态资源时请同步提升 CACHE 版本号。
const CACHE='bread-notes-v3';
const ASSETS=['./','./index.html','./css/style.css','./js/calc.js','./js/app.js','./js/store.js','./js/library.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('bread-notes-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith(fetch(req).then(r=>{if(r.ok&&r.type==='basic'){const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c))}return r;})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
