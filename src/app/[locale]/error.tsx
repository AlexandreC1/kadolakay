"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CircleAlert } from "lucide-react";

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
        <CircleAlert className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden="true" />
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
