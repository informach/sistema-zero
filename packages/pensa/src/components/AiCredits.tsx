import { type AiCreditsView, resolveAiCredits } from '@sistemazero/core/ai-credits'
import { useEffect, useState } from 'react'
import type { PensaTransport } from '../core/types'

/** `audience`: para quem a frase fala (no adulto, "pedidos" e sem a família). Padrão: kids. */
export function usePensaCredits(
  transport: PensaTransport,
  operationStatus?: string,
  revisionId?: string,
  audience: 'kids' | 'adult' = 'kids',
) {
  const [credits, setCredits] = useState<AiCreditsView | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: Finished operations and accepted revisions invalidate the credit balance.
  useEffect(() => {
    let active = true
    const read = () => {
      void transport
        .request<{ credits: AiCreditsView | null }>('/credits')
        .then((result) => {
          if (active) setCredits(result?.credits ?? null)
        })
        .catch(() => {
          if (active) setCredits(null)
        })
    }
    read()
    const onVisible = () => {
      if (document.visibilityState === 'visible') read()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [transport, operationStatus, revisionId])
  return resolveAiCredits(credits, { audience })
}
