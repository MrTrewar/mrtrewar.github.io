const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const plan = require("../strength-plan.js");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const legacy = vm.runInNewContext("(" + source.split("const LEGACY_TRAINING_PLAN = ")[1].split("\n};")[0] + "\n})");
const days = plan.build(legacy);
const bench = days.c2mo.exercises[0];
function session(day, week, date, name, weight, reps = [5, 5, 5]) {
  return { id: day + week + date, day_key: day, week_number: week, date,
    created_at: date + "T08:00:00Z",
    set_logs: reps.map((rep, i) => ({
      exercise_name: name, weight_kg: weight, reps: rep, set_number: i + 1,
      created_at: date + "T09:00:00Z",
    })) };
}
test("four independent day keys, agreed set totals and unchanged legacy", () => {
  assert.deepEqual(Object.keys(days), ["c2mo", "c2di", "c2do", "c2fr"]);
  assert.deepEqual(Object.values(days).map(d => d.sets), [18, 16, 20, 16]);
  assert.equal(Object.values(days).reduce((n, d) => n + d.sets, 0), 70);
  assert.equal(legacy.mo.exercises[0].repRange[0], 5);
  assert.notEqual(days.c2mo.exercises[0], legacy.mo.exercises[0]);
  assert.equal(days.c2do.exercises[0].name, "Bench Press");
  assert.deepEqual(days.c2do.exercises[0].repRange, [6, 8]);
  assert.equal(days.c2fr.exercises[1].rir, "3");
});
test("every plan image exists", () => {
  for (const d of Object.values(days)) for (const ex of d.exercises) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", ex.imageUrl)), ex.name);
  }
});
test("latest record wins over a heavier older record and highest week", () => {
  const old = session("mo", 14, "2026-04-01", "Bench Press", 100);
  const recent = session("hmo", 1, "2026-06-01", "Barbell Bench Press", 70);
  assert.equal(plan.lastRecorded([old, recent], "Bench Press").log.weight_kg, 70);
});
test("zero kg is retained for bodyweight exercises", () => {
  const old = session("mo", 1, "2026-06-01", "Pull-Up", 0, [8, 7, 6]);
  assert.equal(plan.preset(days.c2mo.exercises[1], [], [old], 1, "c2mo").weight, 0);
});
test("latest set timestamp breaks same-day ties", () => {
  const a = session("mo", 1, "2026-06-01", "Bench Press", 50);
  const b = session("hmo", 1, "2026-06-01", "Barbell Bench Press", 55);
  b.set_logs.forEach(log => log.created_at = "2026-06-01T10:00:00Z");
  assert.equal(plan.lastRecorded([a, b], "Bench Press").log.weight_kg, 55);
});
test("invalid weights and blank bodyweight entries do not hide valid history", () => {
  const old = session("mo", 1, "2026-01-01", "Bench Press", 50);
  for (const invalid of [null, undefined, "", NaN, -10]) {
    const recent = session("mo", 2, "2026-02-01", "Bench Press", invalid);
    assert.equal(plan.lastRecorded([old, recent], "Bench Press").log.weight_kg, 50);
  }
  assert.equal(plan.validLog({ weight_kg: 0, reps: 0 }), false);
  assert.equal(plan.validLog({ weight_kg: 20, reps: 0 }), true);
});
test("machine/DB/cable variants are not implicitly merged", () => {
  const logs = [
    session("hfr", 1, "2026-06-01", "Incline Dumbbell Press", 30),
    session("fr", 1, "2026-06-01", "Cable Lateral Raise (Behind-Back)", 10),
  ];
  assert.equal(plan.lastRecorded(logs, "Incline Bench Press"), null);
  assert.equal(plan.lastRecorded(logs, "Lateral Raise (DB)"), null);
});
test("safe standing-calf alias imports history but seated calf does not", () => {
  const standing = session("hfr", 1, "2026-06-01", "Stehendes Wadenheben", 0, [15]);
  const seated = session("hmi", 2, "2026-06-02", "Sitzendes Wadenheben (Soleus)", 60, [15]);
  assert.equal(plan.lastRecorded([standing, seated], "Standing Calf Raise").log.weight_kg, 0);
});
test("week one imports weights across old days without logging reps or progressing", () => {
  const old = session("mo", 14, "2026-06-01", "Bench Press", 70, [8, 8, 8]);
  const result = plan.preset(bench, [], [old], 1, "c2mo");
  assert.equal(result.source, "history");
  assert.equal(result.weight, 70);
  assert.deepEqual(result.reps, ["", "", ""]);
  assert.equal(result.canProgress, false);
  assert.deepEqual(result.reference.reps, [8, 8, 8]);
});
test("unknown exercises fall back explicitly to configured start weight", () => {
  const result = plan.preset(bench, [], [], 1, "c2mo");
  assert.equal(result.source, "default");
  assert.equal(result.weight, bench.startWeight);
  assert.equal(result.reference, null);
});
test("new heavy and lighter slots stay independent", () => {
  const old = session("mo", 14, "2026-06-01", "Bench Press", 70);
  const heavy = session("c2mo", 1, "2026-07-01", "Bench Press", 80);
  const light = session("c2do", 1, "2026-07-02", "Bench Press", 60, [8, 8, 8]);
  assert.equal(plan.preset(bench, [heavy, light], [old], 2, "c2mo").weight, 81.25);
  assert.equal(plan.preset(days.c2do.exercises[0], [heavy, light], [old], 2, "c2do").weight, 61.25);
  assert.equal(plan.preset(days.c2do.exercises[0], [heavy], [old], 1, "c2do").weight, 70);
});
test("partial saved sets restore to their original positions", () => {
  const saved = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  saved.set_logs = [saved.set_logs[1]];
  const result = plan.preset(bench, [saved], [], 1, "c2mo");
  assert.equal(result.weight, 75);
  assert.deepEqual(result.reps, ["", 5, ""]);
});
test("skipped and incomplete exercise sessions do not reset the previous weight", () => {
  const first = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  const skipped = { ...session("c2mo", 2, "2026-07-02", "Bench Press", 0), set_logs: [] };
  assert.equal(plan.preset(bench, [skipped, first], [], 3, "c2mo").weight, 76.25);
});
test("progression requires complete numbered sets at the same weight", () => {
  const logs = session("c2mo", 1, "2026-07-01", "Bench Press", 75).set_logs;
  assert.equal(plan.canProgress(bench, logs), true);
  assert.equal(plan.canProgress(bench, logs.slice(1)), false);
  assert.equal(plan.canProgress(bench, [logs[0], logs[0], logs[2]]), false);
  assert.equal(plan.canProgress(bench, [logs[0], { ...logs[1], weight_kg: 70 }, logs[2]]), false);
  assert.equal(plan.canProgress(bench, [logs[0], { ...logs[1], reps: 4 }, logs[2]]), false);
});
test("deload performance never triggers a progression hint", () => {
  const prior = session("c2mo", 4, "2026-07-01", "Bench Press", 75);
  const result = plan.preset(bench, [prior], [], 5, "c2mo");
  assert.equal(result.canProgress, false);
  assert.equal(result.weight, 75);
});
test("session loader paginates beyond the first response", async () => {
  const rows = Array.from({ length: 501 }, (_, id) => ({ id }));
  const ranges = [];
  const client = { from() {
    return { select() { return this; }, in() { return this; }, order() { return this; },
      async range(start, end) { ranges.push([start, end]); return { data: rows.slice(start, end + 1), error: null }; } };
  } };
  assert.equal((await plan.loadSessions(client, ["mo"])).length, 501);
  assert.equal(ranges.length, 3);
});
test("failed import is surfaced instead of silently using defaults", async () => {
  const client = { from() {
    return { select() { return this; }, in() { return this; }, order() { return this; },
      async range() { return { data: null, error: { message: "offline" } }; } };
  } };
  await assert.rejects(plan.loadSessions(client, ["mo"]), /offline/);
});


test("upper and lower target completion applies the established increments", () => {
  const upper = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  const result = plan.preset(bench, [upper], [], 2, "c2mo");
  assert.equal(result.autoIncreased, true);
  assert.equal(result.increment, 1.25);
  assert.equal(result.weight, 76.25);
  const lower = session("c2di", 1, "2026-07-02", "Squat", 65);
  const squat = plan.preset(days.c2di.exercises[0], [lower], [], 2, "c2di");
  assert.equal(squat.autoIncreased, true);
  assert.equal(squat.increment, 2.5);
  assert.equal(squat.weight, 67.5);
});
test("imported history cannot trigger automatic increases, even in a later week", () => {
  const old = session("mo", 14, "2026-06-01", "Bench Press", 75);
  for (const week of [1, 2, 3, 5]) {
    const result = plan.preset(bench, [], [old], week, "c2mo");
    assert.equal(result.autoIncreased, false);
    assert.equal(result.weight, 75);
  }
});
test("opening a saved or partly saved exercise never changes its recorded weight", () => {
  const previous = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  const saved = session("c2mo", 2, "2026-07-08", "Bench Press", 75, [3]);
  const result = plan.preset(bench, [previous, saved], [], 2, "c2mo");
  assert.equal(result.autoIncreased, false);
  assert.equal(result.weight, 75);
  assert.deepEqual(result.reps, [3, "", ""]);
});
test("new deload week suppresses increases from a successful normal week", () => {
  const previous = session("c2mo", 3, "2026-07-01", "Bench Press", 75);
  const result = plan.preset(bench, [previous], [], 4, "c2mo");
  assert.equal(result.autoIncreased, false);
  assert.equal(result.weight, 75);
});
test("incomplete or missed targets never increase the next weight", () => {
  for (const reps of [[5, 5], [5, 4, 5], [5, 0, 5]]) {
    const previous = session("c2mo", 1, "2026-07-01", "Bench Press", 75, reps);
    const result = plan.preset(bench, [previous], [], 2, "c2mo");
    assert.equal(result.autoIncreased, false);
    assert.equal(result.weight, 75);
  }
});
test("mixed working weights cannot trigger an automatic increase", () => {
  const previous = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  previous.set_logs[0].weight_kg = 80;
  const result = plan.preset(bench, [previous], [], 2, "c2mo");
  assert.equal(result.autoIncreased, false);
  assert.equal(result.weight, 75);
});
test("repeated rendering cannot compound increases or modify stored history", () => {
  const previous = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  const before = JSON.stringify(previous);
  for (let i = 0; i < 5; i++) {
    assert.equal(plan.preset(bench, [previous], [], 2, "c2mo").weight, 76.25);
  }
  assert.equal(JSON.stringify(previous), before);
});
test("a new completed session becomes the base for exactly one further increase", () => {
  const first = session("c2mo", 1, "2026-07-01", "Bench Press", 75);
  const second = session("c2mo", 2, "2026-07-08", "Bench Press", 76.25);
  assert.equal(plan.preset(bench, [first, second], [], 3, "c2mo").weight, 77.5);
});
test("zero bodyweight load can progress after completing the new plan target", () => {
  const pullup = days.c2mo.exercises[1];
  const previous = session("c2mo", 1, "2026-07-01", "Pull-Up", 0, [8, 8, 8]);
  const result = plan.preset(pullup, [previous], [], 2, "c2mo");
  assert.equal(result.autoIncreased, true);
  assert.equal(result.weight, 1.25);
});
