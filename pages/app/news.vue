<template>
  <NuxtLayout name="app">
    <div class="news-page">

      <div class="news-header">
        <div>
          <h1 class="news-title">What's New</h1>
          <p class="news-sub">Product updates, improvements, and what's coming next.</p>
        </div>
        <a href="https://viewora.software/blog" target="_blank" rel="noopener" class="btn btn-secondary">
          Read Blog →
        </a>
      </div>

      <!-- Upcoming -->
      <div class="upcoming-banner">
        <div class="upcoming-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <div class="upcoming-title">Coming soon in v1.4</div>
          <div class="upcoming-items">
            <span class="upcoming-chip">Live analytics dashboard</span>
            <span class="upcoming-chip">Custom domain support</span>
            <span class="upcoming-chip">Lead capture on tours</span>
            <span class="upcoming-chip">Team collaboration</span>
            <span class="upcoming-chip">Paystack billing</span>
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="changelog">
        <div class="change-entry" v-for="entry in changelog" :key="entry.version">
          <div class="change-meta">
            <div class="change-version">{{ entry.version }}</div>
            <div class="change-date">{{ entry.date }}</div>
          </div>
          <div class="change-content">
            <div class="change-header">
              <h2 class="change-title">{{ entry.title }}</h2>
              <span :class="['change-type', `change-type--${entry.type}`]">{{ entry.type }}</span>
            </div>
            <p class="change-summary">{{ entry.summary }}</p>
            <ul class="change-items">
              <li v-for="(item, i) in entry.items" :key="i" class="change-item">
                <span :class="['change-item-dot', `change-item-dot--${item.kind}`]"></span>
                <span class="change-item-kind">{{ item.kind }}</span>
                {{ item.text }}
              </li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: "What's New | Viewora" })

const changelog = [
  {
    version: 'v1.3.0',
    date: 'March 2026',
    type: 'release',
    title: 'Auth improvements & dashboard polish',
    summary: 'Major auth reliability fix that ensures logged-in users are never wrongly bounced to the login page on refresh. New live dashboard with real stats, plus five fully-redesigned app pages.',
    items: [
      { kind: 'fix', text: 'Fixed session timing bug that caused hard-refresh redirects to /login' },
      { kind: 'fix', text: 'Google OAuth redirect now lands smoothly on the app without bouncing' },
      { kind: 'new', text: 'Dashboard redesigned with live stats, recent tours, and quick actions' },
      { kind: 'new', text: 'Analytics page with bar chart and tour performance table' },
      { kind: 'new', text: 'Users & Team page with role permissions overview' },
      { kind: 'new', text: 'Capture Services page with booking flow and FAQ' },
      { kind: 'new', text: "What's New changelog page (you're reading it now)" },
      { kind: 'new', text: 'Billing link restored in sidebar' },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'February 2026',
    type: 'release',
    title: 'Google OAuth & editor improvements',
    summary: 'Users can now sign in with Google in one click. The space editor received several UX fixes including smoother hotspot placement and better mobile layout.',
    items: [
      { kind: 'new', text: 'Google OAuth sign-in on both login and register pages' },
      { kind: 'new', text: '/confirm callback page with error-from-hash handling' },
      { kind: 'new', text: 'Editor: hotspot delete confirmation prompt' },
      { kind: 'new', text: 'Editor: keyboard shortcut Esc to cancel hotspot placement' },
      { kind: 'fix', text: 'Autocomplete attributes added to all auth forms' },
      { kind: 'fix', text: 'Register: immediate redirect when email confirmation is disabled' },
      { kind: 'fix', text: 'Sidebar scrollable on short screens' },
      { kind: 'improve', text: 'Mobile hamburger menu now closes on link click' },
    ],
  },
  {
    version: 'v1.1.0',
    date: 'January 2026',
    type: 'release',
    title: 'Spaces, Editor & public viewer',
    summary: 'The core product loop is complete. Users can create spaces, upload 360° panoramas, add hotspots in the editor, and share a public URL for their visitors to explore.',
    items: [
      { kind: 'new', text: 'Spaces dashboard with create, rename, publish, delete' },
      { kind: 'new', text: '3-panel space editor with Marzipano 360° viewer' },
      { kind: 'new', text: 'Drag-and-drop panorama upload to Cloudflare R2' },
      { kind: 'new', text: 'Hotspot placement (navigation & info types) with yaw/pitch' },
      { kind: 'new', text: 'Public /tours/[slug] viewer with scene switcher' },
      { kind: 'new', text: 'Publish/unpublish toggle with auto-generated slug' },
      { kind: 'new', text: 'App layout: light sidebar, dark ink theme' },
      { kind: 'improve', text: 'Spaces list: search, sort A→Z / newest / oldest, skeleton loaders' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'December 2025',
    type: 'launch',
    title: 'Initial launch',
    summary: 'Viewora goes live. Marketing site, authentication, Nuxt 3 + Cloudflare Pages setup, and the foundation for the virtual tours platform.',
    items: [
      { kind: 'new', text: 'Marketing site: Homepage, Product, Pricing, About, Contact' },
      { kind: 'new', text: 'Blog powered by @nuxt/content' },
      { kind: 'new', text: 'Legal pages: Terms & Privacy Policy' },
      { kind: 'new', text: 'Email/password authentication with Supabase' },
      { kind: 'new', text: 'Cloudflare D1 database + R2 storage backend' },
      { kind: 'new', text: 'Custom CSS design system with --accent #00dc82 theme' },
      { kind: 'new', text: 'KES pricing tiers: Basic 1,500 / Plus 4,000 / Pro 8,500 / Elite 18,000' },
    ],
  },
]
</script>

<style scoped>
.news-page { padding: 2rem; max-width: 860px; margin: 0 auto; }

.news-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
}
.news-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}
.news-sub { color: var(--slate); font-size: 0.95rem; margin: 0; }

/* Upcoming banner */
.upcoming-banner {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  background: var(--ink);
  border-radius: 0.875rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2.5rem;
}
.upcoming-icon {
  width: 36px; height: 36px;
  background: rgba(0,220,130,0.15);
  border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}
.upcoming-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--paper);
  margin-bottom: 0.6rem;
}
.upcoming-items { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.upcoming-chip {
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  border: 1px solid rgba(255,255,255,0.12);
}

/* Changelog */
.changelog { display: flex; flex-direction: column; gap: 0; }

.change-entry {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 2rem;
  padding-bottom: 2.5rem;
  position: relative;
}
.change-entry::before {
  content: '';
  position: absolute;
  left: 120px;
  top: 8px;
  bottom: 0;
  width: 1px;
  background: var(--border);
  margin-left: 2rem;
  margin-left: calc(2rem - 0.5px);
}
.change-entry:last-child::before { display: none; }

.change-meta { padding-top: 2px; }
.change-version {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--ink);
  font-family: var(--font-mono);
  margin-bottom: 0.25rem;
}
.change-date { font-size: 0.75rem; color: var(--text-muted); }

.change-content {
  background: var(--paper);
  border: 1px solid var(--border);
  border-radius: 0.875rem;
  padding: 1.5rem;
  position: relative;
}
.change-content::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 12px;
  width: 14px; height: 14px;
  background: var(--paper);
  border: 2px solid var(--border);
  border-radius: 50%;
}
.change-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.change-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
  letter-spacing: -0.01em;
}
.change-type {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
}
.change-type--release { background: var(--accent-dim); color: #008a50; }
.change-type--launch { background: #faf5ff; color: #7c3aed; }
.change-type--fix { background: #fef2f2; color: #b91c1c; }

.change-summary { font-size: 0.85rem; color: var(--slate); line-height: 1.65; margin: 0 0 1.25rem; }

.change-items { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.change-item { display: flex; align-items: baseline; gap: 0.6rem; font-size: 0.825rem; color: var(--slate); }
.change-item-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
}
.change-item-dot--new { background: var(--accent); }
.change-item-dot--fix { background: #f87171; }
.change-item-dot--improve { background: #60a5fa; }
.change-item-kind {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  min-width: 46px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .news-page { padding: 1rem; }
  .change-entry { grid-template-columns: 1fr; gap: 0.75rem; }
  .change-entry::before { display: none; }
  .change-content::before { display: none; }
  .change-meta { display: flex; align-items: center; gap: 0.75rem; }
}
</style>
