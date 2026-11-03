"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { GiftFinder } from "./GiftFinder";
export function ProductPicker({
  registryId,
  existingIds,
  onClose,
}: {
  registryId: string;
  existingIds: string[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = useTranslations("giftFinder");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="gift-picker-title"
      className="m-auto max-h-[90dvh] w-[min(94vw,760px)] overflow-y-auto rounded-2xl bg-surface p-5 text-gray-900 shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="gift-picker-title" className="text-2xl">
          {t("selectTitle")}
        </h2>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="min-h-11 px-3 underline"
        >
          {t("close")}
        </button>
      </div>
      <GiftFinder registryId={registryId} existingIds={existingIds} />
    </dialog>
  );
}
