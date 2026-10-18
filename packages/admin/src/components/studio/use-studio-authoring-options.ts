'use client'

import { useEffect, useState } from 'react'
import {
  type PreparedStudioAuthoringOptions,
  prepareStudioAuthoringOptions,
} from '../../lib/studio-authoring-options'

export function useStudioAuthoringOptions(enabled: boolean) {
  const [prepared, setPrepared] = useState<PreparedStudioAuthoringOptions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    // An explicit retry is a new discovery request even while this form remains open.
    void attempt
    if (!enabled) return
    const controller = new AbortController()
    setPrepared(null)
    setError(null)
    void (async () => {
      try {
        const response = await fetch('/api/members/studio/authoring-options', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Não foi possível consultar os ambientes disponíveis.')
        const next = await prepareStudioAuthoringOptions(await response.json())
        if (!controller.signal.aborted) setPrepared(next)
      } catch {
        if (!controller.signal.aborted)
          setError('Não foi possível consultar os ambientes. O projeto atual foi preservado.')
      }
    })()
    return () => controller.abort()
  }, [enabled, attempt])
  return { prepared, error, retry: () => setAttempt((value) => value + 1) }
}
