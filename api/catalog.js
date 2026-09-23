// GET /api/catalog — everything the storefront needs, in one cached response.
const { configured, db, getSettings, send } = require("./_lib");

module.exports = async (req, res) => {
  if (!configured()) return send(res, 503, { error: "Store database is not configured" });
  try {
    const [settings, categories, products, colours, stock] = await Promise.all([
      getSettings(),
      db("categories?select=id,label,blurb&order=sort.asc,label.asc"),
      db("products?select=id,name,category,description,fabric,price,mrp,badge,created_at&status=eq.active&order=sort.asc,created_at.desc"),
      db("product_colours?select=product_id,colour_key,label,hex,images&order=sort.asc"),
      db("stock?select=product_id,colour_key,size,qty"),
    ]);

    const byProduct = {};
    for (const p of products) byProduct[p.id] = { ...p, colours: [], stock: {} };
    for (const c of colours) {
      const p = byProduct[c.product_id];
      if (p && c.images.length) p.colours.push({ key: c.colour_key, label: c.label, hex: c.hex, images: c.images });
    }
    for (const s of stock) {
      const p = byProduct[s.product_id];
      if (!p) continue;
      (p.stock[s.colour_key] = p.stock[s.colour_key] || {})[s.size] = s.qty;
    }

    send(res, 200, {
      settings,
      categories,
      products: Object.values(byProduct).filter((p) => p.colours.length),
    }, {
      // Edge-cache for a minute; serve a stale copy for a day if the database is slow or down.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400, stale-if-error=86400",
    });
  } catch (e) {
    console.error(e);
    send(res, 502, { error: "Could not load the catalogue" });
  }
};
