/**
 * Retries a step that can fail for reasons outside our control (connection
 * drop, server restart, database outage) instead of leaving it to fail or
 * hang. Errors the user has to act on (4xx: limits, auth, bad input) are not
 * retried.
 */

/** Waits between attempts: 2s, 5s, 15s, 30s — rides out a short outage. */
export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000]

export function isRetryableError(err: any): boolean {
  const status = err?.response?.status ?? err?.statusCode ?? err?.status
  if (typeof status === 'number' && status > 0) {
    return status === 408 || status === 425 || status === 429 || status >= 500
  }
  // No HTTP status: network failure, timeout or abort-by-timeout.
  return true
}

export async function withRetry<T>(
  step: (attempt: number) => Promise<T>,
  opts: { delays?: number[]; retryable?: (err: any) => boolean; onRetry?: (err: any, attempt: number) => void; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T> {
  const delays = opts.delays ?? RETRY_DELAYS_MS
  const retryable = opts.retryable ?? isRetryableError
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  for (let attempt = 0; ; attempt++) {
    try {
      return await step(attempt)
    } catch (err) {
      if (attempt >= delays.length || !retryable(err)) throw err
      opts.onRetry?.(err, attempt + 1)
      await sleep(delays[attempt])
    }
  }
}
