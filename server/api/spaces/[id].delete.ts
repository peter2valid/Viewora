/**
 * DELETE /api/spaces/:id
 * Deletes a space and all its scenes/hotspots (via ON DELETE CASCADE).
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  const existing = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  await db.prepare('DELETE FROM spaces WHERE id = ?').bind(id).run()

  return { deleted: true }
})
