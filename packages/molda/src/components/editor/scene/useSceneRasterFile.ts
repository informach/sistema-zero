import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReferenceImageFailure } from '../../../import/rasterHeader'
import type { loadSceneRaster } from '../../../import/sceneRaster'

/** One local file in session memory. No document writes; superseded decodes cannot replace its owner. */
export function useSceneRasterFile(scope: object | string) {
  const [loaded, setLoaded] = useState<{
    scope: object | string
    data: Awaited<ReturnType<typeof loadSceneRaster>>
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReferenceImageFailure | null>(null)
  const pending = useRef<AbortController | null>(null)
  const owner = useRef(scope)
  const cancel = useCallback(() => {
    pending.current?.abort()
    pending.current = null
    setBusy(false)
  }, [])
  const clear = useCallback(() => {
    cancel()
    setLoaded(null)
    setError(null)
  }, [cancel])
  const setRaster = useCallback(
    (data: Awaited<ReturnType<typeof loadSceneRaster>>) => {
      cancel()
      setError(null)
      setLoaded({ scope, data })
    },
    [scope, cancel],
  )
  const choose = useCallback(
    async (file: File) => {
      pending.current?.abort()
      const controller = new AbortController()
      pending.current = controller
      setLoaded(null)
      setError(null)
      setBusy(true)
      try {
        const { loadSceneRaster } = await import('../../../import/sceneRaster')
        controller.signal.throwIfAborted()
        const next = await loadSceneRaster(file, controller.signal)
        if (pending.current !== controller || controller.signal.aborted || owner.current !== scope)
          return false
        setLoaded({ scope, data: next })
        return true
      } catch (failure) {
        if (pending.current === controller && !controller.signal.aborted) {
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
          setBusy(false)
        }
      }
    },
    [scope],
  )
  useEffect(() => {
    if (owner.current !== scope) {
      owner.current = scope
      clear()
    }
  }, [scope, clear])
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      pending.current?.abort()
      pending.current = null
    }
  }, [cancel])
  return {
    data: loaded?.scope === scope ? loaded.data : null,
    busy,
    error,
    choose,
    cancel,
    clear,
    setRaster,
  }
}
