import * as THREE from 'three';
import { Batch } from './jungle-scene.mjs';
import { RUNWAY_LIGHTS, runwayMarkers, runwayPulse } from './runway-lights.mjs';

const cube = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1);
let haloMap;
function pixelHalo() {
  if (haloMap) return haloMap;
  const size = 16, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const distance = Math.abs(x - 7.5) / 8 + Math.abs(y - 7.5) / 8;
    const alpha = Math.round(Math.max(0, 1 - distance) ** 2 * 6) / 6;
    pixels.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
  }
  haloMap = new THREE.DataTexture(pixels, size, size);
  haloMap.magFilter = haloMap.minFilter = THREE.NearestFilter;
  haloMap.generateMipmaps = false; haloMap.needsUpdate = true; return haloMap;
}
const red = new THREE.Color('#ff3346');
const guide = new THREE.MeshBasicMaterial({ color: '#dc263d', toneMapped: false, fog: false });

export class CityRunwayLights {
  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.brightness = [];
    this.cores = Array.from({ length: RUNWAY_LIGHTS.phases }, () => new THREE.MeshBasicMaterial({ color: red, toneMapped: false, fog: false }));
    this.halos = this.cores.map(() => new THREE.MeshBasicMaterial({
      color: '#ff213e', map: pixelHalo(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, fog: false, side: THREE.DoubleSide,
    }));
    this.update(0);
  }
  update(time) {
    for (let phase = 0; phase < RUNWAY_LIGHTS.phases; phase++) {
      const value = runwayPulse(time, phase, this.reducedMotion);
      this.brightness[phase] = value;
      this.cores[phase].color.copy(red).multiplyScalar(value);
      this.halos[phase].opacity = .2 + value * .4;
    }
  }
  attach(parent, entity) {
    const group = new THREE.Group(), batch = new Batch(group), markers = runwayMarkers(entity);
    group.name = 'red-runway-lights';
    const rail = entity.type === 'rail';
    if (rail) batch.add(cube, guide, [0, -.02, 0], [.25, .10, entity.length]);
    else for (const side of [-1, 1]) {
      batch.add(cube, guide, [side * (entity.width / 2 - .04), -.012, 0], [.08, .06, entity.length]);
      batch.add(cube, guide, [side * (entity.width / 2 + .016), -.18, 0], [.036, .10, entity.length]);
    }
    for (const m of markers) {
      batch.box([m.x, -.06, m.z], [.28, .16, .68 * m.size], '#172432', 'metal');
      batch.add(cube, this.cores[m.phase], [m.x, m.y, m.z], [.22, .19, .5 * m.size]);
      // Front-facing pixel halos stay depth-tested: scenery cannot reveal a hidden landing.
      if (m.x > 0) batch.add(plane, this.halos[m.phase], [m.x + .16, m.y, m.z], [1.8 * m.size, .95, 1], [0, Math.PI / 2, 0]);
    }
    batch.finish();
    group.traverse(o => { o.castShadow = false; o.receiveShadow = false; });
    parent.add(group);
    parent.userData.runwayLights = { count: markers.length, endpoints: markers.filter(m => m.endpoint).length };
  }
}
