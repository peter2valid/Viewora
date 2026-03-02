/**
 * GET /api/spaces
 * Returns all spaces owned by the authenticated user, newest first.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = (event.context as any).cloudflare.env.DB

  const { results } = await db
    .prepare('SELECT * FROM spaces WHERE owner_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all()

  // SQLite stores booleans as 0/1 — normalize for the client
  return (results as any[]).map(normalizeSpace)
})

function normalizeSpace(row: any) {
  return { ...row, is_published: Boolean(row.is_published) }
}
