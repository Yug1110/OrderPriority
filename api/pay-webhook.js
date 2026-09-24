// POST /api/pay-webhook — Razorpay webhook (payment.captured, order.paid, payment.failed).
// Makes sure a payment is recorded even if the shopper closed the page.
// Set the webhook in Razorpay → Settings → Webhooks with RAZORPAY_WEBHOOK_SECRET.
const { configured, db, send } = require("./_lib");
const rzp = require("./_razorpay");
const { sendOrderEmail } = require("./_mail");

async function rawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured()) return send(res, 503, { error: "not configured" });
  const raw = await rawBody(req);
  if (!rzp.verifyWebhook(raw, req.headers["x-razorpay-signature"])) return send(res, 400, { error: "bad signature" });
  try {
    const evt = JSON.parse(raw);
    const pay = evt.payload && evt.payload.payment && evt.payload.payment.entity;
    if (!pay) return send(res, 200, { ok: true, ignored: evt.event });
    if (evt.event === "payment.captured" || evt.event === "order.paid") {
      const status = await db("rpc/mark_order_paid", { method: "POST", body: { p_razorpay_order_id: pay.order_id, p_payment_id: pay.id, p_amount_paise: pay.amount } });
      if (status === "paid") {
        const [o] = await db(`orders?razorpay_order_id=eq.${encodeURIComponent(pay.order_id)}&select=id`);
        if (o) await sendOrderEmail(o.id, "paid");
      }
      return send(res, 200, { ok: true, status });
    }
    if (evt.event === "payment.failed") {
      await db(`orders?razorpay_order_id=eq.${encodeURIComponent(pay.order_id)}&payment_status=eq.pending`, { method: "PATCH", prefer: "return=minimal", body: { payment_status: "failed" } });
      return send(res, 200, { ok: true, status: "failed" });
    }
    send(res, 200, { ok: true, ignored: evt.event });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "webhook error" }); // Razorpay retries on non-2xx
  }
};
