// js/config.js

const GAME_AREA_WIDTH = 600;
const GAME_AREA_HEIGHT = 400;

const gameSettings = {
    gravity: 0.7,
    pushForce: 0.5,
    maxPlayerDX: 3,
    worldScrollSpeed: 2.5,
    jumpForce: 14.5,     // Ggf. leicht erhöht für das neue "Gewicht"
    playerWidth: 50,     // NEU: Breite der Kollisionsbox (z.B. Skateboard-Breite)
    playerHeight: 75,    // NEU: Gesamthöhe = Körperhöhe (60) + Boardhöhe (15)
    railHeight: 8,
    ollieScore: 10,
    grindScorePerFrame: 1,
    grindAdjustSpeed: 1.5,

    // Objektgenerierung - diese Werte sind jetzt noch wichtiger anzupassen!
    minGapBetweenObjects: 80,
    maxGapBetweenObjects: 190, // Etwas mehr Varianz und größere mögliche Lücken
    maxHeightDiffUp: 80,       // Muss zur neuen effektiven Sprunghöhe passen
    maxHeightDiffDown: 100,
    minPlatformWidth: 100,
    maxPlatformWidth: 180,
    minRailWidth: 120,
    maxRailWidth: 220,
    objectGenerationThreshold: 180,
    groundLevelY: GAME_AREA_HEIGHT - 20 - 80,
    minObjectY: GAME_AREA_HEIGHT - 170 - 80, // Höchste Plattform Oberkante
    maxObjectY: GAME_AREA_HEIGHT - 40 - 80,   // Niedrigste Plattform Oberkante (außer Boden)
};