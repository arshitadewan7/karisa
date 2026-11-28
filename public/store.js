// Everything the app asks of Supabase lives here.
import { createClient } from "/vendor/supabase.js";
import { SUPABASE_URL, SUPABASE_KEY } from "/config.js";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});

const fail = (error) => { if (error) throw Object.assign(new Error(error.message || "something went wrong"), { code: error.code, status: error.status }); };

// ---------- auth ----------
export async function currentUser() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}
export function onAuthChange(cb) {
  sb.auth.onAuthStateChange((event, session) => cb(event, session?.user || null));
}
export async function signUp(name, email, password) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin } });
  fail(error);
  return { needsConfirm: !data.session };
}
export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  fail(error);
}
export async function signOut() { await sb.auth.signOut(); }
export async function sendReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  fail(error);
}
export async function setPassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  fail(error);
}
export async function deleteAccount() {
  const { error } = await sb.functions.invoke("delete-account", { method: "POST" });
  fail(error);
  await sb.auth.signOut();
}

// ---------- profile ----------
export async function getProfile(uid) {
  const { data, error } = await sb.from("profiles").select("display_name, diary_title").eq("id", uid).maybeSingle();
  fail(error);
  return data || { display_name: "", diary_title: "" };
}
export async function setDiaryTitle(uid, title) {
  const { error } = await sb.from("profiles").update({ diary_title: title }).eq("id", uid);
  fail(error);
}

// ---------- days ----------
// a day's board, or null if nothing has been pinned that day
export async function loadDay(uid, day, page = 1) {
  const { data: board, error } = await sb.from("boards").select("id, background")
    .eq("owner_id", uid).eq("kind", "day").eq("day", day).eq("page", page).maybeSingle();
  fail(error);
  if (!board) return { boardId: null, background: "silver", items: [] };
  const { data: rows, error: e2 } = await sb.from("items").select("id, type, data, z, author_id").eq("board_id", board.id).order("z");
  fail(e2);
  return {
    boardId: board.id,
    background: board.background,
    items: rows.map((r) => ({ ...r.data, id: r.id, type: r.type, z: r.z, _author: r.author_id })),
  };
}
export async function ensureDayBoard(uid, day, background, page = 1) {
  const { data, error } = await sb.from("boards").insert({ owner_id: uid, kind: "day", day, page, background }).select("id").single();
  if (!error) return data.id;
  if (error.code !== "23505") fail(error);
  const { data: again, error: e2 } = await sb.from("boards").select("id").eq("owner_id", uid).eq("kind", "day").eq("day", day).eq("page", page).single();
  fail(e2);
  return again.id;
}
export async function setBackground(boardId, background) {
  const { error } = await sb.from("boards").update({ background }).eq("id", boardId);
  fail(error);
}
export async function saveItems(boardId, uid, items) {
  if (!items.length) return;
  const rows = items.map(({ id, type, z, _author, ...data }) => ({
    id, board_id: boardId, author_id: _author || uid, type, z: Math.round(z || 0), data,
  }));
  const { error } = await sb.from("items").upsert(rows);
  fail(error);
}
export async function deleteItems(ids) {
  if (!ids.length) return;
  const { error } = await sb.from("items").delete().in("id", ids);
  fail(error);
}
export async function listDays() {
  const { data, error } = await sb.rpc("my_days");
  fail(error);
  return data.map((d) => ({ date: d.day, count: Number(d.item_count), preview: d.preview, pages: Number(d.pages || 1) }));
}
// every board on one day: [{ id, page, count }]
export async function dayPages(day) {
  const { data, error } = await sb.rpc("day_pages", { p_day: day });
  fail(error);
  return data.map((b) => ({ id: b.board_id, page: b.page, count: Number(b.item_count) }));
}

// ---------- photos (private bucket, read through short-lived signed links) ----------
export async function uploadPhoto(uid, blob) {
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  fail(error);
  return path;
}
export async function signPhotos(paths) {
  if (!paths.length) return {};
  const { data, error } = await sb.storage.from("photos").createSignedUrls(paths, 60 * 60 * 12);
  fail(error);
  const out = {};
  for (const d of data) if (d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

// =====================================================================
// community
// =====================================================================
export async function myProfile(uid) {
  const { data, error } = await sb.from("profiles").select("id, username, display_name, bio, avatar_path, diary_title").eq("id", uid).single();
  fail(error);
  return data;
}
export async function updateProfile(uid, fields) {
  const { error } = await sb.from("profiles").update(fields).eq("id", uid);
  if (error?.code === "23505") throw new Error("that username is taken");
  if (error?.code === "23514") throw new Error("usernames are 3 to 24 letters, numbers, dots or underscores");
  fail(error);
}
export function avatarUrl(path) {
  if (!path) return null;
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
export async function uploadAvatar(uid, blob) {
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  fail(error);
  await updateProfile(uid, { avatar_path: path });
  return path;
}
export async function searchPeople(q) {
  const term = q.replace(/[%_,()]/g, "").trim();
  if (!term) return [];
  const { data, error } = await sb.from("profiles").select("id, username, display_name, avatar_path")
    .not("username", "is", null).or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20);
  fail(error);
  return data;
}
export async function profileByUsername(username) {
  const { data, error } = await sb.rpc("profile_by_username", { p_username: username });
  fail(error);
  return data[0] || null;
}
export async function follow(me, them) {
  const { error } = await sb.from("follows").insert({ follower_id: me, followee_id: them });
  if (error && error.code !== "23505") fail(error);
}
export async function unfollow(me, them) {
  const { error } = await sb.from("follows").delete().eq("follower_id", me).eq("followee_id", them);
  fail(error);
}

// ---------- posts ----------
export async function feed({ kind = "explore", author = null, post = null, before = null, limit = 20, tagged = null } = {}) {
  const { data, error } = await sb.rpc("posts_feed", { p_kind: kind, p_author: author, p_post: post, p_before: before, p_limit: limit, p_tagged: tagged });
  fail(error);
  return data.map((p) => ({
    ...p,
    magnets: Number(p.magnets),
    comment_count: Number(p.comment_count),
    items: (p.items || []).map((r) => ({ ...r.data, id: r.id, type: r.type, z: r.z })),
    tags: p.tags || [],
    preview_comments: p.preview_comments || [],
  }));
}
// tags: make the post's tagged people exactly `userIds`
export async function setTags(uid, postId, userIds) {
  const { data: cur, error } = await sb.from("post_tags").select("user_id").eq("post_id", postId);
  fail(error);
  const have = new Set(cur.map((r) => r.user_id)), want = new Set(userIds);
  const add = [...want].filter((x) => !have.has(x)).map((user_id) => ({ post_id: postId, user_id, tagged_by: uid }));
  const del = [...have].filter((x) => !want.has(x));
  if (add.length) { const { error: e } = await sb.from("post_tags").insert(add); fail(e); }
  if (del.length) { const { error: e } = await sb.from("post_tags").delete().eq("post_id", postId).in("user_id", del); fail(e); }
}
export async function untagMe(uid, postId) {
  const { error } = await sb.from("post_tags").delete().eq("post_id", postId).eq("user_id", uid);
  fail(error);
}
export async function boardInfo(boardId) {
  const { data, error } = await sb.rpc("board_info", { p_board: boardId });
  fail(error);
  return data[0] || null;
}
export async function boardItems(boardId) {
  const { data, error } = await sb.from("items").select("id, type, data, z, author_id").eq("board_id", boardId).order("z");
  fail(error);
  return data.map((r) => ({ ...r.data, id: r.id, type: r.type, z: r.z, _author: r.author_id }));
}
export async function setVisibility(boardId, visibility) {
  const { error } = await sb.from("boards").update({ visibility }).eq("id", boardId);
  fail(error);
}
export async function postForBoard(boardId) {
  const { data, error } = await sb.from("posts").select("id, caption, created_at").eq("board_id", boardId).maybeSingle();
  fail(error);
  return data;
}
export async function publishBoard(uid, boardId, caption, visibility) {
  await setVisibility(boardId, visibility);
  const existing = await postForBoard(boardId);
  if (existing) {
    const { error } = await sb.from("posts").update({ caption }).eq("id", existing.id);
    fail(error);
    return existing.id;
  }
  const { data, error } = await sb.from("posts").insert({ board_id: boardId, author_id: uid, caption }).select("id").single();
  fail(error);
  return data.id;
}
export async function unpublishBoard(boardId) {
  const { error } = await sb.from("posts").delete().eq("board_id", boardId);
  fail(error);
  await setVisibility(boardId, "private");
}
export async function react(uid, postId) {
  const { error } = await sb.from("reactions").insert({ post_id: postId, user_id: uid });
  if (error && error.code !== "23505") fail(error);
}
export async function unreact(uid, postId) {
  const { error } = await sb.from("reactions").delete().eq("post_id", postId).eq("user_id", uid);
  fail(error);
}
export async function comments(postId) {
  const { data, error } = await sb.rpc("post_comments", { p_post: postId });
  fail(error);
  return data;
}
export async function addComment(uid, postId, body) {
  const { error } = await sb.from("comments").insert({ post_id: postId, author_id: uid, body });
  fail(error);
}
export async function deleteComment(id) {
  const { error } = await sb.from("comments").delete().eq("id", id);
  fail(error);
}
export async function report(uid, target, reason) {
  const { error } = await sb.from("reports").insert({ reporter_id: uid, reason, ...target });
  fail(error);
}
export async function activity() {
  const { data, error } = await sb.rpc("my_activity");
  fail(error);
  return data;
}

// ---------- shared boards ----------
export async function sharedBoards() {
  const { data, error } = await sb.rpc("my_shared_boards");
  fail(error);
  return data.map((b) => ({ ...b, people: Number(b.people), item_count: Number(b.item_count) }));
}
export async function createSharedBoard(uid, title) {
  const { data, error } = await sb.from("boards").insert({ owner_id: uid, kind: "shared", title }).select("id").single();
  fail(error);
  return data.id;
}
export async function renameBoard(boardId, title) {
  const { error } = await sb.from("boards").update({ title }).eq("id", boardId);
  fail(error);
}
export async function deleteBoard(boardId) {
  const { error } = await sb.from("boards").delete().eq("id", boardId);
  fail(error);
}
export async function boardPeople(boardId) {
  const { data, error } = await sb.rpc("board_people", { p_board: boardId });
  fail(error);
  return data;
}
export async function invite(boardId, username, role = "editor") {
  const p = await profileByUsername(username.replace(/^@/, ""));
  if (!p) throw new Error("no one has that username yet");
  const { error } = await sb.from("board_members").insert({ board_id: boardId, user_id: p.id, role });
  if (error?.code === "23505") throw new Error("they're already on this board");
  fail(error);
  return p;
}
export async function removeMember(boardId, userId) {
  const { error } = await sb.from("board_members").delete().eq("board_id", boardId).eq("user_id", userId);
  fail(error);
}

// ---------- live ----------
// calls onChange({ type: 'upsert'|'delete', item }) for changes to this board's items,
// and onPeople([{ uid, name }]) with who has the board open right now.
export function watchBoard(boardId, me, onChange, onPeople) {
  const ch = sb.channel(`board:${boardId}`, { config: { presence: { key: me.id } } });
  ch.on("postgres_changes", { event: "*", schema: "public", table: "items", filter: `board_id=eq.${boardId}` }, (msg) => {
    if (msg.eventType === "DELETE") onChange({ type: "delete", item: { id: msg.old.id } });
    else { const r = msg.new; onChange({ type: "upsert", item: { ...r.data, id: r.id, type: r.type, z: r.z, _author: r.author_id } }); }
  });
  ch.on("presence", { event: "sync" }, () => {
    const st = ch.presenceState();
    onPeople(Object.values(st).map((arr) => arr[0]).filter(Boolean));
  });
  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await ch.track({ uid: me.id, name: me.name || "someone" });
  });
  return () => { sb.removeChannel(ch); };
}

// ---------- AI ----------
export async function ai(body) {
  const { data, error } = await sb.functions.invoke("ai-arrange", { body });
  if (error) {
    let info = {};
    try { info = await error.context.json(); } catch {}
    throw Object.assign(new Error(info.error || error.message || "ai failed"), { code: info.error, status: error.context?.status });
  }
  return data;
}

// ---------- invites ----------
export async function createInvite(boardId = null) {
  const { data, error } = await sb.rpc("create_invite", { p_board: boardId });
  if (error && /no invites left/.test(error.message)) throw new Error("no invites left");
  fail(error);
  return data[0];
}
export async function invitePreview(code) {
  const { data, error } = await sb.rpc("invite_preview", { p_code: code });
  fail(error);
  return data[0] || null;
}
export async function redeemInvite(code) {
  const { data, error } = await sb.rpc("redeem_invite", { p_code: code });
  fail(error);
  return data[0];
}
export async function myInvites() {
  const { data, error } = await sb.rpc("my_invites");
  fail(error);
  return data;
}
export async function invitesLeft(uid) {
  const { data, error } = await sb.from("profiles").select("invites_left").eq("id", uid).single();
  fail(error);
  return data.invites_left;
}

// ---------- recaps ----------
export async function monthBoards(monthDate) {
  const { data, error } = await sb.rpc("month_boards", { p_month: monthDate });
  fail(error);
  return data.map((b) => ({
    day: b.day, page: b.page || 1, background: b.background, post_id: b.post_id, magnets: Number(b.magnets || 0),
    items: (b.items || []).map((r) => ({ ...r.data, id: r.id, type: r.type, z: r.z })),
  }));
}
