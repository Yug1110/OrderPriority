// POST /api/track { id, phone } — order status for shoppers without logging in.
// The phone number must match the order's phone (last 10 digits).
const { configured, db, send, readBody } = require("./_lib");
const last10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured()) return send(res, 503, { error: "Tracking isn't available right now" });
  let b;
  try { b = await readBody(req); } catch { return send(res, 400, { error: "Invalid JSON" }); }
  const id = String(b.id || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,30}$/.test(id) || last10(b.phone).length !== 10) return send(res, 400, { error: "Enter your order ID and the phone number used for the order" });
  try {
    const [o] = await db(`orders?id=eq.${encodeURIComponent(id)}&select=id,created_at,status,payment,payment_status,customer_name,customer_phone,address,city,state,pincode,subtotal,shipping,cod_fee,total,courier,tracking,history,order_items(product_id,colour_key,name,colour_label,size,qty,unit_price)`);
    if (!o || last10(o.customer_phone) !== last10(b.phone)) return send(res, 404, { error: "We couldn't find an order with that ID and phone number" });
    const { customer_phone, history, ...rest } = o;
    send(res, 200, {
      ...rest,
      phone_hint: "••••••" + last10(customer_phone).slice(-4),
      history: (history || []).map((h) => ({ at: h.at, to: h.to })), // no staff emails
    }, { "Cache-Control": "no-store" });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: "Tracking isn't available right now" });
  }
};
