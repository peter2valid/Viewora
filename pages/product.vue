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
          <div style="order: 1;" :style="{ order: isDesktop ? 1 : 2 }">
            <h2 class="mb-4" style="font-size: 2rem;">3. Publish Virtual Tour</h2>
            <p class="text-muted text-lg">
              Once your connections are set, click "Publish". Viewora instantly generates an optimized version of your tour. 
              The tour is hosted on our secure, lightning-fast servers, so you don't need to worry about hosting or bandwidth.
            </p>
          </div>
          <div style="order: 2;" :style="{ order: isDesktop ? 2 : 1 }">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/tiny-planet-vr.png" loading="lazy" alt="Publish Virtual Tour" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
            </div>
          </div>
        </div>

        <!-- Step 4 -->
        <div class="grid-2" style="align-items: center;">
          <div style="order: 1;">
            <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; min-height: 250px;">
              <img src="/images/home/cross-platform-hero.png" loading="lazy" alt="Share on any device" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.08));" />
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
  title: 'How Viewora Works | Immersive 360° Space Showcase Software',
  description: 'See how easy it is to upload panoramas, connect rooms, and publish stunning interactive 360° tours for any space without any coding skills.'
})
</script>
