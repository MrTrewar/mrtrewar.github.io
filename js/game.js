// js/game.js
const gameArea = document.getElementById('game-area');
let backgroundScrollX = 0;
const BACKGROUND_SCROLL_SPEED_FACTOR = 0.3;
let timeSinceStart = 0;
let speedIncreaseInterval = 50; // alle 300 Frames ≈ 5 Sekunden
let scrollSpeedBase = gameSettings.worldScrollSpeed;
let scrollSpeedMax = 100; // Max-Speed
let scrollSpeedIncrement = 0.3;
let gameOverTime = null; // ✨ NEU für Tap-Restart-Delay

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// ... (resolvePlayerCollisionsAndUpdatePosition bleibt gleich)

function handleGameOver() {
    playerState.isGameOver = true;
    gameOverTime = Date.now(); // ✨ Zeitpunkt speichern
    const logicalY = playerState.y;
    const visualY = logicalY + gameSettings.visualPlayerYOffset;
    const centerX = playerState.x + gameSettings.playerWidth / 2;
    const centerY = visualY + gameSettings.playerHeight / 2;
    if (typeof createExplosion === 'function') {
        createExplosion(centerX, centerY);
    }
    if (typeof soundDeath !== 'undefined') {
        playSound(soundDeath);
    }
    if (soundGrind) {
        soundGrind.pause();
        soundGrind.currentTime = 0;
    }
    if (playerElement) {
        playerElement.classList.remove('jumping', 'landing', 'grinding');
        playerElement.classList.add('mario-death');
    }
    showGameOverMessage();
    anime.running.forEach(anim => anim.pause());
}

// ... (gameLoop und startGame bleiben gleich)

window.addEventListener('keydown', (e) => {
    if (playerState.isGameOver && e.key.toLowerCase() === 'r') {
        startGame();
        return;
    }
    if (playerState.isGameOver) return;
    if (e.code === 'KeyA') keys.KeyA = true;
    if (e.code === 'KeyD') keys.KeyD = true;
    if (e.code === 'Space') keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA') keys.KeyA = false;
    if (e.code === 'KeyD') keys.KeyD = false;
    if (e.code === 'Space') keys.Space = false;
});

// ... (Joystick bleibt gleich)

document.body.addEventListener('touchstart', (e) => {
    if (playerState.isGameOver) return;
    const touch = e.touches[0];
    const jz = joystickZone.getBoundingClientRect();
    const isOutsideJoystick =
        touch.clientX > jz.right || touch.clientY < jz.top || touch.clientY > jz.bottom;

    if (isOutsideJoystick) {
        keys.Space = true;
        setTimeout(() => keys.Space = false, 100);
    }
}, { passive: true });

// 