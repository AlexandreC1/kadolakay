const content = {
  en: { eyebrow: "Gift wishlist", gifts: "Choose a gift", intro: "See what is still available and choose something they would love.", progress: "Wishlist progress", confirmed: "Confirmed", available: "Available", held: "On hold", all: "All gifts", filter: "Filter gifts", noMatches: "No gifts in this category yet.", empty: "No gifts have been added yet.", progressNote: "Temporary payment holds do not count as confirmed gifts.", remaining: "still available", units: "gifts", of: "of", ownerTitle: "Your wishlists", ownerIntro: "Build your list, share it with your guests, and follow its progress.", manage: "Manage wishlist", view: "View wishlist", create: "Create a wishlist", emptyOwner: "Your first wishlist starts here.", emptyOwnerText: "Choose your occasion, then add the gifts you need.", unknownPrice: "Price not provided", partial: "Partially confirmed", listOnly: "Listed gift" },
  fr: { eyebrow: "Liste de cadeaux", gifts: "Choisir un cadeau", intro: "Découvrez les cadeaux encore disponibles et choisissez ce qui leur fera plaisir.", progress: "Avancement de la liste", confirmed: "Confirmés", available: "Disponibles", held: "En attente", all: "Tous les cadeaux", filter: "Filtrer les cadeaux", noMatches: "Aucun cadeau dans cette catégorie pour le moment.", empty: "Aucun cadeau ajouté pour le moment.", progressNote: "Les réservations temporaires de paiement ne sont pas comptées comme des cadeaux confirmés.", remaining: "encore disponibles", units: "cadeaux", of: "sur", ownerTitle: "Vos listes de cadeaux", ownerIntro: "Préparez votre liste, partagez-la avec vos proches et suivez son avancement.", manage: "Gérer la liste", view: "Voir la liste", create: "Créer une liste", emptyOwner: "Votre première liste commence ici.", emptyOwnerText: "Choisissez une occasion, puis ajoutez les cadeaux dont vous avez besoin.", unknownPrice: "Prix non renseigné", partial: "Partiellement confirmé", listOnly: "Cadeau inscrit" },
  ht: { eyebrow: "Lis kado", gifts: "Chwazi yon kado", intro: "Gade ki kado ki disponib toujou epi chwazi youn pou moun pa w yo.", progress: "Pwogrè lis la", confirmed: "Konfime", available: "Disponib", held: "An atant", all: "Tout kado yo", filter: "Filtre kado yo", noMatches: "Pa gen kado nan kategori sa a pou kounye a.", empty: "Yo poko ajoute kado.", progressNote: "Kado ki an atant yon peman pa konte kòm kado konfime.", remaining: "disponib toujou", units: "kado", of: "sou", ownerTitle: "Lis kado ou yo", ownerIntro: "Prepare lis ou, pataje l ak moun pa w yo epi swiv pwogrè li.", manage: "Jere lis la", view: "Gade lis la", create: "Kreye yon lis", emptyOwner: "Premye lis ou kòmanse isit la.", emptyOwnerText: "Chwazi okazyon an, apre sa ajoute kado ou bezwen yo.", unknownPrice: "Yo poko bay pri a", partial: "Konfime an pati", listOnly: "Kado sou lis la" },
};
export function wishlistCopy(locale: string) { return content[locale as keyof typeof content] || content.en; }
export function progressCaption(locale: string, confirmed: number, requested: number) {
  if (locale === "fr") return `${confirmed} ${confirmed === 1 ? "cadeau confirmé" : "cadeaux confirmés"} sur ${requested}`;
  if (locale === "ht") return `${confirmed} kado konfime sou ${requested}`;
  return `${confirmed} of ${requested} ${requested === 1 ? "gift" : "gifts"} confirmed`;
}
export function availabilityCaption(locale: string, available: number, requested: number) {
  if (locale === "fr") return `${available} ${available === 1 ? "disponible" : "disponibles"} sur ${requested}`;
  if (locale === "ht") return `${available} disponib sou ${requested}`;
  return `${available} of ${requested} available`;
}

const listContent = {
  en: {
    countdown: (days: number) => (days > 1 ? `In ${days} days` : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "The celebration has passed"),
    owner: (name: string) => `List by ${name}`,
    summary: (given: number, requested: number) => `${given} of ${requested} gifts given`,
    remaining: (n: number) => (n === 1 ? "1 gift still needed" : `${n} gifts still needed`),
    heldNote: (n: number) => (n === 1 ? "1 gift is being paid for right now." : `${n} gifts are being paid for right now.`),
    notice: "Online payment is not open yet. To give a gift, buy it from the shop shown, or arrange it with the family.",
    giveDirectly: "Arrange with the family",
    viewGift: "See this gift",
    share: "Share this list",
    fromShop: "From",
    weave: (given: number, requested: number) => `Progress: ${given} of ${requested} gifts given`,
    left: (n: number, of: number) => (of > 1 ? `${n} of ${of} still needed` : n > 0 ? "Still needed" : "Given"),
  },
  fr: {
    countdown: (days: number) => (days > 1 ? `Dans ${days} jours` : days === 1 ? "Demain" : days === 0 ? "Aujourd’hui" : "La fête est passée"),
    owner: (name: string) => `Liste de ${name}`,
    summary: (given: number, requested: number) => `${given} cadeau${given > 1 ? "x" : ""} offert${given > 1 ? "s" : ""} sur ${requested}`,
    remaining: (n: number) => (n <= 1 ? `${n} cadeau encore attendu` : `${n} cadeaux encore attendus`),
    heldNote: (n: number) => (n === 1 ? "1 cadeau est en cours de paiement." : `${n} cadeaux sont en cours de paiement.`),
    notice: "Le paiement en ligne n’est pas encore ouvert. Pour offrir un cadeau, achetez-le chez le commerce indiqué, ou organisez-vous avec la famille.",
    giveDirectly: "À offrir en accord avec la famille",
    viewGift: "Voir ce cadeau",
    share: "Partager cette liste",
    fromShop: "Chez",
    weave: (given: number, requested: number) => `Avancement : ${given} sur ${requested} cadeaux offerts`,
    left: (n: number, of: number) => (of > 1 ? `Encore ${n} sur ${of}` : n > 0 ? "Encore attendu" : "Offert"),
  },
  ht: {
    countdown: (days: number) => (days > 1 ? `Nan ${days} jou` : days === 1 ? "Demen" : days === 0 ? "Jodi a" : "Fèt la pase deja"),
    owner: (name: string) => `Lis ${name}`,
    summary: (given: number, requested: number) => `${given} kado ofri sou ${requested}`,
    remaining: (n: number) => `${n} kado yo toujou bezwen`,
    heldNote: (n: number) => `${n} kado ap peye kounye a.`,
    notice: "Peman sou entènèt poko louvri. Pou ofri yon kado, achte l nan boutik ki endike a, oswa fè aranjman ak fanmi an.",
    giveDirectly: "Fè aranjman ak fanmi an",
    viewGift: "Gade kado sa a",
    share: "Pataje lis sa a",
    fromShop: "Nan",
    weave: (given: number, requested: number) => `Pwogrè: ${given} sou ${requested} kado ofri`,
    left: (n: number, of: number) => (of > 1 ? `Toujou ${n} sou ${of}` : n > 0 ? "Toujou bezwen" : "Ofri deja"),
  },
};
export function listCopy(locale: string) { return listContent[locale as keyof typeof listContent] || listContent.en; }

/** Whole days from today (in the given zone-free calendar sense) until the event. */
export function daysUntil(date: Date, now = new Date()) {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(date) - day(now)) / 86400000);
}
