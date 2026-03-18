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
  ogImage: '/og-image.jpg',
  ogUrl: 'https://viewora.software',
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: '/og-image.jpg',
  themeColor: '#0f172a'
})

useHead({
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon.ico' }
  ],
  // TODO: Replace G-XXXXXXXXXX with your real Google Analytics ID, then uncomment.
  // script: [
  //   {
  //     innerHTML: `(function(){
  //       if(typeof window==='undefined') return;
  //       var load=function(){
  //         var s=document.createElement('script');
  //         s.src='https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  //         s.async=true; document.head.appendChild(s);
  //         window.dataLayer=window.dataLayer||[];
  //         function gtag(){dataLayer.push(arguments);} window.gtag=gtag;
  //         gtag('js',new Date()); gtag('config','G-XXXXXXXXXX');
  //       };
  //       if('requestIdleCallback' in window) requestIdleCallback(load,{timeout:4000});
  //       else setTimeout(load,3000);
  //     })();`
  //   }
  // ],
  script: [
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
          "price": "1500.00",
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
        "@type": "Organization",
        "name": "Viewora",
        "url": "https://viewora.software",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Juja",
          "addressRegion": "Kiambu County",
          "addressCountry": "KE"
        }
      })
    }
  ]
})

useSchemaOrg([
  defineOrganization({
    name: 'Viewora',
    logo: '/images/viewora-logo.png',
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
