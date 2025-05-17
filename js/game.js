// js/game.js
const gameArea = document.getElementById('game-area');
let backgroundScrollX = 0;
const BACKGROUND_SCROLL_SPEED_FACTOR = 0.3;

function checkCollision(rect1, rect2) { /* ... (wie vorher) ... */
     return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function resolvePlayerCollisionsAndUpdatePosition() {
    if (playerState.isGameOver) return;

    // Player's X-Position wird direkt durch playerState.dx (aus player.js) beeinflusst
    // playerState.x += playerState.dx; // Diese Zeile ist jetzt in player.js VOR der Kollisionslogik

    // Vertikale Position basierend auf playerState.dy
    let nextY = playerState.y + playerState.dy;

    // Reset ground/grind state
    playerState.isOnGround = false;
    let wasGrinding = playerState.isGrinding;

    // Grind-Ende-Check
    if (playerState.isGrinding && playerState.currentRail) {
        const rail = playerState.currentRail;
        // Player X (schon aktualisiert in player.js) vs. Rail X (scrollt mit Welt)
        if (playerState.x + gameSettings.playerWidth < rail.x || playerState.x > rail.x + rail.width) {
            playerState.isGrinding = false;
            playerState.currentRail = null;
            playerElement.classList.remove('grinding');
            playerElement.classList.add('jumping'); // Fall-Animation
        }
    }

    // Player-Rechteck für Kollision an der *aktuellen* X und *nächsten* Y
    const playerRect = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
    // Vorheriges Rechteck basierend auf Y VOR dy-Anwendung
    const prevPlayerRect = { x: playerState.x - playerState.dx, y: playerState.y, width: gameSettings.playerWidth, height: gameSettings.playerHeight };


    for (const obj of worldObjects) {
        if (obj.type === 'killzone') { /* ... (wie vorher) ... */
            const killzoneRect = { x: 0, y: GAME_AREA_HEIGHT, width: GAME_AREA_WIDTH, height: 20};
            const playerScreenRect = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight};
            if (checkCollision(playerScreenRect, killzoneRect)) {
                handleGameOver(); return;
            }
            continue;
        }

        const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

        if (checkCollision(playerRect, objRect)) {
            // Vertikale Kollision
            if (playerState.dy >= 0 && !playerState.isGrinding) { // Moving down
                if (prevPlayerRect.y + prevPlayerRect.height <= obj.y + 1) {
                    nextY = obj.y - gameSettings.playerHeight;
                    playerState.dy = 0;
                    playerState.isOnGround = true;

                    if (playerElement.classList.contains('jumping')) {
                        addScore(gameSettings.ollieScore, "Ollie");
                        playerElement.classList.remove('jumping');
                        playerElement.classList.add('landing');
                        setTimeout(() => { playerElement.classList.remove('landing'); }, 100);
                    }
                    if (wasGrinding && !playerState.isGrinding) {
                         playerElement.classList.remove('grinding');
                         playerElement.classList.add('landing');
                        setTimeout(() => { playerElement.classList.remove('landing'); }, 100);
                    }

                    if (obj.type === 'rail' && !wasGrinding) { // Grind-Initiierung
                        // Bedingung für Grind-Start etwas gelockert, da Spieler mit dx ankommen kann
                        if (Math.abs((playerRect.y + playerRect.height) - obj.y) < 8 && playerState.dy < 5 ) { // dy < 5 um zu schnelles Fallen zu verhindern
                            playerState.isGrinding = true;
                            playerState.currentRail = obj;
                            playerElement.classList.add('grinding');
                            playerElement.classList.remove('jumping', 'landing');
                            nextY = obj.y - gameSettings.playerHeight;
                            playerState.dy = 0;
                            playerState.dx = 0; // Optional: Horizontale Geschwindigkeit beim Start des Grinds nullen oder reduzieren
                        }
                    }
                }
            } else if (playerState.dy < 0 && !playerState.isGrinding) { // Moving up (hit head)
                if (prevPlayerRect.y >= obj.y + obj.height - 1) {
                    nextY = obj.y + obj.height;
                    playerState.dy = 0.1;
                    playerElement.classList.remove('jumping');
                    playerElement.classList.add('landing');
                     setTimeout(() => { playerElement.classList.remove('landing'); }, 100);
                }
            }

            // Horizontale Kollision (wird jetzt relevanter, da Spieler dx im Sprung hat)
            const tempPlayerRectForHorizCheck = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
            if (checkCollision(tempPlayerRectForHorizCheck, objRect) && !playerState.isGrinding) {
                if (playerState.dx > 0) { // Spieler bewegt sich nach rechts
                     if (prevPlayerRect.x + prevPlayerRect.width <= obj.x + gameSettings.worldScrollSpeed + 1) { // Berücksichtige Welt-Scroll für prev. Pos.
                        playerState.x = obj.x - gameSettings.playerWidth;
                        playerState.dx = 0; // Harter Stopp bei Kollision
                     }
                } else if (playerState.dx < 0) { // Spieler bewegt sich nach links
                     if (prevPlayerRect.x >= obj.x + obj.width - gameSettings.worldScrollSpeed -1) {
                        playerState.x = obj.x + obj.width;
                        playerState.dx = 0; // Harter Stopp
                     }
                }
            }
        }
    }
    playerState.y = nextY; // Finale Y-Position

    // Spieler X-Position wird nun vor der Kollision in player.js aktualisiert.
    // Horizontale Grenzen werden immer noch hier in game.js geprüft, NACH der Kollisionsauflösung.
    const minPlayerScreenX = GAME_AREA_WIDTH * 0.1;
    const maxPlayerScreenX = GAME_AREA_WIDTH * 0.7;
    if (playerState.x < minPlayerScreenX) {
         playerState.x = minPlayerScreenX;
         playerState.dx = Math.max(0, playerState.dx);
    }
    if (playerState.x + gameSettings.playerWidth > maxPlayerScreenX) {
        playerState.x = maxPlayerScreenX - gameSettings.playerWidth;
        playerState.dx = Math.min(0, playerState.dx);
    }

    // Trick-Anzeige (wie vorher)
    if (playerState.isOnGround && !playerState.isGrinding && Math.abs(playerState.dx) < 0.1 && Math.abs(playerState.dy) < 0.1) {
         if (!playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing')) {
             setTimeout(() => {
                 if(playerState.isOnGround && !playerState.isGrinding && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing') && currentTrickDisplayElement) {
                    currentTrickDisplayElement.textContent = "Trick: ---";
                 }
             }, 500);
         }
    }
}


function render() { /* ... (wie vorher) ... */
    if (playerState.isGameOver) return;
    if (playerElement) {
        playerElement.style.left = playerState.x + 'px';
        playerElement.style.top = playerState.y + 'px';
    }
}
function handleGameOver() { /* ... (wie vorher) ... */
    playerState.isGameOver = true;
    showGameOverMessage();
    anime.running.forEach(anim => anim.pause());
}
function gameLoop() { /* ... (wie vorher, mit Hintergrund-Scroll) ... */
    if (!playerState.isGameOver) {
        generateNewObjects();
        updateWorldObjects();
        updatePlayerIntentAndPhysics();
        resolvePlayerCollisionsAndUpdatePosition();
        render();

        backgroundScrollX -= gameSettings.worldScrollSpeed * BACKGROUND_SCROLL_SPEED_FACTOR;
        if (gameArea) gameArea.style.backgroundPositionX = backgroundScrollX + 'px';
    }
    requestAnimationFrame(gameLoop);
}
function startGame() { /* ... (wie vorher) ... */
    if (!document.getElementById('game-area') || !document.getElementById('player')) {
        console.error("startGame: Wichtige DOM-Elemente nicht gefunden."); return;
    }
    initLevel();
    resetPlayer();
}

// Event Listener - Tasten anpassen
window.addEventListener('keydown', (e) => {
    if (playerState.isGameOver && e.key.toLowerCase() === 'r') { startGame(); return; }
    if (playerState.isGameOver) return;

    if (e.code === 'KeyA') keys.KeyA = true;
    if (e.code === 'KeyD') keys.KeyD = true;
    if (e.code === 'Space') keys.Space = true; // Geändert von KeyW
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA') keys.KeyA = false;
    if (e.code === 'KeyD') keys.KeyD = false;
    if (e.code === 'Space') keys.Space = false; // Geändert von KeyW
});


startGame();
gameLoop();