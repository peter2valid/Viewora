// Studio finish for a car spin: the server grades every frame of the spin the same way and saves a
// copy next to each original (viewora-backend utils/spinLook.ts). These helpers read a photo's look
// from its URL and find its original, so the editor can show before and after.

export type SpinLook = 'original' | 'natural' | 'vivid'

export const SPIN_LOOK_OPTIONS: { look: SpinLook; label: string; hint: string }[] = [
  { look: 'original', label: 'Original', hint: 'The frames as you recorded them' },
  { look: 'natural', label: 'Studio', hint: 'Cleaner light, richer paint, even brightness all the way round' },
  { look: 'vivid', label: 'Vivid', hint: 'Studio with more contrast and colour. Best for dark or dull paint' },
]

const SUFFIX = /\.studio-(natural|vivid)-v\d+(?:-[0-9a-f]{8})?\.jpg$/

/** The look a frame URL shows. */
export function lookOfUrl(url: string): SpinLook {
  const m = SUFFIX.exec(url)
  return m ? (m[1] as SpinLook) : 'original'
}

/** The original photo behind a finished frame (an original comes back as is). */
export function originalUrl(url: string): string {
  return url.replace(SUFFIX, '')
}

export interface SpinLookProgress {
  state: 'queued' | 'working' | 'done' | 'failed'
  look: SpinLook
  done: number
  total: number
  error?: string
}

export interface SpinLookStatus {
  look: SpinLook
  /** Frames not on the spin's look (added after it was finished). */
  behind: number
  total: number
  progress: SpinLookProgress | null
}

/** True while the server is still working on a change. */
export function isRunning(p: SpinLookProgress | null | undefined): boolean {
  return !!p && (p.state === 'queued' || p.state === 'working')
}

/** One line for the owner: what is happening now. */
export function progressText(p: SpinLookProgress | null | undefined): string {
  if (!p) return ''
  if (p.state === 'queued') return 'Starting…'
  if (p.state === 'working') return p.total ? `Finishing frame ${Math.min(p.done + 1, p.total)} of ${p.total}…` : 'Working…'
  if (p.state === 'failed') return p.error || 'We could not finish the photos. Your spin still shows its previous look.'
  return ''
}
