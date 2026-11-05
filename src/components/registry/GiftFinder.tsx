"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { addSelectedGifts } from "@/actions/registry-selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Gift = { id: string; name: string; businessName: string; price: string };
type Registry = { id: string; title: string };
export function GiftFinder({
  registries = [],
  registryId,
  existingIds = [],
  initialSearch = "",
}: {
  registries?: Registry[];
  registryId?: string;
  existingIds?: string[];
  initialSearch?: string;
}) {
  const t = useTranslations("giftFinder");
  const router = useRouter();
  const [target, setTarget] = useState(registryId ?? registries[0]?.id ?? "");
  const [filters, setFilters] = useState({
    q: initialSearch,
    currency: "HTG",
    budget: "",
    occasion: "ALL",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState<string | null>(null);
  const [items, setItems] = useState<Gift[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Gift>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams(applied);
    if (page) params.set("cursor", page);
    fetch(`/api/gifts?${params}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(response.status === 400 ? "invalid" : "failed");
        const data = (await response.json()) as {
          items: Gift[];
          nextCursor: string | null;
        };
        if (abort.signal.aborted) return;
        setItems((previous) =>
          page
            ? [
                ...new Map(
                  [...previous, ...data.items].map((item) => [item.id, item]),
                ).values(),
              ]
            : data.items,
        );
        setNext(data.nextCursor);
      })
      .catch((reason) => {
        if (!abort.signal.aborted)
          setError(reason.message === "invalid" ? "invalid" : "failed");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [applied, page]);
  function save() {
    setError("");
    setNotice("");
    const ids = Object.keys(selected);
    startTransition(async () => {
      try {
        const result = await addSelectedGifts({
          registryId: target,
          productIds: ids,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNotice(
          t("saved", { added: result.added, existing: result.existing }),
        );
        setSelected({});
        router.refresh();
      } catch {
        setError("failed");
      }
    });
  }
  const count = Object.keys(selected).length;
  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setNotice("");
          setLoading(true);
          setSelected({});
          setItems([]);
          setPage(null);
          setApplied({ ...filters });
        }}
      >
        <label className="space-y-2">
          <span>{t("search")}</span>
          <Input
            maxLength={64}
            value={filters.q}
            onChange={(event) =>
              setFilters({ ...filters, q: event.target.value })
            }
          />
        </label>
        <label className="space-y-2">
          <span>{t("occasion")}</span>
          <select
            className="w-full rounded-lg border border-gray-300 bg-surface p-3"
            value={filters.occasion}
            onChange={(event) =>
              setFilters({ ...filters, occasion: event.target.value })
            }
          >
            {["ALL", "BABY_SHOWER", "WEDDING", "BIRTHDAY"].map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span>{t("budget")}</span>
          <Input
            type="text"
            inputMode="decimal"
            pattern="(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?"
            value={filters.budget}
            onChange={(event) =>
              setFilters({ ...filters, budget: event.target.value })
            }
            placeholder={t("optional")}
          />
        </label>
        <label className="space-y-2">
          <span>{t("currency")}</span>
          <select
            className="w-full rounded-lg border border-gray-300 bg-surface p-3"
            value={filters.currency}
            onChange={(event) =>
              setFilters({ ...filters, currency: event.target.value })
            }
          >
            <option>HTG</option>
            <option>USD</option>
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {t("filter")}
        </Button>
      </form>
      <p className="text-sm text-gray-700">{t("method")}</p>
      {error && (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-300 p-4 text-red-300"
        >
          {t(`errors.${error}`)}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-gray-300 p-4">
          {notice}
        </p>
      )}
      {!registryId && registries.length > 0 && (
        <label className="block space-y-2">
          <span>{t("target")}</span>
          <select
            disabled={pending}
            className="w-full rounded-lg border border-gray-300 bg-surface p-3"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setNotice("");
            }}
          >
            {registries.map((registry) => (
              <option key={registry.id} value={registry.id}>
                {registry.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {!target && (
        <p className="rounded-lg border border-gray-300 p-4">
          {t("needRegistry")}{" "}
          <Link href="/create" className="font-semibold underline">
            {t("create")}
          </Link>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2" aria-busy={loading}>
        {items.map((gift) => {
          const already = existingIds.includes(gift.id);
          const checked = Boolean(selected[gift.id]);
          return (
            <label
              key={gift.id}
              className={`flex gap-3 rounded-xl border p-4 ${checked ? "border-gray-900 bg-surface-2" : "border-gray-200 bg-surface"}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--brand-ocean)]"
                checked={checked || already}
                disabled={
                  pending || already || !target || (!checked && count >= 50)
                }
                onChange={() =>
                  setSelected((previous) => {
                    const next = { ...previous };
                    if (next[gift.id]) delete next[gift.id];
                    else next[gift.id] = gift;
                    return next;
                  })
                }
              />
              <span className="min-w-0 space-y-1">
                <span className="block text-sm text-gray-700">
                  {gift.businessName}
                </span>
                <span className="block font-semibold">{gift.name}</span>
                <span className="block tabular-nums">
                  {gift.price} {applied.currency}
                </span>
                {already && (
                  <span className="block text-sm">{t("already")}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {loading && <p role="status">{t("loading")}</p>}
      {!loading && !items.length && !error && (
        <p className="py-8 text-center">{t("empty")}</p>
      )}
      {next && (
        <Button
          variant="outline"
          disabled={loading || pending}
          onClick={() => {
            setLoading(true);
            setError("");
            setPage(next);
          }}
        >
          {t("more")}
        </Button>
      )}
      {target && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-surface py-4">
          <p role="status">{t("selected", { count })}</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={!count || pending}
              onClick={() => setSelected({})}
            >
              {t("clear")}
            </Button>
            <Button disabled={!count || pending || loading} onClick={save}>
              {pending ? t("saving") : t("add", { count })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
