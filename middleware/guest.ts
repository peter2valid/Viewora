export default defineNuxtRouteMiddleware(async () => {
  if (process.dev) return

  // A guest session (the WhatsApp bot's anonymous user) may still sign in or
  // create an account, e.g. to accept a delivered tour. Only a real account
  // is sent on to the app.
  const user = useSupabaseUser()
  if (user.value) return user.value.is_anonymous ? undefined : navigateTo('/app')

  // Same async fallback as auth middleware — check real session before deciding
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session && !session.user?.is_anonymous) {
    return navigateTo('/app')
  }
})
