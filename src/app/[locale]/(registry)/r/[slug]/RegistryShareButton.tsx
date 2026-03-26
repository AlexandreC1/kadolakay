"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ShareModal } from "@/components/shared/ShareModal";

interface RegistryShareButtonProps {
  url: string;
  title: string;
}

export function RegistryShareButton({ url, title }: RegistryShareButtonProps) {
  const [showShare, setShowShare] = useState(false);
  const t = useTranslations("registry");

  return (
    <>
      <Button variant="gold" onClick={() => setShowShare(true)}>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
        {t("share")}
      </Button>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        url={url}
        title={title}
      />
    </>
  );
}
