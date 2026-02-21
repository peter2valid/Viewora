<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const title = 'Viewora | 360° Virtual Tours for Real Estate & Hospitality'
const description = 'Create interactive 360° virtual tours for your properties. The subscription-based platform for Airbnb hosts, real estate agents, and property developers.'

useSeoMeta({
  title,
  titleTemplate: '%s | Viewora',
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/og-image.jpg', // Placeholder
  ogUrl: 'https://viewora.com',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: '/og-image.jpg',
  themeColor: '#0f172a' // slate-900
})

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'google-site-verification', content: 'YOUR_GOOGLE_SEARCH_CONSOLE_CODE_HERE' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon.ico' }
  ],
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX',
      async: true
    },
    {
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXXXXX');
      `
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Viewora",
        "operatingSystem": "WebBrowser",
        "applicationCategory": "BusinessApplication",
        "offers": {
          "@type": "Offer",
          "price": "2000.00",
          "priceCurrency": "KES"
        },
        "description": "SaaS platform for creating interactive 360° virtual tours for real estate, Airbnb, and hospitality.",
        "publisher": {
          "@type": "Organization",
          "name": "Viewora"
        }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Viewora HQ",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Nairobi",
          "addressCountry": "KE"
        }
      })
    }
  ]
})

useSchemaOrg([
  defineOrganization({
    name: 'Viewora',
    logo: '/images/viewora-logo.png', // Placeholder
    sameAs: [
      'https://twitter.com/viewora',
      'https://www.linkedin.com/company/viewora'
    ]
  }),
  defineWebSite({
    name: 'Viewora',
  })
])
</script>
