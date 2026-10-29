export function contentSecurityPolicy(nonce: string, production: boolean) {
  return [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'", "font-src 'self' data:", "img-src 'self' data: blob: https:",
    `connect-src 'self' https://*.ingest.sentry.io${production ? "" : " ws: wss:"}`,
    "frame-src 'none'", "form-action 'self' https://accounts.google.com https://login.microsoftonline.com https://github.com https://checkout.stripe.com",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
