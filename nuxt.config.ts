import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,

  // Include our custom CSS across all pages
  css: ['@/assets/css/main.css'],

  modules: ['@nuxt/image', '@nuxtjs/google-fonts', '@nuxtjs/seo', '@nuxt/content', '@nuxtjs/supabase'],

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/about', '/pricing', '/product', '/contact', '/blog', '/blog/*', '/register'] // Public routes
    }
  },

  site: {
    url: 'https://viewora.com',
    name: 'Viewora',
    description: 'Create interactive 360° virtual tours for your properties. The subscription-based platform for Airbnb hosts, real estate agents, and property developers.',
    defaultLocale: 'en',
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
    '/': { swr: 3600 },
    '/**': { swr: 3600 }
  },

  nitro: {
    compressPublicAssets: true,
    prerender: {
      failOnError: false
    }
  },

  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true
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
      ],
      link: []
    }
  }
})
