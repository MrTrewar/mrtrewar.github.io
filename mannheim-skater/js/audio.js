const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;

// Unlock audio context on first user interaction
function unlockAudio() {
    if (audioUnlocked) return;
    audioCtx.resume();
    audioUnlocked = true;
}
window.addEventListener('keydown', unlockAudio, { once: true });
window.addEventListener('touchstart', unlockAudio, { once: true });

// Synthesize simple sounds (no asset files needed)
function playTone(freq, duration, type = 'square', volume = 0.15) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export function playCollect() {
    playTone(880, 0.1, 'square', 0.1);
    setTimeout(() => playTone(1100, 0.1, 'square', 0.1), 50);
}

export function playPowerUp() {
    playTone(440, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(660, 0.15, 'sine', 0.15), 100);
    setTimeout(() => playTone(880, 0.2, 'sine', 0.15), 200);
}

export function playCrash() {
    // Noise burst
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.1));
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
}

export function playJump() {
    playTone(300, 0.08, 'square', 0.08);
    setTimeout(() => playTone(500, 0.08, 'square', 0.08), 40);
}

export function playLaneSwitch() {
    playTone(200, 0.05, 'sine', 0.05);
}

export function playGraze() {
    playTone(150, 0.2, 'sawtooth', 0.15);
    setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.1), 100);
}

export function playBulldozerHit() {
    playTone(80, 0.15, 'square', 0.2);
    setTimeout(() => playTone(120, 0.1, 'square', 0.15), 80);
}

export function playHoverStart() {
    playTone(600, 0.2, 'sine', 0.1);
    setTimeout(() => playTone(800, 0.3, 'sine', 0.1), 100);
}
