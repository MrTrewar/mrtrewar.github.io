export const LEVELS = Object.freeze([
  Object.freeze({ id: 'jungle', name: 'JUNGLE RUINS', threshold: 0, sky: '#426d63', wood: '#99845a', accent: '#e9c56d', sun: '#ffe2a0', fill: '#fff0d0', hemi: '#e8edc7', ground: '#263e34', sunPower: 3.1, fillPower: 1.5, hemiPower: 2.1, fogNear: 34, fogFar: 100 }),
  Object.freeze({ id: 'city', name: 'NEON DISTRICT', threshold: 3000, sky: '#080e20', wood: '#35455c', accent: '#6fece8', sun: '#8caef0', fill: '#b9efff', hemi: '#719bc5', ground: '#101626', sunPower: 1.5, fillPower: 2.6, hemiPower: 1.5, fogNear: 45, fogFar: 135 }),
  Object.freeze({ id: 'egypt', name: 'PHARAOH DUNES', threshold: 10000, sky: '#ba8b70', wood: '#bd965c', accent: '#ffda87', sun: '#ffd095', fill: '#fff0c1', hemi: '#efd1a1', ground: '#654b3a', sunPower: 2.7, fillPower: 1.3, hemiPower: 1.8, fogNear: 45, fogFar: 145 }),
]);
export function levelForScore(score) {
  let level = 0;
  for (let i = 1; i < LEVELS.length; i++) if (score >= LEVELS[i].threshold) level = i;
  return level;
}
