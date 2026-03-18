import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  css: ['@/assets/css/main.css'],

  modules: [
    '@nuxt/image',
    '@nuxtjs/google-fonts',
    '@nuxtjs/seo',
    '@nuxt/content',
    '@nuxtjs/supabase',
    ['@nuxtjs/sitemap', {
      hostname: 'https://viewora.software',
      urls: [
        { loc: '/', priority: 1.0, changefreq: 'weekly' },
        { loc: '/product', priority: 0.9, changefreq: 'monthly' },
        { loc: '/pricing', priority: 0.9, changefreq: 'monthly' },
        { loc: '/about', priority: 0.7, changefreq: 'monthly' },
        { loc: '/contact', priority: 0.7, changefreq: 'monthly' },
        { loc: '/blog', priority: 0.8, changefreq: 'weekly' },
      ],
    }],
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      // Empty string = same-origin Nitro routes (/api/*).
      // Set NUXT_PUBLIC_API_BASE_URL to an external Fastify URL only when
      // a dedicated backend is deployed (e.g. https://api.viewora.software).
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
    },
    // Server-only (not exposed to client)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    r2AccountId: process.env.R2_ACCOUNT_ID || '',
    r2BucketName: process.env.R2_BUCKET_NAME || '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    types: '~/types/database.types.ts',
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/app/**'],
      exclude: [],
      cookieRedirect: false,
    },
  },

  site: {
    url: 'https://viewora.software',
    name: 'Viewora',
    description: 'Create interactive 360° virtual tours for your properties. The subscription-based platform for real estate agents, Airbnb hosts, and property developers.',
    defaultLocale: 'en',
  },

  ogImage: {
    enabled: true,
  },

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      Outfit: [600, 700],
    },
    display: 'swap',
    prefetch: true,
    preconnect: true,
    download: true,
  },

  routeRules: {
    // Marketing pages — prerendered as static HTML
    '/': { prerender: true },
    '/about': { prerender: true },
    '/pricing': { prerender: true },
    '/product': { prerender: true },
    '/contact': { prerender: true },
    '/register': { prerender: true },
    '/login': { prerender: true },
    '/reset-password': { prerender: true },
    '/confirm': { ssr: false },
    '/blog/**': { prerender: true },
    '/legal/**': { prerender: true },
    // Public properties — client-side
    '/p/**': { ssr: false },
    // Embed pages — lightweight, no auth
    '/embed/**': { ssr: false },
    // Legacy tour/space routes → redirect to new dashboard
    '/tours/**': { redirect: { to: '/app/properties', statusCode: 301 } },
    '/app/spaces/**': { redirect: { to: '/app/properties', statusCode: 301 } },
    '/app/projects/**': { redirect: { to: '/app/properties', statusCode: 301 } },
    // App dashboard — client-side only (auth-protected, user-specific data)
    '/app/**': { ssr: false, headers: { 'Cache-Control': 'no-store' } },
    // API — no caching for authenticated data
    '/api/**': { headers: { 'Cache-Control': 'private, no-store, must-revalidate' } },
  },

  nitro: {
    // Vercel deployment target (set NITRO_PRESET=vercel in Vercel env or use vercel.json)
    prerender: {
      failOnError: false,
    },
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },

  vite: {
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
  },

  app: {
    head: {
      title: 'Viewora | Immersive 360° Virtual Tour Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Create, host, and share interactive 360° virtual tours in minutes. The professional platform for real estate, hospitality, automotive, and retail spaces.',
        },
      ],
      link: [
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },
})
