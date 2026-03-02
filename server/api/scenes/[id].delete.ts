/**
 * DELETE /api/scenes/:id
 * Deletes a scene (and its hotspots via ON DELETE CASCADE).
 * Verifies the caller owns the parent space.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  // Join to spaces to confirm ownership
  const scene = await db
    .prepare(
      `SELECT s.id FROM scenes s
       JOIN spaces sp ON sp.id = s.space_id
       WHERE s.id = ? AND sp.owner_id = ?`,
    )
    .bind(id, user.id)
    .first()

  if (!scene) {
    throw createError({ statusCode: 404, statusMessage: 'Scene not found' })
  }

  await db.prepare('DELETE FROM scenes WHERE id = ?').bind(id).run()

  return { deleted: true }
})
