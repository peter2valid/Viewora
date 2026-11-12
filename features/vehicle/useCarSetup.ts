import { computed } from 'vue'
import { useState } from '#imports'
import { useApiFetch } from '~/composables/useApiFetch'

export interface CarSetup {
  title: string
  slug: string | null
  is_published: boolean
  spins: Array<{ id: string | null; title: string; frames: number }>
  spins_ready: boolean
  interior_scenes: number
  interior_ready: number
  detail_photos: Array<{ id: string; url: string; caption: string | null; processing_status?: string }>
  captions_ready: boolean
  vehicle: {
    year: number | null
    mileage_km: number | null
    transmission: string | null
    fuel_type: string | null
    price_kes: number | null
    vin: string | null
    make: string | null
    model: string | null
    trim: string | null
  }
}

export type CarStepKey = 'car' | 'tour' | 'photos' | 'details' | 'publish'

export interface CarStep {
  key: CarStepKey
  /** The editor tab that does this step. */
  tab: 'car' | 'tour' | 'photos' | 'details'
  n: number
  title: string
  optional: boolean
  done: boolean
  /** What is there now, or what to do next. */
  status: string
}

/** Enough exterior to turn the car: a spin, or the eight main angles. */
export const EXTERIOR_DONE_FRAMES = 8
/** A tour feels complete with a few close-ups (wheels, dashboard, seats...). */
export const DETAIL_PHOTOS_GOAL = 3

export function carSteps(s: CarSetup | null): CarStep[] {
  const frames = s?.spins?.reduce((n, sp) => n + sp.frames, 0) ?? 0
  const spinCount = s?.spins?.filter(sp => sp.frames > 0).length ?? 0
  const photos = s?.detail_photos ?? []
  const named = photos.filter(p => p.caption).length
  const v = s?.vehicle
  const hasIdentity = !!(v && (v.make || v.model || s?.title))
  const detailsDone = !!(v && hasIdentity && v.year && v.price_kes)
  return [
    {
      key: 'car', tab: 'car', n: 1, title: 'Exterior spin', optional: false,
      done: frames >= EXTERIOR_DONE_FRAMES,
      status: frames
        ? `${spinCount} spin${spinCount === 1 ? '' : 's'} · ${frames} frame${frames === 1 ? '' : 's'}${frames < EXTERIOR_DONE_FRAMES ? ` · add ${EXTERIOR_DONE_FRAMES - frames} more` : ''}`
        : 'Record one slow walk around the car',
    },
    {
      key: 'tour', tab: 'tour', n: 2, title: 'Interior 360°', optional: true,
      done: (s?.interior_ready ?? 0) > 0,
      status: s?.interior_scenes
        ? `${s.interior_scenes} 360° photo${s.interior_scenes === 1 ? '' : 's'}${s.interior_ready < s.interior_scenes ? ' · processing' : ''}`
        : 'Upload a 360° photo taken from the front seats',
    },
    {
      key: 'photos', tab: 'photos', n: 3, title: 'Detail photos', optional: true,
      done: photos.length >= DETAIL_PHOTOS_GOAL && (!s?.captions_ready || named === photos.length),
      status: photos.length
        ? `${photos.length} photo${photos.length === 1 ? '' : 's'}${s?.captions_ready ? ` · ${named} named` : ''}`
        : 'Wheels, dashboard, seats, boot, engine',
    },
    {
      key: 'details', tab: 'details', n: 4, title: 'Car details', optional: false,
      done: detailsDone,
      status: detailsDone
        ? [v?.year, v?.make, v?.model].filter(Boolean).join(' ') || 'Done'
        : 'Year, make, model, price',
    },
    {
      key: 'publish', tab: 'details', n: 5, title: 'Publish', optional: false,
      done: !!s?.is_published,
      status: s?.is_published ? 'Live: buyers can open the tour' : 'Publish to get the tour link',
    },
  ]
}

/** What the car tour has and still needs. Shared by the editor's tabs and its checklist. */
export function useCarSetup(spaceId: string) {
  const { apiFetch } = useApiFetch()
  const setup = useState<CarSetup | null>(`car-setup:${spaceId}`, () => null)
  const error = useState<string>(`car-setup-error:${spaceId}`, () => '')

  async function refresh() {
    try {
      const res: any = await apiFetch(`/spaces/${spaceId}/car-setup`)
      setup.value = (res?.data ?? res) as CarSetup
      error.value = ''
    } catch (e: any) {
      error.value = e?.data?.statusMessage || e?.message || 'Could not load the setup'
    }
  }

  const steps = computed(() => carSteps(setup.value))
  const required = computed(() => steps.value.filter(s => !s.optional))
  const doneCount = computed(() => steps.value.filter(s => s.done).length)
  const nextStep = computed(() => steps.value.find(s => !s.done && !s.optional) ?? steps.value.find(s => !s.done) ?? null)
  const tourUrl = computed(() => (setup.value?.is_published && setup.value.slug ? `/spin/${encodeURIComponent(setup.value.slug)}` : null))

  return { setup, error, refresh, steps, required, doneCount, nextStep, tourUrl }
}
