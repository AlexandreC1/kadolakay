import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { readOrderContact } from "@/services/order-contact";
import { OrderContact } from "@/components/business/OrderContact";
import { Link } from "@/i18n/navigation";
import { workspaceCopy } from "@/lib/workspace-copy";
export default async function MerchantOrderContact({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale(),
    session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const id = (await params).id;
  let contact;
  try {
    contact = await readOrderContact(session.user.id, id, "MERCHANT");
  } catch {
    notFound();
  }
  return (
    <div className="foundation-page">
      <Link href="/business/orders">{workspaceCopy(locale).orders}</Link>
      <OrderContact locale={locale} orderId={id} contact={contact} />
    </div>
  );
}
