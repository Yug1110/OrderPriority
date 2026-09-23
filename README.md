# Wynoak — baby clothing storefront + admin

Storefront for baby clothes (0–24 months) with an admin dashboard. Shoppers build a bag, the order is saved, and they're sent to WhatsApp to confirm. You manage products, photos, stock and orders at `/admin`.

**Live:** https://order-priority.vercel.app · **Admin:** https://order-priority.vercel.app/admin/ (Vercel, auto-deploys from `main`)

- **What's left before launch:** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
- **Using the admin:** [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)
- **One-time admin setup (Supabase):** [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

## How it fits together

```
Shoppers → static pages (index/shop/product/policies) → /api/catalog → Supabase (edge-cached 60 s)
                                                      → /api/orders  → Supabase (prices recomputed on the server)
Admins   → /admin/ (login) → Supabase directly, protected by row-level security (admins table)
Photos uploaded in the admin → Supabase Storage "media" bucket → served at /media/* via a Vercel rewrite
```

If the database isn't configured or reachable, the shop falls back to the built-in snapshot (`config.js`, `data/products.js`, `data/images.js`) and WhatsApp-only orders, so it never goes down completely.

## Everyday edits
Everything (products, photos, stock, prices, categories, store settings, team) is done in **/admin**. Code changes are only needed for page text and design, the link-preview image (`python3 scripts/make-share-image.py`) and the brand name in page `<title>`/`<meta>` tags.

## Development

```sh
npx supabase start                      # local database, auth, storage (needs Docker)
npx supabase status -o env              # local keys → put URL/keys in .env.local
ENV_FILE=.env.local node scripts/migrate-to-supabase.mjs you@example.com   # import catalogue + first admin
node scripts/dev-server.mjs             # http://127.0.0.1:3000 (static site + api/*.js + /media proxy)
docker exec -i supabase_db_wynoak psql -U postgres < supabase/tests/store_test.sql   # database tests
```

Deploying the database schema to the live project: `npx supabase db push --db-url "$DATABASE_URL"`.

## Structure

```
index.html shop.html product.html        storefront pages (header/footer/bag injected by js/app.js)
contact/shipping/returns/terms/privacy/size-guide.html   policy pages, values filled from settings
js/app.js  css/styles.css                storefront logic and styles
admin/                                   admin app (index.html, admin.js, admin.css)
api/                                     Vercel functions: catalog, orders, admin-invite, admin-config, keepalive
supabase/migrations/                     database schema, security rules, stock trigger, stats
supabase/tests/store_test.sql            database tests (rolled back after running)
config.js data/                          fallback snapshot used if the database is unreachable
assets/                                  optimised product photos and brand files
scripts/                                 dev server, migration, photo converter, share-image generator
docs/                                    setup, admin guide, policy review, legal plan
```
