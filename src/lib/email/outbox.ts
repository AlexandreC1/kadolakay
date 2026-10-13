/**
 * Durable email outbox (plan §4.3, review M-email). enqueueEmail writes a row
 * to email_outbox inside (or after) the business transaction; the send-emails
 * cron drains it with retries. dedupeKey is UNIQUE, so a webhook retry that
 * fulfils the same order twice cannot send the gift email twice.
 */
import { Prisma } from "@prisma/client";
import type { EmailTemplate, EnqueueEmail, EnqueueEmailInput, EmailLocale, EmailPayloads } from "@/lib/contracts/email";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { after } from "next/server";
import { deliverEmail } from "../email";

export const MAX_ATTEMPTS = 6;
/** Exponential backoff: 1m, 2m, 4m, 8m, 16m (cap 1h). */
export function backoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
}

type Tx = Pick<Prisma.TransactionClient, "emailOutbox">;

/** Pass `tx` to enqueue atomically with the business write. */
export async function enqueueEmailWith<T extends EmailTemplate>(client: Tx, input: EnqueueEmailInput<T>): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@") || /[\r\n,;]/.test(to)) {
    log.warn("email.enqueue_invalid_recipient", { template: input.template });
    return;
  }
  try {
    await client.emailOutbox.create({
      data: {
        to,
        template: input.template,
        locale: input.locale ?? "ht",
        payload: input.payload as unknown as Prisma.InputJsonValue,
        dedupeKey: input.dedupeKey,
        sendAfter: input.sendAfter ?? new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return; // already queued
    throw err;
  }
}

export const enqueueEmail: EnqueueEmail = (input) => enqueueEmailWith(db, input);

export interface Deliver {
  (template: EmailTemplate, to: string, payload: unknown, locale: EmailLocale, idempotencyKey: string): Promise<void>;
}

const defaultDeliver: Deliver = (template, to, payload, locale, key) =>
  deliverEmail(template, to, payload as EmailPayloads[typeof template], locale, key);

export interface DrainResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
}

/**
 * Claim up to `batch` due rows (FOR UPDATE SKIP LOCKED so concurrent cron
 * runs never double-send), deliver each, record result. Rows stuck in
 * SENDING for >10 min (crashed worker) are reclaimed.
 */
export async function drainOutbox(opts: { batch?: number; deliver?: Deliver; now?: Date } = {}): Promise<DrainResult> {
  const batch = Math.min(Math.max(opts.batch ?? 50, 1), 200);
  const deliver = opts.deliver ?? defaultDeliver;
  const now = opts.now ?? new Date();
  const stale = new Date(now.getTime() - 10 * 60_000);

  // Columns are timestamp(3) holding UTC (Prisma); normalise params to UTC
  // so the comparison doesn't depend on the session TimeZone.
  const rows = await db.$queryRaw<
    { id: string; to: string; template: string; locale: string; payload: unknown; attempts: number; dedupeKey: string }[]
  >`
    UPDATE email_outbox SET status = 'SENDING', attempts = attempts + 1, "updatedAt" = (${now}::timestamptz AT TIME ZONE 'UTC')
    WHERE id IN (
      SELECT id FROM email_outbox
      WHERE (status = 'PENDING' AND "sendAfter" <= (${now}::timestamptz AT TIME ZONE 'UTC'))
         OR (status = 'SENDING' AND "updatedAt" < (${stale}::timestamptz AT TIME ZONE 'UTC'))
      ORDER BY "sendAfter" ASC
      LIMIT ${batch}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "to", template, locale, payload, attempts, "dedupeKey"`;

  const result: DrainResult = { claimed: rows.length, sent: 0, retried: 0, failed: 0 };
  for (const row of rows) {
    try {
      await deliver(row.template as EmailTemplate, row.to, row.payload, row.locale as EmailLocale, row.dedupeKey);
      await db.emailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
      result.sent++;
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
      const dead = row.attempts >= MAX_ATTEMPTS;
      await db.emailOutbox.update({
        where: { id: row.id },
        data: dead
          ? { status: "FAILED", lastError: message }
          : { status: "PENDING", lastError: message, sendAfter: new Date(now.getTime() + backoffMs(row.attempts)) },
      });
      if (dead) result.failed++;
      else result.retried++;
      log.warn("email.delivery_failed", { id: row.id, template: row.template, attempts: row.attempts, dead });
    }
  }
  return result;
}

/**
 * Drain the outbox right after the current response is sent (Next `after()`).
 * Call after the transaction that enqueued rows has COMMITTED. On Vercel Hobby
 * the send-emails cron runs only daily, so this is the primary delivery path;
 * the cron is the retry safety net. Outside a request scope it is a no-op.
 */
export function scheduleDrain(batch = 20): void {
  try {
    after(async () => {
      try {
        await drainOutbox({ batch });
      } catch (err) {
        log.warn("email.drain_after_failed", { err });
      }
    });
  } catch {
    // Not in a request scope (scripts/tests): the cron will pick rows up.
  }
}
