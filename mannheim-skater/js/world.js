import * as THREE from 'three';
import {
    GROUND_WIDTH, GROUND_CHUNK_DEPTH, GROUND_CHUNKS_VISIBLE,
    LANE_POSITIONS, LANE_WIDTH, LANE_COUNT,
    SCROLL_SPEED_INCREMENT, SPEED_INCREASE_INTERVAL, SCROLL_SPEED_MAX,
    ZONES, ZONE_CHANGE_INTERVAL,
    QUADRATE_LETTERS, QUADRATE_MAX_NUMBER,
    TURN_CHUNK, TURN_DURATION_CHUNKS,
} from './config.js';
import { state } from './game-state.js';
import { getCachedModel } from './models.js';

const groundChunks = [];
let nextChunkZ = 0;
let schlossGroup = null;
let wasserturmGroup = null;

// Block-pattern state for Mannheim-style buildings (3-4 houses, gap, 3-4 houses)
const blockState = {
    left: { remaining: 0, gapRemaining: 0 },
    right: { remaining: 0, gapRemaining: 0 },
};

function resetBlockState() {
    blockState.left.remaining = 0;
    blockState.left.gapRemaining = 0;
    blockState.right.remaining = 0;
    blockState.right.gapRemaining = 0;
}

export function initWorld(scene) {
    // Clear old chunks
    groundChunks.forEach(c => scene.remove(c));
    groundChunks.length = 0;
    nextChunkZ = -GROUND_CHUNK_DEPTH; // start behind player
    resetBlockState();
    schlossGroup = null;
    wasserturmGroup = null;
    createSchloss(scene);

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

    // Side decorations: Mannheim-style block pattern (3-4 houses, street gap, repeat)
    addBlockBuilding(group, zone, 'left', -GROUND_WIDTH / 2 - 1, GROUND_CHUNK_DEPTH);
    addBlockBuilding(group, zone, 'right', GROUND_WIDTH / 2 + 1, GROUND_CHUNK_DEPTH);

    if (Math.random() < 0.2) {
        const side = Math.random() < 0.5 ? -GROUND_WIDTH / 2 - 0.5 : GROUND_WIDTH / 2 + 0.5;
        createQuadrateSign(group, side, GROUND_CHUNK_DEPTH);
    }

    group.position.z = nextChunkZ + GROUND_CHUNK_DEPTH / 2;
    group.userData.backEdgeZ = nextChunkZ;

    scene.add(group);

    // Spawn Wasserturm as permanent background landmark at the turn point
    if (state.chunkCount === TURN_CHUNK && !wasserturmGroup) {
        wasserturmGroup = createWasserturm(scene);
    }

    groundChunks.push(group);
    state.chunkCount++;
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

    // Phase transitions based on chunk count
    if (state.phase === 'schloss' && state.chunkCount >= TURN_CHUNK) {
        state.phase = 'turn';
    }
    if (state.phase === 'turn' && state.chunkCount >= TURN_CHUNK + TURN_DURATION_CHUNKS) {
        state.phase = 'planken';
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

    // Add new chunks ahead — keep ground filled beyond camera view
    // We need chunks extending to at least GROUND_CHUNKS_VISIBLE * GROUND_CHUNK_DEPTH ahead
    const requiredFrontEdge = GROUND_CHUNK_DEPTH * (GROUND_CHUNKS_VISIBLE - 1);
    for (let safety = 0; safety < 8; safety++) {
        const farthestZ = groundChunks.length > 0
            ? Math.max(...groundChunks.map(c => c.position.z + GROUND_CHUNK_DEPTH / 2))
            : 0;
        if (farthestZ >= requiredFrontEdge) break;
        // Position new chunk right after the farthest existing one
        nextChunkZ = farthestZ;
        addChunk(scene);
    }
}

function addBlockBuilding(parent, zone, side, sideX, chunkDepth) {
    const bs = blockState[side];

    // If in a gap (street between blocks), count down and skip
    if (bs.gapRemaining > 0) {
        bs.gapRemaining--;
        return;
    }

    // If no block is active, start a new one (3-4 houses)
    if (bs.remaining <= 0) {
        bs.remaining = 3 + Math.floor(Math.random() * 2); // 3 or 4 houses
    }

    // Place a building for this chunk
    const baseColor = getZoneBuildingColor(zone);
    // Slight color variation per building
    const colorVariation = (Math.random() - 0.5) * 0.08;
    const color = new THREE.Color(baseColor);
    color.r = Math.max(0, Math.min(1, color.r + colorVariation));
    color.g = Math.max(0, Math.min(1, color.g + colorVariation));
    color.b = Math.max(0, Math.min(1, color.b + colorVariation));

    const height = 2.0 + Math.random() * 2.5;
    const width = 1.5 + Math.random() * 1.0;
    const depth = GROUND_CHUNK_DEPTH * 0.85; // fill most of the chunk depth

    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sideX, height / 2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    // Optional: add a darker "roof" slab on top for visual variety
    if (Math.random() < 0.5) {
        const roofGeo = new THREE.BoxGeometry(width + 0.1, 0.15, depth + 0.1);
        const roofColor = new THREE.Color(baseColor).multiplyScalar(0.7);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(sideX, height + 0.075, 0);
        roof.castShadow = true;
        parent.add(roof);
    }

    bs.remaining--;

    // When block is done, start a gap (1-2 chunks = cross-street)
    if (bs.remaining <= 0) {
        bs.gapRemaining = 1 + Math.floor(Math.random() * 2); // 1 or 2 chunks gap
    }
}

function getZoneBuildingColor(zone) {
    switch (zone.id) {
        case 'planken':    return 0xeeddbb; // cream buildings
        case 'jungbusch':  return 0x776655; // dark brownish
        case 'hafen':      return 0x995533; // rusty containers
        case 'luisenpark': return 0x338833; // trees (green)
        default: return 0xaaaaaa;
    }
}

function createSchloss(scene) {
    // Try to use loaded GLB model
    const glbModel = getCachedModel('schloss');
    if (glbModel) {
        glbModel.position.set(0, 0, -12);
        scene.add(glbModel);
        return glbModel;
    }

    // Fallback: box primitives
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

function createWasserturm(scene) {
    const turm = new THREE.Group();
    const sandstone = 0xd4c0a0;

    // Large scale — it's far away but needs to be clearly visible on the horizon
    const scale = 6;

    // Tower body (cylinder)
    const bodyGeo = new THREE.CylinderGeometry(1.2 * scale, 1.4 * scale, 6 * scale, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: sandstone, fog: false });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3 * scale;
    turm.add(body);

    // Dome on top
    const domeGeo = new THREE.SphereGeometry(1.6 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x668866, fog: false });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 6 * scale;
    turm.add(dome);

    // Base platform
    const baseGeo = new THREE.BoxGeometry(4 * scale, 0.5 * scale, 4 * scale);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xbbaa88, fog: false });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.25 * scale;
    turm.add(base);

    // Fixed position far on the horizon — never moves, always visible
    turm.position.set(0, -5, 80);

    scene.add(turm);
    return turm;
}

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
