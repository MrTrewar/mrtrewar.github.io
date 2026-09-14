import test from 'node:test';
import assert from 'node:assert/strict';
import { LevelTransition, LEVEL_TIMING } from '../level-transition.mjs';
import { Run } from '../simulation.mjs';

test('remaining-point countdown uses secured score, not the open combo',()=>{
  const t=new LevelTransition(),run=new Run();run.points=250;run.award(9000,'OPEN');
  assert.equal(t.status(run.score).remaining,2750);assert.equal(t.status(run.score).phase,'points');
  assert.equal(t.status(1500).progress,.5);assert.equal(t.update(10,run.biome),false);assert.equal(t.switchAt,null);
});
test('every unlock displays a real three-two-one countdown before changing worlds',()=>{
  const t=new LevelTransition();assert.equal(LEVEL_TIMING.countdown,3);
  assert.equal(t.update(10,1),false);assert.equal(t.status(3000).seconds,3);
  assert.equal(t.update(11,1),false);assert.equal(t.status(3000).seconds,2);
  assert.equal(t.update(12,1),false);assert.equal(t.status(3000).seconds,1);
  assert.equal(t.update(12.999,1),false);assert.equal(t.index,0);
  assert.equal(t.update(13,1),true);assert.equal(t.index,1);assert.equal(t.status(3000).remaining,7000);
});
test('a large bank cannot skip the city and countdown includes the minimum stay',()=>{
  const t=new LevelTransition();t.update(10,2);t.update(13,2);assert.equal(t.index,1);
  t.update(13.1,2);assert.equal(t.status(20000).seconds,8);
  assert.equal(t.update(20.99,2),false);assert.equal(t.status(20000).seconds,1);
  assert.equal(t.update(21,2),true);assert.equal(t.index,2);
  assert.deepEqual(t.status(20000),{phase:'endless',next:null,remaining:0,seconds:0,progress:1});
  assert.equal(t.update(100,9),false);assert.equal(t.index,2);
});
test('a late unlock still gives the full countdown even after the minimum stay',()=>{
  const t=new LevelTransition();t.reset(1,10);t.update(50,2);assert.equal(t.status(10000).seconds,3);
  assert.equal(t.update(52,2),false);assert.equal(t.update(53,2),true);
});
test('pause and crash stop pending transitions and their visible countdown',()=>{
  const t=new LevelTransition();t.update(5,1);const before=t.status(3000);
  for(const time of [6,8,20,100]){assert.equal(t.update(time,1,false),false);assert.deepEqual(t.status(3000),before);}
  assert.equal(t.index,0);t.update(6,1);assert.equal(t.status(3000).seconds,2);
});
test('reset cancels a pending transition even when restarting in the same world',()=>{
  const t=new LevelTransition();t.update(12,2);assert.notEqual(t.switchAt,null);
  t.reset(0);assert.equal(t.switchAt,null);assert.equal(t.status(0).remaining,3000);
  assert.equal(t.update(100,0),false);assert.equal(t.index,0);assert.equal(t.status(0).phase,'points');
});
test('countdown deadlines are independent of render cadence',()=>{
  for(const dt of [1/30,1/60,1/144]){
    const t=new LevelTransition();t.update(0,1);let changedAt=null;
    for(let i=1;i<500;i++)if(t.update(i*dt,1)){changedAt=i*dt;break;}
    assert.ok(changedAt>=3-1e-9&&changedAt<3+dt+1e-9);assert.equal(t.index,1);
  }
});
