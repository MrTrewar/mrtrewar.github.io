const scoreDisplayElement = document.getElementById('score-display');
const currentTrickDisplayElement = document.getElementById('current-trick');
const gameOverMessageElement = document.getElementById('game-over-message');
const gameAreaForUIPopups = document.getElementById('game-area');

// Erkennung Mobilgerät
const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/**
 * Blendet einen Text kurz irgendwo im Spielbereich ein/aus.
 * Nur auf Mobilgeräten aktiv.
 */
function showMobilePopup(text) {
    if (!isMobile) return;

    const popup = document.createElement('div');
    popup.className = 'mobile-popup';
    popup.textContent = text;

    const area = document.getElementById('game-area');
    const x = Math.random() * (area.clientWidth - 80);
    const y = Math.random() * (area.clientHeight - 30);
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    area.appendChild(popup);

    anime({
        targets: popup,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
        complete: () => {
            anime({
                targets: popup,
                opacity: [1, 0],
                duration: 300,
                delay: 800,
                easing: 'easeInQuad',
                complete: () => popup.remove()
            });
        }
    });
}

/**
 * Fügt Punkte hinzu und zeigt ggf. Trick.
 * Mobile: Popup irgendwo. Desktop: Popup über Spieler.
 */
function addScore(points, trickName = "") {
    if (!window.playerState) {
        console.error("addScore: playerState ist nicht verfügbar.");
        return;
    }

    playerState.score += points;
    updateScoreDisplay();

    if (trickName) {
        currentTrickDisplayElement.textContent = `Trick: ${trickName}`;
    }

    // Mobile: zufälliger Popup
    if (isMobile) {
        showMobilePopup(`+${points}${trickName ? ' ' + trickName : ''}`);
    } else {
        // Desktop: Popup über dem Spieler
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
            complete: () => popup.remove()
        });
    }
}

function updateScoreDisplay() {
    if (window.playerState) {
        scoreDisplayElement.textContent = `Score: ${playerState.score}`;
    }
}

function showGameOverMessage() {
    gameOverMessageElement.style.display = 'flex';
}

function hideGameOverMessage() {
    gameOverMessageElement.style.display = 'none';
}