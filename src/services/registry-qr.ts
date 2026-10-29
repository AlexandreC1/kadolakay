import QRCode from "qrcode";
import { registryShareUrl } from "@/lib/registry-share-url";
import { previewSharedRegistry } from "./registry-finder";
import { renderRegistryShareCard } from "@/lib/registry-card";

export async function createPublicRegistryQr(slug: string, locale: string, baseUrl: string) {
  const url = registryShareUrl(slug, locale, baseUrl);
  const preview = await previewSharedRegistry(slug, baseUrl);
  if (preview.status !== "found") return null;
  const qr = await QRCode.toBuffer(url, { type: "png", width: 760, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000ff", light: "#ffffffff" } });
  return renderRegistryShareCard(preview.registry, url, locale, qr);
}
