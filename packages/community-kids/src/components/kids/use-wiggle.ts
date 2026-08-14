'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Duração da sacudida, casada com a animação `kid-wiggle` do globals.css. */
const WIGGLE_MS = 700

/**
 * O gesto de "aqui não dá para entrar" do mapa da carreira: o nó sacode e um recado sobe.
 *
 * Mora num arquivo próprio porque DOIS nós usam o mesmo gesto — o nó de posto travado
 * (`career-map.tsx`) e o nó de aviso do horizonte (`career-horizon-node.tsx`) —, e o
 * segundo é renderizado pelo primeiro: importar de lá fecharia um ciclo.
 *
 * ⚠️ O timer é limpo no unmount. Navegar durante a sacudida desmontava o nó com um
 * `setTimeout` pendente que ainda chamaria `setState`.
 */
export function useWiggle(): { wiggling: boolean; wiggle: () => void } {
  const [wiggling, setWiggling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const wiggle = useCallback(() => {
    setWiggling(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setWiggling(false), WIGGLE_MS)
  }, [])

  return { wiggling, wiggle }
}
