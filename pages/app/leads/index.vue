<template>
  <div class="app-page leads-page">

    <!-- Page header -->
    <div class="leads-header">
      <div>
        <h1 class="leads-title">Leads</h1>
        <p v-if="canCapture && !pending" class="leads-sub">
          {{ filteredLeads.length }} lead{{ filteredLeads.length !== 1 ? 's' : '' }}
          <template v-if="activeProject"> · {{ activeProject }}</template>
        </p>
      </div>
    </div>

    <!-- ── Upgrade wall ────────────────────────────────────────────────── -->
    <div v-if="!canCapture" class="leads-gate">
      <div class="leads-gate-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h2 class="leads-gate-title">Lead Capture is a Premium Feature</h2>
      <p class="leads-gate-body">
        Upgrade to <strong>Basic</strong> or higher to collect and manage enquiries from people who view your virtual tours.
      </p>
      <ul class="leads-gate-features">
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dc82" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Capture name, email and phone from tour visitors
        </li>
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dc82" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          See which tour generated each lead
        </li>
        <li>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dc82" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Export leads to your CRM or spreadsheet
        </li>
      </ul>
      <NuxtLink to="/app/billing" class="btn btn-primary leads-gate-cta">
        View Upgrade Plans
      </NuxtLink>
    </div>

    <!-- ── Leads content (entitled) ───────────────────────────────────── -->
    <template v-else>

      <!-- Toolbar -->
      <div class="leads-toolbar">
        <div class="leads-search-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="leads-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" type="text" class="leads-search-input" placeholder="Search by name or email…" autocomplete="off" />
        </div>
        <select v-model="projectFilter" class="leads-filter-select">
          <option value="">All projects</option>
          <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <select v-model="statusFilter" class="leads-filter-select">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="closed">Closed</option>
        </select>
        <button class="btn btn-outline ml-auto" @click="exportLeads" :disabled="!filteredLeads.length">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <!-- Error -->
      <div v-if="fetchError" class="app-state-box app-state-box--error">
        <p>{{ fetchError }}</p>
        <button class="btn btn-secondary" @click="loadLeads">Retry</button>
      </div>

      <!-- Loading skeleton -->
      <div v-else-if="pending" class="leads-table-wrap">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>Project</th><th>Status</th><th>Source</th><th>Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in 5" :key="n" class="leads-skel-row">
              <td><div class="skel-line" style="width:80px;height:13px"></div></td>
              <td><div class="skel-line" style="width:140px;height:13px"></div></td>
              <td><div class="skel-line" style="width:100px;height:13px"></div></td>
              <td><div class="skel-line" style="width:70px;height:13px"></div></td>
              <td><div class="skel-line" style="width:60px;height:13px"></div></td>
              <td><div class="skel-line" style="width:70px;height:13px"></div></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-else-if="!filteredLeads.length" class="app-state-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <p>{{ search || projectFilter || statusFilter ? 'No leads match your filters.' : 'No leads yet. Share your published tours to start capturing enquiries.' }}</p>
        <button v-if="search || projectFilter || statusFilter" class="btn btn-secondary" @click="search = ''; projectFilter = ''; statusFilter = ''">Clear filters</button>
      </div>

      <!-- Table -->
      <div v-else class="leads-table-wrap">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Project</th>
              <th>Status</th>
              <th>Source</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in filteredLeads" :key="lead.id" class="leads-row">
              <td class="leads-td-name">
                <span class="leads-name">{{ lead.name || '—' }}</span>
                <span v-if="lead.message" class="leads-msg-hint cursor-pointer hover:text-zinc-950 transition-colors" :title="lead.message" @click.stop="expandedLead = lead">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </span>
              </td>
              <td class="leads-td-contact">
                <a :href="`mailto:${lead.email}`" class="leads-email">{{ lead.email || '—' }}</a>
                <span v-if="lead.phone" class="leads-phone">{{ lead.phone }}</span>
              </td>
              <td class="leads-td-project">
                <span v-if="lead.projects" class="leads-project-badge">{{ (lead.projects as any).name }}</span>
                <span v-else class="leads-no-project">—</span>
              </td>
              <td class="leads-td-status">
                <button
                  class="leads-status-badge"
                  :class="[`leads-status-badge--${lead.status ?? 'new'}`, { 'leads-status-badge--busy': updatingStatusId === lead.id, 'leads-status-badge--readonly': !isAdmin }]"
                  :disabled="updatingStatusId === lead.id || !isAdmin"
                  :title="isAdmin ? `Advance to: ${formatStatus(cycleStatus(lead.status))}` : formatStatus(lead.status)"
                  @click="updateStatus(lead, cycleStatus(lead.status))"
                >
                  <span class="leads-status-dot"></span>
                  {{ formatStatus(lead.status) }}
                  <svg v-if="isAdmin && updatingStatusId !== lead.id" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="leads-status-cycle-icon"><polyline points="9 18 15 12 9 6"/></svg>
                  <svg v-else-if="updatingStatusId === lead.id" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="leads-status-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </button>
              </td>
              <td class="leads-td-source">
                <span class="leads-source-tag" :class="`leads-source-tag--${lead.source ?? 'tour_page'}`">
                  {{ formatSource(lead.source) }}
                </span>
              </td>
              <td class="leads-td-date">
                {{ formatDate(lead.created_at) }}
                <span v-if="lead.updated_at && lead.updated_at !== lead.created_at" class="leads-updated-at" :title="`Updated ${formatDate(lead.updated_at)}`">
                  · Updated {{ formatDate(lead.updated_at) }}
                </span>
              </td>
              <td class="leads-td-actions">
                <button
                  v-if="isAdmin"
                  class="leads-del-btn"
                  @click="confirmDelete(lead)"
                  title="Delete lead"
                  aria-label="Delete lead"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Message expand modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="expandedLead" class="modal-backdrop" @click.self="expandedLead = null">
            <div class="modal-card" style="max-width:480px">
              <div class="modal-header">
                <h3 class="modal-title">Message from {{ expandedLead.name }}</h3>
                <button class="modal-close" @click="expandedLead = null" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <p class="leads-message-text">{{ expandedLead.message }}</p>
                <div class="leads-message-meta">
                  <span>{{ expandedLead.email }}</span>
                  <span v-if="expandedLead.phone"> · {{ expandedLead.phone }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Delete confirm -->
        <Transition name="modal">
          <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
            <div class="modal-card" style="max-width:400px">
              <div class="modal-header">
                <h3 class="modal-title">Delete Lead</h3>
                <button class="modal-close" @click="deleteTarget = null" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="modal-body">
                <p>Remove the lead from <strong>{{ deleteTarget.name || deleteTarget.email }}</strong>? This cannot be undone.</p>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary" @click="deleteTarget = null">Cancel</button>
                <button class="btn btn-danger" :disabled="deleting" @click="handleDelete">
                  {{ deleting ? 'Deleting…' : 'Delete' }}
                </button>
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
