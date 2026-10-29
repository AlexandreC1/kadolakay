import { registryAddress } from "./registry-address";
export const QR_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export function validQrImage(file: { type: string; size: number }) {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size > 0 && file.size <= QR_IMAGE_MAX_BYTES;
}
export async function readRegistryQr(pixels: Uint8ClampedArray, width: number, height: number, baseUrl: string) {
  const { default: jsQR } = await import("jsqr");
  const code = jsQR(pixels, width, height, { inversionAttempts: "attemptBoth" });
  if (!code) return { status: "empty" } as const;
  const slug = registryAddress(code.data, baseUrl);
  return slug ? { status: "found", slug } as const : { status: "invalid" } as const;
}
