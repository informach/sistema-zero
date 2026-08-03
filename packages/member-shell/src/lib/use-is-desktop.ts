'use client'

import { useEffect, useState } from 'react'

/**
 * `true` em telas de DESKTOP (≥1024px). Usado como PRÉ-FILTRO p/ oferecer recursos
 * que só fazem sentido no computador (ex.: o modo Código/WebContainer do Estúdio) —
 * o enforcement de verdade é a capacidade real (`canRunProMode`).
 *
 * ⚠️ **Só use em componente que NÃO é renderizado no servidor** (monta pós-clique
 * ou vive sob `dynamic ssr:false`). O inicializador lê o `matchMedia`: no servidor
 * dá `false`, mas no 1º render do CLIENTE — que é o que o React compara na
 * hidratação — já dá `true` no desktop. Num componente SSR isso vira o React #418
 * ("the server rendered HTML didn't match the client"), especialmente quando o
 * valor decide se algo é renderizado (`if (!isDesktop) return null`). Foi o que
 * aconteceu no `focus-mode.tsx` do kids (03/08/2026), que copiou este molde para
 * um provider do layout: lá o hook começa `false` e o efeito aplica o valor real.
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
