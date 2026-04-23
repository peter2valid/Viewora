import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  css: ['@/assets/css/main.css'],

  modules: [
    '@nuxt/image',
    '@nuxtjs/google-fonts',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],

  runtimeConfig: {
    // Server-only API base URL used by Nitro proxy route /api/**
    apiBaseUrl: process.env.NUXT_API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || '',
    public: {
      // Empty string = same-origin Nitro routes (/api/*).
      // Set NUXT_PUBLIC_API_BASE_URL to an external Fastify URL only when
      // a dedicated backend is deployed (e.g. https://api.viewora.software).
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'https://app.viewora.software',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
    },
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
    // Auth pages
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/reset-password': { ssr: false },
    '/confirm': { ssr: false },
    // Public tour pages — SSR for fast first paint + Vercel edge caching
    '/p/**': { ssr: true, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } },
    // Embed pages — SSR for fast first paint in iframes
    '/embed/**': { ssr: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' } },
    // App dashboard — client-side only (auth-protected, user-specific data)
    '/app/**': { ssr: false, headers: { 'Cache-Control': 'no-store' } },
    // API — no caching for authenticated data
    '/api/**': { headers: { 'Cache-Control': 'private, no-store, must-revalidate' } },
  },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },

  build: {
    transpile: [
      '@photo-sphere-viewer/core',
      '@photo-sphere-viewer/markers-plugin',
    ],
  },

  components: [
    { path: '~/components', pathPrefix: true },
    { path: '~/features/tour/components', pathPrefix: false },
    { path: '~/features/editor/components', pathPrefix: false },
    { path: '~/features/viewer/panorama', pathPrefix: false },
    { path: '~/features/viewer/car', pathPrefix: false },
    { path: '~/features/viewer/overlay', pathPrefix: false },
  ],

  imports: {
    dirs: [
      'composables',
      'stores',
      'features/tour/composables',
      'features/tour/store',
      'features/editor/composables',
      'features/editor/store',
      'features/viewer/composables',
      'features/hotspot/composables',
      'features/hotspot/store',
    ],
  },

  vite: {
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-psv': ['@photo-sphere-viewer/core', '@photo-sphere-viewer/markers-plugin'],
          },
        },
      },
    },
  },

  app: {
    head: {
      title: 'Dashboard | Viewora',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'robots', content: 'noindex' },
      ],
      link: [
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },
})
