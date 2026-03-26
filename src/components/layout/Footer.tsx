import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo & tagline */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-blue-700">Kado</span>
              <span className="text-lg font-bold text-amber-500">Lakay</span>
            </div>
            <p className="text-sm text-gray-500">{t("footer.tagline")}</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t("footer.terms")}
            </Link>
            <Link
              href="/contact"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t("footer.contact")}
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} KadoLakay. Tout dwa rezève.
          </p>
        </div>
      </div>
    </footer>
  );
}
