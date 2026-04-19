<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-1">
        <div class="flex items-center gap-4">
          <h1 class="text-3xl font-black tracking-tight text-main">Lead Hub</h1>
          <span v-if="canCapture && !pending" class="px-3 py-1 bg-surface-alt text-main text-[10px] font-black uppercase tracking-widest rounded-lg border border-border shadow-sm">
            {{ filteredLeads.length }} Leads
          </span>
        </div>
        <p class="text-sm text-dim font-bold">
          High-intent prospective inquiries captured from your virtual tours.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button 
          v-if="canCapture"
          class="btn btn-secondary !px-5 !py-2.5 !rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg"
          @click="exportLeads"
          :disabled="!filteredLeads.length"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="mr-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Dataset
        </button>
      </div>
    </header>

    <!-- ── Upgrade Wall (Gated) ────────────────────────────────────────── -->
    <div v-if="!canCapture" class="flex-1 flex items-center justify-center p-6 md:p-12">
      <div class="max-w-md w-full card-glass p-12 text-center shadow-2xl relative overflow-hidden group">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-main"></div>
        <div class="absolute top-0 right-0 w-64 h-64 bg-main/5 blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
        
        <div class="w-16 h-16 bg-surface-alt text-main rounded-2xl flex items-center justify-center mx-auto mb-8 border border-border shadow-inner relative z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        
        <h2 class="text-2xl font-black tracking-tight text-main mb-4 relative z-10">Premium Intelligence</h2>
        <p class="text-dim text-sm font-bold leading-relaxed mb-10 relative z-10">
          Unlock the Lead Hub to capture name, email, and intent directly from your virtual tour visitors.
        </p>
        
        <div class="space-y-4 mb-10 text-left bg-surface-alt/50 p-6 rounded-2xl border border-border relative z-10 shadow-inner">
          <div v-for="feat in ['Visitor Identity Capture', 'Source Attribution', 'Instant Notification']" :key="feat" class="flex items-center gap-3">
            <div class="w-5 h-5 bg-main text-bg rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="text-[11px] font-black uppercase tracking-widest text-main">{{ feat }}</span>
          </div>
        </div>

        <NuxtLink to="/app/billing" class="btn btn-primary w-full !py-4 !rounded-2xl text-xs relative z-10">
          Upgrade to Viewora Plus
        </NuxtLink>
      </div>
    </div>

    <!-- ── Dashboard Content (Entitled) ─────────────────────────────────── -->
    <template v-else>
      <!-- Filters Toolbar -->
      <section class="mb-8">
        <div class="flex flex-wrap items-center gap-4 card-glass p-3 shadow-xl">
          <div class="relative flex-1 min-w-[300px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="absolute left-4 top-1/2 -translate-y-1/2 text-dim"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              v-model="search" 
              type="text" 
              class="input-glass w-full !pl-12 !py-2.5 text-xs font-bold" 
              placeholder="Search by prospect name or email..." 
            />
          </div>

          <div class="flex items-center gap-3 pl-4 border-l border-border">
            <select v-model="projectFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10">
              <option value="">All Tours</option>
              <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-model="statusFilter" class="input-glass !px-4 !py-2.5 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer pr-10">
              <option value="">Status: All</option>
              <option value="new">New Inquiry</option>
              <option value="contacted">Followed Up</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed / Deal</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Main Data Table -->
      <section class="flex-1 min-h-[400px] card-glass overflow-hidden flex flex-col shadow-2xl relative">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-main/5 via-main/20 to-main/5"></div>
        
        <!-- Loading Skeleton -->
        <div v-if="pending" class="divide-y divide-border">
          <div v-for="n in 6" :key="n" class="px-8 py-6 flex items-center gap-6 animate-pulse">
            <div class="w-10 h-10 bg-surface-alt rounded-2xl flex-shrink-0 border border-border"></div>
            <div class="flex-1 min-w-0 space-y-2.5">
              <div class="h-3 bg-surface-alt rounded-lg w-40 border border-border"></div>
              <div class="h-2.5 bg-surface-alt rounded-lg w-24 border border-border"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!filteredLeads.length" class="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in zoom-in-95 duration-700">
          <div class="w-16 h-16 bg-surface-alt text-dim/30 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-border shadow-inner">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 class="text-xl font-black text-main mb-2 tracking-tight">No Prospects Detected</h3>
          <p class="text-sm text-dim max-w-xs mx-auto mb-8 font-bold leading-relaxed">
            {{ search || projectFilter || statusFilter ? 'No leads matched your filter parameters.' : 'Visitors who use your tour inquiry forms will be automatically synchronized here.' }}
          </p>
          <button v-if="search || projectFilter || statusFilter" class="btn btn-secondary !px-8 !py-3 !rounded-xl text-[11px] font-black uppercase tracking-widest" @click="search = ''; projectFilter = ''; statusFilter = ''">
            Clear Active Filters
          </button>
        </div>

        <!-- The Table -->
        <div v-else class="flex-1 overflow-auto scrollbar-premium">
          <table class="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead class="sticky top-0 bg-surface/80 backdrop-blur-xl z-20 border-b border-border shadow-sm">
              <tr>
                <th class="w-[28%] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Prospect Identity</th>
                <th class="w-[25%] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Contact Method</th>
                <th class="w-[18%] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Source Asset</th>
                <th class="w-[15%] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Current Status</th>
                <th class="w-[14%] px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right pr-12">Synchronized</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="lead in filteredLeads" :key="lead.id" class="group hover:bg-main/[0.02] transition-all duration-300">
                <td class="px-8 py-6">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-surface-alt border border-border text-main flex items-center justify-center text-xs font-black shadow-inner shadow-black/5">
                      {{ (lead.name || 'P')[0].toUpperCase() }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-black text-main tracking-tight truncate">{{ lead.name || 'Anonymous' }}</span>
                      <button v-if="lead.message" class="text-[10px] text-main/60 font-black uppercase tracking-widest text-left hover:text-main transition-colors mt-0.5" @click="expandedLead = lead">
                         View Message
                      </button>
                    </div>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <div class="flex flex-col min-w-0">
                    <a :href="`mailto:${lead.email}`" class="text-sm font-bold text-main hover:underline truncate">{{ lead.email }}</a>
                    <span v-if="lead.phone" class="text-[10px] font-black uppercase tracking-widest text-dim/60 mt-0.5">{{ lead.phone }}</span>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <div class="flex flex-col min-w-0">
                    <span v-if="lead.projects" class="text-xs font-black text-main truncate tracking-tight">{{ (lead.projects as any).name }}</span>
                    <span class="text-[10px] font-black uppercase tracking-widest text-dim/60 mt-0.5">{{ formatSource(lead.source) }}</span>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <div class="flex">
                    <button 
                      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                      :class="[
                        lead.status === 'new' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                        lead.status === 'contacted' ? 'bg-sky-500/10 border-sky-500/30 text-sky-500' :
                        lead.status === 'qualified' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                        'bg-surface-alt border-border text-dim '
                      ]"
                      @click="updateStatus(lead, cycleStatus(lead.status))"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" :class="[
                         lead.status === 'new' ? 'bg-amber-500' :
                         lead.status === 'contacted' ? 'bg-sky-500' :
                         lead.status === 'qualified' ? 'bg-emerald-500' :
                         'bg-dim/50'
                      ]"></span>
                      {{ formatStatus(lead.status) }}
                    </button>
                  </div>
                </td>
                <td class="px-8 py-6 text-right pr-12 relative overflow-hidden">
                  <span class="text-[11px] font-black uppercase tracking-widest text-dim">{{ formatDate(lead.created_at) }}</span>
                  <button 
                    class="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-rose-500/10 text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-bg shadow-lg"
                    @click="confirmDelete(lead)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Message Detail Modal -->
      <Teleport to="body">
        <Transition name="fade-smooth">
          <div v-if="expandedLead" class="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
            <div class="absolute inset-0 bg-zinc-950/40" @click="expandedLead = null"></div>
            <div class="relative w-full max-w-xl card-glass border-main/20 shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
              <header class="px-8 py-6 flex items-center justify-between border-b border-border bg-surface-alt/30">
                 <div class="space-y-1">
                   <h3 class="text-sm font-black text-main uppercase tracking-widest">Inquiry Intelligence</h3>
                   <p class="text-[10px] font-bold text-dim">Prospect: {{ expandedLead.name || 'Anonymous' }}</p>
                 </div>
                 <button class="w-8 h-8 flex items-center justify-center text-dim hover:text-main hover:bg-surface-alt rounded-lg transition-all" @click="expandedLead = null">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </header>
              <div class="p-10 space-y-8">
                <div class="bg-surface-alt/80 p-8 rounded-3xl border border-border text-sm font-bold leading-relaxed text-main shadow-inner relative italic">
                  <div class="absolute top-4 left-4 text-dim opacity-20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12C15.017 12.5523 14.5693 13 14.017 13H13.017C12.4647 13 12.017 12.5523 12.017 12V9C12.017 6.79086 13.8079 5 16.017 5H19.017C21.2261 5 23.017 6.79086 23.017 9V15C23.017 17.2091 21.2261 19 19.017 19H16.017C14.9124 19 14.017 19.8954 14.017 21ZM1.017 21L1.017 18C1.017 16.8954 1.91243 16 3.017 16H6.017C6.56928 16 7.017 15.5523 7.017 15V9C7.017 8.44772 6.56928 8 6.017 8H3.017C2.46472 8 2.017 8.44772 2.017 9V12C2.017 12.5523 1.56928 13 1.017 13H0.017C-0.535282 13 -1.017 12.5523 -1.017 12V9C-1.017 6.79086 0.773858 5 2.983 5H6.017C8.2261 5 10.017 6.79086 10.017 9V15C10.017 17.2091 8.2261 19 6.017 19H3.017C1.91243 19 1.017 19.8954 1.017 21Z"/></svg>
                  </div>
                  {{ expandedLead.message }}
                </div>
                <div class="flex items-center gap-5">
                  <div class="w-12 h-12 rounded-2xl bg-surface-alt border border-border text-main flex items-center justify-center font-black shadow-lg">
                     {{ expandedLead.name?.[0] || 'P' }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-base font-black text-main tracking-tight truncate">{{ expandedLead.name || 'Anonymous' }}</span>
                    <span class="text-xs font-bold text-dim truncate">{{ expandedLead.email }}</span>
                  </div>
                </div>
              </div>
              <footer class="px-8 py-6 bg-surface-alt/30 border-t border-border flex justify-end gap-3">
                 <button class="btn btn-secondary !px-6 !py-2.5 !rounded-xl text-xs uppercase font-black" @click="expandedLead = null">Dismiss</button>
                 <a :href="`mailto:${expandedLead.email}?subject=Regarding your property inquiry`" class="btn btn-primary !px-8 !py-2.5 !rounded-xl text-xs uppercase font-black">Open Response Line</a>
              </footer>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Confirmation Modal -->
      <AppConfirmationModal
        :is-open="!!deleteTarget"
        title="Remove Lead?"
        :message="`Are you sure you want to permanently delete the lead from ${deleteTarget?.name || deleteTarget?.email}? This cannot be undone.`"
        confirm-text="Delete Lead"
        :is-dangerous="true"
        :loading="deleting"
        @confirm="handleDelete"
        @cancel="deleteTarget = null"
      />
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
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
