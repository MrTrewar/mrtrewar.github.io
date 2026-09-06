const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const vm = require("node:vm");
const puppeteer = require("puppeteer");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const legacy = vm.runInNewContext("(" + source.split("const LEGACY_TRAINING_PLAN = ")[1].split("\n};")[0] + "\n})");
const fixtures = { sessions: [], logs: [], writes: [], alerts: [] };
for (const [day, plan] of Object.entries(legacy)) {
  const id = "old-" + day;
  fixtures.sessions.push({ id, day_key: day, week_number: 14, date: "2026-06-04", created_at: "2026-06-04T10:00:00Z" });
  plan.exercises.forEach((ex, index) => {
    const weight = ex.name === "Bench Press" ? 70 : ex.isBW ? 0 : index + 10;
    for (let set = 1; set <= ex.sets; set++) fixtures.logs.push({
      id: id + "-" + index + "-" + set, session_id: id,
      exercise_name: ex.name, set_number: set, weight_kg: weight,
      reps: Array.isArray(ex.repRange) ? ex.repRange[1] : 8,
      created_at: "2026-06-04T10:01:00Z",
    });
  });
}
fixtures.sessions.push({ id: "old-heavy", day_key: "mo", week_number: 1, date: "2026-02-01", created_at: "2026-02-01T10:00:00Z" });
fixtures.logs.push({ id: "heavy-log", session_id: "old-heavy", exercise_name: "Bench Press", set_number: 1, weight_kg: 100, reps: 3, created_at: "2026-02-01T10:00:00Z" });
fixtures.sessions.push({ id: "hybrid-old", day_key: "hmo", week_number: 1, date: "2026-06-01", created_at: "2026-06-01T10:00:00Z" });
fixtures.logs.push({ id: "hybrid-log", session_id: "hybrid-old", exercise_name: "Barbell Bench Press", set_number: 1, weight_kg: 40, reps: 8, created_at: "2026-06-01T10:00:00Z" });

function installMock(initial) {
  const persisted = localStorage.getItem("__gym_test_db");
  const db = window.__db = persisted ? JSON.parse(persisted) : initial;
  db.failInsert = false;
  db.failDay = "";
  db.delayDay = "";
  window.alert = message => db.alerts.push(message);
  window.confirm = () => true;
  if (!localStorage.getItem("gym_strength_revision")) localStorage.setItem("gym_active_plan", "hybrid");
  function persist() { localStorage.setItem("__gym_test_db", JSON.stringify(db)); }
  class Query {
    constructor(table) { this.table = table; this.op = "read"; this.filters = []; this.orders = []; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); if (key === "day_key") this.day = value; return this; }
    lt(key, value) { this.filters.push(row => row[key] < value); return this; }
    gte(key, value) { this.filters.push(row => row[key] >= value); return this; }
    in(key, values) { this.filters.push(row => values.includes(row[key])); if (key === "day_key" && values.length === 1) this.day = values[0]; return this; }
    order(key, options = {}) { this.orders.push([key, options.ascending !== false]); return this; }
    range(start, end) { this.bounds = [start, end + 1]; return this; }
    limit(count) { this.bounds = [0, count]; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; this.optional = true; return this; }
    insert(payload) { this.op = "insert"; this.payload = payload; return this; }
    update(payload) { this.op = "update"; this.payload = payload; return this; }
    delete() { this.op = "delete"; return this; }
    then(resolve, reject) { return this.run().then(resolve, reject); }
    async run() {
      if (db.delayReads) await new Promise(resolve => setTimeout(resolve, 200));
      if (this.day && this.day === db.delayDay) await new Promise(resolve => setTimeout(resolve, 200));
      if (this.op === "read" && this.day && this.day === db.failDay) return { data: null, error: { message: "Simulated offline read" } };
      const key = this.table === "sessions" ? "sessions" : "logs";
      let rows = db[key].filter(row => this.filters.every(filter => filter(row)));
      if (this.op !== "read") {
        db.writes.push({ table: this.table, op: this.op, payload: this.payload });
        if (this.op === "insert") {
          if (db.failInsert && this.table === "set_logs") return { data: null, error: { message: "Simulated insert failure" } };
          rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(row => ({
            id: "test-" + crypto.randomUUID(), created_at: new Date().toISOString(), ...row,
          }));
          db[key].push(...rows);
        } else if (this.op === "update") rows.forEach(row => Object.assign(row, this.payload));
        else {
          const ids = new Set(rows.map(row => row.id));
          db[key] = db[key].filter(row => !ids.has(row.id));
          if (key === "sessions") db.logs = db.logs.filter(row => !ids.has(row.session_id));
        }
        persist();
      }
      rows = [...rows].sort((a, b) => {
        for (const [key, asc] of this.orders) {
          if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (asc ? 1 : -1);
        }
        return 0;
      });
      if (this.bounds) rows = rows.slice(...this.bounds);
      if (this.table === "sessions") rows = rows.map(row => ({
        ...row, set_logs: db.logs.filter(log => log.session_id === row.id),
      }));
      if (this.one) {
        if (rows.length !== 1) return { data: null, error: !rows.length && this.optional ? null : { code: "PGRST116", message: "Not a single row" } };
        return { data: rows[0], error: null };
      }
      return { data: rows, error: null };
    }
  }
  window.supabase = { createClient: () => ({ from: table => new Query(table) }) };
}

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, body) => {
      if (error) { res.writeHead(404).end(); return; }
      const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" }[path.extname(file)];
      res.writeHead(200, { "Content-Type": mime || "application/octet-stream" });
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (new URL(request.url()).hostname === "127.0.0.1") return request.continue();
      return request.respond({ status: 200, contentType: "text/javascript", body: "" });
    });
    await page.evaluateOnNewDocument(installMock, fixtures);
    const waitDay = async day => {
      await page.waitForFunction(key =>
        document.querySelector("#exerciseGrid").dataset.day === key &&
        document.querySelectorAll(".exercise-card").length > 0 &&
        (currentPlan === "archive" || !document.querySelector("#navSaveBtn").disabled),
        {}, day);
    };
    await page.goto("http://127.0.0.1:" + port);
    await waitDay("c2mo");
    assert.equal(await page.$eval("#weekSelect", el => el.value), "1");
    assert.equal(await page.$eval("#planSelect", el => el.value), "classic");
    assert.equal(await page.$eval(".weight-input", el => el.value), "70");
    assert.equal(await page.evaluate(() => __db.writes.length), 0);
    for (const [day, sets] of [["c2mo",18],["c2di",16],["c2do",20],["c2fr",16]]) {
      await page.click('[data-day="' + day + '"]');
      await waitDay(day);
      assert.equal(await page.$$eval(".rep-input", inputs => inputs.length), sets);
      assert.equal(await page.$$eval(".rep-input", inputs => inputs.every(input => input.value === "")), true);
    }
    await page.click('[data-day="c2mo"]');
    await waitDay("c2mo");
    await page.click("#navSaveBtn");
    assert.equal(await page.evaluate(() => __db.writes.length), 0);
    assert.match(await page.evaluate(() => __db.alerts.at(-1)), /Noch keine Saetze/);
    await page.$eval(".weight-input", el => el.value = "75");
    await page.$eval(".rep-input", el => el.value = "4");
    await page.evaluate(() => saveSession());
    let saved = await page.evaluate(() => __db.sessions.find(s => s.day_key === "c2mo"));
    assert.equal(saved.week_number, 1);
    assert.equal(await page.evaluate(id => __db.logs.filter(log => log.session_id === id).length, saved.id), 1);
    await page.evaluate(() => __db.failInsert = true);
    await page.$eval(".rep-input", el => el.value = "5");
    await page.evaluate(() => saveSession());
    assert.equal(await page.evaluate(id => __db.logs.find(log => log.session_id === id).reps, saved.id), 4);
    await page.evaluate(() => __db.failInsert = false);
    await page.$$eval(".exercise-card:first-child .rep-input", inputs => inputs.forEach(input => input.value = "5"));
    await page.evaluate(() => saveSession());
    assert.equal(await page.evaluate(id => __db.logs.filter(log => log.session_id === id).length, saved.id), 3);

    await page.click('[data-day="c2do"]');
    await waitDay("c2do");
    assert.equal(await page.$eval(".weight-input", el => el.value), "70");
    await page.click('[data-day="c2mo"]');
    await waitDay("c2mo");
    await page.select("#weekSelect", "2");
    await page.waitForFunction(() => document.querySelector("#exerciseGrid").dataset.week === "2" && !document.querySelector("#navSaveBtn").disabled);
    assert.equal(await page.$eval(".weight-input", el => el.value), "76.25");
    assert.match(await page.$eval(".auto-increased", el => el.textContent), /1,25/);
    const writesAtSuggestion = await page.evaluate(() => __db.writes.length);
    await page.select("#weekSelect", "1");
    await page.waitForFunction(() => document.querySelector("#exerciseGrid").dataset.week === "1" && !document.querySelector("#navSaveBtn").disabled);
    assert.equal(await page.$eval(".weight-input", el => el.value), "75");
    assert.equal(await page.$$eval(".auto-increased", badges => badges.length), 0);
    await page.select("#weekSelect", "2");
    await page.waitForFunction(() => document.querySelector("#exerciseGrid").dataset.week === "2" && !document.querySelector("#navSaveBtn").disabled);
    assert.equal(await page.$eval(".weight-input", el => el.value), "76.25");
    assert.equal(await page.evaluate(() => __db.writes.length), writesAtSuggestion);
    assert.equal(await page.$$eval(".rep-input", inputs => inputs.every(input => input.value === "")), true);

    await page.reload();
    await waitDay("c2di");
    assert.equal(await page.$eval("#weekSelect", el => el.value), "1");
    await page.$eval(".rep-input", el => el.value = "5");
    await page.evaluate(() => __db.failInsert = true);
    await page.evaluate(() => saveSession());
    assert.equal(await page.evaluate(() => __db.sessions.filter(s => s.day_key === "c2di").length), 0);
    await page.evaluate(() => __db.failInsert = false);
    await page.click('[data-day="c2mo"]');
    await waitDay("c2mo");
    await page.select("#weekSelect", "4");
    await page.waitForFunction(() => document.querySelector("#exerciseGrid").dataset.week === "4" && !document.querySelector("#navSaveBtn").disabled);
    assert.equal(await page.$$eval(".rep-input", inputs => inputs.length), 11);
    assert.equal(await page.$eval(".weight-input", el => el.value), "75");
    assert.equal(await page.$$eval(".auto-increased", badges => badges.length), 0);

    await page.select("#planSelect", "archive");
    await page.waitForFunction(() => document.querySelector("#exerciseGrid").dataset.plan === "archive" && document.querySelectorAll(".exercise-card").length > 0);
    assert.equal(await page.$eval("#navSaveBtn", el => el.disabled), true);
    assert.equal(await page.$$eval(".exercise-card input", inputs => inputs.every(input => input.disabled)), true);
    const writesBefore = await page.evaluate(() => __db.writes.length);
    await page.evaluate(() => saveSession());
    assert.equal(await page.evaluate(() => __db.writes.length), writesBefore);
    await page.select("#planSelect", "hybrid");
    await page.waitForSelector("#cardioDistance");
    await page.click('[data-day="hmo"]');
    await waitDay("hmo");
    assert.equal(await page.$$eval(".exercise-card", cards => cards.length), 4);

    await page.select("#planSelect", "classic");
    await waitDay("c2di");
    await page.evaluate(() => { __db.delayReads = true; switchPlan("archive"); switchPlan("classic"); });
    await waitDay("c2di");
    await new Promise(resolve => setTimeout(resolve, 250));
    await page.evaluate(() => __db.delayReads = false);
    assert.equal(await page.$eval("#planSelect", el => el.value), "classic");
    await page.evaluate(() => { __db.delayDay = "c2mo"; selectDay("c2mo"); selectDay("c2di"); });
    await waitDay("c2di");
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(await page.$eval("#exerciseGrid", el => el.dataset.day), "c2di");
    await page.evaluate(() => { __db.delayDay = ""; __db.failDay = "c2fr"; selectDay("c2fr"); });
    await page.waitForSelector("#exerciseGrid .error");
    assert.equal(await page.$eval("#navSaveBtn", el => el.disabled), true);
    await page.evaluate(() => __db.failDay = "");
    await page.click("#exerciseGrid button");
    await waitDay("c2fr");
    const oldSessions = await page.evaluate(() => __db.sessions.filter(s => !s.day_key.startsWith("c2")));
    const oldIds = new Set(fixtures.sessions.map(s => s.id));
    const oldLogs = await page.evaluate(ids => __db.logs.filter(log => ids.includes(log.session_id)), [...oldIds]);
    assert.deepEqual(oldSessions, fixtures.sessions);
    assert.deepEqual(oldLogs, fixtures.logs);

    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Horizontal overflow at " + width);
      await page.screenshot({ path: "/tmp/gym-tracker-" + width + ".png" });
    }
    assert.deepEqual(errors, []);
    console.log("Browser checks passed: week-one reset, all 70 sets, latest weights, empty fields, safe save/update/failure, independent slots, automatic increments, saved-weight protection, no repeated increase, reload, deload, archive, hybrid, races, retry, desktop and mobile.");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
