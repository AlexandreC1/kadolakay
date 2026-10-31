"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rotateShareToken } from "@/actions/registry";
import { buildShareUrl } from "@/lib/url";
import { Check, Lock } from "lucide-react";

interface ShareLinkPanelProps {
  registryId: string;
  baseUrl: string;
  isPublic: boolean;
  initialToken: string;
}

/** Owner-only panel on the edit page: copy the (private) share link, or rotate it. */
export function ShareLinkPanel({ registryId, baseUrl, isPublic, initialToken }: ShareLinkPanelProps) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const url = buildShareUrl(baseUrl, isPublic, token);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopi pa mache. Chwazi lyen an epi kopye l. / Copy failed. Select the link and copy it.");
    }
  }

  function rotate() {
    if (!confirm("Ansyen lyen an ap sispann mache. Kontinye? / The old link will stop working. Continue?")) return;
    setError(null);
    startTransition(async () => {
      try {
        setToken(await rotateShareToken(registryId));
      } catch {
        setError("Erè. Eseye ankò. / Something went wrong. Try again.");
      }
    });
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        {!isPublic && <Lock className="h-4 w-4" aria-hidden="true" />}
        {isPublic ? "Lyen rejis ou / Your registry link" : "Lyen prive / Private share link"}
      </h2>
      {!isPublic && (
        <p className="mt-1 text-xs text-gray-500">
          Sèlman moun ki gen lyen sa a ka wè epi achte nan rejis la. / Only people with this link can view and buy.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        />
        <Button type="button" variant="gold" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Kopye / Copied
            </>
          ) : (
            "Kopye / Copy"
          )}
        </Button>
        {!isPublic && (
          <Button type="button" variant="outline" onClick={rotate} disabled={pending}>
            {pending ? "…" : "Nouvo lyen / New link"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
