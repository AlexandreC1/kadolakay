"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface MobileNavProps {
  user?: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600 hover:text-gray-900"
        aria-label="Menu"
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
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
          <nav className="flex flex-col p-4 space-y-3">
            <Link
              href="/create"
              className="text-sm font-medium text-gray-700 hover:text-blue-700 py-2"
              onClick={() => setOpen(false)}
            >
              {t("nav.createRegistry")}
            </Link>
            <Link
              href="/browse"
              className="text-sm font-medium text-gray-700 hover:text-blue-700 py-2"
              onClick={() => setOpen(false)}
            >
              {t("nav.businesses")}
            </Link>

            {user ? (
              <>
                <div className="border-t border-gray-100 pt-3" />
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-blue-700 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
                <Link
                  href="/my-registries"
                  className="text-sm font-medium text-gray-700 hover:text-blue-700 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.myRegistries")}
                </Link>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-600 hover:text-red-700 py-2"
                  >
                    {t("common.signOut")}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="border-t border-gray-100 pt-3" />
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-700 py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("common.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-blue-700 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-800"
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
