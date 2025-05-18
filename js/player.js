// js/player.js

// DOM-Element des Spielers
// Wird global verfügbar gemacht oder hier geholt, falls nicht schon geschehen.
var playerElement = document.getElementById('player');
if (!playerElement) {
    console.error("FATAL: Spieler-Element #player nicht im DOM gefunden! Spiel kann nicht korrekt funktionieren.");
}

// Globaler Zustand des Spielers
var playerState = {
    x: GAME_AREA_WIDTH / 3, // Startposition X (GAME_AREA_WIDTH aus config.js)
    y: 0,                   // Startposition Y (wird in resetPlayer gesetzt)
    dx: 0,                  // Horizontale Geschwindigkeit (relativ zum Screen)
    dy: 0,                  // Vertikale Geschwindigkeit
    isOnGround: false,
    isGrinding: false,
    currentRail: null,      // Das Rail-Objekt, auf dem gerade gegrindet wird
    isGameOver: false,      // Wird von game.js gesetzt
    score: 0                // Der Punktestand
};

// Globaler Zustand der gedrückten Tasten
var keys = {
    KeyA: false,    // Links
    KeyD: false,    // Rechts
    Space: false   // Springen (Ollie)
};

// Zustand für die Grind-Funken (spezifisch für diesen Spieler/Effekt)
var grindSparkState = {
    cooldown: 0,
    cooldownMax: 3 // Kann auch aus gameSettings kommen oder hier individuell sein (SPARK_DEFAULT_COOLDOWN_MAX aus effects.js wird verwendet, falls nicht gesetzt)
};

function resetPlayer() {
    // Sicherstellen, dass gameSettings und playerHeight hier bekannt sind (aus config.js)
    playerState.y = gameSettings.groundLevelY - gameSettings.playerHeight;
    playerState.x = GAME_AREA_WIDTH / 3; // Zurück zur Start-X-Position

    playerState.dx = 0;
    playerState.dy = 0;
    playerState.isOnGround = true; // Startet auf dem Boden
    playerState.isGrinding = false;
    playerState.currentRail = null;
    playerState.isGameOver = false;
    playerState.score = 0;
    // Geschwindigkeit und Zeit zurücksetzen
    timeSinceStart = 0;
    gameSettings.worldScrollSpeed = scrollSpeedBase;

    // Cooldown für Effekte zurücksetzen
    grindSparkState.cooldown = 0;

    // UI Aktualisierungen (Funktionen aus ui.js)
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: ---"; // ui.js Variable, ggf. anpassen
    if (typeof hideGameOverMessage === 'function') hideGameOverMessage();

    // CSS-Klassen für visuelles Feedback zurücksetzen
    if (playerElement) {
    playerElement.classList.remove(
        'grinding', 'jumping', 'landing',
        'pushing-left', 'pushing-right',
        'mario-death'
    );
    } else {
        console.warn("resetPlayer: playerElement nicht gefunden, Klassen konnten nicht zurückgesetzt werden.");
    }
    // console.log("Player reset. Initial Y:", playerState.y);
}

// Verarbeitet Spielereingaben und grundlegende Physik (Gravitation, Sprung)
function updatePlayerIntentAndPhysics() {
    if (playerState.isGameOver || !playerElement) return;

    let targetDX = 0; // Ziel-DX für die Bewegung auf dem Boden/in der Luft (nicht beim Grinden)

    if (!playerState.isGrinding) { // Normale horizontale Bewegung, wenn NICHT gegrindet wird
        if (keys.KeyA) {
            targetDX = -gameSettings.maxPlayerDX;
        } else if (keys.KeyD) {
            targetDX = gameSettings.maxPlayerDX;
        }
        // Sanfte Beschleunigung/Verzögerung zur Zield_X-Geschwindigkeit
        playerState.dx += (targetDX - playerState.dx) * gameSettings.pushForce;

        // Pushing-Animationen (nur wenn am Boden und nicht bereits im Sprung/Landung)
        if (playerState.isOnGround && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing')) {
            if (keys.KeyA) {
                playerElement.classList.add('pushing-left');
                playerElement.classList.remove('pushing-right');
            } else if (keys.KeyD) {
                playerElement.classList.add('pushing-right');
                playerElement.classList.remove('pushing-left');
            } else { // Keine horizontale Bewegung -> Pushing-Animationen entfernen
                playerElement.classList.remove('pushing-left', 'pushing-right');
            }
        } else { // In der Luft oder gerade abgesprungen/gelandet -> keine Pushing-Animation
            playerElement.classList.remove('pushing-left', 'pushing-right');
        }

    } else { // Logik während des Grindens
        playerState.dy = 0; // Keine vertikale Bewegung beim Grinden
        if (typeof addScore === 'function') addScore(gameSettings.grindScorePerFrame); // ui.js
        if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: Grind";

        // Horizontale Anpassung auf dem Rail
        let grindAdjust = 0;
        if (keys.KeyA) {
            grindAdjust = -gameSettings.grindAdjustSpeed;
        } else if (keys.KeyD) {
            grindAdjust = gameSettings.grindAdjustSpeed;
        }
        // Direkte X-Anpassung für Grind-Steuerung
        playerState.x += grindAdjust;

        // Spieler auf dem Rail halten (innerhalb der Rail-Grenzen) und Y-Position anpassen
        if (playerState.currentRail) {
            // exakt auf der Rail-Oberkante bleiben
            playerState.y = playerState.currentRail.y - gameSettings.playerHeight;

            /* ─────────  NEU: Rail-Ende-Handling  ───────── */

            // Nur noch die linke Rail-Kante als Minimum zulassen
            playerState.x = Math.max(playerState.x, playerState.currentRail.x);

            // Position der rechten Rail-Kante (mit eigener Breite verrechnet)
            const railRightEdge =
                playerState.currentRail.x +
                playerState.currentRail.width -
                gameSettings.playerWidth;

            // Sind wir darüber hinaus? → Grind beenden und runterfallen
            if (playerState.x >= railRightEdge) {
                playerState.isGrinding = false;
                playerState.currentRail = null;

                playerElement.classList.remove('grinding');
                  // kurze Fall-Animation
                // dy bleibt 0 – ab dem nächsten Frame sorgt die Gravitation fürs Fallen
            }

            /* ─────────  Funken & Punkte  ───────── */
            if (typeof tryEmitGrindSparks === 'function') {
                tryEmitGrindSparks(playerState, grindSparkState, 0);
            }
        }
        playerElement.classList.remove('pushing-left', 'pushing-right'); // Keine Pushing-Anim beim Grinden
    }

    // Spieler X-Position basierend auf dx aktualisieren, WENN NICHT GEGRINDET WIRD
    if (!playerState.isGrinding) {
        playerState.x += playerState.dx;
    }


    // Ollie (Springen) - mit Space
    if (keys.Space && (playerState.isOnGround || playerState.isGrinding)) {
        playerState.dy = -gameSettings.jumpForce;
        playerState.isOnGround = false; // Wird durch Kollision ggf. wieder true
        playerElement.classList.remove('landing', 'pushing-left', 'pushing-right'); // Pushing beim Absprung beenden

        if (playerState.isGrinding) {
            if (typeof addScore === 'function') addScore(gameSettings.ollieScore, "Kickflip off Grind"); // ui.js
            playerState.isGrinding = false;
            playerState.currentRail = null;
            playerElement.classList.remove('grinding');
        } else {
            if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: Kickflip";
            // playerState.dx (aktuelle horizontale Geschwindigkeit vom Pushen) wird beibehalten
        }
        playerElement.classList.add('jumping'); // Sprung-Animation starten
    }

    // Gravitation anwenden, wenn nicht gegrindet wird
    if (!playerState.isGrinding) {
        playerState.dy += gameSettings.gravity;
    }
}