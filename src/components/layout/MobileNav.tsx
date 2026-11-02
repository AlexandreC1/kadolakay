"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  useSafeMutation,
  MutationFeedback,
} from "@/components/shared/useSafeMutation";
import { Link } from "@/i18n/navigation";
import { catalogCopy } from "@/lib/catalog-copy";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { trackingCopy } from "@/lib/tracking-copy";
import { workspaceCopy } from "@/lib/workspace-copy";
import { featureNavCopy } from "@/lib/feature-nav-copy";
import { onboardingCopy } from "@/lib/onboarding-copy";
import type { Role } from "@prisma/client";
import { isAdministrator } from "@/services/permissions";

interface MobileNavProps {
  user?: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
    role?: Role;
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const { pending, status, run } = useSafeMutation();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  return (
    <div className="mobile-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mobile-menu-trigger"
        aria-label={
          locale === "ht"
            ? open
              ? "Fèmen meni"
              : "Louvri meni"
            : locale === "fr"
              ? open
                ? "Fermer le menu"
                : "Ouvrir le menu"
              : open
                ? "Close menu"
                : "Open menu"
        }
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <svg
          width="23"
          height="23"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeWidth="1.5"
            d={open ? "M6 6l12 12M6 18 18 6" : "M4 8h16M4 16h16"}
          />
        </svg>
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label={t("landing.mainNavigation")}
        >
          <Link href="/" onClick={() => setOpen(false)}>
            {featureNavCopy(locale).home}
          </Link>
          {user?.role === "SUPERADMIN" && (
            <p className="text-xs font-semibold text-[var(--brand-muted)]">
              {t("auth.superadmin")}
            </p>
          )}
          {isAdministrator(user?.role) && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              {t("nav.administration")}
            </Link>
          )}
          <Link href="/track" onClick={() => setOpen(false)}>
            {trackingCopy(locale).title}
          </Link>
          <Link href="/registries" onClick={() => setOpen(false)}>
            {workspaceCopy(locale).registrySearch}
          </Link>
          <Link href="/find" onClick={() => setOpen(false)}>
            {catalogCopy(locale).find}
          </Link>
          <Link href="/create" onClick={() => setOpen(false)}>
            {t("nav.createRegistry")}
          </Link>
          <Link href="/discover" onClick={() => setOpen(false)}>
            {featureNavCopy(locale).discover}
          </Link>
          <Link href="/business" onClick={() => setOpen(false)}>
            {featureNavCopy(locale).businessLink}
          </Link>
          <Link href="/premium" onClick={() => setOpen(false)}>
            {featureNavCopy(locale).premium}
          </Link>
          <Link href="/appearance" onClick={() => setOpen(false)}>
            {featureNavCopy(locale).season}
          </Link>
          {user?.role === "SUPERADMIN" && (
            <Link href="/admin/premium" onClick={() => setOpen(false)}>
              {featureNavCopy(locale).manage}
            </Link>
          )}
          <Link href="/browse" onClick={() => setOpen(false)}>
            {t("nav.businesses")}
          </Link>
          {user && (
            <>
              <Link
                href="/baskets"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm"
              >
                {workspaceCopy(locale).baskets}
              </Link>
              <Link
                href="/purchases"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm"
              >
                {trackingCopy(locale).purchases}
              </Link>
              <Link
                href="/security"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm"
              >
                {workspaceCopy(locale).security}
              </Link>
              <Link href="/onboarding?review=1" onClick={() => setOpen(false)}>
                {onboardingCopy(locale).getStarted}
              </Link>
            </>
          )}
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                {t("nav.dashboard")}
              </Link>
              <Link href="/my-registries" onClick={() => setOpen(false)}>
                {t("nav.myRegistries")}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => signOut({ callbackUrl: `/${locale}` }))
                }
              >
                {t("common.signOut")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)}>
                {t("common.signIn")}
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                {t("common.signUp")}
              </Link>
            </>
          )}
          <div className="mobile-theme">
            <ThemeSwitcher showLabel />
          </div>
          <MutationFeedback status={status} />
        </nav>
      )}
    </div>
  );
}
