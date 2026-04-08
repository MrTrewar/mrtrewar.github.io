import { initScene, updateCameraForPhase, renderScene, getScene, setNightMode, triggerCameraShake, updateCameraShake } from './scene.js';
import { state, resetState } from './game-state.js';
import { createPlayer, updatePlayer } from './player.js';
import { initInput } from './input.js';
import { initWorld, updateWorld, checkZoneChange } from './world.js';
import { initObstacles, updateObstacles, getObstacles, destroyObstacle } from './obstacles.js';
import { checkObstacleCollisions } from './collision.js';
import { updateHUD, showGameOver, hideGameOver, showPowerUpBar, hidePowerUpBar, showStumbleIndicator } from './hud.js';
import { SCORE_DISTANCE_PER_SECOND, SCORE_NEAR_MISS, SCORE_JUMP_OVER, NIGHT_MODE_SCORE, STUMBLE_DURATION, STUMBLE_SPEED_FACTOR, STUMBLE_RECOVERY_DURATION } from './config.js';
import { initCollectibles, updateCollectibles, updatePowerUpTimer } from './collectibles.js';
import { playCrash, playGraze, playBulldozerHit } from './audio.js';
import { preloadAllModels } from './models.js';

let lastTime = 0;

async function init() {
    const container = document.getElementById('game-container');
    const loadingFill = document.getElementById('loading-fill');
    const loadingScreen = document.getElementById('loading-screen');

    // Preload models with progress bar
    await preloadAllModels((fraction) => {
        if (loadingFill) loadingFill.style.width = `${fraction * 100}%`;
    });

    // Hide loading screen
    if (loadingScreen) loadingScreen.style.display = 'none';

    initScene(container);
    const scene = getScene();

    resetState();
    initWorld(scene);
    initObstacles();
    initCollectibles();
    createPlayer(scene);
    initInput();

    window.addEventListener('game-restart', () => restart());

    requestAnimationFrame(gameLoop);
}

function restart() {
    const scene = getScene();
    // Remove all objects and rebuild
    while (scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        if (child.traverse) {
            child.traverse(c => {
                if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); }
            });
        }
    }
    // Re-add lights (initScene stored them, but simplest to re-init scene)
    // For now, full re-init
    lastTime = 0;
    hideGameOver();
    const container = document.getElementById('game-container');
    // Remove old canvas
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    initScene(container);
    const newScene = getScene();
    resetState();
    setNightMode(false);
    initWorld(newScene);
    initObstacles();
    initCollectibles();
    createPlayer(newScene);
}

function gameLoop(timestamp) {
    const dt = lastTime === 0 ? 0.016 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    const scene = getScene();

    if (state.isRunning && !state.isPaused && !state.isGameOver) {
        const rawDt = dt;
        const scaledDt = dt * state.timeScale;

        state.elapsedTime += rawDt;

        // Distance score (uses raw dt so score ticks normally during slow-mo)
        state.distanceScore += SCORE_DISTANCE_PER_SECOND * state.scoreMultiplier * rawDt;
        state.score = state.distanceScore + state.bonusScore;

        checkZoneChange();
        if (state.score >= NIGHT_MODE_SCORE) {
            setNightMode(true);
        }

        updateWorld(scaledDt, scene);
        updatePlayer(scaledDt);
        updateObstacles(scaledDt, scene);
        updateCollectibles(scaledDt, scene);

        updatePowerUpTimer(rawDt);
        if (state.activePowerUp) {
            showPowerUpBar(state.activePowerUp.name, state.activePowerUp.remaining / state.activePowerUp.total);
        } else {
            hidePowerUpBar();
        }

        // Collision handling
        const collisionResult = checkObstacleCollisions(getObstacles());
        if (collisionResult === 'hit') {
            state.isGameOver = true;
            playCrash();
            showGameOver();
        } else if (collisionResult === 'graze') {
            state.isStumbling = true;
            state.stumbleSpeedBackup = state.scrollSpeed;
            state.stumbleTimer = STUMBLE_DURATION;
            state.scrollSpeed *= STUMBLE_SPEED_FACTOR;
            triggerCameraShake(0.3, 0.3);
            playGraze();
            showStumbleIndicator();
        } else if (collisionResult === 'shield-break') {
            triggerCameraShake(0.5, 0.4);
            playCrash();
        } else if (collisionResult === 'bulldozer-hit') {
            const hitObs = getObstacles().find(o => o._bulldozerHit);
            if (hitObs) {
                delete hitObs._bulldozerHit;
                destroyObstacle(hitObs, scene);
                state.bonusScore += 10 * state.scoreMultiplier;
                playBulldozerHit();
            }
        } else if (collisionResult === 'near-miss') {
            state.bonusScore += SCORE_NEAR_MISS * state.scoreMultiplier;
        } else if (collisionResult === 'jump-over') {
            state.bonusScore += SCORE_JUMP_OVER * state.scoreMultiplier;
        }

        // Stumble recovery
        if (state.isStumbling) {
            state.stumbleTimer -= rawDt;
            if (state.stumbleTimer <= 0) {
                state.isStumbling = false;
                state.scrollSpeed = state.stumbleSpeedBackup;
            }
        }

        updateHUD();
    }

    updateCameraShake(dt);
    updateCameraForPhase(state.phase, state.chunkCount);
    renderScene();
    requestAnimationFrame(gameLoop);
}

init();
