/**
 * DELETE /api/hotspots/:id
 * Deletes a hotspot. Verifies the caller owns the parent space.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = serverDb()

  // Confirm ownership via join chain
  const { data: hotspot } = await db
    .from('hotspots')
    .select('id, scenes!inner(space_id, spaces!inner(owner_id))')
    .eq('id', id)
    .eq('scenes.spaces.owner_id', user.id)
    .single()

  if (!hotspot) {
    throw createError({ statusCode: 404, statusMessage: 'Hotspot not found' })
  }

  const { error } = await db.from('hotspots').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { deleted: true }
})
