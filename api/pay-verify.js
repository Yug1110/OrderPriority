// POST /api/pay-verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Called by the browser after Razorpay Checkout succeeds. The signature is
// checked with the secret key; the amount is checked against the order total.
const { configured, db, send, readBody } = require("./_lib");
const rzp = require("./_razorpay");
const { sendOrderEmail } = require("./_mail");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured() || !rzp.enabled()) return send(res, 503, { error: "Online payment isn't configured" });
  let b;
  try { b = await readBody(req); } catch { return send(res, 400, { error: "Invalid JSON" }); }
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!oid || !pid || !rzp.verifyPayment(oid, pid, sig)) return send(res, 400, { error: "Payment could not be verified" });
  try {
    let amount = null;
    try { amount = (await rzp.fetchPayment(pid)).amount; } catch (e) { console.warn(e.message); }
    const status = await db("rpc/mark_order_paid", { method: "POST", body: { p_razorpay_order_id: oid, p_payment_id: pid, p_amount_paise: amount } });
    if (status === "not_found") return send(res, 404, { error: "Order not found" });
    if (status === "amount_mismatch") return send(res, 409, { error: "Payment amount doesn't match the order. Please contact us." });
    const [o] = await db(`orders?razorpay_order_id=eq.${encodeURIComponent(oid)}&select=id`);
    if (status === "paid") await sendOrderEmail(o.id, "paid");
    send(res, 200, { ok: true, id: o.id, status });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: "Could not confirm the payment" });
  }
};
