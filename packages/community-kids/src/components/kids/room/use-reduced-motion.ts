'use client'

import { useEffect, useState } from 'react'

/**
 * Espelha o gate global de movimento (`prefers-reduced-motion: reduce`) para animações em
 * JS/3D (pet andando, ciclo de matiz da festa) — o CSS sozinho não alcança o `useFrame`.
 * Inicia `false` (SSR/1º paint), atualiza no efeito e reage a mudanças do sistema.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}
