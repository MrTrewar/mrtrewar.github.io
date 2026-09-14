import test from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../simulation.mjs';
import { LEVELS, levelForScore } from '../levels.mjs';
import { CRASH_DURATION, BURST_LIFETIME, CRASH_SEQUENCE, crashSequence, explosionFrame } from '../crash-sequence.mjs';

test('world unlocks use exact score thresholds, never distance cycling', () => {
  assert.deepEqual([0,2999,3000,9999,10000,1000000].map(levelForScore),[0,0,1,1,2,2]);
  assert.deepEqual(LEVELS.map(l=>l.id),['jungle','city','egypt']);
  const r=new Run();r.distance=1000;assert.equal(r.biome,0);
  r.points=1000;assert.equal(r.biome,1);r.points=8000;assert.equal(r.biome,2);
});
test('unbanked combos do not unlock worlds and a new run begins in the jungle', () => {
  const r=new Run(42);r.award(15000,'TEST');assert.equal(r.biome,0);
  r.dropCombo();assert.equal(r.biome,0);r.award(15000,'TEST');r.bank();assert.equal(r.biome,2);
  assert.equal(new Run(42).biome,0);
});
test('world score does not change course collision geometry', () => {
  const a=new Run(87),b=new Run(87);a.points=15000;
  a.distance=b.distance=2000;a.generate();b.generate();
  assert.equal(a.biome,2);assert.equal(b.biome,1);assert.deepEqual(a.entities,b.entities);
});
test('chain explosion has one large blast and six timed satellite blasts before the endscreen', () => {
  assert.equal(CRASH_SEQUENCE.length,7);assert.ok(CRASH_SEQUENCE[0].size>8);
  assert.equal(CRASH_SEQUENCE[0].delay,0);
  CRASH_SEQUENCE.forEach((s,i)=>{
    assert.ok(s.delay+BURST_LIFETIME<CRASH_DURATION);
    if(i){assert.ok(s.delay>CRASH_SEQUENCE[i-1].delay);assert.ok(s.size<CRASH_SEQUENCE[0].size);}
  });
  assert.ok(new Set(CRASH_SEQUENCE.map(s=>s.y+':'+s.z)).size===7);
  assert.equal(explosionFrame(-1),0);assert.equal(explosionFrame(100),7);
});
test('reduced motion uses fewer, widely spaced bursts', () => {
  const sequence=crashSequence(true);assert.equal(sequence.length,3);
  for(let i=1;i<sequence.length;i++)assert.ok(sequence[i].delay-sequence[i-1].delay>=.6);
  assert.equal(crashSequence(false),CRASH_SEQUENCE);
});
