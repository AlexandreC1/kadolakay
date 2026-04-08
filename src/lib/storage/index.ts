import { randomBytes } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

// Trusted extension lookup: extension is derived from the validated contentType,
// never from the user-supplied filename, so a malicious filename can't trick
// us into hosting an .html or .svg under a wrong key.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForContentType(contentType: string): string | null {
  return EXT_BY_TYPE[contentType] ?? null;
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  // Exact byte length the client is allowed to upload. Bound into the
  // signature so the client cannot exceed it.
  contentLength: number
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { uploadUrl, publicUrl: getPublicUrl(key) };
}

export function getPublicUrl(key: string) {
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(command);
}

export function getUploadKey(
  context: "registry" | "product" | "business" | "avatar",
  id: string,
  contentType: string
) {
  const ext = extensionForContentType(contentType) ?? "bin";
  const nonce = randomBytes(12).toString("hex");
  return `uploads/${context}/${id}/${Date.now()}-${nonce}.${ext}`;
}
