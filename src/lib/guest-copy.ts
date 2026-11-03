/** Small shared strings for the guest pages that filter results. */
const content = {
  en: {
    updating: "Updating results",
    giftCount: (n: number) => (n === 1 ? "1 gift" : `${n} gifts`),
    listCount: (n: number) => (n === 1 ? "1 list" : `${n} lists`),
    shopCount: (n: number) => (n === 1 ? "1 shop" : `${n} shops`),
    allShops: "All shops",
    giftsHere: "Gifts in this shop",
    noPhoto: "No photo yet",
    findByLink: "Have a link or a QR code?",
    otherWays: "Other ways to find a list",
  },
  fr: {
    updating: "Mise à jour des résultats",
    giftCount: (n: number) => (n <= 1 ? `${n} cadeau` : `${n} cadeaux`),
    listCount: (n: number) => (n <= 1 ? `${n} liste` : `${n} listes`),
    shopCount: (n: number) => (n <= 1 ? `${n} commerce` : `${n} commerces`),
    allShops: "Tous les commerces",
    giftsHere: "Les cadeaux de ce commerce",
    noPhoto: "Pas encore de photo",
    findByLink: "Vous avez un lien ou un code QR ?",
    otherWays: "Autres façons de trouver une liste",
  },
  ht: {
    updating: "N ap mete rezilta yo ajou",
    giftCount: (n: number) => `${n} kado`,
    listCount: (n: number) => `${n} lis`,
    shopCount: (n: number) => `${n} boutik`,
    allShops: "Tout boutik yo",
    giftsHere: "Kado boutik sa a",
    noPhoto: "Poko gen foto",
    findByLink: "Ou gen yon lyen oswa yon kòd QR?",
    otherWays: "Lòt fason pou jwenn yon lis",
  },
};
export function guestCopy(locale: string) { return content[locale as keyof typeof content] || content.en; }
