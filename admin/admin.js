// Wynoak admin — products, stock, orders, dashboard, settings, team.
// Talks to Supabase directly with the logged-in admin's session; row-level
// security in the database allows this only for users listed in `admins`.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------------------------------------------------------------- helpers
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const IST = { timeZone: "Asia/Kolkata" };
const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { ...IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtDay = (d) => new Date(d + "T00:00:00+05:30").toLocaleDateString("en-IN", { ...IST, day: "numeric", month: "short" });
const imgUrl = (base, small = true) => `/${base}${small ? "-sm" : ""}.webp`;
const ICON_LOGO = '<svg viewBox="0 0 40 40" fill="none" width="30" height="30"><circle cx="20" cy="20" r="19" fill="#EFE4D6"/><path d="M12.8 19h14.4v2.2c0 5.3-3.3 9.4-7.2 10.9-3.9-1.5-7.2-5.6-7.2-10.9z" fill="#C8795A"/><path d="M11.2 19.4c0-4.1 3.9-7 8.8-7s8.8 2.9 8.8 7z" fill="#5B4636"/><path d="M20 12.6c0-2.1.9-3.6 2.5-4.4" stroke="#5B4636" stroke-width="1.6" stroke-linecap="round"/><path d="M22.4 8.6c2.4-1.7 5.3-1.4 6.6 0-1.7 1.7-4.6 1.9-6.6 0z" fill="#8A9A7B"/></svg>';

const STATUSES = [
  ["new", "New"], ["confirmed", "Confirmed"], ["paid", "Paid"], ["packed", "Packed"], ["shipped", "Shipped"],
  ["delivered", "Delivered"], ["exchange", "Exchange"], ["cancelled", "Cancelled"], ["returned", "Returned"],
];
const statusLabel = (s) => (STATUSES.find((x) => x[0] === s) || [s, s])[1];
const pill = (s) => `<span class="pill ${esc(s)}">${esc(statusLabel(s))}</span>`;
const SOURCE = { bag: "Website checkout", quick: "“Order on WhatsApp” button", admin: "Added in admin" };

const DEFAULT_SETTINGS = {
  name: "Wynoak", tagline: "Grown to last.", whatsapp: "", phoneDisplay: "", email: "", instagram: "",
  supportHours: "Mon – Sat, 10 am – 7 pm IST", legalName: "", address: "", gstin: "", grievanceOfficer: "",
  sizes: ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M"], freeShippingAbove: 999, shippingFee: 79,
  dispatchDays: "1–2", deliveryDays: "3–7", cod: { enabled: true, fee: 49, minOrder: 499 },
  exchangeDays: 7, damageReportHours: 48, refundDays: "5–7", currency: "₹",
};

let sb, session, settings, categories = [], productNames = {};

let toastTimer;
function toast(text, bad) {
  const t = $(".toast");
  t.textContent = text; t.style.background = bad ? "#a33b2b" : "";
  t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
function fail(error, what = "Something went wrong") {
  console.error(error);
  toast(`${what}: ${error.message || error}`, true);
}
async function q(promise, what) {
  const { data, error, count } = await promise;
  if (error) { fail(error, what); throw error; }
  return count !== undefined && count !== null && data === null ? count : data;
}

// Customer phone → WhatsApp link (assumes India when 10 digits).
function waLink(phone, text) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function orderId() {
  const words = String(settings.name || "Order").trim().split(/\s+/);
  const prefix = (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).toUpperCase();
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  const date = [d.getUTCFullYear() % 100, d.getUTCMonth() + 1, d.getUTCDate()].map((n) => String(n).padStart(2, "0")).join("");
  return `${prefix}-${date}-${Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("")}`;
}

// ---------------------------------------------------------------- boot & auth
const initialHash = location.hash;
const authType = (/[#&]type=(invite|recovery|signup|magiclink)/.exec(initialHash) || [])[1];
const authError = (() => {
  const m = /[#&]error_code=([^&]+)/.exec(initialHash) || /[#&]error=([^&]+)/.exec(initialHash);
  if (!m) return "";
  return m[1] === "otp_expired"
    ? "That link has already been used or has expired."
    : decodeURIComponent((/[#&]error_description=([^&]+)/.exec(initialHash) || [, "The link didn't work."])[1].replace(/\+/g, " "));
})();
if (authError) history.replaceState(null, "", location.pathname);

async function boot() {
  let cfg;
  try {
    const r = await fetch("/api/admin-config");
    cfg = await r.json();
    if (!r.ok) throw new Error(cfg.error);
  } catch (e) {
    $("#app").innerHTML = `<div class="auth"><div class="auth-card"><div class="logo">${ICON_LOGO}<span>Wynoak</span></div><h1>Admin not set up yet</h1><p>${esc(e.message || "The admin can't reach the store database.")}</p></div></div>`;
    return;
  }
  sb = createClient(cfg.supabaseUrl, cfg.anonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "implicit" } });
  sb.auth.onAuthStateChange((event, s) => {
    session = s;
    if (event === "PASSWORD_RECOVERY") showSetPassword("recovery");
    if (event === "SIGNED_OUT") showLogin();
  });
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) return showLogin(authError ? `${authError} Log in below, or use “Forgot password?” to get a new link by email.` : "");
  if (authType === "invite" || authType === "recovery") return showSetPassword(authType);
  enter();
}

function authCard(inner) {
  $("#app").innerHTML = `<div class="auth"><div class="auth-card"><div class="logo">${ICON_LOGO}<span>Wynoak</span></div>${inner}</div></div>`;
}

function showLogin(message = "") {
  authCard(`
    <h1>Admin login</h1><p>${esc(message || "Sign in to manage products, stock and orders.")}</p>
    <form id="login">
      <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required></div>
      <p class="form-error" id="err"></p>
      <button class="btn btn-primary btn-block" type="submit">Log in</button>
    </form>
    <p style="margin:16px 0 0;text-align:center"><button class="link-btn" id="forgot">Forgot password?</button></p>`);
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#err").textContent = "";
    const { data, error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (error) { $("#err").textContent = error.message === "Invalid login credentials" ? "Wrong email or password" : error.message; return; }
    session = data.session;
    enter();
  });
  $("#forgot").addEventListener("click", async () => {
    const email = $("#email").value.trim();
    if (!email) { $("#err").textContent = "Type your email above first"; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/admin/" });
    $("#err").textContent = "";
    if (error) $("#err").textContent = error.message;
    else toast("Check your email for a reset link");
  });
}

function showSetPassword(kind) {
  authCard(`
    <h1>${kind === "invite" ? "Welcome! Set your password" : "Choose a new password"}</h1>
    <p>Signed in as <b>${esc(session?.user?.email || "")}</b>. Use at least 8 characters.</p>
    <form id="setpw">
      <div class="field"><label for="pw1">New password</label><input id="pw1" type="password" autocomplete="new-password" minlength="8" required></div>
      <div class="field"><label for="pw2">Repeat password</label><input id="pw2" type="password" autocomplete="new-password" minlength="8" required></div>
      <p class="form-error" id="err"></p>
      <button class="btn btn-primary btn-block" type="submit">Save password</button>
    </form>
    ${kind === "change" ? '<p style="margin:16px 0 0;text-align:center"><a class="link-btn" href="#/dashboard" id="pw-cancel">Cancel</a></p>' : ""}`);
  $("#pw-cancel")?.addEventListener("click", (e) => { e.preventDefault(); enter(); });
  $("#setpw").addEventListener("submit", async (e) => {
    e.preventDefault();
    const a = $("#pw1").value, b = $("#pw2").value;
    if (a.length < 8) return ($("#err").textContent = "Use at least 8 characters");
    if (a !== b) return ($("#err").textContent = "The passwords don't match");
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) return ($("#err").textContent = error.message);
    history.replaceState(null, "", location.pathname);
    toast("Password saved");
    enter();
  });
}

async function enter() {
  const { data: mine, error } = await sb.from("admins").select("user_id").eq("user_id", session.user.id);
  if (error || !mine.length) {
    authCard(`<h1>No admin access</h1><p>${esc(session.user.email)} isn't on the admin team. Ask an existing admin to invite you.</p><button class="btn btn-ghost btn-block" id="out">Log out</button>`);
    $("#out").addEventListener("click", () => sb.auth.signOut());
    return;
  }
  const [{ data: st }, { data: cats }, { data: prods }] = await Promise.all([
    sb.from("settings").select("data").eq("id", 1).single(),
    sb.from("categories").select("*").order("sort"),
    sb.from("products").select("id,name"),
  ]);
  settings = { ...DEFAULT_SETTINGS, ...(st?.data || {}), cod: { ...DEFAULT_SETTINGS.cod, ...((st?.data || {}).cod || {}) } };
  categories = cats || [];
  productNames = Object.fromEntries((prods || []).map((p) => [p.id, p.name]));
  shell();
  if (!location.hash || /access_token|type=|error=/.test(location.hash)) history.replaceState(null, "", "#/dashboard");
  window.onhashchange = route;
  route();
  if (authError) toast(`${authError} You're already logged in. Use “Change password” in the menu if you haven't set one yet.`);
}

// ---------------------------------------------------------------- layout & routing
const NAV = [["dashboard", "Dashboard", "📊"], ["orders", "Orders", "🧾"], ["products", "Products", "👕"], ["categories", "Categories", "🗂️"], ["settings", "Settings", "⚙️"], ["team", "Team", "👥"]];

function shell() {
  $("#app").innerHTML = `
    <div class="topbar"><button class="icon-btn" id="menu" aria-label="Menu">☰</button><div class="logo">${ICON_LOGO}<span>Wynoak</span></div><a class="icon-btn" href="/" target="_blank" aria-label="View shop">↗</a></div>
    <div class="shell">
      <aside class="side" id="side">
        <div class="logo">${ICON_LOGO}<span>${esc(settings.name)}<small>Admin</small></span></div>
        ${NAV.map(([id, label, ic]) => `<a class="nav-item" href="#/${id}" data-nav="${id}"><span>${ic}</span>${label}${id === "orders" ? '<span class="count" id="new-count" hidden></span>' : ""}</a>`).join("")}
        <div class="spacer"></div>
        <a class="nav-item" href="/" target="_blank"><span>🛍️</span>View shop ↗</a>
        <a class="nav-item" href="#" id="changepw"><span>🔑</span>Change password</a>
        <a class="nav-item" href="#" id="signout"><span>🚪</span>Log out</a>
        <div class="me">${esc(session.user.email)}</div>
      </aside>
      <main class="main" id="view"></main>
    </div>`;
  $("#menu").addEventListener("click", () => $("#side").classList.toggle("open"));
  $("#signout").addEventListener("click", (e) => { e.preventDefault(); sb.auth.signOut(); });
  $("#changepw").addEventListener("click", (e) => { e.preventDefault(); showSetPassword("change"); });
  $("#side").addEventListener("click", (e) => { if (e.target.closest("a")) $("#side").classList.remove("open"); });
  refreshNewCount();
}

async function refreshNewCount() {
  const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "new");
  const el = $("#new-count");
  if (el) { el.hidden = !count; el.textContent = count || ""; }
}

async function route() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [section = "dashboard", id] = path.split("/");
  const params = new URLSearchParams(query);
  $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === section));
  const old = $("#view");
  const view = old.cloneNode(false); // fresh element: listeners from the previous page are dropped
  old.replaceWith(view);
  view.innerHTML = '<p class="muted-note">Loading…</p>';
  window.scrollTo(0, 0);
  try {
    if (section === "dashboard") await viewDashboard(view);
    else if (section === "orders" && id === "new") await viewNewOrder(view);
    else if (section === "orders" && id) await viewOrder(view, decodeURIComponent(id));
    else if (section === "orders") await viewOrders(view, params);
    else if (section === "products" && id) await viewProduct(view, id === "new" ? null : decodeURIComponent(id), params);
    else if (section === "products") await viewProducts(view);
    else if (section === "categories") await viewCategories(view);
    else if (section === "settings") await viewSettings(view);
    else if (section === "team") await viewTeam(view);
    else { history.replaceState(null, "", "#/dashboard"); return route(); }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="panel"><h2>Couldn't load this page</h2><p class="muted-note">${esc(e.message || e)}</p></div>`;
  }
}

// ---------------------------------------------------------------- dashboard
function periodRange(p) {
  const now = new Date();
  if (p === "today") {
    const ist = new Date(now.getTime() + 5.5 * 3600e3);
    const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600e3);
    return [start, new Date(now.getTime() + 60e3)];
  }
  if (p === "all") return [new Date("2020-01-01T00:00:00Z"), new Date(now.getTime() + 60e3)];
  return [new Date(now.getTime() - Number(p) * 86400e3), new Date(now.getTime() + 60e3)];
}

async function viewDashboard(view) {
  const period = sessionStorage.getItem("dash.period") || "30";
  const [from, to] = periodRange(period);
  const [stats, recent, low] = await Promise.all([
    q(sb.rpc("admin_stats", { p_from: from.toISOString(), p_to: to.toISOString() }), "Loading stats"),
    q(sb.from("orders").select("id,created_at,customer_name,total,status,source").order("created_at", { ascending: false }).limit(6), "Loading orders"),
    q(sb.from("stock").select("product_id,colour_key,size,qty").lte("qty", 2).order("qty").limit(12), "Loading stock"),
  ]);
  const s = stats;
  const codShare = s.confirmed ? Math.round((s.cod_orders / s.confirmed) * 100) : 0;
  const by = s.by_status || {};

  view.innerHTML = `
    <div class="page-head"><h1>Dashboard</h1>
      <div class="actions"><select id="period" class="select" aria-label="Period">
        ${[["today", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "All time"]].map(([v, l]) => `<option value="${v}" ${v === period ? "selected" : ""}>${l}</option>`).join("")}
      </select></div></div>
    <div class="tiles">
      <div class="tile"><div class="label">Revenue</div><div class="value">${money(s.revenue)}</div><div class="sub">from confirmed orders</div></div>
      <div class="tile"><div class="label">Confirmed orders</div><div class="value">${s.confirmed}</div><div class="sub">${s.placed} placed in total</div></div>
      <div class="tile"><div class="label">Avg order value</div><div class="value">${money(s.aov)}</div><div class="sub">confirmed orders</div></div>
      <div class="tile"><div class="label">Cash on delivery</div><div class="value">${codShare}%</div><div class="sub">${s.cod_orders} of ${s.confirmed} confirmed</div></div>
      <div class="tile"><div class="label">Cancelled / returned</div><div class="value">${s.cancelled}</div><div class="sub">${s.placed ? Math.round((s.cancelled / s.placed) * 100) : 0}% of placed</div></div>
    </div>
    <div class="panel"><h2>Order pipeline</h2>
      <div class="pipeline">${STATUSES.slice(0, 7).map(([id, l]) => `<a href="#/orders?status=${id}"><b>${by[id] || 0}</b><span>${l}</span></a>`).join("")}</div>
    </div>
    <div class="grid-2">
      <div class="panel"><h2>Revenue by day <small>confirmed orders, ₹</small></h2><div class="chart" id="chart"></div></div>
      <div class="panel"><h2>Top products</h2>${s.top_products.length ? `<ul class="list-plain">${s.top_products.map((t) => `<li><span>${esc(t.name)}</span><span><b>${t.qty}</b> sold · ${money(t.revenue)}</span></li>`).join("")}</ul>` : '<p class="muted-note">No confirmed orders in this period yet.</p>'}</div>
    </div>
    <div class="grid-2">
      <div class="panel"><h2>Recent orders</h2>${recent.length ? `<ul class="list-plain">${recent.map((o) => `<li><a href="#/orders/${encodeURIComponent(o.id)}"><b>${esc(o.id)}</b> · ${esc(o.customer_name || "(details to collect)")}</a><span>${money(o.total)} ${pill(o.status)}</span></li>`).join("")}</ul>` : '<p class="muted-note">No orders yet. They appear here as soon as someone checks out.</p>'}</div>
      <div class="panel"><h2>Low stock <small>2 or fewer left</small></h2>${low.length ? `<ul class="list-plain">${low.map((r) => `<li><a href="#/products/${encodeURIComponent(r.product_id)}">${esc(productNames[r.product_id] || r.product_id)} · ${esc(r.colour_key)} · ${esc(r.size)}</a><span class="${r.qty <= 0 ? "warn" : ""}">${r.qty <= 0 ? "Sold out" : r.qty + " left"}</span></li>`).join("")}</ul>` : '<p class="muted-note">Nothing running low (only sizes with stock tracking are checked).</p>'}</div>
    </div>`;
  $("#period").addEventListener("change", (e) => { sessionStorage.setItem("dash.period", e.target.value); route(); });
  drawRevenueChart($("#chart"), s.daily, period === "all" ? null : from, to);
}

// Single-series column chart: one hue, 4px rounded tops, hairline grid, hover tooltip, table view.
function drawRevenueChart(el, daily, from, to) {
  const byDay = Object.fromEntries(daily.map((d) => [d.day, d]));
  const days = [];
  const start = from ? new Date(from) : daily.length ? new Date(daily[0].day + "T00:00:00+05:30") : new Date();
  for (let t = new Date(start); t <= to && days.length < 400; t = new Date(t.getTime() + 86400e3)) {
    const key = new Date(t.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
    if (!days.length || days[days.length - 1].day !== key) days.push(byDay[key] || { day: key, orders: 0, revenue: 0 });
  }
  if (!daily.length) { el.innerHTML = '<p class="muted-note">No orders in this period yet.</p>'; return; }
  const W = Math.max(el.clientWidth, 280), H = 220, padL = 52, padB = 26, padT = 10;
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / step) * step;
  const band = (W - padL) / days.length;
  const bw = Math.max(2, Math.min(24, band - 2));
  const y = (v) => padT + (H - padT - padB) * (1 - v / niceMax);
  const ticks = [0, niceMax / 2, niceMax];
  const labelIdx = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];
  const bars = days.map((d, i) => {
    const x = padL + i * band + (band - bw) / 2;
    const top = y(d.revenue), base = y(0), h = base - top;
    const r = Math.min(4, bw / 2, h);
    const path = h <= 0 ? "" : `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${base} Z`;
    return `<rect class="hit" x="${padL + i * band}" y="${padT}" width="${band}" height="${H - padT - padB}" data-i="${i}"></rect><path class="bar" d="${path}" data-bar="${i}"></path>`;
  }).join("");
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue by day">
      ${ticks.map((t) => `<line class="grid-line" x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"></line><text class="axis-text" x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${t >= 1000 ? "₹" + (t / 1000).toLocaleString("en-IN") + "k" : "₹" + t}</text>`).join("")}
      ${bars}
      ${labelIdx.map((i) => `<text class="axis-text" x="${padL + i * band + band / 2}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}">${fmtDay(days[i].day)}</text>`).join("")}
    </svg>
    <div class="chart-tip"></div>
    <details class="chart-table"><summary>Show as table</summary>
      <table class="data" style="margin-top:8px"><thead><tr><th>Day</th><th class="num">Orders</th><th class="num">Revenue</th></tr></thead>
      <tbody>${days.filter((d) => d.orders).map((d) => `<tr><td>${fmtDay(d.day)}</td><td class="num">${d.orders}</td><td class="num">${money(d.revenue)}</td></tr>`).join("")}</tbody></table>
    </details>`;
  const tip = $(".chart-tip", el), svg = $("svg", el);
  svg.addEventListener("pointermove", (e) => {
    const hit = e.target.closest(".hit");
    $$(".bar.hover", el).forEach((b) => b.classList.remove("hover"));
    if (!hit) { tip.classList.remove("show"); return; }
    const d = days[+hit.dataset.i];
    $(`[data-bar="${hit.dataset.i}"]`, el).classList.add("hover");
    const rect = svg.getBoundingClientRect(), scale = rect.width / W;
    tip.innerHTML = `${fmtDay(d.day)} · ${money(d.revenue)} · ${d.orders} order${d.orders === 1 ? "" : "s"}`;
    tip.style.left = `${(padL + (+hit.dataset.i + 0.5) * band) * scale}px`;
    tip.style.top = `${y(d.revenue) * scale}px`;
    tip.classList.add("show");
  });
  svg.addEventListener("pointerleave", () => { tip.classList.remove("show"); $$(".bar.hover", el).forEach((b) => b.classList.remove("hover")); });
}

// ---------------------------------------------------------------- orders
const PAGE = 50;
async function viewOrders(view, params) {
  const state = { status: params.get("status") || "all", pay: "all", search: "", limit: PAGE };
  view.innerHTML = `
    <div class="page-head"><h1>Orders</h1><div class="actions">
      <button class="btn btn-ghost btn-sm" id="export">⬇ Export CSV (Shiprocket)</button>
      <a class="btn btn-primary btn-sm" href="#/orders/new">+ Add order</a></div></div>
    <div class="chips" id="status-chips" style="margin-bottom:12px">${[["all", "All"], ...STATUSES].map(([id, l]) => `<button class="chip" data-status="${id}">${l}</button>`).join("")}</div>
    <div class="toolbar-a">
      <input type="search" id="search" placeholder="Search order ID, name or phone">
      <select id="pay" aria-label="Payment"><option value="all">All payments</option><option value="prepaid">Prepaid</option><option value="cod">Cash on delivery</option></select>
    </div>
    <div id="orders-list"></div>`;

  const build = (sel) => {
    let qy = sb.from("orders").select(sel, { count: "exact" }).order("created_at", { ascending: false });
    if (state.status !== "all") qy = qy.eq("status", state.status);
    if (state.pay !== "all") qy = qy.eq("payment", state.pay);
    const term = state.search.replace(/[%,()*]/g, " ").trim();
    if (term) qy = qy.or(`id.ilike.*${term}*,customer_name.ilike.*${term}*,customer_phone.ilike.*${term}*`);
    return qy;
  };
  const load = async () => {
    $$("[data-status]").forEach((c) => c.classList.toggle("active", c.dataset.status === state.status));
    const { data, count, error } = await build("id,created_at,customer_name,customer_phone,total,payment,status,source,order_items(qty)").range(0, state.limit - 1);
    if (error) return fail(error, "Loading orders");
    $("#orders-list").innerHTML = data.length ? `
      <div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th class="hide-sm">Date</th><th>Customer</th><th class="num hide-sm">Items</th><th class="num">Total</th><th class="hide-sm">Payment</th><th>Status</th></tr></thead>
      <tbody>${data.map((o) => `<tr class="click" data-go="#/orders/${encodeURIComponent(o.id)}">
        <td><b>${esc(o.id)}</b>${o.source === "quick" ? '<br><span class="muted-note">WhatsApp button</span>' : o.source === "admin" ? '<br><span class="muted-note">Added in admin</span>' : ""}</td>
        <td class="hide-sm">${fmtDate(o.created_at)}</td>
        <td>${esc(o.customer_name || "—")}<br><span class="muted-note">${esc(o.customer_phone || "")}</span></td>
        <td class="num hide-sm">${o.order_items.reduce((t, i) => t + i.qty, 0)}</td>
        <td class="num">${money(o.total)}</td>
        <td class="hide-sm">${o.payment === "cod" ? "COD" : "Prepaid"}</td>
        <td>${pill(o.status)}</td></tr>`).join("")}</tbody></table></div>
      <p class="muted-note" style="margin-top:10px">Showing ${data.length} of ${count}</p>
      ${count > data.length ? '<button class="btn btn-ghost btn-sm load-more" id="more">Load more</button>' : ""}`
      : '<div class="panel empty-a">No orders match.</div>';
    $("#more")?.addEventListener("click", () => { state.limit += PAGE; load(); });
  };
  view.addEventListener("click", (e) => {
    const c = e.target.closest("[data-status]");
    if (c) { state.status = c.dataset.status; state.limit = PAGE; history.replaceState(null, "", state.status === "all" ? "#/orders" : `#/orders?status=${state.status}`); load(); }
    const row = e.target.closest("[data-go]");
    if (row) location.hash = row.dataset.go;
  });
  let t;
  $("#search").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.search = e.target.value; state.limit = PAGE; load(); }, 250); });
  $("#pay").addEventListener("change", (e) => { state.pay = e.target.value; load(); });
  $("#export").addEventListener("click", async () => {
    const { data, error } = await build("*, order_items(*)").range(0, 999);
    if (error) return fail(error, "Export");
    exportShiprocketCsv(data);
  });
  await load();
}

// One row per item, in the column order of Shiprocket's bulk order import.
// City/State are included when the customer gave them; Shiprocket can also
// fill them from the pincode. Weight and box size are defaults to adjust.
function exportShiprocketCsv(orders) {
  const cols = ["*Order Id", "*Order Date", "*Channel", "*Payment Method(COD/Prepaid)", "*Customer First Name", "Customer Last Name", "Email (Optional)",
    "*Customer Mobile", "*Shipping Address Line 1", "Shipping Address Line 2", "*Shipping Address Country", "*Shipping Address State",
    "*Shipping Address City", "*Shipping Address Postcode", "Master SKU", "*Product Name", "*Product Quantity", "Tax %",
    "*Selling Price(Per Unit Item, Inclusive of Tax)", "Discount(Per Unit Item)", "Shipping Charges(Per Order)", "COD Charges(Per Order)",
    "*Weight Of Shipment(kg)", "*Length (cm)", "*Breadth (cm)", "*Height (cm)", "Order Status (internal)"];
  const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const rows = [cols.map(cell).join(",")];
  for (const o of orders) {
    const [first, ...rest] = (o.customer_name || "").split(" ");
    o.order_items.forEach((i, n) => {
      rows.push([o.id, new Date(o.created_at).toLocaleDateString("en-CA", IST), { bag: "Website", quick: "WhatsApp", admin: "Manual" }[o.source] || "Website", o.payment === "cod" ? "COD" : "Prepaid",
        first, rest.join(" "), "", String(o.customer_phone || "").replace(/\D/g, "").slice(-10), o.address, "", "India", o.state || "",
        o.city || "", o.pincode, `${i.product_id}-${i.colour_key}-${i.size}`, `${i.name} (${i.colour_label}, ${i.size})`, i.qty, 5,
        i.unit_price, 0, n === 0 ? o.shipping : 0, n === 0 ? o.cod_fee : 0, 0.3, 25, 20, 5, statusLabel(o.status)].map(cell).join(","));
    });
  }
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `orders-${new Date().toLocaleDateString("en-CA", IST)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${orders.length} orders`);
}

function waTemplates(o) {
  const name = (o.customer_name || "").split(" ")[0] || "there";
  const items = o.order_items.map((i) => `• ${i.name} (${i.colour_label}, ${i.size}) × ${i.qty}`).join("\n");
  const S = settings;
  return [
    ["Confirm & send payment link", o.payment === "prepaid",
      `Hi ${name}! Thank you for your order ${o.id} with ${S.name} 💛\n\n${items}\n\nTotal: ${money(o.total)}\n\nPlease complete the payment here: [PASTE PAYMENT LINK]\nWe'll dispatch within ${S.dispatchDays} working days of payment.`],
    ["Confirm COD order", o.payment === "cod",
      `Hi ${name}! Your order ${o.id} with ${S.name} is confirmed ✅\n\n${items}\n\nAmount to pay on delivery: ${money(o.total)}\nDelivering to: ${[o.address, o.city, o.state, o.pincode].filter(Boolean).join(", ")}\n\nWe'll dispatch within ${S.dispatchDays} working days.`],
    ["Ask for delivery details", !o.address,
      `Hi ${name}! Thanks for your order ${o.id} 💛 Please share your full name, delivery address with pincode, and whether you'd like to pay online or cash on delivery.`],
    ["Payment received", o.payment === "prepaid",
      `Hi ${name}, we've received your payment of ${money(o.total)} for order ${o.id}. Thank you! We'll share tracking as soon as it ships.`],
    ["Shipped with tracking", true,
      `Good news, ${name}! Your order ${o.id} is on its way 🚚\n\nCourier: ${o.courier || "[COURIER]"}\nTracking: ${o.tracking || "[TRACKING NUMBER / LINK]"}\n\nExpected delivery in ${S.deliveryDays} working days.`],
    ["Delivered — thank you", true,
      `Hi ${name}, your order ${o.id} has been delivered. We hope your little one loves it! 💛\n\nSize not quite right? You can exchange within ${S.exchangeDays} days — just reply here.`],
  ].filter((t) => t[1]);
}

async function viewOrder(view, id) {
  const o = await q(sb.from("orders").select("*, order_items(*)").eq("id", id).single(), "Loading order");
  const stockRows = o.order_items.length ? await q(sb.from("stock").select("product_id,colour_key,size,qty").in("product_id", [...new Set(o.order_items.map((i) => i.product_id))]), "Loading stock") : [];
  const stockOf = (i) => stockRows.find((s) => s.product_id === i.product_id && s.colour_key === i.colour_key && s.size === i.size);

  view.innerHTML = `
    <p style="margin-bottom:10px"><a class="link-btn" href="#/orders">← All orders</a></p>
    <div class="page-head"><div><h1>${esc(o.id)} ${pill(o.status)}</h1><p class="muted-note">${fmtDate(o.created_at)} · ${esc(SOURCE[o.source] || o.source)}</p></div>
      <div class="actions">${["new", "cancelled"].includes(o.status) ? '<button class="btn btn-danger btn-sm" id="delete">Delete order</button>' : ""}</div></div>
    <div class="order-grid">
      <div>
        <div class="panel"><h2>Items</h2>
          <div class="table-wrap" style="border:0"><table class="data"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead><tbody>
          ${o.order_items.map((i) => { const s = stockOf(i); return `<tr><td>${esc(i.name)}<br><span class="muted-note">${esc(i.colour_label)} · ${esc(i.size)}</span>${s ? `<br><span class="${s.qty < (o.stock_applied ? 0 : i.qty) ? "stock-warn" : "muted-note"}">In stock: ${s.qty}${!o.stock_applied && s.qty < i.qty ? " — not enough to confirm" : ""}</span>` : ""}</td><td class="num">${i.qty}</td><td class="num">${money(i.unit_price)}</td><td class="num">${money(i.qty * i.unit_price)}</td></tr>`; }).join("")}
          <tr><td colspan="3">Subtotal</td><td class="num">${money(o.subtotal)}</td></tr>
          <tr><td colspan="3">Shipping</td><td class="num">${o.shipping ? money(o.shipping) : "Free"}</td></tr>
          ${o.cod_fee ? `<tr><td colspan="3">COD fee</td><td class="num">${money(o.cod_fee)}</td></tr>` : ""}
          <tr><td colspan="3"><b>Total</b></td><td class="num"><b>${money(o.total)}</b></td></tr></tbody></table></div>
        </div>
        <form class="panel" id="order-form"><h2>Customer & delivery</h2>
          <div class="form-grid">
            <div class="field"><label>Name</label><input name="customer_name" value="${esc(o.customer_name)}"></div>
            <div class="field"><label>Phone</label><input name="customer_phone" value="${esc(o.customer_phone)}" inputmode="tel"></div>
            <div class="field full"><label>Address</label><textarea name="address">${esc(o.address)}</textarea></div>
            <div class="field"><label>City</label><input name="city" value="${esc(o.city || "")}"></div>
            <div class="field"><label>State</label><input name="state" value="${esc(o.state || "")}"></div>
            <div class="field"><label>Pincode</label><input name="pincode" value="${esc(o.pincode)}" inputmode="numeric"></div>
            <div class="field"><label>Payment</label><select name="payment"><option value="prepaid" ${o.payment === "prepaid" ? "selected" : ""}>Prepaid</option><option value="cod" ${o.payment === "cod" ? "selected" : ""}>Cash on delivery</option></select></div>
            <div class="field full"><label>Customer note</label><input name="note" value="${esc(o.note)}"></div>
            <div class="field"><label>Courier</label><input name="courier" value="${esc(o.courier)}" placeholder="e.g. Delhivery"></div>
            <div class="field"><label>Tracking number / link</label><input name="tracking" value="${esc(o.tracking)}"></div>
            <div class="field full"><label>Internal notes (not shown to the customer)</label><textarea name="admin_notes">${esc(o.admin_notes)}</textarea></div>
          </div>
          <button class="btn btn-primary btn-sm" type="submit">Save changes</button>
        </form>
      </div>
      <div>
        <div class="panel"><h2>Status</h2>
          <div class="status-steps">${STATUSES.map(([sid, l]) => `<button type="button" data-set-status="${sid}" class="${sid === o.status ? "current" : ""}">${l}</button>`).join("")}</div>
          <p class="muted-note">Moving to <b>Confirmed</b> (or later) takes the items out of stock. <b>Cancelled</b> or <b>Returned</b> puts them back.</p>
        </div>
        <div class="panel"><h2>Message the customer</h2>
          ${o.customer_phone ? `<div class="wa-actions">${waTemplates(o).map(([label, , text]) => `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(waLink(o.customer_phone, text))}">💬 ${esc(label)}</a>`).join("")}</div><p class="muted-note" style="margin-top:10px">Opens WhatsApp with the message ready; check it before sending.</p>` : '<p class="muted-note">No phone number yet. This order came from the “Order on WhatsApp” button, so find the chat in WhatsApp using the order ID, then add the customer\'s details here.</p>'}
        </div>
        <div class="panel"><h2>History</h2>
          <ul class="timeline"><li>${fmtDate(o.created_at)} · Order placed</li>${(o.history || []).map((h) => `<li>${fmtDate(h.at)} · ${esc(statusLabel(h.from))} → <b>${esc(statusLabel(h.to))}</b>${h.by && h.by !== "system" ? ` · ${esc(h.by)}` : ""}</li>`).join("")}</ul>
        </div>
      </div>
    </div>`;

  $("#order-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    await q(sb.from("orders").update(d).eq("id", id), "Saving");
    toast("Saved");
    route();
  });
  $$("[data-set-status]").forEach((b) => b.addEventListener("click", async () => {
    const to = b.dataset.setStatus;
    if (to === o.status) return;
    if (["cancelled", "returned"].includes(to) && !confirm(`Mark ${o.id} as ${statusLabel(to)}?${o.stock_applied ? " Its items will go back into stock." : ""}`)) return;
    await q(sb.from("orders").update({ status: to }).eq("id", id), "Updating status");
    toast(`Marked ${statusLabel(to)}`);
    refreshNewCount();
    route();
  }));
  $("#delete")?.addEventListener("click", async () => {
    if (!confirm(`Delete order ${o.id} permanently? Use this only for test or spam orders.`)) return;
    await q(sb.from("orders").delete().eq("id", id), "Deleting");
    toast("Order deleted");
    refreshNewCount();
    location.hash = "#/orders";
  });
}

// Manual order for sales that came in by phone, Instagram or in person.
async function viewNewOrder(view) {
  const products = await q(sb.from("products").select("id,name,price,status,product_colours(colour_key,label,sort)").order("sort"), "Loading products");
  const lines = [];
  view.innerHTML = `
    <p style="margin-bottom:10px"><a class="link-btn" href="#/orders">← All orders</a></p>
    <div class="page-head"><h1>Add order</h1></div>
    <p class="muted-note" style="margin:-10px 0 18px">For sales that came in by phone, Instagram or in person, so they count in your numbers.</p>
    <form id="new-order">
      <div class="panel"><h2>Items</h2>
        <div id="lines"></div>
        <div class="line-add">
          <div class="field"><label>Product</label><select id="l-prod">${products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.status === "hidden" ? " (hidden)" : ""}</option>`).join("")}</select></div>
          <div class="field"><label>Colour</label><select id="l-col"></select></div>
          <div class="field"><label>Size</label><select id="l-size">${settings.sizes.map((s) => `<option>${esc(s)}</option>`).join("")}</select></div>
          <div class="field"><label>Qty</label><input id="l-qty" type="number" min="1" value="1"></div>
          <div class="field"><button class="btn btn-ghost btn-sm" type="button" id="l-add">Add</button></div>
        </div>
      </div>
      <div class="panel"><h2>Customer</h2><div class="form-grid">
        <div class="field"><label>Name</label><input name="customer_name" required></div>
        <div class="field"><label>Phone</label><input name="customer_phone" inputmode="tel"></div>
        <div class="field full"><label>Address</label><textarea name="address"></textarea></div>
        <div class="field"><label>City</label><input name="city"></div>
        <div class="field"><label>State</label><input name="state"></div>
        <div class="field"><label>Pincode</label><input name="pincode" inputmode="numeric"></div>
        <div class="field"><label>Payment</label><select name="payment"><option value="prepaid">Prepaid</option><option value="cod">Cash on delivery</option></select></div>
        <div class="field"><label>Shipping charged (₹)</label><input name="shipping" type="number" min="0" id="ship"></div>
        <div class="field"><label>COD fee charged (₹)</label><input name="cod_fee" type="number" min="0" value="0"></div>
        <div class="field full"><label>Internal notes</label><input name="admin_notes"></div>
      </div></div>
      <div class="save-bar"><span class="muted-note" id="new-total" style="margin-right:auto;align-self:center"></span><button class="btn btn-primary" type="submit">Create order</button></div>
    </form>`;
  const colSel = () => { const p = products.find((x) => x.id === $("#l-prod").value); $("#l-col").innerHTML = (p?.product_colours || []).sort((a, b) => a.sort - b.sort).map((c) => `<option value="${esc(c.colour_key)}">${esc(c.label)}</option>`).join(""); };
  const sub = () => lines.reduce((t, l) => t + l.unit_price * l.qty, 0);
  const drawLines = () => {
    $("#lines").innerHTML = lines.length ? `<ul class="list-plain" style="margin-bottom:12px">${lines.map((l, i) => `<li><span>${esc(l.name)} · ${esc(l.colour_label)} · ${esc(l.size)} × ${l.qty}</span><span>${money(l.unit_price * l.qty)} <button type="button" class="link-btn" data-rm="${i}">remove</button></span></li>`).join("")}</ul>` : '<p class="muted-note" style="margin-bottom:12px">No items yet.</p>';
    const s = sub();
    $("#ship").value = !s || s >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    $("#new-total").textContent = `Subtotal ${money(s)}`;
  };
  $("#l-prod").addEventListener("change", colSel);
  $("#l-add").addEventListener("click", () => {
    const p = products.find((x) => x.id === $("#l-prod").value);
    const c = p.product_colours.find((x) => x.colour_key === $("#l-col").value);
    if (!c) return toast("This product has no colours yet", true);
    lines.push({ product_id: p.id, colour_key: c.colour_key, name: p.name, colour_label: c.label, size: $("#l-size").value, qty: Math.max(1, +$("#l-qty").value || 1), unit_price: p.price });
    drawLines();
  });
  $("#lines").addEventListener("click", (e) => { const b = e.target.closest("[data-rm]"); if (b) { lines.splice(+b.dataset.rm, 1); drawLines(); } });
  colSel(); drawLines();
  $("#new-order").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lines.length) return toast("Add at least one item", true);
    const d = Object.fromEntries(new FormData(e.target));
    const shipping = Math.max(0, +d.shipping || 0), cod_fee = Math.max(0, +d.cod_fee || 0), subtotal = sub();
    const id = orderId();
    await q(sb.from("orders").insert({ ...d, id, source: "admin", shipping, cod_fee, subtotal, total: subtotal + shipping + cod_fee }), "Creating order");
    await q(sb.from("order_items").insert(lines.map((l) => ({ ...l, order_id: id }))), "Saving items");
    toast(`Order ${id} created`);
    refreshNewCount();
    location.hash = `#/orders/${encodeURIComponent(id)}`;
  });
}

// ---------------------------------------------------------------- products
async function viewProducts(view) {
  const rows = await q(sb.from("products").select("id,name,category,price,mrp,status,sort,badge,product_colours(colour_key,images,sort,stock(size,qty))").order("sort").order("created_at", { ascending: false }), "Loading products");
  let filter = "", show = "all";
  view.innerHTML = `
    <div class="page-head"><h1>Products</h1><div class="actions"><a class="btn btn-primary btn-sm" href="#/products/new">+ Add product</a></div></div>
    <div class="toolbar-a"><input type="search" id="psearch" placeholder="Search products">
      <select id="pshow"><option value="all">All</option><option value="active">Live on shop</option><option value="hidden">Hidden</option><option value="low">Sold out / low stock</option></select></div>
    <div id="plist"></div>
    <p class="muted-note" style="margin-top:12px">Changes appear on the shop within about a minute. Order here = order on the shop (use the arrows).</p>`;
  const catName = (id) => (categories.find((c) => c.id === id) || {}).label || "—";
  const summary = (p) => {
    const all = p.product_colours.flatMap((c) => c.stock);
    if (!all.length) return { text: "Not tracked", low: false };
    const total = all.reduce((t, s) => t + Math.max(0, s.qty), 0);
    const out = all.filter((s) => s.qty <= 0).length;
    return { text: `${total} in stock${out ? ` · ${out} size${out === 1 ? "" : "s"} sold out` : ""}`, low: out > 0 || all.some((s) => s.qty <= 2) };
  };
  const draw = () => {
    const list = rows.filter((p) => (!filter || p.name.toLowerCase().includes(filter) || p.id.includes(filter)) && (show === "all" || (show === "low" ? summary(p).low : p.status === show)));
    $("#plist").innerHTML = list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th></th><th>Product</th><th class="hide-sm">Category</th><th class="num">Price</th><th class="hide-sm">Colours</th><th>Stock</th><th>Live</th><th class="hide-sm">Order</th></tr></thead><tbody>
      ${list.map((p) => { const cols = [...p.product_colours].sort((a, b) => a.sort - b.sort); const im = cols.find((c) => c.images.length)?.images[0]; const s = summary(p); return `<tr class="click" data-go="#/products/${encodeURIComponent(p.id)}">
        <td>${im ? `<img class="thumb-sm" src="${esc(imgUrl(im))}" alt="" loading="lazy">` : '<div class="thumb-sm"></div>'}</td>
        <td><b>${esc(p.name)}</b>${p.badge ? ` <span class="pill">${esc(p.badge)}</span>` : ""}<br><span class="muted-note">${esc(p.id)}</span></td>
        <td class="hide-sm">${esc(catName(p.category))}</td>
        <td class="num">${money(p.price)}${p.mrp && p.mrp > p.price ? `<br><s class="muted-note">${money(p.mrp)}</s>` : ""}</td>
        <td class="hide-sm">${cols.length}</td>
        <td class="${s.low ? "stock-warn" : ""}">${s.text}</td>
        <td data-stop><label class="switch" title="Show on shop"><input type="checkbox" data-live="${esc(p.id)}" ${p.status === "active" ? "checked" : ""}><span></span></label></td>
        <td data-stop class="hide-sm"><span class="icon-arrows"><button data-move="${esc(p.id)}" data-dir="-1" aria-label="Move up">↑</button><button data-move="${esc(p.id)}" data-dir="1" aria-label="Move down">↓</button></span></td></tr>`; }).join("")}
      </tbody></table></div>` : '<div class="panel empty-a">No products match.</div>';
  };
  view.addEventListener("click", async (e) => {
    if (e.target.closest("[data-stop]")) {
      const mv = e.target.closest("[data-move]");
      if (mv) {
        const i = rows.findIndex((r) => r.id === mv.dataset.move), j = i + +mv.dataset.dir;
        if (j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
        const changed = rows.filter((r, k) => r.sort !== k);
        rows.forEach((r, k) => (r.sort = k));
        draw();
        await Promise.all(changed.map((r) => q(sb.from("products").update({ sort: r.sort }).eq("id", r.id), "Reordering")));
      }
      return;
    }
    const row = e.target.closest("[data-go]");
    if (row) location.hash = row.dataset.go;
  });
  view.addEventListener("change", async (e) => {
    const live = e.target.closest("[data-live]");
    if (!live) return;
    const status = live.checked ? "active" : "hidden";
    await q(sb.from("products").update({ status }).eq("id", live.dataset.live), "Updating");
    rows.find((r) => r.id === live.dataset.live).status = status;
    toast(status === "active" ? "Now live on the shop" : "Hidden from the shop");
  });
  $("#psearch").addEventListener("input", (e) => { filter = e.target.value.toLowerCase().trim(); draw(); });
  $("#pshow").addEventListener("change", (e) => { show = e.target.value; draw(); });
  draw();
}

// Resize an image in the browser to the shop's two sizes (WebP where supported).
async function resize(file, max) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, "image/webp", max > 600 ? 0.8 : 0.74));
  return blob.type === "image/webp" ? blob : new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.85));
}

async function uploadPhoto(file, productId, colourKey) {
  const rand = Math.random().toString(36).slice(2, 8);
  const base = `products/${productId}/${colourKey}-${Date.now().toString(36)}${rand}`;
  const [big, small] = await Promise.all([resize(file, 1200), resize(file, 560)]);
  for (const [suffix, blob] of [["", big], ["-sm", small]]) {
    const { error } = await sb.storage.from("media").upload(`${base}${suffix}.webp`, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
  }
  return `media/${base}`;
}

async function viewProduct(view, id, params) {
  const fromId = params.get("from");
  let state;
  if (id || fromId) {
    const p = await q(sb.from("products").select("*, product_colours(*, stock(size,qty))").eq("id", id || fromId).single(), "Loading product");
    state = {
      id: id ? p.id : "", name: id ? p.name : `${p.name} (copy)`, category: p.category, price: p.price, mrp: p.mrp ?? "", badge: p.badge || "",
      fabric: p.fabric, description: p.description, status: id ? p.status : "hidden", sort: p.sort,
      colours: [...p.product_colours].sort((a, b) => a.sort - b.sort).map((c) => ({
        key: c.colour_key, label: c.label, hex: c.hex, images: [...c.images], locked: !!id,
        stock: Object.fromEntries(c.stock.map((s) => [s.size, s.qty])),
      })),
    };
  } else {
    state = { id: "", name: "", category: categories[0]?.id || null, price: "", mrp: "", badge: "New", fabric: "", description: "", status: "hidden", colours: [] };
  }
  const isNew = !id;
  const originalKeys = isNew ? [] : state.colours.map((c) => c.key);
  let dirty = false;

  const colourCard = (c, ci) => `
    <div class="colour-card" data-ci="${ci}">
      <div class="colour-head">
        <div class="field" style="margin:0"><label>Colour name</label><input data-c="label" value="${esc(c.label)}" placeholder="e.g. Sage green"></div>
        <div class="field" style="margin:0"><label>Code ${c.locked ? "(fixed)" : ""}</label><input data-c="key" value="${esc(c.key)}" ${c.locked ? "disabled" : ""} placeholder="auto"></div>
        <div class="field" style="margin:0"><label>Swatch</label><input type="color" data-c="hex" value="${esc(c.hex || "#e9ddd0")}"></div>
        <button type="button" class="btn btn-danger btn-sm" data-remove-colour="${ci}">Remove</button>
      </div>
      <div class="photos">
        ${c.images.map((im, ii) => `<div class="photo">${ii === 0 ? '<span class="main-tag">Main</span>' : ""}<img src="${esc(imgUrl(im))}" alt=""><div class="ph-actions"><button type="button" data-ph="${ci}|${ii}|-1" aria-label="Move left">←</button><button type="button" data-ph="${ci}|${ii}|x" aria-label="Remove photo">✕</button><button type="button" data-ph="${ci}|${ii}|1" aria-label="Move right">→</button></div></div>`).join("")}
        <label class="upload-tile">+ Add photos<br><span style="font-weight:600">from phone or computer</span><input type="file" accept="image/*" multiple data-upload="${ci}"></label>
      </div>
      <div class="field" style="margin-bottom:6px"><label>Stock by size <span class="muted-note" style="font-weight:600">(leave blank to not track; 0 = sold out)</span></label></div>
      <div class="stock-grid">${settings.sizes.map((s) => { const v = c.stock[s]; return `<label>${esc(s)}<input type="number" min="0" inputmode="numeric" data-stock="${ci}|${esc(s)}" value="${v ?? ""}" class="${v === 0 ? "zero" : ""}"></label>`; }).join("")}</div>
    </div>`;

  const render = () => {
    view.innerHTML = `
      <p style="margin-bottom:10px"><a class="link-btn" href="#/products">← All products</a></p>
      <div class="page-head"><h1>${isNew ? "Add product" : esc(state.name)}</h1><div class="actions">
        ${!isNew ? `<a class="btn btn-ghost btn-sm" href="/product.html?id=${encodeURIComponent(state.id)}" target="_blank">View on shop ↗</a><a class="btn btn-ghost btn-sm" href="#/products/new?from=${encodeURIComponent(state.id)}">Duplicate</a><button class="btn btn-danger btn-sm" id="del">Delete</button>` : ""}</div></div>
      <form id="pform">
        <div class="panel"><h2>Details</h2><div class="form-grid">
          <div class="field full"><label>Name</label><input data-f="name" value="${esc(state.name)}" required></div>
          <div class="field"><label>Link name ${isNew ? "" : "(fixed)"}</label><input data-f="id" value="${esc(state.id)}" ${isNew ? "" : "disabled"} placeholder="made from the name"><div class="hint">Used in the product's web address.</div></div>
          <div class="field"><label>Category</label><select data-f="category">${categories.map((c) => `<option value="${esc(c.id)}" ${c.id === state.category ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></div>
          <div class="field"><label>Selling price (₹)</label><input type="number" min="0" data-f="price" value="${esc(state.price)}" required></div>
          <div class="field"><label>MRP (₹, optional)</label><input type="number" min="0" data-f="mrp" value="${esc(state.mrp)}"><div class="hint">Shown crossed out when higher than the price. Must be a genuine price.</div></div>
          <div class="field"><label>Badge (optional)</label><input data-f="badge" value="${esc(state.badge)}" list="badges" placeholder="New, Bestseller…"><datalist id="badges"><option>New</option><option>Bestseller</option><option>Limited</option></datalist></div>
          <div class="field"><label>Fabric</label><input data-f="fabric" value="${esc(state.fabric)}" placeholder="e.g. 100% cotton"></div>
          <div class="field full"><label>Description</label><textarea data-f="description" rows="4">${esc(state.description)}</textarea></div>
          <label class="check full"><input type="checkbox" data-f="status" ${state.status === "active" ? "checked" : ""}> Live on the shop</label>
        </div></div>
        <div class="panel"><h2>Colours, photos & stock</h2>
          ${state.colours.map(colourCard).join("") || '<p class="muted-note" style="margin-bottom:12px">Add at least one colour with photos. A colour without photos isn\'t shown on the shop.</p>'}
          <button type="button" class="btn btn-ghost btn-sm" id="add-colour">+ Add colour</button>
        </div>
        <div class="save-bar"><a class="btn btn-ghost" href="#/products">Cancel</a><button class="btn btn-primary" type="submit">${isNew ? "Create product" : "Save changes"}</button></div>
      </form>`;
    bind();
  };

  const ensureIds = (ci) => {
    if (!state.id) state.id = slug(state.name);
    const c = state.colours[ci];
    if (c && !c.key) c.key = slug(c.label) || `colour-${ci + 1}`;
    return state.id && c && c.key;
  };

  const bind = () => {
    const form = $("#pform");
    form.addEventListener("input", (e) => {
      dirty = true;
      const f = e.target.dataset.f;
      if (f) {
        state[f] = f === "status" ? (e.target.checked ? "active" : "hidden") : e.target.value;
        if (f === "name" && isNew && !$("[data-f=id]").dataset.touched) { state.id = slug(state.name); $("[data-f=id]").value = state.id; }
        if (f === "id") { e.target.dataset.touched = "1"; state.id = slug(e.target.value); }
      }
      const card = e.target.closest("[data-ci]");
      if (card && e.target.dataset.c) {
        const c = state.colours[+card.dataset.ci];
        c[e.target.dataset.c] = e.target.dataset.c === "key" ? slug(e.target.value) : e.target.value;
        if (e.target.dataset.c === "label" && !c.locked && !c.keyTouched) { c.key = slug(c.label); $("[data-c=key]", card).value = c.key; }
        if (e.target.dataset.c === "key") c.keyTouched = true;
      }
      if (e.target.dataset.stock) {
        const [ci, size] = e.target.dataset.stock.split("|");
        const v = e.target.value.trim();
        state.colours[+ci].stock[size] = v === "" ? undefined : Math.max(0, parseInt(v, 10) || 0);
        e.target.classList.toggle("zero", v === "0");
      }
    });
    form.addEventListener("change", async (e) => {
      const up = e.target.dataset.upload;
      if (up === undefined) return;
      const ci = +up;
      if (!state.name) { toast("Type the product name first", true); e.target.value = ""; return; }
      if (!ensureIds(ci)) { toast("Name this colour first", true); e.target.value = ""; return; }
      const c = state.colours[ci];
      const files = [...e.target.files];
      const tile = e.target.closest(".upload-tile");
      try {
        for (let n = 0; n < files.length; n++) {
          tile.firstChild.textContent = `Uploading ${n + 1}/${files.length}…`;
          c.images.push(await uploadPhoto(files[n], state.id, c.key));
        }
        dirty = true;
        toast(`${files.length} photo${files.length === 1 ? "" : "s"} added — remember to save`);
      } catch (err) { fail(err, "Upload"); }
      render();
    });
    form.addEventListener("click", (e) => {
      const ph = e.target.closest("[data-ph]");
      if (ph) {
        const [ci, ii, op] = ph.dataset.ph.split("|");
        const imgs = state.colours[+ci].images, i = +ii;
        if (op === "x") imgs.splice(i, 1);
        else { const j = i + +op; if (j >= 0 && j < imgs.length) [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; }
        dirty = true; render();
      }
      const rm = e.target.closest("[data-remove-colour]");
      if (rm) {
        const c = state.colours[+rm.dataset.removeColour];
        if (c.images.length && !confirm(`Remove the colour "${c.label || c.key}" and its photos and stock from this product?`)) return;
        state.colours.splice(+rm.dataset.removeColour, 1); dirty = true; render();
      }
    });
    $("#add-colour").addEventListener("click", () => { state.colours.push({ key: "", label: "", hex: "#e9ddd0", images: [], stock: {}, locked: false }); render(); $$(".colour-card").pop()?.querySelector("[data-c=label]")?.focus(); });
    $("#del")?.addEventListener("click", async () => {
      if (!confirm(`Delete "${state.name}" permanently? Past orders keep their details. To take it off the shop temporarily, switch off "Live" instead.`)) return;
      await q(sb.from("products").delete().eq("id", state.id), "Deleting");
      delete productNames[state.id];
      toast("Product deleted");
      location.hash = "#/products";
    });
    form.addEventListener("submit", save);
  };

  const save = async (e) => {
    e.preventDefault();
    state.id = slug(state.id || state.name);
    const price = parseInt(state.price, 10);
    if (!state.name.trim()) return toast("Add a name", true);
    if (!state.id) return toast("Add a link name", true);
    if (!(price >= 0)) return toast("Add a selling price", true);
    const keys = state.colours.map((c) => c.key || slug(c.label));
    if (keys.some((k) => !k)) return toast("Every colour needs a name", true);
    if (new Set(keys).size !== keys.length) return toast("Two colours have the same code", true);
    if (state.status === "active" && !state.colours.some((c) => c.images.length)) return toast("Add photos to at least one colour before making it live", true);
    state.colours.forEach((c, i) => (c.key = keys[i]));

    const btn = $("#pform [type=submit]"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      const row = {
        id: state.id, name: state.name.trim(), category: state.category || null, price,
        mrp: state.mrp === "" || state.mrp == null ? null : parseInt(state.mrp, 10), badge: state.badge.trim() || null,
        fabric: state.fabric.trim(), description: state.description.trim(), status: state.status,
      };
      if (isNew) {
        const { data: exists } = await sb.from("products").select("id").eq("id", row.id);
        if (exists?.length) throw new Error(`A product with the link name "${row.id}" already exists. Change the link name.`);
        const { data: minRow } = await sb.from("products").select("sort").order("sort").limit(1);
        row.sort = (minRow?.[0]?.sort ?? 0) - 1; // new products go first
        await q(sb.from("products").insert(row), "Creating product");
      } else {
        await q(sb.from("products").update(row).eq("id", row.id), "Saving product");
      }
      const removed = originalKeys.filter((k) => !keys.includes(k));
      if (removed.length) await q(sb.from("product_colours").delete().eq("product_id", row.id).in("colour_key", removed), "Removing colours");
      if (state.colours.length) {
        await q(sb.from("product_colours").upsert(state.colours.map((c, i) => ({ product_id: row.id, colour_key: c.key, label: c.label.trim() || c.key, hex: c.hex, sort: i, images: c.images }))), "Saving colours");
      }
      for (const c of state.colours) {
        const tracked = settings.sizes.filter((s) => c.stock[s] !== undefined && c.stock[s] !== "");
        const untracked = settings.sizes.filter((s) => !tracked.includes(s));
        if (tracked.length) await q(sb.from("stock").upsert(tracked.map((s) => ({ product_id: row.id, colour_key: c.key, size: s, qty: c.stock[s] }))), "Saving stock");
        if (untracked.length) await q(sb.from("stock").delete().eq("product_id", row.id).eq("colour_key", c.key).in("size", untracked), "Saving stock");
      }
      productNames[row.id] = row.name;
      dirty = false;
      toast(isNew ? "Product created" : "Saved — live on the shop within a minute");
      if (isNew) location.hash = `#/products/${encodeURIComponent(row.id)}`; else route();
    } catch (err) {
      if (!String(err.message).includes("Supabase")) fail(err, "Couldn't save");
      btn.disabled = false; btn.textContent = isNew ? "Create product" : "Save changes";
    }
  };

  window.onbeforeunload = () => (dirty ? true : undefined);
  window.addEventListener("hashchange", () => { window.onbeforeunload = null; }, { once: true });
  render();
}

// ---------------------------------------------------------------- categories
async function viewCategories(view) {
  const cats = await q(sb.from("categories").select("*").order("sort"), "Loading categories");
  const counts = await q(sb.from("products").select("category"), "Loading");
  const n = (id) => counts.filter((p) => p.category === id).length;
  const draw = () => {
    view.innerHTML = `
      <div class="page-head"><h1>Categories</h1></div>
      <form id="cform"><div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Short description</th><th class="num">Products</th><th>Order</th><th></th></tr></thead><tbody>
        ${cats.map((c, i) => `<tr><td><input data-k="label" data-i="${i}" value="${esc(c.label)}" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px"><br><span class="muted-note">${esc(c.id)}</span></td>
          <td><input data-k="blurb" data-i="${i}" value="${esc(c.blurb)}" style="width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px"></td>
          <td class="num">${c.id ? n(c.id) : 0}</td>
          <td><span class="icon-arrows"><button type="button" data-cm="${i}|-1">↑</button><button type="button" data-cm="${i}|1">↓</button></span></td>
          <td><button type="button" class="link-btn" data-cdel="${i}">Delete</button></td></tr>`).join("")}
      </tbody></table></div>
      <div class="save-bar"><button type="button" class="btn btn-ghost" id="cadd">+ Add category</button><button class="btn btn-primary" type="submit">Save categories</button></div></form>
      <p class="muted-note">Categories appear as filters on the shop and as tiles on the home page (using the first product's photo).</p>`;
  };
  draw();
  view.addEventListener("input", (e) => { const i = e.target.dataset.i; if (i !== undefined) cats[+i][e.target.dataset.k] = e.target.value; });
  view.addEventListener("click", async (e) => {
    const mv = e.target.closest("[data-cm]");
    if (mv) { const [i, d] = mv.dataset.cm.split("|").map(Number); const j = i + d; if (j >= 0 && j < cats.length) { [cats[i], cats[j]] = [cats[j], cats[i]]; draw(); } }
    if (e.target.closest("#cadd")) { cats.push({ id: "", label: "", blurb: "", sort: cats.length }); draw(); }
    const del = e.target.closest("[data-cdel]");
    if (del) {
      const c = cats[+del.dataset.cdel];
      if (c.id && n(c.id) && !confirm(`${n(c.id)} products are in "${c.label}". They'll have no category until you move them. Delete anyway?`)) return;
      if (c.id) await q(sb.from("categories").delete().eq("id", c.id), "Deleting");
      cats.splice(+del.dataset.cdel, 1); draw();
    }
  });
  view.addEventListener("submit", async (e) => {
    e.preventDefault();
    cats.forEach((c, i) => { c.sort = i; if (!c.id) c.id = slug(c.label); });
    if (cats.some((c) => !c.label.trim() || !c.id)) return toast("Every category needs a name", true);
    await q(sb.from("categories").upsert(cats.map(({ id, label, blurb, sort }) => ({ id, label: label.trim(), blurb: blurb.trim(), sort }))), "Saving categories");
    categories = cats.map((c) => ({ ...c }));
    toast("Categories saved");
    route();
  });
}

// ---------------------------------------------------------------- settings
const SETTING_GROUPS = [
  ["Brand", [["name", "Brand name"], ["tagline", "Tagline"]]],
  ["Contact", [["whatsapp", "WhatsApp number for orders", "Digits only, with country code, e.g. 918076449307"], ["phoneDisplay", "Phone shown on the site"], ["email", "Support email"], ["instagram", "Instagram link", "Leave empty to hide the link"], ["supportHours", "Support hours"]]],
  ["Business details", [["legalName", "Registered business name", "Shown on Contact, Terms and Privacy pages"], ["address", "Registered address"], ["grievanceOfficer", "Grievance officer name", "Required by the e-commerce rules"], ["gstin", "GSTIN (optional)"]]],
  ["Shipping & payment", [["freeShippingAbove", "Free shipping from (₹)", "", "number"], ["shippingFee", "Shipping fee below that (₹)", "", "number"], ["dispatchDays", "Dispatch time (working days)"], ["deliveryDays", "Delivery time after dispatch (working days)"], ["cod.enabled", "Offer cash on delivery", "", "checkbox"], ["cod.fee", "COD fee (₹)", "", "number"], ["cod.minOrder", "Minimum order for COD (₹)", "", "number"]]],
  ["Returns", [["exchangeDays", "Size exchange window (days)", "", "number"], ["damageReportHours", "Report damage within (hours)", "", "number"], ["refundDays", "Refund processing (working days)"]]],
];
const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setPath = (o, p, v) => { const ks = p.split("."); const last = ks.pop(); ks.reduce((a, k) => (a[k] = a[k] || {}), o)[last] = v; };

async function viewSettings(view) {
  const draft = JSON.parse(JSON.stringify(settings));
  view.innerHTML = `
    <div class="page-head"><h1>Settings</h1></div>
    <form id="sform">
      ${SETTING_GROUPS.map(([title, fields]) => `<div class="panel"><h2>${title}</h2><div class="form-grid">${fields.map(([key, label, hint, type]) => type === "checkbox"
        ? `<label class="check full"><input type="checkbox" data-s="${key}" ${getPath(draft, key) ? "checked" : ""}> ${label}</label>`
        : `<div class="field"><label>${label}</label><input data-s="${key}" type="${type || "text"}" value="${esc(getPath(draft, key) ?? "")}">${hint ? `<div class="hint">${hint}</div>` : ""}</div>`).join("")}</div></div>`).join("")}
      <div class="panel"><h2>Sizes</h2><div class="field"><label>Sizes offered, in order (comma separated)</label><input data-sizes value="${esc(draft.sizes.join(", "))}"><div class="hint">Renaming a size resets its stock numbers — set stock again afterwards.</div></div></div>
      <div class="save-bar"><span class="muted-note" style="margin-right:auto;align-self:center">Shop, checkout and policy pages update within about a minute. The brand name in link previews needs a code update.</span><button class="btn btn-primary" type="submit">Save settings</button></div>
    </form>`;
  $("#sform").addEventListener("submit", async (e) => {
    e.preventDefault();
    $$("[data-s]").forEach((el) => setPath(draft, el.dataset.s, el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value || 0) : el.value.trim()));
    draft.sizes = $("[data-sizes]").value.split(",").map((s) => s.trim()).filter(Boolean);
    draft.whatsapp = String(draft.whatsapp).replace(/\D/g, "");
    if (!draft.name) return toast("Brand name can't be empty", true);
    if (!draft.sizes.length) return toast("Add at least one size", true);
    await q(sb.from("settings").update({ data: draft }).eq("id", 1), "Saving settings");
    settings = draft;
    toast("Settings saved");
  });
}

// ---------------------------------------------------------------- team
async function viewTeam(view) {
  const teamList = (team) => team.map((a) => `<li><span><b>${esc(a.email)}</b>${a.user_id === session.user.id ? " (you)" : ""}<br><span class="muted-note">Added ${fmtDate(a.created_at)}</span></span><span>${a.user_id === session.user.id ? "" : `<button class="link-btn" data-reset="${esc(a.email)}">Password-reset link</button> · <button class="link-btn" data-remove="${esc(a.user_id)}" data-email="${esc(a.email)}">Remove</button>`}</span></li>`).join("");
  const refreshTeam = async () => { $("#team-list").innerHTML = teamList(await q(sb.from("admins").select("*").order("created_at"), "Loading team")); };
  view.innerHTML = `
    <div class="page-head"><h1>Team</h1></div>
    <div class="panel"><h2>People with admin access</h2>
      <ul class="list-plain" id="team-list"></ul>
    </div>
    <form class="panel" id="invite"><h2>Add someone</h2>
      <p class="muted-note" style="margin-bottom:12px">You'll get a one-time link to send them (for example on WhatsApp). They open it and choose a password. Everyone on the team has full access.</p>
      <div class="toolbar-a" style="margin:0"><input type="email" id="inv-email" placeholder="name@example.com" required style="flex:1;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;font:inherit"><button class="btn btn-primary btn-sm" type="submit">Create invite link</button></div>
    </form>
    <div id="link-box"></div>`;
  const getLink = async (email, mode) => {
    const r = await fetch("/api/admin-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email, mode, redirectTo: location.origin + "/admin/" }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    const text = `Hi! Here's your link to the ${settings.name} admin. Open it to ${d.kind === "invite" ? "set your password" : "choose a new password"} (works once, within 24 hours):\n${d.link}`;
    $("#link-box").innerHTML = `<div class="panel"><h2>Link for ${esc(d.email)}</h2>
      <p class="muted-note" style="margin-bottom:10px">Send this privately — anyone with the link can get into the admin. It works once, within 24 hours.</p>
      <div class="field"><input readonly value="${esc(d.link)}" id="the-link"></div>
      <div class="toolbar-a"><button class="btn btn-primary btn-sm" id="copy-link">Copy link</button><a class="btn btn-whatsapp btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">Send on WhatsApp</a></div></div>`;
    $("#copy-link").addEventListener("click", async () => { try { await navigator.clipboard.writeText(d.link); toast("Link copied"); } catch { $("#the-link").select(); } });
    return d;
  };
  $("#invite").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#invite [type=submit]"); btn.disabled = true;
    try {
      const d = await getLink($("#inv-email").value.trim(), "invite");
      toast(`${d.email} added — send them the link`);
      $("#inv-email").value = "";
      await refreshTeam();
    } catch (err) { fail(err, "Invite"); }
    btn.disabled = false;
  });
  view.addEventListener("click", async (e) => {
    const rs = e.target.closest("[data-reset]");
    if (rs) { try { await getLink(rs.dataset.reset, "reset"); } catch (err) { fail(err, "Reset link"); } return; }
    const b = e.target.closest("[data-remove]");
    if (!b || !confirm(`Remove ${b.dataset.email} from the admin team?`)) return;
    await q(sb.from("admins").delete().eq("user_id", b.dataset.remove), "Removing");
    toast("Removed");
    refreshTeam();
  });
  await refreshTeam();
}

boot();
