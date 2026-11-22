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
export async function loadDay(uid, day) {
  const { data: board, error } = await sb.from("boards").select("id, background")
    .eq("owner_id", uid).eq("kind", "day").eq("day", day).maybeSingle();
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
export async function ensureDayBoard(uid, day, background) {
  const { data, error } = await sb.from("boards").insert({ owner_id: uid, kind: "day", day, background }).select("id").single();
  if (!error) return data.id;
  if (error.code !== "23505") fail(error);
  const { data: again, error: e2 } = await sb.from("boards").select("id").eq("owner_id", uid).eq("kind", "day").eq("day", day).single();
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
  return data.map((d) => ({ date: d.day, count: Number(d.item_count), preview: d.preview }));
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
