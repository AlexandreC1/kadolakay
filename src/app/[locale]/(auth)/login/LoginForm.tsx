"use client";

// Adapted from Spectrum UI login-card, Apache-2.0. See third-party/spectrum-ui.
// Modified: Auth.js behavior, localization, semantic colors and reduced-motion CSS.
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { authErrorKey, type SocialProvider } from "@/lib/auth-config";

const names: Record<SocialProvider, string> = {
  google: "Google",
  "microsoft-entra-id": "Microsoft",
  github: "GitHub",
};

function ProviderMark({ provider }: { provider: SocialProvider }) {
  if (provider === "github") return <span className="login-provider-initials" aria-hidden="true">GH</span>;
  if (provider === "microsoft-entra-id") return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M1 1h8v8H1zM11 1h8v8h-8zM1 11h8v8H1zM11 11h8v8h-8z" /></svg>;
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.83-1.76-5.63-4.13H3.03v2.59A10 10 0 0 0 12 22ZM6.37 13.91A6 6 0 0 1 6.05 12c0-.66.11-1.31.32-1.91V7.5H3.03A10 10 0 0 0 2 12c0 1.61.38 3.13 1.03 4.5l3.34-2.59ZM12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.97 5.5l3.34 2.59C7.17 7.72 9.39 5.96 12 5.96Z" /></svg>;
}

export function LoginForm({ social, email: emailAvailable, initialError, verified, callbackUrl: requestedCallback }: {
  social: SocialProvider[];
  email: boolean;
  initialError?: string;
  verified?: boolean;
  callbackUrl?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(verified ?? false);
  const [loading, setLoading] = useState<string | null>(null);
  const submission = useRef(false);
  const [error, setError] = useState(initialError ? authErrorKey(initialError) : "");
  const callbackUrl = requestedCallback || `/${locale}/onboarding`;

  async function handleSocialSignIn(provider: SocialProvider) {
    if (submission.current || !social.includes(provider)) return;
    submission.current = true;
    setLoading(provider);
    setError("");
    try {
      const result = await signIn(provider, { callbackUrl, redirect: false });
      if (!result?.ok || result.error || !result.url) {
        setError(authErrorKey(result?.error));
        return;
      }
      // Auth.js builds this provider URL using its registered OAuth configuration.
      window.location.assign(result.url);
    } catch {
      setError("networkError");
    } finally {
      submission.current = false;
      setLoading(null);
    }
  }

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.current || !emailAvailable) return;
    submission.current = true;
    setLoading("email");
    setError("");
    try {
      const result = await signIn("resend", { email: email.trim(), callbackUrl, redirect: false });
      if (!result?.ok || result.error) {
        setError(authErrorKey(result?.error));
        return;
      }
      setEmailSent(true);
    } catch {
      setError("networkError");
    } finally {
      submission.current = false;
      setLoading(null);
    }
  }

  return (
    <div className="login-form" aria-busy={Boolean(loading)}>
      {error && <p role="alert" className="login-feedback login-feedback-error">{t(error)}</p>}
      {emailSent ? (
        <div className="login-feedback login-feedback-success" role="status">
          <Check size={22} aria-hidden="true" />
          <h2>{t("checkEmail")}</h2>
          <p>{t("checkEmailDesc")}</p>
          <button type="button" className="login-text-button" onClick={() => setEmailSent(false)}>{t("tryAnotherEmail")}</button>
        </div>
      ) : (
        <>
          {(emailAvailable || social.length === 0) && <>
            <form onSubmit={handleEmailSignIn} className="login-email-form">
              <label htmlFor="sign-in-email">{t("emailLabel")}</label>
              <div className="login-email-control">
                <input id="sign-in-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder={t("emailPlaceholder")} value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!emailAvailable || Boolean(loading)} aria-describedby="login-email-help" />
                <button className="login-email-submit" type="submit" disabled={!emailAvailable || Boolean(loading) || !email.trim()} aria-label={loading === "email" ? t("sending") : t("continueWithEmail")} title={t("continueWithEmail")}>
                  {loading === "email" ? <LoaderCircle className="login-spinner" size={18} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
                </button>
              </div>
              <p id="login-email-help" className="login-email-help" role={!emailAvailable ? "status" : undefined}>{t(emailAvailable ? "emailHint" : "unavailable")}</p>
              <p className="sr-only" role="status">{loading === "email" ? t("sending") : ""}</p>
            </form>
          </>}
          <>
            {(emailAvailable || social.length === 0) && <p className="login-divider">{t("providerAlternative")}</p>}
            <div className="login-providers">
              {(social.length ? social : ["google", "microsoft-entra-id", "github"] as SocialProvider[]).map((provider) => (
                <button type="button" key={provider} className="login-provider" onClick={() => handleSocialSignIn(provider)} disabled={!social.includes(provider) || Boolean(loading)} title={!social.includes(provider) ? t("unavailable") : undefined}>
                  <span className="login-provider-mark"><ProviderMark provider={provider} /></span>
                  <span>{t("continueWithProvider", { provider: names[provider] })}</span>
                  {loading === provider && <span className="login-provider-end"><LoaderCircle className="login-spinner" size={17} aria-hidden="true" /></span>}
                </button>
              ))}
            </div>
          </>
          {(social.length > 0 || emailAvailable) && <p className="login-security-note">{t("securityNote")}</p>}
        </>
      )}
    </div>
  );
}
