# Mannheim Skater — Schloss-to-Planken Route Design

## Konzept

Der Spieler startet am Mannheimer Schloss mit isometrischer Kamera, fährt geradeaus (mit Hindernissen von Anfang an), biegt nach ~30 Chunks in einer spielbaren Rechtswendung Richtung Wasserturm ab, und landet dann auf den Planken als Endless Runner mit Chase-Cam (Third-Person von hinten, Subway-Surfers-Stil).

## Streckenaufbau

### Phase 1 — Schloss (Chunks 0 bis TURN_CHUNK, isometrische Kamera)

- Spieler startet vor dem Mannheimer Schloss
- Schloss ist ein großes Deko-Objekt hinter dem Spieler (mehrere BoxGeometry-Teile: Hauptgebaeude, Fluegel, Turm), scrollt langsam weg
- Isometrische OrthographicCamera wie bisher (Position offset 10/10/10, lookAt Spieler)
- Hindernisse, Brezeln und Power-Ups spawnen sofort ab Chunk 0
- Haeuser links/rechts im Schloss-/Barockstil (helle Sandstein-Farben, hohe Gebaeude)
- Lanes laufen in Z-Richtung (wie aktuell)
- `TURN_CHUNK = 30` (konfigurierbar in config.js)

### Phase 2 — Rechtswendung (TURN_CHUNK bis TURN_CHUNK + TURN_DURATION_CHUNKS)

- Uebergang dauert ~5 Chunks (`TURN_DURATION_CHUNKS = 5`)
- Die Kurve ist rein visuell/kameratechnisch — die Welt laeuft technisch weiterhin in Z-Richtung
- Waehrend der Kurven-Chunks rotiert die Kamera um die Y-Achse um 90 Grad (smooth interpoliert)
- Gleichzeitig: Uebergang von OrthographicCamera zu PerspectiveCamera
  - Am Mittelpunkt der Kurve (~Chunk 32-33): Switch von Ortho zu Perspective
  - Kameraposition bewegt sich von seitlich-oben (Iso) nach direkt-hinter-dem-Spieler (Chase)
- Wasserturm wird als Landmark sichtbar (grosses Deko-Objekt rechts vorne, erscheint bei TURN_CHUNK)
- Spieler behaelt volle Kontrolle: Lane-Wechsel und Springen funktionieren normal
- Hindernisse spawnen auch waehrend der Kurve
- Geschwindigkeit bleibt konstant (kein Speed-Up waehrend der Transition)

### Phase 3 — Planken Endless (ab TURN_CHUNK + TURN_DURATION_CHUNKS, Chase-Cam)

- PerspectiveCamera hinter und leicht ueber dem Spieler
  - Position: ~5 Einheiten hinter dem Spieler (negative Z-Offset), ~3 Einheiten ueber ihm (Y-Offset)
  - FOV: ~60 Grad
  - LookAt: Spielerposition + leichter Vorausblick
- Strecke laeuft weiterhin in Z-Richtung (technisch identisch zu Phase 1)
- Normaler Endless Runner: Zonen wechseln, Speed steigt, Power-Ups, etc.
- Planken-Zone wird beim Uebergang aktiviert (Pflastersteine beige, Schaufenster-Deko an den Seiten)
- Alle bestehenden Gameplay-Mechaniken funktionieren unveraendert

## Kamera-System

### Iso-Kamera (Phase 1)

Bestehende OrthographicCamera:
- Frustum Size: 10
- Position: (CAM_OFFSET_Z, CAM_OFFSET_Y, CAM_OFFSET_Z) relativ zum Spieler = (10, 10, 10)
- LookAt: Spieler + 4 Einheiten voraus

### Chase-Kamera (Phase 3)

Neue PerspectiveCamera:
- FOV: 60
- Position: (0, CHASE_CAM_Y, -CHASE_CAM_Z) relativ zum Spieler = (0, 3, -5)
- LookAt: Spielerposition + (0, 0.5, CHASE_CAM_LOOK_AHEAD) = leicht ueber dem Spieler, Vorausblick ~8 Einheiten

### Transition (Phase 2)

- Fortschritt `t` = (aktueller Chunk - TURN_CHUNK) / TURN_DURATION_CHUNKS, geclamped 0..1
- Smooth-Step fuer weichen Uebergang: `t_smooth = t * t * (3 - 2 * t)`
- Kameraposition: Lerp zwischen Iso-Position und Chase-Position mit `t_smooth`
- LookAt: Lerp zwischen Iso-LookAt und Chase-LookAt
- Bei `t = 0.5`: Switch von OrthographicCamera zu PerspectiveCamera im Renderer
- Beide Kameras existieren gleichzeitig, nur eine wird zum Rendern verwendet

## Technischer Ansatz

### Kernprinzip: Welt bleibt in Z-Richtung

Die "Kurve" ist rein ein Kamera-Effekt. Die Welt-Generierung, Lane-Positionen, Obstacle-Spawning, Collision-Detection — alles bleibt identisch. Nur die Kamera aendert ihre Perspektive. Das bedeutet:

- Keine Aenderungen an player.js, obstacles.js, collectibles.js, collision.js, input.js
- world.js braucht nur: Schloss-Deko am Start, Wasserturm-Landmark bei TURN_CHUNK, Phase-Tracking fuer Chunk-Count
- scene.js bekommt das neue Dual-Kamera-System mit Transition-Logik
- game-state.js bekommt ein `phase` Field und `chunkCount`

### Betroffene Module

| Modul | Aenderung |
|-------|-----------|
| `config.js` | Neue Konstanten: TURN_CHUNK (30), TURN_DURATION_CHUNKS (5), CHASE_CAM_Y (3), CHASE_CAM_Z (5), CHASE_CAM_FOV (60), CHASE_CAM_LOOK_AHEAD (8) |
| `game-state.js` | Neue Fields: `phase` ('schloss' / 'turn' / 'planken'), `chunkCount` (zaehlt erstellte Chunks) |
| `scene.js` | Zweite Kamera (PerspectiveCamera), `updateCameraForPhase(phase, turnProgress)`, Resize-Handler fuer beide Kameras |
| `world.js` | `chunkCount` hochzaehlen bei addChunk(), Schloss-Deko bei Chunk 0, Wasserturm bei TURN_CHUNK, Phase-Uebergaenge triggern |
| `main.js` | Phase-Checks im Game Loop, ruft Kamera-Update mit Phase-Info auf |

### Unveraenderte Module

- `player.js` — Spieler-Logik bleibt identisch
- `obstacles.js` — Hindernisse spawnen und bewegen sich wie bisher
- `collectibles.js` — Brezeln und Power-Ups unveraendert
- `collision.js` — AABB-Checks bleiben gleich
- `input.js` — Steuerung bleibt gleich
- `hud.js` — HUD bleibt gleich
- `audio.js` — Sounds bleiben gleich

## Landmarks

### Schloss (Spielstart)

- Grosses Deko-Objekt, positioniert hinter dem Spieler bei Z = -10
- Besteht aus mehreren BoxGeometry-Teilen:
  - Hauptgebaeude: breiter, flacher Block (Sandstein-Farbe 0xf0e6c8)
  - Zwei Seitenfluegel: schmaler, etwas niedriger
  - Zentraler Turm: schmal, hoch
- Scrollt mit der Welt weg (wird nach einigen Sekunden nicht mehr sichtbar)

### Wasserturm (bei der Kurve)

- Erscheint als Deko-Objekt bei TURN_CHUNK
- Positioniert seitlich rechts, leicht voraus
- Besteht aus:
  - Zylindrischer Turm (CylinderGeometry, Sandstein-Farbe)
  - Kuppel oben (SphereGeometry, dunklere Farbe)
- Bleibt waehrend der Kurve sichtbar, scrollt dann weg

## Konstanten (config.js)

```js
// Route phases
export const TURN_CHUNK = 30;
export const TURN_DURATION_CHUNKS = 5;

// Chase camera (Phase 3: Planken)
export const CHASE_CAM_FOV = 60;
export const CHASE_CAM_Y = 3;
export const CHASE_CAM_Z = 5;
export const CHASE_CAM_LOOK_AHEAD = 8;
```

## Abgrenzung (Out of Scope)

- Tatsaechliche Richtungsaenderung der Welt-Generierung (zu komplex, nicht noetig)
- Mehrere Kurven / Abzweigungen
- Spielerwahl der Route
- Rueckwaerts-Blick oder freie Kamerarotation
- Unterschiedliche Gameplay-Mechaniken pro Phase (alles bleibt gleich, nur Kamera aendert sich)
