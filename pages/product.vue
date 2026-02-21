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
          <div style="order: 1;" :style="{ order: isDesktop ? 1 : 2 }">
            <h2 class="mb-4" style="font-size: 2rem;">1. Upload 360° Panoramas</h2>
            <p class="text-muted text-lg">
              Take photos with any 360° camera (Insta360, Ricoh Theta, GoPro MAX) or even a smartphone panorama app. 
              Upload them directly to your Viewora dashboard. Our system automatically processes high-resolution files 
              to ensure fast loading times on any device.
            </p>
          </div>
          <div style="order: 2;" :style="{ order: isDesktop ? 2 : 1 }">
            <div class="card" style="background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; min-height: 250px; padding: 2rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="grid-2 mb-12" style="align-items: center;">
          <div style="order: 1;">
            <div class="card" style="background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; min-height: 250px; padding: 2rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
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
          <div style="order: 1;" :style="{ order: isDesktop ? 1 : 2 }">
            <h2 class="mb-4" style="font-size: 2rem;">3. Publish Virtual Tour</h2>
            <p class="text-muted text-lg">
              Once your connections are set, click "Publish". Viewora instantly generates an optimized version of your tour. 
              The tour is hosted on our secure, lightning-fast servers, so you don't need to worry about hosting or bandwidth.
            </p>
          </div>
          <div style="order: 2;" :style="{ order: isDesktop ? 2 : 1 }">
            <div class="card" style="background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; min-height: 250px; padding: 2rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="grid-2" style="align-items: center;">
          <div style="order: 1;">
            <div class="card" style="background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; min-height: 250px; padding: 2rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
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
import { ref, onMounted } from 'vue';

const isDesktop = ref(true);

onMounted(() => {
  const checkWidth = () => {
    isDesktop.value = window.innerWidth >= 768;
  };
  checkWidth();
  window.addEventListener('resize', checkWidth);
});

useSeoMeta({
  title: 'How Viewora Works | 360° Panorama Software for Real Estate',
  description: 'See how easy it is to upload panoramas, connect rooms, and publish stunning interactive property tours without any coding skills.'
})
</script>
