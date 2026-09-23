# Little Oat — baby clothing storefront

A fast, static storefront for baby clothes (0–24 months). No backend: shoppers build a bag and send their order to you as a pre-filled WhatsApp message.

**Live:** https://yug1110.github.io/OrderPriority/

## Everyday edits

| What | Where |
| --- | --- |
| Brand name, WhatsApp number, email, Instagram, free-shipping threshold, sizes | `config.js` |
| Product names, prices, MRP, descriptions, badges, colour order | `data/products.js` |
| Colour names & swatch colours | `COLOURS` in `data/products.js` |
| Look & feel (palette, fonts, spacing) | `css/styles.css` (tokens at the top) |

Commit and push to `main` — GitHub Pages redeploys in about a minute.

**Before going live, set your real WhatsApp number** in `config.js` (international format, digits only, e.g. `919876543210`).

## Adding a product

1. Put the photos in a new folder next to the other product folders, named by colour prefix + number (`pink1.png`, `pink2.png`, `b1.png`…).
2. Add the folder to `FOLDERS` in `scripts/build-images.py` with a slug and a prefix → colour map.
3. Run `python3 scripts/build-images.py ..` (needs `pip install pillow`). This writes optimised WebP images to `assets/products/<slug>/` and updates `data/images.js`.
4. Add an entry to `PRODUCTS` in `data/products.js` with `id` = the slug.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html  shop.html  product.html   pages (header, footer and bag are injected by js/app.js)
js/app.js                             catalogue, bag (localStorage), WhatsApp checkout, page rendering
css/styles.css                        all styles
config.js  data/products.js           the things you edit
data/images.js                        generated image manifest
assets/products/                      generated WebP images (1200px + 560px)
scripts/build-images.py               photo → WebP converter
```
