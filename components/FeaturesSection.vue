<template>
  <section class="section section-bg">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Built for Any Space or Environment</h2>
        <p class="section-subtitle">From real estate to luxury resorts and car showrooms — Viewora grows with your business.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        <!-- Real Estate -->
        <div class="card text-center">
          <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; aspect-ratio: 4/3;">
            <img src="/images/home/mobile-tours.png" loading="lazy" alt="Real Estate Tours on Mobile" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
          </div>
          <h3 class="mb-3">Real Estate Agents</h3>
          <p class="text-muted">Pre-qualify buyers before the viewing. Let clients explore every room from their phone — saving you time and closing more deals.</p>
          <ul style="text-align: left; margin-top: 1.25rem; list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Unlimited property tours</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Shareable link for listings</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Embed on your website</li>
          </ul>
        </div>

        <!-- Airbnb & Short-Term Rentals -->
        <div class="card text-center" style="border: 2px solid var(--primary);">
          <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--primary); margin-bottom: 0.75rem;">Most Popular</div>
          <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; aspect-ratio: 4/3;">
            <img src="/images/home/dollhouse-commercial.png" loading="lazy" alt="3D Dollhouse View" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
          </div>
          <h3 class="mb-3">Hospitality & Short-Term Rentals</h3>
          <p class="text-muted">Perfect for Airbnb hosts, hotels, resorts, and lodges. Reduce guest queries about layout and boost booking confidence with a virtual walkthrough.</p>
          <ul style="text-align: left; margin-top: 1.25rem; list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Works on any device</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Gyroscope support on mobile</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Instant public link</li>
          </ul>
        </div>

        <!-- Property Developers -->
        <div class="card text-center">
          <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; aspect-ratio: 4/3;">
            <img src="/images/home/floorplan-hotspots.png" loading="lazy" alt="Hotspot Floorplan Navigation" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
          </div>
          <h3 class="mb-3">Architecture & Development</h3>
          <p class="text-muted">Showcase model apartments, event venues, schools, and off-plan projects to global audiences before they even visit.</p>
          <ul style="text-align: left; margin-top: 1.25rem; list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Custom branding & white-label</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> 8K high-resolution support</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Multi-unit project management</li>
          </ul>
        </div>

        <!-- Car Dealerships -->
        <div class="card text-center">
          <div style="background: var(--paper-dim); padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; aspect-ratio: 4/3;">
            <img src="/images/home/hardware-setup.png" loading="lazy" alt="Car Dealership 360 View" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 0.25rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));" />
          </div>
          <h3 class="mb-3">Car Dealerships</h3>
          <p class="text-muted">Put buyers behind the wheel from anywhere. Showcase interior and exterior 360° views to drive higher engagement and foot traffic.</p>
          <ul style="text-align: left; margin-top: 1.25rem; list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> High-res interior views</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Exterior walkarounds</li>
            <li style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.9rem;"><span style="color: var(--primary);">✓</span> Embed in online showrooms</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Presentational component
</script>