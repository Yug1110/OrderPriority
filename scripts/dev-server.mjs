#!/usr/bin/env node
// Local development server that behaves like Vercel for this site:
// serves the static files, runs api/*.js functions, and proxies /media/*
// to Supabase Storage.
//
//   node scripts/dev-server.mjs            → http://127.0.0.1:3000
//
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env (or .env.local).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3000);
const require = createRequire(import.meta.url);

for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".xml": "application/xml", ".txt": "text/plain",
  ".ico": "image/x-icon",
};

function vercelify(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (d) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(d)); return res; };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith("/api/")) {
      const name = p.slice(5).replace(/\/$/, "");
      const file = path.join(ROOT, "api", `${name}.js`);
      if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) { res.statusCode = 404; return res.end("Not found"); }
      delete require.cache[require.resolve(file)];
      delete require.cache[require.resolve(path.join(ROOT, "api", "_lib.js"))];
      req.query = Object.fromEntries(url.searchParams);
      return await require(file)(req, vercelify(res));
    }
    if (p.startsWith("/media/")) {
      const target = `${process.env.SUPABASE_URL}/storage/v1/object/public${p}`;
      const r = await fetch(target);
      res.statusCode = r.status;
      res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end("Server error");
  }
});

server.listen(PORT, "127.0.0.1", () => console.log(`Wynoak dev server → http://127.0.0.1:${PORT}`));
