'use client'

import type { PintaCausalViewer } from '@sistemazero/core/creations/pinta-causal'
import { createContext, type ReactNode, useContext } from 'react'

const Scope = createContext<PintaCausalViewer | null>(null)

export function PintaPaletteScope({
  viewer,
  children,
}: {
  viewer: PintaCausalViewer | null
  children: ReactNode
}) {
  return <Scope.Provider value={viewer}>{children}</Scope.Provider>
}

/** A changed account retires the producer even if the displayed profile ID is unchanged. */
export function usePintaPaletteAccount(
  viewerId: string | null,
  audience: PintaCausalViewer['audience'],
): string | null {
  const scope = useContext(Scope)
  if (
    process.env.NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1 !== '1' ||
    !scope ||
    scope.userId !== viewerId ||
    scope.audience !== audience
  )
    return null
  return scope.accountId
}
