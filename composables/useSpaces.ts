/**
 * composables/useSpaces.ts
 *
 * All data access goes through /api/spaces/* server routes.
 * Server routes use Supabase Postgres (via serverDb()).
 *
 * Performance:
 * - Spaces list is cached in localStorage for instant paint on navigation
 * - Optimistic updates on create/delete (UI updates before server confirms)
 * - Stale-while-revalidate: shows cached data instantly, silently refreshes in bg
 */

const CACHE_KEY = 'viewora:spaces'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function readCache(): Space[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY); return null }
    return data as Space[]
  } catch { return null }
}

function writeCache(data: Space[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch { }
}

function clearCache() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(CACHE_KEY) } catch { }
}

export interface Space {
  id: string
  owner_id: string
  title: string
  panorama_key: string | null
  panorama_url: string | null   // presigned GET URL, only present on fetchSpace()
  is_published: boolean
  slug: string | null
  created_at: string
}

export const useSpaces = () => {
  const { apiFetch } = useApiFetch()

  const spaces = ref<Space[]>([])
  const currentSpace = ref<Space | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  // ── List ──────────────────────────────────────────────────────────────────
  const fetchSpaces = async ({ silent = false } = {}) => {
    // Instant cache hit — load from localStorage first
    const cached = readCache()
    if (cached && !silent) {
      spaces.value = cached
      // Still refresh in background (stale-while-revalidate)
    }
    if (!silent) pending.value = !cached // only show spinner if no cached data
    error.value = null
    try {
      const fresh = await apiFetch<Space[]>('/api/spaces')
      spaces.value = fresh
      writeCache(fresh)
    } catch (e: any) {
      if (!cached) error.value = e.data?.statusMessage ?? e.message
    } finally {
      pending.value = false
    }
  }

  // ── Single ────────────────────────────────────────────────────────────────
  const fetchSpace = async (id: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}`)
      currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const createSpace = async (payload: { title: string; description?: string }) => {
    pending.value = true
    error.value = null
    // Optimistic: add a placeholder immediately
    const tempId = `temp-${Date.now()}`
    const optimistic: Space = {
      id: tempId,
      owner_id: '',
      title: payload.title,
      panorama_key: null,
      panorama_url: null,
      is_published: false,
      slug: null,
      created_at: new Date().toISOString(),
    }
    spaces.value.unshift(optimistic)
    try {
      const data = await apiFetch<Space>('/api/spaces', { method: 'POST', body: payload })
      // Replace optimistic entry with real response
      const idx = spaces.value.findIndex(s => s.id === tempId)
      if (idx !== -1) spaces.value[idx] = data
      else spaces.value.unshift(data)
      writeCache(spaces.value)
      return data
    } catch (e: any) {
      // Roll back optimistic
      spaces.value = spaces.value.filter(s => s.id !== tempId)
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────
  const renameSpace = async (id: string, title: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}`, {
        method: 'PATCH',
        body: { title },
      })
      const idx = spaces.value.findIndex(s => s.id === id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteSpace = async (id: string) => {
    // Optimistic: remove immediately from list
    const removed = spaces.value.find(s => s.id === id)
    spaces.value = spaces.value.filter(s => s.id !== id)
    writeCache(spaces.value)
    try {
      await apiFetch(`/api/spaces/${id}`, { method: 'DELETE' })
    } catch (e: any) {
      // Roll back on failure
      if (removed) spaces.value.unshift(removed)
      error.value = e.data?.statusMessage ?? e.message
    }
  }

  // ── Toggle publish ────────────────────────────────────────────────────────
  const togglePublish = async (space: Space) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${space.id}/publish`, {
        method: 'POST',
        body: { publish: !space.is_published },
      })
      const idx = spaces.value.findIndex(s => s.id === space.id)
      if (idx !== -1) spaces.value[idx] = data
      if (currentSpace.value?.id === space.id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  // ── Publish with explicit slug ────────────────────────────────────────────
  const publishSpace = async (id: string, slug: string) => {
    pending.value = true
    error.value = null
    try {
      const data = await apiFetch<Space>(`/api/spaces/${id}/publish`, {
        method: 'POST',
        body: { publish: true, slug },
      })
      if (currentSpace.value?.id === id) currentSpace.value = data
      return data
    } catch (e: any) {
      error.value = e.data?.statusMessage ?? e.message
      return null
    } finally {
      pending.value = false
    }
  }

  return {
    spaces,
    currentSpace,
    pending,
    error,
    fetchSpaces,
    fetchSpace,
    createSpace,
    renameSpace,
    deleteSpace,
    togglePublish,
    publishSpace,
  }
}
