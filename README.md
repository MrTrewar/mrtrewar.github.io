# wiegero.com

Personal project hub by Gero Wieger, hosted on GitHub Pages.

**Live:** [wiegero.com](https://wiegero.com)

---

## Projects

### Jungle Ride / 3D Skate

The homepage opens the new 3D pixel-art skate game automatically.

- **Play:** [wiegero.com](https://wiegero.com/) or [direct 3D link](https://wiegero.com/skate-3d/)
- **Stack:** Vanilla JS, local Three.js, Blender avatar and browser storage
- **Controls:** A/D or arrows move, Space or Up picks any trick including specials, E optionally times a perfect landing, P/Escape pauses
- **Mobile:** Touch arrows, TRICK, optional PRO and LAND buttons
- **Features:** Jungle, neon city and pyramids, precision platforms, rail grinding, combos, daily ghost and local leaderboard
- **Details and tests:** [skate-3d/README.md](skate-3d/README.md)

### Welcome to the Jungle / 2D Classic

The original side-scroller is preserved separately at `game.html`.

- **Play:** [wiegero.com/game.html](https://wiegero.com/game.html)
- **Stack:** Vanilla JS, CSS, anime.js, Supabase (online leaderboard)
- **Controls:** A/D move, Space jump, P pause, Enter restart
- **Mobile:** Slide-Joystick + Jump-Button
- **Features:** 3 Levels (Jungle, City, Nightpark), combo system, rail grinding, PWA support

### GymProgress Pro

Training tracker for periodized strength programs with double progression — plus a hybrid strength + running mode.

- **Open:** [wiegero.com/gym-tracker/](https://wiegero.com/gym-tracker/)
- **Stack:** Vanilla JS, Supabase (cloud sync), localStorage fallback
- **Features:** Classic 4-day upper/lower split **and** Hybrid mode (2 strength days + 3 runs), AMRAP tracking, auto weight progression, 12-week run plan with ACWR load monitoring, recovery check, supplements tracker

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no bundler)
- [anime.js](https://animejs.com/) (Welcome to the Jungle)
- [Supabase](https://supabase.com/) (leaderboards + gym data)
- GitHub Pages (auto-deploy from `main`)

## Project Structure

```
MrTrewar.github.io/
├── index.html              # Redirects the homepage to the 3D game
├── skate-3d/               # Jungle Ride 3D game, models and tests
├── game.html               # Preserved 2D classic (not a redirect)
├── js/                     # Game scripts (config, game, player, world, ui, effects, audio)
├── css/                    # Styles (game + landing page)
├── assets/                 # Sprites, backgrounds, sounds
├── gym-tracker/            # Training tracker SPA
└── CNAME                   # Custom domain (wiegero.com)
```

## Local Development

Open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
```
