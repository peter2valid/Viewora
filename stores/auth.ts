/**
 * stores/auth.ts
 *
 * Pinia store for the authenticated user's identity and profile.
 * Wraps the Supabase auth state so the rest of the app uses a single
 * consistent ref for "who is logged in" rather than calling
 * useSupabaseUser() everywhere.
 *
 * Usage:
 *   const auth = useAuthStore()
 *   auth.user          // Supabase auth user
 *   auth.profile       // profiles table row (full_name, avatar_url, etc.)
 *   auth.isLoggedIn    // boolean
 */
import { defineStore } from 'pinia'
import type { JwtPayload } from '@supabase/supabase-js'

export interface AppProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string | null
}

export const useAuthStore = defineStore('auth', () => {
  // ── State ────────────────────────────────────────────────────────────────
  // useSupabaseUser() returns JwtPayload (decoded JWT claims) not full User.
  // Use .sub for the user's UUID and .email for the email address.
  const user = ref<JwtPayload | null>(null)
  const profile = ref<AppProfile | null>(null)
  const profilePending = ref(false)
  const profileError = ref<string | null>(null)

  // ── Computed ─────────────────────────────────────────────────────────────
  const isLoggedIn = computed(() => !!user.value)

  const displayName = computed(
    () =>
      profile.value?.full_name ||
      user.value?.user_metadata?.full_name ||
      user.value?.user_metadata?.name ||
      user.value?.email?.split('@')[0] ||
      'User'
  )

  const avatarInitials = computed(() => {
    const name = displayName.value
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  })

  // ── Actions ──────────────────────────────────────────────────────────────
  function setUser(u: JwtPayload | null) {
    user.value = u
    if (!u) {
      profile.value = null
    }
  }

  async function fetchProfile() {
    if (!user.value) return
    profilePending.value = true
    profileError.value = null
    try {
      const { apiFetch } = useApiFetch()
      const data = await apiFetch<AppProfile>('/profile')
      profile.value = data
    } catch (e: any) {
      profileError.value = e.data?.statusMessage ?? e.message
    } finally {
      profilePending.value = false
    }
  }

  function $reset() {
    user.value = null
    profile.value = null
    profilePending.value = false
    profileError.value = null
  }

  return {
    user,
    profile,
    profilePending,
    profileError,
    isLoggedIn,
    displayName,
    avatarInitials,
    setUser,
    fetchProfile,
    $reset,
  }
})
