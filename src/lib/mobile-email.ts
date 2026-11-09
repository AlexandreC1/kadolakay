import { Resend } from "resend";
import { brandEmailSender } from "./brand";
import { escapeHtml, type EmailLocale } from "./email";

const copy = {
  ht: { subject: (c: string) => `${c} se kòd koneksyon Bayou ou`, line: "Men kòd pou konekte nan app Bayou a:", expires: "Li valab pandan 10 minit. Si se pa ou ki mande l, ou ka inyore imèl sa a." },
  fr: { subject: (c: string) => `${c} est votre code de connexion Bayou`, line: "Voici votre code pour vous connecter à l’app Bayou :", expires: "Il est valable 10 minutes. Si vous ne l’avez pas demandé, ignorez cet e-mail." },
  en: { subject: (c: string) => `${c} is your Bayou sign-in code`, line: "Here is your code to sign in to the Bayou app:", expires: "It works for 10 minutes. If you did not ask for it, you can ignore this email." },
} as const;

/** Which provider will carry sign-in codes, or null when none is configured. */
export function codeMailer(): "resend" | "brevo" | null {
  if (process.env.AUTH_RESEND_KEY && process.env.AUTH_RESEND_FROM) return "resend";
  if (process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS) return "brevo";
  return null;
}

/**
 * Sends a 6-digit code. Resend needs a verified domain to reach any address;
 * Brevo can send from one verified sender address, which suits a pilot without a domain.
 * Returns false when nothing was sent, so the caller can say so instead of pretending.
 */
export async function sendSignInCode(to: string, code: string, locale: EmailLocale): Promise<boolean> {
  const c = copy[locale];
  const subject = c.subject(code);
  const text = `${c.line}\n\n${code}\n\n${c.expires}`;
  const html = `<p>${escapeHtml(c.line)}</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>${escapeHtml(c.expires)}</p>`;
  const mailer = codeMailer();
  try {
    if (mailer === "resend") {
      const result = await new Resend(process.env.AUTH_RESEND_KEY).emails.send({
        from: brandEmailSender(process.env.AUTH_RESEND_FROM) ?? "", to, subject, text, html,
      });
      return !result.error;
    }
    if (mailer === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: { name: "Bayou", email: process.env.EMAIL_FROM_ADDRESS },
          to: [{ email: to }], subject, textContent: text, htmlContent: html,
        }),
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    }
  } catch {
    console.error("Sign-in code email failed");
  }
  return false;
}
