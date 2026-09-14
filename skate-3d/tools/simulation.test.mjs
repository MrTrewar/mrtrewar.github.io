import test from 'node:test';
import assert from 'node:assert/strict';
import { Run, FIXED_STEP, PHYSICS, steeringScale, TRICKS, ALL_TRICKS, readRecords, writeRecord, RECORDS_KEY } from '../simulation.mjs';
import { trickPose } from '../trick-pose.mjs';
import { planJump } from './course-driver.mjs';

function emptyRun(events=[]) {
  const run=new Run(10,event=>events.push(event));
  run.entities=[];run.support=run.rail=null;
  run.lastRoute={at:100000,length:100,x:0,y:0};
  return run;
}
function pad(run,width=8,length=2000,y=0){const p=run.addSurface('platform',{at:0,x:0,y,width,length});run.support=p.id;run.y=y;return p;}
function step(run,frames){for(let i=0;i<frames;i++)run.tick(FIXED_STEP);}

test('a platform supports the rider but the end drops into a real gap',()=>{
  const events=[],run=emptyRun(events);pad(run,6,4);step(run,10);
  assert.equal(run.y,0);assert.ok(run.support);
  step(run,25);assert.equal(run.support,null);assert.ok(run.y<0);
  step(run,150);assert.equal(run.dead,true);assert.ok(run.y<PHYSICS.deathY);
  assert.equal(events.filter(e=>e.type==='crash').length,1);
  const score=run.score;step(run,60);assert.equal(run.score,score);
});
test('free steering has intermediate positions and releases without lane snapping',()=>{
  const run=emptyRun();pad(run,100);
  run.steer(.4);step(run,15);assert.ok(run.x>.1&&run.x<1);
  run.steer(0);step(run,50);assert.ok(Math.abs(run.vx)<.001);
  const x=run.x;step(run,50);assert.ok(Math.abs(run.x-x)<.001);
});
test('moving past a platform end causes a fall, with no invisible road',()=>{
  const run=emptyRun();pad(run,2,4);run.steer(1);step(run,160);
  assert.equal(run.dead,true);assert.ok(run.x>1);assert.ok(run.y<PHYSICS.deathY);
});
test('steering reaches both expanded limits and reverses immediately at the boundary',()=>{
  for (const axis of [-1, 1]) {
    const run=emptyRun();pad(run);run.steer(axis);step(run,120);
    const limit=axis<0?PHYSICS.minOffset:PHYSICS.maxOffset;
    assert.equal(run.x,limit);assert.equal(run.vx,0);assert.ok(Math.abs(limit)>3);
    run.steer(0);step(run,6);assert.equal(run.x,limit);
    run.steer(-axis);step(run,1);assert.ok((run.x-limit)*axis<0);
  }
});
test('air steering crosses the old boundary and allows a quick midair reversal',()=>{
  for (const axis of [-1, 1]) {
    const run=emptyRun();pad(run);run.jump();run.steer(axis);step(run,30);
    assert.equal(run.support,null);assert.ok(run.x*axis>3.5);
    const x=run.x;run.steer(-axis);step(run,12);
    assert.equal(run.support,null);assert.ok(run.vx*axis<0);assert.ok((run.x-x)*axis<0);
  }
});
test('releasing movement brakes without drifting or snapping back to the center',()=>{
  const run=emptyRun();pad(run);run.steer(1);step(run,25);
  const x=run.x;run.steer(0);step(run,30);
  assert.ok(run.x-x<.45);assert.ok(Math.abs(run.vx)<.001);
  const stopped=run.x;step(run,60);assert.ok(Math.abs(run.x-stopped)<.001);
});
test('movement responds in the very first tick on ground, in the air and on rails',()=>{
  for(const type of ['platform','air','rail']) {
    const run=emptyRun();
    if(type==='air'){run.y=4;run.vy=1;}
    else run.land(run.addSurface(type,{at:0,length:500}));
    run.steer(1);step(run,1);assert.equal(run.vx,PHYSICS.steerSpeed);assert.ok(run.x>0);
    const x=run.x;run.steer(-1);step(run,1);assert.equal(run.vx,-PHYSICS.steerSpeed);assert.ok(run.x<x);
    const stopped=run.x;run.steer(0);step(run,1);assert.equal(run.vx,0);assert.equal(run.x,stopped);
  }
});
test('landing on a rail preserves held movement instead of setting velocity to zero',()=>{
  const run=emptyRun();const rail=run.addSurface('rail',{at:0,length:500});
  run.y=.02;run.vy=-2;run.steer(1);step(run,1);
  assert.equal(run.rail,rail.id);assert.equal(run.vx,PHYSICS.steerSpeed);
  const x=run.x;step(run,24);assert.ok(run.x-x>3.5);assert.equal(run.rail,rail.id);
});
test('steering off either rail end releases support in the same tick',()=>{
  for(const axis of [-1,1]) {
    const events=[],run=emptyRun(events),rail=run.addSurface('rail',{at:0,length:10});
    run.land(rail);run.x=axis*(rail.length/2+.119);run.steer(axis);step(run,1);
    assert.equal(run.rail,null);assert.equal(run.support,null);assert.ok(run.vy<0);
    assert.equal(events.filter(e=>e.type==='rail-end').length,1);
  }
});
test('high-speed steering retains screen-space responsiveness and reachable boundaries',()=>{
  for(const axis of [-1,1]) {
    const run=emptyRun();pad(run);run.time=30;run.steer(axis);step(run,120);
    const limit=(axis<0?PHYSICS.minOffset:PHYSICS.maxOffset)*steeringScale(PHYSICS.maxSpeed);
    assert.equal(run.x,limit);assert.equal(run.vx,0);
    run.steer(-axis);step(run,1);assert.ok((run.x-limit)*axis<0);
  }
});
test('jump input after an edge works only during coyote time',()=>{
  const run=emptyRun();pad(run,6,4);
  while(run.support!==null)step(run,1);
  run.jump();step(run,1);assert.ok(run.vy>0);assert.ok(run.activeTrick);
  step(run,20);const vy=run.vy;run.jump();step(run,1);assert.ok(run.vy<vy);
});
test('jump input shortly before landing is buffered',()=>{
  const run=emptyRun();pad(run);run.jump();step(run,69);assert.ok(run.y>0);
  run.jump();step(run,10);assert.ok(run.y>0);assert.ok(run.vy>0);
});
test('a thin elevated rail catches a fast downward crossing',()=>{
  const run=emptyRun();run.addSurface('rail',{at:0,x:0,y:1,width:.22,length:40});
  run.y=3;run.vy=-120;step(run,1);
  assert.equal(run.y,1);assert.ok(run.rail);assert.equal(run.support,run.rail);
});
test('rails award grind points, allow jumping, and cannot hold a rider beyond the end',()=>{
  const events=[],run=emptyRun(events);run.addSurface('rail',{at:0,x:0,y:1,width:.22,length:10});
  run.y=1.1;run.vy=-3;step(run,3);assert.ok(run.rail);
  const points=run.pending;step(run,10);assert.ok(run.pending>points);assert.equal(run.points,0);
  run.jump();step(run,1);assert.equal(run.rail,null);assert.ok(run.vy>0);
  step(run,150);assert.equal(run.dead,true);
  assert.ok(events.some(e=>e.type==='grind'));
});
test('surfaces cannot teleport a rider up from underneath',()=>{
  const run=emptyRun();run.addSurface('platform',{at:0,y:2,width:10,length:100});
  run.y=0;run.vy=1;step(run,120);assert.equal(run.dead,true);assert.equal(run.support,null);
});
test('a successful landing awards the selected trick, a fall awards no trick',()=>{
  const events=[],run=emptyRun(events);pad(run);run.jump();step(run,1);
  const trick=run.activeTrick;assert.equal(run.points,0);
  step(run,85);assert.equal(run.pending,trick.points);assert.equal(run.points,0);assert.equal(run.activeTrick,null);
  step(run,40);assert.equal(run.pending,0);assert.equal(run.points,trick.points);
  assert.ok(events.some(e=>e.type==='score'&&e.label===trick.label));
  const fall=emptyRun();pad(fall,6,4);fall.jump();step(fall,180);
  assert.equal(fall.dead,true);assert.equal(fall.points,0);
});
test('speed and actual distance per second rise noticeably, then cap',()=>{
  const run=emptyRun();pad(run,8,10000);step(run,600);
  const distance=run.distance;assert.ok(Math.abs(run.speed-23.5)<.001);
  step(run,600);assert.ok(run.distance-distance>distance*1.2);
  step(run,6000);assert.equal(run.speed,PHYSICS.maxSpeed);
});
test('default jumps vary across every normal and special trick without consecutive repeats',()=>{
  const run=emptyRun();pad(run,8,20000);const seen=new Set();let previous=null;
  for(let i=0;i<200;i++){
    run.jump();step(run,1);assert.notEqual(run.activeTrick.id,previous);
    previous=run.activeTrick.id;seen.add(previous);step(run,80);
  }
  assert.equal(seen.size,ALL_TRICKS.length);assert.equal(seen.has('ollie'),false);
});
test('360s rotate the common rider/board parent, flips also animate the body',()=>{
  for(const trick of TRICKS){
    const middle=trickPose(trick,trick.duration/2);
    assert.ok(middle.tuck>0);assert.ok(middle.bodyLift>0);assert.notEqual(middle.armSpread,0);
    const end=trickPose(trick,trick.duration);
    assert.ok(Math.abs(Math.sin(end.yaw))<1e-6);assert.ok(Math.abs(Math.sin(end.boardRoll))<1e-6);
    assert.ok(end.tuck<1e-6);assert.ok(end.bodyLift<1e-6);
  }
  const spin=TRICKS.find(t=>t.id==='frontside360');
  assert.ok(Math.abs(trickPose(spin,spin.duration/2).yaw-Math.PI)<1e-6);
});
test('combo caps at eight and banks after stable rolling',()=>{
  const run=emptyRun();pad(run);for(let i=0;i<15;i++)run.award(10,'TEST');
  assert.equal(run.multiplier,8);step(run,250);assert.equal(run.multiplier,1);assert.equal(run.bestCombo,8);
});
test('generated jungle routes remain jumpable at increasing speeds across 30 seeds',()=>{
  for(let seed=1;seed<=30;seed++){
    const run=new Run(seed);let grinds=0;
    run.onEvent=e=>{if(e.type==='grind')grinds++;};
    for(let i=0;i<4500&&!run.dead;i++){
      if(planJump(run)?.jump)run.jump();
      run.steer(-run.x*2);
      run.tick(FIXED_STEP);
    }
    assert.equal(run.dead,false,`seed ${seed} died at ${run.distance.toFixed(1)} m`);
    assert.ok(grinds>=3);assert.equal(run.speed,PHYSICS.maxSpeed);
    const route=run.entities.filter(e=>!e.optional).sort((a,b)=>a.at-b.at);
    for(let i=1;i<route.length;i++)assert.ok(route[i].at-route[i].length/2>route[i-1].at+route[i-1].length/2);
  }
});
test('recorded score stays exact and corrupt or blocked storage is handled',()=>{
  const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
  for(let i=0;i<7;i++)writeRecord(storage,` Rider ${i} `,Object.freeze({score:i*100,distance:80}));
  assert.equal(readRecords(storage).length,5);assert.equal(readRecords(storage)[0].score,600);
  assert.equal(readRecords(storage)[0].name,'Rider 6');
  map.set(RECORDS_KEY+':endless','invalid json');assert.deepEqual(readRecords(storage),[]);
  assert.throws(()=>writeRecord({getItem:()=>null,setItem:()=>{throw new Error('Blocked');}},'Rider',{score:100}),/Blocked/);
});

test('turbo doubles acceleration and caps near 130 km/h after about 18 seconds',()=>{
  assert.equal(PHYSICS.baseSpeed,8.5);assert.equal(PHYSICS.acceleration,1.5);assert.equal(PHYSICS.maxSpeed,36);
  const run=emptyRun();pad(run,8,20000);
  step(run,1099);assert.ok(run.speed<36);step(run,2);assert.equal(run.speed,36);
  const distance=run.distance;step(run,600);
  assert.ok(Math.abs(run.distance-distance-360)<1e-7);assert.equal(run.speed,36);
  assert.equal(new Run().speed,8.5);
});
