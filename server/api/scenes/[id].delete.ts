/**
 * DELETE /api/scenes/:id
 * Deletes a scene (and its hotspots via ON DELETE CASCADE).
 * Verifies the caller owns the parent space.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = serverDb()

  // Confirm ownership via join
  const { data: scene } = await db
    .from('scenes')
    .select('id, spaces!inner(owner_id)')
    .eq('id', id)
    .eq('spaces.owner_id', user.id)
    .single()

  if (!scene) {
    throw createError({ statusCode: 404, statusMessage: 'Scene not found' })
  }

  const { error } = await db.from('scenes').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { deleted: true }
})
