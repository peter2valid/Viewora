/**
 * GET /api/properties/:id
 * Returns a single property with its media and 360 settings.
 * Only accessible to the property owner.
 */
import { requirePropertyOwner } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const propertyId = getRouterParam(event, 'id')!
  await requirePropertyOwner(event, propertyId)

  const db = serverDb()

  const { data, error } = await db
    .from('properties')
    .select(`
      id, title, slug, description, property_type, location_text,
      cover_image_url, has_360, has_gallery, is_published, published_at,
      visibility, lead_form_enabled, branding_enabled, created_at, updated_at,
      property_media (id, media_type, storage_key, public_url, width, height, file_size_bytes, sort_order, is_primary, created_at),
      property_360_settings (id, panorama_media_id, hfov_default, pitch_default, yaw_default, auto_rotate_enabled, hotspots_json)
    `)
    .eq('id', propertyId)
    .single()

  if (error) throw createError({ statusCode: 404, statusMessage: 'Property not found' })

  return data
})
