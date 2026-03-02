/**
 * server/utils/r2.ts
 *
 * Generates presigned S3-compatible URLs for Cloudflare R2.
 *
 * Cloudflare R2 exposes an S3-compatible API.  The presigned URL is generated
 * entirely on the server (no HTTP call to R2) — it is just a signed HTTPS URL
 * the browser can use directly for PUT (upload) or GET (view).
 *
 * Required environment variables:
 *   R2_ACCESS_KEY_ID      — R2 API token "Access Key ID"
 *   R2_SECRET_ACCESS_KEY  — R2 API token "Secret Access Key"
 *   CF_ACCOUNT_ID         — your Cloudflare account ID
 *   R2_BUCKET_NAME        — name of the R2 bucket (viewora-tours)
 *
 * How to create the R2 API token:
 *   Cloudflare Dashboard → R2 → viewora-tours → Manage R2 API Tokens
 *   → Create API Token → Permission: Object Read & Write (bucket: viewora-tours)
 *   → Copy Access Key ID + Secret Access Key into .env
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function makeS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

/** Presigned PUT URL — browser uploads directly to R2.  Expires in 5 minutes. */
export async function generatePutUrl(key: string, contentType: string): Promise<string> {
  if (process.dev && !process.env.R2_ACCESS_KEY_ID) {
    // Return a local dev placeholder so the UI doesn't break
    return `http://localhost:3001/__r2_mock_upload/${key}`
  }

  const client = makeS3Client()
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME ?? 'viewora-tours',
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: 300 })
}

/** Presigned GET URL — browser views the panorama image.  Expires in 1 hour. */
export async function generateGetUrl(key: string): Promise<string> {
  if (process.dev && !process.env.R2_ACCESS_KEY_ID) {
    return `http://localhost:3001/__r2_mock_view/${key}`
  }

  const client = makeS3Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME ?? 'viewora-tours',
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

/**
 * Generates a unique storage key for a panorama upload.
 * Format:  panoramas/{spaceId}/{timestamp}-{random}.{ext}
 */
export function makePanoramaKey(spaceId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `panoramas/${spaceId}/${ts}-${rand}.${ext}`
}
