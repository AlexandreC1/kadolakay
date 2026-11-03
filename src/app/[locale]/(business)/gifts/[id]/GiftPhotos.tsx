"use client";
import { startTransition, useState, ViewTransition } from "react";
import { GiftArt } from "@/components/shared/GiftArt";
import { giftPageCopy } from "@/lib/catalog-copy";
import styles from "./gift.module.css";

/**
 * The main picture keeps the gift's shared-element name, so it arrives from the shelf
 * or the list in place. Extra shop photos swap in with a short crossfade.
 */
export function GiftPhotos({ id, name, cover, media, locale }: { id: string; name: string; cover: string | null; media: { id: string; url: string; alt: string | null }[]; locale: string }) {
  const g = giftPageCopy(locale);
  const photos = cover ? [{ id: "cover", url: cover, alt: name }, ...media.filter((m) => m.url !== cover)] : media;
  const [index, setIndex] = useState(0);
  const current = photos[index]?.url ?? null;
  return (
    <div className={styles.photos}>
      <ViewTransition key={current ?? "none"} enter="photo-in" exit="photo-out" default="none">
        <div>
          <GiftArt id={id} name={name} imageUrl={current} size="hero" />
        </div>
      </ViewTransition>
      {photos.length > 1 && (
        <div className={styles.thumbs} role="group" aria-label={g.photos}>
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              aria-pressed={i === index}
              aria-label={g.showPhoto(i + 1)}
              onClick={() => startTransition(() => setIndex(i))}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
