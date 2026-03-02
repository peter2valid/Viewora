/**
 * POST /api/spaces
 * Body: { title: string, description?: string }
 * Creates a new space for the authenticated user.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody(event)

  if (!body?.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'title is required' })
  }

  const db = (event.context as any).cloudflare.env.DB
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db
    .prepare('INSERT INTO spaces (id, owner_id, title, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, body.title.trim(), now)
    .run()

  const space = await db.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first()

  return { ...space, is_published: Boolean(space.is_published) }
})
