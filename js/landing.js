// Shared Drawing Board — persisted via Supabase, live-synced

const SUPABASE_URL = "https://whelaaozlexvxkojrljp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F1S_lB8kCYj22c-ssxrL4A_3hTHta1h";
const TABLE = "shared_strokes";
const STROKE_LIMIT = 2000;

const PALETTE = [
  "#3C3C3C",
  "#C4A77D",
  "#D94F4F",
  "#4F7FD9",
  "#5FA85B",
  "#E8B94D",
  "#8B5CF6",
  "#F28FBF",
];
const ERASER_COLOR = "#F5F0EB";

const STATUS = {
  CONNECTING: "Verbinde…",
  ONLINE: "Live verbunden",
  OFFLINE: "Offline — Striche bleiben nur hier",
  SAVE_FAIL: "Speichern fehlgeschlagen",
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const colorsEl = document.getElementById("colors");
const sizeEl = document.getElementById("size");
const sizePreviewEl = document.getElementById("size-preview");
const eraserBtn = document.getElementById("eraser");
const undoBtn = document.getElementById("undo");
const authorInput = document.getElementById("author");
const statusEl = document.getElementById("status");
const cursorSizeEl = document.getElementById("cursor-size");

const clientId = getOrCreateClientId();
const myStrokes = [];
const allStrokes = [];
let activeStroke = null;
let currentColor = PALETTE[0];
let lastBrushColor = PALETTE[0];
let currentSize = Number(sizeEl.value);
let isErasing = false;
let supabaseClient = null;
let realtimeChannel = null;
let statusTimer = null;

initUI();
initCanvas();
initPointerEvents();
initCursorSizeIndicator();
initSupabase();

function getOrCreateClientId() {
  const KEY = "shared_board_client_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      "c_" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function initUI() {
  PALETTE.forEach((color, idx) => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.type = "button";
    btn.style.background = color;
    btn.setAttribute("aria-label", "Farbe " + color);
    btn.addEventListener("click", () => selectColor(color, btn));
    if (idx === 0) btn.classList.add("active");
    colorsEl.appendChild(btn);
  });

  updateSizePreview();
  sizeEl.addEventListener("input", () => {
    currentSize = Number(sizeEl.value);
    updateSizePreview();
  });

  eraserBtn.addEventListener("click", toggleEraser);
  undoBtn.addEventListener("click", undoMyLastStroke);

  const savedAuthor = localStorage.getItem("shared_board_author") || "";
  authorInput.value = savedAuthor;
  authorInput.addEventListener("change", () => {
    localStorage.setItem(
      "shared_board_author",
      authorInput.value.trim().slice(0, 18),
    );
  });
}

function selectColor(color, btn) {
  currentColor = color;
  lastBrushColor = color;
  isErasing = false;
  eraserBtn.classList.remove("active");
  document
    .querySelectorAll(".swatch")
    .forEach((el) => el.classList.remove("active"));
  if (btn) btn.classList.add("active");
  updateSizePreview();
}

function toggleEraser() {
  isErasing = !isErasing;
  if (isErasing) {
    currentColor = ERASER_COLOR;
    eraserBtn.classList.add("active");
    document
      .querySelectorAll(".swatch")
      .forEach((el) => el.classList.remove("active"));
  } else {
    currentColor = lastBrushColor;
    eraserBtn.classList.remove("active");
    const match = [...document.querySelectorAll(".swatch")].find(
      (el) =>
        el.style.background === lastBrushColor ||
        rgbToHex(el.style.background) === lastBrushColor.toLowerCase(),
    );
    if (match) match.classList.add("active");
  }
  updateSizePreview();
}

function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return rgb;
  return (
    "#" +
    m
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function updateSizePreview() {
  const diameter = Math.max(4, currentSize);
  sizePreviewEl.style.width = diameter + "px";
  sizePreviewEl.style.height = diameter + "px";
  sizePreviewEl.style.background = isErasing ? "var(--border)" : currentColor;
}

function initCanvas() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawAll();
}

function normalizePoint(clientX, clientY) {
  return [clientX / window.innerWidth, clientY / window.innerHeight];
}

function drawStroke(stroke) {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (pts.length === 1) {
    const [x, y] = pts[0];
    ctx.beginPath();
    ctx.arc(
      x * window.innerWidth,
      y * window.innerHeight,
      stroke.size / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    return;
  }

  ctx.beginPath();
  const [x0, y0] = pts[0];
  ctx.moveTo(x0 * window.innerWidth, y0 * window.innerHeight);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    ctx.lineTo(x * window.innerWidth, y * window.innerHeight);
  }
  ctx.stroke();
}

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of allStrokes) drawStroke(s);
  if (activeStroke) drawStroke(activeStroke);
}

function initPointerEvents() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);
  window.addEventListener("blur", onPointerUp);
}

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  activeStroke = {
    client_id: clientId,
    author: authorInput.value.trim().slice(0, 18) || null,
    color: currentColor,
    size: currentSize,
    points: [normalizePoint(event.clientX, event.clientY)],
  };
  redrawAll();
}

function onPointerMove(event) {
  if (!activeStroke) return;
  event.preventDefault();

  if (event.getCoalescedEvents) {
    const events = event.getCoalescedEvents();
    for (const ev of events) {
      activeStroke.points.push(normalizePoint(ev.clientX, ev.clientY));
    }
  } else {
    activeStroke.points.push(normalizePoint(event.clientX, event.clientY));
  }
  redrawAll();
}

function onPointerUp(event) {
  if (!activeStroke) return;
  const stroke = activeStroke;
  activeStroke = null;
  stroke.points = simplifyPoints(stroke.points);
  allStrokes.push(stroke);
  myStrokes.push(stroke);
  saveStroke(stroke);
  redrawAll();
}

function simplifyPoints(points) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  const threshold = 0.001;
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    const curr = points[i];
    const dx = curr[0] - last[0];
    const dy = curr[1] - last[1];
    if (dx * dx + dy * dy >= threshold * threshold) out.push(curr);
  }
  out.push(points[points.length - 1]);
  return out;
}

function initSupabase() {
  showStatus(STATUS.CONNECTING);
  if (!window.supabase) {
    showStatus(STATUS.OFFLINE, 4000);
    return;
  }
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      realtime: { params: { eventsPerSecond: 20 } },
    },
  );
  loadStrokes();
  subscribeRealtime();
}

async function loadStrokes() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select("id, client_id, author, color, size, points, created_at")
      .order("created_at", { ascending: true })
      .limit(STROKE_LIMIT);
    if (error) throw error;
    for (const row of data || []) {
      allStrokes.push({
        id: row.id,
        client_id: row.client_id,
        author: row.author,
        color: row.color,
        size: row.size,
        points: row.points,
      });
    }
    redrawAll();
    showStatus(STATUS.ONLINE, 2000);
  } catch (err) {
    console.warn("loadStrokes failed:", err);
    showStatus(STATUS.OFFLINE, 4000);
  }
}

async function saveStroke(stroke) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .insert({
        client_id: stroke.client_id,
        author: stroke.author,
        color: stroke.color,
        size: stroke.size,
        points: stroke.points,
      })
      .select("id")
      .single();
    if (error) throw error;
    stroke.id = data.id;
  } catch (err) {
    console.warn("saveStroke failed:", err);
    showStatus(STATUS.SAVE_FAIL, 3000);
  }
}

function subscribeRealtime() {
  if (!supabaseClient) return;
  realtimeChannel = supabaseClient
    .channel("shared_strokes_feed")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        const row = payload.new;
        if (!row || row.client_id === clientId) return;
        allStrokes.push({
          id: row.id,
          client_id: row.client_id,
          author: row.author,
          color: row.color,
          size: row.size,
          points: row.points,
        });
        redrawAll();
      },
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: TABLE },
      (payload) => {
        const deletedId = payload.old && payload.old.id;
        if (!deletedId) return;
        const idx = allStrokes.findIndex((s) => s.id === deletedId);
        if (idx !== -1) {
          allStrokes.splice(idx, 1);
          redrawAll();
        }
      },
    )
    .subscribe();
}

async function undoMyLastStroke() {
  if (myStrokes.length === 0) return;
  const stroke = myStrokes.pop();
  const idx = allStrokes.lastIndexOf(stroke);
  if (idx !== -1) {
    allStrokes.splice(idx, 1);
    redrawAll();
  }
  if (!supabaseClient || !stroke.id) return;
  try {
    const { error } = await supabaseClient
      .from(TABLE)
      .delete()
      .eq("id", stroke.id)
      .eq("client_id", clientId);
    if (error) throw error;
  } catch (err) {
    console.warn("undo failed:", err);
  }
}

function showStatus(text, autoHideMs) {
  statusEl.textContent = text;
  statusEl.classList.add("visible");
  if (statusTimer) clearTimeout(statusTimer);
  if (autoHideMs) {
    statusTimer = setTimeout(
      () => statusEl.classList.remove("visible"),
      autoHideMs,
    );
  }
}

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let cursorSizeTimer = null;
const CURSOR_SIZE_VISIBLE_MS = 1200;

function initCursorSizeIndicator() {
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      if (cursorSizeEl.classList.contains("visible")) {
        positionCursorSize();
      }
    },
    { passive: true },
  );

  sizeEl.addEventListener("input", showCursorSize);
  sizeEl.addEventListener("change", showCursorSize);
  sizeEl.addEventListener("pointerdown", showCursorSize);
}

function showCursorSize() {
  cursorSizeEl.style.width = currentSize + "px";
  cursorSizeEl.style.height = currentSize + "px";
  cursorSizeEl.style.borderColor = isErasing ? "var(--muted)" : currentColor;
  positionCursorSize();
  cursorSizeEl.classList.add("visible");

  if (cursorSizeTimer) clearTimeout(cursorSizeTimer);
  cursorSizeTimer = setTimeout(() => {
    cursorSizeEl.classList.remove("visible");
  }, CURSOR_SIZE_VISIBLE_MS);
}

function positionCursorSize() {
  cursorSizeEl.style.left = cursorX + "px";
  cursorSizeEl.style.top = cursorY + "px";
}
