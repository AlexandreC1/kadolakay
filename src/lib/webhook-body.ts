/** Read signed webhook payloads with a hard byte limit, including chunked requests. */
export async function readWebhookBody(request: Request, maxBytes = 256 * 1024) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declared) || declared > maxBytes || declared < 0) throw new Error("PAYLOAD_TOO_LARGE");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("PAYLOAD_TOO_LARGE"); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
