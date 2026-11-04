"use client";
import { startTransition, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GiftArt } from "@/components/shared/GiftArt";
import { addBusinessProductsToRegistry } from "@/actions/registry-item";
import { guestCopy } from "@/lib/guest-copy";
import guest from "./guest.module.css";
import styles from "./gift-results.module.css";

export interface ResultGift { id: string; name: string; imageUrl: string | null; businessName: string; price: string; note: string }
export interface OwnList { id: string; slug: string; title: string; productIds: string[] }

const LIMIT = 20;

/**
 * Gift finder results. Signed-in visitors can tick several gifts and add them to one of
 * their lists in a single, all-or-nothing save; gifts already on the chosen list are marked
 * and cannot be ticked. Adding a gift never reserves stock or takes payment.
 */
export function GiftResults({ gifts, locale, lists, signInHref }: { gifts: ResultGift[]; locale: string; lists: OwnList[] | null; signInHref: string }) {
  const g = guestCopy(locale);
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [listId, setListId] = useState(lists?.[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string; slug?: string } | null>(null);
  const lock = useRef(false);
  const list = lists?.find((l) => l.id === listId);
  const onList = new Set(list?.productIds ?? []);
  const canSelect = Boolean(lists && lists.length);
  const chosen = selected.filter((id) => !onList.has(id));

  function toggle(id: string) {
    setMessage(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= LIMIT ? s : [...s, id]));
  }

  async function add() {
    if (lock.current || !list || !chosen.length) return;
    lock.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await addBusinessProductsToRegistry({ registryId: list.id, productIds: chosen });
      if (result.ok) {
        setSelected([]);
        setMessage({ tone: "ok", text: g.added(result.addedCount), slug: list.slug });
        // Refresh so the chosen list's "already on it" marks reflect the save.
        startTransition(() => router.refresh());
      } else {
        setMessage({ tone: "error", text: g.addFailed[result.code] });
        if (result.code === "PRODUCT_UNAVAILABLE") startTransition(() => router.refresh());
      }
    } catch {
      setMessage({ tone: "error", text: g.addFailed.network });
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <ul className={guest.tiles}>
        {gifts.map((gift) => {
          const there = onList.has(gift.id);
          const ticked = selected.includes(gift.id) && !there;
          return (
            <ViewTransition key={gift.id} name={`find-gift-${gift.id}`} update="gift-move" enter="gift-in" exit="gift-out" default="none">
              <li className={styles.item} data-selected={ticked || undefined}>
                <Link href={`/gifts/${gift.id}`} className={guest.tile} transitionTypes={["nav-forward"]}>
                  <GiftArt id={gift.id} name={gift.name} imageUrl={gift.imageUrl} square />
                  <span className={guest.tileShop}>{gift.businessName}</span>
                  {gift.imageUrl && <span className={guest.tileName}>{gift.name}</span>}
                  <span className={guest.tilePrice}>{gift.price}</span>
                  <span className={guest.tileNote}>{there ? g.onList : gift.note}</span>
                </Link>
                {canSelect && (
                  <button
                    type="button"
                    className={styles.tick}
                    aria-pressed={ticked}
                    aria-label={there ? `${gift.name}: ${g.onList}` : g.select(gift.name)}
                    disabled={there || pending || (!ticked && selected.length >= LIMIT)}
                    onClick={() => toggle(gift.id)}
                  >
                    {there || ticked ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : <Plus size={16} strokeWidth={2.4} aria-hidden="true" />}
                  </button>
                )}
              </li>
            </ViewTransition>
          );
        })}
      </ul>

      {lists === null ? (
        <p className={styles.hint}>
          {g.signInToAdd} <Link href={signInHref}>{g.signIn}</Link>
        </p>
      ) : !lists.length ? (
        <p className={styles.hint}>
          {g.noListYet} <Link href="/create">{g.createList}</Link>
        </p>
      ) : null}

      <p className={styles.status} role="status" aria-live="polite">
        {message && (
          <span data-tone={message.tone}>
            {message.text}
            {message.slug && (
              <>
                {" "}
                <Link href={`/r/${message.slug}/edit`}>{g.viewList}</Link>
              </>
            )}
          </span>
        )}
      </p>

      {canSelect && selected.length > 0 && (
        <div className={styles.bar} role="region" aria-label={g.selectedCount(chosen.length)}>
          <strong>{g.selectedCount(chosen.length)}</strong>
          {selected.length >= LIMIT && <span className={styles.limit}>{g.selectionLimit}</span>}
          <label className={styles.listField}>
            <span>{g.chooseList}</span>
            <select value={listId} onChange={(event) => setListId(event.target.value)} disabled={pending}>
              {lists!.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.clear} onClick={() => setSelected([])} disabled={pending}>
            {g.clearSelection}
          </button>
          <button type="button" className={styles.add} onClick={add} disabled={pending || !chosen.length}>
            {pending && <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />}
            {pending ? g.adding : g.addSelected}
          </button>
        </div>
      )}
    </>
  );
}
