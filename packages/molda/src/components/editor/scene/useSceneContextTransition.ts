import { useCallback, useRef, useState } from 'react'

export interface SceneContextPreview {
  title: string
  applyLabel: string
  canApply: boolean
  apply(): boolean
  discard(): void
  pause?(): void
}

/** A context owns its draft; this hook only holds the intention that would leave it. */
export function useSceneContextTransition() {
  const sources = useRef(new Map<string, () => SceneContextPreview | null>())
  const resolving = useRef(false)
  const pending = useRef<{
    key: string
    title: string
    applyLabel: string
    resume(): void
  } | null>(null)
  const [decision, setDecision] = useState<typeof pending.current>(null)
  const [error, setError] = useState<string | null>(null)
  const register = useCallback((key: string, read: () => SceneContextPreview | null) => {
    sources.current.set(key, read)
    return () => {
      if (sources.current.get(key) === read) sources.current.delete(key)
    }
  }, [])
  const queue = useCallback((resume: () => void) => {
    if (resolving.current) return false
    if (pending.current) return true
    for (const [key, read] of sources.current) {
      const preview = read()
      if (!preview) continue
      preview.pause?.()
      const next = { key, title: preview.title, applyLabel: preview.applyLabel, resume }
      pending.current = next
      setError(null)
      setDecision(next)
      return true
    }
    return false
  }, [])
  function resolve(choice: 'apply' | 'discard' | 'continue') {
    const current = pending.current
    if (!current) return
    if (choice !== 'continue') {
      const preview = sources.current.get(current.key)?.()
      if (choice === 'apply' && !preview?.canApply) {
        setError('A prévia precisa ser conferida. Continue ajustando ou descarte a prévia.')
        return
      }
      resolving.current = true
      try {
        if (choice === 'apply' && !preview?.apply()) {
          setError('Não foi possível aplicar. Continue ajustando ou descarte a prévia.')
          return
        }
        if (choice === 'discard') preview?.discard()
      } catch {
        setError('Não foi possível aplicar. Continue ajustando ou descarte a prévia.')
        return
      } finally {
        resolving.current = false
      }
    }
    pending.current = null
    setDecision(null)
    setError(null)
    if (choice !== 'continue') current.resume()
  }
  return {
    register,
    queue,
    decision,
    canApply: !!decision && !!sources.current.get(decision.key)?.()?.canApply,
    error,
    resolve,
  }
}
