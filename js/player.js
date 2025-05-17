// js/player.js

var playerElement = document.getElementById('player');
if (!playerElement) {
    console.error("FATAL: Spieler-Element #player nicht im DOM gefunden!");
}

var playerState = {
    x: GAME_AREA_WIDTH / 3,
    y: 0,
    dx: 0,
    dy: 0,
    isOnGround: false,
    isGrinding: false,
    currentRail: null,
    isGameOver: false,
    score: 0
};

var keys = {
    KeyA: false,
    KeyD: false,
    Space: false
};

function resetPlayer() {
    playerState.y = gameSettings.groundLevelY - gameSettings.playerHeight;
    playerState.x = GAME_AREA_WIDTH / 3;
    playerState.dx = 0;
    playerState.dy = 0;
    playerState.isOnGround = true;
    playerState.isGrinding = false;
    playerState.currentRail = null;
    playerState.isGameOver = false;
    playerState.score = 0;

    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: ---";
    if (typeof hideGameOverMessage === 'function') hideGameOverMessage();

    if (playerElement) {
        playerElement.classList.remove('grinding', 'jumping', 'landing', 'pushing-left', 'pushing-right');
    }
    // console.log("Player reset. Initial Y:", playerState.y);
}

function updatePlayerIntentAndPhysics() {
    if (playerState.isGameOver || !playerElement) return;

    let targetDX = 0;

    if (!playerState.isGrinding) {
        if (keys.KeyA) {
            targetDX = -gameSettings.maxPlayerDX;
        } else if (keys.KeyD) {
            targetDX = gameSettings.maxPlayerDX;
        }
        playerState.dx += (targetDX - playerState.dx) * gameSettings.pushForce;

        if (playerState.isOnGround && !playerElement.classList.contains('jumping') && !playerElement.classList.contains('landing')) {
            if (keys.KeyA) {
                playerElement.classList.add('pushing-left');
                playerElement.classList.remove('pushing-right');
            } else if (keys.KeyD) {
                playerElement.classList.add('pushing-right');
                playerElement.classList.remove('pushing-left');
            } else {
                playerElement.classList.remove('pushing-left', 'pushing-right');
            }
        } else {
            playerElement.classList.remove('pushing-left', 'pushing-right');
        }
    } else { // Grinding
        playerState.dy = 0;
        if (typeof addScore === 'function') addScore(gameSettings.grindScorePerFrame);
        if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: Grind";

        let grindAdjust = 0;
        if (keys.KeyA) {
            grindAdjust = -gameSettings.grindAdjustSpeed;
        } else if (keys.KeyD) {
            grindAdjust = gameSettings.grindAdjustSpeed;
        }
        playerState.x += grindAdjust;

        if (playerState.currentRail) {
            playerState.y = playerState.currentRail.y - gameSettings.playerHeight;
            playerState.x = Math.max(
                playerState.currentRail.x,
                Math.min(playerState.x, playerState.currentRail.x + playerState.currentRail.width - gameSettings.playerWidth)
            );
        }
        playerElement.classList.remove('pushing-left', 'pushing-right');
    }

    if (!playerState.isGrinding) {
        playerState.x += playerState.dx;
    }

    if (keys.Space && (playerState.isOnGround || playerState.isGrinding)) {
        playerState.dy = -gameSettings.jumpForce;
        playerState.isOnGround = false;
        playerElement.classList.remove('landing', 'pushing-left', 'pushing-right');

        if (playerState.isGrinding) {
            if (typeof addScore === 'function') addScore(gameSettings.ollieScore, "Ollie off Grind");
            playerState.isGrinding = false;
            playerState.currentRail = null;
            playerElement.classList.remove('grinding');
        } else {
            if (window.currentTrickDisplayElement) currentTrickDisplayElement.textContent = "Trick: Ollie";
        }
        playerElement.classList.add('jumping');
    }

    if (!playerState.isGrinding) {
        playerState.dy += gameSettings.gravity;
    }
}