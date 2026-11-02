import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { workspaceCopy } from "@/lib/workspace-copy";
import { foundationsCopy } from "@/lib/foundations-copy";
import { isAdministrator } from "@/services/permissions";
import { pendingMfaSetup } from "@/services/mfa";
import { FoundationForm } from "@/components/shared/FoundationForm";
import { MfaConfirmForm } from "@/components/shared/MfaConfirmForm";
import {
  startAuthenticator,
  verifyAuthenticator,
  revokeBrowser,
} from "@/actions/workspaces";
import { Link } from "@/i18n/navigation";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
};
export default async function SecurityPage() {
  const locale = await getLocale(),
    c = workspaceCopy(locale),
    session = await auth();
  if (!session?.user?.id)
    redirect(
      `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/security`)}`,
    );
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, mfaSecret: true },
  });
  if (!user) redirect(`/${locale}/login`);
  const devices = await db.deviceSession.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      label: true,
      createdAt: true,
      expiresAt: true,
      mfaVerifiedUntil: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  let pending: Awaited<ReturnType<typeof pendingMfaSetup>> = null;
  if (!user.mfaSecret && isAdministrator(user.role))
    try {
      pending = await pendingMfaSetup(user.id, session.user.deviceSessionId);
    } catch {
      /* Show setup recovery rather than decrypted diagnostics. */
    }
  const qr = pending
    ? await QRCode.toDataURL(
        `otpauth://totp/${encodeURIComponent(`Bayou:${user.id}`)}?secret=${pending.secret}&issuer=Bayou&algorithm=SHA1&digits=6&period=30`,
        { width: 240, margin: 4 },
      )
    : null;
  return (
    <div className="foundation-page foundation-narrow">
      <header className="foundation-intro">
        <h1>{c.security}</h1>
      </header>
      {isAdministrator(user.role) && (
        <section className="foundation-panel workspace-section">
          <h2>{c.mfa}</h2>
          <p>{c.mfaIntro}</p>
          {user.mfaSecret ? (
            <>
              <p>{c.enabled}</p>
              <FoundationForm
                action={verifyAuthenticator}
                locale={locale}
                label={c.verify}
              >
                <label htmlFor="verify-code">{c.code}</label>
                <input
                  id="verify-code"
                  name="code"
                  required
                  minLength={6}
                  maxLength={40}
                  autoComplete="one-time-code"
                />
              </FoundationForm>
              <p className="mt-6">
                <Link href="/admin">{c.admin}</Link>
              </p>
            </>
          ) : pending ? (
            <>
              <p>{c.setupHint}</p>
              {qr && (
                <img src={qr} alt={c.setupSecret} width={240} height={240} />
              )}
              <p>
                {c.setupSecret}:{" "}
                <code className="workspace-code">{pending.secret}</code>
              </p>
              <MfaConfirmForm
                labels={{
                  code: c.code,
                  confirm: c.confirmMfa,
                  recovery: c.recovery,
                  failed: foundationsCopy(locale).invalidDetails,
                  security: c.security,
                }}
              />
            </>
          ) : (
            <FoundationForm
              action={startAuthenticator}
              locale={locale}
              label={c.startMfa}
            >
              <p>{c.setupHint}</p>
            </FoundationForm>
          )}
        </section>
      )}
      <section className="workspace-section">
        <h2>{c.sessions}</h2>
        <div className="workspace-list">
          {devices.map((d) => (
            <article className="foundation-panel" key={d.id}>
              <h3>
                {d.id === session.user.deviceSessionId ? c.current : d.label}
              </h3>
              <p>
                {c.issued}:{" "}
                <time dateTime={d.createdAt.toISOString()}>
                  {d.createdAt.toISOString().slice(0, 16)} UTC
                </time>
              </p>
              <p>
                {c.expires}: {d.expiresAt.toISOString().slice(0, 16)} UTC
              </p>
              <FoundationForm
                action={revokeBrowser}
                locale={locale}
                label={c.revoke}
              >
                <input type="hidden" name="deviceId" value={d.id} />
              </FoundationForm>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
