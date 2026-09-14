import * as THREE from 'three';

import { CRASH_DURATION, BURST_LIFETIME, crashSequence, explosionFrame } from './crash-sequence.mjs';
export { CRASH_DURATION, explosionFrame } from './crash-sequence.mjs';

function burstAtlas() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=32;
  const c=canvas.getContext('2d');
  for(let frame=0;frame<8;frame++) {
    const radius=frame<3?3+frame*4:13;
    for(let y=0;y<32;y++)for(let x=0;x<32;x++) {
      const dx=x-16,dy=y-16;
      const wave=Math.sin(Math.atan2(dy,dx)*7+frame)*1.6;
      const d=Math.hypot(dx,dy)+wave;
      if(d>radius|| (frame>5&&(x*7+y*11)%8<frame-4))continue;
      const ratio=d/radius;
      c.fillStyle=frame>5?(ratio>.65?'#344138':'#606444'):ratio<.35?'#fff3aa':ratio<.65?'#ffd050':ratio<.84?'#ff902e':'#ba4828';
      c.fillRect(frame*32+x,y,1,1);
    }
  }
  const map=new THREE.CanvasTexture(canvas);map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;map.colorSpace=THREE.SRGBColorSpace;map.repeat.set(1/8,1);return map;
}

export class PixelEffects {
  constructor(scene, reducedMotion = false) {
    this.reducedMotion = reducedMotion; this.clock = 0; this.emitBudget = 0;
    this.origin = new THREE.Vector3(); this.emitter = new THREE.Vector3();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = ['#fff3ac', '#ffcf4d', '#ff8e29', '#c45225', '#48514a'].map(color => new THREE.MeshBasicMaterial({ color, fog: true }));
    this.materials[4].transparent = true; this.materials[4].opacity = .52; this.materials[4].depthWrite = false;
    this.pool = Array.from({ length: 260 }, (_, i) => {
      const mesh = new THREE.Mesh(geometry, this.materials[i % 5]); mesh.visible = false; scene.add(mesh);
      return { mesh, life: 0, total: 1, velocity: new THREE.Vector3(), size: .05, smoke: false };
    });
    const atlas = burstAtlas();
    this.bursts = crashSequence(reducedMotion).map(spec => {
      const map = atlas.clone(); map.needsUpdate = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, depthWrite: false, transparent: true }));
      sprite.visible = false; sprite.renderOrder = 5; scene.add(sprite); return { spec, sprite, fired: false };
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 20), new THREE.MeshBasicMaterial({ color: '#ffd083', transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    this.ring.rotation.y = Math.PI / 2; this.ring.visible = false; this.ring.renderOrder = 4; scene.add(this.ring);
    this.light = new THREE.PointLight('#ffac40', 0, 19, 2); scene.add(this.light); this.reset();
  }
  reset() {
    for (const p of this.pool) { p.life = 0; p.mesh.visible = false; }
    for (const b of this.bursts) { b.fired = false; b.sprite.visible = false; b.sprite.material.opacity = 0; }
    this.crashAge = null; this.burstCount = 0; this.emitBudget = 0; this.light.intensity = 0; this.ring.visible = false;
  }
  emit(origin, explosion = false, index = 0) {
    const p = this.pool.find(p => p.life <= 0); if (!p) return;
    p.smoke = explosion && index % 4 === 0;
    p.total = p.life = explosion ? .65 + Math.random() * .8 : .13 + Math.random() * .24;
    p.size = explosion ? (p.smoke ? .25 : .14) + Math.random() * .2 : .045 + Math.random() * .065;
    p.mesh.position.copy(origin); p.mesh.visible = true;
    p.mesh.material = this.materials[p.smoke ? 4 : Math.floor(Math.random() * (explosion ? 4 : 3))];
    if (explosion) {
      const angle = index * 2.39996, force = (3 + Math.random() * 8) * (this.reducedMotion ? .6 : 1) * (p.smoke ? .5 : 1);
      p.velocity.set((Math.random() - .5) * 2, Math.sin(angle) * force + 2.4, Math.cos(angle) * force);
    } else p.velocity.set((Math.random() - .2) * .7, .5 + Math.random() * 2.4, 4 + Math.random() * 7);
  }
  fire(b) {
    b.fired = true; this.burstCount++;
    const { spec, sprite } = b;
    sprite.position.copy(this.origin).add(this.emitter.set(0, spec.y, spec.z));
    const count = this.reducedMotion ? Math.ceil(spec.particles * .55) : spec.particles;
    for (let i = 0; i < count; i++) this.emit(sprite.position, true, i);
    sprite.visible = true;
  }
  crash(y, z) {
    this.reset(); this.crashAge = 0; this.origin.set(.2, y + 1.2, z);
    this.light.position.copy(this.origin); this.light.intensity = this.reducedMotion ? 4 : 38;
    this.ring.position.copy(this.origin); this.ring.visible = !this.reducedMotion;
    this.updateBursts();
  }
  updateBursts() {
    for (const b of this.bursts) {
      const age = this.crashAge - b.spec.delay;
      if (age < 0) continue;
      if (!b.fired) this.fire(b);
      b.sprite.material.map.offset.x = explosionFrame(age) / 8;
      b.sprite.material.opacity = Math.max(0, Math.min(1, (BURST_LIFETIME - age) * 4));
      b.sprite.visible = age < BURST_LIFETIME;
      const size = b.spec.size * (this.reducedMotion ? .8 : 1) * (1 + Math.min(age, .6) * .22);
      b.sprite.scale.set(size, size, 1);
    }
    this.ring.visible = !this.reducedMotion && this.crashAge < .85;
    this.ring.scale.setScalar(1.5 + this.crashAge * 10);
    this.ring.material.opacity = Math.max(0, .36 * (1 - this.crashAge / .85));
  }
  update(dt, run, playing, paused = false) {
    if (paused) return;
    if (this.crashAge !== null) { this.crashAge = Math.min(CRASH_DURATION, this.crashAge + dt); this.updateBursts(); }
    if (playing && run.rail) {
      this.emitBudget += dt * (90 + run.speed * 2);
      const origin = this.emitter.set(.35, run.y + .06, -run.x + .65);
      while (this.emitBudget >= 1) { this.emit(origin); this.emitBudget--; }
      this.light.position.copy(origin); this.light.intensity = 2 + (this.reducedMotion ? 0 : Math.sin(this.clock * 18) * .3);
    } else this.light.intensity *= Math.exp(-dt * (this.crashAge === null ? 14 : 4));
    this.clock += dt;
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt; p.mesh.visible = p.life > 0;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (playing) p.mesh.position.z += run.speed * dt;
      p.velocity.y += (p.smoke ? .7 : -8) * dt;
      const age = 1 - Math.max(0, p.life / p.total);
      p.mesh.scale.setScalar(p.size * (p.smoke ? 1 + age * 1.7 : 1 - age * .7));
      if (!p.smoke && this.crashAge === null) p.mesh.scale.z *= 3;
      p.mesh.rotation.x += dt * 2; p.mesh.rotation.z += dt * 3;
      if (this.crashAge >= CRASH_DURATION) { p.life = 0; p.mesh.visible = false; }
    }
  }
  get activeCount() { return this.pool.filter(p => p.life > 0).length; }
  get visibleBursts() { return this.bursts.filter(b => b.sprite.visible).length; }
}
