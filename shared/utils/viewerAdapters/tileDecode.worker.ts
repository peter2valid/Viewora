// Fetches and decodes one panorama tile off the main thread.
// Firefox decodes an <img> handed to createImageBitmap, and anything uploaded to
// WebGL, on the main thread (profiled: ~1/3 of main-thread time while a room
// streamed in). A Blob decoded inside a worker never touches it.
const OPTS: ImageBitmapOptions = { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }

self.onmessage = async (e: MessageEvent<{ id: number; url: string }>) => {
  const { id, url } = e.data
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const bitmap = await createImageBitmap(await res.blob(), OPTS)
    ;(self as any).postMessage({ id, bitmap }, [bitmap])
  } catch (err) {
    ;(self as any).postMessage({ id, error: String((err as Error)?.message ?? err) })
  }
}
