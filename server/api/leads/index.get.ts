/**
 * GET /api/leads
 * Returns all leads for properties owned by the authenticated user, newest first.
 * Requires lead_capture_enabled entitlement.
 *
 * Query params:
 *   property_id — filter to a single property (optional)
 */
import { requireUser } from '~/server/utils/auth'
import { requirePlan, requireEntitlement } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const ctx = await requirePlan(userId)
  requireEntitlement(ctx.plan, 'lead_capture_enabled')

  const db = serverDb()
  const query = getQuery(event)

  let q = db
    .from('leads')
    .select('id, property_id, name, email, phone, message, source, created_at, properties(id, title, slug)')
    .eq('properties.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (query.property_id) {
    q = (q as any).eq('property_id', query.property_id as string)
  }

  const { data, error } = await q

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data
})
