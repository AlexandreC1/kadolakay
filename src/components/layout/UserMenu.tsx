"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { useSafeMutation, MutationFeedback } from "@/components/shared/useSafeMutation";
import { Link } from "@/i18n/navigation";
import { featureNavCopy } from "@/lib/feature-nav-copy";
import { onboardingCopy } from "@/lib/onboarding-copy";
import type { Role } from "@prisma/client";
import { isAdministrator } from "@/services/permissions";

interface UserMenuProps {
  user: {
    role?: Role;
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations();
  const locale = useLocale();
  const mutation = useSafeMutation();
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("auth.accountMenu")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-gray-200 p-1 pr-3 hover:bg-gray-50 transition-colors"
      >
        {user.image && failedImage !== user.image ? (
          <img
            src={user.image}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(user.image || null)}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="h-8 w-8 rounded-full bg-[var(--brand-action)] flex items-center justify-center text-[var(--brand-on-action)] text-sm font-medium">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {user.name || user.email}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-[var(--brand-surface)] shadow-lg py-1 z-50">
          {user.role === "SUPERADMIN" && <p className="px-4 py-2 text-xs font-semibold text-[var(--brand-muted)]">{t("auth.superadmin")}</p>}
          {isAdministrator(user.role) && <Link href="/admin/businesses" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>{t("nav.administration")}</Link>}
          {user.role === "SUPERADMIN" && <Link href="/admin/premium" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>{featureNavCopy(locale).manage}</Link>}
          <Link href="/onboarding?review=1" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpen(false)}>{onboardingCopy(locale).getStarted}</Link>
          <Link
            href="/dashboard"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/my-registries"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("nav.myRegistries")}
          </Link>
          <Link
            href="/orders"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            {t("nav.orders")}
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <form action={async () => { await mutation.run(() => signOut({ callbackUrl: `/${locale}` })); }}>
            <button
              type="submit"
              disabled={mutation.pending}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
            >
              {t("common.signOut")}
            </button>
          </form>
          <MutationFeedback status={mutation.status} />
        </div>
      )}
    </div>
  );
}
