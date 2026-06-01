/**
 * GymProgress Pro – Cardio- & ACWR-Modul
 *
 * Lauf-Logging (Distanz, Dauer, Herzfrequenz, RPE), Berechnung des
 * Acute-to-Chronic Workload Ratio (ACWR) und Darstellung des 12-Wochen-Laufplans.
 *
 * Greift auf window-scoped Globals zu (Reihenfolge in index.html beachten):
 *   - supabaseClient, currentWeek, currentDay, loadSavedSession, loadWeekTracker (app.js)
 *   - HYBRID_PLAN, RUN_PLAN_12W, getRunPlanForWeek (hybrid-plan.js)
 *
 * SUPABASE-MIGRATION (einmalig im SQL Editor ausführen):
 *   ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS distance_km  FLOAT;
 *   ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS duration_min FLOAT;
 *   ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS rpe          FLOAT;
 *   ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS avg_hr       INT;
 */

// ============================================
// ACWR-BERECHNUNG
// ============================================

/**
 * Acute-to-Chronic Workload Ratio.
 * Akut = Summe km der letzten 7 Tage; Chronisch = Wochenschnitt der letzten 28 Tage.
 * @returns {number|null} ACWR oder null, wenn chronische Datenbasis fehlt.
 */
function calculateACWR(runs, targetDate = new Date()) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const acuteCutoff = new Date(targetDate.getTime() - 7 * MS_PER_DAY);
  const chronicCutoff = new Date(targetDate.getTime() - 28 * MS_PER_DAY);

  const acuteWorkload = runs
    .filter((run) => run.date >= acuteCutoff && run.date <= targetDate)
    .reduce((sum, run) => sum + run.km, 0);

  const chronicTotal = runs
    .filter((run) => run.date >= chronicCutoff && run.date <= targetDate)
    .reduce((sum, run) => sum + run.km, 0);

  const chronicWeeklyAverage = chronicTotal / 4;
  if (chronicWeeklyAverage === 0) return null;

  return Math.round((acuteWorkload / chronicWeeklyAverage) * 100) / 100;
}

/** Summiert die Laufkilometer der letzten 7 Tage. */
function acuteWeeklyKm(runs, targetDate = new Date()) {
  const acuteCutoff = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  return runs
    .filter((run) => run.date >= acuteCutoff && run.date <= targetDate)
    .reduce((sum, run) => sum + run.km, 0);
}

function getACWRColor(acwr) {
  if (acwr < 0.8) return "#3182CE"; // Blau – Unterfordert
  if (acwr <= 1.3) return "#48BB78"; // Grün – Sweet Spot
  if (acwr <= 1.5) return "#ECC94B"; // Gelb – Risikobereich
  return "#F56565"; // Rot – Gefahrenzone
}

function getACWRLabel(acwr) {
  if (acwr < 0.8) return "Unterfordert";
  if (acwr <= 1.3) return "Sweet Spot";
  if (acwr <= 1.5) return "Risikobereich";
  return "Gefahrenzone";
}

/** Lädt alle Lauf-Sessions, berechnet das ACWR und rendert die Ampel im Header. */
async function computeAndRenderACWR() {
  const box = document.getElementById("acwrBox");
  if (!box) return;

  const cardioKeys = Object.keys(HYBRID_PLAN.days).filter(
    (key) => HYBRID_PLAN.days[key].type === "cardio",
  );

  try {
    const { data, error } = await supabaseClient
      .from("sessions")
      .select("date, day_key, set_logs(distance_km)")
      .in("day_key", cardioKeys);

    if (error) throw error;

    const runs = (data || [])
      .filter((session) => session.date)
      .map((session) => ({
        date: new Date(session.date),
        km: (session.set_logs || []).reduce(
          (sum, log) => sum + (log.distance_km || 0),
          0,
        ),
      }))
      .filter((run) => run.km > 0);

    const acwr = calculateACWR(runs);
    const weekKm = acuteWeeklyKm(runs);

    if (acwr === null) {
      box.innerHTML =
        '<span class="acwr-label">ACWR</span>' +
        `<span class="acwr-value">–</span>` +
        `<span class="acwr-km">${weekKm.toFixed(0)} km · noch zu wenig Daten</span>`;
      box.style.borderColor = "var(--border)";
      return;
    }

    const color = getACWRColor(acwr);
    box.innerHTML =
      '<span class="acwr-label">ACWR 7d/28d</span>' +
      `<span class="acwr-value" style="color:${color}">${acwr.toFixed(2).replace(".", ",")}</span>` +
      `<span class="acwr-status" style="background:${color}">${getACWRLabel(acwr)}</span>` +
      `<span class="acwr-km">${weekKm.toFixed(0)} km / 7 Tage</span>`;
    box.style.borderColor = color;
  } catch (err) {
    console.warn("ACWR konnte nicht berechnet werden:", err.message);
    box.innerHTML =
      '<span class="acwr-label">ACWR</span>' +
      '<span class="acwr-km">Spalte fehlt? Migration in Supabase ausführen (siehe cardio.js).</span>';
  }
}

// ============================================
// CARDIO-TAG RENDERN
// ============================================
async function renderCardioDay(dayKey, dayData) {
  const container = document.getElementById("exerciseGrid");
  container.innerHTML = '<div class="loading">Lade Laufeinheit...</div>';

  const plan = getRunPlanForWeek(currentWeek);
  const prescription = plan ? plan[dayData.runKey] : null;

  const saved = await loadSavedSession(currentWeek, dayKey);
  const log =
    saved && saved.set_logs && saved.set_logs.length > 0
      ? saved.set_logs[0]
      : null;

  const val = (value) => (value !== null && value !== undefined ? value : "");

  container.innerHTML = "";

  const prescriptionHtml = prescription
    ? `<div class="cardio-prescription"><strong>📋 Woche ${currentWeek} · Vorgabe:</strong><span>${prescription}</span></div>`
    : `<div class="cardio-prescription cardio-prescription--muted">Woche ${currentWeek} liegt außerhalb des 12-Wochen-Laufplans – freies Lauftraining.</div>`;

  const card = document.createElement("div");
  card.className = "cardio-card";
  card.innerHTML = `
        ${prescriptionHtml}
        <div class="cardio-inputs">
            <label class="cardio-field">
                <span>Distanz (km)</span>
                <input type="number" id="cardioDistance" step="0.1" min="0" value="${val(log && log.distance_km)}" placeholder="z.B. 6,5">
            </label>
            <label class="cardio-field">
                <span>Dauer (Min)</span>
                <input type="number" id="cardioDuration" step="1" min="0" value="${val(log && log.duration_min)}" placeholder="z.B. 40">
            </label>
            <label class="cardio-field">
                <span>Ø Herzfrequenz</span>
                <input type="number" id="cardioHr" step="1" min="0" value="${val(log && log.avg_hr)}" placeholder="bpm">
            </label>
            <label class="cardio-field">
                <span>RPE (1–10)</span>
                <input type="number" id="cardioRpe" step="0.5" min="1" max="10" value="${val(log && log.rpe)}" placeholder="1–10">
            </label>
        </div>
        <div class="cardio-hint">💡 Distanz wird für die ACWR-Belastungssteuerung ausgewertet.</div>
    `;
  container.appendChild(card);

  renderHistory(dayKey);
}

// ============================================
// CARDIO-SESSION SPEICHERN
// ============================================
async function saveCardioSession() {
  if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL") {
    alert("⚠️ Supabase nicht konfiguriert.");
    return;
  }

  const parseNum = (id) => {
    const raw = document.getElementById(id);
    if (!raw || raw.value === "") return null;
    const num = parseFloat(raw.value.replace(",", "."));
    return Number.isNaN(num) ? null : num;
  };

  const distanceKm = parseNum("cardioDistance");
  const durationMin = parseNum("cardioDuration");
  const avgHr = parseNum("cardioHr");
  const rpe = parseNum("cardioRpe");

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabaseClient
      .from("sessions")
      .select("id")
      .eq("week_number", currentWeek)
      .eq("day_key", currentDay)
      .order("created_at", { ascending: true });

    let cardioSessionId;
    if (existing && existing.length > 0) {
      cardioSessionId = existing[0].id;
      await supabaseClient
        .from("sessions")
        .update({ date: today })
        .eq("id", cardioSessionId);
      if (existing.length > 1) {
        await supabaseClient
          .from("sessions")
          .delete()
          .in(
            "id",
            existing.slice(1).map((s) => s.id),
          );
      }
    } else {
      const { data: created, error: sErr } = await supabaseClient
        .from("sessions")
        .insert({ week_number: currentWeek, day_key: currentDay, date: today })
        .select()
        .single();
      if (sErr) throw new Error("Session error: " + sErr.message);
      cardioSessionId = created.id;
    }

    await supabaseClient
      .from("set_logs")
      .delete()
      .eq("session_id", cardioSessionId);

    const hasData = [distanceKm, durationMin, avgHr, rpe].some(
      (v) => v !== null,
    );
    if (hasData) {
      const { error: lErr } = await supabaseClient.from("set_logs").insert({
        session_id: cardioSessionId,
        exercise_name: HYBRID_PLAN.days[currentDay].title,
        set_number: 1,
        distance_km: distanceKm,
        duration_min: durationMin,
        avg_hr: avgHr,
        rpe: rpe,
      });
      if (lErr) throw new Error("Log insert error: " + lErr.message);
    }

    alert("✅ Laufeinheit gespeichert!");
    await loadWeekTracker();
    await computeAndRenderACWR();
  } catch (err) {
    console.warn("Cardio-Save fehlgeschlagen:", err.message);
    alert(
      "❌ Fehler beim Speichern: " +
        err.message +
        "\n\nFalls eine Spalte fehlt: Migration aus cardio.js im Supabase SQL Editor ausführen.",
    );
  }
}

/** HTML-Zeile für einen gespeicherten Lauf (genutzt von renderHistory in app.js). */
function cardioHistoryRowHtml(session) {
  const log = (session.set_logs || [])[0];
  if (!log)
    return '<span style="color: var(--text-muted); font-style: italic;">⏭ Übersprungen</span>';
  const parts = [];
  if (log.distance_km != null) parts.push(`${log.distance_km} km`);
  if (log.duration_min != null) parts.push(`${log.duration_min} Min`);
  if (log.avg_hr != null) parts.push(`Ø ${log.avg_hr} bpm`);
  if (log.rpe != null) parts.push(`RPE ${String(log.rpe).replace(".", ",")}`);
  return `<div style="display:flex;justify-content:flex-end;"><span style="color: var(--accent); white-space: nowrap;">${parts.join(" · ")}</span></div>`;
}

// ============================================
// 12-WOCHEN-LAUFPLAN ANSICHT
// ============================================
function renderRunPlanTable() {
  const content = document.getElementById("runPlanContent");
  if (!content) return;

  const rows = RUN_PLAN_12W.map((entry) => {
    const active = entry.week === currentWeek ? ' class="run-plan-active"' : "";
    return `
            <tr${active}>
                <td class="rp-week">W${entry.week}</td>
                <td>${entry.run1}</td>
                <td>${entry.run2}</td>
                <td>${entry.run3}</td>
                <td class="rp-km">${entry.km} km</td>
                <td class="rp-acwr">${entry.acwr}</td>
                <td class="rp-focus">${entry.focus}</td>
            </tr>`;
  }).join("");

  content.innerHTML = `
        <table class="run-plan-table">
            <thead>
                <tr>
                    <th>Wo.</th><th>Lauf 1 (Di)</th><th>Lauf 2 (Do)</th><th>Lauf 3 (Sa)</th><th>km</th><th>ACWR</th><th>Fokus</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}
