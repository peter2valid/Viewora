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
                <span v-if="lead.message" class="leads-msg-hint" :title="lead.message">
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
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted } from 'vue'

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
/* ── Page shell ─────────────────────────────────────────────────────────── */
.leads-page { padding: 2rem; }

.leads-header {
  margin-bottom: 1.5rem;
}

.leads-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink, #0a0a0a);
  margin: 0 0 0.2rem;
}

.leads-sub {
  font-size: 0.85rem;
  color: var(--slate, #6b7280);
  margin: 0;
}

/* ── Upgrade gate ───────────────────────────────────────────────────────── */
.leads-gate {
  max-width: 480px;
  margin: 4rem auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.leads-gate-icon {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.leads-gate-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink, #0a0a0a);
  margin: 0;
}

.leads-gate-body {
  font-size: 0.9rem;
  color: var(--slate, #6b7280);
  margin: 0;
  line-height: 1.6;
}

.leads-gate-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
  width: 100%;
}

.leads-gate-features li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
}

.leads-gate-cta { margin-top: 0.5rem; }

/* ── Toolbar ────────────────────────────────────────────────────────────── */
.leads-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.leads-search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 360px;
}

.leads-search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.leads-search-input {
  width: 100%;
  padding: 0.55rem 0.875rem 0.55rem 2.25rem;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--ink, #0a0a0a);
  background: #fff;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.15s;
}

.leads-search-input:focus { border-color: var(--accent, #00dc82); }

.leads-filter-select {
  padding: 0.55rem 2rem 0.55rem 0.75rem;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--ink, #0a0a0a);
  background: #fff;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  transition: border-color 0.15s;
}

.leads-filter-select:focus { border-color: var(--accent, #00dc82); }

/* ── Table ──────────────────────────────────────────────────────────────── */
.leads-table-wrap {
  overflow-x: auto;
  border: 1.5px solid var(--border, #e5e7eb);
  border-radius: 0.75rem;
  background: #fff;
}

.leads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.leads-table thead tr {
  border-bottom: 1.5px solid var(--border, #e5e7eb);
}

.leads-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--slate, #6b7280);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.leads-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.1s;
}

.leads-row:last-child { border-bottom: none; }
.leads-row:hover { background: #fafafa; }

.leads-table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
  color: var(--ink, #0a0a0a);
}

/* Name cell */
.leads-td-name { white-space: nowrap; }
.leads-name { font-weight: 500; }
.leads-msg-hint {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  color: #9ca3af;
  cursor: pointer;
  vertical-align: middle;
}
.leads-msg-hint:hover { color: var(--ink, #0a0a0a); }

/* Contact cell */
.leads-td-contact { min-width: 180px; }
.leads-email {
  display: block;
  color: var(--ink, #0a0a0a);
  text-decoration: none;
  font-weight: 500;
}
.leads-email:hover { text-decoration: underline; }
.leads-phone {
  display: block;
  font-size: 0.8rem;
  color: var(--slate, #6b7280);
  margin-top: 0.1rem;
}

/* Project badge */
.leads-project-badge {
  display: inline-block;
  background: #f3f4f6;
  color: #374151;
  border-radius: 0.35rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
}

.leads-no-project { color: #d1d5db; }

/* Source tag */
.leads-source-tag {
  display: inline-block;
  border-radius: 2rem;
  padding: 0.15rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.leads-source-tag--tour_page { background: #dbeafe; color: #1d4ed8; }
.leads-source-tag--qr_code   { background: #fef3c7; color: #92400e; }
.leads-source-tag--embed     { background: #f3e8ff; color: #6d28d9; }

/* Date cell */
.leads-td-date { white-space: nowrap; color: var(--slate, #6b7280); font-size: 0.82rem; }
.leads-updated-at { display: block; font-size: 0.72rem; color: #9ca3af; margin-top: 0.1rem; }

/* Actions cell */
.leads-td-actions { width: 40px; text-align: right; }
.leads-del-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #d1d5db;
  padding: 0.25rem;
  line-height: 0;
  border-radius: 0.25rem;
  transition: color 0.15s, background 0.15s;
}
.leads-del-btn:hover { color: #ef4444; background: #fef2f2; }

/* Skeleton rows */
.leads-skel-row td { padding: 0.875rem 1rem; }

/* Message modal */
.leads-message-text {
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.6;
  margin: 0 0 1rem;
  white-space: pre-wrap;
}
.leads-message-meta {
  font-size: 0.8rem;
  color: var(--slate, #6b7280);
}

/* Modal footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem 1.5rem;
}

/* Status badge (click-to-cycle) ─────────────────────────────────────────── */
.leads-td-status { white-space: nowrap; }

.leads-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1.5px solid transparent;
  border-radius: 2rem;
  padding: 0.22rem 0.55rem 0.22rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: filter 0.12s, opacity 0.15s;
  line-height: 1;
}

.leads-status-badge:not(:disabled):hover { filter: brightness(0.92); }
.leads-status-badge--busy { opacity: 0.65; cursor: wait; }
.leads-status-badge--readonly { cursor: default; }
.leads-status-badge--readonly .leads-status-cycle-icon { display: none; }

.leads-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: 0.6;
}

.leads-status-cycle-icon { opacity: 0.6; flex-shrink: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
.leads-status-spin { animation: spin 0.8s linear infinite; flex-shrink: 0; }

.leads-status-badge--new       { background: #f3f4f6; color: #374151; border-color: #d1d5db; }
.leads-status-badge--contacted { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
.leads-status-badge--qualified { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.leads-status-badge--closed    { background: #f3e8ff; color: #6d28d9; border-color: #e9d5ff; }

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 700px) {
  .leads-page { padding: 1rem; }
  /* Project (col 3) + Source (col 5) hidden on mobile */
  .leads-table th:nth-child(3),
  .leads-table td:nth-child(3) { display: none; }
  .leads-table th:nth-child(5),
  .leads-table td:nth-child(5) { display: none; }
}
</style>
