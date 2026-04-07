# Mannheim Skater — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isometric endless-runner game (Crossy Road meets Subway Surfers) set in Mannheim, using Three.js for 3D rendering.

**Architecture:** ES modules with `<script type="module">`. Three.js loaded via CDN importmap. Game state is a shared object exported from `game-state.js`. The game loop lives in `main.js` and calls update/render on each subsystem. DOM-based HUD overlays the Three.js canvas.

**Tech Stack:** Three.js (CDN), Vanilla JS (ES modules), HTML/CSS HUD overlay, Supabase (leaderboard)

**Spec:** `docs/superpowers/specs/2026-04-07-mannheim-skater-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `mannheim-skater/index.html` | Entry point: canvas container, HUD DOM, importmap for Three.js, loads `main.js` |
| `mannheim-skater/css/hud.css` | HUD overlay styling (score, power-up bar, game over screen) |
| `mannheim-skater/js/config.js` | All tuning constants: lanes, speed, obstacles, power-ups, zones |
| `mannheim-skater/js/game-state.js` | Shared mutable game state object (score, speed, active power-ups, zone, etc.) |
| `mannheim-skater/js/scene.js` | Three.js renderer, isometric OrthographicCamera, lights, resize handling |
| `mannheim-skater/js/player.js` | Player Group mesh (body + board), lane switching lerp, jump, idle bob |
| `mannheim-skater/js/input.js` | Keyboard + touch/swipe handler, emits actions to game state |
| `mannheim-skater/js/world.js` | Ground chunk generation/recycling, zone transitions, side decorations |
| `mannheim-skater/js/obstacles.js` | Obstacle pool, spawning logic, type definitions, difficulty curve |
| `mannheim-skater/js/collectibles.js` | Brezel + power-up spawning, collection detection, power-up effect activation |
| `mannheim-skater/js/collision.js` | AABB collision checks between player and obstacles/collectibles |
| `mannheim-skater/js/hud.js` | DOM updates: score, power-up countdown bar, game over screen |
| `mannheim-skater/js/audio.js` | Sound effect loading and playback |
| `mannheim-skater/js/main.js` | Game loop (`requestAnimationFrame`), init, restart, ties all modules together |

---

## Task 1: Project Scaffold + Three.js Scene

**Files:**
- Create: `mannheim-skater/index.html`
- Create: `mannheim-skater/css/hud.css`
- Create: `mannheim-skater/js/config.js`
- Create: `mannheim-skater/js/scene.js`
- Create: `mannheim-skater/js/main.js`

**Goal:** Empty isometric 3D scene with a green ground plane, visible in the browser.

- [ ] **Step 1: Create `mannheim-skater/js/config.js`**

```js
// mannheim-skater/js/config.js

// Lane system
export const LANE_COUNT = 5;
export const LANE_WIDTH = 1.2;
export const LANE_GAP = 0.1;
export const LANE_POSITIONS = [];
for (let i = 0; i < LANE_COUNT; i++) {
    LANE_POSITIONS.push((i - Math.floor(LANE_COUNT / 2)) * (LANE_WIDTH + LANE_GAP));
}
// Result: [-2.6, -1.3, 0, 1.3, 2.6]

// Player
export const PLAYER_BODY_W = 0.6;
export const PLAYER_BODY_H = 1.0;
export const PLAYER_BODY_D = 0.4;
export const PLAYER_BOARD_W = 0.8;
export const PLAYER_BOARD_H = 0.08;
export const PLAYER_BOARD_D = 0.3;
export const PLAYER_START_LANE = 2; // middle lane (0-indexed)
export const PLAYER_Y_OFFSET = 0.54; // body center Y above ground
export const LANE_SWITCH_DURATION = 0.15; // seconds
export const JUMP_HEIGHT = 2.0;
export const JUMP_DURATION = 0.5; // seconds

// World scrolling
export const SCROLL_SPEED_START = 5.0; // units per second
export const SCROLL_SPEED_MAX = 20.0;
export const SCROLL_SPEED_INCREMENT = 0.25; // per 10 seconds
export const SPEED_INCREASE_INTERVAL = 10; // seconds

// Ground
export const GROUND_CHUNK_DEPTH = 4;
export const GROUND_CHUNKS_VISIBLE = 12;
export const GROUND_WIDTH = LANE_COUNT * (LANE_WIDTH + LANE_GAP) + 4; // extra for sidewalks

// Camera
export const CAM_FRUSTUM_SIZE = 10;
export const CAM_OFFSET_Y = 10;
export const CAM_OFFSET_Z = 10;
export const CAM_LOOK_AHEAD = 4; // look slightly ahead of player

// Obstacles
export const OBSTACLE_SPAWN_DISTANCE = 30; // spawn this far ahead of player
export const OBSTACLE_DESPAWN_DISTANCE = 10; // remove when this far behind player
export const OBSTACLE_MIN_GAP = 6; // minimum Z gap between obstacle rows
export const OBSTACLE_MAX_GAP = 14;

// Collectibles
export const BREZEL_SPAWN_CHANCE = 0.6; // chance per row to spawn brezels
export const BREZEL_Y_OFFSET = 0.6; // float above ground
export const BREZEL_ROTATION_SPEED = 2.0; // radians per second
export const POWERUP_SPAWN_CHANCE = 0.08; // per row

// Scoring
export const SCORE_PER_BREZEL = 1;
export const SCORE_DISTANCE_PER_SECOND = 1; // base distance score per second
export const SCORE_NEAR_MISS = 5;
export const SCORE_JUMP_OVER = 3;

// Power-up durations (seconds)
export const POWERUP_EISTEE_DURATION = 5;
export const POWERUP_RAD_DURATION = 10;
export const POWERUP_TICKET_DURATION = 8;
export const POWERUP_SPRAY_DURATION = 5;
export const POWERUP_BOARD_DURATION = 10;

// Zones
export const ZONE_CHANGE_INTERVAL = 500; // score points between zone changes
export const ZONES = [
    {
        id: 'planken',
        name: 'Planken',
        groundColor: 0xd4c5a0, // beige cobblestone
        ambientColor: 0xfff8e7,
        fogColor: 0xf5efe0,
    },
    {
        id: 'jungbusch',
        name: 'Jungbusch',
        groundColor: 0x555555, // dark asphalt
        ambientColor: 0xdde0e8,
        fogColor: 0xc8cdd6,
    },
    {
        id: 'hafen',
        name: 'Hafen',
        groundColor: 0x888888, // concrete grey
        ambientColor: 0xe0e0e0,
        fogColor: 0xd0d0d0,
    },
    {
        id: 'luisenpark',
        name: 'Luisenpark',
        groundColor: 0x4a8c3f, // grass green
        ambientColor: 0xeeffee,
        fogColor: 0xd8f0d0,
    },
];
```

- [ ] **Step 2: Create `mannheim-skater/js/scene.js`**

```js
// mannheim-skater/js/scene.js
import * as THREE from 'three';
import { CAM_FRUSTUM_SIZE, CAM_OFFSET_Y, CAM_OFFSET_Z, GROUND_WIDTH } from './config.js';

let scene, camera, renderer;
let ambientLight, directionalLight;

export function initScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5efe0);
    scene.fog = new THREE.Fog(0xf5efe0, 20, 50);

    // Isometric orthographic camera
    const aspect = container.clientWidth / container.clientHeight;
    const frustum = CAM_FRUSTUM_SIZE;
    camera = new THREE.OrthographicCamera(
        -frustum * aspect, frustum * aspect,
        frustum, -frustum,
        0.1, 100
    );

    // Isometric angle: rotate around Y by 45deg, then tilt X by ~35.264deg
    camera.position.set(CAM_OFFSET_Z, CAM_OFFSET_Y, CAM_OFFSET_Z);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    // Handle resize
    window.addEventListener('resize', () => {
        const a = container.clientWidth / container.clientHeight;
        camera.left = -frustum * a;
        camera.right = frustum * a;
        camera.top = frustum;
        camera.bottom = -frustum;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    return { scene, camera, renderer };
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }

export function updateCamera(playerZ) {
    camera.position.z = playerZ + CAM_OFFSET_Z;
    camera.position.x = CAM_OFFSET_Z; // fixed X offset for iso angle
    camera.lookAt(0, 0, playerZ + 4); // look ahead of player
    directionalLight.position.set(5, 10, playerZ + 7);
    directionalLight.target.position.set(0, 0, playerZ);
    directionalLight.target.updateMatrixWorld();
}

export function renderScene() {
    renderer.render(scene, camera);
}
```

- [ ] **Step 3: Create `mannheim-skater/js/main.js`**

```js
// mannheim-skater/js/main.js
import { initScene, updateCamera, renderScene } from './scene.js';
import * as THREE from 'three';
import { GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE } from './config.js';

let lastTime = 0;

function init() {
    const container = document.getElementById('game-container');
    const { scene } = initScene(container);

    // Temporary ground plane for visual verification
    const groundGeo = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_CHUNK_DEPTH * GROUND_CHUNKS_VISIBLE);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.position.z = GROUND_CHUNK_DEPTH * GROUND_CHUNKS_VISIBLE / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const dt = lastTime === 0 ? 0.016 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    updateCamera(0);
    renderScene();

    requestAnimationFrame(gameLoop);
}

init();
```

- [ ] **Step 4: Create `mannheim-skater/index.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Mannheim Skater</title>
    <link rel="stylesheet" href="css/hud.css">
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
        }
    }
    </script>
</head>
<body>
    <div id="game-container">
        <!-- Three.js canvas gets appended here -->
        <div id="hud">
            <div id="score-display">0</div>
            <div id="powerup-bar" class="hidden"></div>
        </div>
        <div id="game-over-screen" class="hidden">
            <div class="game-over-title">GAME OVER</div>
            <div class="game-over-score"></div>
            <div class="game-over-leaderboard"></div>
            <div class="game-over-hint">Press Enter / Tap to Restart</div>
        </div>
    </div>
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create `mannheim-skater/css/hud.css`**

```css
/* mannheim-skater/css/hud.css */
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    overflow: hidden;
    background: #000;
    font-family: 'Press Start 2P', monospace;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
}

#game-container canvas {
    display: block;
    width: 100%;
    height: 100%;
}

/* --- HUD Overlay --- */

#hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 16px 20px;
    pointer-events: none;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

#score-display {
    color: #fff;
    font-size: 20px;
    text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
}

#powerup-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-size: 10px;
    text-shadow: 1px 1px 0 #000;
}

#powerup-bar .bar-fill {
    width: 80px;
    height: 10px;
    background: #333;
    border-radius: 5px;
    overflow: hidden;
}

#powerup-bar .bar-fill-inner {
    height: 100%;
    background: #0f0;
    transition: width 0.1s linear;
}

/* --- Game Over Screen --- */

#game-over-screen {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    gap: 16px;
    text-align: center;
    padding: 20px;
}

.game-over-title {
    font-size: 32px;
    color: #ff4444;
    text-shadow: 3px 3px 0 #000;
}

.game-over-score {
    font-size: 18px;
}

.game-over-hint {
    font-size: 10px;
    color: #aaa;
    margin-top: 20px;
}

.game-over-leaderboard ol {
    list-style: none;
    padding: 0;
    text-align: left;
    font-size: 11px;
}

.game-over-leaderboard ol li {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 4px 0;
    border-bottom: 1px solid #333;
}

.leaderboard-entry {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
}

.leaderboard-entry input {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    padding: 6px 10px;
    background: #222;
    color: #fff;
    border: 2px solid #555;
    text-align: center;
    width: 180px;
}

.leaderboard-entry button {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    padding: 8px 16px;
    background: #0a0;
    color: #fff;
    border: none;
    cursor: pointer;
}

.hidden { display: none !important; }
```

- [ ] **Step 6: Verify in browser**

Run: Open `mannheim-skater/index.html` in browser (or use `npx serve .` from the repo root).
Expected: A beige ground plane seen from an isometric angle, ambient + directional lighting, no errors in console.

- [ ] **Step 7: Commit**

```bash
git add mannheim-skater/
git commit -m "feat(mannheim-skater): scaffold project with Three.js isometric scene"
```

---

## Task 2: Game State + Player Character

**Files:**
- Create: `mannheim-skater/js/game-state.js`
- Create: `mannheim-skater/js/player.js`
- Modify: `mannheim-skater/js/main.js`

**Goal:** A box-shaped skater on a skateboard standing on the ground, gently bobbing up and down.

- [ ] **Step 1: Create `mannheim-skater/js/game-state.js`**

```js
// mannheim-skater/js/game-state.js
import { PLAYER_START_LANE, SCROLL_SPEED_START } from './config.js';

export const state = {
    // Player
    currentLane: PLAYER_START_LANE,
    targetLane: PLAYER_START_LANE,
    laneSwitchProgress: 1, // 0..1, 1 = arrived
    isJumping: false,
    jumpProgress: 0, // 0..1
    playerZ: 0, // world Z position (increases as player moves forward)

    // Game
    isGameOver: false,
    isPaused: false,
    isRunning: false,
    scrollSpeed: SCROLL_SPEED_START,
    elapsedTime: 0, // seconds since game start
    lastSpeedIncrease: 0,

    // Scoring
    score: 0,
    distanceScore: 0,
    scoreMultiplier: 1,

    // Power-ups
    activePowerUp: null,    // { type, remaining } or null
    hasShield: false,       // Döner shield
    hasHighJump: false,     // Skateboard upgrade

    // Zone
    currentZoneIndex: 0,
    lastZoneChangeScore: 0,
};

export function resetState() {
    state.currentLane = PLAYER_START_LANE;
    state.targetLane = PLAYER_START_LANE;
    state.laneSwitchProgress = 1;
    state.isJumping = false;
    state.jumpProgress = 0;
    state.playerZ = 0;
    state.isGameOver = false;
    state.isPaused = false;
    state.isRunning = true;
    state.scrollSpeed = SCROLL_SPEED_START;
    state.elapsedTime = 0;
    state.lastSpeedIncrease = 0;
    state.score = 0;
    state.distanceScore = 0;
    state.scoreMultiplier = 1;
    state.activePowerUp = null;
    state.hasShield = false;
    state.hasHighJump = false;
    state.currentZoneIndex = 0;
    state.lastZoneChangeScore = 0;
}
```

- [ ] **Step 2: Create `mannheim-skater/js/player.js`**

```js
// mannheim-skater/js/player.js
import * as THREE from 'three';
import {
    PLAYER_BODY_W, PLAYER_BODY_H, PLAYER_BODY_D,
    PLAYER_BOARD_W, PLAYER_BOARD_H, PLAYER_BOARD_D,
    PLAYER_Y_OFFSET, LANE_POSITIONS, LANE_SWITCH_DURATION,
    JUMP_HEIGHT, JUMP_DURATION,
} from './config.js';
import { state } from './game-state.js';

let playerGroup;

export function createPlayer(scene) {
    playerGroup = new THREE.Group();

    // Body (colored box)
    const bodyGeo = new THREE.BoxGeometry(PLAYER_BODY_W, PLAYER_BODY_H, PLAYER_BODY_D);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2299ff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = PLAYER_BODY_H / 2;
    body.castShadow = true;
    playerGroup.add(body);

    // Skateboard (flat dark box underneath)
    const boardGeo = new THREE.BoxGeometry(PLAYER_BOARD_W, PLAYER_BOARD_H, PLAYER_BOARD_D);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = PLAYER_BOARD_H / 2;
    board.castShadow = true;
    playerGroup.add(board);

    // Initial position
    playerGroup.position.x = LANE_POSITIONS[state.currentLane];
    playerGroup.position.y = 0;
    playerGroup.position.z = 0;

    scene.add(playerGroup);
    return playerGroup;
}

export function updatePlayer(dt) {
    if (!playerGroup) return;

    // --- Lane switching (lerp X) ---
    if (state.laneSwitchProgress < 1) {
        state.laneSwitchProgress += dt / LANE_SWITCH_DURATION;
        if (state.laneSwitchProgress >= 1) {
            state.laneSwitchProgress = 1;
            state.currentLane = state.targetLane;
        }
    }

    const fromX = LANE_POSITIONS[state.currentLane];
    const toX = LANE_POSITIONS[state.targetLane];
    const t = state.laneSwitchProgress;
    // Smooth step for nice easing
    const smoothT = t * t * (3 - 2 * t);
    playerGroup.position.x = fromX + (toX - fromX) * smoothT;

    // Tilt during lane switch
    const tiltTarget = state.laneSwitchProgress < 1
        ? (state.targetLane - state.currentLane) * -0.2
        : 0;
    playerGroup.rotation.z += (tiltTarget - playerGroup.rotation.z) * 0.2;

    // --- Jump (parabolic Y) ---
    if (state.isJumping) {
        state.jumpProgress += dt / JUMP_DURATION;
        if (state.jumpProgress >= 1) {
            state.jumpProgress = 0;
            state.isJumping = false;
            playerGroup.position.y = 0;
        } else {
            // Parabola: 4 * h * t * (1 - t)
            const h = state.hasHighJump ? JUMP_HEIGHT * 1.5 : JUMP_HEIGHT;
            playerGroup.position.y = 4 * h * state.jumpProgress * (1 - state.jumpProgress);
        }
    }

    // --- Idle bob (subtle sine wave when grounded) ---
    if (!state.isJumping) {
        playerGroup.position.y = Math.sin(state.elapsedTime * 3) * 0.04;
    }

    // Z position stays at 0 (camera follows world scrolling, player is visually centered)
}

export function getPlayerGroup() { return playerGroup; }

export function getPlayerWorldZ() { return state.playerZ; }
```

- [ ] **Step 3: Update `mannheim-skater/js/main.js` to use player and game state**

Replace the entire file content with:

```js
// mannheim-skater/js/main.js
import { initScene, updateCamera, renderScene, getScene } from './scene.js';
import { state, resetState } from './game-state.js';
import { createPlayer, updatePlayer } from './player.js';
import * as THREE from 'three';
import { GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE } from './config.js';

let lastTime = 0;

function init() {
    const container = document.getElementById('game-container');
    initScene(container);
    const scene = getScene();

    // Temporary ground plane
    const groundGeo = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_CHUNK_DEPTH * GROUND_CHUNKS_VISIBLE);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xd4c5a0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = GROUND_CHUNK_DEPTH * GROUND_CHUNKS_VISIBLE / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    resetState();
    createPlayer(scene);

    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const dt = lastTime === 0 ? 0.016 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (state.isRunning && !state.isPaused && !state.isGameOver) {
        state.elapsedTime += dt;
        updatePlayer(dt);
    }

    updateCamera(0);
    renderScene();
    requestAnimationFrame(gameLoop);
}

init();
```

- [ ] **Step 4: Verify in browser**

Expected: Isometric scene with a blue box on a dark skateboard, gently bobbing on the beige ground. No errors in console.

- [ ] **Step 5: Commit**

```bash
git add mannheim-skater/js/game-state.js mannheim-skater/js/player.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add game state and player character with idle animation"
```

---

## Task 3: Input System + Lane Movement + Jump

**Files:**
- Create: `mannheim-skater/js/input.js`
- Modify: `mannheim-skater/js/main.js` (import + init input)

**Goal:** Player switches lanes on A/D/arrows and jumps on Space. Touch: swipe left/right, tap to jump.

- [ ] **Step 1: Create `mannheim-skater/js/input.js`**

```js
// mannheim-skater/js/input.js
import { state } from './game-state.js';
import { LANE_COUNT } from './config.js';

const SWIPE_DEADZONE = 30; // px

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let swipeHandled = false;

export function switchLane(direction) {
    // direction: -1 (left) or +1 (right)
    if (state.isGameOver || state.isPaused) return;
    if (state.laneSwitchProgress < 0.5) return; // prevent double-switch

    const next = state.targetLane + direction;
    if (next < 0 || next >= LANE_COUNT) return;

    if (state.laneSwitchProgress >= 1) {
        // Start fresh switch: currentLane is where we are
        state.currentLane = state.targetLane;
    }
    state.targetLane = next;
    state.laneSwitchProgress = 0;
}

export function triggerJump() {
    if (state.isGameOver || state.isPaused) return;
    if (state.isJumping) return;
    state.isJumping = true;
    state.jumpProgress = 0;
}

export function initInput() {
    // --- Keyboard ---
    window.addEventListener('keydown', (e) => {
        if (state.isGameOver && e.key === 'Enter') {
            window.dispatchEvent(new CustomEvent('game-restart'));
            return;
        }
        if (e.code === 'KeyP' && !state.isGameOver) {
            state.isPaused = !state.isPaused;
            return;
        }
        if (state.isGameOver || state.isPaused) return;

        if (e.code === 'KeyA' || e.code === 'ArrowLeft') switchLane(-1);
        if (e.code === 'KeyD' || e.code === 'ArrowRight') switchLane(1);
        if (e.code === 'Space') { e.preventDefault(); triggerJump(); }
    });

    // --- Touch ---
    const container = document.getElementById('game-container');

    container.addEventListener('touchstart', (e) => {
        if (state.isGameOver) {
            window.dispatchEvent(new CustomEvent('game-restart'));
            return;
        }
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        swipeHandled = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (swipeHandled || state.isGameOver) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;

        if (Math.abs(dx) > SWIPE_DEADZONE) {
            switchLane(dx > 0 ? 1 : -1);
            swipeHandled = true;
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (state.isGameOver) return;
        // If no swipe happened and it was a quick tap, jump
        const elapsed = Date.now() - touchStartTime;
        if (!swipeHandled && elapsed < 300) {
            triggerJump();
        }
    }, { passive: true });
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js` — add input import and init**

Add to imports at top:

```js
import { initInput } from './input.js';
```

Add `initInput();` inside `init()`, after `createPlayer(scene);`:

```js
    createPlayer(scene);
    initInput();
```

- [ ] **Step 3: Verify in browser**

Expected:
- Press A or Left Arrow → player slides smoothly one lane left with a tilt
- Press D or Right Arrow → player slides one lane right
- Can't go past lane 0 (leftmost) or lane 4 (rightmost)
- Space → player jumps in a parabolic arc
- Can't double-jump
- On mobile: swipe left/right switches lanes, tap jumps

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/input.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add keyboard and touch input for lane switching and jump"
```

---

## Task 4: World Scrolling + Ground Chunks

**Files:**
- Create: `mannheim-skater/js/world.js`
- Modify: `mannheim-skater/js/main.js` (remove temp ground, use world module)

**Goal:** Ground tiles scroll toward the camera, recycling when they pass behind. Speed increases over time. Lane lines visible on the ground.

- [ ] **Step 1: Create `mannheim-skater/js/world.js`**

```js
// mannheim-skater/js/world.js
import * as THREE from 'three';
import {
    GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE,
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    SCROLL_SPEED_INCREMENT, SPEED_INCREASE_INTERVAL, SCROLL_SPEED_MAX,
    ZONES,
} from './config.js';
import { state } from './game-state.js';

const groundChunks = [];
let nextChunkZ = 0;

export function initWorld(scene) {
    // Clear old chunks
    groundChunks.forEach(c => scene.remove(c));
    groundChunks.length = 0;
    nextChunkZ = -GROUND_CHUNK_DEPTH; // start behind player

    for (let i = 0; i < GROUND_CHUNKS_VISIBLE; i++) {
        addChunk(scene);
    }
}

function addChunk(scene) {
    const zone = ZONES[state.currentZoneIndex];

    const group = new THREE.Group();

    // Ground slab
    const geo = new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_CHUNK_DEPTH);
    const mat = new THREE.MeshStandardMaterial({ color: zone.groundColor });
    const slab = new THREE.Mesh(geo, mat);
    slab.rotation.x = -Math.PI / 2;
    slab.receiveShadow = true;
    group.add(slab);

    // Lane dividers (thin lines)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    for (let i = 0; i <= LANE_COUNT; i++) {
        const x = LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * (LANE_WIDTH + 0.1);
        const lineGeo = new THREE.PlaneGeometry(0.03, GROUND_CHUNK_DEPTH);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.01, 0);
        group.add(line);
    }

    group.position.z = nextChunkZ + GROUND_CHUNK_DEPTH / 2;
    group.userData.backEdgeZ = nextChunkZ;

    scene.add(group);
    groundChunks.push(group);
    nextChunkZ += GROUND_CHUNK_DEPTH;
}

export function updateWorld(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    // Speed increases
    if (state.elapsedTime - state.lastSpeedIncrease >= SPEED_INCREASE_INTERVAL) {
        state.lastSpeedIncrease = state.elapsedTime;
        if (state.scrollSpeed < SCROLL_SPEED_MAX) {
            state.scrollSpeed += SCROLL_SPEED_INCREMENT;
        }
    }

    const speed = state.activePowerUp?.type === 'eistee'
        ? state.scrollSpeed * 1.5
        : state.scrollSpeed;

    // Move player Z forward (virtual, world scrolls toward camera)
    state.playerZ += speed * dt;

    // Move chunks toward camera
    for (let i = groundChunks.length - 1; i >= 0; i--) {
        const chunk = groundChunks[i];
        chunk.position.z -= speed * dt;

        // Recycle chunks that passed behind the camera
        if (chunk.position.z + GROUND_CHUNK_DEPTH / 2 < -GROUND_CHUNK_DEPTH * 2) {
            scene.remove(chunk);
            // Dispose geometry/material to avoid leaks
            chunk.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
            groundChunks.splice(i, 1);
        }
    }

    // Add new chunks ahead as needed
    const farthestZ = groundChunks.length > 0
        ? Math.max(...groundChunks.map(c => c.position.z))
        : 0;
    while (farthestZ + GROUND_CHUNK_DEPTH < GROUND_CHUNK_DEPTH * (GROUND_CHUNKS_VISIBLE - 2)) {
        addChunk(scene);
        break; // one per frame is enough
    }
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js` — use world module instead of temp ground**

Replace entire file:

```js
// mannheim-skater/js/main.js
import { initScene, updateCamera, renderScene, getScene } from './scene.js';
import { state, resetState } from './game-state.js';
import { createPlayer, updatePlayer } from './player.js';
import { initInput } from './input.js';
import { initWorld, updateWorld } from './world.js';

let lastTime = 0;

function init() {
    const container = document.getElementById('game-container');
    initScene(container);
    const scene = getScene();

    resetState();
    initWorld(scene);
    createPlayer(scene);
    initInput();

    window.addEventListener('game-restart', () => restart());

    requestAnimationFrame(gameLoop);
}

function restart() {
    const scene = getScene();
    // Remove all objects and rebuild
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        if (child.traverse) {
            child.traverse(c => {
                if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
            });
        }
    }
    // Re-add lights (initScene stored them, but simplest to re-init scene)
    // For now, full re-init
    lastTime = 0;
    const container = document.getElementById('game-container');
    // Remove old canvas
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    initScene(container);
    const newScene = getScene();
    resetState();
    initWorld(newScene);
    createPlayer(newScene);
}

function gameLoop(timestamp) {
    const dt = lastTime === 0 ? 0.016 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    const scene = getScene();

    if (state.isRunning && !state.isPaused && !state.isGameOver) {
        state.elapsedTime += dt;
        updateWorld(dt, scene);
        updatePlayer(dt);
    }

    updateCamera(0); // player stays at Z=0 visually, world scrolls
    renderScene();
    requestAnimationFrame(gameLoop);
}

init();
```

- [ ] **Step 3: Verify in browser**

Expected: Ground tiles scroll toward the camera continuously. Faint lane divider lines visible. Speed gradually increases. Player can switch lanes and jump while ground scrolls.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/world.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add scrolling ground chunks with lane dividers and speed ramp"
```

---

## Task 5: Obstacles + Collision Detection

**Files:**
- Create: `mannheim-skater/js/obstacles.js`
- Create: `mannheim-skater/js/collision.js`
- Modify: `mannheim-skater/js/main.js` (integrate obstacles + collision)

**Goal:** Obstacles spawn ahead, scroll toward the player, and hitting one triggers game over.

- [ ] **Step 1: Create `mannheim-skater/js/obstacles.js`**

```js
// mannheim-skater/js/obstacles.js
import * as THREE from 'three';
import {
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP,
} from './config.js';
import { state } from './game-state.js';

/*
 * Each obstacle: { mesh, lane, type, z (spawn Z in world coords), jumpable }
 * Types:
 *   poller:      1 lane, jumpable
 *   car:         1-2 lanes, not jumpable
 *   barrier:     1 lane, jumpable (niedrige Absperrung)
 *   baustelle:   2 lanes, not jumpable
 *   tram:        2-3 lanes, not jumpable, moves
 */

const OBSTACLE_DEFS = [
    { type: 'poller',    lanesWide: 1, jumpable: true,  color: 0x888888, w: 0.3, h: 0.7,  d: 0.3, weight: 3 },
    { type: 'barrier',   lanesWide: 1, jumpable: true,  color: 0xff8800, w: 0.9, h: 0.5,  d: 0.2, weight: 2 },
    { type: 'car',       lanesWide: 1, jumpable: false, color: 0xcc2222, w: 1.0, h: 0.9,  d: 1.8, weight: 3 },
    { type: 'car_wide',  lanesWide: 2, jumpable: false, color: 0x2255aa, w: 2.2, h: 1.0,  d: 2.0, weight: 1 },
    { type: 'baustelle', lanesWide: 2, jumpable: false, color: 0xff6600, w: 2.4, h: 1.2,  d: 0.4, weight: 1 },
];

const obstacles = [];
let nextSpawnZ = OBSTACLE_SPAWN_DISTANCE;

export function initObstacles() {
    obstacles.length = 0;
    nextSpawnZ = OBSTACLE_SPAWN_DISTANCE;
}

export function getObstacles() { return obstacles; }

function pickObstacleDef() {
    const totalWeight = OBSTACLE_DEFS.reduce((s, d) => s + d.weight, 0);
    let r = Math.random() * totalWeight;
    for (const def of OBSTACLE_DEFS) {
        r -= def.weight;
        if (r <= 0) return def;
    }
    return OBSTACLE_DEFS[0];
}

function spawnObstacleRow(scene, worldZ) {
    const def = pickObstacleDef();

    // Pick a random start lane that fits
    const maxStart = LANE_COUNT - def.lanesWide;
    const startLane = Math.floor(Math.random() * (maxStart + 1));

    const geo = new THREE.BoxGeometry(def.w, def.h, def.d);
    const mat = new THREE.MeshStandardMaterial({ color: def.color });
    const mesh = new THREE.Mesh(geo, mat);

    // Position: center across the lanes it occupies
    const centerLane = startLane + (def.lanesWide - 1) / 2;
    const x = LANE_POSITIONS[0] + centerLane * (LANE_POSITIONS[1] - LANE_POSITIONS[0]);
    mesh.position.set(x, def.h / 2, worldZ);
    mesh.castShadow = true;

    scene.add(mesh);
    obstacles.push({
        mesh,
        type: def.type,
        lanes: Array.from({ length: def.lanesWide }, (_, i) => startLane + i),
        jumpable: def.jumpable,
        worldZ,
        w: def.w,
        h: def.h,
        d: def.d,
    });
}

export function updateObstacles(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    const speed = state.activePowerUp?.type === 'eistee'
        ? state.scrollSpeed * 1.5
        : state.scrollSpeed;

    // Move existing obstacles toward camera
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.mesh.position.z -= speed * dt;

        // Remove if behind camera
        if (obs.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(obs.mesh);
            obs.mesh.geometry.dispose();
            obs.mesh.material.dispose();
            obstacles.splice(i, 1);
        }
    }

    // Spawn new obstacles ahead
    // nextSpawnZ tracks world Z; we convert to visual Z
    // Visual Z for nextSpawnZ relative to player:
    const visualSpawnZ = nextSpawnZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        spawnObstacleRow(scene, visualSpawnZ);
        const gap = OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
        nextSpawnZ += gap;
    }
}
```

- [ ] **Step 2: Create `mannheim-skater/js/collision.js`**

```js
// mannheim-skater/js/collision.js
import { state } from './game-state.js';
import { LANE_POSITIONS, LANE_WIDTH, PLAYER_BODY_W, PLAYER_BODY_H } from './config.js';

/*
 * Check collisions between player and obstacles.
 * Player is always at visual Z = 0.
 * Returns: 'hit' | 'near-miss' | null
 */
export function checkObstacleCollisions(obstacles) {
    const playerX = LANE_POSITIONS[state.targetLane];
    const playerHalfW = PLAYER_BODY_W / 2;
    const playerY = state.isJumping
        ? 4 * (state.hasHighJump ? 3.0 : 2.0) * state.jumpProgress * (1 - state.jumpProgress)
        : 0;

    for (const obs of obstacles) {
        // Z overlap: obstacle must be near Z = 0 (player position)
        const obsZ = obs.mesh.position.z;
        const obsHalfD = obs.d / 2;
        if (obsZ - obsHalfD > 1.0 || obsZ + obsHalfD < -1.0) continue;

        // X overlap: check if player lane overlaps obstacle lanes
        const obsX = obs.mesh.position.x;
        const obsHalfW = obs.w / 2;
        const xOverlap = (playerX + playerHalfW > obsX - obsHalfW) &&
                          (playerX - playerHalfW < obsX + obsHalfW);
        if (!xOverlap) {
            // Check near-miss (within 0.5 units X)
            const nearDist = 0.5;
            const nearOverlap = (playerX + playerHalfW + nearDist > obsX - obsHalfW) &&
                                (playerX - playerHalfW - nearDist < obsX + obsHalfW);
            if (nearOverlap && Math.abs(obsZ) < 0.5) {
                return 'near-miss';
            }
            continue;
        }

        // Y check: if obstacle is jumpable and player is high enough, no hit
        if (obs.jumpable && playerY > obs.h * 0.6) {
            return 'near-miss'; // jumped over = near-miss bonus
        }

        // Invincibility power-ups
        if (state.activePowerUp?.type === 'spray' || state.activePowerUp?.type === 'ticket') {
            continue;
        }

        // Shield (Döner)
        if (state.hasShield) {
            state.hasShield = false;
            return 'shield-break';
        }

        // Collision!
        return 'hit';
    }
    return null;
}
```

- [ ] **Step 3: Update `mannheim-skater/js/main.js` — integrate obstacles and collision**

Add imports:

```js
import { initObstacles, updateObstacles, getObstacles } from './obstacles.js';
import { checkObstacleCollisions } from './collision.js';
```

Inside `init()`, after `createPlayer(scene);` add:

```js
    initObstacles();
```

Inside the game loop, in the `if (state.isRunning && ...)` block, after `updatePlayer(dt);` add:

```js
        updateObstacles(dt, scene);

        const collisionResult = checkObstacleCollisions(getObstacles());
        if (collisionResult === 'hit') {
            state.isGameOver = true;
            console.log('GAME OVER! Score:', Math.floor(state.score));
        }
```

In `restart()`, add `initObstacles();` after `initWorld(newScene);`.

- [ ] **Step 4: Verify in browser**

Expected: Colored boxes appear in the distance on various lanes and scroll toward the player. Hitting one logs "GAME OVER" to console. Jumping over a low obstacle (poller/barrier) avoids collision.

- [ ] **Step 5: Commit**

```bash
git add mannheim-skater/js/obstacles.js mannheim-skater/js/collision.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add obstacle spawning, scrolling, and collision detection"
```

---

## Task 6: HUD + Scoring + Game Over Screen

**Files:**
- Create: `mannheim-skater/js/hud.js`
- Modify: `mannheim-skater/js/main.js` (scoring logic, game over, HUD updates)

**Goal:** Live score display, game over screen with score, restart on Enter/tap. Core game loop is now complete.

- [ ] **Step 1: Create `mannheim-skater/js/hud.js`**

```js
// mannheim-skater/js/hud.js
import { state } from './game-state.js';

const scoreEl = document.getElementById('score-display');
const gameOverEl = document.getElementById('game-over-screen');
const gameOverScoreEl = gameOverEl?.querySelector('.game-over-score');
const powerupBarEl = document.getElementById('powerup-bar');

export function updateHUD() {
    if (scoreEl) {
        scoreEl.textContent = Math.floor(state.score);
    }
}

export function showPowerUpBar(name, fraction) {
    if (!powerupBarEl) return;
    powerupBarEl.classList.remove('hidden');
    powerupBarEl.innerHTML = `
        <span>${name}</span>
        <div class="bar-fill"><div class="bar-fill-inner" style="width:${fraction * 100}%"></div></div>
    `;
}

export function hidePowerUpBar() {
    if (powerupBarEl) powerupBarEl.classList.add('hidden');
}

export function showGameOver() {
    if (!gameOverEl) return;
    if (gameOverScoreEl) {
        gameOverScoreEl.textContent = `Score: ${Math.floor(state.score)}`;
    }
    gameOverEl.classList.remove('hidden');
}

export function hideGameOver() {
    if (gameOverEl) gameOverEl.classList.add('hidden');
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js` — integrate HUD and scoring**

Add imports:

```js
import { updateHUD, showGameOver, hideGameOver } from './hud.js';
import { SCORE_DISTANCE_PER_SECOND, SCORE_NEAR_MISS, SCORE_JUMP_OVER } from './config.js';
```

Update the game loop collision handling and scoring:

```js
    if (state.isRunning && !state.isPaused && !state.isGameOver) {
        state.elapsedTime += dt;

        // Distance score
        state.distanceScore += SCORE_DISTANCE_PER_SECOND * state.scoreMultiplier * dt;
        state.score = state.distanceScore;

        updateWorld(dt, scene);
        updatePlayer(dt);
        updateObstacles(dt, scene);

        const collisionResult = checkObstacleCollisions(getObstacles());
        if (collisionResult === 'hit') {
            state.isGameOver = true;
            showGameOver();
        } else if (collisionResult === 'near-miss') {
            state.score += SCORE_NEAR_MISS * state.scoreMultiplier;
        }

        updateHUD();
    }
```

In `restart()`, add `hideGameOver();` before `resetState();`.

- [ ] **Step 3: Verify in browser**

Expected: Score counts up in top-left corner. Hitting an obstacle shows the game-over overlay with the final score. Press Enter or tap to restart.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/hud.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add HUD, distance scoring, and game over screen"
```

---

## Task 7: Brezeln (Collectibles)

**Files:**
- Create: `mannheim-skater/js/collectibles.js`
- Modify: `mannheim-skater/js/main.js` (integrate collectibles)

**Goal:** Golden rotating brezels appear on lanes. Collecting them adds score.

- [ ] **Step 1: Create `mannheim-skater/js/collectibles.js`**

```js
// mannheim-skater/js/collectibles.js
import * as THREE from 'three';
import {
    LANE_POSITIONS, BREZEL_SPAWN_CHANCE, BREZEL_Y_OFFSET,
    BREZEL_ROTATION_SPEED, SCORE_PER_BREZEL,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    LANE_COUNT, PLAYER_BODY_W,
} from './config.js';
import { state } from './game-state.js';

const brezels = [];
let nextBrezelZ = 8; // start a bit ahead

const brezelGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
const brezelMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.3, roughness: 0.6 });

export function initCollectibles() {
    brezels.length = 0;
    nextBrezelZ = 8;
}

export function getBrezels() { return brezels; }

function spawnBrezelRow(scene, visualZ) {
    // Spawn 1-3 brezels on random lanes
    const count = 1 + Math.floor(Math.random() * 3);
    const usedLanes = new Set();

    for (let i = 0; i < count; i++) {
        let lane;
        do { lane = Math.floor(Math.random() * LANE_COUNT); } while (usedLanes.has(lane));
        usedLanes.add(lane);

        const mesh = new THREE.Mesh(brezelGeo, brezelMat);
        mesh.position.set(LANE_POSITIONS[lane], BREZEL_Y_OFFSET, visualZ + i * 1.5);
        mesh.castShadow = true;
        scene.add(mesh);
        brezels.push({ mesh, lane, collected: false });
    }
}

export function updateCollectibles(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    const speed = state.activePowerUp?.type === 'eistee'
        ? state.scrollSpeed * 1.5
        : state.scrollSpeed;

    // Move brezels and check collection
    const playerLane = state.laneSwitchProgress >= 1 ? state.currentLane : state.targetLane;
    const playerY = state.isJumping
        ? 4 * 2.0 * state.jumpProgress * (1 - state.jumpProgress)
        : 0;

    for (let i = brezels.length - 1; i >= 0; i--) {
        const b = brezels[i];
        b.mesh.position.z -= speed * dt;
        b.mesh.rotation.y += BREZEL_ROTATION_SPEED * dt;
        // Bob up and down
        b.mesh.position.y = BREZEL_Y_OFFSET + Math.sin(state.elapsedTime * 4 + i) * 0.1;

        // Collection check
        if (!b.collected && Math.abs(b.mesh.position.z) < 0.8) {
            // Magnet effect (Monatsticket) — pull from any lane
            const magnetActive = state.activePowerUp?.type === 'ticket';

            if (b.lane === playerLane || magnetActive) {
                // Y proximity (allow collection while jumping at brezel height)
                if (Math.abs(playerY - BREZEL_Y_OFFSET) < 1.5 || magnetActive) {
                    b.collected = true;
                    state.score += SCORE_PER_BREZEL * state.scoreMultiplier;
                    // Shrink + fade animation
                    scene.remove(b.mesh);
                    brezels.splice(i, 1);
                    continue;
                }
            }
        }

        // Despawn if behind
        if (b.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(b.mesh);
            b.mesh.geometry?.dispose();
            brezels.splice(i, 1);
        }
    }

    // Spawn new rows
    const visualSpawnZ = nextBrezelZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        if (Math.random() < BREZEL_SPAWN_CHANCE) {
            spawnBrezelRow(scene, visualSpawnZ);
        }
        nextBrezelZ += 3 + Math.random() * 4;
    }
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js`**

Add import:

```js
import { initCollectibles, updateCollectibles } from './collectibles.js';
```

Add `initCollectibles();` in `init()` and `restart()` after `initObstacles();`.

Add `updateCollectibles(dt, scene);` in the game loop after `updateObstacles(dt, scene);`.

- [ ] **Step 3: Verify in browser**

Expected: Golden torus shapes (brezels) float and rotate on the lanes. Skating into one on the same lane makes it disappear and increases the score.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/collectibles.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add brezel collectibles with rotation and scoring"
```

---

## Task 8: Power-Up System

**Files:**
- Modify: `mannheim-skater/js/collectibles.js` (add power-up spawning and pickup)
- Modify: `mannheim-skater/js/main.js` (power-up timer tick)
- Modify: `mannheim-skater/js/hud.js` (power-up bar display)

**Goal:** 6 power-up types spawn rarely, float above ground with a glow. Picking one up activates the effect with a HUD countdown.

- [ ] **Step 1: Add power-up definitions and spawning to `mannheim-skater/js/collectibles.js`**

Add after the brezel variables:

```js
import {
    // ... existing imports, plus:
    POWERUP_SPAWN_CHANCE,
    POWERUP_EISTEE_DURATION, POWERUP_RAD_DURATION,
    POWERUP_TICKET_DURATION, POWERUP_SPRAY_DURATION, POWERUP_BOARD_DURATION,
} from './config.js';

const POWERUP_DEFS = [
    { type: 'doener',   color: 0x8B4513, name: 'Döner',       duration: 0,                      emissive: 0x442200 },
    { type: 'eistee',   color: 0xFFDD00, name: 'Eistee',      duration: POWERUP_EISTEE_DURATION, emissive: 0x665500 },
    { type: 'rad',      color: 0xDD2222, name: 'Kurpfalz-Rad', duration: POWERUP_RAD_DURATION,   emissive: 0x550000 },
    { type: 'ticket',   color: 0x22CC44, name: 'Monatsticket', duration: POWERUP_TICKET_DURATION, emissive: 0x005500 },
    { type: 'spray',    color: 0xFF00FF, name: 'Graffiti',     duration: POWERUP_SPRAY_DURATION,  emissive: 0x550055 },
    { type: 'board',    color: 0x00FFFF, name: 'Board-Up',     duration: POWERUP_BOARD_DURATION,  emissive: 0x005555 },
];

const powerups = [];
let nextPowerupZ = 15;

export function getPowerups() { return powerups; }
```

Add `powerups.length = 0; nextPowerupZ = 15;` to `initCollectibles()`.

Add this function:

```js
function spawnPowerup(scene, visualZ) {
    const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
    const lane = Math.floor(Math.random() * LANE_COUNT);

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.emissive,
        emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(LANE_POSITIONS[lane], 1.0, visualZ);
    mesh.castShadow = true;
    scene.add(mesh);

    powerups.push({ mesh, lane, type: def.type, name: def.name, duration: def.duration, collected: false });
}
```

Add to `updateCollectibles()` — after brezel spawning section, add power-up movement, collection, and spawning:

```js
    // Power-ups: move + collect
    const playerLaneForPU = state.laneSwitchProgress >= 1 ? state.currentLane : state.targetLane;
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.mesh.position.z -= speed * dt;
        pu.mesh.rotation.y += 3.0 * dt;
        // Pulse scale
        const scale = 1 + Math.sin(state.elapsedTime * 5) * 0.1;
        pu.mesh.scale.setScalar(scale);

        // Collection
        if (!pu.collected && Math.abs(pu.mesh.position.z) < 1.0 && pu.lane === playerLaneForPU) {
            pu.collected = true;
            scene.remove(pu.mesh);
            powerups.splice(i, 1);
            activatePowerUp(pu);
            continue;
        }

        // Despawn
        if (pu.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(pu.mesh);
            powerups.splice(i, 1);
        }
    }

    // Spawn power-ups
    const visualPUSpawnZ = nextPowerupZ - state.playerZ;
    if (visualPUSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        if (Math.random() < POWERUP_SPAWN_CHANCE) {
            spawnPowerup(scene, visualPUSpawnZ);
        }
        nextPowerupZ += 8 + Math.random() * 15;
    }
```

Add `activatePowerUp` function:

```js
function activatePowerUp(pu) {
    if (pu.type === 'doener') {
        state.hasShield = true;
        return;
    }
    if (pu.type === 'board') {
        state.hasHighJump = true;
        state.activePowerUp = { type: pu.type, name: pu.name, remaining: pu.duration, total: pu.duration };
        return;
    }
    // Timed power-ups
    if (pu.type === 'eistee') {
        state.scoreMultiplier = 2;
    } else if (pu.type === 'rad') {
        state.scoreMultiplier = 3;
    }
    state.activePowerUp = { type: pu.type, name: pu.name, remaining: pu.duration, total: pu.duration };
}

export function updatePowerUpTimer(dt) {
    if (!state.activePowerUp) return;
    state.activePowerUp.remaining -= dt;
    if (state.activePowerUp.remaining <= 0) {
        // Deactivate
        if (state.activePowerUp.type === 'eistee' || state.activePowerUp.type === 'rad') {
            state.scoreMultiplier = 1;
        }
        if (state.activePowerUp.type === 'board') {
            state.hasHighJump = false;
        }
        state.activePowerUp = null;
    }
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js` — power-up timer and HUD**

Add import:

```js
import { updatePowerUpTimer } from './collectibles.js';
import { showPowerUpBar, hidePowerUpBar } from './hud.js';
```

In game loop, after `updateCollectibles(dt, scene);`:

```js
        updatePowerUpTimer(dt);
        if (state.activePowerUp) {
            showPowerUpBar(state.activePowerUp.name, state.activePowerUp.remaining / state.activePowerUp.total);
        } else {
            hidePowerUpBar();
        }
```

- [ ] **Step 3: Verify in browser**

Expected: Colored pulsing cubes occasionally appear. Picking one up shows the power-up name + countdown bar in the HUD. Eistee makes everything faster, Döner gives a shield indicator (survives one hit), etc.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/collectibles.js mannheim-skater/js/main.js mannheim-skater/js/hud.js
git commit -m "feat(mannheim-skater): add 6 power-up types with effects and HUD countdown"
```

---

## Task 9: Zone System + Side Decorations

**Files:**
- Modify: `mannheim-skater/js/world.js` (zone transitions, side decorations, landmarks)
- Modify: `mannheim-skater/js/main.js` (zone change check)

**Goal:** Visual zone changes every ~500 points (ground color, side buildings). Landmarks at score milestones.

- [ ] **Step 1: Add zone transition and decoration logic to `mannheim-skater/js/world.js`**

Add after existing imports:

```js
import { ZONE_CHANGE_INTERVAL } from './config.js';
```

Add decoration spawning inside `addChunk`:

```js
function addChunk(scene) {
    const zone = ZONES[state.currentZoneIndex];
    const group = new THREE.Group();

    // ... existing ground slab + lane dividers code ...

    // Side decorations (buildings/objects on left and right)
    const decoChance = 0.6;
    if (Math.random() < decoChance) {
        addSideDecoration(group, zone, -GROUND_WIDTH / 2 - 1, GROUND_CHUNK_DEPTH);
    }
    if (Math.random() < decoChance) {
        addSideDecoration(group, zone, GROUND_WIDTH / 2 + 1, GROUND_CHUNK_DEPTH);
    }

    // ... rest of chunk positioning code ...
}
```

Add decoration generation function:

```js
function addSideDecoration(parent, zone, sideX, chunkDepth) {
    // Simple colored boxes representing buildings
    const height = 1.5 + Math.random() * 3;
    const width = 1 + Math.random() * 2;
    const depth = 1 + Math.random() * 2;

    let color;
    switch (zone.id) {
        case 'planken':   color = 0xeeddbb; break; // cream buildings
        case 'jungbusch': color = 0x776655; break;  // dark brownish
        case 'hafen':     color = 0x995533; break;  // rusty containers
        case 'luisenpark': color = 0x338833; break;  // trees (green)
        default: color = 0xaaaaaa;
    }

    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sideX, height / 2, (Math.random() - 0.5) * chunkDepth * 0.8);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
}
```

Add zone change export function:

```js
export function checkZoneChange() {
    const targetZone = Math.floor(state.score / ZONE_CHANGE_INTERVAL) % ZONES.length;
    if (targetZone !== state.currentZoneIndex) {
        state.currentZoneIndex = targetZone;
        state.lastZoneChangeScore = state.score;
        // New chunks will use the new zone colors; existing chunks keep their color
        // This creates a natural transition as old chunks scroll away
    }
}
```

- [ ] **Step 2: Update `mannheim-skater/js/main.js` — call zone check each frame**

Add import:

```js
import { checkZoneChange } from './world.js';
```

In game loop, after scoring:

```js
        checkZoneChange();
```

- [ ] **Step 3: Verify in browser**

Expected: Buildings/objects appear on both sides of the road. After ~500 points, new ground chunks switch to a different color (zone change). Each zone has a distinct ground color and building style.

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/world.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add zone system with side decorations and visual transitions"
```

---

## Task 10: Leaderboard (Supabase)

**Files:**
- Modify: `mannheim-skater/js/config.js` (add Supabase config)
- Modify: `mannheim-skater/js/hud.js` (leaderboard rendering, name input form)
- Modify: `mannheim-skater/index.html` (add Supabase CDN script)

**Goal:** Game over shows an online leaderboard. High scores can be submitted with a name.

- [ ] **Step 1: Add Supabase CDN to `mannheim-skater/index.html`**

Add before the `</head>` tag:

```html
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

- [ ] **Step 2: Add Supabase constants to `mannheim-skater/js/config.js`**

Add at the end of the file:

```js
// Supabase (same instance as main game, new table)
export const SUPABASE_URL = 'https://whelaaozlexvxkojrljp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_F1S_lB8kCYj22c-ssxrL4A_3hTHta1h';
export const LEADERBOARD_TABLE = 'mannheim_skater_scores';
export const LEADERBOARD_LIMIT = 10;
```

- [ ] **Step 3: Add leaderboard logic to `mannheim-skater/js/hud.js`**

Add imports and Supabase client init:

```js
import {
    SUPABASE_URL, SUPABASE_ANON_KEY, LEADERBOARD_TABLE, LEADERBOARD_LIMIT,
} from './config.js';

let supabaseClient = null;
let leaderboardData = null;
let didSubmitThisRound = false;

function initSupabase() {
    if (typeof supabase === 'undefined') return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { console.warn('Supabase init failed:', e); }
}

async function fetchLeaderboard() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from(LEADERBOARD_TABLE)
            .select('name, score')
            .order('score', { ascending: false })
            .limit(LEADERBOARD_LIMIT);
        if (error) throw error;
        return data || [];
    } catch (e) { console.warn('Leaderboard fetch failed:', e); return null; }
}

async function submitScore(name, score) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from(LEADERBOARD_TABLE).insert({ name, score });
    } catch (e) { console.warn('Score submit failed:', e); }
}

initSupabase();
```

Update `showGameOver()` to include leaderboard and name input:

```js
export async function showGameOver() {
    if (!gameOverEl) return;
    const score = Math.floor(state.score);
    if (gameOverScoreEl) gameOverScoreEl.textContent = `Score: ${score}`;

    // Fetch leaderboard
    const lb = await fetchLeaderboard();
    leaderboardData = lb;

    const lbEl = gameOverEl.querySelector('.game-over-leaderboard');
    if (lbEl && lb) {
        const rows = lb.map((e, i) =>
            `<li><span>#${i + 1} ${escapeHtml(e.name)}</span><strong>${e.score}</strong></li>`
        ).join('');
        lbEl.innerHTML = `
            <div style="margin-bottom:8px;font-size:12px;">Leaderboard</div>
            <ol>${rows}</ol>
            ${!didSubmitThisRound ? `
            <form class="leaderboard-entry" style="margin-top:12px;">
                <input maxlength="16" placeholder="Dein Name" autocomplete="nickname" />
                <button type="submit">Eintragen</button>
            </form>` : ''}
        `;

        const form = lbEl.querySelector('.leaderboard-entry');
        if (form) {
            const input = form.querySelector('input');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const name = (input.value || '').trim().slice(0, 16) || 'Player';
                didSubmitThisRound = true;
                await submitScore(name, score);
                leaderboardData = await fetchLeaderboard();
                showGameOver(); // re-render
            });
            input.focus();
        }
    }

    gameOverEl.classList.remove('hidden');
}

function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
```

Update `hideGameOver()`:

```js
export function hideGameOver() {
    if (gameOverEl) gameOverEl.classList.add('hidden');
    didSubmitThisRound = false;
    leaderboardData = null;
}
```

- [ ] **Step 4: Create Supabase table (manual step)**

Run this SQL in Supabase dashboard:

```sql
CREATE TABLE mannheim_skater_scores (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mannheim_skater_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read" ON mannheim_skater_scores FOR SELECT USING (true);
CREATE POLICY "allow_insert" ON mannheim_skater_scores FOR INSERT WITH CHECK (true);
```

- [ ] **Step 5: Verify in browser**

Expected: Game over shows leaderboard with top 10 scores. Name input form lets you submit. After submit, leaderboard refreshes. Enter/tap to restart still works.

- [ ] **Step 6: Commit**

```bash
git add mannheim-skater/js/config.js mannheim-skater/js/hud.js mannheim-skater/index.html
git commit -m "feat(mannheim-skater): add Supabase online leaderboard with submit form"
```

---

## Task 11: Audio System

**Files:**
- Create: `mannheim-skater/js/audio.js`
- Modify: `mannheim-skater/js/main.js` (trigger sounds)
- Modify: `mannheim-skater/js/collectibles.js` (play collect sounds)

**Goal:** Sound effects for key game events: collect, power-up, crash, jump, lane switch.

- [ ] **Step 1: Create `mannheim-skater/js/audio.js`**

```js
// mannheim-skater/js/audio.js

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;

// Unlock audio context on first user interaction
function unlockAudio() {
    if (audioUnlocked) return;
    audioCtx.resume();
    audioUnlocked = true;
}
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });

// Synthesize simple sounds (no asset files needed)
function playTone(freq, duration, type = 'square', volume = 0.15) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export function playCollect() {
    playTone(880, 0.1, 'square', 0.1);
    setTimeout(() => playTone(1100, 0.1, 'square', 0.1), 50);
}

export function playPowerUp() {
    playTone(440, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(660, 0.15, 'sine', 0.15), 100);
    setTimeout(() => playTone(880, 0.2, 'sine', 0.15), 200);
}

export function playCrash() {
    // Noise burst
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.1));
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
}

export function playJump() {
    playTone(300, 0.08, 'square', 0.08);
    setTimeout(() => playTone(500, 0.08, 'square', 0.08), 40);
}

export function playLaneSwitch() {
    playTone(200, 0.05, 'sine', 0.05);
}
```

- [ ] **Step 2: Wire up sounds**

In `mannheim-skater/js/input.js`, add:

```js
import { playJump, playLaneSwitch } from './audio.js';
```

Add `playLaneSwitch();` at the end of `switchLane()` (after setting `laneSwitchProgress = 0`).
Add `playJump();` at the end of `triggerJump()` (after setting `isJumping = true`).

In `mannheim-skater/js/collectibles.js`, add:

```js
import { playCollect, playPowerUp } from './audio.js';
```

Add `playCollect();` where a brezel is collected.
Add `playPowerUp();` in `activatePowerUp()`.

In `mannheim-skater/js/main.js`, add:

```js
import { playCrash } from './audio.js';
```

Add `playCrash();` when `collisionResult === 'hit'`.

- [ ] **Step 3: Verify in browser**

Expected: Chip-tune-style sound effects for collecting brezels (high chirp), power-ups (ascending tone), jumping (quick blip), lane switching (soft swoosh), crash (noise burst).

- [ ] **Step 4: Commit**

```bash
git add mannheim-skater/js/audio.js mannheim-skater/js/input.js mannheim-skater/js/collectibles.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add synthesized sound effects for all game events"
```

---

## Task 12: Easter Eggs + Polish

**Files:**
- Modify: `mannheim-skater/js/world.js` (Quadrate signs, Mannheim text, night mode)
- Modify: `mannheim-skater/js/scene.js` (night mode lighting)
- Modify: `mannheim-skater/js/config.js` (Quadrate data, night threshold)

**Goal:** Quadrate street signs on the roadside, "Monnem" graffiti text, night mode after 3000 points.

- [ ] **Step 1: Add Quadrate signs and Mannheim text to `mannheim-skater/js/config.js`**

Add:

```js
// Quadrate system: valid block letters and max numbers
export const QUADRATE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
export const QUADRATE_MAX_NUMBER = 7;
export const NIGHT_MODE_SCORE = 3000;
```

- [ ] **Step 2: Add Quadrate signs to `mannheim-skater/js/world.js`**

Add a function to create a sign mesh with text:

```js
import { QUADRATE_LETTERS, QUADRATE_MAX_NUMBER, NIGHT_MODE_SCORE } from './config.js';

function createQuadrateSign(parent, sideX, chunkDepth) {
    // Random Quadrate designation
    const letter = QUADRATE_LETTERS[Math.floor(Math.random() * QUADRATE_LETTERS.length)];
    const number = 1 + Math.floor(Math.random() * QUADRATE_MAX_NUMBER);
    const houseNumber = 1 + Math.floor(Math.random() * 20);
    const text = `${letter}${number}, ${houseNumber}`;

    // Sign post
    const postGeo = new THREE.BoxGeometry(0.05, 1.2, 0.05);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(sideX, 0.6, (Math.random() - 0.5) * chunkDepth * 0.6);

    // Sign plate
    const plateGeo = new THREE.BoxGeometry(0.6, 0.3, 0.05);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x003399 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.5;
    post.add(plate);

    // Text via canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#003399';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 64, 40);
    const texture = new THREE.CanvasTexture(canvas);
    plate.material = new THREE.MeshStandardMaterial({ map: texture });

    parent.add(post);
}
```

Call `createQuadrateSign()` in `addChunk()` with ~20% chance:

```js
    if (Math.random() < 0.2) {
        const side = Math.random() < 0.5 ? -GROUND_WIDTH / 2 - 0.5 : GROUND_WIDTH / 2 + 0.5;
        createQuadrateSign(group, side, GROUND_CHUNK_DEPTH);
    }
```

- [ ] **Step 3: Add night mode to `mannheim-skater/js/scene.js`**

Add exported function:

```js
export function setNightMode(enabled) {
    if (enabled) {
        scene.background.set(0x111122);
        scene.fog.color.set(0x111122);
        ambientLight.intensity = 0.2;
        directionalLight.intensity = 0.3;
        directionalLight.color.set(0x6666cc);
    } else {
        scene.background.set(0xf5efe0);
        scene.fog.color.set(0xf5efe0);
        ambientLight.intensity = 0.7;
        directionalLight.intensity = 0.8;
        directionalLight.color.set(0xffffff);
    }
}
```

- [ ] **Step 4: Trigger night mode in `mannheim-skater/js/main.js`**

Add import:

```js
import { setNightMode } from './scene.js';
import { NIGHT_MODE_SCORE } from './config.js';
```

In game loop, after `checkZoneChange();`:

```js
        if (state.score >= NIGHT_MODE_SCORE) {
            setNightMode(true);
        }
```

In `restart()`, add `setNightMode(false);`.

- [ ] **Step 5: Verify in browser**

Expected: Blue street signs with Quadrate designations ("Q7, 12") appear along the road. After 3000 points, the scene darkens to night mode with dim purple-blue lighting.

- [ ] **Step 6: Commit**

```bash
git add mannheim-skater/js/config.js mannheim-skater/js/world.js mannheim-skater/js/scene.js mannheim-skater/js/main.js
git commit -m "feat(mannheim-skater): add Quadrate street signs, night mode, and Mannheim easter eggs"
```

---

## Task 13: Landing Page Link + Final Integration

**Files:**
- Modify: `index.html` (add link to Mannheim Skater)
- Modify: `mannheim-skater/index.html` (back link to main site)

**Goal:** Mannheim Skater is accessible from the main landing page.

- [ ] **Step 1: Add link in main `index.html`**

Find the existing navigation/game links section and add:

```html
<a href="mannheim-skater/">Mannheim Skater</a>
```

- [ ] **Step 2: Add back link in `mannheim-skater/index.html`**

Add inside `#hud`, below the score:

```html
<a href="../" id="back-link" style="position:absolute;bottom:10px;left:10px;color:#fff;font-size:8px;text-decoration:none;opacity:0.5;pointer-events:auto;">Back</a>
```

- [ ] **Step 3: Full integration test**

Open `index.html` → click Mannheim Skater link → game loads.
Test complete flow:
1. Game starts, player bobs on ground
2. A/D switches lanes smoothly, Space jumps
3. Obstacles appear and scroll, collision triggers game over
4. Score counts up, brezels add points
5. Power-ups activate with HUD countdown
6. Zones change visually every ~500 points
7. Quadrate signs appear on the roadside
8. Night mode kicks in after 3000
9. Game over shows leaderboard, name can be submitted
10. Enter restarts the game

- [ ] **Step 4: Commit**

```bash
git add index.html mannheim-skater/index.html
git commit -m "feat: link Mannheim Skater from landing page"
```
