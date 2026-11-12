/// <reference lib="webworker" />
// Follows a car pin through the frames of a spin, off the main thread so the editor stays responsive.
// Frames are fetched, shrunk to TRACK_WIDTH and kept as luminance for the life of the worker, so
// moving or correcting a pin a second time is quick.
import { loadGray, runTrack, type TrackRequest } from './pinTrackCore'

self.onmessage = async (e: MessageEvent<TrackRequest & { id: number }>) => {
  const { id, ...req } = e.data
  try {
    const pts = await runTrack(req, loadGray)
    self.postMessage({ id, pts })
  } catch (err: any) {
    self.postMessage({ id, error: String(err?.message || err) })
  }
}
