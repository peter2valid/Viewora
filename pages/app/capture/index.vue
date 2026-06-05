<template>
  <div class="capture-page">

    <!-- Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-main">Capture</h1>
        <p class="text-sm text-dim font-bold mt-1">Professional 360° photography dispatched to any property type across Kenya.</p>
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

    <!-- Department Filter — first thing after header -->
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

    <!-- Stats bar -->
    <div class="grid grid-cols-3 gap-4 mb-8">
      <div v-for="stat in stats" :key="stat.label" class="bg-card border border-border rounded-2xl p-4 text-center">
        <p class="text-2xl font-black text-main tracking-tight">{{ stat.value }}</p>
        <p class="text-[10px] font-black text-dim uppercase tracking-widest mt-0.5">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Service Cards -->
    <section class="mb-12">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <div
          v-for="svc in filteredServices"
          :key="svc.id"
          class="service-card"
          :class="svc.popular ? 'service-card--popular' : ''"
        >
          <div v-if="svc.popular" class="service-card__badge">Most Popular</div>

          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="service-card__icon-wrap">
              <span v-html="svc.icon" />
            </div>
            <div v-if="shootsIncluded > 0 && svc.planCredit" class="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex-shrink-0">
              <svg class="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span class="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Plan Credit</span>
            </div>
          </div>

          <h3 class="text-base font-black text-main tracking-tight mb-1">{{ svc.name }}</h3>
          <p class="text-xs text-dim font-bold leading-relaxed mb-4">{{ svc.desc }}</p>

          <ul class="space-y-1.5 mb-5 flex-1">
            <li v-for="inc in svc.includes" :key="inc" class="flex items-start gap-2 text-xs text-dim">
              <svg class="w-3 h-3 text-main/50 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              {{ inc }}
            </li>
          </ul>

          <div class="flex items-center gap-1.5 mb-5 text-[10px] font-black text-dim uppercase tracking-widest">
            <svg class="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Delivery in {{ svc.delivery }}
          </div>

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
        <div v-if="bookingService" class="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
          <div class="absolute inset-0 bg-zinc-950/50" @click="bookingService = null" />
          <div class="relative w-full sm:max-w-xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">

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

            <div v-if="requestSent" class="p-10 flex flex-col items-center text-center">
              <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 class="text-base font-black text-main mb-2">Booking request sent!</h3>
              <p class="text-sm text-dim font-bold max-w-xs leading-relaxed">We'll confirm your <strong class="text-main">{{ bookingService.name }}</strong> shoot at <strong class="text-main">{{ requestForm.email }}</strong> within 24 hours.</p>
              <button class="mt-6 btn btn-secondary !px-6 !py-2.5 !text-xs" @click="bookingService = null; requestSent = false; resetForm()">Close</button>
            </div>

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
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Property / Space Name</label>
                <input v-model="requestForm.spaceName" type="text" placeholder="e.g. The Grand Restaurant, Westlands" class="input-glass w-full px-4 py-2.5 text-sm font-bold" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Notes</label>
                <textarea v-model="requestForm.notes" rows="2" placeholder="Access instructions, special requests, areas to focus on…" class="input-glass w-full px-4 py-2.5 text-sm font-bold resize-none" />
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

const stats = [
  { value: '12', label: 'Industries served' },
  { value: '48h', label: 'Max delivery time' },
  { value: '3', label: 'Cities covered' },
]

// ── Departments ────────────────────────────────────────────────────────────
const departments = [
  { id: 'all',         label: 'All',          icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { id: 'residential', label: 'Residential',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { id: 'commercial',  label: 'Commercial',   icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>' },
  { id: 'hospitality', label: 'Hospitality',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 2h18v20H3z"/><path d="M9 22V12h6v10"/></svg>' },
  { id: 'education',   label: 'Education',    icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { id: 'healthcare',  label: 'Healthcare',   icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
  { id: 'automotive',  label: 'Automotive',   icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
  { id: 'religious',   label: 'Religious',    icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 22H6a2 2 0 0 1-2-2V7l5-5h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2z"/><path d="M12 8v8M8 12h8"/></svg>' },
  { id: 'tourism',     label: 'Tourism',      icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  { id: 'fitness',     label: 'Fitness',      icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>' },
  { id: 'cultural',    label: 'Cultural',     icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="7" y="14" width="10" height="8"/><line x1="12" y1="9" x2="12" y2="9.01"/></svg>' },
  { id: 'industrial',  label: 'Industrial',   icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 20V8l6-6 6 6v12H2z"/><path d="M14 20V10.5L20 6v14h-6z"/></svg>' },
]

const activeDept = ref<string>('all')

// ── Services ────────────────────────────────────────────────────────────────
// Pricing rationale:
//  • US market reference: $125–$5,000 per property
//  • Kenya labour rate: ~25–30% of US equivalent
//  • Equipment (360° cam, drone) amortised at import parity
//  • Floor: KSh 12,000 (half-day shoot + edit)
//  • Drone add-on baked into packages that need aerial
const services = [
  // ── RESIDENTIAL ──────────────────────────────────────────────────────────
  {
    id: 'res-standard', dept: 'residential', popular: false, planCredit: true,
    name: 'Standard Home',
    desc: '1–3 bedroom apartment, townhouse, or bungalow. Full 360° tour plus gallery shots.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    includes: ['Up to 8 scenes / rooms', '360° equirectangular per scene', '15 edited gallery photos', 'Uploaded directly to your Viewora space'],
    delivery: '24–48 hrs', price: 'KSh 18,000', priceNote: 'one-time',
  },
  {
    id: 'res-premium', dept: 'residential', popular: true, planCredit: false,
    name: 'Premium Villa',
    desc: '4–6 bedroom villa or mansion with aerial drone coverage and full interiors.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></svg>',
    includes: ['Up to 20 scenes + exterior', 'Drone aerial shots included', '40 edited gallery photos', 'Virtual floor plan overlay'],
    delivery: '24–48 hrs', price: 'KSh 38,000', priceNote: 'one-time',
  },
  {
    id: 'res-estate', dept: 'residential', popular: false, planCredit: false,
    name: 'Estate & Compound',
    desc: 'Gated estates, multi-unit developments, and large compounds with grounds.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="10" width="18" height="12" rx="1"/><path d="M8 22v-6h8v6"/><path d="M3 10 12 3l9 7"/></svg>',
    includes: ['Unlimited rooms & units', 'Full drone aerial coverage', '60+ edited gallery photos', 'Multiple walkthrough paths', 'Dedicated project manager'],
    delivery: '48–72 hrs', price: 'KSh 75,000', priceNote: 'from',
  },

  // ── COMMERCIAL ───────────────────────────────────────────────────────────
  {
    id: 'com-office', dept: 'commercial', popular: false, planCredit: true,
    name: 'Office Space',
    desc: 'Corporate offices, co-working spaces, and business parks up to 500m².',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>',
    includes: ['All offices, boardrooms & reception', '360° tour + gallery shots', '20 edited photos', 'Lobby & entrance highlights'],
    delivery: '24–48 hrs', price: 'KSh 22,000', priceNote: 'one-time',
  },
  {
    id: 'com-retail', dept: 'commercial', popular: true, planCredit: true,
    name: 'Retail & Showroom',
    desc: 'Shops, showrooms, and storefronts. Perfect for e-commerce and brand visibility.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    includes: ['Full shop floor + storage areas', '360° walkthrough', '25 product-focused gallery shots', 'Exterior + signage included'],
    delivery: '24 hrs', price: 'KSh 16,000', priceNote: 'one-time',
  },
  {
    id: 'com-campus', dept: 'commercial', popular: false, planCredit: false,
    name: 'Corporate Campus',
    desc: 'Multi-floor complexes, banks, and headquarters requiring extensive coverage.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 12h20"/></svg>',
    includes: ['Unlimited floors & departments', 'Drone exterior coverage', '50+ edited photos', 'Wayfinding hotspot mapping', 'Project manager assigned'],
    delivery: '72 hrs', price: 'KSh 60,000', priceNote: 'from',
  },

  // ── HOSPITALITY ──────────────────────────────────────────────────────────
  {
    id: 'hos-restaurant', dept: 'hospitality', popular: false, planCredit: true,
    name: 'Restaurant & Café',
    desc: 'Dining rooms, bars, and cafés. Boost reservations with an immersive preview.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    includes: ['Dining area + bar + kitchen', '360° tour per zone', '25 ambience gallery shots', 'Outdoor seating if available'],
    delivery: '24 hrs', price: 'KSh 20,000', priceNote: 'one-time',
  },
  {
    id: 'hos-hotel', dept: 'hospitality', popular: true, planCredit: false,
    name: 'Boutique Hotel',
    desc: 'Full property: rooms, lobby, restaurant, pool, and all guest facilities.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2h18v20H3z"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/></svg>',
    includes: ['All room types + suites', 'Lobby, pool, gym & restaurant', 'Drone aerial exterior', '60+ edited photos', '2-day full shoot'],
    delivery: '48–72 hrs', price: 'KSh 55,000', priceNote: 'from',
  },
  {
    id: 'hos-venue', dept: 'hospitality', popular: false, planCredit: false,
    name: 'Event Venue',
    desc: 'Wedding venues, conference centres, and event halls — dressed and undressed.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M4 20V10l8-7 8 7v10"/><path d="M10 20v-5h4v5"/></svg>',
    includes: ['Main hall + breakout rooms', 'Outdoor grounds + parking', '30 styled gallery photos', 'Both dressed & empty state'],
    delivery: '48 hrs', price: 'KSh 30,000', priceNote: 'one-time',
  },

  // ── EDUCATION ────────────────────────────────────────────────────────────
  {
    id: 'edu-school', dept: 'education', popular: false, planCredit: true,
    name: 'School Campus',
    desc: 'Primary and secondary schools. Help parents and students explore before enrolment.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    includes: ['Classrooms, labs & library', 'Reception + admin block', 'Sports fields & playground', '30 gallery photos'],
    delivery: '24–48 hrs', price: 'KSh 28,000', priceNote: 'one-time',
  },
  {
    id: 'edu-university', dept: 'education', popular: false, planCredit: false,
    name: 'University / College',
    desc: 'Full campus virtual open day. Multi-faculty, hostels, sports, and common areas.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    includes: ['All faculties & lecture halls', 'Hostels, cafeteria & sports', 'Drone campus overview', '80+ gallery photos', 'Dedicated 2-day shoot'],
    delivery: '72 hrs', price: 'KSh 70,000', priceNote: 'from',
  },

  // ── HEALTHCARE ───────────────────────────────────────────────────────────
  {
    id: 'hth-clinic', dept: 'healthcare', popular: false, planCredit: true,
    name: 'Clinic & Dental',
    desc: 'GP clinics, dental offices, opticians, and specialist consultation rooms.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    includes: ['Reception + waiting areas', 'Consultation & treatment rooms', '15 gallery photos', 'Exterior signage shot'],
    delivery: '24 hrs', price: 'KSh 18,000', priceNote: 'one-time',
  },
  {
    id: 'hth-hospital', dept: 'healthcare', popular: false, planCredit: false,
    name: 'Hospital (Multi-Dept)',
    desc: 'Private hospitals and maternity units. Build patient confidence before admission.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
    includes: ['All departments & wards', 'Reception, ICU & theatre approach', 'Maternity & pharmacy', '50+ gallery photos', 'Drone exterior'],
    delivery: '48–72 hrs', price: 'KSh 55,000', priceNote: 'from',
  },

  // ── AUTOMOTIVE ───────────────────────────────────────────────────────────
  {
    id: 'auto-showroom', dept: 'automotive', popular: true, planCredit: true,
    name: 'Car Showroom',
    desc: 'Dealerships and showrooms — let buyers browse your floor from anywhere.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    includes: ['Full showroom floor', 'Up to 25 vehicles in 360°', '30 gallery shots per vehicle set', 'Service bay overview'],
    delivery: '24–48 hrs', price: 'KSh 24,000', priceNote: 'one-time',
  },
  {
    id: 'auto-dealership', dept: 'automotive', popular: false, planCredit: false,
    name: 'Full Dealership',
    desc: 'Multi-brand dealerships with service centres, parts departments, and test-drive bays.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v9"/></svg>',
    includes: ['Showroom + service workshop', 'Parts counter & customer lounge', 'Drone exterior + yard', '50+ gallery shots'],
    delivery: '48 hrs', price: 'KSh 48,000', priceNote: 'from',
  },

  // ── RELIGIOUS ────────────────────────────────────────────────────────────
  {
    id: 'rel-church', dept: 'religious', popular: false, planCredit: true,
    name: 'Church / Mosque / Temple',
    desc: 'Sanctuaries and worship centres. Let congregants worldwide experience the space.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 22H6a2 2 0 0 1-2-2V7l5-5h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2z"/><path d="M12 8v8M8 12h8"/></svg>',
    includes: ['Main sanctuary / prayer hall', 'Foyer + ancillary rooms', '20 gallery photos', 'Exterior + grounds'],
    delivery: '24 hrs', price: 'KSh 15,000', priceNote: 'one-time',
  },
  {
    id: 'rel-cathedral', dept: 'religious', popular: false, planCredit: false,
    name: 'Cathedral / Grand Mosque',
    desc: 'Historic or large-scale religious buildings with multiple halls and heritage features.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M4 20V10l8-7 8 7v10"/><path d="M10 20v-5h4v5"/><path d="M12 3v4"/></svg>',
    includes: ['All halls, chapels & courtyards', 'Heritage detail photography', 'Drone aerial exterior', '50+ gallery photos'],
    delivery: '48 hrs', price: 'KSh 35,000', priceNote: 'one-time',
  },

  // ── TOURISM ──────────────────────────────────────────────────────────────
  {
    id: 'tour-lodge', dept: 'tourism', popular: false, planCredit: false,
    name: 'Safari Lodge & Camp',
    desc: 'Eco-lodges, tented camps, and safari properties. Sell the experience before they arrive.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    includes: ['All tents / chalets + common areas', 'Dining, lounge & pool', 'Drone landscape aerials', '60+ gallery photos'],
    delivery: '48 hrs', price: 'KSh 42,000', priceNote: 'from',
  },
  {
    id: 'tour-attraction', dept: 'tourism', popular: false, planCredit: false,
    name: 'Tourist Attraction',
    desc: 'Parks, cultural sites, and landmarks. Drive ticket sales with an immersive preview.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    includes: ['Full grounds & key landmarks', '360° experience tour', 'Drone coverage', '40+ gallery shots'],
    delivery: '48 hrs', price: 'KSh 38,000', priceNote: 'from',
  },

  // ── FITNESS & WELLNESS ───────────────────────────────────────────────────
  {
    id: 'fit-gym', dept: 'fitness', popular: false, planCredit: true,
    name: 'Gym & Fitness Centre',
    desc: 'Gyms, CrossFit boxes, and fitness studios. Convert leads with a virtual tour.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5h11M6.5 17.5h11M3 3.5h1.5v17H3zM19.5 3.5H21v17h-1.5z"/></svg>',
    includes: ['Gym floor + equipment zones', 'Changing rooms & showers', '20 gallery photos', 'Reception & entrance'],
    delivery: '24 hrs', price: 'KSh 16,000', priceNote: 'one-time',
  },
  {
    id: 'fit-spa', dept: 'fitness', popular: false, planCredit: false,
    name: 'Spa & Wellness Centre',
    desc: 'Day spas, yoga studios, and wellness retreats. Showcase the serene atmosphere.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    includes: ['Treatment rooms + relaxation lounge', 'Pool or hydrotherapy area', '25 mood gallery photos', 'Reception & outdoor'],
    delivery: '24–48 hrs', price: 'KSh 22,000', priceNote: 'one-time',
  },

  // ── CULTURAL ─────────────────────────────────────────────────────────────
  {
    id: 'cul-gallery', dept: 'cultural', popular: false, planCredit: true,
    name: 'Art Gallery & Studio',
    desc: 'Galleries, studios, and exhibition spaces. Reach collectors and art lovers globally.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    includes: ['All gallery rooms', 'Artwork close-up photography', '30 gallery photos', 'Exterior + entrance'],
    delivery: '24 hrs', price: 'KSh 20,000', priceNote: 'one-time',
  },
  {
    id: 'cul-museum', dept: 'cultural', popular: false, planCredit: false,
    name: 'Museum & Heritage',
    desc: 'Museums, heritage sites, and cultural centres. Preserve and share your collection.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="7" y="14" width="10" height="8"/></svg>',
    includes: ['All exhibition halls', 'Artefact / collection detail shots', 'Drone exterior + grounds', '60+ gallery photos'],
    delivery: '48–72 hrs', price: 'KSh 50,000', priceNote: 'from',
  },

  // ── INDUSTRIAL ───────────────────────────────────────────────────────────
  {
    id: 'ind-warehouse', dept: 'industrial', popular: false, planCredit: true,
    name: 'Warehouse & Logistics',
    desc: 'Storage facilities, distribution centres, and industrial warehouses.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></svg>',
    includes: ['Full floor coverage per zone', '360° panorama per zone', '20 operational gallery shots', 'Loading bay & exterior'],
    delivery: '24–48 hrs', price: 'KSh 28,000', priceNote: 'one-time',
  },
  {
    id: 'ind-factory', dept: 'industrial', popular: false, planCredit: false,
    name: 'Factory & Production',
    desc: 'Manufacturing plants and processing facilities for B2B marketing and compliance.',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    includes: ['All production zones & lines', '360° safety-compliant capture', '40 process gallery shots', 'Aerial facility overview'],
    delivery: '48–72 hrs', price: 'KSh 48,000', priceNote: 'from',
  },
]

const filteredServices = computed(() =>
  activeDept.value === 'all' ? services : services.filter(s => s.dept === activeDept.value)
)

const steps = [
  { title: 'Pick your package & book', body: 'Choose the service that matches your property type, fill in the booking form, and we confirm within 24 hours.' },
  { title: 'Pro dispatched to you', body: 'A certified photographer arrives with 360° and DSLR equipment on your chosen date. No setup needed on your end.' },
  { title: 'Assets live within 48 hours', body: 'Edited panoramas and gallery photos are uploaded directly to your Viewora space, ready to publish and share.' },
]

// ── Booking ────────────────────────────────────────────────────────────────
type Service = typeof services[number]
const bookingService = ref<Service | null>(null)
const submitting = ref(false)
const requestSent = ref(false)
const requestForm = ref({ name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '' })

const minDate = computed(() => {
  const d = new Date(); d.setDate(d.getDate() + 2)
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
.capture-page { padding-bottom: 3rem; }

.dept-pill {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  background: var(--color-card, rgba(255,255,255,0.03));
  color: var(--color-dim, rgba(255,255,255,0.45));
  font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all 140ms ease; white-space: nowrap;
}
.dept-pill:hover { color: var(--color-main, #fff); border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); }
.dept-pill--active { background: var(--color-main, #fff); color: var(--color-bg, #0a0a0a); border-color: var(--color-main, #fff); }
.dept-pill__icon { display: flex; align-items: center; opacity: 0.7; }
.dept-pill__count { font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 999px; background: rgba(0,0,0,0.12); }
.dept-pill--active .dept-pill__count { background: rgba(0,0,0,0.15); }

.service-card {
  position: relative; display: flex; flex-direction: column;
  background: var(--color-card, rgba(255,255,255,0.02));
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  border-radius: 20px; padding: 22px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.service-card:hover { border-color: rgba(255,255,255,0.16); box-shadow: 0 12px 40px rgba(0,0,0,0.25); }
.service-card--popular { border-color: rgba(255,255,255,0.22); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.service-card__badge {
  position: absolute; top: 16px; right: 16px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px;
  background: var(--color-main, #fff); color: var(--color-bg, #0a0a0a);
}
.service-card__icon-wrap {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: var(--color-surface-alt, rgba(255,255,255,0.04));
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  display: flex; align-items: center; justify-content: center;
  color: var(--color-main, #fff);
}

.capture-modal-enter-active { transition: opacity 220ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1); }
.capture-modal-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.capture-modal-enter-from, .capture-modal-leave-to { opacity: 0; }
.capture-modal-enter-from .relative { transform: translateY(24px) scale(0.96); }
.capture-modal-leave-to   .relative { transform: translateY(16px) scale(0.97); }
@media (max-width: 639px) {
  .capture-modal-enter-from .relative { transform: translateY(40px); }
  .capture-modal-leave-to   .relative { transform: translateY(20px); }
}
</style>
