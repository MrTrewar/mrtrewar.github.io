const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const base = process.env.TEST_URL || 'http://127.0.0.1:4173/skate-3d/';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function virtualClock() {
  let callbacks = [], time = 0;
  Object.defineProperty(performance, 'now', { value: () => time });
  window.requestAnimationFrame = fn => { callbacks.push(fn); return callbacks.length; };
  window.advanceFrames = count => {
    for (let i = 0; i < count; i++) {
      time += 1000 / 60;
      const frame = callbacks; callbacks = []; frame.forEach(fn => fn(time));
    }
  };
}
async function guide(page, name) {
  const canvas=await page.$eval('#world',e=>JSON.stringify(e.getBoundingClientRect()));
  await page.click('#help-toggle');
  assert.equal(await page.$eval('.help-dialog',e=>e.scrollTop),0);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'help-close-top');
  assert.equal(await page.$eval('.help-dialog',e=>e.scrollWidth<=e.clientWidth),true);
  await page.screenshot({path:'/tmp/jungle-side-help-'+name+'.jpg',type:'jpeg',quality:82});
  await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'help-close');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'help-close-top');
  await page.keyboard.press('r');await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(async()=>(await import('./game.js')).inspectGame().state),'intro');
  assert.equal(await page.evaluate(async()=>{
    const {CHALLENGES,readProgress}=await import('./progress.mjs'),p=readProgress(localStorage);
    const cards=[...document.querySelectorAll('#challenges li')];
    return CHALLENGES.every((c,i)=>cards[i].querySelector('strong').textContent===c.name&&cards[i].querySelector('span').textContent===c.label&&cards[i].classList.contains('complete')===p.unlocked.includes(c.id))&&document.querySelectorAll('#deck-options button').length===p.unlocked.length+1;
  }),true);
  const selected=await page.evaluate(()=>{
    const button=document.querySelector('#deck-options button:last-child');button.focus();return button.dataset.deck;
  });
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.deck),selected,'selection retains keyboard focus');
  assert.equal(await page.$eval('#deck-options button[aria-pressed="true"]',e=>e.dataset.deck),selected);
  assert.equal(await page.evaluate(async()=>(await import('./progress.mjs')).readProgress(localStorage).selected),selected);
  assert.equal(await page.$eval('#deck-status',e=>e.textContent.includes(document.querySelector('#deck-options button[aria-pressed="true"]').textContent)),true);
  await page.$eval('#challenges',e=>e.scrollIntoView({block:'start'}));
  await page.screenshot({path:'/tmp/jungle-side-boards-'+name+'.jpg',type:'jpeg',quality:82});
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#help-detail',e=>e.hidden),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'help-toggle');
  await page.click('#help-toggle');assert.equal(await page.$eval('.help-dialog',e=>e.scrollTop),0);
  await page.click('#help-close-top');
  assert.equal(await page.$eval('#world',e=>JSON.stringify(e.getBoundingClientRect())),canvas);
}
async function controller(page) {
  await page.evaluate(async () => {
    const {planJump}=await import('./tools/course-driver.mjs');
    let held = '';
    const press = (code, shiftKey = false) => window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey, bubbles: true }));
    const release = code => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    window.seen = { tricks: [], wild: 0, safe: 0, sparks: 0, precision: 0 }; let last = null;window.countdownSeen ??= [];
    window.rideCourse = (frames, wild = true) => {
      for (let i = 0; i < frames; i++) {
        const r = inspect(); if (r.state !== 'playing') break;
        if(r.levelProgress.phase==='countdown'&&!countdownSeen.includes(r.levelProgress.seconds))countdownSeen.push(r.levelProgress.seconds);
        const support = r.surfaces.find(e => e.id === r.support);
        let error = -r.x;
        if (support) {
          if (last !== support.id && support.route) seen[support.route]++;
          if(last!==support.id&&support.motif==='precision')seen.precision++;
          last = support.id;
          if (planJump(r,wild)?.jump) {
            press('Space'); release('Space');
          }
        } else if (!r.catchBuffer && r.vy < 0) {
          const targets = r.surfaces.filter(e => e.y < r.y && Math.abs(r.distance + r.x - e.at) < e.length / 2).sort((a,b) => b.y-a.y);
          if (targets[0]) {
            const remaining = (r.vy + Math.sqrt(r.vy * r.vy + 48 * (r.y-targets[0].y))) / 24;
            if (remaining < .1) { press('KeyE'); release('KeyE'); }
          }
        }
        const threshold = .13;
        const nextKey = error > threshold ? 'KeyD' : error < -threshold ? 'KeyA' : '';
        if (held !== nextKey) { if (held) release(held); if (nextKey) press(nextKey); held = nextKey; }
        if (r.trick && !seen.tricks.includes(r.trick)) seen.tricks.push(r.trick);
        seen.sparks = Math.max(seen.sparks, r.particles);
        advanceFrames(1);
      }
    };
  });
}
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: chrome, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
  const errors = [], checks = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(virtualClock);
    await page.goto(base + '?v=clear-guide-1', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#start:not([disabled])', { timeout: 30000 });
    await page.evaluate(async () => { window.inspect = (await import('./game.js')).inspectGame; advanceFrames(20); });
    const shot = name => page.screenshot({ path: `/tmp/jungle-side-${name}.jpg`, type: 'jpeg', quality: 78 });
    const inspect = () => page.evaluate(() => window.inspect());
    assert.equal((await inspect()).cameraType, 'OrthographicCamera'); assert.equal((await inspect()).bones, 13);
    await shot('intro');
    await guide(page,'desktop');
    assert.equal(await page.$$eval('#deck-options button',e=>e.length),1);
    checks.push('current help and board requirements','scroll starts at top','dialog keyboard focus trap','board selection keeps focus','help never shifts canvas');
    await page.click('#start');
    await page.evaluate(()=>advanceFrames(1));
    const startView=await inspect();assert.ok(Math.abs(startView.viewWidth-33.6)<1e-8,JSON.stringify(startView));assert.ok(startView.lookAhead>21.7);assert.ok(startView.riderScreenX>.34&&startView.riderScreenX<.36);
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.vignette')).opacity)<.2,{polling:50});
    await page.keyboard.down('ArrowLeft');await page.evaluate(()=>advanceFrames(66));await page.keyboard.up('ArrowLeft');
    const left=await inspect();assert.equal(left.x,-8);assert.equal(left.vx,0);assert.equal(left.state,'playing');
    assert.ok(left.riderScreenX>=.1&&left.riderScreenX<=.91);await shot('free-left');
    await page.evaluate(()=>advanceFrames(12));assert.equal((await inspect()).x,left.x);
    await page.keyboard.down('ArrowRight');await page.keyboard.press('Space');await page.evaluate(()=>advanceFrames(48));await page.keyboard.up('ArrowRight');
    const right=await inspect();assert.ok(right.x>-3);assert.equal(right.support,null);
    assert.ok(right.riderScreenX>left.riderScreenX+.1&&right.riderScreenX<.91);await shot('free-air');
    await page.keyboard.press('p');await page.click('#pause-menu');
    checks.push('expanded left/right range','free midair movement','camera does not cancel player motion','release without recentering');
    await page.click('#help-toggle'); await page.keyboard.press('Escape'); assert.equal(await page.$eval('#help-detail', e => e.hidden), true);
    await page.click('#start'); await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.vignette')).opacity)<.2,{polling:50}); await page.evaluate(() => advanceFrames(15));
    await page.keyboard.down('d'); await page.evaluate(() => advanceFrames(10)); await page.keyboard.up('d');
    assert.ok((await inspect()).x > .1); await page.evaluate(() => advanceFrames(25));
    await shot('playing');
    await page.keyboard.press('Space'); await page.evaluate(() => advanceFrames(20));
    assert.ok((await inspect()).bodyLift > .01); await shot('trick');
    await page.keyboard.press('p'); const paused = await inspect(); await page.evaluate(() => advanceFrames(40));
    assert.equal((await inspect()).distance, paused.distance); await page.keyboard.press('p');
    // Advance precisely into the crash, before the leaderboard can cover its effect.
    await page.evaluate(() => { for (let i=0;i<500&&inspect().state==='playing';i++)advanceFrames(1); advanceFrames(10); });
    const crash = await inspect(); assert.equal(crash.state, 'crashing'); assert.ok(crash.particles > 30);
    assert.equal(crash.riderVisible, false); assert.equal(await page.$eval('#end', e => e.hidden), true);
    await shot('explosion');
    const frozenCrash=await inspect();await page.evaluate(()=>advanceFrames(46));
    const chain=await inspect();assert.equal(chain.state,'crashing');assert.ok(chain.explosionBursts>=5);assert.ok(chain.visibleBursts>=3);assert.ok(chain.particles<=260);
    assert.equal(chain.distance,frozenCrash.distance);assert.equal(chain.score,frozenCrash.score);assert.equal(await page.$eval('#end',e=>e.hidden),true);
    await shot('chain-explosion');await page.evaluate(()=>advanceFrames(110));assert.equal((await inspect()).explosionBursts,7);
    checks.push('seven timed explosions','score frozen throughout crash sequence');
    assert.equal((await inspect()).state, 'over'); const frozen = await inspect();
    await page.click('#open-entry'); await page.type('#name', 'River'); await page.keyboard.press('r');
    assert.equal((await inspect()).state, 'over'); assert.equal((await inspect()).distance, frozen.distance);
    await page.keyboard.press('Enter');
    const recorded = await page.evaluate(async () => (await import('./simulation.mjs')).readRecords(localStorage)[0]);
    assert.equal(recorded.name, 'Riverr'); assert.equal(recorded.score, await page.$eval('#final-score', e => Number(e.textContent)));
    await shot('leaderboard'); checks.push('side camera', '13-bone avatar', 'position controls', 'body/board animation', 'pause', 'visible explosion before leaderboard', 'R safe during name entry', 'exact score');
    await page.click('#back-menu'); await page.click('[data-mode="daily"]'); await page.click('#start');
    const naive=await page.evaluate(()=>{
      let target=null;
      for(let i=0;i<2400&&inspect().state==='playing';i++){
        const r=inspect(),p=r.surfaces.find(e=>e.id===r.support);
        if(p&&p.at+p.length/2-r.distance-r.x<r.speed*.08+.2){
          target=r.surfaces.filter(e=>!e.optional&&e.at-e.length/2>=p.at+p.length/2-.01).sort((a,b)=>a.at-b.at)[0];
          window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));
        }
        advanceFrames(1);const after=inspect();
        if(target?.motif==='precision'&&r.y>=target.y&&after.y<target.y&&after.distance+after.x>target.at+target.length/2)return {overshot:true,state:after.state};
      }
      return {overshot:false,state:inspect().state};
    });
    assert.equal(naive.overshot,true);await shot('precision-overshoot');await page.evaluate(()=>advanceFrames(200));assert.equal((await inspect()).state,'over');
    checks.push('edge-only keyboard strategy physically overshoots and crashes');
    await page.click('#retry');await controller(page);
    for(let i=0;i<12;i++)await page.evaluate(()=>rideCourse(30));
    await shot('route');
    // Use a rail with enough remaining length for both directions, not one already ending.
    await page.evaluate(()=>{for(let i=0;i<2400&&inspect().state==='playing';i++){
      const r=inspect(),p=r.surfaces.find(e=>e.id===r.rail);
      if(p&&p.at+p.length/2-r.distance-r.x>r.speed*.8+3&&r.particles>0)break;
      rideCourse(1);
    }});
    assert.ok((await inspect()).rail);assert.ok((await inspect()).particles>0);await shot('grind');
    const grindStart=await inspect();
    await page.keyboard.down('ArrowRight');await page.evaluate(()=>advanceFrames(12));await page.keyboard.up('ArrowRight');
    const grindRight=await inspect();assert.equal(grindRight.rail,grindStart.rail);assert.ok(grindRight.x-grindStart.x>1.5);assert.ok(grindRight.riderScreenX>grindStart.riderScreenX+.03);
    await page.keyboard.down('ArrowLeft');await page.evaluate(()=>advanceFrames(12));await page.keyboard.up('ArrowLeft');
    const grindLeft=await inspect();assert.equal(grindLeft.rail,grindStart.rail);assert.ok(grindRight.x-grindLeft.x>1.5);assert.ok(grindLeft.riderScreenX<grindRight.riderScreenX-.03);
    await page.evaluate(()=>advanceFrames(1));assert.equal((await inspect()).vx,0);assert.ok((await inspect()).particles>0);await shot('free-grind');
    checks.push('actual left/right movement while grinding','instant rail direction reversal','release stops rail movement');
    await controller(page);
    const levelSeen=new Map(),levelShots=new Set(),specialShots=new Set();let countdownChecked=false,precisionShot=false;
    const specials=['spin900','spin1080','mctwist','backflip','doublebackflip','superman','christair','rocketair','rodeo900','triplevarial'];
    for(let i=0;i<180;i++){
      await page.evaluate(()=>rideCourse(30));const r=await inspect();assert.equal(r.state,'playing');
      if(!levelSeen.has(r.level))levelSeen.set(r.level,r.time);
      assert.deepEqual(r.precisionSurfaces.sort((a,b)=>a-b),r.surfaces.filter(e=>e.motif==='precision').map(e=>e.id).sort((a,b)=>a-b));
      if(!precisionShot&&await page.$eval('#coach',e=>!e.hidden&&e.textContent.includes('KURZES ZIEL'))){await shot('precision-approach');precisionShot=true;}
      if(r.levelProgress.phase==='countdown'&&!countdownChecked){
        await page.keyboard.press('p');const frozen=await inspect();
        assert.equal(await page.$eval('#level-progress',e=>e.dataset.phase),'countdown');
        const seconds=await page.$eval('#level-countdown',e=>Number(e.textContent));assert.equal(seconds,frozen.levelProgress.seconds);
        await page.evaluate(()=>advanceFrames(240));assert.deepEqual((await inspect()).levelProgress,frozen.levelProgress);assert.equal((await inspect()).level,frozen.level);
        await page.keyboard.press('p');await shot('level-countdown');countdownChecked=true;
      }
      if(specials.includes(r.trick)&&r.jumpTime>.18&&r.jumpTime<.75&&!specialShots.has(r.trick)){await shot('special-'+r.trick);specialShots.add(r.trick);}
      assert.equal(r.environment.visibleWorlds,1);assert.deepEqual(r.surfaceThemes,[r.level]);
      if(r.level!==1){assert.deepEqual(r.runwaySurfaces,[]);assert.deepEqual(r.environment.runwayPulse,[]);}
      if(r.level>0&&r.time-levelSeen.get(r.level)>1.8&&!levelShots.has(r.level)) {
        assert.ok(r.score>=r.levelThresholds[r.level]);await shot(r.environment.id+'-level');levelShots.add(r.level);
        if(r.level===1){
          assert.ok(r.environment.neonSigns>=20);assert.ok(r.runwaySurfaces.some(e=>e.type==='rail'));assert.ok(r.runwaySurfaces.some(e=>e.type==='platform'));
          assert.ok(r.runwaySurfaces.every(e=>e.count>=4&&e.endpoints===4));
          assert.equal(r.environment.runwayPulse.length,4);assert.ok(r.environment.runwayPulse.every(v=>v>=.45&&v<=1));
          await shot('city-runway');
          await page.keyboard.press('p');const lights=(await inspect()).environment.runwayPulse;await page.evaluate(()=>advanceFrames(36));
          assert.deepEqual((await inspect()).environment.runwayPulse,lights);await page.keyboard.press('p');
          await page.evaluate(()=>rideCourse(18));assert.notDeepEqual((await inspect()).environment.runwayPulse,lights);
          await shot('city-runway-pulse');checks.push('red runway lamps on rails and platforms','runway pulse freezes during pause');
        }
        if(r.level===2)assert.ok(r.environment.pyramids>=5&&r.environment.pharaohs>=5);
      }
      if(i>=60&&levelShots.has(1)&&levelShots.has(2)&&specialShots.size>=3)break;
    }
    assert.ok(countdownChecked);assert.ok(await page.evaluate(()=>[1,2,3].every(n=>countdownSeen.includes(n))));checks.push('visible three-two-one level countdown','pause freezes pending level switch');
    assert.ok(specialShots.size>=3);assert.equal(await page.evaluate(()=>seen.tricks.includes('ollie')),false);
    checks.push('multiple animated pro specials using Space alone','no plain ollie in default jumps');
    assert.ok(levelShots.has(1)&&levelShots.has(2));checks.push('score unlocks city and egypt','neon signs and pharaoh scenery','surface reskin preserves collision route');
    const later=await inspect();console.log('Run',JSON.stringify({distance:later.distance,state:later.state,stats:later.stats,calls:later.renderCalls}));
    assert.equal(later.levelProgress.phase,'endless');assert.equal(await page.$eval('#level-countdown',e=>e.textContent),'MAX');
    assert.ok(later.viewWidth>74.3);assert.ok(later.lookAhead>48);checks.push('30 percent more forward view at top speed');
    assert.equal(later.state,'playing');assert.equal(later.speed,36);assert.equal(await page.$eval('#speed',e=>Number(e.textContent)),130);
    assert.ok(later.stats.rails>=3);assert.ok(later.stats.perfect>=3);assert.ok(later.stats.risky>=1);assert.ok(later.stats.banks>0);
    assert.ok(await page.evaluate(()=>seen.tricks.length>=4&&seen.wild>=2&&seen.sparks>5&&seen.precision>=2));checks.push('variable timing lands short precision platforms','precision target markings match collision surfaces');
    await shot('ruins');const seed=later.seed;
    await page.keyboard.down('d');await page.evaluate(()=>advanceFrames(900));await page.keyboard.up('d');assert.equal((await inspect()).state,'over');
    await page.click('#retry');await page.evaluate(()=>advanceFrames(20));assert.deepEqual((await inspect()).runwaySurfaces,[]);assert.equal((await inspect()).level,0);assert.equal((await inspect()).explosionBursts,0);assert.equal((await inspect()).levelProgress.phase,'points');assert.equal((await inspect()).levelProgress.seconds,0);assert.equal((await inspect()).seed,seed);assert.ok((await inspect()).ghostFrames>10);assert.equal((await inspect()).ghostVisible,true);
    checks.push('upper route keyboard traversal','accelerates to 130 km/h','random tricks','grind sparks','perfect landings','combo banking','daily ghost');
    await page.keyboard.press('p');await page.click('#pause-menu');await guide(page,'unlocked');
    const selectedDeck=await page.$eval('#deck-options button[aria-pressed="true"]',e=>e.dataset.deck);
    assert.notEqual(selectedDeck,'default');
    await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('#start:not([disabled])');
    assert.equal(await page.$eval('#deck-options button[aria-pressed="true"]',e=>e.dataset.deck),selectedDeck);
    checks.push('earned boards persist and remain selected after reload');
    for(const [width,height] of [[390,844],[844,390],[320,568]]) {
      const phone=await browser.newPage();phone.on('pageerror',e=>errors.push(e.message));
      await phone.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true});await phone.evaluateOnNewDocument(virtualClock);
      await phone.goto(base,{waitUntil:'networkidle0'});await phone.waitForSelector('#start:not([disabled])');await phone.evaluate(()=>advanceFrames(10));
      assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const startBounds=await phone.$eval('#start',e=>{const r=e.getBoundingClientRect();return [r.top,r.bottom,innerHeight];});assert.ok(startBounds[0]>=0&&startBounds[1]<startBounds[2]);
      await phone.screenshot({path:`/tmp/jungle-side-mobile-${width}-intro.jpg`,type:'jpeg',quality:78});
      await guide(phone,'mobile-'+width);
      await phone.tap('#start');await phone.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.vignette')).opacity)<.2,{polling:50});
      const leftButton=await phone.$eval('[data-action="left"]',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
      await phone.touchscreen.touchStart(leftButton.x,leftButton.y);await phone.evaluate(()=>advanceFrames(66));await phone.touchscreen.touchEnd();
      const mobilePosition=await phone.evaluate(async()=>{advanceFrames(12);return (await import('./game.js')).inspectGame();});
      assert.equal(mobilePosition.x,-8);assert.equal(mobilePosition.vx,0);assert.ok(mobilePosition.riderScreenX>=.1&&mobilePosition.riderScreenX<=.91);
      await phone.tap('[data-action="jump"]');await phone.evaluate(()=>advanceFrames(15));
      const progressBounds=await phone.$eval('#level-progress',e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.top,r.bottom,innerWidth,innerHeight];});
      assert.ok(progressBounds[0]>=0&&progressBounds[1]<=progressBounds[4]&&progressBounds[2]>=0&&progressBounds[3]<=progressBounds[5]);
      assert.equal(await phone.evaluate(()=>{
        const p=document.querySelector('#level-progress').getBoundingClientRect();
        return [...document.querySelectorAll('#touch-controls button'),document.querySelector('#coach')].every(e=>{
          if(e.hidden)return true;const b=e.getBoundingClientRect();return p.right<=b.left||p.left>=b.right||p.bottom<=b.top||p.top>=b.bottom;
        });
      }),true,'countdown must not overlap touch controls or coaching');
      const touchTrick=await phone.evaluate(async()=>(await import('./game.js')).inspectGame().trick);
      assert.ok(touchTrick);assert.notEqual(touchTrick,'ollie');
      assert.equal(await phone.$eval('#touch-controls',e=>getComputedStyle(e).display),'flex');
      const bounds=await phone.$eval('#touch-controls',e=>{const a=e.querySelector('.steer-controls').getBoundingClientRect(),b=e.querySelector('.trick-controls').getBoundingClientRect();return [a.right,b.left,b.right,innerWidth];});assert.ok(bounds[0]<=bounds[1]&&bounds[2]<=bounds[3]);
      await phone.screenshot({path:`/tmp/jungle-side-mobile-${width}.jpg`,type:'jpeg',quality:78});
      if(width===390){
        await phone.evaluate(async()=>{window.inspect=(await import('./game.js')).inspectGame;});await controller(phone);
        await phone.evaluate(()=>{for(let i=0;i<120&&inspect().level!==1&&inspect().state==='playing';i++)rideCourse(30);});
        const city=await phone.evaluate(()=>inspect());assert.equal(city.state,'playing');assert.equal(city.level,1);assert.ok(city.runwaySurfaces.length>0);
        assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await phone.screenshot({path:'/tmp/jungle-side-city-runway-mobile.jpg',type:'jpeg',quality:82});
        checks.push('city runway lights on mobile at speed');
      }
      await phone.close();
    }
    const reduced=await browser.newPage();await reduced.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await reduced.evaluateOnNewDocument(virtualClock);
    await reduced.evaluateOnNewDocument(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked');}}));
    await reduced.goto(base,{waitUntil:'networkidle0'});await reduced.waitForSelector('#start:not([disabled])');await reduced.click('#start');await reduced.evaluate(()=>advanceFrames(240));
    assert.equal(await reduced.$eval('#error',e=>e.hidden),true);
    await reduced.evaluate(()=>advanceFrames(120));
    const calm=await reduced.evaluate(async()=> (await import('./game.js')).inspectGame());
    assert.equal(calm.explosionBursts,3);assert.equal(calm.shockwaveVisible,false);
    const effectLifecycle=await reduced.evaluate(async()=>{
      const THREE=await import('three'),{PixelEffects}=await import('./pixel-effects.mjs');
      const fx=new PixelEffects(new THREE.Scene());fx.crash(0,0);fx.update(.7,{speed:0},false);
      const age=fx.crashAge,count=fx.burstCount;fx.update(1,{speed:0},false,true);
      const paused=fx.crashAge===age&&fx.burstCount===count;
      fx.reset();fx.update(2,{speed:0},false);return {paused,bursts:fx.burstCount,particles:fx.activeCount};
    });assert.deepEqual(effectLifecycle,{paused:true,bursts:0,particles:0});
    const steadyLamps=await reduced.evaluate(async()=>{
      const THREE=await import('three'),{WorldScene}=await import('./world-scene.mjs');
      const world=new WorldScene(new THREE.Scene(),{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});world.setLevel(1);
      world.update(400,2,1);const before=world.diagnostics.runwayPulse;world.update(500,10,1);
      const entity={id:1,type:'rail',length:24,width:.18},beforeEntity=JSON.stringify(entity),mesh=world.surface(entity);
      let pointLights=0,transparent=0;
      mesh.traverse(o=>{if(o.isPointLight)pointLights++;if(o.material?.transparent){transparent++;assertDepth(o);}});
      function assertDepth(o){if(!o.material.depthTest||o.material.depthWrite)throw Error('Invalid halo depth settings');}
      return {before,after:world.diagnostics.runwayPulse,reduced:world.diagnostics.runwayReducedMotion,markers:mesh.userData.runwayLights,pointLights,transparent,unchanged:beforeEntity===JSON.stringify(entity)};
    });
    assert.deepEqual(steadyLamps.before,[.82,.82,.82,.82]);assert.deepEqual(steadyLamps.after,steadyLamps.before);assert.equal(steadyLamps.reduced,true);
    assert.equal(steadyLamps.pointLights,0);assert.ok(steadyLamps.transparent>0);assert.ok(steadyLamps.markers.count>4);assert.equal(steadyLamps.unchanged,true);
    checks.push('reduced-motion runway lights stay steady','depth-tested pixel halos without point lights','reduced-motion crash','pause and reset cancel pending blasts');
    checks.push('mobile portrait / landscape / small screen','touch controls','reduced motion and blocked storage');assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',checks},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
