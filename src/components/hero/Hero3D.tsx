"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";

export default function Hero3D() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--tilt-x", `${-((event.clientY - rect.top) / rect.height - .5) * 7}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - .5) * 10}deg`);
  }
  function reset() {
    stage.current?.style.setProperty("--tilt-x", "0deg");
    stage.current?.style.setProperty("--tilt-y", "0deg");
  }
  return <div className="gift-display">
    <div className="gift-scene" ref={stage} onPointerMove={tilt} onPointerLeave={reset} data-open={open}>
      <div className="gift-stage-label" aria-hidden="true">{t("giftStageLabel")}</div>
      <svg className="gift-waves" viewBox="0 0 600 300" fill="none" aria-hidden="true"><path d="M-30 170C100 40 170 300 330 150S530 80 650 140M-30 200C100 70 170 330 330 180S530 110 650 170M-30 230C100 100 170 360 330 210S530 140 650 200" /></svg>
      <div className="gift-shadow" aria-hidden="true" />
      <button className="gift-object" type="button" aria-label={open ? t("giftClose") : t("giftOpen")} aria-pressed={open} aria-describedby="gift-instructions" onClick={() => setOpen(value => !value)}>
        <span className="gift-cube" aria-hidden="true">
          <span className="gift-inside" />
          <span className="gift-surprise"><svg width="64" height="58" viewBox="0 0 64 58" fill="none"><path d="M32 51 7 27C-9 10 16-8 32 11 48-8 73 10 57 27L32 51Z" fill="currentColor" /></svg></span>
          <span className="gift-face gift-front"><span className="gift-ribbon" /><span className="gift-brand-seal">KL</span></span>
          <span className="gift-face gift-right"><span className="gift-ribbon" /></span>
          <span className="gift-face gift-left" /><span className="gift-face gift-back" />
          <span className="gift-lid"><span className="gift-lid-top"><span className="gift-bow bow-left" /><span className="gift-bow bow-right" /></span><span className="gift-lid-front" /><span className="gift-lid-right" /></span>
        </span>
      </button>
      <div className="gift-paper-tag" aria-hidden="true"><span>{t("giftTag")}</span><strong>{t("giftTagName")}</strong></div>
    </div>
    <div className="gift-caption" id="gift-instructions"><button className="gift-caption-control" type="button" aria-pressed={open} onClick={() => setOpen(value => !value)}>{open ? t("giftClose") : t("giftOpen")}</button><span className="gift-caption-detail">{t("giftDetail")}</span></div>
    <span className="sr-only" role="status">{open ? t("giftOpened") : ""}</span>
  </div>;
}
