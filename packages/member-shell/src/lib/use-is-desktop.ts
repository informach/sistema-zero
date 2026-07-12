'use client'

import { useEffect, useState } from 'react'

/**
 * `true` em telas de DESKTOP (≥1024px). SSR-safe: o inicializador lazy guarda
 * `typeof window` (retorna `false` no servidor), então componentes que só montam
 * pós-clique não sofrem mismatch de hidratação. Usado como PRÉ-FILTRO p/ oferecer
 * recursos que só fazem sentido no computador (ex.: o modo Código/WebContainer do
 * Estúdio) — o enforcement de verdade é a capacidade real (`canRunProMode`).
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}
