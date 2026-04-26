<template>
  <div class="h-full">

    <!-- Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-zinc-950">Capture Service</h1>
        </div>
        <p class="text-sm text-zinc-500">Professional 360° photography and gallery shots for your spaces.</p>
      </div>

      <!-- Plan shoot allowance badge -->
      <div class="flex-shrink-0">
        <div v-if="shootsIncluded > 0" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-sm font-semibold text-emerald-800">{{ shootsIncluded }} shoot{{ shootsIncluded > 1 ? 's' : '' }} / month on your plan</span>
        </div>
        <NuxtLink v-else to="/app/billing" class="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          Upgrade to unlock
        </NuxtLink>
      </div>
    </header>

    <!-- How it works (always visible) -->
    <section class="mb-8">
      <h2 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">How it works</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div class="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center mb-3 text-zinc-900 font-bold text-sm">1</div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">Request a shoot</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">Fill in your space details, location, and preferred date. We'll confirm availability within 24 hours.</p>
        </div>
        <div class="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div class="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center mb-3 text-zinc-900 font-bold text-sm">2</div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">We dispatch a pro</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">A certified photographer arrives with 360° and DSLR equipment. No setup required on your end.</p>
        </div>
        <div class="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <div class="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center mb-3 text-zinc-900 font-bold text-sm">3</div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">Assets delivered</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">Edited 360° panorama and gallery images are uploaded directly to your space within 48 hours.</p>
        </div>
      </div>
    </section>

    <!-- Request form (if plan has shoots) or Upgrade prompt -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      <!-- Request Form -->
      <section class="lg:col-span-7 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-zinc-100">
          <h3 class="text-base font-semibold text-zinc-900">Schedule a Capture</h3>
          <p class="text-sm text-zinc-500 mt-0.5">Our team will confirm your booking within 24 hours.</p>
        </div>

        <div v-if="requestSent" class="p-12 flex flex-col items-center text-center">
          <div class="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 class="text-base font-semibold text-zinc-900 mb-1">Request received!</h3>
          <p class="text-sm text-zinc-500 max-w-xs">Our team will contact you at <span class="font-medium text-zinc-700">{{ requestForm.email }}</span> within 24 hours to confirm your booking.</p>
          <button class="mt-6 px-4 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors" @click="requestSent = false; resetForm()">Submit another request</button>
        </div>

        <form v-else @submit.prevent="handleRequest" class="p-6 space-y-5">
          <div v-if="!shootsIncluded" class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" class="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <p class="text-xs font-semibold text-zinc-700">Capture not included in your current plan</p>
              <p class="text-xs text-zinc-500 mt-0.5">Upgrade to Plus or higher to unlock monthly capture credits. Or submit a request below to discuss a one-off shoot.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-zinc-700">Contact Name <span class="text-rose-500">*</span></label>
              <input v-model="requestForm.name" type="text" required placeholder="Your full name" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-zinc-700">Email <span class="text-rose-500">*</span></label>
              <input v-model="requestForm.email" type="email" required placeholder="you@agency.com" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-zinc-700">Phone Number</label>
              <input v-model="requestForm.phone" type="tel" placeholder="+254 700 000 000" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-zinc-700">Preferred Date</label>
              <input v-model="requestForm.preferredDate" type="date" :min="minDate" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700">Space / Property Address <span class="text-rose-500">*</span></label>
            <input v-model="requestForm.address" type="text" required placeholder="e.g. 14 Karen Road, Nairobi" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700">Space Name / Reference</label>
            <input v-model="requestForm.spaceName" type="text" placeholder="e.g. Modern Westlands Apartment" class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-zinc-700">Additional Notes</label>
            <textarea v-model="requestForm.notes" rows="3" placeholder="Access instructions, specific rooms to capture, etc." class="px-3 py-2 bg-white border border-zinc-200 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 rounded-md text-sm outline-none shadow-sm resize-none"></textarea>
          </div>

          <div class="flex justify-end pt-2">
            <button type="submit" :disabled="submitting" class="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm">
              <div v-if="submitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {{ submitting ? 'Sending...' : 'Submit Request' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Sidebar: What's included + FAQ -->
      <div class="lg:col-span-5 space-y-6">

        <!-- What's included -->
        <section class="bg-zinc-950 rounded-xl p-6 text-white">
          <h3 class="text-sm font-semibold text-zinc-300 mb-4">What's included in every shoot</h3>
          <ul class="space-y-3">
            <li v-for="item in included" :key="item" class="flex items-start gap-3 text-sm text-zinc-400">
              <svg class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ item }}
            </li>
          </ul>
        </section>

        <!-- FAQ -->
        <section class="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <h3 class="text-sm font-semibold text-zinc-900 mb-4">Common questions</h3>
          <div class="space-y-4">
            <div v-for="faq in faqs" :key="faq.q">
              <p class="text-sm font-medium text-zinc-900">{{ faq.q }}</p>
              <p class="text-xs text-zinc-500 mt-1 leading-relaxed">{{ faq.a }}</p>
            </div>
          </div>
        </section>

      </div>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" :class="['fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold whitespace-nowrap', toast.type === 'success' ? 'bg-zinc-950 text-white' : 'bg-red-600 text-white']">
          <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/20 text-white'">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Capture | Viewora' })

const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

// ── Shoot allowance based on plan name ─────────────────────────────────────
const SHOOT_ALLOWANCES: Record<string, number> = {
  Free: 0,
  Starter: 0,
  Plus: 1,
  Pro: 2,
  Elite: 4,
}
const shootsIncluded = computed(() => SHOOT_ALLOWANCES[planStore.plan?.name ?? 'Free'] ?? 0)

// ── Form ───────────────────────────────────────────────────────────────────
const submitting = ref(false)
const requestSent = ref(false)
const requestForm = ref({ name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '' })

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
})

function resetForm() {
  requestForm.value = { name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '' }
}

// ── Toast ──────────────────────────────────────────────────────────────────
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3200)
}

async function handleRequest() {
  submitting.value = true
  try {
    await apiFetch('/capture/request', {
      method: 'POST',
      body: { ...requestForm.value, planName: planStore.plan?.name }
    })
    requestSent.value = true
    showToast('Capture request sent successfully.', 'success')
  } catch (err: any) {
    const msg = err?.data?.statusMessage || err?.message || 'Could not send request right now. Please try again.'
    showToast(msg, 'error')
  } finally {
    submitting.value = false
  }
}

// ── Static content ─────────────────────────────────────────────────────────
const included = [
  'Full 360° equirectangular panorama (min. 100MP output)',
  'Up to 20 high-res gallery photos, edited',
  'Automatic upload to your Viewora space',
  'Same-day edit turnaround for urgent listings',
  'Location scouting advice from our photographer',
]

const faqs = [
  {
    q: 'How far in advance should I book?',
    a: 'We recommend 48–72 hours notice. For same-day shoots, contact us directly at hello@viewora.software.',
  },
  {
    q: 'Which cities do you cover?',
    a: 'Currently available in Nairobi, Mombasa, and Kisumu. Expanding to more regions soon.',
  },
  {
    q: 'What if I need to reschedule?',
    a: 'Cancel or reschedule up to 24 hours before the shoot at no charge. Late cancellations may use a credit.',
  },
  {
    q: 'What if my plan has no shoots included?',
    a: 'You can still request a one-off shoot billed separately, or upgrade your plan to include monthly credits.',
  },
]
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
