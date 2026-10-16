import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { useCallback, useEffect, useRef, useState } from 'react'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import type { StudioTutorConfig } from '../../studio/tutor'

/** Credit readings belong to the current session; an older read cannot overwrite an answer. */
export function useTutorCredits(
  config: StudioTutorConfig | null,
  projectId: string | null,
  open: boolean,
) {
  const [credits, setCredits] = useState<AiCreditsView | null>(config?.credits ?? null)
  const request = useRef<AbortController | null>(null)
  const identity = useRef({ config, projectId })
  identity.current = { config, projectId }
  const acceptCredits = useCallback((value: AiCreditsView) => {
    request.current?.abort()
    request.current = null
    setCredits(value)
  }, [])
  const refreshCredits = useCallback(() => {
    if (!config?.adapter.loadCredits || !projectId) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const scope = captureProjectStorageScope()
    const current = () =>
      !controller.signal.aborted &&
      request.current === controller &&
      identity.current.config === config &&
      identity.current.projectId === projectId &&
      captureProjectStorageScope() === scope
    void config.adapter
      .loadCredits(controller.signal)
      .then((value) => {
        if (current()) setCredits(value)
      })
      .catch(() => {
        // An unavailable reading is unknown, never a stale balance or a false zero.
        if (current()) setCredits(null)
      })
  }, [config, projectId])
  useEffect(() => {
    setCredits(projectId ? (config?.credits ?? null) : null)
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [config, projectId])
  useEffect(() => {
    if (open) refreshCredits()
  }, [open, refreshCredits])
  return { credits, acceptCredits, refreshCredits }
}
