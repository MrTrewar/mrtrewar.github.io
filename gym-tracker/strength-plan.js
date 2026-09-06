/* Versioned four-day plan and history import. No database writes on startup. */
const StrengthPlan = (() => {
  const REVISION = "strength-2026-09";
  const ALIASES = {
    "Bench Press": ["Barbell Bench Press"],
    "Pull-Up": ["Weighted Pull-Ups"],
    "RDL": ["Romanian Deadlift"],
    "Standing Calf Raise": ["Stehendes Wadenheben"],
  };

  function build(legacy) {
    const templates = new Map();
    Object.values(legacy).forEach(day => day.exercises.forEach(ex => {
      if (!templates.has(ex.name)) templates.set(ex.name, ex);
    }));
    templates.set("Standing Calf Raise", {
      name: "Standing Calf Raise", bodyPart: "lower", startWeight: 0,
      imageUrl: "assets/images/pixel_calf_raise.png",
    });
    function exercise(name, sets, repRange, rir = "1-2", note) {
      const original = templates.get(name);
      if (!original) throw new Error("Missing exercise template: " + name);
      return { ...original, sets, repRange, rir, note: note || "" };
    }
    function day(dayName, label, title, exercises) {
      return {
        dayName, navLabel: dayName + " (" + label + ")", title,
        duration: "65-85 Min", sets: exercises.reduce((n, ex) => n + ex.sets, 0),
        exercises,
      };
    }
    return {
      c2mo: day("Mo", "Upper A", "Oberkoerper A - Kraft + Muskelaufbau", [
        exercise("Bench Press", 3, [3, 5], "2", "Schwerer Tag. Aufwaermen; sichere Ablage oder Spotter."),
        exercise("Pull-Up", 3, [5, 8], "1-2", "Zusatzgewicht wie bisher. Bei Bedarf Unterstuetzung nutzen."),
        exercise("T-Bar Row", 3, [6, 10], "1-2", "Moeglichst brustgestuetzt; gleiche Maschine und Gewichtszaehlung wie bisher."),
        exercise("Machine Pec Deck", 2, [10, 15]),
        exercise("Lateral Raise (DB)", 3, [12, 20]),
        exercise("Bayesian Cable Curl", 2, [10, 15]),
        exercise("Triceps Pushdown", 2, [8, 12]),
      ]),
      c2di: day("Di", "Lower A", "Unterkoerper A - Kniebeugen + hintere Kette", [
        exercise("Squat", 3, [3, 5], "2", "Schwerer Tag. Aufwaermen und Sicherheitsablagen verwenden."),
        exercise("RDL", 2, [6, 10], "2", "Kontrollierte Ausfuehrung; gleiche Gewichtszaehlung wie bisher."),
        exercise("Seated Leg Curl", 3, [10, 15]),
        exercise("Nautilus Glute Drive", 2, [8, 12]),
        exercise("Standing Calf Raise", 3, [8, 15]),
        exercise("Cable Crunch", 3, [10, 15]),
      ]),
      c2do: day("Do", "Upper B", "Oberkoerper B - Bankdruecken moderat + Muskelaufbau", [
        exercise("Bench Press", 3, [6, 8], "2", "Moderater Tag. Historisches Gewicht ist eine Referenz; passend zu Wiederholungen/RIR anpassen. Getrennt von Montag steigern."),
        exercise("Incline Bench Press", 2, [8, 12]),
        exercise("Seated Cable Row", 3, [8, 12]),
        exercise("Machine Lat Pullover", 2, [10, 15]),
        exercise("Lateral Raise (DB/Cable)", 3, [12, 20], "1-2", "Gleiche Variante wie bisher verwenden. Kurzhantel- und Kabelgewichte nicht gleichsetzen."),
        exercise("Reverse Pec Deck", 3, [12, 20]),
        exercise("OH Cable Triceps Extension", 2, [10, 15]),
        exercise("Preacher Curl", 2, [10, 15]),
      ]),
      c2fr: day("Fr", "Lower B", "Unterkoerper B - Trap Bar + Beinarbeit", [
        exercise("Trap Bar Deadlift", 3, [3, 5], "2"),
        exercise("Squat", 2, [6, 8], "3", "Leichter als Dienstag. Uebernommenes Referenzgewicht bei Bedarf reduzieren; keine Wiederholungen erzwingen."),
        exercise("Leg Press", 2, [10, 15]),
        exercise("Leg Extension", 2, [12, 20]),
        exercise("Seated Leg Curl", 2, [10, 15]),
        exercise("Standing Calf Raise", 3, [10, 20]),
        exercise("Hanging Leg Raises", 2, [8, 15]),
      ]),
    };
  }

  function validLog(log) {
    return log.weight_kg !== null && log.weight_kg !== undefined &&
      log.weight_kg !== "" && Number.isFinite(Number(log.weight_kg)) &&
      Number(log.weight_kg) >= 0 &&
      (Number(log.reps) > 0 || Number(log.weight_kg) > 0);
  }

  function logsFor(session, name, aliases = false) {
    const names = [name, ...(aliases ? ALIASES[name] || [] : [])];
    return (session?.set_logs || []).filter(log =>
      names.includes(log.exercise_name) && validLog(log)
    ).sort((a, b) => a.set_number - b.set_number);
  }

  function timestamp(value) {
    const result = Date.parse(value || "");
    return Number.isFinite(result) ? result : 0;
  }

  function latestLog(logs) {
    return [...logs].sort((a, b) =>
      timestamp(b.created_at) - timestamp(a.created_at) ||
      Number(b.set_number || 0) - Number(a.set_number || 0)
    )[0];
  }

  function lastRecorded(sessions, name) {
    const candidates = sessions.map(session => {
      const logs = logsFor(session, name, true);
      return { session, logs, log: latestLog(logs) };
    }).filter(item => item.log);
    candidates.sort((a, b) =>
      timestamp(b.session.date) - timestamp(a.session.date) ||
      timestamp(b.log.created_at || b.session.created_at) -
        timestamp(a.log.created_at || a.session.created_at) ||
      timestamp(b.session.created_at) - timestamp(a.session.created_at)
    );
    return candidates[0] || null;
  }

  async function loadSessions(client, dayKeys) {
    const rows = [];
    const pageSize = 250;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from("sessions")
        .select("id, week_number, day_key, date, created_at, set_logs(exercise_name, set_number, weight_kg, reps, created_at)")
        .in("day_key", dayKeys)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message || "Trainingsdaten konnten nicht geladen werden.");
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  }

  function canProgress(ex, logs) {
    if (!Array.isArray(ex.repRange) || logs.length !== ex.sets) return false;
    const ordered = [...logs].sort((a, b) => a.set_number - b.set_number);
    return ordered.every((log, i) =>
      validLog(log) && log.set_number === i + 1 &&
      Number(log.reps) >= ex.repRange[1] &&
      Number(log.weight_kg) === Number(ordered[0].weight_kg)
    );
  }

  function progressionStep(ex) {
    return ex.bodyPart === "upper" ? 1.25 : 2.5;
  }

  function preset(ex, daySessions, historicalSessions, week, dayKey) {
    // Only this slot may drive ongoing progression; never import a heavy day's
    // new weights into the other, lighter day.
    const sessions = daySessions.filter(s => s.day_key === dayKey)
      .sort((a, b) => b.week_number - a.week_number ||
        timestamp(a.created_at) - timestamp(b.created_at));
    const saved = sessions.find(s => s.week_number === week);
    const savedLogs = logsFor(saved, ex.name);
    const previous = sessions.filter(s => s.week_number < week)
      .find(s => logsFor(s, ex.name).length);
    const priorLogs = logsFor(previous, ex.name);
    const baseline = !priorLogs.length ? lastRecorded(historicalSessions, ex.name) : null;
    const referenceLogs = priorLogs.length ? priorLogs : baseline?.logs || [];
    const referenceLog = priorLogs.length ? latestLog(priorLogs) : baseline?.log;
    const referenceSession = priorLogs.length ? previous : baseline?.session;
    const source = savedLogs.length ? "saved" : priorLogs.length ? "previous" :
      baseline ? "history" : "default";
    const referenceWeight = referenceLog ? Number(referenceLog.weight_kg) : ex.startWeight;
    const previousGoalReached = !!previous &&
      ![4, 8, 12, 16].includes(previous.week_number) && canProgress(ex, priorLogs);
    const autoIncreased = !savedLogs.length && previousGoalReached &&
      ![4, 8, 12, 16].includes(week);
    const increment = progressionStep(ex);
    // Derive once from recorded performance, never from a previously rendered
    // suggestion. Reloading or revisiting the week cannot compound the increase.
    const weight = savedLogs.length ? Number(latestLog(savedLogs).weight_kg) :
      autoIncreased ? Math.round((referenceWeight + increment) * 100) / 100 :
        referenceWeight;
    return {
      weight, source, savedLogs, autoIncreased, increment,
      reps: Array.from({ length: ex.sets }, (_, i) =>
        savedLogs.find(log => log.set_number === i + 1)?.reps ?? ""),
      reference: referenceSession ? {
        weight: referenceWeight,
        date: referenceSession.date || "",
        week: referenceSession.week_number,
        reps: referenceLogs.map(log => log.reps),
      } : null,
      canProgress: previousGoalReached,
    };
  }

  return { REVISION, build, validLog, logsFor, lastRecorded, loadSessions, canProgress, progressionStep, preset };
})();
if (typeof module !== "undefined" && module.exports) module.exports = StrengthPlan;
