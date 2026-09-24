// POST /api/pay-retry { id, phone } — restart payment for an unpaid online order
// (e.g. the shopper closed the payment window). Phone must match the order.
const { configured, db, getSettings, send, readBody } = require("./_lib");
const rzp = require("./_razorpay");
const last10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured() || !rzp.enabled()) return send(res, 503, { error: "Online payment isn't configured" });
  let b;
  try { b = await readBody(req); } catch { return send(res, 400, { error: "Invalid JSON" }); }
  try {
    const [o] = await db(`orders?id=eq.${encodeURIComponent(String(b.id || ""))}&select=id,total,status,payment,payment_status,customer_name,customer_phone,email`);
    if (!o || last10(o.customer_phone) !== last10(b.phone) || !last10(b.phone)) return send(res, 404, { error: "Order not found" });
    if (o.payment_status === "paid") return send(res, 409, { error: "This order is already paid" });
    if (o.payment !== "online" || o.status !== "awaiting_payment") return send(res, 409, { error: "This order can't be paid online any more. Please place it again." });
    const settings = await getSettings();
    const order = await rzp.createOrder({ amountPaise: o.total * 100, receipt: o.id, notes: { order_id: o.id } });
    await db(`orders?id=eq.${encodeURIComponent(o.id)}`, { method: "PATCH", prefer: "return=minimal", body: { razorpay_order_id: order.id, payment_status: "pending" } });
    send(res, 200, {
      ok: true, id: o.id,
      razorpay: { key: rzp.KEY_ID, order_id: order.id, amount: order.amount, currency: order.currency, name: settings.name, description: `Order ${o.id}`, prefill: { name: o.customer_name, email: o.email, contact: o.customer_phone } },
    });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: "Could not start the payment" });
  }
};
