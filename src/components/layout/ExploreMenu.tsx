"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { trackingCopy } from "@/lib/tracking-copy";
import { workspaceCopy } from "@/lib/workspace-copy";
import { featureNavCopy } from "@/lib/feature-nav-copy";

export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const locale = useLocale();
  const c = featureNavCopy(locale);
  const t = useTranslations();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="explore-navigation" ref={root}>
      <button
        type="button"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {c.explore}
      </button>
      {open && (
        <div className="explore-links" id={id}>
          <Link href="/track" onClick={() => setOpen(false)}>
            {trackingCopy(locale).title}
          </Link>
          <Link href="/registries" onClick={() => setOpen(false)}>
            {workspaceCopy(locale).registrySearch}
          </Link>
          <Link href="/baskets" onClick={() => setOpen(false)}>
            {workspaceCopy(locale).baskets}
          </Link>
          <Link href="/browse" onClick={() => setOpen(false)}>
            {t("nav.businesses")}
          </Link>
          <Link href="/business" onClick={() => setOpen(false)}>
            {c.businessLink}
          </Link>
          <Link href="/premium" onClick={() => setOpen(false)}>
            {c.premium}
          </Link>
          <Link href="/appearance" onClick={() => setOpen(false)}>
            {c.season}
          </Link>
        </div>
      )}
    </div>
  );
}
