# Launch & investor-readiness checklist

This file lists everything left to do before a public launch and before pitching investors. Tick items off as they're done, and keep it current.

Live site: https://order-priority.vercel.app. GitHub Pages was turned off on 2026-09-24 because `yug1110.github.io` carries a Google "unsafe" flag from March 2026; don't reuse that address.

Legend: ⬜ to do · 🔄 in progress · ✅ done · ⏸ deferred by owner (to be picked up later)

---

## 1. Details needed from the owner (placeholders on the live site)

All of these go in `config.js` except prices, which live in `data/products.js`.

| Status | Item | Where it shows |
|---|---|---|
| ✅ | Brand name: **Wynoak** | Everywhere, including the link-preview image |
| ✅ | Tagline: **Grown to last.** | Footer, home page story, link preview |
| ✅ | WhatsApp number for orders (+91 80764 49307) | Every "Order on WhatsApp" button and the checkout |
| ✅ | Phone number to display (same as WhatsApp) | Contact and policy pages |
| ✅ | Support email (yugayugarg5@gmail.com; switch to a domain email later) | Footer, Contact, policies |
| ⬜ | Instagram link (account not created yet; the footer link stays hidden until it's set) | Footer |
| ✅ | Free shipping from ₹999, otherwise ₹79 (confirmed) | Bag, shipping policy |
| ✅ | COD on, ₹49 fee, ₹499 minimum order (confirmed) | Checkout, shipping policy |
| ✅ | Support hours Mon–Sat, 10 am – 7 pm (confirmed) | Contact |
| ⬜ | Real logo (currently a simple acorn mark made to fit the name; replace with a designed logo) | Header, favicon, home-screen icon |

## 2. Deferred by the owner (remind until marked done)

| Status | Item | Notes |
|---|---|---|
| ⏸ | **Prices and MRP for all 15 products** | Placeholder prices are live. Owner will send real ones; update `data/products.js`. |
| ⏸ | **Business details for Contact and policy pages** | Registered business name (no company yet; own name works for a sole proprietor), business address, grievance officer name, GSTIN (optional). Set in `config.js`; placeholders in [brackets] are live. |
| ⏸ | **Secure the Wynoak name online** | As of 2026-09-24, **wynoak.com, wynoak.in, wynoak.co.in, wynoak.co and wynoak.store are all unregistered**; buy at least .com and .in soon (about ₹1,500–2,000 a year together). The @wynoak Instagram handle couldn't be checked without logging in, so try creating it. Claim the **@wynoak** Instagram handle, and ideally the same on Facebook and YouTube. Then set `instagram` in `config.js` so the footer link appears. |
| ⏸ | **Trademark search for "Wynoak"** | A web search (2026-09-24) found no clothing brand named Wynoak; the only near match is WynOaks Farm, a US horse farm, which isn't a conflict. The official IP India search needs a captcha, so do it yourself or through a trademark agent: search the IP India public trademark search (class 25 clothing, class 35 retail) **before printing packaging or labels**. If it's clear, file an application (sole proprietors and startups pay a reduced fee). Investors will ask about this. |
| ⏸ | **Review all policy wording** | Use **`docs/POLICY_REVIEW.md`**: 34 numbered items to mark ✅ or correct. Covers shipping, Returns/Exchange/Refunds, Terms, Privacy, Contact, and the size chart numbers. Also check the product descriptions' fabric claims ("soft cotton", "brushed cotton"), the 7-day exchange, 48-hour damage window, 1–2 day dispatch and 3–7 day delivery. All are drafts. |
| ⏸ | **Legal and business requirements** | Step-by-step plan in **`docs/LEGAL_SETUP.md`**. ⚠️ **GST registration is compulsory from the first sale to another state**, whatever the turnover; register before selling pan-India, or sell only in-state until then. Also: business entity, GST decision (with a CA), Udyam/MSME, current bank account, packaging labels under Legal Metrology rules (MRP, manufacturer/packer name and address, month and year of packing, size, customer-care contact, **country of origin** per product), DPDP Act compliance once marketing messages start. |
| 🔄 | **Admin dashboard**: ✅ built and tested (products, photos, stock, orders, dashboard, settings, team). **Owner to do:** the 10-minute Supabase setup in **`docs/SUPABASE_SETUP.md`**, then Claude connects it. How to use it: `docs/ADMIN_GUIDE.md`. | Previously, adding, editing or removing products meant editing `data/products.js` and running `scripts/build-images.py`. Today, adding, editing or removing products means editing `data/products.js` and running `scripts/build-images.py`. Plan an admin (options: Google Sheet as the catalogue with photo upload, a headless CMS such as Decap or Sanity, or moving to Shopify/Dukaan). Needs a decision on who will manage the catalogue day to day. |

## 3. Operations setup (following the recommendation: WhatsApp orders, UPI and payment links, COD, Shiprocket)

| Status | Item |
|---|---|
| ⬜ | Install **WhatsApp Business** on the order number. Set up the business profile, catalogue, quick replies (order confirmation, payment link, shipped with tracking, delivered), labels (New / Paid / Packed / Shipped / Delivered / Exchange) and an away message |
| ⬜ | **UPI**: a business UPI ID or QR code for immediate prepaid orders |
| ⬜ | **Razorpay** account and KYC, then use **Payment Links** for prepaid orders (Razorpay checks the policy pages, which now exist) |
| ⬜ | **Shiprocket** (or NimbusPost/Shipway) account and KYC. Set pickup address, box sizes and weights, COD remittance bank account, and a return address |
| ✅ | **Order log**: the admin's Orders page (status, courier, tracking, notes, history) replaces the planned Google Sheet |
| ⬜ | **Packaging**: mailer bags or boxes, tissue, thank-you card with the exchange steps and Instagram handle, invoice slip |
| ⬜ | **Test order end to end**: place an order on the site, confirm it on WhatsApp, send a payment link, book a Shiprocket pickup, print the label, deliver, then do a mock exchange |

## 4. Product and trust

| Status | Item |
|---|---|
| ✅ | Photos checked against the real garments (owner confirmed) |
| ✅ | Disney-character products removed (Mickey dungaree set, Donald Duck stripe set) |
| ✅ | Zebra Stripe Hooded Suit removed for now (its "POLO BEAR" patch is a Ralph Lauren trademark). Photos are still in the `TG 2658` folder if a version without the patch arrives |
| ⬜ | Real size chart measured from your garments (current numbers are generic) |
| ⬜ | Fabric composition and country of origin for each product |
| 🔄 | Stock per size: the feature is built; enter your real stock counts in the admin after setup |
| ⬜ | Collect first customer photos and reviews for the site and Instagram |

## 5. Website backlog (roughly in priority order)

| Status | Item |
|---|---|
| ✅ | Policy pages: Contact, Shipping, Returns/Exchange/Refunds, Terms, Privacy, Size guide |
| ✅ | Link-preview image and tags for WhatsApp, Instagram and Facebook; sitemap; robots.txt |
| ✅ | Checkout with payment choice (online or COD), shipping and COD fees, order ID, confirmation screen |
| ⬜ | **Vercel Pro (about $20/month)** once you're trading: the free Hobby plan is for non-commercial use |
| ⬜ | **Analytics** (GA4 or Vercel Analytics) and **Meta Pixel**, needed before running ads and to have numbers for investors. Update the privacy policy when added |
| ✅ | **Every order saved automatically** (in the admin database) when the checkout is submitted, even if the shopper never presses Send in WhatsApp; prices are checked on the server *(live once the Supabase setup is done)* |
| ✅ | Stock per size and colour, with sold-out and "only N left" on the shop and low-stock alerts in the admin *(live once the Supabase setup is done)* |
| ⬜ | Custom domain (e.g. wynoak.in / wynoak.com; check availability) and business email on it |
| ⬜ | On-site Razorpay checkout (pay on the site instead of by link), once order volume justifies it |
| ⬜ | Coupon codes (first-order discount, influencer codes) |
| ⬜ | Reviews on product pages |
| ⬜ | Search (useful beyond about 30 products) |
| ⬜ | Automatic Shiprocket order creation from the site |
| ✅ | Admin dashboard (see section 2); Shiprocket-format CSV export; WhatsApp message templates per order status |
| ⬜ | Google Search Console: submit the sitemap |

## 6. Before pitching investors

Investors will ask for numbers, so the analytics and order log in sections 3 and 5 need to run **from the first day of sales**.

| Status | Item |
|---|---|
| ⬜ | **Traction metrics**: monthly orders and revenue, average order value, site conversion rate, repeat-customer rate, customer acquisition cost per channel, return/exchange rate, **COD refused-delivery (RTO) rate** |
| ⬜ | **Unit economics per product**: landed cost, selling price, gateway, shipping, packaging and COD costs, and the cost of returns, giving contribution margin |
| ⬜ | **Supply chain**: who makes or supplies each item (the folder names look like supplier SKU codes), minimum order quantities, lead times, reorder plan, quality checks |
| ⬜ | **Differentiation**: why this brand over FirstCry, Hopscotch, Mothercare and D2C labels. Own designs, fabric, price point, community? If the products are wholesale or white-label today, have a plan for own designs or private label |
| ⬜ | **Brand protection**: trademark filed for Wynoak, domain and social handles secured (see section 2) |
| ⬜ | **Company structure**: most investors need a **Private Limited company**; founders' agreement, cap table, bank account, GST, basic bookkeeping |
| ⬜ | **Audience**: Instagram following and engagement, WhatsApp opt-in list size, customer testimonials |
| ⬜ | **Pitch deck**: problem, customer, product, traction, unit economics, market size, competition, go-to-market, team, the ask and how funds will be used |
| ⬜ | **Assets you own**: code (this repo), photos (usage rights for any AI-generated or supplier images), brand files |

---

## Done log

- 2026-09-24: Storefront built and deployed (home, shop, product, bag, WhatsApp checkout); photos optimised from 1.3 GB to 17 MB.
- 2026-09-24: Moved hosting to Vercel after the Google Safe Browsing flag on the github.io address.
- 2026-09-24: Built the admin dashboard (Supabase + Vercel functions): products, photo upload, stock per size, automatic order saving with server-checked prices, order statuses with a stock trigger, WhatsApp templates, Shiprocket CSV, sales dashboard, settings, team links. Checkout now asks for city and state. Tested locally end to end.
- 2026-09-24: Checked domain availability and the name; wrote the policy review sheet and the legal-setup and admin-dashboard plans; softened site-wide fabric claims; home-page delivery and exchange values now come from config; internal docs kept off the live site.
- 2026-09-24: Rebranded to Wynoak ("Grown to last."), with an acorn mark, new link preview and WYN- order IDs. Removed the Zebra Stripe Hooded Suit (Polo Bear patch).
- 2026-09-24: Set WhatsApp/phone, support email, hours, shipping and COD rules; Instagram link hidden until created; GitHub Pages turned off.
- 2026-09-24: Removed the Disney-character products. Added policy pages, size guide, payment choice with COD and shipping fees, order IDs, link previews, sitemap and caching headers.
