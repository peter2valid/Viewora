/**
 * Camera files like "IMG_20261116_145546_00_038.jpg" end in a shot number.
 * Sort by that last number, then by the whole name with numbers compared as
 * numbers, so 037 comes before 038 whatever order the picker returned.
 */
export function sortBySequenceNumber<T extends { name: string }>(files: T[]): T[] {
  const lastNumber = (name: string) => {
    const m = name.replace(/\.[^/.]+$/, '').match(/(\d+)(?!.*\d)/)
    return m ? Number(m[1]) : null
  }
  return files
    .map((file, i) => ({ file, i, n: lastNumber(file.name) }))
    .sort((a, b) => {
      if (a.n != null && b.n != null && a.n !== b.n) return a.n - b.n
      if ((a.n == null) !== (b.n == null)) return a.n == null ? 1 : -1
      return a.file.name.localeCompare(b.file.name, undefined, { numeric: true, sensitivity: 'base' }) || a.i - b.i
    })
    .map(x => x.file)
}
