const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const U='http://localhost:8765/';await p.goto(U);await p.waitForTimeout(500);
 ok(await p.locator('.empty').isVisible(),'empty recipes view');
 // add library recipe
 await p.click('a[data-tab=discover]');await p.click('[data-add="0"]');await p.waitForTimeout(300);
 ok((await p.textContent('#rsum')).includes('%'),'library recipe added & detail shown');
 const h=await p.textContent('#rsum');ok(/6\d\.\d%|6\d%/.test(h),'toast hydration ~60s%: '+h);
 await p.fill('#tw','1000');ok((await p.textContent('#scaleInfo')).includes('1000g'),'scale by dough weight');
 await p.fill('#tn','2');ok((await p.textContent('#scaleInfo')).includes('×2'),'scale by count');
 await p.screenshot({path:'/tmp/shots/recipe.png',fullPage:true});
 // bake log with photo
 await p.click('text=＋ 记录一次烘焙');await p.fill('#btemp','180');await p.fill('#btime','35');await p.fill('#bnotes','组织很软，下次少放 5g 糖');
 await p.setInputFiles('#bfile','./icons/icon-512.png');await p.waitForSelector('#bph img');
 await p.click('#bstar [data-v="5"]');await p.click('#bsave');await p.waitForTimeout(400);
 ok(await p.locator('#rbakes .tl-item').count()===1,'bake log saved in timeline');
 await p.waitForTimeout(300);ok(await p.locator('#rbakes img[src^=blob]').count()===1,'photo stored in IndexedDB and shown');
 // share
 await p.click('#share');await p.waitForSelector('.share-preview');ok(true,'share card generated');
 await p.screenshot({path:'/tmp/shots/share.png'});await p.click('#closeM');
 // import
 await p.click('a[data-tab=discover]');await p.fill('#iurl','https://www.xiachufang.com/recipe/123/');
 await p.fill('#itext','北海道吐司\n高筋面粉 250g\n牛奶：130克\n鸡蛋 1个\n细砂糖 30g\n盐 3g\n黄油 25g\n1. 揉面');await p.click('#iparse');await p.waitForTimeout(300);
 ok(await p.inputValue('#fname')==='北海道吐司','import name parsed');ok(await p.locator('#ings .ing-row').count()===6,'import 6 ingredients');
 await p.click('#saveR');await p.waitForTimeout(300);ok((await p.textContent('main')).includes('xiachufang.com/recipe/123'),'source URL kept');
 // new recipe manual
 await p.goto(U+'#/recipe-edit/new');await p.fill('#fname','测试面包');await p.click('#saveR');await p.waitForTimeout(300);ok((await p.textContent('#title'))==='测试面包','manual recipe created');
 // stats
 await p.click('a[data-tab=stats]');ok(await p.locator('#chart svg').count()===1,'month chart');
 for(const k of ['recipe','ing']){await p.click(`.seg [data-k=${k}]`);ok(await p.locator('#chart svg rect').count()>0,'chart '+k)}
 await p.screenshot({path:'/tmp/shots/stats.png',fullPage:true});
 // theme + price
 await p.click('a[data-tab=me]');await p.click('[data-c="#5a8f4e"]');
 ok((await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary'))).trim()==='#5a8f4e','theme applied');
 await p.click('#mode [data-m=dark]');await p.click('#addP');await p.fill('#pn','核桃仁');await p.fill('#pp','30');await p.fill('#ps','500');await p.click('#psv');
 ok((await p.textContent('#plist')).includes('核桃仁'),'price added');
 await p.screenshot({path:'/tmp/shots/me-dark.png',fullPage:true});
 // export/import
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#exp')]);const path='/tmp/backup.json';await dl.saveAs(path);
 const j=JSON.parse(require('fs').readFileSync(path));ok(j.data.recipes.length===3&&Object.keys(j.photos).length===1,'export with photo');
 await p.click('#clr');await p.waitForTimeout(800);ok((await p.evaluate(()=>Store.S.recipes.length))===0,'cleared');
 await p.click('a[data-tab=me]');await p.setInputFiles('#imp',path);await p.waitForTimeout(1500);
 ok((await p.evaluate(()=>Store.S.recipes.length))===3,'import restored recipes');
 ok((await p.evaluate(async()=>Object.keys(await Store.Photos.all()).length))===1,'import restored photos');
 ok((await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary'))).trim()==='#5a8f4e','theme persisted');
 // reload offline
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await ctx.setOffline(true);await p.reload();ok((await p.textContent('#title')).length>0,'offline reload via SW');await ctx.setOffline(false);
 await p.goto(U+'#/bakes');await p.screenshot({path:'/tmp/shots/bakes.png',fullPage:true});
 ok(errs.length===0,'no JS errors '+JSON.stringify(errs));await b.close();
})();
