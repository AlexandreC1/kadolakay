import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@kadolakay.com" },
    update: {},
    create: {
      email: "demo@kadolakay.com",
      name: "Marie Jean-Baptiste",
      preferredLocale: "ht",
      emailVerified: new Date(),
    },
  });

  console.log("Created user:", user.name);

  // Create baby shower registry
  const babyRegistry = await prisma.registry.upsert({
    where: { slug: "fet-ti-bebe-marie" },
    update: {},
    create: {
      slug: "fet-ti-bebe-marie",
      userId: user.id,
      type: "BABY_SHOWER",
      status: "PUBLISHED",
      title: "Fèt Ti Bebe Marie & Pierre",
      description:
        "Nou kontan anpil pou nou pataje jwa sa a avèk nou! Ti bebe a ap vini nan mwa Jiyè. Mèsi pou tout kado ak sipò nou.",
      eventDate: new Date("2026-07-15"),
      locale: "ht",
      isPublic: true,
    },
  });

  // Create baby shower items
  const babyItems = [
    {
      title: "Bèso pou ti bebe",
      description: "Bèso ki ka balanse, koulè blan",
      priceHTG: 8750,
      priceUSD: 50,
      source: "CUSTOM" as const,
    },
    {
      title: "Kouch Pampers (Size 1)",
      description: "Bwat 120 kouch",
      priceHTG: 3500,
      priceUSD: 20,
      source: "AMAZON" as const,
      externalUrl: "https://www.amazon.com/dp/B0BYNFSD8Z",
    },
    {
      title: "Rad pou ti bebe (0-3 mwa)",
      description: "Ansamn 5 pyès rad koulè pastel",
      priceHTG: 2625,
      priceUSD: 15,
      source: "CUSTOM" as const,
    },
    {
      title: "Bibwon ak akseswa",
      description: "Kit 3 bibwon Avent + bwòs netwayaj",
      priceHTG: 4375,
      priceUSD: 25,
      source: "AMAZON" as const,
      externalUrl: "https://www.amazon.com/dp/B08LKDFN8N",
    },
    {
      title: "Poussèt bebe",
      description: "Poussèt ki pliye fasil, koulè gri",
      priceHTG: 17500,
      priceUSD: 100,
      source: "CUSTOM" as const,
    },
    {
      title: "Matla pou bèso",
      description: "Matla fèm pou sekirite ti bebe a",
      priceHTG: 7000,
      priceUSD: 40,
      source: "CUSTOM" as const,
    },
  ];

  for (const item of babyItems) {
    await prisma.registryItem.create({
      data: {
        registryId: babyRegistry.id,
        ...item,
      },
    });
  }

  console.log("Created baby shower registry with", babyItems.length, "items");

  // Create wedding registry
  const weddingRegistry = await prisma.registry.upsert({
    where: { slug: "maryaj-jean-rose" },
    update: {},
    create: {
      slug: "maryaj-jean-rose",
      userId: user.id,
      type: "WEDDING",
      status: "PUBLISHED",
      title: "Maryaj Jean & Rose",
      description:
        "Avèk anpil lajwa, nou envite nou nan maryaj nou! Nou swete pataje moman espesyal sa a avèk tout fanmi ak zanmi nou yo.",
      eventDate: new Date("2026-09-20"),
      locale: "ht",
      isPublic: true,
    },
  });

  const weddingItems = [
    {
      title: "Sèvis asyèt (8 pèson)",
      description: "Asyèt pòslèn blan ak bòdi dore",
      priceHTG: 14000,
      priceUSD: 80,
      source: "CUSTOM" as const,
    },
    {
      title: "Sèvis vè kristal",
      description: "12 vè diven + 12 vè dlo",
      priceHTG: 10500,
      priceUSD: 60,
      source: "CUSTOM" as const,
    },
    {
      title: "Dra kabann (Queen)",
      description: "Dra koton ejipsyen 400 fil, koulè blan",
      priceHTG: 8750,
      priceUSD: 50,
      source: "AMAZON" as const,
      externalUrl: "https://www.amazon.com/dp/B07BQDFZ92",
    },
    {
      title: "Blendè Ninja",
      description: "Blendè pwofesyonèl 1000W",
      priceHTG: 12250,
      priceUSD: 70,
      source: "AMAZON" as const,
      externalUrl: "https://www.amazon.com/dp/B07SQWJVKS",
    },
    {
      title: "Sèvis kouto kwizin",
      description: "Ansamn 8 kouto ak blòk bwa",
      priceHTG: 7000,
      priceUSD: 40,
      source: "CUSTOM" as const,
    },
  ];

  for (const item of weddingItems) {
    await prisma.registryItem.create({
      data: {
        registryId: weddingRegistry.id,
        ...item,
      },
    });
  }

  console.log("Created wedding registry with", weddingItems.length, "items");

  // Create a business owner
  const bizOwner = await prisma.user.upsert({
    where: { email: "bizowner@kadolakay.com" },
    update: {},
    create: {
      email: "bizowner@kadolakay.com",
      name: "Jacques Desrosiers",
      preferredLocale: "ht",
      emailVerified: new Date(),
      role: "BUSINESS_OWNER",
    },
  });

  // Create a business
  const business = await prisma.business.upsert({
    where: { slug: "mezon-jacques" },
    update: {},
    create: {
      slug: "mezon-jacques",
      ownerId: bizOwner.id,
      name: "Mezon Jacques",
      description:
        "Mèb ak dekorasyon lakay ou. Nou fè mèb sou kòmand avèk bwa lokal ayisyen.",
      category: "furniture",
      city: "Petion-Ville",
      department: "Ouest",
      phone: "+50937001234",
      whatsapp: "+50937001234",
      status: "APPROVED",
    },
  });

  // Create products for the business
  const products = [
    {
      name: "Tab manje an bwa",
      description: "Tab 6 plas, bwa mango lokal",
      priceHTG: 35000,
      priceUSD: 200,
      category: "furniture",
    },
    {
      name: "Chèz balkon",
      description: "Chèz baskil an bwa sèd",
      priceHTG: 8750,
      priceUSD: 50,
      category: "furniture",
    },
    {
      name: "Etajè liv",
      description: "Etajè 5 nivo, bwa kajou",
      priceHTG: 15750,
      priceUSD: 90,
      category: "furniture",
    },
    {
      name: "Kanapè 3 plas",
      description: "Kanapè modèn avèk kouvèti koulè ble",
      priceHTG: 52500,
      priceUSD: 300,
      category: "furniture",
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        businessId: business.id,
        ...product,
      },
    });
  }

  console.log("Created business:", business.name, "with", products.length, "products");

  // Create admin user
  await prisma.user.upsert({
    where: { email: "admin@kadolakay.com" },
    update: {},
    create: {
      email: "admin@kadolakay.com",
      name: "Admin KadoLakay",
      preferredLocale: "ht",
      emailVerified: new Date(),
      role: "ADMIN",
    },
  });

  console.log("Created admin user");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
