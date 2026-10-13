import { ProviderError, type Provider } from "@/lib/contracts/payments";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * fetch + timeout + status check + JSON parse for payment provider calls
 * (review H6). Never puts the response body in the thrown error.
 */
export async function providerFetchJson<T = unknown>(
  provider: Provider,
  url: string,
  init: RequestInit & { timeoutMs?: number; allowStatus?: number[] } = {}
): Promise<{ status: number; data: T }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, allowStatus = [], ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    throw new ProviderError(provider, name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "HTTP_ERROR");
  }
  if (!res.ok && !allowStatus.includes(res.status)) {
    throw new ProviderError(provider, res.status === 401 || res.status === 403 ? "AUTH_FAILED" : "HTTP_ERROR", res.status);
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new ProviderError(provider, "BAD_RESPONSE", res.status);
  }
  return { status: res.status, data };
}

/** Caches an OAuth client-credentials token until shortly before it expires. */
export function tokenCache(fetchToken: () => Promise<{ token: string; expiresInSec: number }>) {
  let cached: { token: string; expiresAt: number } | null = null;
  let inflight: Promise<string> | null = null;
  return {
    async get(): Promise<string> {
      if (cached && Date.now() < cached.expiresAt) return cached.token;
      if (inflight) return inflight;
      inflight = fetchToken()
        .then(({ token, expiresInSec }) => {
          cached = { token, expiresAt: Date.now() + Math.max(0, expiresInSec - 60) * 1000 };
          return token;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    clear() {
      cached = null;
    },
  };
}
