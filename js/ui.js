// js/ui.js
const scoreDisplayElement = document.getElementById('score-display');
const currentTrickDisplayElement = document.getElementById('current-trick');
const comboDisplayElement = document.getElementById('combo-display');
const gameOverMessageElement = document.getElementById('game-over-message');
const gameAreaForUIPopups = document.getElementById('game-area');
const LEADERBOARD_KEY = 'wtj_leaderboard_v1';
const LEADERBOARD_LIMIT = 5;
let didSaveScoreThisRound = false;
let showLeaderboardEntryForm = false;

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

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function loadLeaderboard() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(entry => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
            .sort((a, b) => b.score - a.score)
            .slice(0, LEADERBOARD_LIMIT);
    } catch (err) {
        console.warn('Leaderboard konnte nicht geladen werden:', err);
        return [];
    }
}

function saveLeaderboard(entries) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_LIMIT)));
    } catch (err) {
        console.warn('Leaderboard konnte nicht gespeichert werden:', err);
    }
}

function doesScoreQualify(score) {
    const entries = loadLeaderboard();
    if (entries.length < LEADERBOARD_LIMIT) return score > 0;
    return score > entries[entries.length - 1].score;
}

function addHighscoreEntry(name, score) {
    const safeName = (name || '').trim().slice(0, 16) || 'Player';
    const entries = loadLeaderboard();
    const updated = [...entries, { name: safeName, score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_LIMIT);
    saveLeaderboard(updated);
}

function renderLeaderboardHtml() {
    const entries = loadLeaderboard();
    if (entries.length === 0) {
        return '<div class="leaderboard-empty">Noch keine Einträge.</div>';
    }

    const rows = entries
        .map((entry, index) => `<li><span>#${index + 1} ${escapeHtml(entry.name)}</span><strong>${entry.score}</strong></li>`)
        .join('');
    return `<ol>${rows}</ol>`;
}

function showGameOverMessage() {
    if (window.playerState) {
        const canSubmit = !didSaveScoreThisRound && doesScoreQualify(playerState.score);
        gameOverMessageElement.innerHTML = `
            <div>GAME OVER</div>
            <small>Score: ${playerState.score}</small>
            ${canSubmit && !showLeaderboardEntryForm ? `
            <button type="button" class="leaderboard-open">Ins Leaderboard eintragen</button>
            ` : ''}
            ${canSubmit && showLeaderboardEntryForm ? `
            <form class="leaderboard-entry">
                <label for="player-name-input">Name</label>
                <input id="player-name-input" name="player-name" maxlength="16" placeholder="Player" autocomplete="nickname" />
                <div class="leaderboard-entry-score">Score: ${playerState.score}</div>
                <button type="submit" class="leaderboard-submit">Eintragen</button>
            </form>
            ` : ''}
            <div class="leaderboard">
                <div class="leaderboard-title">Leaderboard</div>
                ${renderLeaderboardHtml()}
            </div>
            <small>${canSubmit ? 'Eintragen, dann R / Enter / Tap zum Neustart' : 'Press R / Enter / Tap to Restart'}</small>
        `;

        if (canSubmit && !showLeaderboardEntryForm) {
            const openButton = gameOverMessageElement.querySelector('.leaderboard-open');
            if (openButton) {
                openButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showLeaderboardEntryForm = true;
                    showGameOverMessage();
                });
            }
        }

        if (canSubmit && showLeaderboardEntryForm) {
            const form = gameOverMessageElement.querySelector('.leaderboard-entry');
            const input = gameOverMessageElement.querySelector('#player-name-input');
            if (form && input) {
                input.focus();
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addHighscoreEntry(input.value, playerState.score);
                    didSaveScoreThisRound = true;
                    showLeaderboardEntryForm = false;
                    showGameOverMessage();
                });
            }
        }
    }
    gameOverMessageElement.style.display = 'flex';
}

function hideGameOverMessage() {
    didSaveScoreThisRound = false;
    showLeaderboardEntryForm = false;
    gameOverMessageElement.style.display = 'none';
}
