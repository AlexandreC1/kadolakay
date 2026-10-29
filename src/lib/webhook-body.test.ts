import { expect, it } from "vitest";
import { readWebhookBody } from "./webhook-body";
it("reads exact raw text without altering signed content", async () => {
  const body = '{ "message": "Kado lakay é" }';
  expect(await readWebhookBody(new Request("https://example.com", { method: "POST", body }))).toBe(body);
});
it("rejects an oversized declared or undeclared payload", async () => {
  await expect(readWebhookBody(new Request("https://example.com", { method: "POST", headers: { "content-length": "100" }, body: "test" }), 10)).rejects.toThrow("PAYLOAD_TOO_LARGE");
  await expect(readWebhookBody(new Request("https://example.com", { method: "POST", body: "12345678901" }), 10)).rejects.toThrow("PAYLOAD_TOO_LARGE");
});
