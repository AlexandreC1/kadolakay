"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ShareButtons } from "./ShareButtons";
import { RegistryQr } from "./RegistryQr";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  registrySlug: string;
}

export function ShareModal({ isOpen, onClose, url, title, registrySlug }: ShareModalProps) {
  const t = useTranslations("share");
  const common = useTranslations("common");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="share-dialog-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-2xl border-0 p-0 shadow-xl backdrop:bg-black/50"
      onClose={onClose}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="share-dialog-title" className="text-lg font-semibold text-gray-900">{t("title")}</h2>
          <button
            type="button"
            aria-label={common("cancel")}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="break-words text-sm font-medium">{title}</p>
        {isOpen && <RegistryQr slug={registrySlug} url={url} title={title} />}
        <ShareButtons url={url} title={title} />
      </div>
    </dialog>
  );
}
