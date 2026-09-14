import { LEVELS, levelForScore } from './levels.mjs';

export const FIXED_STEP = 1 / 60;
export const RULESET = 'side-jungle-v4';
export const COURSE_REVISION = 'precision-lines-1';
export const PHYSICS = Object.freeze({ gravity: 24, jumpVelocity: 15, baseSpeed: 8.5, acceleration: 1.5, maxSpeed: 36, steerSpeed: 9, minOffset: -8, maxOffset: 14, coyoteTime: .12, jumpBuffer: .15, catchWindow: .16, bankTime: .65, deathY: -3.6 });
// Match the speed-based zoom so steering keeps its visible range and response.
export const steeringScale = speed => Math.max(28, speed * 1.5 + 8) / 28;
export const TRICKS = Object.freeze([
  { id: 'kickflip', label: 'KICKFLIP', points: 100, duration: .72 },
  { id: 'heelflip', label: 'HEELFLIP', points: 100, duration: .72 },
  { id: 'shuvit', label: 'POP SHUVIT', points: 100, duration: .7 },
  { id: 'frontside360', label: 'FRONTSIDE 360', points: 100, duration: .78 },
  { id: 'varial', label: 'VARIAL KICKFLIP', points: 100, duration: .78 },
  { id: 'doublekickflip', label: 'DOUBLE KICKFLIP', points: 100, duration: .78 },
  { id: 'backside360', label: 'BACKSIDE 360', points: 100, duration: .78 },
  { id: 'hardflip', label: 'HARDFLIP', points: 100, duration: .78 },
  { id: 'indygrab', label: 'INDY GRAB', points: 100, duration: .76 },
]);
export const PRO_TRICKS = Object.freeze([
  { id: 'spin900', label: '900', switchStance: true },
  { id: 'spin1080', label: '1080' },
  { id: 'mctwist', label: 'MCTWIST', switchStance: true },
  { id: 'backflip', label: 'BACKFLIP' },
  { id: 'doublebackflip', label: 'DOUBLE BACKFLIP' },
  { id: 'superman', label: 'SUPERMAN' },
  { id: 'christair', label: 'CHRIST AIR' },
  { id: 'rocketair', label: 'ROCKET AIR' },
  { id: 'rodeo900', label: 'RODEO 900', switchStance: true },
  { id: 'triplevarial', label: 'TRIPLE VARIAL' },
].map(trick => Object.freeze({ ...trick, label: 'PRO ' + trick.label, points: 220, duration: .94, risky: true })));
export const ALL_TRICKS = Object.freeze([...TRICKS, ...PRO_TRICKS]);
export const BIOMES = LEVELS;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// Authored motifs supply the rhythm; seeded variations change their placement, not their reachability.
const MOTIFS = [
  ['deck', 'fork', 'fork-exit', 'precision', 'rail', 'rest'],
  ['log', 'deck', 'fork', 'precision', 'rail', 'rest'],
  ['deck', 'rail', 'precision', 'fork', 'precision', 'rest'],
];

export class Run {
  constructor(seed = 1, onEvent = () => {}) {
    this.seed = seed >>> 0 || 1;
    this.initialSeed = this.seed;
    this.trickSeed = (this.seed ^ 0x9e3779b9) >>> 0;
    this.onEvent = onEvent;
    this.time = this.distance = this.axis = this.x = this.vx = this.y = this.vy = 0;
    this.speed = PHYSICS.baseSpeed;
    this.points = this.pending = this.lostCombo = this.bestLine = 0;
    this.multiplier = this.bestCombo = 1;
    this.comboTime = this.bankProgress = this.buffer = this.coyote = this.catchBuffer = 0;
    this.support = this.rail = null;
    this.balance = this.railTime = 0;
    this.jumpTime = 0; this.stance = 0;
    this.didJump = this.bufferRisky = this.catchAttempted = false;
    this.activeTrick = this.previousTrick = null;
    this.landingTime = 1;
    this.lastSurfaceY = 0;
    this.landingQuality = '';
    this.dead = false;
    this.deathReason = '';
    this.stats = { lands: 0, perfect: 0, rails: 0, risky: 0, transfers: 0, banks: 0 };
    this.lastRail = null;
    this.entities = [];
    this.serial = this.section = this.speedStage = 0;
    this.motif = MOTIFS[0];
    const start = this.addSurface('platform', { x: 0, at: 1, y: 0, width: 1.8, length: 18, motif: 'start' });
    this.support = start.id;
    this.lastRoute = start;
    this.generate();
  }

  random() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  get score() { return Math.floor(this.distance * 2 + this.points); }
  get biome() { return levelForScore(this.score); }
  steer(axis) { if (!this.dead) this.axis = clamp(axis, -1, 1); }
  jump(risky = false) { if (!this.dead) { this.buffer = PHYSICS.jumpBuffer; this.bufferRisky = Boolean(risky); } }
  catch() { if (!this.dead && this.didJump && !this.catchAttempted) { this.catchBuffer = PHYSICS.catchWindow; this.catchAttempted = true; } }

  addSurface(type, { x = 0, at, y = 0, width = 3, length = 20, depth = .45, ...details }) {
    const entity = { id: ++this.serial, type, x, at, y, width, length, depth, z: this.distance - at, ...details };
    this.entities.push(entity);
    return entity;
  }

  generate() {
    while (this.lastRoute.at + this.lastRoute.length / 2 < this.distance + 150) {
      const previous = this.lastRoute, end = previous.at + previous.length / 2;
      const speed = Math.min(PHYSICS.maxSpeed, Math.sqrt(PHYSICS.baseSpeed ** 2 + 2 * PHYSICS.acceleration * end));
      if (this.section && this.section % 6 === 0) this.motif = MOTIFS[Math.floor(this.random() * MOTIFS.length)];
      const motif = this.motif[this.section % 6];
      const y = clamp(previous.y + (this.random() - .5) * .35, -.3, 1.2);
      // Short targets can be overshot; long transfers need a different takeoff window.
      const baseGap = Math.min(5.6 + speed * .53, speed * .78);
      const precision = motif === 'precision', distance = motif === 'rail';
      const variation = this.random();
      const gap = distance ? speed * (.94 + variation * .08) : precision ? baseGap * (.94 + variation * .12) : baseGap;
      const length = precision ? Math.max(3.6, speed * (.34 + this.random() * .06)) : speed * (motif === 'rest' ? 1.55 : motif === 'rail' ? 1.8 : 1.12) + 5;
      const at = end + gap + length / 2;
      const biome = Math.floor(at / 360) % BIOMES.length;
      // Both routes occupy one visible movement plane. Jump timing selects height.
      if (motif === 'fork' || motif === 'fork-exit') {
        this.lastRoute = this.addSurface('platform', { x: 0, y, at, length, width: 1.6, motif, route: 'safe', biome });
        const inset = speed * .10;
        this.addSurface('rail', { x: 0, y: y + 3.4, at: at + inset / 2, length: length - inset, width: .18, optional: true, route: 'wild', motif, biome });
      } else {
        this.lastRoute = this.addSurface(motif === 'rail' ? 'rail' : 'platform', {
          x: 0, y, at, length, width: motif === 'rail' ? .18 : motif === 'log' ? 1.1 : 1.7, motif, biome,
        });
      }
      this.section++;
    }
  }

  overlaps(surface) {
    // x is now a longitudinal screen offset, never an invisible depth lane.
    return Math.abs(surface.z + this.x) <= surface.length / 2 + .12;
  }

  pickTrick(risky = false) {
    this.trickSeed = (1664525 * this.trickSeed + 1013904223) >>> 0;
    const pool = risky ? PRO_TRICKS : ALL_TRICKS;
    let index = Math.floor(this.trickSeed / 4294967296 * pool.length);
    if (pool[index].id === this.previousTrick) index = (index + 1) % pool.length;
    const trick = pool[index];
    this.previousTrick = trick.id;
    // Space mixes both tiers; an explicit Pro input restricts selection to specials.
    return trick;
  }

  award(base, label, chain = true) {
    if (chain) this.multiplier = this.pending > 0 ? Math.min(8, this.multiplier + 1) : 1;
    this.bestCombo = Math.max(this.bestCombo, this.multiplier);
    this.comboTime = 4;
    const points = Math.round(base * this.multiplier);
    this.pending += points;
    this.onEvent({ type: 'score', points, label });
  }

  bank() {
    if (!this.pending) return;
    const points = Math.floor(this.pending);
    this.points += points;
    this.bestLine = Math.max(this.bestLine, points);
    this.stats.banks++;
    this.pending = this.comboTime = this.bankProgress = 0;
    this.multiplier = 1;
    this.onEvent({ type: 'bank', points });
  }

  dropCombo() {
    this.lostCombo = Math.floor(this.pending);
    this.pending = this.comboTime = this.bankProgress = 0;
    this.multiplier = 1;
  }

  land(surface) {
    const entryVx = this.vx;
    this.deathReason = '';
    this.y = surface.y; this.vy = 0; this.support = surface.id;
    this.lastSurfaceY = surface.y; this.landingTime = this.coyote = this.bankProgress = 0;
    const landedTrick = this.activeTrick;
    const centered = Math.abs(surface.z + this.x) < surface.length / 2 - .35 && Math.abs(entryVx) < 2.5;
    const complete = !landedTrick || this.jumpTime + FIXED_STEP >= landedTrick.duration;
    const perfect = Boolean(landedTrick && complete && centered && this.catchBuffer > 0);
    this.landingQuality = !complete ? 'ZU KURZ' : perfect ? 'PERFECT' : centered ? 'SAUBER' : 'KNAPP';
    if (landedTrick) {
      this.stats.lands++;
      if (complete) {
        this.award(landedTrick.points + (perfect ? 80 : 0), landedTrick.label);
        if (perfect) this.stats.perfect++;
        if (landedTrick.risky) this.stats.risky++;
      } else this.dropCombo();
    }
    if (landedTrick?.switchStance && complete) this.stance ^= 1;
    this.didJump = false; this.activeTrick = null; this.catchBuffer = 0;
    if (surface.type === 'rail') {
      this.rail = surface.id; this.railTime = 0;
      this.balance = clamp(entryVx * .025, -.3, .3);
      if (!surface.grinded) {
        this.stats.rails++;
        this.award(surface.route === 'wild' ? 180 : 100, surface.route === 'wild' ? 'WILD LINE' : 'GRIND');
        if (this.lastRail && this.lastRail !== surface.id) { this.stats.transfers++; this.award(100, 'RAIL TRANSFER'); }
        surface.grinded = true;
      }
      this.lastRail = surface.id;
      this.onEvent({ type: 'grind' });
    } else {
      this.rail = this.lastRail = null;
      this.onEvent({ type: 'land', quality: this.landingQuality });
    }
    this.onEvent({ type: 'landed-trick', trick: landedTrick?.id || null, quality: this.landingQuality });
  }

  tick(dt) {
    if (this.dead) return;
    this.time += dt;
    this.speed = Math.min(PHYSICS.maxSpeed, PHYSICS.baseSpeed + this.time * PHYSICS.acceleration);
    this.distance += this.speed * dt;
    this.landingTime += dt;
    this.catchBuffer = Math.max(0, this.catchBuffer - dt);
    const stage = Math.floor(this.time / 10);
    if (stage > this.speedStage) { this.speedStage = stage; this.onEvent({ type: 'speed', speed: this.speed }); }
    for (const e of this.entities) e.z = this.distance - e.at;
    // One direct movement path for rolling, jumping AND grinding. Landing never locks it.
    const scale = steeringScale(this.speed);
    this.vx = this.axis * PHYSICS.steerSpeed * scale;
    const nextX = this.x + this.vx * dt;
    this.x = clamp(nextX, PHYSICS.minOffset * scale, PHYSICS.maxOffset * scale);
    if (this.x !== nextX) this.vx = 0;
    let supported = this.entities.find(e => e.id === this.support);
    if (this.support !== null && (!supported || !this.overlaps(supported))) {
      if (this.rail) this.onEvent({ type: 'rail-end' });
      this.support = this.rail = null; this.coyote = PHYSICS.coyoteTime;
    }
    if (this.buffer > 0 && (this.support !== null || this.coyote > 0)) {
      this.activeTrick = this.pickTrick(this.bufferRisky);
      this.support = this.rail = null; this.vy = PHYSICS.jumpVelocity;
      this.buffer = this.coyote = this.bankProgress = this.jumpTime = 0;
      this.didJump = true; this.catchAttempted = false;
      this.onEvent({ type: 'jump', trick: this.activeTrick });
    }
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    if (this.didJump) this.jumpTime += dt;
    if (this.rail && supported) {
      this.railTime += dt;
      const lean = this.axis * .22 + Math.sin(this.railTime * 5) * .06;
      this.balance += (lean - this.balance) * (1 - Math.exp(-10 * dt));
      this.pending += (supported.route === 'wild' ? 75 : 45) * this.multiplier * dt;
      this.comboTime = 4;
    }
    if (this.support === null) {
      this.bankProgress = 0;
      const previousY = this.y;
      this.vy -= PHYSICS.gravity * dt;
      this.y += this.vy * dt;
      if (this.vy <= 0) {
        const landing = this.entities.filter(e => this.overlaps(e) && previousY >= e.y - .001 && this.y <= e.y)
          .sort((a, b) => b.y - a.y)[0];
        if (landing) this.land(landing);
      }
    } else {
      this.y = supported.y; this.vy = 0;
      if (!this.rail && this.pending > 0) {
        this.bankProgress = Math.abs(this.vx) < 1 ? this.bankProgress + dt : 0;
        if (this.bankProgress >= PHYSICS.bankTime) this.bank();
      }
    }
    if (this.y < PHYSICS.deathY) {
      this.dead = true;
      this.deathReason ||= 'In die Schlucht gestuerzt. Absprung auf das Ziel abstimmen: A verkuerzt, D verlaengert deine Flugweite.';
      this.dropCombo(); this.activeTrick = null; this.didJump = false;
      this.onEvent({ type: 'crash', reason: this.deathReason });
      return;
    }
    this.entities = this.entities.filter(e => e.z < e.length / 2 + 25);
    this.generate();
  }
}

export const RECORDS_KEY = 'jungle-ride-3d-side-jungle-v4';
export function readRecords(storage, scope = 'endless') {
  try {
    const records = JSON.parse(storage.getItem(`${RECORDS_KEY}:${scope}`) || '[]');
    return Array.isArray(records) ? records.filter(e => typeof e?.name === 'string' && Number.isSafeInteger(e.score) && e.score >= 0)
      .sort((a, b) => b.score - a.score).slice(0, 5) : [];
  } catch { return []; }
}
export function writeRecord(storage, name, result, scope = 'endless') {
  if (!result || !Number.isSafeInteger(result.score) || result.score < 0) throw new Error('Kein abgeschlossener Run.');
  const entry = { name: name.trim().slice(0, 16) || 'Skater', score: result.score, distance: result.distance };
  const records = [...readRecords(storage, scope), entry].sort((a, b) => b.score - a.score).slice(0, 5);
  storage.setItem(`${RECORDS_KEY}:${scope}`, JSON.stringify(records));
  return records;
}
