/**
 * Centralized error logger for tracking all errors across the app
 * Reports to both Sentry and PostHog
 */

export interface ErrorContext {
  component?: string
  feature?: string
  action?: string
  metadata?: Record<string, any>
  userId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface LoggedError {
  error: unknown
  context: ErrorContext
  timestamp: number
}

class ErrorLogger {
  private sentry: any = null
  private posthog: any = null
  private errorHistory: LoggedError[] = []
  private maxHistorySize = 50

  setSentryInstance(sentry: any) {
    this.sentry = sentry
  }

  setPosthogInstance(posthog: any) {
    this.posthog = posthog
  }

  /**
   * Log an error with context information
   */
  logError(error: unknown, context: ErrorContext = {}) {
    const timestamp = Date.now()
    const loggedError: LoggedError = { error, context, timestamp }

    // Keep history for debugging
    this.errorHistory.push(loggedError)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }

    // Extract error details
    const errorMessage = this.extractErrorMessage(error)
    const errorType = this.extractErrorType(error)

    // Report to Sentry
    if (this.sentry) {
      this.sentry.withScope((scope: any) => {
        scope.setLevel(context.severity || 'error')
        scope.setTag('component', context.component || 'unknown')
        scope.setTag('feature', context.feature || 'unknown')
        scope.setTag('action', context.action || 'unknown')
        scope.setTag('errorType', errorType)

        if (context.metadata) {
          scope.setContext('metadata', context.metadata)
        }
        if (context.userId) {
          scope.setUser({ id: context.userId })
        }

        this.sentry.captureException(error)
      })
    }

    // Report to PostHog
    if (this.posthog) {
      this.posthog.capture('error_occurred', {
        error_type: errorType,
        error_message: errorMessage,
        component: context.component,
        feature: context.feature,
        action: context.action,
        severity: context.severity || 'error',
        metadata: context.metadata,
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[${context.feature || 'APP'}] ${context.component || 'Unknown'}: ${errorMessage}`,
        {
          context,
          originalError: error,
        }
      )
    }

    return loggedError
  }

  /**
   * Log API errors specifically
   */
  logApiError(
    error: unknown,
    endpoint: string,
    method: string = 'GET',
    statusCode?: number,
    additionalContext: Omit<ErrorContext, 'feature'> = {}
  ) {
    return this.logError(error, {
      ...additionalContext,
      feature: 'API',
      component: additionalContext.component || endpoint,
      metadata: {
        endpoint,
        method,
        statusCode,
        ...(additionalContext.metadata || {}),
      },
      severity: statusCode && statusCode >= 500 ? 'high' : 'medium',
    })
  }

  /**
   * Log viewer-specific errors
   */
  logViewerError(
    error: unknown,
    context: Omit<ErrorContext, 'feature'> & { sceneId?: string } = {}
  ) {
    return this.logError(error, {
      ...context,
      feature: 'VIEWER',
      component: context.component || 'PsvViewer',
      metadata: {
        ...(context.metadata || {}),
        sceneId: context.sceneId,
      },
      severity: context.severity || 'high',
    })
  }

  /**
   * Log hotspot-related errors
   */
  logHotspotError(
    error: unknown,
    context: Omit<ErrorContext, 'feature'> & { hotspotId?: string; action?: string } = {}
  ) {
    return this.logError(error, {
      ...context,
      feature: 'HOTSPOT',
      component: context.component || 'HotspotSystem',
      metadata: {
        ...(context.metadata || {}),
        hotspotId: context.hotspotId,
      },
      severity: context.severity || 'medium',
    })
  }

  /**
   * Log editor-specific errors
   */
  logEditorError(
    error: unknown,
    context: Omit<ErrorContext, 'feature'> = {}
  ) {
    return this.logError(error, {
      ...context,
      feature: 'EDITOR',
      severity: context.severity || 'high',
    })
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): LoggedError[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = []
  }

  /**
   * Extract human-readable error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
      if ('message' in error) return String((error as any).message)
      if ('statusMessage' in error) return String((error as any).statusMessage)
      if ('error' in error) return String((error as any).error)
    }
    return String(error)
  }

  /**
   * Extract error type/name
   */
  private extractErrorType(error: unknown): string {
    if (error instanceof Error) return error.name || 'Error'
    if (error && typeof error === 'object' && 'type' in error) {
      return String((error as any).type)
    }
    if (typeof error === 'string') return 'StringError'
    return typeof error
  }
}

export const errorLogger = new ErrorLogger()
