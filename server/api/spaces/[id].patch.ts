/**
 * PATCH /api/spaces/:id
 * Body: { title?: string }
 * Updates editable fields on a space.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = (event.context as any).cloudflare.env.DB

  // Verify ownership
  const existing = await db
    .prepare('SELECT id FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  if (body?.title !== undefined) {
    if (!body.title?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'title cannot be empty' })
    }
    await db
      .prepare('UPDATE spaces SET title = ? WHERE id = ?')
      .bind(body.title.trim(), id)
      .run()
  }

  const updated = await db.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first()
  return { ...updated, is_published: Boolean(updated.is_published) }
})
