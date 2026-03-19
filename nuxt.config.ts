import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  css: ['@/assets/css/main.css'],

  modules: [
    '@nuxt/image',
    '@nuxtjs/google-fonts',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      // Empty string = same-origin Nitro routes (/api/*).
      // Set NUXT_PUBLIC_API_BASE_URL to an external Fastify URL only when
      // a dedicated backend is deployed (e.g. https://api.viewora.software).
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'https://app.viewora.software',
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
    // Public properties — client-side
    '/p/**': { ssr: false },
    // Embed pages — lightweight, no auth
    '/embed/**': { ssr: false },
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
