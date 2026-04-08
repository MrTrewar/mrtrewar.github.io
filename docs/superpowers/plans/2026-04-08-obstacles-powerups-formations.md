# Mannheim Skater: Obstacles, Powerups, Formations & GLB Model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform mannheim-skater into a full Subway Surfers-style game with diverse obstacles, meaningful powerups, brezel formations, graze mechanics, and the real Schloss Mannheim GLB model.

**Architecture:** Data-driven system where all obstacle types, powerup effects, and formation patterns are defined as config objects in `config.js`. Generic spawn/collision/activation systems read these definitions. A new `models.js` module handles GLB loading with cache and fallback.

**Tech Stack:** Three.js 0.170 (ES modules via importmap), vanilla JS, Web Audio API, gltf-transform CLI for model optimization.

**Spec:** `docs/superpowers/specs/2026-04-08-mannheim-skater-obstacles-powerups-design.md`

**Note:** This project has no test framework. Verification steps use browser testing (open the game, check behavior). Each task ends with a commit.

---

## File Map

### Modified Files

| File | Responsibility |
|------|---------------|
| `mannheim-skater/js/config.js` | All data definitions: OBSTACLE_DEFS, POWERUP_DEFS, BREZEL_FORMATIONS, MODEL_DEFS, stumble/graze constants |
| `mannheim-skater/js/game-state.js` | New state fields: timeScale, isStumbling, stumbleTimer, isHovering, isBulldozer, stumbleSpeedBackup |
| `mannheim-skater/js/obstacles.js` | Shape-based mesh creation (box/cylinder), moving obstacle update logic, bulldozer destruction |
| `mannheim-skater/js/collectibles.js` | Formation-based brezel spawning, reworked powerup activate/deactivate with effect dispatch |
| `mannheim-skater/js/collision.js` | 3-stage overlap system (hit/graze/near-miss/jump-over), priority chain |
| `mannheim-skater/js/player.js` | Stumble tilt animation, hover Y-offset |
| `mannheim-skater/js/main.js` | timeScale in dt calc, stumble timer update, model preload, loading screen logic, bulldozer collision handling |
| `mannheim-skater/js/world.js` | createSchloss loads GLB via models.js, fallback to box primitives |
| `mannheim-skater/js/scene.js` | Camera shake on graze, export shake function |
| `mannheim-skater/js/audio.js` | New sounds: playGraze, playBulldozerHit, playHoverStart |
| `mannheim-skater/js/hud.js` | Stumble indicator overlay |
| `mannheim-skater/css/hud.css` | Loading screen styles, stumble indicator styles |
| `mannheim-skater/index.html` | Loading screen div, extended importmap for GLTFLoader/DRACOLoader |

### New Files

| File | Responsibility |
|------|---------------|
| `mannheim-skater/js/models.js` | GLTFLoader + DRACOLoader setup, model cache, loadModel(key) -> Promise |
| `mannheim-skater/assets/models/schloss_optimized.glb` | Optimized Schloss model (from 168MB original) |

---

## Task 1: Config — Data Definitions

**Files:**
- Modify: `mannheim-skater/js/config.js`

- [ ] **Step 1: Replace OBSTACLE_DEFS and add new constants at end of config.js**

Open `mannheim-skater/js/config.js`. The current obstacle definitions live in `obstacles.js`. We move them to config and expand them. Add the following after the existing `NIGHT_MODE_SCORE` line (line 118):

```js
// Graze / Stumble
export const GRAZE_OVERLAP_THRESHOLD = 0.3; // overlap ratio above this = frontal hit
export const STUMBLE_DURATION = 1.5; // seconds
export const STUMBLE_SPEED_FACTOR = 0.6; // speed multiplied by this during stumble
export const STUMBLE_RECOVERY_DURATION = 0.5; // seconds to lerp speed back

// Obstacle definitions (data-driven)
export const OBSTACLE_DEFS = [
    // Static — jumpable
    { type: 'poller',    lanes: 1, jumpable: true,  grazeble: true,
      shape: 'cylinder', w: 0.3, h: 0.7, d: 0.3, color: 0x888888, weight: 3 },
    { type: 'barrier',   lanes: 1, jumpable: true,  grazeble: true,
      shape: 'box', w: 0.9, h: 0.5, d: 0.2, color: 0xff8800, weight: 2 },
    { type: 'ampel',     lanes: 1, jumpable: true,  grazeble: true,
      shape: 'cylinder', w: 0.2, h: 2.0, d: 0.2, color: 0x333333, weight: 1 },
    // Static — not jumpable
    { type: 'car',       lanes: 1, jumpable: false, grazeble: true,
      shape: 'box', w: 1.0, h: 0.9, d: 1.8, color: 0xcc2222, weight: 3 },
    { type: 'car_wide',  lanes: 2, jumpable: false, grazeble: true,
      shape: 'box', w: 2.2, h: 1.0, d: 2.0, color: 0x2255aa, weight: 1 },
    { type: 'baustelle', lanes: 2, jumpable: false, grazeble: false,
      shape: 'box', w: 2.4, h: 1.2, d: 0.4, color: 0xff6600, weight: 1 },
    { type: 'tunnel',    lanes: 3, jumpable: false, grazeble: false,
      shape: 'box', w: 4.0, h: 2.5, d: 0.3, color: 0x666666, weight: 0.5 },
    // Moving
    { type: 'tram',      lanes: 2, jumpable: false, grazeble: true,
      shape: 'box', w: 2.6, h: 1.8, d: 4.0, color: 0xdd0000,
      weight: 1, moving: true, moveSpeed: 8, moveDir: 'toward' },
    { type: 'radfahrer', lanes: 1, jumpable: false, grazeble: true,
      shape: 'box', w: 0.5, h: 1.2, d: 0.8, color: 0x44aa44,
      weight: 1, moving: true, moveSpeed: 3, moveDir: 'toward' },
];

// Powerup definitions (data-driven)
export const POWERUP_DEFS = [
    { type: 'doener',  name: 'Doener',        color: 0x8B4513, emissive: 0x442200,
      duration: 0,  effect: 'shield' },
    { type: 'eistee',  name: 'Eistee',        color: 0xFFDD00, emissive: 0x665500,
      duration: 5,  effect: 'slowmo' },
    { type: 'rad',     name: 'Kurpfalz-Rad',  color: 0xDD2222, emissive: 0x550000,
      duration: 10, effect: 'bulldozer' },
    { type: 'ticket',  name: 'Monatsticket',  color: 0x22CC44, emissive: 0x005500,
      duration: 8,  effect: 'magnet' },
    { type: 'spray',   name: 'Graffiti',      color: 0xFF00FF, emissive: 0x550055,
      duration: 5,  effect: 'scoreblast' },
    { type: 'board',   name: 'Board-Up',      color: 0x00FFFF, emissive: 0x005555,
      duration: 10, effect: 'hover' },
];

// Brezel formation templates
export const BREZEL_FORMATIONS = [
    // Path formations — guide player to safe lane
    { id: 'line',      category: 'path',  weight: 3,
      points: [
        { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
        { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
    ]},
    { id: 'diagonal',  category: 'path',  weight: 2,
      points: [
        { lane: 0, z: 0 }, { lane: 1, z: 1.5 }, { lane: 2, z: 3 },
        { lane: 3, z: 4.5 }, { lane: 4, z: 6 },
    ]},
    { id: 'slalom',    category: 'path',  weight: 2,
      points: [
        { lane: 1, z: 0 }, { lane: 3, z: 1.5 }, { lane: 1, z: 3 },
        { lane: 3, z: 4.5 }, { lane: 1, z: 6 },
    ]},
    { id: 'funnel',    category: 'path',  weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 4, z: 0 },
        { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
        { lane: 2, z: 3 },
    ]},
    // Trick formations — risk/reward
    { id: 'jump_arc',  category: 'trick', weight: 2,
      points: [
        { lane: 2, z: 0, y: 0.5 }, { lane: 2, z: 1, y: 1.2 },
        { lane: 2, z: 2, y: 1.8 }, { lane: 2, z: 3, y: 1.2 },
        { lane: 2, z: 4, y: 0.5 },
    ]},
    { id: 'diamond',   category: 'trick', weight: 1,
      points: [
        { lane: 2, z: 0 },
        { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
        { lane: 0, z: 3 }, { lane: 4, z: 3 },
        { lane: 1, z: 4.5 }, { lane: 3, z: 4.5 },
        { lane: 2, z: 6 },
    ]},
    { id: 'risky_edge', category: 'trick', weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
        { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
        { lane: 0, z: 7.5 }, { lane: 0, z: 9 },
    ]},
    { id: 'v_shape',   category: 'trick', weight: 1,
      points: [
        { lane: 0, z: 0 }, { lane: 4, z: 0 },
        { lane: 1, z: 2 }, { lane: 3, z: 2 },
        { lane: 2, z: 4 },
    ]},
];

// Formation spawn settings
export const FORMATION_CHANCE = 0.7; // 70% formation, 30% random scatter

// Model definitions (for GLB loading)
export const MODEL_DEFS = {
    schloss: {
        path: 'assets/models/schloss_optimized.glb',
        scale: 0.5,
        rotation: { y: Math.PI },
    },
};
```

- [ ] **Step 2: Remove old POWERUP constants that are now in POWERUP_DEFS**

In the same `config.js`, remove these lines (currently around lines 70-74):

```
// Remove these lines:
export const POWERUP_EISTEE_DURATION = 5;
export const POWERUP_RAD_DURATION = 10;
export const POWERUP_TICKET_DURATION = 8;
export const POWERUP_SPRAY_DURATION = 5;
export const POWERUP_BOARD_DURATION = 10;
```

They are now embedded in `POWERUP_DEFS[].duration`.

- [ ] **Step 3: Verify config loads**

Open `mannheim-skater/index.html` in a browser. Open the console. There should be no import errors. The game should still run (obstacles.js still has its own local OBSTACLE_DEFS which will be replaced in Task 3).

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/config.js
git commit -m "feat(mannheim-skater): add data-driven defs for obstacles, powerups, formations"
```

---

## Task 2: Game State Extensions

**Files:**
- Modify: `mannheim-skater/js/game-state.js`

- [ ] **Step 1: Add new state fields**

In `game-state.js`, add these fields to the `state` object after the existing `hasHighJump` line (line 29):

```js
    // Graze / Stumble
    isStumbling: false,
    stumbleTimer: 0,
    stumbleSpeedBackup: 0,

    // Powerup effects
    isHovering: false,      // Board-Up hover
    isBulldozer: false,     // Kurpfalz-Rad bulldozer mode
    timeScale: 1,           // Eistee slow-mo (0.5 = half speed)
```

- [ ] **Step 2: Reset new fields in resetState()**

Add resets in `resetState()` after the existing `state.hasHighJump = false;` line:

```js
    state.isStumbling = false;
    state.stumbleTimer = 0;
    state.stumbleSpeedBackup = 0;
    state.isHovering = false;
    state.isBulldozer = false;
    state.timeScale = 1;
```

- [ ] **Step 3: Verify game still runs**

Refresh browser. Game should play identically — new fields are unused so far.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/game-state.js
git commit -m "feat(mannheim-skater): extend game state for stumble, hover, bulldozer, timeScale"
```

---

## Task 3: Obstacle Shape System & Moving Obstacles

**Files:**
- Modify: `mannheim-skater/js/obstacles.js`

- [ ] **Step 1: Replace obstacles.js imports to use config OBSTACLE_DEFS**

Replace the import block at the top of `obstacles.js` (lines 1-7):

```js
import * as THREE from 'three';
import {
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP,
    OBSTACLE_DEFS,
} from './config.js';
import { state } from './game-state.js';
```

- [ ] **Step 2: Remove the local OBSTACLE_DEFS array from obstacles.js**

Delete the entire local `OBSTACLE_DEFS` array (currently lines 19-25):

```
// DELETE these lines:
const OBSTACLE_DEFS = [
    { type: 'poller', ... },
    { type: 'barrier', ... },
    { type: 'car', ... },
    { type: 'car_wide', ... },
    { type: 'baustelle', ... },
];
```

- [ ] **Step 3: Update spawnObstacleRow to support shape system**

Replace the `spawnObstacleRow` function (currently lines 47-75) with:

```js
function createObstacleMesh(def) {
    let geo;
    if (def.shape === 'cylinder') {
        geo = new THREE.CylinderGeometry(def.w / 2, def.w / 2, def.h, 8);
    } else {
        // 'box' is the default
        geo = new THREE.BoxGeometry(def.w, def.h, def.d);
    }
    const mat = new THREE.MeshStandardMaterial({ color: def.color });
    return new THREE.Mesh(geo, mat);
}

function spawnObstacleRow(scene, worldZ) {
    const def = pickObstacleDef();

    // Pick a random start lane that fits
    const maxStart = LANE_COUNT - def.lanes;
    const startLane = Math.floor(Math.random() * (maxStart + 1));

    const mesh = createObstacleMesh(def);

    // Position: center across the lanes it occupies
    const centerLane = startLane + (def.lanes - 1) / 2;
    const x = LANE_POSITIONS[0] + centerLane * (LANE_POSITIONS[1] - LANE_POSITIONS[0]);
    mesh.position.set(x, def.h / 2, worldZ);
    mesh.castShadow = true;

    scene.add(mesh);
    obstacles.push({
        mesh,
        type: def.type,
        lanes: Array.from({ length: def.lanes }, (_, i) => startLane + i),
        jumpable: def.jumpable,
        grazeble: def.grazeble !== false,
        moving: def.moving || false,
        moveSpeed: def.moveSpeed || 0,
        moveDir: def.moveDir || 'toward',
        worldZ,
        w: def.w,
        h: def.h,
        d: def.d,
    });
}
```

- [ ] **Step 4: Update pickObstacleDef to use `lanes` field**

The existing `pickObstacleDef` function references `lanesWide` — update it. The current function is fine as-is since it just reads `weight`, but verify it uses `def.weight` which is present in the new defs. No change needed if it already uses `def.weight`.

- [ ] **Step 5: Add moving obstacle logic to updateObstacles**

In the `updateObstacles` function, inside the loop that moves obstacles (the `for` loop over `obstacles`), replace the simple movement line with:

```js
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];

        // Base scroll movement
        let zSpeed = speed;
        if (obs.moving) {
            if (obs.moveDir === 'toward') {
                zSpeed = speed + obs.moveSpeed;
            } else if (obs.moveDir === 'away') {
                zSpeed = Math.max(0, speed - obs.moveSpeed);
            }
        }
        obs.mesh.position.z -= zSpeed * dt;

        // Lateral movement (side-to-side)
        if (obs.moving && obs.moveDir === 'lateral') {
            obs.mesh.position.x += Math.sin(state.elapsedTime * obs.moveSpeed) * dt * 2;
        }

        // Remove if behind camera
        if (obs.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(obs.mesh);
            obs.mesh.geometry.dispose();
            obs.mesh.material.dispose();
            obstacles.splice(i, 1);
        }
    }
```

- [ ] **Step 6: Add destroyObstacle export for bulldozer**

Add this function and export it:

```js
export function destroyObstacle(obs, scene) {
    const idx = obstacles.indexOf(obs);
    if (idx === -1) return;
    // Fling animation: scale down + fly away
    const mesh = obs.mesh;
    const targetY = mesh.position.y + 5;
    const targetZ = mesh.position.z - 3;
    const startTime = performance.now();
    const duration = 400;
    function animate() {
        const t = Math.min(1, (performance.now() - startTime) / duration);
        mesh.position.y = mesh.position.y + (targetY - mesh.position.y) * t * 0.1;
        mesh.position.z = mesh.position.z + (targetZ - mesh.position.z) * t * 0.1;
        mesh.scale.setScalar(1 - t);
        mesh.rotation.x += 0.2;
        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
    }
    obstacles.splice(idx, 1);
    animate();
}
```

- [ ] **Step 7: Verify obstacles spawn correctly**

Refresh browser. Play the game. You should see:
- Regular obstacles still spawn and work
- Tram (red, large) occasionally appears moving faster toward you
- Radfahrer (green, small) occasionally appears moving toward you
- Poller is now a cylinder shape instead of a box
- Ampel appears as a tall thin cylinder

- [ ] **Step 8: Commit**

```bash
git add mannheim-skater/js/obstacles.js
git commit -m "feat(mannheim-skater): data-driven obstacle shapes and moving obstacles"
```

---

## Task 4: Collision Overhaul — 3-Stage System

**Files:**
- Modify: `mannheim-skater/js/collision.js`

- [ ] **Step 1: Update imports**

Replace the imports at the top of `collision.js`:

```js
import { state } from './game-state.js';
import {
    LANE_POSITIONS, PLAYER_BODY_W, PLAYER_BODY_H, JUMP_HEIGHT,
    GRAZE_OVERLAP_THRESHOLD,
} from './config.js';
```

- [ ] **Step 2: Replace checkObstacleCollisions with 3-stage system**

Replace the entire `checkObstacleCollisions` function:

```js
/*
 * Returns: 'hit' | 'graze' | 'near-miss' | 'jump-over' | 'shield-break' | null
 */
export function checkObstacleCollisions(obstacles) {
    const fromX = LANE_POSITIONS[state.currentLane];
    const toX = LANE_POSITIONS[state.targetLane];
    const t = state.laneSwitchProgress;
    const smoothT = t * t * (3 - 2 * t);
    const playerX = fromX + (toX - fromX) * smoothT;
    const playerHalfW = PLAYER_BODY_W / 2;

    const h = state.hasHighJump ? JUMP_HEIGHT * 1.5 : JUMP_HEIGHT;
    const playerY = state.isJumping
        ? 4 * h * state.jumpProgress * (1 - state.jumpProgress)
        : 0;

    // Hover: skip all obstacles
    if (state.isHovering) return null;

    for (const obs of obstacles) {
        // Z proximity check
        const obsZ = obs.mesh.position.z;
        const obsHalfD = obs.d / 2;
        if (obsZ - obsHalfD > 1.0 || obsZ + obsHalfD < -1.0) continue;

        // X overlap calculation
        const obsX = obs.mesh.position.x;
        const obsHalfW = obs.w / 2;

        const overlapLeft = Math.max(playerX - playerHalfW, obsX - obsHalfW);
        const overlapRight = Math.min(playerX + playerHalfW, obsX + obsHalfW);
        const overlapX = overlapRight - overlapLeft;

        if (overlapX <= 0) {
            // Near-miss check
            const nearDist = 0.5;
            const nearLeft = Math.max(playerX - playerHalfW - nearDist, obsX - obsHalfW);
            const nearRight = Math.min(playerX + playerHalfW + nearDist, obsX + obsHalfW);
            if (nearRight > nearLeft && Math.abs(obsZ) < 0.5) {
                return 'near-miss';
            }
            continue;
        }

        const overlapRatio = overlapX / PLAYER_BODY_W;

        // Y check: jumpable + high enough
        if (obs.jumpable && playerY > obs.h * 0.6) {
            return 'jump-over';
        }

        // Bulldozer: destroy obstacle
        if (state.isBulldozer) {
            // Return special result — main.js handles destruction
            obs._bulldozerHit = true;
            return 'bulldozer-hit';
        }

        // Graze check (partial overlap on grazeble obstacle)
        if (overlapRatio <= GRAZE_OVERLAP_THRESHOLD && obs.grazeble) {
            if (state.isStumbling) continue; // cooldown — no double graze
            return 'graze';
        }

        // Full collision — check shield
        if (state.hasShield) {
            state.hasShield = false;
            return 'shield-break';
        }

        return 'hit';
    }
    return null;
}
```

- [ ] **Step 3: Verify collision still works**

Refresh browser. Play the game:
- Running into an obstacle head-on should still cause Game Over
- Barely touching the side of a car should NOT cause Game Over (graze — no visual effect yet, but no crash)
- Jumping over a barrier should still work

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/collision.js
git commit -m "feat(mannheim-skater): 3-stage collision system with graze detection"
```

---

## Task 5: Stumble Mechanics

**Files:**
- Modify: `mannheim-skater/js/main.js`
- Modify: `mannheim-skater/js/player.js`
- Modify: `mannheim-skater/js/scene.js`
- Modify: `mannheim-skater/js/audio.js`
- Modify: `mannheim-skater/js/hud.js`
- Modify: `mannheim-skater/css/hud.css`

- [ ] **Step 1: Add graze sound to audio.js**

Add at the end of `audio.js`:

```js
export function playGraze() {
    playTone(150, 0.2, 'sawtooth', 0.15);
    setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.1), 100);
}
```

- [ ] **Step 2: Add camera shake to scene.js**

Add after the `setNightMode` function in `scene.js`:

```js
let shakeIntensity = 0;
let shakeDecay = 0;

export function triggerCameraShake(intensity = 0.3, duration = 0.3) {
    shakeIntensity = intensity;
    shakeDecay = intensity / duration;
}

export function updateCameraShake(dt) {
    if (shakeIntensity <= 0) return;
    const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
    const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;
    if (activeCamera) {
        activeCamera.position.x += offsetX;
        activeCamera.position.y += offsetY;
    }
    shakeIntensity = Math.max(0, shakeIntensity - shakeDecay * dt);
}
```

- [ ] **Step 3: Add stumble tilt to player.js**

In `player.js`, add a stumble tilt inside `updatePlayer`. After the existing tilt logic (line ~63 `playerGroup.rotation.z += ...`), add:

```js
    // Stumble tilt override
    if (state.isStumbling) {
        const stumbleWobble = Math.sin(state.elapsedTime * 20) * 0.15;
        playerGroup.rotation.z += stumbleWobble;
    }
```

Also add hover Y-offset. Replace the idle bob section (lines ~79-82):

```js
    // --- Idle bob or hover ---
    if (!state.isJumping) {
        if (state.isHovering) {
            playerGroup.position.y = 1.5 + Math.sin(state.elapsedTime * 2) * 0.1;
        } else {
            playerGroup.position.y = Math.sin(state.elapsedTime * 3) * 0.04;
        }
    }
```

- [ ] **Step 4: Add stumble indicator to hud.js and CSS**

In `mannheim-skater/css/hud.css`, add at the end:

```css
/* Stumble indicator */
#stumble-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #ff4444;
    font-size: 14px;
    text-shadow: 2px 2px 0 #000;
    pointer-events: none;
    z-index: 15;
    animation: stumblePulse 0.3s ease-in-out;
}

@keyframes stumblePulse {
    0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
}

/* Loading screen */
#loading-screen {
    position: absolute;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #111;
    color: #fff;
    gap: 16px;
    font-family: 'Press Start 2P', monospace;
}

#loading-screen .loading-bar {
    width: 200px;
    height: 12px;
    background: #333;
    border-radius: 6px;
    overflow: hidden;
}

#loading-screen .loading-bar-fill {
    height: 100%;
    background: #0f0;
    width: 0%;
    transition: width 0.2s;
}
```

In `mannheim-skater/js/hud.js`, add:

```js
export function showStumbleIndicator() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const el = document.createElement('div');
    el.id = 'stumble-indicator';
    el.textContent = 'STUMBLE!';
    container.appendChild(el);
    // Auto-remove after animation
    el.addEventListener('animationend', () => el.remove());
}
```

- [ ] **Step 5: Wire stumble + graze into main.js**

In `main.js`, add imports:

```js
import { triggerCameraShake, updateCameraShake } from './scene.js';
import { playGraze } from './audio.js';
import { showStumbleIndicator } from './hud.js';
import { STUMBLE_DURATION, STUMBLE_SPEED_FACTOR, STUMBLE_RECOVERY_DURATION, SCORE_JUMP_OVER } from './config.js';
import { destroyObstacle, getObstacles as getObstaclesList } from './obstacles.js';
```

In the `gameLoop` function, after the existing collision result handling (the `if (collisionResult === 'hit')` block), replace the entire collision handling block with:

```js
        const collisionResult = checkObstacleCollisions(getObstacles());
        if (collisionResult === 'hit') {
            state.isGameOver = true;
            playCrash();
            showGameOver();
        } else if (collisionResult === 'graze') {
            state.isStumbling = true;
            state.stumbleSpeedBackup = state.scrollSpeed;
            state.stumbleTimer = STUMBLE_DURATION;
            state.scrollSpeed *= STUMBLE_SPEED_FACTOR;
            triggerCameraShake(0.3, 0.3);
            playGraze();
            showStumbleIndicator();
        } else if (collisionResult === 'shield-break') {
            triggerCameraShake(0.5, 0.4);
            playCrash();
        } else if (collisionResult === 'bulldozer-hit') {
            const hitObs = getObstaclesList().find(o => o._bulldozerHit);
            if (hitObs) {
                delete hitObs._bulldozerHit;
                destroyObstacle(hitObs, scene);
                state.bonusScore += 10 * state.scoreMultiplier;
            }
        } else if (collisionResult === 'near-miss') {
            state.bonusScore += SCORE_NEAR_MISS * state.scoreMultiplier;
        } else if (collisionResult === 'jump-over') {
            state.bonusScore += SCORE_JUMP_OVER * state.scoreMultiplier;
        }
```

Also add stumble timer update in the gameLoop, after the collision block:

```js
        // Stumble recovery
        if (state.isStumbling) {
            state.stumbleTimer -= dt;
            if (state.stumbleTimer <= 0) {
                state.isStumbling = false;
                // Lerp speed back over STUMBLE_RECOVERY_DURATION
                const targetSpeed = state.stumbleSpeedBackup;
                const recoveryStep = (targetSpeed - state.scrollSpeed) / (STUMBLE_RECOVERY_DURATION / dt);
                state.scrollSpeed = Math.min(targetSpeed, state.scrollSpeed + Math.abs(recoveryStep));
                if (Math.abs(state.scrollSpeed - targetSpeed) < 0.1) {
                    state.scrollSpeed = targetSpeed;
                }
            }
        }
```

Also add camera shake update right before `renderScene()`:

```js
    updateCameraShake(dt);
    updateCameraForPhase(state.phase, state.chunkCount);
    renderScene();
```

- [ ] **Step 6: Verify stumble works**

Refresh browser. Play the game:
- Barely scrape the side of a car → "STUMBLE!" text flashes, camera shakes briefly, speed drops noticeably, recovers after ~1.5s
- Full frontal hit → Game Over as before
- Near-miss (pass close) → Score bonus

- [ ] **Step 7: Commit**

```bash
git add mannheim-skater/js/main.js mannheim-skater/js/player.js mannheim-skater/js/scene.js mannheim-skater/js/audio.js mannheim-skater/js/hud.js mannheim-skater/css/hud.css
git commit -m "feat(mannheim-skater): stumble mechanics with graze, camera shake, speed recovery"
```

---

## Task 6: Powerup Effects Rework

**Files:**
- Modify: `mannheim-skater/js/collectibles.js`
- Modify: `mannheim-skater/js/main.js`
- Modify: `mannheim-skater/js/audio.js`

- [ ] **Step 1: Replace POWERUP_DEFS import in collectibles.js**

Replace the import block at the top of `collectibles.js`. Remove all the individual `POWERUP_*_DURATION` imports and add `POWERUP_DEFS`:

```js
import * as THREE from 'three';
import {
    LANE_POSITIONS, BREZEL_SPAWN_CHANCE, BREZEL_Y_OFFSET,
    BREZEL_ROTATION_SPEED, SCORE_PER_BREZEL,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    LANE_COUNT, PLAYER_BODY_W, JUMP_HEIGHT,
    POWERUP_SPAWN_CHANCE, POWERUP_DEFS,
} from './config.js';
import { state } from './game-state.js';
import { playCollect, playPowerUp } from './audio.js';
```

- [ ] **Step 2: Replace the local POWERUP_DEFS array**

Delete the local `POWERUP_DEFS` array in collectibles.js (currently lines 14-21). It is now imported from config.js.

- [ ] **Step 3: Replace activatePowerUp with effect-based dispatch**

Replace the `activatePowerUp` function:

```js
function activatePowerUp(pu) {
    playPowerUp();

    // Deactivate previous timed powerup if any
    if (state.activePowerUp) {
        deactivatePowerUp(state.activePowerUp.type);
    }

    const def = POWERUP_DEFS.find(d => d.type === pu.type);
    if (!def) return;

    switch (def.effect) {
        case 'shield':
            state.hasShield = true;
            return; // No timer
        case 'slowmo':
            state.timeScale = 0.5;
            break;
        case 'bulldozer':
            state.isBulldozer = true;
            state.scoreMultiplier = 1; // bulldozer has its own scoring
            break;
        case 'magnet':
            // Magnet logic stays in updateCollectibles (existing)
            break;
        case 'scoreblast':
            state.scoreMultiplier = 5;
            break;
        case 'hover':
            state.isHovering = true;
            break;
    }

    if (def.duration > 0) {
        state.activePowerUp = {
            type: def.type,
            effect: def.effect,
            name: def.name,
            remaining: def.duration,
            total: def.duration,
        };
    }
}
```

- [ ] **Step 4: Replace updatePowerUpTimer with deactivation dispatch**

Replace the `updatePowerUpTimer` function:

```js
function deactivatePowerUp(type) {
    const def = POWERUP_DEFS.find(d => d.type === type);
    if (!def) return;

    switch (def.effect) {
        case 'slowmo':
            state.timeScale = 1;
            break;
        case 'bulldozer':
            state.isBulldozer = false;
            state.scoreMultiplier = 1;
            break;
        case 'magnet':
            // Nothing to reset — magnet just checks activePowerUp
            break;
        case 'scoreblast':
            state.scoreMultiplier = 1;
            break;
        case 'hover':
            state.isHovering = false;
            break;
    }
}

export function updatePowerUpTimer(dt) {
    if (!state.activePowerUp) return;
    // Powerup timer uses real dt, not timeScale-adjusted dt
    state.activePowerUp.remaining -= dt;
    if (state.activePowerUp.remaining <= 0) {
        deactivatePowerUp(state.activePowerUp.type);
        state.activePowerUp = null;
    }
}
```

- [ ] **Step 5: Apply timeScale to world/obstacle speed in main.js**

In `main.js` gameLoop, the `dt` used for world scrolling should be scaled, but score and powerup timer should use raw dt. After `const dt = ...` line, add:

```js
    const rawDt = dt; // unscaled for score + powerup timer
    const scaledDt = dt * state.timeScale; // scaled for world movement
```

Then replace these calls to use `scaledDt`:
- `updateWorld(scaledDt, scene);`
- `updateObstacles(scaledDt, scene);`
- `updateCollectibles(scaledDt, scene);`

And keep these with `rawDt`:
- `state.distanceScore += SCORE_DISTANCE_PER_SECOND * state.scoreMultiplier * rawDt;`
- `updatePowerUpTimer(rawDt);`
- `state.elapsedTime += rawDt;`

- [ ] **Step 6: Verify all powerup effects**

Refresh browser. For each powerup, verify:
- **Doener** (brown): Collect it, then crash into an obstacle → survive, shield breaks
- **Eistee** (yellow): Collect → everything slows down noticeably for 5s, score keeps ticking normally
- **Kurpfalz-Rad** (red): Collect → run into obstacles, they fly away with animation, +10 points each
- **Monatsticket** (green): Collect → brezels from other lanes fly to you
- **Graffiti** (purple): Collect → score numbers are 5x bigger for 5s
- **Board-Up** (cyan): Collect → player floats above ground, obstacles pass underneath

- [ ] **Step 7: Commit**

```bash
git add mannheim-skater/js/collectibles.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): reworked powerup effects - slowmo, bulldozer, hover, scoreblast"
```

---

## Task 7: Brezel Formations

**Files:**
- Modify: `mannheim-skater/js/collectibles.js`

- [ ] **Step 1: Add formation imports**

Add to the imports in `collectibles.js`:

```js
import {
    // ... existing imports ...
    BREZEL_FORMATIONS, FORMATION_CHANCE,
} from './config.js';
```

- [ ] **Step 2: Add formation picker function**

Add after the `initCollectibles` function:

```js
function pickFormation() {
    const totalWeight = BREZEL_FORMATIONS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * totalWeight;
    for (const f of BREZEL_FORMATIONS) {
        r -= f.weight;
        if (r <= 0) return f;
    }
    return BREZEL_FORMATIONS[0];
}

function applyLaneOffset(points, offset) {
    return points.map(p => ({ ...p, lane: p.lane + offset }));
}

function formationFitsWithOffset(points, offset) {
    return points.every(p => {
        const lane = p.lane + offset;
        return lane >= 0 && lane < LANE_COUNT;
    });
}
```

- [ ] **Step 3: Add formation-aware spawn function**

Add after the picker:

```js
function spawnFormation(scene, baseVisualZ, obstacles) {
    const formation = pickFormation();
    const points = formation.points;

    // Find valid lane offsets
    const validOffsets = [];
    for (let offset = -(LANE_COUNT - 1); offset <= LANE_COUNT - 1; offset++) {
        if (formationFitsWithOffset(points, offset)) {
            validOffsets.push(offset);
        }
    }
    if (validOffsets.length === 0) return 0;

    // For path formations, prefer lanes away from obstacles
    let chosenOffset;
    if (formation.category === 'path' && obstacles.length > 0) {
        // Find obstacle lanes near this Z
        const nearbyObs = obstacles.filter(o =>
            Math.abs(o.mesh.position.z - baseVisualZ) < 8
        );
        const blockedLanes = new Set();
        nearbyObs.forEach(o => o.lanes.forEach(l => blockedLanes.add(l)));

        // Prefer offset that avoids blocked lanes
        const safeOffsets = validOffsets.filter(offset =>
            points.every(p => !blockedLanes.has(p.lane + offset))
        );
        chosenOffset = safeOffsets.length > 0
            ? safeOffsets[Math.floor(Math.random() * safeOffsets.length)]
            : validOffsets[Math.floor(Math.random() * validOffsets.length)];
    } else {
        chosenOffset = validOffsets[Math.floor(Math.random() * validOffsets.length)];
    }

    const offsetPoints = applyLaneOffset(points, chosenOffset);
    let maxZ = 0;

    for (const p of offsetPoints) {
        const mesh = new THREE.Mesh(brezelGeo, brezelMat);
        const y = p.y !== undefined ? p.y : BREZEL_Y_OFFSET;
        mesh.position.set(LANE_POSITIONS[p.lane], y, baseVisualZ + p.z);
        mesh.castShadow = true;
        scene.add(mesh);
        brezels.push({ mesh, lane: p.lane, collected: false });
        maxZ = Math.max(maxZ, p.z);
    }

    return maxZ; // Return the Z extent of the formation
}
```

- [ ] **Step 4: Replace brezel spawn logic in updateCollectibles**

In `updateCollectibles`, find the brezel spawn section (currently around the comment `// Spawn new rows`). Replace it:

```js
    // Spawn new rows — formation or random
    const visualSpawnZ = nextBrezelZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        if (Math.random() < BREZEL_SPAWN_CHANCE) {
            if (Math.random() < FORMATION_CHANCE) {
                // Formation spawn
                const extent = spawnFormation(scene, visualSpawnZ, obstacles);
                nextBrezelZ += extent + 3 + Math.random() * 4;
            } else {
                // Random scatter (original behavior)
                spawnBrezelRow(scene, visualSpawnZ);
                nextBrezelZ += 3 + Math.random() * 4;
            }
        } else {
            nextBrezelZ += 3 + Math.random() * 4;
        }
    }
```

- [ ] **Step 5: Import getObstacles for formation-obstacle coupling**

Add to imports in `collectibles.js`:

```js
import { getObstacles } from './obstacles.js';
```

Then pass `getObstacles()` to `spawnFormation`. Update the call:

```js
const extent = spawnFormation(scene, visualSpawnZ, getObstacles());
```

- [ ] **Step 6: Verify formations**

Refresh browser. Play the game. You should see:
- Brezels sometimes appear in recognizable patterns (lines, diagonals, V-shapes, arcs)
- Some formations have brezels floating higher (jump arcs)
- Lines often appear on lanes that don't have obstacles nearby
- Random scatter still occurs ~30% of the time

- [ ] **Step 7: Commit**

```bash
git add mannheim-skater/js/collectibles.js
git commit -m "feat(mannheim-skater): brezel formations with obstacle-aware path placement"
```

---

## Task 8: GLB Model Pipeline

**Files:**
- Create: `mannheim-skater/js/models.js`
- Modify: `mannheim-skater/index.html`
- Modify: `mannheim-skater/js/world.js`
- Modify: `mannheim-skater/js/main.js`

- [ ] **Step 1: Optimize the GLB file**

Run in terminal (installs gltf-transform if needed, then optimizes):

```bash
npx --yes @gltf-transform/cli optimize \
  /Users/gerorawert/Downloads/universitat_mannheim.glb \
  /Users/gerorawert/Documents/Github/MrTrewar.github.io/mannheim-skater/assets/models/schloss_optimized.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024 \
  --simplify \
  --simplify-ratio 0.1 \
  --weld 0.0001 \
  --prune
```

If this produces an error about dependencies, try a simpler approach:

```bash
npx --yes @gltf-transform/cli draco \
  /Users/gerorawert/Downloads/universitat_mannheim.glb \
  /Users/gerorawert/Documents/Github/MrTrewar.github.io/mannheim-skater/assets/models/schloss_optimized.glb
```

Verify the output size is under 20MB. If it's still too large, try:

```bash
npx --yes @gltf-transform/cli simplify \
  /Users/gerorawert/Documents/Github/MrTrewar.github.io/mannheim-skater/assets/models/schloss_optimized.glb \
  /Users/gerorawert/Documents/Github/MrTrewar.github.io/mannheim-skater/assets/models/schloss_optimized.glb \
  --ratio 0.05
```

- [ ] **Step 2: Extend importmap in index.html**

In `mannheim-skater/index.html`, replace the importmap (lines 9-15):

```html
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
        }
    }
    </script>
```

- [ ] **Step 3: Add loading screen HTML**

In `mannheim-skater/index.html`, add this as the first child of `#game-container` (before the `<!-- Three.js canvas -->` comment):

```html
        <div id="loading-screen">
            <div>MANNHEIM SKATER</div>
            <div style="font-size:10px;">Laden...</div>
            <div class="loading-bar"><div class="loading-bar-fill" id="loading-fill"></div></div>
        </div>
```

- [ ] **Step 4: Create models.js**

Create `mannheim-skater/js/models.js`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODEL_DEFS } from './config.js';

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

const cache = {};

export function loadModel(key, onProgress) {
    if (cache[key]) return Promise.resolve(cache[key].clone());

    const def = MODEL_DEFS[key];
    if (!def) return Promise.reject(new Error(`Unknown model key: ${key}`));

    return new Promise((resolve, reject) => {
        loader.load(
            def.path,
            (gltf) => {
                const model = gltf.scene;
                if (def.scale) model.scale.setScalar(def.scale);
                if (def.rotation) {
                    if (def.rotation.x) model.rotation.x = def.rotation.x;
                    if (def.rotation.y) model.rotation.y = def.rotation.y;
                    if (def.rotation.z) model.rotation.z = def.rotation.z;
                }
                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                cache[key] = model;
                resolve(model.clone());
            },
            (progress) => {
                if (onProgress && progress.total > 0) {
                    onProgress(progress.loaded / progress.total);
                }
            },
            (err) => {
                console.warn(`Failed to load model "${key}":`, err);
                reject(err);
            }
        );
    });
}

export async function preloadAllModels(onProgress) {
    const keys = Object.keys(MODEL_DEFS);
    let loaded = 0;
    for (const key of keys) {
        try {
            await loadModel(key, (fraction) => {
                if (onProgress) onProgress((loaded + fraction) / keys.length);
            });
            loaded++;
        } catch (e) {
            console.warn(`Skipping model "${key}" — will use fallback`);
            loaded++;
        }
    }
    if (onProgress) onProgress(1);
}

export function getCachedModel(key) {
    return cache[key] ? cache[key].clone() : null;
}
```

- [ ] **Step 5: Update world.js to use GLB Schloss**

In `world.js`, add import at the top:

```js
import { getCachedModel } from './models.js';
```

Replace the `createSchloss` function:

```js
function createSchloss(scene) {
    // Try to use loaded GLB model
    const glbModel = getCachedModel('schloss');
    if (glbModel) {
        glbModel.position.set(0, 0, -12);
        scene.add(glbModel);
        return glbModel;
    }

    // Fallback: box primitives (original implementation)
    const schloss = new THREE.Group();
    const sandstone = 0xf0e6c8;
    const darkStone = 0xc8b896;

    const mainGeo = new THREE.BoxGeometry(12, 3, 4);
    const mainMat = new THREE.MeshStandardMaterial({ color: sandstone });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.y = 1.5;
    main.castShadow = true;
    main.receiveShadow = true;
    schloss.add(main);

    const wingGeo = new THREE.BoxGeometry(3, 2.5, 3);
    const wingMat = new THREE.MeshStandardMaterial({ color: sandstone });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-7, 1.25, 0);
    leftWing.castShadow = true;
    schloss.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(7, 1.25, 0);
    rightWing.castShadow = true;
    schloss.add(rightWing);

    const towerGeo = new THREE.BoxGeometry(2, 5, 2);
    const towerMat = new THREE.MeshStandardMaterial({ color: darkStone });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 2.5, 0);
    tower.castShadow = true;
    schloss.add(tower);

    const roofGeo = new THREE.ConeGeometry(1.8, 1.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x556655 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.75, 0);
    roof.castShadow = true;
    schloss.add(roof);

    schloss.position.set(0, 0, -12);
    scene.add(schloss);
    return schloss;
}
```

- [ ] **Step 6: Add preload + loading screen to main.js**

In `main.js`, add import:

```js
import { preloadAllModels } from './models.js';
```

Replace the `init()` function:

```js
async function init() {
    const container = document.getElementById('game-container');
    const loadingFill = document.getElementById('loading-fill');
    const loadingScreen = document.getElementById('loading-screen');

    // Preload models with progress bar
    await preloadAllModels((fraction) => {
        if (loadingFill) loadingFill.style.width = `${fraction * 100}%`;
    });

    // Hide loading screen
    if (loadingScreen) loadingScreen.style.display = 'none';

    initScene(container);
    const scene = getScene();

    resetState();
    initWorld(scene);
    initObstacles();
    initCollectibles();
    createPlayer(scene);
    initInput();

    window.addEventListener('game-restart', () => restart());

    requestAnimationFrame(gameLoop);
}
```

- [ ] **Step 7: Verify GLB loads (or fallback works)**

Refresh browser.
- If the GLB optimization succeeded and the file exists: You should see a loading bar, then the game starts with the real Schloss model behind the player
- If the GLB is missing or failed: Loading bar fills instantly, game starts with the box-primitive Schloss (no error, no crash)

- [ ] **Step 8: Commit**

```bash
git add mannheim-skater/js/models.js mannheim-skater/js/world.js mannheim-skater/js/main.js mannheim-skater/index.html mannheim-skater/css/hud.css
# Only add the GLB if it exists and is < 20MB
if [ -f mannheim-skater/assets/models/schloss_optimized.glb ] && [ $(stat -f%z mannheim-skater/assets/models/schloss_optimized.glb) -lt 20000000 ]; then
    git add mannheim-skater/assets/models/schloss_optimized.glb
fi
git commit -m "feat(mannheim-skater): GLB model loader, loading screen, Schloss integration with fallback"
```

---

## Verification Checklist

After all tasks are complete, run through this end-to-end:

- [ ] Game loads with loading screen (shows progress bar)
- [ ] Obstacles include cylinders (poller, ampel) and boxes
- [ ] Tram (red, large) moves toward player faster than scroll speed
- [ ] Radfahrer (green) moves toward player
- [ ] Side-swiping a car shows "STUMBLE!", camera shakes, speed drops, recovers
- [ ] Frontal collision = Game Over
- [ ] Doener shield absorbs one frontal hit
- [ ] Eistee slows everything down for 5s (score still ticks)
- [ ] Kurpfalz-Rad destroys obstacles on contact with fling animation
- [ ] Monatsticket pulls brezels from all lanes
- [ ] Graffiti gives 5x score multiplier
- [ ] Board-Up makes player hover above obstacles
- [ ] Brezels appear in formations (lines, diagonals, arcs, diamonds)
- [ ] Path formations guide player away from obstacles
- [ ] Jump-arc formations have elevated brezels
- [ ] Schloss is either GLB model or box-primitive fallback
- [ ] No console errors during normal gameplay
