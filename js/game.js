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
        const isPlayerDraggedToEdge = playerState.x <= 0;

        if (isHorizontallyOffRail || isRailVisuallyGone || isPlayerDraggedToEdge) {
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

        // Level-up check: Fade + Flash transition
        if (currentLevel < LEVELS.length - 1 && !isTransitioning && playerState.score >= LEVELS[currentLevel + 1].scoreThreshold) {
            triggerLevelTransition(currentLevel + 1);
        }
    }
    requestAnimationFrame(gameLoop);
}

let isTransitioning = false;

function triggerLevelTransition(levelIndex) {
    isTransitioning = true;
    const screenFlash = document.getElementById('screen-flash');

    // Phase 1: Weißer Flash
    if (screenFlash) screenFlash.classList.add('flash');

    setTimeout(() => {
        // Phase 2: Level wechseln während Flash noch sichtbar
        transitionToLevel(levelIndex);

        setTimeout(() => {
            // Phase 3: Flash ausblenden
            if (screenFlash) screenFlash.classList.remove('flash');
            isTransitioning = false;
        }, 250);
    }, 200);
}

function restartGame() {
    keys.KeyA = false;
    keys.KeyD = false;
    keys.Space = false;
    isTransitioning = false;
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
    isTransitioning = false;

    // Clear screen flash
    const screenFlash = document.getElementById('screen-flash');
    if (screenFlash) screenFlash.classList.remove('flash');

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

// --- Touch-Steuerung: Joystick links (Slide) + Jump-Button rechts ---

function triggerJump() {
    if (playerState.isGameOver) return;
    keys.Space = true;
    if (typeof queueJumpInput === 'function') queueJumpInput();
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => { keys.Space = false; }, 100);
}

const gameAreaEl = document.getElementById('game-area');
const joystickEl = document.getElementById('joystick');
const joystickKnobEl = document.getElementById('joystick-knob');
const jumpBtnEl = document.getElementById('jump-btn');

const JOYSTICK_DEADZONE = 10; // px from center before movement starts
let joystickTouchId = null;
let joystickCenterX = 0;

if (joystickEl) {
    joystickEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (playerState.isGameOver) return;
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        const rect = joystickEl.getBoundingClientRect();
        joystickCenterX = rect.left + rect.width / 2;
        updateJoystick(touch.clientX);
    }, { passive: false });

    joystickEl.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                updateJoystick(touch.clientX);
            }
        }
    }, { passive: false });

    joystickEl.addEventListener('touchend', (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                releaseJoystick();
            }
        }
    }, { passive: false });

    joystickEl.addEventListener('touchcancel', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === joystickTouchId) {
                releaseJoystick();
            }
        }
    });
}

function updateJoystick(clientX) {
    const dx = clientX - joystickCenterX;
    const maxOffset = 38; // max knob displacement in px
    const clampedDx = Math.max(-maxOffset, Math.min(maxOffset, dx));

    // Move knob visually
    if (joystickKnobEl) {
        joystickKnobEl.style.transform = `translate(calc(-50% + ${clampedDx}px), -50%)`;
    }

    // Update movement keys based on deadzone
    if (dx < -JOYSTICK_DEADZONE) {
        keys.KeyA = true;
        keys.KeyD = false;
        if (joystickEl) { joystickEl.classList.add('active-left'); joystickEl.classList.remove('active-right'); }
    } else if (dx > JOYSTICK_DEADZONE) {
        keys.KeyD = true;
        keys.KeyA = false;
        if (joystickEl) { joystickEl.classList.add('active-right'); joystickEl.classList.remove('active-left'); }
    } else {
        keys.KeyA = false;
        keys.KeyD = false;
        if (joystickEl) { joystickEl.classList.remove('active-left', 'active-right'); }
    }
}

function releaseJoystick() {
    joystickTouchId = null;
    keys.KeyA = false;
    keys.KeyD = false;
    if (joystickKnobEl) {
        joystickKnobEl.style.transform = 'translate(-50%, -50%)';
    }
    if (joystickEl) {
        joystickEl.classList.remove('active-left', 'active-right');
    }
}

// Jump button
if (jumpBtnEl) {
    jumpBtnEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerJump();
        if (jumpBtnEl) jumpBtnEl.classList.add('active');
    }, { passive: false });
    jumpBtnEl.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (jumpBtnEl) jumpBtnEl.classList.remove('active');
    }, { passive: false });
    jumpBtnEl.addEventListener('touchcancel', () => {
        if (jumpBtnEl) jumpBtnEl.classList.remove('active');
    });
}

// Game area: only handle restart on game over (but not on leaderboard elements)
gameAreaEl.addEventListener('touchstart', (e) => {
    if (playerState.isGameOver) {
        if (
            e.target.closest('.leaderboard-entry') ||
            e.target.closest('.leaderboard-submit') ||
            e.target.closest('.leaderboard-open') ||
            e.target.closest('.leaderboard') ||
            e.target.closest('#game-over-message')
        ) return;
        e.preventDefault();
        restartGame();
    }
}, { passive: false });

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
            e.target.closest('.leaderboard-open') ||
            e.target.closest('.leaderboard')
        ) return;
        restartGame();
    }, { passive: false });
}

startGame();
requestAnimationFrame(gameLoop);
