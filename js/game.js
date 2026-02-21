// js/game.js
const gameArea = document.getElementById('game-area');
let backgroundScrollX = 0;
const BACKGROUND_SCROLL_SPEED_FACTOR = 0.3;
let timeSinceStart = 0;
let speedIncreaseInterval = 50;
let scrollSpeedBase = LEVELS[0].scrollSpeedBase;
let scrollSpeedMax = 100;
let scrollSpeedIncrement = 0.3;

// Delta time & loop state
let lastTime = 0;
let isPaused = false;

// Level system
let currentLevel = 0;
let lastSpeedIncrease = 0;

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function resolvePlayerCollisionsAndUpdatePosition(deltaTime) {
    if (playerState.isGameOver) return;
    let nextY = playerState.y + playerState.dy * deltaTime;
    playerState.isOnGround = false;
    let wasGrinding = playerState.isGrinding;

    if (playerState.isGrinding && playerState.currentRail) {
        const rail = playerState.currentRail;
        const isHorizontallyOffRail = playerState.x + gameSettings.playerWidth < rail.x || playerState.x > rail.x + rail.width;
        const isRailVisuallyGone = rail.x + rail.width < 0;

        if (isHorizontallyOffRail || isRailVisuallyGone) {
            playerState.isGrinding = false;
            playerState.currentRail = null;
            if (soundGrind) {
                soundGrind.pause();
                soundGrind.currentTime = 0;
            }
            if (playerElement) {
                playerElement.classList.remove('grinding');
                playerElement.classList.add('jumping');
            }
        }
    }

    const playerRect = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
    const prevPlayerRect = { x: playerState.x - playerState.dx * deltaTime, y: playerState.y, width: gameSettings.playerWidth, height: gameSettings.playerHeight };

    for (const obj of worldObjects) {
        if (obj.type === 'killzone') {
            const killzoneRect = { x: 0, y: GAME_AREA_HEIGHT, width: GAME_AREA_WIDTH, height: 20 };
            const playerScreenRectForKill = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
            if (checkCollision(playerScreenRectForKill, killzoneRect)) {
                handleGameOver();
                return;
            }
            continue;
        }

        const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

        if (checkCollision(playerRect, objRect)) {
            if (playerState.dy >= 0 && !playerState.isGrinding) {
                if (prevPlayerRect.y + prevPlayerRect.height <= obj.y + 1) {
                    nextY = obj.y - gameSettings.playerHeight;
                    playerState.dy = 0;
                    playerState.isOnGround = true;
                    playerState.coyoteTimer = gameSettings.coyoteTimeFrames;

                    if (playerElement && playerElement.classList.contains('jumping')) {
                        if (typeof registerComboAction === 'function') registerComboAction();
                        addScore(gameSettings.ollieScore, "Kickflip");
                        playerElement.classList.remove('jumping');
                        playerElement.classList.add('landing');
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                        playSound(soundLand);
                    }
                    if (wasGrinding && !playerState.isGrinding && playerElement) {
                        playerElement.classList.remove('grinding');
                        playerElement.classList.add('landing');
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                    }
                    if (obj.type === 'rail' && !wasGrinding) {
                        if (Math.abs((playerRect.y + playerRect.height) - obj.y) < 8 && playerState.dy < 5) {
                            playerState.isGrinding = true;
                            playerState.currentRail = obj;
                            if (typeof registerComboAction === 'function') registerComboAction();
                            playSound(soundGrind);
                            if (playerElement) {
                                playerElement.classList.add('grinding');
                                playerElement.classList.remove('jumping', 'landing');
                            }
                            addScore(5, "Rail Lock");
                            nextY = obj.y - gameSettings.playerHeight;
                            playerState.dy = 0;
                        }
                    }
                }
            } else if (playerState.dy < 0 && !playerState.isGrinding) {
                if (prevPlayerRect.y >= obj.y + obj.height - 1) {
                    nextY = obj.y + obj.height;
                    playerState.dy = 0.1;
                    if (playerElement) {
                        playerElement.classList.remove('jumping');
                        playerElement.classList.add('landing');
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                    }
                }
            }

            const tempPlayerRectForHorizCheck = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
            if (checkCollision(tempPlayerRectForHorizCheck, objRect) && !playerState.isGrinding) {
                if (playerState.dx > 0) {
                    if (prevPlayerRect.x + prevPlayerRect.width <= obj.x + gameSettings.worldScrollSpeed + 1) {
                        playerState.x = obj.x - gameSettings.playerWidth;
                        playerState.dx = 0;
                    }
                } else if (playerState.dx < 0) {
                    if (prevPlayerRect.x >= obj.x + obj.width - gameSettings.worldScrollSpeed - 1) {
                        playerState.x = obj.x + obj.width;
                        playerState.dx = 0;
                    }
                }
            }
        }
    }

    playerState.y = nextY;
    if (playerState.isOnGround || playerState.isGrinding) {
        playerState.coyoteTimer = gameSettings.coyoteTimeFrames;
    } else if (playerState.coyoteTimer > 0) {
        playerState.coyoteTimer -= deltaTime;
    }

    const minPlayerScreenX = 0;
    const maxPlayerScreenX = GAME_AREA_WIDTH;

    if (playerState.x < minPlayerScreenX) {
        playerState.x = minPlayerScreenX;
        playerState.dx = Math.max(0, playerState.dx);
    }
    if (playerState.x + gameSettings.playerWidth > maxPlayerScreenX) {
        playerState.x = maxPlayerScreenX - gameSettings.playerWidth;
        playerState.dx = Math.min(0, playerState.dx);
    }

    if (playerState.isOnGround && !playerState.isGrinding && Math.abs(playerState.dx) < 0.1 && Math.abs(playerState.dy) < 0.1) {
        if (playerElement && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing')) {
            setTimeout(() => {
                if (playerState.isOnGround && !playerState.isGrinding &&
                    playerElement && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing') &&
                    window.currentTrickDisplayElement) {
                    currentTrickDisplayElement.textContent = "Trick: ---";
                }
            }, 500);
        }
    }
}

function render() {
    if (playerState.isGameOver) return;
    if (playerElement) {
        const logicalY = playerState.y;
        const visualY = logicalY + gameSettings.visualPlayerYOffset;
        playerElement.style.left = playerState.x + 'px';
        playerElement.style.top = visualY + 'px';
    }
    if (typeof updatePlayerBodyImage === 'function') updatePlayerBodyImage();
}

function handleGameOver() {
    playerState.isGameOver = true;
    const logicalY = playerState.y;
    const visualY = logicalY + gameSettings.visualPlayerYOffset;
    const centerX = playerState.x + gameSettings.playerWidth / 2;
    const centerY = visualY + gameSettings.playerHeight / 2;
    if (typeof createExplosion === 'function') {
        createExplosion(centerX, centerY);
    }
    if (typeof soundDeath !== 'undefined') {
        playSound(soundDeath);
    }
    if (soundGrind) {
        soundGrind.pause();
        soundGrind.currentTime = 0;
    }
    if (playerElement) {
        playerElement.classList.remove('jumping', 'landing', 'grinding');
        playerElement.classList.add('mario-death');
    }
    showGameOverMessage();
    anime.running.forEach(anim => anim.pause());
}

function transitionToLevel(levelIndex) {
    currentLevel = levelIndex;
    const level = LEVELS[levelIndex];

    const ga = document.getElementById('game-area');
    if (ga) {
        ga.style.backgroundImage = `url('${level.bg}')`;
        ga.className = ga.className.replace(/\blevel-\d\b/g, '').trim();
        ga.classList.add(`level-${level.id}`);
    }

    scrollSpeedBase = level.scrollSpeedBase;
    if (gameSettings.worldScrollSpeed < scrollSpeedBase) {
        gameSettings.worldScrollSpeed = scrollSpeedBase;
    }

    const overlay = document.getElementById('level-overlay');
    if (overlay) {
        overlay.textContent = `LEVEL ${level.id} - ${level.name}`;
        overlay.style.display = 'flex';
        setTimeout(() => { overlay.style.display = 'none'; }, 2000);
    }
}

function gameLoop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const rawDelta = (timestamp - lastTime) / (1000 / 60);
    const deltaTime = Math.min(rawDelta, 3); // cap at 3× to avoid huge steps after tab switches
    lastTime = timestamp;

    if (!isPaused && !playerState.isGameOver) {
        generateNewObjects();
        updateWorldObjects(deltaTime);
        updatePlayerIntentAndPhysics(deltaTime);
        resolvePlayerCollisionsAndUpdatePosition(deltaTime);
        if (typeof updateComboState === 'function') updateComboState();
        render();

        backgroundScrollX -= gameSettings.worldScrollSpeed * BACKGROUND_SCROLL_SPEED_FACTOR * deltaTime;
        if (gameArea) gameArea.style.backgroundPositionX = backgroundScrollX + 'px';

        timeSinceStart += deltaTime;
        if (timeSinceStart - lastSpeedIncrease >= speedIncreaseInterval) {
            lastSpeedIncrease = timeSinceStart;
            if (gameSettings.worldScrollSpeed < scrollSpeedMax) {
                gameSettings.worldScrollSpeed += scrollSpeedIncrement;
            }
        }

        // Level-up check
        if (currentLevel < LEVELS.length - 1 && playerState.score >= LEVELS[currentLevel + 1].scoreThreshold) {
            transitionToLevel(currentLevel + 1);
        }
    }
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    keys.KeyA = false;
    keys.KeyD = false;
    keys.Space = false;
    startGame();
}

function startGame() {
    const gameArea = document.getElementById('game-area');
    if (gameArea) {
        gameArea.style.width = GAME_AREA_WIDTH + 'px';
        gameArea.style.height = GAME_AREA_HEIGHT + 'px';
    }

    if (!document.getElementById('game-area') || !document.getElementById('player')) {
        console.error("startGame: Wichtige DOM-Elemente nicht gefunden.");
        return;
    }

    if (typeof initializeEffects === 'function') {
        initializeEffects();
    }

    // Reset level & timing state
    isPaused = false;
    currentLevel = 0;
    lastSpeedIncrease = 0;
    lastTime = 0;
    scrollSpeedBase = LEVELS[0].scrollSpeedBase;
    backgroundScrollX = 0;

    // Set background & level class for level 1
    if (gameArea) {
        gameArea.style.backgroundImage = `url('${LEVELS[0].bg}')`;
        gameArea.className = gameArea.className.replace(/\blevel-\d\b/g, '').trim();
        gameArea.classList.add('level-1');
    }

    // Hide overlays
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    const levelOverlay = document.getElementById('level-overlay');
    if (levelOverlay) levelOverlay.style.display = 'none';

    // Remove any lingering score popups from previous round
    if (gameArea) {
        gameArea.querySelectorAll('.score-popup').forEach(el => el.remove());
    }

    initLevel();
    resetPlayer();
    gameSettings.worldScrollSpeed = scrollSpeedBase;
    timeSinceStart = 0;

}

window.addEventListener('keydown', (e) => {
    if (playerState.isGameOver && e.key.toLowerCase() === 'r') {
        return;
    }

    const isLeaderboardEntryActive = Boolean(
        typeof gameOverMessageElement !== 'undefined' &&
        gameOverMessageElement &&
        gameOverMessageElement.querySelector('.leaderboard-entry')
    );

    if (playerState.isGameOver && isLeaderboardEntryActive && e.key === 'Enter') {
        return;
    }

    if (playerState.isGameOver && e.key === 'Enter') {
        restartGame();
        return;
    }
    if (e.code === 'KeyP' && !playerState.isGameOver) {
        isPaused = !isPaused;
        lastTime = 0; // reset so deltaTime doesn't spike on unpause
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) pauseOverlay.style.display = isPaused ? 'flex' : 'none';
        return;
    }

    if (playerState.isGameOver) return;
    if (e.code === 'KeyA') keys.KeyA = true;
    if (e.code === 'KeyD') keys.KeyD = true;
    if (e.code === 'Space') {
        keys.Space = true;
        if (typeof queueJumpInput === 'function') queueJumpInput();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA') keys.KeyA = false;
    if (e.code === 'KeyD') keys.KeyD = false;
    if (e.code === 'Space') keys.Space = false;
});

let activeTouches = {};

// --- Touch-Steuerung: D-Pad links (Slide) + Tap rechts = Sprung ---

const TOUCH_DEADZONE = 15; // px Mindest-Slide bevor Bewegung startet

function triggerJump() {
    if (playerState.isGameOver) return;
    keys.Space = true;
    if (typeof queueJumpInput === 'function') queueJumpInput();
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => { keys.Space = false; }, 100);
}

const gameAreaEl = document.getElementById('game-area');
const arrowLeftEl = document.getElementById('arrow-left');
const arrowRightEl = document.getElementById('arrow-right');
const jumpBtnEl = document.getElementById('jump-btn');

function updateDpadVisual() {
    if (arrowLeftEl) arrowLeftEl.classList.toggle('active', keys.KeyA);
    if (arrowRightEl) arrowRightEl.classList.toggle('active', keys.KeyD);
    if (jumpBtnEl) jumpBtnEl.classList.toggle('active', keys.Space);
}

gameAreaEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        if (playerState.isGameOver) { restartGame(); return; }
        const rect = gameAreaEl.getBoundingClientRect();
        const relX = (touch.clientX - rect.left) / rect.width; // 0..1

        if (relX < 0.45) {
            // Linke Seite: D-Pad — Startposition merken, noch keine Bewegung (Deadzone)
            activeTouches[touch.identifier] = {
                startX: touch.clientX, side: 'dpad'
            };
        } else {
            // Rechte Seite: Sprung
            activeTouches[touch.identifier] = { side: 'jump' };
            triggerJump();
            updateDpadVisual();
        }
    }
}, { passive: false });

gameAreaEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        const info = activeTouches[touch.identifier];
        if (!info || info.side !== 'dpad') continue;

        const dx = touch.clientX - info.startX;
        if (dx < -TOUCH_DEADZONE) {
            keys.KeyA = true; keys.KeyD = false;
        } else if (dx > TOUCH_DEADZONE) {
            keys.KeyD = true; keys.KeyA = false;
        } else {
            keys.KeyA = false; keys.KeyD = false;
        }
        updateDpadVisual();
    }
}, { passive: false });

function releaseTouch(touch) {
    const info = activeTouches[touch.identifier];
    if (!info) return;
    if (info.side === 'dpad') {
        // Nur loslassen wenn kein anderer D-Pad-Finger aktiv
        const otherDpad = Object.entries(activeTouches)
            .some(([id, t]) => Number(id) !== touch.identifier && t.side === 'dpad');
        if (!otherDpad) { keys.KeyA = false; keys.KeyD = false; }
    }
    delete activeTouches[touch.identifier];
    updateDpadVisual();
}

gameAreaEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) releaseTouch(touch);
}, { passive: false });

gameAreaEl.addEventListener('touchcancel', (e) => {
    for (const touch of e.changedTouches) releaseTouch(touch);
});

if (typeof gameOverMessageElement !== 'undefined' && gameOverMessageElement) {
    gameOverMessageElement.addEventListener('click', (e) => {
        if (!playerState.isGameOver) return;
        if (
            e.target.closest('.leaderboard-entry') ||
            e.target.closest('.leaderboard-submit') ||
            e.target.closest('.leaderboard-open')
        ) return;
        restartGame();
    });
    gameOverMessageElement.addEventListener('touchend', (e) => {
        if (!playerState.isGameOver) return;
        if (
            e.target.closest('.leaderboard-entry') ||
            e.target.closest('.leaderboard-submit') ||
            e.target.closest('.leaderboard-open')
        ) return;
        restartGame();
    }, { passive: true });
}

startGame();
requestAnimationFrame(gameLoop);
