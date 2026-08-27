<template>
  <div class="seller-card">
    <div class="seller-card__top">
      <img v-if="avatarUrl" :src="avatarUrl" class="seller-card__avatar" :alt="sellerName" referrerpolicy="no-referrer" />
      <div v-else class="seller-card__avatar seller-card__avatar--fallback">{{ initial }}</div>

      <div class="seller-card__body">
        <p class="seller-card__name">{{ sellerName }}</p>
        <NuxtLink v-if="sellerId" :to="`/view/seller/${sellerId}`" class="seller-card__viewall">View All Properties</NuxtLink>

        <NuxtLink v-if="companyName && sellerId" :to="`/view/seller/${sellerId}`" class="seller-card__company">
          {{ companyName }}
          <svg class="seller-card__chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </NuxtLink>
        <p v-else-if="companyName" class="seller-card__company seller-card__company--static">{{ companyName }}</p>
      </div>
    </div>

    <div v-if="phone" class="seller-card__actions">
      <a class="seller-card__btn" :href="`tel:+${telDigits}`" @click="$emit('call-click')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        Call
      </a>
      <a class="seller-card__btn seller-card__btn--whatsapp" :href="whatsappHref" target="_blank" rel="noopener" @click="$emit('whatsapp-click')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2m0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.18 8.18 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.27-8.24 8.27m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28" /></svg>
        WhatsApp
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sellerId: string | null
  sellerName: string
  avatarUrl: string | null
  companyName?: string | null
  phone: string | null
  whatsappMessage: string
}>()

defineEmits<{ 'call-click': []; 'whatsapp-click': [] }>()

const initial = computed(() => (props.sellerName || '?').charAt(0).toUpperCase())
const telDigits = computed(() => (props.phone || '').replace(/[^0-9]/g, ''))
const whatsappHref = computed(() => `https://wa.me/${telDigits.value}?text=${encodeURIComponent(props.whatsappMessage)}`)
</script>

<style scoped>
.seller-card {
  display: flex; flex-direction: column; gap: 14px;
  padding: 14px; border-radius: var(--vo-radius-lg);
  background: var(--vo-elevated); border: 1px solid var(--vo-border);
  box-shadow: var(--vo-shadow-sm);
}
.seller-card__top { display: flex; align-items: flex-start; gap: 12px; }

.seller-card__avatar {
  width: 56px; height: 56px; border-radius: var(--vo-radius-md); object-fit: cover;
  flex: 0 0 auto; border: 1px solid var(--vo-border);
}
.seller-card__avatar--fallback {
  display: flex; align-items: center; justify-content: center;
  background: var(--vo-text); color: var(--vo-inverse); font-weight: 800; font-size: 1.1rem;
}

.seller-card__body { min-width: 0; padding-top: 1px; }
.seller-card__name { font-weight: 800; font-size: 0.94rem; margin: 0 0 3px; letter-spacing: -0.01em; }
.seller-card__viewall {
  display: block; font-size: 0.8rem; font-weight: 700; color: #3b82f6;
  text-decoration: none; margin-bottom: 4px;
}
.seller-card__viewall:hover { text-decoration: underline; }
.seller-card__company {
  display: inline-flex; align-items: center; gap: 2px;
  font-size: 0.8rem; color: var(--vo-secondary); text-decoration: none; line-height: 1.25;
}
.seller-card__company--static { color: var(--vo-secondary); }
.seller-card__chevron { flex: 0 0 auto; color: var(--vo-muted); margin-left: 1px; }

.seller-card__actions { display: flex; gap: 8px; }
.seller-card__btn {
  flex: 1 1 0; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 42px; border-radius: var(--vo-radius-pill); font-weight: 700; font-size: 0.85rem;
  text-decoration: none; cursor: pointer; border: 1px solid var(--vo-border-strong);
  background: var(--vo-surface); color: var(--vo-text); transition: filter 180ms ease;
}
.seller-card__btn--whatsapp { background: var(--whatsapp, #25D366); color: var(--whatsapp-ink, #06210F); border-color: transparent; }
.seller-card__btn:hover { filter: brightness(0.94); }
</style>
