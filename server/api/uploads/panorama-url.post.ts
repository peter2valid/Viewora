/**
 * POST /api/uploads/panorama-url
 * Body: { spaceId: string, fileName: string, contentType: string }
 *
 * Returns:
 *   { uploadUrl, key }
 *
 * Flow:
 *   1. Client calls this endpoint → receives a presigned PUT URL + R2 key
 *   2. Client PUTs the file directly to `uploadUrl` (browser → R2, no proxy)
 *   3. Client calls POST /api/spaces/:id/panorama with the returned `key`
 *      to attach it to the space record in D1
 */
import { requireUser } from '~/server/utils/auth'
import { generatePutUrl, makePanoramaKey } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  if (!body?.spaceId || !body?.fileName || !body?.contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'spaceId, fileName and contentType are required',
    })
  }

  // Validate content type — only images accepted
  if (!body.contentType.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image uploads are accepted' })
  }

  const db = (event.context as any).cloudflare.env.DB

  // Confirm the caller owns the space
  const space = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(body.spaceId, user.id)
    .first()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const key = makePanoramaKey(body.spaceId, body.fileName)
  const uploadUrl = await generatePutUrl(key, body.contentType)

  return { uploadUrl, key }
})
