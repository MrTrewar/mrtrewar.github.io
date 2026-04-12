# wiegero.com

Personal project hub by Gero Wieger, hosted on GitHub Pages.

**Live:** [wiegero.com](https://wiegero.com)

---

## Projects

### Welcome to the Jungle
Arcade-style endless runner / skateboarding side-scroller.

- **Play:** [wiegero.com/game.html](https://wiegero.com/game.html)
- **Stack:** Vanilla JS, CSS, anime.js, Supabase (online leaderboard)
- **Controls:** A/D move, Space jump, P pause, Enter restart
- **Mobile:** Slide-Joystick + Jump-Button
- **Features:** 3 Levels (Jungle, City, Nightpark), combo system, rail grinding, PWA support

### Mannheim Skater
3D skateboarding runner through Mannheim landmarks, built with Three.js.

- **Play:** [wiegero.com/mannheim-skater/](https://wiegero.com/mannheim-skater/)
- **Stack:** Three.js, GLB models, Supabase leaderboard
- **Features:** Mannheimer Schloss, Brezel-Powerups, stumble mechanics, camera shake

### GymProgress Pro
Training tracker for periodized 8-week strength programs with double progression.

- **Open:** [wiegero.com/gym-tracker/](https://wiegero.com/gym-tracker/)
- **Stack:** Vanilla JS, Supabase (cloud sync), localStorage fallback
- **Features:** 4-day upper/lower split, AMRAP tracking, auto weight progression, recovery check, supplements tracker

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no bundler)
- [Three.js](https://threejs.org/) (Mannheim Skater)
- [anime.js](https://animejs.com/) (Welcome to the Jungle)
- [Supabase](https://supabase.com/) (leaderboards + gym data)
- GitHub Pages (auto-deploy from `main`)

## Project Structure

```
MrTrewar.github.io/
├── index.html              # Landing page with scroll-driven MRT animation
├── game.html               # Welcome to the Jungle entry point
├── js/                     # Game scripts (config, game, player, world, ui, effects, audio)
├── css/                    # Styles (game + landing page)
├── assets/                 # Sprites, backgrounds, sounds
├── mannheim-skater/        # 3D skater game (Three.js)
├── gym-tracker/            # Training tracker SPA
└── CNAME                   # Custom domain (wiegero.com)
```

## Local Development

Open `index.html` in a browser, or serve with any static file server:

```bash
npx serve .
```
