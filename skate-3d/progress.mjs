import { RULESET, COURSE_REVISION } from './simulation.mjs';
const PREFIX = `jungle-ride:${RULESET}`;
const COURSE_PREFIX = `${PREFIX}:${COURSE_REVISION}`;
export const CHALLENGES = Object.freeze([
  { id: 'rails', label: '3 Rails in einem Run', target: 3, color: '#a1f3e2', name: 'RIVER' },
  { id: 'perfect', label: '5 perfekte Landungen', target: 5, color: '#ffca82', name: 'SUNSET' },
  { id: 'risky', label: '3 Pro-Tricks landen', target: 3, color: '#f29fb0', name: 'BLOOM' },
]);
export function dailyCourse(date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  let seed = 2166136261;
  for (const c of `${RULESET}:${COURSE_REVISION}:${day}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return { day, seed: seed || 1, scope: `daily:${day}:${COURSE_REVISION}` };
}
export function readProgress(storage) {
  try {
    const data = JSON.parse(storage.getItem(`${PREFIX}:progress`) || '{}');
    const unlocked = Array.isArray(data.unlocked) ? data.unlocked.filter(id => CHALLENGES.some(c => c.id === id)) : [];
    const selected = data.selected === 'default' || unlocked.includes(data.selected) ? data.selected : 'default';
    return { unlocked, selected };
  } catch { return { unlocked: [], selected: 'default' }; }
}
export function saveProgress(storage, progress) { storage.setItem(`${PREFIX}:progress`, JSON.stringify(progress)); }
export function completeChallenges(progress, stats) {
  const unlocked = [...new Set([...progress.unlocked, ...CHALLENGES.filter(c => stats[c.id] >= c.target).map(c => c.id)])];
  return { ...progress, unlocked };
}
export function readGhost(storage, day) {
  try {
    const g = JSON.parse(storage.getItem(`${COURSE_PREFIX}:ghost`) || 'null');
    if (g?.day !== day || !Number.isSafeInteger(g.score) || g.score < 0 || !Array.isArray(g.frames) || g.frames.length > 12000) return null;
    if (!g.frames.length || !g.frames.every((f, i) => Array.isArray(f) && f.length === 4 && f.every(Number.isFinite) && f[0] >= 0 && f[1] >= 0 && Math.abs(f[2]) <= 50 && Math.abs(f[3]) <= 20 && (!i || f[0] > g.frames[i - 1][0]))) return null;
    return g;
  } catch { return null; }
}
export function saveGhost(storage, day, score, frames) {
  const old = readGhost(storage, day);
  if (!frames.length || (old && old.score >= score)) return false;
  storage.setItem(`${COURSE_PREFIX}:ghost`, JSON.stringify({ day, score, frames: frames.slice(0, 12000) }));
  return true;
}
export function ghostAt(frames, time, cursor = 0) {
  if (!frames?.length || time > frames.at(-1)[0]) return null;
  while (cursor + 1 < frames.length && frames[cursor + 1][0] < time) cursor++;
  const a = frames[cursor], b = frames[Math.min(cursor + 1, frames.length - 1)];
  const t = Math.max(0, Math.min(1, (time - a[0]) / (b[0] - a[0] || 1)));
  return { cursor, distance: a[1] + (b[1] - a[1]) * t, x: a[2] + (b[2] - a[2]) * t, y: a[3] + (b[3] - a[3]) * t };
}
