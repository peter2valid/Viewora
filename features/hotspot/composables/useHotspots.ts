import { ref, readonly } from 'vue'
import type { Hotspot, HotspotCreatePayload } from '~/domain/hotspot'

export function useHotspots(initial: Hotspot[] = []) {
  const hotspots = ref<Hotspot[]>([...initial])

  function addHotspot(payload: HotspotCreatePayload): Hotspot {
    const hotspot: Hotspot = {
      id: crypto.randomUUID(),
      ...payload,
    }
    hotspots.value.push(hotspot)
    return hotspot
  }

  function removeHotspot(id: string) {
    hotspots.value = hotspots.value.filter(h => h.id !== id)
  }

  function updateHotspot(id: string, patch: Partial<Omit<Hotspot, 'id'>>) {
    const idx = hotspots.value.findIndex(h => h.id === id)
    if (idx !== -1) {
      hotspots.value[idx] = { ...hotspots.value[idx], ...patch }
    }
  }

  function resetHotspots(next: Hotspot[]) {
    hotspots.value = [...next]
  }

  return {
    hotspots: readonly(hotspots),
    addHotspot,
    removeHotspot,
    updateHotspot,
    resetHotspots,
  }
}
