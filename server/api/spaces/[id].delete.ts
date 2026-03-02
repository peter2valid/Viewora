/**
 * DELETE /api/spaces/:id
 * Deletes a space and all its scenes/hotspots (via ON DELETE CASCADE in DB).
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = serverDb()

  const { data: existing } = await db
    .from('spaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const { error } = await db.from('spaces').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { deleted: true }
})
