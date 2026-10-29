/** A random retry capability only. Never persist buyer/contact or card details. */
const changedEvent = "kadolakay:checkout-attempt-change";
export function subscribeCheckoutAttempt(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changedEvent, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(changedEvent, listener); };
}
function notifyChange() { if (typeof window !== "undefined") window.dispatchEvent(new Event(changedEvent)); }

export function readCheckoutAttempt(storage: Pick<Storage, "getItem"> | null, registrySlug: string) {
  const key = `kadolakay:checkout:v1:${registrySlug}`;
  try {
    const saved = storage?.getItem(key);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved;
  } catch { /* Blocked browser storage still supports retries in this page. */ }
  return null;
}

export function checkoutAttempt(storage: Pick<Storage, "getItem" | "setItem"> | null, registrySlug: string, fallback?: string) {
  if (fallback) return fallback;
  const saved = readCheckoutAttempt(storage, registrySlug);
  if (saved) return saved;
  const id = crypto.randomUUID();
  try { storage?.setItem(`kadolakay:checkout:v1:${registrySlug}`, id); } catch { /* Keep the in-memory capability. */ }
  notifyChange();
  return id;
}

export function clearCheckoutAttempt(storage: Pick<Storage, "removeItem"> | null, registrySlug: string) {
  try { storage?.removeItem(`kadolakay:checkout:v1:${registrySlug}`); } catch { /* Blocked storage. */ }
  notifyChange();
}
