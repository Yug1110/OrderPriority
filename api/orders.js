// POST /api/orders — save an order from checkout, Buy now or the WhatsApp button.
// Prices, shipping and COD fees are recomputed here from the database, so
// whatever the browser sends for prices is ignored. For online payment a
// Razorpay order is created for the server-computed total.
const { configured, db, auth, getSettings, orderId, send, readBody } = require("./_lib");
const rzp = require("./_razorpay");
const { sendOrderEmail } = require("./_mail");

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  if (!configured()) return send(res, 503, { error: "Store database is not configured" });

  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { error: "Invalid JSON" }); }

  // Honeypot: real shoppers never fill this hidden field.
  if (body.website) return send(res, 200, { ok: true, id: "SPAM" });

  const source = ["quick", "buy_now"].includes(body.source) ? body.source : "bag";
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return send(res, 400, { error: "Your bag is empty" });

  const c = body.customer || {};
  const customer = {
    customer_name: clip(c.name, 100),
    customer_phone: clip(c.phone, 20),
    email: clip(c.email, 120).toLowerCase(),
    address: clip(c.address, 500),
    city: clip(c.city, 80),
    state: clip(c.state, 80),
    pincode: clip(c.pincode, 10),
    note: clip(c.note, 300),
  };
  if (source !== "quick") {
    if (!customer.customer_name || !customer.address || !customer.city || !customer.state) return send(res, 400, { error: "Please add your name and full address" });
    if (!/^[+\d][\d\s-]{6,18}$/.test(customer.customer_phone)) return send(res, 400, { error: "Please add a valid phone number" });
    if (!/^\d{6}$/.test(customer.pincode)) return send(res, 400, { error: "Please add a valid 6-digit pincode" });
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return send(res, 400, { error: "Please check your email address" });
  }

  try {
    // Logged-in shopper (optional): link the order to their account.
    let customer_id = null;
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (token) { try { customer_id = (await auth("user", { token })).id; } catch { /* guest */ } }

    // Tidy up online orders that were never paid.
    db("rpc/expire_unpaid_orders", { method: "POST", body: { p_minutes: 60 } }).catch(() => {});

    const settings = await getSettings();
    const ids = [...new Set(items.map((i) => clip(i.id, 80)))].filter(Boolean);
    const inList = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
    const [products, colours, stock] = await Promise.all([
      db(`products?select=id,name,price,status&id=in.(${inList})`),
      db(`product_colours?select=product_id,colour_key,label&product_id=in.(${inList})`),
      db(`stock?select=product_id,colour_key,size,qty&product_id=in.(${inList})`),
    ]);

    const lines = [];
    for (const raw of items) {
      const p = products.find((x) => x.id === raw.id && x.status === "active");
      const col = colours.find((x) => x.product_id === raw.id && x.colour_key === raw.colour);
      const size = clip(raw.size, 20);
      const qty = Math.max(1, Math.min(20, parseInt(raw.qty, 10) || 1));
      if (!p || !col) return send(res, 409, { error: "An item in your bag is no longer available. Please remove it and try again." });
      if (!settings.sizes.includes(size)) return send(res, 400, { error: `Please choose a size for ${p.name}` });
      const s = stock.find((x) => x.product_id === p.id && x.colour_key === col.colour_key && x.size === size);
      if (s && s.qty < qty) {
        return send(res, 409, {
          error: s.qty > 0 ? `Only ${s.qty} left of ${p.name} (${col.label}, ${size})` : `${p.name} (${col.label}, ${size}) is sold out`,
        });
      }
      lines.push({ product_id: p.id, colour_key: col.colour_key, name: p.name, colour_label: col.label, size, qty, unit_price: p.price });
    }

    const subtotal = lines.reduce((t, l) => t + l.unit_price * l.qty, 0);
    const shipping = subtotal >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    let payment = ["cod", "online"].includes(body.payment) ? body.payment : "prepaid";
    if (payment === "online" && !rzp.enabled()) return send(res, 400, { error: "Online payment isn't available right now. Please choose cash on delivery or WhatsApp." });
    if (payment === "cod" && !(settings.cod.enabled && subtotal >= settings.cod.minOrder)) {
      if (source === "quick") payment = "prepaid";
      else return send(res, 400, { error: "Cash on delivery isn't available for this order" });
    }
    const cod_fee = payment === "cod" && source !== "quick" ? settings.cod.fee : 0;
    const total = subtotal + shipping + cod_fee;

    // Insert, retrying on the (very unlikely) chance of an ID collision.
    let id;
    for (let attempt = 0; attempt < 4; attempt++) {
      id = orderId(settings.name);
      try {
        await db("rpc/create_order", {
          method: "POST",
          body: { p_order: { id, source, ...customer, payment, subtotal, shipping, cod_fee, total, customer_id }, p_items: lines },
        });
        break;
      } catch (e) {
        if (e.status === 409 && attempt < 3) continue; // duplicate ID → try another
        throw e;
      }
    }

    const result = { ok: true, id, subtotal, shipping, cod_fee, total, payment, lines };

    if (payment === "online") {
      const order = await rzp.createOrder({ amountPaise: total * 100, receipt: id, notes: { order_id: id } });
      await db(`orders?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", prefer: "return=minimal", body: { razorpay_order_id: order.id } });
      result.razorpay = {
        key: rzp.KEY_ID, order_id: order.id, amount: order.amount, currency: order.currency,
        name: settings.name, description: `Order ${id}`,
        prefill: { name: customer.customer_name, email: customer.email, contact: customer.customer_phone },
      };
    } else if (customer.email) {
      await sendOrderEmail(id, "placed", { settings }); // online orders get their email once paid
    }

    send(res, 201, result);
  } catch (e) {
    console.error(e);
    send(res, 502, { error: "Could not save the order" });
  }
};
