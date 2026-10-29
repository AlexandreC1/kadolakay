import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

describe("database test runner isolation", () => {
  it.each(["postgresql://test:test@127.0.0.1:55432/bayou", "postgresql://test:test@database.example.invalid/bayou_test"])("refuses an undesignated app database without connecting: %s", (DATABASE_URL) => {
    const result = spawnSync(process.execPath, ["scripts/test-db.mjs"], { env: { ...process.env, DATABASE_URL, ALLOW_TEST_DATABASE: "0" }, encoding: "utf8", timeout: 10000 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Never use production or the local app database");
    expect(result.stdout).not.toContain("RUN");
  });
});
