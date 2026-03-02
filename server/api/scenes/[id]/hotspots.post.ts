/**
 * POST /api/scenes/:id/hotspots
 * Body: { yaw: number, pitch: number, type?: string, payload?: object }
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (body?.yaw === undefined || body?.pitch === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'yaw and pitch are required' })
  }

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

  const hotspotId = crypto.randomUUID()
  const now = new Date().toISOString()
  const payload = JSON.stringify(body.payload ?? {})

  await db
    .prepare(
      'INSERT INTO hotspots (id, scene_id, type, yaw, pitch, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(hotspotId, id, body.type ?? 'info', body.yaw, body.pitch, payload, now)
    .run()

  const hotspot = await db.prepare('SELECT * FROM hotspots WHERE id = ?').bind(hotspotId).first()
  return { ...hotspot, payload: JSON.parse((hotspot as any).payload ?? '{}') }
})
