(function(){
const {S,save,uid,Photos,photoURL,compress,calc}=Store;
const $=s=>document.querySelector(s);const view=$('#view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const yuan=BreadCalc.fmtYuan;
const fx=(v,d=1)=>BreadCalc.fmtNum(v,d);
const safeUrl=u=>/^https?:\/\//i.test(String(u||'').trim())?String(u).trim():'';
const pid=v=>String(v||'').replace(/[^\w-]/g,'');
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const stars=n=>'★'.repeat(n||0)+'☆'.repeat(5-(n||0));
function toast(m,ms=1800){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),ms)}
window.addEventListener('bn-save-error',()=>toast('⚠️ 保存失败：浏览器存储空间不足',3500));
function openModal(html){const m=$('#modal');m.classList.remove('closing');const sh=$('#sheet');sh.style.transform='';sh.innerHTML=html;sh.style.animation='none';sh.offsetHeight;sh.style.animation='';m.hidden=false;haptic()}
function closeModal(){const m=$('#modal');if(m.hidden)return;if(REDUCED){m.hidden=true;$('#sheet').innerHTML='';return}m.classList.add('closing');setTimeout(()=>{m.hidden=true;m.classList.remove('closing');$('#sheet').innerHTML='';$('#sheet').style.transform=''},280)}
window.closeModal=closeModal;
// drag-to-dismiss bottom sheet
(()=>{const sh=$('#sheet');let y0=null,dy=0,t0=0;
 sh.addEventListener('touchstart',e=>{if(sh.scrollTop>0)return;y0=e.touches[0].clientY;dy=0;t0=Date.now()},{passive:true});
 sh.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>0){sh.style.transition='none';sh.style.transform=`translate3d(0,${dy}px,0)`}},{passive:true});
 sh.addEventListener('touchend',()=>{if(y0==null)return;const v=dy/(Date.now()-t0);sh.style.transition='transform .45s var(--spring)';if(dy>120||v>.6){closeModal()}else sh.style.transform='';y0=null});})();
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function haptic(ms=8){try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}}
document.addEventListener('click',e=>{if(e.target.closest('.btn,.tabbar a,.swatch,.seg button,.star-input button,.icon-btn'))haptic()},true);
function countUp(el){el.querySelectorAll('[data-num]').forEach(n=>{const to=+n.dataset.num,from=+(n.dataset.prev||0),fmt=n.dataset.fmt;
  const f=v=>fmt==='yuan'?yuan(v):fmt==='int'?String(Math.round(v)):fx(v)+'%';
  if(REDUCED||from===to){n.textContent=f(to);return}const t0=performance.now(),D=650;
  const step=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,4);n.textContent=f(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
const num=(v,fmt,prev)=>`<b data-num="${v}" data-fmt="${fmt}" data-prev="${prev??0}">${fmt==='yuan'?yuan(0):fmt==='int'?'0':'0%'}</b>`;
function stagger(el){if(!el)return;el.classList.add('stagger');[...el.children].forEach((c,i)=>c.style.setProperty('--i',Math.min(i,12)))}
function moveInd(){const a=document.querySelector('.tabbar a.on'),ind=$('.tab-ind');if(!ind)return;if(!a){ind.style.opacity=0;return}ind.style.opacity=1;ind.style.width=a.offsetWidth+'px';ind.style.transform=`translateX(${a.offsetLeft}px)`}
window.addEventListener('resize',moveInd);
function segInd(seg){const on=seg.querySelector('button.on');if(!on)return;let i=seg.querySelector('.seg-ind');if(!i){i=document.createElement('i');i.className='seg-ind';seg.prepend(i)}i.style.width=on.offsetWidth+'px';i.style.transform=`translateX(${on.offsetLeft-4}px)`}
const recipe=id=>S.recipes.find(r=>r.id===id);
function setHeader(title,back,action=''){$('#title').textContent=title;$('#backBtn').hidden=!back;$('#topAction').innerHTML=action;document.title=title+' · 面包手记'}
$('#backBtn').onclick=()=>history.length>1?history.back():location.hash='#/recipes';

// ---------- theme ----------
function applyTheme(){const r=document.documentElement;r.style.setProperty('--primary',S.settings.theme);
  if(S.settings.mode==='auto')r.removeAttribute('data-mode');else r.dataset.mode=S.settings.mode;
  document.querySelector('meta[name=theme-color]').content=S.settings.theme}
applyTheme();
const PRESETS=[['麦香棕','#c8873a'],['可可','#7b4b2a'],['抹茶','#5a8f4e'],['莓果','#d0566c'],['海盐蓝','#3a7bbf'],['紫薯','#7d5bbf'],['黑麦','#4a4a4a'],['南瓜','#e07b24']];

// ---------- router ----------
const routes=[];const route=(re,fn)=>routes.push([re,fn]);
const TABS=['recipes','bakes','discover','stats','me'];let lastPath='';
const depth=p=>/^\/(recipe|bake-edit|recipe-edit|timer|scan)/.test(p)?(/edit|scan/.test(p)?2:1):0;
const tabOf=p=>{const k=p.split('/')[1]||'';return k.startsWith('recipe')?'recipes':k.startsWith('bake')?'bakes':k};
function render(){const h=location.hash.slice(1)||'/recipes';const path0=h.split('?')[0];
  let dir=1;if(lastPath){const d1=depth(lastPath),d2=depth(path0);dir=d2!==d1?(d2>d1?1:-1):(TABS.indexOf(tabOf(path0))>=TABS.indexOf(tabOf(lastPath))?1:-1)}
  const same=lastPath===path0;lastPath=path0;document.documentElement.style.setProperty('--dir',dir);
  if(!same&&!REDUCED&&document.startViewTransition){document.startViewTransition(()=>doRender(h))}
  else{doRender(h);if(!same&&!REDUCED){view.classList.remove('enter','back');view.offsetWidth;view.classList.add('enter');if(dir<0)view.classList.add('back')}}}
function doRender(h){const [path,qs]=h.split('?');const q=new URLSearchParams(qs||'');
  document.querySelectorAll('.tabbar a').forEach(a=>a.classList.toggle('on',path.startsWith('/'+a.dataset.tab)||(a.dataset.tab==='recipes'&&path.startsWith('/recipe'))||(a.dataset.tab==='bakes'&&path.startsWith('/bake'))));
  moveInd();
  for(const [re,fn] of routes){const m=path.match(re);if(m){view.innerHTML='';window.scrollTo(0,0);try{fn(...m.slice(1),q);countUp(view);view.querySelectorAll('.seg').forEach(segInd)}catch(e){console.error(e);view.innerHTML='<div class="empty">出错了：'+esc(e.message)+'</div>'}return}}
  location.hash='#/recipes'}
window.addEventListener('hashchange',()=>{try{closeModal()}catch(e){}render()});
(()=>{let x0,y0,ok;view.addEventListener('touchstart',e=>{const t=e.target;ok=!t.closest('input,textarea,select,.swipe-wrap,.photos,svg,table,.sheet')&&depth(lastPath)===0;x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
 view.addEventListener('touchend',e=>{if(!ok)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;if(Math.abs(dx)<80||Math.abs(dy)>Math.abs(dx)*.6)return;
  const i=TABS.indexOf(tabOf(lastPath))+(dx<0?1:-1);if(i>=0&&i<TABS.length){haptic(6);location.hash='#/'+TABS[i]}},{passive:true});})();
// 左滑删除：Pointer Events（iOS 13+ Safari 支持）+ touch-action:pan-y；露出的是真正的 <button>
const OPEN_X=96,FULL_X=190;let openSwipe=null;
function closeSwipe(except){if(openSwipe&&openSwipe!==except){openSwipe.card.style.transform='';openSwipe.wrap.classList.remove('open');openSwipe=null}}
document.addEventListener('pointerdown',e=>{if(openSwipe&&!openSwipe.wrap.contains(e.target))closeSwipe()},true);
window.addEventListener('scroll',()=>closeSwipe(),{passive:true});
function swipeDelete(wrap,onDelete){const card=wrap.querySelector('.card'),btn=wrap.querySelector('.swipe-del');const me={wrap,card};let x0,y0,dx=0,base=0,mode=null,pid=null;
 const set=x=>{card.style.transform=x?`translate3d(${x}px,0,0)`:'';btn.style.opacity=Math.min(1,-x/OPEN_X)};
 const doDel=()=>{haptic(15);if(onDelete()===false){set(-OPEN_X)}};
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();doDel()});
 card.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;closeSwipe(me);pid=e.pointerId;x0=e.clientX;y0=e.clientY;dx=0;mode=null;base=wrap.classList.contains('open')?-OPEN_X:0});
 card.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;const mx=e.clientX-x0,my=e.clientY-y0;
  if(!mode){mode=Math.abs(mx)>8&&Math.abs(mx)>Math.abs(my)?'x':Math.abs(my)>8?'y':null;if(mode==='x'){try{card.setPointerCapture(pid)}catch(_){}wrap.classList.add('dragging')}}
  if(mode!=='x')return;dx=Math.min(0,base+mx);set(dx<-FULL_X?-FULL_X+(dx+FULL_X)*.3:dx)});
 const end=e=>{if(e.pointerId!==pid)return;pid=null;wrap.classList.remove('dragging');
  if(mode==='x'){card._swiped=true;setTimeout(()=>card._swiped=false,80);
   if(dx<=-FULL_X){set(-OPEN_X);wrap.classList.add('open');openSwipe=me;doDel()}
   else if(dx<-OPEN_X/2){set(-OPEN_X);wrap.classList.add('open');openSwipe=me}else{set(0);wrap.classList.remove('open');if(openSwipe===me)openSwipe=null}}
  else if(base){card._swiped=true;setTimeout(()=>card._swiped=false,80);set(0);wrap.classList.remove('open');openSwipe=null}};
 card.addEventListener('pointerup',end);card.addEventListener('pointercancel',e=>{if(e.pointerId!==pid)return;pid=null;wrap.classList.remove('dragging');if(!wrap.classList.contains('open'))set(0)});}

// ---------- recipes ----------
route(/^\/recipes$/,()=>{
  setHeader('我的配方',false);
  if(!S.recipes.length){view.innerHTML=`<div class="empty"><span class="mascot">🍞</span><b>面包篮还空空的～</b><p>先来一个配方吧，烤箱已经在等你啦 ✨</p><p class="row" style="justify-content:center"><a class="btn" href="#/recipe-edit/new">新建配方</a><a class="btn ghost" href="#/discover">从经典配方添加</a></p></div>`;}
  else view.innerHTML=`<input id="q" placeholder="🔍 找找今天想烤哪一个…" style="margin-bottom:14px">`+'<div id="rl"></div>';
  const list=()=>{const k=($('#q')?.value||'').trim();const el=$('#rl');if(!el)return;
    el.innerHTML=S.recipes.filter(r=>!k||r.name.includes(k)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(r=>{const c=calc(r);const n=S.bakes.filter(b=>b.recipeId===r.id).length;
      return `<div class="swipe-wrap" data-wid="${r.id}"><button type="button" class="swipe-del" aria-label="删除配方">🗑️ 删除</button><div class="card list-item press" data-id="${r.id}"><div class="thumb" data-photo="${pid(r.cover)}">${EMO(r.name)}</div><div class="grow"><b>${esc(r.name)}</b><div class="muted">面粉 ${fx(c.flour,0)}g · 水合 ${fx(c.hydration)}% · ${r.yieldCount||1} 个</div><div class="muted">成本 ${yuan(c.cost)} · 每个 ${yuan(c.perLoaf)} · 烤过 ${n} 次</div></div><span class="muted" style="font-size:20px">›</span></div></div>`}).join('')||'<div class="empty"><span class="mascot">🥐</span><b>没找到呢</b>换个关键词试试？</div>';
    el.querySelectorAll('[data-id]').forEach(d=>d.onclick=()=>{if(!d._swiped)location.hash='#/recipe/'+d.dataset.id});fillThumbs(el);stagger(el);
    el.querySelectorAll('.swipe-wrap').forEach(w=>swipeDelete(w,()=>{const r=recipe(w.dataset.wid);if(!confirm(`删除配方「${r.name}」？`))return false;S.recipes=S.recipes.filter(x=>x.id!==r.id);save();toast('已删除，拜拜 👋');w.style.transition='opacity .25s';w.style.opacity=0;setTimeout(list,250)}))};
  $('#q')&&($('#q').oninput=list);list();
  view.insertAdjacentHTML('beforeend',`<a class="btn fab" href="#/recipe-edit/new" aria-label="新建配方">＋</a>`);
});
async function fillThumbs(root){for(const el of root.querySelectorAll('[data-photo]')){const id=el.dataset.photo;if(!id)continue;try{const u=await photoURL(id);if(u&&el.isConnected)el.outerHTML=`<img class="thumb" src="${esc(u)}" alt="">`}catch(e){}}}

route(/^\/recipe\/([\w]+)$/,(id,q)=>{
  const r=recipe(id);if(!r)return location.hash='#/recipes';
  setHeader(r.name,true,`<a class="btn sm ghost" href="#/recipe-edit/${id}">编辑</a>`);
  let scale=1,prev={h:0,c:0,p:0},drawn=false;
  const draw=()=>{const c=calc(r,scale);
    $('#rtable').innerHTML=`<table><tr><th>原料</th><th class="n">克数</th><th class="n">烘焙%</th><th class="n">成本</th></tr>${c.rows.map(i=>`<tr><td>${esc(i.name)} ${i.group?`<span class="tag soft">${esc(i.group)}</span>`:''}${i.isFlour?'<span class="tag">粉</span>':''}</td><td class="n">${fx(i.g)}</td><td class="n">${fx(i.pct)}%</td><td class="n">${i.priced?yuan(i.cost):'<span class="muted">未定价</span>'}</td></tr>`).join('')}
      <tr><td><b>合计</b></td><td class="n"><b>${fx(c.total,0)}</b></td><td class="n">${c.flour?fx(c.total/c.flour*100):0}%</td><td class="n"><b>${yuan(c.cost)}</b></td></tr></table>`;
    $('#rsum').innerHTML=`<div class="stat">${num(c.hydration,'pct',prev.h)}💧 水合</div><div class="stat">${num(c.cost,'yuan',prev.c)}💰 总成本</div><div class="stat">${num(c.perLoaf,'yuan',prev.p)}🍞 每个</div>`;prev={h:c.hydration,c:c.cost,p:c.perLoaf};if(drawn)countUp($('#rsum'));drawn=true;
    $('#rmiss').innerHTML=c.missing.length?`<div class="hint">以下原料未在价格库中定价：${c.missing.map(esc).join('、')}。<a href="#/me">去价格库添加</a></div>`:'';
    $('#scaleInfo').textContent=`缩放 ×${fx(scale,2)} · 面团 ${fx(c.total,0)}g · 每个约 ${fx(c.pieceWeight,0)}g`;view.querySelectorAll('[data-sc]').forEach(b=>b.classList.toggle('on',Math.abs(+b.dataset.sc-scale)<1e-9))};
  const base=calc(r);
  view.innerHTML=`<div class="stats" id="rsum"></div>
  <div class="card"><h3>配比</h3><div id="rtable"></div><div id="rmiss"></div></div>
  <div class="card"><h3>按需缩放</h3><div class="grid2"><div><label>目标面团总重 (g)</label><input id="tw" type="number" inputmode="decimal" placeholder="${fx(base.total,0)}"></div><div><label>目标个数</label><input id="tn" type="number" inputmode="numeric" placeholder="${r.yieldCount||1}"></div></div><div class="chips" style="margin-top:10px">${[0.5,1,1.5,2].map(k=>`<button class="chip" data-sc="${k}">${k}×</button>`).join('')}</div><p class="muted" id="scaleInfo"></p><button class="btn ghost sm" id="sreset">还原</button></div>
  ${r.steps?`<div class="card"><h3>做法</h3><div style="white-space:pre-wrap">${esc(r.steps)}</div></div>`:''}
  ${(r.bulkTime||r.proofTime||r.ovenTemp)?`<div class="card"><h3>⏱ 发酵与烘烤</h3><div class="muted">${r.bulkTime?`主发酵 ${esc(r.bulkTime)} 分钟 · `:''}${r.proofTime?`二发 ${esc(r.proofTime)} 分钟 · `:''}${r.ovenTemp?`${esc(r.ovenTemp)}℃ `:''}${r.ovenTime?`${esc(r.ovenTime)} 分钟`:''}</div></div>`:''}
  ${r.source?`<div class="card"><h3>来源</h3>${safeUrl(r.source)?`<a href="${esc(safeUrl(r.source))}" target="_blank" rel="noopener noreferrer" style="word-break:break-all;color:var(--primary)">${esc(r.source)}</a>`:`<span style="word-break:break-all">${esc(r.source)}</span>`}</div>`:''}
  ${r.scanPhoto?`<div class="card"><h3>📷 识别原图</h3><img class="scan-orig" data-scan="${pid(r.scanPhoto)}" alt="识别原图"></div>`:''}
  <div class="row" style="margin-bottom:12px"><a class="btn" href="#/bake-edit/new?r=${id}">＋ 记录一次烘焙</a><a class="btn ghost" href="#/timer?r=${id}">⏱ 发酵计时</a><button class="btn ghost" id="share">分享卡片</button><button class="btn ghost" id="dup">复制</button><button class="btn danger" id="del">删除</button></div>
  <h3>🗓 烘焙记录</h3><div id="rbakes" class="timeline"></div>`;stagger(view);
  draw();
  $('#tw').oninput=e=>{$('#tn').value='';scale=BreadCalc.scaleFor(r,{targetWeight:e.target.value},S.prices);draw()};
  $('#tn').oninput=e=>{$('#tw').value='';scale=BreadCalc.scaleFor(r,{targetCount:e.target.value},S.prices);draw()};
  view.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{scale=+b.dataset.sc;$('#tw').value=$('#tn').value='';draw()});
  view.querySelectorAll('img[data-scan]').forEach(async im=>{const u=await photoURL(im.dataset.scan);if(u){im.src=u;im.onclick=()=>openModal(`<img src="${esc(u)}" style="width:100%;border-radius:12px"><button class="btn block" style="margin-top:10px" onclick="closeModal()">关闭</button>`)}else im.remove()});
  $('#sreset').onclick=()=>{scale=1;$('#tw').value=$('#tn').value='';draw()};
  $('#share').onclick=()=>shareCard({recipe:r});
  $('#dup').onclick=()=>{const n={...structuredClone(r),id:uid(),name:r.name+' 副本',createdAt:Date.now(),updatedAt:Date.now()};S.recipes.push(n);save();location.hash='#/recipe/'+n.id};
  $('#del').onclick=()=>{if(!confirm(`删除配方「${r.name}」？相关烘焙记录会保留。`))return;S.recipes=S.recipes.filter(x=>x.id!==id);save();toast('已删除');location.hash='#/recipes'};
  renderTimeline($('#rbakes'),S.bakes.filter(b=>b.recipeId===id));
});

route(/^\/recipe-edit\/([\w]+)$/,(id,q)=>{
  const isNew=id==='new';const draft=window._draft;window._draft=null;
  const r=isNew?(draft||{name:'',yieldCount:1,ingredients:[{name:'高筋面粉',grams:250,isFlour:true},{name:'水',grams:170},{name:'盐',grams:5},{name:'干酵母',grams:3}],steps:'',source:''}):structuredClone(recipe(id));
  if(!r)return location.hash='#/recipes';
  setHeader(isNew?'新建配方':'编辑配方',true);
  view.innerHTML=`<div class="card"><label>配方名称</label><input id="fname" value="${esc(r.name)}" placeholder="例如：北海道吐司">
  <div class="grid2"><div><label>出品个数</label><input id="fyield" type="number" min="1" value="${r.yieldCount||1}"></div><div><label>来源链接（可选）</label><input id="fsrc" value="${esc(r.source||'')}" placeholder="https://"></div>
  <div><label>主发酵（分钟，可选）</label><input id="fbulk" type="number" inputmode="numeric" min="0" value="${esc(r.bulkTime||'')}" placeholder="60"></div><div><label>二次发酵（分钟，可选）</label><input id="fproof" type="number" inputmode="numeric" min="0" value="${esc(r.proofTime||'')}" placeholder="45"></div>
  <div><label>烤温 ℃（可选）</label><input id="fotemp" type="number" inputmode="numeric" value="${esc(r.ovenTemp||'')}" placeholder="180"></div><div><label>烘烤分钟（可选）</label><input id="fotime" type="number" inputmode="numeric" value="${esc(r.ovenTime||'')}" placeholder="35"></div></div></div>
  <div class="card"><div class="row between"><h3>原料</h3><span class="muted small">勾选 = 面粉（计算烘焙百分比基准）</span></div>
  <div class="ing-row muted small"><span>名称</span><span>克数</span><span>面粉</span><span></span></div><div id="ings"></div>
  <div class="row"><button class="btn ghost sm" id="addIng">＋ 添加原料</button></div><p class="muted small" id="live"></p></div>
  <div class="card"><label>做法 / 备注</label><textarea id="fsteps" rows="6">${esc(r.steps||'')}</textarea></div>
  <datalist id="pnames">${S.prices.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
  <button class="btn block" id="saveR">保存配方</button>`;
  const ingEl=$('#ings');
  const row=(i={})=>{const d=document.createElement('div');d.className='ing-row';d.dataset.group=i.group||'';d.innerHTML=`<input class="iname" list="pnames" value="${esc(i.name||'')}" placeholder="原料"><input class="igram" type="number" inputmode="decimal" min="0" value="${esc(i.grams??'')}" placeholder="g"><input class="iflour" type="checkbox" ${i.isFlour?'checked':''}><button class="icon-btn" style="font-size:20px;color:var(--danger)" aria-label="删除">×</button>`;
    d.querySelector('button').onclick=()=>{d.remove();live()};const n=d.querySelector('.iname');n.addEventListener('change',()=>{if(Store.isFlour(n.value))d.querySelector('.iflour').checked=true;live()});ingEl.appendChild(d)};
  const collect=()=>[...ingEl.children].map(d=>{const o={name:d.querySelector('.iname').value.trim(),grams:Math.max(0,+d.querySelector('.igram').value||0),isFlour:d.querySelector('.iflour').checked};if(d.dataset.group)o.group=d.dataset.group;return o}).filter(i=>i.name);
  const live=()=>{const c=calc({ingredients:collect(),yieldCount:+$('#fyield').value||1});$('#live').textContent=`总重 ${fx(c.total,0)}g · 面粉 ${fx(c.flour,0)}g · 水合 ${fx(c.hydration)}% · 成本 ${yuan(c.cost)}`};
  r.ingredients.forEach(row);ingEl.oninput=live;$('#fyield').oninput=live;live();
  $('#addIng').onclick=()=>{row();ingEl.lastChild.querySelector('input').focus()};
  $('#saveR').onclick=()=>{const name=$('#fname').value.trim();if(!name)return toast('请填写配方名称');const ings=collect();if(!ings.length)return toast('至少添加一种原料');
    if(!ings.some(i=>i.isFlour))return toast('请至少勾选一种面粉');
    const nn=v=>{const x=Math.round(+v);return x>0?x:''};Object.assign(r,{name,yieldCount:Math.max(1,Math.floor(+$('#fyield').value)||1),source:$('#fsrc').value.trim(),bulkTime:nn($('#fbulk').value),proofTime:nn($('#fproof').value),ovenTemp:nn($('#fotemp').value),ovenTime:nn($('#fotime').value),steps:$('#fsteps').value,ingredients:ings,updatedAt:Date.now()});
    if(isNew){r.id=uid();r.createdAt=Date.now();S.recipes.push(r)}else{const i=S.recipes.findIndex(x=>x.id===id);S.recipes[i]=r}
    ensurePrices(ings);save();toast('已保存');location.replace('#/recipe/'+r.id)};
});
function ensurePrices(ings){ings.forEach(i=>{if(!Store.findPrice(i.name))S.prices.push({id:uid(),name:i.name,price:0,size:0,auto:true})})}

// ---------- bakes ----------
route(/^\/bakes$/,()=>{
  setHeader('烘焙记录',false);
  if(!S.bakes.length){view.innerHTML=`<div class="empty"><span class="mascot">🥯</span><b>还没有烘焙日记哦</b><p>每烤一次就记一笔，看着自己越烤越好吃 🥰</p></div>`;}
  else{view.innerHTML=`<select id="rf" style="margin-bottom:12px"><option value="">全部配方</option>${S.recipes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><div id="tl" class="timeline"></div>`;
    const draw=()=>renderTimeline($('#tl'),S.bakes.filter(b=>!$('#rf').value||b.recipeId===$('#rf').value));$('#rf').onchange=draw;draw()}
  if(S.recipes.length)view.insertAdjacentHTML('beforeend',`<a class="btn fab" href="#/bake-edit/new" aria-label="新记录">＋</a>`);
});
function renderTimeline(el,bakes){
  bakes=[...bakes].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt-a.createdAt));
  if(!bakes.length){el.innerHTML='<p class="muted">还没烤过这个，快去试试吧 🔥</p>';return}
  el.innerHTML=bakes.map(b=>{const r=recipe(b.recipeId);return `<div class="card tl-item"><div class="row between"><b>${esc(r?r.name:b.recipeName||'已删除的配方')}</b><span class="muted">${esc(b.date)}</span></div>
   <div class="stars">${stars(b.rating)}</div>
   <div class="muted">${b.ovenTemp?`🔥 ${esc(b.ovenTemp)}℃ `:''}${b.ovenTime?`⏱ ${esc(b.ovenTime)} 分钟 `:''}${b.envTemp!==''&&b.envTemp!=null?`🌡 ${esc(b.envTemp)}℃ `:''}${b.envHum!==''&&b.envHum!=null?`💦 ${esc(b.envHum)}% `:''}${b.scale&&b.scale!=1?`· ×${fx(b.scale,2)} `:''}· 花费 ${yuan(b.cost)}</div>
   ${b.ferment?`<div class="small"><b>发酵：</b>${esc(b.ferment)}</div>`:''}${b.notes?`<div style="white-space:pre-wrap">${esc(b.notes)}</div>`:''}
   <div class="photos">${(b.photos||[]).map(p=>`<img data-pid="${pid(p)}" alt="">`).join('')}</div>
   <div class="row" style="margin-top:8px"><a class="btn sm ghost" href="#/bake-edit/${b.id}">编辑</a><button class="btn sm ghost" data-share="${b.id}">分享</button><button class="btn sm danger" data-del="${b.id}">删除</button></div></div>`}).join('');
  stagger(el);el.querySelectorAll('img[data-pid]').forEach(async im=>{const u=await photoURL(im.dataset.pid);if(!u){im.remove();return}im.src=u;im.onclick=()=>openModal(`<img src="${esc(im.src)}" style="width:100%;border-radius:12px"><button class="btn block" style="margin-top:10px" onclick="closeModal()">关闭</button>`)});
  el.querySelectorAll('[data-share]').forEach(x=>x.onclick=()=>{const b=S.bakes.find(y=>y.id===x.dataset.share);shareCard({recipe:recipe(b.recipeId),bake:b})});
  el.querySelectorAll('[data-del]').forEach(x=>x.onclick=async()=>{if(!confirm('删除这条记录？'))return;const b=S.bakes.find(y=>y.id===x.dataset.del);for(const p of b.photos||[])await Photos.del(p).catch(()=>{});S.bakes.splice(S.bakes.indexOf(b),1);save();render()});
}
route(/^\/bake-edit\/([\w]+)$/,(id,q)=>{
  if(!S.recipes.length)return location.hash='#/recipes';
  const isNew=id==='new';const pre=isNew&&q.get('from')==='timer'?(()=>{try{return JSON.parse(sessionStorage.getItem('breadnotes.timerDone')||'null')}catch(e){return null}})():null;
  const src=isNew?null:S.bakes.find(x=>x.id===id);if(!isNew&&!src)return location.hash='#/bakes';
  const b=isNew?Object.assign({date:today(),rating:4,scale:1,recipeId:q.get('r'),photos:[]},pre||{}):structuredClone(src);
  if(!recipe(b.recipeId))b.recipeId=S.recipes[0].id;
  setHeader(isNew?'记录烘焙':'编辑记录',true);let photos=[...(b.photos||[])];const removed=[];
  view.innerHTML=`<div class="card"><label>配方</label><select id="brec">${S.recipes.map(r=>`<option value="${r.id}" ${r.id===b.recipeId?'selected':''}>${esc(r.name)}</option>`).join('')}</select>
   <div class="grid2"><div><label>日期</label><input id="bdate" type="date" value="${esc(b.date)}"></div><div><label>用量倍数</label><input id="bscale" type="number" step="0.1" min="0.1" value="${b.scale||1}"></div>
   <div><label>烤温 (℃)</label><input id="btemp" inputmode="numeric" value="${esc(b.ovenTemp||'')}" placeholder="180"></div><div><label>时间 (分钟)</label><input id="btime" inputmode="numeric" value="${esc(b.ovenTime||'')}" placeholder="35"></div>
   <div><label>环境温度 (℃)</label><input id="benvt" type="number" inputmode="decimal" value="${esc(b.envTemp??'')}" placeholder="26"></div><div><label>环境湿度 (%)</label><input id="benvh" type="number" inputmode="decimal" min="0" max="100" value="${esc(b.envHum??'')}" placeholder="65"></div></div>
   <label>评分</label><div class="star-input" id="bstar">${[1,2,3,4,5].map(i=>`<button data-v="${i}">★</button>`).join('')}</div>
   <label>发酵记录</label><textarea id="bferm" rows="2" placeholder="室温 26℃，一发 60 分钟到 2 倍…">${esc(b.ferment||'')}</textarea>
   <label>心得 / 改进</label><textarea id="bnotes" rows="3" placeholder="组织、口感、下次怎么改…">${esc(b.notes||'')}</textarea>
   <p class="muted" id="bcost"></p></div>
   <div class="card"><div class="row between"><h3>照片 <span class="muted small" id="bpc"></span></h3><label class="btn sm ghost" id="bfl" style="margin:0;color:var(--primary)">📷 拍照/上传<input id="bfile" type="file" accept="image/*" multiple hidden></label></div><div class="pgrid" id="bph"></div></div>
   <button class="btn block" id="bsave">保存记录</button>`;
  let rating=b.rating||0;const sr=()=>$('#bstar').querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.v<=rating));sr();
  $('#bstar').onclick=e=>{if(e.target.dataset.v){rating=+e.target.dataset.v;sr()}};
  const cost=()=>{const c=calc(recipe($('#brec').value),Math.max(0,+$('#bscale').value)||1);$('#bcost').textContent=`本次原料花费约 ${yuan(c.cost)}（按当前价格库计算）`;return c};
  $('#brec').onchange=$('#bscale').oninput=cost;cost();
  const MAXP=6;
  const drawPh=async()=>{const el=$('#bph');$('#bpc').textContent=`${photos.length}/${MAXP}`;$('#bfl').classList.toggle('disabled',photos.length>=MAXP);el.innerHTML=photos.length?'':'<span class="muted small">还没有照片（最多 6 张，第 1 张为封面）</span>';
    for(const [k,p] of photos.entries()){const u=await photoURL(p);const w=document.createElement('div');w.className='pcell';w.innerHTML=`<img src="${esc(u)}" alt="">${k===0?'<span class="pbadge">封面</span>':''}<div class="pbar"><button data-mv="-1" ${k===0?'disabled':''} aria-label="前移">‹</button><button data-rm aria-label="删除">×</button><button data-mv="1" ${k===photos.length-1?'disabled':''} aria-label="后移">›</button></div>`;
      w.querySelector('[data-rm]').onclick=()=>{photos=photos.filter(x=>x!==p);removed.push(p);drawPh()};
      w.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const j=k+ +b.dataset.mv;if(j<0||j>=photos.length)return;[photos[k],photos[j]]=[photos[j],photos[k]];drawPh()});el.appendChild(w)}};drawPh();
  $('#bfile').onchange=async e=>{const fs=[...e.target.files];e.target.value='';const room=MAXP-photos.length;if(room<=0)return toast('每条记录最多 6 张照片');if(fs.length>room)toast(`最多 6 张，已添加前 ${room} 张`);
    for(const f of fs.slice(0,room)){try{const blob=await compress(f);photos.push(await Photos.put(blob))}catch(err){toast('图片读取失败')}}drawPh()};
  $('#bsave').onclick=async()=>{const r=recipe($('#brec').value);const c=cost();
    if(!r)return toast('请选择配方');const ev=v=>{v=String(v).trim();return v===''||!Number.isFinite(+v)?'':+v};
    Object.assign(b,{recipeId:r.id,recipeName:r.name,date:$('#bdate').value||today(),scale:Math.max(0,+$('#bscale').value)||1,envTemp:ev($('#benvt').value),envHum:(x=>x===''?'':Math.min(100,Math.max(0,x)))(ev($('#benvh').value)),ovenTemp:$('#btemp').value.trim(),ovenTime:$('#btime').value.trim(),rating,ferment:$('#bferm').value.trim(),notes:$('#bnotes').value.trim(),photos,
      cost:c.cost,itemCosts:BreadCalc.itemCosts(c),updatedAt:Date.now()});
    if(isNew){b.id=uid();b.createdAt=Date.now();S.bakes.push(b);sessionStorage.removeItem('breadnotes.timerDone')}else{S.bakes[S.bakes.findIndex(x=>x.id===id)]=b}
    photos=photos.slice(0,MAXP);b.photos=photos;if(photos[0]&&!r.cover)r.cover=photos[0];for(const p of removed){await Photos.del(p).catch(()=>{});if(r.cover===p)r.cover=photos[0]||''}
    save();toast('已保存');location.replace('#/recipe/'+r.id)};
});

// ---------- share card ----------
async function shareCard({recipe:r,bake},pick){
  if(!r)return toast('配方不存在');
  const all=(bake?.photos?.length?bake.photos:(r.cover?[r.cover]:[])).slice(0,6);
  if(pick===undefined&&all.length>1)return pickPhotos(all,sel=>shareCard({recipe:r,bake},sel));
  const ids=(pick||all).slice(0,6);
  const c=calc(r,bake?.scale||1);const W=1080,H=1440;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const P=S.settings.theme;g.fillStyle='#fbf7f1';g.fillRect(0,0,W,H);
  const imgs=[];for(const id of ids){const u=await photoURL(id);if(!u)continue;const im=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u});if(im)imgs.push(im)}
  const n=imgs.length;const ph=n?(n>=5?780:720):300;
  if(n){const M=n>1?24:0,G=14;const cells=BreadCalc.collageLayout(n,W-2*M,ph-M,G);
    imgs.forEach((im,k)=>{const q=cells[k];const x=M+q.x,y=M+q.y;const cc=BreadCalc.coverCrop(im.width,im.height,q.w,q.h);g.save();rr(g,x,y,q.w,q.h,n>1?28:0);g.clip();g.drawImage(im,cc.sx,cc.sy,cc.sw,cc.sh,x,y,q.w,q.h);g.restore()})}
  else{const gr=g.createLinearGradient(0,0,W,ph);gr.addColorStop(0,P);gr.addColorStop(1,'#f5d6a0');g.fillStyle=gr;g.fillRect(0,0,W,ph);g.font='160px serif';g.textAlign='center';g.fillText('🍞',W/2,ph/2+55);g.textAlign='left'}
  const img=n>0;
  const F='"PingFang SC","Microsoft YaHei",sans-serif';let y=ph+90;
  g.fillStyle='#2b2420';g.font=`bold 64px ${F}`;g.fillText(r.name.slice(0,16),60,y);y+=60;
  g.fillStyle='#8a7f76';g.font=`34px ${F}`;g.fillText(bake?`${bake.date}  ${stars(bake.rating)}${bake.ovenTemp?`  ${bake.ovenTemp}℃`:''}${bake.ovenTime?` ${bake.ovenTime}min`:''}`:`出品 ${r.yieldCount||1} 个 · 面团 ${fx(c.total,0)}g`,60,y);y+=50;
  // pills
  const pills=[`水合 ${fx(c.hydration)}%`,`成本 ${yuan(c.cost)}`,`每个 ${yuan(c.perLoaf)}`];let x=60;g.font=`bold 34px ${F}`;
  for(const p of pills){const w=g.measureText(p).width+44;g.fillStyle=P;g.globalAlpha=.15;rr(g,x,y,w,62,31);g.fill();g.globalAlpha=1;g.fillStyle=P;g.fillText(p,x+22,y+43);x+=w+16}
  y+=110;g.font=`32px ${F}`;const rows=c.rows.slice(0,img?(ph>720?6:8):14);const col=Math.ceil(rows.length/2);
  rows.forEach((i,k)=>{const cx=k<col?60:W/2+20;const cy=y+(k%col)*52;g.fillStyle='#2b2420';g.fillText(i.name.slice(0,7),cx,cy);g.fillStyle='#8a7f76';g.textAlign='right';g.fillText(`${fx(i.g,0)}g · ${fx(i.pct,0)}%`,cx+440,cy);g.textAlign='left'});
  if(bake?.notes){const ny=y+col*52+20;if(ny<H-140){g.fillStyle='#5a4f46';g.font=`30px ${F}`;g.fillText('“'+bake.notes.replace(/\n/g,' ').slice(0,30)+(bake.notes.length>30?'…':'')+'”',60,ny)}}
  g.fillStyle=P;g.fillRect(0,H-90,W,90);g.fillStyle='#fff';g.font=`bold 34px ${F}`;g.fillText('🍞 面包手记 · 记录每一次烘焙',60,H-34);
  const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.9));const url=URL.createObjectURL(blob);const file=new File([blob],`面包手记-${r.name}.jpg`,{type:'image/jpeg'});
  const canShare=navigator.canShare&&navigator.canShare({files:[file]});window._lastShare={photos:n,layout:BreadCalc.collageLayout(n,W,ph,14).length};
  openModal(`<h3 style="margin-top:0">分享卡片</h3><img class="share-preview" src="${url}" alt="分享卡片">
   <div class="row" style="margin-top:12px"><a class="btn" href="${url}" download="${esc(file.name)}">保存图片</a>${canShare?'<button class="btn ghost" id="doShare">系统分享…</button>':''}${all.length>1?'<button class="btn ghost" id="rePick">换照片</button>':''}<button class="btn ghost" id="closeM">关闭</button></div>
   <div class="hint">发到微信朋友圈：网页无法直接发朋友圈。请点「保存图片」（在微信内置浏览器中可<b>长按上方图片</b>保存到相册），再打开微信 → 朋友圈 → 右上角相机 → 从相册选择。</div>`);
  $('#closeM').onclick=closeModal;if($('#rePick'))$('#rePick').onclick=()=>pickPhotos(all,sel=>shareCard({recipe:r,bake},sel),ids);
  if(canShare)$('#doShare').onclick=()=>navigator.share({files:[file],title:r.name,text:`${r.name} · 面包手记`}).catch(()=>{});
}
function pickPhotos(all,done,pre){let sel=new Set(pre||all);
  openModal(`<h3 style="margin-top:0">选择要拼进卡片的照片</h3><p class="muted small">按顺序拼图：1 张大图、2 张并排、3 张一大两小、4 张四宫格、5 张上二下三、6 张六宫格。</p><div class="pgrid pick" id="pk"></div><div class="row" style="margin-top:12px"><button class="btn" id="pkok">生成卡片</button><button class="btn ghost" onclick="closeModal()">取消</button></div>`);
  const draw=async()=>{const el=$('#pk');el.innerHTML='';for(const id of all){const u=await photoURL(id);const d=document.createElement('button');d.className='pcell'+(sel.has(id)?' on':'');d.innerHTML=`<img src="${esc(u)}" alt=""><span class="pcheck">${sel.has(id)?[...all].filter(x=>sel.has(x)).indexOf(id)+1:''}</span>`;d.onclick=()=>{sel.has(id)?sel.delete(id):sel.add(id);draw()};el.appendChild(d)}};draw();
  $('#pkok').onclick=()=>{const out=all.filter(x=>sel.has(x));done(out)}}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

// ---------- discover ----------
route(/^\/discover$/,()=>{
  setHeader('发现做法',false);
  view.innerHTML=`<div class="card"><h3>去平台搜索</h3><div class="row"><input id="kw" placeholder="例如：北海道吐司" style="flex:1"></div>
   <div class="row" style="margin-top:8px"><button class="btn" data-site="xcf">下厨房搜索</button><button class="btn" data-site="xhs" style="background:#ff2442">小红书搜索</button></div>
   <div class="hint">找到喜欢的做法后，复制用料文字回来用「导入做法」，或者<b>截图</b>后用「拍照 / 截图识别」。<br>小红书：手机上会先尝试打开小红书 App 并自动复制关键词；没装 App 时可打开小红书网页，在搜索框粘贴即可。</div></div>
   <a class="card press scan-entry" href="#/scan"><span class="mascot sm">📷</span><div class="grow"><b>拍照 / 截图识别配方</b><div class="muted small">支持多张图片批量识别，保存前逐条核对</div></div><span class="muted" style="font-size:20px">›</span></a>
   <div class="card"><h3>导入做法</h3><label>来源链接（可选）</label><input id="iurl" placeholder="粘贴小红书 / 下厨房链接">
   <label>配方名称</label><input id="iname" placeholder="自动识别或手动填写">
   <label>用料文字</label><textarea id="itext" rows="6" placeholder="高筋面粉 250g&#10;水 170克&#10;盐：5g&#10;鸡蛋 1个"></textarea>
   <button class="btn block" id="iparse" style="margin-top:10px">识别并核对</button></div>
   <div class="card"><h3>⏳ 发酵节奏小抄</h3><div class="small guide">${RHYTHM.map(([n,m,t])=>`<div class="row between"><b>${n}</b><span class="muted">${m}</span></div><p class="muted">${t}</p>`).join('')}</div><p class="muted small">在配方页点「⏱ 发酵计时」按这个节奏一步步计时，到点会响铃提醒。</p></div>
   <h3>📚 经典配方 · 一键收藏</h3><div id="lib"></div>`;
  view.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>{const kw=$('#kw').value.trim()||'面包';b.dataset.site==='xcf'?window.open(`https://www.xiachufang.com/search/?keyword=${encodeURIComponent(kw)}`,'_blank','noopener'):openXHS(kw)});
  $('#iparse').onclick=()=>{let text=$('#itext').value;let url=$('#iurl').value.trim();
    const res=BreadCalc.parseRecipeText(text);if(!res.ingredients.length)return toast('没有识别到「原料 + 用量」的行');
    if(!url)url=res.source;startReview([{text,parsed:res,engine:'text',name:$('#iname').value.trim(),source:url}])};
  $('#lib').innerHTML=BREAD_LIBRARY.map((l,k)=>{const r=libToRecipe(l);const c=calc(r);return `<div class="card press"><div class="row between"><div class="grow"><b>${EMO(l.name)} ${esc(l.name)}</b><div class="muted">面粉 ${fx(c.flour,0)}g · 水合 ${fx(c.hydration)}% · ${l.yieldCount} 个 · 约 ${yuan(c.cost)}</div></div><button class="btn sm" data-add="${k}">加入</button></div>
   <details><summary class="muted small" style="margin-top:6px;cursor:pointer">查看配比与做法</summary><p class="small">${r.ingredients.map(i=>`${esc(i.name)} ${i.grams}g (${c.flour>0?fx(i.grams/c.flour*100):0}%)`).join('、')}</p><div class="small" style="white-space:pre-wrap">${esc(l.steps)}</div></details></div>`}).join('');
  stagger($('#lib'));view.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const r=libToRecipe(BREAD_LIBRARY[b.dataset.add]);r.id=uid();r.createdAt=r.updatedAt=Date.now();S.recipes.push(r);ensurePrices(r.ingredients);save();toast('收进面包篮啦 🧺');location.hash='#/recipe/'+r.id});
});
function libToRecipe(l){return {name:l.name,yieldCount:l.yieldCount,steps:l.steps,source:'',bulkTime:l.bulkTime||'',proofTime:l.proofTime||'',ovenTemp:l.ovenTemp||'',ovenTime:l.ovenTime||'',ingredients:l.ing.map(([name,grams,f])=>({name,grams,isFlour:!!f}))}}

// ---------- stats ----------
let statTab='month';
route(/^\/stats$/,()=>{
  setHeader('费用统计',false);
  const bakes=S.bakes;const {total,month:thisMonth}=BreadCalc.totals(bakes);
  view.innerHTML=`<div class="stats"><div class="stat">${num(total,'yuan')}累计花费</div><div class="stat">${num(thisMonth,'yuan')}本月</div><div class="stat">${num(bakes.length,'int')}烘焙次数</div></div>
   <div class="seg">${[['month','按月'],['recipe','按配方'],['ing','按原料']].map(([k,t])=>`<button data-k="${k}" class="${k===statTab?'on':''}">${t}</button>`).join('')}</div>
   <div class="card" id="chart"></div><div class="card" id="stable"></div>
   <p class="muted small">统计基于烘焙记录（每次记录按当时价格库计算原料花费）。</p>`;
  view.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{statTab=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));segInd(b.parentNode);setTimeout(()=>doRender(location.hash.slice(1)),REDUCED?0:220)});
  if(!bakes.length){$('#chart').innerHTML='<div class="empty"><span class="mascot">📊</span><b>账本还是空白的</b>记录几次烘焙，这里就会长出小柱子 🌱</div>';$('#stable').remove();return}
  const items=BreadCalc.aggregate(bakes,S.recipes,statTab==='ing'?'ing':statTab);
  $('#chart').innerHTML=statTab==='month'?barChart(items.map(o=>[o.key.slice(5)+'月',o.value])):hbarChart(items.slice(0,10).map(o=>[o.key,o.value]));
  const sum=items.reduce((a,o)=>a+o.value,0);
  $('#stable').innerHTML=`<table><tr><th>${statTab==='month'?'月份':statTab==='recipe'?'配方':'原料'}</th><th class="n">${statTab==='ing'?'出现':'次数'}</th><th class="n">花费</th><th class="n">占比</th></tr>${items.filter(o=>o.count).map(o=>`<tr><td>${esc(o.key)}</td><td class="n">${o.count}</td><td class="n">${yuan(o.value)}</td><td class="n">${sum>0?fx(o.value/sum*100):0}%</td></tr>`).join('')}</table>`;
});
function barChart(data){const W=340,H=180,max=Math.max(...data.map(d=>+d[1]||0),1),bw=W/Math.max(1,data.length);
  return `<svg class="chart" viewBox="0 0 ${W} ${H+30}">${data.map(([l,v],i)=>{const h=v/max*H;return ` <rect class="bar" style="--i:${i}" x="${i*bw+4}" y="${H-h+10}" width="${bw-8}" height="${h}" rx="7" fill="var(--primary)" opacity="${v?1:.25}"/>${v?`<text x="${i*bw+bw/2}" y="${H-h+6}" font-size="8" text-anchor="middle" fill="var(--muted)">${Math.round(v)}</text>`:''}<text x="${i*bw+bw/2}" y="${H+24}" font-size="9" text-anchor="middle" fill="var(--muted)">${esc(l)}</text>`}).join('')}</svg>`}
function hbarChart(data){const W=340,rh=26,max=Math.max(...data.map(d=>d[1]),1);
  return `<svg class="chart" viewBox="0 0 ${W} ${data.length*rh+4}">${data.map(([l,v],i)=>`<text x="0" y="${i*rh+17}" font-size="11" fill="var(--text)">${esc(String(l).slice(0,7))}</text><rect class="hbar" style="--i:${i}" x="90" y="${i*rh+5}" width="${Math.max(2,v/max*190)}" height="16" rx="8" fill="var(--primary)"/><text x="${96+v/max*190}" y="${i*rh+17}" font-size="10" fill="var(--muted)">${yuan(v)}</text>`).join('')}</svg>`}

// ---------- me ----------
route(/^\/me$/,()=>{
  setHeader('我的',false);
  view.innerHTML=`<div class="card"><h3>🎨 主题色</h3><div class="swatches">${PRESETS.map(([n,c])=>`<button class="swatch ${S.settings.theme===c?'on':''}" style="background:${c}" title="${n}" data-c="${c}"></button>`).join('')}
   <label class="swatch" style="margin:0;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);position:relative" title="自定义"><input type="color" id="cc" value="${S.settings.theme}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%"></label></div>
   <label>外观</label><div class="seg" id="mode">${[['auto','跟随系统'],['light','浅色'],['dark','深色']].map(([k,t])=>`<button data-m="${k}" class="${S.settings.mode===k?'on':''}">${t}</button>`).join('')}</div></div>
   <div class="card"><div class="row between"><h3>🧂 原料价格库</h3><button class="btn sm" id="addP">＋ 添加</button></div><p class="muted small">填写购买价和包装规格，自动算出每克成本，所有配方共用。</p><input id="pq" placeholder="搜索原料" style="margin-bottom:8px"><div id="plist"></div></div>
   <div class="card"><h3>🤖 AI 识别配方（可选）</h3><p class="muted small">填写任意兼容 OpenAI Chat Completions 的视觉模型接口，用于「拍照 / 截图识别」。<b>API Key 只保存在这台设备的浏览器里</b>，不会导出、不会上传到本应用的任何服务器；识别时图片会直接从你的浏览器发送到你填写的地址（接口需支持跨域 CORS）。</p>
   <label>接口地址 Base URL</label><input id="lb" placeholder="https://api.0lll0.cn/v1" value="${esc(llmCfg().base||'')}" autocomplete="off">
   <label>模型名</label><input id="lm" placeholder="gpt-5.5" value="${esc(llmCfg().model||'')}" autocomplete="off">
   <label>API Key</label><input id="lk" type="password" placeholder="sk-…" value="${esc(llmCfg().key||'')}" autocomplete="off">
   <div class="row" style="margin-top:10px"><button class="btn" id="lsv">保存</button><button class="btn ghost" id="ltest">测试连接</button><button class="btn ghost" id="lclr">清除</button></div><p class="muted small" id="lres"></p></div>
   <div class="card"><h3>💾 数据备份</h3><p class="muted small">数据只保存在本机浏览器中。建议定期导出备份（含照片）。</p><div class="row"><button class="btn" id="exp">导出 JSON</button><label class="btn ghost" style="margin:0;color:var(--primary)">导入 JSON<input type="file" id="imp" accept="application/json,.json" hidden></label><button class="btn danger" id="clr">清空数据</button></div></div>
   <p class="muted small" style="text-align:center">🍞 面包手记 · 开源免费 · 数据只住在你的手机里</p>`;stagger(view);
  view.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{S.settings.theme=b.dataset.c;save();applyTheme();view.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on',x===b))});
  $('#cc').oninput=e=>{S.settings.theme=e.target.value;applyTheme()};$('#cc').onchange=e=>{S.settings.theme=e.target.value;save();applyTheme()};
  $('#mode').onclick=e=>{const b=e.target.closest('[data-m]');if(b){S.settings.mode=b.dataset.m;save();applyTheme();$('#mode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));segInd($('#mode'))}};
  const plist=()=>{const k=$('#pq').value.trim();$('#plist').innerHTML=`<table><tr><th>原料</th><th class="n">价格/规格</th><th class="n">每100g</th></tr>${S.prices.filter(p=>!k||p.name.includes(k)).sort((a,b)=>(BreadCalc.pricePerGram(a)!=null)-(BreadCalc.pricePerGram(b)!=null)).map(p=>{const pg=BreadCalc.pricePerGram(p);return `<tr data-p="${esc(p.id)}" style="cursor:pointer"><td>${esc(p.name)}</td><td class="n">${pg!=null?`${yuan(p.price)} / ${fx(p.size,2)}${UNIT_LABEL[p.unit||'g']}`:'<span class="tag">未定价</span>'}</td><td class="n">${pg!=null?yuan(pg*100):'-'}</td></tr>`}).join('')}</table>`;
    $('#plist').querySelectorAll('[data-p]').forEach(t=>t.onclick=()=>editPrice(S.prices.find(p=>p.id===t.dataset.p),plist))};
  $('#pq').oninput=plist;plist();$('#addP').onclick=()=>editPrice(null,plist);
  $('#lsv').onclick=()=>{const c={base:$('#lb').value.trim(),model:$('#lm').value.trim(),key:$('#lk').value.trim()};if(c.base&&!/^https:\/\//i.test(c.base)&&!/^http:\/\/(localhost|127\.)/i.test(c.base))return toast('接口地址需以 https:// 开头');localStorage.setItem(LKEY,JSON.stringify(c));toast(c.base&&c.model&&c.key?'已保存（仅本机）':'已保存，信息还不完整')};
  $('#lclr').onclick=()=>{localStorage.removeItem(LKEY);const d=llmCfg();$('#lb').value=d.base;$('#lm').value=d.model;$('#lk').value='';toast('已清除 Key')};
  $('#ltest').onclick=async()=>{const c={base:$('#lb').value.trim(),model:$('#lm').value.trim(),key:$('#lk').value.trim()};if(!c.key)return toast('请先粘贴 API Key');const b=$('#ltest');b.disabled=true;$('#lres').textContent='测试中…';
    try{await llmTest(c);$('#lres').textContent='✅ 连接成功，可以使用 AI 识别'}catch(e){$('#lres').textContent='❌ '+e.message}finally{b.disabled=false}};
  $('#exp').onclick=exportData;$('#imp').onchange=e=>importData(e.target.files[0]);
  $('#clr').onclick=async()=>{if(!confirm('确定清空所有配方、记录、照片？此操作不可恢复，建议先导出备份。'))return;await Photos.clear();Store.reset();location.reload()};
});
const UNIT_LABEL={g:'g',kg:'kg',ml:'ml',L:'L',pc:'个'};
function editPrice(p,done){const isNew=!p;p=p||{name:'',price:'',size:'',unit:'g'};const u0=p.unit||'g';
  openModal(`<h3 style="margin-top:0">${isNew?'添加原料':'编辑原料'}</h3><label>名称</label><input id="pn" value="${esc(p.name)}"><div class="grid2"><div><label>价格 (¥)</label><input id="pp" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(p.price)}"></div><div><label>规格</label><div class="row" style="flex-wrap:nowrap"><input id="ps" type="number" min="0" inputmode="decimal" value="${esc(p.size||'')}" placeholder="500" style="flex:1;min-width:0"><select id="pu" style="width:76px">${Object.entries(UNIT_LABEL).map(([k,t])=>`<option value="${k}" ${k===u0?'selected':''}>${t}</option>`).join('')}</select></div></div></div>
   <div id="pgw" ${u0==='pc'?'':'hidden'}><label>每个约多少克</label><input id="ppg" type="number" min="0" inputmode="decimal" value="${esc(p.pieceGrams||BreadCalc.pieceGrams(p.name)||50)}"></div><p class="muted" id="pg"></p>
   <div class="row"><button class="btn" id="psv">保存</button>${isNew?'':'<button class="btn danger" id="pdl">删除</button>'}<button class="btn ghost" id="pcl">取消</button></div><p class="muted small">提示：鸡蛋可按「个」定价（30 个 ¥25，每个约 50g）；液体 ml 按 1g/ml 估算。</p>`);
  const cur=()=>({name:$('#pn').value,price:+$('#pp').value,size:+$('#ps').value,unit:$('#pu').value,pieceGrams:+$('#ppg').value});
  const u=()=>{$('#pgw').hidden=$('#pu').value!=='pc';const pg=BreadCalc.pricePerGram(cur());$('#pg').textContent=pg!=null?`每克 ¥${pg.toFixed(4)} · 每 100g ${yuan(pg*100)}`:''};$('#pp').oninput=$('#ps').oninput=$('#pu').onchange=$('#ppg').oninput=u;u();
  $('#pcl').onclick=closeModal;
  $('#psv').onclick=()=>{const n=$('#pn').value.trim();if(!n)return toast('请填写名称');const c=cur();if(!(c.price>=0)||!(c.size>=0))return toast('价格和规格不能为负数');
    Object.assign(p,{name:n,price:c.price||0,size:c.size||0,unit:c.unit,auto:false});if(c.unit==='pc')p.pieceGrams=c.pieceGrams>0?c.pieceGrams:50;else delete p.pieceGrams;if(isNew){p.id=uid();S.prices.push(p)}save();closeModal();done();toast('已保存')};
  if(!isNew)$('#pdl').onclick=()=>{S.prices.splice(S.prices.indexOf(p),1);save();closeModal();done()};
}
const b2d=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
async function exportData(){const ph=await Photos.all();const photos={};for(const [k,v] of Object.entries(ph))photos[k]=await b2d(v);
  const blob=new Blob([JSON.stringify({app:'bread-notes',version:2,exportedAt:new Date().toISOString(),data:S,photos})],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`面包手记备份-${today()}.json`;document.body.appendChild(a);a.click();a.remove();toast('已导出')}
async function importData(file){if(!file)return;try{const j=JSON.parse(await file.text());if(!j||j.app!=='bread-notes'||!j.data||typeof j.data!=='object')throw new Error('不是面包手记的备份文件');
  if(!confirm(`导入将覆盖当前数据（${j.data.recipes?.length||0} 个配方，${j.data.bakes?.length||0} 条记录），继续？`))return;
  await Photos.clear();for(const [k,v] of Object.entries(j.photos||{})){if(typeof v!=='string'||!/^data:image\//.test(v)||!/^[\w-]+$/.test(k))continue;const blob=await (await fetch(v)).blob();await putWithId(k,blob)}
  Store.replace(j.data);toast('导入成功');setTimeout(()=>location.reload(),600)}catch(e){alert('导入失败：'+e.message)}}
async function putWithId(id,blob){const req=indexedDB.open('breadnotes',1);const d=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
  await new Promise((res,rej)=>{const t=d.transaction('photos','readwrite');t.objectStore('photos').put(blob,id);t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close()}

// ---------- 小红书：App 深链优先，失败降级 ----------
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);const ok=document.execCommand('copy');a.remove();return ok}catch(_){return false}}}
const isMobile=()=>/iPhone|iPad|iPod|Android|HarmonyOS/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
const XHS_WEB='https://www.xiaohongshu.com/explore';
const xhsDeep=kw=>`xhsdiscover://search/result?keyword=${encodeURIComponent(kw)}&source=deeplink`;
const baiduXHS=kw=>`https://www.baidu.com/s?wd=${encodeURIComponent('小红书 '+kw)}`;
function xhsSheet(kw,copied,triedApp){openModal(`<h3 style="margin-top:0">去小红书搜「${esc(kw)}」</h3>
  <p class="muted small">${copied?'✅ 关键词已复制。':'⚠️ 自动复制失败，请手动复制：<b>'+esc(kw)+'</b>。'}${triedApp?'没能打开小红书 App（可能未安装）。':''}小红书网页版不支持直接带关键词搜索链接，打开后在顶部搜索框<b>粘贴</b>即可。</p>
  <div class="col-btns"><a class="btn block" style="background:#ff2442" href="${XHS_WEB}" target="_blank" rel="noopener noreferrer" id="xw">打开小红书网页</a>
  <a class="btn block ghost" href="${esc(baiduXHS(kw))}" target="_blank" rel="noopener noreferrer">用百度搜小红书笔记</a>
  ${isMobile()?`<a class="btn block ghost" href="${esc(xhsDeep(kw))}" id="xa">再试一次打开 App</a>`:''}<button class="btn block ghost" onclick="closeModal()">取消</button></div>`)}
async function openXHS(kw){const copied=await copyText(kw);
  if(!isMobile()){toast(copied?'已复制关键词，在小红书搜索框粘贴即可':'请手动复制关键词',2600);xhsSheet(kw,copied,false);return}
  let left=false;const onHide=()=>{if(document.hidden)left=true};document.addEventListener('visibilitychange',onHide);window.addEventListener('pagehide',onHide);
  toast(copied?'正在打开小红书 App…（关键词已复制）':'正在打开小红书 App…',2200);
  try{location.href=xhsDeep(kw)}catch(e){}
  setTimeout(()=>{document.removeEventListener('visibilitychange',onHide);window.removeEventListener('pagehide',onHide);
    if(!left&&!document.hidden){toast(copied?'没打开 App？关键词已复制，可去网页粘贴搜索':'没打开 App，可改用网页',2600);xhsSheet(kw,copied,true)}},1600)}
window.BreadXHS={openXHS,xhsDeep,baiduXHS,XHS_WEB};

// ---------- 发酵节奏（来自 Handmade 项目） ----------
const RHYTHM=[['水解','30 分钟','面粉与水先混合静置，让面筋自己形成，后面更省力。'],['揉面','约 15 分钟','加入酵母、糖、盐，最后加黄油，揉到能拉出薄膜。'],['主发酵','约 60 分钟','26–28℃ 发到约 2 倍大，手指戳洞不回弹。'],['折叠翻面','约 20 分钟','排气、折叠，让组织更均匀。'],['松弛整形','约 20 分钟','分割滚圆，松弛后整形。'],['二次发酵','约 45 分钟','35–38℃、湿度 75–85%，发到 1.5–2 倍。'],['烘烤','约 35 分钟','提前预热，按配方温度烘烤。']];
const TKEY='breadnotes.timer';
const tLoad=()=>{try{return JSON.parse(localStorage.getItem(TKEY)||'null')}catch(e){return null}};
const tSave=t=>{try{localStorage.setItem(TKEY,JSON.stringify(t))}catch(e){}};
function stagesFor(r){const m=(v,d)=>Math.max(1,Math.round(+v)||d);return [['水解',30],['揉面',15],['主发酵',m(r&&r.bulkTime,60)],['折叠翻面',20],['松弛整形',20],['二次发酵',m(r&&r.proofTime,45)],['烘烤',m(r&&r.ovenTime,35)]].map(([n,min])=>({n,min,on:true}))}
let actx=null;
function unlockAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
function alarm(){try{unlockAudio();if(actx){[0,0.45,0.9].forEach(t0=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';const t=actx.currentTime+t0;o.frequency.setValueAtTime(880,t);o.frequency.setValueAtTime(1174.66,t+.18);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.35,t+.03);g.gain.exponentialRampToValueAtTime(0.0001,t+.38);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+.4)})}}catch(e){}
  try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
const mmss=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(x).padStart(2,'0')};
let tickT=null;
route(/^\/timer$/,(q)=>{
  setHeader('发酵计时',true);clearInterval(tickT);
  let t=tLoad();const rid=q.get('r');
  if(!t||(rid&&t.rid!==rid&&(!t.running||confirm('已有一个计时在进行，要放弃它重新开始吗？')))){const r=recipe(rid)||null;t={rid:r?r.id:'',rname:r?r.name:'自由计时',stages:stagesFor(r),idx:0,running:false,left:null,endAt:null,log:[],envTemp:'',envHum:''};tSave(t)}
  const cur=()=>t.stages[t.idx];
  const remain=()=>t.running?t.endAt-Date.now():(t.left!=null?t.left:cur()?cur().min*60000:0);
  view.innerHTML=`<div class="card timer-card"><div class="muted small" id="tname">${esc(t.rname)}</div>
   <div class="ring" id="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" id="rfg" pathLength="100"/></svg><div class="ring-txt"><b id="tleft">--:--</b><span id="tstage"></span></div></div>
   <div class="row" style="justify-content:center"><button class="btn" id="tgo">开始</button><button class="btn ghost" id="tnext">跳过 / 下一步</button><button class="btn ghost" id="treset">重置</button></div></div>
   <div class="card"><h3>节奏</h3><div id="tlist"></div><p class="muted small">时间可改；到点会响铃 + 振动（iPhone 需保持页面打开，锁屏后浏览器可能暂停声音）。</p></div>
   <div class="card"><h3>环境</h3><div class="grid2"><div><label>室温 (℃)</label><input id="tet" type="number" inputmode="decimal" value="${esc(t.envTemp)}" placeholder="26"></div><div><label>湿度 (%)</label><input id="teh" type="number" inputmode="decimal" value="${esc(t.envHum)}" placeholder="65"></div></div></div>
   <div id="tdone"></div>`;
  const list=()=>{$('#tlist').innerHTML=t.stages.map((s,i)=>`<div class="tstage ${i<t.idx?'done':i===t.idx?'cur':''}"><span class="dot">${i<t.idx?'✓':i+1}</span><b class="grow">${esc(s.n)}</b><input type="number" min="1" inputmode="numeric" data-ti="${i}" value="${s.min}" ${i<t.idx?'disabled':''}><span class="muted small">分钟</span></div>`).join('');
    $('#tlist').querySelectorAll('[data-ti]').forEach(inp=>inp.onchange=()=>{const i=+inp.dataset.ti;const v=Math.max(1,Math.round(+inp.value)||1);inp.value=v;t.stages[i].min=v;if(i===t.idx&&!t.running)t.left=null;tSave(t);paint()})};
  const finishAll=()=>{t.running=false;tSave(t);$('#tdone').innerHTML=`<div class="card done-card"><b>🎉 全部完成！</b><p class="muted small">${esc(t.log.map(l=>`${l.n} ${l.min}′`).join(' → '))}</p><button class="btn block" id="tlog">记录这次烘焙</button></div>`;
    $('#tlog').onclick=()=>{const oven=t.stages.find(s=>s.n==='烘烤');sessionStorage.setItem('breadnotes.timerDone',JSON.stringify({recipeId:t.rid,ferment:t.log.filter(l=>l.n!=='烘烤').map(l=>`${l.n} ${l.min} 分钟`).join('，'),ovenTime:oven?String(oven.min):'',envTemp:t.envTemp===''?'':+t.envTemp,envHum:t.envHum===''?'':+t.envHum}));localStorage.removeItem(TKEY);location.hash=`#/bake-edit/new?from=timer${t.rid?'&r='+encodeURIComponent(t.rid):''}`}};
  const advance=(ring)=>{const s=cur();if(!s)return;t.log.push({n:s.n,min:s.min});t.idx++;t.running=false;t.left=null;t.endAt=null;tSave(t);if(ring){alarm();toast(`⏰ ${s.n} 完成！`,3000)}list();if(t.idx>=t.stages.length)finishAll()};
  const paint=()=>{if(!view.querySelector('#ring')){clearInterval(tickT);return}const s=cur();
    if(!s){$('#tleft').textContent='完成';$('#tstage').textContent='🍞';$('#rfg').style.strokeDashoffset=0;$('#tgo').disabled=$('#tnext').disabled=true;return}
    let r=remain();if(t.running&&r<=0){advance(true);return paint()}
    $('#tleft').textContent=mmss(r);$('#tstage').textContent=`${t.idx+1}/${t.stages.length} · ${s.n}`;$('#rfg').style.strokeDashoffset=100-100*Math.min(1,Math.max(0,r/(s.min*60000)));$('#tgo').textContent=t.running?'暂停':(t.left!=null?'继续':'开始')};
  $('#tgo').onclick=()=>{unlockAudio();if(t.running){t.left=t.endAt-Date.now();t.running=false;t.endAt=null}else{t.endAt=Date.now()+remain();t.running=true;t.left=null}tSave(t);paint()};
  $('#tnext').onclick=()=>advance(false);
  $('#treset').onclick=()=>{if(!confirm('重置计时？'))return;const r=recipe(t.rid);t=Object.assign(t,{stages:stagesFor(r),idx:0,running:false,left:null,endAt:null,log:[]});tSave(t);$('#tdone').innerHTML='';$('#tgo').disabled=$('#tnext').disabled=false;list();paint()};
  $('#tet').oninput=e=>{t.envTemp=e.target.value;tSave(t)};$('#teh').oninput=e=>{t.envHum=e.target.value;tSave(t)};
  list();paint();if(t.idx>=t.stages.length)finishAll();tickT=setInterval(paint,250);
});
window.BreadTimer={alarm,stagesFor,mmss};

// ---------- 拍照 / 截图识别 ----------
const LKEY='breadnotes.llm';
const llmCfg=()=>{let c={};try{c=JSON.parse(localStorage.getItem(LKEY)||'null')||{}}catch(e){}return {base:c.base||'https://api.0lll0.cn/v1',model:c.model||'gpt-5.5',key:c.key||''}};
const llmReady=()=>{const c=llmCfg();return !!(c.base&&c.model&&c.key)};
function loadScript(src){return new Promise((res,rej)=>{if([...document.scripts].some(s=>s.src===src))return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('脚本加载失败，请检查网络'));document.head.appendChild(s)})}
const TESS_SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let tessWorker=null;
async function getTess(onProg){await loadScript(TESS_SRC);if(!tessWorker){tessWorker=await Tesseract.createWorker('chi_sim+eng',1,{logger:m=>onProg&&onProg(m)});await tessWorker.setParameters({preserve_interword_spaces:'1'})}return tessWorker}
async function fileToImg(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('图片无法读取'));img.src=URL.createObjectURL(file)})}
async function preprocess(file){const img=await fileToImg(file);const w0=img.naturalWidth,h0=img.naturalHeight;const k=Math.min(2.5,Math.max(1,1800/w0),3200/Math.max(w0,h0));
  const c=document.createElement('canvas');c.width=Math.round(w0*k);c.height=Math.round(h0*k);const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);
  const d=g.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){let y=.299*a[i]+.587*a[i+1]+.114*a[i+2];y=Math.max(0,Math.min(255,(y-128)*1.25+128));a[i]=a[i+1]=a[i+2]=y}g.putImageData(d,0,0);URL.revokeObjectURL(img.src);return c}
async function ocrTesseract(file,onProg){const w=await getTess(onProg);const cv=await preprocess(file);const {data}=await w.recognize(cv);
  const lines=(data.lines||[]).map(l=>({text:BreadCalc.FW(l.text).trim(),conf:l.confidence}));return {text:data.text,lines,conf:data.confidence}}
async function fileToDataURL(file,max=1600){const img=await fileToImg(file);const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);return c.toDataURL('image/jpeg',.88)}
const LLM_PROMPT='你是烘焙配方录入助手。请逐字识别图片中的面包/烘焙配方，只输出一个 JSON 对象，不要任何解释或 markdown。格式：{"name":"配方名","ingredients":[{"name":"原料名","amount":数字,"unit":"g|kg|ml|L|个|勺|茶匙|汤匙|杯|%|少许","group":"主面团|汤种|中种|馅|表面 等，没有则空字符串"}],"steps":["步骤1","步骤2"],"oven":{"temp":数字或null,"time":数字或null},"notes":"其他说明"}。规则：数量必须照抄图片，不要换算、不要猜测；看不清就把 amount 设为 null；范围如 30-35 取原文写成字符串 "30-35"；只有烘焙百分比时 unit 用 "%"。';
const LLM_DEFAULT={base:'https://api.0lll0.cn/v1',model:'gpt-5.5'};
const corsMsg=e=>e instanceof TypeError?new Error('无法连接 AI 接口：浏览器被拒绝跨域访问（CORS），或网络不通。这个接口需要允许网页直接调用，或换一个支持 CORS 的地址。'):e;
async function llmPost(c,path,payload){let r;try{r=await fetch(c.base.replace(/\/+$/,'').replace(/\/(chat\/completions|responses)$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.key},body:JSON.stringify(payload)})}catch(e){throw corsMsg(e)}
  const txt=await r.text();if(!r.ok){const e=new Error(`AI 接口返回 ${r.status}：${txt.slice(0,160)}`);e.status=r.status;throw e}try{return JSON.parse(txt)}catch(e){throw new Error('AI 接口返回的不是 JSON')}}
function respText(j){if(!j)return '';if(typeof j.output_text==='string')return j.output_text;
  if(Array.isArray(j.output))return j.output.flatMap(o=>Array.isArray(o.content)?o.content:[]).map(x=>x.text||'').join('');
  const m=j.choices&&j.choices[0]&&j.choices[0].message;const c=m&&m.content;return Array.isArray(c)?c.map(x=>x.text||'').join(''):String(c||'')}
async function llmAsk(c,text,img){const errs=[];
  try{const input=[{role:'user',content:[{type:'input_text',text},...(img?[{type:'input_image',image_url:img}]:[])]}];return respText(await llmPost(c,'/responses',{model:c.model,instructions:LLM_PROMPT,input}))}catch(e){if(!e.status)throw e;errs.push(e)}
  const msgs=[{role:'system',content:LLM_PROMPT},{role:'user',content:[{type:'text',text},...(img?[{type:'image_url',image_url:{url:img}}]:[])]}];
  try{return respText(await llmPost(c,'/chat/completions',{model:c.model,temperature:0,messages:msgs,response_format:{type:'json_object'}}))}catch(e){if(!e.status)throw e;if(e.status===400||e.status===422)return respText(await llmPost(c,'/chat/completions',{model:c.model,messages:msgs}));errs.push(e);throw errs[0]}}
async function ocrLLM(file){const c=llmCfg();if(!(c.base&&c.model&&c.key))throw new Error('请先在「我的」里粘贴 AI 接口的 API Key');
  const text=await llmAsk(c,'识别这张配方图片，输出 JSON。',await fileToDataURL(file));return {text,parsed:BreadCalc.normalizeLLM(text)}}
async function llmTest(c){const t=await llmAsk(c,'只回复 JSON：{"name":"ok","ingredients":[],"steps":[]}',null);BreadCalc.normalizeLLM(t);return true}
function markOcrConf(parsed,lines){if(!lines)return parsed;for(const it of parsed.ingredients){const f=BreadCalc.fixOcrName(it.name,S.prices.map(p=>p.name));if(f.fixed){it.reasons=[...(it.reasons||[]),`OCR 原文「${it.name}」，已按常用原料纠正`];it.name=f.name;it.conf='low';if(/面粉|粉$/.test(f.name)&&/筋|麦|法国|面包/.test(f.name))it.isFlour=true}}const sq=s=>s.replace(/\s/g,'');for(const it of parsed.ingredients){const l=lines.find(l=>sq(l.text).includes(sq(it.name)));if(l&&l.conf<70){it.conf='low';it.reasons=[...(it.reasons||[]),`OCR 置信度 ${Math.round(l.conf)}%`]}}return parsed}
let REVIEW=null;
function startReview(items){REVIEW={items,i:0,saved:0};location.hash='#/scan-review'}
window.BreadScan={startReview,parse:BreadCalc.parseRecipeText};
route(/^\/scan$/,()=>{
  setHeader('拍照 / 截图识别',true);const ready=llmReady();let engine=ready&&localStorage.getItem('breadnotes.engine')!=='ocr'?'llm':'ocr';
  view.innerHTML=`<div class="card"><h3>选择识别方式</h3><div class="seg" id="eng"><button data-e="ocr" class="${engine==='ocr'?'on':''}">本地 OCR（免费）</button><button data-e="llm" class="${engine==='llm'?'on':''}">AI 识别（更准）</button></div>
   <p class="muted small" id="engHint"></p>
   <label class="btn block" style="margin-top:12px;color:#fff">📷 选择 / 拍摄配方图片（可多选）<input id="sfile" type="file" accept="image/*" multiple hidden></label>
   <div class="hint">识别结果<b>不会直接保存</b>：每张图都会进入核对页，你确认无误后才保存。截图越清晰、用料表越完整，准确率越高。</div></div>
   <div id="sprog"></div>`;
  const hint=()=>{$('#engHint').innerHTML=engine==='ocr'?'在本机识别（首次需下载约 20MB 中文识别模型，之后会缓存）。适合清晰的截图；手写、花字、倾斜照片容易出错。':(ready?`使用你设置的模型：${esc(llmCfg().model)}。图片会发送到你填写的接口地址。`:'还没有设置 AI 接口。<a href="#/me">去「我的」设置</a>（Key 只保存在本机）。')};hint();
  $('#eng').onclick=e=>{const b=e.target.closest('[data-e]');if(!b)return;engine=b.dataset.e;localStorage.setItem('breadnotes.engine',engine);$('#eng').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));segInd($('#eng'));hint()};
  $('#sfile').onchange=async e=>{const files=[...e.target.files];e.target.value='';if(!files.length)return;if(engine==='llm'&&!llmReady())return toast('请先在「我的」设置 AI 接口');
    const pr=$('#sprog');pr.innerHTML=`<div class="card"><h3>识别中…</h3>${files.map((f,i)=>`<div class="row between small"><span>${i+1}. ${esc(f.name.slice(0,24))}</span><span class="muted" id="sp${i}">等待</span></div>`).join('')}<div class="bar-prog"><i id="spb"></i></div></div>`;
    const out=[];
    for(let i=0;i<files.length;i++){const f=files[i];const st=$('#sp'+i);const set=m=>{if(st)st.textContent=m};set('识别中…');
      try{if(engine==='llm'){const r=await ocrLLM(f);out.push({file:f,text:r.text,parsed:r.parsed,engine:'llm'});set('✓ AI 完成')}
        else{const r=await ocrTesseract(f,m=>{if(m.status==='recognizing text')set(`识别 ${Math.round(m.progress*100)}%`);else if(/load|initializ/.test(m.status))set('加载模型…');});const parsed=markOcrConf(BreadCalc.parseRecipeText(r.text),r.lines);out.push({file:f,text:r.text,parsed,engine:'ocr',ocrConf:r.conf});set(`✓ ${parsed.ingredients.length} 种原料`)}}
      catch(err){console.error(err);set('✗ '+(err.message||'失败').slice(0,40));out.push({file:f,text:'',parsed:{name:'',ingredients:[],steps:'',source:'',oven:null},engine,error:err.message})}
      const b=$('#spb');if(b)b.style.width=((i+1)/files.length*100)+'%'}
    if(!view.querySelector('#sprog'))return;startReview(out)};
});
route(/^\/scan-review$/,()=>{
  if(!REVIEW||!REVIEW.items.length)return location.replace('#/scan');
  const R0=REVIEW,it=R0.items[R0.i],p=it.parsed;setHeader(`核对 ${R0.i+1}/${R0.items.length}`,true);
  const name0=it.name||p.name||'';let base=500;
  view.innerHTML=`${it.file?`<div class="card scan-img"><img id="simg" alt="原图"><div class="muted small">点图片放大 · ${it.engine==='llm'?'AI 识别':it.engine==='ocr'?`本地 OCR${it.ocrConf!=null?` · 整体置信度 ${Math.round(it.ocrConf)}%`:''}`:'文字导入'}</div></div>`:''}
   ${it.error?`<div class="hint warn">识别失败：${esc(it.error)}。可以手动填写，或跳过。</div>`:''}
   <div class="card"><label>配方名称</label><input id="rn" value="${esc(name0)}" placeholder="请填写配方名称"><div id="dup"></div>
   <div class="grid2"><div><label>出品个数</label><input id="ry" type="number" min="1" value="1"></div><div><label>来源（可选）</label><input id="rsrc" value="${esc(it.source||p.source||'')}" placeholder="https://"></div>
   <div><label>烤温 ℃</label><input id="rot" type="number" value="${esc(p.oven&&p.oven.temp||'')}"></div><div><label>烘烤分钟</label><input id="rom" type="number" value="${esc(p.oven&&p.oven.time||'')}"></div></div></div>
   ${p.percentOnly?`<div class="card"><b>这是一张烘焙百分比表</b><p class="muted small">已按面粉总量换算克数，改这里会重新换算：</p><label>面粉总量 (g)</label><input id="rbase" type="number" min="1" value="500"></div>`:''}
   <div class="card"><div class="row between"><h3>原料</h3><span class="muted small"><i class="lowdot"></i> 需要核对</span></div>
   <div class="ing-row g4 muted small"><span>名称</span><span>克数</span><span>面粉</span><span></span></div><div id="ri"></div>
   <div class="row"><button class="btn ghost sm" id="radd">＋ 添加原料</button></div><div class="stats mini" id="rlive"></div></div>
   <div class="card"><label>做法 / 备注</label><textarea id="rst" rows="6">${esc([p.steps,p.notes].filter(Boolean).join('\n'))}</textarea>
   <details><summary class="muted small">查看识别出的原始文字</summary><pre class="raw">${esc(it.text||'')}</pre></details></div>
   <div class="row sticky-actions"><button class="btn grow" id="rsave">确认无误，保存</button><button class="btn ghost" id="rskip">${R0.i<R0.items.length-1?'跳过这张':'放弃'}</button>${it.file&&it.engine!=='llm'&&llmReady()?'<button class="btn ghost" id="rai">用 AI 再识别</button>':''}</div>`;
  if(it.file){const u=URL.createObjectURL(it.file);$('#simg').src=u;$('#simg').onclick=()=>openModal(`<img src="${esc(u)}" style="width:100%;border-radius:12px"><button class="btn block" style="margin-top:10px" onclick="closeModal()">关闭</button>`)}
  const ri=$('#ri');
  const row=(i={})=>{const d=document.createElement('div');d.className='ing-row g4'+(i.conf==='low'?' low':'');d.dataset.group=i.group||'';if(i.pct!=null)d.dataset.pct=i.pct;
    d.innerHTML=`<div class="iname-wrap"><input class="iname" value="${esc(i.name||'')}" placeholder="原料">${i.group?`<span class="tag soft">${esc(i.group)}</span>`:''}</div><input class="igram" type="number" min="0" inputmode="decimal" value="${esc(i.grams??'')}" placeholder="g"><input class="iflour" type="checkbox" ${i.isFlour?'checked':''}><button class="icon-btn" style="font-size:20px;color:var(--danger)" aria-label="删除">×</button>${i.conf==='low'&&i.reasons&&i.reasons.length?`<div class="why">⚠️ ${esc(i.reasons.join('；'))}${i.amount!=null&&i.unit?`（原文 ${esc(i.amount)}${esc(i.unit)}）`:''}</div>`:''}`;
    d.querySelector('button').onclick=()=>{d.remove();live()};d.addEventListener('input',()=>{d.classList.remove('low');d.dataset.pct=''});ri.appendChild(d)};
  const collect=()=>[...ri.children].map(d=>{const o={name:d.querySelector('.iname').value.trim(),grams:Math.max(0,+d.querySelector('.igram').value||0),isFlour:d.querySelector('.iflour').checked};if(d.dataset.group)o.group=d.dataset.group;return o}).filter(i=>i.name);
  const live=()=>{const c=calc({ingredients:collect(),yieldCount:+$('#ry').value||1});const lows=ri.querySelectorAll('.low').length;
    $('#rlive').innerHTML=`<div class="stat"><b>${fx(c.total,0)}g</b>总重</div><div class="stat"><b>${fx(c.flour,0)}g</b>面粉</div><div class="stat"><b>${fx(c.hydration)}%</b>水合</div><div class="stat"><b>${yuan(c.cost)}</b>成本</div>${lows?`<p class="muted small" style="grid-column:1/-1">还有 <b>${lows}</b> 项需要核对（黄色标记）</p>`:''}${c.flour>0&&(c.hydration<40||c.hydration>100)?`<p class="hint warn" style="grid-column:1/-1">水合 ${fx(c.hydration)}% 不太常见，请检查克数是否识别错误。</p>`:''}${!c.flour&&c.total?'<p class="hint warn" style="grid-column:1/-1">请勾选面粉，否则无法计算烘焙百分比。</p>':''}`};
  (p.ingredients.length?p.ingredients:[{}]).forEach(row);ri.oninput=live;$('#ry').oninput=live;live();
  if($('#rbase'))$('#rbase').oninput=e=>{const b=+e.target.value;if(!(b>0))return;[...ri.children].forEach(d=>{if(d.dataset.pct!==''&&d.dataset.pct!=null)d.querySelector('.igram').value=Math.round(b*d.dataset.pct/100*10)/10});live()};
  const dupOf=n=>S.recipes.find(r=>BreadCalc.norm(r.name)===BreadCalc.norm(n));
  const dupHint=()=>{const d=dupOf($('#rn').value.trim());$('#dup').innerHTML=d?`<div class="hint warn">已有同名配方「${esc(d.name)}」。<label class="inline"><input type="radio" name="dm" value="new" checked> 另存为新配方</label><label class="inline"><input type="radio" name="dm" value="over"> 覆盖原配方（保留烘焙记录）</label></div>`:''};$('#rn').oninput=dupHint;dupHint();
  $('#radd').onclick=()=>{row();ri.lastChild.querySelector('input').focus()};
  const next=()=>{URL.revokeObjectURL($('#simg')?.src||'');if(R0.i<R0.items.length-1){R0.i++;render()}else{const n=R0.saved;REVIEW=null;toast(n?`已保存 ${n} 个配方`:'没有保存任何配方');location.replace(n===1&&R0.lastId?'#/recipe/'+R0.lastId:'#/recipes')}};
  $('#rskip').onclick=()=>{if(confirm('不保存这张的识别结果？'))next()};
  if($('#rai'))$('#rai').onclick=async()=>{const b=$('#rai');b.disabled=true;b.textContent='AI 识别中…';try{const r=await ocrLLM(it.file);Object.assign(it,{text:r.text,parsed:r.parsed,engine:'llm',error:null});render()}catch(e){toast(e.message,3500);b.disabled=false;b.textContent='用 AI 再识别'}};
  $('#rsave').onclick=async()=>{let name=$('#rn').value.trim();if(!name)return toast('请填写配方名称');const ings=collect();if(!ings.length)return toast('至少需要一种原料');if(!ings.some(i=>i.isFlour))return toast('请至少勾选一种面粉');
    const lows=ri.querySelectorAll('.low').length;if(lows&&!confirm(`还有 ${lows} 项标黄的原料没改过，确定都正确吗？`))return;
    const d=dupOf(name);const mode=d?(view.querySelector('input[name=dm]:checked')||{}).value:'new';
    if(d&&mode==='new'){const taken=new Set(S.recipes.map(r=>r.name.trim()));let k=2;while(taken.has(`${name} (${k})`)&&k<999)k++;name=`${name} (${k})`}
    const nn=v=>{const x=Math.round(+v);return x>0?x:''};
    const r={name,yieldCount:Math.max(1,Math.floor(+$('#ry').value)||1),source:$('#rsrc').value.trim(),steps:$('#rst').value,ingredients:ings,ovenTemp:nn($('#rot').value),ovenTime:nn($('#rom').value),updatedAt:Date.now(),importedVia:it.engine};
    if(it.file){try{r.scanPhoto=await Photos.put(await compress(it.file,1600,.8))}catch(e){}}
    if(d&&mode==='over'){Object.assign(d,r,{id:d.id});R0.lastId=d.id}else{r.id=uid();r.createdAt=Date.now();S.recipes.push(r);R0.lastId=r.id}
    ensurePrices(ings);save();R0.saved++;toast('已保存 ✓');next()};
});
const EMO=n=>/吐司|布里欧/.test(n)?'🍞':/贝果/.test(n)?'🥯':/可颂|牛角/.test(n)?'🥐':/法棍|长棍/.test(n)?'🥖':/肉桂|卷/.test(n)?'🌀':/餐包|小面包/.test(n)?'🧁':/全麦|黑麦|欧包|乡村|恰巴塔/.test(n)?'🌾':'🍞';
render();requestAnimationFrame(moveInd);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.BreadApp={shareCard,render};
})();
