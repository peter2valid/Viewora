// Nuxt 3 awaits all async plugins before starting the router.
// The @nuxtjs/supabase client plugin (enforce:'pre') creates the client and
// registers onAuthStateChange, but never awaits getSession() — so
// useSupabaseSession() is still null when the module's global auth-redirect
// middleware fires on a hard refresh.
// This plugin (enforce:'post') fills that gap: it reads the stored session from
// localStorage before the first navigation, so the global middleware sees the
// real session instead of null.
export default defineNuxtPlugin({
  name: 'supabase-session-init',
  enforce: 'post',
  async setup() {
    const supabase = useSupabaseClient()
    const session = useSupabaseSession()

    const { data } = await supabase.auth.getSession()
    if (data.session) {
      session.value = data.session
    }
  },
})
