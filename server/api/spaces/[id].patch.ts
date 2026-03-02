/**
 * PATCH /api/spaces/:id
 * Body: { title?: string }
 * Updates editable fields on a space.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = serverDb()

  // Verify ownership
  const { data: existing } = await db
    .from('spaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const updates: Record<string, unknown> = {}

  if (body?.title !== undefined) {
    if (!body.title?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'title cannot be empty' })
    }
    updates.title = body.title.trim()
  }

  const { data, error } = await db
    .from('spaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
