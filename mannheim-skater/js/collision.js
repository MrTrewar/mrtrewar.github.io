import { state } from './game-state.js';
import {
    LANE_POSITIONS, PLAYER_BODY_W, JUMP_HEIGHT,
    GRAZE_OVERLAP_THRESHOLD,
} from './config.js';

/*
 * Check collisions between player and obstacles.
 * Player is always at visual Z = 0.
 * Returns: 'hit' | 'graze' | 'near-miss' | 'jump-over' | 'shield-break' | 'bulldozer-hit' | null
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
