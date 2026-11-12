import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useApiFetch } from '~/composables/useApiFetch'
import { isRunning, type SpinLook, type SpinLookStatus } from '~/shared/utils/spinFinish'

const POLL_MS = 2000

/**
 * Studio finish for one spin (its main id: camera heights are finished with it). Reads the look,
 * asks the server for another, follows its progress and calls `onApplied` once the frames have
 * switched, so the editor reloads them.
 */
export function useSpinFinish(spinId: Ref<string | null>, onApplied: () => Promise<unknown> | void) {
  const { apiFetch } = useApiFetch()
  const status = ref<SpinLookStatus | null>(null)
  /** False when the API has no studio finish (an older deploy): the section is hidden. */
  const available = ref(true)
  const error = ref('')
  const asking = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let gen = 0

  const unwrap = <T = any>(v: any): T => (v && v.data !== undefined ? v.data : v)
  const msg = (e: any, fallback: string) => e?.data?.statusMessage || e?.response?._data?.statusMessage || fallback
  const code = (e: any) => e?.status ?? e?.statusCode ?? e?.response?.status

  function stop() { if (timer) clearTimeout(timer); timer = undefined }

  async function refresh(): Promise<void> {
    const id = spinId.value
    const my = gen
    if (!id) { status.value = null; return }
    try {
      const s = unwrap<SpinLookStatus>(await apiFetch(`/vehicle-spins/${id}/look`))
      if (my !== gen) return
      const wasRunning = isRunning(status.value?.progress)
      status.value = s
      available.value = true
      if (isRunning(s.progress)) { stop(); timer = setTimeout(refresh, POLL_MS) }
      else if (wasRunning) {
        stop()
        if (s.progress?.state === 'failed') error.value = s.progress.error || 'We could not finish the photos.'
        else await onApplied()
      }
    } catch (e: any) {
      if (my !== gen) return
      if (code(e) === 404 && !status.value) { available.value = false; return }
      // A dropped connection while polling: keep trying, the work carries on on the server.
      if (isRunning(status.value?.progress)) { stop(); timer = setTimeout(refresh, POLL_MS * 2) }
    }
  }

  async function apply(look: SpinLook) {
    const id = spinId.value
    if (!id || asking.value || isRunning(status.value?.progress)) return
    error.value = ''
    asking.value = true
    try {
      const res = unwrap<any>(await apiFetch(`/vehicle-spins/${id}/look`, { method: 'POST', body: { look } }))
      status.value = { ...(status.value ?? { look: 'original', behind: 0, total: 0 }), progress: res?.progress ?? { state: 'queued', look, done: 0, total: 0 } }
      stop()
      timer = setTimeout(refresh, POLL_MS)
    } catch (e: any) {
      if (code(e) === 409) { await refresh(); return }
      error.value = msg(e, 'Could not start. Check your connection and try again.')
    } finally {
      asking.value = false
    }
  }

  watch(spinId, () => { gen++; stop(); status.value = null; error.value = ''; refresh() }, { immediate: true })
  onBeforeUnmount(stop)

  return { status, available, error, asking, apply, refresh }
}
