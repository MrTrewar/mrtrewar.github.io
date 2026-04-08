import { initScene, updateCameraForPhase, renderScene, getScene, setNightMode } from './scene.js';
import { state, resetState } from './game-state.js';
import { createPlayer, updatePlayer } from './player.js';
import { initInput } from './input.js';
import { initWorld, updateWorld, checkZoneChange } from './world.js';
import { initObstacles, updateObstacles, getObstacles } from './obstacles.js';
import { checkObstacleCollisions } from './collision.js';
import { updateHUD, showGameOver, hideGameOver, showPowerUpBar, hidePowerUpBar } from './hud.js';
import { SCORE_DISTANCE_PER_SECOND, SCORE_NEAR_MISS, SCORE_JUMP_OVER, NIGHT_MODE_SCORE } from './config.js';
import { initCollectibles, updateCollectibles, updatePowerUpTimer } from './collectibles.js';
import { playCrash } from './audio.js';

let lastTime = 0;

function init() {
    const container = document.getElementById('game-container');
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
        state.elapsedTime += dt;

        // Distance score
        state.distanceScore += SCORE_DISTANCE_PER_SECOND * state.scoreMultiplier * dt;
        state.score = state.distanceScore + state.bonusScore;

        checkZoneChange();
        if (state.score >= NIGHT_MODE_SCORE) {
            setNightMode(true);
        }

        updateWorld(dt, scene);
        updatePlayer(dt);
        updateObstacles(dt, scene);
        updateCollectibles(dt, scene);

        updatePowerUpTimer(dt);
        if (state.activePowerUp) {
            showPowerUpBar(state.activePowerUp.name, state.activePowerUp.remaining / state.activePowerUp.total);
        } else {
            hidePowerUpBar();
        }

        const collisionResult = checkObstacleCollisions(getObstacles());
        if (collisionResult === 'hit') {
            state.isGameOver = true;
            playCrash();
            showGameOver();
        } else if (collisionResult === 'near-miss') {
            state.bonusScore += SCORE_NEAR_MISS * state.scoreMultiplier;
        }

        updateHUD();
    }

    updateCameraForPhase(state.phase, state.chunkCount);
    renderScene();
    requestAnimationFrame(gameLoop);
}

init();
