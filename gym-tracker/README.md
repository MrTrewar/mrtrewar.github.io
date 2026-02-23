# GymProgress Pro – Cut Edition

**Single-Page Web-Applikation (SPA)** für periodisiertes Krafttraining mit 8-Wochen-Plan, Double Progression & Recovery Monitoring.

---

## 🚀 Quick Start

### 1. **Dateien öffnen**
```
gym-tracker/
├── index.html    (Struktur)
├── style.css     (Styling, Dark Mode)
├── app.js        (Logik, Supabase Integration)
└── README.md     (diese Datei)
```

### 2. **Lokal testen (ohne Supabase)**
```bash
cd gym-tracker
python3 -m http.server 8000
# Öffne http://localhost:8000
```

### 3. **Supabase Setup** (für Persistenz)

#### 3a. Tabellen erstellen
Gehe zu https://supabase.com → Neues Projekt → SQL Editor

Kopiere & führe aus:
```sql
-- Sessions Tabelle
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  day_key TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, day_key)
);

-- Set Logs Tabelle
CREATE TABLE set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INT,
  weight_kg FLOAT,
  reps INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (optional aber empfohlen)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- Öffentliche Read/Write Policies
CREATE POLICY "allow_all_read_sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete_sessions" ON sessions FOR DELETE USING (true);

CREATE POLICY "allow_all_read_set_logs" ON set_logs FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_set_logs" ON set_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_set_logs" ON set_logs FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete_set_logs" ON set_logs FOR DELETE USING (true);
```

#### 3b. Credentials eintragen
In `app.js` Zeile 38–40:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

Findest du unter **Project Settings → API → URL & keys**

---

## 📋 Funktionen

### ✅ Trainings-Tracking
- **4 Trainingstage pro Woche**: Mo (Upper), Di (Lower), Do (Push), Fr (Pull)
- **8-Wochen Periodisierung**: Akkumulation → Deload → Intensivierung → Peak
- **Pro Übung**:
  - Gewichts-Input (kg)
  - Set-Reps-Inputs (z.B. 3 Sätze = 3 Felder)
  - Automatische Bilder oder Platzhalter-Box
  - RIR & Rep-Range Anzeige
  - **Double Progression Badge** nach dem Speichern

### 🔄 Double Progression Logic
Nach Klick auf "**Session abschließen & speichern**":
- **Oberkörper-Übungen**: Wenn alle Sätze ≥ obere Rep-Grenze → "✅ Gewicht erhöhen: +1,25 kg"
- **Unterkörper-Übungen**: Wenn alle Sätze ≥ obere Rep-Grenze → "✅ Gewicht erhöhen: +2,5 kg"
- **AMRAP-Übungen** (Pull-Up, Hanging Leg Raises): Wenn Durchschnitt ≥ 8 Reps → Badge für Zusatzgewicht
- **Kein Fortschritt?** → Kein Badge (neutral, nicht rot)

### 💊 Supplements Tracker
Akkordeon-Menü oben:
- **Morgens**: Vitamin D3, K2, Omega-3
- **Pre-Workout**: Koffein, Citrullin-Malat, Kreatin
- **Abends**: Magnesium, Zink
- **Optional**: Ashwagandha, Melatonin

Status wird täglich im **localStorage** gespeichert (kein Supabase nötig).

### ⚡ Recovery Check Modal
Floating Button (⚡) oben rechts:
- 8 Checkboxen (Schlaf, Kraft, Stimmung, etc.)
- **0–1 Haken**: ✅ "Alles im grünen Bereich"
- **2–3 Haken**: ⚠️ "Stufe 1 Deload: 50% Volumen, RIR 4+, 9h Schlaf"
- **4+ Haken**: 🚨 "Stufe 2 Pause: 1 Woche frei, Maintenance essen"

### 📊 Week Tracker
Unter dem Trainingstag-Namen: Kleine Badges für bereits geloggte Tage (grün = erledigt).

---

## 🎨 Design & UX

### Dark Mode
- **Primärfarbe**: Cyan (`#00f2ff`) mit Glow-Effekt
- **Hintergrund**: Dunkelgrau (`#0f1113`)
- **Text**: Helles Grau (`#e0e0e0`)

### Fonts
- **Titel/Buttons**: `Orbitron` (technisch, futuristisch)
- **Body/Inputs**: `Rajdhani` (clean, sportlich)

### Responsive
- **Mobile**: Bilder oben, Infos unten (flex-column)
- **Desktop** (≥768px): Bilder links, Infos rechts (flex-row)
- **Large Desktop** (≥1024px): 2-Spalten Grid für Cards
- **Sticky Header & Footer** für schnelle Navigation

---

## 🗂️ Trainingsplan (TRAINING_PLAN)

### Strukturverzeichnis
```javascript
TRAINING_PLAN = {
  [dayKey]: {
    title: "Name",
    duration: "Min-Range",
    sets: totalSets,
    exercises: [
      {
        name: "Übungsname",
        sets: 3,
        repRange: [5, 8],        // oder "amrap"
        rir: "1–2",              // Rate of Inertia (RIR)
        startWeight: 20,         // kg
        bodyPart: "upper"|"lower",
        isBW: false,             // Body Weight?
        imageUrl: ""             // Leer = Platzhalter
      },
      // ...
    ]
  }
}
```

### Übungen im Plan
**Montag (Upper)**: Bench, Pull-Up (AMRAP), T-Bar Row, Lateral Raise, Cable Curl, Incline Shrugs, Face Pulls, Wrist Curls

**Dienstag (Lower)**: Squat, RDL, Leg Curl, Leg Extension, Glute Drive, Calf Raises (Standing + Seated), Cable Crunch

**Donnerstag (Push)**: Incline Bench, Weighted Dips (BW+), Lateral Raise, Pec Deck, Triceps Extension, Neck Curls, Face Pulls

**Freitag (Pull)**: Trap Bar DL, Lat Pullover, Seated Cable Row, Reverse Pec Deck, Cable Lateral Raise, Preacher Curl, Hanging Leg Raises, Calf Raises

---

## 🔧 Anpassungen

### Übungen hinzufügen/bearbeiten
Öffne `app.js` → `TRAINING_PLAN` Objekt, z.B.:
```javascript
{
  name: "Neue Übung",
  sets: 4,
  repRange: [6, 8],
  rir: "2",
  startWeight: 25,
  bodyPart: "upper",
  isBW: false,
  imageUrl: "https://example.com/image.jpg"  // Optional
}
```

### Bilder-URLs
- Optional: `imageUrl: ""` → grauer Platzhalter wird angezeigt
- Mit Bild: `imageUrl: "https://..."` → wird geladen & angezeigt

### Supplements anpassen
`app.js` → `SUPPLEMENTS` Objekt:
```javascript
const SUPPLEMENTS = {
  "Neue Kategorie": ["Supplement 1", "Supplement 2"],
  // ...
};
```

### Recovery Items anpassen
`app.js` → `RECOVERY_ITEMS` Array

---

## 💾 Datenspeicherung

### Supabase (Cloud)
- Sessions + Set Logs
- Automatisch gespeichert bei "Session abschließen"
- Lädt alte Einträge beim Öffnen eines bereits geloggten Tages

### localStorage (Browser)
- Supplements-Status (täglich)
- Funktioniert offline

### Fehlerbehandlung
- Ist Supabase nicht konfiguriert → "⚠️ Supabase not configured" Alert
- App lädt trotzdem & speichert lokal

---

## 📱 Geräte-Unterstützung

- ✅ Desktop (Chrome, Safari, Firefox)
- ✅ Tablet (iPad, Android Tablets)
- ✅ Smartphone (iOS Safari, Chrome Mobile)
- ✅ Offline-Funktionalität (lokale Ergänzungen)

---

## 🚨 Sicherheit & Privacy

- **Keine Authentifizierung** (optional: RLS-Policies für Produktiv-Umgebung)
- **Keine Cookies** (nur localStorage)
- **HTTPS empfohlen** für Supabase-Nutzung

---

## 🎯 Periodisierungs-Leitfaden (8 Wochen)

| Woche | Phase | Volumen | RIR | Defizit |
|-------|-------|---------|-----|---------|
| 1–3   | Akkumulation | 100% | 2–3 | 500 kcal |
| **4** | **Deload** | **60%** | **4+** | **300 kcal** |
| 5–6   | Intensivierung | 90–95% | 1–2 | 500 kcal |
| 7     | Intensivierung | 90% | 1–2 | 500 kcal |
| **8** | **Peak/Review** | **50%** | **3+** | **400 kcal** |

---

## 📖 Tipps zum Einsatz

1. **Session vor dem Training öffnen** → Vorausfüllte Gewichte sehen
2. **Nach Sätzen Reps direkt eintragen** (am Phone praktisch)
3. **Session-Button am Ende drücken** → Double Progression Badges sehen
4. **Recovery Check 1× täglich** → Übertraining früh erkennen
5. **Supplements morgens abhaken** → Complience tracken

---

## 🐛 Troubleshooting

### "Supabase not configured"
→ Siehe **Supabase Setup** oben

### Daten werden nicht gespeichert
→ Überprüfe Browser-Konsole (F12 → Console) auf Fehler
→ Kontrolliere: Tabellen existieren? Policies ok?

### Bilder laden nicht
→ URL korrekt? Öffentlich zugänglich? CORS-Issue?
→ Fallback: Leer lassen, Platzhalter nutzen

### Supplements-Status weg
→ localStorage geleert? (Cookie-Einstellungen prüfen)

---

## 📄 Lizenz

Frei nutzbar & modifizierbar. Kein Copyright.

---

## 💪 Viel Erfolg beim Cut!

*GymProgress Pro – Tracking deinen Weg zur Zieldefinition*
