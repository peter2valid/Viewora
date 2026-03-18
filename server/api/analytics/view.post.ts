/**
 * POST /api/analytics/view
 * Public endpoint — no authentication required.
 *
 * Records a view on a published property.
 * Client-side dedup (localStorage per propertyId+date) prevents reload inflation.
 *
 * Body: { propertyId: string, source?: 'direct' | 'qr' | 'embed' }
 */
import { serverDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const propertyId = typeof body?.propertyId === 'string' ? body.propertyId.trim() : ''

  if (!propertyId) return { ok: true } // silent fail — don't expose validation to public

  const db = serverDb()

  // Only count views for published public properties
  const { data: property } = await db
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('is_published', true)
    .eq('visibility', 'public')
    .single()

  if (!property) return { ok: true }

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  const source = body?.source ?? 'direct'

  // Upsert daily analytics row and increment source-specific column
  const update: Record<string, any> = { total_views: 1 }
  if (source === 'qr') update.qr_views = 1
  else if (source === 'embed') update.embed_views = 1
  else update.direct_views = 1

  // Atomic upsert — on conflict increment all tracked columns
  const { error } = await db.from('analytics_daily').upsert(
    {
      property_id: propertyId,
      date: today,
      total_views: 1,
      qr_views: source === 'qr' ? 1 : 0,
      direct_views: source === 'direct' ? 1 : 0,
      embed_views: source === 'embed' ? 1 : 0,
    },
    {
      onConflict: 'property_id,date',
      ignoreDuplicates: false,
    },
  )

  if (error) {
    console.error('[analytics] view upsert failed:', error.message)
  }

  return { ok: true }
})
