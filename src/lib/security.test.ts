import { expect, it } from "vitest";
import { contentSecurityPolicy } from "./security";
it("requires a script nonce without eval or inline script permission in production", () => {
  const csp = contentSecurityPolicy("test-nonce", true);
  expect(csp).toContain("'nonce-test-nonce' 'strict-dynamic'");
  expect(csp.split(";").find(v => v.trim().startsWith("script-src"))).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(csp).toContain("object-src 'none'"); expect(csp).toContain("frame-ancestors 'none'");
});
