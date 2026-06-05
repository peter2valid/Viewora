<template>
  <div class="capture-page">

    <!-- Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-main">Capture</h1>
        <p class="text-sm text-dim font-bold mt-1">Professional 360° photography dispatched to your property.</p>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <div v-if="shootsIncluded > 0" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-xs font-black text-emerald-400 uppercase tracking-widest">{{ shootsIncluded }} free shoot{{ shootsIncluded > 1 ? 's' : '' }} / month</span>
        </div>
        <NuxtLink to="/app/billing" class="btn btn-secondary !text-xs !py-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Upgrade plan
        </NuxtLink>
      </div>
    </header>

    <!-- Department Filter -->
    <section class="mb-8">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="dept in departments"
          :key="dept.id"
          class="dept-pill"
          :class="activeDept === dept.id ? 'dept-pill--active' : ''"
          @click="activeDept = dept.id"
        >
          <span v-html="dept.icon" class="dept-pill__icon" />
          {{ dept.label }}
          <span class="dept-pill__count">{{ dept.id === 'all' ? services.length : services.filter(s => s.dept === dept.id).length }}</span>
        </button>
      </div>
    </section>

    <!-- Service Cards Grid -->
    <section class="mb-12">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <div
          v-for="svc in filteredServices"
          :key="svc.id"
          class="service-card"
          :class="svc.popular ? 'service-card--popular' : ''"
        >
          <!-- Popular badge -->
          <div v-if="svc.popular" class="service-card__badge">Most Popular</div>

          <!-- Icon + name -->
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="service-card__icon-wrap">
              <span v-html="svc.icon" />
            </div>
            <div v-if="shootsIncluded > 0 && svc.planCredit" class="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <svg class="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span class="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Plan Credit</span>
            </div>
          </div>

          <h3 class="text-base font-black text-main tracking-tight mb-1">{{ svc.name }}</h3>
          <p class="text-xs text-dim font-bold leading-relaxed mb-4">{{ svc.desc }}</p>

          <!-- Includes list -->
          <ul class="space-y-1.5 mb-5">
            <li v-for="inc in svc.includes" :key="inc" class="flex items-start gap-2 text-xs text-dim">
              <svg class="w-3 h-3 text-main/50 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              {{ inc }}
            </li>
          </ul>

          <!-- Turnaround -->
          <div class="flex items-center gap-1.5 mb-5 text-[10px] font-black text-dim uppercase tracking-widest">
            <svg class="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Delivery: {{ svc.delivery }}
          </div>

          <!-- Price + Book -->
          <div class="flex items-center justify-between pt-4 border-t border-border mt-auto">
            <div>
              <div class="text-xl font-black text-main tracking-tight">{{ svc.price }}</div>
              <div class="text-[10px] text-dim font-bold uppercase tracking-widest">{{ svc.priceNote }}</div>
            </div>
            <button class="btn btn-primary !py-2 !px-5 !text-xs shadow-lg" @click="openBooking(svc)">
              Book Now
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="mb-12">
      <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.2em] mb-5">How it works</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(step, i) in steps" :key="i" class="bg-card rounded-2xl border border-border p-5 flex gap-4 items-start">
          <div class="flex-shrink-0 w-8 h-8 rounded-xl bg-main/10 border border-main/20 flex items-center justify-center text-sm font-black text-main">{{ i + 1 }}</div>
          <div>
            <p class="text-sm font-black text-main mb-1">{{ step.title }}</p>
            <p class="text-xs text-dim leading-relaxed font-bold">{{ step.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Booking Modal -->
    <Teleport to="body">
      <Transition name="capture-modal">
        <div v-if="bookingService" class="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md" @click.self="bookingService = null">
          <div class="absolute inset-0 bg-zinc-950/50" @click="bookingService = null" />

          <div class="relative w-full sm:max-w-xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">

            <!-- Modal header -->
            <div class="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div>
                <p class="text-[10px] font-black text-dim uppercase tracking-widest mb-1">Booking Request</p>
                <h2 class="text-lg font-black text-main tracking-tight">{{ bookingService.name }}</h2>
                <p class="text-sm font-black text-main/60 mt-0.5">{{ bookingService.price }} <span class="text-[10px] text-dim font-bold">{{ bookingService.priceNote }}</span></p>
              </div>
              <button class="w-8 h-8 flex items-center justify-center text-dim hover:text-main hover:bg-surface-alt rounded-xl transition-all" @click="bookingService = null">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Success state -->
            <div v-if="requestSent" class="p-10 flex flex-col items-center text-center">
              <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 class="text-base font-black text-main mb-2">Booking request sent!</h3>
              <p class="text-sm text-dim font-bold max-w-xs leading-relaxed">We'll confirm your <strong class="text-main">{{ bookingService.name }}</strong> shoot at <strong class="text-main">{{ requestForm.email }}</strong> within 24 hours.</p>
              <button class="mt-6 btn btn-secondary !px-6 !py-2.5 !text-xs" @click="bookingService = null; requestSent = false; resetForm()">Close</button>
            </div>

            <!-- Form -->
            <form v-else @submit.prevent="handleRequest" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest">Full Name <span class="text-rose-400">*</span></label>
                  <input v-model="requestForm.name" type="text" required placeholder="Your name" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest">Email <span class="text-rose-400">*</span></label>
                  <input v-model="requestForm.email" type="email" required placeholder="you@email.com" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest">Phone <span class="text-rose-400">*</span></label>
                  <input v-model="requestForm.phone" type="tel" required placeholder="+254 700 000 000" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-black text-dim uppercase tracking-widest">Preferred Date</label>
                  <input v-model="requestForm.preferredDate" type="date" :min="minDate" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Property Address <span class="text-rose-400">*</span></label>
                <input v-model="requestForm.address" type="text" required placeholder="e.g. 14 Karen Road, Nairobi" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Space / Property Name</label>
                <input v-model="requestForm.spaceName" type="text" placeholder="e.g. Modern Westlands Apartment" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Notes</label>
                <textarea v-model="requestForm.notes" rows="2" placeholder="Access instructions, special requests, etc." class="input-glass w-full px-4 py-2.5 text-sm font-bold resize-none" />
              </div>

              <div class="flex items-center justify-between pt-2">
                <p class="text-[10px] text-dim font-bold">Confirmation within 24 hours</p>
                <button type="submit" :disabled="submitting" class="btn btn-primary !px-8 !py-3 shadow-xl !text-xs">
                  <span v-if="submitting" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <template v-else>Confirm Booking</template>
                </button>
              </div>

            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { toast } from 'vue-sonner'
import { usePlanStore } from '~/stores/plan'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Capture | Viewora' })

const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

const SHOOT_ALLOWANCES: Record<string, number> = { Free: 0, Starter: 0, Plus: 1, Pro: 2, Elite: 4 }
const shootsIncluded = computed(() => SHOOT_ALLOWANCES[planStore.plan?.name ?? 'Free'] ?? 0)

// ── Departments ────────────────────────────────────────────────────────────
const departments = [
  { id: 'all',          label: 'All Services', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { id: 'residential',  label: 'Residential',  icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { id: 'commercial',   label: 'Commercial',   icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>' },
  { id: 'hospitality',  label: 'Hospitality',  icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2h18v20H3z"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 12h1"/><path d="M14 12h1"/></svg>' },
  { id: 'industrial',   label: 'Industrial',   icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20V8l6-6 6 6v12H2z"/><path d="M14 20V10.5L20 6v14h-6z"/><path d="M6 20v-5h4v5"/></svg>' },
]

const activeDept = ref<string>('all')

// ── Services Catalog ───────────────────────────────────────────────────────
const services = [
  // Residential
  {
    id: 'res-standard',
    dept: 'residential',
    name: 'Standard Home',
    desc: '1–3 bedroom apartment or townhouse. Full 360° tour plus edited gallery shots.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    includes: ['Up to 8 rooms captured', '360° equirectangular per room', '15 edited gallery photos', 'Uploaded to your Viewora space'],
    delivery: '24–48 hours',
    price: 'KSh 18,000',
    priceNote: 'one-time',
    popular: false,
    planCredit: true,
  },
  {
    id: 'res-premium',
    dept: 'residential',
    name: 'Premium Villa',
    desc: '4–6 bedroom villa or mansion with aerial coverage and full interiors.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/><path d="m2 10 10-7 10 7"/></svg>',
    includes: ['Up to 20 rooms + exterior', '360° tour + drone aerial shots', '40 edited gallery photos', 'Virtual floor plan overlay', 'Same-day rush available'],
    delivery: '24–48 hours',
    price: 'KSh 38,000',
    priceNote: 'one-time',
    popular: true,
    planCredit: false,
  },
  {
    id: 'res-estate',
    dept: 'residential',
    name: 'Estate & Compound',
    desc: 'Large compounds, gated estates, and multi-unit residential developments.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="10" width="18" height="12" rx="1"/><path d="M8 22v-6h8v6"/><path d="M3 10 12 3l9 7"/><path d="M12 3v7"/></svg>',
    includes: ['Unlimited rooms & units', 'Full drone aerial coverage', '60+ edited gallery photos', 'Multiple 360° walkthrough paths', 'Dedicated project manager'],
    delivery: '48–72 hours',
    price: 'KSh 75,000',
    priceNote: 'from',
    popular: false,
    planCredit: false,
  },

  // Commercial
  {
    id: 'com-office',
    dept: 'commercial',
    name: 'Office Space',
    desc: 'Corporate offices, co-working spaces, and business parks up to 500m².',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>',
    includes: ['All offices, boardrooms & reception', '360° tour + gallery shots', '20 edited photos', 'Reception & lobby highlights'],
    delivery: '24–48 hours',
    price: 'KSh 22,000',
    priceNote: 'one-time',
    popular: false,
    planCredit: true,
  },
  {
    id: 'com-retail',
    dept: 'commercial',
    name: 'Retail & Showroom',
    desc: 'Shops, showrooms, and storefronts. Perfect for e-commerce and brand presence.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    includes: ['Full shop floor + storage', '360° walkthrough', '25 product-focused gallery shots', 'Exterior + signage included'],
    delivery: '24 hours',
    price: 'KSh 16,000',
    priceNote: 'one-time',
    popular: true,
    planCredit: true,
  },
  {
    id: 'com-campus',
    dept: 'commercial',
    name: 'Corporate Campus',
    desc: 'Multi-floor or multi-building commercial complexes, banks, and headquarters.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 12h20M2 7.5h6M2 16.5h6M16 7.5h6M16 16.5h6"/></svg>',
    includes: ['Unlimited floors & departments', 'Drone exterior coverage', '50+ edited gallery photos', 'Wayfinding hotspot mapping', 'Project manager assigned'],
    delivery: '72 hours',
    price: 'KSh 60,000',
    priceNote: 'from',
    popular: false,
    planCredit: false,
  },

  // Hospitality
  {
    id: 'hos-restaurant',
    dept: 'hospitality',
    name: 'Restaurant & Café',
    desc: 'Dining spaces, bars, and café interiors. Boost reservations with an immersive preview.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    includes: ['Dining area + bar + kitchen', '360° tour per zone', '25 ambience gallery shots', 'Outdoor seating if available'],
    delivery: '24 hours',
    price: 'KSh 20,000',
    priceNote: 'one-time',
    popular: false,
    planCredit: true,
  },
  {
    id: 'hos-hotel',
    dept: 'hospitality',
    name: 'Boutique Hotel',
    desc: 'Full hotel property: rooms, lobby, restaurant, pool, and all guest facilities.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2h18v20H3z"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 12h1"/><path d="M14 12h1"/></svg>',
    includes: ['All room types + suites', 'Lobby, pool, gym & restaurant', 'Drone aerial exterior', '60+ edited photos', 'Dedicated 2-day shoot'],
    delivery: '48–72 hours',
    price: 'KSh 55,000',
    priceNote: 'from',
    popular: true,
    planCredit: false,
  },
  {
    id: 'hos-venue',
    dept: 'hospitality',
    name: 'Event Venue',
    desc: 'Wedding venues, conference centres, and event halls.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M4 20V10l8-7 8 7v10"/><path d="M10 20v-5h4v5"/><path d="M4 10h16"/></svg>',
    includes: ['Main hall + breakout rooms', 'Outdoor grounds + parking', '30 styled gallery photos', '360° setup in both dressed & empty state'],
    delivery: '48 hours',
    price: 'KSh 30,000',
    priceNote: 'one-time',
    popular: false,
    planCredit: false,
  },

  // Industrial
  {
    id: 'ind-warehouse',
    dept: 'industrial',
    name: 'Warehouse & Logistics',
    desc: 'Storage facilities, distribution centres, and industrial warehouses.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></svg>',
    includes: ['Full floor coverage', '360° panorama per zone', '20 operational gallery shots', 'Loading bay & exterior'],
    delivery: '24–48 hours',
    price: 'KSh 28,000',
    priceNote: 'one-time',
    popular: false,
    planCredit: true,
  },
  {
    id: 'ind-factory',
    dept: 'industrial',
    name: 'Factory & Production',
    desc: 'Manufacturing plants, production lines, and processing facilities.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    includes: ['All production zones & lines', 'Safety-compliant 360° capture', '40 process gallery shots', 'Aerial facility overview', 'Compliance documentation photos'],
    delivery: '48–72 hours',
    price: 'KSh 48,000',
    priceNote: 'from',
    popular: false,
    planCredit: false,
  },
]

const filteredServices = computed(() =>
  activeDept.value === 'all' ? services : services.filter(s => s.dept === activeDept.value)
)

// ── Steps ──────────────────────────────────────────────────────────────────
const steps = [
  { title: 'Pick a package & book', body: 'Choose the service that fits your property type, fill in the booking form, and we confirm within 24 hours.' },
  { title: 'Pro dispatched to you', body: 'A certified photographer arrives with 360° and DSLR equipment on your chosen date. No setup needed.' },
  { title: 'Assets live in 48 hours', body: 'Edited panoramas and gallery photos are uploaded directly to your Viewora space, ready to publish.' },
]

// ── Booking ────────────────────────────────────────────────────────────────
type Service = typeof services[number]
const bookingService = ref<Service | null>(null)
const submitting = ref(false)
const requestSent = ref(false)
const requestForm = ref({ name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '' })

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
})

function openBooking(svc: Service) {
  bookingService.value = svc
  requestSent.value = false
  resetForm()
}

function resetForm() {
  requestForm.value = { name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '' }
}

async function handleRequest() {
  if (!bookingService.value) return
  submitting.value = true
  try {
    await apiFetch('/capture/request', {
      method: 'POST',
      body: {
        ...requestForm.value,
        serviceId: bookingService.value.id,
        serviceName: bookingService.value.name,
        servicePrice: bookingService.value.price,
        planName: planStore.plan?.name,
      }
    })
    requestSent.value = true
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Could not send request. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.capture-page {
  padding-bottom: 3rem;
}

/* ── Department pills ──────────────────────────────────────────── */
.dept-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  background: var(--color-card, rgba(255,255,255,0.03));
  color: var(--color-dim, rgba(255,255,255,0.45));
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 140ms ease;
  white-space: nowrap;
}
.dept-pill:hover {
  color: var(--color-main, #fff);
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.06);
}
.dept-pill--active {
  background: var(--color-main, #fff);
  color: var(--color-bg, #0a0a0a);
  border-color: var(--color-main, #fff);
}
.dept-pill__icon { display: flex; align-items: center; opacity: 0.7; }
.dept-pill__count {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0,0,0,0.12);
  line-height: 1.4;
}
.dept-pill--active .dept-pill__count { background: rgba(0,0,0,0.15); }

/* ── Service cards ─────────────────────────────────────────────── */
.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-card, rgba(255,255,255,0.02));
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  border-radius: 20px;
  padding: 22px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
  overflow: hidden;
}
.service-card:hover {
  border-color: rgba(255,255,255,0.16);
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.service-card--popular {
  border-color: rgba(255,255,255,0.22);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.service-card__badge {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--color-main, #fff);
  color: var(--color-bg, #0a0a0a);
}
.service-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-alt, rgba(255,255,255,0.04));
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-main, #fff);
  flex-shrink: 0;
}

/* ── Modal transition ──────────────────────────────────────────── */
.capture-modal-enter-active { transition: opacity 220ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1); }
.capture-modal-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.capture-modal-enter-from  { opacity: 0; }
.capture-modal-leave-to    { opacity: 0; }
.capture-modal-enter-from .relative { transform: translateY(24px) scale(0.96); }
.capture-modal-leave-to    .relative { transform: translateY(16px) scale(0.97); }

@media (max-width: 639px) {
  .capture-modal-enter-from .relative { transform: translateY(40px); }
  .capture-modal-leave-to   .relative { transform: translateY(20px); }
}
</style>
