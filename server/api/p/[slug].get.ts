/**
 * GET /api/p/:slug
 * Public endpoint — no authentication required.
 * Returns a published property by slug for the public viewer page.
 * Only returns properties that are published AND public.
 */
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const db = serverDb()

  const { data, error } = await db
    .from('properties')
    .select(`
      id, title, slug, description, property_type, location_text,
      cover_image_url, has_360, has_gallery,
      lead_form_enabled, branding_enabled, published_at,
      property_media (id, media_type, storage_key, public_url, width, height, sort_order, is_primary),
      property_360_settings (id, hfov_default, pitch_default, yaw_default, auto_rotate_enabled, hotspots_json)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('visibility', 'public')
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Property not found' })
  }

  return data
})
