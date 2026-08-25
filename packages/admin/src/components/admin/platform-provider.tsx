'use client'

import { createContext, type ReactNode, useCallback, useContext, useSyncExternalStore } from 'react'
import type { Platform } from '@/lib/platform'
import { getPlatform, subscribePlatform } from './platform-store'

const PlatformContext = createContext<Platform | null>(null)

/**
 * Ponte request-scoped entre o layout servidor e o store do navegador. O
 * `getServerSnapshot` fecha sobre o valor desta árvore, sem ler ou alterar
 * estado global do processo Node.
 */
export function PlatformProvider({
  initialPlatform,
  children,
}: {
  initialPlatform: Platform
  children: ReactNode
}) {
  const getServerSnapshot = useCallback(() => initialPlatform, [initialPlatform])
  const platform = useSyncExternalStore(subscribePlatform, getPlatform, getServerSnapshot)

  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
}

export function usePlatform(): Platform {
  const platform = useContext(PlatformContext)
  if (platform === null) throw new Error('usePlatform precisa estar dentro de PlatformProvider')
  return platform
}
