import { auth } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { BasketDetails } from "@/components/registry/BasketDetails";
import { workspaceCopy } from "@/lib/workspace-copy";
export default async function NewBasketPage() {
  const locale = await getLocale(),
    c = workspaceCopy(locale);
  if (!(await auth())?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/baskets/new`)}`,
    );
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.createBasket}</h1>
        <p>{c.basketIntro}</p>
      </header>
      <p className="foundation-note">{c.privateHint}</p>
      <BasketDetails locale={locale} />
    </div>
  );
}
