const {chromium,devices}=require('playwright');const IPHONE=!!process.env.IPHONE;
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext(IPHONE?{...devices['iPhone 13'],acceptDownloads:true}:{viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true});if(IPHONE)console.log('— iPhone 13 emulation (touch, iOS UA) —');const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});p.on('dialog',d=>d.accept());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
 const U='http://localhost:8765/';await p.goto(U);await p.waitForTimeout(500);
 ok(await p.locator('.empty').isVisible(),'empty recipes view');
 // add library recipe
 await p.click('a[data-tab=discover]');await p.click('[data-add="0"]');await p.waitForTimeout(900);
 ok((await p.textContent('#rsum')).includes('%'),'library recipe added & detail shown');
 const h=await p.textContent('#rsum');ok(/6\d\.\d%|6\d%/.test(h),'toast hydration ~60s%: '+h);
 await p.fill('#tw','1000');ok((await p.textContent('#scaleInfo')).includes('1000g'),'scale by dough weight');
 await p.fill('#tw','');await p.fill('#tn','2');{const y=await p.evaluate(()=>Store.S.recipes[0].yieldCount||1);const t=await p.textContent('#scaleInfo');ok(t.includes('×'+(+(2/y).toFixed(2))),'scale by count: '+t+' (yield '+y+')')}
 await p.screenshot({path:'/tmp/shots/recipe.png',fullPage:true});
 // bake log with photo
 await p.click('text=＋ 记录一次烘焙');await p.fill('#btemp','180');await p.fill('#btime','35');await p.fill('#bnotes','组织很软，下次少放 5g 糖');
 const F=k=>`./tests/fixtures/p${k}.jpg`;
 await p.setInputFiles('#bfile',[1,2,3,4,5,6,1].map(F));await p.waitForTimeout(1500);
 ok(await p.locator('#bph .pcell').count()===6,'7 photos chosen → limit enforced at 6');
 ok((await p.textContent('#bpc'))==='6/6','counter 6/6');
 await p.locator('#bph .pcell').nth(1).locator('[data-mv="-1"]').click();await p.waitForTimeout(300);
 ok(await p.locator('#bph .pcell').nth(0).locator('.pbadge').count()===1,'reorder: moved photo becomes cover');
 await p.locator('#bph .pcell').nth(5).locator('[data-rm]').click();await p.waitForTimeout(300);ok(await p.locator('#bph .pcell').count()===5,'remove photo');
 await p.setInputFiles('#bfile',F(6));await p.waitForTimeout(800);ok(await p.locator('#bph .pcell').count()===6,'add back to 6');
 await p.fill('#benvt','26');await p.fill('#benvh','70');
 await p.click('#bstar [data-v="5"]');await p.click('#bsave');await p.waitForTimeout(400);
 ok(await p.locator('#rbakes .tl-item').count()===1,'bake log saved in timeline');
 await p.waitForTimeout(300);ok(await p.locator('#rbakes img[src^=blob]').count()>=1,'photos stored in IndexedDB and shown');
 ok((await p.textContent('#rbakes')).includes('26'),'env temp shown in timeline');
 // share collage 1..6
 await p.goto(U+'#/bakes');await p.waitForTimeout(400);
 for(let n=6;n>=1;n--){await p.locator('[data-share]').first().click();
   await p.waitForSelector('#pk .pcell');const cells=p.locator('#pk .pcell');for(let k=5;k>=n;k--){await cells.nth(k).click();await p.waitForTimeout(150)}
   await p.click('#pkok');await p.waitForSelector('.share-preview',{timeout:8000});
   const ls=await p.evaluate(()=>window._lastShare);ok(ls&&ls.photos===n&&ls.layout===n,`share collage with ${n} photo(s)`);
   await p.screenshot({path:`/tmp/shots/share-${n}.png`});await p.click('#closeM');await p.waitForTimeout(200)}
 // import
 await p.click('a[data-tab=discover]');await p.fill('#iurl','https://www.xiachufang.com/recipe/123/');
 await p.fill('#itext','北海道吐司\n高筋面粉 250g\n牛奶：130克\n鸡蛋 1个\n细砂糖 30g\n盐 3g\n黄油 25g\n1. 揉面');await p.click('#iparse');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>location.hash==='#/scan-review'),'text import goes to review screen');
 ok(await p.inputValue('#rn')==='北海道吐司','import name parsed');ok(await p.locator('#ri .ing-row').count()===6,'import 6 ingredients');
 ok(await p.locator('#ri .ing-row.low').count()===1,'egg (by count) highlighted as low confidence');
 ok((await p.textContent('#rlive')).includes('%'),'review shows live hydration');
 await p.click('#rsave');await p.waitForTimeout(300);ok((await p.textContent('main')).includes('xiachufang.com/recipe/123'),'source URL kept');
 // new recipe manual
 await p.goto(U+'#/recipe-edit/new');await p.fill('#fname','测试面包');await p.click('#saveR');await p.waitForTimeout(300);ok((await p.textContent('#title'))==='测试面包','manual recipe created');
 // stats
 await p.click('a[data-tab=stats]');await p.waitForSelector('#chart svg',{timeout:3000}).catch(()=>{});ok(await p.locator('#chart svg').count()===1,'month chart');
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
 const j=JSON.parse(require('fs').readFileSync(path));ok(j.data.recipes.length===3&&Object.keys(j.photos).length===6,'export with 6 photos '+Object.keys(j.photos).length);ok(!JSON.stringify(j).includes('breadnotes.llm'),'AI key not exported');
 await p.click('#clr');await p.waitForTimeout(800);ok((await p.evaluate(()=>Store.S.recipes.length))===0,'cleared');
 await p.click('a[data-tab=me]');await p.setInputFiles('#imp',path);await p.waitForTimeout(1500);
 ok((await p.evaluate(()=>Store.S.recipes.length))===3,'import restored recipes');
 ok((await p.evaluate(async()=>Object.keys(await Store.Photos.all()).length))===6,'import restored photos');
 ok((await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--primary'))).trim()==='#5a8f4e','theme persisted');
 // reload offline
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await ctx.setOffline(true);await p.reload();ok((await p.textContent('#title')).length>0,'offline reload via SW');await ctx.setOffline(false);
 await p.goto(U+'#/bakes');await p.screenshot({path:'/tmp/shots/bakes.png',fullPage:true});
 // duplicate on review
 await p.click('a[data-tab=discover]');await p.fill('#itext','北海道吐司\n高筋面粉 250g\n水 160g');await p.click('#iparse');await p.waitForTimeout(400);
 ok(await p.locator('#dup input[name=dm]').count()===2,'duplicate name detected on review');await p.$eval('#rsave',b=>b.click());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>Store.S.recipes.some(r=>r.name==='北海道吐司 (2)')),'saved as 北海道吐司 (2)');
 // timer
 const rid=await p.evaluate(()=>Store.S.recipes[0].id);await p.goto(U+'#/timer?r='+rid);await p.waitForTimeout(400);
 ok(await p.locator('#tgo').count()===1,'timer page');await p.click('#tgo');await p.waitForTimeout(1300);ok(/\d+:\d\d/.test(await p.textContent('#tleft')),'timer counting '+await p.textContent('#tleft'));await p.click('#treset').catch(()=>{});
 // XHS on desktop → sheet
 await p.goto(U+'#/discover');await p.waitForTimeout(300);await p.fill('#kw','北海道吐司').catch(()=>{});await p.evaluate(()=>BreadXHS.openXHS('北海道吐司'));await p.waitForTimeout(IPHONE?2200:400);
 ok((await p.getAttribute('#xw','href'))==='https://www.xiaohongshu.com/explore',IPHONE?'iPhone XHS → tried app deep link, then fallback sheet':'desktop XHS → fallback sheet with verified web URL');if(IPHONE)ok((await p.getAttribute('#xa','href')||'').startsWith('xhsdiscover://search/result?keyword='),'retry-app button uses xhsdiscover deep link');await p.click('text=取消');
 // AI settings: defaults, no key
 await p.click('a[data-tab=me]');await p.waitForTimeout(300);ok((await p.inputValue('#lb'))==='https://api.0lll0.cn/v1'&&(await p.inputValue('#lm'))==='gpt-5.5'&&(await p.inputValue('#lk'))==='','AI defaults prefilled, key empty');
 // Tesseract OCR end-to-end (CDN)
 if(!process.env.NO_OCR){await p.goto(U+'#/scan');await p.waitForTimeout(300);await p.click('#eng [data-e=ocr]').catch(()=>{});await p.setInputFiles('#sfile','./tests/fixtures/recipe-zh.png');
  try{await p.waitForFunction(()=>location.hash==='#/scan-review'&&document.querySelector('#ri .iname'),null,{timeout:180000});const names=await p.$$eval('#ri .iname',a=>a.map(x=>x.value));const grams=await p.$$eval('#ri .igram',a=>a.map(x=>x.value));
   const want={'高筋面粉':300,'牛奶':160,'鸡蛋':50,'细砂糖':30,'盐':4,'干酵母':4,'黄油':30};let hit=0;for(const [k,v] of Object.entries(want)){const i=names.indexOf(k);if(i>=0&&+grams[i]===v)hit++}
   console.log('OCR result:',JSON.stringify(names.map((n,i)=>n+'='+grams[i])),'name:',await p.inputValue('#rn'));const lowN=await p.locator('#ri .ing-row.low').count();ok(hit>=5,`Tesseract OCR: ${hit}/7 ingredients exactly right after review hints (low-confidence rows: ${lowN})`);await p.screenshot({path:'/tmp/shots/scan-review.png',fullPage:true});
  }catch(e){ok(false,'Tesseract OCR '+e.message)}}
 ok(errs.filter(e=>!/net::|Failed to load resource/.test(e)).length===0,'no JS errors '+JSON.stringify(errs));await b.close();
})();
