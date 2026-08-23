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

  return { isAnonymous, ensureSession, claimWithGoogle, signInWithGoogle, signOut }
}
