# Legal and business setup plan (India)

**Status:** plan only; the owner will take this up last. This is general guidance, not legal or tax advice. **Confirm every step with a Chartered Accountant (CA) before acting.** A one-time consultation typically costs ₹1,000–3,000 and is worth it.

## ⚠️ Most important: GST

**GST registration is compulsory from your first sale if you ship to other states.** An online store delivering across India makes inter-state supplies, and the usual turnover exemption (₹40 lakh for goods in most states, lower in some) doesn't apply to inter-state supplies of goods. The lighter composition scheme isn't available for inter-state sales either.

What this means in practice:
- Either register for GST before launch and sell pan-India, or sell only within your own state until you register.
- Baby garments are currently taxed at **5% when the sale price per piece is up to ₹2,500**, after the September 2025 rate changes. Confirm the current rate with your CA. Your prices already say "inclusive of all taxes", so GST comes out of your margin; include it in the unit economics.
- You'll need to issue a GST invoice with each order (Zoho Invoice, Vyapar or Shiprocket can generate them) and file returns (monthly or quarterly).

## Recommended order of steps

| # | Step | Why | How / cost |
|---|---|---|---|
| 1 | **Choose the structure: sole proprietorship now, Private Limited later** | A sole proprietorship needs no incorporation and is fastest. Investors almost always need a Pvt Ltd, so incorporate before raising money | Proprietorship: nothing to register as such. Pvt Ltd: SPICe+ form on the MCA portal, about ₹7,000–15,000 through a CA or online service |
| 2 | **Udyam (MSME) registration** | Free official proof of business; helps open a current account and get small-business benefits (lower trademark fees) | udyamregistration.gov.in with Aadhaar and PAN; free, same day |
| 3 | **GST registration** | Required for inter-state sales (see above) | gst.gov.in, free; needs PAN, Aadhaar, address proof, bank details; about 3–7 working days |
| 4 | **Current bank account** in the business name | Payment gateways, Shiprocket COD remittances and clean books | Any bank; bring Udyam and/or GST certificate |
| 5 | **Shop & Establishment registration** | Required in many states for a place of business (rules differ by state; some exempt home businesses without employees) | State labour department portal; ask your CA |
| 6 | **Trademark "Wynoak"**: search, then file | Protects the name; investors will ask | IP India search (class 25 clothing, class 35 retail), then e-file form TM-A. Official fee about ₹4,500 per class for individuals, startups and small enterprises (₹9,000 otherwise). You can use the ™ symbol right after filing and ® after registration |
| 7 | **Payment gateway KYC** (Razorpay) | Accept prepaid orders | Needs PAN, bank account, business proof and the website with policy pages (done) |
| 8 | **Fill in the business details on the site** | Required by the Consumer Protection (E-Commerce) Rules, 2020 | Legal name, address, grievance officer (see the reminder list) |
| 9 | **Packaging labels** | Legal Metrology (Packaged Commodities) Rules, 2011 | See the checklist below |
| 10 | **Bookkeeping** | GST returns, income tax, investor due diligence | Zoho Books or Vyapar, plus a CA for filings |

## E-commerce rules checklist (Consumer Protection (E-Commerce) Rules, 2020)

Selling your own stock on your own website makes you an "inventory e-commerce entity". You must show:

- ✅ Return, refund, exchange, cancellation and shipping policies (pages exist; wording under review)
- ✅ Prices including all taxes, with all charges (shipping, COD fee) shown before ordering
- ✅ Payment methods and a secure way to pay
- ✅ Grievance officer, with complaints acknowledged within 48 hours and resolved within one month (the text exists, but the name is still a placeholder)
- ⬜ Legal name, geographic address, customer-care contact (placeholders are live)
- ⬜ **Country of origin** for each product (not on product pages yet; I can add it once you confirm)
- ⬜ No fake reviews, and no misleading discounts. The MRP shown struck through must be a genuine price, not an inflated one

## Packaging label checklist (Legal Metrology)

Each packed garment should carry:
- Name and full address of the manufacturer, or of the packer/marketer if you brand products from a supplier
- Country of origin (and the importer's details if imported)
- Common name of the product (e.g. "Infant romper set")
- Net quantity (number of pieces in the pack) and size
- Month and year of manufacture or packing
- MRP, "inclusive of all taxes"
- Consumer care contact: phone and email

Also include the fibre composition and care instructions on the garment label.

The website's product pages should show the same key declarations (manufacturer/packer, country of origin, net quantity). I can add these fields to `data/products.js` once you have them.

## Data protection (DPDP Act, 2023)

- ✅ A privacy policy exists and explains what is collected and why
- ⬜ Before sending marketing messages (WhatsApp broadcasts, SMS), collect explicit opt-in consent and keep a record of it
- ⬜ Keep the order sheet access-controlled (not "anyone with the link"), and delete old data you no longer need
- ⬜ Update the privacy policy before adding analytics or a Meta Pixel

## Other things to settle

- **Supplier terms:** written agreements on quality, defects, returns to the supplier and exclusivity if possible. Do you have the rights to sell under your own brand (private label)?
- **Image rights:** permission to use the supplier's or AI-generated photos commercially.
- **Before raising money:** incorporate the Pvt Ltd; assign the trademark application, domain, website code and social accounts to the company; founders' agreement; cap table. **Startup India (DPIIT) recognition** is free and can bring tax benefits and cheaper IP filings.
