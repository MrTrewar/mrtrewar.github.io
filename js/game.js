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

    // Die X-Position des Spielers (playerState.x) wurde bereits in js/player.js
    // durch playerState.dx oder Grind-Anpassungen aktualisiert, BEVOR diese Funktion aufgerufen wird.

    // Vertikale Position basierend auf playerState.dy
    let nextY = playerState.y + playerState.dy;

    // Reset ground/grind state für diesen Frame; wird durch Kollision ggf. wieder true
    playerState.isOnGround = false;
    let wasGrinding = playerState.isGrinding; // Speichere, ob der Spieler zu Beginn dieses Frames gegrindet hat

     // Grind-Ende-Check
    if (playerState.isGrinding && playerState.currentRail) {
        const rail = playerState.currentRail;

        // Prüfung 1: Ist der Spieler horizontal nicht mehr über dem Rail?
        const isHorizontallyOffRail = playerState.x + gameSettings.playerWidth < rail.x || playerState.x > rail.x + rail.width;

        // Prüfung 2 (OPTIONAL, aber gut als zusätzliche Sicherheit): Ist das Rail selbst schon zu weit links?
        // Dies ist nützlich, falls das Rail aus irgendeinem Grund noch in worldObjects ist,
        // obwohl es schon fast komplett aus dem Bildschirm ist.
        const isRailVisuallyGone = rail.x + rail.width < 0; // Rechte Kante des Rails ist links vom Bildschirmrand

        if (isHorizontallyOffRail || isRailVisuallyGone) {
            playerState.isGrinding = false;
            playerState.currentRail = null;
            if (playerElement) {
                playerElement.classList.remove('grinding');
                playerElement.classList.add('jumping'); // Fall-Animation
            }
            // console.log("Player stopped grinding: Fell off rail or rail disappeared.");
        }
    }

    // Erstelle Rechtecke für Kollisionsprüfungen
    // playerRect: die potenzielle neue Position des Spielers in diesem Frame
    const playerRect = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
    // prevPlayerRect: die Position des Spielers zu Beginn des letzten Physik-Updates (vor Anwendung von dx/dy)
    const prevPlayerRect = { x: playerState.x - playerState.dx, y: playerState.y, width: gameSettings.playerWidth, height: gameSettings.playerHeight };


    for (const obj of worldObjects) { // Iteriere durch alle Plattformen, Rails etc.
        if (obj.type === 'killzone') {
            // Spezielle Behandlung für die Killzone (statisch am unteren Bildschirmrand)
            const killzoneRect = { x: 0, y: GAME_AREA_HEIGHT, width: GAME_AREA_WIDTH, height: 20}; // Höhe 20 als Puffer
            const playerScreenRectForKill = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight};
            if (checkCollision(playerScreenRectForKill, killzoneRect)) {
                handleGameOver(); // Funktion aus game.js
                return; // Beende die Funktion frühzeitig
            }
            continue; // Nächstes Objekt in der Schleife prüfen
        }

        // Kollisionsrechteck für das aktuelle Weltobjekt
        const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

        if (checkCollision(playerRect, objRect)) { // Wenn Spieler und Objekt kollidieren
            // --- Vertikale Kollision ---
            if (playerState.dy >= 0 && !playerState.isGrinding) { // Spieler bewegt sich nach unten (oder steht) UND grindet nicht
                // Prüfe, ob der Spieler im vorherigen Frame ÜBER dem Objekt war
                if (prevPlayerRect.y + prevPlayerRect.height <= obj.y + 1) { // +1 als kleiner Toleranzwert
                    nextY = obj.y - gameSettings.playerHeight; // Spieler auf die Oberkante des Objekts setzen
                    playerState.dy = 0; // Vertikale Geschwindigkeit stoppen
                    playerState.isOnGround = true; // Spieler ist jetzt auf dem Boden/Objekt

                    // Animationsklassen für Landung
                    if (playerElement && playerElement.classList.contains('jumping')) {
                        addScore(gameSettings.ollieScore, "Kickflip"); // ui.js
                        playerElement.classList.remove('jumping');
                        playerElement.classList.add('landing');
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                    }
                    // Falls Spieler vom Grinden gefallen ist und auf einer Plattform landet
                    if (wasGrinding && !playerState.isGrinding && playerElement) {
                         playerElement.classList.remove('grinding'); // Sicherstellen
                         playerElement.classList.add('landing');
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                    }

                    // Grind-Initiierung, wenn auf einem Rail gelandet wird und vorher nicht gegrindet wurde
                    if (obj.type === 'rail' && !wasGrinding) {
                        // Bedingungen für Grind-Start: nahe genug an der Rail-Oberkante und nicht zu schnell fallend
                        if (Math.abs((playerRect.y + playerRect.height) - obj.y) < 8 && playerState.dy < 5 ) {
                            playerState.isGrinding = true;
                            playerState.currentRail = obj;
                            if (playerElement) {
                                playerElement.classList.add('grinding');
                                playerElement.classList.remove('jumping', 'landing'); // Keine Sprung/Lande-Anim beim Grinden
                            }
                            nextY = obj.y - gameSettings.playerHeight; // Exakt auf Rail positionieren
                            playerState.dy = 0; // Vertikale Geschwindigkeit stoppen
                            // playerState.dx = 0; // Optional: Horizontale Geschwindigkeit beim Grind-Start beeinflussen
                        }
                    }
                }
            } else if (playerState.dy < 0 && !playerState.isGrinding) { // Spieler bewegt sich nach oben UND grindet nicht (Kopf gestoßen)
                // Prüfe, ob der Spieler im vorherigen Frame UNTER dem Objekt war
                if (prevPlayerRect.y >= obj.y + obj.height - 1) { // -1 als Toleranzwert
                    nextY = obj.y + obj.height; // Spieler unter das Objekt setzen
                    playerState.dy = 0.1; // Leichte Abwärtsbewegung, um Steckenbleiben zu verhindern
                    if (playerElement) {
                        playerElement.classList.remove('jumping'); // Sprunganimation beenden
                        playerElement.classList.add('landing'); // Kurze "Benommenheits"-Animation
                        setTimeout(() => { if (playerElement) playerElement.classList.remove('landing'); }, 100);
                    }
                }
            }

            // --- Horizontale Kollision ---
            // Erstelle ein temporäres Rechteck mit der bereits korrigierten Y-Position für die horizontale Prüfung
            const tempPlayerRectForHorizCheck = { x: playerState.x, y: nextY, width: gameSettings.playerWidth, height: gameSettings.playerHeight };
            if (checkCollision(tempPlayerRectForHorizCheck, objRect) && !playerState.isGrinding) { // Kollidiert immer noch & grindet nicht
                if (playerState.dx > 0) { // Spieler bewegt sich nach rechts
                    // Prüfe, ob Spieler im vorherigen Frame LINKS vom Objekt war (unter Berücksichtigung der Weltbewegung)
                     if (prevPlayerRect.x + prevPlayerRect.width <= obj.x + gameSettings.worldScrollSpeed + 1) {
                        playerState.x = obj.x - gameSettings.playerWidth; // Spieler links vom Objekt positionieren
                        playerState.dx = 0; // Horizontale Geschwindigkeit stoppen
                     }
                } else if (playerState.dx < 0) { // Spieler bewegt sich nach links
                    // Prüfe, ob Spieler im vorherigen Frame RECHTS vom Objekt war (unter Berücksichtigung der Weltbewegung)
                     if (prevPlayerRect.x >= obj.x + obj.width - gameSettings.worldScrollSpeed - 1) {
                        playerState.x = obj.x + obj.width; // Spieler rechts vom Objekt positionieren
                        playerState.dx = 0; // Horizontale Geschwindigkeit stoppen
                     }
                }
            }
        } // Ende if (checkCollision(playerRect, objRect))
    } // Ende for (const obj of worldObjects)

    playerState.y = nextY; // Finale Y-Position für diesen Frame setzen

    // Spieler innerhalb der horizontalen Bildschirmgrenzen halten
    const minPlayerScreenX = 0; // Spieler kann bis ganz nach links

    // KORREKTUR FÜR RECHTE GRENZE: Spieler kann bis ganz nach rechts
    const maxPlayerScreenX = GAME_AREA_WIDTH;
    // const maxPlayerScreenX = GAME_AREA_WIDTH - 5; // Alternativ: Kleiner Puffer zum rechten Rand

    if (playerState.x < minPlayerScreenX) {
         playerState.x = minPlayerScreenX;
         playerState.dx = Math.max(0, playerState.dx); // Verhindere weiteres Drücken nach links
    }
    if (playerState.x + gameSettings.playerWidth > maxPlayerScreenX) {
        playerState.x = maxPlayerScreenX - gameSettings.playerWidth; // Positioniert rechte Kante des Spielers an maxPlayerScreenX
        playerState.dx = Math.min(0, playerState.dx); // Verhindere weiteres Drücken nach rechts
    }

    // Trick-Anzeige zurücksetzen, wenn Spieler ruhig am Boden steht
    if (playerState.isOnGround && !playerState.isGrinding && Math.abs(playerState.dx) < 0.1 && Math.abs(playerState.dy) < 0.1) {
         if (playerElement && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing')) {
             setTimeout(() => {
                 // Erneute Prüfung, da sich Zustand in 500ms ändern kann
                 if(playerState.isOnGround && !playerState.isGrinding &&
                    playerElement && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing') &&
                    window.currentTrickDisplayElement) { // Sicherstellen, dass currentTrickDisplayElement existiert
                    currentTrickDisplayElement.textContent = "Trick: ---";
                 }
             }, 500);
         }
    }
}

// Zeichnet den Spieler neu an seiner logischen Position PLUS dem visuellen Offset
function render() {
    if (playerState.isGameOver) return;

    if (playerElement) { // playerElement ist global aus player.js
        // Die logische Y-Position der Kollisionsbox
        const logicalY = playerState.y;

        // Die visuelle Y-Position, um die es für die Darstellung geht
        const visualY = logicalY + gameSettings.visualPlayerYOffset;

        playerElement.style.left = playerState.x + 'px';
        playerElement.style.top = visualY + 'px'; // Verwende die visuell angepasste Y-Position
    }
}


function handleGameOver() { /* ... (wie vorher) ... */
    playerState.isGameOver = true;
    const logicalY  = playerState.y;
    const visualY   = logicalY + gameSettings.visualPlayerYOffset;
    const centerX   = playerState.x + gameSettings.playerWidth / 2;
    const centerY   = visualY + gameSettings.playerHeight / 2;
    if (typeof createExplosion === 'function') {
        createExplosion(centerX, centerY);
}
    if (playerElement) {
    playerElement.classList.remove('jumping', 'landing', 'grinding');
    playerElement.classList.add('mario-death');
}

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
function startGame() {
    if (!document.getElementById('game-area') || !document.getElementById('player')) {
        console.error("startGame: Wichtige DOM-Elemente nicht gefunden."); return;
    }

    // Initialisiere Effekte, falls die Funktion existiert
    if (typeof initializeEffects === 'function') {
        initializeEffects();
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