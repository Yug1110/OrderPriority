# Wynoak — baby clothing storefront

A fast, static storefront for baby clothes (0–24 months). No backend: shoppers build a bag and send their order to you as a pre-filled WhatsApp message.

**Live:** https://order-priority.vercel.app (Vercel, auto-deploys from `main`)

**What's left before launch:** see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## Everyday edits

| What | Where |
| --- | --- |
| Brand name, WhatsApp number, email, Instagram, business details, shipping & COD fees, exchange days, sizes | `config.js` (policy pages read these values too) |
| Product names, prices, MRP, descriptions, badges, colour order | `data/products.js` |
| Colour names & swatch colours | `COLOURS` in `data/products.js` |
| Look & feel (palette, fonts, spacing) | `css/styles.css` (tokens at the top) |

Commit and push to `main` — Vercel redeploys in about a minute.

After changing the brand name or tagline, also run `python3 scripts/make-share-image.py` (link-preview image) and replace `Wynoak` in the `<title>` and `<meta>` tags at the top of each `.html` file (crawlers don't run JavaScript).

**Before going live, set your real WhatsApp number** in `config.js` (international format, digits only, e.g. `919876543210`).

## Adding a product

1. Put the photos in a new folder next to the other product folders, named by colour prefix + number (`pink1.png`, `pink2.png`, `b1.png`…).
2. Add the folder to `FOLDERS` in `scripts/build-images.py` with a slug and a prefix → colour map.
3. Run `python3 scripts/build-images.py ..` (needs `pip install pillow`). This writes optimised WebP images to `assets/products/<slug>/` and updates `data/images.js`.
4. Add an entry to `PRODUCTS` in `data/products.js` with `id` = the slug.

## Orders

Checkout sends a WhatsApp message with an order ID (e.g. `WYN-260924-7K3F`), items, shipping, COD fee, total and payment choice. Confirm on WhatsApp, send a Razorpay payment link for prepaid orders, then book the shipment in Shiprocket.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html  shop.html  product.html   pages (header, footer and bag are injected by js/app.js)
contact / shipping / returns / terms / privacy / size-guide .html   policy pages, values filled from config.js
js/app.js                             catalogue, bag (localStorage), WhatsApp checkout, page rendering
css/styles.css                        all styles
config.js  data/products.js           the things you edit
data/images.js                        generated image manifest
assets/products/                      generated WebP images (1200px + 560px)
scripts/build-images.py               photo → WebP converter
scripts/make-share-image.py           link-preview image + home-screen icon
sitemap.xml  robots.txt  vercel.json  SEO + caching
```
