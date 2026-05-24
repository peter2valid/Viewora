/**
 * composable/useErrorTracking.ts
 * 
 * Provides easy access to error logging throughout the app
 */

import { errorLogger, type ErrorContext } from '~/utils/errorLogger'

export const useErrorTracking = () => {
  return {
    /**
     * Log a generic error
     */
    logError: (error: unknown, context?: ErrorContext) => errorLogger.logError(error, context),

    /**
     * Log an API error
     */
    logApiError: (
      error: unknown,
      endpoint: string,
      method?: string,
      statusCode?: number,
      context?: Omit<ErrorContext, 'feature'>
    ) => errorLogger.logApiError(error, endpoint, method, statusCode, context),

    /**
     * Log a viewer error
     */
    logViewerError: (
      error: unknown,
      context?: Omit<ErrorContext, 'feature'> & { sceneId?: string }
    ) => errorLogger.logViewerError(error, context),

    /**
     * Log a hotspot error
     */
    logHotspotError: (
      error: unknown,
      context?: Omit<ErrorContext, 'feature'> & { hotspotId?: string }
    ) => errorLogger.logHotspotError(error, context),

    /**
     * Log an editor error
     */
    logEditorError: (error: unknown, context?: Omit<ErrorContext, 'feature'>) =>
      errorLogger.logEditorError(error, context),

    /**
     * Get error history for debugging
     */
    getErrorHistory: () => errorLogger.getErrorHistory(),

    /**
     * Clear error history
     */
    clearErrorHistory: () => errorLogger.clearErrorHistory(),
  }
}
