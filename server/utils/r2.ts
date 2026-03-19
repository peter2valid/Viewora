/**
 * server/utils/r2.ts
 *
 * Presigned URL generation for Cloudflare R2 (S3-compatible API).
 * All uploads go directly from the browser to R2 via a presigned PUT URL.
 * The server only generates the URL — no data flows through the server.
 *
 * Required environment variables:
 *   CF_ACCOUNT_ID         — Cloudflare account ID
 *   R2_BUCKET_NAME        — bucket name (e.g. viewora-tours)
 *   R2_ACCESS_KEY_ID      — R2 API token Access Key ID
 *   R2_SECRET_ACCESS_KEY  — R2 API token Secret Access Key
 *
 * Bucket structure (enforced via storage keys):
 *   users/{userId}/properties/{propertyId}/panorama/master.{ext}
 *   users/{userId}/properties/{propertyId}/gallery/{imageId}.{ext}
 *   users/{userId}/properties/{propertyId}/thumb/cover.{ext}
 *   users/{userId}/branding/logo.{ext}
 *
 * Public URL pattern (when R2 bucket has public access or custom domain):
 *   https://media.viewora.software/{storageKey}
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Allowed MIME types for uploads
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZES: Record<string, number> = {
  panorama: 60 * 1024 * 1024, // 60 MB
  gallery: 20 * 1024 * 1024,  // 20 MB
  thumbnail: 5 * 1024 * 1024, // 5 MB
  logo: 5 * 1024 * 1024,      // 5 MB
}

function makeS3Client(): S3Client {
  const accountId = process.env.CF_ACCOUNT_ID
  if (!accountId) throw new Error('CF_ACCOUNT_ID environment variable is not set')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

function bucket(): string {
  return process.env.R2_BUCKET_NAME ?? 'viewora-tours'
}

/** Presigned PUT URL — browser uploads directly. Expires in 5 minutes. */
export async function generatePutUrl(key: string, contentType: string): Promise<string> {
  const client = makeS3Client()
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: 300 })
}

/** Presigned GET URL — for private media (not needed if bucket has public domain). Expires in 1 hour. */
export async function generateGetUrl(key: string): Promise<string> {
  const client = makeS3Client()
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

/**
 * Returns the public CDN URL for a stored media key.
 * Uses the media.viewora.software custom domain when set, otherwise falls
 * back to a presigned GET URL (for private buckets during development).
 */
export function mediaUrl(key: string): string {
  const domain = process.env.R2_PUBLIC_DOMAIN // e.g. media.viewora.software
  if (domain) return `https://${domain}/${key}`
  // Fallback: return the storage key itself (caller can generate presigned URL if needed)
  return key
}

// ── Storage key builders ───────────────────────────────────────────────────

export function panoramaKey(userId: string, propertyId: string, filename: string): string {
  const ext = _ext(filename)
  return `users/${userId}/properties/${propertyId}/panorama/master.${ext}`
}

export function galleryKey(userId: string, propertyId: string, filename: string): string {
  const ext = _ext(filename)
  const id = _randomId()
  return `users/${userId}/properties/${propertyId}/gallery/${id}.${ext}`
}

export function thumbnailKey(userId: string, propertyId: string): string {
  return `users/${userId}/properties/${propertyId}/thumb/cover.jpg`
}

export function logoKey(userId: string, filename: string): string {
  const ext = _ext(filename)
  return `users/${userId}/branding/logo.${ext}`
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _ext(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'jpg'
}

function _randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
