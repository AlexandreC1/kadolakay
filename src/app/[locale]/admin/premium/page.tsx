import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { savePremiumGrant, removePremiumGrant } from "@/actions/foundations";
import { foundationsCopy } from "@/lib/foundations-copy";

export default async function AdminPremiumPage() {
  const locale = await getLocale();
  const c = foundationsCopy(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const actor = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (actor?.role !== "SUPERADMIN") notFound();
  const labels =
    locale === "fr"
      ? {
          title: "Accès pilote Premium",
          hint: "Accordez un accès temporaire à un identifiant de compte vérifié. Aucune facturation. Cette décision est auditée et ne change aucun rôle.",
          id: "Identifiant du compte",
          days: "Durée (1 à 365 jours)",
          grant: "Accorder l’accès",
        }
      : locale === "ht"
        ? {
            title: "Aksè pilòt Premium",
            hint: "Bay yon kont verifye aksè tanporè. Pa gen fakti. Desizyon sa a anrejistre epi li pa chanje wòl kont lan.",
            id: "Idantifyan kont lan",
            days: "Dire (1 rive 365 jou)",
            grant: "Bay aksè",
          }
        : {
            title: "Premium pilot access",
            hint: "Grant temporary access to a verified account ID. No billing. This decision is audited and does not change account roles.",
            id: "Account ID",
            days: "Duration (1 to 365 days)",
            grant: "Grant access",
          };
  return (
    <div className="foundation-page foundation-narrow">
      <p className="foundation-eyebrow">{c.premium}</p>
      <header className="foundation-intro">
        <h1>{labels.title}</h1>
        <p>{labels.hint}</p>
      </header>
      <FoundationForm
        action={savePremiumGrant}
        locale={locale}
        label={labels.grant}
      >
        <label htmlFor="targetId">{labels.id}</label>
        <input
          id="targetId"
          name="targetId"
          maxLength={100}
          required
          defaultValue={session.user.id}
        />
        <label htmlFor="days">{labels.days}</label>
        <input
          id="days"
          type="number"
          name="days"
          required
          min={1}
          max={365}
          defaultValue={30}
        />
      </FoundationForm>
      <section className="premium-insights">
        <FoundationForm
          action={removePremiumGrant}
          locale={locale}
          label={
            locale === "fr"
              ? "Révoquer l’accès"
              : locale === "ht"
                ? "Retire aksè"
                : "Revoke access"
          }
        >
          <label htmlFor="revoke-target">{labels.id}</label>
          <input id="revoke-target" name="targetId" required maxLength={100} />
        </FoundationForm>
      </section>
    </div>
  );
}
