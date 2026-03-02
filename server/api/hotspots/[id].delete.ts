/**
 * DELETE /api/hotspots/:id
 * Deletes a hotspot.  Verifies the caller owns the parent space.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  // Confirm ownership via join chain
  const hotspot = await db
    .prepare(
      `SELECT h.id FROM hotspots h
       JOIN scenes s  ON s.id  = h.scene_id
       JOIN spaces sp ON sp.id = s.space_id
       WHERE h.id = ? AND sp.owner_id = ?`,
    )
    .bind(id, user.id)
    .first()

  if (!hotspot) {
    throw createError({ statusCode: 404, statusMessage: 'Hotspot not found' })
  }

  await db.prepare('DELETE FROM hotspots WHERE id = ?').bind(id).run()

  return { deleted: true }
})
