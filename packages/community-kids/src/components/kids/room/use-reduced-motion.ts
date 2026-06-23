'use client'

import { useEffect, useState } from 'react'

/**
 * Espelha o gate global de movimento (`prefers-reduced-motion: reduce`) para animações em
 * JS/3D (pet andando, ciclo de matiz da festa) — o CSS sozinho não alcança o `useFrame`.
 * Inicia já lendo o `matchMedia` (estes consumidores são todos `ssr:false` → sem hydration
 * mismatch) para a criança sensível NÃO ver nem o 1º quadro animado; reage a mudanças do sistema.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}
