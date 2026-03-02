/**
 * GET /api/spaces/:id/scenes
 * Returns all scenes for a space, ordered by order_index.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = serverDb()

  // Confirm ownership
  const { data: space } = await db
    .from('spaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const { data, error } = await db
    .from('scenes')
    .select('*')
    .eq('space_id', id)
    .order('order_index', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
