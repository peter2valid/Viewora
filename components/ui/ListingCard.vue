<template>
  <NuxtLink :to="`/view/p/${listing.slug || listing.id}`" class="card">
    <div class="card__media">
      <img v-if="listing.hero_image" :src="listing.hero_image" :alt="listing.title" loading="lazy" />
      <div v-else class="card__media-placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>
      </div>
      <span v-if="listing.has_360" class="card__badge">360°</span>
    </div>

    <div class="card__body">
      <p class="card__price">{{ formatPrice(listing.price_kes, listing.price_period) }}</p>
      <p v-if="factsLine(listing)" class="card__facts">{{ factsLine(listing) }}</p>
      <p v-if="listing.location_text" class="card__location">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>
        {{ listing.location_text }}
      </p>

      <button
        v-if="listing.phone"
        type="button"
        class="card__cta"
        @click.stop.prevent="openWhatsapp"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28"/></svg>
        Chat Owner
      </button>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { formatPrice, factsLine, whatsappUrl, type Listing } from '~/utils/listingDisplay'

const props = defineProps<{ listing: Listing }>()

// The CTA can't be a real <a> nested inside the card's own NuxtLink (an <a>
// inside an <a> is invalid HTML and browsers mangle the click target), so it
// opens the same WhatsApp URL imperatively instead.
function openWhatsapp() {
  const url = whatsappUrl(props.listing.phone, props.listing.title)
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<style scoped>
.card {
  display: block;
  background: var(--sheet);
  border-radius: var(--vo-radius-xl);
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: var(--vo-shadow-sm);
  color: inherit;
  text-decoration: none;
  transition: box-shadow 220ms ease, border-color 220ms ease, transform 220ms ease;
}
.card:hover {
  border-color: var(--vo-border-strong);
  box-shadow: var(--vo-shadow-md);
  transform: translateY(-3px);
}
.card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--sheet-2);
}
.card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 500ms cubic-bezier(.2,.7,.2,1); }
.card:hover .card__media img { transform: scale(1.035); }
.card__media-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint);
}
.card__badge {
  position: absolute; top: 12px; left: 12px;
  background: rgba(7, 7, 7, 0.6);
  backdrop-filter: blur(10px);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.07em;
  font-weight: 500;
  padding: 5px 9px;
  border-radius: var(--vo-radius-pill);
}
.card__body { padding: 18px; }
.card__price {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 1.3rem;
  letter-spacing: -0.01em;
  margin: 0 0 8px;
}
.card__facts {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--ink-soft);
  margin: 0 0 6px;
}
.card__location {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.78rem;
  color: var(--ink-faint);
  margin: 0 0 16px;
}
.card__cta {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--whatsapp);
  color: var(--whatsapp-ink);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.82rem;
  padding: 11px 14px;
  border: none;
  border-radius: var(--vo-radius-md);
  text-decoration: none;
  width: 100%;
  justify-content: center;
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease, transform 120ms ease;
}
.card__cta:hover { background: var(--vo-inverse); color: var(--vo-text); opacity: 1; }
.card__cta:active { transform: scale(0.98); }
</style>
