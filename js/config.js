// js/config.js

const GAME_AREA_WIDTH = window.innerWidth;
const GAME_AREA_HEIGHT = window.innerHeight;

const gameSettings = {
    gravity: 0.7,
    pushForce: 0.5,
    maxPlayerDX: 3,
    worldScrollSpeed: 2.5,
    jumpForce: 14.5,
    playerWidth: GAME_AREA_WIDTH * 0.08,  // z. B. 8% der Breite
    playerHeight: GAME_AREA_HEIGHT * 0.19, // z. B. 19% der Höhe
    railHeight: 8,
    ollieScore: 10,
    grindScorePerFrame: 1,
    grindAdjustSpeed: 1.5,
    visualPlayerYOffset: 10,

    // Objektgenerierung (angepasst an Höhe)
    minGapBetweenObjects: GAME_AREA_WIDTH * 0.12,
    maxGapBetweenObjects: GAME_AREA_WIDTH * 0.3,
    maxHeightDiffUp: GAME_AREA_HEIGHT * 0.2,
    maxHeightDiffDown: GAME_AREA_HEIGHT * 0.25,
    minPlatformWidth: GAME_AREA_WIDTH * 0.15,
    maxPlatformWidth: GAME_AREA_WIDTH * 0.3,
    minRailWidth: GAME_AREA_WIDTH * 0.2,
    maxRailWidth: GAME_AREA_WIDTH * 0.37,
    objectGenerationThreshold: GAME_AREA_WIDTH * 0.3,

    // Plattformpositionen relativ zur Spielfläche
    groundLevelY: GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.12),
    minObjectY: GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.45),
    maxObjectY: GAME_AREA_HEIGHT - (GAME_AREA_HEIGHT * 0.22),
};