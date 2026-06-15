import { type RefObject, useEffect, useLayoutEffect, useState } from 'react'

// useLayoutEffect no cliente evita um frame com a medida errada; no SSR cai pra
// useEffect (mantém o import seguro e sem warning).
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Largura medida do elemento (px) via `ResizeObserver` — reflete o CONTÊINER
 * real, não o viewport. Como o observer dispara quando o elemento muda de
 * tamanho, isto acompanha o arraste do handle do `PanelGroup` (cada seção —
 * Monaco, Preview — encolhe/cresce com o split). 0 antes da 1ª medição; sem
 * `ResizeObserver` (happy-dom/SSR) fica na medição inicial síncrona (ou 0).
 *
 * É a peça crua compartilhada por `useStudioWidth` (tiers do root) e pelos
 * componentes que se adaptam ao PRÓPRIO contêiner (cabeçalho do Monaco, barra do
 * Preview), em vez de ao tamanho do Studio inteiro.
 */
export function useMeasuredWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (w: number) => setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w))
    update(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return width
}
