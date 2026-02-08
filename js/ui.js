// js/ui.js
const scoreDisplayElement = document.getElementById('score-display');
const currentTrickDisplayElement = document.getElementById('current-trick');
const comboDisplayElement = document.getElementById('combo-display');
const gameOverMessageElement = document.getElementById('game-over-message');
const gameAreaForUIPopups = document.getElementById('game-area');

function addScore(points, trickName = "", options = {}) {
    const useCombo = options.useCombo !== false;
    const showPopup = options.showPopup !== false;

    if (window.playerState) {
        const comboMultiplier = useCombo ? Math.max(1, playerState.comboMultiplier || 1) : 1;
        const awardedPoints = Math.round(points * comboMultiplier);
        playerState.score += awardedPoints;
        updateScoreDisplay();
        if (trickName) currentTrickDisplayElement.textContent = `Trick: ${trickName}`;

        if (showPopup) {
            const popup = document.createElement('div');
            popup.className = 'score-popup';
            popup.textContent = comboMultiplier > 1 ? `+${awardedPoints} x${comboMultiplier}` : `+${awardedPoints}`;
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
        }
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

function updateComboDisplay() {
    if (!comboDisplayElement || !window.playerState) return;
    const comboValue = Math.max(1, playerState.comboMultiplier || 1);
    comboDisplayElement.textContent = `Combo: x${comboValue}`;
}

function showGameOverMessage() {
    if (window.playerState) {
        gameOverMessageElement.innerHTML = `GAME OVER<br><small>Score: ${playerState.score}</small><br><small>Press R / Enter / Tap to Restart</small>`;
    }
    gameOverMessageElement.style.display = 'flex';
}

function hideGameOverMessage() {
    gameOverMessageElement.style.display = 'none';
}
