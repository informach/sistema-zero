import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReferenceImageFailure } from '../../../import/rasterHeader'
import type { ReferenceImage } from '../../../import/referenceImage'

export function useReferenceImage() {
  const [image, setImage] = useState<ReferenceImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ReferenceImageFailure | null>(null)
  const owned = useRef<ReferenceImage | null>(null)
  const pending = useRef<AbortController | null>(null)
  const cancel = useCallback(() => {
    pending.current?.abort()
    pending.current = null
    setLoading(false)
  }, [])
  const remove = useCallback(() => {
    cancel()
    owned.current?.dispose()
    owned.current = null
    setImage(null)
    setError(null)
  }, [cancel])
  useEffect(
    () => () => {
      pending.current?.abort()
      pending.current = null
      owned.current?.dispose()
      owned.current = null
    },
    [],
  )
  const choose = useCallback(async (file: File): Promise<boolean> => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setError(null)
    try {
      const { loadReferenceImage } = await import('../../../import/referenceImage')
      controller.signal.throwIfAborted()
      const next = await loadReferenceImage(file, controller.signal)
      if (controller.signal.aborted) {
        next.dispose()
        return false
      }
      owned.current?.dispose()
      owned.current = next
      setImage(next)
      return true
    } catch (failure) {
      if (!controller.signal.aborted) {
        const reason =
          failure && typeof failure === 'object' && 'reason' in failure ? failure.reason : null
        setError(
          reason === 'size' || reason === 'format' || reason === 'animated' ? reason : 'decode',
        )
      }
      return false
    } finally {
      if (pending.current === controller) {
        pending.current = null
        setLoading(false)
      }
    }
  }, [])
  return { image, loading, error, choose, remove, cancel }
}
