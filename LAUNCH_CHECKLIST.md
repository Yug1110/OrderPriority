# Launch & investor-readiness checklist

This file lists everything left to do before a public launch and before pitching investors. Tick items off as they're done, and keep it current.

Live site: https://order-priority.vercel.app (the old GitHub Pages address, `yug1110.github.io`, carries a Google "unsafe" flag from March 2026, so don't share it).

Legend: ⬜ to do · 🔄 in progress · ✅ done · ⏸ deferred by owner (to be picked up later)

---

## 1. Details needed from the owner (placeholders on the live site)

All of these go in `config.js` except prices, which live in `data/products.js`.

| Status | Item | Where it shows |
|---|---|---|
| ⬜ | Brand name | Everywhere, including link previews (`assets/brand/og.jpg` must be re-generated) |
| ⬜ | Tagline | Footer, link preview |
| ⬜ | WhatsApp number for orders | Every "Order on WhatsApp" button and the checkout |
| ⬜ | Phone number to display | Contact and policy pages |
| ⬜ | Support email | Footer, Contact, policies |
| ⬜ | Instagram link | Footer |
| ⬜ | Registered business name | Contact, Terms, Privacy, footer © |
| ⬜ | Registered business address | Contact, Terms, Privacy |
| ⬜ | Grievance officer name | Contact, Terms, Privacy (legally required) |
| ⬜ | GSTIN (optional) | Contact |
| ⬜ | Selling price and MRP for all 16 products | Shop and product pages |
| ⬜ | Shipping fee below the free-shipping amount (now ₹79) and the free-shipping amount (now ₹999) | Bag, shipping policy |
| ⬜ | COD on or off, COD fee (now ₹49), minimum COD order (now ₹499) | Checkout, shipping policy |
| ⬜ | Support hours (now Mon–Sat 10–7) | Contact |
| ⬜ | Real logo (currently a placeholder moon icon) | Header, favicon, link preview |

## 2. Deferred by the owner (remind until marked done)

| Status | Item | Notes |
|---|---|---|
| ⏸ | **Review all policy wording** | Shipping, Returns/Exchange/Refunds, Terms, Privacy, Contact, and the size chart numbers. Also check the product descriptions' fabric claims ("soft cotton", "brushed cotton"), the 7-day exchange, 48-hour damage window, 1–2 day dispatch and 3–7 day delivery. All are drafts. |
| ⏸ | **Legal and business requirements** | Business entity, GST decision (with a CA), Udyam/MSME, current bank account, packaging labels under Legal Metrology rules (MRP, manufacturer/packer name and address, month and year of packing, size, customer-care contact, **country of origin** per product), DPDP Act compliance once marketing messages start. |
| ⏸ | **Admin dashboard for the catalogue** | Today, adding, editing or removing products means editing `data/products.js` and running `scripts/build-images.py`. Plan an admin (options: Google Sheet as the catalogue with photo upload, a headless CMS such as Decap or Sanity, or moving to Shopify/Dukaan). Needs a decision on who will manage the catalogue day to day. |

## 3. Operations setup (following the recommendation: WhatsApp orders, UPI and payment links, COD, Shiprocket)

| Status | Item |
|---|---|
| ⬜ | Install **WhatsApp Business** on the order number. Set up the business profile, catalogue, quick replies (order confirmation, payment link, shipped with tracking, delivered), labels (New / Paid / Packed / Shipped / Delivered / Exchange) and an away message |
| ⬜ | **UPI**: a business UPI ID or QR code for immediate prepaid orders |
| ⬜ | **Razorpay** account and KYC, then use **Payment Links** for prepaid orders (Razorpay checks the policy pages, which now exist) |
| ⬜ | **Shiprocket** (or NimbusPost/Shipway) account and KYC. Set pickup address, box sizes and weights, COD remittance bank account, and a return address |
| ⬜ | **Order log**: a Google Sheet with Order ID, date, customer, items, total, payment (prepaid/COD), status, AWB/tracking, exchange/return, notes |
| ⬜ | **Packaging**: mailer bags or boxes, tissue, thank-you card with the exchange steps and Instagram handle, invoice slip |
| ⬜ | **Test order end to end**: place an order on the site, confirm it on WhatsApp, send a payment link, book a Shiprocket pickup, print the label, deliver, then do a mock exchange |

## 4. Product and trust

| Status | Item |
|---|---|
| ✅ | Photos checked against the real garments (owner confirmed) |
| ✅ | Disney-character products removed (Mickey dungaree set, Donald Duck stripe set) |
| ⬜ | **"POLO BEAR" patch** on the Zebra Stripe Hooded Suit. "Polo Bear" is a Ralph Lauren trademark, so decide whether to keep, rename or remove the product |
| ⬜ | Real size chart measured from your garments (current numbers are generic) |
| ⬜ | Fabric composition and country of origin for each product |
| ⬜ | Stock per size (and hiding sold-out sizes on the site) |
| ⬜ | Collect first customer photos and reviews for the site and Instagram |

## 5. Website backlog (roughly in priority order)

| Status | Item |
|---|---|
| ✅ | Policy pages: Contact, Shipping, Returns/Exchange/Refunds, Terms, Privacy, Size guide |
| ✅ | Link-preview image and tags for WhatsApp, Instagram and Facebook; sitemap; robots.txt |
| ✅ | Checkout with payment choice (online or COD), shipping and COD fees, order ID, confirmation screen |
| ⬜ | **Analytics** (GA4 or Vercel Analytics) and **Meta Pixel**, needed before running ads and to have numbers for investors. Update the privacy policy when added |
| ⬜ | **Save every order to the Google Sheet automatically** when the checkout is submitted, so orders aren't lost if the shopper never presses Send in WhatsApp |
| ⬜ | Sold-out and low-stock display per size |
| ⬜ | Custom domain (e.g. brandname.in) and business email on it |
| ⬜ | On-site Razorpay checkout (pay on the site instead of by link), once order volume justifies it |
| ⬜ | Coupon codes (first-order discount, influencer codes) |
| ⬜ | Reviews on product pages |
| ⬜ | Search (useful beyond about 30 products) |
| ⬜ | Automatic Shiprocket order creation from the site |
| ⬜ | Admin dashboard (see section 2) |
| ⬜ | Google Search Console: submit the sitemap |

## 6. Before pitching investors

Investors will ask for numbers, so the analytics and order log in sections 3 and 5 need to run **from the first day of sales**.

| Status | Item |
|---|---|
| ⬜ | **Traction metrics**: monthly orders and revenue, average order value, site conversion rate, repeat-customer rate, customer acquisition cost per channel, return/exchange rate, **COD refused-delivery (RTO) rate** |
| ⬜ | **Unit economics per product**: landed cost, selling price, gateway, shipping, packaging and COD costs, and the cost of returns, giving contribution margin |
| ⬜ | **Supply chain**: who makes or supplies each item (the folder names look like supplier SKU codes), minimum order quantities, lead times, reorder plan, quality checks |
| ⬜ | **Differentiation**: why this brand over FirstCry, Hopscotch, Mothercare and D2C labels. Own designs, fabric, price point, community? If the products are wholesale or white-label today, have a plan for own designs or private label |
| ⬜ | **Brand protection**: trademark search and filing for the chosen name (IP India, class 25 clothing and class 35 retail), domain, social handles |
| ⬜ | **Company structure**: most investors need a **Private Limited company**; founders' agreement, cap table, bank account, GST, basic bookkeeping |
| ⬜ | **Audience**: Instagram following and engagement, WhatsApp opt-in list size, customer testimonials |
| ⬜ | **Pitch deck**: problem, customer, product, traction, unit economics, market size, competition, go-to-market, team, the ask and how funds will be used |
| ⬜ | **Assets you own**: code (this repo), photos (usage rights for any AI-generated or supplier images), brand files |

---

## Done log

- 2026-09-24: Storefront built and deployed (home, shop, product, bag, WhatsApp checkout); photos optimised from 1.3 GB to 17 MB.
- 2026-09-24: Moved hosting to Vercel after the Google Safe Browsing flag on the github.io address.
- 2026-09-24: Removed the Disney-character products. Added policy pages, size guide, payment choice with COD and shipping fees, order IDs, link previews, sitemap and caching headers.
