// Deletes the signed-in person's photos and account.
// Their profile, boards and items go with it (foreign keys cascade).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: "not signed in" }, 401);

  // remove every photo in their folder, a page at a time
  const bucket = admin.storage.from("photos");
  for (let round = 0; round < 50; round++) {
    const { data: files, error: listErr } = await bucket.list(user.id, { limit: 1000 });
    if (listErr) return json({ error: "couldn't list photos" }, 500);
    if (!files || files.length === 0) break;
    const { error: rmErr } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (rmErr) return json({ error: "couldn't remove photos" }, 500);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: "couldn't delete account" }, 500);
  return json({ ok: true });
});
