// The product catalogue. Edit names, prices and descriptions here.
// `id` must match a folder slug in scripts/build-images.py (images come from data/images.js).
// `colours` lists colour keys in display order; the first one is shown by default.
// `mrp` is optional — when set higher than `price`, the card shows a strike-through.

window.COLOURS = {
  default: { label: "As shown", hex: "#e9ddd0" },
  mustard: { label: "Mustard", hex: "#d9a84e" },
  rose: { label: "Dusty Rose", hex: "#d49a98" },
  teal: { label: "Teal", hex: "#5f9a98" },
  peach: { label: "Peach", hex: "#f1b894" },
  pink: { label: "Pink", hex: "#eeb3c0" },
  pistachio: { label: "Pistachio", hex: "#b6c99a" },
  blue: { label: "Blue", hex: "#6d8fc0" },
  red: { label: "Red", hex: "#c9453e" },
  green: { label: "Green", hex: "#8fc45a" },
  orange: { label: "Orange", hex: "#ec9146" },
  yellow: { label: "Yellow", hex: "#f2d04f" },
  camel: { label: "Camel", hex: "#c9a883" },
  grey: { label: "Grey", hex: "#a5a5a5" },
  cream: { label: "Cream", hex: "#f3ead8" },
  black: { label: "Black & White", hex: "#3a3a3a" },
  sage: { label: "Sage Grey", hex: "#8b9585" },
  olive: { label: "Olive", hex: "#6f7352" },
  slate: { label: "Slate", hex: "#5f6b6e" },
  brown: { label: "Brown", hex: "#8a6542" },
  plum: { label: "Plum", hex: "#9a5470" },
  beige: { label: "Beige", hex: "#dccab0" },
  ivory: { label: "Ivory", hex: "#f5efdc" },
  navy: { label: "Navy", hex: "#2c3a5c" },
  aqua: { label: "Aqua", hex: "#4cc3d9" },
  rust: { label: "Rust", hex: "#c8795a" },
};

window.CATEGORIES = [
  { id: "newborn", label: "Newborn", blurb: "First-week softness" },
  { id: "rompers", label: "Rompers & Sleepsuits", blurb: "Easy snaps, all-day comfort" },
  { id: "sets", label: "Top & Bottom Sets", blurb: "Mix, match, play" },
  { id: "dungarees", label: "Dungarees", blurb: "Little overalls, big smiles" },
  { id: "winter", label: "Winter Wear", blurb: "Cosy hooded suits" },
  { id: "night", label: "Nightwear", blurb: "Sweet-dream prints" },
];

window.PRODUCTS = [
  {
    id: "zebra-hooded-suit", name: "Zebra Stripe Hooded Suit", category: "winter",
    price: 1049, mrp: 1399, colours: ["green", "mustard", "red"], badge: "Bestseller",
    description: "A plush, fleece-lined hooded suit with a playful zebra print, built-in feet and fold-over mittens. Front zip for quick changes.",
  },
  {
    id: "mickey-dungaree-set", name: "Mickey Dungaree Set with Cap", category: "dungarees",
    price: 899, mrp: 1199, colours: ["camel", "grey", "pink"], badge: "New",
    description: "Soft cotton dungarees over a crew-neck tee, finished with a matching ear cap. Adjustable straps with snap buttons.",
  },
  {
    id: "zip-bomber-jogger-set", name: "Zip Bomber & Jogger Set", category: "sets",
    price: 999, mrp: 1299, colours: ["olive", "sage", "slate", "brown", "plum", "beige"],
    description: "A utility-style zip jacket with chest pockets and a teddy patch, paired with ribbed-cuff joggers. Brushed cotton for warmth without bulk.",
  },
  {
    id: "checked-hooded-jumpsuit", name: "Checked Hooded Jumpsuit", category: "winter",
    price: 1099, mrp: 1449, colours: ["mustard", "pink", "pistachio"],
    description: "A warm, quilted plaid jumpsuit with a snug hood and a cute bear appliqué. Easy full-length zip.",
  },
  {
    id: "star-cloud-jogger-set", name: "Star Cloud Top & Jogger Set", category: "sets",
    price: 749, mrp: 999, colours: ["rust", "blue"], badge: "New",
    description: "A long-sleeve tee with a smiley cloud appliqué and star-print joggers with a drawstring waist.",
  },
  {
    id: "newborn-cap-bib-set", name: "Newborn Set with Cap, Bib & Mittens", category: "newborn",
    price: 749, mrp: 949, colours: ["aqua", "cream", "peach"],
    description: "Everything for the first weeks: a soft tee and shorts, a matching bib, a cap and scratch mittens — all in gentle cotton.",
  },
  {
    id: "sleeveless-button-romper", name: "Sleeveless Button Romper", category: "rompers",
    price: 549, mrp: 699, colours: ["green", "orange", "yellow"],
    description: "A breezy summer romper with a button front and patch pockets, in bright, happy colours.",
  },
  {
    id: "tiger-stripe-suit", name: "Tiger Stripe Hooded Suit", category: "winter",
    price: 1099, mrp: 1399, colours: ["orange", "red", "black"],
    description: "A bold stripe fleece suit with a panda patch, a cosy hood and footed legs to keep little toes warm.",
  },
  {
    id: "double-top-set", name: "Cotton Vest & Tee Set", category: "sets",
    price: 799, mrp: 999, colours: ["mustard", "rose", "teal"],
    description: "A layered look: a printed long-sleeve tee under a snap-front vest, with matching pants.",
  },
  {
    id: "little-star-cardigan-set", name: "Daddy's Little Star Cardigan Set", category: "sets",
    price: 749, mrp: 949, colours: ["blue", "red"],
    description: "A button-front cardigan with a sweet embroidered message, paired with printed pull-on pants.",
  },
  {
    id: "hooded-teddy-suit", name: "Hooded Teddy Suit", category: "winter",
    price: 999, mrp: 1299, colours: ["cream", "pistachio", "pink"],
    description: "A soft, printed hooded suit with a bear patch, built-in mittens and feet. Made for chilly mornings and naps.",
  },
  {
    id: "zip-fleece-suit", name: "Zip Fleece Hooded Suit", category: "winter",
    price: 949, mrp: 1199, colours: ["default"],
    description: "A rosy fleece hooded suit with a full zip, embroidered patch and contrast cuffs.",
  },
  {
    id: "striped-dungaree-set", name: "Striped Tee & Dungaree Set", category: "dungarees",
    price: 849, mrp: 1099, colours: ["default"],
    description: "Olive cotton dungarees with a cute patch, paired with a classic striped tee.",
  },
  {
    id: "duck-stripe-set", name: "Duck Stripe Tee & Pants Set", category: "sets",
    price: 649, mrp: 849, colours: ["blue", "peach"],
    description: "A fun character tee with candy stripes, and matching pull-on pants.",
  },
  {
    id: "collar-sleepsuit", name: "Printed Collar Sleepsuit", category: "rompers",
    price: 699, mrp: 899, colours: ["beige", "ivory"],
    description: "A soft all-in-one with a Peter Pan collar, tiny all-over prints and a snap front.",
  },
  {
    id: "sleeveless-vest-set", name: "Sleeveless Vest & Shorts Set", category: "sets",
    price: 599, mrp: 749, colours: ["navy", "red", "yellow"],
    description: "A smart snap-front vest over a printed tee, with matching shorts. Perfect for warm days.",
  },
  {
    id: "hello-baby-set", name: "Hello Baby Tee, Shorts & Cap", category: "sets",
    price: 599, mrp: 799, colours: ["default"],
    description: "A striped maroon tee with a lion appliqué, easy shorts and a matching beanie.",
  },
  {
    id: "printed-night-suit", name: "Printed Night Suit", category: "night",
    price: 699, mrp: 899, colours: ["peach", "pink"],
    description: "A classic button-up night suit in breathable cotton, covered in playful prints for sweet dreams.",
  },
];
