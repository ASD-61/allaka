/**
 * Seeds the real vegetable catalog for عـلاّكـة (Allaka).
 *
 * Replaces any ad-hoc/placeholder products created via the admin dashboard
 * during development with the shop's real categories and products —
 * real Arabic names, IQD prices, units, and photos already uploaded to
 * object storage (see `imageUrl` below; each path was produced by the same
 * presigned-upload flow the admin dashboard uses at
 * `POST /api/storage/uploads/request-url`).
 *
 * Usage: pnpm --filter @workspace/scripts run seed:catalog
 *
 * Safe to re-run: both `categories` and `products` are fully cleared and
 * reinserted inside a single transaction, so the tables always end up
 * matching this fixture exactly (no stale test/placeholder rows survive)
 * and a failure midway can't leave a half-seeded catalog.
 */
import { db, categoriesTable, productsTable, pool } from "@workspace/db";

interface ProductSeed {
  name: string;
  category: string;
  price: number;
  unit: string;
  imageUrl: string;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: "طماطم بلدي",
    category: "طماطم وفلفل",
    price: 2000,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/2b7630e2-aa08-4c64-8754-10bf16d36f61",
  },
  {
    name: "فلفل رومي ملون",
    category: "طماطم وفلفل",
    price: 3000,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/569c6630-5f42-4b86-a4c6-e26980593cca",
  },
  {
    name: "فلفل حار أخضر",
    category: "طماطم وفلفل",
    price: 2200,
    unit: "250 غم",
    imageUrl: "/api/storage/objects/uploads/964d67ce-8ac0-46af-98f4-e416e0c420c5",
  },
  {
    name: "خيار طازج",
    category: "قرعيات",
    price: 1500,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/7e5ec025-5d1b-4c14-b156-d09ab09b62e7",
  },
  {
    name: "باذنجان بلدي",
    category: "قرعيات",
    price: 1700,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/fd864646-ac66-4e43-b6fc-d8b55a901b48",
  },
  {
    name: "كوسا",
    category: "قرعيات",
    price: 1400,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/a469fef0-f8cf-4a68-8bf5-71846e9da1d4",
  },
  {
    name: "بصل أصفر",
    category: "بصليات",
    price: 1000,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/90110240-b409-45a2-bac3-1c4cd148838c",
  },
  {
    name: "ثوم بلدي",
    category: "بصليات",
    price: 2500,
    unit: "250 غم",
    imageUrl: "/api/storage/objects/uploads/8bf23cef-d9f6-4a8a-8a6c-4f967528027f",
  },
  {
    name: "سبانخ ورقية",
    category: "ورقيات",
    price: 1800,
    unit: "500 غم",
    imageUrl: "/api/storage/objects/uploads/a24939c0-f464-4b01-8916-787b2b889711",
  },
  {
    name: "خس روماني",
    category: "ورقيات",
    price: 1400,
    unit: "حبة",
    imageUrl: "/api/storage/objects/uploads/6deddb3f-b38d-451b-b88f-5a935acc1022",
  },
  {
    name: "كرفس",
    category: "ورقيات",
    price: 1600,
    unit: "باقة",
    imageUrl: "/api/storage/objects/uploads/81209b69-c864-42ed-9ecb-cc5b0940ec67",
  },
  {
    name: "جزر أحمر",
    category: "جذريات",
    price: 1300,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/20f30417-9981-4ac6-8489-440b759313d6",
  },
  {
    name: "بطاطا",
    category: "جذريات",
    price: 1200,
    unit: "1 كغم",
    imageUrl: "/api/storage/objects/uploads/af67c00e-0a49-41b1-802a-904b2adc8a6d",
  },
  {
    name: "فجل أحمر",
    category: "جذريات",
    price: 900,
    unit: "باقة",
    imageUrl: "/api/storage/objects/uploads/7d455368-4ec1-4755-b00c-368ad1ae4fb5",
  },
  {
    name: "نعناع طازج",
    category: "أعشاب وتوابل",
    price: 800,
    unit: "باقة",
    imageUrl: "/api/storage/objects/uploads/14eae9e0-9d60-4a11-9872-e580327f26d4",
  },
  {
    name: "بقدونس",
    category: "أعشاب وتوابل",
    price: 500,
    unit: "باقة",
    imageUrl: "/api/storage/objects/uploads/a78d1c9f-99a8-4cf1-befb-c062a51149fd",
  },
];

async function seed() {
  const categoryNames = [...new Set(PRODUCTS.map((p) => p.category))];

  await db.transaction(async (tx) => {
    console.log("Clearing existing products and categories (placeholder/test data)...");
    await tx.delete(productsTable);
    await tx.delete(categoriesTable);

    console.log(`Inserting ${categoryNames.length} real categories...`);
    await tx.insert(categoriesTable).values(categoryNames.map((name) => ({ name })));

    console.log(`Inserting ${PRODUCTS.length} real products...`);
    await tx.insert(productsTable).values(PRODUCTS);
  });

  console.log("Done.");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
