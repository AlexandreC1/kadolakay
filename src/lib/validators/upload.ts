import { z } from "zod";

/**
 * Server Actions are public POST endpoints: TypeScript types on their
 * parameters vanish at runtime, so a caller can send any value. These schemas
 * are the runtime version of those types.
 */

export const UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const UPLOAD_MIN_SIZE = 64; // anything smaller can't be a real image
export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const uploadRequestSchema = z.object({
  // An unknown context used to fall through every ownership branch and be
  // treated as allowed. The enum makes that impossible.
  context: z.enum(["registry", "product", "business", "avatar"]),
  // contextId is interpolated into the storage key, so it must not carry
  // path separators or dots. Prisma ids (cuid) are plain alphanumerics.
  contextId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  contentType: z.enum(UPLOAD_CONTENT_TYPES),
  fileSize: z.number().int().min(UPLOAD_MIN_SIZE).max(UPLOAD_MAX_SIZE),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
