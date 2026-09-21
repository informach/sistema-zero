'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { economiaDeDados } from '@/lib/economia-de-dados'
import { useReducedMotion } from './room/use-reduced-motion'

/**
 * O runtime do Rive são ~676 KB comprimidos (81 KB de JS + 595 KB de WASM). Por
 * isso ele entra por `dynamic(ssr:false)`: chunk próprio, fora do SSR, baixado só
 * por quem chega numa trilha que tem arte.
 */
const TrailRiveCanvas = dynamic(
  () => import('./trail-rive-canvas').then((m) => m.TrailRiveCanvas),
  { ssr: false },
)

/** Margem de pré-carga: o arquivo já veio quando a unidade chega na tela. */
const MARGEM_PRECARGA = '300px'

/**
 * A arte animada de uma unidade da trilha (substituiu o SVG animado em 09/2026).
 *
 * ⚠️ Quatro caminhos levam a NÃO renderizar nada, e nenhum deles avisa a criança:
 * o SSR/primeiro quadro, a economia de dados do aparelho, a unidade nunca ter
 * chegado perto da tela, e qualquer falha do Rive (WASM bloqueado, `.riv` 404,
 * CORS do bucket). Isso é benigno aqui e por um motivo concreto: o
 * `.kids-trail-art` é `position: absolute`, então a arte está FORA do fluxo — sem
 * arte não há buraco, nem salto de layout, nem ícone de imagem quebrada. Some
 * um enfeite, e a trilha fica igual à de um módulo sem arquivo.
 *
 * ⚠️⚠️ Mas o silêncio corta dos dois lados: "falhou" e "ninguém subiu arquivo"
 * ficam idênticos na tela, e o CORS do bucket público é um jeito REAL de cair
 * aqui (o `<img>` de antes dispensava CORS; o runtime lê por
 * `fetch().arrayBuffer()`, que não dispensa). Daí o `console.warn` — é o que
 * transforma uma tarde de investigação em cinco segundos.
 *
 * `prefers-reduced-motion` é o único que NÃO some: monta o canvas parado, porque
 * `autoplay: false` pinta o primeiro quadro. Movimento reduzido é preferência
 * vestibular, não falta de banda — a criança continua vendo a arte.
 */
export function TrailRive({ src }: { src: string }) {
  const semMovimento = useReducedMotion()
  const alvo = useRef<HTMLSpanElement>(null)
  const [pode, setPode] = useState(false)
  const [jaApareceu, setJaApareceu] = useState(false)
  const [visivel, setVisivel] = useState(true)
  const [falhou, setFalhou] = useState(false)

  // ⚠️ A decisão NASCE `false` e só muda num efeito: o servidor nunca manda canvas,
  // e montar já no primeiro passe do cliente hidrataria uma árvore diferente da que
  // veio pronta. Custa um quadro e compra zero divergência.
  useEffect(() => {
    setPode(!economiaDeDados())
  }, [])

  useEffect(() => {
    const el = alvo.current
    if (!el) return
    // ⚠️ Sem `IntersectionObserver` o padrão é APARECER: um recurso ausente no
    // navegador não pode apagar a arte da trilha (e o happy-dom dos testes stuba).
    if (typeof IntersectionObserver === 'undefined') {
      setJaApareceu(true)
      return
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        const dentro = entradas[0]?.isIntersecting ?? true
        setVisivel(dentro)
        if (dentro) setJaApareceu(true)
      },
      { rootMargin: MARGEM_PRECARGA },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (falhou) return null

  return (
    <span ref={alvo} className="block size-full">
      {/* ⚠️ Monta na PRIMEIRA aparição e nunca desmonta: desmontar ao rolar para
          longe reiniciaria do quadro 0 a cada passada e recriaria o artboard.
          Pausar é barato e preserva a posição. */}
      {pode && jaApareceu ? (
        // ⚠️⚠️ A `key` é obrigatória: o `useRive` lê os parâmetros UMA vez na
        // montagem (as deps dele não incluem `src`), então trocar o `.riv` de um
        // módulo não trocaria a animação — e falharia sem erro nenhum.
        <TrailRiveCanvas
          key={src}
          src={src}
          tocar={!semMovimento}
          pausado={!visivel}
          onFalhou={() => {
            console.warn('[trilha-rive] não carregou:', src)
            setFalhou(true)
          }}
        />
      ) : null}
    </span>
  )
}
