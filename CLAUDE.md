# Welcome to the Jungle — Claude Instructions

## Project Overview

A high-octane skateboarding side-scroller runner game. Play at https://mrtrewar.github.io/game.html

**Genre:** Endless runner / skateboarding platformer
**Tech Stack:** Vanilla HTML/CSS/JS, anime.js for animations, Supabase for online leaderboard
**Deploy:** GitHub Pages (auto-published from `main` branch)

---

## Key Game Mechanics

- **Controls:** A/D move left/right, Space jumps (Ollie), P pauses, Enter restarts
- **Mobile:** Slide-Joystick links (Finger halten + sliden), Jump-Button rechts
- **Scoring:**
  - Jump landing (Kickflip) = 10 pts
  - Rail grinding (Rail Lock) = 5 pts + 1 pt/frame
  - All multiplied by combo meter (max 8x)
- **Progression:** 3 levels unlocked at score thresholds (0 → JUNGLE, 800 → CITY, 2000 → NIGHTPARK)
- **Difficulty Ramp:**
  - Level 1 starts at speed 1.5, ramps up +0.3 every 50 frames
  - Level 2 base 3.5, Level 3 base 4.5

---

## File Structure

```
MrTrewar.github.io/
├── game.html                          # Game entry point
├── index.html                         # Landing page (links to game/training)
├── training.html                      # Training page (stub)
├── CLAUDE.md                          # This file
├── js/
│   ├── config.js                      # Game config, level data, gameSettings
│   ├── game.js                        # Main game loop, collision, input handling
│   ├── player.js                      # Player physics, state, animation
│   ├── world.js                       # Procedural platform/rail generation
│   ├── ui.js                          # HUD, leaderboard, score popups
│   ├── effects.js                     # Sparks, explosions, visual FX
│   └── audio.js                       # Sound effects
├── css/
│   └── style.css                      # Full styling
├── assets/
│   ├── images/
│   │   ├── player_body_*.png          # Player animation frames (4 states × 2 frames)
│   │   ├── skateboard.png
│   │   ├── explosion_sprite.png       # Death sprite sheet
│   │   ├── platform_ground.png, rail_segment.png
│   │   └── backgrounds/level*.jpg
│   └── sounds/
│       ├── kickflip.wav
│       ├── land.wav
│       ├── grind_loop.mp3
│       └── explosion.wav
├── gym-tracker/                       # Separate fitness tracking app (not game)
└── (other files: index, leaderboard, etc.)
```

---

## Critical Config Values (`js/config.js`)

```js
const gameSettings = {
    worldScrollSpeed: 1.5,              // Initial speed (set 2024-03)
    jumpForce: 13,                      // Jump height
    gravity: 0.48,                      // Fall speed
    pushForce: 0.68,                    // Acceleration on A/D
    maxPlayerDX: 4.5,                   // Max horizontal speed
    coyoteTimeFrames: 7,                // Frames after leaving platform to still jump
    jumpBufferFrames: 8,                // Frames before landing to queue jump
    // ... (other values for platforms, rails, size, etc.)
};

const LEVELS = [
    { id: 1, name: "JUNGLE", scrollSpeedBase: 1.5, scoreThreshold: 0 },  // ← Set 2024-03
    { id: 2, name: "CITY",   scrollSpeedBase: 3.5, scoreThreshold: 1500 },
    { id: 3, name: "NIGHTPARK", scrollSpeedBase: 4.5, scoreThreshold: 3000 },
];
```

---

## Change Log

### 2024-03 — Mobile Controls + Difficulty Tuning
**Fixes:**
- ✅ Mobile controls: runder Joystick (Finger halten + links/rechts sliden) statt separater Pfeil-Buttons
- ✅ Game starts slower — Level 1 `scrollSpeedBase` reduced 2.5 → 1.5
- ✅ Created this CLAUDE.md

**What Changed:**
1. **`js/config.js`**
   - `gameSettings.worldScrollSpeed`: 2.5 → 1.5
   - `LEVELS[0].scrollSpeedBase`: 2.5 → 1.5

2. **`game.html`**
   - Replaced `#dpad` (two arrow `<span>`s) with `#joystick` + `#joystick-knob`

3. **`css/style.css`**
   - Removed: `.dpad-arrow` styles
   - Added: `#joystick` (90px round, semi-transparent), `#joystick-knob` (40px inner knob, slides visually)
   - `pointer-events: auto` on joystick and jump-btn (container stays `pointer-events: none`)

4. **`js/game.js`** (touch controls section)
   - Removed: old swipe D-pad and button-tap logic
   - Added: Joystick touch handling — tracks `joystickTouchId`, computes dx from center
   - Knob moves visually (clamped ±25px), 10px deadzone before movement activates
   - `releaseJoystick()` snaps knob back to center, releases keys

**Testing:**
- On mobile: hold joystick + slide left/right → player moves; release → stops
- Knob visually follows finger position
- Jump button tappable independently (can slide + jump simultaneously)
- Desktop: A/D + Space still work perfectly

### 2024-03 — Mobile Auto-Sizing + Bigger Controls
**Fixes:**
- ✅ Joystick vergrößert: 90px → 130px, Knob 40px → 55px, max slide 25px → 38px
- ✅ Jump-Button vergrößert: 68px → 110px
- ✅ Player-Sprites skalieren dynamisch mit `gameSettings.playerWidth/Height` auf Mobile
- ✅ `scalePlayerVisuals()` in `player.js` — setzt Player-Element, Body und Board proportional

**What Changed:**
1. **`css/style.css`** — `#joystick` 130px, `#joystick-knob` 55px, `#jump-btn` 110px
2. **`js/player.js`** — neue `scalePlayerVisuals()` Funktion, aufgerufen in `resetPlayer()`
3. **`js/game.js`** — `maxOffset` 25 → 38 für größeren Joystick-Spielraum

### 2024-03 — Leaderboard auf Mobile nicht bedienbar
**Problem:** `touchstart` auf `#game-area` hat bei Game Over sofort `restartGame()` aufgerufen — auch wenn man auf Leaderboard-Elemente getippt hat.
**Fix:** `gameAreaEl` touchstart prüft jetzt ob der Touch auf `.leaderboard-entry`, `.leaderboard-submit`, `.leaderboard-open`, `.leaderboard` oder `#game-over-message` liegt → wenn ja, kein Restart.

### 2024-03 — Fade+Flash Level-Transition
**Vorher:** Level wechselte sofort bei Score-Threshold (nur Text-Overlay)
**Nachher:** Weißer Screen-Flash → Background wechselt → Flash blendet aus + Level-Name Overlay

**Hinweis:** Portal-basierter Ansatz wurde versucht (Portal-Objekt in Welt spawnen, Spieler fährt durch) — hat nicht zuverlässig funktioniert (Spawn-Timing, Kollisionsbugs). Wurde komplett entfernt zugunsten des direkten Flash-Ansatzes.

**Neue Elemente:**
- `#screen-flash` div in `game.html` (weißes Fullscreen-Overlay, z-index 90)
- `#screen-flash` + `#screen-flash.flash` CSS (opacity 0 → 0.85, transition 0.15s)

**Geänderte Dateien:**
1. **`js/game.js`** — `triggerLevelTransition(levelIndex)`: Flash ein (200ms) → `transitionToLevel()` → Flash aus (250ms); `isTransitioning` Flag verhindert Doppel-Trigger
2. **`css/style.css`** — `#screen-flash` Styling

### 2024-03 — Rail-Ende Bug Fix
**Problem:** Spieler blieb am Ende von Rails hängen, wurde mit dem Rail nach links gezogen und generierte endlos Punkte.
**Ursache:** Player-X wurde auf `Math.max(playerState.x, rail.x)` geclampt (player.js), sodass die Rail-Exit-Checks in game.js nie triggerten.
**Fix:** Neue Bedingung in `resolvePlayerCollisionsAndUpdatePosition()`: `isPlayerDraggedToEdge = playerState.x <= 0` → beendet Grind wenn Spieler an den linken Bildschirmrand geschoben wird.

### 2024-03 — PWA: Als eigene App auf dem Home-Screen
**Ziel:** Spiel ohne Safari-Browserleiste im Fullscreen öffnen (wie eine native App)
**Neue Dateien:**
- `manifest.json` — Web App Manifest (`display: fullscreen`, `orientation: landscape`)
- `assets/images/icon-192.png`, `icon-512.png` — App-Icons
**Geändert:**
- `game.html` — PWA Meta-Tags hinzugefügt (`apple-mobile-web-app-capable`, manifest link, theme-color, apple-touch-icon)
**Nutzung:** Auf iPhone Safari → Teilen-Button → "Zum Home-Bildschirm" → öffnet als Fullscreen-App

---

## Next Steps for Future Fixes

When making changes, **always update this file** with:
1. What was broken
2. What config values changed (include before/after)
3. What code was edited and how
4. Date & testing notes

Keep the change log growing so future Claude agents understand the project evolution.

---

## Useful Keyboard Shortcuts (During Play)

- **A** — Move left
- **D** — Move right
- **Space** — Jump
- **P** — Pause/unpause
- **Enter** — Restart after game over
- **R** — (disabled, reserved)

---

## Supabase Leaderboard Setup

The game sends scores to Supabase (`whelaaozlexvxkojrljp.supabase.co`).
Table: `leaderboard` (columns: `id`, `name`, `score`, `created_at`)

If leaderboard breaks, check:
1. `SUPABASE_URL` & `SUPABASE_ANON_KEY` in `config.js`
2. Table permissions in Supabase dashboard
3. Browser console for API errors
