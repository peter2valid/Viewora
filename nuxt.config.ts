import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // Include our custom CSS across all pages
  css: ['@/assets/css/main.css'],

  modules: ['@nuxt/image', '@nuxtjs/google-fonts', '@nuxtjs/seo', '@nuxt/content', '@nuxtjs/supabase'],

  supabase: {
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/app(/*)?'],
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
      Inter: [300, 400, 500, 600, 700, 800, 900],
      Outfit: [400, 500, 600, 700, 800],
      'JetBrains+Mono': [400, 500, 600]
    },
    display: 'swap',
    prefetch: true,
    preconnect: true
  },

  routeRules: {
    // Marketing pages — prerendered for SEO and performance
    '/': { prerender: true },
    '/about': { prerender: true },
    '/pricing': { prerender: true },
    '/product': { prerender: true },
    '/contact': { prerender: true },
    '/register': { prerender: true },
    '/login': { prerender: true },
    '/confirm': { prerender: true },
    '/blog/**': { prerender: true },
    '/legal/**': { prerender: true },
    // Public tours — client-side rendering
    '/tours/**': { ssr: false },
    // App dashboard — client-side only (user-specific, auth-protected)
    '/app/**': { ssr: false },
  },

  nitro: {
    compressPublicAssets: true,
    prerender: {
      failOnError: false
    }
  },

  experimental: {
    payloadExtraction: false
  },

  vite: {
    build: {
      sourcemap: false
    },
    optimizeDeps: {
      include: ['marzipano']
    }
  },

  app: {
    head: {
      title: 'Viewora | Immersive 360° Space Showcase Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Create, host, and share interactive 360° virtual tours in minutes. The ultimate immersive showcase platform for real estate, hospitality, automotive, and retail spaces.' },
      ],
      link: []
    }
  }
})
