# Schloss-to-Planken Route — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Schloss start area with isometric camera, a playable right turn at chunk 30 with camera rotation, and transition to Subway-Surfers-style chase cam on the Planken as an endless runner.

**Architecture:** The world always scrolls in the Z-direction — the "turn" is purely a camera effect. A dual-camera system (OrthographicCamera for iso, PerspectiveCamera for chase) smoothly transitions during 5 turn chunks. Game state tracks `phase` (schloss/turn/planken) and `chunkCount`. Only config.js, game-state.js, scene.js, world.js, and main.js need changes. All gameplay modules (player, obstacles, collectibles, collision, input) remain untouched.

**Tech Stack:** Three.js (existing CDN), Vanilla JS ES modules

**Spec:** `docs/superpowers/specs/2026-04-08-schloss-planken-route-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `mannheim-skater/js/config.js` | Add route phase constants and chase-cam tuning values |
| `mannheim-skater/js/game-state.js` | Add `phase`, `chunkCount` fields and reset logic |
| `mannheim-skater/js/scene.js` | Dual-camera system: iso + chase, transition logic, phase-aware update |
| `mannheim-skater/js/world.js` | Chunk counter, Schloss landmark at start, Wasserturm at turn, phase triggers |
| `mannheim-skater/js/main.js` | Pass phase info to camera update in game loop |

---

## Task 1: Add Route Constants to Config

**Files:**
- Modify: `mannheim-skater/js/config.js:36-39` (after Camera section)

**Goal:** Add all constants needed for the route phases and chase camera.

- [ ] **Step 1: Add route phase and chase-cam constants to `mannheim-skater/js/config.js`**

Add after the existing Camera constants (after line 39 `export const CAM_LOOK_AHEAD = 4;`):

```js
// Route phases
export const TURN_CHUNK = 30;              // chunk index where the turn starts
export const TURN_DURATION_CHUNKS = 5;     // how many chunks the turn lasts

// Chase camera (Phase 3: Planken — Subway Surfers style)
export const CHASE_CAM_FOV = 60;
export const CHASE_CAM_Y = 3;              // height above player
export const CHASE_CAM_Z = 5;              // distance behind player
export const CHASE_CAM_LOOK_AHEAD = 8;     // look-ahead distance in front of player
```

- [ ] **Step 2: Verify no syntax errors**

Run: Open `mannheim-skater/index.html` in browser, check console for import errors.
Expected: No errors. Game runs as before (new constants are unused so far).

- [ ] **Step 3: Commit**

```bash
git add mannheim-skater/js/config.js
git commit -m "feat(mannheim-skater): add route phase and chase-cam constants"
```

---

## Task 2: Add Phase Tracking to Game State

**Files:**
- Modify: `mannheim-skater/js/game-state.js`

**Goal:** Track which phase the game is in (schloss/turn/planken) and how many chunks have been created.

- [ ] **Step 1: Add phase and chunkCount to state object in `mannheim-skater/js/game-state.js`**

Add these two fields inside the `state` object, after the `lastZoneChangeScore: 0,` line (line 33):

```js
    // Route phase
    phase: 'schloss',    // 'schloss' | 'turn' | 'planken'
    chunkCount: 0,       // total chunks created since game start
```

- [ ] **Step 2: Add phase reset to `resetState()` in `mannheim-skater/js/game-state.js`**

Add these two lines inside `resetState()`, after `state.lastZoneChangeScore = 0;` (line 57):

```js
    state.phase = 'schloss';
    state.chunkCount = 0;
```

- [ ] **Step 3: Verify no syntax errors**

Run: Open game in browser, check console.
Expected: No errors. Game runs as before.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/game-state.js
git commit -m "feat(mannheim-skater): add phase and chunkCount to game state"
```

---

## Task 3: Dual-Camera System in Scene

**Files:**
- Modify: `mannheim-skater/js/scene.js`

**Goal:** Add a PerspectiveCamera for chase mode. Provide a `updateCameraForPhase()` function that smoothly transitions between iso and chase based on the current phase and turn progress.

- [ ] **Step 1: Add imports for chase-cam constants at top of `mannheim-skater/js/scene.js`**

Replace the existing import line (line 2):

```js
import { CAM_FRUSTUM_SIZE, CAM_OFFSET_Y, CAM_OFFSET_Z, GROUND_WIDTH } from './config.js';
```

with:

```js
import {
    CAM_FRUSTUM_SIZE, CAM_OFFSET_Y, CAM_OFFSET_Z, GROUND_WIDTH,
    CHASE_CAM_FOV, CHASE_CAM_Y, CHASE_CAM_Z, CHASE_CAM_LOOK_AHEAD,
    TURN_CHUNK, TURN_DURATION_CHUNKS,
} from './config.js';
```

- [ ] **Step 2: Add chaseCamera variable and create it in `initScene()`**

Add `let chaseCamera;` after the existing `let` declarations (after line 5):

```js
let chaseCamera;
```

Inside `initScene()`, after the directional light is added to the scene (after `scene.add(directionalLight);` on line 48), add:

```js
    // Chase camera (used in Planken phase)
    chaseCamera = new THREE.PerspectiveCamera(
        CHASE_CAM_FOV,
        container.clientWidth / container.clientHeight,
        0.1, 100
    );
```

- [ ] **Step 3: Update the resize handler to also update chaseCamera**

Inside the `resizeHandler` function, after `renderer.setSize(container.clientWidth, container.clientHeight);`, add:

```js
        if (chaseCamera) {
            chaseCamera.aspect = container.clientWidth / container.clientHeight;
            chaseCamera.updateProjectionMatrix();
        }
```

- [ ] **Step 4: Add `updateCameraForPhase()` function**

Add this new exported function after the existing `updateCamera()` function (after line 77):

```js
export function updateCameraForPhase(phase, chunkCount) {
    if (phase === 'schloss') {
        // Isometric camera — same as existing behavior
        camera.position.set(CAM_OFFSET_Z, CAM_OFFSET_Y, CAM_OFFSET_Z);
        camera.lookAt(0, 0, 4);
        directionalLight.position.set(5, 10, 7);
        directionalLight.target.position.set(0, 0, 0);
        directionalLight.target.updateMatrixWorld();
        activeCamera = camera; // ortho
        return;
    }

    if (phase === 'planken') {
        // Chase camera — behind and above player
        chaseCamera.position.set(0, CHASE_CAM_Y, -CHASE_CAM_Z);
        chaseCamera.lookAt(0, 0.5, CHASE_CAM_LOOK_AHEAD);
        directionalLight.position.set(0, 10, 5);
        directionalLight.target.position.set(0, 0, 3);
        directionalLight.target.updateMatrixWorld();
        activeCamera = chaseCamera;
        return;
    }

    // phase === 'turn': smooth transition
    const t = Math.max(0, Math.min(1, (chunkCount - TURN_CHUNK) / TURN_DURATION_CHUNKS));
    // Smooth step for easing
    const s = t * t * (3 - 2 * t);

    // Interpolate camera position
    const isoPos = { x: CAM_OFFSET_Z, y: CAM_OFFSET_Y, z: CAM_OFFSET_Z };
    const chasePos = { x: 0, y: CHASE_CAM_Y, z: -CHASE_CAM_Z };

    const cx = isoPos.x + (chasePos.x - isoPos.x) * s;
    const cy = isoPos.y + (chasePos.y - isoPos.y) * s;
    const cz = isoPos.z + (chasePos.z - isoPos.z) * s;

    // Interpolate lookAt target
    const isoLook = { x: 0, y: 0, z: 4 };
    const chaseLook = { x: 0, y: 0.5, z: CHASE_CAM_LOOK_AHEAD };

    const lx = isoLook.x + (chaseLook.x - isoLook.x) * s;
    const ly = isoLook.y + (chaseLook.y - isoLook.y) * s;
    const lz = isoLook.z + (chaseLook.z - isoLook.z) * s;

    // Switch camera at midpoint
    if (t < 0.5) {
        camera.position.set(cx, cy, cz);
        camera.lookAt(lx, ly, lz);
        activeCamera = camera;
    } else {
        chaseCamera.position.set(cx, cy, cz);
        chaseCamera.lookAt(lx, ly, lz);
        activeCamera = chaseCamera;
    }

    directionalLight.position.set(cx * 0.5, 10, cz + 5);
    directionalLight.target.position.set(0, 0, lz - 2);
    directionalLight.target.updateMatrixWorld();
}
```

- [ ] **Step 5: Add `activeCamera` variable and update `renderScene()`**

Add `let activeCamera;` after the other `let` declarations at the top:

```js
let activeCamera;
```

Inside `initScene()`, after creating the chaseCamera, add:

```js
    activeCamera = camera; // start with ortho
```

Replace the existing `renderScene()` function:

```js
export function renderScene() {
    renderer.render(scene, activeCamera);
}
```

- [ ] **Step 6: Remove old `updateCamera()` function**

Delete the old `updateCamera()` function (lines 70-77):

```js
export function updateCamera(playerZ) {
    camera.position.z = playerZ + CAM_OFFSET_Z;
    camera.position.x = CAM_OFFSET_Z; // fixed X offset for iso angle
    camera.lookAt(0, 0, playerZ + 4); // look ahead of player
    directionalLight.position.set(5, 10, playerZ + 7);
    directionalLight.target.position.set(0, 0, playerZ);
    directionalLight.target.updateMatrixWorld();
}
```

- [ ] **Step 7: Export `updateCameraForPhase` instead of `updateCamera` in the exports**

The `getCamera()` export can remain for backward compatibility. Also export a getter for activeCamera:

```js
export function getActiveCamera() { return activeCamera; }
```

- [ ] **Step 8: Verify no syntax errors**

Run: Open game in browser. Since `main.js` still calls `updateCamera(0)`, it will error. That's expected — we fix it in Task 5.

- [ ] **Step 9: Commit**

```bash
git add mannheim-skater/js/scene.js
git commit -m "feat(mannheim-skater): add dual-camera system with iso/chase transition"
```

---

## Task 4: Schloss Landmark + Wasserturm + Phase Triggers in World

**Files:**
- Modify: `mannheim-skater/js/world.js`

**Goal:** Add a Schloss deco object at the start, a Wasserturm at the turn chunk, count chunks, and trigger phase transitions.

- [ ] **Step 1: Add config imports for route constants in `mannheim-skater/js/world.js`**

Update the import from `./config.js` (line 3) to include the new constants. Replace:

```js
import {
    GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE,
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    SCROLL_SPEED_INCREMENT, SPEED_INCREASE_INTERVAL, SCROLL_SPEED_MAX,
    ZONES, ZONE_CHANGE_INTERVAL,
    QUADRATE_LETTERS, QUADRATE_MAX_NUMBER, NIGHT_MODE_SCORE,
} from './config.js';
```

with:

```js
import {
    GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE,
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    SCROLL_SPEED_INCREMENT, SPEED_INCREASE_INTERVAL, SCROLL_SPEED_MAX,
    ZONES, ZONE_CHANGE_INTERVAL,
    QUADRATE_LETTERS, QUADRATE_MAX_NUMBER, NIGHT_MODE_SCORE,
    TURN_CHUNK, TURN_DURATION_CHUNKS,
} from './config.js';
```

- [ ] **Step 2: Add `createSchloss()` function**

Add this function after the `getZoneBuildingColor()` function (after line 193):

```js
function createSchloss(scene) {
    const schloss = new THREE.Group();
    const sandstone = 0xf0e6c8;
    const darkStone = 0xc8b896;

    // Main building — wide, flat block
    const mainGeo = new THREE.BoxGeometry(12, 3, 4);
    const mainMat = new THREE.MeshStandardMaterial({ color: sandstone });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.y = 1.5;
    main.castShadow = true;
    main.receiveShadow = true;
    schloss.add(main);

    // Left wing
    const wingGeo = new THREE.BoxGeometry(3, 2.5, 3);
    const wingMat = new THREE.MeshStandardMaterial({ color: sandstone });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-7, 1.25, 0);
    leftWing.castShadow = true;
    schloss.add(leftWing);

    // Right wing
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(7, 1.25, 0);
    rightWing.castShadow = true;
    schloss.add(rightWing);

    // Central tower
    const towerGeo = new THREE.BoxGeometry(2, 5, 2);
    const towerMat = new THREE.MeshStandardMaterial({ color: darkStone });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 2.5, 0);
    tower.castShadow = true;
    schloss.add(tower);

    // Tower roof (pyramid-like)
    const roofGeo = new THREE.ConeGeometry(1.8, 1.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x556655 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.75, 0);
    roof.castShadow = true;
    schloss.add(roof);

    // Position behind player start
    schloss.position.set(0, 0, -12);

    scene.add(schloss);
    return schloss;
}
```

- [ ] **Step 3: Add `createWasserturm()` function**

Add this function after `createSchloss()`:

```js
function createWasserturm(parent) {
    const turm = new THREE.Group();
    const sandstone = 0xd4c0a0;

    // Tower body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.4, 6, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: sandstone });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3;
    body.castShadow = true;
    turm.add(body);

    // Dome on top
    const domeGeo = new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x668866 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 6;
    dome.castShadow = true;
    turm.add(dome);

    // Base platform
    const baseGeo = new THREE.BoxGeometry(4, 0.5, 4);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25;
    turm.add(base);

    // Position to the right side of the road
    turm.position.set(GROUND_WIDTH / 2 + 4, 0, 0);

    parent.add(turm);
}
```

- [ ] **Step 4: Track chunk count and spawn landmarks in `addChunk()`**

In the `addChunk()` function, add chunk counting and landmark spawning. After the line `groundChunks.push(group);` (line 76) and before `nextChunkZ += GROUND_CHUNK_DEPTH;` (line 77), add:

```js
    state.chunkCount++;
```

Also, in `initWorld()`, after `resetBlockState();` and before the `for` loop, add the Schloss:

```js
    createSchloss(scene);
```

In `addChunk()`, right after `scene.add(group);` and before `groundChunks.push(group);`, add the Wasserturm spawn:

```js
    // Spawn Wasserturm landmark at the turn point
    if (state.chunkCount === TURN_CHUNK) {
        createWasserturm(group);
    }
```

- [ ] **Step 5: Add phase transition logic in `updateWorld()`**

In `updateWorld()`, after the speed-increase block (after line 89 `}`), add:

```js
    // Phase transitions based on chunk count
    if (state.phase === 'schloss' && state.chunkCount >= TURN_CHUNK) {
        state.phase = 'turn';
    }
    if (state.phase === 'turn' && state.chunkCount >= TURN_CHUNK + TURN_DURATION_CHUNKS) {
        state.phase = 'planken';
    }
```

- [ ] **Step 6: Verify no syntax errors**

Run: Open game in browser. The Schloss should be visible behind the player at start. The game will error on `updateCamera` call in main.js — that's expected, fixed in Task 5.

- [ ] **Step 7: Commit**

```bash
git add mannheim-skater/js/world.js
git commit -m "feat(mannheim-skater): add Schloss + Wasserturm landmarks and phase transitions"
```

---

## Task 5: Wire Phase-Aware Camera into Game Loop

**Files:**
- Modify: `mannheim-skater/js/main.js`

**Goal:** Replace the old `updateCamera(0)` call with the new `updateCameraForPhase()` that uses the current game phase and chunk count.

- [ ] **Step 1: Update imports in `mannheim-skater/js/main.js`**

Replace the import from `./scene.js` (line 1):

```js
import { initScene, updateCamera, renderScene, getScene, setNightMode } from './scene.js';
```

with:

```js
import { initScene, updateCameraForPhase, renderScene, getScene, setNightMode } from './scene.js';
```

- [ ] **Step 2: Replace `updateCamera(0)` call in game loop**

Replace line 104:

```js
    updateCamera(0); // player stays at Z=0 visually, world scrolls
```

with:

```js
    updateCameraForPhase(state.phase, state.chunkCount);
```

- [ ] **Step 3: Verify in browser — full integration test**

Run: Open `mannheim-skater/index.html` in browser.

Expected behavior:
1. Game starts — Schloss visible behind the player, isometric camera as before
2. Play normally — obstacles, brezels, power-ups work as before
3. After ~30 chunks (~24 seconds at base speed), the camera starts rotating
4. Over ~5 chunks, camera smoothly transitions from isometric to chase-cam (behind player)
5. After the transition completes, the game continues as an endless runner with chase-cam
6. Wasserturm is visible on the right side during the turn
7. All gameplay mechanics (lane switch, jump, collision, scoring) work identically
8. Game over + restart resets back to Schloss with iso camera

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): wire phase-aware camera into game loop"
```

---

## Task 6: Tuning + Polish

**Files:**
- Modify: `mannheim-skater/js/scene.js` (camera tuning if needed)
- Modify: `mannheim-skater/js/config.js` (constant adjustments)
- Modify: `mannheim-skater/js/world.js` (zone override for Planken after turn)

**Goal:** Fine-tune the camera transition, ensure the Planken zone activates after the turn, and make the Schloss phase use its own building style.

- [ ] **Step 1: Force Planken zone after the turn in `mannheim-skater/js/world.js`**

In the `checkZoneChange()` function, add a phase override at the top of the function body. Replace the entire function:

```js
export function checkZoneChange() {
    // After the turn, force Planken zone
    if (state.phase === 'planken' || state.phase === 'turn') {
        if (state.currentZoneIndex !== 0) {
            state.currentZoneIndex = 0; // Planken zone (index 0)
        }
        return;
    }
    const targetZone = Math.floor(state.score / ZONE_CHANGE_INTERVAL) % ZONES.length;
    if (targetZone !== state.currentZoneIndex) {
        state.currentZoneIndex = targetZone;
        state.lastZoneChangeScore = state.score;
    }
}
```

- [ ] **Step 2: Verify Planken zone activates after turn**

Run: Open game, play until the turn. After the camera transition, new ground chunks should be beige (Planken cobblestone color 0xd4c5a0) and buildings should be cream-colored.

- [ ] **Step 3: Final full playthrough test**

Test the complete flow:
1. Start: Schloss visible, isometric camera, obstacles spawn immediately
2. Play through ~30 chunks of Schloss phase
3. Turn begins: camera starts rotating, Wasserturm visible
4. Turn completes: chase-cam active, Planken zone
5. Endless runner continues: speed increases, zones don't change (locked to Planken), power-ups work
6. Game over: shows leaderboard, can submit score
7. Restart: resets to Schloss with iso camera
8. Mobile: swipe + tap controls work in both camera modes

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/world.js mannheim-skater/js/scene.js mannheim-skater/js/config.js
git commit -m "feat(mannheim-skater): add Planken zone lock after turn and polish"
```
