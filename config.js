// Store settings — edit these, commit, and the live site updates.
// Values marked TODO are placeholders that must be replaced before launch
// (see LAUNCH_CHECKLIST.md).
window.STORE = {
  name: "Little Oat", // TODO brand name
  tagline: "Soft cotton clothes for little ones",
  siteUrl: "https://order-priority.vercel.app",

  // WhatsApp number in international format, digits only (e.g. 919876543210).
  // Orders from the bag are sent here as a pre-filled message.
  whatsapp: "910000000000", // TODO
  phoneDisplay: "+91 00000 00000", // TODO shown on contact & policy pages
  email: "hello@littleoat.in", // TODO
  instagram: "https://instagram.com/", // TODO

  // Legal details — shown on Contact and policy pages (required by the
  // Consumer Protection (E-Commerce) Rules, 2020 and by payment gateways).
  legalName: "[Registered business name]", // TODO
  address: "[Street, Area, City, State – PIN]", // TODO
  gstin: "", // optional; leave empty if not registered
  grievanceOfficer: "[Name]", // TODO

  currency: "₹",
  sizes: ["0–3M", "3–6M", "6–12M", "12–18M", "18–24M"],

  // Shipping & payment
  freeShippingAbove: 999,
  shippingFee: 79, // TODO charged below freeShippingAbove
  dispatchDays: "1–2",
  deliveryDays: "3–7",
  cod: { enabled: true, fee: 49, minOrder: 499 }, // TODO cash on delivery rules

  // Returns
  exchangeDays: 7,
  damageReportHours: 48,
  refundDays: "5–7",
};
