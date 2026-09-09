/**
 * composables/useAnonymousAuth.ts
 *
 * Lets someone create and publish a tour before they have an account.
 * `ensureSession()` silently starts a real Supabase anonymous session
 * (a real user_id, real JWT) if none exists yet — every existing backend
 * route (`/spaces`, `/uploads/*`, quota checks) treats it exactly like a
 * normal logged-in user, so nothing downstream needs to know the difference.
 *
 * Requires "Anonymous sign-ins" enabled in the Supabase project's Auth settings.
 */
export const useAnonymousAuth = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const { apiFetch } = useApiFetch()

  const isAnonymous = computed(() => Boolean((user.value as any)?.is_anonymous))

  const ensureSession = async () => {
    if (user.value) return user.value

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.user
  }

  // Upgrades the current anonymous session to a permanent account via Google.
  // Same user_id throughout, so anything already created stays attached —
  // there is no ownership transfer step.
  const claimWithGoogle = async (redirectTo?: string) => {
    const { error } = await (supabase.auth as any).linkIdentity({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    })
    if (error) throw error
  }

  // Plain Google sign-in for a visitor with no session at all yet — nothing
  // anonymous to preserve, so this is a normal OAuth sign-in rather than
  // claimWithGoogle's linkIdentity upgrade path.
  const signInWithGoogle = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Redeems a one-time claim token (from a bot-sent "?claim=..." listing
  // link — see VIEWORA_ARCHITECTURE_AUDIT.md §11/§23) into a real browser
  // session for the anonymous Supabase user the bot conversation already
  // created. This is what lets a WhatsApp/Telegram-created listing be
  // claimed via the exact same claimWithGoogle() flow as a web-anonymous
  // one, without ever exposing the bot's long-lived stored refresh token —
  // the backend mints and returns a fresh, single-purpose session instead.
  const redeemClaimToken = async (token: string) => {
    const result = await apiFetch<{ access_token: string; refresh_token: string }>('/claim/redeem', {
      method: 'POST',
      body: { token },
    })
    const { error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })
    if (error) throw error
  }

  return { isAnonymous, ensureSession, claimWithGoogle, signInWithGoogle, signOut, redeemClaimToken, readAuthErrorFromHash }
}

// Supabase's OAuth flows (linkIdentity/signInWithOAuth) surface some
// failures — most notably a Google identity that's already linked to a
// DIFFERENT Viewora account (Supabase's identity-uniqueness rule: one
// Google account can only ever be linked to one Supabase user) — only
// after the full Google round-trip completes, appended to the redirect
// URL's hash (#error=...&error_code=...&error_description=...) rather
// than as a JS exception claimWithGoogle()/signInWithGoogle() above could
// ever catch. Call this on mount wherever those are triggered from, so
// this class of failure gets a plain-language message instead of leaving
// a raw Supabase error sitting in the address bar.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  identity_already_exists:
    'This Google account is already linked to a different Viewora account. Sign in with it directly instead, or use a different Google account to claim this listing.',
  manual_linking_disabled:
    'Sign-in isn’t fully set up yet on this listing — please try again in a moment, or contact support if this keeps happening.',
}

function readAuthErrorFromHash(): string | null {
  if (typeof window === 'undefined' || !window.location.hash.includes('error')) return null
  const params = new URLSearchParams(window.location.hash.slice(1))
  const code = params.get('error_code')
  const description = params.get('error_description')
  // One-time redirect artifact — clear it so reloading or re-sharing this
  // URL doesn't keep re-surfacing a stale error.
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  if (!code && !description) return null
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  return description ? decodeURIComponent(description.replace(/\+/g, ' ')) : 'Sign-in failed. Please try again.'
}
