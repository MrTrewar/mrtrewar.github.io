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

// Supabase
let supabaseClient = null;
let onlineLeaderboard = null; // null = not yet fetched; [] = fetched but empty

function initSupabase() {
    if (typeof supabase === 'undefined') return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('Supabase init failed:', e);
    }
}

async function submitScoreOnline(name, score) {
    if (!supabaseClient) return false;
    try {
        const { error } = await supabaseClient.from('scores').insert({ name, score });
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn('Online score submission failed:', e);
        return false;
    }
}

async function fetchOnlineLeaderboard() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('scores')
            .select('name, score')
            .order('score', { ascending: false })
            .limit(10);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn('Online leaderboard fetch failed:', e);
        return null;
    }
}

initSupabase();

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
    // Use online leaderboard if available, otherwise fall back to local
    const entries = (onlineLeaderboard !== null && onlineLeaderboard.length > 0)
        ? onlineLeaderboard.slice(0, LEADERBOARD_LIMIT)
        : loadLeaderboard();
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

function renderLeaderboardHtml(entries) {
    if (!entries) entries = onlineLeaderboard || loadLeaderboard();
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
        const isOnline = onlineLeaderboard !== null;
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
                <div class="leaderboard-title">Leaderboard${isOnline ? ' 🌐' : ''}</div>
                ${renderLeaderboardHtml()}
            </div>
            <small>${canSubmit ? 'Eintragen, dann Enter / Tap zum Neustart' : 'Press Enter / Tap to Restart'}</small>
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
                    handleScoreSubmit(input.value, playerState.score);
                });
            }
        }

        // Fetch online leaderboard if not yet loaded
        if (onlineLeaderboard === null && supabaseClient) {
            fetchOnlineLeaderboard().then(data => {
                if (data !== null) {
                    onlineLeaderboard = data;
                    if (playerState.isGameOver) showGameOverMessage(); // re-render with online data
                }
            });
        }
    }
    gameOverMessageElement.style.display = 'flex';
}

async function handleScoreSubmit(name, score) {
    const safeName = (name || '').trim().slice(0, 16) || 'Player';
    addHighscoreEntry(safeName, score);
    submitScoreOnline(safeName, score); // fire-and-forget
    onlineLeaderboard = null;
    didSaveScoreThisRound = true;
    showLeaderboardEntryForm = false;
    // Fetch fresh online data then re-render
    const freshData = await fetchOnlineLeaderboard();
    if (freshData !== null) onlineLeaderboard = freshData;
    showGameOverMessage();
}

function hideGameOverMessage() {
    didSaveScoreThisRound = false;
    showLeaderboardEntryForm = false;
    onlineLeaderboard = null; // reset for next round
    gameOverMessageElement.style.display = 'none';
}
