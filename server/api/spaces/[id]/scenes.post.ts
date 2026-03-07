/**
 * POST /api/spaces/:id/scenes
 * Body: { name: string, image_path?: string }
 * Creates a new scene inside a space.
 */
import { requireUser } from '~/server/utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const db = await serverSupabaseClient(event)

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

  // Get next order_index
  const { count } = await db
    .from('scenes')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', id)

  const { data, error } = await db
    .from('scenes')
    .insert({
      space_id: id,
      name: body.name.trim(),
      image_path: body.image_path ?? null,
      order_index: count ?? 0,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
