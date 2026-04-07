# Mannheim Skater — Design Spec

## Konzept

Endless-Runner im Crossy-Road-Stil (isometrische 3D-Perspektive) durch Mannheim. Der Spieler steuert einen Skater, der automatisch vorwärts rollt. Ziel: so weit wie möglich kommen, Brezeln sammeln, Hindernissen ausweichen, Power-Ups nutzen.

Inspiration: Crossy Road (Ästhetik, Perspektive) + Subway Surfers (Endless-Runner-Mechanik, Power-Ups, Lanes).

## Tech Stack

| Komponente | Technologie | Warum |
|---|---|---|
| 3D-Rendering | **Three.js** | Isometrische Kamera, Beleuchtung, Schatten, 3D-Objekte out-of-the-box |
| Game Logic | **Vanilla JS (ES6+)** | Kein Framework-Overhead, direkter Zugriff auf Game-Loop |
| UI / HUD | **HTML/CSS Overlay** | Score, Menüs, Game-Over-Screen über dem Canvas |
| Leaderboard | **Supabase** | Bestehende Infrastruktur wiederverwenden (neue Tabelle) |
| Hosting | **GitHub Pages** | Wie bisher, auto-deploy von `main` |
| Stil | **Low-Poly / Voxel** | Passt zu Crossy-Road-Ästhetik, generierbar im Code |

### Dateistruktur (geplant)

```
mannheim-skater/
├── index.html              # Einstiegspunkt
├── css/
│   └── hud.css             # HUD-Overlay-Styling
├── js/
│   ├── main.js             # Entry: Init Three.js, Game-Loop starten
│   ├── scene.js            # Three.js Szene, Kamera, Licht, Renderer
│   ├── player.js           # Skater-Objekt, Bewegung, Animation
│   ├── world.js            # Welt-Generierung: Zonen, Lanes, Boden-Chunks
│   ├── obstacles.js        # Hindernisse: Spawning, Typen, Kollision
│   ├── collectibles.js     # Brezeln, Power-Ups: Spawning, Effekte
│   ├── input.js            # Keyboard + Touch/Swipe-Handler
│   ├── hud.js              # Score, Combo, Power-Up-Anzeige (DOM-Updates)
│   ├── audio.js            # Sound-Effekte, Musik
│   └── config.js           # Alle Tuning-Werte, Zonen-Definitionen
└── assets/
    ├── models/             # Optionale .glb-Modelle (später)
    ├── textures/           # Texturen für Boden, Gebäude
    └── sounds/             # SFX + Musik
```

## Spielfeld & Welt

### Isometrische Kamera

- Three.js `OrthographicCamera` mit isometrischem Winkel (~35.264° X-Rotation, 45° Y-Rotation)
- Kamera folgt dem Spieler (fixiert auf Spieler-Z, leichtes Smoothing)
- Sichtfeld zeigt ca. 5-7 Lanes Breite und ~15 Einheiten Tiefe voraus

### Lane-System

- **5 Lanes** nebeneinander (links-außen, links, mitte, rechts, rechts-außen)
- Lane-Wechsel ist eine schnelle seitliche Bewegung (Tween/Lerp, ~150ms)
- Jede Lane ist 1 Einheit breit mit kleinem Abstand dazwischen

### Zonen / Biome

Zonen wechseln alle ~500 Punkte zufällig. Jede Zone hat eigene:
- Boden-Textur/Farbe
- Gebäude/Dekorations-Set an den Seiten
- Eigene Hindernis-Gewichtung
- Eigene Farbpalette und Beleuchtungsstimmung

| Zone | Setting | Boden | Deko (Seiten) | Spezial-Hindernis |
|---|---|---|---|---|
| **Planken** | Einkaufsstraße | Pflastersteine (beige) | Schaufenster, Bänke, Laternen | Fußgänger-Gruppen |
| **Jungbusch** | Szeneviertel | Asphalt (dunkelgrau) | Graffiti-Wände, Bars, Fahrräder | Enge Gassen (Lane-Verengung) |
| **Hafen** | Industriegebiet | Beton (grau) | Container, Kräne, Gleise | Güterzug (Querverkehr) |
| **Luisenpark** | Park | Gras (grün) | Bäume, Blumenbeete, Gondoletta | Enten auf dem Weg |

### Landmarks (Meilensteine)

Erscheinen als große Dekorations-Objekte am Streckenrand bei bestimmten Score-Schwellen:

| Score | Landmark | Visuell |
|---|---|---|
| 0 | Wasserturm | Turm mit Kuppel, am Start sichtbar |
| 500 | Paradeplatz | Brunnen + Flaggen |
| 1500 | Fernmeldeturm | Hoher Turm im Hintergrund |
| 3000 | SAP Arena | Große Halle am Rand |

### Quadrate-Schilder

Mannheim hat ein einzigartiges Straßensystem mit Buchstabe+Zahl (z.B. "Q7, 12"). Diese erscheinen als kleine Schilder am Streckenrand — zufällig generiert aus gültigen Quadrate-Bezeichnungen (A1–U6).

## Spieler-Charakter

### Phase 1: Platzhalter

- Körper: farbiger Box-Mesh (Three.js `BoxGeometry`), ~0.6 x 1.0 x 0.4 Einheiten
- Skateboard: flache Box darunter, dunkelgrau, leicht breiter als der Körper
- Idle-Animation: leichtes Wippen (Y-Achse Sinus)
- Lane-Wechsel: seitlicher Tilt (Z-Rotation)
- Sprung: Y nach oben + leichte Rotation

### Phase 2: Pixel-Art / Voxel (später)

- Ersetze Box durch Voxel-Modell oder Sprite-Billboard mit isometrischer Pixel-Art
- Nutze den Charakter-Stil aus dem bestehenden "Welcome to the Jungle"-Spiel als Vorlage

## Steuerung

### Desktop

| Taste | Aktion |
|---|---|
| A / Pfeil-Links | Lane nach links wechseln |
| D / Pfeil-Rechts | Lane nach rechts wechseln |
| Space | Springen |
| P | Pause |
| Enter | Restart nach Game Over |

### Mobile

| Geste | Aktion |
|---|---|
| Swipe links | Lane nach links |
| Swipe rechts | Lane nach rechts |
| Tap | Springen |

- Swipe-Erkennung mit Deadzone (~30px) um versehentliche Wechsel zu vermeiden
- Swipe + Tap gleichzeitig möglich (Multi-Touch)

## Hindernisse

Hindernisse spawnen prozedural auf den Lanes. Schwierigkeit steigt über Zeit (mehr Hindernisse, weniger Lücken, schnellere Spezial-Hindernisse).

| Hindernis | Lanes belegt | Verhalten | Ausweichen |
|---|---|---|---|
| **Straßenbahn** | 2-3 Lanes | Fährt von hinten heran (Warnsignal: Klingel-Sound + Boden-Vibration) | Zur Seite wechseln |
| **Fußgänger** | 1 Lane | Steht still oder läuft quer | Lane wechseln |
| **Poller** | 1 Lane | Statisch | Lane wechseln oder springen |
| **Baustelle** | 2 Lanes | Statisch, Absperrung | Lane wechseln |
| **Parkende Autos** | 1-2 Lanes | Statisch | Lane wechseln |
| **Lieferwagen** | 1 Lane | Statisch, höher als Auto | Lane wechseln (nicht überspringbar) |
| **Radfahrer** | 1 Lane | Bewegt sich langsam vorwärts | Lane wechseln |
| **Niedrige Absperrung** | 1 Lane | Statisch, niedrig | Springen |

### Kollision

- Treffer = Game Over (kein HP-System, außer Döner-Schild aktiv)
- Kollisions-Check: Bounding-Box-basiert (AABB)
- Döner-Schild absorbiert genau 1 Treffer, dann weg

## Collectibles & Power-Ups

### Brezeln (Coins)

- Spawnen in Linien/Bögen auf den Lanes
- +1 Punkt pro Brezel
- Visuell: kleine 3D-Brezel (Torus-Knot-Geometrie), goldbraun, dreht sich langsam
- Magnet-Effekt (wenn Power-Up aktiv): Brezeln fliegen zum Spieler

### Power-Ups

Spawnen deutlich seltener als Brezeln. Schweben leicht über dem Boden, leuchten/pulsieren.

| Item | 3D-Modell (Platzhalter) | Effekt | Dauer |
|---|---|---|---|
| **Döner** | Zylinder + Kegel (braun/grün) | Schild — absorbiert 1 Treffer | Bis zum nächsten Treffer |
| **Eistee** | Box (gelb) | Speed-Boost + 2x Score | 5 Sekunden |
| **Kurpfalz-Rad** | Torus (rot/gelb) | 3x Score-Multiplier | 10 Sekunden |
| **Monatsticket** | Flache Box (grün) | Straßenbahn-Ride: Autopilot, sammelt alle Brezeln, unverwundbar | 8 Sekunden |
| **Graffiti-Spray** | Zylinder (bunt) | Unsichtbarkeit — durch alle Hindernisse durch | 5 Sekunden |
| **Skateboard-Upgrade** | Flache Box (neon) | Ollie-Fähigkeit: höherer Sprung, kann hohe Hindernisse überspringen | 10 Sekunden |

### HUD-Anzeige bei aktivem Power-Up

- Icon + Countdown-Bar oben im HUD
- Visueller Effekt am Spieler (Glow, Farbänderung, Partikel)

## Scoring & Progression

### Punkte

| Aktion | Punkte |
|---|---|
| 1 Brezel gesammelt | +1 |
| 1 Frame überlebt | +0.1 (Distanz-Score) |
| Knapper Ausweich-Move (Near Miss) | +5 Bonus |
| Sprung über Hindernis | +3 |

### Multiplikatoren

- Eistee: 2x für 5 Sek.
- Kurpfalz-Rad: 3x für 10 Sek.
- Stapelbar? Nein — der höhere Wert gewinnt

### Geschwindigkeitskurve

- Start: 1.0 Einheiten/Frame
- +0.05 alle 10 Sekunden
- Max: 4.0 Einheiten/Frame
- Eistee-Boost: +50% auf aktuelle Geschwindigkeit

### Game Over

- Kollision mit Hindernis (ohne Schild) = Game Over
- Kamera zoomt leicht raus, Spieler-Figur fällt um
- Score-Screen mit Leaderboard-Eintrag (wie im bestehenden Spiel)

## Audio

| Sound | Trigger |
|---|---|
| Brezel-Collect | Einsammeln einer Brezel |
| Power-Up-Collect | Einsammeln eines Power-Ups |
| Straßenbahn-Klingel | Straßenbahn nähert sich von hinten |
| Lane-Switch Swoosh | Lane wechseln |
| Jump | Springen |
| Crash / Game Over | Kollision |
| Hintergrundmusik | Loop pro Zone (optional, Phase 2) |

## Easter Eggs

- Quadrate-Straßenschilder am Rand (zufällig generiert)
- "Monnem"-Schriftzüge an Wänden im Jungbusch
- Döner-Buden als Deko am Streckenrand (nicht einsammelbar, nur Atmosphäre)
- Gelegentlich ein NPC mit "Ei Gansen"-Sprechblase
- Nachts (nach Score 3000): Beleuchtung wechselt auf Nacht, Laternen an

## Leaderboard

- Neue Supabase-Tabelle `mannheim_skater_scores` (gleiche Struktur wie bestehend)
- Gleiche Submit/Fetch-Logik wie im bestehenden Spiel
- Lokaler Fallback auf localStorage

## Abgrenzung (Out of Scope für v1)

- Charakter-Auswahl / Skins
- Achievements / Missions
- Shop / In-Game-Währung
- Offline-Support / PWA (kommt evtl. später)
- Musik pro Zone (nur SFX in v1)
- Multiplayer
