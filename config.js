// Fallback store settings, used only when the admin database can't be
// reached. Once the admin is set up, edit settings in /admin → Settings.
window.STORE = {
  name: "Wynoak",
  tagline: "Grown to last.",
  siteUrl: "https://order-priority.vercel.app",

  // WhatsApp number in international format, digits only (e.g. 919876543210).
  // Orders from the bag are sent here as a pre-filled message.
  whatsapp: "918076449307",
  phoneDisplay: "+91 80764 49307", // shown on contact & policy pages
  email: "yugayugarg5@gmail.com",
  instagram: "", // TODO add once the account exists (empty = link hidden)

  // Legal details — shown on Contact and policy pages (required by the
  // Consumer Protection (E-Commerce) Rules, 2020 and by payment gateways).
  legalName: "[Registered business name]", // TODO
  address: "[Street, Area, City, State – PIN]", // TODO
  gstin: "", // optional; leave empty if not registered
  grievanceOfficer: "[Name]", // TODO

  supportHours: "Mon – Sat, 10 am – 7 pm IST",
  currency: "₹",
  sizes: ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M"],

  // Shipping & payment
  freeShippingAbove: 999,
  shippingFee: 79, // charged below freeShippingAbove
  dispatchDays: "1–2",
  deliveryDays: "3–7",
  cod: { enabled: true, fee: 49, minOrder: 499 }, // cash on delivery rules

  // Returns
  exchangeDays: 7,
  damageReportHours: 48,
  refundDays: "5–7",
};
