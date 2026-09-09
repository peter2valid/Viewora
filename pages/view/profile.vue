<template>
  <div class="profile">
   <div class="profile__frame">
    <header class="profile__topbar">
      <NuxtLink to="/view" class="profile__back" aria-label="Back to Home">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </NuxtLink>
      <span class="profile__title">Profile</span>
      <button
        v-if="listings.length > 0"
        class="profile__share"
        aria-label="Share your saved listings"
        @click="shareCollection"
      >
        <svg v-if="!shareCopied" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4"/></svg>
        <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </header>

    <main class="profile__main">
      <!-- Account identity — real signed-in user, or a guest prompt. -->
      <section class="account-card" :class="{ 'account-card--skeleton': pending }" aria-label="Account">
        <template v-if="pending">
          <div class="account-card__avatar skeleton" />
          <div class="account-card__body">
            <div class="skeleton skeleton--line skeleton--short" />
            <div class="skeleton skeleton--line" />
          </div>
        </template>

        <template v-else-if="accountUser">
          <img v-if="accountAvatar" :src="accountAvatar" class="account-card__avatar" :alt="accountName" referrerpolicy="no-referrer" />
          <div v-else class="account-card__avatar account-card__avatar--fallback">{{ accountInitial }}</div>
          <div class="account-card__body">
            <p class="account-card__name">{{ accountName }}</p>
            <p v-if="accountUser.email" class="account-card__sub">{{ accountUser.email }}</p>
          </div>
          <button class="account-card__action" :disabled="signingOut" @click="handleSignOut">
            {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </template>

        <template v-else>
          <div class="account-card__avatar account-card__avatar--fallback">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
          </div>
          <div class="account-card__body">
            <p class="account-card__name">Browsing as a guest</p>
            <p class="account-card__sub account-card__sub--wrap">Sync saved listings</p>
          </div>
          <button class="account-card__action account-card__action--primary" :disabled="signingIn" @click="handleSignIn">
            <GoogleIcon />
            {{ signingIn ? 'Opening…' : 'Sign in' }}
          </button>
        </template>
      </section>
      <p v-if="authError" class="account-card__error">{{ authError }}</p>

      <p class="profile__section-label">Saved Listings</p>

      <div v-if="pending" class="profile__grid" aria-label="Loading saved listings" aria-busy="true">
        <div v-for="n in 4" :key="n" class="card card--skeleton">
          <div class="card__media skeleton" />
          <div class="card__body">
            <div class="skeleton skeleton--price" />
            <div class="skeleton skeleton--line" />
          </div>
        </div>
      </div>

      <div v-else-if="!signedIn || listings.length === 0" class="profile__state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        <p class="profile__state-text">Nothing saved yet</p>
        <p class="profile__state-sub">Tap the heart on a listing to keep it here.</p>
        <NuxtLink to="/view" class="profile__state-action">Browse listings</NuxtLink>
      </div>

      <div v-else class="profile__grid">
        <UiListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
      </div>
    </main>
   </div>

    <UiNavDock active="profile" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { ref, computed, onMounted, watch, h } from 'vue'
import { useHead, useSeoMeta, useSupabaseUser } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'
import { useAnonymousAuth } from '~/composables/useAnonymousAuth'
import type { Listing } from '~/utils/listingDisplay'

const { apiFetch } = useApiFetch()
const { init: initTheme } = useTheme()
onMounted(initTheme)

const supabaseUser = useSupabaseUser()
const { isAnonymous, claimWithGoogle, signInWithGoogle, signOut, readAuthErrorFromHash } = useAnonymousAuth()
const listings = ref<Listing[]>([])
// Distinguishes "still figuring out if there's a session at all" from "we
// checked, there genuinely isn't one" — an anonymous session that only
// exists for e.g. an earlier save on a different device wouldn't be known
// yet on first paint, same restore-race the detail page's Save button
// already accounts for.
const pending = ref(true)
const signedIn = ref(false)
const shareCopied = ref(false)

let checked = false
watch(supabaseUser, async (u) => {
  if (checked) return
  if (!u) {
    // No session at all (including anonymous) — nothing could have been
    // saved. Don't mint one just to look; that's what the Save button does.
    pending.value = false
    return
  }
  checked = true
  signedIn.value = true
  try {
    const result = await apiFetch<{ data: Listing[] }>('/saved')
    listings.value = result.data || []
  } catch {
    listings.value = []
  } finally {
    pending.value = false
  }
}, { immediate: true })

// ── Account identity ─────────────────────────────────────────────────────
// A real, non-anonymous session only — an anonymous session (e.g. from
// saving a listing before ever signing in) still shows the guest prompt,
// since it isn't a real account yet.
const accountUser = computed(() => (supabaseUser.value && !isAnonymous.value) ? supabaseUser.value : null)
const accountName = computed(() => {
  const meta = (accountUser.value?.user_metadata ?? {}) as Record<string, any>
  return meta.full_name || meta.name || accountUser.value?.email || 'Signed in'
})
const accountAvatar = computed(() => {
  const meta = (accountUser.value?.user_metadata ?? {}) as Record<string, any>
  return meta.avatar_url || meta.picture || null
})
const accountInitial = computed(() => accountName.value.charAt(0).toUpperCase())

const signingIn = ref(false)
const signingOut = ref(false)
const authError = ref<string | null>(null)

// claimWithGoogle()/signInWithGoogle() redirect to Google and back — a
// failure Supabase only detects after that round-trip (e.g. this Google
// account is already linked to a different Viewora account) arrives as an
// error in the URL hash on this remount, not as something handleSignIn()'s
// try/catch below could ever see.
onMounted(() => {
  const hashError = readAuthErrorFromHash()
  if (hashError) authError.value = hashError
})

async function handleSignIn() {
  if (signingIn.value) return
  signingIn.value = true
  authError.value = null
  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined
    // Anonymous session already exists (e.g. saved a listing earlier) —
    // upgrade it in place so those saves stay attached; otherwise it's a
    // plain first-time sign-in, nothing to preserve.
    if (isAnonymous.value) await claimWithGoogle(redirectTo)
    else await signInWithGoogle(redirectTo)
  } catch (e: any) {
    authError.value = e.message ?? 'Could not start sign-in. Try again.'
    signingIn.value = false
  }
}

async function handleSignOut() {
  if (signingOut.value) return
  signingOut.value = true
  authError.value = null
  try {
    await signOut()
    listings.value = []
    signedIn.value = false
  } catch (e: any) {
    authError.value = e.message ?? 'Could not sign out. Try again.'
  } finally {
    signingOut.value = false
  }
}

const GoogleIcon = () => h('svg', { viewBox: '0 0 24 24', width: '15', height: '15', 'aria-hidden': 'true' }, [
  h('path', { fill: '#4285F4', d: 'M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z' }),
  h('path', { fill: '#34A853', d: 'M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z' }),
  h('path', { fill: '#FBBC05', d: 'M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z' }),
  h('path', { fill: '#EA4335', d: 'M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.87 8.87 4.75 12 4.75Z' }),
])

// Same Web Share API first, clipboard fallback pattern as the detail
// page's Share button — see pages/view/p/[slug].vue.
async function shareCollection() {
  if (typeof window === 'undefined' || !listings.value.length) return
  const ids = listings.value.map((l) => l.id).join(',')
  const url = `${window.location.origin}/view/collection?ids=${ids}`
  const shareData = {
    title: 'Properties I saved on Viewora',
    text: `${listings.value.length} listing${listings.value.length === 1 ? '' : 's'} I saved on Viewora`,
    url,
  }
  if (navigator.share) {
    try { await navigator.share(shareData) } catch { /* cancelled */ }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
  } catch { /* nothing left to do silently */ }
}

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400..800&family=IBM+Plex+Mono:wght@500&display=swap',
    },
  ],
})

useSeoMeta({
  title: 'Profile — Viewora',
  description: 'Your saved property and vehicle tours on Viewora.',
})
</script>

<style scoped>
.profile {
  --ground: var(--vo-page);
  --sheet: var(--vo-surface);
  --sheet-2: var(--vo-elevated);
  --ink: var(--vo-text);
  --ink-soft: var(--vo-secondary);
  --ink-faint: var(--vo-muted);
  --line: var(--vo-border);
  --accent: var(--vo-text);
  --whatsapp: #25D366;
  --whatsapp-ink: #06210F;
  --font-display: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  min-height: 100vh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-display);
  padding-bottom: 100px;
}

.profile__frame {
  width: min(100% - 40px, 920px);
  margin: 0 auto;
}
@media (min-width: 1024px) {
  .profile__frame { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
}
.profile__topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ground);
  border-bottom: 1px solid var(--line);
  padding: max(16px, calc(env(safe-area-inset-top) + 8px)) 20px;
}
.profile__back {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--vo-radius-pill);
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
  flex: 0 0 auto;
}
.profile__title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  flex: 1 1 auto;
}
.profile__share {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border-radius: var(--vo-radius-pill);
  background: var(--sheet);
  border: 1px solid var(--line);
  color: var(--ink);
  flex: 0 0 auto;
  cursor: pointer;
}

.profile__main { padding: 20px 20px 0; }

.account-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; margin-bottom: 22px;
  border-radius: var(--vo-radius-lg); background: var(--sheet); border: 1px solid var(--line);
  box-shadow: var(--vo-shadow-sm);
}
.account-card__avatar {
  flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
}
.account-card__avatar.skeleton { border-radius: 50%; }
.account-card__avatar--fallback {
  display: flex; align-items: center; justify-content: center;
  background: var(--sheet-2); color: var(--ink-soft); font-weight: 800; font-size: 1rem;
}
.account-card__body { flex: 1 1 auto; min-width: 0; }
.account-card__name { font-weight: 800; font-size: 0.92rem; margin: 0; }
.account-card__sub { font-size: 0.78rem; color: var(--ink-faint); margin: 3px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The signed-in case truncates an arbitrary-length email — correct to
   force one line there. The guest-state copy is fixed, known text; letting
   it wrap instead of truncating means it never silently loses words if a
   narrower viewport or a translation makes it a few characters longer than
   whatever happened to fit here today (this is what was cutting "Sign in
   to sync saved listings across devices" down to "Sign in to sync sav…"
   on a 390px-wide phone). */
.account-card__sub--wrap { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.35; }
.account-card__action {
  flex: 0 0 auto; display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 14px; border-radius: var(--vo-radius-pill);
  background: var(--sheet-2); border: 1px solid var(--line); color: var(--ink);
  font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap;
}
.account-card__action:disabled { opacity: 0.6; cursor: default; }
.account-card__action--primary { background: var(--ink); color: var(--vo-inverse); border-color: transparent; }
.account-card__error { font-size: 0.78rem; color: #dc2626; margin: -14px 0 22px; }
.account-card--skeleton .account-card__body { display: flex; flex-direction: column; gap: 8px; }

.profile__section-label {
  font-family: var(--font-mono); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 12px;
}

/* Single column below 480px — same fix as pages/view/collection.vue's
   grid, same root cause: a fixed 2-column grid squeezes UiListingCard's
   price/facts text into a card too narrow for it on a phone. Not
   visible while testing with an empty saved-listings state; confirmed
   against the same card component's real overflow on the Collection page. */
.profile__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 480px) {
  .profile__grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 640px) {
  .profile__grid { grid-template-columns: repeat(3, 1fr); }
}

.profile__state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 6px;
  padding: 80px 20px;
  color: var(--ink-faint);
}
.profile__state-text { font-size: 0.95rem; font-weight: 700; color: var(--ink-soft); margin: 6px 0 0; }
.profile__state-sub { font-size: 0.82rem; margin: 0 0 8px; max-width: 28ch; }
.profile__state-action {
  margin-top: 6px;
  padding: 10px 18px;
  border-radius: var(--vo-radius-sm);
  background: var(--accent);
  color: var(--vo-inverse);
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
}

/* Loading skeleton — same pattern as pages/view/index.vue */
.card { background: var(--sheet); border-radius: var(--vo-radius-lg); overflow: hidden; border: 1px solid var(--line); }
.card__media { position: relative; aspect-ratio: 4 / 3; background: var(--sheet-2); }
.card__body { padding: 14px; }
.card--skeleton { pointer-events: none; }
.skeleton {
  position: relative; overflow: hidden;
  background: var(--sheet-2);
  border-radius: 4px;
}
.skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--vo-border-strong) 50%, transparent);
  transform: translateX(-100%);
  animation: skeleton-sweep 1.6s ease-in-out infinite;
}
.skeleton--price { height: 20px; width: 55%; margin: 0 0 11px; }
.skeleton--line { height: 12px; width: 40%; }
.skeleton--short { width: 45%; margin-bottom: 4px; }
@keyframes skeleton-sweep { to { transform: translateX(100%); } }
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
</style>
