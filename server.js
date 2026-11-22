// Magnet Diary server: accounts (Better Auth), journal days and photos.
// Everything lives in one SQLite file plus an uploads folder under DATA_DIR.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const IS_PROD = process.env.NODE_ENV === "production";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- secret ----------
function getSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  if (IS_PROD) {
    console.error("BETTER_AUTH_SECRET is not set. Set it before running in production.");
    process.exit(1);
  }
  // Local development: make one and keep it in the data folder.
  const file = path.join(DATA_DIR, ".dev-secret");
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"));
  return fs.readFileSync(file, "utf8").trim();
}

// ---------- database ----------
const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const authConfig = {
  appName: "Magnet Diary",
  database: db,
  secret: getSecret(),
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${PORT}`,
  trustedOrigins: (process.env.TRUSTED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
  user: { deleteUser: { enabled: true } },
  // Hosts like Railway sit behind a proxy that passes the visitor's IP in this header;
  // Better Auth uses it to rate-limit sign-in attempts per person.
  advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
};

const { runMigrations } = await getMigrations(authConfig);
await runMigrations();
const auth = betterAuth(authConfig);

db.exec(`
  CREATE TABLE IF NOT EXISTS journal_day (
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    data       TEXT NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    preview    TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, date)
  );
  CREATE TABLE IF NOT EXISTS photo (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    file       TEXT NOT NULL,
    mime       TEXT NOT NULL,
    bytes      INTEGER NOT NULL,
    width      INTEGER,
    height     INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS photo_user ON photo(user_id);
  CREATE TABLE IF NOT EXISTS journal_profile (
    user_id TEXT PRIMARY KEY,
    title   TEXT
  );
`);

const q = {
  listDays: db.prepare(
    "SELECT date, item_count AS count, preview, updated_at FROM journal_day WHERE user_id = ? ORDER BY date DESC"
  ),
  getDay: db.prepare("SELECT data, updated_at FROM journal_day WHERE user_id = ? AND date = ?"),
  putDay: db.prepare(`
    INSERT INTO journal_day (user_id, date, data, item_count, preview, updated_at)
    VALUES (@user_id, @date, @data, @count, @preview, @updated_at)
    ON CONFLICT(user_id, date) DO UPDATE SET
      data = excluded.data, item_count = excluded.item_count,
      preview = excluded.preview, updated_at = excluded.updated_at`),
  delDay: db.prepare("DELETE FROM journal_day WHERE user_id = ? AND date = ?"),
  addPhoto: db.prepare(`
    INSERT INTO photo (id, user_id, file, mime, bytes, width, height, created_at)
    VALUES (@id, @user_id, @file, @mime, @bytes, @width, @height, @created_at)`),
  getPhoto: db.prepare("SELECT * FROM photo WHERE id = ? AND user_id = ?"),
  userPhotos: db.prepare("SELECT file FROM photo WHERE user_id = ?"),
  delUserData: db.transaction((uid) => {
    db.prepare("DELETE FROM journal_day WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM photo WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM journal_profile WHERE user_id = ?").run(uid);
  }),
  getProfile: db.prepare("SELECT title FROM journal_profile WHERE user_id = ?"),
  putProfile: db.prepare(`
    INSERT INTO journal_profile (user_id, title) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET title = excluded.title`),
};

// ---------- app ----------
const app = new Hono();
app.use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin" }));

// Better Auth handles /api/auth/* (sign-up, sign-in, sign-out, get-session, ...)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Everything else under /api needs a signed-in user.
app.use("/api/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("user", session.user);
  await next();
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-f0-9-]{36}$/;

app.get("/api/me", (c) => {
  const u = c.get("user");
  const p = q.getProfile.get(u.id);
  return c.json({ user: { id: u.id, name: u.name, email: u.email }, title: p?.title || "" });
});

app.put("/api/profile", async (c) => {
  const u = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title || "").slice(0, 60);
  q.putProfile.run(u.id, title);
  return c.json({ ok: true });
});

app.get("/api/days", (c) => {
  return c.json({ days: q.listDays.all(c.get("user").id) });
});

app.get("/api/days/:date", (c) => {
  const date = c.req.param("date");
  if (!DATE_RE.test(date)) return c.json({ error: "bad date" }, 400);
  const row = q.getDay.get(c.get("user").id, date);
  if (!row) return c.json({ date, board: "silver", items: [] });
  return c.json({ ...JSON.parse(row.data), date, updated_at: row.updated_at });
});

app.put("/api/days/:date", bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
  const u = c.get("user");
  const date = c.req.param("date");
  if (!DATE_RE.test(date)) return c.json({ error: "bad date" }, 400);
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length > 400) {
    return c.json({ error: "bad body" }, 400);
  }
  if (body.items.length === 0) {
    q.delDay.run(u.id, date);
    return c.json({ ok: true, deleted: true });
  }
  const board = typeof body.board === "string" ? body.board.slice(0, 20) : "silver";
  let preview = null;
  for (const i of body.items) {
    const id = i?.type === "photo" ? i.photo : i?.type === "booth" && Array.isArray(i.photos) ? i.photos[0] : null;
    if (typeof id === "string" && ID_RE.test(id)) { preview = id; break; }
  }
  q.putDay.run({
    user_id: u.id,
    date,
    data: JSON.stringify({ board, items: body.items }),
    count: body.items.length,
    preview,
    updated_at: Date.now(),
  });
  return c.json({ ok: true });
});

const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

app.post("/api/photos", bodyLimit({ maxSize: 15 * 1024 * 1024 }), async (c) => {
  const u = c.get("user");
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return c.json({ error: "no file" }, 400);
  const ext = MIME_EXT[file.type];
  if (!ext) return c.json({ error: "unsupported type" }, 415);

  const id = crypto.randomUUID();
  const dir = path.join(UPLOAD_DIR, u.id.replace(/[^A-Za-z0-9_-]/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  const rel = path.relative(UPLOAD_DIR, path.join(dir, `${id}.${ext}`));
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, rel), buf);

  const width = parseInt(form.get("width")) || null;
  const height = parseInt(form.get("height")) || null;
  q.addPhoto.run({
    id, user_id: u.id, file: rel, mime: file.type, bytes: buf.length,
    width, height, created_at: Date.now(),
  });
  return c.json({ id, width, height });
});

app.get("/api/photos/:id", (c) => {
  const id = c.req.param("id");
  if (!ID_RE.test(id)) return c.notFound();
  const row = q.getPhoto.get(id, c.get("user").id);
  if (!row) return c.notFound();
  const full = path.join(UPLOAD_DIR, row.file);
  if (!fs.existsSync(full)) return c.notFound();
  return new Response(fs.readFileSync(full), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});

// Removes the user's journal data and photos, then the account itself.
app.delete("/api/account", async (c) => {
  const u = c.get("user");
  for (const r of q.userPhotos.all(u.id)) {
    fs.rmSync(path.join(UPLOAD_DIR, r.file), { force: true });
  }
  q.delUserData(u.id);
  await auth.api.deleteUser({ headers: c.req.raw.headers, body: {} });
  return c.json({ ok: true });
});

app.get("/healthz", (c) => c.text("ok"));
app.use("/*", serveStatic({ root: "./public" }));
app.get("*", serveStatic({ path: "./public/index.html" }));

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Magnet Diary running on http://localhost:${PORT}`);
});
