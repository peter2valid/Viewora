<template>
  <div class="h-full flex flex-col bg-zinc-50/50">
    <!-- Page Header -->
    <header class="p-8 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-black tracking-tight text-zinc-950">Lead Hub</h1>
          <span v-if="canCapture && !pending" class="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-500/20">
            {{ filteredLeads.length }} Total
          </span>
        </div>
        <p class="text-sm text-slate-500 font-medium">
          Capture and manage prospective client interests from your virtual tours.
          <template v-if="activeProject"> · {{ activeProject }}</template>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button 
          v-if="canCapture"
          class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-95"
          @click="exportLeads"
          :disabled="!filteredLeads.length"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>
    </header>

    <!-- ── Upgrade Wall (Gated) ────────────────────────────────────────── -->
    <div v-if="!canCapture" class="flex-1 flex items-center justify-center p-8">
      <div class="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-12 text-center shadow-2xl relative overflow-hidden animate-fade-up">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
        <div class="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 class="text-2xl font-black tracking-tight text-zinc-950 mb-4">Premium Intelligence</h2>
        <p class="text-slate-500 text-sm font-medium leading-relaxed mb-8">
          Unlock the Lead Hub to capture name, email, and intent directly from tour visitors.
        </p>
        
        <div class="space-y-4 mb-10 text-left bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div v-for="feat in ['Visitor Identity Capture', 'Source Attribution', 'Instant CRM Sync']" :key="feat" class="flex items-center gap-3">
            <div class="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="text-xs font-bold text-zinc-700">{{ feat }}</span>
          </div>
        </div>

        <NuxtLink to="/app/billing" class="block w-full py-4 bg-zinc-950 text-white text-sm font-black rounded-2xl shadow-xl shadow-zinc-950/20 hover:bg-zinc-900 transition-all active:scale-95">
          Level Up Your Agency
        </NuxtLink>
      </div>
    </div>

    <!-- ── Dashboard Content (Entitled) ─────────────────────────────────── -->
    <template v-else>
      <!-- Filters Toolbar -->
      <section class="p-8 pb-4">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[300px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              v-model="search" 
              type="text" 
              class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400" 
              placeholder="Filter by name or email…" 
            />
          </div>

          <div class="flex items-center gap-2">
            <select v-model="projectFilter" class="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-zinc-700 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10 relative">
              <option value="">All Spaces</option>
              <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-model="statusFilter" class="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-zinc-700 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10 relative">
              <option value="">All Statuses</option>
              <option value="new">New Inquiry</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Main Data Table -->
      <section class="flex-1 overflow-hidden p-8 pt-0">
        <div class="h-full bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          <!-- Loading State -->
          <div v-if="pending" class="flex-1 flex flex-col items-center justify-center gap-4">
             <div class="w-12 h-12 border-4 border-zinc-100 border-t-emerald-500 rounded-full animate-spin"></div>
             <p class="text-xs font-black uppercase tracking-widest text-zinc-400">Synchronizing leads...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="!filteredLeads.length" class="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div class="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 class="text-lg font-black text-zinc-950 mb-2">No Active Prospects</h3>
            <p class="text-sm text-slate-500 max-w-xs mx-auto mb-8">
              {{ search || projectFilter || statusFilter ? 'No leads match your current criteria.' : 'As soon as visitors enquire through your tours, they will appear here.' }}
            </p>
            <button v-if="search || projectFilter || statusFilter" class="text-xs font-black uppercase tracking-widest text-emerald-600" @click="search = ''; projectFilter = ''; statusFilter = ''">
              Reset Filters
            </button>
          </div>

          <!-- The Table -->
          <div v-else class="flex-1 overflow-auto">
            <table class="w-full text-left border-collapse">
              <thead class="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <tr>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Prospect</th>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Contact</th>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Attribution</th>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Current Status</th>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">Captured At</th>
                  <th class="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 text-sm">
                <tr v-for="lead in filteredLeads" :key="lead.id" class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-8 py-6">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center text-[10px] font-black">
                        {{ (lead.name || 'P')[0].toUpperCase() }}
                      </div>
                      <div class="flex flex-col">
                        <span class="font-bold text-zinc-950 leading-none mb-1">{{ lead.name || 'Anonymous Prospect' }}</span>
                        <div v-if="lead.message" class="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold cursor-pointer" @click="expandedLead = lead">
                           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                           View Message
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    <div class="flex flex-col gap-0.5">
                      <a :href="`mailto:${lead.email}`" class="font-medium text-zinc-600 hover:text-emerald-600 transition-colors">{{ lead.email }}</a>
                      <span v-if="lead.phone" class="text-[10px] font-bold text-slate-400">{{ lead.phone }}</span>
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    <div class="flex flex-col gap-1.5">
                      <span v-if="lead.projects" class="text-xs font-bold text-zinc-900 truncate max-w-[150px]">{{ (lead.projects as any).name }}</span>
                      <span class="w-fit px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-tighter rounded border border-slate-200">
                        {{ formatSource(lead.source) }}
                      </span>
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    <button 
                      class="flex items-center gap-2 pr-3 pl-1.5 py-1.5 rounded-full border transition-all active:scale-95 group/status"
                      :class="[
                        lead.status === 'new' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' :
                        lead.status === 'contacted' ? 'bg-sky-500/10 border-sky-500/20 text-sky-700' :
                        lead.status === 'qualified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' :
                        'bg-zinc-100 border-zinc-200 text-zinc-500',
                        { 'opacity-50 cursor-not-allowed': updatingStatusId === lead.id }
                      ]"
                      :disabled="updatingStatusId === lead.id"
                      @click="updateStatus(lead, cycleStatus(lead.status))"
                    >
                      <div class="w-1.5 h-1.5 rounded-full" :class="[
                         lead.status === 'new' ? 'bg-amber-500' :
                         lead.status === 'contacted' ? 'bg-sky-500' :
                         lead.status === 'qualified' ? 'bg-emerald-500' :
                         'bg-zinc-400'
                      ]"></div>
                      <span class="text-[10px] font-black uppercase tracking-wider">{{ formatStatus(lead.status) }}</span>
                      <svg v-if="updatingStatusId === lead.id" class="w-3 h-3 animate-spin" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </button>
                  </td>
                  <td class="px-8 py-6">
                    <span class="text-xs font-medium text-slate-500">{{ formatDate(lead.created_at) }}</span>
                  </td>
                  <td class="px-8 py-6 text-right">
                    <button 
                      class="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      @click="confirmDelete(lead)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Message Detail Modal -->
      <Teleport to="body">
        <Transition name="modal-in">
          <div v-if="expandedLead" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" @click="expandedLead = null"></div>
            <div class="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-modal-in">
              <header class="p-8 pb-4 flex items-center justify-between">
                 <h3 class="text-xl font-black text-zinc-950">Message Detail</h3>
                 <button class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-zinc-950 transition-colors" @click="expandedLead = null">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </header>
              <div class="p-8 pt-4 space-y-6">
                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-sm leading-relaxed text-zinc-700 italic">
                  "{{ expandedLead.message }}"
                </div>
                <div class="flex items-center gap-4 px-2">
                  <div class="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black">
                     {{ expandedLead.name?.[0] || 'P' }}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-black text-zinc-950">{{ expandedLead.name || 'Anonymous' }}</span>
                    <span class="text-xs text-slate-500 font-medium">{{ expandedLead.email }}</span>
                  </div>
                </div>
              </div>
              <footer class="p-8 bg-zinc-950 flex justify-end">
                 <a :href="`mailto:${expandedLead.email}?subject=Response from Viewora`" class="px-8 py-3 bg-white text-zinc-950 text-xs font-black rounded-xl hover:bg-emerald-500 hover:text-black transition-all">Reply via Email</a>
              </footer>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <Transition name="modal-in">
          <div v-if="deleteTarget" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" @click="deleteTarget = null"></div>
            <div class="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center animate-modal-in">
              <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </div>
              <h3 class="text-xl font-black text-zinc-950 mb-2">Delete Prospect?</h3>
              <p class="text-sm text-slate-500 font-medium mb-8">
                Are you sure you want to remove <strong>{{ deleteTarget.name || deleteTarget.email }}</strong>? This action is irreversible.
              </p>
              <div class="flex flex-col gap-3">
                <button class="w-full py-4 bg-rose-500 text-white text-sm font-black rounded-2xl hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20" :disabled="deleting" @click="handleDelete">
                   {{ deleting ? 'Eliminating...' : 'Confirm Deletion' }}
                </button>
                <button class="w-full py-4 bg-slate-50 text-slate-400 text-sm font-black rounded-2xl hover:bg-slate-100 transition-all" @click="deleteTarget = null">Cancel</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, useSeoMeta, useSupabaseUser, useSupabaseClient } from '#imports'
import { usePlanStore } from '~/stores/plan'
import { useApiFetch } from '~/composables/useApiFetch'

definePageMeta({ layout: 'app', middleware: 'auth' })

useSeoMeta({ title: 'Leads | Viewora' })

// ── Types ──────────────────────────────────────────────────────────────────
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed'

interface Lead {
  id: string
  project_id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: LeadStatus
  created_at: string
  updated_at: string | null
  projects: { id: string; name: string; slug: string | null } | null
}

// ── Store + auth ───────────────────────────────────────────────────────────
const planStore = usePlanStore()
const canCapture = computed(() => planStore.can('lead_capture_enabled'))
const isAdmin = computed(() => true) // no org role — all authenticated users can manage their leads

// ── State ──────────────────────────────────────────────────────────────────
const { apiFetch } = useApiFetch()
const leads = ref<Lead[]>([])
const pending = ref(false)
const fetchError = ref('')

const search = ref('')
const projectFilter = ref('')

const expandedLead = ref<Lead | null>(null)
const deleteTarget = ref<Lead | null>(null)
const deleting = ref(false)
const statusFilter = ref<LeadStatus | ''>('')
const updatingStatusId = ref<string | null>(null)

// ── Load ───────────────────────────────────────────────────────────────────
async function loadLeads() {
  if (!canCapture.value) return
  pending.value = true
  fetchError.value = ''
  try {
    leads.value = await apiFetch<Lead[]>('/leads')
  } catch (e: any) {
    fetchError.value = e.data?.statusMessage ?? e.message ?? 'Failed to load leads.'
  } finally {
    pending.value = false
  }
}

onMounted(loadLeads)

// ── Computed ───────────────────────────────────────────────────────────────
const projectOptions = computed(() => {
  const seen = new Set<string>()
  const list: { id: string; name: string }[] = []
  for (const l of leads.value) {
    if (l.projects && !seen.has(l.project_id)) {
      seen.add(l.project_id)
      list.push({ id: l.project_id, name: l.projects.name })
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
})

const activeProject = computed(() => {
  if (!projectFilter.value) return ''
  return projectOptions.value.find(p => p.id === projectFilter.value)?.name ?? ''
})

const filteredLeads = computed(() => {
  let list = leads.value
  if (projectFilter.value) list = list.filter(l => l.project_id === projectFilter.value)
  if (statusFilter.value) list = list.filter(l => l.status === statusFilter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(l =>
      (l.name ?? '').toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q)
    )
  }
  return list
})

// ── Status cycle ───────────────────────────────────────────────────────────
const STATUS_CYCLE: LeadStatus[] = ['new', 'contacted', 'qualified', 'closed']

function cycleStatus(current: LeadStatus | null | undefined): LeadStatus {
  const idx = STATUS_CYCLE.indexOf((current ?? 'new') as LeadStatus)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

// ── Actions ────────────────────────────────────────────────────────────────
async function updateStatus(lead: Lead, status: LeadStatus) {
  if (lead.status === status) return
  updatingStatusId.value = lead.id
  const prev = lead.status
  lead.status = status // optimistic
  try {
    const res = await apiFetch<{ id: string; status: LeadStatus; updated_at: string }>(
      `/leads/${lead.id}`, { method: 'PATCH', body: { status } }
    )
    lead.updated_at = res.updated_at // sync server timestamp
  } catch (e: any) {
    lead.status = prev // rollback
    fetchError.value = e.data?.statusMessage ?? 'Status update failed.'
  } finally {
    updatingStatusId.value = null
  }
}

function confirmDelete(lead: Lead) {
  deleteTarget.value = lead
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await apiFetch(`/leads/${deleteTarget.value.id}`, { method: 'DELETE' })
    leads.value = leads.value.filter(l => l.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } catch (e: any) {
    fetchError.value = e.data?.statusMessage ?? 'Delete failed.'
  } finally {
    deleting.value = false
  }
}

function exportLeads() {
  if (!filteredLeads.value.length) return

  const headers = ['Name', 'Email', 'Phone', 'Project', 'Status', 'Source', 'Message', 'Date']
  const rows = filteredLeads.value.map(l => [
    l.name || '',
    l.email || '',
    l.phone || '',
    l.projects?.name || '',
    formatStatus(l.status),
    formatSource(l.source),
    (l.message || '').replace(/"/g, '""'), // Escape quotes for CSV
    formatDate(l.created_at)
  ])

  const csvContent = headers.join(",") + "\n"
    + rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n")
    
  // Use Blob for better reliability with large datasets
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `viewora-leads-${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatSource(source: string | null) {
  switch (source) {
    case 'qr_code': return 'QR'
    case 'embed': return 'Embed'
    default: return 'Tour'
  }
}

function formatStatus(status: LeadStatus) {
  switch (status) {
    case 'contacted': return 'Contacted'
    case 'qualified': return 'Qualified'
    case 'closed': return 'Closed'
    default: return 'New'
  }
}
</script>

<style scoped>
/* Analytics specific transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Hide scrollbars for the table area but allow scrolling */
.overflow-x-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}
</style>
