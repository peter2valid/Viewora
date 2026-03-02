import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // Include our custom CSS across all pages
  css: ['@/assets/css/main.css'],

  modules: ['@nuxt/image', '@nuxtjs/google-fonts', '@nuxtjs/seo', '@nuxt/content', '@nuxtjs/supabase', '@nuxtjs/sitemap'],

  sitemap: {
    hostname: 'https://viewora.software',
    urls: [
      { loc: '/', priority: 1.0, changefreq: 'weekly' },
      { loc: '/product', priority: 0.9, changefreq: 'monthly' },
      { loc: '/pricing', priority: 0.9, changefreq: 'monthly' },
      { loc: '/about', priority: 0.7, changefreq: 'monthly' },
      { loc: '/contact', priority: 0.7, changefreq: 'monthly' },
      { loc: '/blog', priority: 0.8, changefreq: 'weekly' },
    ],
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/app/**'],
      exclude: [],
      cookieRedirect: false,
    }
  },

  site: {
    url: 'https://viewora.software',
    name: 'Viewora',
    description: 'Create interactive 360° virtual tours for your properties. The subscription-based platform for Airbnb hosts, real estate agents, and property developers.',
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
    // Public tours — client-side (pulls from Supabase, no auth)
    '/tours/**': { ssr: false },
    // App dashboard — client-side only (auth-protected, user-specific)
    '/app/**': { ssr: false, headers: { 'Cache-Control': 'no-store' } },
    // API routes — short cache + stale-while-revalidate
    '/api/spaces': { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
    '/api/spaces/**': { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
  },

  nitro: {
    prerender: {
      failOnError: false
    }
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },

  vite: {
    build: {
      sourcemap: false,
      // Split large vendor chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-marzipano': ['marzipano'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['marzipano'],
    },
  },

  app: {
    head: {
      title: 'Viewora | Immersive 360° Space Showcase Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Create, host, and share interactive 360° virtual tours in minutes. The ultimate immersive showcase platform for real estate, hospitality, automotive, and retail spaces.' },
      ],
      link: [
        // DNS prefetch for external services
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: process.env.SUPABASE_URL || '' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },
})
