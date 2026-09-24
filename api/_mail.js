// Order emails over SMTP (Gmail App Password now; any SMTP later, e.g. Resend).
// Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM (optional), SITE_URL.
// If SMTP isn't configured, emails are skipped (and logged as skipped).
const { db } = require("./_lib");

let transport;
function mailer() {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  const nodemailer = require("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
}

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const siteUrl = () => (process.env.SITE_URL || "https://order-priority.vercel.app").replace(/\/$/, "");

const KINDS = {
  placed: {
    subject: (o, S) => `Order ${o.id} received — ${S.name}`,
    title: "Thank you for your order!",
    intro: (o, S) => o.payment === "cod"
      ? `We've received your order and will confirm it shortly. Please keep ${money(o.total)} ready for cash on delivery.`
      : `We've received your order. We'll send you a secure payment link on WhatsApp to confirm it.`,
  },
  paid: {
    subject: (o, S) => `Payment received for order ${o.id} — ${S.name}`,
    title: "Payment received — your order is confirmed",
    intro: (o, S) => `We've received your payment of ${money(o.total)}. We'll pack your order and dispatch it within ${S.dispatchDays} working days.`,
  },
  confirmed: {
    subject: (o, S) => `Order ${o.id} confirmed — ${S.name}`,
    title: "Your order is confirmed",
    intro: (o, S) => `Good news! Your order is confirmed and will be dispatched within ${S.dispatchDays} working days.`,
  },
  shipped: {
    subject: (o, S) => `Your order ${o.id} is on its way 🚚`,
    title: "Your order has shipped",
    intro: (o, S) => `Your parcel is on its way${o.courier ? ` with ${o.courier}` : ""}. It usually arrives in ${S.deliveryDays} working days.`,
  },
  delivered: {
    subject: (o, S) => `Delivered: order ${o.id} — ${S.name}`,
    title: "Your order has been delivered",
    intro: (o, S) => `We hope your little one loves it! 💛 If a size isn't right, you can request an exchange within ${S.exchangeDays} days — just reply to this email or message us on WhatsApp.`,
  },
  cancelled: {
    subject: (o, S) => `Order ${o.id} cancelled — ${S.name}`,
    title: "Your order has been cancelled",
    intro: (o, S) => o.payment_status === "paid"
      ? `Your order has been cancelled. Your refund of ${money(o.total)} will be processed within ${S.refundDays} working days.`
      : `Your order has been cancelled. If this is unexpected, just reply to this email.`,
  },
};

function render(kind, o, items, S) {
  const k = KINDS[kind];
  const track = `${siteUrl()}/track.html?id=${encodeURIComponent(o.id)}`;
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee4d8">${esc(i.name)}<br><span style="color:#7d6656;font-size:13px">${esc(i.colour_label)} · ${esc(i.size)} · Qty ${i.qty}</span></td><td style="padding:8px 0;border-bottom:1px solid #eee4d8;text-align:right;white-space:nowrap">${money(i.unit_price * i.qty)}</td></tr>`).join("");
  const trackingLine = kind === "shipped" && o.tracking
    ? `<p style="margin:0 0 16px;background:#f6eee3;border-radius:12px;padding:12px 14px"><b>Tracking:</b> ${/^https?:\/\//.test(o.tracking) ? `<a href="${esc(o.tracking)}" style="color:#c8795a">${esc(o.tracking)}</a>` : esc(o.tracking)}${o.courier ? ` (${esc(o.courier)})` : ""}</p>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#fbf6ef;font-family:Helvetica,Arial,sans-serif;color:#3d2f25">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px">
    <p style="font-family:Georgia,serif;font-size:26px;color:#5b4636;margin:0 0 18px">${esc(S.name)}</p>
    <div style="background:#fffdf9;border:1px solid #eee4d8;border-radius:18px;padding:24px 22px">
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;color:#5b4636;margin:0 0 10px">${esc(k.title)}</h1>
      <p style="margin:0 0 6px;line-height:1.55">Hi ${esc((o.customer_name || "").split(" ")[0] || "there")},</p>
      <p style="margin:0 0 16px;line-height:1.55">${esc(k.intro(o, S))}</p>
      ${trackingLine}
      <p style="margin:0 0 6px;color:#7d6656;font-size:13px">Order <b style="color:#3d2f25">${esc(o.id)}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
        <tr><td style="padding:6px 0;color:#7d6656">Shipping</td><td style="text-align:right">${o.shipping ? money(o.shipping) : "Free"}</td></tr>
        ${o.cod_fee ? `<tr><td style="padding:6px 0;color:#7d6656">COD fee</td><td style="text-align:right">${money(o.cod_fee)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${money(o.total)}</td></tr>
      </table>
      <p style="margin:18px 0 0"><a href="${track}" style="display:inline-block;background:#5b4636;color:#fbf6ef;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">Track your order</a></p>
      ${o.address ? `<p style="margin:18px 0 0;color:#7d6656;font-size:13px">Delivering to: ${esc([o.address, o.city, o.state, o.pincode].filter(Boolean).join(", "))}</p>` : ""}
    </div>
    <p style="color:#7d6656;font-size:12px;line-height:1.5;margin:16px 4px 0">Questions? Reply to this email or WhatsApp us at ${esc(S.phoneDisplay || S.whatsapp)}. ${esc(S.name)} · ${esc(S.tagline || "")}</p>
  </div></body></html>`;
  const text = `${k.title}\n\nHi ${(o.customer_name || "").split(" ")[0] || "there"},\n${k.intro(o, S)}\n\nOrder ${o.id}\n${items.map((i) => `- ${i.name} (${i.colour_label}, ${i.size}) x${i.qty}: ${money(i.unit_price * i.qty)}`).join("\n")}\nTotal: ${money(o.total)}\n${kind === "shipped" && o.tracking ? `Tracking: ${o.tracking}\n` : ""}\nTrack: ${track}`;
  return { subject: k.subject(o, S), html, text };
}

// Send one kind of email for an order. Skips if there's no email address, SMTP
// isn't configured, or the same automatic email was already sent (unless force).
async function sendOrderEmail(orderId, kind, { settings, force = false } = {}) {
  if (!KINDS[kind]) return { status: "skipped", reason: "no template" };
  const [o] = await db(`orders?id=eq.${encodeURIComponent(orderId)}&select=*,order_items(*)`);
  if (!o) return { status: "skipped", reason: "order not found" };
  if (!o.email) return { status: "skipped", reason: "no email on order" };
  if (!force) {
    const done = await db(`email_log?order_id=eq.${encodeURIComponent(orderId)}&kind=eq.${kind}&status=eq.sent&select=id`);
    if (done.length) return { status: "skipped", reason: "already sent" };
  }
  const t = mailer();
  const log = (status, error) => db("email_log", { method: "POST", prefer: "return=minimal", body: { order_id: o.id, kind, to_email: o.email, status, error } }).catch(() => {});
  if (!t) { await log("skipped", "SMTP not configured"); return { status: "skipped", reason: "SMTP not configured" }; }
  const S = settings || (await require("./_lib").getSettings());
  const { subject, html, text } = render(kind, o, o.order_items, S);
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `${S.name} <${process.env.SMTP_USER}>`,
      replyTo: S.email || undefined,
      to: o.email, subject, html, text,
    });
    await log("sent");
    return { status: "sent" };
  } catch (e) {
    console.error("mail failed", e.message);
    await log("failed", String(e.message).slice(0, 300));
    return { status: "failed", reason: e.message };
  }
}

module.exports = { sendOrderEmail, KINDS };
