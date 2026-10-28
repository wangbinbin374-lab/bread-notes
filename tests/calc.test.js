// 运行：node --test tests/   （期望值均为手算）
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../js/calc.js');
const close=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} ≠ ${b}`);
const P=[{name:'高筋面粉',price:12,size:1000},{name:'水',price:0,size:1000},{name:'盐',price:3,size:500},{name:'黄油',price:45,size:454},{name:'干酵母',price:10,size:100}];

test('单位换算：g/kg/ml/L/个',()=>{
  close(C.pricePerGram({price:12,size:1000,unit:'g'}),0.012);
  close(C.pricePerGram({price:90,size:1,unit:'kg'}),0.09);
  close(C.pricePerGram({price:12,size:1,unit:'L'}),0.012);
  close(C.pricePerGram({price:6,size:500,unit:'ml'}),0.012);
  close(C.pricePerGram({name:'鸡蛋',price:25,size:30,unit:'pc'}),25/1500); // 默认 50g/个
  close(C.pricePerGram({name:'鸡蛋',price:25,size:30,unit:'pc',pieceGrams:60}),25/1800);
  assert.equal(C.pricePerGram({price:5,size:0}),null);
  assert.equal(C.pricePerGram({price:-1,size:100}),null);
  assert.equal(C.pricePerGram({price:'abc',size:100}),0); // 非数字价格按 0，不产生 NaN
  close(C.pricePerGram({price:12,size:1000}),0.012); // 旧数据无 unit = 克
});
test('findPrice：无盐黄油不能匹配成「盐」',()=>{
  assert.equal(C.findPrice(P,'无盐黄油').name,'黄油');
  assert.equal(C.findPrice(P,'盐').name,'盐');
  assert.equal(C.findPrice(P,'高筋面粉（汤种）').name,'高筋面粉');
  assert.equal(C.findPrice([{name:'盐',price:3,size:500}],'无盐黄油'),null);
  assert.equal(C.findPrice(P,''),null);
});
test('配方成本 / 每个成本 / 缩放',()=>{
  const r={yieldCount:4,ingredients:[{name:'高筋面粉',grams:300,isFlour:true},{name:'水',grams:200},{name:'盐',grams:6},{name:'无盐黄油',grams:24},{name:'干酵母',grams:3}]};
  // 300*0.012=3.6；盐 6*0.006=0.036；黄油 24*45/454=2.3788546...；酵母 3*0.1=0.3
  const exp=3.6+0.036+24*45/454+0.3;
  const c=C.calc(r,1,P);close(c.cost,exp);close(c.perLoaf,exp/4);close(c.total,533);close(c.flour,300);close(c.hydration,200/300*100);close(c.pieceWeight,533/4);
  assert.deepEqual(c.missing,[]);
  const c2=C.calc(r,2,P);close(c2.cost,exp*2);close(c2.perLoaf,exp/4);close(c2.total,1066);close(c2.pieceWeight,533/4);close(c2.hydration,c.hydration);
  const c5=C.calc(r,0.5,P);close(c5.cost,exp/2);
  close(C.scaleFor(r,{targetWeight:1066},P),2);close(C.scaleFor(r,{targetCount:6}),1.5);close(C.scaleFor(r,{targetWeight:0}),1);
});
test('烘焙百分比 / 水合（牛奶、鸡蛋、馅料不计）',()=>{
  const r={ingredients:[{name:'高筋面粉',grams:250,isFlour:true},{name:'低筋面粉',grams:50,isFlour:true},{name:'牛奶',grams:100},{name:'鸡蛋',grams:50},{name:'水',grams:80},{name:'红糖（馅）',grams:40},{name:'低筋面粉',grams:20,isFlour:true,group:'表面'}]};
  const c=C.calc(r,1,[]);close(c.flour,300);close(c.hydration,(80+88+37.5)/300*100);close(c.rows[0].pct,250/300*100);close(c.rows[2].pct,100/300*100);
  assert.deepEqual(c.missing.length,7);
});
test('异常值：缺失/0/负数/空/NaN 不产生 NaN',()=>{
  const r={yieldCount:0,ingredients:[{name:'高筋面粉',grams:-100,isFlour:true},{name:'水',grams:''},{name:'盐',grams:'abc'},{name:'',grams:5}]};
  const c=C.calc(r,NaN,P);assert.equal(c.flour,0);assert.equal(c.hydration,0);assert.equal(c.cost,0);assert.ok(Number.isFinite(c.perLoaf));assert.ok(Number.isFinite(c.pieceWeight));
  const e=C.calc(undefined,1,P);assert.equal(e.total,0);assert.equal(e.perLoaf,0);
  assert.equal(C.calc({ingredients:[{name:'神秘粉',grams:10}]},1,P).missing[0],'神秘粉');
});
test('fmtYuan：只在显示时四舍五入，无浮点漂移',()=>{
  assert.equal(C.fmtYuan(1.005),'¥1.01');assert.equal(C.fmtYuan(0.1+0.2),'¥0.30');assert.equal(C.fmtYuan(2.675),'¥2.68');
  assert.equal(C.fmtYuan(NaN),'¥0.00');assert.equal(C.fmtYuan(Infinity),'¥0.00');assert.equal(C.fmtYuan(-0.001),'¥0.00');assert.equal(C.fmtYuan(-1.5),'-¥1.50');assert.equal(C.fmtYuan(undefined),'¥0.00');
  assert.equal(C.fmtNum(66.666,1),'66.7');assert.equal(C.fmtNum(-0.01,1),'0');
});
test('烘焙记录快照 itemCosts：同名原料（主面团+汤种）累加而不是覆盖',()=>{
  const r={ingredients:[{name:'高筋面粉',grams:250,isFlour:true},{name:'高筋面粉',grams:25,isFlour:true,group:'汤种'},{name:'水',grams:125}]};
  const c=C.calc(r,2,P);const ic=C.itemCosts(c);close(ic['高筋面粉'],(250+25)*2*0.012);close(Object.values(ic).reduce((a,b)=>a+b,0),c.cost);
});
test('统计：按月只算近 12 个月；按配方/原料汇总',()=>{
  const now=new Date(2026,9,15);
  const bakes=[{date:'2026-10-01',cost:1.5,recipeId:'a',itemCosts:{'面粉':1,'黄油':0.5}},{date:'2026-10-20',cost:2.25,recipeId:'a',itemCosts:{'面粉':2.25}},{date:'2025-10-31',cost:9,recipeId:'b'},{date:'2026-05-03',cost:3,recipeId:'zz'},{date:'',cost:'x'}];
  const m=C.aggregate(bakes,[{id:'a',name:'吐司'},{id:'b',name:'贝果'}],'month',now);
  assert.equal(m.length,12);assert.equal(m[0].key,'2025-11');assert.equal(m[11].key,'2026-10');close(m[11].value,3.75);assert.equal(m[11].count,2);close(m.find(x=>x.key==='2026-05').value,3);
  close(m.reduce((a,b)=>a+b.value,0),6.75);
  const r=C.aggregate(bakes,[{id:'a',name:'吐司'},{id:'b',name:'贝果'}],'recipe',now);assert.equal(r[0].key,'贝果');close(r[0].value,9);close(r.find(x=>x.key==='吐司').value,3.75);assert.ok(r.find(x=>x.key==='已删除的配方'));
  const i=C.aggregate(bakes,[],'ing',now);close(i[0].value,3.25);assert.equal(i[0].count,2);
  const t=C.totals(bakes,now);close(t.total,15.75);close(t.month,3.75);
});
test('分享拼图布局 1–6 张：数量正确、在画布内、互不重叠、铺满',()=>{
  const W=1032,H=696,G=14;
  for(let n=1;n<=6;n++){const L=C.collageLayout(n,W,H,G);assert.equal(L.length,n);
    for(const q of L){assert.ok(q.x>=-1e-9&&q.y>=-1e-9&&q.x+q.w<=W+1e-6&&q.y+q.h<=H+1e-6&&q.w>0&&q.h>0)}
    for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){const p=L[a],q=L[b];assert.ok(p.x+p.w<=q.x+1e-6||q.x+q.w<=p.x+1e-6||p.y+p.h<=q.y+1e-6||q.y+q.h<=p.y+1e-6,`n=${n} 重叠`)}
    assert.ok(Math.abs(Math.max(...L.map(q=>q.x+q.w))-W)<1e-6&&Math.abs(Math.max(...L.map(q=>q.y+q.h))-H)<1e-6)}
  assert.equal(C.collageLayout(3,W,H,G)[0].h,H);// 一大两小
  const five=C.collageLayout(5,W,H,G);assert.equal(five.filter(q=>q.y===0).length,2);
  assert.equal(C.collageLayout(0,W,H,G).length,0);assert.equal(C.collageLayout(9,W,H,G).length,6);
  const cc=C.coverCrop(4000,3000,500,500);close(cc.sw,3000);close(cc.sx,500);
});
