# Using the Wynoak admin

Open **https://order-priority.vercel.app/admin/** on a phone or computer and log in. Changes appear on the shop within about a minute.

## Daily order routine
1. **Orders** shows new orders with a red count in the menu. Every website checkout is saved automatically, even if the customer never presses *Send* in WhatsApp.
2. Open an order and check the WhatsApp chat from the customer (it carries the same order ID).
3. **Prepaid:** tap **💬 Confirm & send payment link**, paste your Razorpay/UPI link into the message and send. When the money arrives, set the status to **Paid**.
   **COD:** tap **💬 Confirm COD order**, then set the status to **Confirmed**.
4. Moving to **Confirmed** (or any later status) **takes the items out of stock**. **Cancelled** or **Returned** puts them back.
5. Pack the order, then set **Packed**.
6. Book the shipment: on the **Orders** page, **⬇ Export CSV (Shiprocket)** gives a file in Shiprocket's bulk-import layout. Upload it in Shiprocket, or type the order in by hand. Check the weight and box size columns (defaults: 0.3 kg, 25×20×5 cm).
7. Enter the **Courier** and **Tracking** number on the order, click **Save changes**, set **Shipped**, and tap **💬 Shipped with tracking**.
8. When it arrives, set **Delivered** and tap **💬 Delivered — thank you**.

Orders placed with the product page's **"Order on WhatsApp"** button have no address yet. Collect the details in the chat and type them into the order.

Sales that come in by phone, Instagram or in person: **Orders → + Add order**, so they count in your numbers.

## Products
- **Products → + Add product:** name, price, MRP (optional), category, description, fabric. Then **+ Add colour**, name it, and **+ Add photos** (straight from your phone camera roll; photos are resized automatically). The first photo is the main one; use ← → to reorder.
- **Stock by size:** type a number per size. **Leave it blank** if you don't want to track that size (it's always available). **0** shows "Sold out" and blocks orders for that size.
- **Live** switch (list or edit page): hides or shows a product on the shop without deleting it.
- **↑ ↓ arrows** in the list set the order on the shop. The top 8 appear as *New arrivals* on the home page.
- **Duplicate** makes a copy to start a similar product quickly.

## Dashboard
Revenue, confirmed orders, average order value, COD share, cancellations, the order pipeline, revenue by day, top products and **low-stock alerts** (2 or fewer left). Revenue counts orders that are Confirmed or later and not cancelled or returned.

## Settings
Brand, WhatsApp number, support email and hours, business details (for the Contact and policy pages), shipping fee, the free-shipping amount, COD rules, policy days and sizes. Changing the brand name here updates the shop, but the link-preview image and page titles need a code update.

## Team
**Team → Add someone:** you get a one-time link to send them (for example on WhatsApp). They open it and choose a password. Links work once, within 24 hours. **Password-reset link** does the same for someone who forgot their password. Everyone on the team has full access. **Remove** takes access away.
