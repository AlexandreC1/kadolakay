/**
 * Temporary no-op implementations so Wave-1 code compiles and runs before the
 * owning workstream lands the real one. Each is replaced, then this file is deleted.
 */
import type { EnqueueEmail } from "./email";
import { log } from "../log";

/** Replaced by WS4 (src/lib/email/outbox.ts). */
export const enqueueEmail: EnqueueEmail = async (input) => {
  log.warn("enqueueEmail stub: email not queued", {
    template: input.template,
    dedupeKey: input.dedupeKey,
  });
};
