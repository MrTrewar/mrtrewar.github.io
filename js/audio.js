// js/audio.js

const soundKickflip = new Audio('assets/sounds/kickflip.wav');
const soundLand     = new Audio('assets/sounds/land.wav');
const soundGrind    = new Audio('assets/sounds/grind_loop.mp3');
const soundDeath    = new Audio('assets/sounds/explosion.wav');

// Grind-Loop konfigurieren
soundGrind.loop = true;

// Utility
function playSound(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("Sound error:", e));
}