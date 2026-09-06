# GymProgress Pro - Kraft + Muskelaufbau

Browserbasierter Trainings-Tracker mit Supabase-Verlauf. Der neue Vier-Tage-Plan
verbindet schwere Hauptuebungen mit gezieltem Muskelaufbau.

## Neuer Plan

| Tag | Schwerpunkt | Arbeitssaetze |
| --- | --- | ---: |
| Montag | Oberkoerper A, schweres Bankdruecken | 18 |
| Dienstag | Unterkoerper A, schwere Kniebeugen | 16 |
| Donnerstag | Oberkoerper B, moderates Bankdruecken | 20 |
| Freitag | Unterkoerper B, Trap Bar und leichtere Kniebeugen | 16 |
| Gesamt | | 70 |

- **Mo:** Bench Press 3x3-5, Pull-Up 3x5-8, T-Bar Row 3x6-10, Pec Deck 2x10-15,
  Seitheben 3x12-20, Bayesian Curl 2x10-15, Pushdown 2x8-12.
- **Di:** Squat 3x3-5, RDL 2x6-10, sitzender Beinbeuger 3x10-15,
  Glute Drive 2x8-12, stehendes Wadenheben 3x8-15, Cable Crunch 3x10-15.
- **Do:** Bench Press 3x6-8, Incline Bench Press 2x8-12, Cable Row 3x8-12,
  Lat Pullover 2x10-15, Seitheben 3x12-20, Reverse Pec Deck 3x12-20,
  OH Cable Triceps Extension 2x10-15, Preacher Curl 2x10-15.
- **Fr:** Trap Bar Deadlift 3x3-5, Squat leichter 2x6-8,
  Leg Press 2x10-15, Leg Extension 2x12-20, sitzender Beinbeuger 2x10-15,
  stehendes Wadenheben 3x10-20, Hanging Leg Raises 2x8-15.

RIR steht fuer noch moegliche saubere Wiederholungen. Die schweren Hauptuebungen
und RDL verwenden RIR 2, die Freitags-Kniebeugen RIR 3, die meisten Ergaenzungen
RIR 1-2. Aufwaermsaetze kommen hinzu. Die Gewichtsreferenz ersetzt keine
Anpassung an Technik, Tagesform oder die leichtere Einheit.

## Woche 1 ohne Datenverlust

Der neue Plan verwendet eigene Supabase-Tageskennungen:
`c2mo`, `c2di`, `c2do`, `c2fr`.

Alte Einheiten unter `mo/di/do/fr` bleiben unangetastet und sind im
Plan-Dropdown unter **Bisheriger 4er-Split - Archiv** schreibgeschuetzt abrufbar.
Der Hybrid-Plan verwendet weiterhin seine eigenen `h*`-Kennungen.

- Beim ersten Oeffnen dieser Planrevision wird der neue Plan ausgewaehlt.
- Ohne neue Eintraege startet er bei Woche 1, Montag.
- Anschliessend setzt die Navigation den neuen Plan anhand seiner eigenen
  gespeicherten oder uebersprungenen Einheiten fort.
- Neu laden setzt bereits begonnene neue Wochen nicht erneut zurueck.
- Es werden weder alte Wochen umnummeriert noch Sessions oder Logs zum
  Initialisieren angelegt. Eine Datenbankmigration ist nicht erforderlich.
- Der weiterhin vorhandene Button zum vollstaendigen Loeschen der Historie
  ist fuer den Planwechsel **nicht notwendig** und wuerde auch Archiv- und
  Hybrid-Daten entfernen.

## Uebernahme der Ausgangsgewichte

Das Ausgangsgewicht stammt aus dem **neuesten passenden protokollierten
Eintrag**, nicht aus einem aelteren Hoechstwert. Die Suche umfasst den alten
Vier-Tage-Split und den Hybrid-Plan, unabhaengig vom bisherigen Trainingstag
oder dessen Wochennummer.

Sortierung: Trainingsdatum, anschliessend Zeitstempel des Satzeintrags und der
Session. Bei mehreren Saetzen wird der zuletzt erfasste gueltige Gewichtswert
verwendet. Ein Gewicht von **0 kg** mit protokollierten Wiederholungen ist
gueltig, beispielsweise bei Koerpergewichtsuebungen. Ein leerer Null-Eintrag
ohne Wiederholungen ist keine Gewichtsreferenz.

Nur ausdruecklich hinterlegte Namensentsprechungen werden zusammengefuehrt:
Bench Press / Barbell Bench Press, Pull-Up / Weighted Pull-Ups, RDL / Romanian
Deadlift sowie Standing Calf Raise / Stehendes Wadenheben.
Kurzhantel-, Kabel-, Maschinen- und sitzende/stehende Varianten werden nicht
pauschal gleichgesetzt. Gewichtsangaben werden nicht umgerechnet: pro Hantel,
pro Seite oder Gesamtgewicht muessen wie bisher gezaehlt werden.

Jede Karte zeigt Herkunftsdatum und fruehere Wiederholungen als Referenz.
Neue Wiederholungsfelder bleiben leer, bis tatsaechlich trainiert wurde.
Es gibt keine automatische Gewichtserhoehung beim Import. Fehlt eine passende
Historie, wird der bisherige Plan-Startwert mit einem ausdruecklichen Hinweis
verwendet.

Nach Beginn gilt: gespeicherte Werte dieses Tages haben Vorrang, danach die
letzte passende fruehere Einheit **desselben neuen Tages**. So bleiben schwere
und leichtere Bankdrueck-/Kniebeugeeinheiten unabhaengig. Uebersprungene Tage
setzen die Gewichte nicht zurueck. Bei einem Ladefehler gibt es eine
Wiederholen-Schaltflaeche statt eines stillen Rueckfalls auf Standardgewichte.

## Speichern und Progression

- Gewichte allein zaehlen im neuen Plan nicht als absolviertes Training.
- Nur Saetze mit eingetragenen Wiederholungen werden gespeichert.
- Teilweise ausgefuellte Einheiten behalten ihre urspruenglichen Satznummern.
- Vorhandene Logs werden erst ersetzt, nachdem neue Logs erfolgreich
  eingefuegt wurden. Fehlgeschlagene Inserts loeschen keine bisherigen Logs.
- Ein Steigerungshinweis setzt alle vorgesehenen Saetze am oberen
  Wiederholungsende bei gleichem Gewicht voraus.
- Bei vollstaendig erreichtem Wiederholungsziel wird fuer die naechste
  passende Einheit automatisch **+1,25 kg im Oberkoerper** beziehungsweise
  **+2,5 kg im Unterkoerper** vorausgefuellt. Es gelten die hinterlegten
  Ober-/Unterkoerper-Zuordnungen der Uebungen.
- Die gerade gespeicherten Gewichte bleiben unveraendert. Auch beim erneuten
  Oeffnen einer gespeicherten Einheit wird deren Gewicht nicht erhoeht.
  Mehrfaches Laden einer neuen Einheit addiert den Schritt nicht mehrfach.
- Importierte Startwerte werden nie automatisch erhoeht. Schwere und leichtere
  Tage bleiben unabhaengig. In Deload-Wochen sowie nach einer absolvierten
  Deload-Einheit wird nicht automatisch gesteigert.
- Das vorausgefuellte Gewicht bleibt editierbar. Die App erfasst keine
  tatsaechliche RIR oder Technikqualitaet; beides vor der Steigerung pruefen.
- Wochen 4, 8, 12 und 16 halbieren wie bisher die Satzanzahl, aufgerundet.
  Die Woche wird als Deload bezeichnet; ein Deload liefert keinen
  automatischen Steigerungshinweis fuer die Folgewoche.

## Dateien

- `index.html`: Oberflaeche und Skriptreihenfolge.
- `strength-plan.js`: neuer Plan, Gewichtsimport und testbare Auswahlregeln.
- `app.js`: urspruenglicher Plan als Archiv, Navigation, Rendering, Supabase.
- `hybrid-plan.js` und `cardio.js`: bestehender Kraft-/Laufplan.
- `style.css`: bestehendes Design und Referenzhinweise.
- `tests/plan.test.cjs`: Tests ohne Netzwerk und Datenbankzugriff.
- `tests/browser.test.cjs`: Browser-Regression mit synthetischer Datenbank.

## Lokal starten

Im Ordner `gym-tracker`:

```sh
python3 -m http.server 8000
```

Danach `http://localhost:8000` oeffnen. Supabase-URL und oeffentlicher
Publishable-Key sind in `app.js` konfiguriert. Bestehende Tabellen:
`sessions` mit `id, week_number, day_key, date, created_at` und
`set_logs` mit `id, session_id, exercise_name, set_number, weight_kg, reps,
created_at`. Die Relation verweist auf `sessions.id`; bei vorhandener
Eindeutigkeitsbedingung gilt weiterhin `UNIQUE(week_number, day_key)`.

Fuer das bestehende Lauf-Logging werden in `set_logs` ausserdem
`distance_km, duration_min, rpe, avg_hr` verwendet.

Die Anwendung braucht fuer Cloud-Verlauf und Speicherung eine Verbindung.
Nur Planwahl und Supplement-Checkboxen werden lokal gespeichert; es gibt
keine Offline-Warteschlange fuer Trainingsdaten.

## Tests

```sh
node --test tests/plan.test.cjs
node tests/browser.test.cjs
```

Der Browser-Test benoetigt das lokal installierte `puppeteer` und Google
Chrome. Ein anderer Chrome-Pfad kann ueber `CHROME_PATH` gesetzt werden.
Alle externen Browser-Anfragen werden im Test abgefangen; Schreibtests
nutzen ausschliesslich synthetische Daten, niemals die produktive Supabase.
Screenshots werden unter `/tmp/gym-tracker-1280.png` und
`/tmp/gym-tracker-390.png` abgelegt.

## Datenschutz

Die bestehende Anwendung hat keine Benutzeranmeldung. Ein Publishable-Key
ist kein Geheimnis und ersetzt keine Zugriffskontrolle. Die Supabase-
Berechtigungen/RLS bestimmen, wer Trainingsdaten lesen oder veraendern kann.
Vor Mehrbenutzer- oder oeffentlichem Betrieb sind Anmeldung und
benutzerbezogene RLS-Regeln erforderlich. Importierte persoenliche Gewichte
werden nicht als Snapshot in den oeffentlichen Quellcode geschrieben.

Supplement- und Recovery-Funktionen des bestehenden Trackers wurden durch
diesen Planwechsel nicht medizinisch validiert.
