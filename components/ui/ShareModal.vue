<template>
  <Teleport to="body">
    <Transition name="share-modal">
      <div v-if="space" class="share-overlay" @click.self="$emit('close')">
        <div class="share-modal" role="dialog" aria-modal="true" aria-label="Share your tour">
          <div class="share-modal__topbar">
            <h2 class="share-modal__title">Share</h2>
            <button class="share-modal__close" aria-label="Close share dialog" @click="$emit('close')">
              <UiIcon name="close" :size="16" :stroke-width="2.4" />
            </button>
          </div>
          <div class="share-modal__tabs" role="tablist">
            <button
              v-for="tab in shareTabs"
              :key="tab.id"
              type="button"
              class="share-modal__tab"
              :class="{ 'share-modal__tab--active': shareTab === tab.id }"
              role="tab"
              :aria-selected="shareTab === tab.id"
              @click="shareTab = tab.id"
            >{{ tab.label }}</button>
          </div>
          <div class="share-modal__body">
            <div v-if="shareTab === 'link'" class="share-modal__panel" role="tabpanel">
              <p class="share-modal__eyebrow">Link to share</p>
              <div class="share-modal__link-row">
                <span class="share-modal__link">{{ publicUrl }}</span>
                <button class="share-modal__copy" @click="copyShareUrl">
                  <template v-if="urlCopied"><UiIcon name="check" :size="14" :stroke-width="2.8" /> Copied</template>
                  <template v-else>Copy link</template>
                </button>
              </div>
              <div class="share-modal__share-row">
                <a :href="shareWhatsappHref" target="_blank" rel="noopener" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--whatsapp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.49 2 2 6.48 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.98-1.39A9.96 9.96 0 0 0 12.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.8 14.16c-.24.68-1.44 1.32-1.98 1.39-.52.07-1.2.1-1.95-.12-.46-.14-1.05-.33-1.81-.66-3.18-1.38-5.24-4.6-5.39-4.81-.14-.21-1.3-1.73-1.3-3.3s.79-2.34 1.07-2.66c.28-.32.61-.4.82-.4h.58c.19 0 .45-.07.7.53.24.6.82 2.07.89 2.22.07.15.12.33.02.54-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.16-.3.33-.13.63.16.31.71 1.17 1.52 1.9 1.04.92 1.9 1.21 2.22 1.37.31.16.49.14.67-.08.18-.22.77-.9.98-1.2.2-.31.4-.26.67-.16.28.1 1.74.82 2.04.97.3.14.5.22.58.34.08.12.08.74-.17 1.42Z"/></svg></span>
                  <span class="share-modal__share-label">WhatsApp</span>
                </a>
                <a :href="shareXHref" target="_blank" rel="noopener" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--x"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.78 7.72L23.2 22h-6.4l-5-6.58L5.98 22H2.84l7.2-8.2L.8 2h6.55l4.53 5.98L18.9 2Zm-1.12 18h1.72L6.42 3.94H4.58L17.78 20Z"/></svg></span>
                  <span class="share-modal__share-label">X</span>
                </a>
                <a :href="shareGmailHref" class="share-modal__share-item">
                  <span class="share-modal__share-icon share-modal__share-icon--gmail"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6.5h16v11H4z" fill="currentColor" opacity="0.16"/><path d="M4 6.5 12 12 20 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                  <span class="share-modal__share-label">Gmail</span>
                </a>
              </div>
            </div>
            <div v-else-if="shareTab === 'embed'" class="share-modal__panel" role="tabpanel">
              <p class="share-modal__eyebrow">Embed</p>
              <div class="share-modal__link-row share-modal__link-row--code">
                <code class="share-modal__link share-modal__link--code">{{ shareEmbedCode }}</code>
                <button class="share-modal__copy" @click="copyEmbedCode">
                  <template v-if="embedCopied"><UiIcon name="check" :size="14" :stroke-width="2.8" /> Copied</template>
                  <template v-else>Copy iframe</template>
                </button>
              </div>
              <div class="share-modal__preview-card">
                <iframe :src="embedUrl" class="share-modal__preview-frame" title="Tour embed preview" loading="lazy" referrerpolicy="no-referrer" />
              </div>
            </div>
            <div v-else class="share-modal__panel share-modal__panel--qr" role="tabpanel">
              <p class="share-modal__eyebrow">QR code</p>
              <div class="share-modal__qr-card">
                <div class="share-modal__qr-wrap">
                  <img v-if="!qrLoading && qrDataUrl" :src="qrDataUrl" alt="QR code" class="share-modal__qr-image" />
                  <div v-else class="share-modal__qr-placeholder"><span class="share-modal__qr-loading" /></div>
                </div>
                <p class="share-modal__qr-text">Scan to open the tour on any device.</p>
                <p class="share-modal__qr-url">{{ publicUrl }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import QRCode from 'qrcode'
import type { Space } from '~/composables/useSpaces'

const props = defineProps<{ space: Space | null }>()
defineEmits<{ close: [] }>()

const shareTab = ref<'link' | 'embed' | 'qr'>('link')
const urlCopied = ref(false)
const embedCopied = ref(false)
const qrDataUrl = ref('')
const qrLoading = ref(false)
const shareTabs: Array<{ id: 'link' | 'embed' | 'qr'; label: string }> = [
  { id: 'link', label: 'Send a link' },
  { id: 'embed', label: 'Embed' },
  { id: 'qr', label: 'QR code' },
]

const publicUrl = computed(() => {
  if (!props.space) return ''
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/p/${props.space.slug || props.space.id}`
})
const embedUrl = computed(() => {
  if (!props.space) return ''
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/embed/${props.space.slug || props.space.id}`
})
const shareText = computed(() => `Check out this immersive virtual tour created with Viewora: ${publicUrl.value}`)
const shareWhatsappHref = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`)
const shareXHref = computed(() => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}`)
const shareGmailHref = computed(() => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('Viewora virtual tour')}&body=${encodeURIComponent(shareText.value)}`)
const shareEmbedCode = computed(() => `<iframe src="${embedUrl.value}" width="100%" height="600" frameborder="0" allowfullscreen style="border-radius:8px; border:none;"></iframe>`)

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    urlCopied.value = true
    setTimeout(() => { urlCopied.value = false }, 2000)
  } catch {
    toast.error('Could not copy — please copy manually')
  }
}
async function copyEmbedCode() {
  try {
    await navigator.clipboard.writeText(shareEmbedCode.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch {
    toast.error('Could not copy — please copy manually')
  }
}

watch(() => props.space, async (space) => {
  shareTab.value = 'link'
  qrDataUrl.value = ''
  if (!space) return
  qrLoading.value = true
  try {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${space.slug || space.id}`
    qrDataUrl.value = await QRCode.toDataURL(url, {
      width: 192, margin: 2, errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
  } catch {
    qrDataUrl.value = ''
  } finally {
    qrLoading.value = false
  }
})
</script>

<style scoped>
.share-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(60,64,67,.32); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.share-modal { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 8px 24px rgba(60,64,67,.18); color: #202124; overflow: hidden; }
.share-modal__topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; }
.share-modal__title { font-size: 22px; font-weight: 400; color: #202124; }
.share-modal__close { width: 28px; height: 28px; border-radius: 50%; background: transparent; border: none; color: #5f6368; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 120ms; }
.share-modal__close:hover { background: rgba(60,64,67,.08); color: #202124; }
.share-modal__tabs { display: flex; gap: 8px; padding: 0 20px; border-bottom: 1px solid #e8eaed; }
.share-modal__tab { position: relative; padding: 12px 4px 11px; border: none; background: transparent; color: #5f6368; font-size: 14px; font-weight: 500; cursor: pointer; }
.share-modal__tab--active { color: #1a73e8; }
.share-modal__tab--active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: #1a73e8; }
.share-modal__body { padding: 16px 20px 20px; }
.share-modal__panel { display: flex; flex-direction: column; gap: 14px; }
.share-modal__eyebrow { font-size: 13px; font-weight: 500; color: #5f6368; }
.share-modal__link-row { display: flex; align-items: center; gap: 10px; min-height: 44px; border: 1px solid #dadce0; border-radius: 10px; padding: 0 12px; background: #fff; }
.share-modal__link-row--code { align-items: center; padding: 10px 12px; }
.share-modal__link { flex: 1; min-width: 0; font-size: 13px; color: #3c4043; white-space: nowrap; overflow-x: auto; overflow-y: hidden; font-family: ui-monospace, monospace; }
.share-modal__link--code { white-space: nowrap; word-break: normal; }
.share-modal__copy { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid #dadce0; background: #f8f9fa; color: #1a73e8; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 120ms, border-color 120ms; flex-shrink: 0; }
.share-modal__copy:hover { background: #eef3fd; border-color: #c6dafc; }
.share-modal__share-row { display: flex; flex-wrap: wrap; gap: 14px; padding-top: 6px; }
.share-modal__share-item { width: 76px; display: flex; flex-direction: column; align-items: center; gap: 8px; border: none; background: transparent; color: #3c4043; text-decoration: none; cursor: pointer; }
.share-modal__share-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.share-modal__share-icon svg { width: 22px; height: 22px; }
.share-modal__share-icon--whatsapp { color: #25d366; background: rgba(37,211,102,.12); }
.share-modal__share-icon--x { color: #111827; background: #f3f4f6; }
.share-modal__share-icon--gmail { color: #ea4335; background: rgba(234,67,53,.10); }
.share-modal__share-label { font-size: 12px; font-weight: 500; color: #3c4043; }
.share-modal__preview-card { border: 1px solid #dadce0; border-radius: 14px; overflow: hidden; background: #f8f9fa; }
.share-modal__preview-frame { display: block; width: 100%; height: 300px; border: 0; background: #fff; }
.share-modal__panel--qr { align-items: center; }
.share-modal__qr-card { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; border: 1px solid #dadce0; border-radius: 16px; padding: 20px; background: #fff; }
.share-modal__qr-wrap { width: 192px; height: 192px; border-radius: 14px; border: 1px solid #e8eaed; display: flex; align-items: center; justify-content: center; background: #fff; }
.share-modal__qr-image { width: 176px; height: 176px; }
.share-modal__qr-placeholder { width: 176px; height: 176px; display: flex; align-items: center; justify-content: center; }
.share-modal__qr-loading { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #e8eaed; border-top-color: #1a73e8; animation: share-spin 0.8s linear infinite; }
.share-modal__qr-text { font-size: 13px; color: #5f6368; text-align: center; }
.share-modal__qr-url { font-size: 12px; color: #80868b; text-align: center; word-break: break-all; }
@keyframes share-spin { to { transform: rotate(360deg); } }
.share-modal-enter-active, .share-modal-leave-active { transition: opacity 0.2s ease; }
.share-modal-enter-active .share-modal, .share-modal-leave-active .share-modal { transition: transform 0.2s ease, opacity 0.2s ease; }
.share-modal-enter-from { opacity: 0; }
.share-modal-enter-from .share-modal { transform: scale(0.92) translateY(12px); }
.share-modal-leave-to { opacity: 0; }
.share-modal-leave-to .share-modal { transform: scale(0.95) translateY(6px); }
</style>
