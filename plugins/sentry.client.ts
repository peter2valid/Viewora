// Sentry error monitoring — activates when NUXT_PUBLIC_SENTRY_DSN is set.
// Uses dynamic import with any-typing so the build works without @sentry/vue installed.
import { errorLogger } from '~/utils/errorLogger'

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
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event: any, hint: any) {
        // Don't send errors in development unless explicitly allowed
        if (process.env.NODE_ENV === 'development') {
          return null
        }
        return event
      },
    })

    // Connect errorLogger to Sentry
    errorLogger.setSentryInstance(Sentry)

    // Capture all Vue component errors
    nuxtApp.vueApp.config.errorHandler = (err: unknown, instance: any, info: any) => {
      errorLogger.logError(err, {
        component: instance?.$options?.name || 'Unknown',
        action: info || 'component_error',
        severity: 'high',
      })
    }

    // Capture unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        errorLogger.logError(event.reason, {
          component: 'GlobalPromiseHandler',
          action: 'unhandled_rejection',
          severity: 'high',
        })
      })
    }
  } catch (err) {
    // @sentry/vue not installed — run: npm install @sentry/vue
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sentry not configured. Run: npm install @sentry/vue')
    }
  }
})
