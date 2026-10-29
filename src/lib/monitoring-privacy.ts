import type { ErrorEvent } from "@sentry/nextjs";
/** Explicit opt-out from SDK 11's data collection defaults. */
export const monitoringDataCollection = {
  userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] as [], urlQueryParams: false,
  databaseQueryData: false, queues: false, stackFrameVariables: false, frameContextLines: 0,
  graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false }, mcp: { inputs: false, outputs: false },
};
const safeFilenames = new Set(["page.js", "layout.js", "route.js", "page.tsx", "layout.tsx", "route.ts", "auth.ts", "checkout.ts", "inventory.ts", "business-review.ts", "authorization.ts", "orders.ts", "reconcile-payments.ts", "instrumentation.ts", "proxy.ts"]);

/** Last outbound boundary: SDK collection switches alone cannot redact error text. */
export function sanitizeMonitoringEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id && /^[a-f0-9]{32}$/i.test(event.event_id) ? event.event_id : undefined,
    timestamp: Number.isFinite(event.timestamp) && event.timestamp! >= 0 && event.timestamp! < 1e11 ? event.timestamp : undefined,
    platform: "javascript", level: "error",
    message: "Bayou application error",
    exception: event.exception ? { values: event.exception.values?.slice(0, 4).map(value => ({
      type: ["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError"].includes(value.type || "") ? value.type : "Error",
      value: "Error details withheld for privacy",
      stacktrace: { frames: value.stacktrace?.frames?.slice(-40).map(frame => {
        const filename = (frame.filename || "").split(/[?#]/)[0].split(/[\\/]/).pop();
        return {
          filename: filename && safeFilenames.has(filename) ? filename : "application.js",
          ...(Number.isSafeInteger(frame.lineno) && frame.lineno! >= 0 && frame.lineno! <= 1000000 ? { lineno: frame.lineno } : {}),
          ...(Number.isSafeInteger(frame.colno) && frame.colno! >= 0 && frame.colno! <= 1000000 ? { colno: frame.colno } : {}),
          in_app: frame.in_app === true,
        };
      }) },
    })) } : undefined,
  };
}

export const monitoringPrivacyOptions = {
  dataCollection: monitoringDataCollection,
  sendDefaultPii: false,
  beforeSend: sanitizeMonitoringEvent,
  beforeBreadcrumb: () => null,
  // Performance payloads need their own reviewed schema before transmission.
  tracesSampleRate: 0,
  beforeSendTransaction: () => null,
};
