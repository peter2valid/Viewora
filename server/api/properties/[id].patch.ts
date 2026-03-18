/**
 * PATCH /api/properties/:id
 * Updates editable fields on a property. Only the owner may update.
 * Media and publish status have their own dedicated routes.
 */
import { requirePropertyOwner } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

const EDITABLE_FIELDS = [
  'title', 'description', 'property_type', 'location_text',
  'cover_image_url', 'lead_form_enabled', 'branding_enabled', 'visibility',
] as const

export default defineEventHandler(async (event) => {
  const propertyId = getRouterParam(event, 'id')!
  await requirePropertyOwner(event, propertyId)

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Request body is required' })
  }

  // Only allow explicitly whitelisted fields
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field] ?? null
  }

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No updatable fields provided' })
  }

  const db = serverDb()

  const { data, error } = await db
    .from('properties')
    .update(patch)
    .eq('id', propertyId)
    .select('id, title, slug, description, property_type, location_text, cover_image_url, has_360, has_gallery, is_published, visibility, lead_form_enabled, branding_enabled, created_at, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
