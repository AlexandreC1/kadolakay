import { safeAuthRedirect } from "@/lib/auth-config";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAuthAvailability } from "@/lib/auth-config";
import { LoginForm } from "./LoginForm";
import { ArrowLeft } from "lucide-react";
import "./login.css";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; verify?: string; callbackUrl?: string }>;
}) {
  const t = await getTranslations("auth");
  const query = await searchParams;
  const requested = typeof query.callbackUrl === "string" ? query.callbackUrl : undefined;
  const safeTarget = requested ? new URL(safeAuthRedirect(requested, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")) : undefined;
  const callbackUrl = safeTarget ? `${safeTarget.pathname}${safeTarget.search}` : undefined;
  return (
    <div className="login-shell">
      <section aria-labelledby="login-title" className="login-card">
        <header className="login-heading"><h1 id="login-title">{t("loginTitle")}</h1>
        <p className="login-subtitle">{t("loginSubtitle")}</p></header>
        <LoginForm callbackUrl={callbackUrl} {...getAuthAvailability(process.env)} initialError={typeof query.error === "string" ? query.error : undefined} verified={query.verify === "true"} />
        <div className="login-public-link"><Link href="/find">{t("findRegistry")}</Link></div>
      </section>
      <Link href="/" className="login-back"><ArrowLeft size={15} aria-hidden="true" />{t("backHome")}</Link>
    </div>
  );
}
