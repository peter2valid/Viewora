/**
 * GET /api/spaces/:id
 * Returns a space + a short-lived signed URL for the panorama if one is stored.
 */
import { requireUser } from '~/server/utils/auth'
import { generateGetUrl } from '~/server/utils/r2'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  const db = serverDb()

  const { data: space, error } = await db
    .from('spaces')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !space) {
    throw createError({ statusCode: 404, statusMessage: 'Space not found' })
  }

  let panorama_url: string | null = null
  if (space.panorama_key) {
    panorama_url = await generateGetUrl(space.panorama_key as string)
  }

  return { ...space, panorama_url }
})
