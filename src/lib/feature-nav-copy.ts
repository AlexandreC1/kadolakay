const copy = {
  en: {
    home: "Home",
    explore: "Explore",
    premium: "Bayou Premium",
    manage: "Premium access",
    season: "Seasonal appearance",
    businessLink: "For businesses",
    discover: "Find a gift",
  },
  fr: {
    home: "Accueil",
    explore: "Découvrir",
    premium: "Bayou Premium",
    manage: "Accès Premium",
    season: "Apparence saisonnière",
    businessLink: "Pour les entreprises",
    discover: "Trouver un cadeau",
  },
  ht: {
    home: "Akèy",
    explore: "Dekouvri",
    premium: "Bayou Premium",
    manage: "Aksè Premium",
    season: "Aparans selon sezon",
    businessLink: "Pou biznis yo",
    discover: "Jwenn yon kado",
  },
};
export function featureNavCopy(locale: string) {
  return copy[locale as keyof typeof copy] || copy.en;
}
