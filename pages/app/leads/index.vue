<template>
  <div class="h-full flex flex-col">
    <!-- Page Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-zinc-950 ">Lead Hub</h1>
          <span v-if="canCapture && !pending" class="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-emerald-200">
            {{ filteredLeads.length }} Total
          </span>
        </div>
        <p class="text-sm text-zinc-500 ">
          Manage prospective client interests from your interactive tours.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button 
          v-if="canCapture"
          class="flex items-center gap-2 px-3 py-1.5 bg-white  border border-zinc-200  rounded-lg text-sm font-medium text-zinc-700  hover:bg-zinc-50   transition-colors shadow-sm disabled:opacity-50"
          @click="exportLeads"
          :disabled="!filteredLeads.length"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>
    </header>

    <!-- ── Upgrade Wall (Gated) ────────────────────────────────────────── -->
    <div v-if="!canCapture" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-white  rounded-xl border border-zinc-200  p-10 text-center shadow-sm relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
        <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 class="text-xl font-bold tracking-tight text-zinc-950  mb-3">Premium Intelligence</h2>
        <p class="text-zinc-500  text-sm leading-relaxed mb-8">
          Unlock the Lead Hub to capture name, email, and intent directly from tour visitors.
        </p>
        
        <div class="space-y-3 mb-8 text-left bg-zinc-50  p-5 rounded-lg border border-zinc-100 ">
          <div v-for="feat in ['Visitor Identity Capture', 'Source Attribution', 'Instant CRM Sync']" :key="feat" class="flex items-center gap-3">
            <div class="w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="text-xs font-medium text-zinc-700 ">{{ feat }}</span>
          </div>
        </div>

        <NuxtLink to="/app/billing" class="block w-full py-3 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-sm text-center active:scale-[0.98]">
          Upgrade to Plus
        </NuxtLink>
      </div>
    </div>

    <!-- ── Dashboard Content (Entitled) ─────────────────────────────────── -->
    <template v-else>
      <!-- Filters Toolbar -->
      <section class="mb-6">
        <div class="flex flex-wrap items-center gap-3 bg-white  p-2 rounded-xl border border-zinc-200  shadow-sm">
          <div class="relative flex-1 min-w-[240px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              v-model="search" 
              type="text" 
              class="w-full pl-9 pr-4 py-1.5 bg-transparent border-transparent focus:ring-0 text-sm outline-none placeholder:text-zinc-400" 
              placeholder="Search leads..." 
            />
          </div>

          <div class="flex items-center gap-2 border-l border-zinc-100  pl-3">
            <select v-model="projectFilter" class="bg-transparent text-sm font-bold text-zinc-600  hover:text-zinc-900  outline-none cursor-pointer pr-6 py-1.5 border-transparent focus:ring-0">
              <option value="">All Tours</option>
              <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-model="statusFilter" class="bg-transparent text-sm font-medium text-zinc-600  hover:text-zinc-900  outline-none cursor-pointer pr-6 py-1.5 border-transparent focus:ring-0">
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Main Data Table -->
      <section class="flex-1 min-h-0 bg-white  rounded-xl border border-zinc-200  shadow-sm overflow-hidden flex flex-col">
        
        <!-- Loading Skeleton -->
        <div v-if="pending" class="divide-y divide-zinc-50">
          <div v-for="n in 5" :key="n" class="px-6 py-4 flex items-center gap-4 animate-pulse">
            <div class="w-7 h-7 bg-zinc-100  rounded-full flex-shrink-0"></div>
            <div class="flex-1 min-w-0 space-y-1.5">
              <div class="h-3 bg-zinc-100  rounded w-28"></div>
              <div class="h-2 bg-zinc-100  rounded w-16"></div>
            </div>
            <div class="hidden sm:flex flex-col gap-1.5 w-36">
              <div class="h-3 bg-zinc-100  rounded w-28"></div>
              <div class="h-2 bg-zinc-100  rounded w-16"></div>
            </div>
            <div class="hidden md:flex flex-col gap-1.5 w-28">
              <div class="h-3 bg-zinc-100  rounded w-20"></div>
              <div class="h-2 bg-zinc-100  rounded w-12"></div>
            </div>
            <div class="w-16 h-5 bg-zinc-100  rounded-full"></div>
            <div class="w-16 h-3 bg-zinc-100  rounded ml-auto"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!filteredLeads.length" class="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div class="w-12 h-12 bg-zinc-50  text-zinc-300 rounded-xl flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 class="text-base font-semibold text-zinc-900  mb-1">No Active Prospects</h3>
          <p class="text-sm text-zinc-500  max-w-xs mx-auto mb-6">
            {{ search || projectFilter || statusFilter ? 'No leads match your current criteria.' : 'Visitors who enquire through your tours will appear here.' }}
          </p>
          <button v-if="search || projectFilter || statusFilter" class="text-sm font-medium text-emerald-600 hover:text-emerald-700" @click="search = ''; projectFilter = ''; statusFilter = ''">
            Reset Filters
          </button>
        </div>

        <!-- The Table -->
        <div v-else class="flex-1 overflow-auto">
          <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead class="sticky top-0 bg-white  backdrop-blur-md z-10 border-b border-zinc-100 ">
              <tr>
                <th class="w-[25%] px-6 py-3 text-xs font-medium text-zinc-500 ">Prospect</th>
                <th class="w-[25%] px-6 py-3 text-xs font-medium text-zinc-500 ">Contact</th>
                <th class="w-[20%] px-6 py-3 text-xs font-medium text-zinc-500 ">Source</th>
                <th class="w-[15%] px-6 py-3 text-xs font-medium text-zinc-500 ">Status</th>
                <th class="w-[15%] px-6 py-3 text-xs font-medium text-zinc-500  text-right">Captured</th>
                <th class="w-[50px] px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-50">
              <tr v-for="lead in filteredLeads" :key="lead.id" class="group hover:bg-zinc-50   transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-full bg-zinc-100  text-zinc-600  flex items-center justify-center text-[10px] font-bold">
                      {{ (lead.name || 'P')[0].toUpperCase() }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-medium text-zinc-900  truncate">{{ lead.name || 'Anonymous' }}</span>
                      <button v-if="lead.message" class="text-[10px] text-emerald-600 font-semibold text-left hover:underline" @click="expandedLead = lead">
                         View Message
                      </button>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-col min-w-0">
                    <a :href="`mailto:${lead.email}`" class="text-sm text-zinc-600  hover:text-zinc-900  truncate">{{ lead.email }}</a>
                    <span v-if="lead.phone" class="text-[10px] text-zinc-400">{{ lead.phone }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-col min-w-0">
                    <span v-if="lead.projects" class="text-xs font-medium text-zinc-900  truncate">{{ (lead.projects as any).name }}</span>
                    <span class="text-[10px] text-zinc-400">{{ formatSource(lead.source) }}</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <button 
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-all hover:brightness-95 active:scale-95"
                    :class="[
                      lead.status === 'new' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      lead.status === 'contacted' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      lead.status === 'qualified' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      'bg-zinc-50  border-zinc-200  text-zinc-600 '
                    ]"
                    @click="updateStatus(lead, cycleStatus(lead.status))"
                  >
                    <span class="w-1 h-1 rounded-full" :class="[
                       lead.status === 'new' ? 'bg-amber-500' :
                       lead.status === 'contacted' ? 'bg-blue-500' :
                       lead.status === 'qualified' ? 'bg-emerald-500' :
                       'bg-zinc-400'
                    ]"></span>
                    {{ formatStatus(lead.status) }}
                  </button>
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-xs text-zinc-500 ">{{ formatDate(lead.created_at) }}</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button 
                    class="p-1 text-zinc-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    @click="confirmDelete(lead)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Message Detail Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="expandedLead" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" @click="expandedLead = null"></div>
            <div class="relative w-full max-w-lg bg-white  rounded-xl shadow-xl overflow-hidden border border-zinc-200 ">
              <header class="px-6 py-5 flex items-center justify-between border-b border-zinc-100 ">
                 <h3 class="text-base font-semibold text-zinc-900 ">Inquiry Message</h3>
                 <button class="p-1 text-zinc-400 hover:text-zinc-600  rounded transition-colors" @click="expandedLead = null">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </header>
              <div class="p-6 space-y-6">
                <div class="bg-zinc-50  p-5 rounded-lg border border-zinc-100  text-sm leading-relaxed text-zinc-700  italic">
                  "{{ expandedLead.message }}"
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-zinc-100  text-zinc-600  flex items-center justify-center font-bold">
                     {{ expandedLead.name?.[0] || 'P' }}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-semibold text-zinc-900  truncate">{{ expandedLead.name || 'Anonymous' }}</span>
                    <span class="text-xs text-zinc-500  truncate">{{ expandedLead.email }}</span>
                  </div>
                </div>
              </div>
              <footer class="px-6 py-4 bg-zinc-50  border-t border-zinc-100  flex justify-end">
                 <a :href="`mailto:${expandedLead.email}?subject=Response from Viewora`" class="px-5 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98]">Reply via Email</a>
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
