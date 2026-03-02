/**
 * GET /api/spaces/:id
 * Returns a space + a short-lived signed URL for the panorama if one is stored.
 */
import { requireUser } from '~/server/utils/auth'
import { generateGetUrl } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  const space = await db
    .prepare('SELECT * FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  let panorama_url: string | null = null
  if (space.panorama_key) {
    panorama_url = await generateGetUrl(space.panorama_key as string)
  }

  return { ...space, is_published: Boolean(space.is_published), panorama_url }
})
