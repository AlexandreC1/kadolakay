"use client";
import { addTransitionType, startTransition, useEffect, useId, useRef, useState } from "react";
import { Search, QrCode, LoaderCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { homeCopy } from "@/lib/home-copy";
import { occasionLabel } from "@/lib/occasions";
import { formatEventDate } from "@/lib/event-date";
import styles from "./home.module.css";

type Hit = { slug: string; title: string; type: string; eventDate: string | null; owner?: string | null; giftCount?: number };
type State = { status: "idle" | "loading" | "done" | "error"; exact: Hit | null; results: Hit[] };
const idle: State = { status: "idle", exact: null, results: [] };

/** Live list search: a shared link or address opens that list; a name matches opted-in public lists. */
export function ListFinder({ locale }: { locale: string }) {
  const c = homeCopy(locale);
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [fetched, setState] = useState<State>(idle);
  // Short queries show nothing; derived here rather than reset inside the effect.
  const state = query.trim().length < 2 ? idle : fetched;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const abort = useRef<AbortController | null>(null);
  const hits = [...(state.exact ? [state.exact] : []), ...state.results];

  useEffect(() => {
    const q = query.trim();
    abort.current?.abort();
    if (q.length < 2) return;
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(async () => {
      setState((s) => ({ ...s, status: "loading" }));
      try {
        const res = await fetch(`/api/registries/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { exact: Hit | null; results: Hit[] };
        setState({ status: "done", exact: data.exact, results: data.results });
        setActive(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setState({ status: "error", exact: null, results: [] });
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function go(hit: Hit) {
    setOpen(false);
    startTransition(() => {
      addTransitionType("nav-forward");
      router.push(`/r/${hit.slug}`);
    });
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && hits.length) {
      event.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length) {
      event.preventDefault();
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (event.key === "Enter" && open && active >= 0 && hits[active]) {
      event.preventDefault();
      go(hits[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }
  const showPanel = open && query.trim().length >= 2 && state.status !== "idle";
  const announcement =
    state.status === "done" ? (hits.length ? `${hits.length}` : c.finderNone) : state.status === "error" ? c.finderError : "";

  return (
    <form
      className={styles.finder}
      role="search"
      // Without JavaScript, the exact-link finder still works.
      action={locale === "ht" ? "/find" : `/${locale}/find`}
      method="get"
      onSubmit={(event) => {
        const q = query.trim();
        if (hits[0] && (state.exact || hits.length === 1)) {
          event.preventDefault();
          go(hits[0]);
        } else if (q && !/[/.]/.test(q) && state.status === "done") {
          event.preventDefault();
          router.push(`/registries?q=${encodeURIComponent(q.slice(0, 80))}`);
        }
      }}
    >
      <label htmlFor={`${id}-q`} className="sr-only">
        {c.finderLabel}
      </label>
      <div className={styles.finderField} data-open={showPanel || undefined}>
        <Search size={20} strokeWidth={1.8} aria-hidden="true" className={styles.finderIcon} />
        <input
          id={`${id}-q`}
          name="q"
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={500}
          required
          placeholder={c.finderLabel}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={styles.finderSubmit}>
          {state.status === "loading" ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : null}
          <span>{state.status === "loading" ? c.finderSearching : c.finderSubmit}</span>
        </button>
        <div className={styles.finderPanel} hidden={!showPanel}>
          {state.status === "error" ? (
            <p className={styles.finderMessage}>{c.finderError}</p>
          ) : state.status === "done" && !hits.length ? (
            <p className={styles.finderMessage}>{c.finderNone}</p>
          ) : null}
          <ul id={`${id}-list`} role="listbox" aria-label={c.finderLabel} className={styles.finderList}>
            {hits.map((hit, i) => (
              <li
                key={hit.slug}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.finderOption}
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(hit);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className={styles.finderOptionKind}>{i === 0 && state.exact ? c.finderExact : occasionLabel(hit.type, locale)}</span>
                <span className={styles.finderOptionTitle}>{hit.title}</span>
                <span className={styles.finderOptionMeta}>
                  {[hit.owner, hit.eventDate ? formatEventDate(new Date(hit.eventDate), locale) : null, hit.giftCount != null ? c.finderGifts(hit.giftCount) : null]
                    .filter(Boolean)
                    .map((part) => (
                      <span key={part as string}>{part}</span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.finderFoot}>
        <p id={`${id}-hint`}>{c.finderHint}</p>
        <Link href="/find#scan" className={styles.inlineLink}>
          <QrCode size={16} strokeWidth={1.8} aria-hidden="true" />
          {c.scan}
        </Link>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </form>
  );
}
