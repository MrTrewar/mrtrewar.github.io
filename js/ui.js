// js/ui.js
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
    // zufällige Position innerhalb des Spielfelds
    const x = Math.random() * (area.clientWidth - 80);
    const y = Math.random() * (area.clientHeight - 30);
    popup.style.left = x + 'px';
    popup.style.top  = y + 'px';
    area.appendChild(popup);

    // Fade-In
    anime({
        targets: popup,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
        complete: () => {
            // nach kurzer Pause Fade-Out
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
 * Fügt Punkte hinzu und zeigt Popup (Mobil) sowie Popup über Spieler (PC).
 */
function addScore(points, trickName = "") {
    if (window.playerState) {
        playerState.score += points;
        updateScoreDisplay();
        if (trickName) currentTrickDisplayElement.textContent = `Trick: ${trickName}`;

        // Mobile: zufälliger Popup
        showMobilePopup(`+${points}${trickName ? ' ' + trickName : ''}`);

        // Desktop: Popup über Spieler
        if (!isMobile) {
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
