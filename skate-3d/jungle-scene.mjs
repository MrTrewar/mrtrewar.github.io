import * as THREE from 'three';

const materials = new Map();
const cube = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(.7, 1, 1, 7);
const transform = new THREE.Object3D();
const color = new THREE.Color();
function random(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
export function pixelMaterial(hex, kind = 'stone') {
  const key = hex + kind;
  if (materials.has(key)) return materials.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d'), rng = random(783);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    let shade = .8 + Math.floor(rng() * 5) * .075;
    if (kind === 'wood') shade *= x % 9 === 0 ? .62 : 1;
    if (kind === 'stone' && (y === 0 || x === 0)) shade *= .7;
    color.set(hex).multiplyScalar(shade); ctx.fillStyle = '#' + color.getHexString(); ctx.fillRect(x, y, 1, 1);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
  const mat = new THREE.MeshStandardMaterial({ map, roughness: kind === 'metal' ? .55 : .94, metalness: kind === 'metal' ? .4 : 0, flatShading: true });
  materials.set(key, mat); return mat;
}
function leafGeometry() {
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= 8; row++) {
    const t = row / 8, width = Math.pow(Math.sin(t * Math.PI), .65) * .5;
    for (let side = -1; side <= 1; side++) {
      positions.push(side * width, t, side === 0 ? Math.sin(t * Math.PI) * .12 : -.03);
      uvs.push((side + 1) / 2, t);
    }
    if (row < 8) for (let side = 0; side < 2; side++) {
      const a = row * 3 + side;
      indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
const leaf = leafGeometry();
function palmGeometry() {
  const p=[],uv=[],indices=[];
  function triangle(a,b,c) {
    const n=p.length/3;for(const v of [a,b,c]){p.push(...v);uv.push(v[0]+.5,v[1]);}indices.push(n,n+1,n+2);
  }
  for(let i=0;i<12;i++) {
    const t=.08+i*.072,w=Math.sin(t*Math.PI)*.47,z=Math.sin(t*Math.PI)*.1;
    for(const side of [-1,1])triangle([side*.009,t,z],[side*w,t+.12,-.06],[side*.012,t+.065,z]);
  }
  triangle([-.012,0,0],[.012,0,0],[.008,1,0]);triangle([-.012,0,0],[.008,1,0],[-.008,1,0]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
const palm=palmGeometry();
function leafMaterial(hex) {
  const key = hex + 'leaf'; if (materials.has(key)) return materials.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 32;
  const ctx = canvas.getContext('2d'), rng = random(735);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    const vein = x === 7 || x === 8 || (y + Math.abs(x - 8)) % 7 === 0;
    const shade = vein ? 1.22 : .72 + Math.floor(rng() * 4) * .11;
    color.set(hex).multiplyScalar(shade); ctx.fillStyle = '#' + color.getHexString(); ctx.fillRect(x, y, 1, 1);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
  const mat = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 1 });
  materials.set(key, mat); return mat;
}
export class Batch {
  constructor(parent) { this.parent = parent; this.groups = new Map(); }
  add(geo, mat, p, size, rotation = [0, 0, 0], tint = 1) {
    const key = geo.uuid + mat.uuid;
    if (!this.groups.has(key)) this.groups.set(key, { geo, mat, items: [] });
    transform.position.set(...p); transform.scale.set(...size); transform.rotation.set(...rotation); transform.updateMatrix();
    this.groups.get(key).items.push({ matrix: transform.matrix.clone(), tint });
  }
  box(p, size, hex, kind = 'stone', rotation) { this.add(cube, pixelMaterial(hex, kind), p, size, rotation); }
  finish() {
    for (const { geo, mat, items } of this.groups.values()) {
      const mesh = new THREE.InstancedMesh(geo, mat, items.length);
      items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, new THREE.Color(item.tint, item.tint, item.tint)); });
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); this.parent.add(mesh);
    }
  }
}
function frond(batch, x, y, z, size, angle, hex, feathered = false) {
  batch.add(feathered ? palm : leaf, leafMaterial(hex), [x, y, z], [size * .52, size, size], [0, Math.PI / 2, angle]);
}
function vine(batch, x, y, z, length, seed) {
  for (let i = 0; i < length; i += .8) {
    const offset = Math.sin(i * .45 + seed) * .3;
    batch.box([x, y - i, z + offset], [.05, .83, .055], '#5b6936', 'wood');
    if (Math.floor(i * 3) % 2 === 0) frond(batch, x + .04, y - i, z + offset, .55, i % 2 ? -.8 : .8, '#6c8438');
  }
}

export class JungleScene {
  constructor(scene) {
    this.scene = scene; this.layers = []; this.water = [];
    const palettes = [ ['#456e62', '#43796a'], ['#234d3c', '#42653b'], ['#213c2d', '#4a6734'] ];
    for (let layer = 0; layer < 3; layer++) {
      const group = new THREE.Group(); scene.add(group);
      const batch = new Batch(group), rng = random(17 + layer * 71);
      const depth = -48 + layer * 17, [bark, leaves] = palettes[layer];
      for (let i = 0; i < 28; i++) {
        const z = i * 5.7 - 90, x = depth - rng() * 7, height = 15 + rng() * 13, base = -10;
        batch.add(cylinder, pixelMaterial(bark, 'wood'), [x, base + height / 2, z], [1 + rng(), height, 1 + rng()]);
        for (let j = 0; j < 3; j++) batch.box([x + .8, base + 2, z + (j - 1) * 1.1], [.35, 5, .4], bark, 'wood', [.1, 0, -.1]);
        for (let j = 0; j < 9; j++) frond(batch, x, base + height - 1, z, 4 + rng() * 4, (j - 4) * .39, leaves, i % 3 === 0);
        // Lower broad-leaf understory distinguishes rainforest from round tree canopies.
        for (let j = 0; j < 6; j++) frond(batch, x + 2, -5 + rng() * 4, z + rng() * 3, 2 + rng() * 3, (j - 2.5) * .5, leaves);
        if (i % 2 === 0) vine(batch, x + 1, base + height - 2, z + 1, 9 + rng() * 5, i);
      }
      batch.finish(); this.layers.push({ group, speed: [.13, .28, .5][layer], period: 159.6 });
    }
    const ruins = new THREE.Group(); scene.add(ruins);
    const rb = new Batch(ruins);
    for (let i = 0; i < 8; i++) {
      const z = i * 21 - 90, x = -9 - (i % 3) * 3;
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 8; tier++) rb.box([x, tier * 1.12 - 7, z + side * 3.8], [2.3, 1.04, 1.65], tier % 3 ? '#687153' : '#7b7c57');
        rb.box([x, 1.85, z + side * 3.8], [2.8, .65, 2.4], '#9a9265');
        vine(rb, x + 1.35, 3, z + side * 3.9, 8, i);
      }
      rb.box([x, 2.8, z], [2.6, 1.35, 9.7], '#77815a');
      rb.box([x, 3.57, z], [2.8, .25, 10], '#60723c');
      for (let j = 0; j < 4; j++) frond(rb, x + 1, 3.6, z - 3 + j * 2, 2.7, (j - 1.5) * .35, '#697b36');
    }
    rb.finish(); this.layers.push({ group: ruins, speed: .65, period: 168 });
    // A distant waterfall stays behind the movement plane and never hides a gap.
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group(); scene.add(group);
      const b = new Batch(group);
      b.box([-24, -1, 0], [2, 28, 7], '#43645b');
      for (let j = 0; j < 21; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: j % 3 ? '#78b9ae' : '#b1d9be', transparent: true, opacity: .35, depthWrite: false });
        const stream = new THREE.Mesh(cube, mat);
        stream.position.set(-22.9, -1 + (j % 3), -2.7 + j * .27); stream.scale.set(.025, 22, .11 + (j % 3) * .06);
        group.add(stream); this.water.push(stream);
      }
      b.finish(); group.userData.at = i * 69 - 65; this.layers.push({ group, speed: .23, period: 207, at: group.userData.at });
    }
    const front = new THREE.Group(); scene.add(front); const fb = new Batch(front);
    for (let i = 0; i < 32; i++) {
      const z = i * 4.5 - 75;
      for (let j = 0; j < 5; j++) frond(fb, 5, -7, z, 3 + (i % 3) * .3, (j - 2) * .6, '#183c2b', i % 2 === 0);
      if (i % 3 === 0) for (let j = 0; j < 4; j++) frond(fb, 2, 13, z, 3.5, 2.3 + j * .4, '#294b2c');
    }
    fb.finish(); this.layers.push({ group: front, speed: 1.05, period: 144 });
    const rays = new THREE.Group(); scene.add(rays);
    const rayMat = new THREE.MeshBasicMaterial({ color: '#ffe4a0', transparent: true, opacity: .035, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1 + i % 2, 26), rayMat);
      ray.position.set(-7 - i, 8, -i * 7 + 14); ray.rotation.set(0, Math.PI / 2, -.38); rays.add(ray);
    }
  }
  update(distance, time) {
    for (const layer of this.layers) {
      if (!layer.copies) {
        layer.copies = [-1, 1].map(() => { const copy = layer.group.clone(); this.scene.add(copy); return copy; });
      }
      const at = (distance * layer.speed + (layer.at || 0)) % layer.period;
      layer.group.position.z = at;
      layer.copies[0].position.z = at - layer.period;
      layer.copies[1].position.z = at + layer.period;
    }
    for (let i = 0; i < this.water.length; i++) this.water[i].material.opacity = .33 + Math.sin(time * 2 + i) * .08;
  }
  surface(entity) {
    const group = new THREE.Group(), batch = new Batch(group), { length, width, motif, type } = entity;
    if (type === 'rail') {
      batch.box([0, -.13, 0], [.20, .26, length], '#666953', 'metal');
      batch.box([0, -.015, 0], [.23, .05, length], '#d1c18a', 'metal');
      for (let z = -length / 2 + .45; z < length / 2; z += 3.5) {
        for (const x of [-.32, .32]) {
          batch.add(cylinder, pixelMaterial('#7e8547', 'wood'), [x, -2.6, z], [.09, 5.1, .09]);
          for (let j = 0; j < 6; j++) batch.box([x, -.5 - j * .8, z], [.21, .075, .21], '#b4a466', 'wood');
        }
        batch.box([0, -.45, z], [.9, .14, .28], '#736547', 'wood');
        batch.box([0, -5.3, z], [1.4, .45, 1.2], '#7d8060');
        vine(batch, .38, -.8, z, 3, z);
      }
    } else {
      const planks = motif === 'log' || motif === 'rest';
      const count = Math.ceil(length / (planks ? .65 : 1.4)), spacing = length / count;
      for (let i = 0; i < count; i++) {
        const z = -length / 2 + (i + .5) * spacing;
        batch.box([0, -.27, z], [width, .54, spacing - .04], planks ? '#9f834f' : i % 3 ? '#9a9468' : '#85875f', planks ? 'wood' : 'stone');
        if (i % 3 === 0) batch.box([width / 2 - .08, -.02, z], [.22, .07, spacing * .8], '#76843c');
      }
      for (const z of [-length * .35, length * .35]) {
        for (let j = 0; j < 6; j++) batch.box([0, -.85 - j * .9, z], [width * .62, .85, 1.05], j % 2 ? '#727953' : '#81825a');
        batch.box([0, -.55, z], [width * 1.15, .22, 1.55], '#b0a474');
        vine(batch, width / 2 + .04, -.5, z + .4, 3.8, z);
        for (let j = 0; j < 3; j++) frond(batch, -.7, -1.7, z, 1.3, (j - 1) * .6, '#627b35');
      }
      for (const z of [-length / 2 + .06, length / 2 - .06]) batch.box([0, .01, z], [width, .035, .1], '#e0bf79');
    }
    batch.finish(); group.userData.type = type; return group;
  }
}
