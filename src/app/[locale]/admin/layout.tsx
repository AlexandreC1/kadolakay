import { requireBackoffice } from "@/services/backoffice-auth";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBackoffice();
  const c = workspaceCopy(await getLocale());
  return (
    <div className="admin-workspace">
      <nav className="workspace-tabs" aria-label={c.admin}>
        {[
          ["/admin", c.overview],
          ["/admin/accounts", c.accounts],
          ["/admin/businesses", c.merchants],
          ["/admin/orders", c.orders],
          ["/admin/audit", c.audit],
          ["/admin/seasons", c.seasons],
          ["/admin/premium", "Premium"],
          ["/security", c.mfa],
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
