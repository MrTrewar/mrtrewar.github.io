import { state } from './game-state.js';
import { LANE_POSITIONS, LANE_WIDTH, PLAYER_BODY_W, PLAYER_BODY_H, JUMP_HEIGHT } from './config.js';

/*
 * Check collisions between player and obstacles.
 * Player is always at visual Z = 0.
 * Returns: 'hit' | 'near-miss' | null
 */
export function checkObstacleCollisions(obstacles) {
    // Use interpolated X position matching the visual player position
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
