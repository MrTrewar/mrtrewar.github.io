/**
 * GymProgress Pro – Hybrid Edition (Concurrent Training: Kraft + Laufen)
 *
 * Pragmatisches 3+3-Modell (Mo–Sa, Sonntag frei) für einen Kraftsportler im
 * Defizit, der verletzungsfrei ins Laufen einsteigt:
 *
 *   Mo  Upper Strength      (Kraft)
 *   Di  Easy Run            (Zone 2 + Strides)
 *   Mi  Lower Athletic      (Kraft, läuferspezifisch)
 *   Do  Easy Run + Strides  (Zone 2 + Strides)
 *   Fr  Full Body / Pump    (Kraft, geringer System-Stress)
 *   Sa  Long Easy Run       (Zone 2, Wochen-Peak)
 *
 * 3 Krafttage halten die Reizfrequenz hoch genug, um Muskelmasse im Defizit zu
 * schützen; alle Läufe bleiben strikt aerob (Talk-Test). Der alte 4er-Split
 * (TRAINING_PLAN in app.js) bleibt vollständig erhalten und ist per
 * Plan-Umschalter wählbar.
 *
 * WICHTIG – day_keys: Die Hybrid-Tage tragen die Keys hmo/hdi/hmi/hdo/hfr/hsa.
 * Sie sind bewusst disjunkt zu den Classic-Keys (mo/di/do/fr), damit sich beide
 * Pläne gefahrlos dieselbe Supabase-Tabelle teilen und keine Daten kollidieren.
 * Angezeigt werden trotzdem die Wochentage (dayName: "Mo", "Di", …).
 */

// ============================================
// HYBRID-TRAININGSPLAN (3 Kraft + 3 Lauf)
// ============================================
const HYBRID_PLAN = {
  label: "Hybrid – Kraft + Laufen",
  days: {
    hmo: {
      type: "strength",
      dayName: "Mo",
      navLabel: "Upper Strength",
      title: "Upper Strength – Maximalkraft Oberkörper",
      duration: "45–50 Min",
      sets: 12,
      exercises: [
        {
          name: "Barbell Bench Press",
          sets: 3,
          repRange: [5, 8],
          rir: "2",
          startWeight: 20,
          bodyPart: "upper",
          imageUrl: "assets/images/pixel_bench_press.png",
        },
        {
          name: "Weighted Pull-Ups",
          sets: 3,
          repRange: [6, 8],
          rir: "2",
          startWeight: 0,
          bodyPart: "upper",
          isBW: true,
          imageUrl: "assets/images/pixel_pull_up.png",
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
          repRange: [12, 15],
          rir: "1",
          startWeight: 4,
          bodyPart: "upper",
          imageUrl: "assets/images/pixel_lateral_raise.png",
        },
      ],
    },
    hdi: {
      type: "cardio",
      dayName: "Di",
      navLabel: "Easy Run",
      title: "Easy Run – Zone 2 + Strides",
      runKey: "run1",
    },
    hmi: {
      type: "strength",
      dayName: "Mi",
      navLabel: "Lower Athletic",
      title: "Lower Athletic – läuferspezifisches Beintraining",
      duration: "45–50 Min",
      sets: 14,
      exercises: [
        {
          name: "Romanian Deadlift",
          sets: 3,
          repRange: [6, 8],
          rir: "2",
          startWeight: 10,
          bodyPart: "lower",
          imageUrl: "assets/images/pixel_rdl.png",
          note: "exzentrisch kontrolliert – Hamstrings für die Schwungphase",
        },
        {
          name: "Bulgarian Split Squat (DB)",
          sets: 3,
          repRange: [8, 10],
          rir: "2",
          startWeight: 10,
          bodyPart: "lower",
          note: "pro Bein – Becken stabil (Gluteus medius)",
        },
        {
          name: "Seated Leg Curl",
          sets: 2,
          repRange: [10, 12],
          rir: "2",
          startWeight: 27.5,
          bodyPart: "lower",
          imageUrl: "assets/images/pixel_leg_curl.png",
          note: "geführt, schont den unteren Rücken",
        },
        {
          name: "Sitzendes Wadenheben (Soleus)",
          sets: 3,
          repRange: [15, 20],
          rir: "1",
          startWeight: 27.5,
          bodyPart: "lower",
          imageUrl: "assets/images/pixel_calf_raise.png",
          note: "Knie 90° – 2 Sek Dehnung unten",
        },
        {
          name: "Tibialis Anterior Raise",
          sets: 3,
          repRange: [15, 20],
          rir: "1",
          startWeight: 0,
          bodyPart: "lower",
          isBW: true,
          note: "Shin-Splints-Prävention, exzentrisch langsam",
        },
      ],
    },
    hdo: {
      type: "cardio",
      dayName: "Do",
      navLabel: "Easy + Strides",
      title: "Easy Run + Strides – Zone 2",
      runKey: "run2",
    },
    hfr: {
      type: "strength",
      dayName: "Fr",
      navLabel: "Upper Pump",
      title: "Full Body / Upper Pump – Optik & Reaktivität",
      duration: "40–45 Min",
      sets: 14,
      exercises: [
        {
          name: "Incline Dumbbell Press",
          sets: 3,
          repRange: [8, 10],
          rir: "1",
          startWeight: 15,
          bodyPart: "upper",
          imageUrl: "assets/images/pixel_incline_bench.png",
        },
        {
          name: "Seated Cable Row",
          sets: 3,
          repRange: [10, 12],
          rir: "1",
          startWeight: 20,
          bodyPart: "upper",
          imageUrl: "assets/images/pixel_cable_row.png",
        },
        {
          name: "Pogo Hops (Reaktivkraft)",
          sets: 3,
          repRange: "amrap",
          rir: "–",
          startWeight: 0,
          bodyPart: "lower",
          isBW: true,
          note: "20–30 Kontakte, Knie fast gestreckt – Achillessehnen-Stiffness",
        },
        {
          name: "Stehendes Wadenheben",
          sets: 2,
          repRange: [12, 15],
          rir: "1",
          startWeight: 0,
          bodyPart: "lower",
          imageUrl: "assets/images/pixel_calf_raise.png",
          note: "Gastrocnemius",
        },
        {
          name: "Plank mit Shoulder Taps",
          sets: 3,
          repRange: "amrap",
          rir: "–",
          startWeight: 0,
          bodyPart: "lower",
          isBW: true,
          imageUrl: "assets/images/pixel_plank.png",
          note: "45–60 Sek halten (Sek eintragen), antirotatorisch",
        },
      ],
    },
    hsa: {
      type: "cardio",
      dayName: "Sa",
      navLabel: "Long Run",
      title: "Long Easy Run – aerobes Fundament",
      runKey: "run3",
    },
  },
};

// ============================================
// 12-WOCHEN-LAUFPROGRESSION (sanft, Zone-2-dominant)
//
// Bewusst KEINE harten Intervalle/Fartlek in den frühen Wochen: Herz-Kreislauf
// passt sich in Wochen an, Sehnen/Bänder/Knochen brauchen Monate. Alle Läufe
// im Sprechtempo (Zone 2), neuromuskulärer Reiz nur über kurze Strides (100 m).
// Steuerung über den Talk-Test; das ACWR ist nur ein visueller Indikator –
// zwickt die Sehne, wird reduziert, egal was die Zahl sagt.
// (run1=Di Easy, run2=Do Easy+Strides, run3=Sa Long Run)
// ============================================
const RUN_PLAN_12W = [
  {
    week: 1,
    run1: "Easy Zone 2: 25 Min (Sprechtempo) + 4× Strides (100 m)",
    run2: "Easy Zone 2: 25 Min + 4× Strides",
    run3: "Long Run Zone 2: 35 Min locker",
    km: 14,
    acwr: "1,00",
    focus: "Talk-Test, Sprunggelenk/Fuß an Stöße gewöhnen",
  },
  {
    week: 2,
    run1: "Easy Zone 2: 30 Min + 4× Strides",
    run2: "Easy Zone 2: 30 Min + 5× Strides",
    run3: "Long Run Zone 2: 40 Min",
    km: 17,
    acwr: "1,15",
    focus: "Aufrechte Haltung bei einsetzender Ermüdung",
  },
  {
    week: 3,
    run1: "Easy Zone 2: 30 Min + 5× Strides",
    run2: "Easy Zone 2: 35 Min + 5× Strides",
    run3: "Long Run Zone 2: 45 Min",
    km: 18,
    acwr: "1,10",
    focus: "Grundlagenausdauer festigen, strikt aerob",
  },
  {
    week: 4,
    run1: "Easy Zone 2: 25 Min + 4× Strides",
    run2: "Easy Zone 2: 25 Min + 4× Strides",
    run3: "Long Run Zone 2: 35 Min",
    km: 14,
    acwr: "0,78",
    focus: "Deload – Sehnen, Bänder & Knochen anpassen lassen",
  },
  {
    week: 5,
    run1: "Easy Zone 2: 35 Min + 5× Strides",
    run2: "Easy Zone 2: 35 Min + 5× Strides",
    run3: "Long Run Zone 2: 50 Min",
    km: 20,
    acwr: "1,20",
    focus: "Aerobe Kapazität ausbauen – PFPS-Monitoring",
  },
  {
    week: 6,
    run1: "Easy Zone 2: 35 Min + 5× Strides",
    run2: "Easy Zone 2: 40 Min + 6× Strides",
    run3: "Long Run Zone 2: 55 Min",
    km: 22,
    acwr: "1,12",
    focus: "Long Run behutsam verlängern",
  },
  {
    week: 7,
    run1: "Easy Zone 2: 40 Min + 5× Strides",
    run2: "Easy Zone 2: 40 Min + 6× Strides",
    run3: "Long Run Zone 2: 60 Min",
    km: 23,
    acwr: "1,10",
    focus: "Volumen konsolidieren, Laufökonomie",
  },
  {
    week: 8,
    run1: "Easy Zone 2: 30 Min + 4× Strides",
    run2: "Easy Zone 2: 30 Min + 5× Strides",
    run3: "Long Run Zone 2: 45 Min",
    km: 17,
    acwr: "0,74",
    focus: "Deload – Superkompensation",
  },
  {
    week: 9,
    run1: "Easy Zone 2: 40 Min + 6× Strides",
    run2: "Easy Zone 2: 45 Min + 6× Strides",
    run3: "Long Run Zone 2: 70 Min",
    km: 26,
    acwr: "1,22",
    focus: "Long Run als Wochen-Peak, Protein hoch",
  },
  {
    week: 10,
    run1: "Easy Zone 2: 45 Min + 6× Strides",
    run2: "Easy Zone 2: 45 Min + 6× Strides",
    run3: "Long Run Zone 2: 80 Min",
    km: 28,
    acwr: "1,12",
    focus: "Mitochondriale Dichte, Fettstoffwechsel",
  },
  {
    week: 11,
    run1: "Easy Zone 2: 45 Min + 6× Strides",
    run2: "Easy Zone 2: 50 Min + 6× Strides",
    run3: "Long Run Zone 2: 90 Min",
    km: 31,
    acwr: "1,15",
    focus: "Volumen-Peak – auf Warnsignale achten",
  },
  {
    week: 12,
    run1: "Easy Zone 2: 30 Min + 4× Strides",
    run2: "Easy Zone 2: 30 Min + 4× Strides",
    run3: "Long Run Zone 2: 50 Min",
    km: 18,
    acwr: "0,60",
    focus: "Taper – akute Ermüdung abbauen",
  },
];

/** Liefert die Laufvorgaben für eine Kalenderwoche (1-basiert) oder null. */
function getRunPlanForWeek(week) {
  return RUN_PLAN_12W.find((entry) => entry.week === week) || null;
}
