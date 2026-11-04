const messages = {
  en: { products: "Gifts from this business", empty: "No available products yet.", detail: "View product", store: "Visit business", add: "Add to registry", choose: "Choose your registry", signIn: "Sign in to add this gift", create: "Create a registry", available: "Listed as available", unavailable: "Currently unavailable", terms: "Adding a gift to a registry does not reserve merchant stock. Price and availability are checked again at checkout. Delivery and pickup terms must be confirmed before payment.", stock: "Availability", edit: "Edit product", save: "Save changes", cancel: "Cancel", inStock: "Available", outOfStock: "Unavailable", local: "Browse local gifts", find: "Find a registry", findHint: "Enter the registry link or exact address shared by the family.", search: "Open registry", missing: "We could not find that public registry. Check the link with the family.", link: "Registry link or address", addLocal: "Choose from local businesses" },
  fr: { products: "Cadeaux de cette entreprise", empty: "Aucun produit disponible pour le moment.", detail: "Voir le produit", store: "Voir la boutique", add: "Ajouter à une liste", choose: "Choisissez votre liste", signIn: "Connectez-vous pour ajouter ce cadeau", create: "Créer une liste", available: "Indiqué comme disponible", unavailable: "Actuellement indisponible", terms: "L’ajout à une liste ne réserve pas le stock du vendeur. Le prix et la disponibilité sont vérifiés au paiement. Les conditions de livraison ou de retrait doivent être confirmées avant le paiement.", stock: "Disponibilité", edit: "Modifier le produit", save: "Enregistrer", cancel: "Annuler", inStock: "Disponible", outOfStock: "Indisponible", local: "Découvrir les cadeaux locaux", find: "Trouver une liste", findHint: "Saisissez le lien ou l’adresse exacte de la liste partagée par la famille.", search: "Ouvrir la liste", missing: "Cette liste publique est introuvable. Vérifiez le lien avec la famille.", link: "Lien ou adresse de la liste", addLocal: "Choisir parmi les entreprises locales" },
  ht: { products: "Kado biznis sa a", empty: "Pa gen pwodwi disponib pou kounye a.", detail: "Gade pwodwi a", store: "Gade biznis la", add: "Ajoute nan yon lis", choose: "Chwazi lis ou a", signIn: "Konekte pou ajoute kado sa a", create: "Kreye yon lis", available: "Make kòm disponib", unavailable: "Pa disponib kounye a", terms: "Lè ou ajoute yon kado nan lis la, sa pa rezève estòk machann nan. Nou verifye pri ak disponiblite ankò lè w ap peye. Kondisyon livrezon oswa retrè dwe konfime anvan peman.", stock: "Disponiblite", edit: "Modifye pwodwi a", save: "Anrejistre", cancel: "Anile", inStock: "Disponib", outOfStock: "Pa disponib", local: "Dekouvri kado lokal", find: "Jwenn yon lis", findHint: "Antre lyen oswa adrès egzak lis fanmi an pataje a.", search: "Louvri lis la", missing: "Nou pa jwenn lis piblik sa a. Verifye lyen an ak fanmi an.", link: "Lyen oswa adrès lis la", addLocal: "Chwazi nan biznis lokal yo" },
};
export function catalogCopy(locale: string) { return messages[locale as keyof typeof messages] || messages.en; }

export function nativeGiftCopy(locale: string) {
  const copy = {
    en: { listOnly: "This is a list entry. Online payment is not available for this gift.", disabled: "Online payment is not enabled yet.", externalStore: "View at the store" },
    fr: { listOnly: "Ce cadeau est une entrée de liste. Le paiement en ligne n’est pas disponible.", disabled: "Le paiement en ligne n’est pas encore activé.", externalStore: "Voir chez le vendeur" },
    ht: { listOnly: "Sa a se yon antre nan lis la. Peman sou entènèt pa disponib pou kado sa a.", disabled: "Peman sou entènèt poko aktive.", externalStore: "Gade nan magazen an" },
  };
  return copy[locale as keyof typeof copy] || copy.en;
}

const giftPageContent = {
  en: {
    back: "Back",
    fromShop: "From",
    photos: "Gift photos",
    showPhoto: (n: number) => `Show photo ${n}`,
    policy: "Delivery and pickup",
    addTitle: "Add it to one of your lists",
    addIntro: "Guests will see it on your list, with this shop's name.",
    guestTitle: "Planning a celebration?",
    guestIntro: "Sign in to put this gift on your list. To give it to someone, open their list.",
    findList: "Find a list",
    moreFromShop: "More from this shop",
    seeShop: "See the shop",
  },
  fr: {
    back: "Retour",
    fromShop: "Chez",
    photos: "Photos du cadeau",
    showPhoto: (n: number) => `Afficher la photo ${n}`,
    policy: "Livraison et retrait",
    addTitle: "L’ajouter à une de vos listes",
    addIntro: "Vos proches le verront sur votre liste, avec le nom de ce commerce.",
    guestTitle: "Vous préparez une fête ?",
    guestIntro: "Connectez-vous pour mettre ce cadeau sur votre liste. Pour l’offrir à quelqu’un, ouvrez sa liste.",
    findList: "Trouver une liste",
    moreFromShop: "Autres cadeaux de ce commerce",
    seeShop: "Voir le commerce",
  },
  ht: {
    back: "Retounen",
    fromShop: "Nan",
    photos: "Foto kado a",
    showPhoto: (n: number) => `Montre foto ${n}`,
    policy: "Livrezon ak retrè",
    addTitle: "Mete l nan youn nan lis ou yo",
    addIntro: "Moun pa w yo ap wè l sou lis ou, ak non boutik sa a.",
    guestTitle: "W ap prepare yon fèt?",
    guestIntro: "Konekte pou mete kado sa a sou lis ou. Pou ofri l bay yon moun, louvri lis li.",
    findList: "Jwenn yon lis",
    moreFromShop: "Lòt kado nan boutik sa a",
    seeShop: "Gade boutik la",
  },
};
export function giftPageCopy(locale: string) { return giftPageContent[locale as keyof typeof giftPageContent] || giftPageContent.en; }
