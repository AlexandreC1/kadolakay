"use server";

import { auth } from "@/lib/auth";
import { generatePresignedUploadUrl, getUploadKey } from "@/lib/storage";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function getUploadUrl(
  context: "registry" | "product" | "business" | "avatar",
  contextId: string,
  fileName: string,
  contentType: string,
  fileSize: number
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
  }

  if (fileSize > MAX_SIZE) {
    throw new Error("File too large. Maximum size: 5MB");
  }

  const key = getUploadKey(context, contextId, fileName);
  return generatePresignedUploadUrl(key, contentType);
}
