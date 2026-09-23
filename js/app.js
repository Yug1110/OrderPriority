/* Shared storefront logic: catalogue helpers, header/footer, bag drawer,
   WhatsApp checkout, and page renderers (home / shop / product / info). */
(function () {
  const S = window.STORE;
  const IMAGES = window.PRODUCT_IMAGES;
  const COLOURS = window.COLOURS;
  const CATS = window.CATEGORIES;
  const PRODUCTS = window.PRODUCTS.filter((p) => IMAGES[p.id]);

  // ---------- helpers ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const money = (n) => S.currency + n.toLocaleString("en-IN");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || "";
  const imgs = (p, colour) => IMAGES[p.id][colour || p.colours[0]] || Object.values(IMAGES[p.id])[0];
  const img = (base, small) => `${base}${small ? "-sm" : ""}.webp`;
  const offPct = (p) => (p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);

  const ICON = {
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    logo: '<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" fill="#EFE4D6"/><path d="M12.8 19h14.4v2.2c0 5.3-3.3 9.4-7.2 10.9-3.9-1.5-7.2-5.6-7.2-10.9z" fill="#C8795A"/><path d="M11.2 19.4c0-4.1 3.9-7 8.8-7s8.8 2.9 8.8 7z" fill="#5B4636"/><path d="M20 12.6c0-2.1.9-3.6 2.5-4.4" stroke="#5B4636" stroke-width="1.6" stroke-linecap="round"/><path d="M22.4 8.6c2.4-1.7 5.3-1.4 6.6 0-1.7 1.7-4.6 1.9-6.6 0z" fill="#8A9A7B"/></svg>',
  };

  // ---------- bag state (persisted in localStorage) ----------
  const KEY = "bag.v1";
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { bag = []; }
  bag = bag.filter((l) => byId(l.id));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {} renderBag(); };
  const bagTotal = () => bag.reduce((t, l) => t + byId(l.id).price * l.qty, 0);
  const bagCount = () => bag.reduce((t, l) => t + l.qty, 0);

  function addToBag(id, colour, size, qty = 1) {
    const line = bag.find((l) => l.id === id && l.colour === colour && l.size === size);
    if (line) line.qty += qty; else bag.push({ id, colour, size, qty });
    save();
    toast(`Added to bag · ${byId(id).name}`);
    const c = $(".bag-count");
    if (c) { c.animate([{ transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 350 }); }
  }

  // ---------- shared chrome ----------
  function chrome() {
    const page = document.body.dataset.page;
    document.title = document.title.replace("Wynoak", S.name);
    const navLinks = [
      ["shop.html", "Shop all", "shop"],
      ["shop.html?cat=newborn", "Newborn"],
      ["shop.html?cat=winter", "Winter wear"],
      ["index.html#about", "Our story"],
      ["contact.html", "Contact"],
    ];
    const logo = `<a class="logo" href="index.html" aria-label="${esc(S.name)} home">${ICON.logo}<span>${esc(S.name)}</span></a>`;

    document.body.insertAdjacentHTML("afterbegin", `
      <div class="announce">Free shipping on orders of ${money(S.freeShippingAbove)}+ · ${S.cod.enabled ? "Cash on delivery available · " : ""}Order easily on WhatsApp</div>
      <header class="header">
        <div class="wrap">
          <button class="icon-btn menu-btn" aria-label="Open menu" data-open-menu>${ICON.menu}</button>
          ${logo}
          <nav class="nav">${navLinks.map(([h, t, k]) => `<a href="${h}" class="${k && k === page ? "active" : ""}">${t}</a>`).join("")}</nav>
          <div class="header-actions">
            <button class="icon-btn" aria-label="Open bag" data-open-bag>${ICON.bag}<span class="bag-count"></span></button>
          </div>
        </div>
      </header>
      <nav class="mobile-nav" aria-label="Menu">${logo}${navLinks.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>`);

    document.body.insertAdjacentHTML("beforeend", `
      <footer class="footer">
        <div class="wrap">
          <div class="footer-grid">
            <div>${logo}<p class="muted" style="max-width:320px">${esc(S.tagline)} Soft, sturdy clothes for comfort, play and cuddles.</p></div>
            <div><h5>Shop</h5><ul>${CATS.map((c) => `<li><a href="shop.html?cat=${c.id}">${c.label}</a></li>`).join("")}</ul></div>
            <div><h5>Help</h5><ul>
              <li><a href="contact.html">Contact us</a></li>
              <li><a href="shipping.html">Shipping</a></li>
              <li><a href="returns.html">Returns & exchange</a></li>
              <li><a href="size-guide.html">Size guide</a></li>
            </ul></div>
            <div><h5>Say hello</h5><ul>
              <li><a href="https://wa.me/${S.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li>
              <li><a href="mailto:${S.email}">${esc(S.email)}</a></li>
              ${S.instagram ? `<li><a href="${S.instagram}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
            </ul></div>
          </div>
          <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(S.legalName.startsWith("[") ? S.name : S.legalName)}. Made with love for little ones.</span><span class="footer-legal"><a href="terms.html">Terms</a><a href="privacy.html">Privacy</a><a href="returns.html">Refunds</a></span></div>
        </div>
      </footer>
      <div class="overlay" data-close></div>
      <aside class="drawer" aria-label="Shopping bag" aria-hidden="true">
        <div class="drawer-head"><h3>Your bag</h3><button class="icon-btn" aria-label="Close" data-close>${ICON.close}</button></div>
        <div class="ship-bar"></div>
        <div class="drawer-body">
          <div class="lines"></div>
          <form class="checkout-form" novalidate>
            <a href="#" class="back-link" data-back>← Back to bag</a>
            <h4 style="font-size:22px;margin-bottom:6px">Delivery details</h4>
            <p class="muted" style="font-size:14px;margin-bottom:18px">We'll confirm your order, payment and delivery on WhatsApp.</p>
            <div class="field"><label for="c-name">Full name</label><input id="c-name" name="name" required autocomplete="name"></div>
            <div class="field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" required autocomplete="tel"></div>
            <div class="field"><label for="c-addr">Address</label><textarea id="c-addr" name="address" required autocomplete="street-address"></textarea></div>
            <div class="field"><label for="c-pin">Pincode</label><input id="c-pin" name="pincode" inputmode="numeric" autocomplete="postal-code"></div>
            <div class="field"><label for="c-note">Note (optional)</label><input id="c-note" name="note" placeholder="Gift wrap, preferred delivery time…"></div>
            <div class="field"><label>Payment</label>
              <label class="pay-opt"><input type="radio" name="pay" value="prepaid" checked><span><b>Pay online (UPI / card)</b><small>We'll send a secure payment link on WhatsApp</small></span></label>
              <label class="pay-opt" data-cod-opt><input type="radio" name="pay" value="cod"><span><b>Cash on delivery</b><small data-cod-note></small></span></label>
            </div>
            <p class="muted" style="font-size:13px">By placing an order you agree to our <a href="terms.html" style="text-decoration:underline">Terms</a> and <a href="returns.html" style="text-decoration:underline">Returns policy</a>.</p>
          </form>
        </div>
        <div class="drawer-foot"></div>
      </aside>
      <div class="toast" role="status"></div>`);

    const drawer = $(".drawer"), overlay = $(".overlay"), mnav = $(".mobile-nav");
    const close = () => { drawer.classList.remove("open", "checkout"); mnav.classList.remove("open"); overlay.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); };
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-bag]")) { e.preventDefault(); drawer.classList.add("open"); overlay.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
      if (e.target.closest("[data-open-menu]")) { mnav.classList.add("open"); overlay.classList.add("open"); }
      if (e.target.closest("[data-close]")) close();
      if (e.target.closest(".mobile-nav a")) close();
      if (e.target.closest("[data-back]")) { e.preventDefault(); drawer.classList.remove("checkout"); renderBag(); }
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    renderBag();
  }

  function renderBag() {
    const drawer = $(".drawer");
    if (!drawer) return;
    const count = bagCount(), total = bagTotal();
    const c = $(".bag-count");
    c.textContent = count; c.classList.toggle("show", count > 0);

    const left = S.freeShippingAbove - total;
    $(".ship-bar").innerHTML = count
      ? `${left > 0 ? `You're ${money(left)} away from free shipping` : "Yay! You've unlocked free shipping 🎉"}<div class="bar"><i style="width:${Math.min(100, (total / S.freeShippingAbove) * 100)}%"></i></div>`
      : "";
    $(".ship-bar").style.display = count ? "" : "none";

    $(".lines").innerHTML = count
      ? bag.map((l, i) => {
          const p = byId(l.id);
          return `<div class="line">
            <a href="product.html?id=${p.id}&colour=${l.colour}"><img src="${img(imgs(p, l.colour)[0], true)}" alt=""></a>
            <div><h4>${esc(p.name)}</h4><div class="meta">${COLOURS[l.colour].label} · ${l.size}</div>
              <div class="qty"><button data-dec="${i}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase">+</button></div></div>
            <div class="right"><span>${money(p.price * l.qty)}</span><button class="remove" data-rm="${i}">Remove</button></div>
          </div>`;
        }).join("")
      : `<div class="drawer-empty"><div class="ic">🧸</div><h4>Your bag is empty</h4><p>Let's find something snuggly.</p><a class="btn btn-primary" href="shop.html">Start shopping</a></div>`;

    // COD availability depends on the bag total.
    const codOpt = $("[data-cod-opt]");
    codOpt.style.display = S.cod.enabled ? "" : "none";
    const codInput = $("input[value=cod]", codOpt);
    codInput.disabled = !codAllowed();
    if (codInput.disabled && codInput.checked) $("input[value=prepaid]").checked = true;
    $("[data-cod-note]").textContent = codAllowed()
      ? (S.cod.fee ? `${money(S.cod.fee)} COD handling fee` : "No extra fee")
      : `Available on orders of ${money(S.cod.minOrder)} or more`;

    const inCheckout = drawer.classList.contains("checkout");
    const t = totals();
    $(".drawer-foot").style.display = count ? "" : "none";
    $(".drawer-foot").innerHTML = `
      <div class="sum"><span>Subtotal</span><span>${money(t.sub)}</span></div>
      <div class="sum"><span>Shipping</span><span>${t.ship ? money(t.ship) : "Free"}</span></div>
      ${t.cod ? `<div class="sum"><span>COD fee</span><span>${money(t.cod)}</span></div>` : ""}
      <div class="row"><span>Total</span><span>${money(t.total)}</span></div>
      <small>Inclusive of all taxes</small>
      ${inCheckout
        ? `<button class="btn btn-whatsapp btn-block" data-send>${ICON.wa} Place order on WhatsApp</button>`
        : `<button class="btn btn-primary btn-block" data-checkout>Checkout · ${money(t.total)}</button>`}`;
  }

  const payMethod = () => ($(".checkout-form input[name=pay]:checked") || {}).value || "prepaid";
  const codAllowed = () => S.cod.enabled && bagTotal() >= S.cod.minOrder;
  function totals() {
    const sub = bagTotal();
    const ship = !sub || sub >= S.freeShippingAbove ? 0 : S.shippingFee;
    const cod = payMethod() === "cod" && codAllowed() ? S.cod.fee : 0;
    return { sub, ship, cod, total: sub + ship + cod };
  }
  document.addEventListener("change", (e) => { if (e.target.name === "pay") renderBag(); });

  // Short, readable order reference, e.g. LO-250924-7K3F
  function orderId() {
    const words = S.name.trim().split(/\s+/);
    const prefix = (words.length > 1 ? words.map((w) => w[0]).join("") : words[0].slice(0, 3)).toUpperCase();
    const d = new Date();
    const date = [d.getFullYear() % 100, d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
    return `${prefix}-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-inc],[data-dec],[data-rm],[data-checkout],[data-send]");
    if (!t) return;
    if (t.dataset.inc) bag[t.dataset.inc].qty++;
    if (t.dataset.dec) { const l = bag[t.dataset.dec]; l.qty > 1 ? l.qty-- : bag.splice(t.dataset.dec, 1); }
    if (t.dataset.rm) bag.splice(t.dataset.rm, 1);
    if ("checkout" in t.dataset) { $(".drawer").classList.add("checkout"); renderBag(); $("#c-name").focus(); return; }
    if ("send" in t.dataset) return sendOrder();
    save();
  });

  function sendOrder() {
    const f = $(".checkout-form");
    const d = Object.fromEntries(new FormData(f));
    const missing = ["name", "phone", "address"].find((k) => !String(d[k] || "").trim());
    if (missing) { f.elements[missing].focus(); f.elements[missing].style.borderColor = "var(--terracotta)"; toast("Please fill in your name, phone and address"); return; }
    const lines = bag.map((l, i) => {
      const p = byId(l.id);
      return `${i + 1}. ${p.name}\n   Colour: ${COLOURS[l.colour].label} · Size: ${l.size} · Qty: ${l.qty} · ${money(p.price * l.qty)}`;
    });
    const t = totals();
    const id = orderId();
    const msg = [
      `Hi ${S.name}! I'd like to place an order 🛍️`,
      `Order ID: ${id}`, "",
      ...lines, "",
      `Subtotal: ${money(t.sub)}`,
      `Shipping: ${t.ship ? money(t.ship) : "Free"}`,
      t.cod ? `COD fee: ${money(t.cod)}` : null,
      `Total: ${money(t.total)}`,
      `Payment: ${payMethod() === "cod" ? "Cash on delivery" : "Pay online (please send payment link)"}`, "",
      `Name: ${d.name}`, `Phone: ${d.phone}`, `Address: ${d.address}${d.pincode ? ", " + d.pincode : ""}`,
      d.note ? `Note: ${d.note}` : null,
    ].filter((x) => x !== null).join("\n");
    const url = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");

    // Show a confirmation with a retry link, then empty the bag.
    bag = []; save();
    $(".drawer").classList.remove("checkout");
    $(".ship-bar").style.display = "none";
    $(".lines").innerHTML = `<div class="drawer-empty"><div class="ic">💌</div><h4>Almost done!</h4>
      <p>Your order <b>${id}</b> is ready in WhatsApp. Just press <b>Send</b> there and we'll confirm it shortly.</p>
      <a class="btn btn-whatsapp" href="${url}" target="_blank" rel="noopener">${ICON.wa} WhatsApp didn't open? Tap here</a></div>`;
  }

  let toastTimer;
  function toast(text) {
    const t = $(".toast"); if (!t) return;
    t.textContent = text; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  // ---------- product card ----------
  function card(p) {
    const im = imgs(p);
    const off = offPct(p);
    return `<article class="card reveal">
      <a class="card-media" href="product.html?id=${p.id}">
        ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ""}
        ${off ? `<span class="card-badge sale">−${off}%</span>` : ""}
        <img class="main" src="${img(im[0], true)}" alt="${esc(p.name)}" loading="lazy">
        ${im[1] ? `<img class="alt" src="${img(im[1], true)}" alt="" loading="lazy">` : ""}
      </a>
      <button class="quick-add" data-quick="${p.id}">Quick add · ${S.sizes[1]}</button>
      <div class="card-body">
        <a href="product.html?id=${p.id}" class="card-title">${esc(p.name)}</a>
        <div class="price">${money(p.price)}${off ? `<s>${money(p.mrp)}</s>` : ""}</div>
        ${p.colours.length > 1 ? `<div class="swatches">${p.colours.map((c, i) => `<button class="swatch ${i ? "" : "active"}" style="background:${COLOURS[c].hex}" title="${COLOURS[c].label}" aria-label="${COLOURS[c].label}" data-sw="${p.id}|${c}"></button>`).join("")}</div>` : ""}
      </div>
    </article>`;
  }

  // Card interactions: swatch hover/click swaps the photo; quick add.
  document.addEventListener("click", (e) => {
    const q = e.target.closest("[data-quick]");
    if (q) { const p = byId(q.dataset.quick); const cardEl = q.closest(".card"); const active = $(".swatch.active", cardEl); addToBag(p.id, active ? active.dataset.sw.split("|")[1] : p.colours[0], S.sizes[1]); }
    const sw = e.target.closest("[data-sw]");
    if (sw && sw.closest(".card")) {
      const [id, c] = sw.dataset.sw.split("|"); const p = byId(id); const el = sw.closest(".card"); const im = imgs(p, c);
      $$(".swatch", el).forEach((s) => s.classList.toggle("active", s === sw));
      $("img.main", el).src = img(im[0], true);
      const alt = $("img.alt", el); if (alt && im[1]) alt.src = img(im[1], true);
      $$("a", el).forEach((a) => { if (a.href.includes("product.html")) a.href = `product.html?id=${id}&colour=${c}`; });
    }
  });

  function reveal() {
    if (!("IntersectionObserver" in window)) { $$(".reveal").forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  // ---------- pages ----------
  function home() {
    $("[data-brand]") && $$("[data-brand]").forEach((el) => (el.textContent = S.name));
    const catImg = { newborn: ["newborn-cap-bib-set", "cream"], rompers: ["sleeveless-button-romper", "green"], sets: ["star-cloud-jogger-set", "rust"], dungarees: ["striped-dungaree-set", "default"], winter: ["hooded-teddy-suit", "cream"], night: ["printed-night-suit", "peach"] };
    $("#cats").innerHTML = CATS.map((c) => {
      const [pid, col] = catImg[c.id];
      return `<a class="cat reveal" href="shop.html?cat=${c.id}"><div class="arch-img"><img src="${img(IMAGES[pid][col][0], true)}" alt="${c.label}" loading="lazy"></div><h3>${c.label}</h3><p>${c.blurb}</p></a>`;
    }).join("");
    $("#stat-styles").textContent = PRODUCTS.length;
    $("#stat-colours").textContent = PRODUCTS.reduce((n, p) => n + p.colours.length, 0);
    $("#new").innerHTML = PRODUCTS.slice(0, 8).map(card).join("");
    const strip = [["tiger-stripe-suit", "orange", 1], ["double-top-set", "teal", 0], ["hooded-teddy-suit", "pistachio", 0], ["zip-bomber-jogger-set", "olive", 0], ["checked-hooded-jumpsuit", "pink", 0], ["little-star-cardigan-set", "blue", 0]];
    $("#strip").innerHTML = strip.map(([pid, col, n]) => `<a href="product.html?id=${pid}&colour=${col}"><img src="${img(IMAGES[pid][col][n], true)}" alt="" loading="lazy"></a>`).join("");
    $("#wa-contact").href = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(`Hi ${S.name}! I have a question.`)}`;
    $("#mail-contact").href = `mailto:${S.email}`;
  }

  function shop() {
    const params = new URLSearchParams(location.search);
    let cat = params.get("cat") || "all";
    let sort = "featured";
    $("#chips").innerHTML = [{ id: "all", label: "All" }, ...CATS].map((c) => `<button class="chip" data-cat="${c.id}">${c.label}</button>`).join("");
    const draw = () => {
      let list = PRODUCTS.filter((p) => cat === "all" || p.category === cat);
      if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
      if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
      if (sort === "sale") list = [...list].sort((a, b) => offPct(b) - offPct(a));
      $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === cat));
      const c = CATS.find((x) => x.id === cat);
      $("#shop-title").textContent = c ? c.label : "Shop all";
      $("#shop-sub").textContent = c ? c.blurb : "Soft, snuggly and made for little adventures.";
      $("#count").textContent = `${list.length} ${list.length === 1 ? "style" : "styles"}`;
      $("#grid").innerHTML = list.length ? list.map(card).join("") : `<p class="empty">Nothing here yet — check back soon.</p>`;
      reveal();
    };
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      cat = b.dataset.cat; history.replaceState(null, "", cat === "all" ? "shop.html" : `shop.html?cat=${cat}`); draw();
    });
    $("#sort").addEventListener("change", (e) => { sort = e.target.value; draw(); });
    draw();
  }

  function product() {
    const params = new URLSearchParams(location.search);
    const p = byId(params.get("id")) || PRODUCTS[0];
    let colour = p.colours.includes(params.get("colour")) ? params.get("colour") : p.colours[0];
    let size = null, qty = 1, idx = 0;
    const off = offPct(p);
    document.title = `${p.name} · ${S.name}`;

    $("#pdp").innerHTML = `
      <div class="crumbs wrap" style="padding-left:0"><a href="index.html">Home</a> / <a href="shop.html?cat=${p.category}">${catLabel(p.category)}</a> / ${esc(p.name)}</div>
      <div class="pdp">
        <div class="pdp-gallery">
          <div class="thumbs"></div>
          <div class="main-img"><img alt="${esc(p.name)}"><button class="gal-nav prev" aria-label="Previous photo">${ICON.left}</button><button class="gal-nav next" aria-label="Next photo">${ICON.right}</button></div>
        </div>
        <div class="pdp-info">
          <span class="eyebrow">${catLabel(p.category)}</span>
          <h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)}${off ? `<s>${money(p.mrp)}</s><span class="save-tag">Save ${off}%</span>` : ""}</div>
          <p class="tax-note">Inclusive of all taxes</p>
          <div class="opt"><div class="opt-label">Colour: <span id="col-name"></span></div>
            <div class="swatches">${p.colours.map((c) => `<button class="swatch" style="background:${COLOURS[c].hex}" data-colour="${c}" title="${COLOURS[c].label}" aria-label="${COLOURS[c].label}"></button>`).join("")}</div></div>
          <div class="opt" id="sizes"><div class="opt-label">Size: <span id="size-name">Select a size</span></div>
            <div class="sizes">${S.sizes.map((s) => `<button class="size" data-size="${s}">${s}</button>`).join("")}</div></div>
          <div class="buy-row">
            <div class="qty"><button data-q="-1" aria-label="Decrease">−</button><span id="qty">1</span><button data-q="1" aria-label="Increase">+</button></div>
            <button class="btn btn-primary" id="add">Add to bag</button>
          </div>
          <button class="btn btn-whatsapp btn-block" id="wa">${ICON.wa} Order on WhatsApp</button>
          <div class="mini-trust"><div><b>🌿</b>Soft cotton</div><div><b>🚚</b>Fast delivery</div><div><b>↺</b>Easy exchange</div></div>
          <div class="perks">
            <details open><summary>Description</summary><p>${esc(p.description)}</p></details>
            <details><summary>Size guide</summary><ul><li>0–3M: up to 6 kg · 62 cm</li><li>3–6M: 6–8 kg · 68 cm</li><li>6–12M: 8–10 kg · 80 cm</li><li>12–18M: 10–11 kg · 86 cm</li><li>18–24M: 11–13 kg · 92 cm</li></ul><p><a href="size-guide.html" style="text-decoration:underline">Full size guide & how to measure</a></p></details>
            <details><summary>Care</summary><p>Machine wash cold, inside out, with similar colours. Mild detergent, no bleach. Tumble dry low or line dry in shade.</p></details>
            <details><summary>Shipping & exchange</summary><p>Dispatched in ${S.dispatchDays} working days. Free shipping on orders of ${money(S.freeShippingAbove)} or more. Size exchange within ${S.exchangeDays} days of delivery, unworn with tags. <a href="shipping.html" style="text-decoration:underline">Shipping</a> · <a href="returns.html" style="text-decoration:underline">Returns</a></p></details>
          </div>
        </div>
      </div>`;

    const main = $(".main-img img");
    const drawGallery = () => {
      const im = imgs(p, colour);
      idx = Math.min(idx, im.length - 1);
      main.src = img(im[idx]);
      $(".thumbs").innerHTML = im.map((b, i) => `<button class="thumb ${i === idx ? "active" : ""}" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${img(b, true)}" alt=""></button>`).join("");
      $$("[data-colour]").forEach((s) => s.classList.toggle("active", s.dataset.colour === colour));
      $("#col-name").textContent = COLOURS[colour].label;
      $$(".gal-nav").forEach((b) => (b.style.display = im.length > 1 ? "" : "none"));
      im.forEach((b) => { new Image().src = img(b); }); // preload for snappy switching
    };
    const step = (d) => { const n = imgs(p, colour).length; idx = (idx + d + n) % n; drawGallery(); };
    $(".pdp").addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-i]")) { idx = +t.closest("[data-i]").dataset.i; drawGallery(); }
      if (t.closest("[data-colour]")) { colour = t.closest("[data-colour]").dataset.colour; idx = 0; drawGallery(); history.replaceState(null, "", `product.html?id=${p.id}&colour=${colour}`); }
      if (t.closest("[data-size]")) { size = t.closest("[data-size]").dataset.size; $$(".size").forEach((s) => s.classList.toggle("active", s.dataset.size === size)); $("#size-name").textContent = size; }
      if (t.closest("[data-q]")) { qty = Math.max(1, qty + +t.closest("[data-q]").dataset.q); $("#qty").textContent = qty; }
      if (t.closest(".prev")) step(-1);
      if (t.closest(".next")) step(1);
    });
    // swipe on phones
    let x0 = null;
    main.parentElement.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    main.parentElement.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); x0 = null; });

    const needSize = () => { if (size) return false; toast("Please choose a size"); $("#sizes").scrollIntoView({ behavior: "smooth", block: "center" }); return true; };
    $("#add").addEventListener("click", () => { if (!needSize()) addToBag(p.id, colour, size, qty); });
    $("#wa").addEventListener("click", () => {
      if (needSize()) return;
      const msg = `Hi ${S.name}! I'd like to order:\nOrder ID: ${orderId()}\n\n${p.name}\nColour: ${COLOURS[colour].label} · Size: ${size} · Qty: ${qty}\nPrice: ${money(p.price * qty)}\n\n${location.href}`;
      window.open(`https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    });
    drawGallery();

    const related = PRODUCTS.filter((x) => x.id !== p.id && x.category === p.category).concat(PRODUCTS.filter((x) => x.category !== p.category)).slice(0, 4);
    $("#related").innerHTML = related.map(card).join("");
  }

  // ---------- boot ----------
  chrome();
  // Policy / info pages: fill <span data-s="key"> with values from config.js.
  function info() {
    const val = (k) => {
      if (k === "money.freeShippingAbove") return money(S.freeShippingAbove);
      if (k === "money.shippingFee") return money(S.shippingFee);
      if (k === "money.codFee") return money(S.cod.fee);
      if (k === "money.codMin") return money(S.cod.minOrder);
      return S[k];
    };
    $$("[data-s]").forEach((el) => { const v = val(el.dataset.s); if (v !== undefined && v !== "") el.textContent = v; else if (el.dataset.optional !== undefined) el.closest("[data-row]")?.remove(); });
    $$("[data-href]").forEach((el) => {
      const k = el.dataset.href;
      el.href = k === "whatsapp" ? `https://wa.me/${S.whatsapp}` : k === "email" ? `mailto:${S.email}` : S[k];
    });
    $$("[data-cod-only]").forEach((el) => { if (!S.cod.enabled) el.remove(); });
  }

  const pages = { home, shop, product, info };
  (pages[document.body.dataset.page] || (() => {}))();
  reveal();
})();
