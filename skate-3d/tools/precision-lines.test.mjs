import test from 'node:test';
import assert from 'node:assert/strict';
import { Run, PHYSICS, FIXED_STEP } from '../simulation.mjs';
import { planJump } from './course-driver.mjs';

const seeds=Array.from({length:100},(_,i)=>Math.imul(i+1,0x9e3779b9)>>>0);
test('always jumping at the edge overshoots a precision target across 100 dispersed seeds',()=>{
  for(const seed of seeds){
    const r=new Run(seed);let target=null,overshot=false;
    for(let i=0;i<3600&&!r.dead;i++){
      const p=r.entities.find(e=>e.id===r.support);
      if(p&&p.at+p.length/2-r.distance-r.x<r.speed*.08+.2){
        target=r.entities.filter(e=>!e.optional&&e.at-e.length/2>=p.at+p.length/2-.01).sort((a,b)=>a.at-b.at)[0];r.jump();
      }
      const y=r.y;r.tick(FIXED_STEP);
      if(target?.motif==='precision'&&y>=target.y&&r.y<target.y&&r.vy<0&&r.distance+r.x>target.at+target.length/2)overshot=true;
    }
    assert.equal(r.dead,true,'late strategy survived seed '+seed);assert.equal(overshot,true,'no physical overshoot for '+seed);
  }
});
test('geometry-aware timing keeps both routes reachable across dispersed seeds at maximum speed',()=>{
  for(const wild of [false,true])for(const seed of seeds){
    const r=new Run(seed);let precision=0,last=null;
    for(let i=0;i<5400&&!r.dead;i++){
      const p=r.entities.find(e=>e.id===r.support);
      if(p&&p.id!==last){if(p.motif==='precision')precision++;last=p.id;}
      if(planJump(r,wild)?.jump)r.jump();r.steer(-r.x*2);r.tick(FIXED_STEP);
    }
    assert.equal(r.dead,false,`seed ${seed}, wild ${wild}, distance ${r.distance}`);
    assert.equal(r.speed,PHYSICS.maxSpeed);assert.ok(precision>=4);
  }
});
function precisionLanding(early=false,brake=false){
  const r=new Run(42);r.entities=[];r.lastRoute={at:1e6,length:100};r.time=30;r.speed=PHYSICS.maxSpeed;
  r.land(r.addSurface('platform',{at:0,length:40,width:1.7}));
  const target=r.addSurface('platform',{at:49.7,length:12.6,width:1.7,motif:'precision'});
  r.distance=early?6.4:19;r.jump();
  for(let i=0;i<150&&!r.dead;i++){
    r.steer(brake&&i>=30&&i<54?-1:0);r.tick(FIXED_STEP);
    if(i>0&&r.support!==null)break;
  }
  return {r,target};
}
test('the same short platform can be overshot, landed earlier, or saved with air braking',()=>{
  const late=precisionLanding(),early=precisionLanding(true),braked=precisionLanding(false,true);
  assert.equal(late.r.dead,true);assert.ok(late.r.distance>late.target.at+late.target.length/2);
  for(const {r,target} of [early,braked]){assert.equal(r.dead,false);assert.equal(r.support,target.id);assert.equal(r.y,target.y);}
  assert.ok(braked.r.x<0);assert.equal(early.r.x,0);
});
test('precision targets are short, vary by seed and have no underlying safety platform',()=>{
  const lengths=new Set(),gaps=new Set();
  for(const seed of seeds){
    const r=new Run(seed);r.distance=2000;r.generate();
    const main=r.entities.filter(e=>!e.optional).sort((a,b)=>a.at-b.at);
    for(let i=1;i<main.length;i++)if(main[i].motif==='precision'){
      const p=main[i],end=main[i-1].at+main[i-1].length/2;
      const speed=Math.min(PHYSICS.maxSpeed,Math.sqrt(PHYSICS.baseSpeed**2+2*PHYSICS.acceleration*end));
      assert.ok(p.length<=Math.max(3.6,speed*.4)+1e-9);assert.ok(p.length>=3.6);
      assert.equal(r.entities.some(e=>e!==p&&e.at-e.length/2<p.at+p.length/2&&e.at+e.length/2>p.at-p.length/2),false);
      lengths.add(p.length.toFixed(3));gaps.add((p.at-p.length/2-end).toFixed(3));
    }
  }
  assert.ok(lengths.size>100);assert.ok(gaps.size>100);
});
