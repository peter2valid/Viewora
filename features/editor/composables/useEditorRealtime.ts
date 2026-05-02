import { useSupabaseClient } from '#imports'

export function useEditorRealtime(
  spaceId: string,
  onRefresh: () => void,
  isActive: () => boolean,
) {
  const supabase = useSupabaseClient()
  let channels: ReturnType<typeof supabase.channel>[] = []
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  function refreshSoon() {
    if (!isActive()) return
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      if (!isActive()) return
      onRefresh()
    }, 200)
  }

  function start() {
    stop()
    const scenesChannel = supabase
      .channel(`space:${spaceId}:scenes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scenes', filter: `property_id=eq.${spaceId}` },
        refreshSoon,
      )
      .subscribe()

    const hotspotsChannel = supabase
      .channel(`space:${spaceId}:hotspots`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotspots', filter: `property_id=eq.${spaceId}` },
        refreshSoon,
      )
      .subscribe()

    channels = [scenesChannel, hotspotsChannel]
  }

  function stop() {
    for (const ch of channels) void supabase.removeChannel(ch)
    channels = []
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
  }

  return { start, stop }
}
