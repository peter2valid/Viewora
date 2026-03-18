/**
 * POST /api/leads
 * Public endpoint — no authentication required.
 * Submits a lead inquiry for a published property.
 *
 * Body: { propertyId, name?, email?, phone?, message?, source? }
 */
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const propertyId = typeof body?.propertyId === 'string' ? body.propertyId.trim() : ''
  if (!propertyId) throw createError({ statusCode: 400, statusMessage: 'propertyId is required' })

  const db = serverDb()

  // Only accept leads for published public properties
  const { data: property } = await db
    .from('properties')
    .select('id, lead_form_enabled')
    .eq('id', propertyId)
    .eq('is_published', true)
    .eq('visibility', 'public')
    .single()

  if (!property) throw createError({ statusCode: 404, statusMessage: 'Property not found' })
  if (!property.lead_form_enabled) {
    throw createError({ statusCode: 403, statusMessage: 'Lead capture is not enabled for this property' })
  }

  const VALID_SOURCES = ['direct', 'qr', 'embed', 'whatsapp']
  const source = VALID_SOURCES.includes(body?.source) ? body.source : 'direct'

  const { data, error } = await db
    .from('leads')
    .insert({
      property_id: propertyId,
      name: typeof body?.name === 'string' ? body.name.trim() || null : null,
      email: typeof body?.email === 'string' ? body.email.trim() || null : null,
      phone: typeof body?.phone === 'string' ? body.phone.trim() || null : null,
      message: typeof body?.message === 'string' ? body.message.trim() || null : null,
      source,
    })
    .select('id, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
