/**
 * GET /api/dashboard/summary
 * Returns aggregated metrics for the authenticated user.
 *
 * Response:
 *   total_properties      — all user properties
 *   published_properties  — is_published = true
 *   new_leads_7d          — null if plan lacks lead_capture_enabled
 *   total_views           — sum from analytics_daily
 *   plan_name             — plan name (e.g. "Free", "Plus")
 */
import { requireUser } from '~/server/utils/auth'
import { requirePlan } from '~/server/services/permissions'
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { id: userId } = await requireUser(event)
  const ctx = await requirePlan(userId)
  const db = serverDb()

  // ── Properties ───────────────────────────────────────────────────────────
  const { data: properties } = await db
    .from('properties')
    .select('id, is_published')
    .eq('user_id', userId)

  const totalProperties = properties?.length ?? 0
  const publishedProperties = properties?.filter((p) => p.is_published).length ?? 0
  const propertyIds = (properties ?? []).map((p) => p.id)

  // ── Leads (only if entitled) ─────────────────────────────────────────────
  let newLeads7d: number | null = null

  if (ctx.plan.lead_capture_enabled && propertyIds.length > 0) {
    const { count } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('property_id', propertyIds)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    newLeads7d = count ?? 0
  } else if (ctx.plan.lead_capture_enabled) {
    newLeads7d = 0
  }

  // ── Analytics views ───────────────────────────────────────────────────────
  let totalViews = 0
  if (propertyIds.length > 0) {
    const { data: analytics } = await db
      .from('analytics_daily')
      .select('total_views')
      .in('property_id', propertyIds)

    totalViews = (analytics ?? []).reduce((sum, row) => sum + (row.total_views ?? 0), 0)
  }

  return {
    total_properties: totalProperties,
    published_properties: publishedProperties,
    new_leads_7d: newLeads7d,
    lead_capture_enabled: ctx.plan.lead_capture_enabled,
    total_views: totalViews,
    plan_name: ctx.plan.name,
  }
})
