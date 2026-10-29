"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import type { CircularCarouselPreset } from "./CircularCarousel";
import "./carousel-demo.css";

const CircularCarousel = dynamic(() => import("./CircularCarousel"), {
  ssr: false,
  loading: () => <div className="carousel-demo-loading" role="status">Loading gallery…</div>,
});

const copy = {
  en: { label: "Interaction study / 01", title: "Take a look around.", description: "Drag to explore. Select a photograph to bring it into focus.", pause: "Pause rotation", play: "Resume rotation", cylinder: "Circular", orbit: "Orbit", note: "Demonstration photography from the original component. These are not merchant listings.", keys: "Keyboard: left / right arrows to rotate. Home / End to jump.", source: "Component by React Bits" },
  fr: { label: "Étude interactive / 01", title: "Faites le tour.", description: "Faites glisser pour explorer. Sélectionnez une photo pour la mettre au premier plan.", pause: "Arrêter la rotation", play: "Reprendre la rotation", cylinder: "Circulaire", orbit: "Orbite", note: "Photos de démonstration du composant original. Ce ne sont pas des annonces commerciales.", keys: "Clavier : flèches gauche / droite. Début / Fin pour naviguer.", source: "Composant par React Bits" },
  ht: { label: "Demonstrasyon entèraktif / 01", title: "Fè yon ti wonn.", description: "Glise pou eksplore. Chwazi yon foto pou mete l devan.", pause: "Kanpe wotasyon an", play: "Reprann wotasyon an", cylinder: "Sikilè", orbit: "Òbit", note: "Foto demonstrasyon ki soti nan konpozan orijinal la. Sa yo pa pwodwi machann yo.", keys: "Klavye : flèch agoch / adwat. Home / End pou navige.", source: "Konpozan React Bits" },
};

export default function CarouselDemo() {
  const locale = useLocale();
  const t = copy[locale as keyof typeof copy] || copy.en;
  const [preset, setPreset] = useState<CircularCarouselPreset>("cylinder");
  const [paused, setPaused] = useState(false);
  return (
    <section className="carousel-demo" aria-labelledby="carousel-demo-title">
      <div className="carousel-demo-heading">
        <div><p className="carousel-demo-label">{t.label}</p><h1 id="carousel-demo-title">{t.title}</h1></div>
        <p className="carousel-demo-description">{t.description}</p>
      </div>
      <div className="carousel-demo-gallery">
        <CircularCarousel key={preset} preset={preset} cardWidth={250} aspectRatio={0.8} gap={30} intro="assemble" autoplay={paused ? "off" : "drift"} speed={8} cornerRadius={18} captions fadeColor="#082e4d" />
      </div>
      <div className="carousel-demo-controls">
        <div className="carousel-demo-modes" role="group" aria-label={locale === "fr" ? "Disposition" : locale === "ht" ? "Aranjman" : "Layout"}>
          {(["cylinder", "orbit"] as const).map(mode => <button key={mode} type="button" aria-pressed={preset === mode} onClick={() => setPreset(mode)}>{t[mode]}</button>)}
        </div>
        <button className="carousel-demo-pause" type="button" onClick={() => setPaused(!paused)}>{paused ? t.play : t.pause}</button>
      </div>
      <p className="carousel-demo-keys">{t.keys}</p>
      <div className="carousel-demo-credit"><p>{t.note}</p><a href="https://reactbits.dev/components/circular-carousel" target="_blank" rel="noreferrer">{t.source}</a></div>
    </section>
  );
}
