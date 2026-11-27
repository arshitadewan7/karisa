// community: feed, profiles, posting, comments, shared "together" boards.
// app.js hands over what it owns (state, renderers, sheets) through init().
let D; // deps from app.js
const $ = (s, r = document) => r.querySelector(s);

export function init(deps) {
  D = deps;
  wireSheets();
  window.addEventListener("resize", () => scaleMinis(document));
}

// ---------------- small helpers ----------------
const esc = (s) => D.esc(s);
function ago(ts) {
  const s = Math.max(1, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  if (s < 86400 * 7) return Math.floor(s / 86400) + "d";
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
      catch (e) { D.toast("couldn't send that report"); }
    },
  })));
}

// ---------------- username gate ----------------
async function ensureUsername(then) {
  if (D.S.me?.username) return true;
  page(`<section class="empty-page"><h2>make your profile</h2><p>pick a username so friends can find you, follow you and invite you to boards.</p><button class="btn-primary small" id="setupGo">set up profile</button></section>`, "me");
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
      D.S.post = { id, caption };
      D.S.visibility = vis;
      D.renderPostBtn();
      D.closeSheets();
      D.toast(vis === "public" ? "posted for everyone" : "posted for your followers", "view", () => (location.hash = "#p/" + id));
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
    } catch (e) { D.toast("couldn't take it down"); }
  };

  // people on a shared board
  $("#inviteGo").onclick = doInvite;
  $("#inviteIn").addEventListener("keydown", (e) => { if (e.key === "Enter") doInvite(); });
}

// ---------------- posting a board ----------------
export async function openPostSheet() {
  await D.flush();
  if (!D.S.boardId || !D.S.day.items.length) { D.toast("pin something first, then post it"); return; }
  if (!(await ensureUsername(() => { D.route(); }))) return;
  const posted = !!D.S.post;
  $("#postTitle").textContent = posted ? "your post" : "post this board";
  $("#postCaption").value = D.S.post?.caption || "";
  const vis = D.S.visibility === "public" ? "public" : "followers";
  $("#postVis").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.vis === vis));
  $("#postGo").textContent = posted ? "update" : "post";
  const u = $("#unpostBtn");
  u.hidden = !posted;
  u.classList.remove("armed");
  u.textContent = "take it down";
  D.openSheet("#postSheet");
}

// ---------------- feed ----------------
let feedKind = "following";
export async function feedPage(kind = feedKind) {
  feedKind = kind;
  if (!(await ensureUsername(() => feedPage(kind)))) return;
  const el = page(`
    <header class="page-head">
      <h2>feed</h2>
      <div class="seg small" id="feedSeg">
        <a href="#feed" class="${kind === "following" ? "on" : ""}">following</a>
        <a href="#explore" class="${kind === "explore" ? "on" : ""}">explore</a>
      </div>
    </header>
    <div class="find"><input id="findIn" class="field" placeholder="find friends by name or @username" autocomplete="off" autocapitalize="off"><div id="findOut" class="find-out"></div></div>
    <div class="cards" id="cards">${loading()}</div>
    <div class="center pad"><button class="chip" id="moreBtn" hidden>load more</button></div>`, "feed");
  wireFind();
  let before = null;
  const load = async () => {
    const posts = await D.db.feed({ kind, before });
    const cards = $("#cards", el);
    if (!before) cards.innerHTML = "";
    if (!posts.length && !before) {
      cards.innerHTML = kind === "following"
        ? `<section class="empty-page small"><p>nothing here yet. follow friends to see their boards, or post one of yours.</p><a class="chip" href="#explore">see explore</a></section>`
        : `<section class="empty-page small"><p>no public boards yet. be the first: open a day and tap ↗ post.</p></section>`;
    }
    cards.insertAdjacentHTML("beforeend", posts.map(cardHtml).join(""));
    wireCards(cards, posts);
    afterRender(cards);
    before = posts.length ? posts[posts.length - 1].created_at : before;
    $("#moreBtn", el).hidden = posts.length < 20;
  };
  $("#moreBtn", el).onclick = load;
  try { await load(); } catch (e) { $("#cards", el).innerHTML = `<p class="muted center pad">couldn't load the feed.</p>`; }
}

function cardHtml(p) {
  const label = boardLabel(p);
  return `<article class="card" data-post="${p.post_id}">
    <header class="card-head">
      <a class="who" href="#@${esc(p.username || "")}">${avatar(p)}<span><b>${esc(nameOf(p))}</b><small>@${esc(p.username || "")} · ${ago(p.created_at)}${p.visibility === "followers" ? " · followers" : ""}</small></span></a>
      <button class="dots" data-menu aria-label="more">•••</button>
    </header>
    <a class="card-board" href="#p/${p.post_id}">${miniBoard(p.items, p.background, p.board_day || p.created_at.slice(0, 10))}</a>
    <div class="card-actions">
      <button class="magnet-btn ${p.i_reacted ? "on" : ""}" data-magnet aria-label="give a magnet"><i class="mg"></i><span>${p.magnets}</span></button>
      <a class="cm" href="#p/${p.post_id}">✎ <span>${p.comment_count}</span></a>
      <span class="card-label">${esc(label)}</span>
    </div>
    ${p.caption ? `<p class="card-cap"><a href="#@${esc(p.username || "")}">${esc(p.username || "")}</a> ${esc(p.caption)}</p>` : ""}
  </article>`;
}
function wireCards(root, posts) {
  const byId = new Map(posts.map((p) => [p.post_id, p]));
  root.querySelectorAll(".card").forEach((card) => {
    if (card.dataset.wired) return;
    card.dataset.wired = "1";
    const p = byId.get(card.dataset.post);
    if (!p) return;
    card.querySelector("[data-magnet]").onclick = (e) => toggleMagnet(p, e.currentTarget);
    card.querySelector("[data-menu]").onclick = () => postMenu(p);
  });
}
async function toggleMagnet(p, btn) {
  const was = p.i_reacted;
  p.i_reacted = !was;
  p.magnets += was ? -1 : 1;
  btn.classList.toggle("on", p.i_reacted);
  btn.querySelector("span").textContent = p.magnets;
  if (!was) btn.classList.add("pop"), setTimeout(() => btn.classList.remove("pop"), 400);
  try { was ? await D.db.unreact(D.S.user.id, p.post_id) : await D.db.react(D.S.user.id, p.post_id); }
  catch { p.i_reacted = was; p.magnets += was ? 1 : -1; btn.classList.toggle("on", was); btn.querySelector("span").textContent = p.magnets; }
}
function postMenu(p) {
  const mine = p.author_id === D.S.user.id;
  const list = [];
  if (mine) {
    list.push({ label: "open my board", run: () => (location.hash = p.board_kind === "day" ? "#" + p.board_day : "#b/" + p.board_id) });
    list.push({ label: "take this post down", danger: true, run: async () => {
      try { await D.db.unpublishBoard(p.board_id); D.toast("taken down"); D.route(); } catch { D.toast("couldn't take it down"); }
    } });
  } else {
    list.push({ label: `view @${p.username}`, run: () => (location.hash = "#@" + p.username) });
    list.push({ label: "report this post", danger: true, run: () => reportMenu({ post_id: p.post_id }, "post") });
  }
  actions("post", list);
}

// people search
function wireFind() {
  const input = $("#findIn"), out = $("#findOut");
  let t;
  input.oninput = () => {
    clearTimeout(t);
    const q = input.value.trim();
    if (!q) { out.innerHTML = ""; return; }
    t = setTimeout(async () => {
      try {
        const people = await D.db.searchPeople(q);
        out.innerHTML = people.length
          ? people.map((p) => `<a class="person" href="#@${esc(p.username)}">${avatar(p)}<span><b>${esc(nameOf(p))}</b><small>@${esc(p.username)}</small></span></a>`).join("")
          : `<p class="muted pad-s">no one found</p>`;
      } catch { out.innerHTML = ""; }
    }, 250);
  };
}

// ---------------- a single post ----------------
export async function postPage(id) {
  if (!(await ensureUsername(() => postPage(id)))) return;
  const el = page(`<header class="page-head"><button class="icon back" id="pgBack">‹</button><h2>post</h2></header><div id="postBody">${loading()}</div>`, "feed");
  $("#pgBack").onclick = () => (history.length > 1 ? history.back() : (location.hash = "#feed"));
  let p;
  try { [p] = await D.db.feed({ kind: "any", post: id, limit: 1 }); } catch {}
  const body = $("#postBody", el);
  if (!p) { body.innerHTML = `<section class="empty-page small"><p>this post isn't available. it may have been taken down or be for followers only.</p></section>`; return; }
  body.innerHTML = `<div class="cards single">${cardHtml(p)}</div>
    <section class="comments"><h3>comments</h3><div id="cmList">${loading()}</div>
      <form id="cmForm" class="cm-form"><input id="cmIn" class="field" maxlength="500" placeholder="say something nice…" autocomplete="off"><button class="btn-primary small">send</button></form>
    </section>`;
  wireCards(body, [p]);
  afterRender(body);
  const renderComments = async () => {
    const list = await D.db.comments(id);
    const mineOrMyPost = (c) => c.author_id === D.S.user.id || p.author_id === D.S.user.id;
    $("#cmList").innerHTML = list.length ? list.map((c) => `<div class="cm-row" data-id="${c.id}">
        <a href="#@${esc(c.username || "")}">${avatar(c, "s")}</a>
        <p><a href="#@${esc(c.username || "")}"><b>${esc(c.username || nameOf(c))}</b></a> ${esc(c.body)}<small>${ago(c.created_at)}</small></p>
        <button class="dots s" data-cmenu="${c.id}" data-mine="${mineOrMyPost(c) ? 1 : 0}">•••</button>
      </div>`).join("") : `<p class="muted pad-s">no comments yet.</p>`;
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
  return profilePage(D.S.me.username, true);
}
export async function profilePage(username, isMeTab = false) {
  if (!(await ensureUsername(() => profilePage(username)))) return;
  const own = username === D.S.me.username;
  const el = page(`<div id="profBody">${loading()}</div>`, own ? "me" : "feed");
  let p;
  try { p = await D.db.profileByUsername(username); } catch {}
  const body = $("#profBody", el);
  if (!p) { body.innerHTML = `<section class="empty-page small"><p>no one called @${esc(username)} here.</p></section>`; return; }
  body.innerHTML = `
    <section class="prof">
      ${own ? "" : `<button class="icon back" id="pgBack">‹</button>`}
      ${avatar(p, "xl")}
      <h2>${esc(nameOf(p))}</h2>
      <p class="muted">@${esc(p.username)}${p.follows_me && !own ? " · follows you" : ""}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ""}
      <div class="stats"><span><b>${p.posts}</b>posts</span><span><b>${p.followers}</b>followers</span><span><b>${p.following}</b>following</span></div>
      <div class="prof-actions">
        ${own ? `<button class="chip" id="editProf">edit profile</button><button class="chip" id="acctBtn">account</button>`
              : `<button class="btn-primary small ${p.i_follow ? "ghost" : ""}" id="followBtn">${p.i_follow ? "following" : p.follows_me ? "follow back" : "follow"}</button><button class="chip" id="profMenu">•••</button>`}
      </div>
    </section>
    ${own ? `<section class="activity"><h3>activity</h3><div id="actList">${loading()}</div></section>` : ""}
    <section class="grid-posts"><h3>${own ? "your posts" : "posts"}</h3><div class="pgrid" id="pgrid">${loading()}</div></section>`;
  if (!own) $("#pgBack").onclick = () => history.back();
  if (own) {
    $("#editProf").onclick = () => openProfileSheet(false, () => profilePage(D.S.me.username));
    $("#acctBtn").onclick = () => D.openMenu();
    loadActivity();
  } else {
    $("#followBtn").onclick = async () => {
      const b = $("#followBtn");
      try {
        if (p.i_follow) { await D.db.unfollow(D.S.user.id, p.id); p.i_follow = false; p.followers--; }
        else { await D.db.follow(D.S.user.id, p.id); p.i_follow = true; p.followers++; }
        b.textContent = p.i_follow ? "following" : "follow";
        b.classList.toggle("ghost", p.i_follow);
        body.querySelector(".stats span:nth-child(2) b").textContent = p.followers;
      } catch { D.toast("couldn't update"); }
    };
    $("#profMenu").onclick = () => actions(`@${p.username}`, [{ label: "report this profile", danger: true, run: () => reportMenu({ profile_id: p.id }, "profile") }]);
  }
  try {
    const posts = await D.db.feed({ kind: "any", author: p.id, limit: 50 });
    const g = $("#pgrid");
    g.innerHTML = posts.length
      ? posts.map((x) => `<a class="pthumb" href="#p/${x.post_id}">${miniBoard(x.items, x.background, x.board_day || x.created_at.slice(0, 10))}</a>`).join("")
      : `<p class="muted pad-s">${own ? "nothing posted yet. open a day and tap ↗ post." : "nothing to see yet."}</p>`;
    afterRender(g);
  } catch { $("#pgrid").innerHTML = `<p class="muted">couldn't load posts.</p>`; }
}
async function loadActivity() {
  try {
    const list = await D.db.activity();
    const words = { follow: "started following you", magnet: "gave your board a magnet", comment: "commented:", invite: "added you to" };
    $("#actList").innerHTML = list.length ? list.map((a) => {
      const href = a.kind === "follow" ? `#@${a.username}` : a.kind === "invite" ? `#b/${a.board_id}` : `#p/${a.post_id}`;
      const extra = a.kind === "comment" ? ` “${esc(a.body)}”` : a.kind === "invite" ? ` <b>${esc(a.body || "a memory board")}</b>` : "";
      return `<a class="act-row" href="${esc(href)}">${avatar(a, "s")}<span><b>${esc(a.username || nameOf(a))}</b> ${words[a.kind]}${extra}<small>${ago(a.at)}</small></span></a>`;
    }).join("") : `<p class="muted pad-s">nothing yet. when people follow you, comment or add you to a board, it shows up here.</p>`;
  } catch { $("#actList").innerHTML = `<p class="muted">couldn't load activity.</p>`; }
}

// ---------------- together (shared boards) ----------------
export async function togetherPage() {
  if (!(await ensureUsername(() => togetherPage()))) return;
  const el = page(`
    <header class="page-head"><h2>together</h2></header>
    <p class="muted page-sub">memory boards you make with friends. everyone on a board can add photos, notes and stickers, live.</p>
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
