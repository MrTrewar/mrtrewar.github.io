// Scroll-driven MRT frame animation

const TOTAL_FRAMES = 240;
const FRAME_PATH = 'assets/linac/ezgif-frame-';
const images = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady = false;

const canvas = document.getElementById('mrt-canvas');
const ctx = canvas.getContext('2d');
const loadingFill = document.getElementById('loading-fill');
const loadingScreen = document.getElementById('loading');
const scrollHint = document.getElementById('scroll-hint');
const overlayContent = document.getElementById('overlay-content');

// Frame number: 001 = exploded (top), 240 = assembled (bottom)
function frameIndex(i) {
    // i goes 0..239, we want frame 001 up to 240
    return i + 1;
}

function frameSrc(frameNum) {
    return FRAME_PATH + String(frameNum).padStart(3, '0') + '.jpg';
}

// Preload images in two passes for speed
function preloadImages() {
    // Pass 1: every 4th frame (60 images) for quick scrubbing
    const pass1 = [];
    for (let i = 0; i < TOTAL_FRAMES; i += 4) {
        pass1.push(i);
    }
    // Pass 2: all remaining frames
    const pass2 = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (i % 4 !== 0) pass2.push(i);
    }

    let totalToLoad = TOTAL_FRAMES;

    function loadFrame(i) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                images[i] = img;
                loadedCount++;
                if (loadingFill) {
                    loadingFill.style.width = Math.round((loadedCount / totalToLoad) * 100) + '%';
                }
                // After pass 1 is done, set canvas size and show first frame
                if (loadedCount === pass1.length && !isReady) {
                    initCanvas(img);
                    isReady = true;
                    drawFrame(0);
                    if (loadingScreen) loadingScreen.classList.add('done');
                }
                resolve();
            };
            img.onerror = () => {
                loadedCount++;
                resolve();
            };
            img.src = frameSrc(frameIndex(i));
        });
    }

    // Load pass 1 first (concurrent, batched)
    async function run() {
        // Pass 1: load key frames
        await Promise.all(pass1.map(i => loadFrame(i)));

        // Pass 2: fill in remaining frames (smaller batches to not block)
        for (let batch = 0; batch < pass2.length; batch += 10) {
            const slice = pass2.slice(batch, batch + 10);
            await Promise.all(slice.map(i => loadFrame(i)));
        }
    }

    run();
}

function initCanvas(img) {
    // Size canvas to fill viewport (cover behavior)
    resizeCanvas(img);
    window.addEventListener('resize', () => resizeCanvas(img));
}

function resizeCanvas(img) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const vpRatio = vw / vh;

    if (vpRatio > imgRatio) {
        // Viewport wider than image — fit to width
        canvas.width = vw;
        canvas.height = vw / imgRatio;
    } else {
        // Viewport taller — fit to height
        canvas.height = vh;
        canvas.width = vh * imgRatio;
    }
}

function drawFrame(index) {
    // Find closest loaded frame
    let img = images[index];
    if (!img) {
        // Search nearby loaded frames
        for (let offset = 1; offset < 5; offset++) {
            if (images[index - offset]) { img = images[index - offset]; break; }
            if (images[index + offset]) { img = images[index + offset]; break; }
        }
    }
    if (!img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// Scroll handling
let currentFrame = 0;
let ticking = false;

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrollSection = document.getElementById('scroll-section');
            const rect = scrollSection.getBoundingClientRect();
            const scrollable = scrollSection.offsetHeight - window.innerHeight;

            // How far through the scroll section (0..1)
            const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
            const frame = Math.floor(progress * (TOTAL_FRAMES - 1));

            if (frame !== currentFrame) {
                currentFrame = frame;
                drawFrame(frame);
            }

            // Hide scroll hint after scrolling starts
            if (scrollHint && progress > 0.02) {
                scrollHint.classList.add('hidden');
            } else if (scrollHint) {
                scrollHint.classList.remove('hidden');
            }

            // Show overlay buttons when near the end (assembled)
            if (overlayContent && progress > 0.75) {
                overlayContent.classList.add('visible');
            } else if (overlayContent) {
                overlayContent.classList.remove('visible');
            }

            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', onScroll, { passive: true });

// Start
preloadImages();
