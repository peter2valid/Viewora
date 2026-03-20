export default defineNuxtRouteMiddleware(async () => {
  // ⚠️ DEV BYPASS: Auth check is skipped in development for convenience.
  // Comment this line out to test auth redirect flows locally.
  if (process.dev) return

  const user = useSupabaseUser()
  if (user.value) return

  // On client-side-only pages the useState is null until the plugin loads.
  // Fall back to getSession() which reads from localStorage synchronously.
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return navigateTo('/login')
  }
})
