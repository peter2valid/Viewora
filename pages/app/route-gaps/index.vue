<template>
  <div class="h-full flex flex-col">
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-1">
        <div class="flex items-center gap-4">
          <h1 class="text-3xl font-black tracking-tight text-main">Route gaps</h1>
          <span v-if="!pending" class="px-3 py-1 bg-surface-alt text-main text-[10px] font-black uppercase tracking-widest rounded-lg border border-border shadow-sm">
            {{ filtered.length }} {{ statusFilter || 'all' }}
          </span>
        </div>
        <p class="text-sm text-dim font-bold">
          Directions visitors asked for that the 360° tour can't walk. Add hotspots where the most people go first.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <select v-model="spaceFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10">
          <option value="">All tours</option>
          <option v-for="s in spaceOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="statusFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10" @change="load">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
          <option value="">All</option>
        </select>
      </div>
    </header>

    <div v-if="pending" class="space-y-3 animate-pulse">
      <div v-for="i in 5" :key="i" class="h-20 bg-card rounded-2xl" />
    </div>

    <p v-else-if="fetchError" class="text-sm font-bold text-red-500">{{ fetchError }}</p>

    <div v-else-if="!filtered.length" class="flex-1 flex items-center justify-center p-12 text-center">
      <p class="text-sm text-dim font-bold max-w-sm">
        {{ gaps.length ? 'Nothing matches that filter.' : 'No gaps yet. When a visitor asks for directions the tour can\'t walk, it shows up here.' }}
      </p>
    </div>

    <ul v-else class="space-y-3">
      <li v-for="g in filtered" :key="g.id" class="bg-card rounded-2xl p-5 border border-border flex flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 space-y-1">
            <p class="text-base font-black text-main truncate">
              {{ g.from_name || 'Unknown start' }} <span class="text-dim">→</span> {{ g.to_name || 'Unknown place' }}
            </p>
            <p class="text-xs text-dim font-bold">
              {{ g.properties?.title ?? 'Tour' }}<template v-if="g.from_ref.startsWith('scene:')"> · from a 360° view</template>
              · last asked {{ ago(g.last_seen_at) }}
            </p>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="px-2.5 py-1 rounded-lg bg-surface-alt border border-border text-[10px] font-black uppercase tracking-widest text-main">
              {{ REASONS[g.reason]?.label ?? g.reason }}
            </span>
            <span class="text-2xl font-black text-main tabular-nums" :title="`${g.hits} visitor requests`">{{ g.hits }}<span class="text-[10px] text-dim font-black uppercase tracking-widest ml-1">asks</span></span>
          </div>
        </div>

        <p class="text-xs text-dim font-bold">{{ REASONS[g.reason]?.hint }}</p>

        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="g.note"
            type="text"
            maxlength="1000"
            placeholder="Note (e.g. who's adding this, which corridor)"
            class="input-glass !px-3 !py-2 text-xs font-bold flex-1 min-w-[200px] outline-none"
            @change="save(g, { note: g.note || null })"
          >
          <NuxtLink :to="`/app/spaces/${g.property_id}`" class="btn btn-secondary !px-4 !py-2 text-[11px] font-black uppercase tracking-widest">Open editor</NuxtLink>
          <button v-if="g.status !== 'resolved'" class="btn btn-primary !px-4 !py-2 text-[11px] font-black uppercase tracking-widest" :disabled="busyId === g.id" @click="save(g, { status: 'resolved' })">Mark resolved</button>
          <button v-if="g.status === 'open'" class="btn btn-secondary !px-4 !py-2 text-[11px] font-black uppercase tracking-widest" :disabled="busyId === g.id" @click="save(g, { status: 'ignored' })">Ignore</button>
          <button v-if="g.status !== 'open'" class="btn btn-secondary !px-4 !py-2 text-[11px] font-black uppercase tracking-widest" :disabled="busyId === g.id" @click="save(g, { status: 'open' })">Reopen</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Route gaps | Viewora' })

type GapStatus = 'open' | 'resolved' | 'ignored'
interface Gap {
  id: string
  property_id: string
  from_ref: string
  from_name: string
  to_ref: string
  to_name: string
  reason: 'destination' | 'start' | 'detour' | 'partial'
  hits: number
  status: GapStatus
  note: string | null
  last_seen_at: string
  properties: { id: string; title: string; slug: string | null } | null
}

const REASONS: Record<Gap['reason'], { label: string; hint: string }> = {
  detour: { label: 'Long way round', hint: 'Hotspots only get there by a long detour, and nothing covers the direct way. Link the 360 views along the straight path.' },
  start: { label: 'No path from start', hint: 'The place is in the tour, but no hotspots lead there from where visitors started.' },
  destination: { label: 'Not covered', hint: "The tour has no 360 view near this place yet. Capture it and pin it on the floor plan." },
  partial: { label: 'Stops short', hint: 'The 360 walk ends a way from the place. Extend it with a view nearer the entrance.' },
}

const { apiFetch } = useApiFetch()
const gaps = ref<Gap[]>([])
const pending = ref(false)
const fetchError = ref('')
const busyId = ref<string | null>(null)
const statusFilter = ref<GapStatus | ''>('open')
const spaceFilter = ref('')

async function load() {
  pending.value = true
  fetchError.value = ''
  try {
    const res = await apiFetch<{ data: Gap[] }>('/route-gaps', { query: statusFilter.value ? { status: statusFilter.value } : {} })
    gaps.value = res?.data ?? []
  } catch (e: any) {
    fetchError.value = e.data?.statusMessage ?? e.message ?? 'Failed to load route gaps.'
  } finally {
    pending.value = false
  }
}
onMounted(load)

const spaceOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const g of gaps.value) if (g.properties) seen.set(g.property_id, g.properties.title)
  return [...seen].map(([id, name]) => ({ id, name }))
})
const filtered = computed(() => (spaceFilter.value ? gaps.value.filter(g => g.property_id === spaceFilter.value) : gaps.value))

async function save(g: Gap, patch: { status?: GapStatus; note?: string | null }) {
  busyId.value = g.id
  try {
    await apiFetch(`/route-gaps/${g.id}`, { method: 'PATCH', body: patch })
    if (patch.status) {
      g.status = patch.status
      // Leaves the current filter once its status changes.
      if (statusFilter.value && statusFilter.value !== patch.status) gaps.value = gaps.value.filter(x => x.id !== g.id)
    }
  } catch (e: any) {
    fetchError.value = e.data?.statusMessage ?? e.message ?? 'Could not save.'
  } finally {
    busyId.value = null
  }
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins || 1} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} d ago`
}
</script>
