import * as THREE from 'three';
import {
    LANE_POSITIONS, BREZEL_SPAWN_CHANCE, BREZEL_Y_OFFSET,
    BREZEL_ROTATION_SPEED, SCORE_PER_BREZEL,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    LANE_COUNT, PLAYER_BODY_W, JUMP_HEIGHT,
    POWERUP_SPAWN_CHANCE,
    POWERUP_EISTEE_DURATION, POWERUP_RAD_DURATION,
    POWERUP_TICKET_DURATION, POWERUP_SPRAY_DURATION, POWERUP_BOARD_DURATION,
} from './config.js';
import { state } from './game-state.js';
import { playCollect, playPowerUp } from './audio.js';

const POWERUP_DEFS = [
    { type: 'doener',   color: 0x8B4513, name: 'Döner',       duration: 0,                      emissive: 0x442200 },
    { type: 'eistee',   color: 0xFFDD00, name: 'Eistee',      duration: POWERUP_EISTEE_DURATION, emissive: 0x665500 },
    { type: 'rad',      color: 0xDD2222, name: 'Kurpfalz-Rad', duration: POWERUP_RAD_DURATION,   emissive: 0x550000 },
    { type: 'ticket',   color: 0x22CC44, name: 'Monatsticket', duration: POWERUP_TICKET_DURATION, emissive: 0x005500 },
    { type: 'spray',    color: 0xFF00FF, name: 'Graffiti',     duration: POWERUP_SPRAY_DURATION,  emissive: 0x550055 },
    { type: 'board',    color: 0x00FFFF, name: 'Board-Up',     duration: POWERUP_BOARD_DURATION,  emissive: 0x005555 },
];

const brezels = [];
let nextBrezelZ = 8; // start a bit ahead

const powerups = [];
let nextPowerupZ = 15;

const brezelGeo = new THREE.TorusGeometry(0.25, 0.08, 8, 16);
const brezelMat = new THREE.MeshStandardMaterial({ color: 0xdaa520, metalness: 0.3, roughness: 0.6 });

export function initCollectibles() {
    brezels.length = 0;
    nextBrezelZ = 8;
    powerups.length = 0;
    nextPowerupZ = 15;
}

export function getBrezels() { return brezels; }
export function getPowerups() { return powerups; }

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

export function updateCollectibles(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    const speed = state.activePowerUp?.type === 'eistee'
        ? state.scrollSpeed * 1.5
        : state.scrollSpeed;

    // Move brezels and check collection
    const playerLane = state.laneSwitchProgress >= 1 ? state.currentLane : state.targetLane;
    const jumpH = state.hasHighJump ? JUMP_HEIGHT * 1.5 : JUMP_HEIGHT;
    const playerY = state.isJumping
        ? 4 * jumpH * state.jumpProgress * (1 - state.jumpProgress)
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
                    state.bonusScore += SCORE_PER_BREZEL * state.scoreMultiplier;
                    // Shrink + fade animation
                    scene.remove(b.mesh);
                    brezels.splice(i, 1);
                    playCollect();
                    continue;
                }
            }
        }

        // Despawn if behind (don't dispose shared geometry/material)
        if (b.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(b.mesh);
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
}

function activatePowerUp(pu) {
    playPowerUp();
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
