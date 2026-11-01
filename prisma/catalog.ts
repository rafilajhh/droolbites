// Shop catalog and store-setting defaults shared by the demo seed (prisma/seed.ts)
// and the production seed (prisma/seed-production.ts).

export const categories = [
  { name: "Soft cookies", slug: "soft-cookies" },
  { name: "Brownies", slug: "brownies" },
  { name: "Tiramisu", slug: "tiramisu" },
];

export const products = [
  {
    category: "soft-cookies",
    name: "Chocolate Chunk",
    slug: "chocolate-chunk",
    description: "Buttery dough with dark chocolate chunks.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "Double Chocolate",
    slug: "double-chocolate",
    description: "Soft cocoa dough with chocolate chunks.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "Red Velvet",
    slug: "red-velvet",
    description: "Red velvet dough with white chocolate pieces.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "soft-cookies",
    name: "White Chocolate Almond",
    slug: "white-chocolate-almond",
    description: "White chocolate and roasted almonds.",
    variants: [{ name: "1 piece", price: 5000 }],
  },
  {
    category: "brownies",
    name: "Fudgy Brownies",
    slug: "fudgy-brownies",
    description: "The same fudgy chocolate brownie in four tray sizes.",
    variants: [
      { name: "10 × 10 cm", price: 15000 },
      { name: "15 × 15 cm", price: 35000 },
      { name: "20 × 20 cm", price: 60000 },
      { name: "20 × 30 cm", price: 90000 },
    ],
  },
  {
    category: "tiramisu",
    name: "Classic Coffee Tiramisu",
    slug: "classic-coffee-tiramisu",
    description: "Coffee, mascarpone cream and cocoa.",
    variants: [{ name: "1 portion", price: 20000 }],
  },
  {
    category: "tiramisu",
    name: "Matcha Tiramisu",
    slug: "matcha-tiramisu",
    description: "Matcha sponge and mascarpone cream.",
    variants: [{ name: "1 portion", price: 20000 }],
  },
];

/** Product photos shipped in public/images/products. */
export function productImageUrl(slug: string) {
  return `/images/products/${slug}.png`;
}

/** The single store_settings row (id = 1); editable later in Admin › Store settings. */
export const storeSettings = {
  id: 1,
  storeName: "Droolbites",
  city: "Surabaya",
  email: "hello@droolbites.biz.id",
  phone: "+62 896 7562 4486",
  address: "Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya",
  opensAt: "10:00",
  closesAt: "21:00",
  deliveryFee: 15000,
};
