// 生成 /workspace/shots/v3 下的浅色 / 深色截图（iPhone 13 模拟）
const {chromium,devices}=require('playwright');const OUT=process.env.OUT||'/workspace/shots/v3';(async()=>{const b=await chromium.launch();
for(const mode of ['light','dark']){const ctx=await b.newContext({...devices['iPhone 13'],colorScheme:mode});const p=await ctx.newPage();p.on('dialog',d=>d.accept());const U='http://localhost:8765/';const S=n=>p.screenshot({path:`${OUT}/${n}-${mode}.png`,fullPage:true});
 await p.goto(U);await p.evaluate(()=>localStorage.clear());await p.reload();
 for(const k of [0,3]){await p.goto(U+'#/discover');await p.waitForTimeout(400);await p.tap(`[data-add="${k}"]`);await p.waitForTimeout(600)}
 await p.goto(U+'#/discover');await p.waitForTimeout(600);await S('discover');
 await p.goto(U+'#/recipes');await p.waitForTimeout(600);await S('recipes');
 const id=await p.evaluate(()=>Store.S.recipes[0].id);await p.goto(U+'#/recipe/'+id);await p.waitForTimeout(600);await S('recipe');
 await p.goto(U+'#/bake-edit/new?r='+id);await p.waitForTimeout(500);await p.setInputFiles('#bfile',[1,2,3,4,5,6].map(k=>`./tests/fixtures/p${k}.jpg`));await p.waitForTimeout(1500);await S('bake-photos');await p.tap('#bsave');await p.waitForTimeout(500);
 await p.goto(U+'#/bakes');await p.waitForTimeout(500);await p.tap('[data-share]');await p.waitForSelector('#pk .pcell');await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/share-pick-${mode}.png`});
 await p.tap('#pkok');await p.waitForSelector('.share-preview');await p.waitForTimeout(400);await p.screenshot({path:`${OUT}/share-card-${mode}.png`});
 await p.goto(U+'#/timer?r='+id);await p.waitForTimeout(500);await S('timer');
 await p.goto(U+'#/scan');await p.waitForTimeout(400);await S('scan');
 await p.goto(U+'#/discover');await p.waitForTimeout(400);await p.fill('#itext','北海道吐司\n高筋面粉 250g\n牛奶：130克\n鸡蛋 1个\n细砂糖 30-35g\n盐 3g\n黄油 25g');await p.tap('#iparse');await p.waitForTimeout(600);await S('review');
 await p.goto(U+'#/me');await p.waitForTimeout(500);await S('me');await p.goto(U+'#/stats');await p.waitForTimeout(500);await S('stats');
 await p.goto(U+'#/recipes');await p.waitForTimeout(500);const cdp=await ctx.newCDPSession(p);const bb=await p.locator('.swipe-wrap .card').first().boundingBox();const y=bb.y+bb.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330-12*i,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(600);await p.screenshot({path:`${OUT}/swipe-delete-${mode}.png`});
 await ctx.close()}
await b.close()})();
