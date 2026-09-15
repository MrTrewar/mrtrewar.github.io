const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const root = new URL(process.env.HOMEPAGE_URL || 'http://127.0.0.1:4173/');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({headless:true,executablePath:chrome,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const errors=[];
  try {
    for (const [width,height] of [[1440,900],[390,844],[844,390],[320,568]]) {
      const page=await browser.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
      const entry=new URL('?entry=homepage#preview',root);
      await page.goto(entry.href,{waitUntil:'networkidle0'});
      await page.waitForSelector('#start:not([disabled])',{timeout:30000});
      const loaded=new URL(page.url());
      assert.equal(loaded.pathname,new URL('skate-3d/',root).pathname);
      assert.equal(loaded.search,entry.search);assert.equal(loaded.hash,entry.hash);
      assert.equal(await page.$eval('#error',e=>e.hidden),true);
      assert.equal(await page.$('#game-area'),null);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.$eval('.extras',e=>[...e.querySelectorAll('a,button')].every(link=>{
        const r=link.getBoundingClientRect(),footer=document.querySelector('.footer');
        const clearFooter=!footer||getComputedStyle(footer).display==='none'||r.bottom<=footer.getBoundingClientRect().top;
        return clearFooter&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
      })),true,'navigation must remain visible at '+width+'px');
      const links=await page.$$eval('.extras a',list=>list.map(a=>a.href));
      for(const path of ['game.html','gym-tracker/','board.html'])assert.ok(links.includes(new URL(path,root).href));
      await page.screenshot({path:'/tmp/jungle-home-'+width+'.jpg',type:'jpeg',quality:82});
      // Suppress navigation only, so the real game input handler still receives Enter.
      await page.focus('.extras a');
      await page.evaluate(()=>window.addEventListener('keydown',e=>e.preventDefault(),{once:true}));
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(async()=>(await import('./game.js')).inspectGame().state),'intro');
      await page.click('#start');assert.equal(await page.$eval('#intro',e=>e.hidden),true);
      await page.close();
    }
    const fallback=await browser.newPage();await fallback.setJavaScriptEnabled(false);
    await fallback.goto(root.href,{waitUntil:'networkidle0'});
    await fallback.waitForSelector('#world');
    assert.equal(new URL(fallback.url()).pathname,new URL('skate-3d/',root).pathname);
    await fallback.goto(new URL('game.html',root).href,{waitUntil:'networkidle0'});
    assert.equal(new URL(fallback.url()).pathname,new URL('game.html',root).pathname);
    assert.ok(await fallback.$('#game-area'));
    assert.deepEqual(errors,[]);
    console.log('PASS: homepage -> 3D, query/hash preserved, 4 screen sizes, project links, native keyboard navigation, no-JS redirect and preserved 2D page.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
