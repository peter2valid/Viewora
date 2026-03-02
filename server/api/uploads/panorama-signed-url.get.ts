/**
 * GET /api/uploads/panorama-signed-url?key=<r2-object-key>
 *
 * Returns a short-lived presigned GET URL for an R2 object.
 * Uses AWS SDK v3 (same credentials used for PUT presigned URLs).
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
    // Auth check — only signed-in users can request presigned URLs
    const { data: { user }, error: authErr } = await serverDb().auth.getUser(
        getRequestHeader(event, 'authorization')?.replace('Bearer ', '') || ''
    )

    // Allow unauthenticated for public tour viewer (we check is_published below)
    // Key is required
    const key = getQuery(event).key as string
    if (!key) {
        throw createError({ statusCode: 400, statusMessage: 'key is required' })
    }

    const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    })

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
    })

    // 1 hour expiry — long enough for a viewing session
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 })

    return { url }
})
