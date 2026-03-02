/**
 * GET /api/spaces/:id/scenes
 * Returns all scenes for a space, ordered by order_index.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  // Confirm ownership
  const space = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const { results } = await db
    .prepare('SELECT * FROM scenes WHERE space_id = ? ORDER BY order_index ASC')
    .bind(id)
    .all()

  return results
})
