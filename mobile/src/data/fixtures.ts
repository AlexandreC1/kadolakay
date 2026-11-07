import type { Business, Order, Product, Registry, User } from "./types";

/**
 * Demo data for the app while the mobile API is built. Lists and the first shop
 * come from the project's fictional seed (prisma/seed.ts); the other shops and
 * people are invented and must never be deployed as real inventory.
 */
export const demoUser: User = { id: "u-marie", name: "Marie Jean-Baptiste", email: "marie@example.com" };
export const demoMerchant: User = { id: "u-jacques", name: "Jacques Desrosiers", email: "jacques@example.com", businessSlug: "mezon-jacques" };

export const businesses: Business[] = [
  {
    slug: "mezon-jacques", ownerId: "u-jacques", name: "Mezon Jacques", category: "furniture", city: "Pétion-Ville", department: "Ouest",
    description: "Meubles en bois local, fabriqués à la main dans notre atelier de Pétion-Ville.",
    phone: "+509 0000-0001", whatsapp: "+509 0000-0001",
    fulfillmentPolicy: "Livraison à Port-au-Prince et Pétion-Ville sous 5 jours ouvrables. Retrait possible à l’atelier.",
    status: "APPROVED", since: "2026-03",
  },
  {
    slug: "ti-bebe-boutik", ownerId: "u-nadege", name: "Ti Bebe Boutik", category: "baby", city: "Delmas", department: "Ouest",
    description: "Tout pour l’arrivée de bébé : berceaux, vêtements, soins. Conseils en boutique.",
    whatsapp: "+509 0000-0002",
    fulfillmentPolicy: "Livraison dans la zone métropolitaine sous 3 jours. Emballage cadeau offert.",
    status: "APPROVED", since: "2026-05",
  },
  {
    slug: "kay-kizin", ownerId: "u-ronald", name: "Kay Kizin", category: "kitchen", city: "Cap-Haïtien", department: "Nord",
    description: "Vaisselle, ustensiles et petit électroménager pour la maison.",
    phone: "+509 0000-0003",
    fulfillmentPolicy: "Livraison au Cap-Haïtien sous 2 jours, envoi vers Port-au-Prince sous 6 jours.",
    status: "APPROVED", since: "2026-04",
  },
  {
    slug: "atelye-lakou", ownerId: "u-guerline", name: "Atelye Lakou", category: "crafts", city: "Jacmel", department: "Sud-Est",
    description: "Paniers tressés, papier mâché et linge de maison brodé par des artisanes de Jacmel.",
    whatsapp: "+509 0000-0004",
    fulfillmentPolicy: "Fabriqué sur commande : 7 à 10 jours. Livraison dans tout le pays.",
    status: "APPROVED", since: "2026-06",
  },
];

export const products: Product[] = [
  { id: "p-tab", businessSlug: "mezon-jacques", name: "Tab manje an bwa", description: "Tab 6 plas, bwa mango lokal", priceHTG: 35000, priceUSD: 200, stockQuantity: 3, category: "furniture" },
  { id: "p-chez", businessSlug: "mezon-jacques", name: "Chèz balkon", description: "Chèz baskil an bwa sèd", priceHTG: 8750, priceUSD: 50, stockQuantity: 8, category: "furniture" },
  { id: "p-etaje", businessSlug: "mezon-jacques", name: "Etajè liv", description: "Etajè 5 nivo, bwa kajou", priceHTG: 15750, priceUSD: 90, stockQuantity: 2, category: "furniture" },
  { id: "p-kanape", businessSlug: "mezon-jacques", name: "Kanapè 3 plas", description: "Kanapè modèn avèk kouvèti koulè ble", priceHTG: 52500, priceUSD: 300, stockQuantity: 0, category: "furniture" },
  { id: "p-beso", businessSlug: "ti-bebe-boutik", name: "Bèso pou ti bebe", description: "Bèso ki ka balanse, koulè blan", priceHTG: 8750, priceUSD: 50, stockQuantity: 4, category: "baby" },
  { id: "p-pousset", businessSlug: "ti-bebe-boutik", name: "Poussèt bebe", description: "Poussèt ki pliye fasil, koulè gri", priceHTG: 17500, priceUSD: 100, stockQuantity: 5, category: "baby" },
  { id: "p-matla", businessSlug: "ti-bebe-boutik", name: "Matla pou bèso", description: "Matla fèm pou sekirite ti bebe a", priceHTG: 7000, priceUSD: 40, stockQuantity: 6, category: "baby" },
  { id: "p-rad", businessSlug: "ti-bebe-boutik", name: "Rad pou ti bebe (0-3 mwa)", description: "Ansamn 5 pyès rad koulè pastel", priceHTG: 2625, priceUSD: 15, stockQuantity: 20, category: "baby" },
  { id: "p-asyet", businessSlug: "kay-kizin", name: "Sèvis asyèt (8 pèson)", description: "Asyèt pòslèn blan ak bòdi dore", priceHTG: 14000, priceUSD: 80, stockQuantity: 7, category: "kitchen" },
  { id: "p-ve", businessSlug: "kay-kizin", name: "Sèvis vè kristal", description: "12 vè diven + 12 vè dlo", priceHTG: 10500, priceUSD: 60, stockQuantity: 5, category: "kitchen" },
  { id: "p-kouto", businessSlug: "kay-kizin", name: "Sèvis kouto kwizin", description: "Ansamn 8 kouto ak blòk bwa", priceHTG: 7000, priceUSD: 40, stockQuantity: null, category: "kitchen" },
  { id: "p-chodye", businessSlug: "kay-kizin", name: "Chodyè an fonn", description: "Chodyè 6 lit pou diri ak legim", priceHTG: 5425, priceUSD: 31, stockQuantity: 9, category: "kitchen" },
  { id: "p-panye", businessSlug: "atelye-lakou", name: "Panye trese", description: "Panye an latanye, tress men, 40 cm", priceHTG: 3325, priceUSD: 19, stockQuantity: 12, category: "crafts" },
  { id: "p-nap", businessSlug: "atelye-lakou", name: "Nap brode", description: "Nap koton brode men, 6 plas", priceHTG: 6125, priceUSD: 35, stockQuantity: 4, category: "crafts" },
  { id: "p-mask", businessSlug: "atelye-lakou", name: "Mask papye mache", description: "Mask Kanaval Jakmèl, pent alamen", priceHTG: 4200, priceUSD: 24, stockQuantity: 6, category: "crafts" },
];

export const registries: Registry[] = [
  {
    slug: "fet-ti-bebe-marie", ownerId: "u-marie", ownerName: "Marie Jean-Baptiste", type: "BABY_SHOWER", status: "PUBLISHED",
    title: "Fèt Ti Bebe Marie & Pierre",
    description: "Mèsi paske nou la, kit nou pre kit nou lwen. Men sa k ap ede nou prepare kay la pou ti bebe a.",
    eventDate: "2026-12-12", place: "Pétion-Ville", visibility: "PUBLIC", createdAt: "2026-10-02",
    items: [
      { id: "g-beso", title: "Bèso pou ti bebe", description: "Bèso ki ka balanse, koulè blan", priceHTG: 8750, priceUSD: 50, quantity: 1, fulfilledQty: 1, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "ti-bebe-boutik", productId: "p-beso", priority: 1 },
      { id: "g-kouch", title: "Kouch Pampers (Size 1)", description: "Bwat 120 kouch", priceHTG: 3500, priceUSD: 20, quantity: 6, fulfilledQty: 2, reservedQty: 1, source: "CUSTOM", priority: 0 },
      { id: "g-rad", title: "Rad pou ti bebe (0-3 mwa)", description: "Ansamn 5 pyès rad koulè pastel", priceHTG: 2625, priceUSD: 15, quantity: 3, fulfilledQty: 1, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "ti-bebe-boutik", productId: "p-rad", priority: 0 },
      { id: "g-bibwon", title: "Bibwon ak akseswa", description: "Kit 3 bibwon + bwòs netwayaj", priceHTG: 4375, priceUSD: 25, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "CUSTOM", priority: 0 },
      { id: "g-pousset", title: "Poussèt bebe", description: "Poussèt ki pliye fasil, koulè gri", priceHTG: 17500, priceUSD: 100, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "ti-bebe-boutik", productId: "p-pousset", priority: 1 },
      { id: "g-matla", title: "Matla pou bèso", description: "Matla fèm pou sekirite ti bebe a", priceHTG: 7000, priceUSD: 40, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "ti-bebe-boutik", productId: "p-matla", priority: 0 },
      { id: "g-panye", title: "Panye trese", description: "Pou rad ti bebe a", priceHTG: 3325, priceUSD: 19, quantity: 2, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "atelye-lakou", productId: "p-panye", priority: 0 },
    ],
  },
  {
    slug: "maryaj-jean-rose", ownerId: "u-rose", ownerName: "Rose Pierre-Louis", type: "WEDDING", status: "PUBLISHED",
    title: "Maryaj Jean & Rose",
    description: "Nou kontan pataje jou sa a avè nou. Men kèk bagay pou premye kay nou.",
    eventDate: "2027-01-23", place: "Cap-Haïtien", visibility: "PUBLIC", createdAt: "2026-09-14",
    items: [
      { id: "g-asyet", title: "Sèvis asyèt (8 pèson)", description: "Asyèt pòslèn blan ak bòdi dore", priceHTG: 14000, priceUSD: 80, quantity: 1, fulfilledQty: 0, reservedQty: 1, source: "LOCAL_BUSINESS", businessSlug: "kay-kizin", productId: "p-asyet", priority: 1 },
      { id: "g-ve", title: "Sèvis vè kristal", description: "12 vè diven + 12 vè dlo", priceHTG: 10500, priceUSD: 60, quantity: 1, fulfilledQty: 1, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "kay-kizin", productId: "p-ve", priority: 0 },
      { id: "g-dra", title: "Dra kabann (Queen)", description: "Dra koton 400 fil, koulè blan", priceHTG: 8750, priceUSD: 50, quantity: 2, fulfilledQty: 1, reservedQty: 0, source: "CUSTOM", priority: 0 },
      { id: "g-tab", title: "Tab manje an bwa", description: "Tab 6 plas, bwa mango lokal", priceHTG: 35000, priceUSD: 200, quantity: 1, fulfilledQty: 1, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "mezon-jacques", productId: "p-tab", priority: 1 },
      { id: "g-chez-pa", title: "Chèz balkon", description: "De chèz pou galri a", priceHTG: 8750, priceUSD: 50, quantity: 2, fulfilledQty: 2, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "mezon-jacques", productId: "p-chez", priority: 0 },
      { id: "g-kouto", title: "Sèvis kouto kwizin", description: "Ansamn 8 kouto ak blòk bwa", priceHTG: 7000, priceUSD: 40, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "kay-kizin", productId: "p-kouto", priority: 0 },
      { id: "g-nap", title: "Nap brode", description: "Nap koton brode men, 6 plas", priceHTG: 6125, priceUSD: 35, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "atelye-lakou", productId: "p-nap", priority: 0 },
    ],
  },
  {
    slug: "50-an-tonton-joel", ownerId: "u-marie", ownerName: "Marie Jean-Baptiste", type: "BIRTHDAY", status: "DRAFT",
    title: "50 an Tonton Joël",
    description: "Yon sipriz pou tonton nou. Pa di l anyen!",
    eventDate: "2027-02-06", place: "Jacmel", visibility: "LINK", createdAt: "2026-11-01",
    items: [
      { id: "g-chez", title: "Chèz balkon", description: "Chèz baskil an bwa sèd", priceHTG: 8750, priceUSD: 50, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "mezon-jacques", productId: "p-chez", priority: 1 },
      { id: "g-mask", title: "Mask papye mache", description: "Mask Kanaval Jakmèl, pent alamen", priceHTG: 4200, priceUSD: 24, quantity: 1, fulfilledQty: 0, reservedQty: 0, source: "LOCAL_BUSINESS", businessSlug: "atelye-lakou", productId: "p-mask", priority: 0 },
    ],
  },
];

export const orders: Order[] = [
  {
    id: "o-1", orderNumber: "BY-4K7Q2", registrySlug: "maryaj-jean-rose", businessSlug: "kay-kizin", buyerId: "u-marie", buyerName: "Marie Jean-Baptiste", isAnonymous: false,
    giftMessage: "Pou premye repa nou ansanm. Bon maryaj!", lines: [{ giftId: "g-ve", title: "Sèvis vè kristal", quantity: 1, priceHTG: 10500, priceUSD: 60 }],
    currency: "HTG", method: "MONCASH", status: "SHIPPED", createdAt: "2026-10-28",
  },
  {
    id: "o-2", orderNumber: "BY-9TF3M", registrySlug: "maryaj-jean-rose", businessSlug: "mezon-jacques", buyerName: "Fabiola Augustin", isAnonymous: false,
    lines: [{ giftId: "g-tab", title: "Tab manje an bwa", quantity: 1, priceHTG: 35000, priceUSD: 200 }],
    currency: "USD", method: "CARD", status: "PAID", createdAt: "2026-11-05",
  },
  {
    id: "o-3", orderNumber: "BY-2HX8D", registrySlug: "maryaj-jean-rose", businessSlug: "mezon-jacques", buyerName: "Wilfrid Céleste", isAnonymous: true,
    lines: [{ giftId: "g-chez-pa", title: "Chèz balkon", quantity: 2, priceHTG: 8750, priceUSD: 50 }],
    currency: "HTG", method: "NATCASH", status: "DELIVERED", createdAt: "2026-10-19",
  },
];
