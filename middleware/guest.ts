export default defineNuxtRouteMiddleware(async () => {
  if (process.dev) return navigateTo('/app/spaces')

  const user = useSupabaseUser()
  if (user.value) return navigateTo('/app/spaces')

  // Same async fallback as auth middleware — check real session before deciding
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    return navigateTo('/app/spaces')
  }
})
