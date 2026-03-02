<template>
  <div>
    <section class="section section-bg text-center">
      <div class="container">
        <h1 class="section-title">How Viewora Works</h1>
        <p class="section-subtitle" style="max-width: 600px; margin: 0 auto;">
          Transform your 360° panoramas into fully interactive virtual tours in four simple steps. No technical skills required.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <!-- Step 1 -->
        <div class="grid-2 mb-12" style="align-items: center;">
          <div class="product-text-col">
            <h2 class="mb-4" style="font-size: 2rem;">1. Upload 360° Panoramas</h2>
            <p class="text-muted text-lg">
              Take photos with any 360° camera (Insta360, Ricoh Theta, GoPro MAX) or even a smartphone panorama app. 
              Upload them directly to your Viewora dashboard. Our system automatically processes high-resolution files 
              to ensure fast loading times on any device.
            </p>
          </div>
          <div class="product-img-col">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/hardware-setup.png" loading="lazy" alt="Upload Panoramas" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="grid-2 mb-12" style="align-items: center;">
          <div style="order: 1;">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/white-label-editor.png" loading="lazy" alt="Visual Editor" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
            </div>
          </div>
          <div style="order: 2;">
            <h2 class="mb-4" style="font-size: 2rem;">2. Create Room Connections</h2>
            <p class="text-muted text-lg">
              Use our visual editor to link your rooms together. Simply point and click to add navigation hotspots ("arrows" or "targets"). 
              When a viewer clicks a hotspot, they are seamlessly transported to the next room, creating a walking experience.
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="grid-2 mb-12" style="align-items: center;">
          <div class="product-text-col">
            <h2 class="mb-4" style="font-size: 2rem;">3. Publish Virtual Tour</h2>
            <p class="text-muted text-lg">
              Once your connections are set, click "Publish". Viewora instantly generates an optimized version of your tour. 
              The tour is hosted on our secure, lightning-fast servers, so you don't need to worry about hosting or bandwidth.
            </p>
          </div>
          <div class="product-img-col">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/tiny-planet-vr.png" loading="lazy" alt="Publish Virtual Tour" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="grid-2" style="align-items: center;">
          <div style="order: 1;">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/cross-platform-hero2.png" loading="lazy" alt="Share on any device" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
            </div>
          </div>
          <div style="order: 2;">
            <h2 class="mb-4" style="font-size: 2rem;">4. Share With Clients</h2>
            <p class="text-muted text-lg">
              You will receive a unique, unbranded public link that you can share with potential buyers, renters, or guests. 
              Embed it directly on your own website using our simple iframe code, or paste the link into WhatsApp, email, or your Airbnb listing.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section section-bg text-center">
      <div class="container">
        <h2 class="mb-6" style="font-size: 2rem;">Ready to build your first tour?</h2>
        <NuxtLink to="/register" class="btn btn-primary btn-lg">Start Free Trial</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'How Viewora Works | Immersive 360° Space Showcase Software',
  description: 'See how easy it is to upload panoramas, connect rooms, and publish stunning interactive 360° tours for any space without any coding skills.',
  ogTitle: 'How Viewora Works — 4 Simple Steps to a Virtual Tour',
  ogDescription: 'Upload your 360° photos, link rooms with hotspots, publish and share. No coding, no hardware, no experience needed.',
  ogUrl: 'https://viewora.software/product',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'How Viewora Works',
  twitterDescription: 'Create interactive 360° virtual tours in 4 steps. Upload, connect, publish, share.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://viewora.software/product' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Create a 360° Virtual Tour with Viewora',
      description: 'Create an interactive virtual tour in 4 simple steps using Viewora’s web-based platform.',
      step: [
        { '@type': 'HowToStep', position: 1, name: 'Upload 360° Panoramas', text: 'Take photos with any 360° camera and upload them to your Viewora dashboard.' },
        { '@type': 'HowToStep', position: 2, name: 'Create Room Connections', text: 'Use the visual editor to add hotspot navigation between panoramas.' },
        { '@type': 'HowToStep', position: 3, name: 'Publish Virtual Tour', text: 'Click Publish. Viewora generates an optimized, hosted tour instantly.' },
        { '@type': 'HowToStep', position: 4, name: 'Share With Clients', text: 'Share a unique public link via WhatsApp, email, or embed it on your website.' },
      ]
    })
  }]
})
</script>

<style scoped>
/* On mobile, text should appear before image */
@media (max-width: 767px) {
  .product-text-col { order: 1 !important; }
  .product-img-col  { order: 2 !important; }
}
</style>
