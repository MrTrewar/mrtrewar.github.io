import * as THREE from 'three';
import {
    LANE_POSITIONS, LANE_COUNT,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP,
    OBSTACLE_DEFS,
} from './config.js';
import { state } from './game-state.js';

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

function createObstacleMesh(def) {
    let geo;
    if (def.shape === 'cylinder') {
        geo = new THREE.CylinderGeometry(def.w / 2, def.w / 2, def.h, 8);
    } else {
        geo = new THREE.BoxGeometry(def.w, def.h, def.d);
    }
    const mat = new THREE.MeshStandardMaterial({ color: def.color });
    return new THREE.Mesh(geo, mat);
}

function spawnObstacleRow(scene, worldZ) {
    const def = pickObstacleDef();

    const maxStart = LANE_COUNT - def.lanes;
    const startLane = Math.floor(Math.random() * (maxStart + 1));

    const mesh = createObstacleMesh(def);

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

export function updateObstacles(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    const speed = state.activePowerUp?.type === 'eistee'
        ? state.scrollSpeed * 1.5
        : state.scrollSpeed;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];

        // Movement speed based on type
        let zSpeed = speed;
        if (obs.moving) {
            if (obs.moveDir === 'toward') {
                zSpeed = speed + obs.moveSpeed;
            } else if (obs.moveDir === 'away') {
                zSpeed = Math.max(0, speed - obs.moveSpeed);
            }
        }
        obs.mesh.position.z -= zSpeed * dt;

        // Lateral movement
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

    // Spawn new obstacles ahead (skip during turn phase)
    if (state.phase === 'turn') return;

    const visualSpawnZ = nextSpawnZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        spawnObstacleRow(scene, visualSpawnZ);
        const gap = OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
        nextSpawnZ += gap;
    }
}

export function destroyObstacle(obs, scene) {
    const idx = obstacles.indexOf(obs);
    if (idx === -1) return;
    obstacles.splice(idx, 1);

    // Fling animation
    const mesh = obs.mesh;
    const startY = mesh.position.y;
    const startZ = mesh.position.z;
    const startTime = performance.now();
    const duration = 400;

    function animate() {
        const t = Math.min(1, (performance.now() - startTime) / duration);
        mesh.position.y = startY + t * 5;
        mesh.position.z = startZ - t * 3;
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
    animate();
}
