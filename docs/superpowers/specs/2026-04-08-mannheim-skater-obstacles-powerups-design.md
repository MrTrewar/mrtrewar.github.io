# Mannheim Skater: Hindernisse, Powerups, Formationen & Schloss-Modell

**Datum:** 2026-04-08
**Ansatz:** Data-Driven System — alle Definitionen in `config.js`, generische Spawn/Collision-Systeme lesen die Defs

---

## 1. Hindernis-System

### Definitionen in `config.js`

Alle Hindernistypen als `OBSTACLE_DEFS` Array. Jeder Eintrag beschreibt Typ, Abmessungen, Verhalten und Spawn-Gewicht.

```js
export const OBSTACLE_DEFS = [
  // Statische Hindernisse
  { type: 'poller',      lanes: 1, jumpable: true,  grazeble: true,
    shape: 'cylinder', w: 0.3, h: 0.7, d: 0.3, color: 0x888888, weight: 3 },
  { type: 'barrier',     lanes: 1, jumpable: true,  grazeble: true,
    shape: 'box', w: 0.9, h: 0.5, d: 0.2, color: 0xff8800, weight: 2 },
  { type: 'baustelle',   lanes: 2, jumpable: false, grazeble: false,
    shape: 'box', w: 2.4, h: 1.2, d: 0.4, color: 0xff6600, weight: 1 },

  // Fahrzeuge (statisch)
  { type: 'car',         lanes: 1, jumpable: false, grazeble: true,
    shape: 'box', w: 1.0, h: 0.9, d: 1.8, color: 0xcc2222, weight: 3 },
  { type: 'car_wide',    lanes: 2, jumpable: false, grazeble: true,
    shape: 'box', w: 2.2, h: 1.0, d: 2.0, color: 0x2255aa, weight: 1 },

  // Bewegliche Hindernisse
  { type: 'tram',        lanes: 2, jumpable: false, grazeble: true,
    shape: 'box', w: 2.6, h: 1.8, d: 4.0, color: 0xdd0000,
    weight: 1, moving: true, moveSpeed: 8, moveDir: 'toward' },
  { type: 'radfahrer',   lanes: 1, jumpable: false, grazeble: true,
    shape: 'box', w: 0.5, h: 1.2, d: 0.8, color: 0x44aa44,
    weight: 1, moving: true, moveSpeed: 3, moveDir: 'toward' },

  // Infrastruktur
  { type: 'tunnel',      lanes: 3, jumpable: false, grazeble: false,
    shape: 'box', w: 4.0, h: 2.5, d: 0.3, color: 0x666666,
    weight: 0.5, narrowing: true },
  { type: 'ampel',       lanes: 1, jumpable: true,  grazeble: true,
    shape: 'cylinder', w: 0.2, h: 2.0, d: 0.2, color: 0x333333, weight: 1 },
];
```

### Neue Definition-Felder

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `grazeble` | boolean | Kann seitlich gestreift werden (Slowdown statt Tod) |
| `moving` | boolean | Bewegt sich eigenstaendig |
| `moveSpeed` | number | Eigengeschwindigkeit (units/s) |
| `moveDir` | string | `'toward'` (entgegenkommend), `'lateral'` (kreuzt Lanes), `'away'` (gleiche Richtung) |
| `narrowing` | boolean | Verengt das Spielfeld visuell |
| `shape` | string | `'box'`, `'cylinder'`, oder `'model'` (GLB) |

### Bewegungslogik in `obstacles.js`

```
moveDir 'toward':  obs.z -= (scrollSpeed + moveSpeed) * dt
moveDir 'lateral': obs.x += sin(elapsedTime * moveSpeed) * dt * 2
moveDir 'away':    obs.z -= (scrollSpeed - moveSpeed) * dt
```

---

## 2. Streifen-Mechanik & Kollisions-Ueberarbeitung

### 3-Stufen Kollisions-System

Ergebnisse: `'hit'`, `'graze'`, `'near-miss'`, `'jump-over'`, `'shield-break'`, `null`

### Overlap-Berechnung

```
overlapX = min(playerRight, obsRight) - max(playerLeft, obsLeft)
overlapRatio = overlapX / PLAYER_BODY_W

if overlapRatio > 0.3         → 'hit' (frontale Kollision)
if overlapRatio > 0 && grazeble → 'graze' (Streifen)
if overlapRatio > 0 && !grazeble → 'hit'
```

### Streifen-Effekt

- `state.isStumbling = true`, `state.stumbleTimer = 1.5s`
- Speed-Reduktion auf 60% waehrend Stumble
- Visuell: Spieler-Tilt +-15 Grad, Kamera-Shake (0.3s)
- Cooldown: Kein weiterer Graze waehrend isStumbling (kein Stun-Lock)
- Recovery: Speed linear ueber 0.5s zurueck auf Normalwert

### Kollisions-Prioritaetskette

```
1. Hover aktiv?        → Skip (ueber alles drueber)
2. Bulldozer aktiv?    → Hindernis zerstoeren, Bonuspunkte
3. Y-Check (jumpable)  → 'jump-over'
4. Graze-Check         → 'graze'
5. Shield (Doener)?    → Shield verbrauchen, 'shield-break'
6. Sonst               → 'hit' (Game Over)
```

---

## 3. Powerup-System

### Definitionen in `config.js`

```js
export const POWERUP_DEFS = [
  { type: 'doener',  name: 'Doener',         color: 0x8B4513, emissive: 0x442200,
    duration: 0, effect: 'shield' },
  { type: 'eistee',  name: 'Eistee',        color: 0xFFDD00, emissive: 0x665500,
    duration: 5, effect: 'slowmo' },
  { type: 'rad',     name: 'Kurpfalz-Rad',  color: 0xDD2222, emissive: 0x550000,
    duration: 10, effect: 'bulldozer' },
  { type: 'ticket',  name: 'Monatsticket',   color: 0x22CC44, emissive: 0x005500,
    duration: 8, effect: 'magnet' },
  { type: 'spray',   name: 'Graffiti',       color: 0xFF00FF, emissive: 0x550055,
    duration: 5, effect: 'scoreblast' },
  { type: 'board',   name: 'Board-Up',       color: 0x00FFFF, emissive: 0x005555,
    duration: 10, effect: 'hover' },
];
```

### Effekt-Beschreibungen

| Powerup | Effect-Key | Verhalten |
|---------|-----------|-----------|
| Doener | `shield` | One-Hit-Schutz. Naechster frontaler Crash absorbiert, visueller Board-Bruch. Kein Timer. |
| Eistee | `slowmo` | `state.timeScale = 0.5` fuer 5s. Scroll, Hindernisse, Spawning langsamer. Score-Distance-Tick und Powerup-Timer laufen mit `dt` (nicht `dt * timeScale`) damit Score normal weiterzaehlt und der Timer korrekt ablaeuft. |
| Kurpfalz-Rad | `bulldozer` | Invincible + getroffene Hindernisse werden zerstoert (Wegschleuder-Animation, +10 Punkte je). |
| Monatsticket | `magnet` | Alle Brezels fliegen zum Spieler, kein Lane-Wechsel noetig. |
| Graffiti | `scoreblast` | Score-Multiplikator x5 auf alles. Visuell: bunte Partikel-Trail. |
| Board-Up | `hover` | Spieler schwebt ~1.5 Units ueber Boden. Alle Hindernisse unterflogen. |

### State-Erweiterungen in `game-state.js`

```js
timeScale: 1,
isStumbling: false,
stumbleTimer: 0,
stumbleSpeedBackup: 0,
isHovering: false,
isBulldozer: false,
```

### Deaktivierung

Generisches `deactivatePowerUp(type)` setzt anhand der Effect-Kennung die entsprechenden State-Werte zurueck.

---

## 4. Brezel-Formationen

### Templates in `config.js`

```js
export const BREZEL_FORMATIONS = [
  // Pfad-Formationen (zeigen sicheren Weg)
  { id: 'line',       category: 'path',  weight: 3,
    points: [
      { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
      { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
    ]},
  { id: 'diagonal',   category: 'path',  weight: 2,
    points: [
      { lane: 0, z: 0 }, { lane: 1, z: 1.5 }, { lane: 2, z: 3 },
      { lane: 3, z: 4.5 }, { lane: 4, z: 6 },
    ]},
  { id: 'slalom',     category: 'path',  weight: 2,
    points: [
      { lane: 1, z: 0 }, { lane: 3, z: 1.5 }, { lane: 1, z: 3 },
      { lane: 3, z: 4.5 }, { lane: 1, z: 6 },
    ]},
  { id: 'funnel',     category: 'path',  weight: 1,
    points: [
      { lane: 0, z: 0 }, { lane: 4, z: 0 },
      { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
      { lane: 2, z: 3 },
    ]},

  // Trick-Formationen (Risiko/Belohnung)
  { id: 'jump_arc',   category: 'trick', weight: 2,
    points: [
      { lane: 2, z: 0, y: 0.5 }, { lane: 2, z: 1, y: 1.2 },
      { lane: 2, z: 2, y: 1.8 }, { lane: 2, z: 3, y: 1.2 },
      { lane: 2, z: 4, y: 0.5 },
    ]},
  { id: 'diamond',    category: 'trick', weight: 1,
    points: [
      { lane: 2, z: 0 },
      { lane: 1, z: 1.5 }, { lane: 3, z: 1.5 },
      { lane: 0, z: 3 }, { lane: 4, z: 3 },
      { lane: 1, z: 4.5 }, { lane: 3, z: 4.5 },
      { lane: 2, z: 6 },
    ]},
  { id: 'risky_edge', category: 'trick', weight: 1,
    points: [
      { lane: 0, z: 0 }, { lane: 0, z: 1.5 }, { lane: 0, z: 3 },
      { lane: 0, z: 4.5 }, { lane: 0, z: 6 },
      { lane: 0, z: 7.5 }, { lane: 0, z: 9 },
    ]},
  { id: 'v_shape',    category: 'trick', weight: 1,
    points: [
      { lane: 0, z: 0 }, { lane: 4, z: 0 },
      { lane: 1, z: 2 }, { lane: 3, z: 2 },
      { lane: 2, z: 4 },
    ]},
];
```

### Spawn-Logik

1. Pro Spawn-Zyklus: Formation (70%) oder Random-Scatter (30%)
2. Bei Formation:
   - Template nach Weight waehlen
   - Zufaelliger Lane-Offset (ganze Formation verschieben, solange 0-4)
   - Path-Formationen: Pruefen ob Hindernis in der Naehe, Formation auf freie Seite platzieren
   - Trick-Formationen: Unabhaengig von Hindernissen (bewusst riskant)
3. Alle Brezels der Formation auf einmal spawnen

### Y-Offset

Formationen mit `y`-Wert spawnen Brezels ueber dem Boden. Standard-Y ist `BREZEL_Y_OFFSET` (0.6) wenn nicht angegeben.

---

## 5. GLB-Modell (Schloss)

### Optimierung

Die 168MB GLB-Datei wird mit `gltf-transform` optimiert:

1. Draco-Kompression (Geometrie, ~90% Reduktion)
2. Texture-Kompression (max 1024x1024, WebP/KTX2)
3. Mesh-Vereinfachung (`weld` + `simplify`, Ziel: <50k Triangles)
4. `prune` (nicht-referenzierte Nodes entfernen)

Ziel-Dateigroesse: ~3-8MB

### Config

```js
export const MODEL_DEFS = {
  schloss: {
    path: 'assets/models/schloss_optimized.glb',
    scale: 0.5,
    rotation: { y: Math.PI },
  },
};
```

### Neues Modul: `js/models.js`

- `loadModel(key)` → `Promise<THREE.Group>`
- Interner Cache (einmal laden, beliebig klonen)
- Nutzt `GLTFLoader` + `DRACOLoader`
- Ladevorgang beim Spielstart mit Progress-Callback

### Integration in `world.js`

`createSchloss()` laedt das optimierte GLB statt Box-Primitiven. Fallback auf Box-Version wenn GLB nicht laedt.

### Ladescreen

`<div id="loading-screen">` mit Fortschrittsbalken. Wird nach dem Laden aller Models ausgeblendet, erst dann `init()` + `gameLoop` starten.

---

## 6. Dateistruktur

### Geaenderte Dateien

| Datei | Aenderungen |
|-------|------------|
| `js/config.js` | OBSTACLE_DEFS erweitert, POWERUP_DEFS neu, BREZEL_FORMATIONS neu, MODEL_DEFS neu |
| `js/game-state.js` | Neue Felder: timeScale, isStumbling, stumbleTimer, isHovering, isBulldozer |
| `js/obstacles.js` | Erweiterte Defs lesen, bewegliche Hindernisse, Shape-System, Zerstoerung |
| `js/collectibles.js` | Formations-System, Hinderniskopplung, ueberarbeitete Powerup-Logik |
| `js/collision.js` | 3-Stufen Overlap-System, Prioritaetskette |
| `js/player.js` | Stumble-Animation, Hover-Y-Offset |
| `js/main.js` | timeScale in dt, Stumble-Timer, Model-Preload, Ladescreen |
| `js/world.js` | createSchloss via GLB, Fallback |
| `js/scene.js` | Kamera-Shake bei Graze |
| `js/hud.js` | Stumble-Indikator |
| `index.html` | Loading-Screen div, DRACOLoader/GLTFLoader Scripts |

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `js/models.js` | GLTFLoader + DRACOLoader, Model-Cache |
| `assets/models/schloss_optimized.glb` | Optimiertes Schloss-Modell |

### Datenfluss

```
config.js (alle Definitionen)
  -> main.js (Ladescreen -> models.js preload -> init)
  -> obstacles.js (liest OBSTACLE_DEFS, spawnt nach shape/moving)
  -> collectibles.js (liest BREZEL_FORMATIONS + POWERUP_DEFS)
  -> collision.js (liest grazeble/jumpable, Overlap-Ratio)
  -> game-state.js (zentrale Flags)
  -> player.js + scene.js (visuelle Reaktion)
```
