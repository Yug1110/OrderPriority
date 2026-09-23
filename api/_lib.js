// Shared helpers for the serverless API (files starting with "_" are not routes on Vercel).
// Talks to Supabase's REST API with the service-role key, which stays on the server.

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Defaults for anything not yet saved in the settings table.
const DEFAULT_SETTINGS = {
  name: "Wynoak",
  tagline: "Grown to last.",
  whatsapp: "",
  phoneDisplay: "",
  email: "",
  instagram: "",
  legalName: "[Registered business name]",
  address: "[Street, Area, City, State – PIN]",
  gstin: "",
  grievanceOfficer: "[Name]",
  supportHours: "Mon – Sat, 10 am – 7 pm IST",
  currency: "₹",
  sizes: ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M"],
  freeShippingAbove: 999,
  shippingFee: 79,
  dispatchDays: "1–2",
  deliveryDays: "3–7",
  cod: { enabled: true, fee: 49, minOrder: 499 },
  exchangeDays: 7,
  damageReportHours: 48,
  refundDays: "5–7",
};

// Legacy keys are JWTs and also go in Authorization; the newer sb_secret_…
// keys go only in the apikey header. A user's own token overrides it.
function keyHeaders(token) {
  const h = { apikey: SERVICE_KEY };
  if (token) h.Authorization = `Bearer ${token}`;
  else if (SERVICE_KEY.startsWith("eyJ")) h.Authorization = `Bearer ${SERVICE_KEY}`;
  return h;
}

function configured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

async function db(path, { method = "GET", body, prefer } = {}) {
  const headers = { ...keyHeaders(), "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    const err = new Error(`Supabase ${method} ${path.split("?")[0]} → ${r.status}: ${text}`);
    err.status = r.status;
    err.body = text;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

async function auth(path, { method = "GET", body, token } = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: { ...keyHeaders(token), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) {
    const err = new Error((data && (data.msg || data.message || data.error_description)) || `auth ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

async function getSettings() {
  const rows = await db("settings?id=eq.1&select=data");
  const saved = (rows[0] && rows[0].data) || {};
  return { ...DEFAULT_SETTINGS, ...saved, cod: { ...DEFAULT_SETTINGS.cod, ...(saved.cod || {}) } };
}

// Short, readable order reference, e.g. WYN-260924-7K3F.
function orderId(name) {
  const words = String(name || "Order").trim().split(/\s+/);
  const prefix = (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).toUpperCase();
  const d = new Date(Date.now() + 5.5 * 3600 * 1000); // IST date
  const date = [d.getUTCFullYear() % 100, d.getUTCMonth() + 1, d.getUTCDate()].map((n) => String(n).padStart(2, "0")).join("");
  const rand = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  return `${prefix}-${date}-${rand}`;
}

function send(res, status, data, headers = {}) {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = { SUPABASE_URL, DEFAULT_SETTINGS, configured, db, auth, getSettings, orderId, send, readBody };
