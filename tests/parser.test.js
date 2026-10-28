const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../js/calc.js');
const g=(r,n,grp='')=>r.ingredients.find(i=>i.name===n&&(i.group||'')===grp);
test('下厨房风格：分组、全角数字、范围、分数、个/茶匙',()=>{
  const r=C.parseRecipeText(`北海道吐司的做法
用料
【汤种】
高筋面粉 25g
水 125g
【主面团】
高筋面粉 250g
牛奶：１００克
鸡蛋 1个
细砂糖 30-35g
盐 1/2茶匙
黄油 25 g
做法
1. 汤种煮至糊状冷却
2. 180℃烤35分钟`);
  assert.equal(r.name,'北海道吐司');assert.equal(g(r,'高筋面粉','汤种').grams,25);assert.equal(g(r,'水','汤种').grams,125);assert.equal(g(r,'高筋面粉').grams,250);
  assert.equal(g(r,'牛奶').grams,100);assert.equal(g(r,'鸡蛋').grams,50);assert.equal(g(r,'鸡蛋').conf,'low');assert.equal(g(r,'细砂糖').grams,32.5);assert.equal(g(r,'盐').grams,3);
  assert.equal(r.ingredients.length,8);assert.deepEqual(r.oven,{temp:180,time:35});assert.match(r.steps,/汤种煮至/);
});
test('小红书风格：一行多个原料、kg/L/勺/少许、OCR 字间空格',()=>{
  const r=C.parseRecipeText(`🥯 原味贝果
高 筋 面 粉 0.5kg 水 0.3L
盐 8g，糖 20g，酵母 1小勺
橄榄油 1大勺
芝麻 少许`);
  assert.equal(g(r,'高筋面粉').grams,500);assert.equal(g(r,'水').grams,300);assert.equal(g(r,'盐').grams,8);assert.equal(g(r,'糖').grams,20);assert.equal(g(r,'酵母').grams,3);assert.equal(g(r,'橄榄油').grams,14);
  assert.equal(g(r,'芝麻').grams,0);assert.equal(g(r,'芝麻').conf,'low');
});
test('只有烘焙百分比的表格',()=>{
  const r=C.parseRecipeText(`法棍 配方表
T65 法国粉 100%
水 70%
盐 2%
鲁邦种 20%
干酵母 0.3%`,{flourBase:1000});
  assert.ok(r.percentOnly);assert.equal(g(r,'T65 法国粉').grams,1000);assert.ok(g(r,'T65 法国粉').isFlour);assert.equal(g(r,'水').grams,700);assert.equal(g(r,'干酵母').grams,3);
});
test('中种、馅、表面分组；数量在前',()=>{
  const r=C.parseRecipeText(`肉桂卷
中种：高筋面粉 175g 牛奶 110g
主面团
75g 高筋面粉
30g 细砂糖
馅料
红糖 40g
肉桂粉 4g
表面
糖粉 60g`);
  assert.equal(g(r,'高筋面粉','中种').grams,175);assert.equal(g(r,'牛奶','中种').grams,110);assert.equal(g(r,'高筋面粉').grams,75);assert.equal(g(r,'细砂糖').grams,30);
  assert.equal(g(r,'红糖','馅料').grams,40);assert.equal(g(r,'糖粉','表面').grams,60);
  const c=C.calc(r,1,[]);assert.equal(c.flour,250);
});
test('OCR 把 g 识别成 9 的异常值会被标黄；分数 ½ / 1又1/2',()=>{
  const r=C.parseRecipeText('高筋面粉 2509\n黄油 ½杯\n酵母 1又1/2茶匙');
  assert.equal(g(r,'高筋面粉').conf,'low');assert.equal(g(r,'黄油').grams,120);assert.equal(g(r,'酵母').grams,4.5);
});
test('LLM JSON 归一化与校验',()=>{
  const r=C.normalizeLLM('```json\n{"name":"奶香餐包","ingredients":[{"name":"高筋面粉","amount":300,"unit":"g","group":"主面团"},{"name":"鸡蛋","amount":"1","unit":"个","group":""},{"name":"糖","amount":"30-35","unit":"克"},{"name":"盐","amount":null,"unit":"g"},{"name":""}],"steps":["揉面","发酵"],"oven":{"temp":180,"time":18},"notes":"x"}\n```');
  assert.equal(r.name,'奶香餐包');assert.equal(r.ingredients.length,4);assert.equal(r.ingredients[0].grams,300);assert.ok(r.ingredients[0].isFlour);assert.equal(r.ingredients[0].group,'');
  assert.equal(r.ingredients[1].grams,50);assert.equal(r.ingredients[2].grams,32.5);assert.equal(r.ingredients[3].conf,'low');assert.equal(r.steps,'揉面\n发酵');assert.deepEqual(r.oven,{temp:180,time:18});
  assert.throws(()=>C.normalizeLLM('抱歉我看不清'));
});
test('OCR 错字纠正',()=>{
  assert.deepEqual(C.fixOcrName('高盘面粉'),{name:'高筋面粉',fixed:true});assert.deepEqual(C.fixOcrName('细人砂糖'),{name:'细砂糖',fixed:true});
  assert.deepEqual(C.fixOcrName('牛奶'),{name:'牛奶',fixed:false});assert.equal(C.fixOcrName('核桃').fixed,false);
});
