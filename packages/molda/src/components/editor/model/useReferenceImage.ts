import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReferenceImageFailure } from '../../../import/rasterHeader'
import type { ReferenceImage } from '../../../import/referenceImage'
import type { CameraView } from '../../../viewport/types'

export function useReferenceImage() {
  const [images, setImages] = useState<Partial<Record<CameraView, ReferenceImage>>>({})
  const [loadingView, setLoadingView] = useState<CameraView | null>(null)
  const [error, setError] = useState<{ view: CameraView; reason: ReferenceImageFailure } | null>(
    null,
  )
  const owned = useRef(new Map<CameraView, ReferenceImage>())
  const pending = useRef<{ view: CameraView; controller: AbortController } | null>(null)
  const cancel = useCallback(() => {
    pending.current?.controller.abort()
    pending.current = null
    setLoadingView(null)
  }, [])
  const remove = useCallback(
    (view: CameraView) => {
      if (pending.current?.view === view) cancel()
      owned.current.get(view)?.dispose()
      owned.current.delete(view)
      setImages((current) => {
        if (!current[view]) return current
        const next = { ...current }
        delete next[view]
        return next
      })
      setError((current) => (current?.view === view ? null : current))
    },
    [cancel],
  )
  useEffect(
    () => () => {
      pending.current?.controller.abort()
      pending.current = null
      for (const image of owned.current.values()) image.dispose()
      owned.current.clear()
    },
    [],
  )
  const choose = useCallback(async (view: CameraView, file: File): Promise<boolean> => {
    pending.current?.controller.abort()
    const controller = new AbortController()
    pending.current = { view, controller }
    setLoadingView(view)
    setError(null)
    try {
      const { loadReferenceImage } = await import('../../../import/referenceImage')
      controller.signal.throwIfAborted()
      const next = await loadReferenceImage(file, controller.signal)
      if (controller.signal.aborted) {
        next.dispose()
        return false
      }
      owned.current.get(view)?.dispose()
      owned.current.set(view, next)
      setImages((current) => ({ ...current, [view]: next }))
      return true
    } catch (failure) {
      if (!controller.signal.aborted) {
        const reason =
          failure && typeof failure === 'object' && 'reason' in failure ? failure.reason : null
        setError({
          view,
          reason:
            reason === 'size' || reason === 'format' || reason === 'animated' ? reason : 'decode',
        })
      }
      return false
    } finally {
      if (pending.current?.controller === controller) {
        pending.current = null
        setLoadingView(null)
      }
    }
  }, [])
  return { images, loadingView, error, choose, remove, cancel }
}
