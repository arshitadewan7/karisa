// magnet diary: client
import { LIB, CATS, FRAMES2, CARDS, FONTS, INKS } from "/stickers.js";
const BW = 900, BH = 1200;
const $ = (s, r = document) => r.querySelector(s);

// ---------------- helpers ----------------
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).slice(0, 12);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DOW_LONG = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const PROMPTS = [
  "the best thing i ate today was…",
  "a song stuck in my head:",
  "something small that made me smile",
  "today i'm grateful for…",
  "what i'm wearing and why i love it",
  "a conversation i want to remember",
  "if today had a colour it would be…",
  "three words for today:",
  "i wish i knew then what i know now",
  "the next adventure i want to go on",
  "a tiny win from today",
  "something i'm looking forward to",
  "the weather and my mood, honestly",
  "who i want to call right now",
  "a thing i noticed on my walk",
  "dear future me,",
  "currently reading / watching / listening:",
  "the most me moment of the day",
];

// ---------------- item catalog ----------------
const PAPERS = {
  guestcheck: { name: "guest check", cls: "gc", base: 230, pin: "magnet", sample: "i'm not hungry, i just want a snack" },
  postcard:   { name: "postcard", cls: "pc", base: 300, pin: "magnet", sample: "wish you were here, the light today was unreal" },
  lined:      { name: "notebook", cls: "ln", base: 250, pin: "tape", sample: "dear diary,\ntoday was soft and slow" },
  receipt:    { name: "receipt", cls: "rc", base: 200, pin: "magnet", sample: "1x iced latte\n1x good mood\n2x long walk" },
  ticket:     { name: "ticket", cls: "tk", base: 270, pin: "magnet", sample: "admit one: to the rest of the summer" },
  sticky:     { name: "sticky", cls: "st", base: 180, pin: "none", sample: "call mum!!" },
  typed:      { name: "typewriter", cls: "ty", base: 260, pin: "tape", sample: "i keep a list of places i want to see" },
  label:      { name: "label tape", cls: "lb", base: 200, pin: "none", sample: "today" },
};
const PHOTO_STYLES = ["polaroid", "print", "bare", "egg"];
const FRAMES = {
  booth:    { name: "photobooth" },
  polaroid: { name: "polaroid" },
  print:    { name: "print" },
  egg:      { name: "pocket gadget" },
  bare:     { name: "no border" },
};
const BOOTH_TONES = ["bw", "sepia", "faded"];
const BOOTH_MAX = 4;
// soft placeholder used only in the picker previews
const PH_SRC = "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8cfc4"/><stop offset="1" stop-color="#8a7f78"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><circle cx="60" cy="50" r="20" fill="#5e5650"/><path d="M22 120 C28 86 92 86 98 120Z" fill="#5e5650"/></svg>`
);
const PINS = ["magnet", "tape", "none"];
const BOARDS = ["silver", "gunmetal", "pearl", "rose"];
const STICKERS = {
  puzzle: { name: "puzzle", base: 110, variants: ["mint", "lilac", "peach", "sky"] },
  spiral: { name: "spiral", base: 100, variants: ["silver"] },
  star:   { name: "star", base: 100, variants: ["silver", "rose"] },
  heart:  { name: "heart", base: 100, variants: ["silver", "rose"] },
  badge:  { name: "button", base: 130, variants: ["pink", "ink", "cream", "mint"], text: true },
  disc:   { name: "magnet", base: 46, variants: ["silver"] },
};
const PUZZLE_COLORS = { mint: "#8fd6c6", lilac: "#c7a8e6", peach: "#f4b89b", sky: "#9cc3ef" };

function spiralPath() {
  let d = "";
  for (let t = 0; t <= Math.PI * 7; t += 0.12) {
    const r = 3 + t * 6.2;
    const x = 50 + r * Math.cos(t), y = 50 + r * Math.sin(t);
    d += (d ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
}
const SPIRAL_D = spiralPath();
function starPath() {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 20 : 48, a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += (i ? " L" : "M") + (50 + r * Math.cos(a)).toFixed(1) + " " + (52 + r * Math.sin(a)).toFixed(1);
  }
  return d + " Z";
}
const STAR_D = starPath();
const HEART_D = "M50 90 C20 68 6 50 6 33 C6 18 17 8 30 8 C40 8 46 14 50 22 C54 14 60 8 70 8 C83 8 94 18 94 33 C94 50 80 68 50 90 Z";
const PUZZLE_D = "M15 28 H40 C38 18 43 10 50 10 C57 10 62 18 60 28 H85 V50 C95 48 100 54 100 60 C100 66 95 72 85 70 V92 H60 C62 84 57 78 50 78 C43 78 38 84 40 92 H15 V70 C25 72 30 66 30 60 C30 54 25 48 15 50 Z";

// ---------------- state ----------------
const S = {
  user: null,
  title: "",
  date: today(),
  day: { board: "silver", items: [] },
  sel: null,
  scale: 1,
  els: new Map(),
};

// ---------------- api ----------------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...opts,
    headers: opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json", ...(opts.headers || {}) } : opts.headers,
  });
  if (res.status === 401 && !path.startsWith("/api/auth")) { showAuth(); throw new Error("signed out"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || "something went wrong"), { status: res.status });
  return data;
}
const photoUrl = (id) => `/api/photos/${id}`;

// ---------------- auth screen ----------------
let authMode = "signin";
function showAuth() {
  $("#app").hidden = true;
  $("#auth").hidden = false;
  closeSheets();
}
document.querySelectorAll(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    authMode = b.dataset.mode;
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    $(".name-field").hidden = authMode !== "signup";
    $("#authBtn").textContent = authMode === "signup" ? "create my diary" : "sign in";
    $("#authForm").password.autocomplete = authMode === "signup" ? "new-password" : "current-password";
    $("#authErr").textContent = "";
  })
);
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = $("#authBtn");
  btn.disabled = true;
  $("#authErr").textContent = "";
  try {
    if (authMode === "signup") {
      await api("/api/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({ name: f.name.value.trim() || f.email.value.split("@")[0], email: f.email.value.trim(), password: f.password.value }),
      });
    } else {
      await api("/api/auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({ email: f.email.value.trim(), password: f.password.value }),
      });
    }
    f.password.value = "";
    await boot();
  } catch (err) {
    $("#authErr").textContent = err.message.toLowerCase();
  } finally {
    btn.disabled = false;
  }
});

// ---------------- boot ----------------
async function boot() {
  let me;
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (!r.ok) return showAuth();
    me = await r.json();
  } catch { return showAuth(); }
  S.user = me.user;
  S.title = me.title;
  $("#auth").hidden = true;
  $("#app").hidden = false;
  renderTitle();
  fit();
  await openDay(location.hash.match(/^#\d{4}-\d{2}-\d{2}$/) ? location.hash.slice(1) : today());
}

function renderTitle() {
  const first = (S.user?.name || "my").split(" ")[0].toLowerCase();
  $("#titleBtn").textContent = S.title || `${first}'s magnet diary`;
}

// ---------------- days ----------------
async function openDay(date) {
  await flush();
  S.date = date;
  select(null);
  history.replaceState(null, "", "#" + date);
  renderDate();
  S.day = { board: "silver", items: [] };
  renderBoard();
  try {
    const d = await api(`/api/days/${date}`);
    if (S.date !== date) return;
    S.day = { board: d.board || "silver", items: Array.isArray(d.items) ? d.items : [] };
    renderBoard();
    setStatus("saved");
  } catch (e) {
    if (e.message !== "signed out") setStatus("error", "couldn't load");
  }
}
function renderDate() {
  const d = parseYmd(S.date);
  const isToday = S.date === today();
  $("#dateMain").textContent = isToday ? `today, ${d.getDate()} ${MON[d.getMonth()]}` : `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  $("#dateYear").textContent = d.getFullYear();
}
$("#prevDay").onclick = () => openDay(addDays(S.date, -1));
$("#nextDay").onclick = () => openDay(addDays(S.date, 1));
$("#dateBtn").onclick = () => openDays();
$("#daysBtn").onclick = () => openDays();
$("#todayBtn").onclick = () => { closeSheets(); openDay(today()); };
$("#jumpDate").onchange = (e) => { if (e.target.value) { closeSheets(); openDay(e.target.value); } };

async function openDays() {
  openSheet("#daysSheet");
  $("#jumpDate").value = S.date;
  const list = $("#daysList");
  list.innerHTML = `<p class="days-empty">loading…</p>`;
  try {
    const { days } = await api("/api/days");
    if (!days.length) { list.innerHTML = `<p class="days-empty">no days pinned yet. today is a good start.</p>`; return; }
    list.innerHTML = days.map((d) => {
      const dt = parseYmd(d.date);
      return `<button class="day-row ${d.date === S.date ? "cur" : ""}" data-date="${d.date}">
        <span class="day-thumb">${d.preview ? `<img src="${photoUrl(d.preview)}" alt="" loading="lazy">` : ""}</span>
        <span><b>${DOW_LONG[dt.getDay()]} ${dt.getDate()} ${MON[dt.getMonth()]}</b><small>${dt.getFullYear()} · ${d.count} ${d.count === 1 ? "thing" : "things"} pinned</small></span>
      </button>`;
    }).join("");
    list.querySelectorAll(".day-row").forEach((b) => (b.onclick = () => { closeSheets(); openDay(b.dataset.date); }));
  } catch { list.innerHTML = `<p class="days-empty">couldn't load your days.</p>`; }
}

// ---------------- saving ----------------
let saveTimer = null, saving = false, dirty = false;
function changed() {
  dirty = true;
  setStatus("saving");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 700);
  $("#empty").hidden = S.day.items.length > 0;
}
async function flush() {
  clearTimeout(saveTimer);
  if (!dirty) return;
  if (saving) { saveTimer = setTimeout(flush, 300); return; }
  dirty = false;
  saving = true;
  const date = S.date;
  const items = S.day.items.map(cleanItem);
  try {
    await api(`/api/days/${date}`, { method: "PUT", body: JSON.stringify({ board: S.day.board, items }) });
    if (!dirty) setStatus("saved");
  } catch (e) {
    dirty = true;
    setStatus("error", "not saved, retrying");
    saveTimer = setTimeout(flush, 4000);
  } finally {
    saving = false;
  }
}
function cleanItem(it) {
  const o = {};
  for (const [k, v] of Object.entries(it)) o[k] = typeof v === "number" ? Math.round(v * 10) / 10 : v;
  return o;
}
function setStatus(kind, text) {
  const el = $("#status");
  el.className = "status " + (kind === "saved" ? "" : kind);
  el.querySelector("span").textContent = text || (kind === "saving" ? "saving…" : kind === "error" ? "error" : "saved");
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
window.addEventListener("pagehide", () => flush());

// ---------------- board fit ----------------
function fit() {
  const st = $("#stage").getBoundingClientRect();
  const s = Math.max(0.15, Math.min((st.width - 20) / BW, (st.height - 16) / BH));
  S.scale = s;
  const wrap = $("#boardWrap");
  wrap.style.width = BW * s + "px";
  wrap.style.height = BH * s + "px";
  const b = $("#board");
  b.style.transform = `scale(${s})`;
  b.style.setProperty("--inv", (1 / s).toFixed(3));
}
window.addEventListener("resize", fit);

// ---------------- rendering ----------------
function renderBoard() {
  const b = $("#board");
  b.className = "board bg-" + (BOARDS.includes(S.day.board) ? S.day.board : "silver");
  S.els.forEach((el) => el.remove());
  S.els.clear();
  for (const it of S.day.items) mount(it);
  $("#empty").hidden = S.day.items.length > 0;
}

function mount(it) {
  const el = document.createElement("div");
  el.dataset.id = it.id;
  S.els.set(it.id, el);
  $("#board").appendChild(el);
  paint(it);
  place(it);
  return el;
}
function paint(it) {
  const el = S.els.get(it.id);
  if (!el) return;
  el.className = `item t-${it.type} ${it.type === "note" ? "t-" + it.paper : ""} ${S.sel === it.id ? "sel" : ""}`;
  el.innerHTML = `<div class="body">${inner(it)}</div>${pinHtml(it)}<div class="handle" title="drag to resize and rotate">↻</div>`;
}
function place(it) {
  const el = S.els.get(it.id);
  if (!el) return;
  const base = baseOf(it);
  el.style.left = it.x + "px";
  el.style.top = it.y + "px";
  el.style.width = it.type === "note" && it.paper === "label" ? "" : it.w + "px";
  el.style.fontSize = (it.w / base) * 16 + "px";
  el.style.transform = `rotate(${it.rot}deg)`;
  el.style.zIndex = it.z;
}
function baseOf(it) {
  if (it.type === "photo") return FRAMES2[it.style]?.base || 240;
  if (it.type === "booth") return 150;
  if (it.type === "text") return 240;
  if (it.type === "note") return CARDS[it.paper]?.base || PAPERS[it.paper]?.base || 240;
  return LIB[it.kind]?.base || STICKERS[it.kind]?.base || 100;
}
function pinHtml(it) {
  if (!it.pin || it.pin === "none") return "";
  const left = 50 + (it.pinX || 0);
  if (it.pin === "magnet") return `<span class="pin magnet" style="left:${left}%"></span>`;
  return `<span class="pin tape" style="left:${left}%;transform:translateX(-50%) rotate(${it.pinR || 0}deg)"></span>`;
}

function dateBits(dateStr) {
  const d = parseYmd(dateStr);
  return { dow: DOW[d.getDay()], d: d.getDate(), mon: MON[d.getMonth()], y: d.getFullYear(), dd: pad(d.getDate()), mm: pad(d.getMonth() + 1) };
}

// font + ink chosen by her, layered over the paper's own style
const fontOf = (id) => FONTS.find((f) => f.id === id);
function inked(it, html) {
  const f = it.font ? fontOf(it.font) : null;
  const ink = it.ink ? INKS[it.ink] : null;
  if (!f && !ink) return html;
  const st = [f ? `font-family:${f.css};font-size:${f.k}em;font-style:${f.italic ? "italic" : "normal"}` : "", ink ? `color:${ink}` : ""].filter(Boolean).join(";");
  return `<span class="ff" style="${st}">${html}</span>`;
}

function inner(it, date = S.date) {
  if (it.type === "photo") return photoInner(it);
  if (it.type === "booth") return boothInner(it, date);
  if (it.type === "note") return noteInner(it, date);
  if (it.type === "text") return textInner(it);
  return stickerInner(it);
}
const imgTag = (id, src) => `<img src="${src || photoUrl(id)}" alt="" draggable="false">`;
function boothInner(it, date) {
  const b = dateBits(date);
  const shots = (it.src ? it.src : it.photos || []).map((p) => `<div class="bf">${it.src ? imgTag(null, p) : imgTag(p)}</div>`).join("");
  return `<div class="booth tone-${esc(it.tone || "bw")}"><div class="booth-shots">${shots}</div>
    <div class="booth-foot"><span>★</span><span>${b.dd}·${b.mm}·${String(b.y).slice(2)}</span><span>★</span></div></div>`;
}
function photoInner(it) {
  const img = it.photo || it.src ? imgTag(it.photo, it.src) : "";
  const bw = it.bw ? " bw" : "";
  const fr = FRAMES2[it.style];
  if (fr) {
    const [x, y, w, h, r] = fr.scr;
    const pct = (v, t) => ((v / t) * 100).toFixed(3) + "%";
    return `<div class="fr${bw}" style="aspect-ratio:${fr.w}/${fr.h}">${fr.under}
      <div class="scr" style="left:${pct(x, fr.w)};top:${pct(y, fr.h)};width:${pct(w, fr.w)};height:${pct(h, fr.h)};border-radius:${((r / w) * 100).toFixed(2)}% / ${((r / h) * 100).toFixed(2)}%">${img}</div>
      ${fr.over ? `<div class="over">${fr.over}</div>` : ""}${fr.extra ? fr.extra(it, (t) => inked(it, esc(t))) : ""}</div>`;
  }
  if (it.style === "polaroid") return `<div class="ph polaroid${bw}"><div class="ph-img">${img}</div><div class="cap">${it.caption ? inked(it, esc(it.caption)) : ""}</div></div>`;
  if (it.style === "egg") return `<div class="ph egg${bw}"><div class="ph-img">${img}</div><div class="egg-btns"><i></i><i></i><i></i></div></div>`;
  const ar = it.aspect ? `aspect-ratio:${(1 / it.aspect).toFixed(4)}` : "aspect-ratio:3/4";
  return `<div class="ph ${it.style === "bare" ? "bare" : "print"}${bw}"><div class="ph-img" style="${ar}">${img}</div></div>`;
}
function noteInner(it, date) {
  const b = dateBits(date);
  const txt = it.text ? inked(it, esc(it.text)) : `<span class="ph-hint">tap ✎ write</span>`;
  const no = it.no || "0001";
  const cc = CARDS[it.paper];
  if (cc) {
    const [x, y, w, h] = cc.txt;
    const pct = (v, t) => ((v / t) * 100).toFixed(3) + "%";
    return `<div class="cc" style="aspect-ratio:${cc.w}/${cc.h}">${cc.art()}
      <div class="cc-txt cc-${it.paper}" style="left:${pct(x, cc.w)};top:${pct(y, cc.h)};width:${pct(w, cc.w)};height:${pct(h, cc.h)}">${txt}</div></div>`;
  }
  switch (it.paper) {
    case "guestcheck":
      return `<div class="paper gc"><div class="gc-top"><b>Guest Check</b><span class="gc-no">${no}</span></div>
        <div class="gc-cols"><span>${b.dd}/${b.mm}</span><span>table</span><span>guests 1</span><span>server</span></div>
        <div class="txt">${txt}</div><div class="gc-foot"><span>guest receipt</span><span>thank you</span></div></div>`;
    case "postcard":
      return `<div class="paper pc"><div class="pc-head">POST CARD</div><div class="pc-stamp"></div><div class="txt">${txt}</div></div>`;
    case "receipt":
      return `<div class="paper rc"><div class="rc-h">*** ${b.dow.toUpperCase()} ${b.dd}.${b.mm}.${b.y} ***</div><div class="rc-h2">ORDER #${no}</div>
        <div class="rc-sep"></div><div class="txt">${txt}</div><div class="rc-sep"></div><div class="rc-f">THANK YOU · COME AGAIN</div><div class="rc-bar"></div></div>`;
    case "ticket":
      return `<div class="paper tk"><div class="tk-top"><span>ADMIT ONE</span><span>${b.dow.toUpperCase()}</span></div>
        <div class="txt">${txt}</div><div class="tk-bot"><span>${b.mon.toUpperCase()} ${b.d}TH</span><span>No. ${no}</span></div></div>`;
    case "sticky": return `<div class="paper st"><div class="txt">${txt}</div></div>`;
    case "typed": return `<div class="paper ty"><div class="txt">${txt}</div></div>`;
    case "label": return `<div class="paper lb"><div class="txt">${it.text ? inked(it, esc(it.text)) : "label"}</div></div>`;
    default: return `<div class="paper ln"><div class="txt">${txt}</div></div>`;
  }
}
// word art: free-floating text
const TEXT_FX = ["sticker", "plain", "outline", "chrome", "label"];
const WORDS = [
  { text: "it girl era", font: "cherry", ink: "pink", fx: "sticker" },
  { text: "lovely day", font: "delafield", ink: "black", fx: "plain" },
  { text: "dreamy", font: "serif", ink: "", fx: "chrome" },
  { text: "loading...", font: "pixel", ink: "black", fx: "plain" },
  { text: "xoxo", font: "bubble", ink: "blue", fx: "sticker" },
  { text: "SUMMER", font: "label", ink: "black", fx: "outline" },
  { text: "miss you already", font: "homemade", ink: "blue", fx: "plain" },
  { text: "note to self", font: "typewriter", ink: "black", fx: "label" },
  { text: "main character", font: "playfair", ink: "red", fx: "plain" },
  { text: "best day ever", font: "shadows", ink: "pink", fx: "sticker" },
];
function textInner(it) {
  const f = fontOf(it.font) || FONTS[1];
  const ink = INKS[it.ink] || "#1b1b1e";
  return `<div class="wt fx-${esc(it.fx || "plain")}" style="font-family:${f.css};font-size:${(2.3 * (f.k || 1)).toFixed(3)}em;font-style:${f.italic ? "italic" : "normal"};--ink:${ink};color:${ink}"><span>${esc(it.text || "your words")}</span></div>`;
}
function stickerInner(it) {
  if (LIB[it.kind]) return `<div class="stk">${LIB[it.kind].html()}</div>`;
  const v = it.variant;
  switch (it.kind) {
    case "puzzle":
      return `<div class="stk"><svg viewBox="8 5 98 92"><path d="${PUZZLE_D}" fill="${PUZZLE_COLORS[v] || PUZZLE_COLORS.mint}" filter="url(#felt)"/></svg></div>`;
    case "spiral":
      return `<div class="stk"><svg viewBox="0 0 100 100"><path d="${SPIRAL_D}" fill="none" stroke="#3a3c40" stroke-width="7" stroke-linecap="round" transform="translate(1.5 2.5)" opacity=".35"/><path d="${SPIRAL_D}" fill="none" stroke="url(#chrome)" stroke-width="6" stroke-linecap="round"/></svg></div>`;
    case "star":
      return `<div class="stk"><svg viewBox="0 0 100 100"><path d="${STAR_D}" fill="url(#${v === "rose" ? "chromeRose" : "chrome"})" stroke="rgba(0,0,0,.25)" stroke-width="1" stroke-linejoin="round"/></svg></div>`;
    case "heart":
      return `<div class="stk"><svg viewBox="0 0 100 100"><path d="${HEART_D}" fill="url(#${v === "rose" ? "chromeRose" : "chrome"})" stroke="rgba(0,0,0,.25)" stroke-width="1"/></svg></div>`;
    case "badge":
      return `<div class="badge ${esc(v || "pink")}">${it.text ? inked(it, esc(it.text)) : "hi"}</div>`;
    default:
      return `<div class="disc"></div>`;
  }
}
const paperName = (k) => CARDS[k]?.name || PAPERS[k]?.name || "paper";
const frameName = (k) => FRAMES2[k]?.name || FRAMES[k]?.name || k;
const hasCaption = (it) => it.type === "photo" && (it.style === "polaroid" || it.style === "idcard");

// ---------------- selection + context bar ----------------
function find(id) { return S.day.items.find((i) => i.id === id); }
function select(id) {
  const prev = S.sel;
  S.sel = id;
  if (prev && S.els.get(prev)) S.els.get(prev).classList.remove("sel");
  if (id && S.els.get(id)) S.els.get(id).classList.add("sel");
  renderCtx();
}
function renderCtx() {
  const it = S.sel && find(S.sel);
  $("#mainBar").hidden = !!it;
  $("#ctxBar").hidden = !it;
  if (!it) return;
  const btn = (act, icon, label, on) => `<button data-c="${act}" class="${on ? "on" : ""} ${act === "delete" ? "danger" : ""}"><b>${icon}</b>${label}</button>`;
  let h = "";
  if (it.type === "photo") {
    h += btn("style", "▢", frameName(it.style));
    if (hasCaption(it)) h += btn("caption", "✎", it.style === "idcard" ? "name" : "caption");
    h += btn("bw", "◑", "b&w", it.bw);
    h += btn("pin", "●", it.pin);
  } else if (it.type === "booth") {
    h += btn("tone", "◑", { bw: "black & white", sepia: "sepia", faded: "faded colour" }[it.tone] || "black & white");
    h += btn("pin", "●", it.pin);
  } else if (it.type === "note") {
    h += btn("write", "✎", "write");
    h += btn("paper", "▤", paperName(it.paper));
    if (!CARDS[it.paper]) h += btn("pin", "●", it.pin);
  } else if (it.type === "text") {
    h += btn("write", "✎", "write");
    h += btn("fx", "✦", it.fx || "plain");
  } else {
    if (STICKERS[it.kind]?.text) h += btn("btext", "✎", "text");
    if ((STICKERS[it.kind]?.variants || []).length > 1) h += btn("variant", "◐", it.variant);
  }
  h += `<span class="sep"></span>` + btn("front", "↑", "front") + btn("back", "↓", "back") + btn("copy", "⧉", "copy") + btn("delete", "✕", "delete");
  h += `<span class="sep"></span>` + btn("done", "✓", "done");
  $("#ctxBar").innerHTML = h;
}
const cycle = (arr, cur) => arr[(arr.indexOf(cur) + 1) % arr.length];
const maxZ = () => S.day.items.reduce((m, i) => Math.max(m, i.z || 0), 0);
const minZ = () => S.day.items.reduce((m, i) => Math.min(m, i.z || 0), 0);

$("#ctxBar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-c]");
  if (!b) return;
  const it = find(S.sel);
  if (!it) return;
  const c = b.dataset.c;
  if (c === "done") return select(null);
  if (c === "delete") return removeItem(it);
  if (c === "write") return editText(it, "text");
  if (c === "caption") return editText(it, "caption");
  if (c === "btext") return editText(it, "text");
  if (c === "style") return openAdd("photos", { id: it.id, kind: "frame" });
  if (c === "paper") return openAdd("write", { id: it.id, kind: "paper" });
  if (c === "copy") {
    const cp = { ...it, id: uid(), x: it.x + 30, y: it.y + 30, z: maxZ() + 1, rot: it.rot + rand(-4, 4) };
    S.day.items.push(cp);
    mount(cp);
    select(cp.id);
    return changed();
  }
  if (c === "bw") it.bw = !it.bw;
  if (c === "tone") it.tone = cycle(BOOTH_TONES, it.tone || "bw");
  if (c === "pin") it.pin = cycle(PINS, it.pin);
  if (c === "fx") it.fx = cycle(TEXT_FX, it.fx || "plain");
  if (c === "variant") it.variant = cycle(STICKERS[it.kind].variants, it.variant);
  if (c === "front") it.z = maxZ() + 1;
  if (c === "back") it.z = minZ() - 1;
  paint(it);
  place(it);
  renderCtx();
  changed();
});

let lastDeleted = null;
function removeItem(it) {
  S.day.items = S.day.items.filter((i) => i !== it);
  S.els.get(it.id)?.remove();
  S.els.delete(it.id);
  lastDeleted = { item: it, date: S.date };
  select(null);
  changed();
  toast("removed", "undo", () => {
    if (!lastDeleted || lastDeleted.date !== S.date) return;
    S.day.items.push(lastDeleted.item);
    mount(lastDeleted.item);
    lastDeleted = null;
    changed();
  });
}

// ---------------- adding things ----------------
// find the emptiest-looking spot on the board for a new item
function spot(w, h) {
  const centers = S.day.items.map((i) => {
    const el = S.els.get(i.id);
    return { x: i.x + (el ? el.offsetWidth : i.w) / 2, y: i.y + (el ? el.offsetHeight : i.w) / 2 };
  });
  let best = null, bestScore = -1;
  for (let k = 0; k < 24; k++) {
    const c = { x: w / 2 + 30 + Math.random() * (BW - w - 60), y: h / 2 + 40 + Math.random() * (BH - h - 80) };
    const score = centers.length ? Math.min(...centers.map((o) => Math.hypot(o.x - c.x, o.y - c.y))) : 1000 - Math.hypot(c.x - BW / 2, c.y - BH / 2);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { x: best.x - w / 2, y: best.y - h / 2 };
}
function addItem(it) {
  it.z = maxZ() + 1;
  S.day.items.push(it);
  mount(it);
  select(it.id);
  changed();
  return it;
}

$("#mainBar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const a = b.dataset.act;
  if (a === "add") openAdd();
  if (a === "board") {
    S.day.board = cycle(BOARDS, S.day.board);
    $("#board").className = "board bg-" + S.day.board;
    toast(`${S.day.board} board`);
    if (S.day.items.length) changed();
  }
});

// photos: she picks the frame first, then the photos that go in it
let pendingFrame = "polaroid";
function choosePhotosFor(frame) {
  pendingFrame = frame;
  closeSheets();
  if (frame === "booth") toast(`pick up to ${BOOTH_MAX} photos for the strip`, null, null, 4000);
  $("#fileIn").click();
}

async function uploadPhoto(f) {
  const { blob, w, h } = await compress(f, 2000, 0.86);
  const fd = new FormData();
  fd.append("file", blob, "photo.jpg");
  fd.append("width", w);
  fd.append("height", h);
  const r = await api("/api/photos", { method: "POST", body: fd });
  return { id: r.id, aspect: h / w };
}

$("#fileIn").addEventListener("change", async (e) => {
  let files = [...e.target.files];
  e.target.value = "";
  if (!files.length) return;
  const frame = pendingFrame;

  if (frame === "booth") {
    if (files.length > BOOTH_MAX) {
      files = files.slice(0, BOOTH_MAX);
      toast(`a strip holds ${BOOTH_MAX}, so i used the first ${BOOTH_MAX}`, null, null, 2500);
    }
    const ids = [];
    try {
      for (let i = 0; i < files.length; i++) {
        toast(`developing the strip… ${i + 1}/${files.length}`, null, null, 60000);
        ids.push((await uploadPhoto(files[i])).id);
      }
    } catch (err) {
      if (err.message !== "signed out") toast(`couldn't add that photo (${err.message})`);
      return;
    }
    const w = rand(150, 175);
    const p = spot(w, w * 0.92 * ids.length + 60);
    addItem({ id: uid(), type: "booth", photos: ids, tone: "bw", pin: "magnet", pinX: rand(-10, 10), pinR: rand(-8, 8),
      x: p.x, y: p.y, w, rot: rand(-6, 6) });
    toast("photobooth strip pinned");
    return;
  }

  let n = 0;
  for (const f of files) {
    n++;
    toast(files.length > 1 ? `pinning ${n} of ${files.length}…` : "pinning your photo…", null, null, 60000);
    try {
      const { id, aspect } = await uploadPhoto(f);
      const fr = FRAMES2[frame];
      const iw = fr ? fr.base * rand(0.85, 1.05) : frame === "egg" ? rand(200, 230) : rand(230, 290);
      const ih = fr ? (iw * fr.h) / fr.w : frame === "polaroid" ? iw * 1.3 : frame === "egg" ? iw * 1.14 : iw * aspect;
      const p = spot(iw, ih);
      addItem({ id: uid(), type: "photo", photo: id, aspect, style: frame, bw: false, caption: "",
        pin: fr || frame === "egg" ? "none" : pick(["magnet", "magnet", "tape"]),
        pinX: rand(-12, 12), pinR: rand(-8, 8), x: p.x, y: p.y, w: iw, rot: fr ? rand(-4, 4) : rand(-7, 7) });
    } catch (err) {
      if (err.message !== "signed out") toast(`couldn't add that photo (${err.message})`);
      return;
    }
  }
  toast(files.length > 1 ? `${files.length} photos pinned` : "photo pinned");
});

async function compress(file, max, q) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("unreadable image")); i.src = URL.createObjectURL(file); });
  }
  const w0 = src.width, h0 = src.height;
  const s = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * s);
  c.height = Math.round(h0 * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
  if (!blob) throw new Error("unreadable image");
  return { blob, w: c.width, h: c.height };
}

// ---------------- the add library ----------------
const TABS = [["photos", "photos"], ["write", "write"], ["words", "words"], ...CATS];
const TAB_HINT = { photos: "pick a frame, then choose photos", write: "pick a paper, then write", words: "tap one, then type your own words" };
let addTab = "photos", restyle = null;
function openAdd(tab = addTab, rs = null) {
  restyle = rs;
  addTab = rs ? tab : TABS.some(([k]) => k === tab) ? tab : "photos";
  $("#addTabs").hidden = !!rs;
  $("#addTitle").textContent = rs ? (rs.kind === "frame" ? "change frame" : "change paper") : "add to your board";
  renderAddTab();
  openSheet("#addSheet");
}
const allFrames = () => ["booth", "polaroid", "print", "egg", "bare", ...Object.keys(FRAMES2)];
const allPapers = () => [...Object.keys(PAPERS), ...Object.keys(CARDS)];
function tile(attrs, pv, name, width, base, cls = "") {
  return `<button class="tile ${cls}" ${attrs}><div class="pv" style="width:${width}px;font-size:${((width / base) * 16).toFixed(2)}px">${pv}</div>${name ? `<span class="nm">${esc(name)}</span>` : ""}</button>`;
}
function renderAddTab() {
  $("#addTabs").innerHTML = TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === addTab ? "on" : ""}">${n}</button>`).join("");
  $("#addHint").textContent = restyle ? (restyle.kind === "frame" ? "your photo moves into the new frame" : "your words move onto the new paper") : TAB_HINT[addTab] || "tap to stick it on";
  const g = $("#addGrid");
  let h = "";
  if (addTab === "photos") {
    g.className = "grid g-photos";
    h = allFrames().filter((k) => !(restyle && k === "booth")).map((k) => {
      if (k === "booth") return tile(`data-frame="booth"`, boothInner({ src: [PH_SRC, PH_SRC, PH_SRC], tone: "bw" }, today()), "photobooth", 46, 150);
      const fr = FRAMES2[k];
      const width = fr ? Math.min(120, 120 * (fr.w / fr.h) > 120 ? 120 : 112 * (fr.w / fr.h) + 10) : k === "egg" ? 86 : 92;
      const pv = photoInner({ src: PH_SRC, style: k, aspect: 1.25, caption: k === "polaroid" ? "summer" : k === "idcard" ? "me" : "" });
      return tile(`data-frame="${k}"`, pv, frameName(k), Math.round(width), fr ? fr.base : 240);
    }).join("");
  } else if (addTab === "write") {
    g.className = "grid g-write";
    h = allPapers().map((k) => {
      const p = PAPERS[k] || CARDS[k];
      const it = { type: "note", paper: k, text: p.sample, no: "0214" };
      return tile(`data-paper="${k}"`, noteInner(it, today()), p.name, k === "label" ? 128 : CARDS[k] ? 136 : 124, p.base, k === "label" ? "is-label" : "");
    }).join("");
  } else if (addTab === "words") {
    g.className = "grid g-words";
    h = WORDS.map((w, i) => tile(`data-word="${i}"`, textInner(w), "", 140, 240)).join("");
  } else if (addTab === "classic") {
    g.className = "grid g-stk";
    for (const [k, st] of Object.entries(STICKERS)) for (const v of st.variants)
      h += tile(`data-kind="${k}" data-variant="${v}"`, stickerInner({ kind: k, variant: v, text: "hi" }), "", 56, st.base);
  } else {
    g.className = "grid g-stk";
    h = Object.values(LIB).filter((d) => d.cat === addTab).map((d) => tile(`data-lib="${d.id}" title="${esc(d.name)}"`, `<div class="stk">${d.html()}</div>`, "", Math.round(Math.min(74, 60 * Math.sqrt(d.base / 90))), d.base)).join("");
  }
  g.innerHTML = h;
}
$("#addTabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  addTab = b.dataset.tab;
  renderAddTab();
  $("#addSheet").scrollTop = 0;
});
$("#addGrid").addEventListener("click", (e) => {
  const t = e.target.closest(".tile");
  if (!t) return;
  const d = t.dataset;
  if (restyle) {
    const it = find(restyle.id);
    restyle = null;
    closeSheets();
    if (!it) return;
    if (d.frame) { it.style = d.frame; it.pin = FRAMES2[d.frame] || d.frame === "egg" ? "none" : it.pin === "none" ? "magnet" : it.pin; }
    if (d.paper) { it.paper = d.paper; if (CARDS[d.paper]) it.pin = "none"; }
    paint(it); place(it); renderCtx(); changed();
    return;
  }
  if (d.frame) return choosePhotosFor(d.frame);
  closeSheets();
  if (d.paper) {
    const k = d.paper, p = PAPERS[k] || CARDS[k];
    const w = k === "label" ? 200 : p.base * rand(0.95, 1.08);
    const pos = spot(w, CARDS[k] ? (w * CARDS[k].h) / CARDS[k].w : 260);
    const db = dateBits(S.date);
    const it = addItem({ id: uid(), type: "note", paper: k, text: k === "label" ? `${db.dow} ${db.d} ${db.mon}` : "", no: String(Math.floor(rand(1000, 99999))).padStart(5, "0"),
      pin: CARDS[k] ? "none" : p.pin, pinX: rand(-15, 15), pinR: rand(-8, 8), x: pos.x, y: pos.y, w, rot: rand(-5, 5) });
    if (k !== "label") editText(it, "text", true);
    return;
  }
  if (d.word) {
    const w = WORDS[+d.word];
    const pos = spot(280, 90);
    const it = addItem({ id: uid(), type: "text", ...w, x: pos.x, y: pos.y, w: 280, rot: rand(-6, 6) });
    editText(it, "text");
    return;
  }
  if (d.lib) {
    const st = LIB[d.lib];
    const w = st.base * rand(0.9, 1.12);
    const pos = spot(w, w);
    addItem({ id: uid(), type: "sticker", kind: d.lib, x: pos.x, y: pos.y, w, rot: d.lib.startsWith("cursor") ? 0 : rand(-14, 14) });
    return;
  }
  if (d.kind) {
    const st = STICKERS[d.kind];
    const w = st.base * rand(0.9, 1.15);
    const pos = spot(w, w);
    const it = addItem({ id: uid(), type: "sticker", kind: d.kind, variant: d.variant, text: st.text ? "hi" : undefined, x: pos.x, y: pos.y, w, rot: rand(-15, 15) });
    if (st.text) editText(it, "text", true);
  }
});

// ---------------- text editor sheet ----------------
let editing = null;
const EDIT_CLASS = { guestcheck: "f-gc", postcard: "f-pc", lined: "f-ln", receipt: "f-rc", ticket: "f-tk", sticky: "f-st", typed: "f-ty", label: "f-lb" };
function editText(it, field, isNew = false) {
  editing = { it, field, isNew, kind: "item", font: it.font || "", ink: it.ink || "" };
  const ta = $("#editText");
  ta.value = it[field] || "";
  let cls = "f-ln", title = "write";
  if (it.type === "note") { cls = EDIT_CLASS[it.paper] || (CARDS[it.paper] ? "f-card" : "f-ln"); title = it.paper === "label" ? "label text" : "write"; }
  if (it.type === "photo") { cls = "f-cap"; title = it.style === "idcard" ? "name on the card" : "caption"; }
  if (it.type === "sticker") { cls = "f-badge"; title = "button text"; }
  if (it.type === "text") { cls = "f-words"; title = "your words"; }
  $("#editPaper").className = "edit-paper " + cls;
  $("#editTitle").textContent = title;
  const long = it.type === "note" && it.paper !== "label";
  $("#promptBtn").hidden = !long;
  ta.placeholder = long ? pick(PROMPTS) : it.type === "photo" ? "where is the next adventure?" : "";
  ta.maxLength = long ? 1200 : it.type === "text" ? 120 : 60;
  renderFontRows();
  openSheet("#editSheet");
  setTimeout(() => ta.focus(), 60);
}
function renderFontRows() {
  const ed = editing;
  const show = ed && ed.kind === "item";
  $("#fontRow").hidden = $("#inkRow").hidden = !show;
  if (!show) return;
  const fonts = ed.it.type === "text" ? FONTS.slice(1) : FONTS;
  $("#fontRow").innerHTML = fonts.map((f) =>
    `<button data-font="${f.id}" class="${(ed.font || "") === f.id ? "on" : ""}" style="${f.css ? `font-family:${f.css};font-style:${f.italic ? "italic" : "normal"}` : ""}">${f.id ? "Aa " + f.name.toLowerCase() : "paper font"}</button>`).join("");
  $("#inkRow").innerHTML = Object.entries(INKS).map(([k, c]) =>
    `<button data-ink="${k}" class="${(ed.ink || "") === k ? "on" : ""}" title="${k || "paper ink"}" style="${c ? `background:${c}` : ""}">${c ? "" : "auto"}</button>`).join("");
  const f = fontOf(ed.font);
  const ta = $("#editText");
  ta.style.fontFamily = f?.css || "";
  ta.style.fontStyle = f?.italic ? "italic" : "";
  ta.style.color = INKS[ed.ink] && ed.ink !== "white" ? INKS[ed.ink] : "";
}
$("#fontRow").addEventListener("click", (e) => {
  const b = e.target.closest("[data-font]");
  if (!b || !editing) return;
  editing.font = b.dataset.font;
  renderFontRows();
});
$("#inkRow").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ink]");
  if (!b || !editing) return;
  editing.ink = b.dataset.ink;
  renderFontRows();
});
function editTitle() {
  editing = { kind: "title" };
  $("#editText").value = S.title;
  $("#editText").placeholder = $("#titleBtn").textContent;
  $("#editText").maxLength = 60;
  $("#editPaper").className = "edit-paper f-title";
  $("#editTitle").textContent = "name your diary";
  $("#promptBtn").hidden = true;
  $("#fontRow").hidden = $("#inkRow").hidden = true;
  $("#editText").style.fontFamily = $("#editText").style.color = "";
  openSheet("#editSheet");
  setTimeout(() => $("#editText").focus(), 60);
}
$("#promptBtn").onclick = () => {
  const ta = $("#editText");
  const p = pick(PROMPTS);
  ta.value = ta.value ? ta.value.replace(/\s*$/, "\n\n") + p + " " : p + " ";
  ta.focus();
};
$("#editSave").onclick = () => commitEdit(true);
$("#editText").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit(true);
});
async function commitEdit(save) {
  const ed = editing;
  editing = null;
  closeSheets(true);
  if (!ed) return;
  const val = $("#editText").value.replace(/\s+$/, "");
  if (ed.kind === "title") {
    if (!save) return;
    S.title = val.trim();
    renderTitle();
    try { await api("/api/profile", { method: "PUT", body: JSON.stringify({ title: S.title }) }); } catch {}
    return;
  }
  const it = ed.it;
  if (!find(it.id)) return;
  if (save) {
    it[ed.field] = val;
    if (ed.font) it.font = ed.font; else delete it.font;
    if (ed.ink) it.ink = ed.ink; else delete it.ink;
    if (it.type === "text" && !it.font) it.font = "caveat";
  }
  if (ed.isNew && it.type === "note" && !it.text) {
    // nothing written on a brand new note: take it back off the board
    S.day.items = S.day.items.filter((i) => i !== it);
    S.els.get(it.id)?.remove();
    S.els.delete(it.id);
    select(null);
    changed();
    return;
  }
  paint(it);
  place(it);
  if (save) changed();
}

// ---------------- sheets ----------------
function openSheet(sel) {
  document.querySelectorAll(".sheet").forEach((s) => (s.hidden = true));
  $("#scrim").hidden = false;
  $(sel).hidden = false;
}
function closeSheets(fromCommit) {
  if (!fromCommit && editing) return commitEdit(false);
  document.querySelectorAll(".sheet").forEach((s) => (s.hidden = true));
  $("#scrim").hidden = true;
  $("#deleteBtn").classList.remove("armed");
  $("#deleteBtn").textContent = "delete account & everything";
}
$("#scrim").onclick = () => closeSheets();
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => closeSheets()));

// account menu
$("#menuBtn").onclick = () => { $("#whoAmI").textContent = `signed in as ${S.user?.email || ""}`; openSheet("#menuSheet"); };
$("#titleBtn").onclick = () => editTitle();
$("#renameBtn").onclick = () => editTitle();
$("#signOutBtn").onclick = async () => {
  await flush();
  try { await api("/api/auth/sign-out", { method: "POST", body: "{}" }); } catch {}
  S.user = null;
  showAuth();
};
$("#deleteBtn").onclick = async (e) => {
  const b = e.currentTarget;
  if (!b.classList.contains("armed")) {
    b.classList.add("armed");
    b.textContent = "tap again: this deletes every day and photo, forever";
    return;
  }
  try {
    await api("/api/account", { method: "DELETE" });
    S.user = null;
    showAuth();
  } catch (err) { toast("couldn't delete: " + err.message); }
};

// ---------------- toast ----------------
let toastTimer;
function toast(msg, actionLabel, action, ms = 3200) {
  const t = $("#toast");
  t.querySelector("span").textContent = msg;
  const b = t.querySelector("button");
  b.hidden = !actionLabel;
  if (actionLabel) { b.textContent = actionLabel; b.onclick = () => { t.hidden = true; action(); }; }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

// ---------------- gestures ----------------
// one finger drags; two fingers pinch to resize and twist to rotate;
// the round handle does resize + rotate with one finger or a mouse.
let G = null;
let lastTap = { id: null, t: 0 };
const board = $("#board");
const ptBoard = (e) => { const r = board.getBoundingClientRect(); return { x: (e.clientX - r.left) / S.scale, y: (e.clientY - r.top) / S.scale }; };
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

function baseline() {
  const it = find(G.id);
  const el = S.els.get(G.id);
  const pts = [...G.ptrs.values()];
  G.base = { x: it.x, y: it.y, w: it.w, rot: it.rot, ow: el.offsetWidth, oh: el.offsetHeight, p0: { ...pts[0] } };
  G.base.c = { x: it.x + G.base.ow / 2, y: it.y + G.base.oh / 2 };
  if (pts.length >= 2) {
    G.base.mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    G.base.d = dist(pts[0], pts[1]) || 1;
    G.base.a = angle(pts[0], pts[1]);
  }
  if (G.mode === "handle") {
    G.base.v = { x: pts[0].x - G.base.c.x, y: pts[0].y - G.base.c.y };
    G.base.l = Math.hypot(G.base.v.x, G.base.v.y) || 1;
    G.base.va = Math.atan2(G.base.v.y, G.base.v.x) * 180 / Math.PI;
  }
}
function applySR(it, s, da, c) {
  const b = G.base;
  const nw = clamp(b.w * s, 30, 1400);
  const k = nw / b.w;
  it.w = nw;
  it.rot = b.rot + da;
  it.x = c.x - (b.ow * k) / 2;
  it.y = c.y - (b.oh * k) / 2;
}

board.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".item");
  if (!el) { if (!G) select(null); return; }
  e.preventDefault();
  const it = find(el.dataset.id);
  if (!it) return;
  const onHandle = !!e.target.closest(".handle");
  if (!G || G.id !== it.id) {
    G = { id: it.id, ptrs: new Map(), moved: false, raised: false, mode: onHandle ? "handle" : "move", sx: e.clientX, sy: e.clientY };
    if (S.sel !== it.id) select(it.id);
    if ((it.z || 0) < maxZ()) { it.z = maxZ() + 1; place(it); G.raised = true; }
  } else if (G.mode === "handle") return;
  G.ptrs.set(e.pointerId, ptBoard(e));
  try { el.setPointerCapture(e.pointerId); } catch {}
  baseline();
});
board.addEventListener("pointermove", (e) => {
  if (!G || !G.ptrs.has(e.pointerId)) return;
  G.ptrs.set(e.pointerId, ptBoard(e));
  const it = find(G.id);
  if (!it) return;
  if (!G.moved && Math.hypot(e.clientX - G.sx, e.clientY - G.sy) < 4 && G.ptrs.size < 2) return;
  G.moved = true;
  const pts = [...G.ptrs.values()];
  const b = G.base;
  if (G.mode === "handle") {
    const v = { x: pts[0].x - b.c.x, y: pts[0].y - b.c.y };
    const s = Math.hypot(v.x, v.y) / b.l;
    const da = Math.atan2(v.y, v.x) * 180 / Math.PI - b.va;
    applySR(it, s, da, b.c);
  } else if (pts.length === 1) {
    it.x = b.x + (pts[0].x - b.p0.x);
    it.y = b.y + (pts[0].y - b.p0.y);
  } else {
    const m = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const s = dist(pts[0], pts[1]) / b.d;
    const da = angle(pts[0], pts[1]) - b.a;
    applySR(it, s, da, { x: b.c.x + m.x - b.mid.x, y: b.c.y + m.y - b.mid.y });
  }
  // keep at least a corner on the board
  it.x = clamp(it.x, -b.ow * 0.7, BW - 40);
  it.y = clamp(it.y, -b.oh * 0.7, BH - 40);
  place(it);
});
function endPointer(e) {
  if (!G || !G.ptrs.has(e.pointerId)) return;
  G.ptrs.delete(e.pointerId);
  if (G.ptrs.size > 0) { baseline(); return; }
  const g = G;
  G = null;
  if (g.moved || g.raised) changed();
  if (!g.moved) {
    const now = Date.now();
    if (lastTap.id === g.id && now - lastTap.t < 320) {
      const it = find(g.id);
      if (it?.type === "note") editText(it, "text");
      else if (it?.type === "text") editText(it, "text");
      else if (it && hasCaption(it)) editText(it, "caption");
      else if (it?.type === "sticker" && STICKERS[it.kind]?.text) editText(it, "text");
      lastTap = { id: null, t: 0 };
    } else lastTap = { id: g.id, t: now };
  }
}
board.addEventListener("pointerup", endPointer);
board.addEventListener("pointercancel", endPointer);
// stop iOS page zoom from pinching on the board
document.addEventListener("gesturestart", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea")) {
    if (e.key === "Escape") closeSheets();
    return;
  }
  if (e.key === "Escape") { if (!$("#scrim").hidden) closeSheets(); else select(null); }
  const it = S.sel && find(S.sel);
  if (!it) {
    if (e.key === "ArrowLeft") openDay(addDays(S.date, -1));
    if (e.key === "ArrowRight") openDay(addDays(S.date, 1));
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeItem(it); }
});

window.addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(h) && h !== S.date && S.user) openDay(h);
});

boot();
