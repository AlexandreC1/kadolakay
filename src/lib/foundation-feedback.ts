import type { FoundationReason } from "./foundation-result";
const copy: Record<string, Record<FoundationReason, string>> = {
  en: {
    contactLocked:
      "Delivery details cannot be changed after preparation begins. Contact the merchant for help.",
    codeInvalid:
      "This code is incorrect, expired or already used. Enter a current authenticator code or an unused recovery code.",
    setupUnavailable:
      "Reload this page. Authenticator setup must begin within 10 minutes of a fresh sign-in, on the same browser.",
    requestPending:
      "Resolve the open cancellation or refund request before advancing fulfillment.",
    tooLate:
      "This order has already been dispatched or cancelled. Request a refund instead.",
    paymentRequired:
      "This action requires a verified payment and an eligible order. No payment status has been changed.",
    passwordRequired:
      "Set a password of at least 10 characters before protecting this list.",
    limited:
      "Too many attempts, or the protection service is unavailable. Wait a minute and try again.",
  },
  fr: {
    contactLocked:
      "La préparation a commencé ; les coordonnées ne sont plus modifiables. Contactez le vendeur.",
    codeInvalid:
      "Ce code est incorrect, expiré ou déjà utilisé. Entrez un code actuel ou un code de secours inutilisé.",
    setupUnavailable:
      "Actualisez la page. Commencez la configuration dans les 10 minutes après une nouvelle connexion, sur ce même navigateur.",
    requestPending:
      "Traitez la demande d’annulation ou de remboursement en cours avant de poursuivre la préparation.",
    tooLate:
      "La commande a déjà été expédiée ou annulée. Demandez plutôt un remboursement.",
    paymentRequired:
      "Un paiement vérifié et une commande admissible sont nécessaires. Aucun statut de paiement n’a changé.",
    passwordRequired:
      "Définissez un mot de passe d’au moins 10 caractères pour protéger cette liste.",
    limited:
      "Trop de tentatives ou service de protection indisponible. Attendez une minute et réessayez.",
  },
  ht: {
    contactLocked:
      "Preparasyon kòmanse ; ou pa ka modifye detay livrezon yo. Kontakte machann nan.",
    codeInvalid:
      "Kòd sa a pa kòrèk, li ekspire oswa li deja sèvi. Antre yon kòd aktyèl oswa yon kòd sekou ou poko itilize.",
    setupUnavailable:
      "Rafrechi paj la. Kòmanse konfigirasyon an nan 10 minit apre yon nouvo koneksyon, nan menm navigatè a.",
    requestPending:
      "Rezoud demann anilasyon oswa ranbousman ki ouvè a anvan ou kontinye preparasyon an.",
    tooLate: "Kòmand sa a deja ekspedye oswa anile. Mande yon ranbousman pito.",
    paymentRequired:
      "Aksyon sa a mande yon peman verifye ak yon kòmand ki kalifye. Estati peman an pa chanje.",
    passwordRequired:
      "Mete yon modpas ki gen omwen 10 karaktè pou pwoteje lis sa a.",
    limited:
      "Twòp tantativ oswa sèvis pwoteksyon an pa disponib. Tann yon minit epi eseye ankò.",
  },
};
export const foundationFeedback = (locale: string) => copy[locale] || copy.en;
export function foundationReason(error: unknown): FoundationReason | undefined {
  if (!(error instanceof Error)) return;
  const codes: Record<string, FoundationReason> = {
    CONTACT_LOCKED: "contactLocked",
    MFA_CODE_INVALID: "codeInvalid",
    MFA_SETUP_UNAVAILABLE: "setupUnavailable",
    REQUEST_UNRESOLVED: "requestPending",
    CANCELLATION_TOO_LATE: "tooLate",
    ORDER_UNAVAILABLE: "paymentRequired",
    PASSWORD_REQUIRED: "passwordRequired",
    RATE_LIMITED: "limited",
    "Please wait a minute and try again": "limited",
  };
  return codes[error.message];
}
