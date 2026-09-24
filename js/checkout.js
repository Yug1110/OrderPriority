/* Checkout, order confirmation and order tracking pages.
   Registers page renderers that js/app.js runs once the catalogue is loaded. */
(function () {
  const Pages = (window.WynPages = window.WynPages || {});
  const STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];
  const LAST_KEY = "wyn.lastOrder";
  const DETAILS_KEY = "wyn.checkoutDetails";
  const store = {
    get(k, s = sessionStorage) { try { return JSON.parse(s.getItem(k)); } catch (e) { return null; } },
    set(k, v, s = sessionStorage) { try { s.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------- Razorpay ----------
  let rzpScript;
  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    rzpScript = rzpScript || new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = ok; s.onerror = () => fail(new Error("Couldn't load the payment window. Check your connection and try again."));
      document.head.appendChild(s);
    });
    return rzpScript;
  }

  // Opens Razorpay Checkout for a server-created order. Resolves with
  // { paid: true } after the server verifies the payment, or { paid: false, reason }.
  async function pay(W, rz) {
    await loadRazorpay();
    return new Promise((resolve) => {
      const r = new window.Razorpay({
        key: rz.key, order_id: rz.order_id, amount: rz.amount, currency: rz.currency,
        name: rz.name, description: rz.description, prefill: rz.prefill,
        theme: { color: "#5b4636" },
        handler: async (resp) => {
          try {
            const v = await fetch("api/pay-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) });
            const d = await v.json().catch(() => ({}));
            resolve(v.ok ? { paid: true } : { paid: false, reason: d.error || "We couldn't confirm the payment yet." });
          } catch (e) {
            // The webhook still records the payment; the success page shows the status.
            resolve({ paid: false, reason: "We couldn't confirm the payment yet. If money was deducted, it will show as paid within a few minutes." });
          }
        },
        modal: { ondismiss: () => resolve({ paid: false, reason: "Payment was not completed." }), confirm_close: true },
      });
      r.on("payment.failed", (e) => W.toast((e.error && e.error.description) || "Payment failed. Please try again."));
      r.open();
    });
  }
  window.WynPay = { pay };

  async function retryPayment(W, id, phone) {
    const r = await fetch("api/pay-retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Couldn't start the payment");
    return pay(W, d.razorpay);
  }

  // ---------- Checkout ----------
  Pages.checkout = async (W) => {
    const { S, $, $$, esc, img, money, byId, colourOf, stockOf, toast, ICON } = W;
    const root = $("#checkout");
    const params = new URLSearchParams(location.search);
    const buy = params.get("buy");
    let mode = "bag";
    let lines = W.bag.map((l) => ({ ...l }));
    if (buy) {
      const [id, colour, size, qty] = buy.split("|");
      const p = byId(id);
      if (p && p.colours.some((c) => c.key === colour) && S.sizes.includes(size)) { mode = "buy_now"; lines = [{ id, colour, size, qty: Math.max(1, Math.min(20, +qty || 1)) }]; }
    }
    lines = lines.filter((l) => byId(l.id));
    if (!lines.length) {
      root.innerHTML = `<div class="empty-state"><div class="ic">🧸</div><h1>Your bag is empty</h1><p class="muted">Add something snuggly, then come back to check out.</p><a class="btn btn-primary" href="shop.html">Shop the collection</a></div>`;
      return;
    }

    const online = Boolean(S.onlinePayments) && !W.CATALOG.offline;
    const offline = W.CATALOG.offline;
    const d = store.get(DETAILS_KEY, localStorage) || {};
    let payment = online ? "online" : offline ? "whatsapp" : S.cod.enabled ? "cod" : "whatsapp";
    const codOk = () => S.cod.enabled && W.totalsFor(lines).sub >= S.cod.minOrder;

    const field = (name, label, attrs = "", value = d[name] || "") =>
      `<div class="field"><label for="co-${name}">${label}</label><input id="co-${name}" name="${name}" value="${esc(value)}" ${attrs}></div>`;

    root.innerHTML = `
      <div class="checkout-head"><a class="back-link" href="${mode === "buy_now" ? `product.html?id=${encodeURIComponent(lines[0].id)}` : "shop.html"}">← ${mode === "buy_now" ? "Back to product" : "Continue shopping"}</a><h1>Checkout</h1></div>
      <div class="checkout">
        <form class="checkout-main" id="co-form" novalidate>
          <section class="co-card">
            <div class="co-title"><span class="co-step">1</span><h2>Contact</h2><span id="co-login-slot"></span></div>
            <div class="field-row">${field("name", "Full name", 'required autocomplete="name"')}${field("phone", "Mobile number", 'required type="tel" inputmode="tel" autocomplete="tel" placeholder="10-digit mobile"')}</div>
            ${field("email", "Email <span class='opt'>(for order updates)</span>", 'type="email" autocomplete="email" placeholder="you@example.com"')}
          </section>
          <section class="co-card">
            <div class="co-title"><span class="co-step">2</span><h2>Delivery address</h2></div>
            <div class="field"><label for="co-address">House / flat, street, area</label><textarea id="co-address" name="address" required autocomplete="street-address" rows="2">${esc(d.address || "")}</textarea></div>
            <div class="field-row">${field("city", "City", 'required autocomplete="address-level2"')}${field("pincode", "Pincode", 'required inputmode="numeric" maxlength="6" autocomplete="postal-code"')}</div>
            <div class="field"><label for="co-state">State</label><input id="co-state" name="state" list="co-states" required autocomplete="address-level1" value="${esc(d.state || "")}"><datalist id="co-states">${STATES.map((s) => `<option value="${s}">`).join("")}</datalist></div>
            ${field("note", "Note <span class='opt'>(optional)</span>", 'placeholder="Gift wrap, landmark, delivery time…"', "")}
            <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
          </section>
          <section class="co-card">
            <div class="co-title"><span class="co-step">3</span><h2>Payment</h2></div>
            <div class="pay-list">
              ${online ? `<label class="pay-card"><input type="radio" name="pay" value="online"><span><b>Pay online</b><small>UPI, cards, net banking & wallets · secured by Razorpay</small></span><span class="pay-badges">UPI · VISA · RuPay</span></label>` : ""}
              ${!offline && S.cod.enabled ? `<label class="pay-card" data-cod><input type="radio" name="pay" value="cod"><span><b>Cash on delivery</b><small data-cod-note></small></span></label>` : ""}
              <label class="pay-card"><input type="radio" name="pay" value="whatsapp"><span><b>Order on WhatsApp</b><small>Confirm with us on chat and pay by UPI link</small></span></label>
            </div>
          </section>
          <button class="btn btn-primary btn-block co-place-mobile" id="co-place-2" type="button">Place order</button>
          <p class="muted terms-note">By placing this order you agree to our <a href="terms.html">Terms</a>, <a href="shipping.html">Shipping</a> and <a href="returns.html">Returns</a> policies.</p>
        </form>
        <aside class="checkout-side">
          <div class="co-card summary">
            <h2>Order summary</h2>
            <div id="co-lines"></div>
            <div id="co-totals"></div>
            <button class="btn btn-primary btn-block" id="co-place" type="button">Place order</button>
            <p class="secure-note">🔒 Your details are only used to deliver your order.</p>
          </div>
        </aside>
      </div>`;

    const form = $("#co-form");
    const drawSummary = () => {
      $("#co-lines").innerHTML = lines.map((l, i) => {
        const p = byId(l.id), c = colourOf(p, l.colour);
        return `<div class="co-line"><img src="${img(c.images[0], true)}" alt=""><div><b>${esc(p.name)}</b><span>${esc(c.label)} · ${esc(l.size)}</span>
          <div class="qty sm"><button type="button" data-cq="${i}|-1" aria-label="Decrease">−</button><span>${l.qty}</span><button type="button" data-cq="${i}|1" aria-label="Increase">+</button></div></div>
          <div class="co-line-right">${money(p.price * l.qty)}${lines.length > 1 ? `<button type="button" class="remove" data-crm="${i}">Remove</button>` : ""}</div></div>`;
      }).join("");
      if (payment === "cod" && !codOk()) payment = online ? "online" : "whatsapp";
      $$("input[name=pay]").forEach((r) => (r.checked = r.value === payment));
      const codIn = $("[data-cod] input");
      if (codIn) { codIn.disabled = !codOk(); $("[data-cod-note]").textContent = codOk() ? (S.cod.fee ? `${money(S.cod.fee)} handling fee` : "No extra fee") : `Available on orders of ${money(S.cod.minOrder)} or more`; }
      const t = W.totalsFor(lines, payment);
      $("#co-totals").innerHTML = `
        <div class="sum"><span>Subtotal</span><span>${money(t.sub)}</span></div>
        <div class="sum"><span>Shipping</span><span>${t.ship ? money(t.ship) : "Free"}</span></div>
        ${t.cod ? `<div class="sum"><span>COD fee</span><span>${money(t.cod)}</span></div>` : ""}
        <div class="row"><span>Total</span><span>${money(t.total)}</span></div><small class="muted">Inclusive of all taxes</small>`;
      $("#co-place").innerHTML = payment === "online" ? `🔒 Pay ${money(t.total)}` : payment === "cod" ? `Place order · ${money(t.total)}` : `${ICON.wa} Continue on WhatsApp`;
      $("#co-place").className = `btn btn-block ${payment === "whatsapp" ? "btn-whatsapp" : "btn-primary"}`;
      $("#co-place-2").innerHTML = $("#co-place").innerHTML;
      $("#co-place-2").className = $("#co-place").className + " co-place-mobile";
      if (mode === "bag") W.setBag(lines.map((l) => ({ ...l })));
    };
    root.addEventListener("click", (e) => {
      const q = e.target.closest("[data-cq]");
      if (q) {
        const [i, dlt] = q.dataset.cq.split("|").map(Number); const l = lines[i];
        const left = stockOf(byId(l.id), l.colour, l.size);
        const next = l.qty + dlt;
        if (next < 1) return;
        if (left !== undefined && next > left) return toast(`Only ${left} left in ${l.size}`);
        l.qty = next; drawSummary();
      }
      const rm = e.target.closest("[data-crm]");
      if (rm) { lines.splice(+rm.dataset.crm, 1); drawSummary(); }
    });
    form.addEventListener("change", (e) => { if (e.target.name === "pay") { payment = e.target.value; drawSummary(); } });
    drawSummary();
    if (window.WynAuth && window.WynAuth.checkoutSlot) window.WynAuth.checkoutSlot($("#co-login-slot"), form);

    const bad = (name, msg) => { const el = form.elements[name]; el.classList.add("invalid"); el.focus(); toast(msg); return true; };
    form.addEventListener("input", (e) => e.target.classList.remove("invalid"));
    $("#co-place-2").addEventListener("click", () => $("#co-place").click());
    const invalid = (v) => {
      for (const [k, label] of [["name", "your name"], ["phone", "your mobile number"], ["address", "your address"], ["city", "your city"], ["pincode", "your pincode"], ["state", "your state"]]) if (!v[k]) return bad(k, `Please add ${label}`);
      if (String(v.phone).replace(/\D/g, "").length < 10) return bad("phone", "Please enter a 10-digit mobile number");
      if (!/^\d{6}$/.test(v.pincode)) return bad("pincode", "Please enter a 6-digit pincode");
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return bad("email", "Please check your email address");
      return false;
    };

    $("#co-place").addEventListener("click", async () => {
      const v = Object.fromEntries([...new FormData(form)].map(([k, x]) => [k, String(x).trim()]));
      if (invalid(v)) return;
      store.set(DETAILS_KEY, { name: v.name, phone: v.phone, email: v.email, address: v.address, city: v.city, pincode: v.pincode, state: v.state }, localStorage);
      const btn = $("#co-place");
      const w = payment === "whatsapp" ? W.openPending() : null;
      btn.disabled = true; const label = btn.innerHTML; btn.textContent = payment === "online" ? "Opening secure payment…" : "Placing your order…";
      const payload = {
        source: mode, items: lines.map(({ id, colour, size, qty }) => ({ id, colour, size, qty })),
        customer: { name: v.name, phone: v.phone, email: v.email, address: v.address, city: v.city, state: v.state, pincode: v.pincode, note: v.note },
        payment: payment === "whatsapp" ? "prepaid" : payment, website: v.website,
      };
      const done = () => { btn.disabled = false; btn.innerHTML = label; };
      const saved = await W.saveOrder(payload);
      if (saved && saved.rejected) { if (w) w.close(); W.refreshCatalog(); toast(saved.rejected); return done(); }
      if (!saved && payment !== "whatsapp") { toast("We couldn't place your order right now. Please try again, or choose Order on WhatsApp."); return done(); }

      const t = saved ? { sub: saved.subtotal, ship: saved.shipping, cod: saved.cod_fee, total: saved.total } : W.totalsFor(lines, "prepaid");
      const id = saved ? saved.id : W.localOrderId();
      const items = saved
        ? saved.lines.map((l) => ({ name: l.name, colour: l.colour_label, size: l.size, qty: l.qty, amount: l.unit_price * l.qty, img: img(colourOf(byId(l.product_id), l.colour_key).images[0], true) }))
        : lines.map((l) => { const p = byId(l.id), c = colourOf(p, l.colour); return { name: p.name, colour: c.label, size: l.size, qty: l.qty, amount: p.price * l.qty, img: img(c.images[0], true) }; });
      const order = { id, phone: v.phone, name: v.name, email: v.email, method: payment, totals: t, items, address: [v.address, v.city, v.state].join(", ") + " – " + v.pincode, saved: Boolean(saved), paid: false };

      if (payment === "whatsapp") {
        const msg = [
          `Hi ${S.name}! I'd like to place an order 🛍️`, `Order ID: ${id}`, "",
          ...items.map((l, i) => `${i + 1}. ${l.name}\n   Colour: ${l.colour} · Size: ${l.size} · Qty: ${l.qty} · ${money(l.amount)}`), "",
          `Subtotal: ${money(t.sub)}`, `Shipping: ${t.ship ? money(t.ship) : "Free"}`, `Total: ${money(t.total)}`, `Payment: UPI / payment link`, "",
          `Name: ${v.name}`, `Phone: ${v.phone}`, `Address: ${order.address}`, v.note ? `Note: ${v.note}` : null,
        ].filter((x) => x !== null).join("\n");
        order.whatsappUrl = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}`;
        W.goWhatsApp(w, order.whatsappUrl);
      }
      if (payment === "online") {
        store.set(LAST_KEY, order);
        if (mode === "bag") W.setBag([]);
        let res;
        try { res = await pay(W, saved.razorpay); } catch (e) { res = { paid: false, reason: e.message }; }
        order.paid = res.paid; order.payNote = res.paid ? "" : res.reason;
      }
      store.set(LAST_KEY, order);
      if (mode === "bag") W.setBag([]);
      location.href = `order-success.html?id=${encodeURIComponent(id)}`;
    });
  };

  // ---------- Order confirmation ----------
  Pages.success = async (W) => {
    const { S, $, esc, money, toast, ICON } = W;
    const id = new URLSearchParams(location.search).get("id");
    const o = store.get(LAST_KEY);
    const root = $("#success");
    if (!o || o.id !== id) {
      root.innerHTML = `<div class="empty-state"><div class="ic">📦</div><h1>Thank you!</h1><p class="muted">Your order ${esc(id || "")} is with us. Track it any time with your order ID and phone number.</p><a class="btn btn-primary" href="track.html?id=${encodeURIComponent(id || "")}">Track your order</a></div>`;
      return;
    }
    const heading = {
      online: o.paid ? ["🎉", "Payment received — order confirmed!", `We'll pack your order and dispatch it within ${S.dispatchDays} working days.`]
                     : ["⏳", "Payment not completed", o.payNote || "Your order is saved, but we haven't received the payment yet."],
      cod: ["🎉", "Order placed!", `We'll confirm it with you on WhatsApp shortly. Please keep ${money(o.totals.total)} ready at delivery.`],
      whatsapp: ["💌", "Almost done — send it on WhatsApp", "Your order is ready in WhatsApp. Just press Send there, and we'll confirm it and share a payment link."],
    }[o.method];
    const draw = () => {
      root.innerHTML = `
        <div class="success-card">
          <div class="success-ic">${heading[0]}</div>
          <h1>${esc(heading[1])}</h1>
          <p class="muted">${esc(heading[2])}</p>
          <div class="order-id">Order ID <b>${esc(o.id)}</b> <button class="link-btn" id="copy-id" type="button">Copy</button></div>
          <div class="success-actions">
            ${o.method === "online" && !o.paid ? `<button class="btn btn-primary" id="pay-again">Pay ${money(o.totals.total)} now</button><p class="muted" style="font-size:13px">If money was deducted, it will show as paid within a few minutes — no need to pay again. Check with <a href="track.html?id=${encodeURIComponent(o.id)}">Track order</a>.</p>` : ""}
            ${o.method === "whatsapp" ? `<a class="btn btn-whatsapp" href="${o.whatsappUrl}" target="_blank" rel="noopener">${ICON.wa} Open WhatsApp again</a>` : ""}
            ${o.saved ? `<a class="btn btn-ghost" href="track.html?id=${encodeURIComponent(o.id)}">Track your order</a>` : ""}
            <a class="btn btn-ghost" href="shop.html">Continue shopping</a>
          </div>
          ${o.email && o.saved ? `<p class="muted" style="font-size:14px">We'll email updates to <b>${esc(o.email)}</b>.</p>` : ""}
        </div>
        <div class="co-card summary" style="max-width:560px;margin:24px auto 0">
          <h2>Your order</h2>
          ${o.items.map((l) => `<div class="co-line"><img src="${esc(l.img)}" alt=""><div><b>${esc(l.name)}</b><span>${esc(l.colour)} · ${esc(l.size)} · Qty ${l.qty}</span></div><div class="co-line-right">${money(l.amount)}</div></div>`).join("")}
          <div class="sum"><span>Shipping</span><span>${o.totals.ship ? money(o.totals.ship) : "Free"}</span></div>
          ${o.totals.cod ? `<div class="sum"><span>COD fee</span><span>${money(o.totals.cod)}</span></div>` : ""}
          <div class="row"><span>Total</span><span>${money(o.totals.total)}</span></div>
          <p class="muted" style="font-size:13px;margin-top:10px">Delivering to ${esc(o.name)}, ${esc(o.address)}</p>
        </div>`;
      $("#copy-id").addEventListener("click", async () => { try { await navigator.clipboard.writeText(o.id); toast("Order ID copied"); } catch (e) {} });
      $("#pay-again")?.addEventListener("click", async (e) => {
        e.target.disabled = true;
        try {
          const r = await retryPayment(W, o.id, o.phone);
          if (r.paid) { o.paid = true; store.set(LAST_KEY, o); location.reload(); }
          else toast(r.reason);
        } catch (err) { toast(err.message); }
        e.target.disabled = false;
      });
    };
    draw();
  };

  // ---------- Track order ----------
  const STEPS = [["placed", "Order placed"], ["confirmed", "Confirmed"], ["packed", "Packed"], ["shipped", "Shipped"], ["delivered", "Delivered"]];
  const stepIndex = (s) => ({ awaiting_payment: 0, new: 0, confirmed: 1, paid: 1, packed: 2, shipped: 3, delivered: 4, exchange: 4 }[s] ?? 0);

  Pages.track = async (W) => {
    const { $, esc, money, toast } = W;
    const params = new URLSearchParams(location.search);
    const last = store.get(LAST_KEY) || {};
    const saved = store.get(DETAILS_KEY, localStorage) || {};
    const root = $("#track");
    root.innerHTML = `
      <div class="page-hero"><span class="eyebrow">Where's my order?</span><h1>Track your order</h1><p class="muted">Enter your order ID and the mobile number you used.</p></div>
      <form class="co-card track-form" id="tr-form">
        <div class="field-row">
          <div class="field"><label for="tr-id">Order ID</label><input id="tr-id" name="id" placeholder="e.g. WYN-260924-ABCD" value="${esc(params.get("id") || "")}" required></div>
          <div class="field"><label for="tr-phone">Mobile number</label><input id="tr-phone" name="phone" type="tel" inputmode="tel" value="${esc(last.id && last.id === params.get("id") ? last.phone : saved.phone || "")}" required></div>
        </div>
        <button class="btn btn-primary" type="submit">Track</button>
      </form>
      <div id="tr-result"></div>`;
    const show = (o) => {
      const cancelled = ["cancelled", "returned"].includes(o.status);
      const at = stepIndex(o.status);
      const when = (to) => { const h = [...(o.history || [])].reverse().find((x) => stepIndex(x.to) >= 0 && (x.to === to || (to === "confirmed" && x.to === "paid"))); return h ? new Date(h.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""; };
      const trackLink = /^https?:\/\//.test(o.tracking || "") ? `<a href="${esc(o.tracking)}" target="_blank" rel="noopener">${esc(o.tracking)}</a>` : esc(o.tracking);
      $("#tr-result").innerHTML = `
        <div class="co-card track-card">
          <div class="track-head"><div><span class="muted">Order</span><h2>${esc(o.id)}</h2></div><span class="muted">Placed ${new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
          ${o.status === "awaiting_payment" ? `<div class="notice">⏳ Waiting for payment. <button class="link-btn" id="tr-pay">Pay ${money(o.total)} now</button></div>` : ""}
          ${cancelled ? `<div class="notice">This order was ${o.status === "returned" ? "returned" : "cancelled"}. ${o.payment_status === "paid" ? "Your refund is processed to the original payment method." : ""}</div>` : `
          <ol class="steps">${STEPS.map(([k, label], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}"><span class="dot"></span><b>${label}</b><small>${i === 0 ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : when(k)}</small></li>`).join("")}</ol>`}
          ${o.tracking ? `<p class="tracking-line">🚚 ${esc(o.courier || "Courier")}: ${trackLink}</p>` : ""}
          <div class="track-items">${o.order_items.map((i) => `<div class="sum"><span>${esc(i.name)} · ${esc(i.colour_label)} · ${esc(i.size)} × ${i.qty}</span><span>${money(i.unit_price * i.qty)}</span></div>`).join("")}
            <div class="row"><span>Total</span><span>${money(o.total)}</span></div>
            <p class="muted" style="font-size:13px">${o.payment === "cod" ? "Cash on delivery" : o.payment_status === "paid" ? "Paid online" : o.payment === "online" ? "Online payment pending" : "Pay by UPI link"} · Delivering to ${esc([o.address, o.city, o.state, o.pincode].filter(Boolean).join(", "))}</p>
          </div>
        </div>`;
      $("#tr-pay")?.addEventListener("click", async () => {
        try { const r = await retryPayment(W, o.id, $("#tr-phone").value); if (r.paid) { toast("Payment received — thank you!"); lookup(); } else toast(r.reason); } catch (err) { toast(err.message); }
      });
    };
    const lookup = async () => {
      const id = $("#tr-id").value.trim(), phone = $("#tr-phone").value.trim();
      if (!id || !phone) return toast("Enter your order ID and mobile number");
      $("#tr-result").innerHTML = '<p class="muted">Looking up your order…</p>';
      try {
        const r = await fetch("api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, phone }) });
        const d = await r.json();
        if (!r.ok) { $("#tr-result").innerHTML = `<p class="notice">${esc(d.error || "Order not found")}</p>`; return; }
        show(d);
        history.replaceState(null, "", `track.html?id=${encodeURIComponent(d.id)}`);
      } catch (e) { $("#tr-result").innerHTML = '<p class="notice">Tracking isn\'t available right now. Please try again shortly.</p>'; }
    };
    $("#tr-form").addEventListener("submit", (e) => { e.preventDefault(); lookup(); });
    if ($("#tr-id").value && $("#tr-phone").value) lookup();
  };
})();
