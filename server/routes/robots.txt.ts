import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const appUrl = ((config.public as any).appUrl as string || 'https://app.viewora.software').replace(/\/$/, '')

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, s-maxage=86400')

  return [
    'User-agent: *',
    // Block dashboard, auth, API, and embed pages
    'Disallow: /app/',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /reset-password',
    'Disallow: /confirm',
    'Disallow: /embed/',
    'Disallow: /api/',
    'Disallow: /ingest/',
    // Allow tour pages
    'Allow: /p/',
    '',
    `Sitemap: ${appUrl}/sitemap.xml`,
  ].join('\n')
})
