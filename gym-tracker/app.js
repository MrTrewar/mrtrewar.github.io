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
const SUPABASE_URL = "https://whelaaozlexvxkojrljp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F1S_lB8kCYj22c-ssxrL4A_3hTHta1h";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// ============================================
// TRAININGSPLAN (zentral, leicht erweiterbar)
// ============================================
const LEGACY_TRAINING_PLAN = {
  mo: {
    dayName: "Mo",
    navLabel: "Mo (Upper)",
    title: "Upper (Kraft, Yoke & Grip)",
    duration: "65–70 Min",
    sets: 22,
    exercises: [
      {
        name: "Bench Press",
        sets: 3,
        repRange: [5, 8],
        rir: "1–2",
        startWeight: 20,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_bench_press.png",
      },
      {
        name: "Pull-Up",
        sets: 3,
        repRange: "amrap",
        rir: "0–1",
        startWeight: 0,
        bodyPart: "upper",
        isBW: true,
        imageUrl: "assets/images/pixel_pull_up.png",
        note: "Stange biegen",
      },
      {
        name: "T-Bar Row",
        sets: 3,
        repRange: [8, 10],
        rir: "2",
        startWeight: 15,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_t_bar_row.png",
      },
      {
        name: "Lateral Raise (DB)",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 4,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_lateral_raise.png",
      },
      {
        name: "Bayesian Cable Curl",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 6,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_bayesian_curl.png",
      },
      {
        name: "Incline DB Shrugs",
        sets: 3,
        repRange: [12, 15],
        rir: "2",
        startWeight: 14,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_incline_bench.png",
      },
      {
        name: "Face Pulls",
        sets: 2,
        repRange: [15, 20],
        rir: "2–3",
        startWeight: 12.5,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_face_pulls.png",
      },
      {
        name: "Triceps Pushdown",
        sets: 3,
        repRange: [6, 8],
        rir: "2",
        startWeight: 0,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_triceps_ext.png",
      },
    ],
  },
  di: {
    dayName: "Di",
    navLabel: "Di (Lower)",
    title: "Lower + Abs Focus 1",
    duration: "70–75 Min",
    sets: 21,
    exercises: [
      {
        name: "Squat",
        sets: 3,
        repRange: [5, 8],
        rir: "1–2",
        startWeight: 60,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_squat.png",
      },
      {
        name: "RDL",
        sets: 3,
        repRange: [8, 12],
        rir: "2",
        startWeight: 10,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_rdl.png",
        note: "langsam - wenig",
      },
      {
        name: "Seated Leg Curl",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 27.5,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_leg_curl.png",
        note: "Streckung warten!",
      },
      {
        name: "Leg Extension",
        sets: 3,
        repRange: [12, 20],
        rir: "2",
        startWeight: 35,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_leg_extension.png",
      },
      {
        name: "Nautilus Glute Drive",
        sets: 2,
        repRange: [8, 12],
        rir: "2",
        startWeight: 50,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_glute_drive.png",
        note: "Hüfte durchstrecken!",
      },
      {
        name: "Leg Press",
        sets: 3,
        repRange: [6, 8],
        rir: "2",
        startWeight: 0,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_leg_press.png",
      },
      {
        name: "Cable Crunch",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 36.25,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_cable_crunch.png",
      },
    ],
  },
  do: {
    dayName: "Do",
    navLabel: "Do (Push)",
    title: "Push (Stretch & Isolation)",
    duration: "55–60 Min",
    sets: 19,
    exercises: [
      {
        name: "Incline Bench Press",
        sets: 3,
        repRange: [6, 10],
        rir: "1–2",
        startWeight: 15,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_incline_bench.png",
      },
      {
        name: "Weighted Dips",
        sets: 3,
        repRange: [8, 12],
        rir: "2",
        startWeight: 0,
        bodyPart: "upper",
        isBW: true,
        imageUrl: "assets/images/pixel_dips.png",
      },
      {
        name: "Lateral Raise (DB/Cable)",
        sets: 3,
        repRange: [12, 20],
        rir: "2",
        startWeight: 4,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_lateral_raise.png",
      },
      {
        name: "Machine Pec Deck",
        sets: 2,
        repRange: [12, 15],
        rir: "2",
        startWeight: 47.5,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_pec_deck.png",
      },
      {
        name: "OH Cable Triceps Extension",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 16,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_triceps_ext.png",
      },
      {
        name: "Hanging Leg Raises",
        sets: 3,
        repRange: "amrap",
        rir: "2",
        startWeight: 0,
        bodyPart: "lower",
        isBW: true,
        imageUrl: "assets/images/pixel_hanging_leg_raise.png",
      },
      {
        name: "Face Pulls",
        sets: 2,
        repRange: [15, 20],
        rir: "3",
        startWeight: 10,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_face_pulls.png",
      },
    ],
  },
  fr: {
    dayName: "Fr",
    navLabel: "Fr (Pull)",
    title: "Pull + Abs Focus 2",
    duration: "70–75 Min",
    sets: 23,
    exercises: [
      {
        name: "Trap Bar Deadlift",
        sets: 3,
        repRange: [3, 6],
        rir: "2",
        startWeight: 70,
        bodyPart: "lower",
        imageUrl: "assets/images/pixel_trap_bar_deadlift.png",
      },
      {
        name: "Seated Cable Row",
        sets: 3,
        repRange: [8, 12],
        rir: "2",
        startWeight: 20,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_cable_row.png",
      },
      {
        name: "Machine Lat Pullover",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 17.5,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_lat_pullover.png",
      },
      {
        name: "Reverse Pec Deck",
        sets: 3,
        repRange: [15, 20],
        rir: "2–3",
        startWeight: 20,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_reverse_pec_deck.png",
        note: "seitlich setzen in Dehnung !",
      },
      {
        name: "Cable Lateral Raise (Behind-Back)",
        sets: 2,
        repRange: [12, 15],
        rir: "3",
        startWeight: 2,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_lateral_raise.png",
      },
      {
        name: "Preacher Curl",
        sets: 3,
        repRange: [10, 15],
        rir: "2",
        startWeight: 5,
        bodyPart: "upper",
        imageUrl: "assets/images/pixel_preacher_curl.png",
      },
      {
        name: "Hanging Leg Raises",
        sets: 3,
        repRange: "amrap",
        rir: "2",
        startWeight: 0,
        bodyPart: "lower",
        isBW: true,
        imageUrl: "assets/images/pixel_hanging_leg_raise.png",
      },
      {
        name: "Plank",
        sets: 2,
        repRange: "amrap",
        rir: "0",
        startWeight: 0,
        bodyPart: "lower",
        isBW: true,
        imageUrl: "assets/images/pixel_plank.png",
        note: "Max Hold in Sekunden eintragen",
      },
    ],
  },
};

// ============================================
// SUPPLEMENTS (Checkboxes, localStorage-basiert)
// ============================================
const TRAINING_PLAN = StrengthPlan.build(LEGACY_TRAINING_PLAN);

const SUPPLEMENTS = {
  Morgens: [
    "Vitamin D3 (3000–5000 IU)",
    "Vitamin K2 (MK-7, 100–200 µg)",
    "Omega-3 (2–3 g, davon 1–1,5 g EPA+DHA)",
  ],
  "Pre-Workout (30–60 Min)": [
    "Koffein (200 mg, nicht nach 14:00)",
    "Citrullin-Malat (8 g)",
    "Kreatin Monohydrat (5 g)",
  ],
  "Abends (60–90 Min vor Schlaf)": [
    "Magnesium (300–400 mg, Glycinat/Citrat)",
    "Zink (25 mg, Picolinat/Citrat)",
  ],
  Optional: [
    "Ashwagandha (KSM-66, 300–600 mg)",
    "Melatonin (0,5–1 mg bei Bedarf)",
  ],
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
  "Häufige Infekte",
];

// ============================================
// DELOAD WEEKS
// ============================================
const DELOAD_WEEKS = [4, 8, 12, 16];

function isDeloadWeek(week) {
  return DELOAD_WEEKS.includes(week);
}

function getDeloadSets(normalSets) {
  return Math.ceil(normalSets / 2);
}

// ============================================
// PLAN-VERWALTUNG (Classic + Hybrid)
// Neue Tageskennungen starten bei Woche 1; der alte Split bleibt als Archiv erhalten.
// ============================================
const PLANS = {
  classic: { label: "Kraft + Muskelaufbau – 4 Tage", days: TRAINING_PLAN },
  archive: { label: "Bisheriger 4er-Split – Archiv", days: LEGACY_TRAINING_PLAN },
  hybrid:
    typeof HYBRID_PLAN !== "undefined"
      ? HYBRID_PLAN
      : { label: "Hybrid", days: {} },
};

let currentPlan = localStorage.getItem("gym_active_plan") || "classic";
if (!PLANS[currentPlan]) currentPlan = "classic";
if (localStorage.getItem("gym_strength_revision") !== StrengthPlan.REVISION) {
  currentPlan = "classic";
  localStorage.setItem("gym_active_plan", currentPlan);
  localStorage.setItem("gym_strength_revision", StrengthPlan.REVISION);
}

function activeDays() {
  return PLANS[currentPlan].days;
}

function activeDayKeys() {
  return Object.keys(activeDays());
}

function dayLabel(dayKey) {
  const day = activeDays()[dayKey];
  if (!day) return dayKey.toUpperCase();
  return day.navLabel || day.dayName || dayKey.toUpperCase();
}

function dayTitleLine(dayKey) {
  const day = activeDays()[dayKey];
  if (!day) return dayKey;
  return day.dayName ? `${day.dayName} – ${day.title}` : day.title;
}

function isCardioDay(dayKey) {
  const day = activeDays()[dayKey];
  return !!day && day.type === "cardio";
}

// ============================================
// STATE MANAGEMENT
// ============================================
let currentDay = activeDayKeys()[0] || "mo";
let currentWeek = 1;
let sessionId = null;
let dayRenderVersion = 0;
let navigationVersion = 0;
let savingSession = false;
let historicalSessionsPromise = null;

function setSessionActionsEnabled(enabled) {
  const canWrite = enabled && currentPlan !== "archive" && !savingSession;
  ["navSaveBtn", "middleSaveBtn", "navSkipBtn"].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.disabled = !canWrite;
  });
  document.querySelectorAll("#planSelect, #weekSelect, .nav-btn[data-day]").forEach(el => {
    el.disabled = savingSession;
  });
}

function loadHistoricalSessions() {
  if (!historicalSessionsPromise) {
    const keys = [
      ...Object.keys(LEGACY_TRAINING_PLAN),
      ...Object.keys(PLANS.hybrid.days),
    ];
    historicalSessionsPromise = StrengthPlan.loadSessions(supabaseClient, keys)
      .catch(error => {
        historicalSessionsPromise = null;
        throw error;
      });
  }
  return historicalSessionsPromise;
}


// ============================================
// INITIALISIERUNG
// ============================================
async function autoNavigateToNextSession() {
  const version = navigationVersion;
  const planKey = currentPlan;
  try {
    // Nur die Tage des aktiven Plans berücksichtigen (Classic und Hybrid
    // teilen sich dieselbe Tabelle, haben aber disjunkte day_key-Werte).
    const dayOrder = activeDayKeys();

    const { data: allSessions, error } = await supabaseClient
      .from("sessions")
      .select("week_number, day_key")
      .in("day_key", dayOrder)
      .order("week_number", { ascending: false });

    if (version !== navigationVersion || planKey !== currentPlan) return;
    if (error) throw error;
    const planSessions = (allSessions || []).filter((s) =>
      dayOrder.includes(s.day_key),
    );
    if (planSessions.length === 0) return;

    const maxWeek = planSessions[0].week_number;
    const loggedDaysInMaxWeek = planSessions
      .filter((s) => s.week_number === maxWeek)
      .map((s) => s.day_key);

    const nextDay = dayOrder.find((d) => !loggedDaysInMaxWeek.includes(d));

    if (currentPlan === "archive") {
      currentWeek = maxWeek;
      currentDay = dayOrder.find(day => loggedDaysInMaxWeek.includes(day)) || dayOrder[0];
    } else if (nextDay) {
      currentWeek = maxWeek;
      currentDay = nextDay;
    } else {
      currentWeek = maxWeek + 1;
      currentDay = dayOrder[0];
    }

    const weekSelect = document.getElementById("weekSelect");
    if (weekSelect) weekSelect.value = currentWeek;

    document.querySelectorAll(".nav-btn[data-day]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.day === currentDay);
    });
  } catch (err) {
    console.warn("Auto-navigate failed:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initSupps();
  initPlanSelector();
  renderDayNav();
  setupEventListeners();
  const version = navigationVersion;
  await autoNavigateToNextSession();
  if (version !== navigationVersion) return;
  renderDayNav();
  renderDayTitle();
  await renderDay(currentDay);
  await loadWeekTracker();
  refreshHybridViews();
});

// ============================================
// PLAN-UMSCHALTER & DYNAMISCHE TAGES-NAVIGATION
// ============================================
function initPlanSelector() {
  const select = document.getElementById("planSelect");
  if (!select) return;
  select.replaceChildren();
  Object.entries(PLANS).forEach(([key, plan]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = plan.label;
    select.appendChild(option);
  });
  select.value = currentPlan;
  select.addEventListener("change", (e) => switchPlan(e.target.value));
}

async function switchPlan(planKey) {
  if (!PLANS[planKey] || savingSession) return;
  const version = ++navigationVersion;
  dayRenderVersion++;
  setSessionActionsEnabled(false);
  currentPlan = planKey;
  localStorage.setItem("gym_active_plan", planKey);
  // Beim Planwechsel NICHT die Woche des alten Plans behalten: auf Woche 1
  // zurücksetzen und dann zur nächsten offenen Session DIESES Plans navigieren
  // (bleibt bei Woche 1, wenn der Plan noch nicht begonnen wurde).
  currentWeek = 1;
  currentDay = activeDayKeys()[0];
  renderDayNav();
  await autoNavigateToNextSession();
  if (version !== navigationVersion) return;
  // Dropdown synchronisieren (autoNavigate setzt es nur, wenn Sessions existieren).
  const weekSelect = document.getElementById("weekSelect");
  if (weekSelect) weekSelect.value = currentWeek;
  renderDayNav();
  renderDayTitle();
  await renderDay(currentDay);
  loadWeekTracker();
  refreshHybridViews();
}

function renderDayNav() {
  const nav = document.querySelector(".day-nav");
  if (!nav) return;

  nav.querySelectorAll(".nav-btn[data-day]").forEach((btn) => btn.remove());

  const anchor = document.getElementById("navRecoveryBtn");
  activeDayKeys().forEach((dayKey) => {
    const day = activeDays()[dayKey];
    const btn = document.createElement("button");
    btn.className = "nav-btn" + (dayKey === currentDay ? " active" : "");
    btn.dataset.day = dayKey;
    const prefix = day.type === "cardio" ? "🏃 " : "";
    btn.textContent = prefix + (day.navLabel || dayKey.toUpperCase());
    btn.addEventListener("click", () => selectDay(dayKey));
    nav.insertBefore(btn, anchor);
  });
}

function selectDay(dayKey) {
  if (savingSession) return;
  navigationVersion++;
  currentDay = dayKey;
  document.querySelectorAll(".nav-btn[data-day]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.day === dayKey);
  });
  renderDayTitle();
  renderDay(dayKey);
  loadWeekTracker();
}

// Blendet ACWR-Ampel + 12-Wochen-Laufplan nur im Hybrid-Modus ein.
function refreshHybridViews() {
  const isHybrid = currentPlan === "hybrid";
  const acwrBox = document.getElementById("acwrBox");
  const runPlan = document.getElementById("runPlanAccordion");
  if (acwrBox) acwrBox.style.display = isHybrid ? "flex" : "none";
  if (runPlan) runPlan.style.display = isHybrid ? "block" : "none";
  if (!isHybrid) return;
  if (typeof renderRunPlanTable === "function") renderRunPlanTable();
  if (typeof computeAndRenderACWR === "function") computeAndRenderACWR();
}

function dayShort(dayKey) {
  const day = activeDays()[dayKey];
  return (day && day.dayName) || dayKey.toUpperCase();
}

function setupEventListeners() {
  // Tages-Navigation wird in renderDayNav() pro Plan dynamisch erzeugt.

  // Week Selector
  document.getElementById("weekSelect").addEventListener("change", (e) => {
    if (savingSession) return;
    navigationVersion++;
    currentWeek = parseInt(e.target.value);
    renderDay(currentDay);
    loadWeekTracker();
    refreshHybridViews();
  });

  // Session speichern
  const saveBtn = document.getElementById("navSaveBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveSession);

  const middleSaveBtn = document.getElementById("middleSaveBtn");
  if (middleSaveBtn) middleSaveBtn.addEventListener("click", saveSession);

  // Historie löschen
  const deleteBtn = document.getElementById("deleteHistoryBtn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const confirmed = confirm(
        "ACHTUNG: Bist du dir sicher, dass du alle gespeicherten Werte unwiderruflich löschen möchtest?",
      );
      if (!confirmed) return;

      deleteBtn.textContent = "Lösche...";
      try {
        // Lösche alle Sessions (durch ON DELETE CASCADE fliegen auch die set_logs mit raus)
        const { error } = await supabaseClient
          .from("sessions")
          .delete()
          .gte("week_number", 0);

        if (error) throw error;

        alert("Historie erfolgreich gelöscht!");
        window.location.reload();
      } catch (err) {
        console.error("Fehler beim Löschen:", err);
        alert("Fehler beim Löschen der Historie: " + err.message);
        deleteBtn.textContent = "Alle Werte löschen";
      }
    });
  }

  // Skip Button
  const skipBtn = document.getElementById("navSkipBtn");
  if (skipBtn) skipBtn.addEventListener("click", skipDay);

  // Recovery Modal
  const modal = document.getElementById("recoveryModal");
  const recBtn = document.getElementById("navRecoveryBtn");
  if (recBtn) recBtn.onclick = () => (modal.style.display = "block");
  document.querySelector(".close-modal").onclick = () =>
    (modal.style.display = "none");
  document.getElementById("evaluateRecovery").onclick = evaluateRecovery;

  // Modal schließen bei Außenklick
  window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
  };
}

// ============================================
// RENDERING
// ============================================
function renderDayTitle() {
  const titleEl = document.querySelector(".day-info h2");
  if (titleEl) titleEl.textContent = dayTitleLine(currentDay);
  const weekSelect = document.getElementById("weekSelect");
  if (weekSelect) {
    while (weekSelect.options.length < Math.max(16, currentWeek)) {
      const option = document.createElement("option");
      option.value = weekSelect.options.length + 1;
      weekSelect.appendChild(option);
    }
    [...weekSelect.options].forEach(option => {
      const week = Number(option.value);
      option.textContent = week + (isDeloadWeek(week) ? " - Deload" : " - Training");
    });
    weekSelect.value = currentWeek;
  }
  const status = document.getElementById("planStatus");
  if (status) {
    status.hidden = currentPlan === "hybrid";
    status.textContent = currentPlan === "archive"
      ? "Archiv: bisherige Einheiten bleiben erhalten. Ansicht ohne Speichern."
      : "Neuer 4-Tage-Plan: 70 Arbeitssaetze pro Woche. Startgewichte unveraendert aus Supabase. Danach automatische Steigerung bei vollstaendig erreichtem Rep-Ziel: Oberkoerper +1,25 kg, Unterkoerper +2,5 kg. Alte Einheiten stehen im Archiv. Gewichtsangaben wie bisher zaehlen; leichte Tage passend zu RIR anpassen.";
  }
}

async function renderDay(dayKey) {
  const renderVersion = ++dayRenderVersion;
  const viewPlan = currentPlan;
  const viewWeek = currentWeek;
  setSessionActionsEnabled(false);
  const historySection = document.getElementById("historySection");
  if (historySection) historySection.style.display = "none";
  // Lauf-Tage haben eine eigene Eingabemaske (siehe cardio.js).
  if (isCardioDay(dayKey)) {
    await renderCardioDay(dayKey, activeDays()[dayKey]);
    if (renderVersion === dayRenderVersion) setSessionActionsEnabled(true);
    return;
  }

  const container = document.getElementById("exerciseGrid");
  container.innerHTML = '<div class="loading">Lade Session...</div>';

  const dayData = activeDays()[dayKey];

  const strengthMode = viewPlan === "classic";
  let savedData = null;
  let prevData = null;
  let prevPrevLogs = [];
  let daySessions = [];
  let historicalSessions = [];
  try {
    if (strengthMode) {
      [daySessions, historicalSessions] = await Promise.all([
        StrengthPlan.loadSessions(supabaseClient, [dayKey]),
        loadHistoricalSessions(),
      ]);
      savedData = [...daySessions].sort((a, b) =>
        Date.parse(a.created_at) - Date.parse(b.created_at)
      ).find(s => s.week_number === viewWeek) || null;
    } else {
      savedData = await loadSavedSession(viewWeek, dayKey);
      prevData = await loadPreviousSessionData(viewWeek, dayKey);
      if (prevData && prevData.week_number > 1) {
        const earlier = await loadPreviousSessionData(prevData.week_number, dayKey);
        prevPrevLogs = earlier?.set_logs || [];
      }
    }
  } catch (error) {
    if (renderVersion !== dayRenderVersion) return;
    container.replaceChildren();
    const notice = document.createElement("p");
    notice.className = "error";
    notice.textContent = "Trainingsdaten/Startgewichte konnten nicht geladen werden. Es wurde nichts gespeichert. " + error.message;
    const retry = document.createElement("button");
    retry.className = "nav-btn";
    retry.textContent = "Erneut laden";
    retry.onclick = () => renderDay(dayKey);
    container.append(notice, retry);
    return;
  }
  if (renderVersion !== dayRenderVersion) return;
  const savedLogs = savedData?.set_logs || [];
  const prevLogs = prevData?.set_logs || [];
  container.dataset.plan = viewPlan;
  container.dataset.day = dayKey;
  container.dataset.week = viewWeek;

  container.innerHTML = "";

  const deload = isDeloadWeek(viewWeek);

  // Deload-Banner anzeigen
  if (deload) {
    const banner = document.createElement("div");
    banner.className = "deload-banner";
    banner.innerHTML =
      "⚡ DELOAD WOCHE — Sätze halbiert, Gewichte & RIR beibehalten";
    container.appendChild(banner);
  }

  dayData.exercises.forEach((ex, exIdx) => {
    const card = document.createElement("div");
    card.className = "exercise-card";
    card.dataset.exerciseName = ex.name;
    const preset = strengthMode
      ? StrengthPlan.preset(ex, daySessions, historicalSessions, viewWeek, dayKey)
      : null;

    // Deload: Sätze halbieren (aufrunden)
    const effectiveSets = deload ? getDeloadSets(ex.sets) : ex.sets;

    // Finde gespeicherte Reps für diese Übung aus aktueller und vorherigen Wochen
    const exLogs = savedLogs
      .filter((log) => log.exercise_name === ex.name)
      .sort((a, b) => a.set_number - b.set_number);
    const exPrevLogs = prevLogs
      .filter((log) => log.exercise_name === ex.name)
      .sort((a, b) => a.set_number - b.set_number);
    const exPrevPrevLogs = prevPrevLogs
      .filter((log) => log.exercise_name === ex.name)
      .sort((a, b) => a.set_number - b.set_number);

    const prevWeight = preset ? preset.weight :
      exPrevLogs.length > 0 ? exPrevLogs[0].weight_kg : ex.startWeight;
    const progData = viewPlan === "archive"
      ? { message: "", newWeight: null, autoIncreased: false }
      : strengthMode
      ? {
          message: preset.autoIncreased
            ? "+" + preset.increment.toLocaleString("de-DE") +
              " kg automatisch: " + preset.reference.weight.toLocaleString("de-DE") +
              " → " + preset.weight.toLocaleString("de-DE") +
              " kg. Bei Bedarf an Technik/RIR anpassen."
            : "",
          newWeight: preset.autoIncreased ? preset.weight : null,
          autoIncreased: preset.autoIncreased,
        }
      : deload
        ? { message: "", newWeight: null, autoIncreased: false }
        : getProgressionData(ex, exPrevLogs, exPrevPrevLogs, prevWeight);

    // Bestimme das Gewicht: Wenn schon was gespeichert ist, nimm das.
    // Wenn nicht, und wir eine Progression errechnet haben, nimm das neue Gewicht.
    // Ansonsten nimm das Gewicht der Vorwoche oder das Startgewicht.
    const savedWeight = viewPlan === "archive" ? (exLogs[0]?.weight_kg ?? "") : preset ? preset.weight :
      exLogs.length > 0
        ? exLogs[0].weight_kg
        : progData.newWeight !== null
          ? progData.newWeight
          : prevWeight;
    const defaultRepValue = Array.isArray(ex.repRange) ? ex.repRange[1] : "";
    const repVals = viewPlan === "archive"
      ? Array.from({length: effectiveSets}, (_, i) => exLogs.find(log => log.set_number === i + 1)?.reps ?? "")
      : preset ? preset.reps :
      exLogs.length > 0
        ? exLogs.map((l) => l.reps)
        : Array(effectiveSets).fill(defaultRepValue);

    const adviceHtml = progData.message
      ? `<div class="progression-badge ${progData.autoIncreased ? "auto-increased" : ""}" style="margin-top: 4px; display: inline-block;">${progData.message}</div>`
      : "";

    const imageHtml = ex.imageUrl
      ? `<img src="${ex.imageUrl}" alt="${ex.name}">`
      : '<div class="placeholder-img">📷</div>';

    const setsLabel = deload
      ? `${effectiveSets} Sätze <span style="color: var(--warning); font-size: 0.7rem;">(${ex.sets} normal)</span>`
      : `${ex.sets} Sätze`;

    card.innerHTML = `
            <div class="exercise-img">
                ${imageHtml}
            </div>
            <div class="exercise-info">
                <div class="exercise-header" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; width: 100%;">
                        <h3>${exIdx + 1}. ${ex.name}</h3>
                        <small>${setsLabel}</small>
                    </div>
                    ${adviceHtml}
                </div>
                <div class="progression-zone" id="prog-${exIdx}"></div>
                <div class="input-group">
                    <div class="weight-wrapper">
                        ${ex.isBW ? '<label class="bw-label">BW +</label>' : "<label></label>"}
                        <input type="number" class="weight-input" value="${savedWeight}" step="0.25" min="0" data-ex-idx="${exIdx}">
                        <span style="font-size: 0.9rem; color: var(--text-muted);">kg</span>
                    </div>
                    <div class="sets-wrapper">
                        <div class="rir-label">RIR ${ex.rir}</div>
                        <div class="set-inputs">
                            ${Array.from({ length: effectiveSets })
                              .map((_, i) => {
                                const targetText = ex.targets
                                  ? ex.targets[i]
                                  : ex.repRange === "amrap"
                                    ? "AMRAP"
                                    : `${ex.repRange[0]}-${ex.repRange[1]}`;
                                return `
                                <div class="set-col">
                                    <input type="number" class="rep-input" placeholder="S${i + 1}" value="${repVals[i] || ""}" min="0" data-set="${i}" data-ex-idx="${exIdx}">
                                    <span class="rep-target">${targetText}</span>
                                </div>
                                `;
                              })
                              .join("")}
                        </div>
                    </div>
                </div>
                ${ex.note ? `<div class="exercise-note">💡 ${ex.note}</div>` : ""}
            </div>
        `;
    if (preset) {
      card.dataset.weightSource = preset.source;
      const note = document.createElement("div");
      note.className = "baseline-note";
      if (preset.reference) {
        const reference = preset.reference;
        const date = reference.date
          ? new Date(reference.date + "T12:00:00").toLocaleDateString("de-DE") : "";
        const label = preset.source === "previous" || preset.source === "saved"
          ? "Letzte Referenz" : "Startwert aus bisherigem Verlauf";
        note.textContent = label + ": " + reference.weight + " kg" +
          (date ? " (" + date + ")" : "") +
          ". Damals: " + reference.reps.join(" / ") +
          " Wdh. Neue Wiederholungen erst nach dem Training eintragen.";
      } else {
        note.textContent = preset.source === "saved"
          ? "Gespeicherte Werte dieser Einheit."
          : "Kein passender Verlauf: Gewicht vor dem Training festlegen.";
      }
      card.querySelector(".exercise-info").appendChild(note);
    }
    if (viewPlan === "archive") {
      card.querySelectorAll("input").forEach(input => input.disabled = true);
    }
    container.appendChild(card);
  });

  setSessionActionsEnabled(true);
  renderHistory(dayKey);
}

// Lade letzte trainierte Session VOR der angegebenen Woche (nicht nur week-1)
async function loadPreviousSessionData(week, dayKey) {
  if (week <= 1) return null;

  try {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("id, week_number, set_logs(*)")
      .eq("day_key", dayKey)
      .lt("week_number", week)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Previous session fetch error:", error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn("Previous session unavailable:", err.message);
    return null;
  }
}

// ============================================
// SUPABASE OPERATIONS
// ============================================
async function loadSavedSession(week, day) {
  if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.warn("⚠️ Supabase not configured. Using local-only mode.");
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("id, week_number, set_logs(*)")
      .eq("week_number", week)
      .eq("day_key", day)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Supabase fetch error:", error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn("Supabase unavailable:", err.message);
    return null;
  }
}

async function saveSession() {
  if (currentPlan === "archive" || savingSession) return;
  if (isCardioDay(currentDay)) return saveCardioSession();

  const grid = document.getElementById("exerciseGrid");
  if (grid.dataset.plan !== currentPlan || grid.dataset.day !== currentDay ||
      Number(grid.dataset.week) !== currentWeek) return;
  const savePlan = currentPlan;
  const saveDay = currentDay;
  const saveWeek = currentWeek;
  const cards = [...document.querySelectorAll(".exercise-card")];
  const exercises = activeDays()[saveDay].exercises;
  const logs = [];
  try {
    cards.forEach((card, index) => {
      const input = card.querySelector(".weight-input");
      const weight = Number(input.value);
      if (input.value === "" || !Number.isFinite(weight) || weight < 0) {
        throw new Error("Gueltiges Gewicht fuer " + exercises[index].name + " eintragen.");
      }
      card.querySelectorAll(".rep-input").forEach((input, setIndex) => {
        if (input.value === "") return;
        const reps = Number(input.value);
        if (!Number.isInteger(reps) || reps < 0) {
          throw new Error("Gueltige Wiederholungen fuer " + exercises[index].name + " eintragen.");
        }
        if (reps > 0 || (savePlan !== "classic" && weight > 0)) {
          logs.push({
            exercise_name: exercises[index].name,
            set_number: setIndex + 1, weight_kg: weight, reps,
          });
        }
      });
    });
    if (!logs.length) {
      alert("Noch keine Saetze eingetragen. Referenzgewichte allein werden nicht als Training gespeichert.");
      return;
    }
  } catch (error) {
    alert(error.message);
    return;
  }

  savingSession = true;
  setSessionActionsEnabled(false);
  let newSessionId = null;
  let logsInserted = false;
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing, error: findError } = await supabaseClient
      .from("sessions").select("id")
      .eq("week_number", saveWeek).eq("day_key", saveDay)
      .order("created_at", { ascending: true });
    if (findError) throw findError;
    if (existing?.length) {
      sessionId = existing[0].id;
    } else {
      const { data, error } = await supabaseClient.from("sessions")
        .insert({ week_number: saveWeek, day_key: saveDay, date: today })
        .select().single();
      if (error) throw error;
      sessionId = data.id;
      newSessionId = data.id;
    }
    const { data: oldLogs, error: oldError } = await supabaseClient
      .from("set_logs").select("id").eq("session_id", sessionId);
    if (oldError) throw oldError;
    // Insert before replacing existing logs so a failed insert cannot erase history.
    const { error: insertError } = await supabaseClient.from("set_logs")
      .insert(logs.map(log => ({ ...log, session_id: sessionId })));
    if (insertError) throw insertError;
    logsInserted = true;
    if (oldLogs?.length) {
      const { error } = await supabaseClient.from("set_logs").delete()
        .eq("session_id", sessionId).in("id", oldLogs.map(log => log.id));
      if (error) throw error;
    }
    const { error: dateError } = await supabaseClient.from("sessions")
      .update({ date: today }).eq("id", sessionId);
    if (dateError) throw dateError;

    if (savePlan === currentPlan && saveDay === currentDay && saveWeek === currentWeek) {
      const previous = await loadPreviousSessionData(saveWeek, saveDay);
      cards.forEach((card, index) => {
        if (isDeloadWeek(saveWeek)) return;
        const ex = exercises[index];
        checkProgression(card, index, ex,
          [...card.querySelectorAll(".rep-input")].map(input => Number(input.value) || 0),
          (previous?.set_logs || []).filter(log => log.exercise_name === ex.name));
      });
      await loadWeekTracker();
      await renderHistory(saveDay);
    }
    alert("Session erfolgreich gespeichert!");
  } catch (error) {
    if (newSessionId && !logsInserted) {
      const { error: cleanupError } = await supabaseClient.from("sessions").delete().eq("id", newSessionId);
      if (cleanupError) console.warn("Leere Session konnte nicht entfernt werden:", cleanupError.message);
    }
    console.error("Save error:", error);
    alert("Fehler beim Speichern: " + error.message);
  } finally {
    savingSession = false;
    setSessionActionsEnabled(true);
  }
}

// ============================================
// SKIP DAY
// ============================================
async function skipDay() {
  if (currentPlan === "archive" || savingSession) return;
  const confirmed = confirm(
    dayLabel(currentDay) + " (Woche " + currentWeek + ") als uebersprungen markieren?"
  );
  if (!confirmed) return;
  const day = currentDay;
  const week = currentWeek;
  savingSession = true;
  setSessionActionsEnabled(false);
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing, error: findError } = await supabaseClient
      .from("sessions").select("id")
      .eq("week_number", week).eq("day_key", day);
    if (findError) throw findError;
    if (!existing?.length) {
      const { error } = await supabaseClient.from("sessions")
        .insert({ week_number: week, day_key: day, date: today });
      if (error) throw error;
    }
    await loadWeekTracker();
    await autoNavigateToNextSession();
    renderDayTitle();
    await renderDay(currentDay);
  } catch (error) {
    alert("Fehler beim Ueberspringen: " + error.message);
  } finally {
    savingSession = false;
    setSessionActionsEnabled(true);
  }
}

// ============================================
// DOUBLE PROGRESSION LOGIC
// ============================================
function checkProgression(card, cardIdx, ex, reps, prevExLogs = []) {
  const badgeZone = card.querySelector(`#prog-${cardIdx}`);
  badgeZone.innerHTML = "";
  if (currentPlan === "classic") {
    const weight = Number(card.querySelector(".weight-input").value);
    const logs = reps.map((reps, i) => ({
      set_number: i + 1, reps, weight_kg: weight,
    }));
    if (StrengthPlan.canProgress(ex, logs)) {
      badgeZone.textContent = "Rep-Ziel erreicht. Naechste passende Einheit automatisch +" +
        StrengthPlan.progressionStep(ex).toLocaleString("de-DE") +
        " kg (ausser Deload). Bei Bedarf an Technik/RIR anpassen.";
    }
    return;
  }

  let message = "";

  if (ex.repRange === "amrap") {
    let improved = false;

    // Prüfe, ob in der Vorwoche Logs existierten
    if (prevExLogs && prevExLogs.length > 0) {
      // Check ob ALLE Sätze >= Vorwoche + 2 sind
      let allSetsImproved = reps.length > 0; // Gehe davon aus, dass wir Sätze haben
      for (let i = 0; i < reps.length; i++) {
        const currentRep = reps[i];
        const prevRepLog = prevExLogs.find((l) => l.set_number === i + 1);
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
    if (reps.length > 0 && reps.every((r) => r > 0 && r >= target)) {
      const inc = ex.bodyPart === "upper" ? "1,25" : "2,5";
      message = `✅ Gewicht erhöhen: +${inc} kg`;
    }
  }

  if (message) {
    const badge = document.createElement("span");
    badge.className = "progression-badge";
    badge.innerHTML = message;
    badgeZone.appendChild(badge);
  }
}

function getProgressionData(ex, prevLogs, prevPrevLogs, prevWeight) {
  if (!prevLogs || prevLogs.length === 0)
    return { message: "", newWeight: null, autoIncreased: false };

  let message = "";
  let newWeight = null;
  let autoIncreased = false;
  const reps = prevLogs.map((l) => l.reps);

  if (ex.repRange === "amrap") {
    let improved = false;
    if (prevPrevLogs && prevPrevLogs.length > 0) {
      let allSetsImproved = reps.length > 0;
      for (let i = 0; i < reps.length; i++) {
        const currentRep = reps[i];
        const prevRepLog = prevPrevLogs.find((l) => l.set_number === i + 1);
        const prevRepCount = prevRepLog ? prevRepLog.reps : 0;
        if (currentRep < prevRepCount + 2) {
          allSetsImproved = false;
          break;
        }
      }
      improved = allSetsImproved;
    }

    if (improved) {
      newWeight = prevWeight + 2.5;
      autoIncreased = true;
      message = "✅ Ziel erreicht! Automatisches +2,5 kg";
    } else {
      message = `💡 Vorwoche: ${reps.join(", ")} Reps`;
    }
  } else {
    const target = ex.repRange[1];
    if (reps.length > 0 && reps.every((r) => r > 0 && r >= target)) {
      const inc = ex.bodyPart === "upper" ? 1.25 : 2.5;
      newWeight = prevWeight + inc;
      autoIncreased = true;
      message = `✅ +${inc} kg automatisch erhöht!`;
    } else {
      message = `💡 Vorwoche: ${reps.join(", ")} Reps (Ziel: ${target})`;
    }
  }

  return { message, newWeight, autoIncreased };
}

// ============================================
// HISTORY (Verlauf)
// ============================================
async function renderHistory(dayKey) {
  const version = dayRenderVersion;
  const isCurrent = () => version === dayRenderVersion && dayKey === currentDay;
  const historySection = document.getElementById("historySection");
  const historyTitle = document.getElementById("historyDayTitle");
  const historyContent = document.getElementById("historyContent");

  if (!historySection) return;

  historyTitle.textContent = `${dayShort(dayKey)} (${activeDays()[dayKey].title})`;
  historyContent.innerHTML =
    '<div class="loading" style="padding: 20px;">Lade Verlauf...</div>';
  historySection.style.display = "block";

  try {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("week_number, date, set_logs(*)")
      .eq("day_key", dayKey)
      .order("week_number", { ascending: false });

    if (!isCurrent()) return;
    if (error) {
      historyContent.innerHTML =
        '<div class="error">Verlauf konnte nicht geladen werden.</div>';
      return;
    }

    if (!data || data.length === 0) {
      historyContent.innerHTML =
        '<div class="empty" style="color: var(--text-muted);">Noch keine Einträge vorhanden.</div>';
      return;
    }

    let html = "";
    data.forEach((session) => {
      const dateStr = session.date
        ? new Date(session.date).toLocaleDateString("de-DE")
        : "Unbekanntes Datum";

      let exercisesHtml = "";

      if (session.set_logs.length === 0) {
        exercisesHtml =
          '<span style="color: var(--text-muted); font-style: italic;">⏭ Übersprungen</span>';
      } else if (isCardioDay(dayKey)) {
        // Lauf-Verlauf: Distanz/Dauer/HF/RPE statt Gewicht & Reps
        exercisesHtml = cardioHistoryRowHtml(session);
      } else {
        // Übungen gruppieren
        const groupedLogs = {};
        session.set_logs.forEach((log) => {
          if (!groupedLogs[log.exercise_name])
            groupedLogs[log.exercise_name] = [];
          groupedLogs[log.exercise_name].push(log);
        });

        const exNames = Object.keys(groupedLogs);
        exNames.forEach((exName) => {
          const logs = groupedLogs[exName].sort(
            (a, b) => a.set_number - b.set_number,
          );
          const weight = logs[0].weight_kg;
          const repsStr = logs.map((l) => l.reps).join(", ");
          exercisesHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 6px 0;">
                        <span style="font-weight: 600; font-size: 0.95rem;">${exName}</span>
                        <span style="color: var(--accent); white-space: nowrap;">${weight} kg <span style="color: #aaa; font-size: 0.85rem;">(${repsStr} Reps)</span></span>
                    </div>
                `;
        });
      }

      html += `
                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="color: #fff;">Woche ${session.week_number}</strong>
                        <small style="color: var(--text-muted);">${dateStr}</small>
                    </div>
                    ${exercisesHtml}
                </div>
            `;
    });

    historyContent.innerHTML = html;
  } catch (e) {
    if (!isCurrent()) return;
    historyContent.innerHTML =
      '<div class="error">Fehler beim Laden des Verlaufs.</div>';
  }
}

// ============================================
// SUPPLEMENTS (localStorage)
// ============================================
function initSupps() {
  const container = document.getElementById("suppsContainer");
  const saved = JSON.parse(localStorage.getItem("supps_log") || "{}");
  const today = new Date().toISOString().split("T")[0];

  Object.entries(SUPPLEMENTS).forEach(([time, list]) => {
    const div = document.createElement("div");
    div.className = "supp-section";
    div.innerHTML = `<strong>${time}</strong>`;

    list.forEach((s) => {
      const id = `supp-${s.replace(/\s/g, "-")}`;
      const isChecked = saved[today]?.[id] ? "checked" : "";
      const label = document.createElement("label");
      label.className = "supp-item";
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
  const today = new Date().toISOString().split("T")[0];
  const saved = JSON.parse(localStorage.getItem("supps_log") || "{}");
  if (!saved[today]) saved[today] = {};
  saved[today][id] = document.getElementById(id).checked;
  localStorage.setItem("supps_log", JSON.stringify(saved));
};

// ============================================
// RECOVERY CHECK MODAL
// ============================================
function initRecoveryChecklist() {
  const recList = document.getElementById("recoveryChecklist");
  recList.innerHTML = "";
  RECOVERY_ITEMS.forEach((item) => {
    const label = document.createElement("label");
    label.className = "recovery-item";
    label.innerHTML = `<input type="checkbox"> ${item}`;
    recList.appendChild(label);
  });
}

function evaluateRecovery() {
  const checks = document.querySelectorAll(
    "#recoveryChecklist input:checked",
  ).length;
  const box = document.getElementById("recoveryFeedback");

  let bgColor, textColor, message;

  if (checks <= 1) {
    bgColor = "var(--success)";
    textColor = "#000";
    message = "✅ Alles im grünen Bereich. Keep going!";
  } else if (checks <= 3) {
    bgColor = "var(--warning)";
    textColor = "#000";
    message =
      "⚠️ <strong>Stufe 1:</strong> 1 Woche Deload (50% Volumen, RIR 4+), Defizit 300 kcal, Schlaf 9h+";
  } else {
    bgColor = "var(--danger)";
    textColor = "#fff";
    message =
      "🚨 <strong>Stufe 2:</strong> 1 Woche Pause. Maintenance-Kalorien, Stressoren fixen, Restart mit 60% Volumen";
  }

  box.style.background = bgColor;
  box.style.color = textColor;
  box.innerHTML = message;
  box.style.display = "block";
}

// ============================================
// WEEK TRACKER (visuelle Übersicht)
// ============================================
async function loadWeekTracker() {
  const tracker = document.getElementById("weekTracker");
  if (!tracker || !SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") return;
  const week = currentWeek;
  const plan = currentPlan;
  const days = activeDays();
  const dayKeys = Object.keys(days);
  const isCurrent = () => week === currentWeek && plan === currentPlan;
  try {
    const { data, error } = await supabaseClient.from("sessions")
      .select("day_key").eq("week_number", week).in("day_key", dayKeys);
    if (!isCurrent()) return;
    if (error) throw error;
    const completed = new Set((data || []).map(session => session.day_key));
    const label = document.createElement("div");
    label.className = "tracker-label";
    label.textContent = "Woche " + week + ": ";
    tracker.replaceChildren(label);
    dayKeys.forEach(day => {
      const badge = document.createElement("span");
      badge.className = "tracker-day " + (completed.has(day) ? "done" : "pending");
      badge.textContent = days[day].dayName || day.toUpperCase();
      tracker.appendChild(badge);
    });
  } catch (error) {
    if (isCurrent()) tracker.textContent = "Wochenstatus konnte nicht geladen werden.";
    console.warn("Week tracker load failed:", error.message);
  }
}

// Recovery Modal einmal initialisieren
document.addEventListener("DOMContentLoaded", () => {
  initRecoveryChecklist();
});
