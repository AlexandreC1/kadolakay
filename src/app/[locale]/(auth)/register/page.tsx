import { getTranslations } from "next-intl/server";
import { LoginForm } from "../login/LoginForm";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            <span className="text-3xl font-bold text-blue-700">Kado</span>
            <span className="text-3xl font-bold text-amber-500">Lakay</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("signupTitle")}
          </h1>
          <p className="mt-1 text-gray-600">{t("signupSubtitle")}</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
