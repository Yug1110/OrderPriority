// GET /api/keepalive — called daily by Vercel Cron (see vercel.json) so the
// free Supabase project never pauses for inactivity. Also cancels online
// orders whose payment never completed.
const { configured, db, send } = require("./_lib");

module.exports = async (req, res) => {
  if (!configured()) return send(res, 503, { ok: false });
  try {
    await db("settings?id=eq.1&select=id");
    const expired = await db("rpc/expire_unpaid_orders", { method: "POST", body: { p_minutes: 60 } }).catch(() => 0);
    send(res, 200, { ok: true, expired, at: new Date().toISOString() }, { "Cache-Control": "no-store" });
  } catch (e) {
    console.error(e);
    send(res, 502, { ok: false });
  }
};
