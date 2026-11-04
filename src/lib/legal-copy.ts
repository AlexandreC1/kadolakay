/**
 * Privacy, terms and contact copy (ht / fr / en).
 *
 * DRAFT. Written from the product rules recorded in docs/DECISIONS.md and
 * docs/PUBLIC-RELEASE-GATES.md, and from what the code actually stores. It
 * deliberately leaves out facts the owner has not confirmed (legal entity,
 * address, governing law, retention periods, final hosting vendors). Those are
 * listed in docs/LEGAL-TODO.md and must be settled, and the text
 * reviewed by a lawyer, before public launch.
 */
export const LEGAL_VERSION = "2026-11-02-draft";

export type LegalSection = { heading: string; body: string[] };
export type LegalDocument = { title: string; intro: string; sections: LegalSection[] };
type LegalLocale = "ht" | "fr" | "en";

type SharedCopy = { draft: string; version: string; contactPrompt: string; contactPending: string };
const shared: Record<LegalLocale, SharedCopy> = {
  en: {
    draft: "Draft for review. This text is not final and will be reviewed before Bayou opens to the public.",
    version: "Version",
    contactPrompt: "Questions about this page? Write to us:",
    contactPending: "Our support address will be published here before launch.",
  },
  fr: {
    draft: "Version provisoire. Ce texte n’est pas définitif et sera révisé avant l’ouverture de Bayou au public.",
    version: "Version",
    contactPrompt: "Une question sur cette page ? Écrivez-nous :",
    contactPending: "Notre adresse de support sera publiée ici avant le lancement.",
  },
  ht: {
    draft: "Bouyon pou revizyon. Tèks sa a poko fini, n ap revize l anvan Bayou louvri pou piblik la.",
    version: "Vèsyon",
    contactPrompt: "Ou gen yon kesyon sou paj sa a? Ekri nou:",
    contactPending: "N ap pibliye adrès sipò nou an isit la anvan lansman an.",
  },
};

const privacy: Record<LegalLocale, LegalDocument> = {
  en: {
    title: "Privacy Policy",
    intro:
      "Bayou helps people in Haiti and abroad create gift lists and find local merchants. This page explains what information we keep, why, and the choices you have.",
    sections: [
      {
        heading: "Information we keep",
        body: [
          "Account: your email address, name and profile photo from the sign-in provider you choose, plus an optional phone number, your language and the occasions you pick during onboarding.",
          "Sign-in security: a record of each browser you are signed in on, so you can sign it out. Administrators also keep an authenticator secret and recovery codes.",
          "Lists and baskets: titles, descriptions, dates, items, links and images you add, and your visibility choices.",
          "Merchants: business name, category, location, contact details, optional patente number, products and stock counts.",
          "Gifts and orders: the buyer’s name and email, an optional phone number and gift message, the items, amounts and status. Delivery details are encrypted before they are stored.",
          "Technical: your IP address is used for a short time to limit abuse. Error reports are filtered to remove personal details.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To run your account, lists, baskets and merchant pages; to show gifts and orders to the people involved; to keep accounts secure and prevent abuse; and to answer you when you contact us.",
        ],
      },
      {
        heading: "Who can see it",
        body: [
          "Public and unlisted lists can be seen by anyone with the link. Password-protected lists need the password. Private drafts stay private.",
          "The list owner sees the buyer’s name and message, unless the buyer chose to stay anonymous.",
          "A merchant sees only what it needs to prepare and deliver its own orders.",
          "Authorized Bayou support staff can access records to help you and keep the service safe. Their administrative actions are logged.",
          "Service providers that host, store, email or monitor the service for us process data on our behalf. We do not sell personal information.",
        ],
      },
      {
        heading: "How we protect it",
        body: [
          "Sign-in tokens, authenticator secrets and delivery details are encrypted. Each signed-in browser can be signed out from Settings. Administrative actions require a second verification step.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "From Settings you can update your profile, sign out other browsers, download a copy of your data and delete your account.",
          "When you delete your account, your profile and your lists are removed. Order records needed by merchants are kept with your personal details removed.",
        ],
      },
      {
        heading: "Changes",
        body: ["If we change this policy in a meaningful way, we will say so on the site before the change applies."],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    intro:
      "Bayou aide les personnes en Haïti et à l’étranger à créer des listes de cadeaux et à trouver des commerces locaux. Cette page explique quelles informations nous gardons, pourquoi, et quels choix vous avez.",
    sections: [
      {
        heading: "Informations conservées",
        body: [
          "Compte : votre adresse e-mail, votre nom et votre photo de profil fournis par le service de connexion choisi, ainsi qu’un numéro de téléphone facultatif, votre langue et les occasions choisies à l’accueil.",
          "Sécurité de connexion : un enregistrement de chaque navigateur connecté, pour pouvoir le déconnecter. Les administrateurs ont aussi un secret d’authentification et des codes de secours.",
          "Listes et paniers : titres, descriptions, dates, articles, liens et images que vous ajoutez, et vos choix de visibilité.",
          "Commerces : nom, catégorie, localisation, coordonnées, numéro de patente facultatif, produits et quantités en stock.",
          "Cadeaux et commandes : nom et e-mail de l’acheteur, téléphone et message facultatifs, articles, montants et statut. Les coordonnées de livraison sont chiffrées avant d’être enregistrées.",
          "Technique : votre adresse IP est utilisée brièvement pour limiter les abus. Les rapports d’erreur sont filtrés pour retirer les données personnelles.",
        ],
      },
      {
        heading: "Pourquoi nous les utilisons",
        body: [
          "Pour faire fonctionner votre compte, vos listes, paniers et pages de commerce ; montrer les cadeaux et commandes aux personnes concernées ; sécuriser les comptes et prévenir les abus ; et vous répondre lorsque vous nous écrivez.",
        ],
      },
      {
        heading: "Qui peut les voir",
        body: [
          "Les listes publiques ou non répertoriées sont visibles par toute personne ayant le lien. Les listes protégées demandent le mot de passe. Les brouillons privés restent privés.",
          "Le créateur de la liste voit le nom et le message de l’acheteur, sauf si l’acheteur a choisi de rester anonyme.",
          "Un commerce voit uniquement ce dont il a besoin pour préparer et livrer ses propres commandes.",
          "Le personnel de support autorisé de Bayou peut consulter les dossiers pour vous aider et protéger le service. Ses actions administratives sont journalisées.",
          "Les prestataires qui hébergent, stockent, envoient des e-mails ou surveillent le service pour nous traitent des données pour notre compte. Nous ne vendons pas de données personnelles.",
        ],
      },
      {
        heading: "Protection",
        body: [
          "Les jetons de connexion, les secrets d’authentification et les coordonnées de livraison sont chiffrés. Chaque navigateur connecté peut être déconnecté depuis les Paramètres. Les actions administratives exigent une deuxième vérification.",
        ],
      },
      {
        heading: "Vos choix",
        body: [
          "Dans les Paramètres, vous pouvez modifier votre profil, déconnecter d’autres navigateurs, télécharger une copie de vos données et supprimer votre compte.",
          "Quand vous supprimez votre compte, votre profil et vos listes sont supprimés. Les commandes nécessaires aux commerces sont conservées sans vos données personnelles.",
        ],
      },
      {
        heading: "Modifications",
        body: ["Si cette politique change de façon importante, nous l’annoncerons sur le site avant que le changement s’applique."],
      },
    ],
  },
  ht: {
    title: "Règ sou vi prive",
    intro:
      "Bayou ede moun ann Ayiti ak lòt bò dlo kreye lis kado epi jwenn machann lokal. Paj sa a esplike ki enfòmasyon nou kenbe, poukisa, ak ki chwa ou genyen.",
    sections: [
      {
        heading: "Enfòmasyon nou kenbe",
        body: [
          "Kont: imèl ou, non ou ak foto pwofil ou ki soti nan sèvis koneksyon ou chwazi a, plis yon nimewo telefòn si ou vle, lang ou ak okazyon ou chwazi lè w ap kòmanse.",
          "Sekirite koneksyon: yon dosye pou chak navigatè kote ou konekte, pou ou ka dekonekte l. Administratè yo gen yon sekrè otantifikasyon ak kòd sekou tou.",
          "Lis ak pànye: tit, deskripsyon, dat, atik, lyen ak foto ou mete, ak chwa vizibilite ou.",
          "Machann: non biznis la, kategori, kote li ye, kontak, nimewo patant si genyen, pwodwi ak kantite ki nan stòk.",
          "Kado ak kòmand: non ak imèl moun k ap achte a, telefòn ak mesaj si li bay yo, atik yo, montan ak eta kòmand lan. Nou chifre detay livrezon yo anvan nou anrejistre yo.",
          "Teknik: nou itilize adrès IP ou pou yon ti tan pou bloke abi. Nou filtre rapò erè yo pou retire enfòmasyon pèsonèl.",
        ],
      },
      {
        heading: "Poukisa nou itilize yo",
        body: [
          "Pou fè kont ou, lis ou, pànye ou ak paj machann yo mache; pou montre kado ak kòmand bay moun ki konsène yo; pou pwoteje kont yo ak anpeche abi; epi pou reponn ou lè ou ekri nou.",
        ],
      },
      {
        heading: "Kiyès ki ka wè yo",
        body: [
          "Nenpòt moun ki gen lyen an ka wè lis piblik ak lis ki pa nan rechèch. Lis ki gen modpas mande modpas la. Bouyon prive rete prive.",
          "Mèt lis la wè non ak mesaj moun ki achte a, sof si moun nan chwazi rete anonim.",
          "Yon machann wè sèlman sa li bezwen pou prepare ak livre pwòp kòmand li.",
          "Ekip sipò Bayou ki otorize ka gade dosye yo pou ede ou epi pwoteje sèvis la. Nou anrejistre tout aksyon administratif yo.",
          "Founisè ki loje, estoke, voye imèl oswa siveye sèvis la pou nou trete done pou nou. Nou pa vann enfòmasyon pèsonèl.",
        ],
      },
      {
        heading: "Kijan nou pwoteje yo",
        body: [
          "Nou chifre jeton koneksyon, sekrè otantifikasyon ak detay livrezon. Ou ka dekonekte chak navigatè nan Paramèt. Aksyon administratif mande yon dezyèm verifikasyon.",
        ],
      },
      {
        heading: "Chwa ou",
        body: [
          "Nan Paramèt, ou ka chanje pwofil ou, dekonekte lòt navigatè, telechaje yon kopi done ou epi efase kont ou.",
          "Lè ou efase kont ou, nou retire pwofil ou ak lis ou yo. Nou kenbe kòmand machann yo bezwen, men san enfòmasyon pèsonèl ou.",
        ],
      },
      {
        heading: "Chanjman",
        body: ["Si règ sa yo chanje nan yon fason ki enpòtan, n ap di sa sou sit la anvan chanjman an aplike."],
      },
    ],
  },
};

const terms: Record<LegalLocale, LegalDocument> = {
  en: {
    title: "Terms of Use",
    intro: "These terms explain how Bayou works and what we expect from everyone who uses it.",
    sections: [
      {
        heading: "What Bayou is",
        body: [
          "Bayou lets you create gift lists and baskets, share them, and discover products from local merchants. Bayou is not the seller of merchant products.",
        ],
      },
      {
        heading: "Merchants are the sellers",
        body: [
          "Each merchant sells its own products, receives payment for them, delivers them and handles cancellations and refunds. Questions about a product, delivery or refund go to that merchant first.",
          "Online payment through Bayou is not open yet. Gifts bought on other websites are agreements between the buyer and that website.",
          "Merchants must give accurate information, have the right to sell what they list, keep stock counts honest and honor the orders they accept. Bayou reviews merchants before they appear and may suspend them.",
        ],
      },
      {
        heading: "Fees",
        body: [
          "Bayou does not currently charge list owners, gift givers or merchants. If that changes, we will announce it on the site before any fee applies. Premium features are an invitation-only pilot and are not sold.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "Keep access to your email and sign-in account secure. You are responsible for activity on your account. You can sign out other browsers and delete your account from Settings.",
        ],
      },
      {
        heading: "What you post",
        body: [
          "You are responsible for the lists, items, images and messages you add, and you must have the right to share them. Do not post anything illegal, misleading, hateful or harmful, do not pretend to be someone else, and do not link to harmful sites.",
          "We may remove content or suspend accounts that break these rules.",
        ],
      },
      {
        heading: "Service availability",
        body: [
          "We work to keep Bayou available and secure, but the service may change or be interrupted. To the extent the law allows, Bayou is not responsible for products sold by merchants or for indirect losses.",
        ],
      },
      {
        heading: "Changes",
        body: ["We may update these terms. If a change is meaningful, we will say so on the site before it applies."],
      },
    ],
  },
  fr: {
    title: "Conditions d’utilisation",
    intro: "Ces conditions expliquent le fonctionnement de Bayou et ce que nous attendons de chaque utilisateur.",
    sections: [
      {
        heading: "Ce qu’est Bayou",
        body: [
          "Bayou permet de créer des listes de cadeaux et des paniers, de les partager et de découvrir les produits de commerces locaux. Bayou n’est pas le vendeur des produits des commerces.",
        ],
      },
      {
        heading: "Les commerces sont les vendeurs",
        body: [
          "Chaque commerce vend ses propres produits, en reçoit le paiement, les livre et gère les annulations et remboursements. Les questions sur un produit, une livraison ou un remboursement s’adressent d’abord à ce commerce.",
          "Le paiement en ligne via Bayou n’est pas encore ouvert. Un cadeau acheté sur un autre site relève d’un accord entre l’acheteur et ce site.",
          "Les commerces doivent donner des informations exactes, avoir le droit de vendre ce qu’ils proposent, tenir des stocks honnêtes et honorer les commandes qu’ils acceptent. Bayou vérifie les commerces avant leur publication et peut les suspendre.",
        ],
      },
      {
        heading: "Frais",
        body: [
          "Bayou ne facture actuellement ni les créateurs de listes, ni les donateurs, ni les commerces. Si cela change, nous l’annoncerons sur le site avant l’application de tout frais. Les fonctions Premium sont un pilote sur invitation et ne sont pas vendues.",
        ],
      },
      {
        heading: "Votre compte",
        body: [
          "Protégez l’accès à votre e-mail et à votre compte de connexion. Vous êtes responsable de l’activité de votre compte. Vous pouvez déconnecter d’autres navigateurs et supprimer votre compte depuis les Paramètres.",
        ],
      },
      {
        heading: "Vos contenus",
        body: [
          "Vous êtes responsable des listes, articles, images et messages que vous ajoutez, et devez avoir le droit de les partager. Ne publiez rien d’illégal, de trompeur, de haineux ou de nuisible, n’usurpez pas l’identité d’autrui et ne mettez pas de liens vers des sites dangereux.",
          "Nous pouvons retirer un contenu ou suspendre un compte qui enfreint ces règles.",
        ],
      },
      {
        heading: "Disponibilité du service",
        body: [
          "Nous faisons en sorte que Bayou reste disponible et sûr, mais le service peut évoluer ou être interrompu. Dans la mesure permise par la loi, Bayou n’est pas responsable des produits vendus par les commerces ni des pertes indirectes.",
        ],
      },
      {
        heading: "Modifications",
        body: ["Nous pouvons mettre à jour ces conditions. Tout changement important sera annoncé sur le site avant de s’appliquer."],
      },
    ],
  },
  ht: {
    title: "Kondisyon itilizasyon",
    intro: "Kondisyon sa yo esplike kijan Bayou mache ak sa nou atann de tout moun k ap itilize l.",
    sections: [
      {
        heading: "Sa Bayou ye",
        body: [
          "Bayou pèmèt ou kreye lis kado ak pànye, pataje yo, epi dekouvri pwodwi machann lokal yo. Se pa Bayou ki vann pwodwi machann yo.",
        ],
      },
      {
        heading: "Se machann yo ki vann",
        body: [
          "Chak machann vann pwòp pwodwi li, resevwa lajan pou yo, livre yo epi okipe anilasyon ak ranbousman. Kesyon sou yon pwodwi, yon livrezon oswa yon ranbousman dwe ale kote machann sa a anvan.",
          "Peman sou entènèt atravè Bayou poko louvri. Yon kado ou achte sou yon lòt sit se yon antant ant ou menm ak sit sa a.",
          "Machann yo dwe bay bon enfòmasyon, gen dwa vann sa yo mete, kenbe kantite stòk yo onèt epi respekte kòmand yo aksepte. Bayou verifye machann yo anvan yo parèt epi li ka sispann yo.",
        ],
      },
      {
        heading: "Frè",
        body: [
          "Kounye a Bayou pa fè mèt lis, moun k ap bay kado oswa machann peye anyen. Si sa chanje, n ap anonse l sou sit la anvan nenpòt frè aplike. Fonksyon Premium yo se yon esè sou envitasyon, nou pa vann yo.",
        ],
      },
      {
        heading: "Kont ou",
        body: [
          "Pwoteje aksè imèl ou ak kont koneksyon ou. Se ou ki responsab sa k ap fèt sou kont ou. Ou ka dekonekte lòt navigatè epi efase kont ou nan Paramèt.",
        ],
      },
      {
        heading: "Sa ou pibliye",
        body: [
          "Se ou ki responsab lis, atik, foto ak mesaj ou mete, epi ou dwe gen dwa pataje yo. Pa pibliye anyen ki ilegal, ki twonpe moun, ki gen rayisman oswa ki ka fè moun mal, pa pran plas lòt moun, epi pa mete lyen sou sit ki danjere.",
          "Nou ka retire kontni oswa sispann kont ki pa respekte règ sa yo.",
        ],
      },
      {
        heading: "Disponiblite sèvis la",
        body: [
          "Nou travay pou Bayou rete disponib ak an sekirite, men sèvis la ka chanje oswa kanpe pou yon ti tan. Nan limit lalwa pèmèt, Bayou pa responsab pwodwi machann yo vann ni pèt endirèk.",
        ],
      },
      {
        heading: "Chanjman",
        body: ["Nou ka mete kondisyon sa yo ajou. Si yon chanjman enpòtan, n ap di sa sou sit la anvan li aplike."],
      },
    ],
  },
};

const contact: Record<LegalLocale, { title: string; intro: string; merchants: string; privacy: string }> = {
  en: {
    title: "Contact us",
    intro: "Write to us for help with your account, a list, or anything on Bayou.",
    merchants: "For a question about a product, a delivery or a refund, contact the merchant first: merchants are the sellers.",
    privacy: "To download or delete your data, use Settings. For any other privacy request, write to the address above.",
  },
  fr: {
    title: "Contactez-nous",
    intro: "Écrivez-nous pour obtenir de l’aide avec votre compte, une liste ou tout ce qui concerne Bayou.",
    merchants: "Pour une question sur un produit, une livraison ou un remboursement, contactez d’abord le commerce : ce sont les commerces qui vendent.",
    privacy: "Pour télécharger ou supprimer vos données, utilisez les Paramètres. Pour toute autre demande liée à la vie privée, écrivez à l’adresse ci-dessus.",
  },
  ht: {
    title: "Kontakte nou",
    intro: "Ekri nou si ou bezwen èd ak kont ou, yon lis oswa nenpòt bagay sou Bayou.",
    merchants: "Pou yon kesyon sou yon pwodwi, yon livrezon oswa yon ranbousman, kontakte machann nan anvan: se machann yo ki vann.",
    privacy: "Pou telechaje oswa efase done ou, sèvi ak Paramèt. Pou nenpòt lòt demann sou vi prive, ekri nan adrès ki anwo a.",
  },
};

const pick = <T,>(table: Record<LegalLocale, T>, locale: string): T =>
  table[(["ht", "fr", "en"].includes(locale) ? locale : "en") as LegalLocale];

export const legalShared = (locale: string) => pick(shared, locale);
export const privacyCopy = (locale: string) => pick(privacy, locale);
export const termsCopy = (locale: string) => pick(terms, locale);
export const contactPageCopy = (locale: string) => pick(contact, locale);

/** Support address from configuration. Never hardcoded; null until the owner sets SUPPORT_EMAIL. */
export function supportEmail(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value : null;
}
