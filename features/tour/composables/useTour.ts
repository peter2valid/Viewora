import { ref, computed } from 'vue'
import type { TourData } from '~/shared/types'

// Central composable for tour data access within the viewer.
// Editor uses features/editor composables — do not conflate the two.
export function useTour(initial?: TourData) {
  const tour = ref<TourData | null>(initial ?? null)
  const activeSceneIndex = ref(0)

  const activeScene = computed(
    () => tour.value?.scenes[activeSceneIndex.value] ?? null
  )

  const sceneCount = computed(() => tour.value?.scenes.length ?? 0)

  function goToScene(index: number) {
    if (index >= 0 && index < sceneCount.value) {
      activeSceneIndex.value = index
    }
  }

  function setTour(data: TourData) {
    tour.value = data
    activeSceneIndex.value = 0
  }

  return { tour, activeScene, activeSceneIndex, sceneCount, goToScene, setTour }
}
