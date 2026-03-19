/**
 * GET /api/properties
 * Returns all properties owned by the authenticated user, newest first.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const db = serverDb()

  const { data, error } = await db
    .from('properties')
    .select('id, title, slug, description, property_type, location_text, cover_image_url, has_360, has_gallery, is_published, visibility, lead_form_enabled, branding_enabled, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data ?? []
})
