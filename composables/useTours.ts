import type { Database } from '~/types/database.types'

type Tour = Database['public']['Tables']['virtual_tours']['Row']

export interface CreateTourInput {
  title: string
  property_id: string
}

export const useTours = () => {
  const supabase = useSupabaseClient<Database>()

  const tours = ref<Tour[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function fetchTours(spaceId: string) {
    pending.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('virtual_tours')
        .select('*')
        .eq('property_id', spaceId)
        .order('created_at', { ascending: false })

      if (err) throw err
      tours.value = data ?? []
    } catch (e: any) {
      error.value = e.message ?? 'Failed to load tours.'
    } finally {
      pending.value = false
    }
  }

  async function fetchTour(tourId: string): Promise<Tour> {
    const { data, error: err } = await supabase
      .from('virtual_tours')
      .select('*')
      .eq('id', tourId)
      .single()

    if (err) throw err
    return data
  }

  async function createTour(input: CreateTourInput): Promise<Tour> {
    const { data, error: err } = await supabase
      .from('virtual_tours')
      .insert({
        property_id: input.property_id,
        title: input.title,
        status: 'draft',
      })
      .select()
      .single()

    if (err) throw err
    tours.value.unshift(data)
    return data
  }

  async function updateTourStatus(tourId: string, status: 'draft' | 'published') {
    const { error: err } = await supabase
      .from('virtual_tours')
      .update({ status })
      .eq('id', tourId)

    if (err) throw err

    const t = tours.value.find(t => t.id === tourId)
    if (t) t.status = status
  }

  async function updateTourTitle(tourId: string, title: string) {
    const { error: err } = await supabase
      .from('virtual_tours')
      .update({ title })
      .eq('id', tourId)

    if (err) throw err
  }

  return {
    tours,
    pending,
    error,
    fetchTours,
    fetchTour,
    createTour,
    updateTourStatus,
    updateTourTitle,
  }
}
