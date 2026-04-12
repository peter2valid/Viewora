<template>
  <section class="relative isolate overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050505] shadow-2xl shadow-black/40">
    <div class="absolute inset-0">
      <img
        :src="heroImage"
        class="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-45"
        alt=""
        aria-hidden="true"
      />

      <ClientOnly v-if="hasImmersiveTour && !viewerError">
        <AppPannellumViewer
          :key="viewerKey"
          :panorama-url="panorama.public_url"
          :auto-rotate="settings?.auto_rotate_enabled"
          :hfov="settings?.hfov_default"
          :pitch="settings?.pitch_default"
          :yaw="settings?.yaw_default"
          @loaded="handleViewerLoaded"
          @error="handleViewerError"
        />
      </ClientOnly>

      <img
        v-else
        :src="heroImage"
        class="absolute inset-0 h-full w-full object-cover"
        :alt="space.title"
      />

      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/[0.35] to-black/[0.15]"></div>
      <div class="absolute inset-x-0 top-0 h-px bg-white/[0.15]"></div>

      <div
        v-if="hasImmersiveTour && !viewerReady && !viewerError"
        class="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/10"
      >
        <div class="h-full w-1/2 animate-pulse bg-emerald-400/80"></div>
      </div>

      <div
        v-if="viewerError"
        class="absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-4"
      >
        <div class="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-100 backdrop-blur-xl">
          Interactive view unavailable - showing a static preview.
        </div>
      </div>
    </div>

    <div class="relative flex min-h-[72svh] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 md:px-8 md:pt-8">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/10">
            <div class="h-3.5 w-3.5 rounded-full bg-emerald-400"></div>
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.35em] text-white/[0.45]">Viewora tour</p>
            <p class="mt-1 text-sm font-semibold text-white/80">
              {{ space.profiles?.agency_name || 'Immersive tour' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/[0.12]"
            @click="copyLink"
          >
            Copy link
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-zinc-950 transition hover:bg-emerald-300"
            @click="openShareSheet"
          >
            Share tour
          </button>
        </div>
      </header>

      <div class="mt-auto grid gap-6 px-5 pb-5 pt-10 md:px-8 md:pb-8 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <div class="max-w-3xl space-y-6">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/75 backdrop-blur-md">
              {{ heroLabel }}
            </span>
            <span
              v-if="space.location_text"
              class="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/[0.65] backdrop-blur-md"
            >
              {{ space.location_text }}
            </span>
          </div>

          <div class="space-y-4">
            <h1 class="max-w-4xl text-4xl font-black tracking-tighter text-white drop-shadow-2xl sm:text-5xl lg:text-7xl">
              {{ space.title }}
            </h1>
            <p class="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {{ space.description || 'Open the space, move around, and share the tour with anyone who needs the experience.' }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <a
              href="#details"
              class="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-zinc-100"
            >
              Explore details
            </a>
            <a
              v-if="space.lead_form_enabled"
              href="#inquiry-form"
              class="inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/[0.12]"
            >
              Request access
            </a>
            <button
              class="inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/[0.12]"
              @click="copyEmbedCode"
            >
              Copy embed
            </button>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Experience</p>
              <p class="mt-3 text-sm font-semibold text-white/90">{{ hasImmersiveTour ? '360 tour ready' : 'Photo experience' }}</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Curated media</p>
              <p class="mt-3 text-sm font-semibold text-white/90">{{ galleryCount }} selected images</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Branding</p>
              <p class="mt-3 text-sm font-semibold text-white/90">{{ space.branding_enabled ? 'Agency watermark active' : 'Viewora watermark active' }}</p>
            </div>
          </div>
        </div>

        <aside class="space-y-4 self-end lg:self-auto">
          <div class="rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
            <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/[0.35]">Live tour</p>
            <div class="mt-3 flex items-center gap-3">
              <div class="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.7)]"></div>
              <p class="text-sm font-semibold text-white/90">
                {{ hasImmersiveTour ? 'Interactive experience available' : 'Static preview only' }}
              </p>
            </div>

            <div class="mt-5 space-y-3 text-sm text-white/[0.65]">
              <p v-if="space.location_text">Location: {{ space.location_text }}</p>
              <p v-if="panorama?.width && panorama?.height">Panorama: {{ panorama.width }} x {{ panorama.height }}</p>
              <p v-if="heroLabel">Status: {{ heroLabel }}</p>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <button
                class="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-zinc-950 transition hover:bg-emerald-300"
                @click="shareTour"
              >
                Share now
              </button>
              <a
                v-if="space.lead_form_enabled"
                href="#inquiry-form"
                class="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/[0.85] backdrop-blur-md transition hover:bg-white/[0.12]"
              >
                Inquire
              </a>
            </div>
          </div>

          <div v-if="viewerError" class="rounded-[2rem] border border-amber-400/20 bg-amber-400/10 p-5 text-amber-50 backdrop-blur-xl">
            <p class="text-sm font-semibold">The interactive viewer could not initialize.</p>
            <p class="mt-2 text-sm text-amber-100/80">The page will keep the static preview visible while you retry.</p>
            <button
              class="mt-4 rounded-full bg-white px-4 py-2 text-xs font-black text-zinc-950 transition hover:bg-zinc-100"
              @click="retryViewer"
            >
              Retry viewer
            </button>
          </div>
        </aside>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade-smooth">
        <div v-if="shareSheetOpen" class="fixed inset-0 z-[120] flex items-end justify-center p-4 md:items-center">
          <button class="absolute inset-0 bg-black/75 backdrop-blur-xl" @click="shareSheetOpen = false"></button>

          <div class="relative z-10 w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#0d0d0d] p-5 text-white shadow-2xl md:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">Share tour</p>
                <h2 class="mt-2 text-2xl font-black tracking-tight">Send the experience to someone</h2>
              </div>
              <button class="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80" @click="shareSheetOpen = false">
                Close
              </button>
            </div>

            <div class="mt-6 space-y-5">
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-[0.3em] text-white/[0.35]">Direct link</label>
                <div class="flex gap-2">
                  <input :value="shareUrl" readonly class="flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80 outline-none" />
                  <button class="rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-950" @click="copyLink">Copy</button>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <button class="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold text-white/[0.85]" @click="shareVia('whatsapp')">
                  Share via WhatsApp
                </button>
                <button class="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold text-white/[0.85]" @click="shareVia('x')">
                  Share via X
                </button>
                <button class="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold text-white/[0.85]" @click="shareVia('email')">
                  Share via email
                </button>
                <button class="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm font-semibold text-white/[0.85]" @click="copyEmbedCode">
                  Copy embed iframe
                </button>
              </div>

              <div class="rounded-3xl border border-white/10 bg-black/30 p-4">
                <p class="text-[10px] font-black uppercase tracking-[0.3em] text-white/[0.35]">Embed code</p>
                <textarea readonly :value="embedCode" class="mt-3 h-28 w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-[11px] leading-5 text-white/75 outline-none"></textarea>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade-smooth">
        <div
          v-if="toast"
          class="fixed bottom-6 right-6 z-[130] max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl"
          :class="toast.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-50' : 'border-rose-400/20 bg-rose-400/10 text-rose-50'"
        >
          <p class="text-sm font-semibold">{{ toast.message }}</p>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  space: any
  panorama: any
  settings?: any
  shareUrl: string
  embedUrl: string
  galleryCount?: number
}>()

const viewerKey = ref(0)
const viewerReady = ref(false)
const viewerError = ref('')
const shareSheetOpen = ref(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const hasImmersiveTour = computed(() => Boolean(props.space?.has_360 && props.panorama))
const heroImage = computed(() => props.panorama?.public_url || props.space?.cover_image_url || '/images/home/plain land.png')
const heroLabel = computed(() => (hasImmersiveTour.value ? 'Interactive 360 experience' : 'Static property preview'))
const embedCode = computed(() => {
  return `<iframe src="${props.embedUrl}" width="100%" height="600" frameborder="0" allow="accelerometer; autoplay; gyroscope; fullscreen" loading="lazy" allowfullscreen></iframe>`
})

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2500)
}

function handleViewerLoaded() {
  viewerReady.value = true
  viewerError.value = ''
}

function handleViewerError(error: unknown) {
  viewerReady.value = false
  viewerError.value = error instanceof Error ? error.message : 'The 360 viewer failed to load.'
}

function retryViewer() {
  viewerReady.value = false
  viewerError.value = ''
  viewerKey.value += 1
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('Copied to clipboard')
  } catch {
    showToast('Copy failed', 'error')
  }
}

function openShareSheet() {
  shareSheetOpen.value = true
}

function copyLink() {
  return copyToClipboard(props.shareUrl)
}

function copyEmbedCode() {
  return copyToClipboard(embedCode.value)
}

function shareVia(channel: 'whatsapp' | 'x' | 'email') {
  const title = props.space?.title || 'Viewora tour'
  const text = `${title} - ${props.shareUrl}`
  const urls = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`,
  }

  window.open(urls[channel], '_blank', 'noopener,noreferrer')
}

async function shareTour() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: props.space?.title || 'Viewora tour',
        text: props.space?.description || 'Open this immersive Viewora tour.',
        url: props.shareUrl,
      })
      showToast('Share sheet opened')
      return
    } catch {
      // Ignore user cancellation and fall back to the custom sheet.
    }
  }

  openShareSheet()
}
</script>