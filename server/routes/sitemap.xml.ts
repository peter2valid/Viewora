import { defineEventHandler, setHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const appUrl = ((config.public as any).appUrl as string || 'https://app.viewora.software').replace(/\/$/, '')

  let slugs: Array<{ slug: string; updated_at: string }> = []

  const supabaseUrl  = process.env.SUPABASE_URL  || ''
  const supabaseKey  = process.env.SUPABASE_KEY  || ''

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase
        .from('properties')
        .select('slug, updated_at')
        .eq('is_published', true)
        .eq('visibility', 'public')
        .not('slug', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(50000)

      slugs = ((data ?? []) as any[])
        .filter(r => r.slug && typeof r.slug === 'string')
        .map(r => ({ slug: r.slug as string, updated_at: r.updated_at as string }))
    } catch {
      // Return an empty sitemap rather than a 500
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const urlEntries = slugs
    .filter(s => /^[a-z0-9-]+$/.test(s.slug))
    .map(({ slug, updated_at }) => {
      const lastmod = updated_at
        ? new Date(updated_at).toISOString().split('T')[0]
        : today
      return `  <url>
    <loc>${appUrl}/p/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')
  return xml
})
