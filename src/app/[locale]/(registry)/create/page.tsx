import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateRegistryForm } from "./CreateRegistryForm";

export default async function CreateRegistryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/create");
  }

  const t = await getTranslations("registry");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">{t("create")}</h1>
      <p className="mt-2 text-gray-600">{t("registryTypes")}</p>

      <div className="mt-8">
        <CreateRegistryForm />
      </div>
    </div>
  );
}
