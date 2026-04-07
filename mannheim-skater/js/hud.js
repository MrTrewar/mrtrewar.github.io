import { state } from './game-state.js';
import {
    SUPABASE_URL, SUPABASE_ANON_KEY, LEADERBOARD_TABLE, LEADERBOARD_LIMIT,
} from './config.js';

const scoreEl = document.getElementById('score-display');
const gameOverEl = document.getElementById('game-over-screen');
const gameOverScoreEl = gameOverEl?.querySelector('.game-over-score');
const powerupBarEl = document.getElementById('powerup-bar');

let supabaseClient = null;
let leaderboardData = null;
let didSubmitThisRound = false;

function initSupabase() {
    if (typeof supabase === 'undefined') return;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { console.warn('Supabase init failed:', e); }
}

async function fetchLeaderboard() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from(LEADERBOARD_TABLE)
            .select('name, score')
            .order('score', { ascending: false })
            .limit(LEADERBOARD_LIMIT);
        if (error) throw error;
        return data || [];
    } catch (e) { console.warn('Leaderboard fetch failed:', e); return null; }
}

async function submitScore(name, score) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from(LEADERBOARD_TABLE).insert({ name, score });
    } catch (e) { console.warn('Score submit failed:', e); }
}

initSupabase();

export function updateHUD() {
    if (scoreEl) {
        scoreEl.textContent = Math.floor(state.score);
    }
}

export function showPowerUpBar(name, fraction) {
    if (!powerupBarEl) return;
    powerupBarEl.classList.remove('hidden');
    powerupBarEl.innerHTML = `
        <span>${name}</span>
        <div class="bar-fill"><div class="bar-fill-inner" style="width:${fraction * 100}%"></div></div>
    `;
}

export function hidePowerUpBar() {
    if (powerupBarEl) powerupBarEl.classList.add('hidden');
}

export async function showGameOver() {
    if (!gameOverEl) return;
    const score = Math.floor(state.score);
    if (gameOverScoreEl) gameOverScoreEl.textContent = `Score: ${score}`;

    // Fetch leaderboard
    const lb = await fetchLeaderboard();
    leaderboardData = lb;

    const lbEl = gameOverEl.querySelector('.game-over-leaderboard');
    if (lbEl && lb) {
        const rows = lb.map((e, i) =>
            `<li><span>#${i + 1} ${escapeHtml(e.name)}</span><strong>${e.score}</strong></li>`
        ).join('');
        lbEl.innerHTML = `
            <div style="margin-bottom:8px;font-size:12px;">Leaderboard</div>
            <ol>${rows}</ol>
            ${!didSubmitThisRound ? `
            <form class="leaderboard-entry" style="margin-top:12px;">
                <input maxlength="16" placeholder="Dein Name" autocomplete="nickname" />
                <button type="submit">Eintragen</button>
            </form>` : ''}
        `;

        const form = lbEl.querySelector('.leaderboard-entry');
        if (form) {
            const input = form.querySelector('input');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const name = (input.value || '').trim().slice(0, 16) || 'Player';
                didSubmitThisRound = true;
                await submitScore(name, score);
                leaderboardData = await fetchLeaderboard();
                showGameOver(); // re-render
            });
            input.focus();
        }
    }

    gameOverEl.classList.remove('hidden');
}

function escapeHtml(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function hideGameOver() {
    if (gameOverEl) gameOverEl.classList.add('hidden');
    didSubmitThisRound = false;
    leaderboardData = null;
}
