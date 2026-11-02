const copy = {
  en: {
    title: "Recipient and delivery details",
    name: "Recipient’s name",
    phone: "Phone with country code",
    city: "City",
    address: "Full address",
    instructions: "Delivery instructions",
    hint: "Only you, the merchants fulfilling this order and authorized support can access these details. Confirm coverage and delivery costs directly with the merchant. Editing locks when preparation is accepted.",
    view: "Private delivery details",
    locked: "Contact details are locked because fulfillment has started.",
  },
  fr: {
    title: "Destinataire et livraison",
    name: "Nom du destinataire",
    phone: "Téléphone avec indicatif pays",
    city: "Ville",
    address: "Adresse complète",
    instructions: "Instructions de livraison",
    hint: "Seuls vous, les vendeurs de cette commande et le support autorisé ont accès à ces informations. Confirmez la zone et les frais de livraison avec le vendeur. Modification bloquée dès l’acceptation de la préparation.",
    view: "Coordonnées privées de livraison",
    locked:
      "La préparation a commencé ; les coordonnées ne sont plus modifiables.",
  },
  ht: {
    title: "Moun k ap resevwa a ak livrezon",
    name: "Non moun nan",
    phone: "Telefòn ak kòd peyi a",
    city: "Vil",
    address: "Adrès konplè",
    instructions: "Enstriksyon pou livrezon",
    hint: "Se ou menm, machann kòmand sa a ak sipò ki otorize ki ka jwenn detay sa yo. Konfime zòn ak frè livrezon avèk machann nan. Ou pa ka modifye yo lè preparasyon an aksepte.",
    view: "Detay prive pou livrezon",
    locked: "Preparasyon kòmanse ; ou pa ka modifye detay sa yo ankò.",
  },
};
export const contactCopy = (locale: string) =>
  copy[locale as keyof typeof copy] || copy.en;
