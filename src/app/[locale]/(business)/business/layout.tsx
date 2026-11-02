import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { workspaceCopy } from "@/lib/workspace-copy";
import { Link } from "@/i18n/navigation";
import { foundationsCopy } from "@/lib/foundations-copy";
export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(),
    locale = await getLocale(),
    c = workspaceCopy(locale);
  const business = session?.user?.id
    ? await db.business.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true },
      })
    : null;
  return (
    <>
      {business && (
        <nav className="workspace-tabs" aria-label={c.businessProfile}>
          {[
            ["/business/dashboard", c.overview],
            ["/business/products", c.products],
            ["/business/orders", c.orders],
            ["/business/profile", c.businessProfile],
            ["/business/payments", foundationsCopy(locale).paymentTitle],
          ].map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
      )}
      {children}
    </>
  );
}
