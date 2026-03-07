/**
 * POST /api/scenes/:id/hotspots
 * Body: { yaw: number, pitch: number, type?: string, payload?: object }
 */
import { requireUser } from '~/server/utils/auth'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (body?.yaw === undefined || body?.pitch === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'yaw and pitch are required' })
  }

  const db = await serverSupabaseClient(event)

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
    .insert({
      scene_id: id,
      type: body.type ?? 'info',
      yaw: body.yaw,
      pitch: body.pitch,
      payload: body.payload ?? {},
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
