<template>
  <div class="dash">

    <!-- Hero greeting -->
    <div class="dash-hero">
      <div class="dash-hero-text">
        <h1 class="dash-title">{{ greeting }}, {{ displayName }} 👋</h1>
        <p class="dash-sub">Manage your properties and track performance from here.</p>
      </div>
    </div>

    <!-- Stats row -->
    <div class="dash-stats">
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Properties</span>
          <div class="stat-icon-circle stat-icon-circle--blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
        <div v-if="!pending" class="stat-value">{{ summary?.total_properties ?? 0 }}</div>
        <div v-else class="stat-value stat-skel"></div>
        <div class="stat-trend">
          <NuxtLink to="/app/properties" class="stat-link">View all →</NuxtLink>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Published</span>
          <div class="stat-icon-circle stat-icon-circle--green">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>
          </div>
        </div>
        <div v-if="!pending" class="stat-value stat-value--accent">{{ summary?.published_properties ?? 0 }}</div>
        <div v-else class="stat-value stat-skel"></div>
        <div class="stat-trend">
          <span class="stat-desc">Live on the web</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Leads (7d)</span>
          <div class="stat-icon-circle stat-icon-circle--purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>
        <template v-if="!pending">
          <div v-if="planStore.can('lead_capture_enabled')" class="stat-value">{{ summary?.new_leads_7d ?? 0 }}</div>
          <div v-else class="stat-value stat-value--muted">—</div>
        </template>
        <div v-else class="stat-value stat-skel"></div>
        <div class="stat-trend">
          <NuxtLink v-if="!pending && !planStore.can('lead_capture_enabled')" to="/app/billing" class="stat-upgrade-link">Unlock with upgrade</NuxtLink>
          <NuxtLink v-else to="/app/leads" class="stat-link">View leads →</NuxtLink>
        </div>
      </div>

      <div class="stat-card stat-card--plan">
        <div class="stat-top">
          <span class="stat-label">Current Plan</span>
        </div>
        <div class="stat-value" style="text-transform: capitalize;">{{ planStore.plan?.name ?? 'Free' }}</div>
        <div class="stat-trend">
          <NuxtLink to="/app/billing" class="stat-upgrade-link">Upgrade plan →</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="dash-grid">

      <!-- Left column -->
      <div class="dash-left">

        <!-- Getting Started (for new users) -->
        <div v-if="!pending && recentProperties.length === 0" class="onboarding-card">
          <div class="onboarding-header">
            <h2 class="onboarding-title">Get started with Viewora</h2>
            <p class="onboarding-desc">Create your first property to start showcasing it with interactive 360° and 2D experiences.</p>
          </div>
          <div class="onboarding-steps">
            <div class="onboarding-step">
              <div class="onboarding-step-num">1</div>
              <div class="onboarding-step-body">
                <div class="onboarding-step-title">Create a property</div>
                <div class="onboarding-step-desc">Add a title and description for your listing.</div>
              </div>
            </div>
            <div class="onboarding-step">
              <div class="onboarding-step-num">2</div>
              <div class="onboarding-step-body">
                <div class="onboarding-step-title">Upload media</div>
                <div class="onboarding-step-desc">Add 360° panoramas or gallery images.</div>
              </div>
            </div>
            <div class="onboarding-step">
              <div class="onboarding-step-num">3</div>
              <div class="onboarding-step-body">
                <div class="onboarding-step-title">Publish & share</div>
                <div class="onboarding-step-desc">Go live with a public link, QR code, or embed.</div>
              </div>
            </div>
          </div>
          <NuxtLink to="/app/properties" class="btn btn-primary onboarding-cta">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create First Property
          </NuxtLink>
        </div>

        <!-- Recent Properties -->
        <div class="dash-panel">
          <div class="dash-panel-head">
            <h2 class="dash-panel-title">Recent Properties</h2>
            <NuxtLink to="/app/properties" class="dash-panel-action">View all →</NuxtLink>
          </div>

          <div v-if="pending" class="recent-list">
            <div v-for="n in 3" :key="n" class="recent-item recent-item--skel">
              <div class="recent-thumb skel-block"></div>
              <div class="recent-meta">
                <div class="skel-line" style="width:60%;height:14px;margin-bottom:6px;"></div>
                <div class="skel-line" style="width:35%;height:12px;"></div>
              </div>
            </div>
          </div>

          <div v-else-if="recentProperties.length === 0" class="recent-empty">
            <div class="recent-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <p class="recent-empty-text">No properties yet</p>
            <NuxtLink to="/app/properties" class="recent-empty-link">Create your first property →</NuxtLink>
          </div>

          <div v-else class="recent-list">
            <NuxtLink
              v-for="property in recentProperties"
              :key="property.id"
              :to="`/app/properties/${property.id}`"
              class="recent-item"
            >
              <div class="recent-thumb">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="recent-meta">
                <div class="recent-name">{{ property.title }}</div>
                <div class="recent-info">
                  <span :class="['recent-badge', property.is_published ? 'recent-badge--live' : 'recent-badge--draft']">
                    <span class="recent-badge-dot"></span>
                    {{ property.is_published ? 'Live' : 'Draft' }}
                  </span>
                  <span class="recent-date">{{ formatDate(property.created_at) }}</span>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="recent-arrow"><polyline points="9 18 15 12 9 6"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="dash-right">

        <!-- Shortcuts -->
        <div class="shortcuts-grid">
          <NuxtLink to="/app/properties" class="shortcut-card">
            <div class="shortcut-icon shortcut-icon--blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span class="shortcut-label">New Property</span>
          </NuxtLink>

          <NuxtLink to="/app/analytics" class="shortcut-card">
            <div class="shortcut-icon shortcut-icon--orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <span class="shortcut-label">Analytics</span>
          </NuxtLink>

          <NuxtLink to="/app/leads" class="shortcut-card">
            <div class="shortcut-icon shortcut-icon--green">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <span class="shortcut-label">Leads</span>
          </NuxtLink>

          <NuxtLink to="/app/settings" class="shortcut-card">
            <div class="shortcut-icon shortcut-icon--slate">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <span class="shortcut-label">Settings</span>
          </NuxtLink>
        </div>

        <!-- Upgrade CTA -->
        <div class="upgrade-card">
          <div class="upgrade-card-top">
            <div class="upgrade-plan-badge">{{ planStore.plan?.name ?? 'Free' }} Plan</div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="upgrade-sparkle"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h3 class="upgrade-card-title">Unlock more features</h3>
          <p class="upgrade-card-body">Get lead capture, advanced analytics, custom branding, embeds, and more.</p>
          <NuxtLink to="/app/billing" class="btn btn-primary upgrade-card-btn">
            Explore Plans
          </NuxtLink>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
import { ref, computed, onMounted } from 'vue'

useSeoMeta({ title: 'Dashboard | Viewora' })

const user = useSupabaseUser()
const planStore = usePlanStore()
const { apiFetch } = useApiFetch()
const { properties, fetchProperties } = useProperties()

// ── Dashboard summary ───────────────────────────────────────────────────────
interface Summary {
  total_properties: number
  published_properties: number
  new_leads_7d: number | null
  lead_capture_enabled: boolean
  total_views: number
  plan_name: string
}

const summary = ref<Summary | null>(null)
const pending = ref(true)

onMounted(async () => {
  pending.value = true
  try {
    const [sum] = await Promise.all([
      apiFetch<Summary>('/api/dashboard/summary'),
      fetchProperties(),
    ])
    summary.value = sum
    newLeadsCount.value = sum.new_leads_7d ?? 0
  } catch {
    // non-fatal — summary is optional
  } finally {
    pending.value = false
  }
})

// Global state for sidebar badge
const newLeadsCount = useState('newLeadsCount', () => 0)

// ── Derived ─────────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => {
  const u = user.value as any
  if (!u) return 'there'
  return u.user_metadata?.full_name || u.name || u.email?.split('@')[0] || 'there'
})

const recentProperties = computed(() =>
  [...properties.value]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<style scoped>
.dash { max-width: 1100px; margin: 0 auto; }

/* ── Hero ── */
.dash-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
}
.dash-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.3;
}
.dash-sub {
  color: var(--slate);
  font-size: 0.9rem;
  margin: 0.25rem 0 0;
}

/* ── Stats ── */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.875rem;
  margin-bottom: 1.75rem;
}

.stat-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  border-color: var(--border-sharp);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--slate);
  letter-spacing: 0.01em;
}

.stat-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon-circle--blue { background: #eff6ff; color: #3b82f6; }
.stat-icon-circle--green { background: #f0fdf4; color: #16a34a; }
.stat-icon-circle--purple { background: #faf5ff; color: #7c3aed; }

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--ink);
  line-height: 1;
}
.stat-value--accent { color: var(--accent); }
.stat-value--muted { color: var(--slate-light); }

.stat-skel {
  width: 48px;
  height: 36px;
  background: linear-gradient(90deg, var(--border) 25%, var(--paper-alt) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 18px;
}
.stat-link {
  font-size: 0.75rem;
  color: var(--slate);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}
.stat-link:hover { color: var(--ink); }
.stat-desc {
  font-size: 0.72rem;
  color: var(--slate-light);
}
.stat-upgrade-link {
  font-size: 0.75rem;
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
.stat-upgrade-link:hover { opacity: 0.8; }

.stat-card--plan {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-color: #1e293b;
}
.stat-card--plan .stat-label { color: #94a3b8; }
.stat-card--plan .stat-value { color: #f8fafc; }
.stat-card--plan .stat-upgrade-link { color: var(--accent); }

/* ── Main Grid ── */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.25rem;
  align-items: start;
}
.dash-left { display: flex; flex-direction: column; gap: 1.25rem; }
.dash-right { display: flex; flex-direction: column; gap: 1rem; }

/* ── Onboarding Card ── */
.onboarding-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.5rem;
}
.onboarding-header { margin-bottom: 1.25rem; }
.onboarding-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 0.375rem;
}
.onboarding-desc {
  font-size: 0.875rem;
  color: var(--slate);
  margin: 0;
  line-height: 1.5;
}

.onboarding-steps { display: flex; flex-direction: column; gap: 0.875rem; margin-bottom: 1.25rem; }
.onboarding-step {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}
.onboarding-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.onboarding-step-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}
.onboarding-step-desc {
  font-size: 0.8rem;
  color: var(--slate);
  margin-top: 0.125rem;
}
.onboarding-cta {
  display: inline-flex;
  align-items: center;
}

/* ── Panels ── */
.dash-panel {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}
.dash-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.125rem;
  border-bottom: 1px solid var(--border);
}
.dash-panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.dash-panel-action {
  font-size: 0.78rem;
  color: var(--slate);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}
.dash-panel-action:hover { color: var(--ink); }

/* ── Recent list ── */
.recent-list { padding: 0.25rem 0; }
.recent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.125rem;
  text-decoration: none;
  color: inherit;
  transition: background 0.12s;
}
.recent-item:hover { background: var(--paper-dim); }
.recent-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--paper-alt);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--slate-light);
  flex-shrink: 0;
}
.recent-meta { flex: 1; min-width: 0; }
.recent-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-info { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.15rem; }
.recent-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
}
.recent-badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.recent-badge--live { background: rgba(0, 220, 130, 0.12); color: #008a50; }
.recent-badge--draft { background: var(--border); color: var(--slate); }
.recent-date { font-size: 0.72rem; color: var(--slate-light); }
.recent-arrow { color: var(--border-sharp); flex-shrink: 0; }

/* Empty state */
.recent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.5rem;
  text-align: center;
}
.recent-empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--paper-alt);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--border-sharp);
  margin-bottom: 0.75rem;
}
.recent-empty-text { font-size: 0.875rem; color: var(--slate); margin: 0 0 0.5rem; }
.recent-empty-link { font-size: 0.8rem; color: var(--accent); text-decoration: none; font-weight: 500; }
.recent-empty-link:hover { opacity: 0.8; }

/* Skeletons */
.recent-item--skel { pointer-events: none; }
.skel-block {
  background: linear-gradient(90deg, var(--border) 25%, var(--paper-alt) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skel-line {
  border-radius: 4px;
  display: block;
  background: linear-gradient(90deg, var(--border) 25%, var(--paper-alt) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

/* ── Shortcuts ── */
.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem;
}
.shortcut-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.125rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  text-decoration: none;
  color: var(--ink);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.shortcut-card:hover {
  border-color: var(--border-sharp);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}
.shortcut-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.shortcut-icon--blue { background: #eff6ff; color: #3b82f6; }
.shortcut-icon--orange { background: #fff7ed; color: #ea580c; }
.shortcut-icon--green { background: #f0fdf4; color: #16a34a; }
.shortcut-icon--slate { background: #f1f5f9; color: #475569; }

.shortcut-label { font-size: 0.78rem; font-weight: 600; color: var(--ink); }

/* ── Upgrade CTA ── */
.upgrade-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 0.75rem;
  padding: 1.25rem;
  color: #f8fafc;
}
.upgrade-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.upgrade-plan-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
}
.upgrade-sparkle { color: #fbbf24; }
.upgrade-card-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 0.375rem;
  color: #f8fafc;
}
.upgrade-card-body {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0 0 1rem;
}
.upgrade-card-btn {
  width: 100%;
  justify-content: center;
  font-size: 0.85rem;
  padding: 0.55rem 1rem;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 900px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-grid { grid-template-columns: 1fr; }
  .shortcuts-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 500px) {
  .dash-stats { grid-template-columns: 1fr 1fr; }
  .shortcuts-grid { grid-template-columns: 1fr 1fr; }
}
</style>
