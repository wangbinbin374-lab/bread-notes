(function(){
const {S,save,uid,Photos,photoURL,compress,calc}=Store;
const $=s=>document.querySelector(s);const view=$('#view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const yuan=v=>'¥'+(Math.round((v||0)*100)/100).toFixed(2);
const fx=(v,d=1)=>(Math.round(v*10**d)/10**d).toString();
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const stars=n=>'★'.repeat(n||0)+'☆'.repeat(5-(n||0));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1800)}
function openModal(html){$('#sheet').innerHTML=html;$('#modal').hidden=false}
function closeModal(){$('#modal').hidden=true;$('#sheet').innerHTML=''}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
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
function render(){const h=location.hash.slice(1)||'/recipes';const [path,qs]=h.split('?');const q=new URLSearchParams(qs||'');
  document.querySelectorAll('.tabbar a').forEach(a=>a.classList.toggle('on',path.startsWith('/'+a.dataset.tab)||(a.dataset.tab==='recipes'&&path.startsWith('/recipe'))||(a.dataset.tab==='bakes'&&path.startsWith('/bake'))));
  for(const [re,fn] of routes){const m=path.match(re);if(m){view.innerHTML='';window.scrollTo(0,0);try{fn(...m.slice(1),q)}catch(e){console.error(e);view.innerHTML='<div class="empty">出错了：'+esc(e.message)+'</div>'}return}}
  location.hash='#/recipes'}
window.addEventListener('hashchange',render);

// ---------- recipes ----------
route(/^\/recipes$/,()=>{
  setHeader('我的配方',false);
  if(!S.recipes.length){view.innerHTML=`<div class="empty"><div>🍞</div><p>还没有配方</p><p class="row" style="justify-content:center"><a class="btn" href="#/recipe-edit/new">新建配方</a><a class="btn ghost" href="#/discover">从经典配方添加</a></p></div>`;}
  else view.innerHTML=`<input id="q" placeholder="搜索配方…" style="margin-bottom:12px">`+'<div id="rl"></div>';
  const list=()=>{const k=($('#q')?.value||'').trim();const el=$('#rl');if(!el)return;
    el.innerHTML=S.recipes.filter(r=>!k||r.name.includes(k)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(r=>{const c=calc(r);const n=S.bakes.filter(b=>b.recipeId===r.id).length;
      return `<div class="card list-item" data-id="${r.id}"><div class="thumb" data-photo="${r.cover||''}">🍞</div><div class="grow"><b>${esc(r.name)}</b><div class="muted">面粉 ${fx(c.flour,0)}g · 水合 ${fx(c.hydration)}% · ${r.yieldCount||1} 个</div><div class="muted">成本 ${yuan(c.cost)} · 每个 ${yuan(c.perLoaf)} · 烤过 ${n} 次</div></div></div>`}).join('')||'<div class="empty">没有匹配的配方</div>';
    el.querySelectorAll('[data-id]').forEach(d=>d.onclick=()=>location.hash='#/recipe/'+d.dataset.id);fillThumbs(el)};
  $('#q')&&($('#q').oninput=list);list();
  view.insertAdjacentHTML('beforeend',`<a class="btn fab" href="#/recipe-edit/new" aria-label="新建配方">＋</a>`);
});
async function fillThumbs(root){for(const el of root.querySelectorAll('[data-photo]')){const id=el.dataset.photo;if(!id)continue;const u=await photoURL(id);if(u)el.outerHTML=`<img class="thumb" src="${u}" alt="">`}}

route(/^\/recipe\/([\w]+)$/,(id,q)=>{
  const r=recipe(id);if(!r)return location.hash='#/recipes';
  setHeader(r.name,true,`<a class="btn sm ghost" href="#/recipe-edit/${id}">编辑</a>`);
  let scale=1;
  const draw=()=>{const c=calc(r,scale);
    $('#rtable').innerHTML=`<table><tr><th>原料</th><th class="n">克数</th><th class="n">烘焙%</th><th class="n">成本</th></tr>${c.rows.map(i=>`<tr><td>${esc(i.name)} ${i.isFlour?'<span class="tag">粉</span>':''}</td><td class="n">${fx(i.g)}</td><td class="n">${fx(i.pct)}%</td><td class="n">${i.priced?yuan(i.cost):'<span class="muted">未定价</span>'}</td></tr>`).join('')}
      <tr><td><b>合计</b></td><td class="n"><b>${fx(c.total,0)}</b></td><td class="n">${c.flour?fx(c.total/c.flour*100):0}%</td><td class="n"><b>${yuan(c.cost)}</b></td></tr></table>`;
    $('#rsum').innerHTML=`<div class="stat"><b>${fx(c.hydration)}%</b>水合</div><div class="stat"><b>${yuan(c.cost)}</b>总成本</div><div class="stat"><b>${yuan(c.perLoaf)}</b>每个</div>`;
    $('#rmiss').innerHTML=c.missing.length?`<div class="hint">以下原料未在价格库中定价：${c.missing.map(esc).join('、')}。<a href="#/me">去价格库添加</a></div>`:'';
    $('#scaleInfo').textContent=`缩放 ×${fx(scale,2)} · 面团 ${fx(c.total,0)}g · 每个约 ${fx(c.total/((+r.yieldCount||1)*scale),0)}g`;};
  const base=calc(r);
  view.innerHTML=`<div class="stats" id="rsum"></div>
  <div class="card"><h3>配比</h3><div id="rtable"></div><div id="rmiss"></div></div>
  <div class="card"><h3>按需缩放</h3><div class="grid2"><div><label>目标面团总重 (g)</label><input id="tw" type="number" inputmode="decimal" placeholder="${fx(base.total,0)}"></div><div><label>目标个数</label><input id="tn" type="number" inputmode="numeric" placeholder="${r.yieldCount||1}"></div></div><p class="muted" id="scaleInfo"></p><button class="btn ghost sm" id="sreset">还原</button></div>
  ${r.steps?`<div class="card"><h3>做法</h3><div style="white-space:pre-wrap">${esc(r.steps)}</div></div>`:''}
  ${r.source?`<div class="card"><h3>来源</h3><a href="${esc(r.source)}" target="_blank" rel="noopener" style="word-break:break-all;color:var(--primary)">${esc(r.source)}</a></div>`:''}
  <div class="row" style="margin-bottom:12px"><a class="btn" href="#/bake-edit/new?r=${id}">＋ 记录一次烘焙</a><button class="btn ghost" id="share">分享卡片</button><button class="btn ghost" id="dup">复制</button><button class="btn danger" id="del">删除</button></div>
  <h3>烘焙记录</h3><div id="rbakes" class="timeline"></div>`;
  draw();
  $('#tw').oninput=e=>{const v=+e.target.value;$('#tn').value='';scale=v>0?v/base.total:1;draw()};
  $('#tn').oninput=e=>{const v=+e.target.value;$('#tw').value='';scale=v>0?v/(+r.yieldCount||1):1;draw()};
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
  <div class="grid2"><div><label>出品个数</label><input id="fyield" type="number" min="1" value="${r.yieldCount||1}"></div><div><label>来源链接（可选）</label><input id="fsrc" value="${esc(r.source||'')}" placeholder="https://"></div></div></div>
  <div class="card"><div class="row between"><h3>原料</h3><span class="muted small">勾选 = 面粉（计算烘焙百分比基准）</span></div>
  <div class="ing-row muted small"><span>名称</span><span>克数</span><span>面粉</span><span></span></div><div id="ings"></div>
  <div class="row"><button class="btn ghost sm" id="addIng">＋ 添加原料</button></div><p class="muted small" id="live"></p></div>
  <div class="card"><label>做法 / 备注</label><textarea id="fsteps" rows="6">${esc(r.steps||'')}</textarea></div>
  <datalist id="pnames">${S.prices.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist>
  <button class="btn block" id="saveR">保存配方</button>`;
  const ingEl=$('#ings');
  const row=(i={})=>{const d=document.createElement('div');d.className='ing-row';d.innerHTML=`<input class="iname" list="pnames" value="${esc(i.name||'')}" placeholder="原料"><input class="igram" type="number" inputmode="decimal" value="${i.grams??''}" placeholder="g"><input class="iflour" type="checkbox" ${i.isFlour?'checked':''}><button class="icon-btn" style="font-size:20px;color:var(--danger)" aria-label="删除">×</button>`;
    d.querySelector('button').onclick=()=>{d.remove();live()};const n=d.querySelector('.iname');n.addEventListener('change',()=>{if(Store.isFlour(n.value))d.querySelector('.iflour').checked=true;live()});ingEl.appendChild(d)};
  const collect=()=>[...ingEl.children].map(d=>({name:d.querySelector('.iname').value.trim(),grams:+d.querySelector('.igram').value||0,isFlour:d.querySelector('.iflour').checked})).filter(i=>i.name);
  const live=()=>{const c=calc({ingredients:collect(),yieldCount:+$('#fyield').value||1});$('#live').textContent=`总重 ${fx(c.total,0)}g · 面粉 ${fx(c.flour,0)}g · 水合 ${fx(c.hydration)}% · 成本 ${yuan(c.cost)}`};
  r.ingredients.forEach(row);ingEl.oninput=live;$('#fyield').oninput=live;live();
  $('#addIng').onclick=()=>{row();ingEl.lastChild.querySelector('input').focus()};
  $('#saveR').onclick=()=>{const name=$('#fname').value.trim();if(!name)return toast('请填写配方名称');const ings=collect();if(!ings.length)return toast('至少添加一种原料');
    if(!ings.some(i=>i.isFlour))return toast('请至少勾选一种面粉');
    Object.assign(r,{name,yieldCount:Math.max(1,+$('#fyield').value||1),source:$('#fsrc').value.trim(),steps:$('#fsteps').value,ingredients:ings,updatedAt:Date.now()});
    if(isNew){r.id=uid();r.createdAt=Date.now();S.recipes.push(r)}else{const i=S.recipes.findIndex(x=>x.id===id);S.recipes[i]=r}
    ensurePrices(ings);save();toast('已保存');location.replace('#/recipe/'+r.id)};
});
function ensurePrices(ings){ings.forEach(i=>{if(!Store.findPrice(i.name))S.prices.push({id:uid(),name:i.name,price:0,size:0,auto:true})})}

// ---------- bakes ----------
route(/^\/bakes$/,()=>{
  setHeader('烘焙记录',false);
  if(!S.bakes.length){view.innerHTML=`<div class="empty"><div>📒</div><p>还没有烘焙记录</p><p class="muted">在配方页点「记录一次烘焙」开始跟进</p></div>`;}
  else{view.innerHTML=`<select id="rf" style="margin-bottom:12px"><option value="">全部配方</option>${S.recipes.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><div id="tl" class="timeline"></div>`;
    const draw=()=>renderTimeline($('#tl'),S.bakes.filter(b=>!$('#rf').value||b.recipeId===$('#rf').value));$('#rf').onchange=draw;draw()}
  if(S.recipes.length)view.insertAdjacentHTML('beforeend',`<a class="btn fab" href="#/bake-edit/new" aria-label="新记录">＋</a>`);
});
function renderTimeline(el,bakes){
  bakes=[...bakes].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt-a.createdAt));
  if(!bakes.length){el.innerHTML='<p class="muted">暂无记录</p>';return}
  el.innerHTML=bakes.map(b=>{const r=recipe(b.recipeId);return `<div class="card tl-item"><div class="row between"><b>${esc(r?r.name:b.recipeName||'已删除的配方')}</b><span class="muted">${esc(b.date)}</span></div>
   <div class="stars">${stars(b.rating)}</div>
   <div class="muted">${b.ovenTemp?`🔥 ${esc(b.ovenTemp)}℃ `:''}${b.ovenTime?`⏱ ${esc(b.ovenTime)} 分钟 `:''}${b.scale&&b.scale!=1?`· ×${fx(b.scale,2)} `:''}· 花费 ${yuan(b.cost)}</div>
   ${b.ferment?`<div class="small"><b>发酵：</b>${esc(b.ferment)}</div>`:''}${b.notes?`<div style="white-space:pre-wrap">${esc(b.notes)}</div>`:''}
   <div class="photos">${(b.photos||[]).map(p=>`<img data-pid="${p}" alt="">`).join('')}</div>
   <div class="row" style="margin-top:8px"><a class="btn sm ghost" href="#/bake-edit/${b.id}">编辑</a><button class="btn sm ghost" data-share="${b.id}">分享</button><button class="btn sm danger" data-del="${b.id}">删除</button></div></div>`}).join('');
  el.querySelectorAll('img[data-pid]').forEach(async im=>{im.src=await photoURL(im.dataset.pid);im.onclick=()=>openModal(`<img src="${im.src}" style="width:100%;border-radius:12px"><button class="btn block" style="margin-top:10px" onclick="document.getElementById('modal').hidden=true">关闭</button>`)});
  el.querySelectorAll('[data-share]').forEach(x=>x.onclick=()=>{const b=S.bakes.find(y=>y.id===x.dataset.share);shareCard({recipe:recipe(b.recipeId),bake:b})});
  el.querySelectorAll('[data-del]').forEach(x=>x.onclick=async()=>{if(!confirm('删除这条记录？'))return;const b=S.bakes.find(y=>y.id===x.dataset.del);for(const p of b.photos||[])await Photos.del(p);S.bakes.splice(S.bakes.indexOf(b),1);save();render()});
}
route(/^\/bake-edit\/([\w]+)$/,(id,q)=>{
  if(!S.recipes.length)return location.hash='#/recipes';
  const isNew=id==='new';const b=isNew?{date:today(),rating:4,scale:1,recipeId:q.get('r')||S.recipes[0].id,photos:[]}:structuredClone(S.bakes.find(x=>x.id===id));
  if(!b)return location.hash='#/bakes';
  setHeader(isNew?'记录烘焙':'编辑记录',true);let photos=[...(b.photos||[])];const removed=[];
  view.innerHTML=`<div class="card"><label>配方</label><select id="brec">${S.recipes.map(r=>`<option value="${r.id}" ${r.id===b.recipeId?'selected':''}>${esc(r.name)}</option>`).join('')}</select>
   <div class="grid2"><div><label>日期</label><input id="bdate" type="date" value="${esc(b.date)}"></div><div><label>用量倍数</label><input id="bscale" type="number" step="0.1" min="0.1" value="${b.scale||1}"></div>
   <div><label>烤温 (℃)</label><input id="btemp" inputmode="numeric" value="${esc(b.ovenTemp||'')}" placeholder="180"></div><div><label>时间 (分钟)</label><input id="btime" inputmode="numeric" value="${esc(b.ovenTime||'')}" placeholder="35"></div></div>
   <label>评分</label><div class="star-input" id="bstar">${[1,2,3,4,5].map(i=>`<button data-v="${i}">★</button>`).join('')}</div>
   <label>发酵记录</label><textarea id="bferm" rows="2" placeholder="室温 26℃，一发 60 分钟到 2 倍…">${esc(b.ferment||'')}</textarea>
   <label>心得 / 改进</label><textarea id="bnotes" rows="3" placeholder="组织、口感、下次怎么改…">${esc(b.notes||'')}</textarea>
   <p class="muted" id="bcost"></p></div>
   <div class="card"><div class="row between"><h3>照片</h3><label class="btn sm ghost" style="margin:0;color:var(--primary)">📷 拍照/上传<input id="bfile" type="file" accept="image/*" capture="environment" multiple hidden></label></div><div class="photos" id="bph"></div></div>
   <button class="btn block" id="bsave">保存记录</button>`;
  let rating=b.rating||0;const sr=()=>$('#bstar').querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.v<=rating));sr();
  $('#bstar').onclick=e=>{if(e.target.dataset.v){rating=+e.target.dataset.v;sr()}};
  const cost=()=>{const c=calc(recipe($('#brec').value),+$('#bscale').value||1);$('#bcost').textContent=`本次原料花费约 ${yuan(c.cost)}（按当前价格库计算）`;return c};
  $('#brec').onchange=$('#bscale').oninput=cost;cost();
  const drawPh=async()=>{const el=$('#bph');el.innerHTML=photos.length?'':'<span class="muted small">还没有照片</span>';for(const p of photos){const u=await photoURL(p);const w=document.createElement('div');w.style.position='relative';w.innerHTML=`<img src="${u}"><button class="btn sm" style="position:absolute;top:2px;right:2px;padding:0 6px;background:rgba(0,0,0,.55)">×</button>`;w.querySelector('button').onclick=()=>{photos=photos.filter(x=>x!==p);removed.push(p);drawPh()};el.appendChild(w)}};drawPh();
  $('#bfile').onchange=async e=>{for(const f of e.target.files){try{const blob=await compress(f);photos.push(await Photos.put(blob))}catch(err){toast('图片读取失败')}}e.target.value='';drawPh()};
  $('#bsave').onclick=async()=>{const r=recipe($('#brec').value);const c=cost();
    Object.assign(b,{recipeId:r.id,recipeName:r.name,date:$('#bdate').value||today(),scale:+$('#bscale').value||1,ovenTemp:$('#btemp').value.trim(),ovenTime:$('#btime').value.trim(),rating,ferment:$('#bferm').value.trim(),notes:$('#bnotes').value.trim(),photos,
      cost:c.cost,itemCosts:Object.fromEntries(c.rows.filter(x=>x.priced).map(x=>[x.name,x.cost])),updatedAt:Date.now()});
    if(isNew){b.id=uid();b.createdAt=Date.now();S.bakes.push(b)}else{S.bakes[S.bakes.findIndex(x=>x.id===id)]=b}
    if(photos[0]&&!r.cover)r.cover=photos[0];for(const p of removed){await Photos.del(p);if(r.cover===p)r.cover=photos[0]||''}
    save();toast('已保存');location.replace('#/recipe/'+r.id)};
});

// ---------- share card ----------
async function shareCard({recipe:r,bake}){
  if(!r)return toast('配方不存在');
  const c=calc(r,bake?.scale||1);const W=1080,H=1440;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
  const P=S.settings.theme;g.fillStyle='#fbf7f1';g.fillRect(0,0,W,H);
  const pid=bake?.photos?.[0]||r.cover;let img=null;if(pid){const u=await photoURL(pid);if(u)img=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u})}
  const ph=img?720:300;
  if(img){const k=Math.max(W/img.width,ph/img.height);const w=img.width*k,h=img.height*k;g.save();g.beginPath();g.rect(0,0,W,ph);g.clip();g.drawImage(img,(W-w)/2,(ph-h)/2,w,h);g.restore()}
  else{const gr=g.createLinearGradient(0,0,W,ph);gr.addColorStop(0,P);gr.addColorStop(1,'#f5d6a0');g.fillStyle=gr;g.fillRect(0,0,W,ph);g.font='160px serif';g.textAlign='center';g.fillText('🍞',W/2,ph/2+55);g.textAlign='left'}
  const F='"PingFang SC","Microsoft YaHei",sans-serif';let y=ph+90;
  g.fillStyle='#2b2420';g.font=`bold 64px ${F}`;g.fillText(r.name.slice(0,16),60,y);y+=60;
  g.fillStyle='#8a7f76';g.font=`34px ${F}`;g.fillText(bake?`${bake.date}  ${stars(bake.rating)}${bake.ovenTemp?`  ${bake.ovenTemp}℃`:''}${bake.ovenTime?` ${bake.ovenTime}min`:''}`:`出品 ${r.yieldCount||1} 个 · 面团 ${fx(c.total,0)}g`,60,y);y+=50;
  // pills
  const pills=[`水合 ${fx(c.hydration)}%`,`成本 ${yuan(c.cost)}`,`每个 ${yuan(c.perLoaf)}`];let x=60;g.font=`bold 34px ${F}`;
  for(const p of pills){const w=g.measureText(p).width+44;g.fillStyle=P;g.globalAlpha=.15;rr(g,x,y,w,62,31);g.fill();g.globalAlpha=1;g.fillStyle=P;g.fillText(p,x+22,y+43);x+=w+16}
  y+=110;g.font=`32px ${F}`;const rows=c.rows.slice(0,img?8:14);const col=Math.ceil(rows.length/2);
  rows.forEach((i,k)=>{const cx=k<col?60:W/2+20;const cy=y+(k%col)*52;g.fillStyle='#2b2420';g.fillText(i.name.slice(0,7),cx,cy);g.fillStyle='#8a7f76';g.textAlign='right';g.fillText(`${fx(i.g,0)}g · ${fx(i.pct,0)}%`,cx+440,cy);g.textAlign='left'});
  if(bake?.notes){const ny=y+col*52+20;if(ny<H-140){g.fillStyle='#5a4f46';g.font=`30px ${F}`;g.fillText('“'+bake.notes.replace(/\n/g,' ').slice(0,30)+(bake.notes.length>30?'…':'')+'”',60,ny)}}
  g.fillStyle=P;g.fillRect(0,H-90,W,90);g.fillStyle='#fff';g.font=`bold 34px ${F}`;g.fillText('🍞 面包手记 · 记录每一次烘焙',60,H-34);
  const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.9));const url=URL.createObjectURL(blob);const file=new File([blob],`面包手记-${r.name}.jpg`,{type:'image/jpeg'});
  const canShare=navigator.canShare&&navigator.canShare({files:[file]});
  openModal(`<h3 style="margin-top:0">分享卡片</h3><img class="share-preview" src="${url}" alt="分享卡片">
   <div class="row" style="margin-top:12px"><a class="btn" href="${url}" download="${esc(file.name)}">保存图片</a>${canShare?'<button class="btn ghost" id="doShare">系统分享…</button>':''}<button class="btn ghost" id="closeM">关闭</button></div>
   <div class="hint">发到微信朋友圈：网页无法直接发朋友圈。请点「保存图片」（在微信内置浏览器中可<b>长按上方图片</b>保存到相册），再打开微信 → 朋友圈 → 右上角相机 → 从相册选择。</div>`);
  $('#closeM').onclick=closeModal;
  if(canShare)$('#doShare').onclick=()=>navigator.share({files:[file],title:r.name,text:`${r.name} · 面包手记`}).catch(()=>{});
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

// ---------- discover ----------
route(/^\/discover$/,()=>{
  setHeader('发现做法',false);
  view.innerHTML=`<div class="card"><h3>去平台搜索</h3><div class="row"><input id="kw" placeholder="例如：北海道吐司" style="flex:1"></div>
   <div class="row" style="margin-top:8px"><button class="btn" data-site="xcf">下厨房搜索</button><button class="btn" data-site="xhs" style="background:#ff2442">小红书搜索</button></div>
   <div class="hint">找到喜欢的做法后，复制其中的用料文字（和链接）回来，用下方「导入做法」一键转成配方。</div></div>
   <div class="card"><h3>导入做法</h3><label>来源链接（可选）</label><input id="iurl" placeholder="粘贴小红书 / 下厨房链接">
   <label>配方名称</label><input id="iname" placeholder="自动识别或手动填写">
   <label>用料文字</label><textarea id="itext" rows="6" placeholder="高筋面粉 250g&#10;水 170克&#10;盐：5g&#10;鸡蛋 1个"></textarea>
   <button class="btn block" id="iparse" style="margin-top:10px">识别并创建配方</button></div>
   <h3>经典配方</h3><div id="lib"></div>`;
  view.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>{const k=encodeURIComponent($('#kw').value.trim()||'面包');
    window.open(b.dataset.site==='xcf'?`https://www.xiachufang.com/search/?keyword=${k}`:`https://www.xiaohongshu.com/search_result?keyword=${k}`,'_blank','noopener')});
  $('#iparse').onclick=()=>{let text=$('#itext').value;let url=$('#iurl').value.trim();const m=text.match(/https?:\/\/\S+/);if(!url&&m)url=m[0];
    const ings=Store.parseIngredients(text);if(!ings.length)return toast('没有识别到「原料 + 克数」的行');
    if(!ings.some(i=>i.isFlour))ings[0].isFlour=true;
    let name=$('#iname').value.trim();if(!name){const first=text.split('\n').map(s=>s.trim()).find(s=>s&&!/\d/.test(s)&&!/^https?:/.test(s)&&s.length<=20);name=first||'导入的配方'}
    window._draft={name,yieldCount:1,ingredients:ings,source:url,steps:text.split('\n').filter(l=>!Store.parseIngredients(l).length&&!/^https?:/.test(l.trim())).join('\n').trim()};
    toast(`识别到 ${ings.length} 种原料，请确认`);location.hash='#/recipe-edit/new'};
  $('#lib').innerHTML=BREAD_LIBRARY.map((l,k)=>{const r=libToRecipe(l);const c=calc(r);return `<div class="card"><div class="row between"><div class="grow"><b>${esc(l.name)}</b><div class="muted">面粉 ${c.flour}g · 水合 ${fx(c.hydration)}% · ${l.yieldCount} 个 · 约 ${yuan(c.cost)}</div></div><button class="btn sm" data-add="${k}">加入</button></div>
   <details><summary class="muted small" style="margin-top:6px;cursor:pointer">查看配比与做法</summary><p class="small">${r.ingredients.map(i=>`${esc(i.name)} ${i.grams}g (${fx(i.grams/c.flour*100)}%)`).join('、')}</p><div class="small" style="white-space:pre-wrap">${esc(l.steps)}</div></details></div>`}).join('');
  view.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const r=libToRecipe(BREAD_LIBRARY[b.dataset.add]);r.id=uid();r.createdAt=r.updatedAt=Date.now();S.recipes.push(r);ensurePrices(r.ingredients);save();toast('已加入我的配方');location.hash='#/recipe/'+r.id});
});
function libToRecipe(l){return {name:l.name,yieldCount:l.yieldCount,steps:l.steps,source:'',ingredients:l.ing.map(([name,grams,f])=>({name,grams,isFlour:!!f}))}}

// ---------- stats ----------
let statTab='month';
route(/^\/stats$/,()=>{
  setHeader('费用统计',false);
  const bakes=S.bakes;const total=bakes.reduce((a,b)=>a+(b.cost||0),0);
  const ym=today().slice(0,7);const thisMonth=bakes.filter(b=>(b.date||'').startsWith(ym)).reduce((a,b)=>a+(b.cost||0),0);
  view.innerHTML=`<div class="stats"><div class="stat"><b>${yuan(total)}</b>累计花费</div><div class="stat"><b>${yuan(thisMonth)}</b>本月</div><div class="stat"><b>${bakes.length}</b>烘焙次数</div></div>
   <div class="seg">${[['month','按月'],['recipe','按配方'],['ing','按原料']].map(([k,t])=>`<button data-k="${k}" class="${k===statTab?'on':''}">${t}</button>`).join('')}</div>
   <div class="card" id="chart"></div><div class="card" id="stable"></div>
   <p class="muted small">统计基于烘焙记录（每次记录按当时价格库计算原料花费）。</p>`;
  view.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{statTab=b.dataset.k;render()});
  if(!bakes.length){$('#chart').innerHTML='<div class="empty"><div>📊</div>记录烘焙后这里会显示花费统计</div>';$('#stable').remove();return}
  const agg={};const add=(k,v,n=1)=>{agg[k]=agg[k]||{v:0,n:0};agg[k].v+=v;agg[k].n+=n};
  if(statTab==='month'){const ms=[];const d=new Date();for(let i=11;i>=0;i--){const t=new Date(d.getFullYear(),d.getMonth()-i,1);ms.push(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`)}
    ms.forEach(m=>agg[m]={v:0,n:0});bakes.forEach(b=>add((b.date||'').slice(0,7),b.cost||0))}
  else if(statTab==='recipe')bakes.forEach(b=>add(recipe(b.recipeId)?.name||b.recipeName||'已删除',b.cost||0));
  else bakes.forEach(b=>Object.entries(b.itemCosts||{}).forEach(([k,v])=>add(k,v)));
  let items=Object.entries(agg);if(statTab!=='month')items.sort((a,b)=>b[1].v-a[1].v);else items.sort((a,b)=>a[0].localeCompare(b[0])).splice(0,Math.max(0,items.length-12));
  if(statTab==='month')items=items.slice(-12);
  $('#chart').innerHTML=statTab==='month'?barChart(items.map(([k,o])=>[k.slice(5)+'月',o.v])):hbarChart(items.slice(0,10).map(([k,o])=>[k,o.v]));
  const sum=items.reduce((a,[,o])=>a+o.v,0)||1;
  $('#stable').innerHTML=`<table><tr><th>${statTab==='month'?'月份':statTab==='recipe'?'配方':'原料'}</th><th class="n">${statTab==='ing'?'出现':'次数'}</th><th class="n">花费</th><th class="n">占比</th></tr>${items.filter(([,o])=>o.n).map(([k,o])=>`<tr><td>${esc(k)}</td><td class="n">${o.n}</td><td class="n">${yuan(o.v)}</td><td class="n">${fx(o.v/sum*100)}%</td></tr>`).join('')}</table>`;
});
function barChart(data){const W=340,H=180,max=Math.max(...data.map(d=>d[1]),1),bw=W/data.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H+30}">${data.map(([l,v],i)=>{const h=v/max*H;return `<rect x="${i*bw+4}" y="${H-h+10}" width="${bw-8}" height="${h}" rx="4" fill="var(--primary)" opacity="${v?1:.25}"/>${v?`<text x="${i*bw+bw/2}" y="${H-h+6}" font-size="8" text-anchor="middle" fill="var(--muted)">${Math.round(v)}</text>`:''}<text x="${i*bw+bw/2}" y="${H+24}" font-size="9" text-anchor="middle" fill="var(--muted)">${l}</text>`}).join('')}</svg>`}
function hbarChart(data){const W=340,rh=26,max=Math.max(...data.map(d=>d[1]),1);
  return `<svg class="chart" viewBox="0 0 ${W} ${data.length*rh+4}">${data.map(([l,v],i)=>`<text x="0" y="${i*rh+17}" font-size="11" fill="var(--text)">${esc(l.slice(0,7))}</text><rect x="90" y="${i*rh+5}" width="${Math.max(2,v/max*190)}" height="16" rx="4" fill="var(--primary)"/><text x="${96+v/max*190}" y="${i*rh+17}" font-size="10" fill="var(--muted)">${yuan(v)}</text>`).join('')}</svg>`}

// ---------- me ----------
route(/^\/me$/,()=>{
  setHeader('我的',false);
  view.innerHTML=`<div class="card"><h3>主题色</h3><div class="swatches">${PRESETS.map(([n,c])=>`<button class="swatch ${S.settings.theme===c?'on':''}" style="background:${c}" title="${n}" data-c="${c}"></button>`).join('')}
   <label class="swatch" style="margin:0;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);position:relative" title="自定义"><input type="color" id="cc" value="${S.settings.theme}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%"></label></div>
   <label>外观</label><div class="seg" id="mode">${[['auto','跟随系统'],['light','浅色'],['dark','深色']].map(([k,t])=>`<button data-m="${k}" class="${S.settings.mode===k?'on':''}">${t}</button>`).join('')}</div></div>
   <div class="card"><div class="row between"><h3>原料价格库</h3><button class="btn sm" id="addP">＋ 添加</button></div><p class="muted small">填写购买价和包装规格，自动算出每克成本，所有配方共用。</p><input id="pq" placeholder="搜索原料" style="margin-bottom:8px"><div id="plist"></div></div>
   <div class="card"><h3>数据备份</h3><p class="muted small">数据只保存在本机浏览器中。建议定期导出备份（含照片）。</p><div class="row"><button class="btn" id="exp">导出 JSON</button><label class="btn ghost" style="margin:0;color:var(--primary)">导入 JSON<input type="file" id="imp" accept="application/json,.json" hidden></label><button class="btn danger" id="clr">清空数据</button></div></div>
   <p class="muted small" style="text-align:center">面包手记 · 开源免费 · 数据不上传任何服务器</p>`;
  view.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{S.settings.theme=b.dataset.c;save();applyTheme();render()});
  $('#cc').onchange=e=>{S.settings.theme=e.target.value;save();applyTheme();render()};
  $('#mode').onclick=e=>{if(e.target.dataset.m){S.settings.mode=e.target.dataset.m;save();applyTheme();render()}};
  const plist=()=>{const k=$('#pq').value.trim();$('#plist').innerHTML=`<table><tr><th>原料</th><th class="n">价格/规格</th><th class="n">每100g</th></tr>${S.prices.filter(p=>!k||p.name.includes(k)).sort((a,b)=>(a.size>0)-(b.size>0)).map(p=>`<tr data-p="${p.id}" style="cursor:pointer"><td>${esc(p.name)}</td><td class="n">${p.size>0?`${yuan(p.price)} / ${p.size}g`:'<span class="tag">未定价</span>'}</td><td class="n">${p.size>0?yuan(p.price/p.size*100):'-'}</td></tr>`).join('')}</table>`;
    $('#plist').querySelectorAll('[data-p]').forEach(t=>t.onclick=()=>editPrice(S.prices.find(p=>p.id===t.dataset.p),plist))};
  $('#pq').oninput=plist;plist();$('#addP').onclick=()=>editPrice(null,plist);
  $('#exp').onclick=exportData;$('#imp').onchange=e=>importData(e.target.files[0]);
  $('#clr').onclick=async()=>{if(!confirm('确定清空所有配方、记录、照片？此操作不可恢复，建议先导出备份。'))return;await Photos.clear();Store.reset();location.reload()};
});
function editPrice(p,done){const isNew=!p;p=p||{name:'',price:'',size:''};
  openModal(`<h3 style="margin-top:0">${isNew?'添加原料':'编辑原料'}</h3><label>名称</label><input id="pn" value="${esc(p.name)}"><div class="grid2"><div><label>价格 (¥)</label><input id="pp" type="number" step="0.01" inputmode="decimal" value="${p.price}"></div><div><label>规格 (g/ml)</label><input id="ps" type="number" inputmode="decimal" value="${p.size||''}" placeholder="500"></div></div><p class="muted" id="pg"></p>
   <div class="row"><button class="btn" id="psv">保存</button>${isNew?'':'<button class="btn danger" id="pdl">删除</button>'}<button class="btn ghost" id="pcl">取消</button></div><p class="muted small">提示：鸡蛋约 50g/个，30 个装 ≈ 1500g。</p>`);
  const u=()=>{const pr=+$('#pp').value,s=+$('#ps').value;$('#pg').textContent=s>0?`每克 ¥${(pr/s).toFixed(4)} · 每 100g ${yuan(pr/s*100)}`:''};$('#pp').oninput=$('#ps').oninput=u;u();
  $('#pcl').onclick=closeModal;
  $('#psv').onclick=()=>{const n=$('#pn').value.trim();if(!n)return toast('请填写名称');Object.assign(p,{name:n,price:+$('#pp').value||0,size:+$('#ps').value||0,auto:false});if(isNew){p.id=uid();S.prices.push(p)}save();closeModal();done();toast('已保存')};
  if(!isNew)$('#pdl').onclick=()=>{S.prices.splice(S.prices.indexOf(p),1);save();closeModal();done()};
}
const b2d=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
async function exportData(){const ph=await Photos.all();const photos={};for(const [k,v] of Object.entries(ph))photos[k]=await b2d(v);
  const blob=new Blob([JSON.stringify({app:'bread-notes',version:1,exportedAt:new Date().toISOString(),data:S,photos})],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`面包手记备份-${today()}.json`;document.body.appendChild(a);a.click();a.remove();toast('已导出')}
async function importData(file){if(!file)return;try{const j=JSON.parse(await file.text());if(j.app!=='bread-notes'||!j.data)throw new Error('不是面包手记的备份文件');
  if(!confirm(`导入将覆盖当前数据（${j.data.recipes?.length||0} 个配方，${j.data.bakes?.length||0} 条记录），继续？`))return;
  await Photos.clear();for(const [k,v] of Object.entries(j.photos||{})){const blob=await (await fetch(v)).blob();await putWithId(k,blob)}
  Store.replace(j.data);toast('导入成功');setTimeout(()=>location.reload(),600)}catch(e){alert('导入失败：'+e.message)}}
async function putWithId(id,blob){const req=indexedDB.open('breadnotes',1);const d=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
  await new Promise((res,rej)=>{const t=d.transaction('photos','readwrite');t.objectStore('photos').put(blob,id);t.oncomplete=res;t.onerror=()=>rej(t.error)});d.close()}

render();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.BreadApp={shareCard,render};
})();
