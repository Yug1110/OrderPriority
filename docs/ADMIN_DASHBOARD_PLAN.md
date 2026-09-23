# Admin dashboard plan

**Status (2026-09-24): ✅ built and tested (option C, Supabase custom admin).** What's left is the owner's one-time setup in [SUPABASE_SETUP.md](SUPABASE_SETUP.md); see also [ADMIN_GUIDE.md](ADMIN_GUIDE.md). The options below are kept for reference.

## The problem today

Changing the catalogue means editing `data/products.js`, running `scripts/build-images.py` on a Mac and pushing to GitHub. That works for a technical person and a small catalogue. It doesn't work once someone else manages products, or once you need stock per size and a record of orders. Investors will also ask for sales numbers, and those need order records.

## What the dashboard should do

In order of importance:

1. **Products**: add, edit, hide or delete; name, category, description, fabric, price, MRP, badges.
2. **Photos**: upload from a phone, group them by colour, resize and compress automatically.
3. **Stock per size and colour**: the site shows "Sold out" and blocks ordering those sizes.
4. **Orders**: every checkout saved automatically, whether or not the customer presses Send in WhatsApp. Status (New → Paid → Packed → Shipped → Delivered / Exchange), tracking number, notes. Export for Shiprocket.
5. **Numbers**: orders, revenue, average order value, top products, COD vs prepaid, returns. This is the traction data for investors.
6. **Settings**: shipping fee, COD rules, policy values (what `config.js` holds today).
7. Login for you and any staff, with no customer accounts needed.

## Options

| Option | What it is | Covers | Cost | Effort | Trade-off |
|---|---|---|---|---|---|
| **A. Git-based CMS** (Pages CMS or Decap CMS) | An `/admin` page that edits the same files and commits to GitHub; Vercel redeploys | 1, 2 (with an auto-resize step), 6 | Free | Small (1–2 days) | Editors need GitHub logins; no stock or orders |
| **B. Google Sheet as the catalogue** | Products and stock in a Sheet, photos in Drive or Cloudinary; the site reads the Sheet; an Apps Script logs orders to another tab | 1, 2, 3, 4 (basic) | Free | Medium (3–5 days) | Familiar and flexible; less polished, easy to break a column |
| **C. Custom admin on Supabase** | A proper database (products, stock, orders) with a login-protected dashboard on the same Vercel site | All 7 | Free tier to start (then about ₹2,000/month) | Larger (2–3 weeks) | Most capable, and the data is yours for investors; needs ongoing maintenance |
| **D. Move to Shopify or Dukaan** | A hosted store with its own admin, apps and Shiprocket/Razorpay integrations | All 7 and more | Shopify about ₹1,500–2,000/month plus fees; Dukaan less | Medium (migrate products and design) | Least maintenance; monthly cost; less control over design |

## Recommendation

- **Short term (when you're ready):** **Option B**. It adds stock and automatic order logging, the two gaps that cost real money (overselling, lost orders), without monthly fees. It can be built so the Sheet is the single source of truth.
- **Before an investor pitch or above about 10 orders a day:** move to **Option C**, or to **D** if you'd rather not maintain software. Both give reliable order history and metrics. The Sheet data from Option B migrates straight across.

## Decisions needed from the owner

1. Who will manage the catalogue day to day: you, a family member, staff?
2. How many products do you expect in 6 months: 15, 50, 200?
3. Is a monthly software cost acceptable (Shopify), or should it stay free for now?
4. Do you want order logging now, ahead of the full dashboard? It's the most valuable single piece and can be done alone.
