/**
 * POST /api/spaces/:id/publish
 * Body: { publish: boolean, slug?: string }
 * Toggles published state. Auto-generates a slug from the title if none provided.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = serverDb()

  const { data: space } = await db
    .from('spaces')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const isPublishing = body?.publish !== false
  let slug = space.slug as string | null

  if (isPublishing && !slug) {
    const base = (space.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    slug = body?.slug ?? `${base}-${Math.random().toString(36).slice(2, 7)}`
  }

  const { data, error } = await db
    .from('spaces')
    .update({ is_published: isPublishing, slug })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
