#!/usr/bin/env node
// Minimal stand-in for the Razorpay API, for local tests only
// (point RAZORPAY_API at http://127.0.0.1:4010).
import http from "node:http";
const orders = new Map(), payments = new Map();
http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  const json = (s, d) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(d)); };
  if (req.method === "POST" && req.url === "/v1/orders") {
    const b = JSON.parse(body || "{}");
    const o = { id: "order_" + Math.random().toString(36).slice(2, 12), entity: "order", amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created" };
    orders.set(o.id, o);
    return json(200, o);
  }
  // Test helper: register a payment for an order (what the real Checkout would do).
  if (req.method === "POST" && req.url === "/test/pay") {
    const b = JSON.parse(body);
    const o = orders.get(b.order_id);
    const p = { id: "pay_" + Math.random().toString(36).slice(2, 12), order_id: b.order_id, amount: b.amount ?? o?.amount, status: "captured" };
    payments.set(p.id, p);
    return json(200, p);
  }
  const m = req.url.match(/^\/v1\/payments\/(.+)$/);
  if (req.method === "GET" && m) return payments.has(m[1]) ? json(200, payments.get(m[1])) : json(404, { error: { description: "not found" } });
  json(404, { error: { description: "unknown" } });
}).listen(4010, "127.0.0.1", () => console.log("mock razorpay on :4010"));
