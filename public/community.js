// community: feed, explore, activity, profiles, posting + tagging, comments, together boards.
// app.js hands over what it owns (state, renderers, sheets) through init().
let D; // deps from app.js
const $ = (s, r = document) => r.querySelector(s);

export function init(deps) {
  D = deps;
  wireSheets();
  wireStorySheet();
  window.addEventListener("resize", () => scaleMinis(document));
}

// ---------------- icons ----------------
const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  magnet: svg(`<path d="M5 3h4v8.5a3 3 0 0 0 6 0V3h4v8.5a7 7 0 0 1-14 0Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M5 7h4M15 7h4" stroke="currentColor" stroke-width="1.7"/>`),
  magnetOn: svg(`<path d="M5 3h4v8.5a3 3 0 0 0 6 0V3h4v8.5a7 7 0 0 1-14 0Z" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M5 7h4M15 7h4" stroke="#fff" stroke-width="1.7"/>`),
  comment: svg(`<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.2A8.5 8.5 0 1 1 20.5 11.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`),
  share: svg(`<path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`),
  heart: svg(`<path d="M12 20.5s-8-4.6-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 6-8 10.6-8 10.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`),
  tag: svg(`<circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0Z" fill="currentColor"/>`),
  grid: svg(`<path d="M3 3h18v18H3ZM9 3v18M15 3v18M3 9h18M3 15h18" fill="none" stroke="currentColor" stroke-width="1.6"/>`),
  tagged: svg(`<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 19a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" stroke-width="1.6"/>`),
  back: svg(`<path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`),
  search: svg(`<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`),
  plus: svg(`<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
};

// ---------------- small helpers ----------------
const esc = (s) => D.esc(s);
function ago(ts, long = false) {
  const s = Math.max(1, (Date.now() - new Date(ts).getTime()) / 1000);
  const unit = (n, w) => long ? `${n} ${w}${n === 1 ? "" : "s"} ago` : `${n}${w[0]}`;
  if (s < 60) return long ? "just now" : "now";
  if (s < 3600) return unit(Math.floor(s / 60), "minute");
  if (s < 86400) return unit(Math.floor(s / 3600), "hour");
  if (s < 86400 * 7) return unit(Math.floor(s / 86400), "day");
  const d = new Date(ts);
  return `${d.getDate()} ${D.MON[d.getMonth()]}`;
}
const nameOf = (p) => p.display_name || p.username || "someone";
function hue(str = "") { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
export function avatar(p, cls = "") {
  const url = D.db.avatarUrl(p.avatar_path);
  if (url) return `<img class="avatar ${cls}" src="${esc(url)}" alt="">`;
  const n = nameOf(p);
  return `<span class="avatar ${cls}" style="background:hsl(${hue(p.username || n)} 45% 62%)">${esc(n.slice(0, 1).toUpperCase())}</span>`;
}
// turn @username into profile links (text is escaped first)
function linkify(text) {
  return esc(text).replace(/(^|[\s(])@([a-z0-9_.]{3,24})/gi, (m, pre, u) => `${pre}<a class="mention" href="#@${u.toLowerCase()}">@${u}</a>`);
}
function boardLabel(p) {
  if (p.board_kind === "shared") return p.board_title || "memory board";
  if (!p.board_day) return "";
  const d = D.parseYmd(p.board_day);
  return `${D.DOW_LONG[d.getDay()]} ${d.getDate()} ${D.MON[d.getMonth()]}`;
}
function page(html, tab) {
  D.leaveBoard();
  D.setView("page", tab);
  const el = $("#page");
  el.innerHTML = html;
  el.scrollTop = 0;
  return el;
}
const loading = (t = "loading…") => `<p class="muted center pad">${t}</p>`;
async function shareLink(path, title) {
  const url = `${location.origin}/${path}`;
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); D.toast("link copied"); }
  catch { D.toast(url, null, null, 6000); }
}

// read-only board, scaled to whatever width its box has
export function miniBoard(items, bg, date) {
  const els = [...items].sort((a, b) => (a.z || 0) - (b.z || 0)).map((it) => {
    const base = D.baseOf(it);
    const width = it.type === "note" && it.paper === "label" ? "" : `width:${it.w}px;`;
    return `<div class="item t-${it.type} ${it.type === "note" ? "t-" + esc(it.paper) : ""}" style="left:${+it.x}px;top:${+it.y}px;${width}font-size:${(it.w / base) * 16}px;transform:rotate(${+it.rot || 0}deg);z-index:${+it.z || 0}"><div class="body">${D.inner(it, date)}</div>${D.pinHtml(it)}</div>`;
  }).join("");
  return `<div class="mini"><div class="board mini-board bg-${esc(bg || "silver")}"><div class="board-sheen"></div>${els}</div></div>`;
}
export function scaleMinis(root) {
  root.querySelectorAll(".mini").forEach((m) => {
    const b = m.firstElementChild;
    if (b && m.clientWidth) b.style.transform = `scale(${m.clientWidth / D.BW})`;
  });
}
function afterRender(root) {
  scaleMinis(root);
  D.hydratePhotos(root);
}
const postDate = (p) => p.board_day || p.created_at.slice(0, 10);

// action sheet built on the fly (report, delete…)
function actions(title, list) {
  let el = $("#actionSheet");
  if (!el) {
    el = document.createElement("div");
    el.className = "sheet";
    el.id = "actionSheet";
    el.hidden = true;
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="sheet-head"><h3>${esc(title)}</h3><button class="x" data-close>✕</button></div>
    <div class="menu-list">${list.map((a, i) => `<button data-i="${i}" class="${a.danger ? "danger" : ""}">${esc(a.label)}</button>`).join("")}</div>`;
  el.querySelector("[data-close]").onclick = () => D.closeSheets();
  el.querySelectorAll("[data-i]").forEach((b) => (b.onclick = async () => { D.closeSheets(); await list[+b.dataset.i].run(); }));
  D.openSheet("#actionSheet");
}
function reportMenu(target, what) {
  actions(`report this ${what}`, ["spam", "inappropriate or unsafe", "harassment or bullying", "something else"].map((reason) => ({
    label: reason,
    run: async () => {
      try { await D.db.report(D.S.user.id, target, reason); D.toast("thanks for telling us. we'll take a look."); }
      catch { D.toast("couldn't send that report"); }
    },
  })));
}

// ---------------- username gate ----------------
async function ensureUsername(then) {
  if (D.S.me?.username) return true;
  page(`<section class="empty-page"><h2>make your profile</h2><p>pick a username so friends can find you, follow you, tag you and invite you to boards.</p><button class="btn-primary small" id="setupGo">set up profile</button></section>`, "me");
  $("#setupGo").onclick = () => openProfileSheet(true, then);
  openProfileSheet(true, then);
  return false;
}

// ---------------- profile sheet ----------------
let pfThen = null, pfAvatarBlob = null;
function openProfileSheet(setup = false, then = null) {
  const me = D.S.me || {};
  pfThen = then;
  pfAvatarBlob = null;
  $("#profileSheetTitle").textContent = setup ? "make your profile" : "edit profile";
  $("#profileSheetNote").textContent = setup ? "your diary stays private. this is just how friends find you." : "";
  $("#pfUsername").value = me.username || suggestUsername();
  $("#pfName").value = me.display_name || D.S.user.name || "";
  $("#pfBio").value = me.bio || "";
  $("#pfErr").textContent = "";
  $("#avatarPick").innerHTML = avatar({ ...me, display_name: $("#pfName").value }, "xl");
  D.openSheet("#profileSheet");
}
function suggestUsername() {
  const base = (D.S.user.email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 18);
  return base.length >= 3 ? base : "";
}

// ---------------- tag picker (inside the post sheet) ----------------
let tagPicks = []; // [{id, username, display_name, avatar_path}]
function renderTagChips() {
  $("#tagChips").innerHTML = tagPicks.map((p, i) => `<span class="tchip">${avatar(p, "xs")}@${esc(p.username)}<button data-untag="${i}" aria-label="remove">✕</button></span>`).join("");
  $("#tagChips").querySelectorAll("[data-untag]").forEach((b) => (b.onclick = () => { tagPicks.splice(+b.dataset.untag, 1); renderTagChips(); }));
}
function wireTagSearch() {
  const input = $("#tagIn"), out = $("#tagOut");
  let t;
  input.oninput = () => {
    clearTimeout(t);
    const q = input.value.trim().replace(/^@/, "");
    if (!q) { out.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const people = (await D.db.searchPeople(q)).filter((p) => p.id !== D.S.user.id && !tagPicks.some((x) => x.id === p.id));
        out.innerHTML = people.slice(0, 6).map((p, i) => `<button class="person" data-pick="${i}">${avatar(p, "s")}<span><b>${esc(nameOf(p))}</b><small>@${esc(p.username)}</small></span></button>`).join("")
          || `<p class="muted pad-s">no one found. <button class="mention" id="tagInvite">invite them to magnet diary</button></p>`;
        const ti = $("#tagInvite"); if (ti) ti.onclick = () => openInviteSheet();
        out.querySelectorAll("[data-pick]").forEach((b) => (b.onclick = () => {
          if (tagPicks.length >= 20) return D.toast("that's a lot of tags! 20 max");
          tagPicks.push(people[+b.dataset.pick]);
          input.value = ""; out.innerHTML = "";
          renderTagChips();
          input.focus();
        }));
      } catch { out.innerHTML = ""; }
    }, 200);
  };
}

function wireSheets() {
  $("#avatarPick").onclick = () => $("#avatarIn").click();
  $("#avatarIn").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { blob } = await D.compress(f, 512, 0.86, true);
      pfAvatarBlob = blob;
      $("#avatarPick").innerHTML = `<img class="avatar xl" src="${URL.createObjectURL(blob)}" alt="">`;
    } catch { $("#pfErr").textContent = "couldn't read that photo"; }
  };
  $("#pfSave").onclick = async () => {
    const username = $("#pfUsername").value.trim().toLowerCase().replace(/^@/, "");
    const display_name = $("#pfName").value.trim();
    const bio = $("#pfBio").value.trim();
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) { $("#pfErr").textContent = "usernames are 3 to 24 letters, numbers, dots or underscores."; return; }
    $("#pfSave").disabled = true;
    try {
      await D.db.updateProfile(D.S.user.id, { username, display_name, bio });
      if (pfAvatarBlob) await D.db.uploadAvatar(D.S.user.id, pfAvatarBlob);
      D.S.me = await D.db.myProfile(D.S.user.id);
      if (display_name) D.S.user.name = display_name;
      D.renderTitle();
      renderMeTab();
      D.closeSheets();
      D.toast("profile saved");
      const then = pfThen;
      pfThen = null;
      if (then) then(); else D.route();
    } catch (e) {
      $("#pfErr").textContent = String(e.message || e).toLowerCase();
    } finally { $("#pfSave").disabled = false; }
  };

  // posting
  wireTagSearch();
  $("#postVis").onclick = (e) => {
    const b = e.target.closest("[data-vis]");
    if (!b) return;
    $("#postVis").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  };
  $("#postGo").onclick = async () => {
    const vis = $("#postVis .on")?.dataset.vis || "followers";
    const caption = $("#postCaption").value.trim();
    $("#postGo").disabled = true;
    try {
      const id = await D.db.publishBoard(D.S.user.id, D.S.boardId, caption, vis);
      await D.db.setTags(D.S.user.id, id, tagPicks.map((p) => p.id));
      D.S.post = { id, caption };
      D.S.visibility = vis;
      D.renderPostBtn();
      D.closeSheets();
      const n = tagPicks.length;
      D.toast(`posted${n ? ` and tagged ${n} ${n === 1 ? "friend" : "friends"}` : vis === "public" ? " for everyone" : " for your followers"}`, "view", () => (location.hash = "#p/" + id));
    } catch (e) { D.toast("couldn't post: " + e.message); }
    finally { $("#postGo").disabled = false; }
  };
  $("#unpostBtn").onclick = async () => {
    const b = $("#unpostBtn");
    if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "tap again to take it down"; return; }
    try {
      await D.db.unpublishBoard(D.S.boardId);
      D.S.post = null;
      D.S.visibility = "private";
      D.renderPostBtn();
      D.closeSheets();
      D.toast("taken down. the board is private again.");
    } catch { D.toast("couldn't take it down"); }
  };

  // people on a shared board
  $("#inviteGo").onclick = doInvite;
  $("#inviteIn").addEventListener("keydown", (e) => { if (e.key === "Enter") doInvite(); });
}

// me tab shows my avatar once I have a profile
export function renderMeTab() {
  const el = $("#tabbar [data-tab=me] .tab-ic");
  if (el && D.S.me) el.innerHTML = avatar(D.S.me, "tab");
}

// ---------------- posting a board ----------------
export async function openPostSheet() {
  await D.flush();
  if (!D.S.boardId || !D.S.day.items.length) { D.toast("pin something first, then post it"); return; }
  if (!(await ensureUsername(() => { D.route(); }))) return;
  const posted = !!D.S.post;
  $("#postTitle").textContent = posted ? "edit post" : "new post";
  $("#postCaption").value = D.S.post?.caption || "";
  const vis = D.S.visibility === "public" ? "public" : "followers";
  $("#postVis").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.vis === vis));
  $("#postGo").textContent = posted ? "save" : "share";
  const u = $("#unpostBtn");
  u.hidden = !posted;
  u.classList.remove("armed");
  u.textContent = "take it down";
  $("#tagIn").value = "";
  $("#tagOut").innerHTML = "";
  tagPicks = [];
  renderTagChips();
  $("#postPreview").innerHTML = miniBoard(D.S.day.items, D.S.day.board, D.S.date || new Date().toISOString().slice(0, 10));
  D.openSheet("#postSheet");
  afterRender($("#postPreview"));
  if (posted) {
    try {
      const [p] = await D.db.feed({ kind: "any", post: D.S.post.id, limit: 1 });
      if (p) { tagPicks = p.tags.slice(); renderTagChips(); if (!$("#postCaption").value) $("#postCaption").value = p.caption || ""; }
    } catch {}
  }
}

// ---------------- feed (home) ----------------
export async function feedPage() {
  if (!(await ensureUsername(() => feedPage()))) return;
  renderMeTab();
  const el = page(`
    <header class="app-head">
      <h1 class="wordmark">magnet <em>diary</em></h1>
      <a class="icon-btn" href="#activity" aria-label="activity">${ICON.heart}</a>
    </header>
    ${recapBanner()}
    <div class="stories" id="stories"></div>
    <div class="cards" id="cards">${loading()}</div>
    <div class="center pad"><button class="chip" id="moreBtn" hidden>load more</button></div>`, "home");
  let before = null, all = [];
  const load = async () => {
    const posts = await D.db.feed({ kind: "following", before });
    all = all.concat(posts);
    const cards = $("#cards", el);
    if (!before) cards.innerHTML = "";
    if (!posts.length && !before) cards.innerHTML = await emptyFeed();
    cards.insertAdjacentHTML("beforeend", posts.map((p) => cardHtml(p)).join(""));
    wireCards(cards, posts);
    afterRender(cards);
    if (!before) renderStories(all);
    before = posts.length ? posts[posts.length - 1].created_at : before;
    $("#moreBtn", el).hidden = posts.length < 20;
  };
  $("#moreBtn", el).onclick = load;
  try { await load(); } catch { $("#cards", el).innerHTML = `<p class="muted center pad">couldn't load the feed.</p>`; }
}
function renderStories(posts) {
  const seen = new Set(), list = [];
  for (const p of posts) if (p.author_id !== D.S.user.id && !seen.has(p.author_id)) { seen.add(p.author_id); list.push(p); }
  const me = D.S.me || {};
  $("#stories").innerHTML = `
    <a class="story me" href="#today"><span class="ring plain">${avatar(me, "story")}<i class="story-plus">${ICON.plus}</i></span><small>your board</small></a>
    ${list.slice(0, 20).map((p) => `<a class="story" href="#p/${p.post_id}"><span class="ring">${avatar(p, "story")}</span><small>${esc(p.username || "")}</small></a>`).join("")}`;
}
async function emptyFeed() {
  let suggest = [];
  try {
    const ex = await D.db.feed({ kind: "explore", limit: 30 });
    const seen = new Set();
    for (const p of ex) if (p.author_id !== D.S.user.id && !seen.has(p.author_id)) { seen.add(p.author_id); suggest.push(p); }
  } catch {}
  return `<section class="empty-page small"><h2>welcome in</h2><p>follow friends to see their boards here. your own posts show up here too.</p>
    ${suggest.length ? `<div class="suggest">${suggest.slice(0, 8).map((p) => `<a class="person" href="#@${esc(p.username)}">${avatar(p)}<span><b>${esc(nameOf(p))}</b><small>@${esc(p.username)}</small></span><span class="chip">view</span></a>`).join("")}</div>` : ""}
    <a class="chip" href="#explore">explore boards</a></section>`;
}

function magnetLine(p) {
  if (!p.magnets) return "";
  if (p.magnet_by) {
    const others = p.magnets - 1 - (p.i_reacted ? 1 : 0);
    const you = p.i_reacted ? "you, " : "";
    return `magnets from ${you}<a href="#@${esc(p.magnet_by)}"><b>${esc(p.magnet_by)}</b></a>${others > 0 ? ` and <b>${others} ${others === 1 ? "other" : "others"}</b>` : ""}`;
  }
  return `<b>${p.magnets} ${p.magnets === 1 ? "magnet" : "magnets"}</b>`;
}
function cardHtml(p, full = false) {
  const label = boardLabel(p);
  const tags = p.tags || [];
  const withLine = tags.length ? ` · with ${tags.slice(0, 2).map((t) => esc(t.username)).join(", ")}${tags.length > 2 ? ` +${tags.length - 2}` : ""}` : "";
  const previews = full ? [] : (p.preview_comments || []);
  return `<article class="card" data-post="${p.post_id}">
    <header class="card-head">
      <a class="who" href="#@${esc(p.username || "")}"><span class="ring sm">${avatar(p)}</span><span><b>${esc(p.username || nameOf(p))}</b><small>${esc(label)}${withLine}</small></span></a>
      <button class="dots" data-menu aria-label="more">•••</button>
    </header>
    <div class="card-board" data-board>
      ${miniBoard(p.items, p.background, postDate(p))}
      <span class="burst" aria-hidden="true">${ICON.magnetOn}</span>
      ${tags.length ? `<button class="tag-dot" data-tags aria-label="tagged people">${ICON.tag}</button>
        <div class="tag-pop" hidden>${tags.map((t) => `<a href="#@${esc(t.username)}">${esc(t.username)}</a>`).join("")}</div>` : ""}
    </div>
    <div class="card-actions">
      <button class="act ${p.i_reacted ? "on" : ""}" data-magnet aria-label="give a magnet">${p.i_reacted ? ICON.magnetOn : ICON.magnet}</button>
      <a class="act" href="#p/${p.post_id}" aria-label="comments">${ICON.comment}</a>
      <button class="act" data-share aria-label="share">${ICON.share}</button>
      ${p.visibility === "followers" ? `<span class="vis-pill">followers</span>` : ""}
    </div>
    <p class="mline" data-mline>${magnetLine(p)}</p>
    ${p.caption ? `<p class="card-cap"><a href="#@${esc(p.username || "")}"><b>${esc(p.username || "")}</b></a> ${linkify(p.caption)}</p>` : ""}
    ${!full && p.comment_count > 2 ? `<a class="view-all" href="#p/${p.post_id}">view all ${p.comment_count} comments</a>` : ""}
    ${previews.map((c) => `<p class="card-cap c"><a href="#@${esc(c.username || "")}"><b>${esc(c.username || "")}</b></a> ${linkify(c.body)}</p>`).join("")}
    <time class="when">${ago(p.created_at, true)}</time>
  </article>`;
}
function wireCards(root, posts) {
  const byId = new Map(posts.map((p) => [p.post_id, p]));
  root.querySelectorAll(".card").forEach((card) => {
    if (card.dataset.wired) return;
    card.dataset.wired = "1";
    const p = byId.get(card.dataset.post);
    if (!p) return;
    const btn = card.querySelector("[data-magnet]");
    btn.onclick = () => toggleMagnet(p, card);
    card.querySelector("[data-menu]").onclick = () => postMenu(p);
    card.querySelector("[data-share]").onclick = () => actions("share", [
      { label: "share to instagram story", run: () => shareBoardStory({ items: p.items, bg: p.background, date: postDate(p),
          top: `${boardLabel(p)}`, title: p.board_kind === "shared" ? (p.board_title || "memories") : `@${p.username}` }) },
      { label: "copy link", run: () => shareLink(`#p/${p.post_id}`, `${p.username}'s magnet board`) },
    ]);
    // double-tap the board for a magnet, single tap opens the post
    const board = card.querySelector("[data-board]");
    let tapT = 0, tapTimer = null;
    board.addEventListener("click", (e) => {
      if (e.target.closest("[data-tags], .tag-pop a")) return;
      const now = Date.now();
      if (now - tapT < 300) {
        clearTimeout(tapTimer);
        tapT = 0;
        burst(card);
        if (!p.i_reacted) toggleMagnet(p, card);
        return;
      }
      tapT = now;
      tapTimer = setTimeout(() => { if (!card.closest(".single")) location.hash = "#p/" + p.post_id; }, 300);
    });
    const td = card.querySelector("[data-tags]");
    if (td) td.onclick = (e) => { e.stopPropagation(); const pop = card.querySelector(".tag-pop"); pop.hidden = !pop.hidden; };
  });
}
function burst(card) {
  const b = card.querySelector(".burst");
  b.classList.remove("go"); void b.offsetWidth; b.classList.add("go");
}
async function toggleMagnet(p, card) {
  const btn = card.querySelector("[data-magnet]");
  const was = p.i_reacted;
  const paint = () => {
    btn.classList.toggle("on", p.i_reacted);
    btn.innerHTML = p.i_reacted ? ICON.magnetOn : ICON.magnet;
    card.querySelector("[data-mline]").innerHTML = magnetLine(p);
  };
  p.i_reacted = !was;
  p.magnets += was ? -1 : 1;
  paint();
  if (!was) { btn.classList.add("pop"); setTimeout(() => btn.classList.remove("pop"), 400); }
  try { was ? await D.db.unreact(D.S.user.id, p.post_id) : await D.db.react(D.S.user.id, p.post_id); }
  catch { p.i_reacted = was; p.magnets += was ? 1 : -1; paint(); }
}
function postMenu(p) {
  const mine = p.author_id === D.S.user.id;
  const taggedMe = (p.tags || []).some((t) => t.id === D.S.user.id);
  const list = [];
  if (mine) {
    list.push({ label: "edit post or tags", run: () => (location.hash = p.board_kind === "day" ? "#" + p.board_day : "#b/" + p.board_id) });
    list.push({ label: "take this post down", danger: true, run: async () => {
      try { await D.db.unpublishBoard(p.board_id); D.toast("taken down"); D.route(); } catch { D.toast("couldn't take it down"); }
    } });
  } else {
    list.push({ label: `view @${p.username}`, run: () => (location.hash = "#@" + p.username) });
    if (taggedMe) list.push({ label: "remove me from this post", run: async () => {
      try { await D.db.untagMe(D.S.user.id, p.post_id); D.toast("you're untagged"); D.route(); } catch { D.toast("couldn't untag you"); }
    } });
    list.push({ label: "report this post", danger: true, run: () => reportMenu({ post_id: p.post_id }, "post") });
  }
  list.push({ label: "share to instagram story", run: () => shareBoardStory({ items: p.items, bg: p.background, date: postDate(p), top: boardLabel(p), title: p.board_kind === "shared" ? (p.board_title || "memories") : `@${p.username}` }) });
  list.push({ label: "copy link", run: () => shareLink(`#p/${p.post_id}`, "magnet board") });
  actions("post", list);
}

// ---------------- explore + search ----------------
export async function explorePage() {
  if (!(await ensureUsername(() => explorePage()))) return;
  const el = page(`
    <div class="search-bar">${ICON.search}<input id="findIn" placeholder="search people" autocomplete="off" autocapitalize="off"></div>
    <div id="findOut" class="find-out"></div>
    <div class="xgrid" id="xgrid">${loading()}</div>`, "search");
  const input = $("#findIn"), out = $("#findOut"), grid = $("#xgrid");
  let t;
  input.oninput = () => {
    clearTimeout(t);
    const q = input.value.trim().replace(/^@/, "");
    grid.hidden = !!q;
    if (!q) { out.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const people = await D.db.searchPeople(q);
        out.innerHTML = people.length
          ? people.map((p) => `<a class="person" href="#@${esc(p.username)}">${avatar(p)}<span><b>${esc(p.username)}</b><small>${esc(nameOf(p))}</small></span></a>`).join("")
          : `<p class="muted pad-s">no one found</p>`;
      } catch { out.innerHTML = ""; }
    }, 200);
  };
  try {
    const posts = await D.db.feed({ kind: "explore", limit: 60 });
    grid.innerHTML = posts.length
      ? posts.map((x, i) => `<a class="xtile ${i % 10 === 2 ? "big" : ""}" href="#p/${x.post_id}">${miniBoard(x.items, x.background, postDate(x))}${x.magnets ? `<span class="xm">${ICON.magnetOn}${x.magnets}</span>` : ""}</a>`).join("")
      : `<section class="empty-page small"><p>no public boards yet. post one of yours for everyone and it'll show up here.</p></section>`;
    afterRender(grid);
  } catch { grid.innerHTML = `<p class="muted center pad">couldn't load explore.</p>`; }
}

// ---------------- activity ----------------
export async function activityPage() {
  if (!(await ensureUsername(() => activityPage()))) return;
  const el = page(`<header class="app-head"><button class="icon-btn" id="pgBack" aria-label="back">${ICON.back}</button><h2 class="ph">activity</h2><span class="icon-btn"></span></header><div id="actList">${loading()}</div>`, "home");
  $("#pgBack").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#feed"));
  try {
    const list = await D.db.activity();
    const words = { joined: "joined from your invite. you follow each other now.", follow: "started following you.", magnet: "gave your board a magnet.", comment: "commented:", invite: "added you to", tag: "tagged you in a post." };
    const groups = [["today", 86400e3], ["this week", 7 * 86400e3], ["earlier", Infinity]];
    let html = "", gi = 0, cur = null;
    for (const a of list) {
      const age = Date.now() - new Date(a.at).getTime();
      while (age > groups[gi][1]) gi++;
      if (cur !== gi) { cur = gi; html += `<h4 class="act-h">${groups[gi][0]}</h4>`; }
      const href = a.kind === "follow" || a.kind === "joined" ? `#@${a.username}` : a.kind === "invite" ? `#b/${a.board_id}` : `#p/${a.post_id}`;
      const extra = a.kind === "comment" ? ` ${linkify(a.body || "")}` : a.kind === "invite" ? ` <b>${esc(a.body || "a memory board")}</b>.` : "";
      html += `<a class="act-row" href="${esc(href)}">${avatar(a)}<span><b>${esc(a.username || nameOf(a))}</b> ${words[a.kind]}${extra} <small>${ago(a.at)}</small></span>
        ${a.kind === "follow" || a.kind === "joined" ? `<span class="chip">view</span>` : a.kind === "invite" ? `<span class="chip">open</span>` : `<span class="act-ic">${a.kind === "magnet" ? ICON.magnetOn : a.kind === "tag" ? ICON.tag : ICON.comment}</span>`}</a>`;
    }
    $("#actList").innerHTML = html || `<section class="empty-page small"><p>nothing yet. when people follow you, give your boards magnets, comment, tag you or add you to a board, it shows up here.</p></section>`;
  } catch { $("#actList").innerHTML = `<p class="muted">couldn't load activity.</p>`; }
}

// ---------------- a single post ----------------
export async function postPage(id) {
  if (!(await ensureUsername(() => postPage(id)))) return;
  const el = page(`<header class="app-head"><button class="icon-btn" id="pgBack" aria-label="back">${ICON.back}</button><h2 class="ph">post</h2><span class="icon-btn"></span></header><div id="postBody">${loading()}</div>`, "home");
  $("#pgBack").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#feed"));
  let p;
  try { [p] = await D.db.feed({ kind: "any", post: id, limit: 1 }); } catch {}
  const body = $("#postBody", el);
  if (!p) { body.innerHTML = `<section class="empty-page small"><p>this post isn't available. it may have been taken down or be for followers only.</p></section>`; return; }
  body.innerHTML = `<div class="cards single">${cardHtml(p, true)}</div>
    <section class="comments"><div id="cmList">${loading()}</div>
      <form id="cmForm" class="cm-form">${avatar(D.S.me || {}, "s")}<input id="cmIn" maxlength="500" placeholder="add a comment…" autocomplete="off"><button class="post-link">post</button></form>
    </section>`;
  wireCards(body, [p]);
  afterRender(body);
  const renderComments = async () => {
    const list = await D.db.comments(id);
    const canDelete = (c) => c.author_id === D.S.user.id || p.author_id === D.S.user.id;
    $("#cmList").innerHTML = list.length ? list.map((c) => `<div class="cm-row" data-id="${c.id}">
        <a href="#@${esc(c.username || "")}">${avatar(c, "s")}</a>
        <p><a href="#@${esc(c.username || "")}"><b>${esc(c.username || nameOf(c))}</b></a> ${linkify(c.body)}<small>${ago(c.created_at)}</small></p>
        <button class="dots s" data-cmenu="${c.id}" data-mine="${canDelete(c) ? 1 : 0}">•••</button>
      </div>`).join("") : `<p class="muted pad-s">no comments yet. start the conversation.</p>`;
    $("#cmList").querySelectorAll("[data-cmenu]").forEach((b) => (b.onclick = () => {
      const cid = b.dataset.cmenu;
      const list2 = [];
      if (b.dataset.mine === "1") list2.push({ label: "delete comment", danger: true, run: async () => { try { await D.db.deleteComment(cid); renderComments(); } catch { D.toast("couldn't delete"); } } });
      list2.push({ label: "report comment", run: () => reportMenu({ comment_id: cid }, "comment") });
      actions("comment", list2);
    }));
  };
  $("#cmForm").onsubmit = async (e) => {
    e.preventDefault();
    const v = $("#cmIn").value.trim();
    if (!v) return;
    $("#cmIn").value = "";
    try { await D.db.addComment(D.S.user.id, id, v); await renderComments(); } catch { D.toast("couldn't post that comment"); }
  };
  renderComments().catch(() => ($("#cmList").innerHTML = `<p class="muted">couldn't load comments.</p>`));
}

// ---------------- profiles ----------------
export async function mePage() {
  if (!(await ensureUsername(() => mePage()))) return;
  return profilePage(D.S.me.username);
}
export async function profilePage(username) {
  if (!(await ensureUsername(() => profilePage(username)))) return;
  renderMeTab();
  const own = username === D.S.me.username;
  const el = page(`<div id="profBody">${loading()}</div>`, own ? "me" : "search");
  let p;
  try { p = await D.db.profileByUsername(username); } catch {}
  const body = $("#profBody", el);
  if (!p) { body.innerHTML = `<section class="empty-page small"><p>no one called @${esc(username)} here.</p></section>`; return; }
  body.innerHTML = `
    <header class="app-head">
      ${own ? `<span class="icon-btn"></span>` : `<button class="icon-btn" id="pgBack" aria-label="back">${ICON.back}</button>`}
      <h2 class="ph">${esc(p.username)}</h2>
      <button class="icon-btn dots-ic" id="profMenu" aria-label="more">•••</button>
    </header>
    <section class="prof">
      <div class="prof-top">
        <span class="ring big">${avatar(p, "xl")}</span>
        <div class="stats">
          <span><b>${p.posts}</b>posts</span><span><b data-followers>${p.followers}</b>followers</span><span><b>${p.following}</b>following</span>
        </div>
      </div>
      <p class="prof-name">${esc(p.display_name || p.username)}</p>
      ${p.bio ? `<p class="bio">${linkify(p.bio)}</p>` : ""}
      ${!own && p.follows_me ? `<p class="muted small">follows you</p>` : ""}
      ${p.invited_by_username ? `<p class="muted small">invited by <a class="mention" href="#@${esc(p.invited_by_username)}">@${esc(p.invited_by_username)}</a>${p.invited_count ? ` · brought ${p.invited_count} ${p.invited_count == 1 ? "friend" : "friends"}` : ""}</p>`
        : p.invited_count ? `<p class="muted small">brought ${p.invited_count} ${p.invited_count == 1 ? "friend" : "friends"} to magnet diary</p>` : ""}
      <div class="prof-actions">
        ${own ? `<button class="btn-soft" id="editProf">edit profile</button><button class="btn-soft primary" id="inviteBtn">invite friends</button><button class="btn-soft" id="recapBtn">recaps</button>`
              : `<button class="btn-soft ${p.i_follow ? "" : "primary"}" id="followBtn">${p.i_follow ? "following" : p.follows_me ? "follow back" : "follow"}</button><button class="btn-soft" id="shareProf">share profile</button>`}
      </div>
    </section>
    <nav class="ptabs"><button class="on" data-pt="posts">${ICON.grid}</button><button data-pt="tagged">${ICON.tagged}</button></nav>
    <div class="pgrid" id="pgrid">${loading()}</div>`;
  if (!own) $("#pgBack").onclick = () => history.back();
  if ($("#shareProf")) $("#shareProf").onclick = () => shareLink(`#@${p.username}`, `@${p.username} on magnet diary`);
  if (own) {
    $("#inviteBtn").onclick = () => openInviteSheet();
    $("#recapBtn").onclick = () => (location.hash = "#recap/" + lastMonthKey());
    $("#editProf").onclick = () => openProfileSheet(false, () => profilePage(D.S.me.username));
    $("#profMenu").onclick = () => actions("account", [
      { label: "activity", run: () => (location.hash = "#activity") },
      { label: "share my profile", run: () => shareLink(`#@${p.username}`, `@${p.username} on magnet diary`) },
      { label: "account settings", run: () => D.openMenu() },
    ]);
  } else {
    $("#followBtn").onclick = async () => {
      const b = $("#followBtn");
      try {
        if (p.i_follow) { await D.db.unfollow(D.S.user.id, p.id); p.i_follow = false; p.followers--; }
        else { await D.db.follow(D.S.user.id, p.id); p.i_follow = true; p.followers++; }
        b.textContent = p.i_follow ? "following" : "follow";
        b.classList.toggle("primary", !p.i_follow);
        body.querySelector("[data-followers]").textContent = p.followers;
      } catch { D.toast("couldn't update"); }
    };
    $("#profMenu").onclick = () => actions(`@${p.username}`, [
      { label: "copy profile link", run: () => shareLink(`#@${p.username}`, `@${p.username}`) },
      { label: "report this profile", danger: true, run: () => reportMenu({ profile_id: p.id }, "profile") },
    ]);
  }
  const showGrid = async (which) => {
    body.querySelectorAll("[data-pt]").forEach((b) => b.classList.toggle("on", b.dataset.pt === which));
    const g = $("#pgrid");
    g.innerHTML = loading();
    try {
      const posts = which === "tagged" ? await D.db.feed({ kind: "any", tagged: p.id, limit: 60 }) : await D.db.feed({ kind: "any", author: p.id, limit: 60 });
      g.innerHTML = posts.length
        ? posts.map((x) => `<a class="pthumb" href="#p/${x.post_id}">${miniBoard(x.items, x.background, postDate(x))}${x.board_kind === "shared" ? `<span class="pbadge">❀</span>` : ""}</a>`).join("")
        : `<section class="empty-page small grid-empty"><p>${which === "tagged" ? (own ? "when friends tag you in a board, it shows up here." : "no tagged boards yet.") : own ? "share your first board: open a day and tap ↗ post." : "no posts yet."}</p></section>`;
      afterRender(g);
    } catch { g.innerHTML = `<p class="muted">couldn't load posts.</p>`; }
  };
  body.querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => showGrid(b.dataset.pt)));
  showGrid("posts");
}

// ---------------- together (shared boards) ----------------
export async function togetherPage() {
  if (!(await ensureUsername(() => togetherPage()))) return;
  const el = page(`
    <header class="app-head"><span class="icon-btn"></span><h2 class="ph">together</h2><span class="icon-btn"></span></header>
    <p class="muted page-sub">memory boards you make with friends. everyone on a board can add photos, notes and stickers, live. add friends by @username, or share an invite link from the board's people menu.</p>
    <form class="new-board" id="newBoard"><input id="nbTitle" class="field" maxlength="80" placeholder="name a new board, e.g. beach trip '26"><button class="btn-primary small">create</button></form>
    <div class="tlist" id="tlist">${loading()}</div>`, "together");
  $("#newBoard").onsubmit = async (e) => {
    e.preventDefault();
    const title = $("#nbTitle").value.trim() || "untitled memories";
    try { const id = await D.db.createSharedBoard(D.S.user.id, title); location.hash = "#b/" + id; }
    catch { D.toast("couldn't create the board"); }
  };
  try {
    const boards = await D.db.sharedBoards();
    $("#tlist", el).innerHTML = boards.length ? boards.map((b) => `
      <a class="tcard" href="#b/${b.board_id}">
        <span class="tthumb">${b.preview ? `<img data-photo="${esc(b.preview)}" src="${D.BLANK}" alt="">` : ""}</span>
        <span class="tmeta"><b>${esc(b.title || "untitled memories")}</b>
          <small>${b.my_role === "owner" ? "yours" : `by @${esc(b.owner_username || "")}`} · ${b.people} ${b.people === 1 ? "person" : "people"} · ${b.item_count} pinned · ${ago(b.updated_at)}</small></span>
      </a>`).join("") : `<section class="empty-page small"><p>no shared boards yet. make one above and invite a friend by their username.</p></section>`;
    D.hydratePhotos($("#tlist", el));
  } catch { $("#tlist", el).innerHTML = `<p class="muted">couldn't load your boards.</p>`; }
}

// people sheet for the open shared board
export async function openPeople() {
  const info = D.S.ctx?.info;
  if (!info) return;
  const owner = info.my_role === "owner";
  $("#inviteRow").hidden = !owner;
  $("#boardLinkBtn").hidden = !owner;
  $("#boardLinkBtn").onclick = () => shareBoardInvite();
  $("#inviteIn").value = "";
  $("#boardMenu").innerHTML = owner
    ? `<button id="bmRename">rename board</button><button id="bmDelete" class="danger">delete this board</button>`
    : `<button id="bmLeave" class="danger">leave this board</button>`;
  D.openSheet("#peopleSheet");
  renderPeople();
  if (owner) {
    $("#bmRename").onclick = () => { D.closeSheets(); D.editBoardTitle(); };
    $("#bmDelete").onclick = async (e) => {
      const b = e.currentTarget;
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "tap again: deletes it for everyone"; return; }
      try { await D.db.deleteBoard(info.id); D.closeSheets(); location.hash = "#together"; } catch { D.toast("couldn't delete it"); }
    };
  } else {
    $("#bmLeave").onclick = async () => {
      try { await D.db.removeMember(info.id, D.S.user.id); D.closeSheets(); location.hash = "#together"; } catch { D.toast("couldn't leave"); }
    };
  }
}
async function renderPeople() {
  const info = D.S.ctx?.info;
  const owner = info.my_role === "owner";
  try {
    const people = await D.db.boardPeople(info.id);
    D.setFaces(people);
    const here = new Set((D.S.live || []).map((x) => x.uid));
    $("#peopleList").innerHTML = people.map((p) => `<div class="person">
        <a href="#@${esc(p.username || "")}">${avatar(p)}</a>
        <span><b>${esc(nameOf(p))}</b><small>@${esc(p.username || "")} · ${p.role}${here.has(p.user_id) ? " · here now" : ""}</small></span>
        ${owner && p.role !== "owner" ? `<button class="chip" data-rm="${p.user_id}">remove</button>` : ""}
      </div>`).join("");
    $("#peopleList").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
      try { await D.db.removeMember(info.id, b.dataset.rm); renderPeople(); } catch { D.toast("couldn't remove"); }
    }));
  } catch { $("#peopleList").innerHTML = `<p class="muted">couldn't load people.</p>`; }
}
async function doInvite() {
  const v = $("#inviteIn").value.trim();
  if (!v) return;
  $("#inviteGo").disabled = true;
  try {
    const p = await D.db.invite(D.S.ctx.info.id, v);
    $("#inviteIn").value = "";
    D.toast(`added @${p.username}`);
    renderPeople();
  } catch (e) { D.toast(String(e.message || e).toLowerCase()); }
  finally { $("#inviteGo").disabled = false; }
}

// =====================================================================
// share to instagram story
// =====================================================================
let storyBlob = null, storyName = "magnet-diary.png", toBlobFn = null;
async function loadRenderer() {
  if (!toBlobFn) toBlobFn = (await import("/vendor/html-to-image.js")).toBlob;
  return toBlobFn;
}
async function inlineImages(root) {
  await D.hydratePhotos(root);
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return;
    try {
      const blob = await fetch(src, { mode: "cors" }).then((r) => r.blob());
      img.src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    } catch { /* leave it */ }
  }));
  await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
}
// renders a 1080x1920 story image. `inner` is the middle of the story (a board or a recap grid)
async function renderStory(inner, top, title) {
  const host = document.createElement("div");
  host.className = "story-host";
  host.innerHTML = `<div class="story-canvas">
      <div class="st-glow"></div>
      <header class="st-head"><small>${esc(top)}</small><h1>${esc(title)}</h1></header>
      <div class="st-mid">${inner}</div>
      <footer class="st-foot"><span>@${esc(D.S.me?.username || "")}</span><b>magnet <em>diary</em></b><span>karisa.space</span></footer>
    </div>`;
  document.body.appendChild(host);
  try {
    scaleMinis(host);
    await inlineImages(host);
    try { await document.fonts.ready; } catch {}
    const toBlob = await loadRenderer();
    const node = host.firstElementChild;
    const opts = { width: 1080, height: 1920, pixelRatio: 1, cacheBust: false };
    let blob;
    try {
      await toBlob(node, opts); // first pass warms up fonts and images (needed on safari)
      blob = await toBlob(node, opts);
    } catch (e) {
      console.warn("story fonts failed, retrying without web fonts", e);
      blob = await toBlob(node, { ...opts, skipFonts: true });
    }
    return blob;
  } finally { host.remove(); }
}
async function openStory(make, name) {
  D.toast("making your story…", null, null, 20000);
  try {
    storyBlob = await make();
    storyName = name;
    $("#storyPreview").innerHTML = `<img src="${URL.createObjectURL(storyBlob)}" alt="story preview">`;
    D.toast("ready", null, null, 800);
    D.openSheet("#storySheet");
  } catch (e) {
    console.error(e);
    D.toast("couldn't make the story image");
  }
}
export function shareBoardStory({ items, bg, date, title, top, username }) {
  return openStory(
    () => renderStory(`<div class="st-board">${miniBoard(items, bg, date)}</div>`, top || "", title || ""),
    `magnet-diary-${date || "board"}.png`);
}
function wireStorySheet() {
  $("#storyShare").onclick = async () => {
    if (!storyBlob) return;
    const file = new File([storyBlob], storyName, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "magnet diary" }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    saveStory();
  };
  $("#storySave").onclick = saveStory;
}
function saveStory() {
  if (!storyBlob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(storyBlob);
  a.download = storyName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  D.toast("saved. add it to your story from your photos.");
}
// story for the board that's open right now
export function storyForCurrentBoard() {
  const S = D.S;
  if (!S.day.items.length) { D.toast("pin something first"); return; }
  const isDay = S.ctx?.kind === "day";
  const date = isDay ? S.date : new Date().toISOString().slice(0, 10);
  const d = D.parseYmd(date);
  return shareBoardStory({
    items: S.day.items, bg: S.day.board, date,
    top: isDay ? (S.title || "magnet diary") + ` · ${d.getFullYear()}` : "our memory board",
    title: isDay ? `${D.DOW_LONG[d.getDay()]} ${d.getDate()} ${D.MON[d.getMonth()]}` : (S.ctx?.info?.title || "memories"),
  });
}

// =====================================================================
// invites (clubhouse-style: everyone gets a few, profiles say who invited you)
// =====================================================================
const inviteUrl = (code) => `${location.origin}/#join/${code}`;
export async function showInviteBanner(code) {
  const el = $("#inviteBanner");
  try {
    const p = await D.db.invitePreview(code);
    if (!p) { el.hidden = false; el.innerHTML = `<p>that invite link doesn't exist. you can still make an account.</p>`; return; }
    if (!p.valid) { el.hidden = false; el.innerHTML = `<p>that invite has been used up. ask @${esc(p.username || "your friend")} for a new one.</p>`; return; }
    el.hidden = false;
    el.innerHTML = `${avatar(p, "s")}<p><b>@${esc(p.username || nameOf(p))}</b> invited you${p.board_title ? ` to <b>${esc(p.board_title)}</b>` : " to magnet diary"}</p>`;
  } catch { el.hidden = true; }
}
export async function redeemPending() {
  let code = null;
  try { code = localStorage.getItem("pendingInvite"); } catch {}
  if (!code) return null;
  try { localStorage.removeItem("pendingInvite"); } catch {}
  try {
    const r = await D.db.redeemInvite(code);
    if (!r) return null;
    if (r.ok && r.message !== "already accepted" && r.inviter_username) D.toast(`you're in! you and @${r.inviter_username} now follow each other`, null, null, 5000);
    else if (!r.ok && r.message !== "that's your own invite") D.toast(r.message);
    return r.ok ? r : null;
  } catch { return null; }
}
export async function openInviteSheet() {
  if (!(await ensureUsername(() => openInviteSheet()))) return;
  const body = $("#inviteBody");
  body.innerHTML = loading();
  D.openSheet("#inviteSheet");
  const render = async () => {
    const [left, list] = await Promise.all([D.db.invitesLeft(D.S.user.id), D.db.myInvites()]);
    body.innerHTML = `
      <div class="ticket">
        <div class="ticket-l"><small>you have</small><b>${left}</b><small>${left === 1 ? "invite" : "invites"} left</small></div>
        <div class="ticket-r"><p>magnet diary grows friend by friend. each invite brings one person in, and you'll follow each other.</p>
          <button class="btn-primary small" id="newInvite" ${left ? "" : "disabled"}>${left ? "create an invite" : "no invites left"}</button></div>
      </div>
      ${list.length ? `<h4 class="act-h">your invites</h4>` : ""}
      <div class="inv-list">${list.map((i) => {
        const used = (i.used_by || [])[0];
        const expired = new Date(i.expires_at) < new Date();
        return `<div class="inv-row">${used ? avatar(used, "s") : `<span class="inv-dot">✦</span>`}
          <span>${used ? `<b>@${esc(used.username || nameOf(used))}</b> joined` : expired ? "expired" : "not used yet"}<small>${ago(i.created_at)}</small></span>
          ${!used && !expired ? `<button class="chip" data-share-inv="${esc(i.code)}">share</button>` : ""}</div>`;
      }).join("")}</div>`;
    const go = $("#newInvite");
    if (go) go.onclick = async () => {
      go.disabled = true;
      try { const inv = await D.db.createInvite(); await render(); shareLink(`#join/${inv.code}`, "join me on magnet diary"); }
      catch (e) { D.toast(String(e.message || e)); go.disabled = false; }
    };
    body.querySelectorAll("[data-share-inv]").forEach((b) => (b.onclick = () => shareLink(`#join/${b.dataset.shareInv}`, "join me on magnet diary")));
  };
  try { await render(); } catch { body.innerHTML = `<p class="muted">couldn't load your invites.</p>`; }
}
export async function shareBoardInvite() {
  const info = D.S.ctx?.info;
  if (!info) return;
  try {
    const inv = await D.db.createInvite(info.id);
    shareLink(`#join/${inv.code}`, `join our board "${info.title || "memories"}" on magnet diary`);
  } catch (e) { D.toast("couldn't make a link: " + e.message); }
}

// =====================================================================
// monthly recap
// =====================================================================
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function lastMonthKey() { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return monthKey(d); }
function recapStats(boards) {
  let photos = 0, notes = 0, stickers = 0, magnets = 0;
  const texts = [];
  for (const b of boards) {
    magnets += b.magnets;
    for (const it of b.items) {
      if (it.type === "photo") photos++;
      else if (it.type === "booth") photos += (it.photos || []).length;
      else if (it.type === "note" || it.type === "text") { notes++; if (it.text) texts.push(it.text); }
      else stickers++;
    }
  }
  return { days: boards.length, photos, notes, stickers, magnets, texts };
}
function fallbackLine(st, monthName) {
  if (!st.days) return `${monthName} is waiting for its first magnet.`;
  return `${st.days} ${st.days === 1 ? "day" : "days"}, ${st.photos} ${st.photos === 1 ? "photo" : "photos"} and ${st.stickers} little stickers. a ${monthName} worth keeping.`;
}
export async function recapPage(key = lastMonthKey()) {
  if (!/^\d{4}-\d{2}$/.test(key)) key = lastMonthKey();
  const [y, m] = key.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const monthName = MONTHS[m - 1];
  const prev = monthKey(new Date(y, m - 2, 1)), next = monthKey(new Date(y, m, 1));
  const isFuture = new Date(y, m - 1, 1) > new Date();
  const el = page(`
    <header class="app-head"><button class="icon-btn" id="pgBack" aria-label="back">${ICON.back}</button><h2 class="ph">recap</h2><span class="icon-btn"></span></header>
    <section class="recap">
      <div class="recap-nav"><a class="chip" href="#recap/${prev}">‹ ${MONTHS[new Date(y, m - 2, 1).getMonth()]}</a>${monthKey(new Date()) >= next ? `<a class="chip" href="#recap/${next}">${MONTHS[new Date(y, m, 1).getMonth()]} ›</a>` : "<span></span>"}</div>
      <p class="recap-kicker">${y} recap</p>
      <h1 class="recap-title" id="rcTitle">${monthName}</h1>
      <p class="recap-line" id="rcLine">…</p>
      <div class="recap-stats" id="rcStats"></div>
      <div class="cal" id="rcCal">${loading()}</div>
      <div class="center pad"><button class="btn-primary small" id="rcShare">◎ share to story</button></div>
    </section>`, "me");
  $("#pgBack").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#me"));
  if (isFuture) { $("#rcCal").innerHTML = `<p class="muted center">this month hasn't happened yet.</p>`; return; }
  let boards = [];
  try { boards = await D.db.monthBoards(`${key}-01`); } catch { $("#rcCal").innerHTML = `<p class="muted center">couldn't load this month.</p>`; return; }
  const st = recapStats(boards);
  $("#rcStats").innerHTML = [["days pinned", st.days], ["photos", st.photos], ["notes", st.notes], ["stickers", st.stickers], ["magnets", st.magnets]]
    .map(([k, v]) => `<span><b>${v}</b>${k}</span>`).join("");
  // calendar
  const byDay = new Map(boards.map((b) => [Number(b.day.slice(8, 10)), b]));
  const lead = (first.getDay() + 6) % 7; // weeks start monday
  const daysIn = new Date(y, m, 0).getDate();
  let cells = ["m", "t", "w", "t", "f", "s", "s"].map((d) => `<span class="cal-h">${d}</span>`).join("");
  for (let i = 0; i < lead; i++) cells += `<span class="cal-c empty"></span>`;
  for (let d = 1; d <= daysIn; d++) {
    const b = byDay.get(d);
    const date = `${key}-${String(d).padStart(2, "0")}`;
    cells += b ? `<a class="cal-c on" href="#${date}">${miniBoard(b.items, b.background, date)}<i>${d}</i></a>` : `<span class="cal-c"><i>${d}</i></span>`;
  }
  $("#rcCal").innerHTML = cells;
  afterRender($("#rcCal"));
  // the one-line summary: ai if available, cached per month
  const cacheKey = `recap-${D.S.user.id}-${key}`;
  let head = null;
  try { head = JSON.parse(localStorage.getItem(cacheKey) || "null"); } catch {}
  const setHead = (h) => { if (h?.title) $("#rcTitle").textContent = h.title; $("#rcLine").textContent = h?.line || fallbackLine(st, monthName); };
  if (head) setHead(head);
  else if (st.days >= 2) {
    setHead(null);
    D.db.ai({ mode: "recap", recap: { month: `${monthName} ${y}`, days: st.days, photos: st.photos, notesCount: st.notes, notes: st.texts.slice(0, 30) } })
      .then((h) => { if (h?.line) { try { localStorage.setItem(cacheKey, JSON.stringify(h)); } catch {} setHead(h); } })
      .catch(() => {});
  } else setHead(null);
  $("#rcShare").onclick = () => {
    if (!boards.length) return D.toast("pin a few days first");
    const pickB = boards.length <= 9 ? boards : boards.filter((_, i) => i % Math.ceil(boards.length / 9) === 0).slice(0, 9);
    const grid = `<div class="st-grid n${Math.min(pickB.length, 9)}">${pickB.map((b) => `<div class="st-cell">${miniBoard(b.items, b.background, b.day)}<i>${Number(b.day.slice(8, 10))}</i></div>`).join("")}</div>
      <div class="st-stats">${[["days", st.days], ["photos", st.photos], ["stickers", st.stickers]].map(([k, v]) => `<span><b>${v}</b>${k}</span>`).join("")}</div>`;
    openStory(() => renderStory(grid, `${y} recap`, $("#rcTitle").textContent || monthName), `magnet-diary-${key}.png`);
  };
}
export function recapBanner() {
  const d = new Date();
  if (d.getDate() > 7) return "";
  const key = lastMonthKey();
  return `<a class="recap-banner" href="#recap/${key}"><span class="rb-spark">✦</span><span><b>your ${MONTHS[Number(key.slice(5)) - 1]} recap is ready</b><small>see your month on one page and share it</small></span><span class="rb-go">›</span></a>`;
}
