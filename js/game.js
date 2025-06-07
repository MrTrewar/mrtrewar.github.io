// js/game.js
const gameArea = document.getElementById('game-area');
let backgroundScrollX = 0;
const BACKGROUND_SCROLL_SPEED_FACTOR = 0.3;
let timeSinceStart = 0;
let speedIncreaseInterval = 50; // alle 300 Frames ≈ 5 Sekunden
let scrollSpeedBase = gameSettings.worldScrollSpeed;
let scrollSpeedMax = 100; // Max-Speed
let scrollSpeedIncrement = 0.3;

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function resolvePlayerCollisionsAndUpdatePosition() {
    if (playerState.isGameOver) return;

    let nextY = playerState.y + playerState.dy;
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
    const prevPlayerRect = { x: playerState.x - playerState.dx, y: playerState.y, width: gameSettings.playerWidth, height: gameSettings.playerHeight };

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

                    if (playerElement && playerElement.classList.contains('jumping')) {
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
                            playSound(soundGrind);
                            if (playerElement) {
                                playerElement.classList.add('grinding');
                                playerElement.classList.remove('jumping', 'landing');
                            }
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

function gameLoop() {
    if (!playerState.isGameOver) {
        generateNewObjects();
        updateWorldObjects();
        updatePlayerIntentAndPhysics();
        resolvePlayerCollisionsAndUpdatePosition();
        render();

        backgroundScrollX -= gameSettings.worldScrollSpeed * BACKGROUND_SCROLL_SPEED_FACTOR;
        if (gameArea) gameArea.style.backgroundPositionX = backgroundScrollX + 'px';

        timeSinceStart++;
        if (timeSinceStart % speedIncreaseInterval === 0) {
            if (gameSettings.worldScrollSpeed < scrollSpeedMax) {
                gameSettings.worldScrollSpeed += scrollSpeedIncrement;
                console.log("Speed increased to", gameSettings.worldScrollSpeed.toFixed(5));
            }
        }
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (!document.getElementById('game-area') || !document.getElementById('player')) {
        console.error("startGame: Wichtige DOM-Elemente nicht gefunden.");
        return;
    }
    if (typeof initializeEffects === 'function') {
        initializeEffects();
    }
    initLevel();
    resetPlayer();
    gameSettings.worldScrollSpeed = scrollSpeedBase;
    timeSinceStart = 0;
}

window.addEventListener('keydown', (e) => {
    if (playerState.isGameOver && e.key.toLowerCase() === 'r') {
        startGame();
        return;
    }
    if (playerState.isGameOver) return;
    if (e.code === 'KeyA') keys.KeyA = true;
    if (e.code === 'KeyD') keys.KeyD = true;
    if (e.code === 'Space') keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA') keys.KeyA = false;
    if (e.code === 'KeyD') keys.KeyD = false;
    if (e.code === 'Space') keys.Space = false;
});

const joystickZone = document.getElementById('joystick-zone');
const joystickThumb = document.getElementById('joystick-thumb');

let joystickActive = false;

joystickZone.addEventListener('touchstart', (e) => {
    joystickActive = true;
    handleJoystick(e);
});

joystickZone.addEventListener('touchmove', handleJoystick);

joystickZone.addEventListener('touchend', () => {
    joystickActive = false;
    keys.KeyA = false;
    keys.KeyD = false;
    joystickThumb.style.left = '30px';
    joystickThumb.style.top = '30px';
});

// Bewegungslogik innerhalb der Joystick-Zone
function handleJoystick(e) {
    const touch = e.touches[0];
    const zoneRect = joystickZone.getBoundingClientRect();
    const centerX = zoneRect.left + zoneRect.width / 2;
    const centerY = zoneRect.top + zoneRect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    // Bewegung Daumen visualisieren
    joystickThumb.style.left = `${30 + dx * 0.3}px`;
    joystickThumb.style.top = `${30 + dy * 0.3}px`;

    // Steuerung (nur horizontal)
    if (dx < -10) {
        keys.KeyA = true;
        keys.KeyD = false;
    } else if (dx > 10) {
        keys.KeyD = true;
        keys.KeyA = false;
    } else {
        keys.KeyA = false;
        keys.KeyD = false;
    }
}

document.body.addEventListener('touchstart', (e) => {
    if (playerState.isGameOver) return;

    const touches = Array.from(e.touches);

    for (const touch of touches) {
        const jz = joystickZone.getBoundingClientRect();

        const isOutsideJoystick =
            touch.clientX < jz.left || touch.clientX > jz.right ||
            touch.clientY < jz.top  || touch.clientY > jz.bottom;

        if (isOutsideJoystick) {
            keys.Space = true;
            setTimeout(() => keys.Space = false, 100);
            break; // Nur einmal springen pro Berührung außerhalb
        }
    }
}, { passive: true });

@media (hover: none) and (pointer: coarse) {
    #joystick-zone {
        display: block;
    }
}

// 📱 Tap auf dem Bildschirm nach Game Over startet neu
window.addEventListener('touchstart', () => {
    if (playerState.isGameOver) {
        startGame();
    }
});


startGame();
gameLoop();