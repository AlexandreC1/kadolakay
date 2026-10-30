import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { foundationsCopy } from "@/lib/foundations-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveMerchantPreference } from "@/actions/foundations";
import { Link } from "@/i18n/navigation";

export default async function MerchantPaymentsPage() {
  const locale = await getLocale();
  const c = foundationsCopy(locale);
  const session = await auth();
  if (!session?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/business/payments`)}`,
    );
  const business = await db.business.findUnique({
    where: { ownerId: session.user.id },
    select: { status: true, paymentProfile: { select: { provider: true } } },
  });
  if (!business) redirect(`/${locale}/business/signup`);
  return (
    <div className="foundation-page foundation-narrow">
      <Link href="/business/dashboard">{c.merchantDashboard}</Link>
      <header className="foundation-intro">
        <h1>{c.paymentTitle}</h1>
        <p>{c.paymentCopy}</p>
      </header>
      <section className="foundation-panel">
        <h2>{c.paymentPending}</h2>
        <p>{c.paymentUnavailable}</p>
        {business.status !== "SUSPENDED" && (
          <FoundationForm
            action={saveMerchantPreference}
            locale={locale}
            label={c.request}
          >
            <label htmlFor="provider">{c.provider}</label>
            <select
              id="provider"
              name="provider"
              defaultValue={business.paymentProfile?.provider || "moncash"}
            >
              <option value="moncash">MonCash</option>
              <option value="natcash">NatCash</option>
              <option value="card">{c.card}</option>
            </select>
          </FoundationForm>
        )}
      </section>
    </div>
  );
}
