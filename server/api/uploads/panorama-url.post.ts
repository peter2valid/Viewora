/**
 * POST /api/uploads/panorama-url
 * Body: { spaceId: string, fileName: string, contentType: string }
 *
 * Returns: { uploadUrl, key }
 *
 * Flow:
 *   1. Client calls this endpoint → receives a presigned PUT URL + R2 key
 *   2. Client PUTs the file directly to `uploadUrl` (browser → R2, no proxy)
 *   3. Client calls POST /api/spaces/:id/panorama with the returned `key`
 *      to attach it to the space record in Supabase
 */
import { requireUser } from '~/server/utils/auth'
import { generatePutUrl, makePanoramaKey } from '~/server/utils/r2'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  if (!body?.spaceId || !body?.fileName || !body?.contentType) {
    throw createError({
      statusCode: 400,
      statusMessage: 'spaceId, fileName and contentType are required',
    })
  }

  if (!body.contentType.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image uploads are accepted' })
  }

  const db = serverDb()

  // Confirm the caller owns the space
  const { data: space } = await db
    .from('spaces')
    .select('id')
    .eq('id', body.spaceId)
    .eq('owner_id', user.id)
    .single()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const key = makePanoramaKey(body.spaceId, body.fileName)
  const uploadUrl = await generatePutUrl(key, body.contentType)

  return { uploadUrl, key }
})
