import { requireBackoffice } from "@/services/backoffice-auth";
import { readAudit } from "@/services/backoffice";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; target?: string }>;
}) {
  await requireBackoffice();
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    raw = await searchParams;
  let result: Awaited<ReturnType<typeof readAudit>> | null = null;
  try {
    result = await readAudit(raw);
  } catch {
    /* Bounded invalid-search recovery. */
  }
  const [roles, sessions, premium] = await Promise.all([
    db.userRoleAuditEvent.findMany({
      select: {
        id: true,
        actorId: true,
        targetId: true,
        previousRole: true,
        nextRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.sessionRevocationEvent.findMany({
      select: { id: true, actorId: true, targetId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.premiumAuditEvent.findMany({
      select: {
        id: true,
        actorId: true,
        targetId: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const reviews = await db.securityAuditEvent.findMany({
    select: {
      id: true,
      actorId: true,
      action: true,
      targetId: true,
      previousStatus: true,
      nextStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <div className="foundation-page">
      <header className="foundation-intro">
        <h1>{c.audit}</h1>
        <p>{c.readOnly}</p>
      </header>
      <form className="foundation-form" method="get">
        <label htmlFor="audit-target">{c.target}</label>
        <input
          id="audit-target"
          name="target"
          maxLength={100}
          defaultValue={typeof raw.target === "string" ? raw.target : ""}
        />
        <button>{c.search}</button>
      </form>
      <div className="insights-scroll">
        <table className="workspace-table">
          <thead>
            <tr>
              {[c.date, c.action, c.identity, c.target, c.status].map((v) => (
                <th key={v} scope="col">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result?.items.map((e) => (
              <tr key={e.id}>
                <td>{e.createdAt.toISOString()}</td>
                <td>{e.action}</td>
                <td>{e.actorId}</td>
                <td>{e.targetId}</td>
                <td>
                  {e.previousValue} / {e.nextValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result?.next && (
        <Link
          href={`/admin/audit?${new URLSearchParams({ after: result.next, target: raw.target || "" })}`}
        >
          {c.next}
        </Link>
      )}
      {[
        [
          c.role,
          roles.map((e) => ({
            ...e,
            status: e.previousRole + " / " + e.nextRole,
          })),
        ],
        [c.sessions, sessions.map((e) => ({ ...e, status: "REVOKED" }))],
        [
          "Premium",
          premium.map((e) => ({ ...e, status: e.expiresAt.toISOString() })),
        ],
      ].map(([label, rows]) => (
        <section className="workspace-section" key={label as string}>
          <h2>{label as string}</h2>
          <div className="insights-scroll">
            <table className="workspace-table">
              <thead>
                <tr>
                  {[c.date, c.identity, c.target, c.status].map((v) => (
                    <th key={v} scope="col">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  rows as {
                    id: string;
                    actorId: string;
                    targetId: string;
                    createdAt: Date;
                    status: string;
                  }[]
                ).map((e) => (
                  <tr key={e.id}>
                    <td>{e.createdAt.toISOString()}</td>
                    <td>{e.actorId}</td>
                    <td>{e.targetId}</td>
                    <td>{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="workspace-section">
        <h2>{c.merchants}</h2>
        <div className="insights-scroll">
          <table className="workspace-table">
            <tbody>
              {reviews.map((e) => (
                <tr key={e.id}>
                  <td>{e.createdAt.toISOString()}</td>
                  <td>{e.action}</td>
                  <td>{e.targetId}</td>
                  <td>
                    {e.previousStatus} / {e.nextStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
