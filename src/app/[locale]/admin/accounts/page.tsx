import { requireBackoffice } from "@/services/backoffice-auth";
import { listAdminAccounts, accountSearchSchema } from "@/services/backoffice";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { saveAccount } from "@/actions/workspaces";
import { Link } from "@/i18n/navigation";
export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireBackoffice(),
    locale = await getLocale(),
    c = workspaceCopy(locale),
    raw = await searchParams,
    parsed = accountSearchSchema.safeParse({ q: raw.q, after: raw.after });
  const result = parsed.success ? await listAdminAccounts(parsed.data) : null;
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.accounts}</h1>
        <p>{c.grantNote}</p>
      </header>
      <form className="foundation-form" method="get">
        <label htmlFor="account-q">{c.search}</label>
        <input
          id="account-q"
          name="q"
          maxLength={80}
          defaultValue={parsed.success ? parsed.data.q : ""}
        />
        <button>{c.search}</button>
      </form>
      {!parsed.success && (
        <p role="alert" className="foundation-error">
          {c.searchError}
        </p>
      )}
      <div className="workspace-list">
        {result?.items.map((u) => (
          <article className="foundation-panel" key={u.id}>
            <h2>{u.name || u.email}</h2>
            <p>{u.email}</p>
            <p className="workspace-code">
              {c.accountId}: {u.id}
            </p>
            <p>
              {c.role}: {u.role} · {u.suspendedAt ? c.suspended : c.active}
            </p>
            {actor.role === "SUPERADMIN" &&
              u.role !== "SUPERADMIN" &&
              u.id !== actor.id && (
                <div className="workspace-columns">
                  <FoundationForm
                    action={saveAccount}
                    locale={locale}
                    label={u.suspendedAt ? c.restore : c.suspend}
                  >
                    <input type="hidden" name="targetId" value={u.id} />
                    <input
                      type="hidden"
                      name="operation"
                      value={u.suspendedAt ? "RESTORE" : "SUSPEND"}
                    />
                  </FoundationForm>
                  <FoundationForm
                    action={saveAccount}
                    locale={locale}
                    label={c.save}
                  >
                    <input type="hidden" name="targetId" value={u.id} />
                    <input type="hidden" name="operation" value="ROLE" />
                    <label htmlFor={`role-${u.id}`}>{c.role}</label>
                    <select
                      id={`role-${u.id}`}
                      name="role"
                      defaultValue={u.role}
                    >
                      {["USER", "BUSINESS_OWNER", "ADMIN"].map((r) => (
                        <option
                          value={r}
                          key={r}
                          disabled={r === "USER" && Boolean(u.business)}
                        >
                          {r}
                        </option>
                      ))}
                    </select>
                  </FoundationForm>
                </div>
              )}
          </article>
        ))}
      </div>
      {!result?.items.length && <p>{c.noResults}</p>}
      {result?.next && (
        <Link
          href={`/admin/accounts?${new URLSearchParams({ q: parsed.success ? parsed.data.q : "", after: result.next })}`}
        >
          {c.next}
        </Link>
      )}
    </div>
  );
}
