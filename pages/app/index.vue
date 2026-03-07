<template>
  <NuxtLayout name="app">
    <div class="dash">

      <!-- Hero bar -->
      <div class="dash-hero">
        <div>
          <h1 class="dash-title">{{ greeting }}, {{ displayName }}</h1>
          <p class="dash-sub">Here's an overview of your Viewora workspace.</p>
        </div>
        <NuxtLink to="/app/spaces" class="btn btn-dark dash-cta">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.4rem"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Tour
        </NuxtLink>
      </div>

      <!-- Stats -->
      <div class="dash-stats">
        <div class="stat-card">
          <div class="stat-icon" style="background:#f0fdf4; color:#16a34a;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-body">
            <div class="stat-value" v-if="!pending">{{ totalSpaces }}</div>
            <div class="stat-value stat-skel" v-else></div>
            <div class="stat-label">Total Tours</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#ecfdf5; color:#00a060;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
          </div>
          <div class="stat-body">
            <div class="stat-value stat-value--live" v-if="!pending">{{ publishedSpaces }}</div>
            <div class="stat-value stat-skel" v-else></div>
            <div class="stat-label">Published</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#eff6ff; color:#2563eb;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">—</div>
            <div class="stat-label">Total Views</div>
            <div class="stat-note">Analytics coming soon</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background:#faf5ff; color:#7c3aed;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">Free</div>
            <div class="stat-label">Your Plan</div>
            <NuxtLink to="/app/billing" class="stat-upgrade">Upgrade →</NuxtLink>
          </div>
        </div>
      </div>

      <!-- Main grid: Recent Tours + Aside -->
      <div class="dash-grid">

        <!-- Recent Tours -->
        <div class="dash-panel">
          <div class="dash-panel-head">
            <h2 class="dash-panel-title">Recent Tours</h2>
            <NuxtLink to="/app/spaces" class="dash-panel-link">View all →</NuxtLink>
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

          <div v-else-if="recentSpaces.length === 0" class="recent-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--border-sharp);margin-bottom:0.75rem;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <p>No tours yet. <NuxtLink to="/app/spaces" style="color:var(--accent);font-weight:500;">Create your first one →</NuxtLink></p>
          </div>

          <div v-else class="recent-list">
            <NuxtLink
              v-for="space in recentSpaces"
              :key="space.id"
              :to="`/app/spaces/${space.id}/editor`"
              class="recent-item"
            >
              <div class="recent-thumb">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
              </div>
              <div class="recent-meta">
                <div class="recent-name">{{ space.title }}</div>
                <div class="recent-info">
                  <span :class="['recent-badge', space.is_published ? 'recent-badge--live' : 'recent-badge--draft']">
                    {{ space.is_published ? 'Published' : 'Draft' }}
                  </span>
                  <span class="recent-date">{{ formatDate(space.created_at) }}</span>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="recent-arrow"><polyline points="9 18 15 12 9 6"/></svg>
            </NuxtLink>
          </div>
        </div>

        <!-- Aside -->
        <div class="dash-aside">

          <!-- Quick Actions -->
          <div class="dash-panel">
            <div class="dash-panel-head">
              <h2 class="dash-panel-title">Quick Actions</h2>
            </div>
            <div class="quick-actions">
              <NuxtLink to="/app/spaces" class="quick-action">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create New Tour
              </NuxtLink>
              <NuxtLink to="/app/services" class="quick-action">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Book Capture Service
              </NuxtLink>
              <NuxtLink to="/app/analytics" class="quick-action">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="16" width="4" height="4"/><rect x="10" y="8" width="4" height="12"/><rect x="16" y="2" width="4" height="18"/></svg>
                View Analytics
              </NuxtLink>
              <NuxtLink to="/app/settings" class="quick-action">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 6.6V5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Account Settings
              </NuxtLink>
            </div>
          </div>

          <!-- Upgrade nudge -->
          <div class="upgrade-banner">
            <div class="upgrade-badge">Free Plan</div>
            <h3 class="upgrade-title">Unlock the full platform</h3>
            <p class="upgrade-body">Upgrade to Basic or Pro for unlimited tours, custom domains, lead capture, and priority support.</p>
            <NuxtLink to="/app/billing" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:0.25rem;">
              View Plans
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Dashboard | Viewora' })

const user = useSupabaseUser()
const { spaces, pending, fetchSpaces } = useSpaces()

onMounted(() => fetchSpaces())

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

const totalSpaces = computed(() => spaces.value.length)
const publishedSpaces = computed(() => spaces.value.filter((s: any) => s.is_published).length)
const recentSpaces = computed(() =>
  [...spaces.value]
    .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
)

const formatDate = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.dash { padding: 2rem; max-width: 1200px; margin: 0 auto; }

/* Hero */
.dash-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.dash-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}
.dash-sub { color: var(--slate); font-size: 0.95rem; margin: 0; }
.dash-cta { display: flex; align-items: center; }

/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-card {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-body { flex: 1; min-width: 0; }
.stat-value {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--ink);
  line-height: 1;
  margin-bottom: 0.25rem;
}
.stat-value--live { color: var(--accent); }
.stat-skel {
  width: 48px;
  height: 32px;
  background: var(--border);
  border-radius: 4px;
  animation: shimmer 1.4s infinite;
  background: linear-gradient(90deg, var(--border) 25%, var(--paper-alt) 50%, var(--border) 75%);
  background-size: 200% 100%;
}
.stat-label { font-size: 0.8rem; color: var(--slate); font-weight: 500; }
.stat-note { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem; }
.stat-upgrade {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
  margin-top: 0.2rem;
  display: inline-block;
}

/* Grid */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.5rem;
  align-items: start;
}
.dash-aside { display: flex; flex-direction: column; gap: 1rem; }

/* Panel */
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
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.dash-panel-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}
.dash-panel-link { font-size: 0.8rem; color: var(--slate); text-decoration: none; }
.dash-panel-link:hover { color: var(--ink); }

/* Recent list */
.recent-list { padding: 0.5rem 0; }
.recent-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: background 0.12s;
}
.recent-item:hover { background: var(--paper-dim); }
.recent-thumb {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  background: var(--paper-alt);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--border-sharp);
  flex-shrink: 0;
}
.recent-meta { flex: 1; min-width: 0; }
.recent-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-info { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem; }
.recent-badge {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
}
.recent-badge--live { background: var(--accent-dim); color: #008a50; }
.recent-badge--draft { background: var(--border); color: var(--slate); }
.recent-date { font-size: 0.75rem; color: var(--text-muted); }
.recent-arrow { color: var(--border-sharp); flex-shrink: 0; }
.recent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--slate);
  font-size: 0.875rem;
}

/* Skeleton items */
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

/* Quick Actions */
.quick-actions { padding: 0.5rem 0; }
.quick-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
  transition: background 0.12s;
}
.quick-action:hover { background: var(--paper-dim); }
.quick-action svg { color: var(--slate); flex-shrink: 0; }

/* Upgrade banner */
.upgrade-banner {
  background: var(--ink);
  border-radius: 0.75rem;
  padding: 1.5rem;
  color: var(--paper);
}
.upgrade-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.15);
  padding: 0.2rem 0.5rem;
  border-radius: 99px;
  margin-bottom: 0.75rem;
}
.upgrade-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--paper); }
.upgrade-body { font-size: 0.825rem; color: rgba(255,255,255,0.6); line-height: 1.5; margin: 0 0 1rem; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 900px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-grid { grid-template-columns: 1fr; }
}
@media (max-width: 500px) {
  .dash-stats { grid-template-columns: 1fr 1fr; }
  .dash { padding: 1rem; }
}
</style>
