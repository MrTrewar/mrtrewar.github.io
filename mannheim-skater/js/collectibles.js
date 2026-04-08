import * as THREE from 'three';
import {
    LANE_POSITIONS, BREZEL_SPAWN_CHANCE, BREZEL_Y_OFFSET,
    BREZEL_ROTATION_SPEED, SCORE_PER_BREZEL,
    OBSTACLE_SPAWN_DISTANCE, OBSTACLE_DESPAWN_DISTANCE,
    LANE_COUNT, PLAYER_BODY_W, JUMP_HEIGHT,
    POWERUP_SPAWN_CHANCE, POWERUP_DEFS,
    BREZEL_FORMATIONS, FORMATION_CHANCE,
} from './config.js';
import { state } from './game-state.js';
import { playCollect, playPowerUp } from './audio.js';
import { getObstacles } from './obstacles.js';

const brezels = [];
let nextBrezelZ = 8;

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

// --- Formation system ---

function pickFormation() {
    const totalWeight = BREZEL_FORMATIONS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * totalWeight;
    for (const f of BREZEL_FORMATIONS) {
        r -= f.weight;
        if (r <= 0) return f;
    }
    return BREZEL_FORMATIONS[0];
}

function formationFitsWithOffset(points, offset) {
    return points.every(p => {
        const lane = p.lane + offset;
        return lane >= 0 && lane < LANE_COUNT;
    });
}

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
        const nearbyObs = obstacles.filter(o =>
            Math.abs(o.mesh.position.z - baseVisualZ) < 8
        );
        const blockedLanes = new Set();
        nearbyObs.forEach(o => o.lanes.forEach(l => blockedLanes.add(l)));

        const safeOffsets = validOffsets.filter(offset =>
            points.every(p => !blockedLanes.has(p.lane + offset))
        );
        chosenOffset = safeOffsets.length > 0
            ? safeOffsets[Math.floor(Math.random() * safeOffsets.length)]
            : validOffsets[Math.floor(Math.random() * validOffsets.length)];
    } else {
        chosenOffset = validOffsets[Math.floor(Math.random() * validOffsets.length)];
    }

    let maxZ = 0;
    for (const p of points) {
        const lane = p.lane + chosenOffset;
        const mesh = new THREE.Mesh(brezelGeo, brezelMat);
        const y = p.y !== undefined ? p.y : BREZEL_Y_OFFSET;
        mesh.position.set(LANE_POSITIONS[lane], y, baseVisualZ + p.z);
        mesh.castShadow = true;
        scene.add(mesh);
        brezels.push({ mesh, lane, collected: false });
        maxZ = Math.max(maxZ, p.z);
    }

    return maxZ;
}

// --- Original random scatter ---

function spawnBrezelRow(scene, visualZ) {
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

// --- Powerup spawning ---

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

    powerups.push({ mesh, lane, type: def.type, name: def.name, duration: def.duration, effect: def.effect, collected: false });
}

// --- Powerup activation/deactivation ---

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
            break;
        case 'magnet':
            // Magnet logic in updateCollectibles
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

function deactivatePowerUp(type) {
    const def = POWERUP_DEFS.find(d => d.type === type);
    if (!def) return;

    switch (def.effect) {
        case 'slowmo':
            state.timeScale = 1;
            break;
        case 'bulldozer':
            state.isBulldozer = false;
            break;
        case 'magnet':
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
    state.activePowerUp.remaining -= dt;
    if (state.activePowerUp.remaining <= 0) {
        deactivatePowerUp(state.activePowerUp.type);
        state.activePowerUp = null;
    }
}

// --- Main update ---

export function updateCollectibles(dt, scene) {
    if (!state.isRunning || state.isPaused || state.isGameOver) return;

    const speed = state.activePowerUp?.effect === 'slowmo'
        ? state.scrollSpeed // already scaled via timeScale in main.js
        : state.scrollSpeed;

    // Player state for collection checks
    const playerLane = state.laneSwitchProgress >= 1 ? state.currentLane : state.targetLane;
    const jumpH = state.hasHighJump ? JUMP_HEIGHT * 1.5 : JUMP_HEIGHT;
    const playerY = state.isJumping
        ? 4 * jumpH * state.jumpProgress * (1 - state.jumpProgress)
        : 0;

    // Hover Y for collection
    const effectivePlayerY = state.isHovering ? 1.5 : playerY;

    // Move brezels and check collection
    for (let i = brezels.length - 1; i >= 0; i--) {
        const b = brezels[i];
        b.mesh.position.z -= speed * dt;
        b.mesh.rotation.y += BREZEL_ROTATION_SPEED * dt;
        b.mesh.position.y = (b.mesh.userData.baseY || BREZEL_Y_OFFSET) + Math.sin(state.elapsedTime * 4 + i) * 0.1;

        // Collection check
        if (!b.collected && Math.abs(b.mesh.position.z) < 0.8) {
            const magnetActive = state.activePowerUp?.effect === 'magnet';

            if (b.lane === playerLane || magnetActive) {
                if (Math.abs(effectivePlayerY - BREZEL_Y_OFFSET) < 1.5 || magnetActive) {
                    b.collected = true;
                    state.bonusScore += SCORE_PER_BREZEL * state.scoreMultiplier;
                    scene.remove(b.mesh);
                    brezels.splice(i, 1);
                    playCollect();
                    continue;
                }
            }
        }

        if (b.mesh.position.z < -OBSTACLE_DESPAWN_DISTANCE) {
            scene.remove(b.mesh);
            brezels.splice(i, 1);
        }
    }

    // Spawn brezels — formation or random
    const visualSpawnZ = nextBrezelZ - state.playerZ;
    if (visualSpawnZ < OBSTACLE_SPAWN_DISTANCE) {
        if (Math.random() < BREZEL_SPAWN_CHANCE) {
            if (Math.random() < FORMATION_CHANCE) {
                const extent = spawnFormation(scene, visualSpawnZ, getObstacles());
                nextBrezelZ += extent + 3 + Math.random() * 4;
            } else {
                spawnBrezelRow(scene, visualSpawnZ);
                nextBrezelZ += 3 + Math.random() * 4;
            }
        } else {
            nextBrezelZ += 3 + Math.random() * 4;
        }
    }

    // Power-ups: move + collect
    const playerLaneForPU = state.laneSwitchProgress >= 1 ? state.currentLane : state.targetLane;
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.mesh.position.z -= speed * dt;
        pu.mesh.rotation.y += 3.0 * dt;
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
