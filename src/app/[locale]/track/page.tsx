import { getLocale } from "next-intl/server";
import { trackingCopy } from "@/lib/tracking-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { openGuestPurchase } from "@/actions/tracking";
import { Link } from "@/i18n/navigation";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function TrackPage() {
  const locale = await getLocale(),
    c = trackingCopy(locale);
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </header>
      <FoundationForm action={openGuestPurchase} label={c.open} locale={locale}>
        <label htmlFor="track-code">{c.code}</label>
        <input
          id="track-code"
          name="code"
          required
          minLength={36}
          maxLength={36}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="foundation-note">{c.hint}</p>
      </FoundationForm>
      <p className="mt-8">
        <Link href="/purchases">{c.purchases}</Link>
      </p>
    </div>
  );
}
