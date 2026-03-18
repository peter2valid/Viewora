<template>
  <div class="app-page">
    <div class="app-page-header">
      <div>
        <h1 class="app-page-title">Leads</h1>
        <p class="app-page-subtitle">Inquiries captured from your published tour pages.</p>
      </div>
    </div>

    <!-- Entitlement gate -->
    <div v-if="!planStore.can('lead_capture_enabled')" class="app-state-box app-state-box--info">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <p>
        Lead capture is available on the <strong>Plus</strong> plan and above.
        <NuxtLink to="/app/billing" style="color: var(--accent); font-weight: 600;">Upgrade your plan →</NuxtLink>
      </p>
    </div>

    <template v-else>
      <div v-if="pending" class="app-state-box">
        <div class="pv-loader"></div>
        <p>Fetching leads...</p>
      </div>

      <div v-else-if="leads.length === 0" class="app-state-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--slate);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="23 21 23 19 19 19 19 21"></polyline><path d="M19 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>
        <p>No leads yet. Leads are captured when visitors submit an inquiry form on your published tour page.</p>
        <NuxtLink to="/app/properties" class="btn btn-secondary" style="margin-top: 0.5rem;">View Properties →</NuxtLink>
      </div>

      <div v-else class="leads-table-container card">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Property</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id">
              <td class="text-xs text-muted">{{ formatDate(lead.created_at) }}</td>
              <td class="font-bold">{{ lead.properties?.title || 'Unknown' }}</td>
              <td>
                <div class="flex flex-col">
                  <span class="font-medium">{{ lead.name }}</span>
                  <span class="text-xs text-muted">{{ lead.email }}</span>
                  <span v-if="lead.phone" class="text-xs text-muted">{{ lead.phone }}</span>
                </div>
              </td>
              <td class="text-sm">{{ lead.message }}</td>
              <td>
                <span :class="['source-tag', `source-tag--${lead.source}`]">{{ lead.source }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'app', middleware: 'auth' })
useSeoMeta({ title: 'Leads | Viewora' })

const planStore = usePlanStore()
const { apiFetch } = useApiFetch()

const leads = ref<any[]>([])
const pending = ref(true)

onMounted(async () => {
  if (planStore.can('lead_capture_enabled')) {
    await fetchLeads()
  } else {
    pending.value = false
  }
})

async function fetchLeads() {
  pending.value = true
  try {
    const data = await apiFetch<any[]>('/leads')
    leads.value = data
  } catch (err) {
    console.error('Failed to fetch leads', err)
  } finally {
    pending.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<style scoped>
.leads-table-container {
  margin-top: 1.5rem;
  overflow-x: auto;
  padding: 0;
}

.leads-table {
  width: 100%;
  border-collapse: collapse;
}

.leads-table th {
  text-align: left;
  padding: 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.leads-table td {
  padding: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.leads-table tr:last-child td {
  border-bottom: none;
}

.source-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  background: #f1f5f9;
  text-transform: uppercase;
}

.source-tag--qr { background: #fee2e2; color: #991b1b; }
.source-tag--whatsapp { background: #dcfce7; color: #166534; }
.source-tag--embed { background: #dbeafe; color: #1e40af; }

.pv-loader { width: 30px; height: 30px; border: 3px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
