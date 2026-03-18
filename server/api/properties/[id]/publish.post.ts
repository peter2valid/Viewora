/**
 * POST /api/properties/:id/publish
 *
 * Publishes or unpublishes a property.
 *
 * Publish checks (enforced server-side):
 *   - Active/trialing subscription (not in grace period)
 *   - Under the active-property limit for the plan
 *   - Property has a slug (auto-generated if not set)
 *   - Property has at least a cover image OR panorama (has_360 or cover_image_url)
 *
 * Body: { publish: boolean, slug?: string }
 */
import { requirePropertyOwner, requirePlan, requireCanUpload, requireUnderLimit } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const propertyId = getRouterParam(event, 'id')!
  const userId = await requirePropertyOwner(event, propertyId)

  const body = await readBody(event)
  const publish = Boolean(body?.publish ?? true)

  const db = serverDb()

  const { data: property, error: propErr } = await db
    .from('properties')
    .select('id, title, slug, is_published, cover_image_url, has_360, has_gallery')
    .eq('id', propertyId)
    .single()

  if (propErr || !property) throw createError({ statusCode: 404, statusMessage: 'Property not found' })

  // ── Unpublish — no checks required ────────────────────────────────────────
  if (!publish) {
    const { data, error } = await db
      .from('properties')
      .update({ is_published: false, visibility: 'private' })
      .eq('id', propertyId)
      .select('id, title, slug, is_published, visibility, updated_at')
      .single()

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    // Decrement active count
    if (property.is_published) {
      await db.rpc('decrement_property_count', { p_user_id: userId }).catch(() => {})
    }

    return data
  }

  // ── Publish checks ─────────────────────────────────────────────────────────
  const ctx = await requirePlan(userId)
  requireCanUpload(ctx)

  // Only check active count if not already published (re-publishing doesn't consume quota)
  if (!property.is_published) {
    requireUnderLimit(ctx.usage.active_properties_count, ctx.plan.max_active_properties, 'active properties')
  }

  // Ensure the property has media to show
  if (!property.cover_image_url && !property.has_360) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Property must have a cover image or 360 panorama before publishing.',
    })
  }

  // Resolve slug
  let slug = (typeof body?.slug === 'string' && body.slug.trim()) ? body.slug.trim() : property.slug

  if (!slug) {
    // Auto-generate from title
    slug = property.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60)
    slug = `${slug}-${Math.random().toString(36).slice(2, 7)}`
  }

  // Ensure slug uniqueness (exclude self)
  const { data: existing } = await db
    .from('properties')
    .select('id')
    .eq('slug', slug)
    .neq('id', propertyId)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: `Slug "${slug}" is already taken. Choose a different one.` })
  }

  const { data, error } = await db
    .from('properties')
    .update({ is_published: true, visibility: 'public', slug, published_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select('id, title, slug, is_published, visibility, published_at, updated_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Increment active count only on first publish
  if (!property.is_published) {
    await db.rpc('increment_property_count', { p_user_id: userId }).catch(() => {})
  }

  return data
})
