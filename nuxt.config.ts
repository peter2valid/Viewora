import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // Include our custom CSS across all pages
  css: ['@/assets/css/main.css'],

  modules: ['@nuxt/image', '@nuxtjs/google-fonts', '@nuxtjs/seo', '@nuxt/content', '@nuxtjs/supabase'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/about', '/pricing', '/product', '/contact', '/blog', '/blog/*', '/register'] // Public routes
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
      Inter: [300, 400, 500, 600, 700],
      Outfit: [400, 500, 600, 700, 800]
    },
    display: 'swap',
    prefetch: true,
    preconnect: true
  },

  routeRules: {
    '/': { prerender: true },
    '/**': { prerender: true }
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
    }
  },

  app: {
    head: {
      title: 'Viewora',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'google-site-verification', content: '5A7Cbn0o8coBfTjMnq95edJ2uRY3PIDIAvxcUG642Eo' },
      ],
      link: []
    }
  }
})
