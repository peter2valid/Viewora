<template>
  <div class="capture-page">

    <!-- Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-main">Capture</h1>
        <p class="text-sm text-dim font-bold mt-1">Professional 360° virtual tours dispatched to any property across Kenya.</p>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <NuxtLink to="/app/billing" class="btn btn-secondary !text-xs !py-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Upgrade plan
        </NuxtLink>
      </div>
    </header>

    <!-- Tabs -->
    <div class="flex gap-1 mb-8 bg-surface-alt/50 border border-border rounded-2xl p-1 w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        :class="activeTab === tab.id ? 'bg-main text-bg shadow-lg' : 'text-dim hover:text-main'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.id === 'bookings' && bookings.length" class="ml-1.5 px-1.5 py-0.5 rounded-full bg-current/20 text-[9px]">{{ bookings.length }}</span>
      </button>
    </div>

    <!-- ── BROWSE SERVICES TAB ────────────────────────────────────────────── -->
    <template v-if="activeTab === 'browse'">

      <!-- Packages -->
      <section class="mb-10">
        <h2 class="text-[10px] font-black text-dim uppercase tracking-[0.2em] mb-5">Choose a Package</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <button
            v-for="pkg in packages"
            :key="pkg.id"
            class="pkg-card"
            :class="[pkg.highlight ? 'pkg-card--highlight' : '', selectedPackage === pkg.id ? 'pkg-card--selected' : '']"
            @click="selectedPackage = selectedPackage === pkg.id ? null : pkg.id"
          >
            <div v-if="pkg.highlight" class="pkg-card__badge">Popular</div>
            <span class="pkg-card__name">{{ pkg.name }}</span>
            <span class="pkg-card__price">{{ pkg.price }}</span>
            <span class="pkg-card__desc">{{ pkg.desc }}</span>
          </button>
        </div>
        <p class="text-[10px] text-dim font-bold mt-3 ml-1">Select a package or browse departments below to get a custom quote.</p>
      </section>

      <!-- Department Filter -->
      <section class="mb-6">
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
          </button>
        </div>
      </section>

      <!-- Department Cards Grid -->
      <section class="mb-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="dept in filteredDepartments"
            :key="dept.id"
            class="dept-card"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="dept-card__icon-wrap">
                <span v-html="dept.icon" />
              </div>
              <div class="text-right">
                <div class="text-xs font-black text-dim uppercase tracking-widest">From</div>
                <div class="text-lg font-black text-main tracking-tight">{{ dept.startingPrice }}</div>
              </div>
            </div>

            <h3 class="text-sm font-black text-main mb-1">{{ dept.label }}</h3>
            <p class="text-xs text-dim font-bold leading-relaxed mb-3">{{ dept.examples }}</p>

            <div class="mb-4 space-y-1">
              <div v-for="tier in dept.tiers" :key="tier.label" class="flex items-center justify-between text-[11px]">
                <span class="text-dim font-bold">{{ tier.label }}</span>
                <span class="font-black text-main">{{ tier.price }}</span>
              </div>
            </div>

            <button
              class="btn btn-primary w-full !py-2.5 !text-xs shadow-lg mt-auto"
              @click="openBooking(dept)"
            >
              Book This Department
            </button>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="mb-8">
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
    </template>

    <!-- ── MY BOOKINGS TAB ────────────────────────────────────────────────── -->
    <template v-else-if="activeTab === 'bookings'">
      <div class="mb-6 flex items-center justify-between">
        <p class="text-sm text-dim font-bold">All capture requests you have submitted.</p>
        <button class="btn btn-secondary !text-xs !py-2" @click="loadBookings">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6"/><path d="M21.5 8A10 10 0 1 1 8 2.5"/></svg>
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <div v-if="bookingsPending" class="space-y-3">
        <div v-for="n in 4" :key="n" class="h-16 bg-surface-alt rounded-2xl animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="!bookings.length" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="w-14 h-14 bg-surface-alt border border-border rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-dim/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <h3 class="text-base font-black text-main mb-2">No bookings yet</h3>
        <p class="text-sm text-dim font-bold max-w-xs">Submit a capture request from the Browse tab and it will appear here.</p>
        <button class="mt-6 btn btn-secondary !text-xs !px-6" @click="activeTab = 'browse'">Browse Services</button>
      </div>

      <!-- Table -->
      <div v-else class="card-glass overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[900px]">
            <thead class="bg-surface-alt/50 border-b border-border">
              <tr>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Service</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Client / Contact</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Address</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Date</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Status</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim">Price</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-dim text-right">Booked</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="b in bookings" :key="b.id" class="group hover:bg-main/[0.02] transition-all">
                <td class="px-6 py-4">
                  <div class="text-sm font-black text-main">{{ b.service_name }}</div>
                  <div v-if="b.dept" class="text-[10px] font-bold text-dim uppercase tracking-widest mt-0.5">{{ b.dept }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-bold text-main">{{ b.name }}</div>
                  <a :href="`mailto:${b.email}`" class="text-xs text-dim hover:text-main transition-colors">{{ b.email }}</a>
                  <div class="text-xs text-dim mt-0.5">{{ b.phone }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-xs font-bold text-main max-w-[200px]">{{ b.address }}</div>
                  <div v-if="b.space_name" class="text-[10px] text-dim mt-0.5">{{ b.space_name }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-xs font-bold text-main">{{ b.preferred_date || '—' }}</div>
                  <div v-if="b.notes" class="text-[10px] text-dim mt-0.5 max-w-[140px] truncate" :title="b.notes">{{ b.notes }}</div>
                </td>
                <td class="px-6 py-4">
                  <select
                    :value="b.status"
                    class="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border cursor-pointer outline-none transition-all"
                    :class="statusClass(b.status)"
                    @change="updateBookingStatus(b, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-black text-main">{{ b.service_price }}</div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="text-[11px] font-black text-dim uppercase tracking-widest">{{ formatDate(b.created_at) }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Booking Modal -->
    <Teleport to="body">
      <Transition name="capture-modal">
        <div v-if="bookingTarget" class="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md">
          <div class="absolute inset-0 bg-zinc-950/50" @click="bookingTarget = null" />
          <div class="relative w-full sm:max-w-xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">

            <div class="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div>
                <p class="text-[10px] font-black text-dim uppercase tracking-widest mb-1">Booking Request</p>
                <h2 class="text-lg font-black text-main tracking-tight">{{ bookingTarget.label }}</h2>
                <p class="text-sm font-bold text-main/60 mt-0.5">From {{ bookingTarget.startingPrice }}</p>
              </div>
              <button class="w-8 h-8 flex items-center justify-center text-dim hover:text-main hover:bg-surface-alt rounded-xl transition-all" @click="bookingTarget = null">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div v-if="requestSent" class="p-10 flex flex-col items-center text-center">
              <div class="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 class="text-base font-black text-main mb-2">Booking request sent!</h3>
              <p class="text-sm text-dim font-bold max-w-xs leading-relaxed">We'll confirm your <strong class="text-main">{{ bookingTarget.label }}</strong> shoot at <strong class="text-main">{{ requestForm.email }}</strong> within 24 hours.</p>
              <div class="flex gap-3 mt-6">
                <button class="btn btn-secondary !px-6 !py-2.5 !text-xs" @click="bookingTarget = null; requestSent = false; resetForm()">Close</button>
                <button class="btn btn-primary !px-6 !py-2.5 !text-xs" @click="activeTab = 'bookings'; bookingTarget = null; requestSent = false; loadBookings()">View My Bookings</button>
              </div>
            </div>

            <form v-else @submit.prevent="handleRequest" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <!-- Package selector inside modal -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Package / Budget</label>
                <select v-model="requestForm.serviceId" class="input-glass w-full px-4 py-2.5 text-sm font-bold">
                  <option value="">— Custom quote / not sure yet —</option>
                  <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">{{ pkg.name }} — {{ pkg.price }}</option>
                </select>
              </div>

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
                <label class="text-[10px] font-black text-dim uppercase tracking-widest">Property / Business Name</label>
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
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { toast } from 'vue-sonner'
import { usePlanStore } from '~/stores/plan'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Capture | Viewora' })

const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

// ── Tabs ─────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'browse', label: 'Browse Services' },
  { id: 'bookings', label: 'My Bookings' },
]
const activeTab = ref('browse')

// ── Packages ───────────────────────────────────────────────────────────────
const packages = [
  { id: 'mini',     name: 'Mini',     price: 'KES 5,000',        desc: 'Small room, shop, salon',    highlight: false },
  { id: 'starter',  name: 'Starter',  price: 'KES 7,500',        desc: '1BR Airbnb, small office',   highlight: false },
  { id: 'standard', name: 'Standard', price: 'KES 10,000',       desc: '2BR apt, clinic, small gym', highlight: true  },
  { id: 'pro',      name: 'Pro',      price: 'KES 15,000',       desc: '3BR house, showroom',        highlight: false },
  { id: 'business', name: 'Business', price: 'KES 25,000',       desc: 'Hotel, school, event venue', highlight: false },
  { id: 'premium',  name: 'Premium',  price: 'From KES 40,000',  desc: 'Resort, factory, developer', highlight: false },
]
const selectedPackage = ref<string | null>(null)

// ── Departments (25) ───────────────────────────────────────────────────────
const allDepartments = [
  {
    id: 'real-estate', label: 'Real Estate', startingPrice: 'KES 5,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    examples: 'Apartments, houses, villas, gated estates, developer show houses',
    tiers: [
      { label: 'Bedsitter / 1BR', price: 'KES 3,500–7,500' },
      { label: '2–3BR apartment', price: 'KES 7,500–15,000' },
      { label: '4BR+ house / villa', price: 'KES 15,000–40,000' },
      { label: 'Estate / apartment block', price: 'From KES 40,000' },
    ],
  },
  {
    id: 'airbnb', label: 'Airbnb & Furnished', startingPrice: 'KES 5,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"/><path d="M9 21V12h6v9"/></svg>',
    examples: 'Studio to 4BR Airbnbs, furnished apartment operators, Airbnb managers',
    tiers: [
      { label: 'Studio / 1BR Airbnb', price: 'KES 5,000–7,500' },
      { label: '2–3BR Airbnb', price: 'KES 10,000–15,000' },
      { label: '4BR Airbnb / villa', price: 'KES 18,000–25,000' },
      { label: 'Operator (3+ units)', price: 'KES 20,000–40,000' },
    ],
  },
  {
    id: 'hotels', label: 'Hotels & Accommodation', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 2h18v20H3z"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/></svg>',
    examples: 'Guest houses, budget hotels, boutique hotels, resorts, lodges',
    tiers: [
      { label: 'Small guest house', price: 'KES 10,000–15,000' },
      { label: 'Budget / boutique hotel', price: 'KES 15,000–40,000' },
      { label: 'Hotel rooms + facilities', price: 'KES 25,000–50,000' },
      { label: 'Resort / large hotel', price: 'From KES 60,000' },
    ],
  },
  {
    id: 'events', label: 'Events & Venues', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M4 20V10l8-7 8 7v10"/><path d="M10 20v-5h4v5"/></svg>',
    examples: 'Event halls, wedding gardens, conference centres, resort venues',
    tiers: [
      { label: 'Small event space', price: 'KES 10,000–15,000' },
      { label: 'Indoor hall / garden', price: 'KES 15,000–35,000' },
      { label: 'Conference / wedding venue', price: 'KES 20,000–50,000' },
      { label: 'Resort / large venue', price: 'From KES 60,000' },
    ],
  },
  {
    id: 'restaurants', label: 'Restaurants & Bars', startingPrice: 'KES 7,500',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    examples: 'Cafés, restaurants, lounges, rooftop bars, clubs',
    tiers: [
      { label: 'Small café', price: 'KES 5,000–7,500' },
      { label: 'Restaurant / lounge', price: 'KES 7,500–20,000' },
      { label: 'Rooftop / large restaurant', price: 'KES 15,000–35,000' },
      { label: 'Club / entertainment lounge', price: 'KES 25,000–50,000' },
    ],
  },
  {
    id: 'tourism', label: 'Tourism & Travel', startingPrice: 'KES 20,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    examples: 'Campsites, museums, safari lodges, adventure parks, county tourism',
    tiers: [
      { label: 'Small campsite / tour office', price: 'KES 7,500–15,000' },
      { label: 'Museum / cultural centre', price: 'KES 20,000–50,000' },
      { label: 'Safari lodge / attraction', price: 'KES 40,000–80,000' },
      { label: 'County tourism project', price: 'From KES 80,000' },
    ],
  },
  {
    id: 'education', label: 'Schools & Education', startingPrice: 'KES 20,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    examples: 'Daycares, primary schools, high schools, colleges, universities',
    tiers: [
      { label: 'Kindergarten / daycare', price: 'KES 10,000–20,000' },
      { label: 'Primary / high school', price: 'KES 25,000–60,000' },
      { label: 'College / TVET', price: 'KES 40,000–80,000' },
      { label: 'University campus', price: 'From KES 120,000' },
    ],
  },
  {
    id: 'healthcare', label: 'Healthcare & Medical', startingPrice: 'KES 10,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    examples: 'Clinics, dental, pharmacy, maternity, hospitals',
    tiers: [
      { label: 'Small clinic / pharmacy', price: 'KES 5,000–10,000' },
      { label: 'Dental / eye / physio clinic', price: 'KES 10,000–20,000' },
      { label: 'Maternity / medical centre', price: 'KES 20,000–50,000' },
      { label: 'Full hospital', price: 'From KES 60,000' },
    ],
  },
  {
    id: 'fitness', label: 'Fitness, Wellness & Beauty', startingPrice: 'KES 5,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5h11M6.5 17.5h11M3 3.5h1.5v17H3zM19.5 3.5H21v17h-1.5z"/></svg>',
    examples: 'Barbers, salons, nail spas, massage, gyms, wellness centres',
    tiers: [
      { label: 'Barber / small salon', price: 'KES 5,000–7,500' },
      { label: 'Large salon / nail spa', price: 'KES 7,500–15,000' },
      { label: 'Gym / massage spa', price: 'KES 10,000–30,000' },
      { label: 'Wellness centre', price: 'KES 20,000–40,000' },
    ],
  },
  {
    id: 'retail', label: 'Showrooms & Retail', startingPrice: 'KES 7,500',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    examples: 'Boutiques, furniture, tiles, kitchen showrooms, electronics, hardware',
    tiers: [
      { label: 'Small boutique / phone shop', price: 'KES 5,000–10,000' },
      { label: 'Electronics / hardware', price: 'KES 7,500–15,000' },
      { label: 'Furniture / tile showroom', price: 'KES 15,000–40,000' },
      { label: 'Large retail showroom', price: 'From KES 40,000' },
    ],
  },
  {
    id: 'automotive', label: 'Automotive', startingPrice: 'KES 10,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    examples: 'Car yards, dealerships, garages, car wash, spare parts, driving schools',
    tiers: [
      { label: 'Car wash / spare parts', price: 'KES 7,500–15,000' },
      { label: 'Small car yard / garage', price: 'KES 10,000–20,000' },
      { label: 'Car dealership', price: 'KES 15,000–30,000' },
      { label: 'Premium car showroom', price: 'KES 25,000–50,000' },
    ],
  },
  {
    id: 'offices', label: 'Offices & Corporate', startingPrice: 'KES 7,500',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    examples: 'Small offices, law firms, SACCOs, coworking, NGOs, corporate HQ',
    tiers: [
      { label: 'Small office', price: 'KES 7,500–10,000' },
      { label: 'Law firm / SACCO branch', price: 'KES 10,000–25,000' },
      { label: 'Coworking / company office', price: 'KES 20,000–50,000' },
      { label: 'Large corporate campus', price: 'From KES 60,000' },
    ],
  },
  {
    id: 'religious', label: 'Churches & Religious', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 22H6a2 2 0 0 1-2-2V7l5-5h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2z"/><path d="M12 8v8M8 12h8"/></svg>',
    examples: 'Churches, mosques, temples, retreat centres, religious schools',
    tiers: [
      { label: 'Small church / mosque', price: 'KES 10,000–20,000' },
      { label: 'Medium church', price: 'KES 20,000–35,000' },
      { label: 'Large church / retreat', price: 'KES 35,000–70,000' },
      { label: 'Religious school / college', price: 'KES 30,000–80,000' },
    ],
  },
  {
    id: 'government', label: 'Government & Public', startingPrice: 'KES 40,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    examples: 'Libraries, county offices, public hospitals, stadiums, museums',
    tiers: [
      { label: 'Public library', price: 'KES 20,000–40,000' },
      { label: 'County office', price: 'KES 40,000–100,000' },
      { label: 'Stadium / sports facility', price: 'From KES 80,000' },
      { label: 'County tourism project', price: 'From KES 120,000' },
    ],
  },
  {
    id: 'industrial', label: 'Industrial & Manufacturing', startingPrice: 'KES 25,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    examples: 'Workshops, warehouses, factory sections, logistics facilities',
    tiers: [
      { label: 'Small workshop', price: 'KES 10,000–20,000' },
      { label: 'Warehouse', price: 'KES 20,000–40,000' },
      { label: 'Factory section', price: 'KES 30,000–60,000' },
      { label: 'Full factory / industrial park', price: 'From KES 100,000' },
    ],
  },
  {
    id: 'agriculture', label: 'Agriculture & Farms', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9z"/><path d="M12 12c0-5 5-9 10-9 0 5-4 9-10 9z"/></svg>',
    examples: 'Demo farms, greenhouses, dairy, poultry, coffee farms, agritourism',
    tiers: [
      { label: 'Small demo / greenhouse farm', price: 'KES 10,000–20,000' },
      { label: 'Dairy / poultry farm', price: 'KES 15,000–40,000' },
      { label: 'Coffee / tea / agritourism', price: 'KES 30,000–80,000' },
      { label: 'Large export farm', price: 'From KES 100,000' },
    ],
  },
  {
    id: 'entertainment', label: 'Entertainment & Recreation', startingPrice: 'KES 10,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    examples: 'Kids play areas, game arcades, cinemas, amusement parks, country clubs',
    tiers: [
      { label: 'Kids play / game arcade', price: 'KES 10,000–20,000' },
      { label: 'Swimming / cinema', price: 'KES 15,000–60,000' },
      { label: 'Amusement park', price: 'KES 40,000–100,000' },
      { label: 'Country club / large rec', price: 'From KES 80,000' },
    ],
  },
  {
    id: 'sports', label: 'Sports Facilities', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20"/></svg>',
    examples: 'Training studios, football academies, golf clubs, stadiums',
    tiers: [
      { label: 'Small training studio', price: 'KES 7,500–15,000' },
      { label: 'Football / swimming academy', price: 'KES 15,000–40,000' },
      { label: 'Golf club section', price: 'KES 40,000–80,000' },
      { label: 'Full golf club / stadium', price: 'From KES 100,000' },
    ],
  },
  {
    id: 'creative', label: 'Creative & Cultural', startingPrice: 'KES 7,500',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    examples: 'Photo studios, music studios, dance studios, art galleries, museums',
    tiers: [
      { label: 'Photography / music studio', price: 'KES 5,000–10,000' },
      { label: 'Dance studio / art gallery', price: 'KES 7,500–35,000' },
      { label: 'Exhibition space', price: 'KES 20,000–50,000' },
      { label: 'Museum / cultural centre', price: 'From KES 60,000' },
    ],
  },
  {
    id: 'construction', label: 'Construction & Design', startingPrice: 'KES 15,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M4 20V8l8-6 8 6v12"/><path d="M10 20v-6h4v6"/></svg>',
    examples: 'Interior designers, architects, renovation tours, developer show units',
    tiers: [
      { label: 'Interior / architect project', price: 'KES 10,000–35,000' },
      { label: 'Renovation before/after', price: 'KES 15,000–35,000' },
      { label: 'Developer show unit', price: 'KES 25,000–60,000' },
      { label: 'Large construction site', price: 'From KES 80,000' },
    ],
  },
  {
    id: 'insurance', label: 'Insurance & Documentation', startingPrice: 'KES 10,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    examples: 'Property documentation, rental inspections, damage records, safety tours',
    tiers: [
      { label: 'Property documentation', price: 'KES 7,500–15,000' },
      { label: 'Insurance / damage record', price: 'KES 15,000–40,000' },
      { label: 'Safety training site', price: 'KES 25,000–60,000' },
      { label: 'Large facility documentation', price: 'From KES 80,000' },
    ],
  },
  {
    id: 'ecommerce', label: 'E-commerce & Shops', startingPrice: 'KES 5,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    examples: 'Boutiques, cosmetics, baby shops, appliance, furniture, large stores',
    tiers: [
      { label: 'Small online shop / boutique', price: 'KES 5,000–10,000' },
      { label: 'Baby / cosmetics / appliance', price: 'KES 7,500–20,000' },
      { label: 'Furniture store', price: 'KES 15,000–35,000' },
      { label: 'Large showroom store', price: 'From KES 40,000' },
    ],
  },
  {
    id: 'logistics', label: 'Logistics & Storage', startingPrice: 'KES 20,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    examples: 'Stockrooms, storage units, warehouses, cold rooms, courier depots',
    tiers: [
      { label: 'Small store / storage unit', price: 'KES 7,500–15,000' },
      { label: 'Warehouse', price: 'KES 20,000–50,000' },
      { label: 'Cold room / logistics depot', price: 'KES 25,000–80,000' },
      { label: 'Large distribution centre', price: 'From KES 100,000' },
    ],
  },
  {
    id: 'training', label: 'Training & Coaching', startingPrice: 'KES 10,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    examples: 'Training rooms, driving schools, beauty schools, coding schools, TVET',
    tiers: [
      { label: 'Small training room', price: 'KES 5,000–10,000' },
      { label: 'Driving / beauty school', price: 'KES 10,000–25,000' },
      { label: 'Technical training centre', price: 'KES 25,000–60,000' },
      { label: 'Corporate training venue', price: 'KES 20,000–50,000' },
    ],
  },
  {
    id: 'partners', label: 'Partners & Resellers', startingPrice: 'KES 4,000',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    examples: 'Photographers, videographers, web designers, real estate agents, Airbnb managers',
    tiers: [
      { label: 'Photographer / videographer', price: 'KES 4,000–8,000 white-label' },
      { label: 'Web designer / marketer', price: '10–20% commission' },
      { label: 'Real estate agent', price: 'KES 5,000–10,000 per listing' },
      { label: 'Airbnb manager (bulk)', price: 'KES 5,000–8,000 per unit' },
    ],
  },
]

const deptFilters = [
  { id: 'all', label: 'All' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'events', label: 'Events' },
  { id: 'restaurants', label: 'Food & Bars' },
  { id: 'tourism', label: 'Tourism' },
  { id: 'education', label: 'Education' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'retail', label: 'Retail' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'offices', label: 'Offices' },
  { id: 'religious', label: 'Religious' },
  { id: 'government', label: 'Government' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'agriculture', label: 'Agriculture' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'sports', label: 'Sports' },
  { id: 'creative', label: 'Creative' },
  { id: 'construction', label: 'Construction' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'ecommerce', label: 'E-Commerce' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'training', label: 'Training' },
  { id: 'partners', label: 'Partners' },
]

// Use deptFilters for pills, allDepartments for cards
const departments = deptFilters  // pill filter options
const activeDept = ref('all')

const filteredDepartments = computed(() =>
  activeDept.value === 'all'
    ? allDepartments
    : allDepartments.filter(d => d.id === activeDept.value)
)

const steps = [
  { title: 'Pick a department & book', body: 'Choose the service that matches your client type, fill in the booking form, and we confirm within 24 hours.' },
  { title: 'Pro dispatched to you', body: 'A certified photographer arrives with 360° and DSLR equipment on your chosen date.' },
  { title: 'Assets live within 48 hours', body: 'Edited panoramas and gallery photos uploaded directly to your Viewora space, ready to publish.' },
]

// ── Booking ────────────────────────────────────────────────────────────────
type Dept = typeof allDepartments[number]
const bookingTarget = ref<Dept | null>(null)
const submitting = ref(false)
const requestSent = ref(false)
const requestForm = ref({ name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '', serviceId: '' })

const minDate = computed(() => {
  const d = new Date(); d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
})

function openBooking(dept: Dept) {
  bookingTarget.value = dept
  requestSent.value = false
  requestForm.value.serviceId = selectedPackage.value ?? ''
  resetForm()
}

function resetForm() {
  requestForm.value = { name: '', email: '', phone: '', address: '', spaceName: '', preferredDate: '', notes: '', serviceId: selectedPackage.value ?? '' }
}

async function handleRequest() {
  if (!bookingTarget.value) return
  submitting.value = true
  const pkg = packages.find(p => p.id === requestForm.value.serviceId)
  try {
    await apiFetch('/capture/request', {
      method: 'POST',
      body: {
        ...requestForm.value,
        serviceId:    requestForm.value.serviceId || bookingTarget.value.id,
        serviceName:  pkg ? `${pkg.name} — ${bookingTarget.value.label}` : bookingTarget.value.label,
        servicePrice: pkg?.price ?? bookingTarget.value.startingPrice,
        dept:         bookingTarget.value.label,
        planName:     planStore.plan?.name,
      }
    })
    requestSent.value = true
    loadBookings()
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || 'Could not send request. Please try again.')
  } finally {
    submitting.value = false
  }
}

// ── My Bookings ────────────────────────────────────────────────────────────
interface Booking {
  id: string
  service_name: string
  service_price: string
  dept: string | null
  name: string
  email: string
  phone: string
  address: string
  space_name: string | null
  preferred_date: string | null
  notes: string | null
  status: string
  created_at: string
}

const bookings = ref<Booking[]>([])
const bookingsPending = ref(false)

async function loadBookings() {
  bookingsPending.value = true
  try {
    const res = await apiFetch<any>('/capture/requests')
    bookings.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
  } catch {
    bookings.value = []
  } finally {
    bookingsPending.value = false
  }
}

onMounted(loadBookings)

async function updateBookingStatus(booking: Booking, status: string) {
  const prev = booking.status
  booking.status = status
  try {
    await apiFetch(`/capture/requests/${booking.id}`, { method: 'PATCH', body: { status } })
  } catch {
    booking.status = prev
    toast.error('Failed to update status')
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'confirmed':  return 'bg-sky-500/10 border-sky-500/30 text-sky-400'
    case 'completed':  return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    case 'cancelled':  return 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    default:           return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.capture-page { padding-bottom: 3rem; }

/* ── Package cards ─────────────────────────────────────────── */
.pkg-card {
  position: relative; display: flex; flex-direction: column; gap: 4px;
  padding: 14px 12px; border-radius: 16px; text-align: left;
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  background: var(--color-card, rgba(255,255,255,0.02));
  cursor: pointer; transition: all 160ms ease;
}
.pkg-card:hover { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.04); }
.pkg-card--highlight { border-color: rgba(255,255,255,0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
.pkg-card--selected { background: var(--color-main, #fff); border-color: var(--color-main, #fff); }
.pkg-card--selected .pkg-card__name,
.pkg-card--selected .pkg-card__price,
.pkg-card--selected .pkg-card__desc { color: var(--color-bg, #0a0a0a) !important; }
.pkg-card__badge { position: absolute; top: 8px; right: 8px; font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 6px; border-radius: 999px; background: var(--color-main, #fff); color: var(--color-bg, #0a0a0a); }
.pkg-card__name { font-size: 13px; font-weight: 800; color: var(--color-main); letter-spacing: -0.01em; }
.pkg-card__price { font-size: 12px; font-weight: 900; color: var(--color-main); }
.pkg-card__desc { font-size: 10px; font-weight: 600; color: var(--color-dim); line-height: 1.4; }

/* ── Department filter pills ─────────────────────────────────── */
.dept-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 999px;
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  background: var(--color-card, rgba(255,255,255,0.03));
  color: var(--color-dim); font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all 140ms ease; white-space: nowrap;
}
.dept-pill:hover { color: var(--color-main); border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.06); }
.dept-pill--active { background: var(--color-main, #fff); color: var(--color-bg, #0a0a0a); border-color: var(--color-main, #fff); }

/* ── Department cards ────────────────────────────────────────── */
.dept-card {
  display: flex; flex-direction: column;
  background: var(--color-card); border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  border-radius: 20px; padding: 20px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.dept-card:hover { border-color: rgba(255,255,255,0.18); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.dept-card__icon-wrap {
  width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  background: var(--color-surface-alt, rgba(255,255,255,0.04));
  border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  display: flex; align-items: center; justify-content: center;
  color: var(--color-main, #fff);
}

/* ── Modal transition ────────────────────────────────────────── */
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
