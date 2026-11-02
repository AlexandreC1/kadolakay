const copy = {
  en: {
    title: "Track a guest purchase",
    intro:
      "Use the private purchase code saved at checkout. An order number or email address cannot open someone’s purchase.",
    code: "Private purchase code",
    open: "Open my purchase",
    hint: "Keep this code private. It grants temporary access to this purchase. Signed-in purchases are in My purchases.",
    purchases: "My purchases",
    status: "Status",
    missing:
      "This access has expired or is unavailable. Enter your private code again.",
    checkout:
      "Keep your private purchase code for order tracking. It is not the public order number.",
  },
  fr: {
    title: "Suivre un achat sans compte",
    intro:
      "Utilisez le code privé conservé au paiement. Un numéro de commande ou une adresse e-mail ne suffit pas pour ouvrir un achat.",
    code: "Code privé de l’achat",
    open: "Ouvrir mon achat",
    hint: "Gardez ce code privé. Il donne un accès temporaire à cet achat. Les achats connectés sont dans Mes achats.",
    purchases: "Mes achats",
    status: "Statut",
    missing:
      "Cet accès a expiré ou est indisponible. Entrez à nouveau votre code privé.",
    checkout:
      "Conservez votre code privé pour suivre l’achat. Ce n’est pas le numéro public de la commande.",
  },
  ht: {
    title: "Swiv yon acha san kont",
    intro:
      "Sèvi ak kòd prive ou te konsève lè ou peye a. Yon nimewo kòmand oswa yon imel pa sifi pou louvri acha yon moun.",
    code: "Kòd prive acha a",
    open: "Louvri acha mwen",
    hint: "Kenbe kòd sa a prive. Li bay aksè tanporè ak acha sa a. Acha ki fèt sou kont ou yo nan Acha mwen.",
    purchases: "Acha mwen",
    status: "Estati",
    missing: "Aksè sa a ekspire oswa li pa disponib. Antre kòd prive ou ankò.",
    checkout:
      "Konsève kòd prive ou pou swiv acha a. Se pa nimewo piblik kòmand lan.",
  },
};
export const trackingCopy = (locale: string) =>
  copy[locale as keyof typeof copy] || copy.en;
