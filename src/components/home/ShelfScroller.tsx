"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./home.module.css";

/** Horizontal shelf with snap scrolling, previous/next buttons and edge awareness. */
export function ShelfScroller({ children, labels }: { children: ReactNode; labels: { prev: string; next: string; region: string } }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);
  function move(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  }
  return (
    <div className={styles.shelfFrame} data-start={edges.start || undefined} data-end={edges.end || undefined}>
      <ul ref={track} className={styles.shelfTrack} aria-label={labels.region} tabIndex={0}>
        {children}
      </ul>
      <div className={styles.shelfControls}>
        <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label={labels.prev}>
          <ChevronLeft size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label={labels.next}>
          <ChevronRight size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
