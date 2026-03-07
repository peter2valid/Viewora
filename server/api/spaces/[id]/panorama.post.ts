/**
 * POST /api/spaces/:id/panorama
 * Body: { key: string }
 * Attaches an already-uploaded R2 key to a space.
 */
import { requireUser } from '~/server/utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!body?.key) {
    throw createError({ statusCode: 400, statusMessage: 'key is required' })
  }

  const db = await serverSupabaseClient(event)

  const { data: existing } = await db
    .from('spaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  const { data, error } = await db
    .from('spaces')
    .update({ panorama_key: body.key })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
