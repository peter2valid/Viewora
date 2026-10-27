// Arrow keys move the choice inside a radiogroup of tiles, as native radios do.
export function onRadioArrows(e: KeyboardEvent, count: number, pick: (i: number) => void) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  if (!(e.key in keys) || !count) return
  e.preventDefault()
  const tiles = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')]
  const i = (tiles.indexOf(document.activeElement as HTMLElement) + keys[e.key] + count) % count
  pick(i)
  nextTick(() => tiles[i]?.focus())
}
