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

    // Spawn new obstacles ahead (skip during turn phase)
    if (state.phase === 'turn') return;

    // nextSpawnZ tracks world Z; we convert to visual Z
    // Visual Z for nextSpawnZ relative to player:
    const visualSpawnZ = nextSpawnZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        spawnObstacleRow(scene, visualSpawnZ);
        const gap = OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
        nextSpawnZ += gap;
    }
}
