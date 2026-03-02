/**
 * POST /api/spaces/:id/publish
 * Body: { publish: boolean, slug?: string }
 * Toggles published state.  Auto-generates a slug from the title if none provided.
 */
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = (event.context as any).cloudflare.env.DB

  const space = await db
    .prepare('SELECT * FROM spaces WHERE id = ? AND owner_id = ?')
    .bind(id, user.id)
    .first()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const isPublishing = body?.publish !== false  // default to publishing
  let slug = space.slug as string | null

  if (isPublishing && !slug) {
    const base = (space.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    slug = body?.slug ?? `${base}-${Math.random().toString(36).slice(2, 7)}`
  }

  await db
    .prepare('UPDATE spaces SET is_published = ?, slug = ? WHERE id = ?')
    .bind(isPublishing ? 1 : 0, slug, id)
    .run()

  const updated = await db.prepare('SELECT * FROM spaces WHERE id = ?').bind(id).first()
  return { ...updated, is_published: Boolean(updated.is_published) }
})
