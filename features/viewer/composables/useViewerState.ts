import { ref } from 'vue'

export type ViewerState = 'idle' | 'loading' | 'ready' | 'error'

// Viewer is a stateless renderer — this composable tracks only render lifecycle state.
// Tour data ownership and scene navigation live in features/tour/composables/useTour.ts.
export function useViewerState() {
  const state = ref<ViewerState>('idle')
  const error = ref<string | null>(null)

  function setLoading() {
    state.value = 'loading'
    error.value = null
  }

  function setReady() {
    state.value = 'ready'
    error.value = null
  }

  function setError(message: string) {
    state.value = 'error'
    error.value = message
  }

  function reset() {
    state.value = 'idle'
    error.value = null
  }

  return { state, error, setLoading, setReady, setError, reset }
}
