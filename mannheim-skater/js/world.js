import * as THREE from 'three';
import {
    GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE,
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    SCROLL_SPEED_INCREMENT, SPEED_INCREASE_INTERVAL, SCROLL_SPEED_MAX,
    ZONES, ZONE_CHANGE_INTERVAL,
    QUADRATE_LETTERS, QUADRATE_MAX_NUMBER, NIGHT_MODE_SCORE,
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

    // Side decorations (buildings/objects on left and right)
    const decoChance = 0.6;
    if (Math.random() < decoChance) {
        addSideDecoration(group, zone, -GROUND_WIDTH / 2 - 1, GROUND_CHUNK_DEPTH);
    }
    if (Math.random() < decoChance) {
        addSideDecoration(group, zone, GROUND_WIDTH / 2 + 1, GROUND_CHUNK_DEPTH);
    }

    if (Math.random() < 0.2) {
        const side = Math.random() < 0.5 ? -GROUND_WIDTH / 2 - 0.5 : GROUND_WIDTH / 2 + 0.5;
        createQuadrateSign(group, side, GROUND_CHUNK_DEPTH);
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

    // Add new chunks ahead as needed (may need multiple per frame during speed boosts)
    const targetFarthest = GROUND_CHUNK_DEPTH * (GROUND_CHUNKS_VISIBLE - 2);
    for (let safety = 0; safety < 5; safety++) {
        const farthestZ = groundChunks.length > 0
            ? Math.max(...groundChunks.map(c => c.position.z))
            : 0;
        if (farthestZ + GROUND_CHUNK_DEPTH >= targetFarthest) break;
        addChunk(scene);
    }
}

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

export function checkZoneChange() {
    const targetZone = Math.floor(state.score / ZONE_CHANGE_INTERVAL) % ZONES.length;
    if (targetZone !== state.currentZoneIndex) {
        state.currentZoneIndex = targetZone;
        state.lastZoneChangeScore = state.score;
        // New chunks will use the new zone colors; existing chunks keep their color
        // This creates a natural transition as old chunks scroll away
    }
}

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
