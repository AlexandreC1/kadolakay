/**
 * Former Wave-1 stubs. enqueueEmail now points at the real outbox (WS4,
 * src/lib/email/outbox.ts). Prefer importing from "@/lib/email/outbox"
 * directly; this re-export stays for code written against the contract.
 */
export { enqueueEmail } from "../email/outbox";
