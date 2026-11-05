"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import type { Theme } from "@/lib/theme";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface MobileNavProps {
  user?: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
  theme: Theme;
}

export function MobileNav({ user, theme }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  function closeWithFocus() { setOpen(false); triggerRef.current?.focus(); }
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="xl:hidden">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600 hover:text-gray-900"
        aria-label={t("header.menu")}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onKeyDown={(event) => { if (event.key === "Escape") closeWithFocus(); }}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div id="mobile-navigation" onKeyDown={(event) => { if (event.key === "Escape") closeWithFocus(); }} className="absolute top-16 left-0 right-0 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-gray-200 bg-surface shadow-xl">
          <nav aria-label={t("header.navigation")} className="flex flex-col p-4 space-y-3">
            <form action={`/${locale}/gifts`} method="get" role="search" className="flex gap-2">
              <label className="sr-only" htmlFor="mobile-product-search">{t("header.searchProducts")}</label>
              <input id="mobile-product-search" name="q" maxLength={64} placeholder={t("header.searchProducts")} className="min-w-0 flex-1 rounded-full border border-gray-300 bg-surface px-4 py-2 text-gray-900" />
              <button type="submit" className="rounded-full bg-gold-400 px-4 text-sm font-semibold text-brand-950">{t("common.search")}</button>
            </form>
            <Link href="/find" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-gray-700">{t("header.findRegistry")}</Link>
            <Link href="/gifts" onClick={()=>setOpen(false)} className="py-2 text-sm font-medium text-gray-700">{t("giftFinder.nav")}</Link>
            <div className="sm:hidden">
              <ThemeSwitcher initial={theme} />
            </div>
            <Link
              href="/create"
              className="text-sm font-medium text-gray-700 hover:text-brand-300 py-2"
              onClick={() => setOpen(false)}
            >
              {t("nav.createRegistry")}
            </Link>
            <Link
              href="/browse"
              className="text-sm font-medium text-gray-700 hover:text-brand-300 py-2"
              onClick={() => setOpen(false)}
            >
              {t("nav.businesses")}
            </Link>

            <Link href="/business/signup" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-gray-700">{t("header.registerBusiness")}</Link>
            {user ? (
              <>
                <div className="border-t border-gray-100 pt-3" />
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-brand-300 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
                <Link
                  href="/my-registries"
                  className="text-sm font-medium text-gray-700 hover:text-brand-300 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.myRegistries")}
                </Link>
                <Link href="/orders" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-gray-700">{t("nav.orders")}</Link>
                <Link href="/settings" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-gray-700">{t("nav.settings")}</Link>
                <div>
                  <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="text-sm font-medium text-red-300 hover:text-red-300 py-2"
                  >
                    {t("common.signOut")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-gray-100 pt-3" />
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-brand-300 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("common.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-brand-500 text-white px-4 py-2 rounded-lg text-center hover:bg-brand-400"
                  onClick={() => setOpen(false)}
                >
                  {t("common.signUp")}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
