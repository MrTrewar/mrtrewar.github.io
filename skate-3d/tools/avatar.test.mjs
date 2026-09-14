import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const buffer = readFileSync(new URL('../assets/pixel-rider.glb', import.meta.url));
const gltf = JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString());
test('the new self-contained avatar includes the original clothing and facial details', () => {
  const names = gltf.nodes.map(n=>n.name || '').join(' ');
  for(const name of ['HeadEarCup','HeadBandTop','HeadBeard','HeadMoustache','HeadFringe','HeadNose']) assert.ok(names.includes(name),name);
  assert.ok(!names.includes('Helmet'));assert.ok(!names.includes('Backpack'));
  const materials=gltf.materials.map(m=>m.name);
  for(const name of ['Petrol cotton shirt','Khaki trousers','Brown shoes','Original orange deck'])assert.ok(materials.includes(name),name);
  assert.ok(gltf.images.length>=8);assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(gltf.samplers.every(s=>s.magFilter===9728));
});
test('the avatar keeps an articulated rig with limbs, feet, head and torso', () => {
  const joints=new Set(gltf.skins.flatMap(s=>s.joints).map(i=>gltf.nodes[i].name));
  for(const name of ['Pelvis','Torso','Head','ThighBack','ThighFront','ShinBack','ShinFront','FootBack','FootFront','UpperArmL','UpperArmR','ForearmL','ForearmR'])assert.ok(joints.has(name),name);
});
