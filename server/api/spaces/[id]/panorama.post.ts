/**
 * POST /api/spaces/:id/panorama
 * Body: { key: string }
 * Attaches an already-uploaded R2 key to a space.
 * Call this after the browser has finished the presigned PUT upload.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body?.key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const db = (event.context as any).cloudflare.env.DB

  const existing = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  await db
    .prepare('UPDATE spaces SET panorama_key = ? WHERE id = ?')
    .bind(body.key, id)
    .run()

  const updated = await db.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first()
  return { ...updated, is_published: Boolean(updated.is_published) }
})
