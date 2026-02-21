const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const GAME_AREA_WIDTH = isMobile ? window.innerWidth : 600;
const GAME_AREA_HEIGHT = isMobile ? window.innerHeight : 400;

const gameSettings = {
    gravity: 0.7,
    pushForce: 0.5,
    maxPlayerDX: 3,
    worldScrollSpeed: 2.5,
    jumpForce: 14.5,
    coyoteTimeFrames: 7,
    jumpBufferFrames: 8,
    comboWindowFrames: 180,
    maxComboMultiplier: 8,
    playerWidth: isMobile ? GAME_AREA_WIDTH * 0.08 : 50,
    playerHeight: isMobile ? GAME_AREA_HEIGHT * 0.19 : 75,
    railHeight: 8,
    ollieScore: 10,
    grindScorePerFrame: 1,
    grindAdjustSpeed: 1.5,
    visualPlayerYOffset: 10,

    minGapBetweenObjects: isMobile ? GAME_AREA_WIDTH * 0.12 : 80,
    maxGapBetweenObjects: isMobile ? GAME_AREA_WIDTH * 0.3 : 190,
    maxHeightDiffUp: isMobile ? GAME_AREA_HEIGHT * 0.2 : 80,
    maxHeightDiffDown: isMobile ? GAME_AREA_HEIGHT * 0.25 : 100,
    minPlatformWidth: isMobile ? GAME_AREA_WIDTH * 0.15 : 100,
    maxPlatformWidth: isMobile ? GAME_AREA_WIDTH * 0.3 : 180,
    minRailWidth: isMobile ? GAME_AREA_WIDTH * 0.2 : 120,
    maxRailWidth: isMobile ? GAME_AREA_WIDTH * 0.37 : 220,
    objectGenerationThreshold: isMobile ? GAME_AREA_WIDTH * 0.3 : 180,

    groundLevelY: isMobile ? GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.12) : 370,
    minObjectY: isMobile ? GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.45) : 230,
    maxObjectY: isMobile ? GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.22) : 360,
};

// Level configuration
const LEVELS = [
    { id: 1, name: "JUNGLE",    bg: "assets/images/backgrounds/level1_bg.jpg", scoreThreshold: 0,    scrollSpeedBase: 2.5 },
    { id: 2, name: "CITY",      bg: "assets/images/backgrounds/level2_bg.jpg", scoreThreshold: 800,  scrollSpeedBase: 3.5 },
    { id: 3, name: "NIGHTPARK", bg: "assets/images/backgrounds/level3_bg.jpg", scoreThreshold: 2000, scrollSpeedBase: 4.5 },
];

// Supabase configuration — fill in your values from the Supabase dashboard
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';
