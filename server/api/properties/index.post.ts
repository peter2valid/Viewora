/**
 * POST /api/properties
 * Creates a new draft property for the authenticated user.
 * Enforces active-property quota from the plan.
 */
import { requireUser } from '~/server/utils/auth'
import { serverDb } from '~/server/utils/db'
import { requirePlan, requireUnderLimit, requireCanUpload } from '~/server/services/permissions'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const body = await readBody(event)

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) throw createError({ statusCode: 400, statusMessage: 'title is required' })

  const db = serverDb()

  // Enforce plan limits
  const ctx = await requirePlan(userId)
  requireCanUpload(ctx)
  requireUnderLimit(
    ctx.usage.active_properties_count,
    ctx.plan.max_active_properties,
    'active properties',
  )

  const { data, error } = await db
    .from('properties')
    .insert({
      user_id: userId,
      title,
      description: typeof body?.description === 'string' ? body.description.trim() || null : null,
    })
    .select('id, title, slug, description, property_type, location_text, cover_image_url, has_360, has_gallery, is_published, visibility, lead_form_enabled, branding_enabled, created_at, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Increment usage counter
  await db.rpc('increment_property_count', { p_user_id: userId }).catch(() => {
    // Non-fatal: usage_counters will self-correct on next billing/status call
  })

  return data
})
