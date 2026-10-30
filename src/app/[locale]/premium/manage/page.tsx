import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { foundationsCopy } from "@/lib/foundations-copy";
import { palettes } from "@/lib/seasons";
import {
  getPremiumAccess,
  registryInsights,
} from "@/services/product-foundations";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveRegistryPalette } from "@/actions/foundations";
import { Link } from "@/i18n/navigation";

export default async function PremiumManagePage() {
  const locale = await getLocale();
  const c = foundationsCopy(locale);
  const session = await auth();
  if (!session?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/premium/manage`)}`,
    );
  const access = await getPremiumAccess(session.user.id);
  // Free users may reset saved palettes; aggregate insights remain server-gated.
  const registries = await db.registry.findMany({
    where: { userId: session.user.id, status: { not: "ARCHIVED" } },
    select: { id: true, title: true, palette: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 30,
  });
  const insights = access.active ? await registryInsights(session.user.id) : [];
  return (
    <div className="foundation-page">
      <Link href="/premium">{c.premium}</Link>
      <header className="foundation-intro">
        <h1>{c.personalization}</h1>
        <p>{access.active ? c.premiumDetails : c.premiumInactive}</p>
      </header>
      <p className="foundation-note">{c.reset}</p>
      {!registries.length && (
        <p>
          {c.noRegistry}{" "}
          <Link href="/create">
            {locale === "fr"
              ? "Créer une liste"
              : locale === "ht"
                ? "Kreye yon lis"
                : "Create a registry"}
          </Link>
        </p>
      )}
      <div className="premium-registry-list">
        {registries.map((r) => (
          <section className="foundation-panel" key={r.id}>
            <h2>{r.title}</h2>
            <FoundationForm
              action={saveRegistryPalette}
              locale={locale}
              label={c.save}
            >
              <input type="hidden" name="registryId" value={r.id} />
              <label htmlFor={`palette-${r.id}`}>{c.palette}</label>
              <select
                name="palette"
                id={`palette-${r.id}`}
                defaultValue={access.active ? r.palette : "mint"}
              >
                {palettes.map((p) => (
                  <option
                    value={p}
                    key={p}
                    disabled={!access.active && p !== "mint"}
                  >
                    {c.palettes[p]}
                  </option>
                ))}
              </select>
            </FoundationForm>
          </section>
        ))}
      </div>
      {access.active && (
        <section className="premium-insights">
          <h2>{c.insights}</h2>
          <p>{c.scope}</p>
          <div className="insights-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{c.registry}</th>
                  <th scope="col">{c.completion}</th>
                  {[c.requested, c.fulfilled, c.held, c.unmet].map((v) => (
                    <th scope="col" key={v}>
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {insights.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      <Link href={`/r/${r.slug}/edit`}>{r.title}</Link>
                    </th>
                    <td>
                      {String(
                        r.requested > BigInt(0)
                          ? (r.fulfilled * BigInt(100)) / r.requested
                          : BigInt(0),
                      )}
                      %
                    </td>
                    <td>{String(r.requested)}</td>
                    <td>{String(r.fulfilled)}</td>
                    <td>{String(r.held)}</td>
                    <td>{String(r.requested - r.fulfilled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
