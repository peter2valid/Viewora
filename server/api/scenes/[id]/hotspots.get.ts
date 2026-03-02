/**
 * GET /api/scenes/:id/hotspots
 * Returns all hotspots for a scene.
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

  const { data, error } = await db
    .from('hotspots')
    .select('*')
    .eq('scene_id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
