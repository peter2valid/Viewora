import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

/**
 * A top-right viewer button (Areas, Guided visit) beside the page's brand
 * heading, top left (pages/p, "Viewora Virtual Tours"). While `query` matches:
 *  - it tells the page how much width it takes (--brand-clear-right on :root),
 *    so the heading wraps before reaching it, whatever its length;
 *  - `top` keeps it level with the middle of the heading, and follows the
 *    heading when it wraps onto more lines. Null (CSS position) when there is
 *    no heading to line up with.
 */
export function useBesideBrandHeading(btn: Ref<HTMLElement | null>, query: string) {
  const top = ref<number | null>(null)
  const GAP_PX = 12
  let mq: MediaQueryList | null = null
  let headingObserver: ResizeObserver | null = null
  let observedHeading: Element | null = null
  let owns = false

  function clear() {
    if (owns) document.documentElement.style.removeProperty('--brand-clear-right')
    owns = false
    top.value = null
  }

  function place() {
    if (typeof document === 'undefined') return
    const el = btn.value
    if (!mq?.matches || !el || !el.offsetParent) return clear()
    const b = el.getBoundingClientRect()
    document.documentElement.style.setProperty('--brand-clear-right', `${Math.ceil(window.innerWidth - b.left + GAP_PX)}px`)
    owns = true

    const heading = document.querySelector('.viewora-free-brand__name')
    if (heading !== observedHeading) {
      headingObserver?.disconnect()
      observedHeading = heading
      if (heading && 'ResizeObserver' in window) {
        headingObserver = new ResizeObserver(() => place())
        headingObserver.observe(heading)
      }
    }
    const h = heading?.getBoundingClientRect()
    if (!h || !h.height) { top.value = null; return }
    const p = el.offsetParent.getBoundingClientRect()
    top.value = Math.max(8, Math.round(h.top + h.height / 2 - p.top - el.offsetHeight / 2))
  }

  const schedule = () => nextTick(() => requestAnimationFrame(place))
  watch(btn, schedule)
  onMounted(() => {
    mq = window.matchMedia(query)
    mq.addEventListener?.('change', schedule)
    window.addEventListener('resize', schedule)
    schedule()
  })
  onBeforeUnmount(() => {
    mq?.removeEventListener?.('change', schedule)
    window.removeEventListener('resize', schedule)
    headingObserver?.disconnect()
    clear()
  })

  return { top, schedule }
}
