import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const copy = {
  ht: { title: "Nou pa jwenn paj sa a.", description: "Lyen sa a ka chanje oswa li ka pa egziste ankò. Retounen nan akèy la pou kontinye.", home: "Retounen nan akèy" },
  fr: { title: "Cette page est introuvable.", description: "Ce lien a peut-être changé ou n’existe plus. Retournez à l’accueil pour continuer.", home: "Retour à l’accueil" },
  en: { title: "We couldn't find that page.", description: "This link may have changed or no longer exists. Head back home to keep going.", home: "Back to home" }
};

export default async function NotFound() {
  const locale = await getLocale();
  const text = copy[locale as keyof typeof copy] || copy.ht;
  return <div className="recovery-state"><div><span className="recovery-number" aria-hidden="true">404</span><h1>{text.title}</h1><p>{text.description}</p><Link className="action-primary" href="/">{text.home}</Link></div></div>;
}
