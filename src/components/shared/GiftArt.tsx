import { ViewTransition } from "react";
import styles from "./gift-art.module.css";

/**
 * A gift's picture, or a typographic tile when the shop has not added one.
 * Named for a shared-element view transition, so the same picture moves into the
 * gift page instead of one image disappearing and another appearing.
 */
export function GiftArt({ id, name, imageUrl, size = "tile", square = false }: { id: string; name: string; imageUrl: string | null; size?: "tile" | "hero"; square?: boolean }) {
  // A stable tint per gift, so a shelf of photo-less gifts does not look like one repeated tile.
  const tint = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;
  return (
    <ViewTransition name={`gift-art-${id}`} share="gift-morph" default="none">
      <span className={`${styles.art} ${size === "hero" ? styles.artHero : ""} ${square ? styles.artSquare : ""}`}>
        {imageUrl ? (
          // Shop photos come from the shop's own storage; sizes vary, so no Next image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading={size === "hero" ? "eager" : "lazy"} />
        ) : (
          // Without a photo the tile carries the gift's name, so the name is not repeated below it.
          <span className={styles.artType} data-tint={tint}>
            <span>{name}</span>
          </span>
        )}
      </span>
    </ViewTransition>
  );
}
