"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { scanCopy } from "@/lib/scan-copy";
import { validQrImage } from "@/lib/registry-qr-scan";
import styles from "./qr-scanner.module.css";

export function RegistryQrScanner({ baseUrl }: { baseUrl: string }) {
  const c = scanCopy(useLocale()), router = useRouter();
  const video = useRef<HTMLVideoElement>(null), input = useRef<HTMLInputElement>(null);
  const scanCanvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, startTransition] = useTransition();

  function release() {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    if (deadline.current) clearTimeout(deadline.current);
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  function stop() { release(); setActive(false); setBusy(false); }
  useEffect(() => {
    function leave() { release(); setActive(false); setBusy(false); }
    function visibility() { if (document.hidden) leave(); }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", leave); release(); };
  }, []);

  async function decode(source: CanvasImageSource, width: number, height: number, max: number) {
    const scale = Math.min(1, max / Math.max(width, height));
    const canvas = scanCanvas.current || (scanCanvas.current = document.createElement("canvas"));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { readRegistryQr } = await import("@/lib/registry-qr-scan");
    return readRegistryQr(data.data, data.width, data.height, baseUrl);
  }
  function accept(result: Awaited<ReturnType<typeof decode>>) {
    if (result.status === "empty") return false;
    stop();
    if (result.status === "invalid") setError(c.invalid);
    else { startTransition(() => router.push(`/find?q=${encodeURIComponent(result.slug)}`)); }
    return true;
  }
  async function start() {
    stop(); setError(null);
    if (!window.isSecureContext) { setError(c.secure); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError(c.unavailable); return; }
    setActive(true); setBusy(true);
    const token = generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
      if (generation.current !== token) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      const node = video.current;
      if (!node) { stop(); return; }
      node.srcObject = media; await node.play();
      if (generation.current !== token) return;
      setBusy(false);
      media.getVideoTracks().forEach(track => track.addEventListener("ended", () => { if (generation.current === token) { stop(); setError(c.unavailable); } }, { once: true }));
      deadline.current = setTimeout(() => { if (generation.current === token) { stop(); setError(c.timeout); } }, 45000);
      async function frame() {
        if (generation.current !== token) return;
        try {
          if (node!.readyState >= 2 && node!.videoWidth) {
            const result = await decode(node!, node!.videoWidth, node!.videoHeight, 640);
            if (generation.current !== token) return;
            if (accept(result)) return;
          }
          timer.current = setTimeout(frame, 200);
        } catch { if (generation.current === token) { stop(); setError(c.unavailable); } }
      }
      void frame();
    } catch (reason) {
      if (generation.current !== token) return;
      stop(); setError(reason instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(reason.name) ? c.denied : c.unavailable);
    }
  }
  async function choose(file: File | undefined) {
    stop(); setError(null);
    if (!file) return;
    if (!validQrImage(file)) { setError(c.file); return; }
    setBusy(true); const token = generation.current;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (generation.current !== token) return;
      if (image.naturalWidth * image.naturalHeight > 20000000) { setError(c.file); return; }
      const result = await decode(image, image.naturalWidth, image.naturalHeight, 1600);
      if (generation.current !== token) return;
      if (!accept(result)) setError(c.empty);
    } catch { if (generation.current === token) setError(c.failed); }
    finally { URL.revokeObjectURL(url); if (generation.current === token) setBusy(false); }
  }
  return <section className={styles.scanner} aria-labelledby="qr-scanner-heading">
    <h2 id="qr-scanner-heading">{c.title}</h2><p>{c.intro}</p>
    <div className={styles.actions}>
      {active ? <button type="button" onClick={stop}>{c.stop}</button> : <button type="button" onClick={start} disabled={busy || opening}>{c.camera}</button>}
      <button type="button" disabled={busy || opening} onClick={() => { stop(); input.current?.click(); }}>{c.image}</button>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file); }} />
    </div>
    <div hidden={!active} className={styles.camera}><video ref={video} muted playsInline autoPlay aria-label={c.video} /><p>{c.cameraHint}</p></div>
    {(busy || opening) && <p role="status">{opening ? c.opening : c.busy}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <p className={styles.privacy}>{c.privacy}</p>
  </section>;
}
