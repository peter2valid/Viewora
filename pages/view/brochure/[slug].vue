<template>
  <div class="brochure">
    <div v-if="pending" class="brochure__state">Loading…</div>
    <div v-else-if="!space" class="brochure__state">
      <p>This listing isn't available.</p>
      <NuxtLink to="/view">Back to listings</NuxtLink>
    </div>

    <template v-else>
      <div class="brochure__toolbar no-print">
        <NuxtLink :to="`/view/p/${slug}`" class="brochure__back">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to tour
        </NuxtLink>
        <button class="brochure__print-btn" @click="printPage">Print / Save as PDF</button>
      </div>

      <div class="brochure__sheet">
        <header class="brochure__header">
          <div class="brochure__brand">Viewora</div>
          <span class="brochure__status">{{ statusLabel }}</span>
        </header>

        <div v-if="heroImage" class="brochure__hero">
          <img :src="heroImage" :alt="space.title" />
        </div>

        <div class="brochure__title-row">
          <div>
            <h1 class="brochure__title">{{ space.title }}</h1>
            <p v-if="space.location_text" class="brochure__location">{{ space.location_text }}</p>
          </div>
          <p class="brochure__price">{{ priceText }}</p>
        </div>

        <div v-if="keyFacts.length" class="brochure__facts">
          <div v-for="f in keyFacts" :key="f.label" class="brochure__fact">
            <b>{{ f.value }}</b>
            <span>{{ f.label }}</span>
          </div>
        </div>

        <template v-if="space.amenities && space.amenities.length">
          <h2 class="brochure__heading">Features &amp; Amenities</h2>
          <p class="brochure__amenities">{{ space.amenities.join(' · ') }}</p>
        </template>

        <template v-if="space.description">
          <h2 class="brochure__heading">About</h2>
          <p class="brochure__desc">{{ space.description }}</p>
        </template>

        <template v-if="photos.length">
          <h2 class="brochure__heading">{{ isPanorama ? 'Rooms' : 'Photos' }}</h2>
          <div class="brochure__photogrid">
            <div v-for="p in photos" :key="p.id" class="brochure__photo">
              <img :src="p.thumbnail_url" :alt="p.name" loading="lazy" />
              <span>{{ p.name }}</span>
            </div>
          </div>
        </template>

        <footer class="brochure__contact">
          <h2 class="brochure__heading">Contact</h2>
          <p v-if="space.phone">WhatsApp: +{{ space.phone }}</p>
          <p class="brochure__contact-link">{{ fullTourUrl }}</p>
        </footer>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { computed } from 'vue'
import { useAsyncData, useRoute, useRequestURL, useSeoMeta, createError } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { formatPrice, factsLine } from '~/utils/listingDisplay'

const { apiFetch } = useApiFetch()
const route = useRoute()
const requestURL = useRequestURL()
const slug = route.params.slug as string
function printPage() {
  if (typeof window !== 'undefined') window.print()
}

const { data: tourPayload, pending } = await useAsyncData(
  `brochure-tour:${slug}`,
  () => apiFetch<any>(`/p/${encodeURIComponent(slug)}`).catch(() => null),
  { server: true, lazy: false },
)

const space = computed(() => tourPayload.value?.tour?.space ?? null)
const rooms = computed(() => (tourPayload.value?.tour?.scenes ?? [])
  .filter((s: any) => s.thumbnail_url)
  .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
  .map((s: any) => ({ id: s.id, name: s.name || 'Room', thumbnail_url: s.thumbnail_url })))
const galleryPhotos = computed(() => (tourPayload.value?.tour?.gallery ?? [])
  .map((g: any, i: number) => ({ id: g.id, name: `Photo ${i + 1}`, thumbnail_url: g.url })))
const isPanorama = computed(() => rooms.value.length > 0)
const photos = computed(() => (isPanorama.value ? rooms.value : galleryPhotos.value))
const heroImage = computed(() => photos.value[0]?.thumbnail_url || space.value?.cover_image_url || null)

const priceText = computed(() => formatPrice(space.value?.price_kes))
const STATUS_LABELS: Record<string, string> = { available: 'Available', sold: 'Sold', rented: 'Rented' }
const statusLabel = computed(() => STATUS_LABELS[space.value?.listing_status] || 'Available')
// useRequestURL() reads from the incoming request on the server and from
// window.location on the client, giving the same value both times — a
// typeof-window branch here rendered a relative path during SSR and an
// absolute one after hydration, a real SSR/client text mismatch (caught via
// Playwright: "Hydration completed but contains mismatches", which appears
// to have cascaded into the room thumbnails failing to load at all).
const fullTourUrl = computed(() => `${requestURL.origin}/view/p/${slug}`)

const keyFacts = computed(() => {
  const s = space.value
  if (!s) return []
  if (s.space_type === 'residential') {
    const out = []
    if (s.bedrooms) out.push({ value: String(s.bedrooms), label: 'Bedrooms' })
    if (s.bathrooms) out.push({ value: String(s.bathrooms), label: 'Bathrooms' })
    if (s.area_sqm) out.push({ value: `${s.area_sqm} m²`, label: 'Floor Area' })
    return out
  }
  if (s.space_type === 'automotive') {
    const out = []
    if (s.vehicle_year) out.push({ value: String(s.vehicle_year), label: 'Year' })
    if (s.vehicle_mileage_km != null) out.push({ value: `${s.vehicle_mileage_km.toLocaleString('en-KE')} km`, label: 'Mileage' })
    if (s.vehicle_transmission) out.push({ value: s.vehicle_transmission[0].toUpperCase() + s.vehicle_transmission.slice(1), label: 'Transmission' })
    if (s.vehicle_fuel_type) out.push({ value: s.vehicle_fuel_type[0].toUpperCase() + s.vehicle_fuel_type.slice(1), label: 'Fuel' })
    return out
  }
  if (s.area_sqm) return [{ value: `${s.area_sqm} m²`, label: 'Floor Area' }]
  return []
})

if (!pending.value && !space.value) {
  throw createError({ statusCode: 404, statusMessage: 'Listing not found', fatal: true })
}

useSeoMeta({
  title: computed(() => space.value ? `${space.value.title} — Brochure` : 'Brochure — Viewora'),
})
</script>

<style scoped>
.brochure {
  min-height: 100vh;
  background: #f1f1ef;
  color: #16181b;
  font-family: 'Georgia', 'Times New Roman', serif;
  padding: 24px 16px 60px;
}
.brochure__state { max-width: 600px; margin: 80px auto; text-align: center; font-family: -apple-system, sans-serif; }

.brochure__toolbar {
  max-width: 780px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: space-between;
  font-family: -apple-system, sans-serif;
}
.brochure__back {
  display: inline-flex; align-items: center; gap: 6px;
  color: #16181b; text-decoration: none; font-size: 0.85rem; font-weight: 600;
}
.brochure__print-btn {
  padding: 10px 16px; border-radius: 8px; border: none;
  background: #16181b; color: #fff; font-weight: 700; font-size: 0.85rem; cursor: pointer;
}

.brochure__sheet {
  max-width: 780px; margin: 0 auto;
  background: #fff; border: 1px solid #dcdcd8;
  padding: 48px;
}
.brochure__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.brochure__brand { font-family: -apple-system, sans-serif; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.85rem; }
.brochure__status {
  font-family: -apple-system, sans-serif; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 4px 10px; border: 1px solid #16181b; border-radius: 999px;
}
.brochure__hero { width: 100%; aspect-ratio: 16/9; overflow: hidden; margin-bottom: 24px; background: #eee; }
.brochure__hero img { width: 100%; height: 100%; object-fit: cover; display: block; }

.brochure__title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.brochure__title { font-size: 1.6rem; margin: 0 0 4px; }
.brochure__location { margin: 0; color: #555; font-family: -apple-system, sans-serif; font-size: 0.9rem; }
.brochure__price { font-family: -apple-system, sans-serif; font-size: 1.3rem; font-weight: 700; white-space: nowrap; margin: 0; }

.brochure__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 28px; }
.brochure__fact { border: 1px solid #dcdcd8; padding: 12px; font-family: -apple-system, sans-serif; }
.brochure__fact b { display: block; font-size: 1.05rem; }
.brochure__fact span { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #777; }

.brochure__heading {
  font-family: -apple-system, sans-serif; font-size: 0.75rem; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.08em; color: #555;
  margin: 28px 0 10px; border-bottom: 1px solid #dcdcd8; padding-bottom: 6px;
}
.brochure__amenities, .brochure__desc { font-size: 0.95rem; line-height: 1.6; margin: 0; }

.brochure__photogrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.brochure__photo img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; background: #eee; }
.brochure__photo span { display: block; font-family: -apple-system, sans-serif; font-size: 0.72rem; margin-top: 4px; color: #555; }

.brochure__contact { margin-top: 28px; font-family: -apple-system, sans-serif; }
.brochure__contact p { margin: 0 0 4px; font-size: 0.9rem; }
.brochure__contact-link { color: #555; word-break: break-all; }

@media print {
  .no-print { display: none !important; }
  .brochure { background: #fff; padding: 0; }
  .brochure__sheet { border: none; padding: 0; max-width: none; }
  .brochure__photogrid { grid-template-columns: repeat(3, 1fr); }
}
</style>
