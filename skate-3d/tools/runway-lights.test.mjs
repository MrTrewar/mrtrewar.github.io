import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNWAY_LIGHTS, runwayMarkers, runwayPulse } from '../runway-lights.mjs';

test('runway lamps form two evenly spaced rows with larger markers inside both ends',()=>{
  for(const type of ['rail','platform'])for(const length of [8,18,45,80,120]) {
    const entity={type,length,width:type==='rail'?.18:1.6},before={...entity};
    const markers=runwayMarkers(entity),front=markers.filter(m=>m.x>0),back=markers.filter(m=>m.x<0);
    assert.deepEqual(entity,before);assert.equal(front.length,back.length);
    assert.equal(markers.filter(m=>m.endpoint).length,4);
    assert.deepEqual(front.map(m=>m.z),back.map(m=>m.z));
    for(const m of markers){
      assert.ok(Math.abs(m.z)+.34*m.size<length/2);assert.ok(m.phase>=0&&m.phase<RUNWAY_LIGHTS.phases);
      if(m.endpoint)assert.ok(m.size>1);
      if(type==='platform')assert.ok(Math.abs(m.x)<entity.width/2);
    }
    for(let i=1;i<front.length;i++)assert.ok(front[i].z-front[i-1].z<=RUNWAY_LIGHTS.spacing+1e-9);
  }
});
test('runway lights reject missing or invalid dimensions',()=>{
  for(const entity of [{},{length:0,width:1},{length:10,width:0},{length:Infinity,width:1},{length:-1,width:1}])assert.deepEqual(runwayMarkers(entity),[]);
});
test('four soft light phases stay visible, repeat slowly and advance without abrupt flashes',()=>{
  assert.ok(RUNWAY_LIGHTS.period>=2);
  for(let phase=0;phase<4;phase++)for(let t=0;t<5;t+=.01){
    const value=runwayPulse(t,phase);assert.ok(value>=.45&&value<=1);
    assert.ok(Math.abs(value-runwayPulse(t+RUNWAY_LIGHTS.period,phase))<1e-10);
    assert.ok(Math.abs(value-runwayPulse(t+.01,phase))<.02);
  }
  assert.ok(new Set([0,1,2,3].map(p=>runwayPulse(.35,p))).size>=3);
});
test('reduced-motion lamps stay steady and repeated paused timestamps do not change light levels',()=>{
  for(let phase=0;phase<4;phase++)for(const t of [0,.5,1.2,5,100])assert.equal(runwayPulse(t,phase,true),.82);
  const frozen=[0,1,2,3].map(p=>runwayPulse(2.7,p));
  assert.deepEqual([0,1,2,3].map(p=>runwayPulse(2.7,p)),frozen);
});
