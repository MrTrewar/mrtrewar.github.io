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
const customSwatch = document.getElementById("custom-swatch");
const colorPicker = document.getElementById("color-picker");
const wheelCanvas = document.getElementById("wheel");
const wheelCtx = wheelCanvas.getContext("2d");
const lightnessSlider = document.getElementById("lightness");
const pickerPreview = document.getElementById("picker-preview");
const pickerHex = document.getElementById("picker-hex");

const clientId = getOrCreateClientId();
const myStrokeIds = [];
const allStrokes = [];
let activeStroke = null;
let currentColor = PALETTE[0];
let lastBrushColor = PALETTE[0];
let currentSize = Number(sizeEl.value);
let isErasing = false;
let supabase = null;
let realtimeChannel = null;
let statusTimer = null;

initUI();
initCanvas();
initPointerEvents();
initColorWheel();
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
    colorsEl.insertBefore(btn, customSwatch);
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
    const presets = [
      ...document.querySelectorAll(".swatch:not(.swatch-custom)"),
    ];
    const match = presets.find(
      (el) =>
        el.style.background === lastBrushColor ||
        rgbToHex(el.style.background) === lastBrushColor.toLowerCase(),
    );
    if (match) {
      match.classList.add("active");
    } else {
      customSwatch.classList.add("active");
    }
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
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 20 } },
  });
  loadStrokes();
  subscribeRealtime();
}

async function loadStrokes() {
  try {
    const { data, error } = await supabase
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
  if (!supabase) return;
  try {
    const { data, error } = await supabase
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
    myStrokeIds.push(data.id);
  } catch (err) {
    console.warn("saveStroke failed:", err);
    showStatus(STATUS.SAVE_FAIL, 3000);
  }
}

function subscribeRealtime() {
  if (!supabase) return;
  realtimeChannel = supabase
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
  if (myStrokeIds.length === 0) return;
  const id = myStrokeIds.pop();
  const idx = allStrokes.findIndex((s) => s.id === id);
  if (idx !== -1) {
    allStrokes.splice(idx, 1);
    redrawAll();
  }
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id)
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

let pickerHue = 0;
let pickerSat = 0;
let pickerLightness = Number(lightnessSlider.value);
let isPickingColor = false;

function initColorWheel() {
  drawWheel(pickerLightness);
  updatePickerPreview(currentColor);

  customSwatch.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleColorPicker();
  });

  lightnessSlider.addEventListener("input", () => {
    pickerLightness = Number(lightnessSlider.value);
    drawWheel(pickerLightness);
    if (pickerSat > 0) applyWheelColor();
  });

  wheelCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    isPickingColor = true;
    wheelCanvas.setPointerCapture(event.pointerId);
    pickFromWheelEvent(event);
  });
  wheelCanvas.addEventListener("pointermove", (event) => {
    if (!isPickingColor) return;
    pickFromWheelEvent(event);
  });
  wheelCanvas.addEventListener("pointerup", () => {
    isPickingColor = false;
  });
  wheelCanvas.addEventListener("pointercancel", () => {
    isPickingColor = false;
  });

  document.addEventListener("pointerdown", (event) => {
    if (colorPicker.hasAttribute("hidden")) return;
    if (
      colorPicker.contains(event.target) ||
      customSwatch.contains(event.target)
    ) {
      return;
    }
    closeColorPicker();
  });
}

function toggleColorPicker() {
  if (colorPicker.hasAttribute("hidden")) {
    colorPicker.removeAttribute("hidden");
  } else {
    closeColorPicker();
  }
}

function closeColorPicker() {
  colorPicker.setAttribute("hidden", "");
}

function drawWheel(lightness) {
  const size = wheelCanvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const image = wheelCtx.createImageData(size, size);
  const data = image.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist > radius) {
        data[idx + 3] = 0;
        continue;
      }

      const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const sat = Math.min(1, dist / radius);
      const rgb = hslToRgb(angleDeg, sat, lightness / 100);
      data[idx] = rgb[0];
      data[idx + 1] = rgb[1];
      data[idx + 2] = rgb[2];
      data[idx + 3] = Math.round(255 * Math.min(1, radius - dist + 0.5));
    }
  }
  wheelCtx.putImageData(image, 0, 0);
  drawWheelIndicator();
}

function drawWheelIndicator() {
  if (pickerSat === 0) return;
  const size = wheelCanvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const angle = (pickerHue * Math.PI) / 180;
  const r = pickerSat * radius;
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;

  wheelCtx.save();
  wheelCtx.beginPath();
  wheelCtx.arc(x, y, 6, 0, Math.PI * 2);
  wheelCtx.strokeStyle = "#fff";
  wheelCtx.lineWidth = 2.5;
  wheelCtx.stroke();
  wheelCtx.beginPath();
  wheelCtx.arc(x, y, 6, 0, Math.PI * 2);
  wheelCtx.strokeStyle = "rgba(0,0,0,0.55)";
  wheelCtx.lineWidth = 1;
  wheelCtx.stroke();
  wheelCtx.restore();
}

function pickFromWheelEvent(event) {
  const rect = wheelCanvas.getBoundingClientRect();
  const scaleX = wheelCanvas.width / rect.width;
  const scaleY = wheelCanvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const cx = wheelCanvas.width / 2;
  const cy = wheelCanvas.height / 2;
  const radius = wheelCanvas.width / 2 - 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));

  pickerHue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  pickerSat = dist / radius;
  drawWheel(pickerLightness);
  applyWheelColor();
}

function applyWheelColor() {
  const rgb = hslToRgb(pickerHue, pickerSat, pickerLightness / 100);
  const hex = rgbToHexString(rgb[0], rgb[1], rgb[2]);
  customSwatch.style.setProperty("--custom-color", hex);
  updatePickerPreview(hex);
  selectColor(hex, customSwatch);
}

function updatePickerPreview(hex) {
  pickerPreview.style.background = hex;
  pickerHex.textContent = hex.toUpperCase();
}

function rgbToHexString(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) => Math.round(value).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hslToRgb(hue, saturation, lightness) {
  const h = hue / 360;
  let r;
  let g;
  let b;

  if (saturation === 0) {
    r = g = b = lightness;
  } else {
    const q =
      lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;
    r = hueToRgbComponent(p, q, h + 1 / 3);
    g = hueToRgbComponent(p, q, h);
    b = hueToRgbComponent(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hueToRgbComponent(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}
