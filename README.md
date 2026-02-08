# Welcome to the Jungle

Arcade-style browser skate game built with plain HTML, CSS, and JavaScript.

## Play Locally

Open `/Users/gerorawert/Documents/Github/MrTrewar.github.io/index.html` in a browser.

## Controls

- `A` / `D`: move left and right
- `Space`: jump / ollie
- `Enter` (after game over): restart
- Mobile: tap to jump, touch controls for movement

## Features

- Endless side-scrolling level generation
- Grind rails, tricks, and combo-based scoring
- Coyote time and jump buffering for smoother controls
- Game-over screen with local leaderboard (saved in browser `localStorage`)
- Manual leaderboard entry flow:
  - Click `Ins Leaderboard eintragen`
  - Enter your name
  - Your current run score is saved as-is

## Project Structure

- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/index.html` - main page and HUD
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/css/style.css` - all styles and animations
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/config.js` - game settings
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/game.js` - game loop and input handling
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/player.js` - player physics and actions
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/world.js` - level generation and world updates
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/ui.js` - score, combo, game-over, leaderboard UI
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/audio.js` - audio playback
- `/Users/gerorawert/Documents/Github/MrTrewar.github.io/js/effects.js` - sparks/explosion effects
