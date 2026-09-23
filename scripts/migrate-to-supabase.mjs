#!/usr/bin/env node
// One-time import of the current catalogue into Supabase, and first-admin setup.
//
//   node scripts/migrate-to-supabase.mjs you@example.com
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env. Safe to re-run:
// rows are upserted, and existing stock/settings edits made in the admin are
// kept (settings are merged, stock is never overwritten).
//
// Imports from the files the static site used before the admin existed:
// config.js, data/products.js, data/images.js.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// .env = your live Supabase project; ENV_FILE=.env.local targets the local one.
const envFile = path.join(ROOT, process.env.ENV_FILE || ".env");
for (const line of fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split("\n") : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const SITE_URL = process.env.SITE_URL || "https://order-priority.vercel.app";
if (!URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.");
  process.exit(1);
}

async function call(base, p, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL}/${base}/${p}`, {
    method,
    headers: { apikey: KEY, ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}), "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(`${method} ${p} → ${r.status} ${text}`), { status: r.status });
  return text ? JSON.parse(text) : null;
}
const rest = (p, o) => call("rest/v1", p, o);
const authApi = (p, o) => call("auth/v1", p, o);

// Load the old browser-global data files.
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["config.js", "data/products.js", "data/images.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const { STORE, COLOURS, CATEGORIES, PRODUCTS, PRODUCT_IMAGES } = sandbox.window;

console.log("→ categories");
await rest("categories", {
  method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
  body: CATEGORIES.map((c, i) => ({ id: c.id, label: c.label, blurb: c.blurb, sort: i })),
});

console.log("→ products");
await rest("products", {
  method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
  body: PRODUCTS.map((p, i) => ({
    id: p.id, name: p.name, category: p.category, description: p.description, price: p.price,
    mrp: p.mrp || null, badge: p.badge || null, status: "active", sort: i,
  })),
});

console.log("→ colours & photos");
const colourRows = [];
for (const p of PRODUCTS) {
  p.colours.forEach((key, i) => {
    const images = (PRODUCT_IMAGES[p.id] || {})[key] || [];
    if (!images.length) return console.warn(`  ! no images for ${p.id}/${key}`);
    colourRows.push({ product_id: p.id, colour_key: key, label: COLOURS[key].label, hex: COLOURS[key].hex, sort: i, images });
  });
}
await rest("product_colours", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: colourRows });

console.log("→ settings");
const current = (await rest("settings?id=eq.1&select=data"))[0]?.data || {};
const fromConfig = {
  name: STORE.name, tagline: STORE.tagline, whatsapp: STORE.whatsapp, phoneDisplay: STORE.phoneDisplay,
  email: STORE.email, instagram: STORE.instagram, legalName: STORE.legalName, address: STORE.address,
  gstin: STORE.gstin, grievanceOfficer: STORE.grievanceOfficer, currency: STORE.currency, sizes: STORE.sizes,
  freeShippingAbove: STORE.freeShippingAbove, shippingFee: STORE.shippingFee, dispatchDays: STORE.dispatchDays,
  deliveryDays: STORE.deliveryDays, cod: STORE.cod, exchangeDays: STORE.exchangeDays,
  damageReportHours: STORE.damageReportHours, refundDays: STORE.refundDays,
};
await rest("settings?id=eq.1", { method: "PATCH", prefer: "return=minimal", body: { data: { ...fromConfig, ...current } } });

if (ADMIN_EMAIL) {
  console.log(`→ first admin: ${ADMIN_EMAIL}`);
  const redirect_to = SITE_URL + "/admin/";
  let data;
  try {
    data = await authApi("admin/generate_link", { method: "POST", body: { type: "invite", email: ADMIN_EMAIL, redirect_to } });
  } catch (e) {
    if (e.status !== 422) throw e; // already has an account → password-reset link instead
    data = await authApi("admin/generate_link", { method: "POST", body: { type: "recovery", email: ADMIN_EMAIL, redirect_to } });
  }
  const link = data.action_link || data.properties?.action_link;
  const userId = data.id || data.user?.id;
  await rest("admins", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { user_id: userId, email: ADMIN_EMAIL } });
  console.log("  open this one-time link to set your password (valid 24 hours):\n  " + link);
}

// Point the /media/* rewrite at this project's storage.
const vercelPath = path.join(ROOT, "vercel.json");
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
vercel.rewrites = [{ source: "/media/:path*", destination: `${URL}/storage/v1/object/public/media/:path*` }];
if (!/127\.0\.0\.1|localhost/.test(URL)) fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + "\n");

console.log(`✓ Imported ${PRODUCTS.length} products, ${colourRows.length} colours, ${CATEGORIES.length} categories.`);
