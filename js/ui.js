// js/ui.js
const scoreDisplayElement = document.getElementById('score-display');
const currentTrickDisplayElement = document.getElementById('current-trick');
const gameOverMessageElement = document.getElementById('game-over-message');
const gameAreaForUIPopups = document.getElementById('game-area');

function addScore(points, trickName = "") {
    if (window.playerState) {
        playerState.score += points;
        updateScoreDisplay();
        if (trickName) currentTrickDisplayElement.textContent = `Trick: ${trickName}`;

        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${points}`;
        popup.style.left = (playerState.x + gameSettings.playerWidth / 2 - 10) + 'px';
        popup.style.top = (playerState.y - 20) + 'px';
        gameAreaForUIPopups.appendChild(popup);

        anime({
            targets: popup,
            translateY: [0, -30],
            opacity: [1, 0],
            duration: 1000,
            easing: 'easeOutExpo',
            complete: () => {
                if (popup.parentNode) popup.parentNode.removeChild(popup);
            }
        });
    } else {
        console.error("addScore: playerState ist nicht verfügbar.");
    }
}

function updateScoreDisplay() {
    if (window.playerState) {
        scoreDisplayElement.textContent = `Score: ${playerState.score}`;
    } else {
        console.error("updateScoreDisplay: playerState ist nicht verfügbar.");
    }
}

function showGameOverMessage() {
    gameOverMessageElement.style.display = 'flex';
}

function hideGameOverMessage() {
    gameOverMessageElement.style.display = 'none';
}