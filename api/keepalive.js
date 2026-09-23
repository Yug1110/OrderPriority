// GET /api/keepalive — called daily by Vercel Cron (see vercel.json) so the
// free Supabase project never pauses for inactivity.
const { configured, db, send } = require("./_lib");

module.exports = async (req, res) => {
  if (!configured()) return send(res, 503, { ok: false });
  try {
    await db("settings?id=eq.1&select=id");
    send(res, 200, { ok: true, at: new Date().toISOString() }, { "Cache-Control": "no-store" });
  } catch (e) {
    console.error(e);
    send(res, 502, { ok: false });
  }
};
