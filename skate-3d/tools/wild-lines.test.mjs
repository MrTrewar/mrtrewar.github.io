import test from 'node:test';
import assert from 'node:assert/strict';
import { Run, FIXED_STEP, PHYSICS, TRICKS, RULESET, COURSE_REVISION, readRecords, writeRecord } from '../simulation.mjs';
import { dailyCourse, readProgress, saveProgress, completeChallenges, readGhost, saveGhost, ghostAt } from '../progress.mjs';
import { planJump } from './course-driver.mjs';
const step = (r, n) => { for (let i = 0; i < n; i++) r.tick(FIXED_STEP); };
function empty() { const r = new Run(); r.entities = []; r.support = r.rail = null; r.lastRoute = { at: 1e6, length: 100 }; return r; }
function pad(r, length = 2000, y = 0) { const p = r.addSurface('platform', { at: 0, y, length, width: 8 }); r.support = p.id; r.y = y; return p; }
const storage = () => { const map = new Map(); return { map, getItem: k => map.get(k), setItem: (k,v) => map.set(k,v) }; };

test('normal animations have equal rewards; advanced animations have equal duration and rewards', () => {
  assert.equal(new Set(TRICKS.map(t => t.points)).size, 1);
  const r = new Run(), pro = Array.from({ length: 60 }, () => r.pickTrick(true));
  assert.equal(new Set(pro.map(t => t.points)).size, 1);
  assert.equal(new Set(pro.map(t => t.duration)).size, 1);
  assert.ok(pro[0].points > TRICKS[0].points);
});
test('narrow surfaces share one plane; upper rails have full character clearance', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const r = new Run(seed), wild = r.entities.find(e => e.route === 'wild');
    assert.ok(wild);
    const safe = r.entities.find(e => e.route === 'safe' && Math.abs(e.at + e.length / 2 - wild.at - wild.length / 2) < .001);
    assert.ok(safe); assert.equal(wild.x, 0); assert.equal(safe.x, 0);
    assert.ok(wild.y-safe.y>=3.39);
    assert.ok(wild.at-wild.length/2>safe.at-safe.length/2);
    assert.ok(wild.y-safe.y<PHYSICS.jumpVelocity**2/(2*PHYSICS.gravity));
    for (const e of r.entities) assert.ok(e.width<=1.8);
  }
});
test('course mixes wide gaps, short precision targets and longer rail transfers', () => {
  for(let seed=1;seed<=30;seed++) {
    const r=new Run(seed);r.distance=2400;r.generate();
    const main=r.entities.filter(e=>!e.optional).sort((a,b)=>a.at-b.at);
    for(let i=1;i<main.length;i++) {
      const end=main[i-1].at+main[i-1].length/2;
      const speed=Math.min(PHYSICS.maxSpeed,Math.sqrt(PHYSICS.baseSpeed**2+2*PHYSICS.acceleration*end));
      const gap=main[i].at-main[i].length/2-end;
      assert.ok(gap>=Math.min(5.6+speed*.53,speed*.78)*.94-1e-9);
      assert.ok(gap<=speed*1.02+1e-9);
      if(main[i].motif==='precision')assert.ok(main[i].length<=Math.max(3.6,speed*.40)+1e-9);
      if(main[i].motif==='rail')assert.ok(gap>=speed*.94-1e-9);
    }
  }
});
test('trick actions do not perturb seeded course geometry', () => {
  const a = new Run(322), b = new Run(322);
  for (let i = 0; i < 80; i++) a.pickTrick(i % 2 === 0);
  a.distance = b.distance = 1800; a.generate(); b.generate();
  assert.deepEqual(a.entities, b.entities);
});
test('pending points bank only on a stable platform, not in the air or while grinding', () => {
  const r = empty(); pad(r); r.award(100, 'TEST');
  r.jump(); step(r, 45); assert.equal(r.points, 0); assert.equal(r.pending, 100);
  step(r, 35); assert.equal(r.points, 0); assert.ok(r.pending > 100);
  step(r, 40); assert.ok(r.points > 100); assert.equal(r.pending, 0);
  const rail = empty(); const e = rail.addSurface('rail', { at: 0, width: .22, length: 300 }); rail.land(e);
  step(rail, 200);
  assert.equal(rail.points, 0); assert.ok(rail.pending > 0); assert.ok(rail.rail);
});
test('a crash drops only unbanked combo points', () => {
  const r = empty(); pad(r); r.award(400, 'BANK'); step(r, 45);
  const saved = r.points; r.award(200, 'RISK'); r.support = null; r.entities = []; r.y = -8; r.vy = -10;
  step(r, 20); assert.ok(r.dead); assert.equal(r.points, saved); assert.equal(r.pending, 0); assert.equal(r.lostCombo, 200);
});
test('perfect landings require a recent catch and a centered, controlled approach', () => {
  const r = empty(); pad(r); r.jump(); step(r, 1); const reward=r.activeTrick.points; step(r, 66); r.catch(); step(r, 10);
  assert.equal(r.stats.perfect, 1); assert.equal(r.landingQuality, 'PERFECT'); assert.equal(r.pending, reward + 80);
  const early = empty(); pad(early); early.jump(); step(early, 1); const earlyReward=early.activeTrick.points; step(early, 9); early.catch(); step(early, 70);
  assert.equal(early.stats.perfect, 0); assert.equal(early.pending, earlyReward);
  const edge = empty(); pad(edge,22.4); edge.jump(); step(edge, 67); edge.catch(); step(edge, 10);
  assert.equal(edge.stats.perfect, 0);
});
test('pro tricks can land, but a short aerial loses the pending combo without teleporting', () => {
  const r = empty(); pad(r); r.jump(true); step(r, 80);
  assert.equal(r.stats.risky, 1); assert.equal(r.pending, 220);
  const short = empty(); pad(short); short.award(100, 'OLD'); short.jump(true); step(short, 1);
  short.addSurface('platform', { at: 5, y: 4, width: 8, length: 40 }); step(short, 65);
  assert.equal(short.landingQuality, 'ZU KURZ'); assert.equal(short.pending, 0); assert.equal(short.stats.risky, 0);
  assert.equal(short.y, 4); assert.equal(short.dead, false);
});
test('long grinds self-balance without immobilizing the player or causing an input penalty', () => {
  for (const axis of [-1, 0, 1]) {
    const r=empty();r.land(r.addSurface('rail',{at:0,width:.22,length:500}));
    r.steer(axis);step(r,600);
    assert.equal(r.dead,false);assert.ok(r.rail);assert.ok(Math.abs(r.balance)<.3);
    if(axis)assert.ok(r.x*axis>7);
  }
});
test('both visible routes remain reachable across 100 seeds through maximum speed', () => {
  for (const wild of [false, true]) for (let seed=1;seed<=100;seed++) {
    const r=new Run(seed);let visits=0,last=null;
    for(let i=0;i<5400&&!r.dead;i++) {
      const p=r.entities.find(e=>e.id===r.support);
      if(p) {
        if(p.id!==last&&p.route===(wild?'wild':'safe'))visits++;last=p.id;
        r.steer(-r.x*2);
        if(planJump(r,wild)?.jump)r.jump();
      } else r.steer(-r.x*2);
      r.tick(FIXED_STEP);
    }
    assert.equal(r.dead,false,'seed='+seed+' wild='+wild+' distance='+r.distance);
    assert.equal(r.speed,PHYSICS.maxSpeed);assert.ok(visits>=2);assert.ok(r.stats.rails>=3);
  }
});
test('daily routes agree across time zones and change at UTC midnight', () => {
  const a = dailyCourse(new Date('2026-09-06T23:59:00Z'));
  const b = dailyCourse(new Date('2026-09-07T01:59:00+02:00'));
  assert.deepEqual(a, b); assert.notEqual(a.seed, dailyCourse(new Date('2026-09-07T00:00:00Z')).seed);
});
test('record scopes isolate daily, endless and old rules; storage corruption is safe', () => {
  const s = storage(); writeRecord(s, 'A', { score: 200 }, 'endless'); writeRecord(s, 'B', { score: 500 }, 'daily:2026-09-06');
  assert.equal(readRecords(s)[0].name, 'A'); assert.equal(readRecords(s, 'daily:2026-09-06')[0].name, 'B');
  assert.deepEqual(readRecords(s, 'daily:2026-09-07'), []);
  assert.deepEqual(readRecords({ getItem() { throw Error('blocked'); } }), []);
});
test('cosmetics unlock from run achievements, persist, and do not change physics', () => {
  const s = storage(); const next = completeChallenges(readProgress(s), { rails: 3, perfect: 1, risky: 3 });
  assert.deepEqual(next.unlocked, ['rails', 'risky']); next.selected = 'rails'; saveProgress(s, next);
  assert.deepEqual(readProgress(s), next);
  s.setItem(`jungle-ride:${RULESET}:progress`, JSON.stringify({ unlocked: ['made-up'], selected: 'made-up' }));
  assert.deepEqual(readProgress(s), { unlocked: [], selected: 'default' });
});
test('ghosts interpolate, keep the best score only, expire by day and reject corrupt frames', () => {
  const s = storage(), frames = [[0,0,0,0], [1,9,2,1], [2,20,1,0]];
  assert.equal(saveGhost(s, '2026-09-06', 100, frames), true);
  assert.equal(saveGhost(s, '2026-09-06', 99, frames), false);
  assert.equal(readGhost(s, '2026-09-07'), null);
  const ghost = readGhost(s, '2026-09-06');
  assert.deepEqual(ghostAt(ghost.frames, .5), { cursor: 0, distance: 4.5, x: 1, y: .5 });
  assert.equal(ghostAt(ghost.frames, 3), null);
  s.setItem(`jungle-ride:${RULESET}:${COURSE_REVISION}:ghost`, JSON.stringify({ day: '2026-09-06', score: 100, frames: [[1,2,3,0],[0,3,4,0]] }));
  assert.equal(readGhost(s, '2026-09-06'), null);
});
test('wider daily routes do not replay old geometry or erase existing progress', () => {
  const s=storage(),day='2026-09-06',key=`jungle-ride:${RULESET}:ghost`;
  const old=JSON.stringify({day,score:900,frames:[[0,0,0,0],[1,9,0,1]]});
  s.setItem(key,old);saveProgress(s,{unlocked:['rails'],selected:'rails'});
  writeRecord(s,'OLD',{score:900},`daily:${day}`);
  const daily=dailyCourse(new Date(day+'T12:00:00Z'));
  assert.notEqual(daily.scope,`daily:${day}`);assert.equal(readGhost(s,day),null);
  assert.deepEqual(readRecords(s,daily.scope),[]);
  assert.deepEqual(readProgress(s),{unlocked:['rails'],selected:'rails'});
  assert.equal(s.getItem(key),old);assert.equal(readRecords(s,`daily:${day}`)[0].score,900);
});

test('catch timing allows one attempt per jump, preventing input spam', () => {
  const r = empty(); pad(r); r.jump(); step(r, 10); r.catch();
  for(let i=0;i<70;i++){r.catch();step(r,1);}
  assert.equal(r.stats.perfect,0);
  r.jump();step(r,67);r.catch();step(r,10);assert.equal(r.stats.perfect,1);
});

test('landing clears a stale fall explanation', () => {
  const r=empty();const p=pad(r);r.deathReason='Vorheriger Sturz';r.land(p);
  assert.equal(r.deathReason,'');r.entities=[];r.support=null;r.y=-10;step(r,1);
  assert.match(r.deathReason,/Schlucht/);
});

test('precision routes isolate earlier geometry without deleting saved data',()=>{
  const s=storage(),day='2026-09-08',oldScope='daily:'+day+':big-gaps-2';
  const key='jungle-ride:'+RULESET+':big-gaps-2:ghost';
  const old=JSON.stringify({day,score:1200,frames:[[0,0,0,0],[1,9,0,0]]});
  s.setItem(key,old);writeRecord(s,'OLD SPEED',{score:1200},oldScope);
  writeRecord(s,'ENDLESS',{score:1500});saveProgress(s,{unlocked:['rails'],selected:'rails'});
  const daily=dailyCourse(new Date(day+'T12:00:00Z'));
  assert.equal(COURSE_REVISION,'precision-lines-1');assert.notEqual(daily.scope,oldScope);
  assert.equal(readGhost(s,day),null);assert.deepEqual(readRecords(s,daily.scope),[]);
  saveGhost(s,day,1300,[[0,0,0,0],[1,10,0,0]]);assert.equal(readGhost(s,day).score,1300);
  assert.equal(s.getItem(key),old);assert.equal(readRecords(s,oldScope)[0].score,1200);
  assert.equal(readRecords(s)[0].score,1500);assert.deepEqual(readProgress(s),{unlocked:['rails'],selected:'rails'});
});
