"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return <div className="recovery-state"><div><span className="recovery-number" aria-hidden="true">!</span><h2>{t("common.error")}</h2><p>{t("error.description")}</p><div className="recovery-actions"><Button onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("error.tryAgain")}</Button><Link href="/" className="action-text">{t("nav.home")}</Link></div></div></div>;
}
