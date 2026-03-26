import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BusinessSignupForm } from "./BusinessSignupForm";

export default async function BusinessSignupPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/business/signup");
  }

  const t = await getTranslations("business");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">{t("signup")}</h1>
      <p className="mt-2 text-gray-600">{t("signupDesc")}</p>

      <div className="mt-8">
        <BusinessSignupForm />
      </div>
    </div>
  );
}
