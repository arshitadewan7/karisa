// AI art director: looks at the photos someone picked and lays out a magnet board,
// or writes a one-line summary for a monthly recap. Uses Claude via the Anthropic API.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5";
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "20");
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const BOARD_SYSTEM = `You are the art director for "magnet diary", a photo journal where each day is a brushed-silver magnetic board covered in photos, paper notes and stickers, like a cute, curated fridge door or a Pinterest scrapbook collage.

You get the person's photos (numbered from 0), an optional vibe, the date, and a catalog of the frames, papers, fonts, inks and stickers that exist. Design ONE beautiful board.

The board is 900 wide by 1200 tall. Every item has x, y (its top-left corner), w (its width) and rot (degrees). Heights follow from width: photos are roughly 1.2 to 1.35 times as tall as wide, notes about 0.8 to 1.1, stickers about as tall as wide, word art about 0.35.

Design rules:
- Use every photo exactly once (a photobooth strip counts as using each photo in it). Photos are the heroes: w between 200 and 330. Strips: w 140 to 175, 2 to 4 photos.
- Pick frames that suit each photo's mood (polaroid for candid moments, egg or digicam frames for playful ones, print for landscapes, photobooth for a sequence of similar shots or selfies).
- Overlap items a little, like a real collage, but never hide a face. Keep everything inside the board (x >= 10, y >= 10, x + w <= 890).
- Tilt most things between -9 and 9 degrees; no two neighbours at the same angle.
- Add 1 or 2 short notes written in the first person, warm and specific to what you see in the photos (under 90 characters each, lower case, no hashtags, no emojis unless the vibe asks for them). Use the date if it helps.
- Add 1 word-art headline (2 to 4 words).
- Add 4 to 9 stickers that match the colours and mood of the photos, spread around edges and corners, w 50 to 120. Clips (clip-*) should sit at the top edge of a photo or note.
- Pins: "magnet" or "tape" on prints and polaroids and most notes, "none" on gadget frames, stickers and word art.
- Choose a board background: silver, gunmetal, pearl or rose.
- Only use ids that appear in the catalog.

Reply with JSON only, no prose, in exactly this shape:
{"board":"silver","items":[
 {"type":"photo","photo":0,"frame":"polaroid","caption":"","bw":false,"pin":"magnet","x":80,"y":120,"w":280,"rot":-5},
 {"type":"booth","photos":[1,2,3],"tone":"bw","pin":"magnet","x":620,"y":90,"w":160,"rot":4},
 {"type":"note","paper":"cc-scallop","text":"…","font":"caveat","ink":"blue","pin":"none","x":500,"y":700,"w":300,"rot":3},
 {"type":"text","text":"…","font":"cherry","ink":"pink","fx":"sticker","x":90,"y":40,"w":300,"rot":-4},
 {"type":"sticker","kind":"star-chrome-silver","x":40,"y":1050,"w":90,"rot":12}
]}`;

const RECAP_SYSTEM = `You write the headline for someone's monthly recap in "magnet diary", a cute photo journal. From the notes, captions and numbers you get, write a short, warm title (2 to 5 words, lower case) and one line (under 120 characters, lower case, second person, specific, no hashtags). Reply with JSON only: {"title":"…","line":"…"}`;

function extractJson(text: string) {
  const clean = text.replace(/```(?:json)?/g, "");
  const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json in reply");
  return JSON.parse(clean.slice(start, end + 1));
}

async function askClaude(key: string, system: string, content: unknown[], maxTokens: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("anthropic error", res.status, t.slice(0, 500));
    throw new Error(`ai request failed (${res.status})`);
  }
  const body = await res.json();
  const text = (body.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
  return extractJson(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "ai_not_configured" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: "not signed in" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  const { data: used, error: limErr } = await admin.rpc("bump_ai_usage", { p_user: user.id, p_limit: DAILY_LIMIT });
  if (limErr) return json({ error: "couldn't check your daily limit" }, 500);
  if (used > DAILY_LIMIT) return json({ error: "daily_limit", limit: DAILY_LIMIT }, 429);

  try {
    if (body.mode === "recap") {
      const r = body.recap || {};
      const text = JSON.stringify({
        month: String(r.month || "").slice(0, 30),
        days_pinned: Number(r.days) || 0, photos: Number(r.photos) || 0, notes_count: Number(r.notesCount) || 0,
        notes: (r.notes || []).slice(0, 30).map((s: string) => String(s).slice(0, 200)),
        captions: (r.captions || []).slice(0, 15).map((s: string) => String(s).slice(0, 200)),
      });
      const out = await askClaude(key, RECAP_SYSTEM, [{ type: "text", text }], 400);
      return json({ title: String(out.title || "").slice(0, 60), line: String(out.line || "").slice(0, 160) });
    }

    const photos = (body.photos || []).slice(0, 8);
    if (!photos.length) return json({ error: "no photos" }, 400);
    const content: unknown[] = [];
    photos.forEach((p: { data: string }, i: number) => {
      content.push({ type: "text", text: `photo ${i}:` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: String(p.data).replace(/^data:image\/\w+;base64,/, "") } });
    });
    content.push({
      type: "text",
      text: JSON.stringify({
        date: String(body.date || "").slice(0, 40),
        vibe: String(body.vibe || "").slice(0, 200),
        catalog: body.catalog || {},
      }),
    });
    const out = await askClaude(key, BOARD_SYSTEM, content, 4000);
    if (!out || !Array.isArray(out.items)) throw new Error("bad layout");
    return json({ board: out.board, items: out.items.slice(0, 40) });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502);
  }
});
