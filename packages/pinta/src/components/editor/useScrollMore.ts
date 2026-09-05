import type { RefObject } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

/**
 * "Tem mais embaixo?" de um container que rola por dentro com a barra ESCONDIDA
 * (`.pin-scroll-y`: as colunas direitas dos editores). Devolve `true` enquanto
 * houver conteúdo abaixo da borda, para a coluna pintar um degradê no pé — a
 * pista que a barra clássica daria (full review 04/09/2026: no pixel, em
 * 768px, o painel de Cores fica inteiro abaixo da dobra e a única pista era um
 * painel cortado pela borda, o sintoma que a dona tinha relatado).
 *
 * Mede no mount, a cada rolagem, no `resize`, quando a coluna ou um FILHO muda
 * de tamanho (painel abre, forma selecionada faz a Aparência crescer) e quando
 * um filho entra ou sai (Camadas nasce na 1ª forma). Sem `ResizeObserver`/
 * `MutationObserver` (happy-dom) fica só com os eventos.
 */
export function useScrollMore(ref: RefObject<HTMLElement | null>): boolean {
  const [more, setMore] = useState(false)
  const measureRef = useRef<() => void>(() => undefined)
  // Também a cada render de quem usa o hook: a régua de encaixe da coluna do
  // vetor recolhe painéis em passadas de layout effect, e o ResizeObserver só
  // entrega no próximo quadro (num painel oculto, nunca) — a medição do render
  // anterior ficaria dizendo "tem mais" numa coluna que já cabe.
  useLayoutEffect(() => {
    measureRef.current()
  })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = (): void => {
      setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 1)
    }
    measureRef.current = measure
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    const observeChildren = (): void => {
      if (!resize) return
      resize.disconnect()
      resize.observe(el)
      for (const child of el.children) resize.observe(child)
    }
    observeChildren()
    const mutation =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeChildren()
            measure()
          })
    mutation?.observe(el, { childList: true })
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      resize?.disconnect()
      mutation?.disconnect()
    }
  }, [ref])
  return more
}
