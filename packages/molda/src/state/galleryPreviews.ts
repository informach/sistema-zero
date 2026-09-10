import type { MoldaAssetSummary } from '../core/assetSummary'
import { ByteLru } from '../core/byteLru'
import type { GalleryPreview } from '../core/galleryPreview'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaPersistence } from './persistence'

export interface GalleryPreviews {
  load(summary: MoldaAssetSummary, signal: AbortSignal): Promise<GalleryPreview | null>
  /** Cancel pending work and release derived content; usable again after StrictMode cleanup. */
  clear(): void
}

interface Request {
  summary: MoldaAssetSummary
  signal: AbortSignal
  resolve(value: GalleryPreview | null): void
  reject(error: unknown): void
  cancel(): void
}

/** One source document at a time, owned by this gallery/profile, never retained in the cache. */
export function createGalleryPreviews(persistence: MoldaPersistence): GalleryPreviews {
  const cache = new ByteLru<string, { preview: GalleryPreview; bytes: number }>({
    maxBytes: MOLDA_LIMITS.previewCacheBytes,
    maxEntries: 60,
    sizeOf: (key, entry) => entry.bytes + key.length * 2,
  })
  const queue: Request[] = []
  const active = new Set<Request>()
  let running = false

  async function run(): Promise<void> {
    if (running) return
    running = true
    try {
      while (queue.length) {
        const request = queue.shift()
        if (!request || !active.has(request)) continue
        try {
          const { summary, signal } = request
          const key = JSON.stringify([summary.id, summary.updatedAt])
          const hit = cache.get(key)
          if (hit) {
            request.resolve(hit.preview)
            continue
          }
          // Yield before each source read/derivation; scrolling can cancel queued work.
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
          if (!active.has(request) || signal.aborted) continue
          const { prepareGalleryPreview, galleryPreviewBytes } = await import(
            '../core/galleryPreview'
          )
          if (!active.has(request) || signal.aborted) continue
          const asset = await persistence.load(summary.id)
          if (!active.has(request) || signal.aborted) continue
          if (!asset || asset.updatedAt !== summary.updatedAt || asset.kind !== summary.kind) {
            request.resolve(null)
            continue
          }
          const preview = prepareGalleryPreview(asset)
          cache.set(key, { preview, bytes: galleryPreviewBytes(preview) })
          request.resolve(preview)
        } catch (error) {
          request.reject(error)
        } finally {
          request.signal.removeEventListener('abort', request.cancel)
          active.delete(request)
        }
      }
    } finally {
      running = false
    }
  }

  return {
    load(summary, signal) {
      if (signal.aborted) return Promise.reject(new DOMException('Cancelled', 'AbortError'))
      return new Promise((resolve, reject) => {
        const request: Request = {
          summary,
          signal,
          resolve,
          reject,
          cancel() {
            signal.removeEventListener('abort', request.cancel)
            active.delete(request)
            const index = queue.indexOf(request)
            if (index >= 0) queue.splice(index, 1)
            reject(new DOMException('Cancelled', 'AbortError'))
          },
        }
        active.add(request)
        signal.addEventListener('abort', request.cancel, { once: true })
        queue.push(request)
        void run()
      })
    },
    clear() {
      for (const request of active) request.cancel()
      cache.clear()
    },
  }
}
