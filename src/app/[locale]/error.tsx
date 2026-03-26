"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <span className="text-5xl block mb-4">😕</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("common.error")}
        </h2>
        <p className="text-gray-500 mb-6">
          {t("error.description")}
        </p>
        <Button onClick={reset} variant="gold">
          {t("error.tryAgain")}
        </Button>
      </div>
    </div>
  );
}
