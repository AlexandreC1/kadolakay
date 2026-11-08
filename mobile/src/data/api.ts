import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL } from "@/config";

/** A failed request, with the server's stable error code (see the API route) or a network code. */
export class ApiError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

const KEY = "bayou.session";
let token: string | null = null;

/** The session token lives in the device keystore; on web, in this browser only. */
export async function loadToken() {
  try {
    token = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function saveToken(value: string | null) {
  token = value;
  try {
    if (Platform.OS === "web") {
      if (value) globalThis.localStorage?.setItem(KEY, value);
      else globalThis.localStorage?.removeItem(KEY);
    } else if (value) await SecureStore.setItemAsync(KEY, value);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // The session still works until the app closes.
  }
}

export const hasToken = () => !!token;

export async function api<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  // A slow network should fail clearly rather than leave a screen waiting forever.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20000);
  try {
    res = await fetch(`${API_URL}${path}`, {
      signal: abort.signal,
      method,
      headers: {
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("OFFLINE", 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // An expired or revoked session signs the app out cleanly.
    if (res.status === 401 && token) await saveToken(null);
    throw new ApiError(typeof data?.error === "string" ? data.error : "UNAVAILABLE", res.status);
  }
  return data as T;
}
