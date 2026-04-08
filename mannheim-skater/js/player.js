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

    // Stumble tilt override
    if (state.isStumbling) {
        const stumbleWobble = Math.sin(state.elapsedTime * 20) * 0.15;
        playerGroup.rotation.z += stumbleWobble;
    }

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

    // --- Idle bob or hover ---
    if (!state.isJumping) {
        if (state.isHovering) {
            playerGroup.position.y = 1.5 + Math.sin(state.elapsedTime * 2) * 0.1;
        } else {
            playerGroup.position.y = Math.sin(state.elapsedTime * 3) * 0.04;
        }
    }

    // Z position stays at 0 (camera follows world scrolling, player is visually centered)
}

export function getPlayerGroup() { return playerGroup; }

export function getPlayerWorldZ() { return state.playerZ; }
