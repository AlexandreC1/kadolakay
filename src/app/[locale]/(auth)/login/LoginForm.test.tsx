import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LoginForm } from "./LoginForm";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: { provider: string }) => values?.provider ? `Continue with ${values.provider}` : key,
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

describe("login configuration boundaries", () => {
  it("shows the card controls but never enables an unconfigured provider", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { social: [], email: false }));
    expect(html).toContain("Continue with Google");
    expect(html).toContain('role="status"');
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(4);
    expect(html).toMatch(/<input[^>]*disabled=""/);
  });
  it("offers only the configured provider once sign-in is available", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { social: ["google"], email: false }));
    expect(html).toContain("Continue with Google");
    expect(html).not.toContain("Continue with Microsoft");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('name="email"');
  });
  it("provides a labeled email form only when its delivery service is ready", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { social: ["github"], email: true }));
    expect(html).toContain('for="sign-in-email"');
    expect(html).toMatch(/<input[^>]*type="email"/);
    expect(html).not.toMatch(/<input[^>]*disabled=""/);
    expect(html).toContain("Continue with GitHub");
  });
  it("maps arbitrary provider errors to bounded public text", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, { social: [], email: false, initialError: "private-provider-detail" }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("signInFailed");
    expect(html).not.toContain("private-provider-detail");
  });
});
