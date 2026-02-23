/**
 * GymProgress Pro - Cut Edition
 * Trainings-Tracking SPA für 8-Wochen Periodisierung mit Double Progression
 *
 * DATABASE SCHEMA (SQL für Supabase SQL Editor):
 *
 * CREATE TABLE sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   week_number INT NOT NULL,
 *   day_key TEXT NOT NULL,
 *   date DATE DEFAULT CURRENT_DATE,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(week_number, day_key)
 * );
 *
 * CREATE TABLE set_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
 *   exercise_name TEXT NOT NULL,
 *   set_number INT,
 *   weight_kg FLOAT,
 *   reps INT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * RLS Policies (optional):
 * - Enable RLS on both tables
 * - CREATE POLICY "allow_read" ON sessions FOR SELECT USING (true);
 * - CREATE POLICY "allow_insert" ON sessions FOR INSERT WITH CHECK (true);
 * - CREATE POLICY "allow_update" ON sessions FOR UPDATE USING (true);
 * - (Gleich für set_logs)
 */

// ============================================
// SUPABASE KONFIGURATION
// ============================================
const SUPABASE_URL = 'https://mmckhgdsflyeqtrvjsnr.supabase.com';
const SUPABASE_ANON_KEY = 'sb_publishable_2ah_Fys1RzeOX4EvBPbpSA_U0Plque7';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// TRAININGSPLAN (zentral, leicht erweiterbar)
// ============================================
const TRAINING_PLAN = {
    mo: {
        title: "Upper (Kraft, Yoke & Grip)",
        duration: "65–70 Min",
        sets: 22,
        exercises: [
            { name: "Bench Press", sets: 3, repRange: [5, 8], rir: "1–2", startWeight: 20, bodyPart: "upper", imageUrl: "" },
            { name: "Pull-Up", sets: 3, repRange: "amrap", rir: "0–1", startWeight: 0, bodyPart: "upper", isBW: true, imageUrl: "", note: "Stange biegen" },
            { name: "T-Bar Row", sets: 3, repRange: [8, 10], rir: "2", startWeight: 15, bodyPart: "upper", imageUrl: "" },
            { name: "Lateral Raise (DB)", sets: 3, repRange: [10, 15], rir: "2", startWeight: 4, bodyPart: "upper", imageUrl: "" },
            { name: "Bayesian Cable Curl", sets: 3, repRange: [10, 15], rir: "2", startWeight: 6, bodyPart: "upper", imageUrl: "" },
            { name: "Incline DB Shrugs", sets: 3, repRange: [12, 15], rir: "2", startWeight: 14, bodyPart: "upper", imageUrl: "" },
            { name: "Face Pulls", sets: 2, repRange: [15, 20], rir: "2–3", startWeight: 12.5, bodyPart: "upper", imageUrl: "" },
            { name: "DB Wrist Curls", sets: 2, repRange: [15, 20], rir: "2", startWeight: 4, bodyPart: "upper", imageUrl: "" }
        ]
    },
    di: {
        title: "Lower + Abs Focus 1",
        duration: "70–75 Min",
        sets: 23,
        exercises: [
            { name: "Squat", sets: 3, repRange: [5, 8], rir: "1–2", startWeight: 60, bodyPart: "lower", imageUrl: "" },
            { name: "RDL", sets: 3, repRange: [8, 12], rir: "2", startWeight: 10, bodyPart: "lower", imageUrl: "", note: "langsam - wenig" },
            { name: "Seated Leg Curl", sets: 3, repRange: [10, 15], rir: "2", startWeight: 27.5, bodyPart: "lower", imageUrl: "", note: "Streckung warten!" },
            { name: "Leg Extension", sets: 3, repRange: [12, 20], rir: "2", startWeight: 35, bodyPart: "lower", imageUrl: "" },
            { name: "Nautilus Glute Drive", sets: 2, repRange: [8, 12], rir: "2", startWeight: 50, bodyPart: "lower", imageUrl: "", note: "Hüfte durchstrecken!" },
            { name: "Standing Calf Raise", sets: 4, repRange: [10, 15], rir: "1–2", startWeight: 0, bodyPart: "lower", imageUrl: "" },
            { name: "Seated Calf Raise", sets: 2, repRange: [12, 20], rir: "2", startWeight: 0, bodyPart: "lower", imageUrl: "" },
            { name: "Cable Crunch", sets: 3, repRange: [10, 15], rir: "2", startWeight: 36.25, bodyPart: "lower", imageUrl: "" }
        ]
    },
    do: {
        title: "Push (Stretch & Isolation)",
        duration: "55–60 Min",
        sets: 19,
        exercises: [
            { name: "Incline Bench Press", sets: 3, repRange: [6, 10], rir: "1–2", startWeight: 15, bodyPart: "upper", imageUrl: "" },
            { name: "Weighted Dips", sets: 3, repRange: [8, 12], rir: "2", startWeight: 0, bodyPart: "upper", isBW: true, imageUrl: "" },
            { name: "Lateral Raise (DB/Cable)", sets: 3, repRange: [12, 20], rir: "2", startWeight: 4, bodyPart: "upper", imageUrl: "" },
            { name: "Machine Pec Deck", sets: 2, repRange: [12, 15], rir: "2", startWeight: 47.5, bodyPart: "upper", imageUrl: "" },
            { name: "OH Cable Triceps Extension", sets: 3, repRange: [10, 15], rir: "2", startWeight: 16, bodyPart: "upper", imageUrl: "" },
            { name: "Neck Curls/Extensions", sets: 3, repRange: [15, 20], rir: "2–3", startWeight: 0, bodyPart: "upper", imageUrl: "" },
            { name: "Face Pulls", sets: 2, repRange: [15, 20], rir: "3", startWeight: 10, bodyPart: "upper", imageUrl: "" }
        ]
    },
    fr: {
        title: "Pull + Abs Focus 2",
        duration: "70–75 Min",
        sets: 23,
        exercises: [
            { name: "Trap Bar Deadlift", sets: 3, repRange: [3, 6], rir: "2", startWeight: 70, bodyPart: "lower", imageUrl: "" },
            { name: "Machine Lat Pullover", sets: 3, repRange: [10, 15], rir: "2", startWeight: 17.5, bodyPart: "upper", imageUrl: "" },
            { name: "Seated Cable Row", sets: 3, repRange: [8, 12], rir: "2", startWeight: 20, bodyPart: "upper", imageUrl: "" },
            { name: "Reverse Pec Deck", sets: 3, repRange: [15, 20], rir: "2–3", startWeight: 20, bodyPart: "upper", imageUrl: "", note: "seitlich setzen in Dehnung !" },
            { name: "Cable Lateral Raise (Behind-Back)", sets: 2, repRange: [12, 15], rir: "3", startWeight: 2, bodyPart: "upper", imageUrl: "" },
            { name: "Preacher Curl", sets: 3, repRange: [10, 15], rir: "2", startWeight: 5, bodyPart: "upper", imageUrl: "" },
            { name: "Hanging Leg Raises", sets: 3, repRange: "amrap", rir: "2", startWeight: 0, bodyPart: "lower", isBW: true, imageUrl: "" },
            { name: "Standing Calf Raise", sets: 3, repRange: [10, 15], rir: "2", startWeight: 0, bodyPart: "lower", imageUrl: "" }
        ]
    }
};

// ============================================
// SUPPLEMENTS (Checkboxes, localStorage-basiert)
// ============================================
const SUPPLEMENTS = {
    "Morgens": [
        "Vitamin D3 (3000–5000 IU)",
        "Vitamin K2 (MK-7, 100–200 µg)",
        "Omega-3 (2–3 g, davon 1–1,5 g EPA+DHA)"
    ],
    "Pre-Workout (30–60 Min)": [
        "Koffein (200 mg, nicht nach 14:00)",
        "Citrullin-Malat (8 g)",
        "Kreatin Monohydrat (5 g)"
    ],
    "Abends (60–90 Min vor Schlaf)": [
        "Magnesium (300–400 mg, Glycinat/Citrat)",
        "Zink (25 mg, Picolinat/Citrat)"
    ],
    "Optional": [
        "Ashwagandha (KSM-66, 300–600 mg)",
        "Melatonin (0,5–1 mg bei Bedarf)"
    ]
};

// Recovery Check Items
const RECOVERY_ITEMS = [
    "Schlafstörungen",
    "Libido runter",
    "Kraftverlust (>10% über 2 Wochen)",
    "Chronische Müdigkeit",
    "Ruhepuls +5–10 bpm",
    "Stimmung kippt",
    "Appetit weg",
    "Häufige Infekte"
];

// ============================================
// STATE MANAGEMENT
// ============================================
let currentDay = 'mo';
let currentWeek = 1;
let sessionId = null;

// ============================================
// INITIALISIERUNG
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initSupps();
    renderDayTitle();
    await renderDay('mo');
    setupEventListeners();
    await loadWeekTracker();
});

function setupEventListeners() {
    // Day Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.nav-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentDay = e.target.dataset.day;
            renderDayTitle();
            renderDay(currentDay);
        });
    });

    // Week Selector
    document.getElementById('weekSelect').addEventListener('change', (e) => {
        currentWeek = parseInt(e.target.value);
        renderDay(currentDay);
    });

    // Session speichern
    const saveBtn = document.getElementById('navSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveSession);

    // Recovery Modal
    const modal = document.getElementById('recoveryModal');
    const recBtn = document.getElementById('navRecoveryBtn');
    if (recBtn) recBtn.onclick = () => modal.style.display = "block";
    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
    document.getElementById('evaluateRecovery').onclick = evaluateRecovery;

    // Modal schließen bei Außenklick
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    };
}

// ============================================
// RENDERING
// ============================================
function renderDayTitle() {
    const dayNames = { mo: "Mo", di: "Di", do: "Do", fr: "Fr" };
    const dayTitle = TRAINING_PLAN[currentDay];
    const titleEl = document.querySelector('.day-info h2');
    if (titleEl) {
        titleEl.textContent = `${dayNames[currentDay]} – ${dayTitle.title}`;
    }
}

async function renderDay(dayKey) {
    const container = document.getElementById('exerciseGrid');
    container.innerHTML = '<div class="loading">Lade Session...</div>';

    const dayData = TRAINING_PLAN[dayKey];

    // Lade Daten aus Supabase (falls vorhanden)
    const savedData = await loadSavedSession(currentWeek, dayKey);
    const savedLogs = savedData ? savedData.set_logs || [] : [];

    container.innerHTML = '';

    dayData.exercises.forEach((ex, exIdx) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';

        // Finde gespeicherte Reps für diese Übung
        const exLogs = savedLogs.filter(log => log.exercise_name === ex.name).sort((a, b) => a.set_number - b.set_number);
        const savedWeight = exLogs.length > 0 ? exLogs[0].weight_kg : ex.startWeight;
        const repVals = exLogs.length > 0 ? exLogs.map(l => l.reps) : Array(ex.sets).fill('');

        const imageHtml = ex.imageUrl
            ? `<img src="${ex.imageUrl}" alt="${ex.name}">`
            : '<div class="placeholder-img">📷</div>';

        card.innerHTML = `
            <div class="exercise-img">
                ${imageHtml}
            </div>
            <div class="exercise-info">
                <div class="exercise-header">
                    <h3>${exIdx + 1}. ${ex.name}</h3>
                    <small>${ex.sets} Sätze</small>
                </div>
                <div class="progression-zone" id="prog-${exIdx}"></div>
                <div class="input-group">
                    <div class="weight-wrapper">
                        ${ex.isBW ? '<label class="bw-label">BW +</label>' : '<label></label>'}
                        <input type="number" class="weight-input" value="${savedWeight}" step="0.25" data-ex-idx="${exIdx}"> 
                        <span style="font-size: 0.9rem; color: var(--text-muted);">kg</span>
                    </div>
                    <div class="sets-wrapper">
                        <div class="rir-label">RIR ${ex.rir}</div>
                        <div class="set-inputs">
                            ${Array.from({ length: ex.sets }).map((_, i) => {
            const targetText = ex.targets ? ex.targets[i] : (ex.repRange === 'amrap' ? 'AMRAP' : `${ex.repRange[0]}-${ex.repRange[1]}`);
            return `
                                <div class="set-col">
                                    <input type="number" class="rep-input" placeholder="S${i + 1}" value="${repVals[i] || ''}" data-set="${i}" data-ex-idx="${exIdx}">
                                    <span class="rep-target">${targetText}</span>
                                </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                </div>
                ${ex.note ? `<div class="exercise-note">💡 ${ex.note}</div>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// Lade Vorwoche für AMRAP Vergleiche
async function loadPreviousSessionData(week, dayKey) {
    if (week <= 1) return null;
    return await loadSavedSession(week - 1, dayKey);
}

// ============================================
// SUPABASE OPERATIONS
// ============================================
async function loadSavedSession(week, day) {
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ Supabase not configured. Using local-only mode.');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('sessions')
            .select('id, set_logs(*)')
            .eq('week_number', week)
            .eq('day_key', day)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase fetch error:', error);
            return null;
        }
        return data || null;
    } catch (err) {
        console.warn('Supabase unavailable:', err.message);
        return null;
    }
}

async function saveSession() {
    const cards = document.querySelectorAll('.exercise-card');
    const logs = [];

    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        alert('⚠️ Supabase nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_ANON_KEY in app.js eintragen.');
        return;
    }

    try {
        // 1. Session erstellen oder abrufen
        const { data: session, error: sErr } = await supabaseClient
            .from('sessions')
            .upsert(
                { week_number: currentWeek, day_key: currentDay, date: new Date().toISOString().split('T')[0] },
                { onConflict: 'week_number,day_key' }
            )
            .select()
            .single();

        if (sErr) throw new Error('Session error: ' + sErr.message);
        sessionId = session.id;

        // Lade Vorwoche für AMRAP Vergleich
        const prevSessionData = await loadPreviousSessionData(currentWeek, currentDay);
        const prevLogs = prevSessionData ? prevSessionData.set_logs || [] : [];

        // 2. Logs sammeln
        const dayData = TRAINING_PLAN[currentDay];
        cards.forEach((card, cardIdx) => {
            const exName = card.querySelector('h3').innerText;
            const weight = parseFloat(card.querySelector('.weight-input').value) || 0;
            const exData = dayData.exercises.find(e => e.name === exName);

            const repInputs = Array.from(card.querySelectorAll('.rep-input'));
            repInputs.forEach((input, setIdx) => {
                const reps = parseInt(input.value) || 0;
                if (reps > 0 || weight > 0) {
                    logs.push({
                        session_id: sessionId,
                        exercise_name: exName,
                        set_number: setIdx + 1,
                        weight_kg: weight,
                        reps: reps
                    });
                }
            });

            // Double Progression Check
            if (exData) {
                const prevExLogs = prevLogs.filter(l => l.exercise_name === exName).sort((a, b) => a.set_number - b.set_number);
                checkProgression(card, cardIdx, exData, repInputs.map(i => parseInt(i.value) || 0), prevExLogs);
            }
        });

        // 3. Alte Logs löschen & neue einfügen
        await supabaseClient.from('set_logs').delete().eq('session_id', sessionId);
        const { error: lErr } = await supabaseClient.from('set_logs').insert(logs);

        if (lErr) throw new Error('Log insert error: ' + lErr.message);

        alert('✅ Session erfolgreich gespeichert!');
        await loadWeekTracker();
    } catch (err) {
        console.error('Save error:', err);
        alert('❌ Fehler beim Speichern: ' + err.message);
    }
}

// ============================================
// DOUBLE PROGRESSION LOGIC
// ============================================
function checkProgression(card, cardIdx, ex, reps, prevExLogs = []) {
    const badgeZone = card.querySelector(`#prog-${cardIdx}`);
    badgeZone.innerHTML = '';

    let message = '';

    if (ex.repRange === 'amrap') {
        let improved = false;

        // Prüfe, ob in der Vorwoche Logs existierten
        if (prevExLogs && prevExLogs.length > 0) {
            // Check ob ALLE Sätze >= Vorwoche + 2 sind
            let allSetsImproved = reps.length > 0; // Gehe davon aus, dass wir Sätze haben
            for (let i = 0; i < reps.length; i++) {
                const currentRep = reps[i];
                const prevRepLog = prevExLogs.find(l => l.set_number === i + 1);
                const prevRepCount = prevRepLog ? prevRepLog.reps : 0;

                if (currentRep < prevRepCount + 2) {
                    allSetsImproved = false;
                    break;
                }
            }
            improved = allSetsImproved;
        }

        if (improved) {
            message = "✅ Reps verbessert! Nächstes Mal +2,5 kg Zusatzgewicht";
        }
    } else {
        // Standard: Wenn alle Sätze am oberen Rep-Ende
        const target = ex.repRange[1];
        if (reps.length > 0 && reps.every(r => r > 0 && r >= target)) {
            const inc = ex.bodyPart === 'upper' ? '1,25' : '2,5';
            message = `✅ Gewicht erhöhen: +${inc} kg`;
        }
    }

    if (message) {
        const badge = document.createElement('span');
        badge.className = 'progression-badge';
        badge.innerHTML = message;
        badgeZone.appendChild(badge);
    }
}

// ============================================
// SUPPLEMENTS (localStorage)
// ============================================
function initSupps() {
    const container = document.getElementById('suppsContainer');
    const saved = JSON.parse(localStorage.getItem('supps_log') || '{}');
    const today = new Date().toISOString().split('T')[0];

    Object.entries(SUPPLEMENTS).forEach(([time, list]) => {
        const div = document.createElement('div');
        div.className = 'supp-section';
        div.innerHTML = `<strong>${time}</strong>`;

        list.forEach(s => {
            const id = `supp-${s.replace(/\s/g, '-')}`;
            const isChecked = saved[today]?.[id] ? 'checked' : '';
            const label = document.createElement('label');
            label.className = 'supp-item';
            label.innerHTML = `
                <input type="checkbox" id="${id}" ${isChecked} onchange="window.saveSupp('${id}')">
                <span>${s}</span>
            `;
            div.appendChild(label);
        });
        container.appendChild(div);
    });
}

window.saveSupp = (id) => {
    const today = new Date().toISOString().split('T')[0];
    const saved = JSON.parse(localStorage.getItem('supps_log') || '{}');
    if (!saved[today]) saved[today] = {};
    saved[today][id] = document.getElementById(id).checked;
    localStorage.setItem('supps_log', JSON.stringify(saved));
};

// ============================================
// RECOVERY CHECK MODAL
// ============================================
function initRecoveryChecklist() {
    const recList = document.getElementById('recoveryChecklist');
    recList.innerHTML = '';
    RECOVERY_ITEMS.forEach(item => {
        const label = document.createElement('label');
        label.className = 'recovery-item';
        label.innerHTML = `<input type="checkbox"> ${item}`;
        recList.appendChild(label);
    });
}

function evaluateRecovery() {
    const checks = document.querySelectorAll('#recoveryChecklist input:checked').length;
    const box = document.getElementById('recoveryFeedback');

    let bgColor, textColor, message;

    if (checks <= 1) {
        bgColor = 'var(--success)';
        textColor = '#000';
        message = "✅ Alles im grünen Bereich. Keep going!";
    } else if (checks <= 3) {
        bgColor = 'var(--warning)';
        textColor = '#000';
        message = "⚠️ <strong>Stufe 1:</strong> 1 Woche Deload (50% Volumen, RIR 4+), Defizit 300 kcal, Schlaf 9h+";
    } else {
        bgColor = 'var(--danger)';
        textColor = '#fff';
        message = "🚨 <strong>Stufe 2:</strong> 1 Woche Pause. Maintenance-Kalorien, Stressoren fixen, Restart mit 60% Volumen";
    }

    box.style.background = bgColor;
    box.style.color = textColor;
    box.innerHTML = message;
    box.style.display = 'block';
}

// ============================================
// WEEK TRACKER (visuelle Übersicht)
// ============================================
async function loadWeekTracker() {
    if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        return;
    }

    try {
        const trackerEl = document.getElementById('weekTracker');
        if (!trackerEl) return;

        trackerEl.innerHTML = '<div class="tracker-label">Woche ' + currentWeek + ':&nbsp;</div>';

        const dayKeys = ['mo', 'di', 'do', 'fr'];
        for (const day of dayKeys) {
            const { data } = await supabaseClient
                .from('sessions')
                .select('id')
                .eq('week_number', currentWeek)
                .eq('day_key', day)
                .single();

            const dayEl = document.createElement('span');
            dayEl.className = 'tracker-day ' + (data ? 'done' : 'pending');
            dayEl.textContent = day.toUpperCase();
            trackerEl.appendChild(dayEl);
        }
    } catch (err) {
        console.warn('Week tracker load failed:', err.message);
    }
}

// Recovery Modal einmal initialisieren
document.addEventListener('DOMContentLoaded', () => {
    initRecoveryChecklist();
});
