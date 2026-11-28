// magnet diary: client
import { LIB, CATS, FRAMES2, CARDS, FONTS, INKS } from "/stickers.js";
import * as db from "/store.js";
import * as community from "/community.js";
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
const uid = () => crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
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

// ---------------- photos: private, shown through signed links ----------------
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const URLS = new Map(); // path -> { url, at }
const URL_TTL = 10 * 60 * 60 * 1000;
const photoUrl = (path) => { const u = URLS.get(path); return u && Date.now() - u.at < URL_TTL ? u.url : null; };
let hydrating = null;
// fill every <img data-photo> on the page with a signed link, fetching missing ones in one go
async function hydratePhotos(root = document) {
  const imgs = [...root.querySelectorAll("img[data-photo]")];
  const missing = [...new Set(imgs.map((i) => i.dataset.photo).filter((p) => p && !photoUrl(p)))];
  if (missing.length) {
    try {
      const got = await db.signPhotos(missing);
      for (const [p, url] of Object.entries(got)) URLS.set(p, { url, at: Date.now() });
    } catch { /* leave blanks; next render retries */ }
  }
  for (const img of root.querySelectorAll("img[data-photo]")) {
    const u = photoUrl(img.dataset.photo);
    if (u && img.getAttribute("src") !== u) img.src = u;
  }
}
function queueHydrate() {
  if (hydrating) return;
  hydrating = requestAnimationFrame(() => { hydrating = null; hydratePhotos(); });
}

// ---------------- auth screen ----------------
let authMode = "signin";
function showAuth(msg = "") {
  $("#app").hidden = true;
  $("#auth").hidden = false;
  $("#authErr").textContent = msg;
  closeSheets();
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x.dataset.mode === mode));
  $(".name-field").hidden = mode !== "signup";
  $(".pw-field").hidden = mode === "forgot";
  $("#authBtn").textContent = mode === "signup" ? "create my diary" : mode === "forgot" ? "send reset link" : "sign in";
  $("#forgotLink").textContent = mode === "forgot" ? "back to sign in" : "forgot password?";
  $("#forgotLink").hidden = mode === "signup";
  $("#authForm").password.required = mode !== "forgot";
  $("#authForm").password.autocomplete = mode === "signup" ? "new-password" : "current-password";
  $("#authErr").textContent = "";
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setAuthMode(b.dataset.mode)));
$("#forgotLink").addEventListener("click", () => setAuthMode(authMode === "forgot" ? "signin" : "forgot"));
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = $("#authBtn");
  const email = f.email.value.trim();
  btn.disabled = true;
  $("#authErr").textContent = "";
  try {
    if (authMode === "signup") {
      const { needsConfirm } = await db.signUp(f.name.value.trim() || email.split("@")[0], email, f.password.value);
      f.password.value = "";
      if (needsConfirm) { setAuthMode("signin"); $("#authErr").textContent = "check your email to confirm your account, then sign in here."; return; }
    } else if (authMode === "forgot") {
      await db.sendReset(email);
      $("#authErr").textContent = "if that email has an account, a reset link is on its way.";
      return;
    } else {
      await db.signIn(email, f.password.value);
      f.password.value = "";
    }
    await boot();
  } catch (err) {
    const m = String(err.message || "").toLowerCase();
    $("#authErr").textContent = m.includes("invalid login") ? "that email and password don't match." : m.includes("rate limit") ? "too many emails sent just now. try again in a bit." : m;
  } finally {
    btn.disabled = false;
  }
});

// ---------------- boot + routing ----------------
let booted = false;
async function boot() {
  // invite links: remember the code until they're signed in
  const jm = location.hash.match(/^#join\/([a-z0-9]{6,20})$/i);
  if (jm) { try { localStorage.setItem("pendingInvite", jm[1].toLowerCase()); } catch {} }
  const user = await db.currentUser().catch(() => null);
  if (!user) {
    showAuth();
    let pending = null;
    try { pending = localStorage.getItem("pendingInvite"); } catch {}
    if (pending) { setAuthMode("signup"); community.showInviteBanner(pending); }
    return;
  }
  S.user = { id: user.id, email: user.email, name: user.user_metadata?.name || "" };
  try {
    S.me = await db.myProfile(user.id);
    S.title = S.me.diary_title || "";
    if (S.me.display_name) S.user.name = S.me.display_name;
  } catch { S.me = { id: user.id }; S.title = ""; }
  $("#auth").hidden = true;
  $("#app").hidden = false;
  renderTitle();
  community.renderMeTab();
  booted = true;
  $("#inviteBanner").hidden = true;
  const joined = await community.redeemPending();
  if (joined?.board_id) { location.hash = "#b/" + joined.board_id; return; }
  if (joined || /^#join\//.test(location.hash)) { location.hash = "#feed"; return; }
  await route();
}
db.onAuthChange((event, user) => {
  if (event === "PASSWORD_RECOVERY") { openPasswordSheet(); return; }
  if (event === "SIGNED_OUT") { S.user = null; booted = false; leaveBoard(); showAuth(); }
});

async function route() {
  if (!S.user) return;
  if (!$("#scrim").hidden) closeSheets();
  const h = decodeURIComponent(location.hash.slice(1));
  const dm = h.match(/^(\d{4}-\d{2}-\d{2})(?:\/(\d{1,2}))?$/);
  if (dm) return openDay(dm[1], dm[2] ? Math.max(1, Math.min(20, +dm[2])) : 1);
  if (h === "" || h === "today") return openDay(today());
  if (h.startsWith("b/")) return openBoard(h.slice(2));
  if (h === "feed" || h === "following" || h === "home") return community.feedPage();
  if (h === "explore" || h === "search") return community.explorePage();
  if (h === "activity") return community.activityPage();
  if (h === "together") return community.togetherPage();
  if (h === "me") return community.mePage();
  if (h.startsWith("@")) return community.profilePage(h.slice(1).toLowerCase());
  if (h.startsWith("p/")) return community.postPage(h.slice(2));
  if (h.startsWith("recap")) return community.recapPage(h.slice(6));
  if (h.startsWith("join/")) { location.hash = "#feed"; return; }
  return openDay(today());
}
window.addEventListener("hashchange", () => { if (S.user) route(); });

// which screen is showing: the editable board, or a scrolling page
function setView(kind, tab) {
  S.view = kind;
  const onBoard = kind === "board";
  const isDay = onBoard && S.ctx?.kind === "day";
  $("#stage").hidden = !onBoard;
  $("#page").hidden = onBoard;
  document.querySelector("header.top").hidden = !onBoard;
  document.querySelector(".dock").hidden = !onBoard;
  $("#status").hidden = !onBoard;
  $("#daysBtn").hidden = !isDay;
  $("#dateNav").hidden = !isDay;
  $("#pageBar").hidden = !isDay;
  $("#boardHead").hidden = !(onBoard && !isDay);
  $("#bgBtn").hidden = !S.isOwner;
  $("#postBtn").hidden = !S.isOwner;
  $("#peopleBtn").hidden = !(onBoard && S.ctx?.kind === "board");
  document.querySelectorAll("#tabbar [data-tab]").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  if (onBoard) fit();
  else select(null);
}
const dayKey = (date, page) => `d:${date}/${page || 1}`;
function ctxKey() { return S.ctx?.kind === "day" ? dayKey(S.date, S.page) : "b:" + S.boardId; }
const dayHash = (date, page) => "#" + date + (page > 1 ? "/" + page : "");

// stop editing whatever board is open (save it, stop listening for friends' changes)
function leaveBoard() {
  if (S.unwatch) { S.unwatch(); S.unwatch = null; }
  S.live = [];
  if (dirty) flush();
}

function renderTitle() {
  const first = (S.user?.name || "my").split(" ")[0].toLowerCase();
  $("#titleBtn").textContent = S.title || `${first}'s magnet diary`;
}
function renderPostBtn() {
  const b = $("#postBtn");
  b.classList.toggle("on", !!S.post);
  b.querySelector("span").textContent = S.post ? "posted" : "post";
}

// ---------------- days ----------------
async function openDay(date, page = 1) {
  await flush();
  leaveBoard();
  S.ctx = { kind: "day", date };
  S.date = date;
  S.page = page;
  S.isOwner = true;
  S.post = null;
  S.visibility = "private";
  select(null);
  if (location.hash !== dayHash(date, page)) history.replaceState(null, "", dayHash(date, page));
  renderDate();
  renderPages();
  S.day = { board: "silver", items: [] };
  S.boardId = null;
  S.saved = new Map();
  S.savedBoard = "silver";
  setView("board", "diary");
  renderBoard();
  renderPostBtn();
  try {
    const d = await db.loadDay(S.user.id, date, page);
    if (ctxKey() !== dayKey(date, page)) return;
    S.boardId = d.boardId;
    S.day = { board: d.background || "silver", items: d.items };
    S.savedBoard = S.day.board;
    S.saved = new Map(d.items.map((it) => [it.id, JSON.stringify(cleanItem(it))]));
    renderBoard();
    setStatus("saved");
    if (S.boardId) {
      startWatch(S.boardId);
      const [post, info] = await Promise.all([db.postForBoard(S.boardId), db.boardInfo(S.boardId)]);
      if (ctxKey() !== dayKey(date, page)) return;
      S.post = post;
      S.visibility = info?.visibility || "private";
      renderPostBtn();
    }
  } catch (e) {
    setStatus("error", "couldn't load");
  }
}

// ---------------- shared boards (and any board by id) ----------------
async function openBoard(id) {
  await flush();
  leaveBoard();
  select(null);
  let info = null;
  try { info = await db.boardInfo(id); } catch {}
  if (!info) { pageMessage("this board isn't available. it may have been deleted, or you're not on it."); return; }
  if (info.kind === "day" && info.my_role === "owner") return openDay(info.day);
  if (info.my_role !== "owner" && info.my_role !== "editor") {
    if (info.post_id) { history.replaceState(null, "", "#p/" + info.post_id); return community.postPage(info.post_id); }
    pageMessage("you can see this board once its owner adds you.");
    return;
  }
  S.ctx = { kind: "board", id, info };
  S.isOwner = info.my_role === "owner";
  S.boardId = id;
  S.post = info.post_id ? { id: info.post_id } : null;
  S.visibility = info.visibility;
  S.day = { board: info.background || "silver", items: [] };
  S.saved = new Map();
  S.savedBoard = S.day.board;
  $("#boardTitle").textContent = info.title || "untitled memories";
  $("#boardTitle").classList.toggle("editable", S.isOwner);
  $("#boardFaces").innerHTML = "";
  $("#boardLive").textContent = "";
  setView("board", "together");
  renderBoard();
  renderPostBtn();
  try {
    const items = await db.boardItems(id);
    if (ctxKey() !== "b:" + id) return;
    S.day.items = items;
    S.saved = new Map(items.map((it) => [it.id, JSON.stringify(cleanItem(it))]));
    renderBoard();
    setStatus("saved");
    startWatch(id);
    db.boardPeople(id).then(setFaces).catch(() => {});
    if (S.post) db.postForBoard(id).then((p) => { if (ctxKey() === "b:" + id) { S.post = p; renderPostBtn(); } }).catch(() => {});
  } catch { setStatus("error", "couldn't load"); }
}
function pageMessage(msg) {
  leaveBoard();
  setView("page", "together");
  $("#page").innerHTML = `<section class="empty-page small"><p>${esc(msg)}</p><a class="chip" href="#together">back to together</a></section>`;
}
function setFaces(people) {
  if (S.ctx?.kind !== "board") return;
  S.people = people;
  const live = new Set((S.live || []).map((p) => p.uid));
  $("#boardFaces").innerHTML = people.slice(0, 5).map((p) => `<span class="face ${live.has(p.user_id) ? "live" : ""}">${community.avatar(p, "s")}</span>`).join("");
}
$("#boardBack").onclick = () => (location.hash = "#together");
$("#boardTitle").onclick = () => { if (S.isOwner) editBoardTitle(); };
$("#boardPeopleBtn").onclick = () => community.openPeople();

// live: apply friends' changes as they happen
function startWatch(boardId) {
  if (S.unwatch) S.unwatch();
  S.unwatch = db.watchBoard(boardId, S.user, (ev) => {
    if (S.boardId !== boardId) return;
    const { type, item } = ev;
    const cur = find(item.id);
    if (G && G.id === item.id) return; // she's holding it right now
    if (editing && editing.it && editing.it.id === item.id) return;
    if (type === "delete") {
      if (!cur || !S.saved.has(item.id)) return;
      S.day.items = S.day.items.filter((i) => i !== cur);
      S.els.get(item.id)?.remove();
      S.els.delete(item.id);
      S.saved.delete(item.id);
      if (S.sel === item.id) select(null);
      $("#empty").hidden = S.day.items.length > 0;
      return;
    }
    const incoming = JSON.stringify(cleanItem(item));
    if (S.saved.get(item.id) === incoming) return; // our own save coming back
    if (cur && JSON.stringify(cleanItem(cur)) !== S.saved.get(item.id)) return; // she has unsaved changes to it
    S.saved.set(item.id, incoming);
    if (cur) { Object.keys(cur).forEach((k) => delete cur[k]); Object.assign(cur, item); paint(cur); place(cur); }
    else { S.day.items.push(item); mount(item); }
    $("#empty").hidden = S.day.items.length > 0;
  }, (people) => {
    S.live = people;
    if (S.ctx?.kind !== "board") return;
    const others = people.filter((p) => p.uid !== S.user.id).length;
    $("#boardLive").textContent = others ? `${others} here now` : "";
    if (S.people) setFaces(S.people);
  });
}

function renderDate() {
  const d = parseYmd(S.date);
  const isToday = S.date === today();
  $("#dateMain").textContent = isToday ? `today, ${d.getDate()} ${MON[d.getMonth()]}` : `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  $("#dateYear").textContent = d.getFullYear();
}
// ---------------- several boards on one day ----------------
let pagesFor = null; // { date, list: [{ id, page, count }] }
async function renderPages() {
  const bar = $("#pageBar");
  const date = S.date, page = S.page || 1;
  const draw = () => {
    if (S.date !== date) return;
    const list = (pagesFor && pagesFor.date === date ? pagesFor.list : []).filter((p) => p.count > 0 || p.page === page || p.id === S.boardId);
    if (!list.some((p) => p.page === page)) list.push({ page, count: 0 });
    list.sort((a, b) => a.page - b.page);
    const multi = list.length > 1;
    bar.innerHTML = (multi ? list.map((p, i) => `<button class="pg ${p.page === page ? "on" : ""}" data-page="${p.page}" aria-label="board ${i + 1}">${i + 1}</button>`).join("") : "")
      + `<button class="pg add" id="pgAdd" aria-label="new board for this day">＋${multi ? "" : " another board"}</button>`;
    bar.querySelectorAll("[data-page]").forEach((b) => (b.onclick = () => {
      const p = +b.dataset.page;
      if (p === S.page) return pageMenu(list);
      openDay(S.date, p);
    }));
    $("#pgAdd").onclick = () => {
      const max = Math.max(...list.map((p) => p.page));
      if (!S.day.items.length && list.length > 1 && page === max) return toast("pin something here first");
      if (max >= 20) return toast("20 boards is the most for one day");
      openDay(S.date, max + 1);
    };
  };
  draw();
  try {
    const list = await db.dayPages(date);
    pagesFor = { date, list };
    draw();
  } catch {}
}
function pageMenu(list) {
  const items = [{ label: "new board for this day", run: () => $("#pgAdd").click() }];
  if (list.length > 1) items.push({ label: "delete this board", danger: true, run: () => community.actions("delete this board?", [
    { label: "yes, delete it and everything on it", danger: true, run: deleteThisPage },
    { label: "keep it", run: () => {} },
  ]) });
  community.actions(`board ${list.findIndex((p) => p.page === S.page) + 1} of ${list.length}`, items);
}
async function deleteThisPage() {
  const date = S.date, id = S.boardId;
  dirty = false; clearTimeout(saveTimer);
  try {
    if (id) await db.deleteBoard(id);
    const rest = (pagesFor?.list || []).filter((p) => p.id !== id && p.count > 0);
    toast("board deleted");
    openDay(date, rest.length ? rest[0].page : 1);
  } catch (e) { toast("couldn't delete: " + e.message); }
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
  $("#recapLink").href = "#recap/" + S.date.slice(0, 7);
  $("#recapLink").onclick = () => closeSheets();
  const list = $("#daysList");
  list.innerHTML = `<p class="days-empty">loading…</p>`;
  try {
    await flush();
    const days = await db.listDays();
    if (!days.length) { list.innerHTML = `<p class="days-empty">no days pinned yet. today is a good start.</p>`; return; }
    list.innerHTML = days.map((d) => {
      const dt = parseYmd(d.date);
      return `<button class="day-row ${d.date === S.date ? "cur" : ""}" data-date="${d.date}">
        <span class="day-thumb">${d.preview ? `<img data-photo="${esc(d.preview)}" src="${BLANK}" alt="" loading="lazy">` : ""}</span>
        <span><b>${DOW_LONG[dt.getDay()]} ${dt.getDate()} ${MON[dt.getMonth()]}</b><small>${dt.getFullYear()} · ${d.count} ${d.count === 1 ? "thing" : "things"} pinned${d.pages > 1 ? ` · ${d.pages} boards` : ""}</small></span>
      </button>`;
    }).join("");
    list.querySelectorAll(".day-row").forEach((b) => (b.onclick = () => { closeSheets(); openDay(b.dataset.date); }));
    hydratePhotos(list);
  } catch { list.innerHTML = `<p class="days-empty">couldn't load your days.</p>`; }
}

// ---------------- saving ----------------
// Only the pieces that changed since the last save are sent, one row each.
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
  if (!dirty || !S.user || !S.ctx) return;
  if (saving) { saveTimer = setTimeout(flush, 300); return; }
  dirty = false;
  saving = true;
  const key = ctxKey();
  const isDay = S.ctx.kind === "day";
  const date = S.date;
  const page = S.page || 1;
  const uid = S.user.id;
  const items = S.day.items;
  const saved = S.saved;
  const now = new Map(items.map((it) => [it.id, cleanItem(it)]));
  const changedItems = [...now.values()].filter((it) => saved.get(it.id) !== JSON.stringify(it));
  const removed = [...saved.keys()].filter((id) => !now.has(id));
  const bg = S.day.board;
  try {
    if (isDay && !S.boardId && (changedItems.length || bg !== "silver")) {
      S.boardId = await db.ensureDayBoard(uid, date, bg, page);
      if (ctxKey() === dayKey(date, page)) { startWatch(S.boardId); renderPages(); }
    }
    const boardId = S.boardId;
    if (boardId && S.isOwner && bg !== S.savedBoard) await db.setBackground(boardId, bg);
    if (boardId) {
      // mark as saved before the write lands so our own echo from the live feed is ignored
      for (const it of changedItems) saved.set(it.id, JSON.stringify(it));
      for (const id of removed) saved.delete(id);
      await db.saveItems(boardId, uid, changedItems);
      await db.deleteItems(removed);
    }
    if (ctxKey() === key || (isDay && ctxKey() === dayKey(date, page))) S.savedBoard = bg;
    if (!dirty) setStatus("saved");
  } catch (e) {
    // put them back as unsaved so the retry sends them again
    for (const it of changedItems) saved.delete(it.id);
    for (const id of removed) saved.set(id, "unsaved-delete");
    dirty = true;
    setStatus("error", "not saved, retrying");
    saveTimer = setTimeout(flush, 4000);
  } finally {
    saving = false;
  }
}
function cleanItem(it) {
  const o = {};
  for (const [k, v] of Object.entries(it)) if (v !== undefined) o[k] = typeof v === "number" ? Math.round(v * 10) / 10 : v;
  return o;
}
function setStatus(kind, text) {
  const el = $("#status");
  el.className = "status " + (kind === "saved" ? "" : kind);
  el.querySelector("span").textContent = text || (kind === "saving" ? "saving…" : kind === "error" ? "error" : "saved");
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
window.addEventListener("pagehide", () => flush());

// ---------------- new password (from a reset email) ----------------
function openPasswordSheet() {
  $("#app").hidden = false;
  $("#auth").hidden = true;
  $("#pwErr").textContent = "";
  openSheet("#pwSheet");
  setTimeout(() => $("#pwNew").focus(), 60);
}
$("#pwSave").addEventListener("click", async () => {
  const pw = $("#pwNew").value;
  if (pw.length < 8) { $("#pwErr").textContent = "use at least 8 characters."; return; }
  try {
    await db.setPassword(pw);
    $("#pwNew").value = "";
    closeSheets();
    toast("password updated");
    if (!booted) boot();
  } catch (err) { $("#pwErr").textContent = String(err.message).toLowerCase(); }
});

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
  if (el.querySelector("img[data-photo]")) queueHydrate();
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
const imgTag = (path, src) => src ? `<img src="${src}" alt="" draggable="false">` : `<img data-photo="${esc(path)}" src="${photoUrl(path) || BLANK}" alt="" draggable="false">`;
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
  lastDeleted = { item: it, key: ctxKey() };
  select(null);
  changed();
  toast("removed", "undo", () => {
    if (!lastDeleted || lastDeleted.key !== ctxKey()) return;
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
  if (a === "post") community.openPostSheet();
  if (a === "story") community.storyForCurrentBoard();
  if (a === "people") community.openPeople();
  if (a === "board" && S.isOwner) {
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
  if (frame === "ai") toast(`pick up to ${AI_MAX} photos and i'll design the board`, null, null, 4000);
  $("#fileIn").click();
}

async function uploadPhoto(f) {
  const { blob, w, h } = await compress(f, 2000, 0.86);
  const path = await db.uploadPhoto(S.user.id, blob);
  URLS.set(path, { url: URL.createObjectURL(blob), at: Date.now() }); // show it instantly
  return { id: path, aspect: h / w };
}

$("#fileIn").addEventListener("change", async (e) => {
  let files = [...e.target.files];
  e.target.value = "";
  if (!files.length) return;
  const frame = pendingFrame;
  if (frame === "ai") return openAiSheet(files);

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

async function compress(file, max, q, square = false) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("unreadable image")); i.src = URL.createObjectURL(file); });
  }
  const w0 = src.width, h0 = src.height;
  const c = document.createElement("canvas");
  if (square) {
    const side = Math.min(w0, h0), out = Math.min(max, side);
    c.width = c.height = out;
    c.getContext("2d").drawImage(src, (w0 - side) / 2, (h0 - side) / 2, side, side, 0, 0, out, out);
  } else {
    const s = Math.min(1, max / Math.max(w0, h0));
    c.width = Math.round(w0 * s);
    c.height = Math.round(h0 * s);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  }
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
    const aiTile = restyle ? "" : `<button class="tile ai-tile" data-frame="ai"><span class="ai-spark">✦</span><b>ai arrange</b><small>pick photos, get a finished board</small></button>`;
    h = aiTile + allFrames().filter((k) => !(restyle && k === "booth")).map((k) => {
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
function editTitle(kind = "title") {
  editing = { kind };
  const board = kind === "boardTitle";
  $("#editText").value = board ? S.ctx?.info?.title || "" : S.title;
  $("#editText").placeholder = board ? "name this board" : $("#titleBtn").textContent;
  $("#editText").maxLength = board ? 80 : 60;
  $("#editPaper").className = "edit-paper f-title";
  $("#editTitle").textContent = board ? "name this board" : "name your diary";
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
  if (ed.kind === "boardTitle") {
    if (!save || !S.ctx?.info) return;
    const t = val.trim() || "untitled memories";
    try { await db.renameBoard(S.ctx.info.id, t); S.ctx.info.title = t; $("#boardTitle").textContent = t; } catch { toast("couldn't rename the board"); }
    return;
  }
  if (ed.kind === "title") {
    if (!save) return;
    S.title = val.trim();
    renderTitle();
    try { await db.setDiaryTitle(S.user.id, S.title); } catch { toast("couldn't save the new name"); }
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
function openMenu() { $("#whoAmI").textContent = `signed in as ${S.user?.email || ""}`; openSheet("#menuSheet"); }
$("#menuBtn").onclick = openMenu;
$("#titleBtn").onclick = () => editTitle();
$("#renameBtn").onclick = () => editTitle();
$("#signOutBtn").onclick = async () => {
  await flush();
  try { await db.signOut(); } catch {}
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
    await db.deleteAccount();
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
    if (S.view === "board" && S.ctx?.kind === "day" && $("#scrim").hidden) {
      if (e.key === "ArrowLeft") openDay(addDays(S.date, -1));
      if (e.key === "ArrowRight") openDay(addDays(S.date, 1));
    }
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeItem(it); }
});


// ---------------- AI arrange ----------------
const AI_MAX = 8;
const VIBES = ["cozy sunday", "y2k digicam", "soft pink", "film camera", "summer core", "night out", "study date", "chrome + silver"];
let aiFiles = [];
function openAiSheet(files) {
  aiFiles = files.slice(0, AI_MAX);
  if (files.length > AI_MAX) toast(`i'll use the first ${AI_MAX} photos`);
  $("#aiThumbs").innerHTML = aiFiles.map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join("");
  $("#aiVibe").value = "";
  $("#aiVibes").innerHTML = VIBES.map((v) => `<button type="button" class="chip" data-vibe="${esc(v)}">${esc(v)}</button>`).join("");
  const hasItems = S.day.items.length > 0;
  $("#aiMode").hidden = !hasItems;
  $("#aiMode").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.mode === "add"));
  openSheet("#aiSheet");
}
$("#aiVibes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vibe]");
  if (b) $("#aiVibe").value = b.dataset.vibe;
});
$("#aiMode").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (b) $("#aiMode").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
});
$("#aiGo").addEventListener("click", async () => {
  const files = aiFiles;
  if (!files.length) return;
  const vibe = $("#aiVibe").value.trim();
  const fresh = !$("#aiMode").hidden && $("#aiMode .on")?.dataset.mode === "fresh";
  closeSheets();
  const overlay = $("#aiWorking");
  overlay.hidden = false;
  $("#aiWorkingText").textContent = "uploading your photos…";
  try {
    // upload the photos (needed either way) and make small copies for the AI to look at
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      $("#aiWorkingText").textContent = `uploading photo ${i + 1} of ${files.length}…`;
      const up = await uploadPhoto(files[i]);
      const small = await compress(files[i], 640, 0.72);
      photos.push({ ...up, data: await blobToDataUrl(small.blob) });
    }
    $("#aiWorkingText").textContent = "designing your board…";
    let layout = null, usedAi = true;
    try {
      layout = await db.ai({ mode: "board", vibe, date: prettyDate(S.date || today()), photos: photos.map((p) => ({ data: p.data })), catalog: aiCatalog() });
    } catch (err) {
      usedAi = false;
      if (err.code === "daily_limit") toast("you've used today's ai boards, here's a quick layout instead");
      else if (err.code !== "ai_not_configured") console.warn("ai arrange failed", err);
    }
    let items = layout ? buildAiItems(layout, photos) : [];
    if (!items.some((i) => i.type === "photo" || i.type === "booth")) { items = fallbackLayout(photos, vibe); usedAi = false; }
    applyGenerated(items, layout?.board, fresh, usedAi);
  } catch (err) {
    toast("couldn't make the board: " + (err.message || err));
  } finally {
    overlay.hidden = true;
  }
});
function blobToDataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
function prettyDate(d) { const x = parseYmd(d); return `${DOW_LONG[x.getDay()]} ${x.getDate()} ${MON[x.getMonth()]} ${x.getFullYear()}`; }
function aiCatalog() {
  return {
    frames: allFrames().filter((k) => k !== "booth").map((k) => ({ id: k, name: frameName(k) })),
    booth_tones: BOOTH_TONES,
    papers: allPapers().filter((k) => k !== "label").map((k) => ({ id: k, name: paperName(k) })),
    fonts: FONTS.filter((f) => f.id).map((f) => ({ id: f.id, name: f.name })),
    inks: Object.keys(INKS).filter(Boolean),
    word_styles: TEXT_FX,
    stickers: Object.values(LIB).map((d) => ({ id: d.id, name: d.name, group: d.cat })),
    backgrounds: BOARDS,
  };
}
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : d; };
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
// turn the AI's plan into real board items, refusing anything that doesn't exist
function buildAiItems(layout, photos) {
  const frames = allFrames().filter((k) => k !== "booth");
  const papers = allPapers();
  const fonts = FONTS.map((f) => f.id).filter(Boolean);
  const used = new Set();
  const out = [];
  for (const raw of (layout.items || []).slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const base = { id: uid(), x: num(raw.x, -40, BW - 40, 100), y: num(raw.y, -40, BH - 40, 100), rot: num(raw.rot, -18, 18, 0), pinX: rand(-12, 12), pinR: rand(-8, 8) };
    if (raw.type === "photo") {
      const i = Math.round(num(raw.photo, 0, photos.length - 1, -1));
      if (i < 0 || used.has(i) || !photos[i]) continue;
      used.add(i);
      const style = oneOf(raw.frame, frames, "polaroid");
      const fr = FRAMES2[style];
      out.push({ ...base, type: "photo", photo: photos[i].id, aspect: photos[i].aspect, style, bw: !!raw.bw,
        caption: String(raw.caption || "").slice(0, 60), pin: fr || style === "egg" ? "none" : oneOf(raw.pin, PINS, "magnet"),
        w: num(raw.w, 150, fr ? fr.base * 1.3 : 380, 260) });
    } else if (raw.type === "booth") {
      const idx = (Array.isArray(raw.photos) ? raw.photos : []).map((v) => Math.round(Number(v))).filter((v) => photos[v] && !used.has(v)).slice(0, BOOTH_MAX);
      if (idx.length < 2) continue;
      idx.forEach((v) => used.add(v));
      out.push({ ...base, type: "booth", photos: idx.map((v) => photos[v].id), tone: oneOf(raw.tone, BOOTH_TONES, "bw"), pin: oneOf(raw.pin, PINS, "magnet"), w: num(raw.w, 120, 200, 160) });
    } else if (raw.type === "note") {
      const paper = oneOf(raw.paper, papers, "lined");
      const p = PAPERS[paper] || CARDS[paper];
      const text = String(raw.text || "").slice(0, 300);
      if (!text) continue;
      const it = { ...base, type: "note", paper, text, no: String(Math.floor(rand(1000, 99999))).padStart(5, "0"),
        pin: CARDS[paper] ? "none" : oneOf(raw.pin, PINS, p.pin), w: num(raw.w, 140, 380, p.base) };
      if (fonts.includes(raw.font)) it.font = raw.font;
      if (raw.ink && INKS[raw.ink]) it.ink = raw.ink;
      out.push(it);
    } else if (raw.type === "text") {
      const text = String(raw.text || "").slice(0, 60);
      if (!text) continue;
      out.push({ ...base, type: "text", text, font: oneOf(raw.font, fonts, "cherry"), ink: INKS[raw.ink] ? raw.ink : "black", fx: oneOf(raw.fx, TEXT_FX, "sticker"), w: num(raw.w, 160, 520, 300) });
    } else if (raw.type === "sticker") {
      if (!LIB[raw.kind]) continue;
      out.push({ ...base, type: "sticker", kind: raw.kind, w: num(raw.w, 36, 180, LIB[raw.kind].base) });
    }
  }
  // any photo the AI forgot still goes on the board
  photos.forEach((p, i) => {
    if (used.has(i)) return;
    const w = rand(220, 270), pos = spotAmong(out, w, w * 1.3);
    out.push({ id: uid(), type: "photo", photo: p.id, aspect: p.aspect, style: "polaroid", bw: false, caption: "", pin: "magnet", pinX: rand(-12, 12), pinR: rand(-8, 8), x: pos.x, y: pos.y, w, rot: rand(-7, 7) });
  });
  return out;
}
// a tasteful layout without AI: photos in a loose staggered grid, a headline, a note, a few stickers
function fallbackLayout(photos, vibe) {
  const out = [];
  const n = photos.length;
  const cols = n <= 2 ? 2 : n <= 4 ? 2 : 3;
  const cellW = (BW - 80) / cols;
  const rows = Math.ceil(n / cols);
  const cellH = (BH - 340) / Math.max(rows, 1);
  const frameSet = ["polaroid", "polaroid", "print", "cam-silver", "egg", "polaroid", "print", "cam-pink"];
  photos.forEach((p, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const style = frameSet[i % frameSet.length];
    const fr = FRAMES2[style];
    const w = Math.min(cellW * 0.92, fr ? fr.base : 300) * rand(0.9, 1.02);
    const h = fr ? (w * fr.h) / fr.w : style === "polaroid" ? w * 1.3 : w * p.aspect;
    out.push({ id: uid(), type: "photo", photo: p.id, aspect: p.aspect, style, bw: false, caption: "",
      pin: fr || style === "egg" ? "none" : i % 3 === 2 ? "tape" : "magnet", pinX: rand(-12, 12), pinR: rand(-8, 8),
      x: 40 + c * cellW + (cellW - w) / 2 + rand(-20, 20) + (r % 2 ? 18 : -18), y: 170 + r * cellH + Math.max(0, (cellH - h) / 2) + rand(-15, 15), w, rot: rand(-7, 7) });
  });
  const d = dateBits(S.date || today());
  out.push({ id: uid(), type: "text", text: vibe || `${d.dow} ${d.d} ${d.mon}`, font: "cherry", ink: "pink", fx: "sticker", x: 60, y: 40, w: 340, rot: -4 });
  out.push({ id: uid(), type: "note", paper: pick(["cc-scallop", "cc-oval", "sticky", "postcard"]), text: pick(["a day worth keeping", "remember this feeling", "little moments, big heart", "more days like this please"]),
    no: "00214", pin: "none", x: BW - 330, y: BH - 290, w: 300, rot: 3 });
  const cat = pick(["stars", "charms", "buttons"]);
  const pool = Object.values(LIB).filter((x) => x.cat === cat);
  const spots = [[20, 1080], [800, 40], [820, 600], [40, 640], [420, 1100], [700, 1080]];
  spots.forEach(([x, y]) => { const st = pick(pool); out.push({ id: uid(), type: "sticker", kind: st.id, x, y, w: st.base * rand(0.8, 1.1), rot: rand(-15, 15) }); });
  return out;
}
function spotAmong(items, w, h) {
  let best = { x: 40, y: 40 }, score = -1;
  for (let k = 0; k < 30; k++) {
    const c = { x: 20 + Math.random() * (BW - w - 40), y: 20 + Math.random() * (BH - h - 40) };
    const s = items.length ? Math.min(...items.map((o) => Math.hypot(o.x - c.x, o.y - c.y))) : 1;
    if (s > score) { score = s; best = c; }
  }
  return best;
}
function applyGenerated(items, board, fresh, usedAi) {
  const before = { items: S.day.items.slice(), board: S.day.board };
  if (fresh) {
    S.els.forEach((el) => el.remove());
    S.els.clear();
    S.day.items = [];
  }
  if (S.isOwner && BOARDS.includes(board) && (fresh || !before.items.length)) S.day.board = board;
  $("#board").className = "board bg-" + S.day.board;
  let z = maxZ();
  items.forEach((it, i) => {
    it.z = ++z;
    S.day.items.push(it);
    const el = mount(it);
    el.classList.add("drop");
    el.style.animationDelay = `${i * 70}ms`;
    setTimeout(() => el.classList.remove("drop"), 900 + i * 70);
  });
  select(null);
  changed();
  toast(usedAi ? "✦ your board is ready" : "here's a layout to start from", "undo", () => {
    S.els.forEach((el) => el.remove());
    S.els.clear();
    S.day.items = before.items;
    S.day.board = before.board;
    renderBoard();
    changed();
  }, 7000);
}

community.init({
  db, S, esc, inner, pinHtml, baseOf, hydratePhotos, toast, openSheet, closeSheets, setView, leaveBoard, route, flush,
  compress, renderTitle, renderPostBtn, openMenu, setFaces, parseYmd, MON, DOW_LONG, BW, BLANK,
  editBoardTitle: () => editTitle("boardTitle"),
});
boot();
