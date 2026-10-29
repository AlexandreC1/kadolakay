import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { monitoringPrivacyOptions, sanitizeMonitoringEvent } from "./monitoring-privacy";
describe("monitoring outbound privacy", () => {
  it("removes identity, bodies, tokens, messages, breadcrumbs and raw database text", () => {
    const privateText = "private@example.invalid secret-provider-token";
    const event = { type: undefined, event_id: "a".repeat(32), timestamp: 100, message: privateText, user: { email: privateText }, request: { url: `https://example.com/r/private?token=${privateText}`, data: privateText, headers: { Authorization: privateText } }, extra: { sql: privateText }, tags: { customer: privateText }, contexts: { custom: { value: privateText } }, breadcrumbs: [{ message: privateText }], exception: { values: [{ type: "TypeError", value: privateText, stacktrace: { frames: [{ filename: `https://example.com/_next/static/chunks/page.js?token=${privateText}`, lineno: 12, colno: 3, vars: { secret: privateText }, pre_context: [privateText] }] } }] } } as ErrorEvent;
    const safe = sanitizeMonitoringEvent(event);
    expect(JSON.stringify(safe)).not.toContain(privateText);
    expect(safe).not.toHaveProperty("request"); expect(safe).not.toHaveProperty("user"); expect(safe).not.toHaveProperty("extra"); expect(safe).not.toHaveProperty("breadcrumbs");
    expect(safe.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: "page.js", lineno: 12, colno: 3, in_app: false });
    expect(event.message).toBe(privateText);
  });
  it("drops unreviewed tracing and breadcrumbs and bounds captured stacks", () => {
    expect(monitoringPrivacyOptions.beforeBreadcrumb()).toBeNull();
    expect(monitoringPrivacyOptions.beforeSendTransaction()).toBeNull();
    expect(monitoringPrivacyOptions.tracesSampleRate).toBe(0);
    const result = sanitizeMonitoringEvent({ type: undefined, event_id: "private@example.invalid", exception: { values: [{ type: "Email private@example.invalid", stacktrace: { frames: Array.from({ length: 60 }, () => ({ filename: "file:///users/private/address.png", lineno: -1 })) } }] } });
    expect(result.exception?.values?.[0].type).toBe("Error");
    expect(result.exception?.values?.[0].stacktrace?.frames).toHaveLength(40);
    expect(JSON.stringify(result)).not.toContain("address");
  });
});
