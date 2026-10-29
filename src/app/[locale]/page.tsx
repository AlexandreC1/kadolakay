import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { homeCopy } from "@/lib/home-copy";
import { directoryCopy } from "@/lib/directory-copy";
import HomeMotion from "@/components/hero/HomeMotion";
import "./lakou.css";
import "./lakou-refinement.css";

export default async function HomePage(){
  const locale=await getLocale(),c=homeCopy(locale),d=directoryCopy(locale),t=await getTranslations();
  return <HomeMotion>
    <section className="lakou-hero" aria-labelledby="lakou-title"><div className="lakou-hero-copy"><p className="lakou-kicker">{t("landing.eyebrow")}</p><h1 id="lakou-title">{c.title}<span>{c.title2}</span></h1><p className="lakou-intro">{c.intro}</p><div className="lakou-actions"><Link href="/create" className="lakou-primary">{t("nav.createRegistry")}</Link></div><p className="lakou-note">{c.note}</p></div>
    <section className="lakou-finder lakou-hero-finder" aria-label={c.find}><div><p>{c.findHint}</p><h2>{c.find}</h2></div><form action={locale==="ht"?"/find":`/${locale}/find`} method="get"><label className="sr-only" htmlFor="home-registry-link">{c.address}</label><input id="home-registry-link" name="q" placeholder={c.address} maxLength={500} required/><button type="submit">{c.open}</button></form><Link href="/find" className="lakou-scan">{({en:"Scan a QR code",fr:"Scanner un code QR",ht:"Eskane yon kòd QR"} as Record<string,string>)[locale] || "Scan a QR code"}</Link></section></section>
    <section className="lakou-discover" aria-labelledby="discover-heading"><div><h2 id="discover-heading">{d.title}</h2><p>{d.intro}</p><Link href="/browse">{c.browse}</Link></div><div className="lakou-merchant-entry"><p>{d.join}</p><Link href="/business/signup">{d.register}</Link></div></section>
    <section className="lakou-occasions" aria-labelledby="occasion-heading"><h2 id="occasion-heading">{c.occasions}</h2><div>{(["WEDDING","BABY_SHOWER","BIRTHDAY"] as const).map((type)=><Link key={type} href={`/create?type=${type}`}><strong>{t(`registry.${type==="WEDDING"?"wedding":type==="BABY_SHOWER"?"babyShower":"birthday"}`)}</strong><span>{type==="WEDDING"?c.wedding:type==="BABY_SHOWER"?c.baby:c.birthday}</span><span className="occasion-create">{c.start}</span></Link>)}</div></section>
  </HomeMotion>;
}
