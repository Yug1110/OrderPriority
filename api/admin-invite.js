// POST /api/admin-invite { email, mode: "invite" | "reset", redirectTo }
// An existing admin adds a teammate (or gets a password-reset link for one).
// Returns a one-time link to send them directly (e.g. on WhatsApp), because
// Supabase's free built-in email only delivers to the project owner's team.
const { configured, db, auth, send, readBody } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured()) return send(res, 503, { error: "Store database is not configured" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return send(res, 401, { error: "Please log in again" });

  try {
    const me = await auth("user", { token });
    const mine = await db(`admins?select=user_id&user_id=eq.${me.id}`);
    if (!mine.length) return send(res, 403, { error: "Only admins can add teammates" });

    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Please enter a valid email" });
    const redirect_to = body.redirectTo && /^https?:\/\//.test(body.redirectTo) ? body.redirectTo : undefined;

    // New person → invite link; existing account (or "reset") → password-reset link.
    let data;
    let kind = body.mode === "reset" ? "recovery" : "invite";
    try {
      data = await auth("admin/generate_link", { method: "POST", body: { type: kind, email, redirect_to } });
    } catch (e) {
      if (kind !== "invite" || e.status !== 422) throw e;
      kind = "recovery";
      data = await auth("admin/generate_link", { method: "POST", body: { type: kind, email, redirect_to } });
    }
    const link = data.action_link || (data.properties && data.properties.action_link);
    const userId = data.id || (data.user && data.user.id);
    if (!link || !userId) throw new Error("Supabase didn't return a link");

    if (body.mode !== "reset") {
      await db("admins", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: { user_id: userId, email, invited_by: me.id },
      });
    }
    send(res, 200, { ok: true, email, link, kind });
  } catch (e) {
    console.error(e);
    send(res, e.status === 401 ? 401 : 502, { error: e.status === 401 ? "Please log in again" : e.message || "Could not create the link" });
  }
};
