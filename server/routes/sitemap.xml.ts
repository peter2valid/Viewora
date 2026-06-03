import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const appUrl = ((config.public as any).appUrl as string || 'https://app.viewora.software').replace(/\/$/, '')
  const apiBase = ((config.public as any).apiBaseUrl as string || '').replace(/\/$/, '')

  let slugs: Array<{ slug: string; updated_at: string }> = []

  try {
    const data = await $fetch<{ slugs: Array<{ slug: string; updated_at: string }> }>(
      `${apiBase}/sitemap-data`,
      { timeout: 8000 },
    )
    slugs = data?.slugs ?? []
  } catch {
    // Return a minimal valid sitemap on error rather than crashing
  }

  const today = new Date().toISOString().split('T')[0]

  const urlEntries = slugs
    .filter(s => s.slug && /^[a-z0-9-]+$/.test(s.slug))
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
<urlset xmlns="http://www.sitemaps.org/schemas/0.5/sitemap"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600')
  return xml
})
