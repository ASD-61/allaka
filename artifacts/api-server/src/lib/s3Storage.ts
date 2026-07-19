import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3-compatible object storage (Cloudflare R2, Supabase Storage, Backblaze B2,
// AWS S3, ...). Uploads are presigned so the client PUTs the image DIRECTLY to
// the bucket — the API server (Render) never receives or stores image bytes, it
// only hands out short-lived signed URLs and stores the public URL as text.
//
// Required env (set on Render):
//   S3_BUCKET        bucket name
//   S3_ACCESS_KEY    access key id
//   S3_SECRET_KEY    secret access key
//   S3_PUBLIC_URL    public base URL for reads (e.g. https://cdn.example.com or
//                    the bucket's public r2.dev / Supabase public URL)
// Optional:
//   S3_ENDPOINT      custom endpoint (required for R2/Supabase/B2; omit for AWS)
//   S3_REGION        region (default "auto" — correct for R2)
//   S3_FORCE_PATH_STYLE  "true" for providers that need path-style URLs

const bucket = process.env["S3_BUCKET"];
const accessKeyId = process.env["S3_ACCESS_KEY"];
const secretAccessKey = process.env["S3_SECRET_KEY"];
const publicBase = (process.env["S3_PUBLIC_URL"] ?? "").replace(/\/+$/, "");
const endpoint = process.env["S3_ENDPOINT"] || undefined;
const region = process.env["S3_REGION"] || "auto";
const forcePathStyle = process.env["S3_FORCE_PATH_STYLE"] === "true";

export function s3Enabled(): boolean {
  return !!(bucket && accessKeyId && secretAccessKey && publicBase);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return client;
}

function extFor(name: string, contentType: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  if (fromName && /^[a-zA-Z0-9]{1,5}$/.test(fromName)) return `.${fromName.toLowerCase()}`;
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  return ".jpg";
}

/**
 * Returns a presigned PUT url (client uploads straight to the bucket) plus the
 * public read url to store on the record. The client MUST PUT with the same
 * Content-Type it passed here.
 */
export async function createS3Upload(
  name: string,
  contentType: string,
): Promise<{ uploadURL: string; publicUrl: string }> {
  const key = `uploads/${randomUUID()}${extFor(name, contentType)}`;
  const command = new PutObjectCommand({
    Bucket: bucket!,
    Key: key,
    ContentType: contentType,
  });
  const uploadURL = await getSignedUrl(getClient(), command, { expiresIn: 900 });
  return { uploadURL, publicUrl: `${publicBase}/${key}` };
}
