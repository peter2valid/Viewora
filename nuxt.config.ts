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

  image: {
    // Allow Nuxt IPX to fetch and resize images from Cloudflare R2.
    // The public bucket domain is either the custom MEDIA_DOMAIN or the default
    // r2.dev subdomain. Wildcard subdomains are matched by the *.r2.dev entry.
    domains: ['r2.dev', '*.r2.dev', 'media.viewora.software'],
    // Raise the default IPX size limit — panorama thumbnails are 2048×1024
    ipx: { maxAge: 3600 },
  },

  runtimeConfig: {
    // Server-only API base URL used by Nitro proxy route /api/**
    apiBaseUrl: process.env.NUXT_API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || '',
    public: {
      // Empty string = same-origin Nitro routes (/api/*).
      // Set NUXT_PUBLIC_API_BASE_URL to an external Fastify URL only when
      // a dedicated backend is deployed (e.g. https://api.viewora.software).
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'https://app.viewora.software',
      marketingUrl: process.env.NUXT_PUBLIC_MARKETING_URL || 'https://viewora.software',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      gaMeasurementId: process.env.NUXT_PUBLIC_GA_MEASUREMENT_ID || '',
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
    '/p/**': { ssr: true, headers: {
      'Cache-Control': 'public, s-maxage=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': [
        "default-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://app.posthog.com https://us.posthog.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://media.viewora.software https://*.r2.dev https://r2.dev https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co https://extension-cdn.getdirecto.com https://app.viewora.software",
        "connect-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software https://www.google-analytics.com https://app.posthog.com https://us.posthog.com wss://jtezuupnjncguzrpacap.supabase.co https://*.r2.cloudflarestorage.com",
        "frame-src 'self' https://www.youtube.com https://youtube.com",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests",
      ].join('; '),
    }},
    // Embed pages — intentionally cross-origin embeddable, no X-Frame-Options
    '/embed/**': { ssr: true, headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': [
        "default-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://app.posthog.com https://us.posthog.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://media.viewora.software https://*.r2.dev https://r2.dev https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co https://app.viewora.software",
        "connect-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software https://www.google-analytics.com https://app.posthog.com https://us.posthog.com wss://jtezuupnjncguzrpacap.supabase.co https://*.r2.cloudflarestorage.com",
        "frame-src 'self' https://www.youtube.com https://youtube.com",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests",
      ].join('; '),
    }},
    // App dashboard — client-side only (auth-protected, user-specific data)
    '/app/**': { ssr: false, headers: {
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://app.posthog.com https://us.posthog.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://media.viewora.software https://*.r2.dev https://r2.dev https://www.google-analytics.com https://www.googletagmanager.com https://*.supabase.co https://extension-cdn.getdirecto.com https://app.viewora.software",
        "connect-src 'self' https://jtezuupnjncguzrpacap.supabase.co https://api.viewora.software https://media.viewora.software https://www.google-analytics.com https://app.posthog.com https://us.posthog.com wss://jtezuupnjncguzrpacap.supabase.co https://*.r2.cloudflarestorage.com",
        "frame-src 'self' https://www.youtube.com https://youtube.com",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests",
      ].join('; '),
    }},
    // API — no caching for authenticated data
    '/api/**': { headers: { 'Cache-Control': 'private, no-store, must-revalidate' } },
    // PostHog proxy — never cache, always pass through to Nitro server handler
    '/ingest/**': { cache: false },
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
      '@photo-sphere-viewer/compass-plugin',
      '@photo-sphere-viewer/gyroscope-plugin',
      '@photo-sphere-viewer/equirectangular-tiles-adapter',
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
            'vendor-psv': [
              '@photo-sphere-viewer/core',
              '@photo-sphere-viewer/markers-plugin',
              '@photo-sphere-viewer/compass-plugin',
              '@photo-sphere-viewer/gyroscope-plugin',
              '@photo-sphere-viewer/equirectangular-tiles-adapter',
            ],
          },
        },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Dashboard | Viewora',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          // viewport-fit=cover: iOS/Android extend viewport into safe areas (notch, home bar)
          // interactive-widget=resizes-visual: Android Chrome 108+ — virtual keyboard
          //   overlays content instead of resizing the viewport, preventing layout jumps
          //   when the keyboard appears inside the panorama viewer
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual',
        },
        { name: 'robots', content: 'noindex' },
        { name: 'google-site-verification', content: 'f0go63OSeXW0jaswGI3YnyY8PPfrqKsXcumk-bqfqCk' },
      ],
      link: [
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },
})
