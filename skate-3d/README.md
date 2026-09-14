# Jungle Ride / Side Jungle

Ein 3D-Pixelart-Skate-Spiel in echter Seitenansicht. Schmale Steinplattformen,
Bambusstuetzen und verwitterte Metallrails fuehren durch tropische Ruinen ueber
Schluchten. Das 2D-Ursprungsspiel und seine Original-Sprites bleiben unveraendert.

## Spielen

Im Repository-Ordner:

```sh
node skate-3d/tools/serve.mjs
```

[Vorschau oeffnen](http://127.0.0.1:4173/skate-3d/?v=clear-guide-1).
WebGL 2 und ein HTTP-Server werden benoetigt. Laufzeit-Abhaengigkeiten, Texturen
und Modelle sind lokal; keine Installation, externen CDNs oder Anmeldung.
Der Ordner kann unveraendert auf GitHub Pages bereitgestellt werden.

## Was neu ist

- Orthografische Seitenkamera. Fahrt nach rechts, keine Verfolgerkamera.
- Echte 3D-Geometrie, scharf hochskaliertes Pixel-Rendering und Pixelmaterialien.
- Tropische breite Blaetter, Lianen, Wurzeln, Ruinen, Wasserfallstreifen und
  mehrere unterschiedlich schnell scrollende Tiefenebenen statt Kugelbaeumen.
- Metallrails mit Bambusstuetzen, Bindungen und Bewuchs; klare Landekanten.
- Eigenes animierbares Modell nach der Originalfigur: braune Haare und Bart,
  schwarze Kopfhoerer, petrolfarbenes Shirt, Khakihose, braune Schuhe,
  orangefarbenes Board. Eine stilisierte Nachbildung, kein 1:1-Fotoscan.
- Funken direkt am Grindkontakt, Lichtakzent und metallisches Schleifgeraeusch.
- Grosse Pixel-Kettenexplosion mit einem Hauptfeuerball und sechs zeitversetzten
  Nach-Explosionen, Druckwelle, Rauch und Fragmenten. Der Endscreen erscheint
  nach 2,4 Sekunden; Score und Physik sind sofort eingefroren. Maximal 260
  Partikel und sieben vorab angelegte Sprites begrenzen den Ressourcenverbrauch.
  Mit reduziertem Bewegungswunsch gibt es drei kleinere Explosionen, keine
  Druckwelle und kein Kamerawackeln. Sound bleibt optional.
- Das Systemmerkmal `prefers-reduced-motion` unterdrueckt Kamerawackeln und
  reduziert die Effektbeleuchtung. Es gibt keinen vollflaechigen Blitz.

## Steuerung

| Aktion | Tastatur | Touch |
| --- | --- | --- |
| Skater links/rechts bewegen, auch beim Grinden | A/D oder Links/Rechts halten | Pfeile halten |
| Zufaelliger Trick inklusive aller Specials | Space oder Pfeil hoch | TRICK |
| Optional: ausschliesslich Pro-Tricks | Shift + Space / Shift + Pfeil hoch | PRO |
| Optional: PERFECT-Landung timen | E kurz vor dem Aufsetzen | LAND |
| Pause / weiter | P oder Escape | Pause-Button |
| Neustart | Button im Endscreen oder Pause-Menue | Derselbe Button |

R startet niemals neu, insbesondere nicht bei der Namenseingabe.
Beim Tabwechsel/Fokusverlust wird ein aktiver Run pausiert. Touch verwendet
Pointer-Capture und korrektes Loslassen/Abbrechen. Auf dem Smartphone bietet
Querformat einen breiteren Bildschirm fuer die Route; Hochformat bleibt spielbar.
Die Hilfe erklaert die aktuelle Steuerung, Praezisionsziele, Welten und Boards.
Sie oeffnet oben, ist separat scrollbar und per Escape oder Schliessen-Button bedienbar.

## Strecke und Physik

Die Fahrbewegung bleibt im Weltkoordinatensystem entlang -Z. `run.x` bezeichnet
ausschliesslich den sichtbaren Laengsversatz, nicht eine
versteckte Tiefe. Alle generierten Oberflaechen liegen in derselben Spielebene.

- Direkte Arcade-Steuerung: A/D und Touch bewegen die Figur ab dem ersten
  Simulationsschritt auf Plattformen, in der Luft UND auf Rails. Loslassen
  stoppt den seitlichen Versatz sofort; keine Traegheit oder Rueckzentrierung.
- Beim Grinden wird die Laengsbewegung nicht mehr gesperrt. Die Figur balanciert
  automatisch. Rails enden weiterhin physisch: ohne Absprung faellt man ab.
- Bewegung bei Starttempo: -8 bis +14 Einheiten mit 9 Einheiten/s. Bereich und
  Steuertempo wachsen mit dem Geschwindigkeits-Zoom, damit der sichtbare
  Spielraum nicht schrumpft. Die Kamera verfolgt den Skater nicht seitlich.
  Die Ansicht ist jetzt 20 Prozent breiter und nach vorn versetzt: von der
  neutralen Position sind rund 30 Prozent mehr Strecke voraus sichtbar.
  Im regulaeren Bildformat reicht das Kamerafenster von 33,6 bis 74,4 Einheiten;
  der Skater startet bei 35 Prozent der Bildbreite. Sein Bewegungsbereich bleibt
  physisch identisch und reicht sichtbar etwa von 11 bis 77 Prozent.
  Der freie rechte Bereich dient der Vorschau auf die naechste Landung, nicht
  als unsichtbare Plattform. Sehr breite Bildformate zeigen zusaetzlichen Raum.
- Plattformen sind 1,1 bis 1,8 Einheiten tief, Rails 0,18.
- Wechselnde Distanzen statt einer stets sicheren Kanten-Regel: Normale
  Luecken beginnen bei rund 7,9 Metern. Kurze Praezisionsplattformen variieren
  ihre Abstaende, lange Rail-Transfers reichen bei Hoechsttempo bis rund
  36,7 Meter. Die Sprungphysik bleibt unveraendert.
- Gelb markierte Praezisionsplattformen sind mindestens 3,6 Meter lang,
  bei Hoechsttempo rund 12,2 bis 14,4 Meter statt mehr als 45 Meter.
  Spaetes Abspringen kann sie komplett ueberschiessen. Frueher abspringen
  oder mit A/Links die Flugweite verkuerzen; D/Rechts verlaengert sie.
  Lange Transfers verlangen dagegen spaetere Abspruenge. Keine Auto-Landung.
- Laengere Rails und Erholungsplattformen unterbrechen Praezisionspassagen,
  sodass weiterhin Grinds, Trick-Combos und gesichertes Ausrollen moeglich sind.
- Obere Rails liegen 3,4 Einheiten ueber ihrer unteren Plattform, damit der
  Charakter darunter Platz hat. Absprung und Flugweite bestimmen die Route.
  Ein fixes Timing passt nicht fuer jede Landeflaeche; die Hinweise zeigen
  nur die Art des naechsten Ziels, kein automatisches Absprungfenster.
- Absprungtempo: 15; Gravitation: 24. Die rechnerische Sprunghoehe ist 4,69.
  Luecken und Plattformlaengen beruecksichtigen diese Flugbahn und das Tempo.
- Starttempo bleibt bei 8,5 m/s (rund 31 km/h). Die Beschleunigung ist mit
  1,5 m/s pro Sekunde doppelt so hoch wie zuvor. Nach zehn Sekunden sind es
  rund 85 km/h; das neue Maximum von 36 m/s (rund 130 km/h statt 90 km/h)
  wird nach etwa 18,3 Sekunden erreicht. Sprunghoehe und Trick-Flugzeit bleiben
  unveraendert. Die Streckenversion `precision-lines-1` trennt Tagesrekorde und Ghosts
  von den alten Abstaenden, ohne gespeicherte Rekorde oder Board-Freischaltungen zu loeschen.
- Kein unsichtbarer Boden. Kanten und verpasste Landungen
  verursachen echte Abstuerze. Coyote Time 0,12 s, Sprungpuffer 0,15 s.
- Oberflaechen fangen nur eine absteigende Ueberquerung von oben ab. Sie sind
  Plattformspiel-Flaechen, keine simulierten massiven Decken oder Seitenwaende.
- Feste Simulationsschritte mit 60 Hz; Grafik, Partikel und Zufallstricks
  beeinflussen den Seed der Streckengenerierung nicht.

## Drei Welten

| Welt | Gesicherter Score | Kulisse |
| --- | --- | --- |
| Jungle Ruins | 0 | Tropischer Dschungel, Lianen und ueberwucherte Ruinen |
| Neon District | 3.000 | Nachtstadt mit Leuchtreklamen, Fenstern, Feuerleitern und rot beleuchteten Stahlstegen |
| Pharaoh Dunes | 10.000 | Stufenpyramiden, Pharaonenstatuen, Obelisken und Sandsteintempel |

In der Neonstadt markieren rote Leuchtstreifen und zweireihige Landebahn-Lampen
die Rails und Plattformkanten. Groessere Endlampen zeigen Absprung und Landung.
Vier versetzte, sanfte Lichtphasen laufen im 2,4-Sekunden-Takt; die Lichter gehen
nie ganz aus. Bei Pause stehen sie still, mit `prefers-reduced-motion` leuchten
sie konstant. Pixel-Halos statt zusaetzlicher Punktlichter halten den Effekt
lokal. Die Markierungen ueberbruecken keine Schluchten und aendern keine Kollision.

Der Score umfasst Distanzpunkte und gesicherte Combos, nicht offene Punkte.
Die HUD-Anzeige zaehlt erst die fehlenden gesicherten Punkte herunter.
Ab Erreichen der Schwelle folgt ein echter 3-2-1-Countdown vor dem Wechsel.
Eine grosse Combo kann mehrere Welten freischalten; die Neonstadt bleibt
mindestens acht Sekunden sichtbar und wird nicht uebersprungen. Ist die
naechste Welt bereits frei, zeigt der Countdown die gesamte verbleibende
Wartezeit. Pause haelt ihn an; Absturz und Neustart loesen keinen
verspaeteten Wechsel aus. Nach Aegypten zeigt die Anzeige MAX / ENDLESS RUN. Der Wechsel
passiert waehrend der Fahrt mit einem Hinweis und einem Beleuchtungsuebergang.
Plattformen und Rails erhalten eine passende Optik, ohne ihre Kollisionen zu
verschieben. Neustart fuehrt in den Dschungel zurueck. Nach Aegypten bleibt
es ein Endlos-Run; die Welten beginnen nicht erneut von vorn.

Alle drei Welten nutzen echte 3D-Geometrie und wiederholte Tiefenebenen, keine
fertigen Hintergrundbilder. Nur die aktive Welt wird angezeigt. Die Strecken
sind prozedural, keine vollstaendig handgebaute Kampagne. Rails bleiben gerade.

## Tricks und Score

SPACE / TRICK waehlt aus allen 19 Tricks, ohne direkte Wiederholung und ohne
einfachen Ollie. Specials brauchen keine weitere Taste. Auch Pfeil hoch und
der Touch-Button TRICK verwenden denselben gemischten Zufallspool:

- 9 Flips, Spins und Grabs: Kickflip, Heelflip, Pop Shuvit, Frontside 360,
  Varial Kickflip, Double Kickflip, Backside 360, Hardflip und Indy Grab.
- 10 Specials: 900, 1080, McTwist, Backflip, Double Backflip, Superman,
  Christ Air, Rocket Air, Rodeo 900 und Triple Varial.

SHIFT + SPACE / PRO bleibt optional, um nur aus den Specials zu waehlen.

Normale Tricks geben 100 Grundpunkte, Pro-Tricks 220. Pro-Animationen benoetigen
0,94 Sekunden; eine zu kurze Landung verliert die offene Combo. Die Sprungphysik
wird nicht automatisch verlaengert. Grabs bewegen Arme, Beine, Rumpf und Board;
Superman legt den Koerper waagerecht, Spins und Salti drehen Figur und Board
zusammen. Bei 900/McTwist/Rodeo bleibt der gedrehte Switch-Stand nach einer
vollstaendigen Landung erhalten. A/D bleibt unabhaengig vom Stand gleich.

PERFECT: E/LAND innerhalb von 0,16 Sekunden vor einer kontrollierten Landung,
nicht direkt an der Kante. Ein Versuch pro Sprung, kein Spam. Bonus: 80 Punkte.
Normale Landungen benoetigen keine weitere Taste.

Tricks und Grinds sammeln offene Punkte mit Multiplikator bis x8. Nach 0,65
Sekunden ruhigem Ausrollen auf einer Plattform werden sie gesichert. Ein Sturz
verliert nur offene Punkte, nicht bereits gesicherte Lines oder Distanzpunkte.
Die Grind-Balance wird automatisch animiert. Obere Wild-Rails und
unmittelbare Rail-Transfers geben zusaetzliche Punkte.

## Leaderboard, Ghost und Speicherung

- Endlos: neuer Seed je Run und eigene lokale Top 5.
- Tagesline: Datum in UTC plus Regel- und Streckenversion ergeben den Seed;
  getrennte Top 5. `precision-lines-1` trennt Tagesrekorde und Ghosts der groesseren Abstaende
  von frueheren Strecken. Alte Daten werden nicht geloescht.
  Freigeschaltete Boards und Endlos-Rekorde bleiben erhalten.
- Der beste abgeschlossene Tages-Run speichert einen Positions-Ghost mit 10 Hz.
- ORIGINAL ist immer frei. RIVER: 3 Rails in einem Run; SUNSET: 5 perfekte
  Landungen in einem Run; BLOOM: 3 gelandete Pro-Tricks in einem Run.
  Nach Run-Ende werden erreichte Challenges dauerhaft freigeschaltet; die
  Boardfarbe laesst sich in der Hilfe auswaehlen. Alle Farben haben identische
  Fahrwerte, Sprungweiten und Punkte. Die Auswahl bleibt im Browser erhalten.
- Nach der Explosion kann der Name eingetragen werden. Die tatsaechliche,
  eingefrorene Punktzahl wird automatisch uebernommen, genau einmal je Run.
- Namen werden als Text dargestellt, nicht als HTML.

Die neue Regelversion lautet `side-jungle-v4`. Ihre Scores, Ghosts und
Freischaltungen verwenden eigene Browser-Speicherschluessel. Daten frueherer
Versionen werden nicht geloescht und nicht mit dem neuen Regelwerk vermischt.
Alte Rekorde werden im aktuellen Leaderboard nicht angezeigt. Ohne erlaubten
Browser-Speicher bleibt das Spiel spielbar, aber Fortschritt nicht dauerhaft.

Die Rangliste ist lokal, nicht global und nicht manipulationssicher. Fuer einen
Online-Wettbewerb waeren ein Backend und serverseitige Run-Pruefung notwendig.

## Modell und Grafik

```sh
blender --background --python skate-3d/blender/create_pixel_skater.py
```

Erzeugt `blender/pixel-rider.blend` und das rund 234 KiB grosse
`assets/pixel-rider.glb` mit 13 Knochen und eingebetteten Pixeltexturen.
Die vorherigen Dateien `jungle-skater.blend`, `jungle-skater.glb` und deren
Generator bleiben als separate Version erhalten.

- `simulation.mjs`: Strecke, feste Physikschritte, Kollisionen und Score.
- `tools/course-driver.mjs`: ausschliesslich Test-Steuerung mit zielabhaengigem
  Timing; wird vom Spiel nicht geladen und steuert keine echten Runs.
- `jungle-scene.mjs`: Dschungel, Pixelmaterialien und instanzierte Streckenmeshes.
- `world-scene.mjs`: Neonstadt, Pyramiden, Pharaonen und Weltenwechsel.
- `city-runway.mjs`: instanzierte rote City-Leitlichter und Pixel-Halos.
- `runway-lights.mjs`: Lampenpositionen und sanfte, reduzierte Lichtanimation.
- `levels.mjs`: zentral konfigurierbare Punkteschwellen und Beleuchtung.
- `level-transition.mjs`: Countdown, Mindestaufenthalt und Level-Fortschritt.
- `crash-sequence.mjs`: zeitliche Abfolge der Kettenexplosion.
- `pixel-effects.mjs`: Funkenpool, Explosion und lokale Effektbeleuchtung.
- `game.js`: Kamera, Modellanimation, Eingaben, Menues und Lebenszyklus.
- `side-camera.mjs`: feste seitliche Kameraposition ohne Spieler-Verfolgung.
- `trick-pose.mjs`: gemeinsame Koerper-/Boardposen.
- `progress.mjs`: Tages-Seed, Ghost und Challenges.
- `skate-audio.mjs`: optionale Web-Audio-Geraeusche, standardmaessig aus.
- `vendor/`: lokales Three.js 0.180.0 unter der [MIT-Lizenz](vendor/THREE-LICENSE.txt).

## Tests

```sh
node --test skate-3d/tools/*.test.mjs
```

Prueft reale Kanten, Fallzustaende, Rail-Landung, Sprungpuffer, steigendes Tempo,
Animationen, Combo-Sicherung, Datum/Score-Speicher und das exportierte Modell.
Beide Routen werden fuer jeweils 100 Seeds ueber 90 simulierte Sekunden
getestet. Erreichbarkeitstests ersetzen keine menschlichen Balancing-Playtests.

Mit laufendem Server, installiertem `puppeteer-core` und Chrome:

```sh
PUPPETEER_MODULE=/absoluter/pfad/zu/node_modules/puppeteer-core \
  node skate-3d/tools/side-browser.test.cjs
```

`CHROME_PATH` ueberschreibt den Standardpfad fuer macOS. `TEST_URL` kann einen
anderen lokalen Server angeben. `tools/browser.test.cjs` ist ein kompatibler
Einstiegspunkt fuer denselben Test.

Der Browser-Test prueft das echte Modell, Seitenkamera, Tastatursteuerung,
mehrere Tricks, Funken, Explosion vor Leaderboard, R in Namen, echten Score,
Pause, Tages-Ghost und mobile Ansichten mit 390, 844 und 320 Pixeln Breite.
Screenshots liegen unter `/tmp/jungle-side-*.jpg`. Mobile Emulation ist kein
Leistungsnachweis auf einem physischen Smartphone.
