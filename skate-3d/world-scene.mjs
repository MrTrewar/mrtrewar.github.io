import * as THREE from 'three';
import { JungleScene, Batch, pixelMaterial } from './jungle-scene.mjs';
import { LEVELS } from './levels.mjs';
import { CityRunwayLights } from './city-runway.mjs';
import { LevelTransition } from './level-transition.mjs';

const cube = new THREE.BoxGeometry(1, 1, 1);
const drum = new THREE.CylinderGeometry(1, 1, 1, 8);
const pyramid = new THREE.ConeGeometry(1, 1, 4);
const plane = new THREE.PlaneGeometry(1, 1);
const glowMaterials = new Map(), signMaps = new Map();
function glow(hex) {
  if (!glowMaterials.has(hex)) glowMaterials.set(hex, new THREE.MeshBasicMaterial({ color: hex, fog: true }));
  return glowMaterials.get(hex);
}
function rng(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
function litBox(batch, p, size, hex) { batch.add(cube, glow(hex), p, size); }
function face(parent, map, x, y, z, w, h, opacity = 1) {
  const mesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  mesh.position.set(x, y, z); mesh.scale.set(w, h, 1); mesh.rotation.y = Math.PI / 2; parent.add(mesh); return mesh;
}
function signMap(label, hex) {
  const key = label + hex;
  if (signMaps.has(key)) return signMaps.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = '#080e20'; c.fillRect(0, 0, 128, 64);
  c.strokeStyle = hex; c.lineWidth = 2; c.strokeRect(2, 2, 124, 60); c.strokeRect(6, 6, 116, 52);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hex;
  const lines = label.split('/'); c.font = 'bold 19px monospace';
  lines.forEach((line, i) => c.fillText(line, 64, lines.length === 1 ? 33 : 23 + i * 23));
  for (let x = 10; x < 120; x += 8) { c.fillRect(x, 10, 2, 2); c.fillRect(x, 52, 2, 2); }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; signMaps.set(key, map); return map;
}
function sign(parent, batch, label, hex, x, y, z, w, h) {
  batch.box([x - .2, y, z], [.35, h + .24, w + .24], '#151e30', 'metal');
  face(parent, signMap(label, hex), x + .02, y, z, w, h);
  for (const side of [-1, 1]) {
    litBox(batch, [x + .04, y + side * (h / 2 + .09), z], [.07, .09, w + .3], hex);
    litBox(batch, [x + .04, y, z + side * (w / 2 + .09)], [.07, h + .25, .09], hex);
  }
}
class RepeatingScene {
  constructor(root) { this.root = root; this.layers = []; this.landmarks = {}; }
  layer(group, speed, period) {
    this.root.add(group);
    const copies = [-1, 1].map(() => { const copy = group.clone(); this.root.add(copy); return copy; });
    this.layers.push({ group, copies, speed, period });
  }
  update(distance) {
    for (const l of this.layers) {
      const phase = (distance * l.speed) % l.period;
      l.group.position.z = phase; l.copies[0].position.z = phase - l.period; l.copies[1].position.z = phase + l.period;
    }
  }
}

class CityScene extends RepeatingScene {
  constructor(root, { reducedMotion = false } = {}) {
    super(root); this.runway = new CityRunwayLights(reducedMotion); this.landmarks = { towers: 42, neonSigns: 28, pyramids: 0, pharaohs: 0 };
    const labels = ['NIGHT/SHIFT', 'RAMEN/24 H', 'ARCADE', 'KOI/BAR', 'NEON/RIDE', 'METRO', 'HOTEL/OPEN'];
    const neon = ['#58e8ee', '#ff749d', '#ffc767', '#88d8ff'];
    for (let depth = 0; depth < 3; depth++) {
      const group = new THREE.Group(), b = new Batch(group), random = rng(74 + depth * 53);
      for (let i = 0; i < 14; i++) {
        const z = i * 12 - 80, x = -49 + depth * 17, height = 15 + random() * 20, w = 7 + random() * 3;
        const front = x + 2.2;
        b.box([x, height / 2 - 13, z], [4.4, height, w], ['#17283e', '#17263a', '#1e3040'][depth], 'metal');
        b.box([x, height - 12.7, z], [4.8, .5, w + .5], '#334159', 'metal');
        b.box([x, height - 11.8, z + 1.4], [2, 1.4, 2.1], '#2b3a4b', 'metal');
        if (i % 3 === 0) b.box([x, height - 9, z - 1], [.1, 6, .1], '#5a7388', 'metal');
        for (let y = -10; y < height - 15; y += 1.65) for (let zz = -w / 2 + .7; zz < w / 2; zz += 1.05) {
          if (random() > .33) litBox(b, [front + .035, y, z + zz], [.04, .67, .38], random() > .6 ? '#d8b67a' : depth === 0 ? '#31556e' : '#458fa1');
        }
        if (depth > 0) {
          const hue = neon[i % neon.length], sy = depth === 2 ? 1.8 + (i % 4) * 2.7 : 8 + (i % 3) * 3;
          sign(group, b, labels[i % labels.length], hue, front + .35, sy, z + .4, 4.7, 2.3);
          litBox(b, [front + .12, height / 2 - 10, z - w / 2 + .2], [.07, height - 6, .09], hue);
          if (i % 2 === 0) {
            for (let j = 0; j < 5; j++) b.box([front + .5, -4 + j * 2.1, z + 2], [1.4, .12, 2.3], '#34445a', 'metal');
          }
        }
      }
      b.finish(); this.layer(group, [.12, .28, .53][depth], 168);
    }
    const alley = new THREE.Group(), b = new Batch(alley);
    for (let i = 0; i < 16; i++) {
      const z = i * 11 - 85;
      b.box([-6, -8, z], [2, 7, .2], '#152237', 'metal');
      b.box([-5.9, -5, z], [.2, .12, 7], '#475263', 'metal');
      litBox(b, [-5.7, -4.8, z - 2], [.18, .15, 1.6], neon[i % 4]);
      for (let j = 0; j < 8; j++) b.box([-8, 9.5 + Math.sin(j / 7 * Math.PI) * -1, z + j * 1.4], [.06, .07, 1.5], '#304359', 'metal');
      litBox(b, [-8, -10, z], [.1, .025, 5], neon[i % 4]);
    }
    b.finish(); this.layer(alley, .78, 176);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(3.3, 24), glow('#a3c7da'));
    moon.position.set(-65, 18, -22); moon.rotation.y = Math.PI / 2; root.add(moon);
    const mask = new THREE.Mesh(new THREE.CircleGeometry(3.1, 24), glow('#080e20'));
    mask.position.set(-64.9, 18.7, -21); mask.rotation.y = Math.PI / 2; root.add(mask);
  }
  update(distance, time) { super.update(distance); this.runway.update(time); }
  surface(entity) {
    const group = themedSurface(entity, 'city'); this.runway.attach(group, entity); return group;
  }
}

function pharaoh(b, x, base, z, scale = 1) {
  const box = (p, size, hex, kind = 'stone') => b.box([x + p[0] * scale, base + p[1] * scale, z + p[2] * scale], size.map(v => v * scale), hex, kind);
  box([0, .3, 0], [3.2, .65, 4.2], '#a77c49');
  box([-.4, 2.2, 0], [1.8, 3.8, 2.7], '#c39d64');
  box([.55, 1, 0], [1.6, 1.4, 2.6], '#b99159');
  for (const side of [-1, 1]) {
    box([.8, 1.1, side * .8], [2.2, 1.6, .65], '#cea46a');
    box([.2, 3, side * 1.65], [.8, 2.9, .65], '#c39d64');
    box([.8, 2.3, side * 1.65], [1.8, .65, .7], '#c39d64');
    for (let row = 0; row < 9; row++) box([.08, 4.3 + row * .27, side * 1.12], [1.8, .23, .53], row % 2 ? '#246978' : '#e1b963');
  }
  box([0, 5.5, 0], [1.7, 2.1, 1.9], '#d4ad71');
  box([.06, 6.67, 0], [2, .45, 2.5], '#dcb455');
  box([.99, 5.55, 0], [.5, .63, .28], '#d4ad71');
  for (const side of [-1, 1]) box([.88, 5.89, side * .43], [.09, .14, .43], '#3d3935');
  box([.88, 5.05, 0], [.13, .13, .55], '#846a43');
  box([.7, 4.55, 0], [.48, .93, .42], '#285c68');
  box([.9, 4.08, 0], [.13, .33, 2.7], '#277c83');
  box([1.0, 6.5, 0], [.23, .5, .2], '#ffe196', 'metal');
}
function glyphs(b, x, y, z) {
  const gold = '#694e35';
  for (let row = 0; row < 4; row++) {
    const yy = y - row * .83;
    b.box([x, yy, z], [.055, .09, .68], gold);
    b.box([x, yy - .21, z + (row % 2 ? .16 : -.16)], [.055, .5, .075], gold);
    b.box([x, yy + .15, z], [.055, .08, .38], gold);
    if (row % 2 === 0) b.box([x, yy - .32, z], [.06, .085, .45], gold);
  }
}
class EgyptScene extends RepeatingScene {
  constructor(root) {
    super(root); this.landmarks = { pyramids: 10, pharaohs: 10, neonSigns: 0, obelisks: 12 };
    for (let layer = 0; layer < 2; layer++) {
      const group = new THREE.Group(), b = new Batch(group);
      for (let i = 0; i < 5; i++) {
        const x = -49 + layer * 15, z = i * 43 - 100, height = layer === 0 ? 29 : 20, width = layer === 0 ? 33 : 25;
        for (let tier = 0; tier < 20; tier++) {
          const w = width * (1 - tier / 21);
          b.box([x, -12 + tier * height / 20, z], [w, height / 20 - .035, w], tier % 4 ? '#b58b59' : '#c39b63');
        }
        b.add(pyramid, pixelMaterial('#e3bd68', 'metal'), [x, height - 11, z], [2.1, 3.4, 2.1], [0, Math.PI / 4, 0]);
        for (let j = 0; j < 12; j++) b.box([x + width * .4, -9.2 + (j % 3), z - 15 + j * 2.8], [2.2, 1.7, 2.6], '#b18755');
      }
      b.finish(); this.layer(group, [.13, .27][layer], 215);
    }
    const temples = new THREE.Group(), b = new Batch(temples);
    for (let i = 0; i < 5; i++) {
      const z = i * 35 - 90, x = -13;
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 9; tier++) b.box([x, -6.5 + tier * 1.2, z + side * 6], [3.5, 1.14, 4.6 - tier * .13], tier % 3 ? '#b99460' : '#c6a16b');
        b.box([x, 4.45, z + side * 6], [3.9, .5, 4.5], '#d4b278');
        glyphs(b, x + 1.78, 2.4, z + side * 6);
        pharaoh(b, x + 3, -7, z + side * 4, 1.18);
      }
      b.box([x, 3.2, z], [3.7, 1.7, 10], '#caa56b');
      b.box([x + 1.9, 3.4, z], [.12, .35, 9.4], '#32797c');
      b.box([x + 1.97, 3.9, z], [.13, .12, 9.6], '#e7c778');
    }
    b.finish(); this.layer(temples, .53, 175);
    const columns = new THREE.Group(), cb = new Batch(columns);
    for (let i = 0; i < 12; i++) {
      const z = i * 15 - 85, x = -7;
      cb.box([x, -6, z], [2.3, 1, 2.3], '#9b754d');
      for (let j = 0; j < 8; j++) cb.box([x, -5 + j * .85, z], [1.35 - j * .06, .8, 1.35 - j * .06], '#c19b62');
      cb.add(pyramid, pixelMaterial('#e2bd70', 'metal'), [x, 2.15, z], [.72, 1.2, .72], [0, Math.PI / 4, 0]);
      glyphs(cb, x + .7, .5, z);
      for (let j = 0; j < 3; j++) cb.box([x + 1.5, -7 + j * .55, z + 3], [1.5, .52, 2 - j * .3], '#a78051', 'stone', [0, j * .23, .1]);
    }
    cb.finish(); this.layer(columns, .76, 180);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(5, 24), glow('#f4c681'));
    sun.position.set(-74, 18, 8); sun.rotation.y = Math.PI / 2; root.add(sun);
  }
  surface(entity) { return themedSurface(entity, 'egypt'); }
}

function themedSurface(entity, theme) {
  const group = new THREE.Group(), b = new Batch(group), { length, width, type } = entity;
  const city = theme === 'city', base = city ? '#34465b' : '#c5a16a', edge = city ? '#76e8ea' : '#ecd18b';
  if (type === 'rail') {
    b.box([0, -.13, 0], [.2, .26, length], city ? '#71899a' : '#405b57', 'metal');
    if (!city) litBox(b, [0, -.015, 0], [.23, .05, length], edge);
    for (let z = -length / 2 + .45; z < length / 2; z += 3.5) {
      b.box([0, -2.1, z], [city ? .16 : .48, 4.05, city ? .2 : .55], base, city ? 'metal' : 'stone');
      b.box([0, -4.2, z], [1.25, .4, 1.1], base);
      b.box([0, -.42, z], [.85, .16, .5], city ? '#53667c' : '#d9bc83');
      if (!city) b.box([.25, -1.1, z], [.05, .65, .3], '#347f81');
    }
  } else {
    const count = Math.ceil(length / 1.3), spacing = length / count;
    for (let i = 0; i < count; i++) {
      const z = -length / 2 + (i + .5) * spacing;
      b.box([0, -.27, z], [width, .54, spacing - .04], city ? (i % 3 ? base : '#40566b') : (i % 3 ? base : '#b28b59'), city ? 'metal' : 'stone');
      if (!city) b.box([width / 2 + .015, -.22, z], [.04, .18, spacing - .05], '#356569');
    }
    for (const z of [-length * .35, length * .35]) {
      if (city) {
        for (const x of [-width * .3, width * .3]) b.box([x, -3, z], [.16, 5.5, .25], '#2b3a4b', 'metal');
        b.box([0, -2, z], [width, .13, .28], '#607081', 'metal');
      } else {
        for (let j = 0; j < 6; j++) b.add(drum, pixelMaterial(j % 2 ? '#a98252' : '#bd985f'), [0, -.9 - j * .86, z], [width * .43, .81, .64]);
        b.box([0, -.62, z], [width * 1.16, .25, 1.5], '#e0c28a');
        b.box([width * .51, -.9, z], [.07, .15, 1.15], '#347f81');
        glyphs(b, width * .44 + .02, -1.1, z);
      }
    }
    for (const z of [-length / 2 + .06, length / 2 - .06]) litBox(b, [0, .01, z], [width, .035, .1], city ? '#ff3346' : edge);
  }
  b.finish(); group.userData.type = type; return group;
}

export class WorldScene {
  constructor(scene, options = {}) {
    this.index = -1; this.transition = new LevelTransition();
    this.worlds = [JungleScene, CityScene, EgyptScene].map((World, index) => {
      const root = new THREE.Group(); root.name = LEVELS[index].id; root.visible = false; scene.add(root);
      return { root, scene: new World(root, options) };
    });
    this.setLevel(0);
  }
  setLevel(index, time = 0) {
    this.transition.reset(index, time);
    if (index === this.index) return false;
    this.index = index;
    this.worlds.forEach((world, i) => { world.root.visible = i === index; });
    return true;
  }
  update(distance, time, target, active = true) {
    const changed = this.transition.update(time, target, active);
    if (changed) this.setLevel(this.transition.index, time);
    this.worlds[this.index].scene.update(distance, time); return changed;
  }
  surface(entity) {
    const mesh = this.worlds[this.index].scene.surface(entity); mesh.userData.level = this.index;
    if (entity.motif === 'precision') {
      const marks = new Batch(mesh);
      for (const end of [-1, 1]) for (let i = 0; i < 3; i++) {
        marks.add(cube, glow('#ffcf6b'), [entity.width / 2 + .035, -.22, end * (entity.length / 2 - .5 - i * .24)], [.06, .3, .13], [.4, 0, 0]);
      }
      marks.finish(); mesh.userData.precision = true;
    }
    return mesh;
  }
  get diagnostics() {
    const active = this.worlds[this.index].scene;
    return { id: LEVELS[this.index].id, visibleWorlds: this.worlds.filter(w => w.root.visible).length, ...active.landmarks, runwayPulse: active.runway ? [...active.runway.brightness] : [], runwayReducedMotion: active.runway?.reducedMotion || false };
  }
}
