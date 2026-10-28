// iPhone 13 触摸模拟：左滑露出删除 → 点删除 → 确认 → 配方消失；完全滑过阈值直接弹确认；点别处收起
const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13']});const p=await ctx.newPage();
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const errs=[];p.on('pageerror',e=>errs.push(e.message));
 let dialogs=[];p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 const cdp=await ctx.newCDPSession(p);
 const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
 const swipe=async(sel,dist)=>{const bb=await p.locator(sel).boundingBox();const y=bb.y+bb.height/2,x=bb.x+bb.width-30;await touch('touchStart',x,y);for(let i=1;i<=12;i++){await touch('touchMove',x-dist*i/12,y);await p.waitForTimeout(16)}await touch('touchEnd');await p.waitForTimeout(500)};
 const U='http://localhost:8765/';await p.goto(U);await p.evaluate(()=>{localStorage.clear()});await p.reload();
 await p.goto(U+'#/discover');await p.waitForTimeout(400);for(const k of [0,1,2]){await p.goto(U+'#/discover');await p.waitForTimeout(300);await p.tap(`[data-add="${k}"]`);await p.waitForTimeout(500)}
 await p.goto(U+'#/recipes');await p.waitForTimeout(600);const n0=await p.locator('.swipe-wrap').count();ok(n0===3,'3 recipes listed');
 const first=await p.locator('.swipe-wrap').first().getAttribute('data-wid');const name0=await p.evaluate(id=>Store.S.recipes.find(r=>r.id===id).name,first);
 // 1) 半滑 → 打开，删除按钮可点
 await swipe('.swipe-wrap >> nth=0 >> .card',120);
 ok(await p.locator('.swipe-wrap').first().evaluate(w=>w.classList.contains('open')),'partial swipe leaves card open');
 ok(await p.evaluate(()=>location.hash)==='#/recipes','swipe did not open detail');
 const del=p.locator('.swipe-wrap >> nth=0 >> .swipe-del');ok(await del.evaluate(e=>e.tagName)==='BUTTON','revealed 删除 is a real <button>');
 const bb=await del.boundingBox();const hit=await p.evaluate(([x,y])=>document.elementFromPoint(x,y).className,[bb.x+bb.width-25,bb.y+bb.height/2]);ok(/swipe-del/.test(hit),'删除 button is on top & hittable: '+hit);
 await p.tap('.swipe-wrap >> nth=0 >> .swipe-del');await p.waitForTimeout(700);
 ok(dialogs.length===1&&dialogs[0].includes(name0),'tap 删除 → confirm shown');
 ok(await p.evaluate(id=>!Store.S.recipes.some(r=>r.id===id),first),'recipe deleted from data');ok(await p.locator('.swipe-wrap').count()===2,'card removed from list');
 ok(await p.evaluate(()=>location.hash)==='#/recipes','delete tap not swallowed by card click');
 // 2) 打开后点别处收起
 await swipe('.swipe-wrap >> nth=0 >> .card',120);ok(await p.locator('.swipe-wrap.open').count()===1,'open again');
 await p.tap('#title');await p.waitForTimeout(500);ok(await p.locator('.swipe-wrap.open').count()===0,'tap elsewhere closes open card');
 // 3) 取消确认 → 留下
 p.removeAllListeners('dialog');p.on('dialog',d=>{dialogs.push(d.message());d.dismiss()});
 await swipe('.swipe-wrap >> nth=0 >> .card',260);ok(dialogs.length===2,'full swipe past threshold → confirm');ok(await p.locator('.swipe-wrap').count()===2,'cancel keeps recipe');
 // 4) 完全滑动 + 确认
 p.removeAllListeners('dialog');p.on('dialog',d=>{dialogs.push(d.message());d.accept()});
 await p.tap('#title');await p.waitForTimeout(400);await swipe('.swipe-wrap >> nth=0 >> .card',260);await p.waitForTimeout(500);ok(await p.locator('.swipe-wrap').count()===1,'full swipe + confirm deletes');
 // 5) 普通点击仍打开详情
 await p.tap('.swipe-wrap >> nth=0 >> .card');await p.waitForTimeout(500);ok((await p.evaluate(()=>location.hash)).startsWith('#/recipe/'),'plain tap still opens detail');
 ok(!errs.length,'no JS errors '+JSON.stringify(errs));await b.close()})();
