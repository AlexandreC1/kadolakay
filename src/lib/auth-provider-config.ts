export function authProviderConfig(env: Record<string, string | undefined> = process.env) {
  const clean = (value: string | undefined) => {
    const text = value?.trim() ?? "";
    return /^(undefined|null|your[-_]|change[-_]?me|placeholder)/i.test(text) ? "" : text;
  };
  const clientId = clean(env.AUTH_GOOGLE_ID);
  const clientSecret = clean(env.AUTH_GOOGLE_SECRET);
  const google = /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) && clientSecret.length >= 12;
  const emailKey = clean(env.AUTH_RESEND_KEY);
  const emailFrom = clean(env.AUTH_RESEND_FROM);
  const email = emailKey.startsWith("re_") && /[^\s<>]+@[^\s<>]+\.[^\s<>]+/.test(emailFrom);
  return {google, email, clientId, clientSecret, emailKey, emailFrom};
}
export function authProviderAvailability() {
  const {google, email} = authProviderConfig();
  return {google, email};
}
