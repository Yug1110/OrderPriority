# Policy and claims review sheet

Everything below is **draft wording that I wrote**. Go through the list and mark each line ✅ (true as written) or write the correct version. I'll then update the site in one pass.

Most numbers (days, fees) live in `config.js`, so correcting them there updates every page at once.

## A. Numbers and promises (in `config.js`)

| # | Promise on the site | Current value | Where it appears | Your answer |
|---|---|---|---|---|
| 1 | Dispatch time | 1–2 working days | Shipping page, home, product pages | |
| 2 | Delivery time after dispatch | 3–7 working days | Shipping page | |
| 3 | No dispatch on Sundays and public holidays | yes | Shipping page | |
| 4 | Size exchange window | 7 days from delivery | Returns page, home, product pages | |
| 5 | Damaged or wrong item must be reported within | 48 hours, with photos or an unboxing video | Returns page | |
| 6 | Refund processing time | 5–7 working days | Returns page | |
| 7 | First size exchange per order is free | yes | Returns page | |
| 8 | Support hours | Mon–Sat, 10 am – 7 pm (you confirmed) | Contact page | ✅ |
| 9 | Free shipping from ₹999, otherwise ₹79 | (you confirmed) | Bag, shipping page | ✅ |
| 10 | COD: ₹49 fee, ₹499 minimum | (you confirmed) | Checkout, shipping page | ✅ |

## B. Policy rules (in the policy `.html` pages)

| # | Rule | Page | Your answer |
|---|---|---|---|
| 11 | No returns for change of mind (hygiene); size exchanges only | Returns | |
| 12 | Items sold as a set are exchanged as a complete set | Returns | |
| 13 | If the size is out of stock: choose another product or get store credit | Returns | |
| 14 | Orders can be cancelled any time before dispatch | Returns | |
| 15 | COD refunds go to a UPI ID or bank account the customer provides | Returns | |
| 16 | Shipping and COD fees are refunded only when the mistake was ours | Returns | |
| 17 | Re-shipping is charged if a parcel returns because of a wrong address or no one being available | Shipping | |
| 18 | Refusing a COD parcel may make future orders prepaid-only | Shipping | |
| 19 | Pincode not serviceable: tell the customer and refund in full | Shipping | |
| 20 | Order records kept up to 8 years (tax records) | Privacy | |
| 21 | Disputes go to the courts in your registered city (needs the city once you have an address) | Terms | |
| 22 | Complaints acknowledged within 48 hours and resolved within one month | Contact | Required by law; keep |

## C. Product claims (in `data/products.js`)

Please confirm the **fabric** of each product. If you know the composition (e.g. "100% cotton", "cotton-poly fleece"), send it: showing it builds trust, and it's expected on the care label anyway.

| # | Product | Claim to check |
|---|---|---|
| 23 | Zip Bomber & Jogger Set | "Brushed cotton for warmth without bulk" |
| 24 | Checked Hooded Jumpsuit | "warm, quilted" |
| 25 | Newborn Set with Cap, Bib & Mittens | "all in gentle cotton" |
| 26 | Tiger Stripe Hooded Suit | "fleece suit", "footed legs" |
| 27 | Hooded Teddy Suit | "built-in mittens and feet" |
| 28 | Zip Fleece Hooded Suit | "fleece" |
| 29 | Striped Tee & Dungaree Set | "Olive cotton dungarees" |
| 30 | Printed Night Suit | "breathable cotton" |
| 31 | Cotton Vest & Tee Set | "Cotton" in the product name |
| 32 | Printed Collar Sleepsuit | "snap front" |
| 33 | All products | Care text: "Machine wash cold, inside out… no bleach. Tumble dry low or line dry in shade." |
| 34 | All products | Size chart (weights, heights, chest in `size-guide.html` and the product-page size guide). Measure your garments if possible |

## D. Already changed to be safe (no action needed unless you disagree)

- Site-wide "Soft cotton" and "Breathable cotton" badges became **"Gentle fabrics"** / **"Soft, gentle fabrics"**, because they appeared next to fleece winter suits.
- "Skin-safe colours" became **"Made to hand down"**, since a skin-safety claim needs dye test certificates.
- The Privacy policy now mentions that Vercel (hosting) and Google Fonts receive technical data such as IP addresses.
- The Terms say product photos "are for illustration and may be styled". Keep this, since some photos are AI-generated.
