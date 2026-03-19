/**
 * DELETE /api/properties/:id
 * Permanently deletes a property and all its media, leads, and analytics.
 * Cascades are handled by Supabase FK constraints (ON DELETE CASCADE).
 * Decrements the user's active_properties_count usage counter.
 */
import { requirePropertyOwner } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const propertyId = getRouterParam(event, 'id')!
  const userId = await requirePropertyOwner(event, propertyId)

  const db = serverDb()

  const { error } = await db
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Decrement usage counter — non-fatal if it fails
  await db.rpc('decrement_property_count', { p_user_id: userId }).catch(() => {})

  return { deleted: true }
})
