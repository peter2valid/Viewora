<template>
  <!-- Section highlighting a few example use cases for AR Codes -->
  <section class="features">
    <div class="container">
      <h2 class="section-title">Add Augmented Reality experiences anywhere</h2>
      <p class="section-description">
        AR Code technology has the potential to enhance a wide variety of
        products and materials. By using AR QR Codes, businesses and
        organizations can easily add interactive, digital experiences to
        these materials, making them more engaging and informative for
        users.
      </p>
      <div class="grid">
        <!-- Feature 1 -->
        <div class="feature-item">
          <NuxtImg
            src="https://ar-code.com/images/product-packaging.webp"
            alt="Product Packaging"
            width="400"
            format="webp"
            loading="lazy"
          />
          <h3>Product Packaging</h3>
          <p>
            Integrate AR Codes on packaging for immersive AR experiences,
            easily scanned on Android and iOS devices.
          </p>
        </div>
        <!-- Feature 2 -->
        <div class="feature-item">
          <NuxtImg
            src="https://ar-code.com/images/food-packaging.webp"
            alt="Beverage Packaging"
            width="400"
            format="webp"
            loading="lazy"
          />
          <h3>Beverage Packaging</h3>
          <p>
            Employ AR QR Codes on drink packaging for immersive AR
            experiences, boosting brand engagement.
          </p>
        </div>
        <!-- Feature 3 -->
        <div class="feature-item">
          <NuxtImg
            src="https://ar-code.com/images/banners-posters.webp"
            alt="Event Banners &amp; Posters"
            width="400"
            format="webp"
            loading="lazy"
          />
          <h3>Event Banners &amp; Posters</h3>
          <p>
            Incorporate AR Codes on signage for interactive content such
            as product demos and event schedules.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Presentational component: no script logic is necessary here
</script>

<!-- Feature styling is defined in the global stylesheet -->