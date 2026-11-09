'use client'

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { DiscoveryContext } from './scene-discovery-context'

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita'

/** Ciclo comum do andar 2D/3D. A cena decide projeção, velocidade e colisões. */
export function useMovimentoContinuo(
  avancar: (passo: { x: number; y: number; segundos: number }) => void,
) {
  const movimento = useContext(DiscoveryContext)?.movimento
  const atual = useRef({ avancar, movimento })
  atual.current = { avancar, movimento }
  const [segurando, setSegurando] = useState<ReadonlySet<Direcao>>(new Set())
  const dirs = useRef(new Set<Direcao>())
  const quadro = useRef<number | null>(null)
  const ultimo = useRef(0)
  const geracao = useRef(0)

  const parar = useCallback(() => {
    geracao.current++
    if (quadro.current !== null) cancelAnimationFrame(quadro.current)
    quadro.current = null
    if (dirs.current.size) {
      dirs.current.clear()
      setSegurando(new Set())
    }
  }, [])

  const comecar = useCallback(() => {
    if (quadro.current !== null || !dirs.current.size) return
    ultimo.current = performance.now()
    const passo = (agora: number) => {
      quadro.current = null
      if (document.hidden || atual.current.movimento?.podeAvancar() === false) {
        parar()
        return
      }
      const segundos = Math.max(0, Math.min(0.05, (agora - ultimo.current) / 1000))
      ultimo.current = agora
      const d = dirs.current
      const x = Number(d.has('direita')) - Number(d.has('esquerda'))
      const y = Number(d.has('baixo')) - Number(d.has('cima'))
      const norma = x && y ? Math.SQRT1_2 : 1
      if (x || y) atual.current.avancar({ x: x * norma, y: y * norma, segundos })
      if (d.size) quadro.current = requestAnimationFrame(passo)
    }
    quadro.current = requestAnimationFrame(passo)
  }, [parar])

  const segurar = useCallback(
    (direcao: Direcao) => {
      if (document.hidden || dirs.current.has(direcao)) return
      const primeira = dirs.current.size === 0
      dirs.current.add(direcao)
      setSegurando(new Set(dirs.current))
      if (!primeira) return
      const pedido = ++geracao.current
      const foco = atual.current.movimento
      if (!foco) comecar()
      else
        void foco.retomar().then((ok) => {
          if (geracao.current !== pedido) return
          if (ok) comecar()
          else parar()
        })
    },
    [comecar, parar],
  )

  const soltar = useCallback(
    (direcao: Direcao) => {
      if (!dirs.current.delete(direcao)) return
      setSegurando(new Set(dirs.current))
      if (!dirs.current.size) parar()
    },
    [parar],
  )

  useEffect(() => {
    if (movimento?.pausado) parar()
  }, [movimento?.pausado, parar])

  useEffect(() => {
    const esconder = () => {
      if (document.hidden) parar()
    }
    window.addEventListener('blur', parar)
    document.addEventListener('visibilitychange', esconder)
    return () => {
      window.removeEventListener('blur', parar)
      document.removeEventListener('visibilitychange', esconder)
      parar()
    }
  }, [parar])

  return { segurando, andando: segurando.size > 0, segurar, soltar, parar }
}
