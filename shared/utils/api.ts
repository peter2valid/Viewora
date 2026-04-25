export function unwrapApiData<T = any>(value: any): T {
  if (value && typeof value === 'object') {
    if ('data' in value && value.data !== undefined) return value.data as T
    if ('result' in value && value.result !== undefined) return value.result as T
  }
  return value as T
}

export function toArrayPayload<T = any>(value: any, key?: string): T[] {
  const unwrapped = unwrapApiData<any>(value)
  if (Array.isArray(unwrapped)) return unwrapped as T[]
  if (unwrapped && typeof unwrapped === 'object') {
    if (key && Array.isArray(unwrapped[key])) return unwrapped[key] as T[]
    if (Array.isArray(unwrapped.items)) return unwrapped.items as T[]
    if (Array.isArray(unwrapped.rows)) return unwrapped.rows as T[]
    if (Array.isArray(unwrapped.results)) return unwrapped.results as T[]
  }
  return []
}
