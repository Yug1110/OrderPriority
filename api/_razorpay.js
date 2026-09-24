// Razorpay helpers. Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
// RAZORPAY_API overrides the API base (used by local tests with a mock server).
const crypto = require("crypto");

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const API = (process.env.RAZORPAY_API || "https://api.razorpay.com").replace(/\/$/, "");

const enabled = () => Boolean(KEY_ID && KEY_SECRET);

async function createOrder({ amountPaise, receipt, notes }) {
  const r = await fetch(`${API}/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64") },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Razorpay order failed: ${r.status} ${JSON.stringify(data.error || data)}`);
  return data;
}

const hmac = (secret, text) => crypto.createHmac("sha256", secret).update(text).digest("hex");
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Signature returned to the browser after a successful Checkout payment.
const verifyPayment = (orderId, paymentId, signature) => enabled() && safeEqual(hmac(KEY_SECRET, `${orderId}|${paymentId}`), signature);
// Signature on webhook calls (over the raw request body).
const verifyWebhook = (rawBody, signature) => Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) && safeEqual(hmac(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

async function fetchPayment(paymentId) {
  const r = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64") },
  });
  if (!r.ok) throw new Error(`Razorpay payment lookup failed: ${r.status}`);
  return r.json();
}

module.exports = { KEY_ID, enabled, createOrder, verifyPayment, verifyWebhook, fetchPayment, hmac };
