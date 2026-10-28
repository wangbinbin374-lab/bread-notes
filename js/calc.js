// 面包手记 · 纯计算模块（浏览器与 Node 通用，可单元测试）
(function(root){
'use strict';
const FLOUR_RE=/(面粉|高筋|低筋|中筋|全麦粉|黑麦粉|面包粉|法国粉|\bT\d{2,3}\b|T\d{2,3}|斯佩尔特|小麦粉|裸麦粉|bread\s*flour|all[- ]purpose|whole\s*wheat|rye\s*flour|\bflour\b)/i;
const NOT_FLOUR_RE=/(奶粉|泡打粉|可可粉|抹茶粉|肉桂粉|糖粉|淀粉|苏打粉|酵母|改良剂|红曲粉|竹炭粉|香草粉|吉士粉|杏仁粉)/;
const WATER_MAP=[[/^(水|冰水|温水|清水|凉水|热水|开水|纯净水|water)/i,1],[/牛奶|鲜奶|全脂奶|milk/i,0.88],[/(全蛋|鸡蛋|蛋液|^蛋$|egg)/i,0.75],[/蛋黄|yolk/i,0.5],[/蛋白|蛋清|white/i,0.88],[/酸奶|yogurt/i,0.85],[/淡奶油|稀奶油|动物奶油|cream/i,0.6],[/鲁邦|酸种|液种|levain|starter/i,0.5],[/汤种/,0.8]];
const NON_DOUGH_RE=/(馅|表面|装饰|糖霜|淋面|刷面|酱|内馅|撒面|酥粒|顶部|topping|filling|glaze)/i;
const isFlour=n=>FLOUR_RE.test(n||'')&&!NOT_FLOUR_RE.test(n||'');
function waterRatio(n){for(const [re,v] of WATER_MAP) if(re.test(n||'')) return v; return 0}
const norm=s=>String(s||'').replace(/[（(【\[].*?[)）】\]]/g,'').replace(/\s/g,'').toLowerCase();
const num=v=>{const x=typeof v==='string'?parseFloat(v):v;return Number.isFinite(x)?x:0};
const pos=v=>Math.max(0,num(v));

// ---- 单位 ----
const PIECE_GRAMS=[[/蛋黄|yolk/i,18],[/蛋白|蛋清/i,32],[/鸡蛋|全蛋|^蛋$|egg/i,50]];
function pieceGrams(name){for(const [re,g] of PIECE_GRAMS) if(re.test(name||'')) return g; return null}
const UNIT_ALIASES={g:'g','克':'g',gram:'g',grams:'g',kg:'kg','千克':'kg','公斤':'kg','斤':'jin',ml:'ml','毫升':'ml',l:'L','升':'L',
 '个':'pc','只':'pc','颗':'pc','枚':'pc',pc:'pc',pcs:'pc','勺':'tbsp','大勺':'tbsp','汤匙':'tbsp','汤勺':'tbsp',tbsp:'tbsp','小勺':'tsp','茶匙':'tsp',tsp:'tsp','杯':'cup',cup:'cup',cups:'cup'};
function canonUnit(u){if(u==null||u==='')return 'g';const k=String(u).trim();return UNIT_ALIASES[k]||UNIT_ALIASES[k.toLowerCase()]||null}
// 返回 {grams, approx}；无法换算时 grams=null
function toGrams(amount,unit,name){
  const a=num(amount);if(!(a>0))return {grams:a===0?0:null,approx:false};
  const u=canonUnit(unit);
  switch(u){case 'g':case 'ml':return {grams:a,approx:u==='ml'&&!/^(水|清水|water)/i.test(name||'')};
   case 'kg':case 'L':return {grams:a*1000,approx:u==='L'};case 'jin':return {grams:a*500,approx:false};
   case 'pc':{const g=pieceGrams(name);return g?{grams:a*g,approx:true}:{grams:null,approx:true}}
   case 'tbsp':return {grams:a*(/油|奶|水|蜜/.test(name||'')?14:12),approx:true};
   case 'tsp':return {grams:a*(/酵母/.test(name||'')?3:/盐/.test(name||'')?6:/油|水|奶/.test(name||'')?5:4),approx:true};
   case 'cup':return {grams:a*(/粉/.test(name||'')?120:/糖/.test(name||'')?200:240),approx:true};
   default:return {grams:null,approx:true}}
}

// ---- 价格库 ----
const PRICE_UNIT_FACTOR={g:1,kg:1000,ml:1,L:1000};
// 每克价格；无效返回 null
function priceGramsPerPackage(p){if(!p)return null;const size=num(p.size);if(!(size>0))return null;const u=p.unit||'g';
  if(u==='pc'){const pg=num(p.pieceGrams)||pieceGrams(p.name)||0;return pg>0?size*pg:null}
  const f=PRICE_UNIT_FACTOR[u];return f?size*f:null}
function pricePerGram(p){const g=priceGramsPerPackage(p);const pr=num(p&&p.price);if(g==null||!(pr>=0))return null;return pr/g}
function findPrice(prices,name){const n=norm(name);if(!n)return null;prices=prices||[];
  const exact=prices.find(p=>norm(p.name)===n);if(exact)return exact;
  let best=null,bl=0;
  for(const p of prices){const m=norm(p.name);if(!m||pricePerGram(p)==null)continue;
    if(n.includes(m)){const idx=n.indexOf(m);if(idx>0&&/[无去减低零]/.test(n[idx-1]))continue;if(m.length>bl){best=p;bl=m.length}}}
  if(best)return best;
  if(n.length>=2){let c=null;for(const p of prices){const m=norm(p.name);if(m.includes(n)&&pricePerGram(p)!=null&&(!c||m.length<norm(c.name).length))c=p}return c}
  return null}
function perGram(prices,name){const p=findPrice(prices,name);return p?pricePerGram(p):null}

// ---- 配方计算 ----
function isNonDough(i){return NON_DOUGH_RE.test(i.group||'')||NON_DOUGH_RE.test((String(i.name||'').match(/[（(](.*?)[)）]/)||[])[1]||'')}
function calc(recipe,scale,prices){
  recipe=recipe||{};const sc=num(scale)>0?num(scale):1;const ings=Array.isArray(recipe.ingredients)?recipe.ingredients:[];
  let flour=0,total=0,water=0,doughTotal=0,cost=0;const missing=[];
  for(const i of ings){const g=pos(i.grams);total+=g;if(i.isFlour&&!isNonDough(i))flour+=g;if(!isNonDough(i)){water+=g*waterRatio(i.name);doughTotal+=g}}
  const rows=ings.map(i=>{const g0=pos(i.grams),g=g0*sc;const pg=perGram(prices,i.name);if(pg==null&&g>0)missing.push(i.name);const c=pg==null?0:pg*g;cost+=c;
    return Object.assign({},i,{g,pct:flour>0?g0/flour*100:0,cost:c,priced:pg!=null})});
  const n=Math.max(1,Math.floor(num(recipe.yieldCount))||1);
  return {rows,flour:flour*sc,total:total*sc,doughTotal:doughTotal*sc,hydration:flour>0?water/flour*100:0,cost,perLoaf:cost/(n*sc),pieces:n*sc,pieceWeight:total*sc/(n*sc),missing};
}
function itemCosts(c){const o={};for(const r of c.rows){if(!r.priced)continue;const k=norm(r.name)?String(r.name).replace(/[（(].*?[)）]/g,'').trim()||r.name:r.name;o[k]=(o[k]||0)+r.cost}return o}
function scaleFor(recipe,{targetWeight,targetCount}={},prices){const base=calc(recipe,1,prices);
  if(num(targetWeight)>0&&base.total>0)return num(targetWeight)/base.total;
  if(num(targetCount)>0)return num(targetCount)/Math.max(1,Math.floor(num(recipe.yieldCount))||1);return 1}

// ---- 统计 ----
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function aggregate(bakes,recipes,mode,now){now=now||new Date();const map=new Map();const add=(k,v)=>{const o=map.get(k)||{key:k,value:0,count:0};o.value+=num(v);o.count++;map.set(k,o)};
  const rname=id=>{const r=(recipes||[]).find(x=>x.id===id);return r&&r.name};
  if(mode==='month'){const keys=[];for(let i=11;i>=0;i--)keys.push(monthKey(new Date(now.getFullYear(),now.getMonth()-i,1)));keys.forEach(k=>map.set(k,{key:k,value:0,count:0}));
    for(const b of bakes||[]){const k=String(b.date||'').slice(0,7);if(map.has(k))add(k,b.cost)}return [...map.values()]}
  if(mode==='recipe'){for(const b of bakes||[])add(rname(b.recipeId)||b.recipeName||'已删除的配方',b.cost)}
  else for(const b of bakes||[])for(const [k,v] of Object.entries(b.itemCosts||{}))add(k,v);
  return [...map.values()].sort((a,b)=>b.value-a.value)}
function totals(bakes,now){now=now||new Date();const ym=monthKey(now);let total=0,month=0;for(const b of bakes||[]){const c=num(b.cost);total+=c;if(String(b.date||'').startsWith(ym))month+=c}return {total,month,count:(bakes||[]).length}}

// ---- 格式化（仅显示时取整） ----
function fmtYuan(v){const x=num(v);if(!Number.isFinite(x))return '¥—';const r=Math.round(Math.abs(x)*100+1e-6)/100;return (x<0&&r>0?'-':'')+'¥'+r.toFixed(2)}
function fmtNum(v,d=1){const x=num(v);const k=10**d;const r=Math.round(Math.abs(x)*k+1e-6)/k*(x<0?-1:1);return String(Object.is(r,-0)?0:r)}

// ---- 文本解析 ----
const FW=s=>String(s||'').replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[．。](?=\d)/g,'.').replace(/[／]/g,'/').replace(/[：]/g,':').replace(/[～〜]/g,'~').replace(/[－—–]/g,'-').replace(/％/g,'%').replace(/(\d)\s*[oO](?=\s*(g|克|\d))/g,'$10').replace(/[\u00a0\t\u3000]/g,' ').replace(/([\u4e00-\u9fa5])[ ]+(?=[\u4e00-\u9fa5])/g,'$1');
const FRAC={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3,'⅛':.125};
const NUM_SRC='(\\d+\\s*又\\s*\\d+\\s*/\\s*\\d+|\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d*[½¼¾⅓⅔⅛]|\\d+(?:\\.\\d+)?(?:\\s*[-~到至]\\s*\\d+(?:\\.\\d+)?)?|半)';
const UNIT_SRC='(kg|千克|公斤|斤|g(?![a-z])|克|ml|毫升|L(?![a-z])|升|个|只|颗|枚|大勺|小勺|汤匙|汤勺|茶匙|勺|tbsp|tsp|杯|cups?|%)?';
function parseNum(s){s=String(s).replace(/\s+/g,' ').trim();let m;
  if(s==='半')return {v:.5,range:false};
  if((m=s.match(/^(\d+)\s*(?:又|\s)\s*(\d+)\s*\/\s*(\d+)$/)))return {v:+m[1]+m[2]/m[3],range:false};
  if((m=s.match(/^(\d+)\s*\/\s*(\d+)$/)))return {v:m[2]>0?m[1]/m[2]:0,range:false};
  if((m=s.match(/^(\d*)([½¼¾⅓⅔⅛])$/)))return {v:(+m[1]||0)+FRAC[m[2]],range:false};
  if((m=s.match(/^(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)$/)))return {v:(+m[1]+ +m[2])/2,range:true};
  return {v:parseFloat(s),range:false}}
const GROUP_RE=/^[\s【\[(（<《#*·•\-]*(主面团|主面|面团|汤种|中种|烫种|波兰种|液种|鲁邦种|老面|酵头|预发酵|馅料|内馅|馅|表面装饰|表面|装饰|酥粒|糖霜|淋面|刷面|夹心|奶酥|波萝皮|菠萝皮|酱料|topping|filling|dough|poolish|tangzhong)(材料|部分|用料|食材)?[\s】\])）>》:：#*]*$/i;
const HEAD_RE=/^[\s【\[#*]*(用料|食材|材料|配料|原料|配方|食谱|ingredients?|做法|步骤|制作步骤|制作过程|方法|method|steps?|instructions?|小贴士|tips?|备注|注意)[\s】\]:：#*]*$/i;
const STEP_HEAD_RE=/^[\s【\[#*]*(做法|步骤|制作步骤|制作过程|方法|method|steps?|instructions?)/i;
const NOISE_RE=/^(步骤|第.{1,3}步|烤|温度|时间|发酵|分钟|小时|约|大约|室温|预热|上火|下火|共|合计|总计|总重|总量|编辑于|点赞|收藏|评论|关注|分享)/;
const SKIP_NAME_RE=/(分钟|小时|℃|°|度$|烤箱|预热|发酵|揉|搅拌|静置|松弛|冷藏|整形|放入|倒入|加入|取出|左右|以上|之后|然后|直到|面团温度|室温|收藏|点赞|评论|赞|浏览)/;
function cleanName(s){return UNPH(String(s||'')).replace(/^[\s·•\-*、,，.。)）\d]+/,'').replace(/[\s:：=＝…·.。\-_~]+$/,'').replace(/^(加|放|入|和|及)/,'').trim()}
// 面粉型号（T65、T55、W150）里的数字不是用量：先替换成占位符，名字里再还原
const PH=d=>String.fromCharCode(0xE000+ +d),UNPH=s=>s.replace(/[\uE000-\uE009]/g,c=>String(c.charCodeAt(0)-0xE000));
function parseLine(line,group){
  line=line.replace(/(^|[\s(（])([TtWw])(\d{2,3})(?=[\s\u4e00-\u9fa5)）])/g,(m,a,b,d)=>a+b+d.replace(/\d/g,PH));
  const out=[];const re=new RegExp('([^\\d\\s:,，、;；|/=＝½¼¾⅓⅔⅛][^\\d:,，、;；|=＝½¼¾⅓⅔⅛]*?)\\s*[:=]?\\s*'+NUM_SRC+'\\s*'+UNIT_SRC,'gi');
  let m;let consumed=false;
  while((m=re.exec(line))){let name=cleanName(m[1]);const unitRaw=m[3]||'';const n=parseNum(m[2]);
    if(!name||name.length>16||NOISE_RE.test(name)||SKIP_NAME_RE.test(name))continue;
    if(/^[a-z]$/i.test(name))continue;
    if(!unitRaw&&!/[\u4e00-\u9fa5a-z]/i.test(name))continue;
    consumed=true;
    if(unitRaw==='%'){out.push({name,pct:n.v,group,conf:'high',reasons:['烘焙百分比']});continue}
    const {grams,approx}=toGrams(n.v,unitRaw||'g',name);const reasons=[];
    if(!unitRaw)reasons.push('未写单位，按克计');if(approx)reasons.push(`按 ${unitRaw} 估算`);if(n.range)reasons.push('取范围中值');if(grams==null)reasons.push('无法换算为克');
    out.push({name,grams:grams==null?0:Math.round(grams*10)/10,amount:n.v,unit:unitRaw||'g',group,conf:reasons.length?'low':'high',reasons})}
  // 少许/适量
  if(!consumed){const q=line.match(/^\s*[·•\-*]?\s*([\u4e00-\u9fa5a-zA-Z ]{1,12}?)\s*[:：]?\s*(少许|适量|若干|少量)\s*$/);if(q){const name=cleanName(q[1]);if(name)out.push({name,grams:0,amount:0,unit:q[2],group,conf:'low',reasons:[`「${q[2]}」未给出用量`]})}}
  // 数量在前：250g 高筋面粉
  if(!out.length){const m2=line.match(new RegExp('^\\s*[·•\\-*]?\\s*'+NUM_SRC+'\\s*'+UNIT_SRC.replace(/\)\?$/,')')+'\\s*([\\u4e00-\\u9fa5a-zA-Z][^\\d]{0,14})$','i'));
    if(m2&&m2[2]&&!SKIP_NAME_RE.test(m2[3])){const name=cleanName(m2[3]);const n=parseNum(m2[1]);if(m2[2]==='%')out.push({name,pct:n.v,group,conf:'high',reasons:[]});else{const {grams,approx}=toGrams(n.v,m2[2],name);out.push({name,grams:grams==null?0:Math.round(grams*10)/10,amount:n.v,unit:m2[2],group,conf:(approx||grams==null||n.range)?'low':'high',reasons:approx?[`按 ${m2[2]} 估算`]:[]})}}}
  return out}
function looksLikeStep(line){return /^\s*(\d{1,2}|[一二三四五六七八九十]{1,2}|step\s*\d+)\s*[、.．)）:：]\s*\S/i.test(line)&&!/^\s*\d+(\.\d+)?\s*(g|克|kg|ml)/i.test(line)||(/(分钟|小时|℃|°C|揉|发酵|烤|整形|预热|搅拌|冷藏|松弛|放入|取出)/.test(line)&&line.length>14)}
function parseRecipeText(text,opts={}){
  const lines=FW(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  let group='',name='',inSteps=false;const items=[],steps=[],urls=[];let oven=null;
  for(const raw of lines){
    const u=raw.match(/https?:\/\/[^\s，。]+/);if(u){urls.push(u[0]);continue}
    if(STEP_HEAD_RE.test(raw)&&raw.length<12){inSteps=true;continue}
    if(HEAD_RE.test(raw)){if(!STEP_HEAD_RE.test(raw))inSteps=false;continue}
    const gm=raw.match(GROUP_RE);if(gm){group=/主面|^面团|dough/i.test(gm[1])?'':gm[1].replace(/材料|部分/g,'');inSteps=false;continue}
    const om=raw.match(/(\d{3})\s*(?:℃|°c|°|度)[^\d]{0,12}?(\d{1,3})\s*(?:分钟|min|分)/i)||raw.match(/(\d{1,3})\s*(?:分钟|min)[^\d]{0,10}?(\d{3})\s*(?:℃|°c|°|度)/i);
    if(om&&!oven){const a=+om[1],b=+om[2];oven=a>=100?{temp:a,time:b}:{temp:b,time:a}}
    if(inSteps||looksLikeStep(raw)){steps.push(raw);continue}
    // 分组写在行首：「汤种：高筋面粉 25g 水 125g」
    let line=raw,g=group;const inl=raw.match(/^[【\[]?(汤种|中种|烫种|波兰种|液种|馅料|内馅|表面|装饰|酥粒|主面团)[】\]]?\s*[:：]\s*(.+)$/);if(inl){g=/主面团/.test(inl[1])?'':inl[1];line=inl[2]}
    const its=parseLine(line,g);
    if(its.length){items.push(...its);continue}
    if(!name&&!items.length&&raw.length<=24&&!/\d{3,}/.test(raw)&&!SKIP_NAME_RE.test(raw)&&!/[。！？!?]$/.test(raw))name=raw.replace(/^[#【\[\s]+|[】\]\s#]+$/g,'').replace(/(的做法|的配方|配方|食谱)$/,'')||raw;
    else if(raw.length>6)steps.push(raw)}
  // 仅百分比表 → 按 flourBase 换算
  const hasGrams=items.some(i=>i.grams>0);const flourBase=num(opts.flourBase)>0?num(opts.flourBase):500;let percentOnly=false;
  const out=[];
  for(const i of items){if(i.pct!=null){if(hasGrams)continue;percentOnly=true;out.push({name:i.name,grams:Math.round(flourBase*i.pct/100*10)/10,group:i.group,isFlour:isFlour(i.name),conf:'high',reasons:[`由 ${i.pct}% 按面粉 ${flourBase}g 换算`],pct:i.pct})}
    else out.push({name:i.name,grams:i.grams,group:i.group||'',isFlour:isFlour(i.name)&&!NON_DOUGH_RE.test(i.group||''),conf:i.conf,reasons:i.reasons,amount:i.amount,unit:i.unit})}
  if(out.length&&!out.some(i=>i.isFlour)){const f=out.find(i=>/粉/.test(i.name)&&!NOT_FLOUR_RE.test(i.name));if(f){f.isFlour=true;f.reasons=[...(f.reasons||[]),'推测为面粉'];f.conf='low'}}
  // 可疑数值：OCR 常把 g 识别成 9（2509）
  for(const i of out){if(i.grams>=2000&&!/水/.test(i.name)){i.conf='low';i.reasons=[...(i.reasons||[]),'数值异常大，可能识别错误']}}
  return {name:name.slice(0,30),ingredients:out,steps:steps.join('\n'),source:urls[0]||'',oven,percentOnly}}
function parseIngredients(text){return parseRecipeText(text).ingredients.map(({name,grams,isFlour,group})=>({name,grams,isFlour,group}))}

// ---- 大模型 JSON 结果校验/归一化 ----
function normalizeLLM(obj){
  if(typeof obj==='string'){const s=obj.replace(/^[\s\S]*?```(?:json)?/i,m=>m.includes('```')?'':m).replace(/```[\s\S]*$/,'');const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<a)throw new Error('模型未返回 JSON');obj=JSON.parse(s.slice(a,b+1))}
  if(!obj||typeof obj!=='object')throw new Error('结果格式错误');
  const str=(v,n)=>typeof v==='string'?v.trim().slice(0,n):(v==null?'':String(v).slice(0,n));
  const ings=Array.isArray(obj.ingredients)?obj.ingredients:[];const out=[];
  for(const it of ings.slice(0,80)){if(!it||typeof it!=='object')continue;const name=str(it.name,30);if(!name)continue;
    let amount=it.amount;let unit=str(it.unit,8)||'g';
    if(typeof amount==='string'){const p=parseNum(FW(amount).replace(/[^\d.\/~\-½¼¾⅓⅔⅛又 ]/g,'').trim()||'0');amount=p.v}
    amount=num(amount);const group=/主面|^dough$/i.test(str(it.group,10))?'':str(it.group,10);
    const {grams,approx}=unit==='%'?{grams:null,approx:true}:toGrams(amount,unit,name);const reasons=[];
    if(!(amount>0))reasons.push('未给出用量');if(approx)reasons.push(`按 ${unit} 估算`);if(grams==null&&amount>0)reasons.push('无法换算为克');
    out.push({name,grams:grams==null?0:Math.round(grams*10)/10,group,isFlour:isFlour(name)&&!NON_DOUGH_RE.test(group),conf:reasons.length?'low':'high',reasons,amount,unit})}
  let steps=obj.steps;steps=Array.isArray(steps)?steps.map(s=>str(typeof s==='object'?s&&(s.text||s.step):s,500)).filter(Boolean).join('\n'):str(steps,4000);
  const ov=obj.oven&&typeof obj.oven==='object'?obj.oven:{};const temp=num(ov.temp||ov.temperature),time=num(ov.time||ov.minutes);
  if(out.length&&!out.some(i=>i.isFlour)){const f=out.find(i=>/粉/.test(i.name)&&!NOT_FLOUR_RE.test(i.name));if(f)f.isFlour=true}
  return {name:str(obj.name,30),ingredients:out,steps,oven:temp||time?{temp:temp||null,time:time||null}:null,notes:str(obj.notes,1000),source:''}}

// ---- 分享卡片拼图布局：n 张照片（1–6）铺满 W×H，间距 gap ----
function collageLayout(n,W,H,gap){n=Math.max(0,Math.min(6,Math.floor(num(n))));gap=num(gap);if(!n)return [];
  const rowsSpec={1:[1],2:[2],3:null,4:[2,2],5:[2,3],6:[3,3]}[n];
  if(n===3){const bw=(W-gap)*2/3,sw=W-gap-bw,sh=(H-gap)/2;return [{x:0,y:0,w:bw,h:H},{x:bw+gap,y:0,w:sw,h:sh},{x:bw+gap,y:sh+gap,w:sw,h:sh}]}
  const out=[];const rh=(H-gap*(rowsSpec.length-1))/rowsSpec.length;
  rowsSpec.forEach((cols,ri)=>{const cw=(W-gap*(cols-1))/cols;for(let c=0;c<cols;c++)out.push({x:c*(cw+gap),y:ri*(rh+gap),w:cw,h:rh})});return out}
function coverCrop(iw,ih,w,h){const k=Math.max(w/iw,h/ih);const sw=w/k,sh=h/k;return {sx:(iw-sw)/2,sy:(ih-sh)/2,sw,sh}}
// OCR 错字纠正：与常用原料名只差 1 个字（替换 / 多一个字）时纠正，并返回 true 以便标黄
const KNOWN=['高筋面粉','低筋面粉','中筋面粉','全麦粉','黑麦粉','法国粉','面包粉','牛奶','鸡蛋','蛋黄','蛋清','细砂糖','白砂糖','糖粉','红糖','盐','干酵母','酵母','鲜酵母','黄油','无盐黄油','淡奶油','奶粉','水','冰水','橄榄油','玉米油','蜂蜜','炼乳','鲁邦种','可可粉','抹茶粉','芝士','奶油奶酪','肉桂粉','葡萄干','核桃仁','改良剂'];
function lev1(a,b){if(a===b)return 0;const A=[...a],B=[...b];if(Math.abs(A.length-B.length)>1)return 2;
  if(A.length===B.length){let d=0;for(let i=0;i<A.length;i++)if(A[i]!==B[i])d++;return d}
  const [L,S]=A.length>B.length?[A,B]:[B,A];for(let i=0;i<L.length;i++){if(L.slice(0,i).concat(L.slice(i+1)).join('')===S.join(''))return 1}return 2}
function fixOcrName(name,extra){const n=String(name||'');const list=[...new Set([...(extra||[]),...KNOWN])];if(list.includes(n)||n.length<3)return {name:n,fixed:false};
  const c=list.filter(k=>k.length>=3&&lev1(n,k)===1);return c.length===1?{name:c[0],fixed:true}:{name:n,fixed:false}}
const API={fixOcrName,collageLayout,coverCrop,isFlour,waterRatio,norm,pieceGrams,canonUnit,toGrams,priceGramsPerPackage,pricePerGram,findPrice,perGram,calc,itemCosts,scaleFor,aggregate,totals,fmtYuan,fmtNum,parseNum,parseRecipeText,parseIngredients,normalizeLLM,FW,isNonDough};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.BreadCalc=API;
})(typeof window!=='undefined'?window:globalThis);
