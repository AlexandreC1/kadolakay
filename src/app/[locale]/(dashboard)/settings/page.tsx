import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings");
  }

  const t = await getTranslations();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      preferredLocale: true,
      image: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {t("nav.settings")}
      </h1>
      <SettingsForm user={user} />
    </div>
  );
}
