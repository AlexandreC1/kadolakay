"use client";

import { useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { rotateShareToken } from "@/actions/registry";
import { buildShareUrl } from "@/lib/url";
import { Check, Lock } from "lucide-react";

interface ShareLinkPanelProps {
  registryId: string;
  baseUrl: string;
  isPublic: boolean;
  initialToken: string;
  title: string;
  published: boolean;
}

/** Owner-only panel on the edit page: copy the (private) share link, or rotate it. */
export function ShareLinkPanel({ registryId, baseUrl, isPublic, initialToken, title, published }: ShareLinkPanelProps) {
  const locale = useLocale();
  const qr = useRef<HTMLCanvasElement>(null);
  const copyText = locale === "fr" ? { heading: "Code QR du registre", hint: "Scannez ce code pour ouvrir le registre.", download: "Télécharger le code QR", draft: "Publiez le registre pour partager son code QR.", failed: "Le téléchargement a échoué. Réessayez." } : locale === "en" ? { heading: "Registry QR code", hint: "Scan this code to open the registry.", download: "Download QR code", draft: "Publish the registry to share its QR code.", failed: "Download failed. Try again." } : { heading: "Kòd QR rejis la", hint: "Eskane kòd sa a pou ouvri rejis la.", download: "Telechaje kòd QR la", draft: "Pibliye rejis la pou pataje kòd QR li a.", failed: "Telechajman an pa mache. Eseye ankò." };
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

  function downloadQr() {
    try {
      if (!qr.current) throw new Error("QR unavailable");
      const image = document.createElement("canvas");
      image.width = 800; image.height = 1060;
      const ctx = image.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, image.width, image.height);
      ctx.fillStyle = "#102e29"; ctx.textAlign = "center";
      ctx.font = "bold 42px sans-serif"; ctx.fillText("KDOM", 400, 85);
      ctx.font = "bold 32px sans-serif"; ctx.fillText(title, 400, 145, 710);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr.current, 100, 185, 600, 600);
      ctx.font = "26px sans-serif"; ctx.fillText(copyText.hint, 400, 850, 700);
      image.toBlob((blob) => {
        if (!blob) { setError(copyText.failed); return; }
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = objectUrl; link.download = "kdom-registry-qr.png"; link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }, "image/png");
    } catch { setError(copyText.failed); }
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
    <section className="mb-8 rounded-xl border border-gray-200 bg-surface p-4">
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
      <div className="mt-6 border-t border-gray-200 pt-5">
        <h3 className="text-sm font-semibold text-gray-900">{copyText.heading}</h3>
        {!published && <p className="mt-2 text-sm text-gray-600">{copyText.draft}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-5">
          <div className="rounded-lg bg-white p-3"><QRCodeCanvas ref={qr} value={url} size={200} level="M" marginSize={4} aria-label={copyText.heading} /></div>
          <div><p className="mb-3 text-sm text-gray-600">{copyText.hint}</p><Button type="button" variant="outline" onClick={downloadQr}>{copyText.download}</Button></div>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
