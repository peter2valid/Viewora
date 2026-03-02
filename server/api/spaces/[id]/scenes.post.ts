/**
 * POST /api/spaces/:id/scenes
 * Body: { name: string, image_path?: string }
 * Creates a new scene inside a space.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const db = (event.context as any).cloudflare.env.DB

  // Confirm ownership
  const space = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  // Determine next order_index
  const countRow = await db
    .prepare('SELECT COUNT(*) AS cnt FROM scenes WHERE space_id = ?')
    .bind(id)
    .first()

  const sceneId = crypto.randomUUID()
  const now = new Date().toISOString()

  await db
    .prepare(
      'INSERT INTO scenes (id, space_id, name, image_path, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(sceneId, id, body.name.trim(), body.image_path ?? null, (countRow as any).cnt, now)
    .run()

  return db.prepare('SELECT * FROM scenes WHERE id = ?').bind(sceneId).first()
})
