// POST /api/order-notify { id, kind?, force? } — email the customer about their
// order's current status (called by the admin after a status change, or
// "Resend email"). Admin login required.
const { configured, db, auth, send, readBody } = require("./_lib");
const { sendOrderEmail, KINDS } = require("./_mail");

const KIND_FOR_STATUS = { new: "placed", confirmed: "confirmed", paid: "paid", shipped: "shipped", delivered: "delivered", cancelled: "cancelled" };

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured()) return send(res, 503, { error: "Not configured" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const me = await auth("user", { token });
    if (!(await db(`admins?select=user_id&user_id=eq.${me.id}`)).length) return send(res, 403, { error: "Admins only" });
    const b = await readBody(req);
    const [o] = await db(`orders?id=eq.${encodeURIComponent(String(b.id || ""))}&select=id,status`);
    if (!o) return send(res, 404, { error: "Order not found" });
    const kind = b.kind && KINDS[b.kind] ? b.kind : KIND_FOR_STATUS[o.status];
    if (!kind) return send(res, 200, { status: "skipped", reason: "no email for this status" });
    send(res, 200, { kind, ...(await sendOrderEmail(o.id, kind, { force: Boolean(b.force) })) });
  } catch (e) {
    console.error(e);
    send(res, e.status === 401 ? 401 : 502, { error: e.status === 401 ? "Please log in again" : "Could not send the email" });
  }
};
