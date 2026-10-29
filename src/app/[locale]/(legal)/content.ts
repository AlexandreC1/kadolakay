/**
 * Legal copy (ht / fr / en). DRAFT — must be reviewed by a lawyer before
 * launch (see ws6-pr.md). Kept in code rather than the i18n JSON because it
 * is long-form and versioned as a whole (LEGAL_VERSION).
 */
export const LEGAL_VERSION = "2026-10-13-draft";
export type LegalLocale = "ht" | "fr" | "en";
export interface LegalDoc {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

const PROCESSORS =
  "Vercel (hosting), Neon (database), Resend (email), Stripe, PayPal, Digicel MonCash, Natcom Natcash (payments), Cloudflare R2 (images), Sentry (error monitoring), Upstash (rate limiting)";

export const privacy: Record<LegalLocale, LegalDoc> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated",
    sections: [
      { heading: "Who we are", body: ["KadoLakay operates a gift-registry marketplace connecting registry owners, gift buyers and local businesses."] },
      { heading: "Data we collect", body: [
        "Account: email address, name, profile photo (when you sign in with Google), phone number and language preference.",
        "Registries: titles, descriptions, event dates, items and images you add.",
        "Purchases: buyer name, email, optional phone, gift message, items, amounts and payment references (we never receive full card numbers).",
        "Businesses: business name, contact details, address and payout numbers.",
        "Technical: IP address (for security and rate limiting) and error reports without personal data.",
      ] },
      { heading: "Why we use it", body: ["To run registries and checkout, deliver gift notifications and receipts, prevent fraud and abuse, comply with accounting obligations, and support you."] },
      { heading: "Who we share it with", body: [
        `Service providers acting on our behalf: ${PROCESSORS}.`,
        "Registry owners see the buyer's name and gift message (or “Someone” for anonymous gifts). Businesses see what is needed to fulfil an order.",
        "We do not sell personal data.",
      ] },
      { heading: "How long we keep it", body: [
        "Account data: until you delete your account. Orders: kept for accounting, with your personal details removed when you delete your account.",
        "Sent-email records: 30 days. Sign-in links: until they expire (15 minutes). Unused uploads: 24 hours.",
      ] },
      { heading: "Your rights", body: [
        "From Settings you can download your data (once per day) and delete your account. You can also ask us to correct or delete data via the contact page.",
      ] },
      { heading: "Contact", body: ["Use the contact page or write to support@kadolakay.com."] },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour",
    sections: [
      { heading: "Qui sommes-nous", body: ["KadoLakay exploite une place de marché de listes de cadeaux reliant les créateurs de listes, les acheteurs et les commerces locaux."] },
      { heading: "Données collectées", body: [
        "Compte : adresse e-mail, nom, photo de profil (connexion Google), téléphone et langue préférée.",
        "Listes : titres, descriptions, dates d'événement, articles et images que vous ajoutez.",
        "Achats : nom, e-mail et téléphone facultatif de l'acheteur, message, articles, montants et références de paiement (nous ne recevons jamais les numéros de carte complets).",
        "Commerces : nom, coordonnées, adresse et numéros de versement.",
        "Technique : adresse IP (sécurité, limitation de débit) et rapports d'erreurs sans données personnelles.",
      ] },
      { heading: "Finalités", body: ["Faire fonctionner les listes et le paiement, envoyer notifications et reçus, prévenir la fraude, respecter nos obligations comptables et vous assister."] },
      { heading: "Partage", body: [
        `Prestataires agissant pour notre compte : ${PROCESSORS}.`,
        "Le créateur de la liste voit le nom de l'acheteur et son message (ou « Quelqu'un » si anonyme). Les commerces voient ce qui est nécessaire pour livrer.",
        "Nous ne vendons pas de données personnelles.",
      ] },
      { heading: "Durée de conservation", body: [
        "Compte : jusqu'à sa suppression. Commandes : conservées pour la comptabilité, vos données personnelles étant retirées à la suppression du compte.",
        "Historique d'e-mails envoyés : 30 jours. Liens de connexion : jusqu'à expiration (15 minutes). Fichiers non utilisés : 24 heures.",
      ] },
      { heading: "Vos droits", body: ["Dans Paramètres, vous pouvez télécharger vos données (une fois par jour) et supprimer votre compte. Pour toute rectification, utilisez la page contact."] },
      { heading: "Contact", body: ["Page contact ou support@kadolakay.com."] },
    ],
  },
  ht: {
    title: "Règ sou vi prive",
    updated: "Dènye mizajou",
    sections: [
      { heading: "Kiyès nou ye", body: ["KadoLakay se yon mache rejis kado ki konekte moun ki kreye rejis, moun ki achte kado ak biznis lokal."] },
      { heading: "Done nou ranmase", body: [
        "Kont: imèl, non, foto (lè ou konekte ak Google), telefòn ak lang ou prefere.",
        "Rejis: tit, deskripsyon, dat evènman, atik ak foto ou mete.",
        "Acha: non, imèl ak telefòn (si ou bay li) moun ki achte a, mesaj, atik, montan ak referans peman (nou pa janm resevwa nimewo kat konplè).",
        "Biznis: non, kontak, adrès ak nimewo pou resevwa lajan.",
        "Teknik: adrès IP (sekirite ak limit demann) ak rapò erè san done pèsonèl.",
      ] },
      { heading: "Poukisa nou itilize yo", body: ["Pou fè rejis ak peman mache, voye notifikasyon ak resi, anpeche fwod, respekte obligasyon kontab nou, epi ede ou."] },
      { heading: "Ak kiyès nou pataje yo", body: [
        `Founisè k ap travay pou nou: ${PROCESSORS}.`,
        "Mèt rejis la wè non moun ki achte a ak mesaj li (oswa “Yon moun” si se anonim). Biznis yo wè sa ki nesesè pou livre.",
        "Nou pa vann done pèsonèl.",
      ] },
      { heading: "Konbyen tan nou kenbe yo", body: [
        "Kont: jiskaske ou efase l. Kòmand: nou kenbe yo pou kontablite, men nou retire enfòmasyon pèsonèl ou lè ou efase kont ou.",
        "Istwa imèl: 30 jou. Lyen koneksyon: jiskaske yo ekspire (15 minit). Fichye ki pa itilize: 24 è.",
      ] },
      { heading: "Dwa ou", body: ["Nan Paramèt, ou ka telechaje done ou (yon fwa pa jou) epi efase kont ou. Pou korije done, sèvi ak paj kontak la."] },
      { heading: "Kontak", body: ["Paj kontak la oswa support@kadolakay.com."] },
    ],
  },
};

export const terms: Record<LegalLocale, LegalDoc> = {
  en: {
    title: "Terms of Service",
    updated: "Last updated",
    sections: [
      { heading: "The service", body: ["KadoLakay lets you create gift registries and lets others buy gifts from them, including products from independent local businesses. KadoLakay is a marketplace: businesses are responsible for their products and delivery."] },
      { heading: "Fees", body: ["A 5% platform fee is added at checkout and shown before you pay. Prices are shown in HTG or USD depending on the payment method."] },
      { heading: "Payments", body: ["Card and PayPal payments are processed by Stripe and PayPal; MonCash and Natcash by Digicel and Natcom. Natcash orders are confirmed manually after we verify the transfer."] },
      { heading: "Refunds", body: ["If an order cannot be fulfilled, we refund it to the original payment method (MonCash/Natcash refunds are processed manually). Contact us within 30 days of purchase about any problem."] },
      { heading: "Your content", body: ["You are responsible for what you post. Prohibited: illegal items, weapons, drugs, counterfeit goods, hateful or sexual content, impersonation, and links to malicious sites. We may remove content or suspend accounts that break these rules."] },
      { heading: "Accounts", body: ["Keep your email account secure; sign-in links give access to your KadoLakay account. You can delete your account at any time from Settings."] },
      { heading: "Liability", body: ["The service is provided “as is”. To the extent permitted by law, KadoLakay is not liable for indirect losses or for products supplied by businesses."] },
      { heading: "Changes", body: ["We may update these terms; material changes will be announced on the site before they apply."] },
    ],
  },
  fr: {
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour",
    sections: [
      { heading: "Le service", body: ["KadoLakay permet de créer des listes de cadeaux et d'y acheter des cadeaux, y compris des produits de commerces locaux indépendants. KadoLakay est une place de marché : les commerces sont responsables de leurs produits et livraisons."] },
      { heading: "Frais", body: ["Des frais de plateforme de 5 % sont ajoutés au paiement et affichés avant de payer. Les prix sont en HTG ou en USD selon le moyen de paiement."] },
      { heading: "Paiements", body: ["Les paiements par carte et PayPal sont traités par Stripe et PayPal ; MonCash et Natcash par Digicel et Natcom. Les commandes Natcash sont confirmées manuellement après vérification du transfert."] },
      { heading: "Remboursements", body: ["Si une commande ne peut être honorée, nous la remboursons sur le moyen de paiement d'origine (MonCash/Natcash : remboursement manuel). Contactez-nous dans les 30 jours suivant l'achat."] },
      { heading: "Votre contenu", body: ["Vous êtes responsable de ce que vous publiez. Interdits : articles illégaux, armes, drogues, contrefaçons, contenus haineux ou sexuels, usurpation d'identité et liens malveillants. Nous pouvons retirer du contenu ou suspendre un compte."] },
      { heading: "Comptes", body: ["Protégez votre messagerie : les liens de connexion donnent accès à votre compte. Vous pouvez supprimer votre compte à tout moment dans Paramètres."] },
      { heading: "Responsabilité", body: ["Le service est fourni « en l'état ». Dans la limite permise par la loi, KadoLakay n'est pas responsable des pertes indirectes ni des produits fournis par les commerces."] },
      { heading: "Modifications", body: ["Nous pouvons modifier ces conditions ; les changements importants seront annoncés sur le site avant leur entrée en vigueur."] },
    ],
  },
  ht: {
    title: "Kondisyon itilizasyon",
    updated: "Dènye mizajou",
    sections: [
      { heading: "Sèvis la", body: ["KadoLakay pèmèt ou kreye rejis kado epi pèmèt lòt moun achte kado ladan yo, tankou pwodui biznis lokal endepandan. KadoLakay se yon mache: biznis yo responsab pwodui yo ak livrezon."] },
      { heading: "Frè", body: ["Nou ajoute 5% frè platfòm lè w ap peye, epi ou wè l anvan ou peye. Pri yo an HTG oswa USD selon metòd peman an."] },
      { heading: "Peman", body: ["Stripe ak PayPal trete peman kat ak PayPal; Digicel ak Natcom trete MonCash ak Natcash. Nou konfime kòmand Natcash alamen apre nou verifye transfè a."] },
      { heading: "Ranbousman", body: ["Si yon kòmand pa ka fèt, nou ranbouse l sou menm metòd peman an (MonCash/Natcash fèt alamen). Kontakte nou nan 30 jou apre acha a."] },
      { heading: "Kontni ou", body: ["Ou responsab sa ou poste. Entèdi: bagay ilegal, zam, dwòg, fo pwodui, kontni rayisman oswa seksyèl, pran idantite lòt moun, ak lyen danjere. Nou ka retire kontni oswa sispann kont."] },
      { heading: "Kont", body: ["Pwoteje imèl ou: lyen koneksyon yo bay aksè a kont KadoLakay ou. Ou ka efase kont ou nenpòt lè nan Paramèt."] },
      { heading: "Responsablite", body: ["Nou bay sèvis la jan l ye a. Otan lalwa pèmèt, KadoLakay pa responsab pèt endirèk ni pwodui biznis yo bay."] },
      { heading: "Chanjman", body: ["Nou ka chanje kondisyon sa yo; n ap anonse gwo chanjman sou sit la anvan yo aplike."] },
    ],
  },
};

export function pickLocale(l: string): LegalLocale {
  return l === "fr" || l === "en" ? l : "ht";
}
