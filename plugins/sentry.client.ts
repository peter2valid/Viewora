// Sentry error monitoring — activates when NUXT_PUBLIC_SENTRY_DSN is set.
// Uses dynamic import with any-typing so the build works without @sentry/vue installed.
export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  const dsn = (config.public as any).sentryDsn as string | undefined
  if (!dsn) return

  try {
    // Dynamic import — TypeScript resolves as any so the build succeeds without the package
    const Sentry: any = await import('@sentry/vue' as any)
    Sentry.init({
      app: nuxtApp.vueApp,
      dsn,
      environment: process.env.NODE_ENV ?? 'production',
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
    nuxtApp.vueApp.config.errorHandler = (err: unknown, _instance: any, info: any) => {
      Sentry.withScope((scope: any) => {
        scope.setExtra('componentInfo', info)
        Sentry.captureException(err)
      })
      console.error(err)
    }
  } catch {
    // @sentry/vue not installed — run: npm install @sentry/vue
  }
})
