/**
 * GET /api/scenes/:id/hotspots
 * Returns all hotspots for a scene.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = (event.context as any).cloudflare.env.DB

  // Confirm ownership via join
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

  const { results } = await db
    .prepare('SELECT * FROM hotspots WHERE scene_id = ?')
    .bind(id)
    .all()

  // Parse JSON payload stored as text
  return (results as any[]).map(h => ({ ...h, payload: JSON.parse(h.payload ?? '{}') }))
})
