import { state } from './game-state.js';
import { LANE_COUNT } from './config.js';
import { playJump, playLaneSwitch } from './audio.js';

const SWIPE_DEADZONE = 30; // px

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let swipeHandled = false;

export function switchLane(direction) {
    // direction: -1 (left) or +1 (right)
    if (state.isGameOver || state.isPaused) return;
    if (state.laneSwitchProgress < 0.5) return; // prevent double-switch

    const next = state.targetLane + direction;
    if (next < 0 || next >= LANE_COUNT) return;

    if (state.laneSwitchProgress >= 1) {
        // Start fresh switch: currentLane is where we are
        state.currentLane = state.targetLane;
    }
    state.targetLane = next;
    state.laneSwitchProgress = 0;
    playLaneSwitch();
}

export function triggerJump() {
    if (state.isGameOver || state.isPaused) return;
    if (state.isJumping) return;
    state.isJumping = true;
    state.jumpProgress = 0;
    playJump();
}

export function initInput() {
    // --- Keyboard ---
    window.addEventListener('keydown', (e) => {
        if (state.isGameOver && e.key === 'Enter') {
            window.dispatchEvent(new CustomEvent('game-restart'));
            return;
        }
        if (e.code === 'KeyP' && !state.isGameOver) {
            state.isPaused = !state.isPaused;
            return;
        }
        if (state.isGameOver || state.isPaused) return;

        if (e.code === 'KeyA' || e.code === 'ArrowLeft') switchLane(-1);
        if (e.code === 'KeyD' || e.code === 'ArrowRight') switchLane(1);
        if (e.code === 'Space') { e.preventDefault(); triggerJump(); }
    });

    // --- Touch ---
    const container = document.getElementById('game-container');

    container.addEventListener('touchstart', (e) => {
        if (state.isGameOver) {
            // Don't restart if touching leaderboard/form elements
            if (
                e.target.closest('.leaderboard-entry') ||
                e.target.closest('.game-over-leaderboard') ||
                e.target.closest('input') ||
                e.target.closest('button')
            ) return;
            window.dispatchEvent(new CustomEvent('game-restart'));
            return;
        }
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        swipeHandled = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (swipeHandled || state.isGameOver) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;

        if (Math.abs(dx) > SWIPE_DEADZONE) {
            switchLane(dx > 0 ? 1 : -1);
            swipeHandled = true;
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (state.isGameOver) return;
        // If no swipe happened and it was a quick tap, jump
        const elapsed = Date.now() - touchStartTime;
        if (!swipeHandled && elapsed < 300) {
            triggerJump();
        }
    }, { passive: true });
}
