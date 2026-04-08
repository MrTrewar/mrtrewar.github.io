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
    bonusScore: 0, // brezels + near-miss + jump-over
    scoreMultiplier: 1,

    // Power-ups
    activePowerUp: null,    // { type, remaining } or null
    hasShield: false,       // Döner shield
    hasHighJump: false,     // Skateboard upgrade

    // Zone
    currentZoneIndex: 0,
    lastZoneChangeScore: 0,

    // Route phase
    phase: 'schloss',    // 'schloss' | 'turn' | 'planken'
    chunkCount: 0,       // total chunks created since game start
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
    state.bonusScore = 0;
    state.scoreMultiplier = 1;
    state.activePowerUp = null;
    state.hasShield = false;
    state.hasHighJump = false;
    state.currentZoneIndex = 0;
    state.lastZoneChangeScore = 0;
    state.phase = 'schloss';
    state.chunkCount = 0;
}
