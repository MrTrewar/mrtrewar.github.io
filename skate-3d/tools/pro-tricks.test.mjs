import test from 'node:test';
import assert from 'node:assert/strict';
import { Run, FIXED_STEP, TRICKS, PRO_TRICKS, ALL_TRICKS } from '../simulation.mjs';
import { trickPose } from '../trick-pose.mjs';
const step=(r,n)=>{for(let i=0;i<n;i++)r.tick(FIXED_STEP);};

test('nineteen tricks form a mixed default pool and optional pro-only pool without ollies',()=>{
  assert.equal(TRICKS.length,9);assert.equal(PRO_TRICKS.length,10);
  assert.equal(new Set(ALL_TRICKS.map(t=>t.id)).size,19);
  assert.equal(ALL_TRICKS.some(t=>t.id==='ollie'),false);
  for(const risky of [false,true]){
    const r=new Run(78),pool=risky?PRO_TRICKS:ALL_TRICKS,seen=new Set();let previous;
    for(let i=0;i<200;i++){
      const trick=r.pickTrick(risky);assert.ok(pool.includes(trick));assert.notEqual(trick.id,previous);
      seen.add(trick.id);previous=trick.id;
    }
    assert.equal(seen.size,pool.length);
    assert.equal(new Set(pool.map(t=>t.points)).size,risky?1:2);
  }
});
test('every trick pose stays finite and settles its body and board offsets before landing',()=>{
  for(const trick of ALL_TRICKS){
    for(let i=0;i<=80;i++)assert.ok(Object.values(trickPose(trick,trick.duration*i/80)).every(Number.isFinite),trick.id);
    const end=trickPose(trick,trick.duration+1);
    for(const [key,value]of Object.entries(end)){
      if(['yaw','pitch','roll','boardYaw','boardRoll'].includes(key))assert.ok(Math.abs(Math.sin(value))<1e-8,trick.id+': '+key);
      else assert.ok(Math.abs(value)<1e-8,trick.id+': '+key);
    }
    assert.ok(Math.abs(Math.cos(end.yaw)-(trick.switchStance?-1:1))<1e-8);
  }
});
test('specials have distinct whole-body flips, horizontal flight, wide arms and rocket grabs',()=>{
  const pose=id=>{const t=PRO_TRICKS.find(t=>t.id===id);return trickPose(t,t.duration/2);};
  assert.ok(pose('superman').bodyPitch<-1.4);assert.ok(pose('superman').boardOffsetZ<-1);
  assert.ok(pose('christair').armSpread>1.4);assert.ok(pose('christair').boardOffsetX>.8);
  assert.ok(pose('rocketair').boardPitch<-1.5);assert.ok(pose('rocketair').armReach>1);
  assert.ok(pose('doublebackflip').pitch>6);assert.ok(pose('spin1080').yaw>9);
  assert.ok(pose('mctwist').pitch<-3);
});
test('a completed half-turn special preserves switch stance without changing input physics',()=>{
  const r=new Run(),p=r.entities[0],special=PRO_TRICKS.find(t=>t.id==='spin900');
  r.activeTrick=special;r.jumpTime=special.duration;r.land(p);assert.equal(r.stance,1);
  r.steer(1);step(r,1);assert.ok(r.x>0);
  r.activeTrick=special;r.jumpTime=special.duration;r.land(p);assert.equal(r.stance,0);
  r.activeTrick=special;r.jumpTime=.1;r.land(p);assert.equal(r.stance,0);assert.equal(r.landingQuality,'ZU KURZ');
});
test('all pro tricks can finish on the existing jump arc without extending the jump',()=>{
  for(const trick of PRO_TRICKS){
    const r=new Run();r.entities=[];r.lastRoute={at:1e6,length:100};
    r.land(r.addSurface('platform',{at:0,length:2000}));r.jump(true);step(r,1);r.activeTrick=trick;
    step(r,80);assert.equal(r.dead,false);assert.equal(r.stats.risky,1);assert.equal(r.pending,220);
    assert.equal(r.stance,trick.switchStance?1:0);
  }
});

test('plain jump input lands every trick with its original reward and special credit',()=>{
  const r=new Run(78);r.entities=[];r.lastRoute={at:1e6,length:100};
  r.land(r.addSurface('platform',{at:0,length:20000}));const seen=new Set();let specials=0;
  for(let i=0;i<200;i++){
    r.jump();step(r,1);const trick=r.activeTrick;assert.ok(trick);assert.notEqual(trick.id,'ollie');
    seen.add(trick.id);if(trick.risky)specials++;
    step(r,80);assert.equal(r.activeTrick,null);assert.equal(r.dead,false);
    assert.equal(r.pending,trick.points);assert.equal(r.stats.risky,specials);r.bank();
  }
  assert.equal(seen.size,ALL_TRICKS.length);assert.ok(specials>0);
});
test('switching between mixed and pro-only input never repeats the previous trick',()=>{
  const r=new Run(52);let previous;
  for(let i=0;i<300;i++){
    const pro=i%3===0,trick=r.pickTrick(pro);
    assert.notEqual(trick.id,previous);if(pro)assert.ok(trick.risky);previous=trick.id;
  }
});
test('mixed trick selection remains deterministic for the same seed and input',()=>{
  const a=new Run(91),b=new Run(91);
  for(let i=0;i<100;i++)assert.equal(a.pickTrick(i%4===0).id,b.pickTrick(i%4===0).id);
});
