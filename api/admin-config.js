// GET /api/admin-config — public connection details for the admin app.
// The anon (publishable) key is safe to expose; row-level security limits it.
const { SUPABASE_URL, send } = require("./_lib");

module.exports = async (req, res) => {
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!SUPABASE_URL || !anonKey) return send(res, 503, { error: "Admin is not configured yet (SUPABASE_URL / SUPABASE_ANON_KEY)" });
  send(res, 200, { supabaseUrl: SUPABASE_URL, anonKey }, { "Cache-Control": "public, max-age=300" });
};
