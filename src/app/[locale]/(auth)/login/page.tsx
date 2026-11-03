import { authProviderAvailability } from "@/lib/auth-provider-config";
import {Brand} from "@/components/layout/Brand";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const {error} = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            <Brand />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("loginTitle")}
          </h1>
          <p className="mt-1 text-gray-600">{t("loginSubtitle")}</p>
        </div>

        <LoginForm availability={authProviderAvailability()} initialError={Boolean(error)} />
      </div>
    </div>
  );
}
